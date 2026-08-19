import assert from "node:assert/strict";
import test from "node:test";
import { assessFreshness, createEvidenceEnvelope, DATA_SOURCES, detectEvidenceConflicts } from "./index.js";

test("freshness transitions from fresh to aging to stale to unavailable", () => {
  const now = new Date("2026-08-19T02:00:00.000Z");
  assert.equal(assessFreshness("wallet.native_balance", "2026-08-19T01:59:40.000Z", now).state, "FRESH");
  assert.equal(assessFreshness("wallet.native_balance", "2026-08-19T01:59:15.000Z", now).state, "AGING");
  assert.equal(assessFreshness("wallet.native_balance", "2026-08-19T01:58:30.000Z", now).state, "STALE");
  assert.equal(assessFreshness("wallet.native_balance", "2026-08-19T01:57:00.000Z", now).state, "UNAVAILABLE");
});

test("conflict detection preserves provenance instead of silently choosing a value", () => {
  const a = createEvidenceEnvelope({
    subjectType: "wallet",
    subjectId: "0xabc",
    metric: "wallet.native_balance",
    value: "1.0",
    provenance: "external",
    source: DATA_SOURCES.BSC_RPC,
    observedAt: new Date().toISOString(),
  });
  const b = { ...a, evidenceId: "ev_second", value: "2.0", sourceId: "secondary-source" };
  assert.equal(detectEvidenceConflicts([a, b]).length, 1);
});
