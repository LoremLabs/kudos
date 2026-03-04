import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { adminPlugin } from "../plugins/admin.js";
import type { StoragePort } from "@kudos-protocol/ports";
import { InMemoryStorage } from "./helpers/mock-storage.js";

function buildApp(storage: StoragePort) {
  const app = Fastify({ logger: false });
  void app.register(adminPlugin, { storage });
  return app;
}

describe("admin plugin", () => {
  it("/healthz returns 200 with status ok", async () => {
    const app = buildApp(new InMemoryStorage());
    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("/readyz returns 200 when storage is healthy", async () => {
    const app = buildApp(new InMemoryStorage());
    const res = await app.inject({ method: "GET", url: "/readyz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ready" });
  });

  it("/readyz returns 503 when ping() throws", async () => {
    const storage = new InMemoryStorage();
    storage.ping = async () => { throw new Error("db gone"); };
    const app = buildApp(storage);
    const res = await app.inject({ method: "GET", url: "/readyz" });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ status: "not ready" });
  });

  it("admin routes do not require auth", async () => {
    const app = buildApp(new InMemoryStorage());
    // No Authorization header — should still succeed
    const healthRes = await app.inject({ method: "GET", url: "/healthz" });
    expect(healthRes.statusCode).toBe(200);
    const readyRes = await app.inject({ method: "GET", url: "/readyz" });
    expect(readyRes.statusCode).toBe(200);
  });
});
