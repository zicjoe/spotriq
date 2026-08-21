import test from "node:test";
import assert from "node:assert/strict";
import type { AgentAuthorityBinding, AltanaGrantProof, BoundedPermissionRequest, RebalancingExecutionGuardReport, RebalancingJobIntent } from "@spotriq/domain";
import { createAuthorityEngine, type AltanaKeystoreVerifier } from "./index.js";

const wallet = "0x1111111111111111111111111111111111111111";
const positionManager = "0x2222222222222222222222222222222222222222";
const token0 = "0x3333333333333333333333333333333333333333";
const token1 = "0x4444444444444444444444444444444444444444";
const now = new Date("2026-08-21T16:00:00.000Z");
const publicKey = `0x04${"11".repeat(64)}`;

function job(overrides: Partial<RebalancingJobIntent> = {}): RebalancingJobIntent {
  return {
    jobIntentId: "job:rebalancing:finding-1:service-1",
    state: "AWAITING_AUTHORITY",
    executionState: "NO_EXECUTION",
    category: "rebalancing",
    checkSessionId: "check-1",
    findingId: "finding-1",
    walletAddress: wallet,
    walletControl: "VERIFIED_CONTROL",
    requestedAction: { code: "PREPARE_RANGE_REBALANCE", label: "Prepare rebalance", description: "test" },
    subject: {
      protocol: "PancakeSwap",
      version: "V3",
      network: "testnet",
      tokenId: "42",
      positionManager,
      token0: { address: token0, symbol: "WBNB", decimals: 18, isNative: false },
      token1: { address: token1, symbol: "USDT", decimals: 18, isNative: false },
      poolAddress: "0x5555555555555555555555555555555555555555",
      pair: "WBNB/USDT",
      tickLower: -100,
      tickUpper: 100,
      currentTick: 150,
      rangeState: "OUT_OF_RANGE_ABOVE",
      blockNumber: "123",
    },
    constraints: { executionMode: "PREPARE_ONLY", maxSlippageBps: 50, maxActionCount: 1, validForMinutes: 30, allowSwapPreparation: true },
    selectedService: {
      serviceId: "service-1",
      agentId: "agent-1",
      name: "Range Agent",
      operator: "operator",
      matchId: "match-1",
      matchRank: 1,
      matchTier: "EXACT_CONTEXT",
      readiness: "LIMITED",
      activationEligible: false,
      supportedProtocols: ["PancakeSwap"],
      runtimeEndpoints: [],
    },
    evidenceReferences: { findingEvidenceIds: [], serviceEvidenceIds: [], readinessEvidenceIds: [] },
    authority: { state: "UNRESOLVED", requiredBeforeExecution: true, permissionProfileId: "perm-1", declarationState: "UNDECLARED", walletControl: "VERIFIED_CONTROL", blockers: [] },
    methodVersion: "test",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: "2026-08-21T16:30:00.000Z",
    limitations: [],
    ...overrides,
  };
}

function verifier(valid = true): AltanaKeystoreVerifier {
  return {
    async verify() {
      return { keyId: `0x${"aa".repeat(32)}`, keystoreAddress: "0x6b8361C29d05D498b1a12B54A37310f94171E94A", valid, blockNumber: "555" };
    },
  };
}

function proofFrom(request: BoundedPermissionRequest): AltanaGrantProof {
  return {
    walletAddress: request.walletAddress,
    sessionPublicKey: publicKey,
    calls: request.callAllowlist.map(({ to, signature }) => ({ to, signature })),
    spend: request.spendCaps.map(({ token, limitRaw, period }) => ({ token, limitRaw, period })),
    expiryUnix: request.expiryUnix,
    transactionHash: `0x${"bb".repeat(32)}`,
  };
}

test("prepare derives exact V3 contract/signature scope and user-proposed token caps", async () => {
  const engine = createAuthorityEngine({ verifier: verifier() });
  const request = await engine.prepare(job(), { token0Limit: "0.25", token1Limit: "125", validForMinutes: 30 }, now);
  assert.equal(request.provider, "ALTANA");
  assert.equal(request.chainId, 97);
  assert.equal(request.positionManager, positionManager);
  assert.equal(request.spendCaps[0]?.limitRaw, "250000000000000000");
  assert.equal(request.spendCaps[1]?.limitRaw, "125000000000000000000");
  assert.ok(request.callAllowlist.every((call) => call.to === positionManager));
  assert.ok(request.callAllowlist.some((call) => call.signature.startsWith("decreaseLiquidity")));
  assert.ok(request.callAllowlist.some((call) => call.signature.startsWith("mint")));
  assert.ok(request.callAllowlist.every((call) => !/approve|multicall|swap|withdraw|transfer/i.test(call.signature)));
  assert.equal(request.providerSubmissionState, "SAFETY_PREREQUISITES_REQUIRED");
  assert.deepEqual(request.safetyPrerequisites.map((item) => item.code), ["TRUSTED_AGENT_SESSION_KEY", "ARGUMENT_LEVEL_EXECUTION_GUARD", "NON_BYPASSABLE_FINANCIAL_EXECUTION_BOUNDARY"]);
  assert.ok(request.safetyPrerequisites.every((item) => item.state === "REQUIRED" && item.blocking));
  assert.equal(request.activationEligible, false);
});

test("prepare rejects unconfirmed jobs and unmodeled Infinity CL authority", async () => {
  const engine = createAuthorityEngine({ verifier: verifier() });
  await assert.rejects(() => engine.prepare(job({ state: "REVIEWABLE" }), { token0Limit: "1", token1Limit: "1", validForMinutes: 30 }, now), /AWAITING_AUTHORITY/);
  const infinity = job({ subject: { ...job().subject, version: "INFINITY_CL" } });
  await assert.rejects(() => engine.prepare(infinity, { token0Limit: "1", token1Limit: "1", validForMinutes: 30 }, now), /derives exact selector-scoped authority only for PancakeSwap V3/);
});

test("prepare is deterministic and revise changes only the reviewed caps before grant reconciliation", async () => {
  const engine = createAuthorityEngine({ verifier: verifier() });
  const first = await engine.prepare(job(), { token0Limit: "1", token1Limit: "2", validForMinutes: 30 }, now);
  const second = await engine.prepare(job(), { token0Limit: "3", token1Limit: "4", validForMinutes: 45 }, new Date("2026-08-21T16:01:00Z"));
  assert.equal(second.permissionRequestId, first.permissionRequestId);
  assert.equal(second.createdAt, first.createdAt);
  assert.equal(second.spendCaps[0]?.limitDisplay, "3");
  const revised = await engine.revise(first.permissionRequestId, job(), { token0Limit: "5", token1Limit: "6", validForMinutes: 60 }, new Date("2026-08-21T16:02:00Z"));
  assert.equal(revised.spendCaps[0]?.limitDisplay, "5");
  assert.equal(revised.expiryUnix, Math.floor(new Date("2026-08-21T17:02:00Z").getTime() / 1000));
});

test("exact provider scope plus current Keystore validity becomes ACTIVE but still non-executable", async () => {
  const engine = createAuthorityEngine({ verifier: verifier(true) });
  const request = await engine.prepare(job(), { token0Limit: "1", token1Limit: "2", validForMinutes: 30 }, now);
  const grant = await engine.reconcile(request.permissionRequestId, proofFrom(request), new Date("2026-08-21T16:05:00Z"));
  assert.equal(grant.reconciliation, "EXACT_MATCH");
  assert.equal(grant.onchainValid, true);
  assert.equal(grant.state, "ACTIVE");
  assert.equal(grant.executionEligible, false);
  assert.deepEqual(grant.executionSafetyPrerequisites.map((item) => item.code), ["TRUSTED_AGENT_SESSION_KEY", "ARGUMENT_LEVEL_EXECUTION_GUARD", "NON_BYPASSABLE_FINANCIAL_EXECUTION_BOUNDARY"]);
  assert.equal((await engine.getRequest(request.permissionRequestId)).status, "CONFIRMED");
});

test("a broader/different provider scope never becomes an active reconciled grant", async () => {
  const engine = createAuthorityEngine({ verifier: verifier(true) });
  const request = await engine.prepare(job(), { token0Limit: "1", token1Limit: "2", validForMinutes: 30 }, now);
  const proof = proofFrom(request);
  proof.calls = [...proof.calls, { to: positionManager, signature: "multicall(bytes[])" }];
  const grant = await engine.reconcile(request.permissionRequestId, proof, new Date("2026-08-21T16:05:00Z"));
  assert.equal(grant.reconciliation, "SCOPE_MISMATCH");
  assert.equal(grant.state, "PROVIDER_ERROR");
  assert.equal(grant.executionEligible, false);
});

test("an exact returned scope is still invalid when Keystore isValidKey is false", async () => {
  const engine = createAuthorityEngine({ verifier: verifier(false) });
  const request = await engine.prepare(job(), { token0Limit: "1", token1Limit: "2", validForMinutes: 30 }, now);
  const grant = await engine.reconcile(request.permissionRequestId, proofFrom(request), new Date("2026-08-21T16:05:00Z"));
  assert.equal(grant.reconciliation, "ONCHAIN_INVALID");
  assert.equal(grant.onchainValid, false);
  assert.notEqual(grant.state, "ACTIVE");
});

test("reverify turns a previously active grant into revoked/unusable when Keystore later returns false", async () => {
  let valid = true;
  const dynamicVerifier: AltanaKeystoreVerifier = {
    async verify() { return { keyId: `0x${"cc".repeat(32)}`, keystoreAddress: "0x6b8361C29d05D498b1a12B54A37310f94171E94A", valid, blockNumber: valid ? "600" : "601" }; },
  };
  const engine = createAuthorityEngine({ verifier: dynamicVerifier });
  const request = await engine.prepare(job(), { token0Limit: "1", token1Limit: "2", validForMinutes: 30 }, now);
  const active = await engine.reconcile(request.permissionRequestId, proofFrom(request), new Date("2026-08-21T16:05:00Z"));
  assert.equal(active.state, "ACTIVE");
  valid = false;
  const revoked = await engine.reverify(active.permissionGrantId, new Date("2026-08-21T16:06:00Z"));
  assert.equal(revoked.state, "REVOKED");
  assert.equal(revoked.onchainValid, false);
  assert.equal(revoked.executionEligible, false);
});


test("verified service-key binding and a passing proposal guard satisfy only their own prerequisites", async () => {
  const engine = createAuthorityEngine({ verifier: verifier(true) });
  const request = await engine.prepare(job(), { token0Limit: "1", token1Limit: "2", validForMinutes: 30 }, now);
  const binding: AgentAuthorityBinding = {
    bindingId: "binding-1", serviceId: request.serviceId, agentId: "agent-1", state: "VERIFIED", interactionKind: "A2A",
    runtimeEndpoint: "https://agent.example/a2a", agentCardUrl: "https://agent.example/.well-known/agent-card.json", extensionUri: "urn:spotriq:authority-binding:v1",
    challengeUrl: "https://agent.example/authority/challenge", signatureScheme: "EIP191_SECP256K1", sessionPublicKey: publicKey, sessionKeyAddress: "0x9999999999999999999999999999999999999999",
    observedAt: now.toISOString(), evidenceIds: ["ev-binding"], methodVersion: "marketplace.agent-authority-binding@1.0.0", detail: "verified", limitations: [],
  };
  const withBinding = await engine.applyTrustedAgentBinding(request.permissionRequestId, binding, now);
  assert.equal(withBinding.safetyPrerequisites.find((item) => item.code === "TRUSTED_AGENT_SESSION_KEY")?.state, "SATISFIED");
  assert.equal(withBinding.providerSubmissionState, "SAFETY_PREREQUISITES_REQUIRED");

  const report: RebalancingExecutionGuardReport = {
    reportId: "guard-1", proposalId: "proposal-1", jobIntentId: request.jobIntentId, permissionRequestId: request.permissionRequestId, serviceId: request.serviceId,
    state: "PASS", callKind: "COLLECT", decodedFunction: "collect", checks: [], checkedAt: now.toISOString(), methodVersion: "marketplace.rebalancing-calldata-guard@1.0.0",
    argumentGuardSatisfied: true, nonBypassableBoundarySatisfied: false, executionEligible: false, limitations: [],
  };
  const withGuard = await engine.applyExecutionGuard(request.permissionRequestId, report, now);
  assert.equal(withGuard.safetyPrerequisites.find((item) => item.code === "ARGUMENT_LEVEL_EXECUTION_GUARD")?.state, "SATISFIED");
  assert.equal(withGuard.safetyPrerequisites.find((item) => item.code === "NON_BYPASSABLE_FINANCIAL_EXECUTION_BOUNDARY")?.state, "REQUIRED");
  assert.equal(withGuard.providerSubmissionState, "SAFETY_PREREQUISITES_REQUIRED");
  assert.equal(withGuard.activationEligible, false);
});

test("grant reconciliation rejects a session key that differs from a VERIFIED service-owned binding", async () => {
  const engine = createAuthorityEngine({ verifier: verifier(true) });
  const request = await engine.prepare(job(), { token0Limit: "1", token1Limit: "2", validForMinutes: 30 }, now);
  const binding: AgentAuthorityBinding = {
    bindingId: "binding-2", serviceId: request.serviceId, agentId: "agent-1", state: "VERIFIED", interactionKind: "A2A", runtimeEndpoint: "https://agent.example/a2a",
    agentCardUrl: "https://agent.example/.well-known/agent-card.json", extensionUri: "urn:spotriq:authority-binding:v1", signatureScheme: "EIP191_SECP256K1",
    sessionPublicKey: `0x04${"22".repeat(64)}`, sessionKeyAddress: "0x8888888888888888888888888888888888888888", observedAt: now.toISOString(), evidenceIds: [], methodVersion: "test", detail: "verified", limitations: [],
  };
  await engine.applyTrustedAgentBinding(request.permissionRequestId, binding, now);
  const grant = await engine.reconcile(request.permissionRequestId, proofFrom(request), new Date("2026-08-21T16:05:00Z"));
  assert.equal(grant.reconciliation, "SCOPE_MISMATCH");
  assert.equal(grant.state, "PROVIDER_ERROR");
  assert.ok(grant.reconciliationReasons.some((reason) => /service-owned key|session key/i.test(reason)));
});

test("real-testnet probe model verifies read-only scope and observes later revocation", async () => {
  let valid = true;
  const dynamicVerifier: AltanaKeystoreVerifier = {
    async verify() { return { keyId: `0x${"dd".repeat(32)}`, keystoreAddress: "0x6b8361C29d05D498b1a12B54A37310f94171E94A", valid, blockNumber: valid ? "700" : "701" }; },
  };
  const engine = createAuthorityEngine({ verifier: dynamicVerifier });
  const intent = job();
  const probe = await engine.observeTestnetProbe(intent, { walletAddress: wallet, target: positionManager, signature: "positions(uint256)", sessionPublicKey: publicKey, transactionHash: `0x${"ee".repeat(32)}`, expiryUnix: Math.floor(now.getTime() / 1000) + 1800 }, now);
  assert.equal(probe.state, "ACTIVE");
  assert.equal(probe.onchainValid, true);
  assert.equal((await engine.getTestnetProbeForJob(intent.jobIntentId))?.probeId, probe.probeId);
  valid = false;
  const revoked = await engine.reverifyTestnetProbe(probe.probeId, { revocationTransactionHash: `0x${"ff".repeat(32)}` }, new Date("2026-08-21T16:02:00Z"));
  assert.equal(revoked.state, "REVOKED");
  assert.equal(revoked.onchainValid, false);
  assert.equal(revoked.revocationTransactionHash, `0x${"ff".repeat(32)}`);
});
