import { randomUUID } from "node:crypto";
import type { BscChainReader } from "@spotriq/chain";
import type {
  CheckSession,
  CheckSourceKey,
  CheckSourceProgress,
  EvidenceEnvelope,
  Finding,
  GridMarketContextSnapshot,
  LiquidityRangeState,
  PancakeSwapClPositionSnapshot,
  SmartMoneyCheckCoverage,
  SmartMoneyCheckEvent,
  SmartMoneyPortfolioSnapshot,
  WalletControlState,
  VenusPoolPositionSnapshot,
  YieldOpportunitySnapshot,
} from "@spotriq/domain";
import type { PancakeSwapReader } from "@spotriq/protocol-pancakeswap";
import type { VenusReader } from "@spotriq/protocol-venus";
import type { GridMarketContextReader } from "@spotriq/market-context";

export const SMART_MONEY_REBALANCING_METHOD = {
  methodId: "smart-money.rebalancing-finding",
  version: "1.0.0",
  name: "PancakeSwap concentrated-liquidity rebalancing finding",
  description: "Classifies supported PancakeSwap concentrated-liquidity positions from current range state without inferring profitability or user intent.",
} as const;

export interface StartSmartMoneyCheckInput {
  walletAddress: string;
  walletControl?: WalletControlState;
}

export interface SmartMoneyCheckSnapshot {
  session: CheckSession;
  portfolio?: SmartMoneyPortfolioSnapshot;
  findings: Finding[];
}

export interface SmartMoneyStore {
  createSession(session: CheckSession): Promise<void>;
  getSession(checkSessionId: string): Promise<CheckSession | undefined>;
  updateSession(session: CheckSession): Promise<void>;
  savePortfolio(snapshot: SmartMoneyPortfolioSnapshot): Promise<void>;
  getPortfolio(checkSessionId: string): Promise<SmartMoneyPortfolioSnapshot | undefined>;
  saveEvidence(records: EvidenceEnvelope[]): Promise<void>;
  saveFinding(finding: Finding): Promise<void>;
  listFindings(checkSessionId: string): Promise<Finding[]>;
  appendEvent(event: SmartMoneyCheckEvent): Promise<void>;
  listEvents(checkSessionId: string, afterSequence?: number): Promise<SmartMoneyCheckEvent[]>;
}

export interface SqlQueryResult<Row = Record<string, unknown>> {
  rows: Row[];
  rowCount?: number | null;
}

export interface SqlQueryExecutor {
  query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<SqlQueryResult<Row>>;
}

const CHECK_SOURCE_TEMPLATE: CheckSourceProgress[] = [
  { key: "wallet_assets", label: "Wallet assets", state: "QUEUED" },
  { key: "pancakeswap_positions", label: "PancakeSwap positions", state: "QUEUED" },
  { key: "venus_positions", label: "Venus lending positions", state: "QUEUED" },
  { key: "yield_opportunities", label: "Yield opportunities", state: "QUEUED" },
  { key: "market_context", label: "Grid market context", state: "QUEUED" },
  { key: "agent_compatibility", label: "Agent compatibility", state: "NOT_SUPPORTED", detail: "Recommendation matching is not enabled in this milestone." },
];

function cloneProgress(progress: CheckSourceProgress[]): CheckSourceProgress[] {
  return progress.map((item) => ({ ...item }));
}

function assertWalletAddress(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(normalized)) throw new Error("walletAddress must be a valid EVM address.");
  return normalized;
}

function ageLabel(observedAt: string, now = new Date()): string {
  const ageMs = Math.max(0, now.getTime() - new Date(observedAt).getTime());
  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  return `Updated ${Math.floor(minutes / 60)}h ago`;
}

function pairLabel(position: PancakeSwapClPositionSnapshot): string {
  const token0 = position.pool.token0.symbol ?? `${position.pool.token0.address.slice(0, 6)}…`;
  const token1 = position.pool.token1.symbol ?? `${position.pool.token1.address.slice(0, 6)}…`;
  return `${token0}/${token1}`;
}

function rangeStatusCopy(rangeState: LiquidityRangeState): {
  state: Finding["state"];
  severity: Finding["severity"];
  headline: (pair: string) => string;
  summary: string;
  whatCouldAgentDo: string;
} {
  switch (rangeState) {
    case "OUT_OF_RANGE_BELOW":
    case "OUT_OF_RANGE_ABOVE":
      return {
        state: "needs-attention",
        severity: "attention",
        headline: (pair) => `Your ${pair} liquidity position is outside its active range.`,
        summary: "The current PancakeSwap pool tick is outside this position’s configured concentrated-liquidity range. This describes range state only; it does not by itself establish a financial outcome.",
        whatCouldAgentDo: "A compatible Rebalancing agent could monitor this exact position and, if you later authorize it, prepare or execute a supported range-management action within your limits.",
      };
    case "NEAR_LOWER":
    case "NEAR_UPPER":
      return {
        state: "needs-attention",
        severity: "attention",
        headline: (pair) => `Your ${pair} liquidity position is close to its active range boundary.`,
        summary: "The current pool tick remains inside the configured range, but it is close to one boundary according to Spotriq’s deterministic range-state method.",
        whatCouldAgentDo: "A compatible Rebalancing agent could monitor the boundary and prepare a rebalance when its strategy and your authorization permit it.",
      };
    case "IN_RANGE":
      return {
        state: "healthy",
        severity: "info",
        headline: (pair) => `Your ${pair} liquidity position is currently inside its active range.`,
        summary: "The current PancakeSwap pool tick is inside this position’s configured concentrated-liquidity range.",
        whatCouldAgentDo: "A Rebalancing agent could continue monitoring the position and respond if the price approaches or leaves the configured range.",
      };
    case "NO_LIQUIDITY":
      return {
        state: "informational",
        severity: "info",
        headline: (pair) => `Your ${pair} position currently reports no active liquidity.`,
        summary: "Spotriq found the position NFT, but the position manager currently reports zero liquidity for it.",
        whatCouldAgentDo: "A compatible agent could help evaluate a new supported range, but Spotriq will not treat an empty position as an actively managed LP position.",
      };
    default:
      throw new Error(`Unsupported liquidity range state: ${String(rangeState)}`);
  }
}

export function createRebalancingFinding(
  checkSessionId: string,
  position: PancakeSwapClPositionSnapshot,
  now = new Date(),
  idFactory: () => string = randomUUID,
): Finding {
  const copy = rangeStatusCopy(position.rangeState);
  const pair = pairLabel(position);
  const currentPrice = position.pool.currentPriceToken0InToken1;
  const currentPriceLabel = currentPrice
    ? `${Number(currentPrice).toLocaleString(undefined, { maximumSignificantDigits: 8 })} ${position.pool.token1.symbol ?? "token1"} / ${position.pool.token0.symbol ?? "token0"}`
    : "Current price unavailable";
  const boundaryNote = position.rangeState === "NEAR_LOWER"
    ? `${position.distanceToLowerTicks ?? "—"} ticks from lower boundary`
    : position.rangeState === "NEAR_UPPER"
      ? `${position.distanceToUpperTicks ?? "—"} ticks from upper boundary`
      : undefined;
  const evidenceIds = position.evidence.map((item) => item.evidenceId);

  return {
    findingId: `finding_${idFactory()}`,
    checkSessionId,
    category: "rebalancing",
    state: copy.state,
    severity: copy.severity,
    headline: copy.headline(pair),
    summary: copy.summary,
    confidence: position.coverage.poolState === "AVAILABLE" ? "high" : "medium",
    freshness: ageLabel(position.observedAt, now),
    primaryAction: { label: copy.state === "healthy" || copy.state === "informational" ? "Explore Rebalancing Agents" : "Find Rebalancing Agents" },
    targetRoute: "explore",
    keyValues: [
      { label: "Pair", value: pair, note: `PancakeSwap ${position.version === "V3" ? "V3" : "Infinity CL"}` },
      { label: "Range state", value: position.rangeState.replaceAll("_", " "), note: boundaryNote },
      { label: "Current price", value: currentPriceLabel },
      { label: "Current tick", value: String(position.pool.currentTick), note: `Range ${position.tickLower} → ${position.tickUpper}` },
    ],
    whatCouldAgentDo: copy.whatCouldAgentDo,
    uncertainties: position.version === "V3"
      ? "USD position valuation, complete live fee accrual, historical time-in-range and profitability are not assessed in this milestone."
      : "Infinity wallet-wide discovery is not yet available; this finding exists only for Infinity positions supplied through a known token ID.",
    subject: {
      protocol: "PancakeSwap",
      version: position.version,
      tokenId: position.tokenId,
      poolAddress: position.pool.poolAddress,
      poolId: position.pool.poolId,
      pair,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      currentTick: position.pool.currentTick,
      rangeState: position.rangeState,
      blockNumber: position.blockNumber,
      network: position.network,
    },
    evidenceIds,
    methodVersion: `${SMART_MONEY_REBALANCING_METHOD.methodId}@${SMART_MONEY_REBALANCING_METHOD.version}`,
    generatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 60_000).toISOString(),
  };
}

export const SMART_MONEY_HEALTH_METHOD = {
  methodId: "smart-money.venus-health-finding",
  version: "1.0.0",
  name: "Venus health monitoring finding",
  description: "Maps Venus protocol liquidity/shortfall and Spotriq's derived health factor into a transparent health-monitoring finding without predicting future liquidation or claiming safety.",
} as const;

function healthStatusCopy(position: VenusPoolPositionSnapshot): { state: Finding["state"]; severity: Finding["severity"]; headline: string; summary: string; action: string } {
  const forcedLiquidation = position.markets.some((market) => BigInt(market.borrowUnderlyingRaw) > 0n && market.forcedLiquidationEnabled === true);
  switch (position.riskState) {
    case "LIQUIDATABLE": return forcedLiquidation
      ? { state: "needs-attention", severity: "urgent", headline: `Venus has forced liquidation enabled for a borrowed market in your ${position.poolName} position.`, summary: "That borrowed market may be liquidated regardless of normal account liquidity. This is current Venus configuration, not a prediction of when or whether a liquidation transaction will occur.", action: "Review Protection Agents" }
      : { state: "needs-attention", severity: "urgent", headline: `Your ${position.poolName} borrowing position is below Venus’s liquidation-threshold requirement.`, summary: "Venus currently reports account shortfall for this pool. This is a current protocol state, not a prediction of when or whether a liquidation transaction will occur.", action: "Review Protection Agents" };
    case "HIGHER_ATTENTION": return { state: "needs-attention", severity: "urgent", headline: `Your ${position.poolName} borrowing position has a narrow liquidation buffer.`, summary: "Spotriq’s derived health factor is above the current liquidation boundary but below the higher-attention threshold. Venus protocol shortfall remains the canonical liquidation signal.", action: "Review Protection Agents" };
    case "WATCH": return { state: "needs-attention", severity: "attention", headline: `Your ${position.poolName} borrowing position is in Spotriq’s watch range.`, summary: "The derived health factor indicates a reduced buffer relative to the current Venus liquidation threshold. This watch band is Spotriq presentation policy, not a Venus guarantee.", action: "Review Protection Agents" };
    case "COMFORTABLE": return { state: "healthy", severity: "info", headline: `No immediate Venus liquidation shortfall is detected for your ${position.poolName} borrowing position.`, summary: "Venus reports no current account shortfall and Spotriq’s derived health factor is above the configured watch range. This applies only to the supported pool state checked now; it does not mean the position is risk-free.", action: "Explore Health Agents" };
    case "NO_BORROW": return { state: "informational", severity: "info", headline: `No borrowing exposure is detected in your ${position.poolName} position.`, summary: "Spotriq found supplied Venus assets in this pool but no current borrow balance in the supported markets checked.", action: "Explore Health Agents" };
    case "COULD_NOT_ASSESS": default: return { state: "could-not-assess", severity: "attention", headline: `Spotriq could not reliably assess your ${position.poolName} liquidation buffer.`, summary: "One or more required Venus market, oracle, or risk inputs were unavailable or conflicted with the canonical protocol liquidity state. Spotriq will not label this position Healthy from incomplete data.", action: "View Health Agents" };
  }
}

function usdFrom1e18(value?: string): string {
  if (value === undefined) return "Unavailable";
  const n = Number(value) / 1e18;
  return Number.isFinite(n) ? n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }) : "Unavailable";
}

export function createHealthFinding(checkSessionId: string, position: VenusPoolPositionSnapshot, now = new Date(), idFactory: () => string = randomUUID): Finding {
  const copy = healthStatusCopy(position);
  const borrowedMarkets = position.markets.filter((market) => BigInt(market.borrowUnderlyingRaw) > 0n);
  const assets = borrowedMarkets.map((market) => market.underlying.symbol ?? market.vTokenSymbol ?? "asset").join(", ") || "None";
  return {
    findingId: `finding_${idFactory()}`, checkSessionId, category: "health", state: copy.state, severity: copy.severity, headline: copy.headline, summary: copy.summary,
    confidence: position.riskState === "COULD_NOT_ASSESS" || position.coverage.healthFactor === "UNAVAILABLE" || position.coverage.healthFactor === "CONFLICT"
      ? "low"
      : position.coverage.accountLiquidity === "AVAILABLE" && position.coverage.marketPositions === "AVAILABLE" ? "high" : "medium",
    freshness: ageLabel(position.observedAt, now), primaryAction: { label: copy.action }, targetRoute: "explore",
    keyValues: [
      { label: "Venus pool", value: position.poolName, note: position.poolKind === "CORE" ? "Core Pool" : "Isolated Pool" },
      { label: "Health factor", value: position.healthFactor ?? "Could not assess", note: position.healthFactor ? "Spotriq derived · Venus shortfall remains canonical" : undefined },
      { label: "Borrow value", value: usdFrom1e18(position.totalBorrowValueUsd1e18), note: borrowedMarkets.length ? `Borrowing: ${assets}` : undefined },
      { label: "Protocol shortfall", value: usdFrom1e18(position.protocolShortfallRaw), note: position.protocolShortfallRaw !== "0" ? "Venus reports current shortfall" : "No current Venus shortfall reported" },
    ],
    whatCouldAgentDo: "A compatible Health Factor Monitoring agent could monitor supported Venus state and alert you to changes. Automatic intervention would require a separate explicit permission flow and is not enabled by this finding.",
    uncertainties: position.limitations.length ? position.limitations.join(" ") : "Health state can change as prices, balances, interest and Venus risk parameters change. This finding reflects only the observed BSC block.",
    subject: { protocol: "Venus", poolKind: position.poolKind, poolName: position.poolName, comptroller: position.comptroller, healthFactor: position.healthFactor, riskState: position.riskState, blockNumber: position.blockNumber, network: position.network },
    evidenceIds: position.evidence.map((item) => item.evidenceId), methodVersion: `${SMART_MONEY_HEALTH_METHOD.methodId}@${SMART_MONEY_HEALTH_METHOD.version}`, generatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 30_000).toISOString(),
  };
}

export const SMART_MONEY_YIELD_METHOD = {
  methodId: "smart-money.yield-finding",
  version: "1.0.0",
  name: "Supported Venus yield opportunity finding",
  description: "Groups wallet-relevant Venus supply markets by underlying asset and surfaces current base supply-rate context without inferring user intent or future return.",
} as const;

function toNumber(value?: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function createYieldFinding(
  checkSessionId: string,
  opportunities: YieldOpportunitySnapshot[],
  now = new Date(),
  idFactory: () => string = randomUUID,
): Finding | undefined {
  if (opportunities.length === 0) return undefined;
  const ranked = [...opportunities].filter((item) => item.currentSupplyApyPercent !== undefined).sort((a, b) => (toNumber(b.currentSupplyApyPercent) ?? -1) - (toNumber(a.currentSupplyApyPercent) ?? -1));
  const best = ranked[0] ?? opportunities[0];
  const symbol = best.underlying.symbol ?? `${best.underlying.address.slice(0, 6)}…`;
  const walletRaw = BigInt(best.walletBalanceRaw);
  const totalSupplied = opportunities.reduce((sum, item) => sum + BigInt(item.existingSupplyUnderlyingRaw), 0n);
  const hasWalletBalance = walletRaw > 0n;
  const hasExistingSupply = totalSupplied > 0n;
  const currentRate = best.currentSupplyApyPercent ? `${Number(best.currentSupplyApyPercent).toLocaleString(undefined, { maximumFractionDigits: 3 })}%` : "Current rate unavailable";
  const state: Finding["state"] = hasWalletBalance ? "opportunity" : hasExistingSupply ? "healthy" : "informational";
  const headline = hasWalletBalance
    ? `You hold ${best.walletBalanceFormatted ?? "a balance of"} ${symbol} that is not currently supplied in the supported Venus markets we checked.`
    : `You already have ${symbol} supplied in a supported Venus market.`;
  const summary = hasWalletBalance
    ? `Spotriq found ${opportunities.length} supported Venus supply market${opportunities.length === 1 ? "" : "s"} for ${symbol}. The highest current base supply APY among the wallet-relevant markets checked is ${currentRate}. This does not mean the funds should be supplied; rates are variable and Spotriq has not inferred your risk tolerance or liquidity needs.`
    : `Spotriq detected an existing Venus supply position for ${symbol}. The current base supply APY shown here is ${currentRate}; it is a point-in-time protocol rate, not a realised-return figure.`;
  return {
    findingId: `finding_${idFactory()}`, checkSessionId, category: "yield", state, severity: state === "opportunity" ? "opportunity" : "info", headline, summary,
    confidence: best.coverage.currentRate === "AVAILABLE" ? "high" : "medium", freshness: ageLabel(best.observedAt, now),
    primaryAction: { label: state === "opportunity" ? "Find Yield Agents" : "Explore Yield Agents" }, targetRoute: "explore",
    keyValues: [
      { label: "Asset", value: symbol, note: best.poolName },
      { label: "Wallet balance", value: `${best.walletBalanceFormatted ?? best.walletBalanceRaw} ${symbol}`, note: hasWalletBalance ? "Not currently supplied in this specific market" : "No free balance detected" },
      { label: "Current base APY", value: currentRate, note: "Current protocol rate · not guaranteed" },
      { label: "Supported markets", value: String(opportunities.length), note: ranked.length > 1 ? "Rates differ by Venus pool" : undefined },
    ],
    whatCouldAgentDo: "A compatible Yield Optimisation agent could compare supported opportunities using your explicit risk and liquidity preferences, then prepare or execute an allocation only after a separate permission flow.",
    uncertainties: "Current Venus base supply APY can change with utilization. Incentives, Prime rewards, gas, agent fees, taxes, transaction-time supply caps, and realised yield are not included. Spotriq has not inferred whether you want this asset deployed.",
    subject: { protocol: "Venus", asset: symbol, underlyingAddress: best.underlying.address, marketCount: opportunities.length, bestCurrentBaseApyPercent: best.currentSupplyApyPercent, network: best.network, blockNumber: best.blockNumber },
    evidenceIds: opportunities.flatMap((item) => item.evidence.map((ev) => ev.evidenceId)),
    methodVersion: `${SMART_MONEY_YIELD_METHOD.methodId}@${SMART_MONEY_YIELD_METHOD.version}`, generatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 5 * 60_000).toISOString(),
  };
}


export const SMART_MONEY_GRID_METHOD = {
  methodId: "smart-money.grid-finding",
  version: "1.0.0",
  name: "PancakeSwap V3 grid market-context finding",
  description: "Surfaces wallet-relevant Grid Trading context from a supported PancakeSwap V3 pool and deterministic onchain TWAP regime classification without predicting profit.",
} as const;

export function createGridFinding(checkSessionId: string, context: GridMarketContextSnapshot, now = new Date(), idFactory: () => string = randomUUID): Finding | undefined {
  if (!context.walletCompatibility.hasAnyCompatibleAsset) return undefined;
  const dispersion = context.twapDispersionBps === undefined ? "Unavailable" : `${context.twapDispersionBps.toLocaleString(undefined, { maximumFractionDigits: 1 })} bps`;
  const band = context.twapBandLow && context.twapBandHigh ? `${Number(context.twapBandLow).toLocaleString(undefined,{maximumSignificantDigits:7})}–${Number(context.twapBandHigh).toLocaleString(undefined,{maximumSignificantDigits:7})}` : "Insufficient history";
  const common = "This is deterministic market context from available PancakeSwap V3 oracle averages. It is not realised volatility, a profit forecast, or a recommendation to trade.";
  const state: Finding["state"] = context.regime === "RANGE_LIKE" ? "opportunity" : context.regime === "INSUFFICIENT_HISTORY" ? "could-not-assess" : "informational";
  const severity: Finding["severity"] = state === "opportunity" ? "opportunity" : "info";
  const headline = context.regime === "RANGE_LIKE"
    ? `Recent ${context.pairLabel} onchain averages are relatively range-like.`
    : context.regime === "TRENDING_UP"
      ? `Recent ${context.pairLabel} onchain averages show upward directional divergence.`
      : context.regime === "TRENDING_DOWN"
        ? `Recent ${context.pairLabel} onchain averages show downward directional divergence.`
        : context.regime === "MIXED"
          ? `Recent ${context.pairLabel} onchain averages are mixed.`
          : `Spotriq could not establish enough ${context.pairLabel} oracle history for Grid context.`;
  const summary = context.regime === "RANGE_LIKE"
    ? `The available 1h/6h/24h average-price observations remain within a relatively narrow TWAP band for Spotriq’s versioned method. ${common}`
    : context.regime === "INSUFFICIENT_HISTORY"
      ? `The pool does not currently expose enough usable oracle history across Spotriq’s required windows. Spotriq will not guess a market regime. ${common}`
      : `The available average-price windows do not meet Spotriq’s range-like rule. ${common}`;
  return {
    findingId: `finding_${idFactory()}`, checkSessionId, category: "grid", state, severity, headline, summary, confidence: context.confidence === "unavailable" ? "low" : context.confidence, freshness: ageLabel(context.observedAt, now),
    primaryAction: { label: state === "opportunity" ? "Compare Grid Strategies" : "Explore Grid Agents" }, targetRoute: "explore",
    keyValues: [
      { label: "Pair", value: context.pairLabel, note: `PancakeSwap V3 · ${(context.feePips/10000).toFixed(2)}% fee` },
      { label: "Market regime", value: context.regime.replaceAll("_", " "), note: `${context.confidence} confidence` },
      { label: "TWAP dispersion", value: dispersion, note: "Average-price dispersion · not realised volatility" },
      { label: "Observed average band", value: band, note: "Spot + available 1h/6h/24h averages" },
    ],
    whatCouldAgentDo: "A compatible Grid Trading agent could use this pair context after you explicitly choose capital, price range, stop conditions, and risk limits. Spotriq has not inferred those preferences from your wallet.",
    uncertainties: context.limitations.join(" "),
    subject: { protocol: "PancakeSwap", poolAddress: context.poolAddress, pair: context.pairLabel, regime: context.regime, contextId: context.contextId, network: context.network, blockNumber: context.blockNumber },
    evidenceIds: context.evidence.map((item) => item.evidenceId), methodVersion: `${SMART_MONEY_GRID_METHOD.methodId}@${SMART_MONEY_GRID_METHOD.version}`, generatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 5 * 60_000).toISOString(),
  };
}

function defaultCoverage(): SmartMoneyCheckCoverage {
  return {
    walletAssets: "PARTIAL",
    pancakeSwapPositions: "PARTIAL",
    venusPositions: "PARTIAL",
    yieldOpportunities: "PARTIAL",
    marketContext: "PARTIAL",
    agentCompatibility: "NOT_SUPPORTED",
    notes: [
      "Wallet-wide ERC-20 discovery is not enabled yet; this check reads the native BNB/tBNB balance plus token metadata attached to discovered supported positions.",
      "PancakeSwap V3 wallet discovery is enabled. Infinity CL wallet discovery requires a future indexed event source.",
      "Venus Core Pool and Isolated Pool positions are checked onchain. Missing risk inputs are surfaced as partial/could-not-assess rather than Healthy.",
      "Yield scans compare wallet-held or already-supplied assets with supported Venus base supply-rate markets; user risk and liquidity preferences are not inferred.",
      "Grid market context uses supported PancakeSwap V3 onchain oracle averages. TWAP dispersion is not labelled as realised volatility and no profit forecast is made.",
      "Agent matching is intentionally not represented as a completed check yet.",
    ],
  };
}

function serialize(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function asDateString(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return undefined;
}

export class MemorySmartMoneyStore implements SmartMoneyStore {
  private sessions = new Map<string, CheckSession>();
  private portfolios = new Map<string, SmartMoneyPortfolioSnapshot>();
  private findings = new Map<string, Finding[]>();
  private events = new Map<string, SmartMoneyCheckEvent[]>();

  async createSession(session: CheckSession) { this.sessions.set(session.checkSessionId, structuredClone(session)); }
  async getSession(id: string) { const value = this.sessions.get(id); return value ? structuredClone(value) : undefined; }
  async updateSession(session: CheckSession) { this.sessions.set(session.checkSessionId, structuredClone(session)); }
  async savePortfolio(snapshot: SmartMoneyPortfolioSnapshot) { this.portfolios.set(snapshot.checkSessionId, structuredClone(snapshot)); }
  async getPortfolio(id: string) { const value = this.portfolios.get(id); return value ? structuredClone(value) : undefined; }
  async saveEvidence(_records: EvidenceEnvelope[]) { /* Evidence stays embedded in snapshots in memory mode. */ }
  async saveFinding(finding: Finding) {
    const existing = this.findings.get(finding.checkSessionId ?? "") ?? [];
    this.findings.set(finding.checkSessionId ?? "", [...existing.filter((item) => item.findingId !== finding.findingId), structuredClone(finding)]);
  }
  async listFindings(id: string) { return structuredClone(this.findings.get(id) ?? []); }
  async appendEvent(event: SmartMoneyCheckEvent) {
    const existing = this.events.get(event.checkSessionId) ?? [];
    this.events.set(event.checkSessionId, [...existing, structuredClone(event)]);
  }
  async listEvents(id: string, afterSequence = 0) { return structuredClone((this.events.get(id) ?? []).filter((event) => event.sequence > afterSequence)); }
}

export class PostgresSmartMoneyStore implements SmartMoneyStore {
  constructor(private readonly db: SqlQueryExecutor) {}

  async createSession(session: CheckSession): Promise<void> {
    await this.db.query(
      `insert into check_sessions(check_session_id, wallet_address, wallet_control, state, coverage, created_at, updated_at, completed_at, failure_reason)
       values($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9)
       on conflict (check_session_id) do update set state=excluded.state, coverage=excluded.coverage, updated_at=excluded.updated_at, completed_at=excluded.completed_at, failure_reason=excluded.failure_reason`,
      [session.checkSessionId, session.walletAddress, session.walletControl, session.state, JSON.stringify({ sourceProgress: session.sourceProgress, coverage: session.coverage }), session.createdAt, session.updatedAt ?? session.createdAt, session.completedAt ?? null, session.failureReason ?? null],
    );
  }

  async getSession(checkSessionId: string): Promise<CheckSession | undefined> {
    const result = await this.db.query<{
      check_session_id: string; wallet_address: string; wallet_control: WalletControlState; state: CheckSession["state"];
      coverage: { sourceProgress?: CheckSourceProgress[]; coverage?: SmartMoneyCheckCoverage } | null;
      created_at: string | Date; updated_at: string | Date | null; completed_at: string | Date | null; failure_reason: string | null;
    }>(`select check_session_id,wallet_address,wallet_control,state,coverage,created_at,updated_at,completed_at,failure_reason from check_sessions where check_session_id=$1`, [checkSessionId]);
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      checkSessionId: row.check_session_id,
      walletAddress: row.wallet_address,
      walletControl: row.wallet_control,
      state: row.state,
      createdAt: asDateString(row.created_at)!,
      updatedAt: asDateString(row.updated_at ?? undefined),
      completedAt: asDateString(row.completed_at ?? undefined),
      failureReason: row.failure_reason ?? undefined,
      sourceProgress: row.coverage?.sourceProgress,
      coverage: row.coverage?.coverage,
    };
  }

  async updateSession(session: CheckSession): Promise<void> { await this.createSession(session); }

  async savePortfolio(snapshot: SmartMoneyPortfolioSnapshot): Promise<void> {
    await this.db.query(
      `insert into portfolio_snapshots(portfolio_snapshot_id,check_session_id,wallet_address,observed_at,coverage,snapshot)
       values($1,$2,$3,$4,$5::jsonb,$6::jsonb)
       on conflict (check_session_id) do update set portfolio_snapshot_id=excluded.portfolio_snapshot_id, wallet_address=excluded.wallet_address, observed_at=excluded.observed_at, coverage=excluded.coverage, snapshot=excluded.snapshot`,
      [snapshot.portfolioSnapshotId, snapshot.checkSessionId, snapshot.walletAddress, snapshot.observedAt, JSON.stringify(snapshot.coverage), JSON.stringify(serialize(snapshot))],
    );
    await this.db.query(`delete from yield_opportunity_snapshots where portfolio_snapshot_id=$1`, [snapshot.portfolioSnapshotId]);
    for (const opportunity of snapshot.yieldOpportunities ?? []) {
      await this.db.query(
        `insert into yield_opportunity_snapshots(
          yield_opportunity_snapshot_id,portfolio_snapshot_id,check_session_id,wallet_address,protocol,pool_kind,pool_name,comptroller,vtoken_address,underlying,wallet_balance_raw,wallet_balance_formatted,existing_supply_underlying_raw,existing_supply_formatted,current_supply_rate_per_block_raw,current_supply_apy_percent,current_rate_type,available_liquidity_raw,coverage,limitations,block_number,observed_at
        ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20::jsonb,$21,$22)`,
        [opportunity.opportunityId,snapshot.portfolioSnapshotId,snapshot.checkSessionId,snapshot.walletAddress,opportunity.protocol,opportunity.poolKind,opportunity.poolName,opportunity.comptroller,opportunity.vToken,JSON.stringify(opportunity.underlying),opportunity.walletBalanceRaw,opportunity.walletBalanceFormatted ?? null,opportunity.existingSupplyUnderlyingRaw,opportunity.existingSupplyFormatted ?? null,opportunity.currentSupplyRatePerBlockRaw,opportunity.currentSupplyApyPercent ?? null,opportunity.currentRateType,opportunity.availableLiquidityRaw ?? null,JSON.stringify(opportunity.coverage),JSON.stringify(opportunity.limitations),opportunity.blockNumber,opportunity.observedAt],
      );
    }
    await this.db.query(`delete from grid_market_context_snapshots where portfolio_snapshot_id=$1`, [snapshot.portfolioSnapshotId]);
    for (const context of snapshot.gridMarketContexts ?? []) {
      await this.db.query(
        `insert into grid_market_context_snapshots(
          grid_market_context_snapshot_id,portfolio_snapshot_id,check_session_id,wallet_address,protocol,pool_address,pair_label,token0,token1,fee_pips,current_tick,current_price_token0_in_token1,liquidity_raw,windows,twap_band_low,twap_band_high,twap_dispersion_bps,regime,confidence,wallet_compatibility,coverage,limitations,block_number,observed_at
        ) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14::jsonb,$15,$16,$17,$18,$19,$20::jsonb,$21::jsonb,$22::jsonb,$23,$24)`,
        [context.contextId,snapshot.portfolioSnapshotId,snapshot.checkSessionId,snapshot.walletAddress,context.protocol,context.poolAddress,context.pairLabel,JSON.stringify(context.token0),JSON.stringify(context.token1),context.feePips,context.currentTick,context.currentPriceToken0InToken1 ?? null,context.liquidityRaw,JSON.stringify(context.windows),context.twapBandLow ?? null,context.twapBandHigh ?? null,context.twapDispersionBps ?? null,context.regime,context.confidence,JSON.stringify(context.walletCompatibility),JSON.stringify(context.coverage),JSON.stringify(context.limitations),context.blockNumber,context.observedAt],
      );
    }
    await this.db.query(`delete from lending_position_snapshots where portfolio_snapshot_id=$1`, [snapshot.portfolioSnapshotId]);
    for (const position of snapshot.venusPositions ?? []) {
      const positionId = `${snapshot.portfolioSnapshotId}:venus:${position.comptroller}`;
      await this.db.query(
        `insert into lending_position_snapshots(
          lending_position_snapshot_id,portfolio_snapshot_id,check_session_id,wallet_address,protocol,pool_kind,pool_name,comptroller,oracle_address,protocol_liquidity_raw,protocol_shortfall_raw,total_borrow_value_usd_1e18,liquidation_adjusted_collateral_usd_1e18,health_factor,risk_state,coverage,limitations,block_number,observed_at
        ) values($1,$2,$3,$4,'Venus',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17,$18)`,
        [positionId,snapshot.portfolioSnapshotId,snapshot.checkSessionId,snapshot.walletAddress,position.poolKind,position.poolName,position.comptroller,position.oracle ?? null,position.protocolLiquidityRaw,position.protocolShortfallRaw,position.totalBorrowValueUsd1e18 ?? null,position.liquidationAdjustedCollateralUsd1e18 ?? null,position.healthFactor ?? null,position.riskState,JSON.stringify(position.coverage),JSON.stringify(position.limitations),position.blockNumber,position.observedAt],
      );
      for (const market of position.markets) {
        await this.db.query(
          `insert into lending_market_position_snapshots(
            lending_market_position_snapshot_id,lending_position_snapshot_id,vtoken_address,vtoken_symbol,underlying,collateral_enabled,supplied_vtoken_raw,supplied_underlying_raw,borrow_underlying_raw,exchange_rate_mantissa,collateral_factor_mantissa,liquidation_threshold_mantissa,forced_liquidation_enabled,oracle_price_raw,supplied_value_usd_1e18,borrow_value_usd_1e18,liquidation_adjusted_collateral_usd_1e18
          ) values($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
          [`${positionId}:${market.vToken}`,positionId,market.vToken,market.vTokenSymbol ?? null,JSON.stringify(market.underlying),market.collateralEnabled,market.suppliedVTokenRaw,market.suppliedUnderlyingRaw,market.borrowUnderlyingRaw,market.exchangeRateMantissa,market.collateralFactorMantissa ?? null,market.liquidationThresholdMantissa ?? null,market.forcedLiquidationEnabled ?? null,market.oraclePriceRaw ?? null,market.suppliedValueUsd1e18 ?? null,market.borrowValueUsd1e18 ?? null,market.liquidationAdjustedCollateralUsd1e18 ?? null],
        );
      }
    }
  }

  async getPortfolio(checkSessionId: string): Promise<SmartMoneyPortfolioSnapshot | undefined> {
    const result = await this.db.query<{ snapshot: SmartMoneyPortfolioSnapshot }>(`select snapshot from portfolio_snapshots where check_session_id=$1 order by observed_at desc limit 1`, [checkSessionId]);
    return result.rows[0]?.snapshot;
  }

  async saveEvidence(records: EvidenceEnvelope[]): Promise<void> {
    for (const record of records) {
      await this.db.query(
        `insert into evidence_records(
          evidence_id,subject_type,subject_id,metric,value,unit,provenance,source_name,source_ref,observed_at,confidence,method_version,period,sample_size,limitation,
          source_id,truth_layer,chain,network,chain_id,block_number,block_hash,transaction_hash,effective_at,finality,freshness_state,freshness_policy,availability,method_inputs
        ) values($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27::jsonb,$28,$29::jsonb)
        on conflict (evidence_id) do nothing`,
        [record.evidenceId, record.subjectType, record.subjectId, record.metric, JSON.stringify(record.value), record.unit ?? null, record.provenance, record.sourceName, record.sourceRef ?? null,
          record.observedAt, record.confidence ?? null, record.methodVersion ?? null, record.period ?? null, record.sampleSize ?? null, record.limitation ?? null, record.sourceId, record.truthLayer,
          record.chainContext?.chain ?? null, record.chainContext?.network ?? null, record.chainContext?.chainId ?? null, record.chainContext?.blockNumber ?? null, record.chainContext?.blockHash ?? null,
          record.chainContext?.transactionHash ?? null, record.effectiveAt ?? null, record.chainContext?.finality ?? null, record.freshnessAssessment.state, JSON.stringify(record.freshnessAssessment),
          record.availability, JSON.stringify(record.methodInputs ?? [])],
      );
    }
  }

  async saveFinding(finding: Finding): Promise<void> {
    await this.db.query(
      `insert into findings(finding_id,check_session_id,category,state,severity,confidence,headline,summary,subject,evidence_ids,uncertainties,generated_at,expires_at,presentation,method_version)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14::jsonb,$15)
       on conflict (finding_id) do update set state=excluded.state,severity=excluded.severity,confidence=excluded.confidence,headline=excluded.headline,summary=excluded.summary,subject=excluded.subject,evidence_ids=excluded.evidence_ids,uncertainties=excluded.uncertainties,generated_at=excluded.generated_at,expires_at=excluded.expires_at,presentation=excluded.presentation,method_version=excluded.method_version`,
      [finding.findingId, finding.checkSessionId, finding.category, finding.state, finding.severity, finding.confidence, finding.headline, finding.summary, JSON.stringify(finding.subject ?? {}),
        JSON.stringify(finding.evidenceIds ?? []), JSON.stringify(finding.uncertainties ? [finding.uncertainties] : []), finding.generatedAt ?? new Date().toISOString(), finding.expiresAt ?? null,
        JSON.stringify({ freshness: finding.freshness, primaryAction: finding.primaryAction, targetRoute: finding.targetRoute, keyValues: finding.keyValues, whatCouldAgentDo: finding.whatCouldAgentDo, uncertainties: finding.uncertainties }), finding.methodVersion ?? null],
    );
  }

  async listFindings(checkSessionId: string): Promise<Finding[]> {
    const result = await this.db.query<{
      finding_id: string; check_session_id: string; category: Finding["category"]; state: Finding["state"]; severity: Finding["severity"]; confidence: Finding["confidence"];
      headline: string; summary: string; subject: Record<string, unknown>; evidence_ids: string[]; uncertainties: string[]; generated_at: string | Date; expires_at: string | Date | null;
      presentation: { freshness?: string; primaryAction?: { label: string }; targetRoute?: Finding["targetRoute"]; keyValues?: Finding["keyValues"]; whatCouldAgentDo?: string; uncertainties?: string };
      method_version: string | null;
    }>(`select finding_id,check_session_id,category,state,severity,confidence,headline,summary,subject,evidence_ids,uncertainties,generated_at,expires_at,presentation,method_version from findings where check_session_id=$1 order by generated_at asc`, [checkSessionId]);
    return result.rows.map((row) => ({
      findingId: row.finding_id,
      checkSessionId: row.check_session_id,
      category: row.category,
      state: row.state,
      severity: row.severity,
      confidence: row.confidence,
      headline: row.headline,
      summary: row.summary,
      freshness: row.presentation?.freshness ?? ageLabel(asDateString(row.generated_at)!),
      primaryAction: row.presentation?.primaryAction ?? { label: "Explore Agents" },
      targetRoute: row.presentation?.targetRoute ?? "explore",
      keyValues: row.presentation?.keyValues ?? [],
      whatCouldAgentDo: row.presentation?.whatCouldAgentDo ?? "Explore compatible specialist agents.",
      uncertainties: row.presentation?.uncertainties ?? row.uncertainties?.[0],
      subject: row.subject,
      evidenceIds: row.evidence_ids,
      methodVersion: row.method_version ?? undefined,
      generatedAt: asDateString(row.generated_at),
      expiresAt: asDateString(row.expires_at ?? undefined),
    }));
  }

  async appendEvent(event: SmartMoneyCheckEvent): Promise<void> {
    await this.db.query(
      `insert into check_events(event_id,check_session_id,sequence,event_type,source_key,event_data,occurred_at)
       values($1,$2,$3,$4,$5,$6::jsonb,$7) on conflict (event_id) do nothing`,
      [event.eventId, event.checkSessionId, event.sequence, event.type, event.source ?? null, JSON.stringify(event.data ?? {}), event.occurredAt],
    );
  }

  async listEvents(checkSessionId: string, afterSequence = 0): Promise<SmartMoneyCheckEvent[]> {
    const result = await this.db.query<{ event_id: string; check_session_id: string; sequence: number; event_type: SmartMoneyCheckEvent["type"]; source_key: CheckSourceKey | null; event_data: Record<string, unknown>; occurred_at: string | Date }>(
      `select event_id,check_session_id,sequence,event_type,source_key,event_data,occurred_at from check_events where check_session_id=$1 and sequence>$2 order by sequence asc`,
      [checkSessionId, afterSequence],
    );
    return result.rows.map((row) => ({ eventId: row.event_id, checkSessionId: row.check_session_id, sequence: row.sequence, type: row.event_type, source: row.source_key ?? undefined, data: row.event_data, occurredAt: asDateString(row.occurred_at)! }));
  }
}

export interface SmartMoneyEngineOptions {
  chain: BscChainReader;
  pancakeSwap: PancakeSwapReader;
  venus: VenusReader;
  marketContext: GridMarketContextReader;
  store?: SmartMoneyStore;
  now?: () => Date;
  idFactory?: () => string;
}

export interface SmartMoneyEngine {
  startCheck(input: StartSmartMoneyCheckInput): Promise<CheckSession>;
  runCheck(checkSessionId: string): Promise<SmartMoneyCheckSnapshot>;
  getCheck(checkSessionId: string): Promise<SmartMoneyCheckSnapshot | undefined>;
  listEvents(checkSessionId: string, afterSequence?: number): Promise<SmartMoneyCheckEvent[]>;
  subscribe(checkSessionId: string, listener: (event: SmartMoneyCheckEvent) => void): () => void;
}

export function createSmartMoneyEngine(options: SmartMoneyEngineOptions): SmartMoneyEngine {
  const store = options.store ?? new MemorySmartMoneyStore();
  const now = options.now ?? (() => new Date());
  const idFactory = options.idFactory ?? randomUUID;
  const listeners = new Map<string, Set<(event: SmartMoneyCheckEvent) => void>>();
  const sequences = new Map<string, number>();

  const publish = async (checkSessionId: string, type: SmartMoneyCheckEvent["type"], source?: CheckSourceKey, data?: Record<string, unknown>) => {
    const sequence = (sequences.get(checkSessionId) ?? 0) + 1;
    sequences.set(checkSessionId, sequence);
    const event: SmartMoneyCheckEvent = { eventId: `checkevt_${idFactory()}`, checkSessionId, sequence, type, source, data, occurredAt: now().toISOString() };
    await store.appendEvent(event);
    for (const listener of listeners.get(checkSessionId) ?? []) listener(event);
    return event;
  };

  const updateSource = async (session: CheckSession, source: CheckSourceKey, state: CheckSourceProgress["state"], detail?: string) => {
    const timestamp = now().toISOString();
    session.sourceProgress = cloneProgress(session.sourceProgress ?? CHECK_SOURCE_TEMPLATE);
    const item = session.sourceProgress.find((candidate) => candidate.key === source)!;
    item.state = state;
    item.detail = detail;
    if (state === "RUNNING") item.startedAt = item.startedAt ?? timestamp;
    if (["COMPLETED", "PARTIAL", "FAILED", "NOT_SUPPORTED"].includes(state)) item.completedAt = timestamp;
    session.updatedAt = timestamp;
    await store.updateSession(session);
    const eventType = state === "RUNNING" ? "check.source.started" : state === "COMPLETED" ? "check.source.completed" : state === "PARTIAL" ? "check.source.partial" : state === "FAILED" ? "check.source.failed" : undefined;
    if (eventType) await publish(session.checkSessionId, eventType, source, { state, detail });
  };

  async function startCheck(input: StartSmartMoneyCheckInput): Promise<CheckSession> {
    const createdAt = now().toISOString();
    const session: CheckSession = {
      checkSessionId: `check_${idFactory()}`,
      walletAddress: assertWalletAddress(input.walletAddress),
      walletControl: input.walletControl ?? "WATCH_ONLY",
      state: "CREATED",
      createdAt,
      updatedAt: createdAt,
      sourceProgress: cloneProgress(CHECK_SOURCE_TEMPLATE),
      coverage: defaultCoverage(),
    };
    await store.createSession(session);
    await publish(session.checkSessionId, "check.created", undefined, { walletAddress: session.walletAddress, walletControl: session.walletControl });
    return session;
  }

  async function runCheck(checkSessionId: string): Promise<SmartMoneyCheckSnapshot> {
    const session = await store.getSession(checkSessionId);
    if (!session) throw new Error(`Smart Money Check ${checkSessionId} was not found.`);
    if (session.state === "SCANNING") return { session, portfolio: await store.getPortfolio(checkSessionId), findings: await store.listFindings(checkSessionId) };
    if (session.state === "COMPLETED" || session.state === "PARTIAL") return { session, portfolio: await store.getPortfolio(checkSessionId), findings: await store.listFindings(checkSessionId) };

    session.state = "SCANNING";
    session.updatedAt = now().toISOString();
    await store.updateSession(session);
    await publish(checkSessionId, "check.started");

    let nativeBalance: SmartMoneyPortfolioSnapshot["nativeBalance"];
    let positions: PancakeSwapClPositionSnapshot[] = [];
    let venusPositions: VenusPoolPositionSnapshot[] = [];
    let yieldOpportunities: YieldOpportunitySnapshot[] = [];
    let gridMarketContexts: GridMarketContextSnapshot[] = [];
    let blockNumber = "0";
    let observedAt = now().toISOString();
    const coverage = defaultCoverage();

    try {
      await updateSource(session, "wallet_assets", "RUNNING");
      const walletBalances = await options.chain.getWalletBalances(session.walletAddress);
      nativeBalance = walletBalances.native;
      blockNumber = walletBalances.blockNumber;
      observedAt = walletBalances.observedAt;
      await store.saveEvidence([walletBalances.native.evidence]);
      coverage.walletAssets = "PARTIAL";
      await updateSource(session, "wallet_assets", "PARTIAL", "Native BNB/tBNB balance checked. Wallet-wide ERC-20 discovery is not enabled yet.");
    } catch (error) {
      coverage.walletAssets = "FAILED";
      await updateSource(session, "wallet_assets", "FAILED", error instanceof Error ? error.message : "Wallet asset read failed.");
    }

    try {
      await updateSource(session, "pancakeswap_positions", "RUNNING");
      const pancake = await options.pancakeSwap.getWalletPositions(session.walletAddress);
      positions = pancake.positions;
      blockNumber = pancake.blockNumber;
      observedAt = pancake.observedAt;
      const evidence = positions.flatMap((position) => position.evidence);
      await store.saveEvidence(evidence);
      coverage.pancakeSwapPositions = pancake.coverage.v3Discovery === "AVAILABLE" && pancake.coverage.infinityClDiscovery === "TOKEN_ID_REQUIRED" ? "PARTIAL" : "AVAILABLE";
      const detail = `Found ${positions.length} supported PancakeSwap V3 position${positions.length === 1 ? "" : "s"}. Infinity CL wallet discovery is not enabled yet.`;
      await updateSource(session, "pancakeswap_positions", coverage.pancakeSwapPositions === "AVAILABLE" ? "COMPLETED" : "PARTIAL", detail);
    } catch (error) {
      coverage.pancakeSwapPositions = "FAILED";
      await updateSource(session, "pancakeswap_positions", "FAILED", error instanceof Error ? error.message : "PancakeSwap position scan failed.");
    }

    try {
      await updateSource(session, "venus_positions", "RUNNING");
      const venus = await options.venus.getWalletPositions(session.walletAddress);
      venusPositions = venus.positions;
      blockNumber = venus.blockNumber;
      observedAt = venus.observedAt;
      await store.saveEvidence(venusPositions.flatMap((position) => position.evidence));
      const fullyAvailable = venus.coverage.corePool === "AVAILABLE" && venus.coverage.isolatedPools === "AVAILABLE" && venusPositions.every((position) => position.coverage.marketPositions === "AVAILABLE" && position.coverage.healthFactor !== "CONFLICT");
      coverage.venusPositions = fullyAvailable ? "AVAILABLE" : "PARTIAL";
      const borrowed = venusPositions.filter((position) => position.markets.some((market) => BigInt(market.borrowUnderlyingRaw) > 0n)).length;
      const detail = `Checked Venus Core and isolated pools. Found ${venusPositions.length} active pool position${venusPositions.length === 1 ? "" : "s"}, including ${borrowed} with borrowing exposure.`;
      await updateSource(session, "venus_positions", fullyAvailable ? "COMPLETED" : "PARTIAL", detail);
    } catch (error) {
      coverage.venusPositions = "FAILED";
      await updateSource(session, "venus_positions", "FAILED", error instanceof Error ? error.message : "Venus position scan failed.");
    }

    try {
      await updateSource(session, "yield_opportunities", "RUNNING");
      const yieldSnapshot = await options.venus.getYieldOpportunities(session.walletAddress);
      yieldOpportunities = yieldSnapshot.opportunities;
      blockNumber = yieldSnapshot.blockNumber;
      observedAt = yieldSnapshot.observedAt;
      await store.saveEvidence(yieldOpportunities.flatMap((item) => item.evidence));
      coverage.yieldOpportunities = yieldSnapshot.coverage.venusMarkets === "AVAILABLE" ? "AVAILABLE" : yieldSnapshot.coverage.venusMarkets === "PARTIAL" ? "PARTIAL" : "FAILED";
      const assets = new Set(yieldOpportunities.map((item) => item.underlying.address.toLowerCase())).size;
      const detail = `Checked wallet-relevant Venus supply markets. Found ${yieldOpportunities.length} market context${yieldOpportunities.length === 1 ? "" : "s"} across ${assets} asset${assets === 1 ? "" : "s"}. Rates are current base supply APY only.`;
      await updateSource(session, "yield_opportunities", coverage.yieldOpportunities === "AVAILABLE" ? "COMPLETED" : coverage.yieldOpportunities === "PARTIAL" ? "PARTIAL" : "FAILED", detail);
    } catch (error) {
      coverage.yieldOpportunities = "FAILED";
      await updateSource(session, "yield_opportunities", "FAILED", error instanceof Error ? error.message : "Yield opportunity scan failed.");
    }

    try {
      await updateSource(session, "market_context", "RUNNING");
      const grid = await options.marketContext.getWalletMarketContexts(session.walletAddress, positions.map((position) => position.pool));
      gridMarketContexts = grid.contexts;
      await store.saveEvidence(gridMarketContexts.flatMap((item) => item.evidence));
      coverage.marketContext = grid.coverage.configuredMarkets === "AVAILABLE" ? "AVAILABLE" : grid.coverage.configuredMarkets === "PARTIAL" ? "PARTIAL" : "FAILED";
      const usable = gridMarketContexts.filter((item) => item.regime !== "INSUFFICIENT_HISTORY").length;
      const detail = `Checked ${gridMarketContexts.length} supported PancakeSwap V3 market context${gridMarketContexts.length === 1 ? "" : "s"}; ${usable} have sufficient oracle history for a deterministic regime classification.`;
      await updateSource(session, "market_context", coverage.marketContext === "AVAILABLE" ? "COMPLETED" : coverage.marketContext === "PARTIAL" ? "PARTIAL" : "FAILED", detail);
    } catch (error) {
      coverage.marketContext = "FAILED";
      await updateSource(session, "market_context", "FAILED", error instanceof Error ? error.message : "Grid market-context scan failed.");
    }

    const portfolio: SmartMoneyPortfolioSnapshot = {
      portfolioSnapshotId: `portfolio_${idFactory()}`,
      checkSessionId,
      walletAddress: session.walletAddress,
      network: options.chain.network,
      chainId: options.chain.definition.chainId,
      blockNumber,
      observedAt,
      nativeBalance,
      pancakeSwapPositions: positions,
      venusPositions,
      yieldOpportunities,
      gridMarketContexts,
      coverage,
    };
    await store.savePortfolio(portfolio);

    for (const position of positions) {
      const finding = createRebalancingFinding(checkSessionId, position, now(), idFactory);
      await store.saveFinding(finding);
      await publish(checkSessionId, "finding.created", "pancakeswap_positions", { findingId: finding.findingId, category: finding.category, state: finding.state, severity: finding.severity });
    }

    for (const position of venusPositions) {
      const finding = createHealthFinding(checkSessionId, position, now(), idFactory);
      await store.saveFinding(finding);
      await publish(checkSessionId, "finding.created", "venus_positions", { findingId: finding.findingId, category: finding.category, state: finding.state, severity: finding.severity });
    }

    const yieldGroups = new Map<string, YieldOpportunitySnapshot[]>();
    for (const opportunity of yieldOpportunities) {
      const key = opportunity.underlying.address.toLowerCase();
      const existing = yieldGroups.get(key) ?? [];
      existing.push(opportunity);
      yieldGroups.set(key, existing);
    }
    for (const group of yieldGroups.values()) {
      const finding = createYieldFinding(checkSessionId, group, now(), idFactory);
      if (!finding) continue;
      await store.saveFinding(finding);
      await publish(checkSessionId, "finding.created", "yield_opportunities", { findingId: finding.findingId, category: finding.category, state: finding.state, severity: finding.severity });
    }

    for (const context of gridMarketContexts) {
      const finding = createGridFinding(checkSessionId, context, now(), idFactory);
      if (!finding) continue;
      await store.saveFinding(finding);
      await publish(checkSessionId, "finding.created", "market_context", { findingId: finding.findingId, category: finding.category, state: finding.state, severity: finding.severity });
    }

    session.coverage = coverage;
    session.state = coverage.walletAssets === "FAILED" && coverage.pancakeSwapPositions === "FAILED" && coverage.venusPositions === "FAILED" && coverage.yieldOpportunities === "FAILED" && coverage.marketContext === "FAILED" ? "FAILED" : "PARTIAL";
    session.completedAt = now().toISOString();
    session.updatedAt = session.completedAt;
    if (session.state === "FAILED") session.failureReason = "Wallet, PancakeSwap, Venus health, Yield, and Grid market-context source reads all failed.";
    await store.updateSession(session);
    await publish(checkSessionId, session.state === "FAILED" ? "check.failed" : "check.completed", undefined, { state: session.state, findings: (await store.listFindings(checkSessionId)).length });
    return { session, portfolio, findings: await store.listFindings(checkSessionId) };
  }

  return {
    startCheck,
    runCheck,
    async getCheck(checkSessionId) {
      const session = await store.getSession(checkSessionId);
      if (!session) return undefined;
      return { session, portfolio: await store.getPortfolio(checkSessionId), findings: await store.listFindings(checkSessionId) };
    },
    listEvents: (checkSessionId, afterSequence = 0) => store.listEvents(checkSessionId, afterSequence),
    subscribe(checkSessionId, listener) {
      const set = listeners.get(checkSessionId) ?? new Set();
      set.add(listener);
      listeners.set(checkSessionId, set);
      return () => {
        set.delete(listener);
        if (set.size === 0) listeners.delete(checkSessionId);
      };
    },
  };
}
