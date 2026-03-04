// Temporary shim — remove after @kudos-protocol/logging@0.0.4 is published (includes its own types).
declare module "@kudos-protocol/logging" {
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
    level: string;
  }
  const logger: KudosLogger;
  export default logger;
}
