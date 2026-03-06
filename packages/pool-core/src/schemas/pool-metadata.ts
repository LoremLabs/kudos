import { z } from "zod";

export const PoolMetadataSchema = z.object({
  name: z.string().max(255).nullable().default(null),
  permissions: z.array(z.string()).nullable().default(null),
  config: z.string().nullable().default(null),
});

export type PoolMetadata = z.infer<typeof PoolMetadataSchema>;
