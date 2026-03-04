import { PoolServerError, ErrorCode } from "@kudos-protocol/pool-server";
import type { AuthPort, AuthResult } from "@kudos-protocol/pool-server";

export class StaticTokenAuth implements AuthPort {
  constructor(private secret: string) {}

  async verify(token: string, _poolId: string, _action: "append" | "read"): Promise<AuthResult> {
    const colonIdx = token.indexOf(":");
    if (colonIdx === -1) {
      throw new PoolServerError(ErrorCode.UNAUTHORIZED, "Invalid token format.");
    }
    const secret = token.substring(0, colonIdx);
    const subject = token.substring(colonIdx + 1);
    if (secret !== this.secret || !subject) {
      throw new PoolServerError(ErrorCode.UNAUTHORIZED, "Invalid token.");
    }
    return { subject };
  }
}
