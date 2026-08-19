import assert from "node:assert/strict";
import test from "node:test";
import {
  PANCAKESWAP_CONTRACTS,
  classifyLiquidityRange,
  decodeInfinityTickSpacing,
  deriveSqrtPriceX96Price,
  deriveTickPrice,
} from "./index.js";

test("official PancakeSwap position-manager coverage is separated by BSC network", () => {
  assert.equal(PANCAKESWAP_CONTRACTS.mainnet.v3PositionManager, "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364");
  assert.equal(PANCAKESWAP_CONTRACTS.testnet.v3PositionManager, "0x427bF5b37357632377eCbEC9de3626C71A5396c1");
  assert.notEqual(PANCAKESWAP_CONTRACTS.mainnet.infinityClPoolManager, PANCAKESWAP_CONTRACTS.testnet.infinityClPoolManager);
});

test("range classification distinguishes in-range, near-boundary, outside, and empty positions", () => {
  assert.equal(classifyLiquidityRange(0, -1000, 1000, 10, 100n), "IN_RANGE");
  assert.equal(classifyLiquidityRange(-950, -1000, 1000, 10, 100n), "NEAR_LOWER");
  assert.equal(classifyLiquidityRange(950, -1000, 1000, 10, 100n), "NEAR_UPPER");
  assert.equal(classifyLiquidityRange(-1001, -1000, 1000, 10, 100n), "OUT_OF_RANGE_BELOW");
  assert.equal(classifyLiquidityRange(1000, -1000, 1000, 10, 100n), "OUT_OF_RANGE_ABOVE");
  assert.equal(classifyLiquidityRange(0, -1000, 1000, 10, 0n), "NO_LIQUIDITY");
});

test("tick-derived price applies token decimal normalization", () => {
  assert.equal(deriveTickPrice(0, 18, 18), "1");
  assert.equal(deriveTickPrice(0, 18, 6), "1.0000000000e+12");
  assert.equal(deriveTickPrice(0, undefined, 18), undefined);
  assert.equal(deriveSqrtPriceX96Price(2n ** 96n, 18, 18), "1");
  assert.equal(deriveSqrtPriceX96Price(2n ** 96n, undefined, 18), undefined);
});

test("Infinity CL tick spacing decodes from PoolKey parameters bits 16 through 39", () => {
  const encodedPositive = `0x${(10n << 16n).toString(16).padStart(64, "0")}` as `0x${string}`;
  assert.equal(decodeInfinityTickSpacing(encodedPositive), 10);

  const signedMinusTen = (0x1000000n - 10n) << 16n;
  const encodedNegative = `0x${signedMinusTen.toString(16).padStart(64, "0")}` as `0x${string}`;
  assert.equal(decodeInfinityTickSpacing(encodedNegative), -10);
});
