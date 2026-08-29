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
