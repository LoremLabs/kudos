import { v7 as uuidv7 } from "uuid";
import type { EventInput } from "./schemas/event-input.js";
import type { Event } from "./schemas/event.js";
import type { CorePolicy } from "./policy.js";
import { DEFAULT_POLICY } from "./policy.js";

export interface NormalizeContext {
  sender: string;
  now?: () => string;
  generateId?: () => string;
  policy?: Partial<CorePolicy>;
}

function defaultNow(): string {
  return new Date().toISOString();
}

/**
 * Generate a base64url-encoded UUIDv7 prefixed with `kudos:`.
 * UUIDv7 is time-sortable; base64url reduces the ID from 36 to 22 chars.
 */
function defaultGenerateId(): string {
  const hex = uuidv7().replace(/-/g, "");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `kudos:${b64}`;
}

/**
 * Normalize an EventInput into a fully-populated Event.
 *
 * - Generates `id` if missing (kudos:<uuid>)
 * - Sets `ts` to now if missing (injectable clock)
 * - Defaults `kudos` to 1, `visibility` to PRIVATE
 * - Converts missing optional fields to null
 * - Attaches sender from context
 *
 * Does NOT validate — call validateEvent() on the result.
 */
export function normalizeEvent(input: EventInput, ctx: NormalizeContext): Event {
  const _now = ctx.now ?? defaultNow;
  const _generateId = ctx.generateId ?? defaultGenerateId;

  return {
    id: input.id ?? _generateId(),
    recipient: input.recipient,
    sender: ctx.sender,
    ts: input.ts ?? _now(),
    scopeId: input.scopeId ?? null,
    kudos: input.kudos ?? 1,
    emoji: input.emoji ?? null,
    title: input.title ?? null,
    visibility: input.visibility ?? "PRIVATE",
    meta: input.meta ?? null,
  };
}
