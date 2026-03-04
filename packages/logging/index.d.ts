/**
 * Pre-configured pino logger with GCP-compatible severity levels.
 *
 * The logMethod hook flips pino's default call signature so that all
 * logging methods are called as `(msg, mergingObject?, ...args)` instead
 * of pino's native `(mergingObject, msg, ...args)`.
 */

interface KudosLogger {
  log(msg: string, obj?: Record<string, unknown>, ...args: unknown[]): void;
  debug(msg: string, obj?: Record<string, unknown>, ...args: unknown[]): void;
  info(msg: string, obj?: Record<string, unknown>, ...args: unknown[]): void;
  notice(msg: string, obj?: Record<string, unknown>, ...args: unknown[]): void;
  warn(msg: string, obj?: Record<string, unknown>, ...args: unknown[]): void;
  error(msg: string, obj?: Record<string, unknown>, ...args: unknown[]): void;
  critical(msg: string, obj?: Record<string, unknown>, ...args: unknown[]): void;
  alert(msg: string, obj?: Record<string, unknown>, ...args: unknown[]): void;
  emergency(msg: string, obj?: Record<string, unknown>, ...args: unknown[]): void;

  /** Current log level name. */
  level: string;
}

declare const logger: KudosLogger;
export default logger;
