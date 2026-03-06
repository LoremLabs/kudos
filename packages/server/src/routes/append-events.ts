import type { FastifyInstance } from "fastify";
import {
  AppendEventsRequestSchema,
  normalizeEvent,
  validateEvent,
  PoolServerError,
  ErrorCode,
  DEFAULT_POLICY,
  canWrite,
  isPoolFrozen,
} from "@kudos-protocol/pool-core";
import type {
  Event,
  EventError,
  CorePolicy,
  AppendEventsResponse,
} from "@kudos-protocol/pool-core";
import type { StoragePort, SinkPort } from "@kudos-protocol/ports";
import type { LoggerPort } from "@kudos-protocol/ports";
import { getSubjectHash } from "@kudos-protocol/subject-hash";

interface AppendDeps {
  storage: StoragePort;
  sink?: SinkPort;
  policy?: Partial<CorePolicy>;
  logger?: LoggerPort;
}

export function registerAppendEvents(app: FastifyInstance, deps: AppendDeps): void {
  const { storage, sink, logger } = deps;
  const policy = { ...DEFAULT_POLICY, ...deps.policy };

  app.post<{ Params: { poolId: string } }>(
    "/core/v1/pools/:poolId/events",
    async (request, reply) => {
      // Parse body
      const parseResult = AppendEventsRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new PoolServerError(
          ErrorCode.VALIDATION_ERROR,
          parseResult.error.issues.map((i) => i.message).join("; "),
        );
      }
      const body = parseResult.data;
      const { poolId } = request.params;

      // Pool permission check
      const poolMeta = await storage.getPoolMetadata(poolId);
      if (poolMeta?.permissions) {
        const subjectHash = getSubjectHash(request.sender);
        if (!canWrite(poolMeta.permissions, subjectHash)) {
          throw new PoolServerError(
            ErrorCode.FORBIDDEN,
            "You do not have write permission on this pool.",
          );
        }
        if (isPoolFrozen(poolMeta.config ?? null)) {
          throw new PoolServerError(
            ErrorCode.FORBIDDEN,
            "This pool is frozen and cannot accept new events.",
          );
        }
      }

      // Sender mismatch check
      if (request.sender !== body.sender) {
        throw new PoolServerError(
          ErrorCode.FORBIDDEN,
          "Authenticated sender does not match request sender.",
        );
      }

      // Batch size check
      if (body.events.length > policy.maxBatchSize) {
        throw new PoolServerError(
          ErrorCode.BATCH_TOO_LARGE,
          `Batch size ${body.events.length} exceeds maximum of ${policy.maxBatchSize}.`,
        );
      }

      const isStrict = body.mode === "strict";
      const validEvents: Event[] = [];
      const errors: EventError[] = [];

      // Normalize + validate all events
      for (let i = 0; i < body.events.length; i++) {
        const normalized = normalizeEvent(body.events[i], { sender: body.sender });
        const result = validateEvent(normalized, deps.policy);

        if (!result.ok) {
          errors.push({
            eventId: normalized.id ?? null,
            index: i,
            message: result.message,
          });
        } else {
          validEvents.push(normalized);
        }
      }

      // Strict mode: reject entire batch if any errors
      if (isStrict && errors.length > 0) {
        const response: AppendEventsResponse = {
          status: "error",
          accepted: 0,
          rejected: body.events.length,
          errors,
          events: [],
        };
        return reply.status(422).send(response);
      }

      // Lax mode: all invalid → 422
      if (!isStrict && validEvents.length === 0) {
        const response: AppendEventsResponse = {
          status: "error",
          accepted: 0,
          rejected: errors.length,
          errors,
          events: [],
        };
        return reply.status(422).send(response);
      }

      // Append valid events to storage
      let appendResult = { inserted: 0, skipped: 0, events: [] as Event[] };
      if (validEvents.length > 0) {
        appendResult = await storage.appendEvents(poolId, validEvents);
      }

      // Fire-and-forget sink
      if (sink && appendResult.events.length > 0) {
        void sink.publish(poolId, appendResult.events).catch((err) => {
          logger?.warn("Sink publish failed", { poolId, error: String(err) });
        });
      }

      const accepted = appendResult.events.length;
      const rejected = errors.length;
      let status: "ok" | "partial" | "error";
      if (rejected === 0) {
        status = "ok";
      } else {
        status = "partial";
      }

      const response: AppendEventsResponse = {
        status,
        accepted,
        rejected,
        errors: errors.length > 0 ? errors : undefined,
        events: appendResult.events,
      };

      return reply.status(200).send(response);
    },
  );
}
