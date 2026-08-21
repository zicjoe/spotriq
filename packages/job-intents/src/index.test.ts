import test from "node:test";
import assert from "node:assert/strict";
import type { CheckSession, Finding, FindingServiceMatch, MarketplaceServiceRecord } from "@spotriq/domain";
import { createJobIntentEngine } from "./index.js";

const now = "2026-08-21T12:00:00.000Z";

function session(walletControl: CheckSession["walletControl"] = "WATCH_ONLY"): CheckSession {
  return {
    checkSessionId: "check_rebalance",
    walletAddress: "0x1111111111111111111111111111111111111111",
    walletControl,
    state: "COMPLETED",
    createdAt: now,
  };
}

function finding(category: Finding["category"] = "rebalancing"): Finding {
  return {
    findingId: "finding_rebalance",
    checkSessionId: "check_rebalance",
    category,
    state: "needs-attention",
    severity: "attention",
    headline: "BNB/USDT LP is outside range",
    summary: "Current pool tick is outside the configured range.",
    confidence: "high",
    freshness: "Updated 1s ago",
    primaryAction: { label: "Find Rebalancing Agents" },
    targetRoute: "explore",
    keyValues: [],
    whatCouldAgentDo: "Prepare a range-management action.",
    subject: {
      protocol: "PancakeSwap",
      version: "V3",
      tokenId: "42",
      positionManager: "0x2222222222222222222222222222222222222222",
      poolAddress: "0x3333333333333333333333333333333333333333",
      pair: "BNB/USDT",
      tickLower: -120,
      tickUpper: 120,
      currentTick: 180,
      rangeState: "OUT_OF_RANGE_ABOVE",
      blockNumber: "123456",
      network: "mainnet",
    },
    evidenceIds: ["ev-finding"],
    generatedAt: now,
    expiresAt: "2026-08-21T12:01:00.000Z",
  };
}

function record(): MarketplaceServiceRecord {
  return {
    identity: {
      discoveryId: "erc8004:56:7",
      identity: { namespace: "eip155", chainId: 56, registryAddress: "0x4444444444444444444444444444444444444444", agentId: "7", identifier: "eip155:56:7" },
      name: "Range Agent",
      description: "PancakeSwap rebalancing",
      supportedProtocols: ["PancakeSwap"],
      categoryHints: [{ category: "rebalancing", confidence: "high", basis: ["rebalancing"], provenance: "operator-claimed", note: "test" }],
      registrationServices: [{ name: "A2A", endpoint: "https://agent.example/a2a" }],
      supportedTrust: [],
      externalReputation: { source: "8004scan", totalFeedbacks: 0, note: "test" },
      evidence: [],
      listingState: "DISCOVERED",
      marketplaceServiceState: "NOT_CREATED",
      limitations: [],
    },
    listing: { listingId: "listing:7", agentId: "erc8004:56:7", slug: "range-agent", name: "Range Agent", shortDescription: "PancakeSwap rebalancing", categoryTags: ["rebalancing"], status: "TESTING" },
    service: {
      serviceId: "svc:erc8004:56:7:rebalancing",
      agentId: "erc8004:56:7",
      name: "Range Agent · Rebalancing",
      slug: "range-agent-rebalancing",
      category: "rebalancing",
      description: "PancakeSwap rebalancing",
      readiness: "LIMITED",
      permissionIntensity: "unknown",
      pricing: { model: "UNDECLARED", amount: "—", protocolCostsNote: "No normalized commercial terms." },
      supportedProtocols: ["PancakeSwap"],
      supportedPairs: ["BNB/USDT"],
      automationMode: "Machine-callable",
      evidenceSummary: { marketplaceObserved: "Test Lab passed", testsPassed: 5 },
      operator: "0x5555555555555555555555555555555555555555",
      erc8004Verified: true,
      origin: "ERC8004",
      listingId: "listing:7",
      marketplaceActivationEligible: false,
      runtimeEndpoints: [{ name: "A2A", endpoint: "https://agent.example/a2a", interactionKind: "A2A", machineCallable: true, provenance: "operator-claimed" }],
      readinessSnapshotId: "ready:7",
    },
    permissionProfile: { permissionProfileId: "perm:7", serviceId: "svc:erc8004:56:7:rebalancing", protocols: ["PancakeSwap"], assets: [], executionMode: "UNDECLARED", declarationState: "UNDECLARED", intensity: "unknown", provenance: "operator-claimed" },
    offer: { offerId: "offer:7", serviceId: "svc:erc8004:56:7:rebalancing", state: "UNDECLARED", source: "operator-claimed", note: "No offer" },
    readiness: {
      readinessSnapshotId: "ready:7",
      serviceId: "svc:erc8004:56:7:rebalancing",
      state: "LIMITED",
      checkedAt: now,
      reasons: ["Permission profile undeclared"],
      activationEligible: false,
      checks: [{ code: "MARKETPLACE_TESTS", label: "Marketplace tests", state: "PASS", requiredForActivation: true, detail: "passed", evidenceIds: ["ev-test"] }],
    },
    capabilityClaims: [],
    evidence: [{
      evidenceId: "ev-service",
      subjectType: "agent_service",
      subjectId: "svc:erc8004:56:7:rebalancing",
      metric: "capability",
      value: "rebalancing",
      provenance: "operator-claimed",
      sourceName: "8004scan",
      sourceId: "8004scan",
      truthLayer: "EXTERNAL_INDEXED",
      observedAt: now,
      freshnessAssessment: { metric: "capability", targetAgeSeconds: 300, warnAgeSeconds: 900, hardExpirySeconds: 3600, state: "FRESH", ageSeconds: 0 },
      availability: "AVAILABLE",
    }],
    normalizedAt: now,
    limitations: [],
  };
}

function match(): FindingServiceMatch {
  const service = record();
  return {
    matchId: "match:finding_rebalance:svc",
    findingId: "finding_rebalance",
    serviceId: service.service.serviceId,
    rank: 1,
    tier: "EXACT_CONTEXT",
    activationEligible: false,
    service,
    checks: [],
    strengths: ["PancakeSwap context match"],
    limitations: ["Permission undeclared"],
    explanation: "Exact context match, activation gated.",
  };
}

test("prepare creates an exact PREPARE_ONLY rebalancing job intent with unresolved authority", async () => {
  const engine = createJobIntentEngine();
  const intent = await engine.prepare({ session: session(), finding: finding(), match: match(), now: new Date(now) });
  assert.equal(intent.subject.tokenId, "42");
  assert.equal(intent.subject.pair, "BNB/USDT");
  assert.equal(intent.subject.currentTick, 180);
  assert.equal(intent.executionState, "NO_EXECUTION");
  assert.equal(intent.constraints.executionMode, "PREPARE_ONLY");
  assert.equal(intent.authority.state, "UNRESOLVED");
  assert.equal(intent.authority.walletControl, "WATCH_ONLY");
  assert.equal(intent.selectedService.activationEligible, false);
  assert.deepEqual(intent.evidenceReferences.findingEvidenceIds, ["ev-finding"]);
  assert.ok(intent.evidenceReferences.serviceEvidenceIds.includes("ev-service"));
  assert.ok(intent.evidenceReferences.readinessEvidenceIds.includes("ev-test"));
});

test("prepare is idempotent for the same finding and selected service", async () => {
  const engine = createJobIntentEngine();
  const first = await engine.prepare({ session: session(), finding: finding(), match: match(), now: new Date(now) });
  const second = await engine.prepare({ session: session(), finding: finding(), match: match(), constraints: { maxSlippageBps: 75 }, now: new Date("2026-08-21T12:00:10.000Z") });
  assert.equal(second.jobIntentId, first.jobIntentId);
  assert.equal(second.createdAt, first.createdAt);
  assert.equal(second.constraints.maxSlippageBps, 75);
});

test("revise validates proposed limits without turning them into authority", async () => {
  const engine = createJobIntentEngine();
  const prepared = await engine.prepare({ session: session("VERIFIED_CONTROL"), finding: finding(), match: match(), now: new Date(now) });
  const revised = await engine.revise(prepared.jobIntentId, { maxSlippageBps: 100, validForMinutes: 60, allowSwapPreparation: true });
  assert.equal(revised.constraints.maxSlippageBps, 100);
  assert.equal(revised.constraints.validForMinutes, 60);
  assert.equal(revised.constraints.allowSwapPreparation, true);
  assert.equal(revised.authority.state, "UNRESOLVED");
  await assert.rejects(() => engine.revise(prepared.jobIntentId, { maxSlippageBps: 999 }), /between 1 and 500/);
});

test("confirm advances only to AWAITING_AUTHORITY and never enables execution", async () => {
  const engine = createJobIntentEngine();
  const prepared = await engine.prepare({ session: session(), finding: finding(), match: match(), now: new Date() });
  const confirmed = await engine.confirm(prepared.jobIntentId);
  assert.equal(confirmed.state, "AWAITING_AUTHORITY");
  assert.equal(confirmed.executionState, "NO_EXECUTION");
  assert.equal(confirmed.authority.state, "UNRESOLVED");
  const repeated = await engine.prepare({ session: session(), finding: finding(), match: match(), constraints: { maxSlippageBps: 250 } });
  assert.equal(repeated.state, "AWAITING_AUTHORITY");
  assert.equal(repeated.constraints.maxSlippageBps, confirmed.constraints.maxSlippageBps);
});

test("non-rebalancing findings cannot enter the v0.14 vertical", async () => {
  const engine = createJobIntentEngine();
  await assert.rejects(() => engine.prepare({ session: session(), finding: finding("yield"), match: match() }), /Only Rebalancing findings/);
});
