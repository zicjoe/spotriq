import test from "node:test";
import assert from "node:assert/strict";
import type { GroundedExplanationContent, MarketplaceServiceRecord } from "@spotriq/domain";
import { createGroundedExplanationEngine, type GroundedExplanationProvider } from "./index.js";

const service = {
  identity: { canonicalVerification: { state: "VERIFIED", checkedAt: "2026-09-01T00:00:00.000Z" } },
  service: {
    serviceId: "svc:reference:rangekeeper", name: "RangeKeeper", category: "rebalancing", marketplaceActivationEligible: false,
    supportedProtocols: ["PancakeSwap"],
  },
  permissionProfile: { executionMode: "READ_ONLY", provenance: "operator-claimed" },
  offer: { state: "AVAILABLE", terms: { availability: "AVAILABLE", commercialModel: "FREE", serviceType: "READ_ONLY_SERVICE", paymentRail: "FREE" } },
  readiness: { state: "TESTNET_ONLY", checkedAt: "2026-09-01T00:00:00.000Z", reasons: ["Financial execution remains gated."], checks: [{ code: "MARKETPLACE_TESTS", state: "PASS" }], limitations: [] },
  normalizedAt: "2026-09-01T00:00:00.000Z",
  limitations: ["Testnet-only service."],
} as unknown as MarketplaceServiceRecord;

function deps(provider?: GroundedExplanationProvider) {
  return {
    marketplace: { getService: async () => service } as never,
    smartMoney: {} as never,
    commercial: {} as never,
    permissionCheckout: {} as never,
    activationActivityOutcomes: {} as never,
    smartMoneyPlans: {} as never,
    provider,
    now: () => new Date("2026-09-01T01:00:00.000Z"),
  };
}

test("deterministic fallback remains cited and decision-free", async () => {
  const engine = createGroundedExplanationEngine(deps());
  const status = await engine.getStatus();
  assert.equal(status.externalProviderConfigured, false);
  assert.equal(status.decisionAuthorityEnabled, false);
  const record = await engine.explain({ subject: { type: "SERVICE", id: "svc:reference:rangekeeper" } });
  assert.equal(record.state, "DETERMINISTIC_FALLBACK");
  assert.equal(record.provider, "DETERMINISTIC_TEMPLATE");
  assert.equal(record.validation.state, "PASS");
  assert.ok(record.content.summary.every((claim) => claim.factIds.length > 0));
});

test("valid structured provider output is accepted only with known citations", async () => {
  const provider: GroundedExplanationProvider = {
    kind: "OPENAI_RESPONSES",
    model: "test-model",
    async generate(packet): Promise<GroundedExplanationContent> {
      const readiness = packet.facts.find((f) => f.label === "Marketplace readiness")!;
      const next = packet.facts.find((f) => f.kind === "NEXT_STEP")!;
      return {
        headline: "RangeKeeper grounded explanation",
        summary: [{ text: `Marketplace readiness: ${readiness.value}`, factIds: [readiness.factId] }],
        caveats: [],
        nextStep: { text: `Next review step: ${next.value}`, factIds: [next.factId] },
      };
    },
  };
  const record = await createGroundedExplanationEngine(deps(provider)).explain({ subject: { type: "SERVICE", id: "svc:reference:rangekeeper" } });
  assert.equal(record.state, "AI_GENERATED");
  assert.equal(record.provider, "OPENAI_RESPONSES");
  assert.equal(record.validation.state, "PASS");
});

test("unsupported model claims are rejected to deterministic fallback", async () => {
  const provider: GroundedExplanationProvider = {
    kind: "OPENAI_RESPONSES",
    model: "test-model",
    async generate(packet): Promise<GroundedExplanationContent> {
      const readiness = packet.facts.find((f) => f.label === "Marketplace readiness")!;
      const next = packet.facts.find((f) => f.kind === "NEXT_STEP")!;
      return {
        headline: "Grounded explanation",
        summary: [{ text: "This service guarantees 99% returns.", factIds: [readiness.factId] }],
        caveats: [],
        nextStep: { text: next.value, factIds: [next.factId] },
      };
    },
  };
  const record = await createGroundedExplanationEngine(deps(provider)).explain({ subject: { type: "SERVICE", id: "svc:reference:rangekeeper" } });
  assert.equal(record.state, "DETERMINISTIC_FALLBACK");
  assert.equal(record.provider, "DETERMINISTIC_TEMPLATE");
  assert.equal(record.validation.state, "REJECTED_TO_FALLBACK");
  assert.ok(record.validation.unsupportedTokens.includes("99%"));
});
