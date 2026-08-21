import test from "node:test";
import assert from "node:assert/strict";
import { createJobIntentEngine } from "@spotriq/job-intents";
import type { CheckSession, Finding, FindingServiceMatch } from "@spotriq/domain";
import { registerJobIntentRoutes } from "./job-intents.js";

class FakeApp {
  handlers = new Map<string, (request: any, reply: any) => Promise<any>>();
  post(_path: string, handler: any): void { this.handlers.set(`POST ${_path}`, handler); }
  get(_path: string, handler: any): void { this.handlers.set(`GET ${_path}`, handler); }
  patch(_path: string, handler: any): void { this.handlers.set(`PATCH ${_path}`, handler); }
}

function replyRecorder() {
  return {
    statusCode: 200,
    payload: undefined as any,
    code(value: number) { this.statusCode = value; return this; },
    send(value: any) { this.payload = value; return value; },
  };
}

const session: CheckSession = {
  checkSessionId: "check_api_job",
  walletAddress: "0x1111111111111111111111111111111111111111",
  walletControl: "WATCH_ONLY",
  state: "COMPLETED",
  createdAt: "2026-08-21T12:00:00.000Z",
};

const finding: Finding = {
  findingId: "finding_api_job",
  checkSessionId: session.checkSessionId,
  category: "rebalancing",
  state: "needs-attention",
  severity: "attention",
  headline: "LP outside range",
  summary: "Observed outside range",
  confidence: "high",
  freshness: "Updated 1s ago",
  primaryAction: { label: "Find Rebalancing Agents" },
  targetRoute: "explore",
  keyValues: [],
  whatCouldAgentDo: "Prepare a rebalance",
  subject: {
    protocol: "PancakeSwap",
    version: "V3",
    tokenId: "77",
    poolAddress: "0x3333333333333333333333333333333333333333",
    pair: "BNB/USDT",
    tickLower: -100,
    tickUpper: 100,
    currentTick: 150,
    rangeState: "OUT_OF_RANGE_ABOVE",
    blockNumber: "999",
    network: "mainnet",
  },
  evidenceIds: ["ev-api-finding"],
};

function compatibleMatch(): FindingServiceMatch {
  return {
    matchId: "match-api",
    findingId: finding.findingId,
    serviceId: "svc:erc8004:56:9:rebalancing",
    rank: 1,
    tier: "EXACT_CONTEXT",
    activationEligible: false,
    service: {
      identity: {
        discoveryId: "erc8004:56:9",
        identity: { namespace: "eip155", chainId: 56, registryAddress: "0x4444444444444444444444444444444444444444", agentId: "9", identifier: "eip155:56:9" },
        name: "API Range Agent",
        description: "Rebalancing",
        supportedProtocols: ["PancakeSwap"],
        categoryHints: [],
        registrationServices: [],
        supportedTrust: [],
        externalReputation: { source: "8004scan", totalFeedbacks: 0, note: "test" },
        evidence: [],
        listingState: "DISCOVERED",
        marketplaceServiceState: "NOT_CREATED",
        limitations: [],
      },
      listing: { listingId: "listing-api", agentId: "erc8004:56:9", slug: "api-range-agent", name: "API Range Agent", shortDescription: "Rebalancing", categoryTags: ["rebalancing"], status: "TESTING" },
      service: {
        serviceId: "svc:erc8004:56:9:rebalancing",
        agentId: "erc8004:56:9",
        name: "API Range Agent · Rebalancing",
        slug: "api-range-agent-rebalancing",
        category: "rebalancing",
        description: "Rebalancing",
        readiness: "LIMITED",
        permissionIntensity: "unknown",
        pricing: { model: "UNDECLARED", amount: "—", protocolCostsNote: "none" },
        supportedProtocols: ["PancakeSwap"],
        automationMode: "Machine-callable",
        evidenceSummary: { marketplaceObserved: "none", testsPassed: 0 },
        operator: "0x5555555555555555555555555555555555555555",
        erc8004Verified: false,
        listingId: "listing-api",
        marketplaceActivationEligible: false,
      },
      permissionProfile: { permissionProfileId: "perm-api", serviceId: "svc:erc8004:56:9:rebalancing", protocols: ["PancakeSwap"], assets: [], executionMode: "UNDECLARED", declarationState: "UNDECLARED" },
      offer: { offerId: "offer-api", serviceId: "svc:erc8004:56:9:rebalancing", state: "UNDECLARED", source: "operator-claimed", note: "none" },
      readiness: { readinessSnapshotId: "ready-api", serviceId: "svc:erc8004:56:9:rebalancing", state: "LIMITED", checkedAt: "2026-08-21T12:00:00.000Z", reasons: [], activationEligible: false },
      capabilityClaims: [],
      evidence: [],
      normalizedAt: "2026-08-21T12:00:00.000Z",
      limitations: [],
    },
    checks: [],
    strengths: [],
    limitations: [],
    explanation: "Exact match",
  };
}

test("Job Intent API reloads the Finding and requires current compatible supply", async () => {
  const app = new FakeApp();
  let matchedFinding: Finding | undefined;
  const smartMoney = {
    getCheck: async (id: string) => id === session.checkSessionId ? { session, findings: [finding] } : undefined,
  };
  const match = compatibleMatch();
  const marketplaceSupply = {
    matchFinding: async (value: Finding) => {
      matchedFinding = value;
      return {
        findingId: value.findingId,
        checkSessionId: value.checkSessionId,
        context: { category: "rebalancing" as const, findingState: value.state, severity: value.severity },
        matches: [match],
        consideredServices: 1,
        excludedServices: 0,
        source: "8004scan" as const,
        methodVersion: "test",
        generatedAt: "2026-08-21T12:00:00.000Z",
        limitations: [],
      };
    },
  };
  await registerJobIntentRoutes(app as any, smartMoney as any, marketplaceSupply as any, createJobIntentEngine());
  const handler = app.handlers.get("POST /v1/checks/:checkSessionId/findings/:findingId/job-intents");
  assert.ok(handler);
  const reply = replyRecorder();
  await handler!({
    id: "req-job",
    params: { checkSessionId: session.checkSessionId, findingId: finding.findingId },
    body: {
      serviceId: match.serviceId,
      constraints: { maxSlippageBps: 80, validForMinutes: 45, allowSwapPreparation: true },
      subject: { tokenId: "client-cannot-override" },
    },
  }, reply);
  assert.equal(reply.statusCode, 201);
  assert.equal(matchedFinding, finding);
  assert.equal(reply.payload.data.intent.subject.tokenId, "77");
  assert.equal(reply.payload.data.intent.constraints.maxSlippageBps, 80);
  assert.equal(reply.payload.data.intent.executionState, "NO_EXECUTION");
});
