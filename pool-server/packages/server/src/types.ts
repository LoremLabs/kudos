import type { StoragePort, AuthPort, SinkPort, LoggerPort } from "@kudos-protocol/ports";
import type { CorePolicy } from "@kudos-protocol/core";

export interface ServerOptions {
  storage: StoragePort;
  auth: AuthPort;
  sink?: SinkPort;
  policy?: Partial<CorePolicy>;
  logger?: LoggerPort;
}
