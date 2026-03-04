import { z } from "zod";
import { PoolServerError, ErrorCode } from "./errors.js";

/**
 * Cursor payload: encodes the position for `(ts DESC, id DESC)` ordering.
 * Storage adapters must use the same sort to keep cursors portable.
 */
const CursorPayloadSchema = z.object({
  ts: z.string().datetime(),
  id: z.string(),
});

export type CursorPayload = z.infer<typeof CursorPayloadSchema>;

function toBase64Url(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded);
}

export function encodeCursor(payload: CursorPayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeCursor(cursor: string): CursorPayload {
  try {
    const json = fromBase64Url(cursor);
    const parsed = JSON.parse(json);
    return CursorPayloadSchema.parse(parsed);
  } catch {
    throw new PoolServerError(ErrorCode.INVALID_CURSOR, "Invalid or corrupt cursor.");
  }
}
