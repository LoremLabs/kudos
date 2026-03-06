import { z } from "zod";

export const DistributionRequestSchema = z.object({
  totalPie: z.string().regex(/^[1-9]\d*$/, "totalPie must be a positive integer string"),
});

export type DistributionRequest = z.infer<typeof DistributionRequestSchema>;
