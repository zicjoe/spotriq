import assert from "node:assert/strict";
import test from "node:test";
import type { GridMarketContextReader } from "@spotriq/market-context";
import type { PancakeSwapReader } from "@spotriq/protocol-pancakeswap";
import type { VenusReader } from "@spotriq/protocol-venus";
import {
  createReferenceAgentCatalog,
  handleReferenceAgentJsonRpc,
  REFERENCE_AGENT_DEFINITIONS,
  referenceAgentCard,
} from "./index.js";

const pancakeSwap = {
  getV3Position: async (tokenId: string) => ({ tokenId, rangeState: "IN_RANGE", tickLower: -120, tickUpper: 120, pool: { currentTick: 0 } }),
} as unknown as PancakeSwapReader;
const marketContext = {
  getPoolContext: async (poolAddress: string) => ({ poolAddress, regime: "RANGE_LIKE", confidence: "high" }),
} as unknown as GridMarketContextReader;
const venus = {
  getYieldOpportunities: async (walletAddress: string) => ({ walletAddress, opportunities: [{ symbol: "USDT", currentBaseSupplyApy: "4.2" }] }),
  getWalletPositions: async (walletAddress: string) => ({ walletAddress, positions: [{ healthState: "COMFORTABLE" }] }),
} as unknown as VenusReader;

test("reference catalog contains one real first-party service per required category without fake ERC-8004 verification", () => {
  const records = createReferenceAgentCatalog({ publicBaseUrl: "https://api.spotriq.example", chainId: 56, now: () => new Date("2026-08-29T10:00:00.000Z") });
  assert.equal(records.length, 4);
  assert.deepEqual(new Set(records.map((record) => record.service.category)), new Set(["rebalancing", "grid", "yield", "health"]));
  for (const record of records) {
    assert.equal(record.service.origin, "REFERENCE");
    assert.equal(record.service.erc8004Verified, false);
    assert.equal(record.service.marketplaceActivationEligible, false);
    assert.equal(record.identity.sourceKind, "MARKETPLACE_REFERENCE");
    assert.equal(record.identity.identity.namespace, "marketplace");
    assert.equal(record.permissionProfile.executionMode, "READ_ONLY");
    const endpoint = record.service.runtimeEndpoints?.[0]?.endpoint ?? "";
    assert.match(endpoint, /^https:\/\/api\.spotriq\.example\/v1\/reference-agents\//);
    assert.match(endpoint, /\/\.well-known\/agent-card\.json$/);
    assert.ok(!endpoint.endsWith("/a2a"));
  }
});

test("reference A2A cards expose machine-readable category skills and same-origin JSON-RPC interfaces", () => {
  for (const definition of REFERENCE_AGENT_DEFINITIONS) {
    const card = referenceAgentCard(definition, "https://api.spotriq.example");
    assert.equal(card.name, definition.name);
    assert.equal(card.supportedInterfaces[0]?.protocolBinding, "JSONRPC");
    assert.equal(card.supportedInterfaces[0]?.protocolVersion, "1.0.0");
    assert.ok(card.skills[0]?.tags.some((tag) => tag.toLowerCase().includes(definition.category === "health" ? "health" : definition.category === "grid" ? "grid" : definition.category)));
  }
});

test("each reference runtime executes only its deterministic read capability", async () => {
  const deps = { pancakeSwap, marketContext, venus, now: () => new Date("2026-08-29T10:00:00.000Z") };
  const calls = [
    ["rangekeeper", "analyze_position", { tokenId: "42" }],
    ["gridpilot", "analyze_market", { poolAddress: "0x0000000000000000000000000000000000000001" }],
    ["yieldpilot", "scan_opportunities", { walletAddress: "0x0000000000000000000000000000000000000002" }],
    ["venusguard", "inspect_health", { walletAddress: "0x0000000000000000000000000000000000000003" }],
  ] as const;
  for (const [slug, action, input] of calls) {
    const response = await handleReferenceAgentJsonRpc(slug, { jsonrpc: "2.0", id: `${slug}-1`, method: "spotriq.run", params: { action, input } }, deps);
    assert.equal(response.jsonrpc, "2.0");
    assert.equal(response.id, `${slug}-1`);
    assert.ok(response.result);
    assert.equal(response.error, undefined);
  }
});

test("reference runtime rejects unsupported actions instead of improvising", async () => {
  const response = await handleReferenceAgentJsonRpc("yieldpilot", { jsonrpc: "2.0", id: "bad", method: "spotriq.run", params: { action: "move_funds", input: {} } }, { pancakeSwap, marketContext, venus });
  assert.ok(response.error);
  assert.match(String((response.error as Record<string, unknown>).message), /does not support action move_funds/i);
});

test("reference catalog binds a first-party service only after canonical identity and endpoint reconciliation", () => {
  const observedAt = "2026-08-29T20:43:23.143Z";
  const records = createReferenceAgentCatalog({
    publicBaseUrl: "https://spotriq-production.up.railway.app",
    chainId: 97,
    now: () => new Date(observedAt),
    identityBindings: {
      rangekeeper: {
        chainId: 97,
        agentId: "2017",
        verification: {
          state: "VERIFIED",
          checkedAt: observedAt,
          registryAddress: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
          ownerAddress: "0x08a594e828133d18a43918cc804754f46daf44db",
          registrationMetadataState: "PARSED_DATA_URI",
          registrationBacklinkMatches: true,
          registrationFile: {
            type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
            name: "RangeKeeper",
            description: "test",
            services: [{ name: "A2A", endpoint: "https://spotriq-production.up.railway.app/v1/reference-agents/rangekeeper/.well-known/agent-card.json" }],
            registrations: [{ agentId: "2017", agentRegistry: "eip155:97:0x8004A818BFB912233c491871b3d84c89A494BD9e" }],
            supportedTrust: [],
          },
          evidence: [],
          limitations: [],
        },
      },
    },
  });
  const range = records.find((record) => record.service.slug === "rangekeeper");
  assert.ok(range);
  assert.equal(range.identity.discoveryId, "erc8004:97:2017");
  assert.equal(range.identity.identity.namespace, "eip155");
  assert.equal(range.identity.identity.agentId, "2017");
  assert.equal(range.service.agentId, "erc8004:97:2017");
  assert.equal(range.service.erc8004Verified, true);
  assert.equal(range.readiness.checks.find((check) => check.code === "CANONICAL_IDENTITY")?.state, "PASS");
  assert.equal(range.service.marketplaceActivationEligible, false);

  const grid = records.find((record) => record.service.slug === "gridpilot");
  assert.ok(grid);
  assert.equal(grid.identity.identity.namespace, "marketplace");
  assert.equal(grid.service.erc8004Verified, false);
});

test("reference catalog refuses a configured ERC-8004 ID when registration metadata points at another runtime", () => {
  const records = createReferenceAgentCatalog({
    publicBaseUrl: "https://spotriq-production.up.railway.app",
    chainId: 97,
    identityBindings: {
      rangekeeper: {
        chainId: 97,
        agentId: "2017",
        verification: {
          state: "VERIFIED",
          checkedAt: "2026-08-29T20:43:23.143Z",
          registryAddress: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
          ownerAddress: "0x08a594e828133d18a43918cc804754f46daf44db",
          registrationMetadataState: "PARSED_DATA_URI",
          registrationBacklinkMatches: true,
          registrationFile: {
            name: "RangeKeeper",
            services: [{ name: "A2A", endpoint: "https://attacker.example/.well-known/agent-card.json" }],
            registrations: [{ agentId: "2017", agentRegistry: "eip155:97:0x8004A818BFB912233c491871b3d84c89A494BD9e" }],
            supportedTrust: [],
          },
          evidence: [],
          limitations: [],
        },
      },
    },
  });
  const range = records.find((record) => record.service.slug === "rangekeeper");
  assert.ok(range);
  assert.equal(range.identity.identity.namespace, "marketplace");
  assert.equal(range.service.erc8004Verified, false);
  assert.match(range.identity.limitations[0] ?? "", /did not satisfy every first-party binding check/i);
});

test("bound reference Agent Card exposes verified ERC-8004 identity metadata", () => {
  const definition = REFERENCE_AGENT_DEFINITIONS.find((item) => item.slug === "rangekeeper")!;
  const binding = {
    chainId: 97 as const,
    agentId: "2017",
    verification: {
      state: "VERIFIED" as const,
      checkedAt: "2026-08-29T20:43:23.143Z",
      registryAddress: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
      ownerAddress: "0x08a594e828133d18a43918cc804754f46daf44db",
      registrationMetadataState: "PARSED_DATA_URI" as const,
      registrationBacklinkMatches: true,
      registrationFile: {
        name: "RangeKeeper",
        services: [{ name: "A2A", endpoint: "https://spotriq-production.up.railway.app/v1/reference-agents/rangekeeper/.well-known/agent-card.json" }],
        registrations: [{ agentId: "2017", agentRegistry: "eip155:97:0x8004A818BFB912233c491871b3d84c89A494BD9e" }],
        supportedTrust: [],
      },
      evidence: [],
      limitations: [],
    },
  };
  const card = referenceAgentCard(definition, "https://spotriq-production.up.railway.app", binding);
  assert.equal(card.metadata.erc8004Registration, "REGISTERED_VERIFIED");
  assert.equal(card.metadata.erc8004Identity?.agentId, "2017");
  assert.equal(card.metadata.erc8004Identity?.chainId, 97);
});
