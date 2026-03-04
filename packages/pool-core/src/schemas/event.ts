import { z } from "zod";
import { SubjectSchema } from "./subject.js";
import { VisibilitySchema } from "./visibility.js";

export const EventSchema = z.object({
  id: z.string(),
  recipient: SubjectSchema,
  sender: SubjectSchema,
  ts: z.string().datetime(),
  scopeId: z.string().nullable(),
  kudos: z.number().int().min(0).max(5000),
  emoji: z.string().nullable(),
  title: z.string().nullable(),
  visibility: VisibilitySchema,
  meta: z.string().nullable(),
});

export type Event = z.infer<typeof EventSchema>;
