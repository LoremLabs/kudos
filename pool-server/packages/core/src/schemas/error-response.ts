import { z } from "zod";

export const ErrorResponseSchema = z.object({
  status: z.literal("error"),
  code: z.string(),
  message: z.string(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
