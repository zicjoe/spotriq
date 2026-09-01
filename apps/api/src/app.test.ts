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
  publicApiBaseUrl: "https://api.spotriq.example",
  corsOrigins: ["http://localhost:5173"],
  bscNetwork: "testnet",
  bscRpcTimeoutMs: 7500,
  agentDiscoveryChainId: 56,
  scan8004BaseUrl: "https://8004scan.example/api/v1/public",
  scan8004TimeoutMs: 7500,
  marketplaceTestTimeoutMs: 5000,
  marketplaceTestMaxResponseBytes: 262144,
  marketplaceTestMaxRedirects: 2,
  serviceTaskTimeoutMs: 10000,
  serviceTaskMaxResponseBytes: 384000,
  serviceTaskMaxRedirects: 2,
  referenceAgentRegistryChainId: 97,
  referenceAgentIds: {},
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
        v3OracleTwap: true as const,
      },
      coverageNotes: ["test"],
    }),
    getV3Pool: async () => { throw new Error("not used"); },
    findBestV3Pool: async () => undefined,
    observeV3Pool: async () => { throw new Error("not used"); },
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
    quoteV3DecreaseLiquidity: async () => { throw new Error("not used"); },
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
        v3OracleTwap: true as const,
      },
      coverageNotes: [],
    }),
    getV3Pool: async () => { throw new Error("not used"); },
    findBestV3Pool: async () => undefined,
    observeV3Pool: async () => { throw new Error("not used"); },
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
    quoteV3DecreaseLiquidity: async () => { throw new Error("not used"); },
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

test("POST /v1/checks creates an async Smart Money Check session", async () => {
  const createdAt = "2026-08-19T04:00:00.000Z";
  const session = {
    checkSessionId: "check_test",
    walletAddress: "0x1111111111111111111111111111111111111111",
    walletControl: "WATCH_ONLY" as const,
    state: "CREATED" as const,
    createdAt,
    updatedAt: createdAt,
    sourceProgress: [],
  };
  const smartMoney = {
    startCheck: async () => session,
    runCheck: async () => ({ session: { ...session, state: "PARTIAL" as const }, findings: [] }),
    getCheck: async () => ({ session, findings: [] }),
    listEvents: async () => [],
    subscribe: () => () => undefined,
  };
  const app = await buildServer({ config, chain: makeChain(), smartMoney, logger: false });
  const response = await app.inject({
    method: "POST",
    url: "/v1/checks",
    payload: { walletAddress: session.walletAddress, walletControl: "WATCH_ONLY" },
  });
  assert.equal(response.statusCode, 202);
  assert.equal(response.json().data.session.checkSessionId, "check_test");
  await app.close();
});

test("GET /v1/checks/:id returns a structured 404 for unknown checks", async () => {
  const smartMoney = {
    startCheck: async () => { throw new Error("not used"); },
    runCheck: async () => { throw new Error("not used"); },
    getCheck: async () => undefined,
    listEvents: async () => [],
    subscribe: () => () => undefined,
  };
  const app = await buildServer({ config, chain: makeChain(), smartMoney, logger: false });
  const response = await app.inject({ method: "GET", url: "/v1/checks/check_missing" });
  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error.code, "CHECK_NOT_FOUND");
  await app.close();
});


test("GET Venus status exposes health-monitoring capabilities", async () => {
  const venus = {
    getStatus: async () => ({
      protocol: "Venus" as const, network: "testnet" as const, chainId: 97,
      contracts: { network: "testnet" as const, protocolShareReserve: "0x25c7c7D6Bf710949fD7f03364E9BA19a1b3c10E3", corePoolComptroller: "0x1111111111111111111111111111111111111111", poolRegistry: "0x2222222222222222222222222222222222222222" },
      capabilities: { corePoolDiscovery: true, isolatedPoolDiscovery: true, accountLiquidity: true as const, marketSnapshots: true as const, derivedHealthFactor: true as const, automatedProtection: false as const, yieldMarketDiscovery: true as const, currentBaseSupplyApy: true as const },
      coverageNotes: ["test"],
    }),
    getWalletPositions: async (walletAddress: string) => ({ walletAddress, network: "testnet" as const, chainId: 97, blockNumber: "100", observedAt: new Date().toISOString(), contracts: { network: "testnet" as const, protocolShareReserve: "0x25c7c7D6Bf710949fD7f03364E9BA19a1b3c10E3" }, positions: [], coverage: { corePool: "AVAILABLE" as const, isolatedPools: "AVAILABLE" as const, failedComptrollers: [] } }),
    getMarketCatalog: async () => ({ protocol: "Venus" as const, network: "testnet" as const, chainId: 97, blockNumber: "100", observedAt: new Date().toISOString(), markets: [], coverage: { venusMarkets: "AVAILABLE" as const, failedMarketRefs: [], truncated: false }, limitations: [] }),
    getYieldOpportunities: async (walletAddress: string) => ({ walletAddress, network: "testnet" as const, chainId: 97, blockNumber: "100", observedAt: new Date().toISOString(), opportunities: [], coverage: { venusMarkets: "AVAILABLE" as const, pancakeSwapYieldContext: "NOT_AVAILABLE" as const, failedMarketRefs: [], truncated: false }, limitations: [] }),
  };
  const app = await buildServer({ config, chain: makeChain(), venus, logger: false });
  const response = await app.inject({ method: "GET", url: "/v1/protocols/venus/status" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.capabilities.derivedHealthFactor, true);
  assert.equal(response.json().data.capabilities.yieldMarketDiscovery, true);
  await app.close();
});

test("GET Venus market catalog exposes wallet-independent supported markets", async () => {
  const venus = {
    getStatus: async () => { throw new Error("not used"); },
    getWalletPositions: async () => { throw new Error("not used"); },
    getYieldOpportunities: async () => { throw new Error("not used"); },
    getMarketCatalog: async () => ({ protocol: "Venus" as const, network: "testnet" as const, chainId: 97, blockNumber: "100", observedAt: new Date().toISOString(), markets: [{ protocol: "Venus" as const, network: "testnet" as const, chainId: 97, poolKind: "CORE" as const, poolName: "Core Pool", comptroller: "0x1111111111111111111111111111111111111111", vToken: "0x2222222222222222222222222222222222222222", underlying: { address: "0x3333333333333333333333333333333333333333", symbol: "USDT", decimals: 18, isNative: false }, blockNumber: "100", observedAt: new Date().toISOString() }], coverage: { venusMarkets: "AVAILABLE" as const, failedMarketRefs: [], truncated: false }, limitations: [] }),
  };
  const app = await buildServer({ config, chain: makeChain(), venus, logger: false });
  const response = await app.inject({ method: "GET", url: "/v1/protocols/venus/markets" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.snapshot.markets[0].underlying.symbol, "USDT");
  await app.close();
});

test("GET Venus yield opportunities exposes normalized current-rate context", async () => {
  const venus = {
    getStatus: async () => { throw new Error("not used"); },
    getWalletPositions: async () => { throw new Error("not used"); },
    getMarketCatalog: async () => { throw new Error("not used"); },
    getYieldOpportunities: async (walletAddress: string) => ({ walletAddress, network: "testnet" as const, chainId: 97, blockNumber: "100", observedAt: new Date().toISOString(), opportunities: [], coverage: { venusMarkets: "AVAILABLE" as const, pancakeSwapYieldContext: "NOT_AVAILABLE" as const, failedMarketRefs: [], truncated: false }, limitations: [] }),
  };
  const app = await buildServer({ config, chain: makeChain(), venus, logger: false });
  const response = await app.inject({ method: "GET", url: "/v1/wallets/0x1111111111111111111111111111111111111111/venus/yield-opportunities" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.snapshot.coverage.venusMarkets, "AVAILABLE");
  await app.close();
});


test("GET Grid market context exposes normalized TWAP regime context", async () => {
  const context = {
    contextId: "gridctx_api", protocol: "PancakeSwap" as const, version: "V3" as const, network: "testnet" as const, chainId: 97,
    poolAddress: "0x3333333333333333333333333333333333333333", pairLabel: "tBNB/USDT",
    token0: { address: "0x4444444444444444444444444444444444444444", symbol: "tBNB", decimals: 18, isNative: false },
    token1: { address: "0x5555555555555555555555555555555555555555", symbol: "USDT", decimals: 18, isNative: false },
    feePips: 2500, currentTick: 500, currentPriceToken0InToken1: "620.5", liquidityRaw: "1000",
    windows: [{ seconds: 3600, label: "1h", averageTick: 500, averagePriceToken0InToken1: "620.5", state: "AVAILABLE" as const }],
    twapBandLow: "620", twapBandHigh: "620.5", twapDispersionBps: 8, regime: "RANGE_LIKE" as const, confidence: "high" as const,
    walletCompatibility: { token0BalanceRaw: "1", hasAnyCompatibleAsset: true, positionExposure: false }, blockNumber: "100", observedAt: new Date().toISOString(), evidence: [],
    coverage: { poolState: "AVAILABLE" as const, oracleHistory: "PARTIAL" as const, walletBalances: "AVAILABLE" as const }, limitations: [],
  };
  const marketContext = {
    getWalletMarketContexts: async (walletAddress: string) => ({ walletAddress, network: "testnet" as const, chainId: 97, observedAt: context.observedAt, contexts: [context], coverage: { configuredMarkets: "AVAILABLE" as const, failedMarketRefs: [] }, limitations: [] }),
    getPoolContext: async () => context,
  };
  const app = await buildServer({ config, chain: makeChain(), marketContext, logger: false });
  const response = await app.inject({ method: "GET", url: "/v1/wallets/0x1111111111111111111111111111111111111111/grid/market-context" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.snapshot.contexts[0].regime, "RANGE_LIKE");
  await app.close();
});

test("GET /v1/agents exposes live registry discoveries without converting them into marketplace services", async () => {
  const discovered = {
    discoveryId: "erc8004:56:7",
    identity: { namespace: "eip155" as const, chainId: 56 as const, registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", agentId: "7", identifier: "eip155:56:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" },
    name: "Range Sentinel",
    description: "rebalancing agent",
    supportedProtocols: ["A2A"],
    categoryHints: [{ category: "rebalancing" as const, confidence: "medium" as const, basis: ["rebalanc"], provenance: "operator-claimed" as const, note: "not tested" }],
    supportedTrust: [], registrationServices: [],
    externalReputation: { source: "8004scan" as const, totalFeedbacks: 2, note: "external" },
    evidence: [], listingState: "DISCOVERED" as const, marketplaceServiceState: "NOT_CREATED" as const, limitations: ["not a service"],
  };
  const agentRegistry = {
    getStatus: async () => ({ provider: "8004scan + ERC-8004" as const, defaultDiscoveryChainId: 56 as const, apiBaseUrl: "https://8004scan.example", apiKeyConfigured: false, indexState: "AVAILABLE" as const, canonicalVerification: "ENABLED" as const, registries: [], checkedAt: new Date().toISOString(), limitations: [] }),
    listAgents: async () => ({ agents: [discovered], chainId: 56 as const, page: 1, limit: 20, total: 1, hasMore: false, source: "8004scan" as const, fetchedAt: new Date().toISOString(), limitations: [] }),
    searchAgents: async () => ({ agents: [discovered], chainId: 56 as const, page: 1, limit: 20, total: 1, hasMore: false, source: "8004scan" as const, fetchedAt: new Date().toISOString(), limitations: [] }),
    getAgent: async () => discovered,
    getAgentsByOwner: async () => ({ agents: [discovered], chainId: 56 as const, page: 1, limit: 20, total: 1, hasMore: false, source: "8004scan" as const, fetchedAt: new Date().toISOString(), limitations: [] }),
    getFeedback: async () => ({ feedback: [], chainId: 56 as const, agentId: "7", page: 1, limit: 20, total: 0, hasMore: false, fetchedAt: new Date().toISOString() }),
    verifyIdentity: async () => ({ state: "VERIFIED" as const, checkedAt: new Date().toISOString(), registryAddress: discovered.identity.registryAddress, ownerAddress: "0x1111111111111111111111111111111111111111", registrationMetadataState: "REMOTE_URI_NOT_FETCHED" as const, evidence: [], limitations: [] }),
  };
  const app = await buildServer({ config, chain: makeChain(), agentRegistry, logger: false });
  const response = await app.inject({ method: "GET", url: "/v1/agents?chainId=56&limit=10" });
  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.data.page.agents[0].listingState, "DISCOVERED");
  assert.equal(payload.data.page.agents[0].marketplaceServiceState, "NOT_CREATED");
  await app.close();
});

test("GET /v1/reference-agents exposes four first-party categories without claiming activation", async () => {
  const app = await buildServer({ config, chain: makeChain(), logger: false });
  const response = await app.inject({ method: "GET", url: "/v1/reference-agents" });
  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.data.agents.length, 4);
  assert.deepEqual(new Set(payload.data.agents.map((agent: any) => agent.category)), new Set(["rebalancing", "grid", "yield", "health"]));
  assert.ok(payload.data.agents.every((agent: any) => agent.authority === "READ_ONLY" && agent.commercialState === "UNDECLARED"));
  await app.close();
});

test("GET reference Agent Card publishes the same-origin JSON-RPC runtime", async () => {
  const app = await buildServer({ config, chain: makeChain(), logger: false });
  const response = await app.inject({ method: "GET", url: "/v1/reference-agents/rangekeeper/.well-known/agent-card.json" });
  assert.equal(response.statusCode, 200);
  const card = response.json();
  assert.equal(card.name, "RangeKeeper");
  assert.equal(card.metadata.safeMode, "READ_ONLY");
  assert.equal(card.supportedInterfaces[0].url, "https://api.spotriq.example/v1/reference-agents/rangekeeper/a2a");
  assert.equal(card.supportedInterfaces[0].protocolBinding, "JSONRPC");
  await app.close();
});

test("GET /v1/services returns all four first-party reference services even when external discovery is empty", async () => {
  const emptyRegistry = {
    getStatus: async () => ({ provider: "8004scan + ERC-8004", defaultDiscoveryChainId: 56, apiBaseUrl: "https://8004scan.example", apiKeyConfigured: false, indexState: "AVAILABLE", canonicalVerification: "ENABLED", registries: [], checkedAt: new Date().toISOString(), limitations: [] }),
    listAgents: async (input: any = {}) => ({ agents: [], chainId: input.chainId ?? 56, page: 1, limit: input.limit ?? 20, total: 0, hasMore: false, source: "8004scan", fetchedAt: new Date().toISOString(), limitations: [] }),
    searchAgents: async (_query: string, input: any = {}) => ({ agents: [], chainId: input.chainId ?? 56, page: 1, limit: input.limit ?? 20, total: 0, hasMore: false, source: "8004scan", fetchedAt: new Date().toISOString(), limitations: [] }),
    getAgent: async () => { throw new Error("not found"); },
    getAgentsByOwner: async (_owner: string, input: any = {}) => ({ agents: [], chainId: input.chainId ?? 56, page: 1, limit: input.limit ?? 20, total: 0, hasMore: false, source: "8004scan", fetchedAt: new Date().toISOString(), limitations: [] }),
    getFeedback: async () => ({ feedback: [], chainId: 56, agentId: "0", page: 1, limit: 20, total: 0, hasMore: false, fetchedAt: new Date().toISOString() }),
    verifyIdentity: async () => { throw new Error("not applicable"); },
  } as any;
  const app = await buildServer({ config, chain: makeChain(), agentRegistry: emptyRegistry, logger: false });
  const response = await app.inject({ method: "GET", url: "/v1/services?chainId=56&limit=8" });
  assert.equal(response.statusCode, 200);
  const page = response.json().data.page;
  assert.equal(page.services.length, 4);
  assert.deepEqual(new Set(page.services.map((record: any) => record.service.name)), new Set(["RangeKeeper", "GridPilot", "YieldPilot", "VenusGuard"]));
  assert.ok(page.services.every((record: any) => record.service.origin === "REFERENCE" && record.service.marketplaceActivationEligible === false));
  await app.close();
});

test("reference AgentService consumes a canonically reconciled ERC-8004 identity binding", async () => {
  const boundConfig: ServerConfig = {
    ...config,
    referenceAgentRegistryChainId: 97,
    referenceAgentIds: { rangekeeper: "2017" },
  };
  const registry = {
    getStatus: async () => ({ provider: "8004scan + ERC-8004", defaultDiscoveryChainId: 56, apiBaseUrl: "https://8004scan.example", apiKeyConfigured: false, indexState: "AVAILABLE", canonicalVerification: "ENABLED", registries: [], checkedAt: new Date().toISOString(), limitations: [] }),
    listAgents: async (input: any = {}) => ({ agents: [], chainId: input.chainId ?? 56, page: 1, limit: input.limit ?? 20, total: 0, hasMore: false, source: "8004scan", fetchedAt: new Date().toISOString(), limitations: [] }),
    searchAgents: async (_query: string, input: any = {}) => ({ agents: [], chainId: input.chainId ?? 56, page: 1, limit: input.limit ?? 20, total: 0, hasMore: false, source: "8004scan", fetchedAt: new Date().toISOString(), limitations: [] }),
    getAgent: async () => { throw new Error("not needed"); },
    getAgentsByOwner: async (_owner: string, input: any = {}) => ({ agents: [], chainId: input.chainId ?? 56, page: 1, limit: 20, total: 0, hasMore: false, source: "8004scan", fetchedAt: new Date().toISOString(), limitations: [] }),
    getFeedback: async () => ({ feedback: [], chainId: 97, agentId: "2017", page: 1, limit: 20, total: 0, hasMore: false, fetchedAt: new Date().toISOString() }),
    verifyIdentity: async (chainId: number, agentId: string) => {
      assert.equal(chainId, 97);
      assert.equal(agentId, "2017");
      return {
        state: "VERIFIED" as const,
        checkedAt: "2026-08-29T20:43:23.143Z",
        registryAddress: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
        ownerAddress: "0x08a594e828133d18a43918cc804754f46daf44db",
        registrationMetadataState: "PARSED_DATA_URI" as const,
        registrationBacklinkMatches: true,
        registrationFile: {
          name: "RangeKeeper",
          services: [{ name: "A2A", endpoint: "https://api.spotriq.example/v1/reference-agents/rangekeeper/.well-known/agent-card.json" }],
          registrations: [{ agentId: "2017", agentRegistry: "eip155:97:0x8004A818BFB912233c491871b3d84c89A494BD9e" }],
          supportedTrust: [],
        },
        evidence: [],
        limitations: [],
      };
    },
  } as any;
  const app = await buildServer({ config: boundConfig, chain: makeChain(), agentRegistry: registry, logger: false });
  const response = await app.inject({ method: "GET", url: "/v1/services/svc:reference:rangekeeper/readiness" });
  assert.equal(response.statusCode, 200);
  const readiness = response.json().data.readiness;
  assert.equal(readiness.state, "TESTNET_ONLY");
  assert.equal(readiness.checks.find((check: any) => check.code === "CANONICAL_IDENTITY")?.state, "PASS");
  assert.equal(readiness.activationEligible, false);
  await app.close();
});

test("Fastify request parsing errors preserve their client status instead of becoming INTERNAL_ERROR", async () => {
  const app = await buildServer({ config, chain: makeChain(), logger: false });
  const response = await app.inject({
    method: "POST",
    url: "/v1/services/svc:reference:rangekeeper/tests",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    payload: "x=1",
  });
  assert.equal(response.statusCode, 415);
  assert.equal(response.json().error.code, "FST_ERR_CTP_INVALID_MEDIA_TYPE");
  await app.close();
});
