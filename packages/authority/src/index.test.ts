import test from "node:test";
import assert from "node:assert/strict";
import type { AgentAuthorityBinding, AltanaGrantProof, BoundaryFinancialSessionProof, BoundedPermissionRequest, FinancialExecutionBoundary, RebalancingExecutionGuardReport, RebalancingExecutionPlan, RebalancingJobIntent } from "@spotriq/domain";
import type { BscChainReader } from "@spotriq/chain";
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
    constraints: { executionMode: "PREPARE_ONLY", maxSlippageBps: 50, maxActionCount: 4, validForMinutes: 30, allowSwapPreparation: true },
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


test("reviewed execution plan satisfies the plan-level argument guard but keeps the boundary prerequisite", async () => {
  const engine = createAuthorityEngine({ verifier: verifier(true) });
  const prepared = await engine.prepare(job(), { token0Limit: "1", token1Limit: "2", validForMinutes: 30 }, now);
  const binding: AgentAuthorityBinding = {
    bindingId: "binding-plan", serviceId: prepared.serviceId, agentId: "agent-1", state: "VERIFIED", interactionKind: "A2A",
    runtimeEndpoint: "https://agent.example/a2a", agentCardUrl: "https://agent.example/.well-known/agent-card.json", extensionUri: "urn:spotriq:authority-binding:v1",
    signatureScheme: "EIP191_SECP256K1", sessionPublicKey: publicKey, sessionKeyAddress: "0x9999999999999999999999999999999999999999",
    observedAt: now.toISOString(), evidenceIds: [], methodVersion: "test", detail: "verified", limitations: [],
  };
  const withBinding = await engine.applyTrustedAgentBinding(prepared.permissionRequestId, binding, now);
  const plan = {
    planId: "plan-1", jobIntentId: withBinding.jobIntentId, permissionRequestId: withBinding.permissionRequestId, serviceId: withBinding.serviceId,
    state: "REVIEWED", guardState: "PASS", steps: [{ index: 0 }],
  } as unknown as RebalancingExecutionPlan;
  const withPlan = await engine.applyExecutionPlan(withBinding.permissionRequestId, plan, now);
  assert.equal(withPlan.executionPlanId, "plan-1");
  assert.equal(withPlan.safetyPrerequisites.find((x) => x.code === "ARGUMENT_LEVEL_EXECUTION_GUARD")?.state, "SATISFIED");
  assert.equal(withPlan.safetyPrerequisites.find((x) => x.code === "NON_BYPASSABLE_FINANCIAL_EXECUTION_BOUNDARY")?.state, "REQUIRED");
  assert.equal(withPlan.providerSubmissionState, "SAFETY_PREREQUISITES_REQUIRED");
  assert.equal(withPlan.activationEligible, false);
});

test("sealed boundary satisfies the final safety prerequisite but still requires a boundary financial signer", async () => {
  const engine = createAuthorityEngine({ verifier: verifier(true) });
  const prepared = await engine.prepare(job(), { token0Limit: "1", token1Limit: "2", validForMinutes: 30 }, now);
  const binding: AgentAuthorityBinding = {
    bindingId: "binding-boundary", serviceId: prepared.serviceId, agentId: "agent-1", state: "VERIFIED", interactionKind: "A2A",
    runtimeEndpoint: "https://agent.example/a2a", agentCardUrl: "https://agent.example/.well-known/agent-card.json", extensionUri: "urn:spotriq:authority-binding:v1",
    signatureScheme: "EIP191_SECP256K1", sessionPublicKey: publicKey, sessionKeyAddress: "0x9999999999999999999999999999999999999999",
    observedAt: now.toISOString(), evidenceIds: [], methodVersion: "test", detail: "verified", limitations: [],
  };
  const withBinding = await engine.applyTrustedAgentBinding(prepared.permissionRequestId, binding, now);
  const plan = { planId: "plan-2", jobIntentId: withBinding.jobIntentId, permissionRequestId: withBinding.permissionRequestId, serviceId: withBinding.serviceId, state: "REVIEWED", guardState: "PASS", steps: [{ index: 0 }] } as unknown as RebalancingExecutionPlan;
  const withPlan = await engine.applyExecutionPlan(withBinding.permissionRequestId, plan, now);
  const boundary = {
    boundaryId: "boundary-2", planId: "plan-2", jobIntentId: withPlan.jobIntentId, permissionRequestId: withPlan.permissionRequestId, serviceId: withPlan.serviceId,
    state: "SEALED", nonBypassable: true,
  } as unknown as FinancialExecutionBoundary;
  const withBoundary = await engine.applyExecutionBoundary(withPlan.permissionRequestId, boundary, now);
  assert.equal(withBoundary.executionBoundaryId, "boundary-2");
  assert.equal(withBoundary.financialDelegateMode, "SPOTRIQ_EXECUTION_BOUNDARY");
  assert.equal(withBoundary.safetyPrerequisites.every((x) => x.state === "SATISFIED"), true);
  assert.equal(withBoundary.providerSubmissionState, "BOUNDARY_SIGNER_REQUIRED");
  assert.equal(withBoundary.activationEligible, false);
});


const boundaryPublicKey = `0x04${"22".repeat(64)}`;

function financialPlan(request: BoundedPermissionRequest): RebalancingExecutionPlan {
  const expiresAt = new Date(now.getTime() + 20 * 60_000).toISOString();
  const passGuard = {
    reportId: "guard-financial", proposalId: "proposal-financial", jobIntentId: request.jobIntentId,
    permissionRequestId: request.permissionRequestId, serviceId: request.serviceId, state: "PASS",
    callKind: "MINT", decodedFunction: "mint", checks: [], checkedAt: now.toISOString(), methodVersion: "test",
    argumentGuardSatisfied: true, nonBypassableBoundarySatisfied: false, executionEligible: false, limitations: [],
  } as RebalancingExecutionGuardReport;
  return {
    planId: "plan-financial", jobIntentId: request.jobIntentId, permissionRequestId: request.permissionRequestId,
    serviceId: request.serviceId, walletAddress: request.walletAddress, network: "testnet", chainId: 97,
    state: "REVIEWED", targetRange: { tickLower: -50, tickUpper: 50, tickSpacing: 10, currentTickAtReview: 0, state: "USER_REVIEWED", proposedBy: "USER", reviewedAt: now.toISOString(), detail: "reviewed" },
    positionSnapshot: { tokenId: request.tokenId, owner: request.walletAddress, positionManager: request.positionManager, poolAddress: "0x5555555555555555555555555555555555555555", token0: { address: token0, symbol: "WBNB", decimals: 18, isNative: false }, token1: { address: token1, symbol: "USDT", decimals: 18, isNative: false }, feePips: 500, tickLower: -100, tickUpper: 100, currentTick: 0, tickSpacing: 10, liquidityRaw: "1000", recordedTokensOwed0Raw: "0", recordedTokensOwed1Raw: "0", blockNumber: "700", observedAt: now.toISOString() },
    quote: { quoteId: "quote-financial", jobIntentId: request.jobIntentId, blockNumber: "700", observedAt: now.toISOString(), expiresAt, method: "PANCAKESWAP_V3_ETH_CALL_SIMULATION", liquidityRaw: "1000", expectedDecreaseAmount0Raw: "80", expectedDecreaseAmount1Raw: "120", recordedTokensOwed0Raw: "20", recordedTokensOwed1Raw: "30", expectedCollectAmount0Raw: "100", expectedCollectAmount1Raw: "150", evidenceState: "OBSERVED", limitations: [] },
    steps: [
      { index: 0, kind: "COLLECT", label: "collect", call: { to: request.positionManager, data: "0x01", valueRaw: "0" }, callHash: `0x${"01".repeat(32)}`, decodedSummary: { tokenId: request.tokenId, recipient: request.walletAddress }, guard: { ...passGuard, callKind: "COLLECT", decodedFunction: "collect" } },
      { index: 1, kind: "MINT", label: "mint", call: { to: request.positionManager, data: "0x02", valueRaw: "0" }, callHash: `0x${"02".repeat(32)}`, decodedSummary: { amount0DesiredRaw: "125", amount1DesiredRaw: "175", amount0MinRaw: "110", amount1MinRaw: "155" }, guard: passGuard },
    ],
    planHash: `0x${"ab".repeat(32)}`, guardState: "PASS", executionEligible: false, createdAt: now.toISOString(), updatedAt: now.toISOString(), expiresAt, methodVersion: "test", limitations: [],
  };
}

function financialBoundary(request: BoundedPermissionRequest, plan: RebalancingExecutionPlan): FinancialExecutionBoundary {
  return {
    boundaryId: "boundary-financial", planId: plan.planId, jobIntentId: request.jobIntentId, permissionRequestId: request.permissionRequestId,
    serviceId: request.serviceId, walletAddress: request.walletAddress, network: "testnet", state: "SEALED", planHash: plan.planHash,
    approvedCallHashes: plan.steps.map((step) => step.callHash), approvedStepCount: plan.steps.length, dispatchPolicy: "EXACT_PLAN_CALL_HASH_AND_ORDER",
    externalAgentRole: "AUTHENTICATED_PROPOSER_ONLY", financialSignerCustody: "BOUNDARY_CONTROLLED_NOT_PROVISIONED", signerProvisioned: false,
    nonBypassable: true, executionEligible: false, sealedAt: now.toISOString(), expiresAt: plan.expiresAt, methodVersion: "test", limitations: [],
  };
}

async function preparedFinancialContext(engine: ReturnType<typeof createAuthorityEngine>) {
  const prepared = await engine.prepare(job(), { token0Limit: "1", token1Limit: "2", validForMinutes: 30 }, now);
  const binding: AgentAuthorityBinding = {
    bindingId: "binding-financial", serviceId: prepared.serviceId, agentId: "agent-1", state: "VERIFIED", interactionKind: "A2A",
    runtimeEndpoint: "https://agent.example/a2a", agentCardUrl: "https://agent.example/.well-known/agent-card.json", extensionUri: "urn:spotriq:authority-binding:v1",
    signatureScheme: "EIP191_SECP256K1", sessionPublicKey: publicKey, sessionKeyAddress: "0x9999999999999999999999999999999999999999",
    observedAt: now.toISOString(), evidenceIds: [], methodVersion: "test", detail: "verified", limitations: [],
  };
  const withBinding = await engine.applyTrustedAgentBinding(prepared.permissionRequestId, binding, now);
  const plan = financialPlan(withBinding);
  const withPlan = await engine.applyExecutionPlan(withBinding.permissionRequestId, plan, now);
  const boundary = financialBoundary(withPlan, plan);
  const request = await engine.applyExecutionBoundary(withPlan.permissionRequestId, boundary, now);
  return { request, plan, boundary };
}

function financialProof(request: BoundedPermissionRequest, sessionPublicKey = boundaryPublicKey): BoundaryFinancialSessionProof {
  return {
    walletAddress: request.walletAddress,
    sessionPublicKey,
    transactionHash: `0x${"cd".repeat(32)}`,
    calls: request.callAllowlist.map(({ to, signature }) => ({ to, signature })),
    spend: request.spendCaps.map(({ token, limitRaw, period }) => ({ token, limitRaw, period })),
    expiryUnix: request.expiryUnix,
  };
}

function readinessChain(allowanceRaw: bigint): BscChainReader {
  const balanceByToken = new Map([[token0.toLowerCase(), "50"], [token1.toLowerCase(), "50"]]);
  return {
    network: "testnet",
    definition: { network: "testnet", chainId: 97, nativeSymbol: "tBNB", explorerUrl: "https://testnet.bscscan.com", defaultRpcUrls: [] },
    rpcMode: "official_public_fallback",
    async getBlockNumber() { return "701"; },
    async getErc20Balance(tokenAddress: string, walletAddress: string, blockNumber = "701") { return { assetType: "erc20", chain: "BSC", network: "testnet", chainId: 97, tokenAddress, balanceRaw: balanceByToken.get(tokenAddress.toLowerCase()) ?? "0", walletAddress, blockNumber, observedAt: now.toISOString(), evidence: { source: { kind: "rpc", name: "test", method: "eth_call" }, observedAt: now.toISOString(), fields: [] } } as any; },
    async callContract(_contractAddress: string, _data: string, blockNumber = "701") { return { data: `0x${allowanceRaw.toString(16).padStart(64, "0")}`, blockNumber }; },
    async getStatus() { throw new Error("unused"); }, async getHealth() { throw new Error("unused"); }, async getBlock() { throw new Error("unused"); }, async getTransaction() { throw new Error("unused"); }, async getTransactionReceipt() { throw new Error("unused"); }, async getNativeBalance() { throw new Error("unused"); }, async getWalletBalances() { throw new Error("unused"); }, async callContractFrom() { throw new Error("unused"); },
  } as unknown as BscChainReader;
}

test("boundary financial session requires exact reviewed scope, a distinct signer and current Keystore validity", async () => {
  const engine = createAuthorityEngine({ verifier: verifier(true) });
  const { request, plan, boundary } = await preparedFinancialContext(engine);
  const session = await engine.observeBoundaryFinancialSession(boundary, plan, request, financialProof(request), new Date("2026-08-21T16:05:00Z"));
  assert.equal(session.state, "ACTIVE");
  assert.equal(session.reconciliation, "EXACT_MATCH");
  assert.equal(session.exactBoundaryScope, true);
  assert.equal(session.distinctFromAgentProposalKey, true);
  assert.equal(session.onchainValid, true);
  assert.equal(session.externalAgentHasFinancialSigner, false);
  assert.equal(session.executionEligible, false);
});

test("boundary financial session rejects reuse of the external AgentService proposal key", async () => {
  const engine = createAuthorityEngine({ verifier: verifier(true) });
  const { request, plan, boundary } = await preparedFinancialContext(engine);
  const session = await engine.observeBoundaryFinancialSession(boundary, plan, request, financialProof(request, publicKey), new Date("2026-08-21T16:05:00Z"));
  assert.equal(session.state, "INVALID");
  assert.equal(session.reconciliation, "SCOPE_MISMATCH");
  assert.equal(session.distinctFromAgentProposalKey, false);
  assert.equal(session.executionEligible, false);
});

test("boundary financial session reverify records revocation and disables the signer", async () => {
  let valid = true;
  const dynamicVerifier: AltanaKeystoreVerifier = { async verify() { return { keyId: `0x${"ef".repeat(32)}`, keystoreAddress: "0x6b8361C29d05D498b1a12B54A37310f94171E94A", valid, blockNumber: valid ? "710" : "711" }; } };
  const engine = createAuthorityEngine({ verifier: dynamicVerifier });
  const { request, plan, boundary } = await preparedFinancialContext(engine);
  const active = await engine.observeBoundaryFinancialSession(boundary, plan, request, financialProof(request), new Date("2026-08-21T16:05:00Z"));
  assert.equal(active.state, "ACTIVE");
  valid = false;
  const revoked = await engine.reverifyBoundaryFinancialSession(active.financialSessionId, { revocationTransactionHash: `0x${"44".repeat(32)}` }, new Date("2026-08-21T16:06:00Z"));
  assert.equal(revoked.state, "REVOKED");
  assert.equal(revoked.onchainValid, false);
  assert.equal(revoked.signerProvisioned, false);
  assert.equal(revoked.executionEligible, false);
});

test("projected post-collect balances can be sufficient while missing Position Manager allowance still blocks readiness", async () => {
  const engine = createAuthorityEngine({ verifier: verifier(true), chain: readinessChain(100n) });
  const { request, plan, boundary } = await preparedFinancialContext(engine);
  const session = await engine.observeBoundaryFinancialSession(boundary, plan, request, financialProof(request), new Date("2026-08-21T16:05:00Z"));
  const readiness = await engine.assessBoundaryFinancialReadiness(boundary, plan, session.financialSessionId, new Date("2026-08-21T16:06:00Z"));
  assert.equal(readiness.assets[0]?.balanceState, "PROJECTED_SUFFICIENT");
  assert.equal(readiness.assets[1]?.balanceState, "PROJECTED_SUFFICIENT");
  assert.ok(readiness.assets.every((asset) => asset.allowanceState === "APPROVAL_REQUIRED"));
  assert.equal(readiness.state, "APPROVAL_REQUIRED");
  assert.equal(readiness.executionEligible, false);
});

test("exact active session plus sufficient projected balances and allowances becomes ready only for the next controlled execution milestone", async () => {
  const engine = createAuthorityEngine({ verifier: verifier(true), chain: readinessChain(1_000n) });
  const { request, plan, boundary } = await preparedFinancialContext(engine);
  const session = await engine.observeBoundaryFinancialSession(boundary, plan, request, financialProof(request), new Date("2026-08-21T16:05:00Z"));
  const readiness = await engine.assessBoundaryFinancialReadiness(boundary, plan, session.financialSessionId, new Date("2026-08-21T16:06:00Z"));
  assert.equal(readiness.state, "READY_FOR_CONTROLLED_EXECUTION_MILESTONE");
  assert.equal(readiness.sessionOnchainValid, true);
  assert.equal(readiness.exactBoundaryScope, true);
  assert.equal(readiness.executionEligible, false);
});
