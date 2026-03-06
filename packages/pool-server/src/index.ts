// @kudos-protocol/server
export { createServer, poolServerPlugin, adminPlugin } from "@kudos-protocol/server";
export type { ServerOptions, AdminPluginOptions } from "@kudos-protocol/server";

// @kudos-protocol/worker-outbox
export { OutboxWorker, ConsoleSink } from "@kudos-protocol/worker-outbox";
export type { OutboxWorkerOptions } from "@kudos-protocol/worker-outbox";

// @kudos-protocol/pool-core — schemas
export {
  SubjectSchema,
  parseSubject,
  VisibilitySchema,
  VISIBILITIES,
  VISIBILITY_RANK,
  EventInputSchema,
  EventSchema,
  AppendEventsRequestSchema,
  AppendEventsResponseSchema,
  EventErrorSchema,
  ListEventsResponseSchema,
  PoolSummaryResponseSchema,
  RecipientSummarySchema,
  ErrorResponseSchema,
  PoolIdSchema,
  ListEventsQuerySchema,
  SummaryQuerySchema,
  PoolMetadataSchema,
} from "@kudos-protocol/pool-core";

// @kudos-protocol/pool-core — policy, normalize, validate, cursor, errors
export {
  DEFAULT_POLICY,
  normalizeEvent,
  validateEvent,
  encodeCursor,
  decodeCursor,
  PoolServerError,
  ErrorCode,
} from "@kudos-protocol/pool-core";

// @kudos-protocol/pool-core — types
export type {
  ParsedSubject,
  Visibility,
  EventInput,
  Event,
  AppendEventsRequest,
  AppendEventsResponse,
  EventError,
  ListEventsResponse,
  PoolSummaryResponse,
  RecipientSummary,
  ErrorResponse,
  PoolId,
  ListEventsQuery,
  SummaryQuery,
  CorePolicy,
  ValidationResult,
  NormalizeContext,
  ValidationOk,
  ValidationFail,
  EventValidationResult,
  CursorPayload,
  PoolMetadata,
} from "@kudos-protocol/pool-core";

// @kudos-protocol/ports
export type {
  StoragePort,
  AppendResult,
  ReadEventsOptions,
  ReadEventsResult,
  ReadSummaryResult,
  AuthPort,
  AuthResult,
  SinkPort,
  LoggerPort,
  OutboxPort,
  OutboxRow,
} from "@kudos-protocol/ports";

// @kudos-protocol/logging
export { default as logger } from "@kudos-protocol/logging";

// @kudos-protocol/subject-hash
export { getSubjectHash } from "@kudos-protocol/subject-hash";
