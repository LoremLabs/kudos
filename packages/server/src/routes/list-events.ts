import type { FastifyInstance } from "fastify";
import {
  ListEventsQuerySchema,
  PoolServerError,
  ErrorCode,
  decodeCursor,
  encodeCursor,
} from "@kudos-protocol/pool-core";
import type { StoragePort } from "@kudos-protocol/ports";

interface ListDeps {
  storage: StoragePort;
}

export function registerListEvents(app: FastifyInstance, deps: ListDeps): void {
  const { storage } = deps;

  app.get<{ Params: { poolId: string }; Querystring: Record<string, string> }>(
    "/core/v1/pools/:poolId/events",
    async (request, reply) => {
      const parseResult = ListEventsQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        throw new PoolServerError(
          ErrorCode.VALIDATION_ERROR,
          parseResult.error.issues.map((i) => i.message).join("; "),
        );
      }

      const { poolId } = request.params;
      const query = parseResult.data;

      // Decode cursor if present (throws INVALID_CURSOR on bad input)
      const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;

      const result = await storage.readEvents({
        poolId,
        limit: query.limit,
        cursor,
        since: query.since,
        until: query.until,
        includeTombstones: query.includeTombstones,
      });

      const nextCursor =
        result.nextCursor && result.hasMore
          ? encodeCursor(result.nextCursor)
          : null;

      return reply.status(200).send({
        events: result.events,
        nextCursor,
        hasMore: result.hasMore,
      });
    },
  );
}
