import test from "node:test";
import assert from "node:assert/strict";
import type { BoundedPermissionGrant, BoundedPermissionRequest, CheckSession, Finding, FindingServiceMatch, MarketplaceServiceRecord, RebalancingJobIntent, ServiceTask } from "@spotriq/domain";
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


function completedServiceTask(intent: RebalancingJobIntent): ServiceTask {
  return {
    serviceTaskId: `service-task:${intent.jobIntentId}`, jobIntentId: intent.jobIntentId, findingId: intent.findingId, serviceId: intent.selectedService.serviceId, agentId: intent.selectedService.agentId,
    state: "COMPLETED", protocol: "A2A", protocolBinding: "JSONRPC", protocolVersion: "1.0", runtimeEndpoint: "https://agent.example/a2a", agentCardUrl: "https://agent.example/.well-known/agent-card.json",
    requestContextHash: "sha256:task-context", requestContext: { jobIntentId: intent.jobIntentId, findingId: intent.findingId, serviceId: intent.selectedService.serviceId, agentId: intent.selectedService.agentId, walletAddress: intent.walletAddress, category: "rebalancing", requestedAction: "PREPARE_RANGE_REBALANCE", subject: { protocol: "PancakeSwap", version: intent.subject.version, network: intent.subject.network, tokenId: intent.subject.tokenId, pair: intent.subject.pair, tickLower: intent.subject.tickLower, tickUpper: intent.subject.tickUpper, currentTick: intent.subject.currentTick, feePips: intent.subject.feePips, tickSpacing: intent.subject.tickSpacing, rangeState: intent.subject.rangeState, blockNumber: intent.subject.blockNumber }, constraints: { ...intent.constraints }, expiresAt: intent.expiresAt },
    attempt: 1, attempts: [{ attempt: 1, requestId: "request-1", messageId: "message-1", idempotencyKey: "idem-1", requestedAt: intent.updatedAt, respondedAt: intent.updatedAt, state: "COMPLETED", remoteTaskId: "remote-task-1" }], remoteTaskId: "remote-task-1",
    proposalState: "STRUCTURED", proposal: { proposalId: "proposal-1", proposalHash: "sha256:proposal", requestContextHash: "sha256:task-context", action: "PREPARE_RANGE_REBALANCE", targetTickLower: -50, targetTickUpper: 50, receivedAt: intent.updatedAt, provenance: "marketplace-observed" },
    originProof: { state: "VERIFIED", serviceId: intent.selectedService.serviceId, agentId: intent.selectedService.agentId, runtimeEndpoint: "https://agent.example/a2a", protocol: "A2A", protocolBinding: "JSONRPC", protocolVersion: "1.0", requestId: "request-1", messageId: "message-1", requestContextHash: "sha256:task-context", remoteTaskId: "remote-task-1", observedAt: intent.updatedAt, evidenceIds: [], detail: "test proof" },
    commercialState: "NOT_PROVEN", evidence: [], createdAt: intent.createdAt, updatedAt: intent.updatedAt, limitations: [],
  };
}

async function confirmWithTask(engine: ReturnType<typeof createJobIntentEngine>, prepared: RebalancingJobIntent): Promise<RebalancingJobIntent> {
  await engine.linkServiceTask(prepared.jobIntentId, completedServiceTask(prepared));
  return engine.confirm(prepared.jobIntentId);
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
  const confirmed = await confirmWithTask(engine, prepared);
  assert.equal(confirmed.state, "AWAITING_AUTHORITY");
  assert.equal(confirmed.executionState, "NO_EXECUTION");
  assert.equal(confirmed.authority.state, "UNRESOLVED");
  const repeated = await engine.prepare({ session: session(), finding: finding(), match: match(), constraints: { maxSlippageBps: 250 } });
  assert.equal(repeated.state, "AWAITING_AUTHORITY");
  assert.equal(repeated.constraints.maxSlippageBps, confirmed.constraints.maxSlippageBps);
});

test("confirm is blocked until a real completed service task has verified origin and a structured proposal", async () => {
  const engine = createJobIntentEngine();
  const prepared = await engine.prepare({ session: session(), finding: finding(), match: match(), now: new Date() });
  await assert.rejects(() => engine.confirm(prepared.jobIntentId), /real server-originated task/i);
  const bad = completedServiceTask(prepared);
  bad.originProof = { ...bad.originProof, state: "UNVERIFIED" };
  await engine.linkServiceTask(prepared.jobIntentId, bad);
  await assert.rejects(() => engine.confirm(prepared.jobIntentId), /verified origin/i);
});

test("revising job limits invalidates a previously linked service task", async () => {
  const engine = createJobIntentEngine();
  const prepared = await engine.prepare({ session: session(), finding: finding(), match: match(), now: new Date() });
  const linked = await engine.linkServiceTask(prepared.jobIntentId, completedServiceTask(prepared));
  assert.ok(linked.serviceTask);
  const revised = await engine.revise(prepared.jobIntentId, { maxSlippageBps: 75 });
  assert.equal(revised.serviceTask, undefined);
  await assert.rejects(() => engine.confirm(prepared.jobIntentId), /real server-originated task/i);
});

test("non-rebalancing findings cannot enter the v0.14 vertical", async () => {
  const engine = createJobIntentEngine();
  await assert.rejects(() => engine.prepare({ session: session(), finding: finding("yield"), match: match() }), /Only Rebalancing findings/);
});


test("linking a bounded request and verified grant never enables execution", async () => {
  const engine = createJobIntentEngine();
  const prepared = await engine.prepare({ session: session("VERIFIED_CONTROL"), finding: finding(), match: match(), now: new Date() });
  const confirmed = await confirmWithTask(engine, prepared);

  const request: BoundedPermissionRequest = {
    permissionRequestId: "permission-request:test",
    jobIntentId: confirmed.jobIntentId,
    serviceId: confirmed.selectedService.serviceId,
    walletAddress: confirmed.walletAddress,
    provider: "ALTANA",
    network: "mainnet",
    chainId: 56,
    protocol: "PancakeSwap",
    positionManager: "0x2222222222222222222222222222222222222222",
    tokenId: "42",
    callAllowlist: [{
      to: "0x2222222222222222222222222222222222222222",
      signature: "collect((uint256,address,uint128,uint128))",
      label: "Collect V3 position fees",
      provenance: "marketplace-derived",
    }],
    spendCaps: [],
    expiresAt: "2026-08-21T13:00:00.000Z",
    expiryUnix: 1787317200,
    status: "READY",
    providerSubmissionState: "SAFETY_PREREQUISITES_REQUIRED",
    safetyPrerequisites: [
      { code: "TRUSTED_AGENT_SESSION_KEY", state: "REQUIRED", blocking: true, label: "Trusted agent session key", detail: "Trusted agent session key is required.", provenance: "marketplace-derived" },
      { code: "ARGUMENT_LEVEL_EXECUTION_GUARD", state: "REQUIRED", blocking: true, label: "Argument-level execution guard", detail: "Exact calldata must be checked against the Job Intent.", provenance: "marketplace-derived" },
      { code: "NON_BYPASSABLE_FINANCIAL_EXECUTION_BOUNDARY", state: "REQUIRED", blocking: true, label: "Non-bypassable financial execution boundary", detail: "Financial authority requires an enforcement path the agent key cannot bypass.", provenance: "marketplace-derived" },
    ],
    submissionBlockers: ["Trusted agent session key is required.", "Exact calldata must be checked against the Job Intent.", "Financial authority requires an enforcement path the agent key cannot bypass."],
    walletControl: "VERIFIED_CONTROL",
    scopeProvenance: "marketplace-derived",
    activationEligible: false,
    methodVersion: "marketplace.bounded-authority@1.0.0",
    createdAt: now,
    updatedAt: now,
    limitations: [],
  };

  const withRequest = await engine.linkPermissionRequest(confirmed.jobIntentId, request);
  assert.equal(withRequest.authority.state, "REQUEST_PREPARED");
  assert.equal(withRequest.executionState, "NO_EXECUTION");
  assert.equal(withRequest.authority.permissionRequestId, request.permissionRequestId);

  const grant: BoundedPermissionGrant = {
    permissionGrantId: "permission-grant:test",
    permissionRequestId: request.permissionRequestId,
    jobIntentId: confirmed.jobIntentId,
    serviceId: confirmed.selectedService.serviceId,
    walletAddress: confirmed.walletAddress,
    provider: "ALTANA",
    network: "mainnet",
    chainId: 56,
    sessionPublicKey: "0x02aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    keyId: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    requestedCalls: request.callAllowlist,
    grantedCalls: request.callAllowlist.map(({ to, signature }) => ({ to, signature })),
    requestedSpendCaps: request.spendCaps,
    grantedSpendCaps: [],
    expiresAt: request.expiresAt,
    expiryUnix: request.expiryUnix,
    keystoreAddress: "0x6572427ED530BadcF7375Cf9A4709D8d2b0E7E0a",
    state: "ACTIVE",
    reconciliation: "EXACT_MATCH",
    onchainValid: true,
    verifiedAt: now,
    executionSafetyPrerequisites: request.safetyPrerequisites,
    executionEligible: false,
    reconciliationReasons: [],
    limitations: [],
  };

  const withGrant = await engine.linkPermissionGrant(confirmed.jobIntentId, grant);
  assert.equal(withGrant.authority.state, "GRANT_VERIFIED");
  assert.equal(withGrant.executionState, "NO_EXECUTION");
  assert.equal(withGrant.authority.permissionGrantId, grant.permissionGrantId);
  assert.ok(withGrant.authority.blockers.some((blocker) => /trusted agent session key/i.test(blocker)));
  assert.ok(withGrant.authority.blockers.some((blocker) => /calldata|execution guard/i.test(blocker)));
  assert.ok(withGrant.authority.blockers.some((blocker) => /execution disabled/i.test(blocker)));
});

test("a receipt-confirmed controlled BSC Testnet execution completes the Job Intent", async () => {
  const engine = createJobIntentEngine();
  const liveNow = new Date();
  const prepared = await engine.prepare({ session: session("VERIFIED_CONTROL"), finding: finding(), match: match(), now: liveNow });
  const confirmed = await confirmWithTask(engine, prepared);
  const execution = {
    executionId: "execution:rebalancing:test",
    boundaryId: "boundary:test",
    planId: "plan:test",
    planHash: `0x${"ab".repeat(32)}`,
    jobIntentId: confirmed.jobIntentId,
    permissionRequestId: "permission:test",
    financialSessionId: "financial-session:test",
    serviceId: confirmed.selectedService.serviceId,
    walletAddress: confirmed.walletAddress,
    network: "testnet",
    chainId: 97,
    state: "CONFIRMED",
    calls: [],
    preflightId: "preflight:test",
    readinessId: "readiness:test",
    sessionVerifiedAt: liveNow.toISOString(),
    providerCallsId: "0x12",
    providerStatus: "CONFIRMED",
    transactionHash: `0x${"99".repeat(32)}`,
    receipt: { network: "testnet", chainId: 97, transactionHash: `0x${"99".repeat(32)}`, blockNumber: "123", blockHash: `0x${"11".repeat(32)}`, status: "SUCCESS", gasUsedRaw: "100" },
    executionEligible: false,
    createdAt: liveNow.toISOString(),
    updatedAt: liveNow.toISOString(),
    expiresAt: new Date(liveNow.getTime() + 60_000).toISOString(),
    methodVersion: "marketplace.controlled-rebalancing-execution@1.0.0",
    limitations: [],
  } as any;
  const completed = await engine.linkControlledExecution(confirmed.jobIntentId, execution);
  assert.equal(completed.state, "COMPLETED");
  assert.equal(completed.executionState, "CONTROLLED_TESTNET_EXECUTED");
  await assert.rejects(() => engine.linkControlledExecution(confirmed.jobIntentId, { ...execution, state: "FAILED" } as any), /receipt-confirmed/);
});
