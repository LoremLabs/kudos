export const ErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  BATCH_TOO_LARGE: "BATCH_TOO_LARGE",
  INVALID_CURSOR: "INVALID_CURSOR",
  SELF_SEND: "SELF_SEND",
  TIMESTAMP_FUTURE: "TIMESTAMP_FUTURE",
  INVALID_SUBJECT: "INVALID_SUBJECT",
  INVALID_EMOJI: "INVALID_EMOJI",
  INVALID_TITLE: "INVALID_TITLE",
  TOMBSTONE_REQUIRES_SCOPE: "TOMBSTONE_REQUIRES_SCOPE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  BATCH_TOO_LARGE: 413,
  INVALID_CURSOR: 400,
  SELF_SEND: 422,
  TIMESTAMP_FUTURE: 422,
  INVALID_SUBJECT: 422,
  INVALID_EMOJI: 422,
  INVALID_TITLE: 422,
  TOMBSTONE_REQUIRES_SCOPE: 422,
  INTERNAL_ERROR: 500,
};

export class PoolServerError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "PoolServerError";
    this.code = code;
    this.httpStatus = HTTP_STATUS[code];
  }

  toResponse() {
    return {
      status: "error" as const,
      code: this.code,
      message: this.message,
    };
  }
}
