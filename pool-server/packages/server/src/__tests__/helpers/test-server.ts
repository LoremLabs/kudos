import { createServer } from "../../server.js";
import type { FastifyInstance } from "fastify";
import { InMemoryStorage } from "./mock-storage.js";
import { MockAuth, SpyAuth } from "./mock-auth.js";
import { MockSink } from "./mock-sink.js";
import type { CorePolicy } from "@kudos-protocol/core";

export interface TestContext {
  app: FastifyInstance;
  storage: InMemoryStorage;
  auth: MockAuth | SpyAuth;
  sink: MockSink;
}

export function createTestServer(opts?: {
  auth?: MockAuth | SpyAuth;
  policy?: Partial<CorePolicy>;
}): TestContext {
  const storage = new InMemoryStorage();
  const auth = opts?.auth ?? new MockAuth();
  const sink = new MockSink();

  const app = createServer({
    storage,
    auth,
    sink,
    policy: opts?.policy,
  });

  return { app, storage, auth, sink };
}

/** Auth header for the mock auth that grants the given subject. */
export function authHeader(subject: string): string {
  return `Bearer valid:${subject}`;
}
