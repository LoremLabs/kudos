import type { FastifyInstance } from "fastify";
import { PoolServerError, ErrorCode, canRead } from "@kudos-protocol/pool-core";
import type { StoragePort } from "@kudos-protocol/ports";
import { getSubjectHash } from "@kudos-protocol/subject-hash";

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

      // Pool permission check
      if (metadata.permissions) {
        const subjectHash = getSubjectHash(request.sender);
        if (!canRead(metadata.permissions, subjectHash)) {
          throw new PoolServerError(
            ErrorCode.FORBIDDEN,
            "You do not have read permission on this pool.",
          );
        }
      }

      return reply.status(200).send(metadata);
    },
  );
}
