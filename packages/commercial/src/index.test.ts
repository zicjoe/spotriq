import assert from "node:assert/strict";
import test from "node:test";
import type { CommercialOfferTerms, CommercialPaymentEvidence, MarketplaceServiceRecord } from "@spotriq/domain";
import type { MarketplaceSupplyReader } from "@spotriq/marketplace-supply";
import { createCommercialEngine, MemoryCommercialStore, type CommercialPaymentAdapter } from "./index.js";

const BUYER = "0x1111111111111111111111111111111111111111";
const OTHER = "0x2222222222222222222222222222222222222222";
const SERVICE = "svc:reference:rangekeeper";

function freeTerms(overrides: Partial<CommercialOfferTerms> = {}): CommercialOfferTerms {
  return {
    termsVersion: "reference-free@1.0.0",
    commercialModel: "FREE",
    serviceType: "READ_ONLY_SERVICE",
    price: { amount: "0", amountRaw: "0", currency: "NONE" },
    network: "BSC",
    chainId: 97,
    paymentRail: "FREE",
    scope: { summary: "Read-only analysis", protocols: ["PancakeSwap"], financialAuthorityRequired: false, walletSigningRequired: false },
    availability: "AVAILABLE",
    quoteValiditySeconds: 900,
    ...overrides,
  };
}

function serviceRecord(terms: CommercialOfferTerms = freeTerms()): MarketplaceServiceRecord {
  return {
    identity: { discoveryId: "erc8004:97:2017", sourceKind: "MARKETPLACE_REFERENCE", identity: { chainId: 97 } },
    listing: { listingId: "listing:rk", status: "TESTING" },
    service: {
      serviceId: SERVICE,
      agentId: "2017",
      name: "RangeKeeper",
      category: "rebalancing",
      origin: "REFERENCE",
      readiness: "TESTNET_ONLY",
      marketplaceActivationEligible: false,
      supportedProtocols: ["PancakeSwap"],
      evidenceSummary: { testsPassed: 3 },
    },
    offer: { offerId: `offer:${SERVICE}`, serviceId: SERVICE, state: "AVAILABLE", pricing: { pricingId: "pricing:free", serviceId: SERVICE, model: "FREE", amount: "0" }, readOnlyObservationChainIds: [56, 97], terms, source: "marketplace-observed", note: "free" },
    permissionProfile: { permissionProfileId: "permission:rk", serviceId: SERVICE, protocols: ["PancakeSwap"], assets: [], executionMode: "READ_ONLY" },
    readiness: {
      readinessSnapshotId: "readiness:rk",
      serviceId: SERVICE,
      state: "TESTNET_ONLY",
      checkedAt: "2026-08-31T12:00:00.000Z",
      reasons: [],
      checks: ["CANONICAL_IDENTITY","ACTIVE_METADATA","MACHINE_ENDPOINT","RUNTIME_REACHABILITY","PERMISSION_PROFILE","MARKETPLACE_TESTS"].map((code) => ({ code, label: code, state: "PASS" as const, requiredForActivation: true, detail: "pass" })),
      activationEligible: false,
    },
  } as unknown as MarketplaceServiceRecord;
}


class ForeignKeyMemoryStore extends MemoryCommercialStore {
  override async savePayment(payment: CommercialPaymentEvidence): Promise<void> {
    const hire = await this.getHire(payment.hireId);
    if (!hire) throw new Error("commercial_payment_evidence_hire_id_fkey");
    await super.savePayment(payment);
  }
}

class RetryRepairStore extends ForeignKeyMemoryStore {
  private failOnce = true;
  override async savePayment(payment: CommercialPaymentEvidence): Promise<void> {
    if (this.failOnce) {
      this.failOnce = false;
      throw new Error("simulated payment persistence interruption");
    }
    await super.savePayment(payment);
  }
}
function marketplace(get: () => MarketplaceServiceRecord): MarketplaceSupplyReader {
  return { getService: async () => get() } as unknown as MarketplaceSupplyReader;
}

test("FREE Hire is persisted before NOT_REQUIRED payment evidence so PostgreSQL-style foreign keys are respected", async () => {
  const store = new ForeignKeyMemoryStore();
  const engine = createCommercialEngine({ marketplace: marketplace(() => serviceRecord()), store, now: () => new Date("2026-08-31T12:00:00.000Z") });
  const quote = await engine.createQuote({ serviceId: SERVICE, buyerAddress: BUYER, buyerChainId: 97, idempotencyKey: "q-fk-order" });
  const hire = await engine.createHire({ quoteId: quote.quoteId, buyerAddress: BUYER, idempotencyKey: "h-fk-order" });
  const payment = await engine.getPayment(hire.hireId);
  assert.equal(payment.state, "NOT_REQUIRED");
  assert.equal(payment.hireId, hire.hireId);
});

test("FREE Hire retry repairs missing NOT_REQUIRED evidence after an interrupted payment write", async () => {
  const store = new RetryRepairStore();
  const engine = createCommercialEngine({ marketplace: marketplace(() => serviceRecord()), store, now: () => new Date("2026-08-31T12:00:00.000Z") });
  const quote = await engine.createQuote({ serviceId: SERVICE, buyerAddress: BUYER, buyerChainId: 97, idempotencyKey: "q-repair" });
  await assert.rejects(() => engine.createHire({ quoteId: quote.quoteId, buyerAddress: BUYER, idempotencyKey: "h-repair" }), /simulated payment persistence interruption/);
  const repaired = await engine.createHire({ quoteId: quote.quoteId, buyerAddress: BUYER, idempotencyKey: "h-repair" });
  const payment = await engine.getPayment(repaired.hireId);
  assert.equal(payment.state, "NOT_REQUIRED");
  assert.equal(repaired.paymentEvidenceId, payment.paymentEvidenceId);
});

test("FREE read-only Offer creates immutable Quote, Hire, NOT_REQUIRED payment evidence and read-only Activation", async () => {
  const engine = createCommercialEngine({ marketplace: marketplace(() => serviceRecord()), now: () => new Date("2026-08-31T12:00:00.000Z") });
  const quote = await engine.createQuote({ serviceId: SERVICE, buyerAddress: BUYER, buyerChainId: 56, idempotencyKey: "q-free-1" });
  assert.equal(quote.termsSnapshot.commercialModel, "FREE");
  assert.equal(quote.termsSnapshot.chainId, 97);
  assert.equal(quote.buyerChainId, 56);

  const hire = await engine.createHire({ quoteId: quote.quoteId, buyerAddress: BUYER, idempotencyKey: "h-free-1" });
  assert.equal(hire.state, "READY_TO_ACTIVATE");
  assert.equal(hire.paymentRequired, false);
  assert.equal(hire.permissionRequired, false);

  const payment = await engine.getPayment(hire.hireId);
  assert.equal(payment.state, "NOT_REQUIRED");
  assert.equal(payment.requirement, "NOT_REQUIRED");

  const activation = await engine.activate(hire.hireId, { buyerAddress: BUYER, idempotencyKey: "a-free-1" });
  assert.equal(activation.state, "ACTIVE");
  assert.equal(activation.activationKind, "READ_ONLY_SERVICE_RELATIONSHIP");
  assert.equal(activation.walletSigningAuthorityGranted, false);
  assert.equal(activation.financialExecutionAuthorityGranted, false);

  const state = await engine.getBuyerState(BUYER);
  assert.equal(state.quotes.length, 1);
  assert.equal(state.hires[0]?.state, "ACTIVATED");
  assert.equal(state.payments[0]?.state, "NOT_REQUIRED");
  assert.equal(state.activations[0]?.activationId, activation.activationId);
});


test("FREE read-only reference Offer can freeze BSC Mainnet observation without granting financial authority", async () => {
  const engine = createCommercialEngine({ marketplace: marketplace(() => serviceRecord()), now: () => new Date("2026-09-04T12:00:00.000Z") });
  const quote = await engine.createQuote({ serviceId: SERVICE, buyerAddress: BUYER, buyerChainId: 56, serviceChainId: 56, idempotencyKey: "q-mainnet-read-only" });
  assert.equal(quote.termsSnapshot.chainId, 56);
  assert.equal(quote.termsSnapshot.serviceType, "READ_ONLY_SERVICE");
  assert.equal(quote.termsSnapshot.scope.walletSigningRequired, false);
  assert.equal(quote.termsSnapshot.scope.financialAuthorityRequired, false);
  const hire = await engine.createHire({ quoteId: quote.quoteId, buyerAddress: BUYER, idempotencyKey: "h-mainnet-read-only" });
  const activation = await engine.activate(hire.hireId, { buyerAddress: BUYER, idempotencyKey: "a-mainnet-read-only" });
  assert.equal(activation.serviceChainId, 56);
  assert.equal(activation.walletSigningAuthorityGranted, false);
  assert.equal(activation.financialExecutionAuthorityGranted, false);
  assert.match(activation.limitations.join(" "), /Mainnet.*observation-only/i);
});

test("read-only observation chain override fails closed unless the Offer explicitly supports it", async () => {
  const record = serviceRecord();
  record.offer.readOnlyObservationChainIds = [97];
  const engine = createCommercialEngine({ marketplace: marketplace(() => record), now: () => new Date("2026-09-04T12:00:00.000Z") });
  await assert.rejects(() => engine.createQuote({ serviceId: SERVICE, buyerAddress: BUYER, buyerChainId: 56, serviceChainId: 56, idempotencyKey: "q-unsupported-mainnet" }), /does not support read-only observation/i);
});

test("quote, hire and activation retries are idempotent while reused keys with different inputs conflict", async () => {
  const engine = createCommercialEngine({ marketplace: marketplace(() => serviceRecord()), now: () => new Date("2026-08-31T12:00:00.000Z") });
  const q1 = await engine.createQuote({ serviceId: SERVICE, buyerAddress: BUYER, buyerChainId: 97, idempotencyKey: "same-q" });
  const q2 = await engine.createQuote({ serviceId: SERVICE, buyerAddress: BUYER, buyerChainId: 97, idempotencyKey: "same-q" });
  assert.equal(q1.quoteId, q2.quoteId);
  await assert.rejects(() => engine.createQuote({ serviceId: SERVICE, buyerAddress: BUYER, buyerChainId: 56, idempotencyKey: "same-q" }), /idempotency/i);

  const h1 = await engine.createHire({ quoteId: q1.quoteId, buyerAddress: BUYER, idempotencyKey: "same-h" });
  const h2 = await engine.createHire({ quoteId: q1.quoteId, buyerAddress: BUYER, idempotencyKey: "same-h" });
  assert.equal(h1.hireId, h2.hireId);

  const a1 = await engine.activate(h1.hireId, { buyerAddress: BUYER, idempotencyKey: "same-a" });
  const a2 = await engine.activate(h1.hireId, { buyerAddress: BUYER, idempotencyKey: "same-a" });
  assert.equal(a1.activationId, a2.activationId);
});

test("expired Quote cannot be hired", async () => {
  let now = new Date("2026-08-31T12:00:00.000Z");
  const engine = createCommercialEngine({ marketplace: marketplace(() => serviceRecord(freeTerms({ quoteValiditySeconds: 60 }))), now: () => now });
  const quote = await engine.createQuote({ serviceId: SERVICE, buyerAddress: BUYER, buyerChainId: 97, idempotencyKey: "q-expire" });
  now = new Date("2026-08-31T12:02:00.000Z");
  await assert.rejects(() => engine.createHire({ quoteId: quote.quoteId, buyerAddress: BUYER, idempotencyKey: "h-expire" }), /expired/i);
});

test("wrong buyer cannot hire or activate another wallet's commercial relationship", async () => {
  const engine = createCommercialEngine({ marketplace: marketplace(() => serviceRecord()), now: () => new Date("2026-08-31T12:00:00.000Z") });
  const quote = await engine.createQuote({ serviceId: SERVICE, buyerAddress: BUYER, buyerChainId: 97, idempotencyKey: "q-wallet" });
  await assert.rejects(() => engine.createHire({ quoteId: quote.quoteId, buyerAddress: OTHER, idempotencyKey: "h-other" }), /Quote buyer/i);
  const hire = await engine.createHire({ quoteId: quote.quoteId, buyerAddress: BUYER, idempotencyKey: "h-wallet" });
  await assert.rejects(() => engine.activate(hire.hireId, { buyerAddress: OTHER, idempotencyKey: "a-other" }), /Hire buyer/i);
});

test("Offer mutation after Quote acceptance does not mutate the Quote and blocks stale activation", async () => {
  let current = serviceRecord();
  const engine = createCommercialEngine({ marketplace: marketplace(() => current), now: () => new Date("2026-08-31T12:00:00.000Z") });
  const quote = await engine.createQuote({ serviceId: SERVICE, buyerAddress: BUYER, buyerChainId: 97, idempotencyKey: "q-stale" });
  const hire = await engine.createHire({ quoteId: quote.quoteId, buyerAddress: BUYER, idempotencyKey: "h-stale" });
  current = serviceRecord(freeTerms({ termsVersion: "reference-free@2.0.0", scope: { ...freeTerms().scope, summary: "changed terms" } }));
  const fetched = await engine.getQuote(quote.quoteId);
  assert.equal(fetched.termsSnapshot.termsVersion, "reference-free@1.0.0");
  await assert.rejects(() => engine.activate(hire.hireId, { buyerAddress: BUYER, idempotencyKey: "a-stale" }), /Offer changed/i);
});

test("paid Offer remains gated when no live payment adapter is configured", async () => {
  const paid = freeTerms({
    commercialModel: "PER_TASK",
    serviceType: "TASK_SERVICE",
    price: { amount: "1", amountRaw: "1000000", currency: "USDT", tokenAddress: "0x3333333333333333333333333333333333333333", decimals: 6 },
    paymentRail: "ERC8183",
    payment: { contractAddress: "0x4444444444444444444444444444444444444444", providerAddress: "0x5555555555555555555555555555555555555555" },
  });
  const engine = createCommercialEngine({ marketplace: marketplace(() => serviceRecord(paid)), now: () => new Date("2026-08-31T12:00:00.000Z") });
  const quote = await engine.createQuote({ serviceId: SERVICE, buyerAddress: BUYER, buyerChainId: 97, idempotencyKey: "q-paid" });
  const hire = await engine.createHire({ quoteId: quote.quoteId, buyerAddress: BUYER, idempotencyKey: "h-paid" });
  assert.equal(hire.state, "AWAITING_PAYMENT");
  await assert.rejects(() => engine.reconcilePayment(hire.hireId, { buyerAddress: BUYER, reference: { jobId: "7" } }), /no live payment adapter/i);
  await assert.rejects(() => engine.activate(hire.hireId, { buyerAddress: BUYER, idempotencyKey: "a-paid" }), /payment/i);
});

test("same external payment reference cannot be reconciled to two different Hires", async () => {
  const paid = freeTerms({
    commercialModel: "PER_TASK",
    serviceType: "TASK_SERVICE",
    price: { amount: "1", amountRaw: "1000000", currency: "USDT", tokenAddress: "0x3333333333333333333333333333333333333333", decimals: 6 },
    paymentRail: "ERC8183",
    payment: { contractAddress: "0x4444444444444444444444444444444444444444" },
  });
  const adapter: CommercialPaymentAdapter = {
    rail: "ERC8183",
    async reconcile(ctx) {
      return {
        paymentEvidenceId: `payment:${ctx.hire.hireId}`,
        hireId: ctx.hire.hireId,
        serviceId: ctx.hire.serviceId,
        buyerAddress: ctx.hire.buyerAddress,
        requirement: "REQUIRED",
        state: "VERIFIED",
        rail: "ERC8183",
        chainId: 97,
        amount: "1",
        currency: "USDT",
        providerRef: "0x4444444444444444444444444444444444444444:7",
        observedAt: ctx.now.toISOString(),
        methodVersion: "test",
        provenance: "marketplace-observed",
        evidence: [],
        limitations: [],
      } satisfies CommercialPaymentEvidence;
    },
  };
  const engine = createCommercialEngine({ marketplace: marketplace(() => serviceRecord(paid)), paymentAdapters: [adapter], now: () => new Date("2026-08-31T12:00:00.000Z") });
  const q1 = await engine.createQuote({ serviceId: SERVICE, buyerAddress: BUYER, buyerChainId: 97, idempotencyKey: "q-pay-1" });
  const h1 = await engine.createHire({ quoteId: q1.quoteId, buyerAddress: BUYER, idempotencyKey: "h-pay-1" });
  await engine.reconcilePayment(h1.hireId, { buyerAddress: BUYER, reference: { jobId: "7" } });

  const q2 = await engine.createQuote({ serviceId: SERVICE, buyerAddress: BUYER, buyerChainId: 97, idempotencyKey: "q-pay-2" });
  const h2 = await engine.createHire({ quoteId: q2.quoteId, buyerAddress: BUYER, idempotencyKey: "h-pay-2" });
  await assert.rejects(() => engine.reconcilePayment(h2.hireId, { buyerAddress: BUYER, reference: { jobId: "7" } }), /already reconciled/i);
});

test("activation control is category-specific, read-only and revocable without inventing authority", async () => {
  const engine = createCommercialEngine({ marketplace: marketplace(() => serviceRecord()), now: () => new Date("2026-08-31T12:00:00.000Z") });
  const quote = await engine.createQuote({ serviceId: SERVICE, buyerAddress: BUYER, buyerChainId: 97, idempotencyKey: "q-control" });
  const hire = await engine.createHire({ quoteId: quote.quoteId, buyerAddress: BUYER, idempotencyKey: "h-control" });
  const activation = await engine.activate(hire.hireId, { buyerAddress: BUYER, idempotencyKey: "a-control" });
  const control = await engine.getActivationControl(activation.activationId);
  assert.equal(control.category, "rebalancing");
  assert.equal(control.controlTier, "READ_ONLY");
  assert.equal(control.runtimeCapability.code, "ANALYZE_POSITION");
  assert.equal(control.permissions.walletSigningAuthorityGranted, false);
  assert.equal(control.permissions.financialExecutionAuthorityGranted, false);
  assert.deepEqual(control.permissions.financialWrite, []);
  assert.equal(control.revocable, true);
});

test("marketplace Activation revocation is buyer-bound, idempotent and separate from Hire/payment history", async () => {
  const engine = createCommercialEngine({ marketplace: marketplace(() => serviceRecord()), now: () => new Date("2026-08-31T12:00:00.000Z") });
  const quote = await engine.createQuote({ serviceId: SERVICE, buyerAddress: BUYER, buyerChainId: 97, idempotencyKey: "q-revoke" });
  const hire = await engine.createHire({ quoteId: quote.quoteId, buyerAddress: BUYER, idempotencyKey: "h-revoke" });
  const activation = await engine.activate(hire.hireId, { buyerAddress: BUYER, idempotencyKey: "a-revoke" });
  await assert.rejects(() => engine.revokeActivation(activation.activationId,{buyerAddress:OTHER}), /Only the Activation buyer/i);
  const revoked = await engine.revokeActivation(activation.activationId,{buyerAddress:BUYER});
  assert.equal(revoked.state,"REVOKED");
  const again = await engine.revokeActivation(activation.activationId,{buyerAddress:BUYER});
  assert.equal(again.state,"REVOKED");
  await assert.rejects(() => engine.assertActivationForService({activationId:activation.activationId,serviceId:SERVICE,buyerAddress:BUYER}), /not active/i);
  const state=await engine.getBuyerState(BUYER);
  assert.equal(state.hires[0]?.state,"ACTIVATED");
  assert.equal(state.payments[0]?.state,"NOT_REQUIRED");
  assert.equal(state.activations[0]?.state,"REVOKED");
});

test("activation idempotency claim fails closed when one key races across different Hires", async () => {
  const store=new MemoryCommercialStore();
  const engine=createCommercialEngine({store,marketplace:marketplace(()=>serviceRecord()),now:()=>new Date("2026-09-02T10:00:00.000Z")});
  const q1=await engine.createQuote({serviceId:SERVICE,buyerAddress:BUYER,buyerChainId:97,idempotencyKey:"q-race-1"});
  const h1=await engine.createHire({quoteId:q1.quoteId,buyerAddress:BUYER,idempotencyKey:"h-race-1"});
  const q2=await engine.createQuote({serviceId:SERVICE,buyerAddress:BUYER,buyerChainId:97,idempotencyKey:"q-race-2"});
  const h2=await engine.createHire({quoteId:q2.quoteId,buyerAddress:BUYER,idempotencyKey:"h-race-2"});
  const results=await Promise.allSettled([
    engine.activate(h1.hireId,{buyerAddress:BUYER,idempotencyKey:"shared-activation-key"}),
    engine.activate(h2.hireId,{buyerAddress:BUYER,idempotencyKey:"shared-activation-key"}),
  ]);
  assert.equal(results.filter(x=>x.status==="fulfilled").length,1);
  const rejected=results.find(x=>x.status==="rejected");
  assert.ok(rejected&&String(rejected.reason).includes("idempotency key"));
});

test("paid Offer rejects local or metadata-like payment endpoints", async () => {
  const unsafe=freeTerms({commercialModel:"PER_TASK",serviceType:"TASK_SERVICE",price:{amount:"1",amountRaw:"1",currency:"USDT",tokenAddress:"0x3333333333333333333333333333333333333333",decimals:6},paymentRail:"X402",payment:{payToAddress:"0x5555555555555555555555555555555555555555",endpoint:"https://169.254.169.254/pay"}});
  const engine=createCommercialEngine({marketplace:marketplace(()=>serviceRecord(unsafe))});
  await assert.rejects(()=>engine.createQuote({serviceId:SERVICE,buyerAddress:BUYER,buyerChainId:97,idempotencyKey:"q-unsafe-payment"}),/blocked|non-public/i);
});
