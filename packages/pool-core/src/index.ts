// Schemas
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
} from "./schemas/index.js";

// Types (re-exported from schemas)
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
} from "./types.js";

// Policy
export { DEFAULT_POLICY } from "./policy.js";
export type { CorePolicy, ValidationResult } from "./policy.js";

// Normalize
export { normalizeEvent } from "./normalize.js";
export type { NormalizeContext } from "./normalize.js";

// Validate
export { validateEvent } from "./validate.js";
export type {
  ValidationOk,
  ValidationFail,
  ValidationResult as EventValidationResult,
} from "./validate.js";

// Cursor
export { encodeCursor, decodeCursor } from "./cursor.js";
export type { CursorPayload } from "./cursor.js";

// Errors
export { PoolServerError, ErrorCode } from "./errors.js";
