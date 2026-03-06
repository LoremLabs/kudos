import type { FastifyInstance } from "fastify";
import {
  SummaryQuerySchema,
  PoolServerError,
  ErrorCode,
  canRead,
} from "@kudos-protocol/pool-core";
import type { StoragePort } from "@kudos-protocol/ports";
import { getSubjectHash } from "@kudos-protocol/subject-hash";

interface SummaryDeps {
  storage: StoragePort;
}

export function registerGetSummary(app: FastifyInstance, deps: SummaryDeps): void {
  const { storage } = deps;

  app.get<{ Params: { poolId: string }; Querystring: Record<string, string> }>(
    "/core/v1/pools/:poolId/summary",
    async (request, reply) => {
      const parseResult = SummaryQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        throw new PoolServerError(
          ErrorCode.VALIDATION_ERROR,
          parseResult.error.issues.map((i) => i.message).join("; "),
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

      const { limit } = parseResult.data;

      const result = await storage.readSummary(poolId, limit);

      // Compute percent for each recipient
      const summary = result.summary.map((r) => ({
        ...r,
        percent:
          result.totalKudos > 0
            ? Math.round((r.kudos / result.totalKudos) * 10000) / 100
            : 0,
      }));

      return reply.status(200).send({
        totalKudos: result.totalKudos,
        summary,
      });
    },
  );
}
