import type { FastifyInstance } from "fastify";
import {
  SummaryQuerySchema,
  PoolServerError,
  ErrorCode,
} from "@kudos-protocol/pool-core";
import type { StoragePort } from "@kudos-protocol/ports";

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
