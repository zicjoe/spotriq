import test from "node:test";
import assert from "node:assert/strict";
import type { AgentAuthorityBinding, MarketplaceServiceRecord, MarketplaceServiceTestCoverage, RebalancingJobIntent } from "@spotriq/domain";
import type { MarketplaceSupplyReader } from "@spotriq/marketplace-supply";
import { createServiceTaskEngine, SPOTRIQ_REBALANCING_PROPOSAL_SCHEMA } from "./index.js";

const fixedNow = new Date("2026-08-24T09:00:00.000Z");
const endpoint = "https://agent.example/a2a";
const agentCardUrl = "https://agent.example/.well-known/agent-card.json";

function job(overrides: Partial<RebalancingJobIntent> = {}): RebalancingJobIntent {
  return {
    jobIntentId: "job-task-1", checkSessionId: "check-1", findingId: "finding-1", category: "rebalancing", state: "REVIEWABLE", executionState: "NO_EXECUTION",
    walletAddress: "0x1111111111111111111111111111111111111111", walletControl: "VERIFIED_CONTROL",
    requestedAction: { code: "PREPARE_RANGE_REBALANCE", label: "Prepare range rebalance", description: "Prepare only" },
    subject: { protocol: "PancakeSwap", version: "V3", network: "testnet", tokenId: "77", positionManager: "0x2222222222222222222222222222222222222222", pair: "T0/T1", tickLower: -120, tickUpper: 120, currentTick: 0, feePips: 500, tickSpacing: 10, rangeState: "IN_RANGE", blockNumber: "123" },
    constraints: { executionMode: "PREPARE_ONLY", maxSlippageBps: 50, maxActionCount: 4, validForMinutes: 30, allowSwapPreparation: false },
    selectedService: { serviceId: "service-1", agentId: "agent-1", name: "Range Agent", operator: "0x3333333333333333333333333333333333333333", matchId: "match-1", matchRank: 1, matchTier: "EXACT_CONTEXT", readiness: "LIMITED", activationEligible: false, supportedProtocols: ["PancakeSwap"], runtimeEndpoints: [{ name: "A2A", endpoint, interactionKind: "A2A", machineCallable: true, provenance: "operator-claimed" }] },
    evidenceReferences: { findingEvidenceIds: [], serviceEvidenceIds: [], readinessEvidenceIds: [] },
    authority: { state: "UNRESOLVED", requiredBeforeExecution: true, declarationState: "UNDECLARED", walletControl: "VERIFIED_CONTROL", blockers: [] },
    methodVersion: "job@1", createdAt: fixedNow.toISOString(), updatedAt: fixedNow.toISOString(), expiresAt: "2026-08-24T09:30:00.000Z", limitations: [],
    ...overrides,
  };
}

function tests(): MarketplaceServiceTestCoverage {
  const base = { state: "PASS" as const, requiredForReadiness: true, endpoint, interactionKind: "A2A" as const, observedAt: fixedNow.toISOString() };
  return {
    serviceId: "service-1", coverage: "PASS", observedAt: fixedNow.toISOString(), methodVersion: "test-lab@1", note: "fresh A2A pass", limitations: [], evidence: [],
    tests: [
      { ...base, testId: "reach", code: "ENDPOINT_REACHABILITY", label: "reach", detail: "pass" },
      { ...base, testId: "contract", code: "PROTOCOL_CONTRACT", label: "contract", detail: "pass", protocolVersion: "1.0" },
      { ...base, testId: "capability", code: "CATEGORY_CAPABILITY", label: "capability", detail: "pass" },
    ],
  };
}

function binding(): AgentAuthorityBinding {
  return { bindingId: "binding-1", serviceId: "service-1", agentId: "agent-1", state: "VERIFIED", interactionKind: "A2A", runtimeEndpoint: endpoint, agentCardUrl, extensionUri: "urn:spotriq:authority-binding:v1", signatureScheme: "EIP191_SECP256K1", sessionPublicKey: "0x02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", sessionKeyAddress: "0x4444444444444444444444444444444444444444", observedAt: fixedNow.toISOString(), evidenceIds: [], methodVersion: "binding@1", detail: "verified", limitations: [] };
}

function marketplace(): MarketplaceSupplyReader {
  return {
    getService: async () => ({ service: { serviceId: "service-1" }, identity: { discoveryId: "agent-1" } } as unknown as MarketplaceServiceRecord),
    getTests: async () => tests(),
    verifyAuthorityBinding: async () => binding(),
  } as unknown as MarketplaceSupplyReader;
}

function json(body: unknown): Response { return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }); }

function engineWithCard(card: Record<string, unknown>, options: { mismatch?: boolean; sent?: Array<{url:string; init:RequestInit}>; marketplace?: MarketplaceSupplyReader } = {}) {
  const sent = options.sent ?? [];
  const fetcher: typeof fetch = async (input, init = {}) => {
    const url = String(input);
    sent.push({ url, init });
    if (url.includes(".well-known/agent-card.json")) return json(card);
    const request = JSON.parse(String(init.body ?? "{}")) as Record<string, any>;
    const params = request.params as Record<string, any>;
    const contextHash = params?.metadata?.spotriq?.requestContextHash ?? params?.message?.metadata?.spotriq?.requestContextHash;
    const proposalHash = options.mismatch ? "sha256:not-the-request" : contextHash;
    return json({ jsonrpc: "2.0", id: request.id, result: { id: "remote-task-1", status: { state: "TASK_STATE_COMPLETED" }, artifacts: [{ artifactId: "proposal-artifact", parts: [{ data: { schema: SPOTRIQ_REBALANCING_PROPOSAL_SCHEMA, requestContextHash: proposalHash, action: "PREPARE_RANGE_REBALANCE", proposalId: "agent-proposal-1", targetTickLower: -50, targetTickUpper: 50, summary: "Move the V3 range around current tick." } }] }] } });
  };
  return createServiceTaskEngine({ marketplace: options.marketplace ?? marketplace(), http: { fetcher, resolver: async () => ["1.1.1.1"], now: () => fixedNow } });
}

const v1Card = { name: "Range Agent", supportedInterfaces: [{ url: endpoint, protocolBinding: "JSONRPC", protocolVersion: "1.0.0", tenant: "spotriq-range" }] };

test("invokes A2A 1.0 server-side and produces verified exact-context proposal origin", async () => {
  const sent: Array<{url:string;init:RequestInit}> = [];
  const task = await engineWithCard(v1Card, { sent }).invoke(job());
  assert.equal(task.state, "COMPLETED");
  assert.equal(task.originProof.state, "VERIFIED");
  assert.equal(task.proposalState, "STRUCTURED");
  assert.equal(task.proposal?.targetTickLower, -50);
  assert.equal(task.commercialState, "NOT_PROVEN");
  assert.equal(task.protocolVersion, "1.0");
  assert.equal(task.tenant, "spotriq-range");
  const taskCall = sent.find((item) => item.url === endpoint)!;
  const body = JSON.parse(String(taskCall.init.body)) as Record<string, any>;
  assert.equal(body.method, "SendMessage");
  assert.equal(body.params.tenant, "spotriq-range");
  assert.equal((taskCall.init.headers as Record<string,string>)["A2A-Version"], "1.0");
  assert.equal(JSON.stringify(body).includes("privateKey"), false);
  assert.equal(JSON.stringify(body).includes("sessionSigner"), false);
});

test("does not verify origin when the service proposal does not echo the exact request-context hash", async () => {
  const task = await engineWithCard(v1Card, { mismatch: true }).invoke(job());
  assert.equal(task.state, "COMPLETED");
  assert.equal(task.proposalState, "MISMATCH");
  assert.equal(task.originProof.state, "UNVERIFIED");
  assert.equal(task.proposal, undefined);
});

test("refuses a service that requires unconfigured A2A client authentication", async () => {
  const sent: Array<{url:string;init:RequestInit}> = [];
  const task = await engineWithCard({ ...v1Card, securityRequirements: [{ schemes: { bearerAuth: { list: [] } } }], securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } } }, { sent }).invoke(job());
  assert.equal(task.state, "AUTH_REQUIRED");
  assert.equal(task.originProof.state, "UNVERIFIED");
  assert.equal(sent.filter((item) => item.url === endpoint).length, 0);
  assert.match(task.limitations.at(-1) ?? "", /not a client credential/i);
});

test("explicit retry after revised server-derived constraints creates a new task/context instead of returning stale origin evidence", async () => {
  const engine = engineWithCard(v1Card);
  const firstJob = job();
  const first = await engine.invoke(firstJob);
  const revised = job({ constraints: { ...firstJob.constraints, maxSlippageBps: 75 }, updatedAt: "2026-08-24T09:02:00.000Z", expiresAt: "2026-08-24T09:32:00.000Z" });
  const second = await engine.retry(revised, first.serviceTaskId);
  assert.notEqual(second.serviceTaskId, first.serviceTaskId);
  assert.notEqual(second.requestContextHash, first.requestContextHash);
  assert.equal(second.requestContext.constraints.maxSlippageBps, 75);
  assert.equal(second.originProof.state, "VERIFIED");
});



test("reconciliation refuses to mint fresh origin proof from a stale persisted service binding", async () => {
  let bindingAvailable = true;
  const mutableMarketplace = {
    ...marketplace(),
    verifyAuthorityBinding: async () => bindingAvailable ? binding() : { ...binding(), state: "FAILED" as const, sessionKeyAddress: undefined, detail: "fresh challenge failed" },
  } as MarketplaceSupplyReader;
  const engine = engineWithCard(v1Card, { marketplace: mutableMarketplace });
  const initial = await engine.invoke(job());
  assert.equal(initial.originProof.state, "VERIFIED");
  bindingAvailable = false;
  await assert.rejects(() => engine.reconcile(initial.serviceTaskId), /Fresh service-owned key verification failed/i);
});

test("supports historical A2A 0.3 JSON-RPC without pretending it is 1.0", async () => {
  const sent: Array<{url:string;init:RequestInit}> = [];
  const card = { name: "Legacy Range Agent", url: endpoint, protocolVersion: "0.3.0", preferredTransport: "JSONRPC" };
  const task = await engineWithCard(card, { sent }).invoke(job());
  assert.equal(task.protocolVersion, "0.3");
  const call = sent.find((item) => item.url === endpoint)!;
  const body = JSON.parse(String(call.init.body)) as Record<string, any>;
  assert.equal(body.method, "message/send");
  assert.equal(body.params.message.role, "user");
});
