import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { ServerOptions } from "./types.js";
import { poolServerPlugin } from "./plugin.js";

/**
 * Create a configured Fastify instance. Does NOT call .listen().
 */
export function createServer(options: ServerOptions): FastifyInstance {
  const app = Fastify({ logger: false });
  void app.register(poolServerPlugin, options);
  return app;
}
