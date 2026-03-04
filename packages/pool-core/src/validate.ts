import type { Event } from "./schemas/event.js";
import type { CorePolicy } from "./policy.js";
import { DEFAULT_POLICY } from "./policy.js";
import { parseSubject } from "./schemas/subject.js";

export interface ValidationOk {
  ok: true;
}

export interface ValidationFail {
  ok: false;
  message: string;
}

export type ValidationResult = ValidationOk | ValidationFail;

const encoder = new TextEncoder();

function countGraphemes(str: string): number {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  let count = 0;
  for (const _ of segmenter.segment(str)) {
    count++;
  }
  return count;
}

function byteLength(str: string): number {
  return encoder.encode(str).byteLength;
}

/**
 * Validate a normalized Event against business rules.
 * All thresholds come from policy (falling back to DEFAULT_POLICY).
 */
export function validateEvent(
  event: Event,
  policy?: Partial<CorePolicy>,
): ValidationResult {
  const p = { ...DEFAULT_POLICY, ...policy };

  // 1. Subject shape: type portion must be lowercase
  let parsed: ReturnType<typeof parseSubject>;
  try {
    parsed = parseSubject(event.recipient);
  } catch {
    return {
      ok: false,
      message: `Invalid recipient format. Expected 'type:id' (e.g. 'email:user@example.com').`,
    };
  }

  if (parsed.type !== parsed.type.toLowerCase()) {
    return {
      ok: false,
      message: `Subject type must be lowercase: '${parsed.type}'.`,
    };
  }

  // Also validate sender subject
  let senderParsed: ReturnType<typeof parseSubject>;
  try {
    senderParsed = parseSubject(event.sender);
  } catch {
    return {
      ok: false,
      message: `Invalid sender format. Expected 'type:id' (e.g. 'email:user@example.com').`,
    };
  }

  if (senderParsed.type !== senderParsed.type.toLowerCase()) {
    return {
      ok: false,
      message: `Sender type must be lowercase: '${senderParsed.type}'.`,
    };
  }

  // 2. Email light check
  if (parsed.type === "email" && !parsed.id.includes("@")) {
    return {
      ok: false,
      message: `Email subject must contain '@': '${event.recipient}'.`,
    };
  }

  // Custom subject validation hook
  if (p.validateSubject) {
    const result = p.validateSubject(event.recipient);
    if (!result.ok) {
      return { ok: false, message: result.message ?? "Invalid subject." };
    }
  }

  // 3. Self-send
  if (!p.allowSelfSend && event.sender === event.recipient) {
    return {
      ok: false,
      message: "Sender and recipient cannot be the same.",
    };
  }

  // 4. Timestamp not in the future
  const eventTs = new Date(event.ts).getTime();
  const now = Date.now();
  if (eventTs > now + p.clockSkewMs) {
    return {
      ok: false,
      message: "Event timestamp is in the future.",
    };
  }

  // 5. Emoji validation
  if (event.emoji !== null) {
    const graphemes = countGraphemes(event.emoji);
    if (graphemes > p.maxEmojiGraphemes) {
      return {
        ok: false,
        message: `Emoji exceeds maximum of ${p.maxEmojiGraphemes} grapheme clusters (got ${graphemes}).`,
      };
    }
    const bytes = byteLength(event.emoji);
    if (bytes > p.maxEmojiBytes) {
      return {
        ok: false,
        message: `Emoji exceeds maximum of ${p.maxEmojiBytes} bytes (got ${bytes}).`,
      };
    }
  }

  // 6. Title validation
  if (event.title !== null) {
    const bytes = byteLength(event.title);
    if (bytes > p.maxTitleBytes) {
      return {
        ok: false,
        message: `Title exceeds maximum of ${p.maxTitleBytes} bytes (got ${bytes}).`,
      };
    }
  }

  // 7. Event ID: no whitespace, max bytes
  if (/\s/.test(event.id)) {
    return {
      ok: false,
      message: "Event ID must not contain whitespace.",
    };
  }
  if (byteLength(event.id) > p.maxEventIdBytes) {
    return {
      ok: false,
      message: `Event ID exceeds maximum of ${p.maxEventIdBytes} bytes.`,
    };
  }

  // 8. Tombstone: kudos === 0 requires scopeId
  if (event.kudos === 0 && event.scopeId === null) {
    return {
      ok: false,
      message: "Tombstone (kudos=0) requires a scopeId.",
    };
  }

  // Visibility check
  if (!p.allowedVisibilities.includes(event.visibility)) {
    return {
      ok: false,
      message: `Visibility '${event.visibility}' is not allowed.`,
    };
  }

  // Kudos range (already enforced by Zod but check policy max)
  if (event.kudos > p.maxKudos) {
    return {
      ok: false,
      message: `Kudos value ${event.kudos} exceeds maximum of ${p.maxKudos}.`,
    };
  }

  return { ok: true };
}
