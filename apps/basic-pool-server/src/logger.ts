import log from "@kudos-protocol/logging";
import type { LoggerPort } from "@kudos-protocol/ports";

export const logger: LoggerPort = {
  debug(msg: string, data?: Record<string, unknown>) { log.debug(msg, data); },
  info(msg: string, data?: Record<string, unknown>) { log.info(msg, data); },
  warn(msg: string, data?: Record<string, unknown>) { log.warn(msg, data); },
  error(msg: string, data?: Record<string, unknown>) { log.error(msg, data); },
};
