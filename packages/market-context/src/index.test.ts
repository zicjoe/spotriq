import assert from "node:assert/strict";
import test from "node:test";
import { classifyGridRegime } from "./index.js";

test("range-like classification stays descriptive rather than predictive", () => {
  const result = classifyGridRegime({ spot: 620, h1: 619.5, h6: 620.2, h24: 619.8 });
  assert.equal(result.regime, "RANGE_LIKE");
  assert.equal(result.confidence, "high");
});

test("aligned upward TWAP drift is trending up", () => {
  const result = classifyGridRegime({ spot: 650, h1: 645, h6: 630, h24: 610 });
  assert.equal(result.regime, "TRENDING_UP");
});

test("missing 6h history is insufficient", () => {
  assert.equal(classifyGridRegime({ spot: 620, h1: 619 }).regime, "INSUFFICIENT_HISTORY");
});
