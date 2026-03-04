import type { FastifyInstance } from "fastify";
import { PoolServerError, ErrorCode } from "@kudos-protocol/core";
import { ZodError } from "zod";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: unknown, _request, reply) => {
    if (error instanceof PoolServerError) {
      return reply.status(error.httpStatus).send(error.toResponse());
    }

    if (error instanceof ZodError) {
      return reply.status(422).send({
        status: "error",
        code: ErrorCode.VALIDATION_ERROR,
        message: error.issues.map((i: { message: string }) => i.message).join("; "),
      });
    }

    return reply.status(500).send({
      status: "error",
      code: ErrorCode.INTERNAL_ERROR,
      message: "Internal server error.",
    });
  });
}
