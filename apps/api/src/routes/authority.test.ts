import test from "node:test";
import assert from "node:assert/strict";
import { createAuthorityEngine } from "@spotriq/authority";
import type { RebalancingJobIntent } from "@spotriq/domain";
import { registerAuthorityRoutes } from "./authority.js";

class FakeApp {
  handlers = new Map<string, (request: any, reply: any) => Promise<any>>();
  post(path: string, handler: any): void { this.handlers.set(`POST ${path}`, handler); }
  get(path: string, handler: any): void { this.handlers.set(`GET ${path}`, handler); }
  patch(path: string, handler: any): void { this.handlers.set(`PATCH ${path}`, handler); }
}
function replyRecorder() { return { statusCode: 200, payload: undefined as any, code(value: number) { this.statusCode = value; return this; }, send(value: any) { this.payload = value; return value; } }; }

const job: RebalancingJobIntent = {
  jobIntentId: "job-api-authority",
  state: "AWAITING_AUTHORITY",
  executionState: "NO_EXECUTION",
  category: "rebalancing",
  checkSessionId: "check-api",
  findingId: "finding-api",
  walletAddress: "0x1111111111111111111111111111111111111111",
  walletControl: "WATCH_ONLY",
  requestedAction: { code: "PREPARE_RANGE_REBALANCE", label: "Prepare", description: "test" },
  subject: {
    protocol: "PancakeSwap", version: "V3", network: "testnet", tokenId: "77",
    positionManager: "0x2222222222222222222222222222222222222222",
    token0: { address: "0x3333333333333333333333333333333333333333", symbol: "WBNB", decimals: 18, isNative: false },
    token1: { address: "0x4444444444444444444444444444444444444444", symbol: "USDT", decimals: 18, isNative: false },
    poolAddress: "0x5555555555555555555555555555555555555555", pair: "WBNB/USDT", tickLower: -100, tickUpper: 100, currentTick: 150, rangeState: "OUT_OF_RANGE_ABOVE", blockNumber: "999",
  },
  constraints: { executionMode: "PREPARE_ONLY", maxSlippageBps: 50, maxActionCount: 1, validForMinutes: 30, allowSwapPreparation: false },
  selectedService: { serviceId: "svc-api", agentId: "agent-api", name: "Range Agent", operator: "operator", matchId: "match-api", matchRank: 1, matchTier: "EXACT_CONTEXT", readiness: "LIMITED", activationEligible: false, supportedProtocols: ["PancakeSwap"], runtimeEndpoints: [] },
  evidenceReferences: { findingEvidenceIds: [], serviceEvidenceIds: [], readinessEvidenceIds: [] },
  authority: { state: "UNRESOLVED", requiredBeforeExecution: true, permissionProfileId: "perm-api", declarationState: "UNDECLARED", walletControl: "WATCH_ONLY", blockers: [] },
  methodVersion: "test", createdAt: "2026-08-21T16:00:00.000Z", updatedAt: "2026-08-21T16:00:00.000Z", expiresAt: "2026-08-21T16:30:00.000Z", limitations: [],
};

test("Authority API derives contract/token scope from the persisted Job Intent instead of client addresses", async () => {
  const app = new FakeApp();
  let linkedRequestId: string | undefined;
  const jobIntents = {
    get: async (id: string) => { assert.equal(id, job.jobIntentId); return structuredClone(job); },
    linkPermissionRequest: async (_id: string, request: any) => { linkedRequestId = request.permissionRequestId; return { ...structuredClone(job), authority: { ...job.authority, state: "REQUEST_PREPARED", permissionRequestId: request.permissionRequestId } }; },
    linkPermissionGrant: async () => structuredClone(job),
  };
  const authority = createAuthorityEngine({ verifier: { async verify() { return { keyId: `0x${"aa".repeat(32)}`, keystoreAddress: "0x6b8361C29d05D498b1a12B54A37310f94171E94A", valid: true }; } } });
  await registerAuthorityRoutes(app as any, authority, jobIntents as any);
  const handler = app.handlers.get("POST /v1/job-intents/:jobIntentId/permissions");
  assert.ok(handler);
  const reply = replyRecorder();
  await handler!({
    id: "req-authority",
    params: { jobIntentId: job.jobIntentId },
    body: { token0Limit: "0.5", token1Limit: "100", validForMinutes: 30, positionManager: "0x9999999999999999999999999999999999999999" },
  }, reply);
  assert.equal(reply.statusCode, 201);
  assert.equal(reply.payload.data.request.positionManager, job.subject.positionManager);
  assert.equal(reply.payload.data.request.spendCaps[0].token, job.subject.token0?.address);
  assert.equal(reply.payload.data.request.spendCaps[1].token, job.subject.token1?.address);
  assert.equal(linkedRequestId, reply.payload.data.request.permissionRequestId);
  assert.equal(reply.payload.data.intent.executionState, "NO_EXECUTION");
});
