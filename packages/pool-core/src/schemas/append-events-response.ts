import { z } from "zod";
import { EventSchema } from "./event.js";
import { EventErrorSchema } from "./event-error.js";

export const AppendEventsResponseSchema = z.object({
  status: z.enum(["ok", "partial", "error"]),
  accepted: z.number().int().min(0),
  rejected: z.number().int().min(0),
  errors: z.array(EventErrorSchema).optional(),
  events: z.array(EventSchema).optional(),
});

export type AppendEventsResponse = z.infer<typeof AppendEventsResponseSchema>;
