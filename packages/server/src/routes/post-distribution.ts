import type { FastifyInstance } from "fastify";
import {
  DistributionRequestSchema,
  PoolServerError,
  ErrorCode,
  canRead,
  computeDistribution,
  serializeDistribution,
} from "@kudos-protocol/pool-core";
import type { StoragePort } from "@kudos-protocol/ports";
import { getSubjectHash } from "@kudos-protocol/subject-hash";

interface DistributionDeps {
  storage: StoragePort;
}

export function registerPostDistribution(app: FastifyInstance, deps: DistributionDeps): void {
  const { storage } = deps;

  app.post<{ Params: { poolId: string } }>(
    "/core/v1/pools/:poolId/distribution",
    async (request, reply) => {
      const parseResult = DistributionRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new PoolServerError(
          ErrorCode.VALIDATION_ERROR,
          parseResult.error.issues.map((i) => i.message).join("; "),
        );
      }

      const { totalPie: totalPieStr } = parseResult.data;

      // Operational clamp: reject absurdly large strings to prevent DoS
      if (totalPieStr.length > 78) {
        throw new PoolServerError(
          ErrorCode.VALIDATION_ERROR,
          "totalPie exceeds maximum supported length (78 digits)",
        );
      }

      const { poolId } = request.params;

      // Pool permission check
      const poolMeta = await storage.getPoolMetadata(poolId);
      if (poolMeta?.permissions) {
        const subjectHash = getSubjectHash(request.sender);
        if (!canRead(poolMeta.permissions, subjectHash)) {
          throw new PoolServerError(
            ErrorCode.FORBIDDEN,
            "You do not have read permission on this pool.",
          );
        }
      }

      const totalPie = BigInt(totalPieStr);
      const { totalKudos, recipients } = await storage.readRecipientTotals(poolId);
      const result = computeDistribution(totalPie, recipients);

      // Filter out zero-allocation items
      const filtered = {
        ...result,
        items: result.items.filter((item) => item.points > 0n),
      };
      filtered.itemCount = filtered.items.length;

      return reply.status(200).send(serializeDistribution(filtered, poolId, totalPie));
    },
  );
}
