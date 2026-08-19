import type { VenusRiskState } from "@spotriq/domain";

export const VENUS_PRESENTATION_THRESHOLDS = {
  comfortable: 1.5,
  watch: 1.2,
  liquidationBoundary: 1.0,
} as const;

function formatHealthFactor(numerator: bigint, denominator: bigint): string | undefined {
  if (denominator <= 0n) return undefined;
  const scaled = numerator * 1_000_000n / denominator;
  return (Number(scaled) / 1_000_000).toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

export function classifyVenusRisk(
  shortfall: bigint,
  totalBorrow: bigint,
  adjustedCollateral?: bigint,
  hasBorrow = totalBorrow > 0n,
  forcedLiquidation = false,
): { state: VenusRiskState; healthFactor?: string; conflict: boolean; forcedLiquidation: boolean } {
  if (!hasBorrow) return { state: "NO_BORROW", conflict: false, forcedLiquidation: false };
  if (forcedLiquidation) {
    return {
      state: "LIQUIDATABLE",
      healthFactor: adjustedCollateral !== undefined && totalBorrow > 0n ? formatHealthFactor(adjustedCollateral, totalBorrow) : undefined,
      conflict: false,
      forcedLiquidation: true,
    };
  }
  if (shortfall > 0n) {
    return {
      state: "LIQUIDATABLE",
      healthFactor: adjustedCollateral !== undefined && totalBorrow > 0n ? formatHealthFactor(adjustedCollateral, totalBorrow) : undefined,
      conflict: false,
      forcedLiquidation: false,
    };
  }
  if (totalBorrow === 0n || adjustedCollateral === undefined) return { state: "COULD_NOT_ASSESS", conflict: false, forcedLiquidation: false };
  const healthFactor = formatHealthFactor(adjustedCollateral, totalBorrow);
  if (!healthFactor) return { state: "COULD_NOT_ASSESS", conflict: false, forcedLiquidation: false };
  const hf = Number(healthFactor);
  if (hf < VENUS_PRESENTATION_THRESHOLDS.liquidationBoundary) return { state: "COULD_NOT_ASSESS", healthFactor, conflict: true, forcedLiquidation: false };
  if (hf < VENUS_PRESENTATION_THRESHOLDS.watch) return { state: "HIGHER_ATTENTION", healthFactor, conflict: false, forcedLiquidation: false };
  if (hf < VENUS_PRESENTATION_THRESHOLDS.comfortable) return { state: "WATCH", healthFactor, conflict: false, forcedLiquidation: false };
  return { state: "COMFORTABLE", healthFactor, conflict: false, forcedLiquidation: false };
}
