import type { FastifyInstance, FastifyRequest } from "fastify";
import { PoolServerError, ErrorCode } from "@kudos-protocol/core";
import type { AuthPort } from "@kudos-protocol/ports";

declare module "fastify" {
  interface FastifyRequest {
    sender: string;
  }
}

function extractBearer(header: string | undefined): string {
  if (!header) {
    throw new PoolServerError(ErrorCode.UNAUTHORIZED, "Missing Authorization header.");
  }
  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
    throw new PoolServerError(ErrorCode.UNAUTHORIZED, "Malformed Authorization header. Expected 'Bearer <token>'.");
  }
  return parts[1];
}

function deriveAction(method: string): "append" | "read" {
  return method === "POST" ? "append" : "read";
}

export function registerAuth(app: FastifyInstance, auth: AuthPort): void {
  app.decorateRequest("sender", "");

  app.addHook("onRequest", async (request: FastifyRequest) => {
    // Only apply to /core/v1/* routes
    if (!request.url.startsWith("/core/v1/")) {
      return;
    }

    const token = extractBearer(request.headers.authorization);
    const poolId = (request.params as Record<string, string>).poolId ?? "";
    const action = deriveAction(request.method);

    const result = await auth.verify(token, poolId, action);
    request.sender = result.subject;
  });
}
