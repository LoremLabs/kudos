import { z } from "zod";
import { SubjectSchema } from "./subject.js";
import { EventInputSchema } from "./event-input.js";

export const AppendEventsRequestSchema = z.object({
  sender: SubjectSchema,
  mode: z.enum(["lax", "strict"]).default("lax"),
  events: z.array(EventInputSchema).min(1).max(10_000),
});

export type AppendEventsRequest = z.infer<typeof AppendEventsRequestSchema>;
