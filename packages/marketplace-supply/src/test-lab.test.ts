import assert from "node:assert/strict";
import test from "node:test";
import type { DiscoveredAgent, MarketplaceServiceRecord } from "@spotriq/domain";
import { normalizeMarketplaceService } from "./index.js";
import { createMarketplaceTestLab, isPublicRuntimeAddress, MCP_MODERN_PROTOCOL_VERSION } from "./test-lab.js";

function discoveredWithEndpoint(kind: "A2A" | "MCP", endpoint = "https://agent.example/runtime"): DiscoveredAgent {
  return {
    discoveryId: "erc8004:56:7",
    identity: { namespace: "eip155", chainId: 56, registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", agentId: "7", identifier: "eip155:56:registry:7" },
    name: "Range Sentinel",
    description: "PancakeSwap concentrated-liquidity rebalancing agent",
    ownerAddress: "0x1111111111111111111111111111111111111111",
    supportedProtocols: ["PancakeSwap"],
    categoryHints: [{ category: "rebalancing", confidence: "high", basis: ["rebalanc", "pancakeswap"], provenance: "operator-claimed", note: "not tested" }],
    active: true,
    x402Support: false,
    supportedTrust: [],
    registrationServices: [{ name: kind, endpoint, version: kind === "MCP" ? MCP_MODERN_PROTOCOL_VERSION : "1.0" }],
    externalReputation: { source: "8004scan", totalFeedbacks: 1, note: "external" },
    canonicalVerification: {
      state: "VERIFIED", checkedAt: new Date().toISOString(), registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", ownerAddress: "0x1111111111111111111111111111111111111111", indexedOwnerMatches: true, registrationMetadataState: "PARSED_DATA_URI", registrationBacklinkMatches: true, evidence: [], limitations: [],
    },
    evidence: [],
    listingState: "DISCOVERED",
    marketplaceServiceState: "NOT_CREATED",
    limitations: [],
  };
}

function recordFor(kind: "A2A" | "MCP", endpoint?: string): MarketplaceServiceRecord {
  const record = normalizeMarketplaceService(discoveredWithEndpoint(kind, endpoint), "rebalancing");
  assert.ok(record);
  return record;
}

const publicResolver = async () => ["93.184.216.34"];

test("endpoint address policy rejects private and documentation-only network ranges", () => {
  assert.equal(isPublicRuntimeAddress("127.0.0.1"), false);
  assert.equal(isPublicRuntimeAddress("10.1.2.3"), false);
  assert.equal(isPublicRuntimeAddress("169.254.169.254"), false);
  assert.equal(isPublicRuntimeAddress("192.0.2.10"), false);
  assert.equal(isPublicRuntimeAddress("::1"), false);
  assert.equal(isPublicRuntimeAddress("fc00::1"), false);
  assert.equal(isPublicRuntimeAddress("2606:4700:4700::1111"), true);
  assert.equal(isPublicRuntimeAddress("1.1.1.1"), true);
});

test("A2A Test Lab observes a standardized Agent Card and category skill without executing a task", async () => {
  let requestCount = 0;
  const lab = createMarketplaceTestLab({
    resolver: publicResolver,
    fetcher: async (input) => {
      requestCount += 1;
      const url = String(input);
      assert.match(url, /\.well-known\/agent-card\.json$/);
      return new Response(JSON.stringify({
        name: "Range Sentinel",
        description: "Automated liquidity position management",
        supportedInterfaces: [{ url: "https://agent.example/a2a", protocolBinding: "HTTP+JSON", protocolVersion: "1.0" }],
        skills: [{ id: "rebalance", name: "LP range rebalancing", description: "Rebalance concentrated liquidity ranges", tags: ["PancakeSwap", "liquidity position"] }],
      }), { status: 200, headers: { "content-type": "application/a2a+json" } });
    },
  });
  const run = await lab.run(recordFor("A2A"));
  assert.equal(requestCount, 1);
  assert.equal(run.coverage, "PASS");
  assert.equal(run.tests.find((item) => item.code === "ENDPOINT_POLICY")?.state, "PASS");
  assert.equal(run.tests.find((item) => item.code === "PROTOCOL_CONTRACT")?.state, "PASS");
  assert.equal(run.tests.find((item) => item.code === "CATEGORY_CAPABILITY")?.state, "PASS");
  assert.equal(run.evidence.every((item) => item.provenance === "marketplace-observed"), true);
});

test("MCP Test Lab prefers stateless 2026-07-28 server/discover and reads only the tool catalog", async () => {
  const methods: string[] = [];
  const lab = createMarketplaceTestLab({
    resolver: publicResolver,
    fetcher: async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { method?: string };
      methods.push(body.method ?? "");
      if (body.method === "server/discover") {
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: "1", result: { supportedProtocolVersions: [MCP_MODERN_PROTOCOL_VERSION], capabilities: { tools: {} }, _meta: { "io.modelcontextprotocol/serverInfo": { name: "range-mcp", version: "1.0" } } } }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (body.method === "tools/list") {
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: "2", result: { tools: [{ name: "rebalance_lp_range", description: "Rebalance a PancakeSwap concentrated liquidity position" }] } }), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error(`Unexpected method ${body.method}`);
    },
  });
  const run = await lab.run(recordFor("MCP", "https://mcp.example/mcp"));
  assert.deepEqual(methods, ["server/discover", "tools/list"]);
  assert.equal(run.coverage, "PASS");
  assert.equal(run.tests.find((item) => item.code === "PROTOCOL_DISCOVERY")?.protocolVersion, MCP_MODERN_PROTOCOL_VERSION);
  assert.equal(run.tests.find((item) => item.code === "CATEGORY_CAPABILITY")?.state, "PASS");
});

test("Test Lab blocks localhost/private targets before any network request", async () => {
  let fetched = false;
  const lab = createMarketplaceTestLab({
    resolver: async () => ["127.0.0.1"],
    fetcher: async () => { fetched = true; throw new Error("must not fetch"); },
  });
  const run = await lab.run(recordFor("MCP", "https://internal.example/mcp"));
  assert.equal(fetched, false);
  assert.equal(run.coverage, "FAIL");
  assert.equal(run.tests.find((item) => item.code === "ENDPOINT_POLICY")?.state, "FAIL");
});
