import { z } from "zod";

export const EventErrorSchema = z.object({
  eventId: z.string().nullable().optional(),
  index: z.number().int().min(0),
  message: z.string(),
});

export type EventError = z.infer<typeof EventErrorSchema>;
