import assert from "node:assert/strict";
import test from "node:test";
import type { AgentRegistryReader } from "@spotriq/agent-registry";
import type { AgentDiscoveryPage, AgentRegistryStatus, DiscoveredAgent, ExternalAgentFeedbackPage } from "@spotriq/domain";
import { createMarketplaceSupply, normalizeMarketplaceListing, normalizeMarketplaceService } from "./index.js";

function agent(overrides: Partial<DiscoveredAgent> = {}): DiscoveredAgent {
  return {
    discoveryId: "erc8004:56:7",
    identity: { namespace: "eip155", chainId: 56, registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", agentId: "7", identifier: "eip155:56:registry:7" },
    name: "Range Sentinel",
    description: "PancakeSwap concentrated-liquidity rebalancing agent",
    ownerAddress: "0x1111111111111111111111111111111111111111",
    supportedProtocols: [],
    categoryHints: [{ category: "rebalancing", confidence: "high", basis: ["rebalanc", "pancakeswap"], provenance: "operator-claimed", note: "not tested" }],
    active: undefined,
    x402Support: false,
    supportedTrust: [],
    registrationServices: [],
    externalReputation: { source: "8004scan", totalFeedbacks: 2, note: "external" },
    evidence: [],
    listingState: "DISCOVERED",
    marketplaceServiceState: "NOT_CREATED",
    limitations: [],
    ...overrides,
  };
}

function registryFor(discovered: DiscoveredAgent): AgentRegistryReader {
  const page: AgentDiscoveryPage = { agents: [discovered], chainId: discovered.identity.chainId, page: 1, limit: 20, total: 1, hasMore: false, source: "8004scan", fetchedAt: new Date().toISOString(), limitations: [] };
  const status: AgentRegistryStatus = { provider: "8004scan + ERC-8004", defaultDiscoveryChainId: discovered.identity.chainId, apiBaseUrl: "https://8004scan.io/api/v1/public", apiKeyConfigured: false, indexState: "AVAILABLE", canonicalVerification: "ENABLED", registries: [], checkedAt: new Date().toISOString(), limitations: [] };
  const feedback: ExternalAgentFeedbackPage = { feedback: [], chainId: discovered.identity.chainId, agentId: discovered.identity.agentId, page: 1, limit: 20, fetchedAt: new Date().toISOString() };
  return {
    getStatus: async () => status,
    listAgents: async () => page,
    searchAgents: async () => page,
    getAgent: async () => discovered,
    getAgentsByOwner: async () => page,
    getFeedback: async () => feedback,
    verifyIdentity: async () => discovered.canonicalVerification ?? { state: "NOT_CHECKED", checkedAt: new Date().toISOString(), registryAddress: discovered.identity.registryAddress, registrationMetadataState: "UNAVAILABLE", evidence: [], limitations: [] },
  };
}

test("identity without a supported category becomes a listing but not an AgentService", () => {
  const item = agent({ categoryHints: [] });
  const listing = normalizeMarketplaceListing(item);
  assert.equal(listing.listing.status, "DISCOVERED");
  assert.equal(listing.serviceCount, 0);
  assert.equal(normalizeMarketplaceService(item, "yield"), undefined);
});

test("operator category hint creates a non-activatable LIMITED service candidate", () => {
  const record = normalizeMarketplaceService(agent(), "rebalancing");
  assert.ok(record);
  assert.equal(record.service.origin, "ERC8004");
  assert.equal(record.service.readiness, "LIMITED");
  assert.equal(record.service.marketplaceActivationEligible, false);
  assert.equal(record.offer.state, "UNDECLARED");
  assert.equal(record.permissionProfile.executionMode, "UNDECLARED");
  assert.equal(record.capabilityClaims[0]?.provenance, "operator-claimed");
  assert.equal(record.service.supportedProtocols.includes("PancakeSwap"), true);
});

test("verified identity plus A2A endpoint still stays LIMITED until authority and marketplace tests exist", () => {
  const item = agent({
    active: true,
    registrationServices: [{ name: "A2A", endpoint: "https://agent.example/.well-known/agent-card.json", version: "0.3.0" }],
    canonicalVerification: {
      state: "VERIFIED", checkedAt: new Date().toISOString(), registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", ownerAddress: "0x1111111111111111111111111111111111111111", indexedOwnerMatches: true, registrationMetadataState: "PARSED_DATA_URI", registrationBacklinkMatches: true, evidence: [], limitations: [],
    },
  });
  const record = normalizeMarketplaceService(item, "rebalancing");
  assert.ok(record);
  assert.equal(record.listing.status, "TESTING");
  assert.equal(record.service.erc8004Verified, true);
  assert.equal(record.service.runtimeEndpoints?.some((endpoint) => endpoint.machineCallable), true);
  assert.equal(record.readiness.state, "LIMITED");
  assert.equal(record.readiness.activationEligible, false);
  assert.equal(record.readiness.checks?.find((check) => check.code === "CANONICAL_IDENTITY")?.state, "PASS");
  assert.equal(record.readiness.checks?.find((check) => check.code === "MARKETPLACE_TESTS")?.state, "UNKNOWN");
});

test("canonical identity mismatch suspends the service candidate", () => {
  const item = agent({ canonicalVerification: { state: "MISMATCH", checkedAt: new Date().toISOString(), registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", indexedOwnerMatches: false, registrationMetadataState: "UNAVAILABLE", evidence: [], limitations: ["owner mismatch"] } });
  const record = normalizeMarketplaceService(item, "rebalancing");
  assert.ok(record);
  assert.equal(record.readiness.state, "SUSPENDED");
  assert.equal(record.listing.status, "SUSPENDED");
});

test("BSC testnet candidates remain TESTNET_ONLY and never activation eligible", () => {
  const item = agent({
    discoveryId: "erc8004:97:7",
    identity: { namespace: "eip155", chainId: 97, registryAddress: "0x8004A818BFB912233c491871b3d84c89A494BD9e", agentId: "7", identifier: "eip155:97:registry:7" },
  });
  const record = normalizeMarketplaceService(item, "rebalancing");
  assert.ok(record);
  assert.equal(record.readiness.state, "TESTNET_ONLY");
  assert.equal(record.readiness.activationEligible, false);
});

test("supply reader exposes test coverage as explicitly NOT_RUN", async () => {
  const supply = createMarketplaceSupply({ registry: registryFor(agent()) });
  const page = await supply.listServices({ chainId: 56 });
  assert.equal(page.services.length, 1);
  const tests = await supply.getTests(page.services[0]!.service.serviceId);
  assert.equal(tests.coverage, "NOT_RUN");
  assert.match(tests.note, /not claim.*tested/i);
});

test("targeted financial discovery searches all four categories instead of sampling newest agents", async () => {
  const queries: string[] = [];
  const base = registryFor(agent({ categoryHints: [] }));
  const registry: AgentRegistryReader = {
    ...base,
    searchAgents: async (query, input) => {
      queries.push(query);
      return {
        agents: [agent({
          discoveryId: `erc8004:56:${queries.length + 100}`,
          identity: { namespace: "eip155", chainId: 56, registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", agentId: String(queries.length + 100), identifier: `eip155:56:registry:${queries.length + 100}` },
          name: `Search lead ${queries.length}`,
          description: "Generic autonomous agent",
          categoryHints: [],
        })],
        chainId: input?.chainId ?? 56,
        page: 1,
        limit: input?.limit ?? 8,
        total: 1,
        hasMore: false,
        source: "8004scan",
        fetchedAt: new Date().toISOString(),
        limitations: ["Semantic search is external discovery."],
      };
    },
  };
  const supply = createMarketplaceSupply({ registry });
  const page = await supply.listServices({ chainId: 56, limit: 8 });
  assert.equal(queries.length, 4);
  assert.equal(page.discovery?.mode, "TARGETED");
  assert.equal(page.discovery?.searches.length, 4);
  assert.equal(page.discovery?.leads.length, 4);
  assert.equal(page.services.length, 0);
  assert.equal(page.discovery?.leads.every((lead) => lead.matches.every((match) => match.capabilityEvidence === "NOT_ESTABLISHED")), true);
});

test("targeted search relevance never promotes an identity without a matching operator metadata hint", async () => {
  const base = registryFor(agent({ categoryHints: [] }));
  const registry: AgentRegistryReader = {
    ...base,
    searchAgents: async (query, input) => ({
      agents: [agent({ name: "Semantic Match Only", description: "Autonomous finance assistant", categoryHints: [] })],
      chainId: input?.chainId ?? 56,
      page: 1,
      limit: input?.limit ?? 8,
      total: 1,
      hasMore: false,
      source: "8004scan",
      fetchedAt: new Date().toISOString(),
      limitations: [],
    }),
  };
  const supply = createMarketplaceSupply({ registry });
  const page = await supply.listServices({ chainId: 56, category: "yield", limit: 8 });
  assert.equal(page.services.length, 0);
  assert.equal(page.discovery?.searches[0]?.category, "yield");
  assert.equal(page.discovery?.searches[0]?.returned, 1);
  assert.equal(page.discovery?.searches[0]?.matchingCapabilityHints, 0);
  assert.equal(page.discovery?.leads[0]?.matches[0]?.capabilityEvidence, "NOT_ESTABLISHED");
});

test("targeted category discovery promotes only independently supported metadata hints", async () => {
  const yieldAgent = agent({
    discoveryId: "erc8004:56:77",
    identity: { namespace: "eip155", chainId: 56, registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", agentId: "77", identifier: "eip155:56:registry:77" },
    name: "Venus Yield Helper",
    description: "Venus lending supply market yield optimiser",
    categoryHints: [{ category: "yield", confidence: "high", basis: ["yield optim", "venus", "lending"], provenance: "operator-claimed", note: "not tested" }],
  });
  const base = registryFor(yieldAgent);
  const registry: AgentRegistryReader = {
    ...base,
    searchAgents: async (_query, input) => ({ agents: [yieldAgent], chainId: input?.chainId ?? 56, page: 1, limit: input?.limit ?? 8, total: 1, hasMore: false, source: "8004scan", fetchedAt: new Date().toISOString(), limitations: [] }),
  };
  const supply = createMarketplaceSupply({ registry });
  const yieldPage = await supply.listServices({ chainId: 56, category: "yield", limit: 8 });
  assert.equal(yieldPage.services.length, 1);
  assert.equal(yieldPage.services[0]?.service.category, "yield");
  assert.equal(yieldPage.discovery?.leads[0]?.matches[0]?.capabilityEvidence, "OPERATOR_METADATA_HINT");

  const healthPage = await supply.listServices({ chainId: 56, category: "health", limit: 8 });
  assert.equal(healthPage.services.length, 0);
  assert.equal(healthPage.discovery?.leads[0]?.matches[0]?.capabilityEvidence, "NOT_ESTABLISHED");
});

test("one failed targeted category search does not suppress successful categories", async () => {
  const yieldAgent = agent({
    discoveryId: "erc8004:56:88",
    identity: { namespace: "eip155", chainId: 56, registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", agentId: "88", identifier: "eip155:56:registry:88" },
    name: "Yield Agent",
    description: "yield optimiser lending supply market",
    categoryHints: [{ category: "yield", confidence: "high", basis: ["yield optim", "lending"], provenance: "operator-claimed", note: "not tested" }],
  });
  const base = registryFor(yieldAgent);
  let call = 0;
  const registry: AgentRegistryReader = {
    ...base,
    searchAgents: async (_query, input) => {
      call += 1;
      if (call === 2) throw new Error("upstream category search unavailable");
      return { agents: [yieldAgent], chainId: input?.chainId ?? 56, page: 1, limit: input?.limit ?? 8, total: 1, hasMore: false, source: "8004scan", fetchedAt: new Date().toISOString(), limitations: [] };
    },
  };
  const supply = createMarketplaceSupply({ registry });
  const page = await supply.listServices({ chainId: 56, limit: 8 });
  assert.equal(page.discovery?.searches.length, 4);
  assert.equal(page.discovery?.searches.some((run) => run.state === "UNAVAILABLE"), true);
  assert.equal(page.services.some((record) => record.service.category === "yield"), true);
});
