import { describe, it, expect } from "vitest";
import { PoolServerError, ErrorCode } from "../errors.js";

describe("ErrorCode", () => {
  it("has all expected codes", () => {
    expect(ErrorCode.UNAUTHORIZED).toBe("UNAUTHORIZED");
    expect(ErrorCode.FORBIDDEN).toBe("FORBIDDEN");
    expect(ErrorCode.NOT_FOUND).toBe("NOT_FOUND");
    expect(ErrorCode.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
    expect(ErrorCode.BATCH_TOO_LARGE).toBe("BATCH_TOO_LARGE");
    expect(ErrorCode.INVALID_CURSOR).toBe("INVALID_CURSOR");
    expect(ErrorCode.SELF_SEND).toBe("SELF_SEND");
    expect(ErrorCode.TIMESTAMP_FUTURE).toBe("TIMESTAMP_FUTURE");
    expect(ErrorCode.INVALID_SUBJECT).toBe("INVALID_SUBJECT");
    expect(ErrorCode.INVALID_EMOJI).toBe("INVALID_EMOJI");
    expect(ErrorCode.INVALID_TITLE).toBe("INVALID_TITLE");
    expect(ErrorCode.TOMBSTONE_REQUIRES_SCOPE).toBe("TOMBSTONE_REQUIRES_SCOPE");
    expect(ErrorCode.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
  });
});

describe("PoolServerError", () => {
  it("maps UNAUTHORIZED to 401", () => {
    const err = new PoolServerError(ErrorCode.UNAUTHORIZED, "No token");
    expect(err.httpStatus).toBe(401);
  });

  it("maps FORBIDDEN to 403", () => {
    const err = new PoolServerError(ErrorCode.FORBIDDEN, "Not allowed");
    expect(err.httpStatus).toBe(403);
  });

  it("maps NOT_FOUND to 404", () => {
    const err = new PoolServerError(ErrorCode.NOT_FOUND, "Pool not found");
    expect(err.httpStatus).toBe(404);
  });

  it("maps VALIDATION_ERROR to 422", () => {
    const err = new PoolServerError(ErrorCode.VALIDATION_ERROR, "Bad input");
    expect(err.httpStatus).toBe(422);
  });

  it("maps BATCH_TOO_LARGE to 413", () => {
    const err = new PoolServerError(ErrorCode.BATCH_TOO_LARGE, "Too many");
    expect(err.httpStatus).toBe(413);
  });

  it("maps INVALID_CURSOR to 400", () => {
    const err = new PoolServerError(ErrorCode.INVALID_CURSOR, "Bad cursor");
    expect(err.httpStatus).toBe(400);
  });

  it("maps SELF_SEND to 422", () => {
    const err = new PoolServerError(ErrorCode.SELF_SEND, "Self");
    expect(err.httpStatus).toBe(422);
  });

  it("maps INTERNAL_ERROR to 500", () => {
    const err = new PoolServerError(ErrorCode.INTERNAL_ERROR, "Oops");
    expect(err.httpStatus).toBe(500);
  });

  it("extends Error", () => {
    const err = new PoolServerError(ErrorCode.NOT_FOUND, "Missing");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("PoolServerError");
    expect(err.message).toBe("Missing");
  });

  describe("toResponse()", () => {
    it("returns correct shape", () => {
      const err = new PoolServerError(ErrorCode.VALIDATION_ERROR, "Invalid data");
      const resp = err.toResponse();

      expect(resp).toEqual({
        status: "error",
        code: "VALIDATION_ERROR",
        message: "Invalid data",
      });
    });

    it("has status: error (literal)", () => {
      const err = new PoolServerError(ErrorCode.NOT_FOUND, "Gone");
      expect(err.toResponse().status).toBe("error");
    });
  });
});
