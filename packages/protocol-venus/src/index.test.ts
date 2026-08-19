import assert from "node:assert/strict";
import test from "node:test";
import { venusSupplyRatePerBlockToApyPercent } from "./index.js";
import { classifyVenusRisk, VENUS_PRESENTATION_THRESHOLDS } from "./risk.js";

test("protocol shortfall always classifies the position as liquidatable", () => {
  const result = classifyVenusRisk(1n, 1_000n, 2_000n, true);
  assert.equal(result.state, "LIQUIDATABLE");
});

test("missing borrow valuation never becomes NO_BORROW when raw borrow exists", () => {
  const result = classifyVenusRisk(0n, 0n, undefined, true);
  assert.equal(result.state, "COULD_NOT_ASSESS");
});

test("derived health below one without protocol shortfall is treated as conflict", () => {
  const result = classifyVenusRisk(0n, 1_000n, 900n, true);
  assert.equal(result.state, "COULD_NOT_ASSESS");
  assert.equal(result.conflict, true);
});

test("forced liquidation overrides normal account liquidity", () => {
  const result = classifyVenusRisk(0n, 1_000n, 2_000n, true, true);
  assert.equal(result.state, "LIQUIDATABLE");
  assert.equal(result.forcedLiquidation, true);
});

test("Spotriq presentation thresholds preserve a distinct warning band above liquidation", () => {
  assert.equal(VENUS_PRESENTATION_THRESHOLDS.liquidationBoundary, 1);
  assert.ok(VENUS_PRESENTATION_THRESHOLDS.watch > VENUS_PRESENTATION_THRESHOLDS.liquidationBoundary);
  assert.ok(VENUS_PRESENTATION_THRESHOLDS.comfortable > VENUS_PRESENTATION_THRESHOLDS.watch);
});


test("Venus supply rate conversion preserves zero and positive current APY", () => {
  assert.equal(venusSupplyRatePerBlockToApyPercent(0n), "0");
  const apy = Number(venusSupplyRatePerBlockToApyPercent(37_893_566n));
  assert.ok(apy > 0);
  assert.ok(apy < 100);
});
