import { z } from "zod";

export const PoolIdSchema = z
  .string()
  .min(1)
  .max(255);

export type PoolId = z.infer<typeof PoolIdSchema>;

export const ListEventsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  includeTombstones: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .default("false"),
});

export type ListEventsQuery = z.infer<typeof ListEventsQuerySchema>;

export const SummaryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(50),
});

export type SummaryQuery = z.infer<typeof SummaryQuerySchema>;
