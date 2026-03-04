import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import type { StoragePort } from "@kudos-protocol/ports";

export interface AdminPluginOptions {
  storage: StoragePort;
}

async function adminPluginFn(app: FastifyInstance, options: AdminPluginOptions): Promise<void> {
  app.get("/healthz", async (_request, reply) => {
    return reply.send({ status: "ok" });
  });

  app.get("/readyz", async (_request, reply) => {
    try {
      await options.storage.ping();
      return reply.send({ status: "ready" });
    } catch {
      return reply.status(503).send({ status: "not ready" });
    }
  });
}

export const adminPlugin = fp(adminPluginFn, {
  name: "@kudos-protocol/admin",
});
