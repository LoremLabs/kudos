import { z } from "zod";
import { EventSchema } from "./event.js";

export const ListEventsResponseSchema = z.object({
  events: z.array(EventSchema),
  nextCursor: z.string().nullable().optional(),
  hasMore: z.boolean(),
});

export type ListEventsResponse = z.infer<typeof ListEventsResponseSchema>;
