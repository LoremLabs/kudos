import type { Visibility } from "./schemas/visibility.js";

export interface ValidationResult {
  ok: boolean;
  message?: string;
}

export interface CorePolicy {
  maxBatchSize: number;
  maxKudos: number;
  maxEmojiGraphemes: number;
  maxEmojiBytes: number;
  maxTitleBytes: number;
  maxEventIdBytes: number;
  maxScopeIdLength: number;
  clockSkewMs: number;
  allowSelfSend: boolean;
  allowedVisibilities: Visibility[];
  validateSubject?: (subject: string) => ValidationResult;
}

export const DEFAULT_POLICY: CorePolicy = {
  maxBatchSize: 10_000,
  maxKudos: 5000,
  maxEmojiGraphemes: 3,
  maxEmojiBytes: 64,
  maxTitleBytes: 128,
  maxEventIdBytes: 255,
  maxScopeIdLength: 255,
  clockSkewMs: 5000,
  allowSelfSend: false,
  allowedVisibilities: [
    "PRIVATE",
    "RECIPIENT_SUMMARY",
    "RECIPIENT_ALL",
    "PUBLIC_SUMMARY",
    "PUBLIC_ALL",
  ],
};
