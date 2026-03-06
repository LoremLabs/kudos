import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import type { ServerOptions } from "./types.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { registerAuth } from "./plugins/auth.js";
import { registerAppendEvents } from "./routes/append-events.js";
import { registerListEvents } from "./routes/list-events.js";
import { registerGetSummary } from "./routes/get-summary.js";
import { registerGetPoolMetadata } from "./routes/get-pool-metadata.js";
import { registerSetPoolMetadata } from "./routes/set-pool-metadata.js";
import { registerPostDistribution } from "./routes/post-distribution.js";

async function poolServerPluginFn(app: FastifyInstance, options: ServerOptions): Promise<void> {
  registerErrorHandler(app);
  registerAuth(app, options.auth);
  registerAppendEvents(app, {
    storage: options.storage,
    sink: options.sink,
    policy: options.policy,
    logger: options.logger,
  });
  registerListEvents(app, { storage: options.storage });
  registerGetSummary(app, { storage: options.storage });
  registerGetPoolMetadata(app, { storage: options.storage });
  registerSetPoolMetadata(app, { storage: options.storage });
  registerPostDistribution(app, { storage: options.storage });
}

export const poolServerPlugin = fp(poolServerPluginFn, {
  name: "@kudos-protocol/server",
});
