import { logger as log } from "@kudos-protocol/pool-server";
import type { LoggerPort } from "@kudos-protocol/pool-server";

export const logger: LoggerPort = {
  debug(msg: string, data?: Record<string, unknown>) { log.debug(msg, data); },
  info(msg: string, data?: Record<string, unknown>) { log.info(msg, data); },
  warn(msg: string, data?: Record<string, unknown>) { log.warn(msg, data); },
  error(msg: string, data?: Record<string, unknown>) { log.error(msg, data); },
};
