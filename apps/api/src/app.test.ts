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

test("GET PancakeSwap status exposes normalized adapter capabilities", async () => {
  const pancakeSwap = {
    getStatus: () => ({
      protocol: "PancakeSwap" as const,
      network: "testnet" as const,
      chainId: 97,
      contracts: {
        network: "testnet" as const,
        v3Factory: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
        v3PositionManager: "0x427bF5b37357632377eCbEC9de3626C71A5396c1",
        infinityClPoolManager: "0x36A12c70c9Cf64f24E89ee132BF93Df2DCD199d4",
        infinityClPositionManager: "0x77DedB52EC6260daC4011313DBEE09616d30d122",
        infinityVault: "0x2CdB3EC82EE13d341Dc6E73637BE0Eab79cb79dD",
      },
      capabilities: {
        v3WalletDiscovery: true as const,
        v3PositionRead: true as const,
        infinityClPositionReadByTokenId: true as const,
        infinityClWalletDiscovery: false as const,
        positionValuation: false as const,
        historicalAnalytics: false as const,
      },
      coverageNotes: ["test"],
    }),
    getV3Position: async () => { throw new Error("not used"); },
    getInfinityClPosition: async () => { throw new Error("not used"); },
    getPosition: async () => { throw new Error("not used"); },
    getWalletPositions: async (walletAddress: string) => ({
      walletAddress,
      network: "testnet" as const,
      chainId: 97,
      blockNumber: "100",
      observedAt: new Date().toISOString(),
      positions: [],
      coverage: {
        v3Discovery: "AVAILABLE" as const,
        infinityClDiscovery: "TOKEN_ID_REQUIRED" as const,
        failedV3PositionRefs: [],
        truncated: false,
        maxPositions: 50,
      },
    }),
  };
  const app = await buildServer({ config, chain: makeChain(), pancakeSwap, logger: false });
  const response = await app.inject({ method: "GET", url: "/v1/protocols/pancakeswap/status" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.capabilities.v3WalletDiscovery, true);
  assert.equal(response.json().data.capabilities.infinityClWalletDiscovery, false);
  await app.close();
});

test("GET wallet PancakeSwap positions preserves explicit Infinity discovery coverage", async () => {
  const pancakeSwap = {
    getStatus: () => ({
      protocol: "PancakeSwap" as const,
      network: "testnet" as const,
      chainId: 97,
      contracts: {
        network: "testnet" as const,
        v3Factory: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
        v3PositionManager: "0x427bF5b37357632377eCbEC9de3626C71A5396c1",
        infinityClPoolManager: "0x36A12c70c9Cf64f24E89ee132BF93Df2DCD199d4",
        infinityClPositionManager: "0x77DedB52EC6260daC4011313DBEE09616d30d122",
        infinityVault: "0x2CdB3EC82EE13d341Dc6E73637BE0Eab79cb79dD",
      },
      capabilities: {
        v3WalletDiscovery: true as const, v3PositionRead: true as const, infinityClPositionReadByTokenId: true as const,
        infinityClWalletDiscovery: false as const, positionValuation: false as const, historicalAnalytics: false as const,
      },
      coverageNotes: [],
    }),
    getV3Position: async () => { throw new Error("not used"); },
    getInfinityClPosition: async () => { throw new Error("not used"); },
    getPosition: async () => { throw new Error("not used"); },
    getWalletPositions: async (walletAddress: string, maxPositions?: number) => ({
      walletAddress,
      network: "testnet" as const,
      chainId: 97,
      blockNumber: "100",
      observedAt: new Date().toISOString(),
      positions: [],
      coverage: {
        v3Discovery: "AVAILABLE" as const,
        infinityClDiscovery: "TOKEN_ID_REQUIRED" as const,
        failedV3PositionRefs: [],
        truncated: false,
        maxPositions: maxPositions ?? 50,
      },
    }),
  };
  const app = await buildServer({ config, chain: makeChain(), pancakeSwap, logger: false });
  const response = await app.inject({ method: "GET", url: "/v1/wallets/0x1111111111111111111111111111111111111111/pancakeswap/positions?max=5" });
  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.data.snapshot.coverage.infinityClDiscovery, "TOKEN_ID_REQUIRED");
  assert.equal(payload.data.snapshot.coverage.maxPositions, 5);
  await app.close();
});

test("invalid PancakeSwap protocol version returns a structured 400", async () => {
  const app = await buildServer({ config, chain: makeChain(), logger: false });
  const response = await app.inject({ method: "GET", url: "/v1/protocols/pancakeswap/positions/v2/1" });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error.code, "INVALID_PROTOCOL_VERSION");
  await app.close();
});
