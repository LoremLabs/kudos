import type { FastifyInstance } from "fastify";
import {
  PoolMetadataSchema,
  PoolServerError,
  ErrorCode,
  canAdmin,
} from "@kudos-protocol/pool-core";
import type { StoragePort } from "@kudos-protocol/ports";
import { getSubjectHash } from "@kudos-protocol/subject-hash";

interface MetadataDeps {
  storage: StoragePort;
}

export function registerSetPoolMetadata(app: FastifyInstance, deps: MetadataDeps): void {
  const { storage } = deps;

  app.patch<{ Params: { poolId: string } }>(
    "/core/v1/pools/:poolId/metadata",
    async (request, reply) => {
      const parseResult = PoolMetadataSchema.partial().safeParse(request.body);
      if (!parseResult.success) {
        throw new PoolServerError(
          ErrorCode.VALIDATION_ERROR,
          parseResult.error.issues.map((i) => i.message).join("; "),
        );
      }

      const { poolId } = request.params;

      // Pool permission check — require admin
      const existingMeta = await storage.getPoolMetadata(poolId);
      if (existingMeta?.permissions) {
        const subjectHash = getSubjectHash(request.sender);
        if (!canAdmin(existingMeta.permissions, subjectHash)) {
          throw new PoolServerError(
            ErrorCode.FORBIDDEN,
            "You do not have admin permission on this pool.",
          );
        }
      }

      await storage.setPoolMetadata(poolId, parseResult.data);

      return reply.status(200).send({ ok: true });
    },
  );
}
