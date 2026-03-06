import type { FastifyInstance } from "fastify";
import type { StoragePort } from "@kudos-protocol/ports";

interface MetadataDeps {
  storage: StoragePort;
}

export function registerGetPoolMetadata(app: FastifyInstance, deps: MetadataDeps): void {
  const { storage } = deps;

  app.get<{ Params: { poolId: string } }>(
    "/core/v1/pools/:poolId/metadata",
    async (request, reply) => {
      const { poolId } = request.params;
      const metadata = await storage.getPoolMetadata(poolId);

      if (!metadata) {
        return reply.status(200).send({
          name: null,
          permissions: null,
          config: null,
        });
      }

      return reply.status(200).send(metadata);
    },
  );
}
