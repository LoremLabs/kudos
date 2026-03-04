import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { ServerOptions } from "./types.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { registerAuth } from "./plugins/auth.js";
import { registerAppendEvents } from "./routes/append-events.js";
import { registerListEvents } from "./routes/list-events.js";
import { registerGetSummary } from "./routes/get-summary.js";

/**
 * Create a configured Fastify instance. Does NOT call .listen().
 */
export function createServer(options: ServerOptions): FastifyInstance {
  const app = Fastify({ logger: false });

  // Register error handler
  registerErrorHandler(app);

  // Register auth
  registerAuth(app, options.auth);

  // Register routes
  registerAppendEvents(app, {
    storage: options.storage,
    sink: options.sink,
    policy: options.policy,
    logger: options.logger,
  });

  registerListEvents(app, { storage: options.storage });
  registerGetSummary(app, { storage: options.storage });

  return app;
}
