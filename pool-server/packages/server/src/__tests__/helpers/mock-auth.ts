import { PoolServerError, ErrorCode } from "@kudos-protocol/core";
import type { AuthPort, AuthResult } from "@kudos-protocol/ports";

/**
 * Mock AuthPort for testing.
 * Accepts tokens in the format "valid:<subject>" (e.g. "valid:email:alice@example.com").
 * Rejects everything else.
 */
export class MockAuth implements AuthPort {
  async verify(token: string, _poolId: string, _action: "append" | "read"): Promise<AuthResult> {
    if (token.startsWith("valid:")) {
      const subject = token.slice("valid:".length);
      return { subject };
    }
    throw new PoolServerError(ErrorCode.UNAUTHORIZED, "Invalid token.");
  }
}

/**
 * Mock AuthPort that tracks calls for assertion.
 */
export class SpyAuth implements AuthPort {
  calls: Array<{ token: string; poolId: string; action: "append" | "read" }> = [];

  async verify(token: string, poolId: string, action: "append" | "read"): Promise<AuthResult> {
    this.calls.push({ token, poolId, action });
    if (token.startsWith("valid:")) {
      return { subject: token.slice("valid:".length) };
    }
    throw new PoolServerError(ErrorCode.UNAUTHORIZED, "Invalid token.");
  }
}
