import { z } from "zod";

export const RecipientSummarySchema = z.object({
  recipient: z.string(),
  kudos: z.number().int().min(0),
  emojis: z.array(z.string()),
  percent: z.number().min(0).max(100),
});

export type RecipientSummary = z.infer<typeof RecipientSummarySchema>;

export const PoolSummaryResponseSchema = z.object({
  totalKudos: z.number().int().min(0),
  summary: z.array(RecipientSummarySchema),
});

export type PoolSummaryResponse = z.infer<typeof PoolSummaryResponseSchema>;
