import { z } from "zod";
import { VisibilitySchema } from "./visibility.js";

/**
 * EventInput is structurally lenient — it accepts raw user input.
 * Business rules (subject format, kudos range, etc.) are enforced
 * by validateEvent(), not here.
 */
export const EventInputSchema = z.object({
  id: z.string().optional(),
  recipient: z.string().min(1),
  ts: z.string().datetime().optional(),
  scopeId: z.string().max(255).optional(),
  kudos: z.number().int().min(0).optional(),
  emoji: z.string().optional(),
  title: z.string().optional(),
  visibility: VisibilitySchema.optional(),
  meta: z.string().optional(),
});

export type EventInput = z.infer<typeof EventInputSchema>;
