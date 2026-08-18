import assert from "node:assert/strict";
import test from "node:test";
import type { ServerConfig } from "@spotriq/config";
import { buildServer } from "./app.js";

const config: ServerConfig = {
  nodeEnv: "test",
  appEnv: "development",
  apiHost: "127.0.0.1",
  apiPort: 3001,
  corsOrigins: ["http://localhost:5173"],
  bscNetwork: "testnet",
};

test("GET /health reports a usable development skeleton without configured dependencies", async () => {
  const app = await buildServer({ config, logger: false });
  const response = await app.inject({ method: "GET", url: "/health" });
  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.status, "ok");
  assert.equal(payload.dependencies[0].state, "not_configured");
  await app.close();
});

test("GET /v1/meta exposes Spotriq product metadata", async () => {
  const app = await buildServer({ config, logger: false });
  const response = await app.inject({ method: "GET", url: "/v1/meta" });
  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.data.brand, "Spotriq");
  assert.equal(payload.data.network, "testnet");
  await app.close();
});
