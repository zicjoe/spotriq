import assert from "node:assert/strict";
import test from "node:test";
import { BscChainAdapter } from "@spotriq/chain";
import type { ServerConfig } from "@spotriq/config";
import { buildServer } from "./app.js";

const config: ServerConfig = {
  nodeEnv: "test",
  appEnv: "development",
  apiHost: "127.0.0.1",
  apiPort: 3001,
  corsOrigins: ["http://localhost:5173"],
  bscNetwork: "testnet",
  bscRpcTimeoutMs: 7500,
};

function rpcResponse(id: number, result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), { status: 200, headers: { "content-type": "application/json" } });
}

const fetchImpl = (async (_input: string | URL | Request, init?: RequestInit) => {
  const body = JSON.parse(String(init?.body)) as { method: string; params: unknown[]; id: number };
  if (body.method === "eth_chainId") return rpcResponse(body.id, "0x61");
  if (body.method === "eth_blockNumber") return rpcResponse(body.id, "0x64");
  if (body.method === "eth_getBalance") return rpcResponse(body.id, "0xde0b6b3a7640000");
  if (body.method === "eth_getBlockByNumber") return rpcResponse(body.id, {
    number: "0x64",
    hash: `0x${"11".repeat(32)}`,
    parentHash: `0x${"22".repeat(32)}`,
    timestamp: "0x65d00000",
  });
  if (body.method === "eth_getTransactionByHash") return rpcResponse(body.id, null);
  if (body.method === "eth_getTransactionReceipt") return rpcResponse(body.id, null);
  throw new Error(`Unexpected RPC method ${body.method}`);
}) as typeof fetch;

function makeChain() {
  return new BscChainAdapter({
    network: "testnet",
    primaryRpcUrl: "https://rpc.test",
    fetchImpl,
  });
}

test("GET /health reports database plus BSC health", async () => {
  const app = await buildServer({ config, chain: makeChain(), logger: false });
  const response = await app.inject({ method: "GET", url: "/health" });
  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.status, "ok");
  assert.equal(payload.dependencies.length, 2);
  assert.equal(payload.dependencies[0].state, "not_configured");
  assert.equal(payload.dependencies[1].state, "ok");
  await app.close();
});

test("GET /v1/meta exposes Spotriq product metadata", async () => {
  const app = await buildServer({ config, chain: makeChain(), logger: false });
  const response = await app.inject({ method: "GET", url: "/v1/meta" });
  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.data.brand, "Spotriq");
  assert.equal(payload.data.network, "testnet");
  await app.close();
});

test("GET /v1/chain/status exposes live normalized BSC status", async () => {
  const app = await buildServer({ config, chain: makeChain(), logger: false });
  const response = await app.inject({ method: "GET", url: "/v1/chain/status" });
  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.data.expectedChainId, 97);
  assert.equal(payload.data.latestBlockNumber, "100");
  await app.close();
});

test("GET wallet balances returns native balance with evidence", async () => {
  const app = await buildServer({ config, chain: makeChain(), logger: false });
  const response = await app.inject({ method: "GET", url: "/v1/wallets/0x1111111111111111111111111111111111111111/balances" });
  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.data.snapshot.native.balanceFormatted, "1");
  assert.equal(payload.data.snapshot.native.evidence.truthLayer, "CANONICAL_ONCHAIN");
  await app.close();
});

test("invalid wallet address produces a structured 400 instead of an internal error", async () => {
  const app = await buildServer({ config, chain: makeChain(), logger: false });
  const response = await app.inject({ method: "GET", url: "/v1/wallets/not-an-address/balances" });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error.code, "INVALID_ADDRESS");
  await app.close();
});
