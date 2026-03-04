import { z } from "zod";

export const VISIBILITIES = [
  "PRIVATE",
  "RECIPIENT_SUMMARY",
  "RECIPIENT_ALL",
  "PUBLIC_SUMMARY",
  "PUBLIC_ALL",
] as const;

export type Visibility = (typeof VISIBILITIES)[number];

export const VisibilitySchema = z.enum(VISIBILITIES);

/** Numeric rank for ordering comparisons (higher = more public). */
export const VISIBILITY_RANK: Record<Visibility, number> = {
  PRIVATE: 0,
  RECIPIENT_SUMMARY: 1,
  RECIPIENT_ALL: 2,
  PUBLIC_SUMMARY: 3,
  PUBLIC_ALL: 4,
};
