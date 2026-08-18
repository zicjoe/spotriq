import type {
  AgentService,
  Finding,
  Activation,
  PermissionGrant,
  ActivityEvent,
  ServiceCategory,
  CheckoutStep,
} from "../domain/types";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

export const SERVICES: AgentService[] = [
  {
    serviceId: "svc-rangekeeper-01", agentId: "agent-rk-01",
    name: "RangeKeeper", slug: "rangekeeper",
    category: "rebalancing",
    description: "Automatically monitors and rebalances concentrated-liquidity PancakeSwap V3 positions when they drift outside the configured range.",
    readiness: "READY", permissionIntensity: "medium",
    pricing: { model: "subscription", amount: "$7", period: "month", protocolCostsNote: "Estimated $1–4 per rebalance in gas + swap fees" },
    supportedProtocols: ["PancakeSwap V3"], supportedPairs: ["BNB/USDT", "ETH/USDT", "CAKE/BNB"],
    capitalMin: "$500", automationMode: "Automatic within limits",
    operator: "RangeOps Labs", erc8004Verified: true,
    evidenceSummary: { marketplaceObserved: "31 jobs completed", externalFeedback: "18 records", testsPassed: 5, readinessScore: "96%" },
    categoryMetrics: { type: "rebalancing", timeInRange: "94%", rebalanceFreq: "1.4×/week avg", rebalanceSuccess: "97%", supportsCL: true, strategyType: "Symmetric range", period: "30d" }
  },
  {
    serviceId: "svc-rangekeeper-02", agentId: "agent-rk-01",
    name: "RangeKeeper Wide", slug: "rangekeeper-wide",
    category: "rebalancing",
    description: "Wide-range rebalancing variant for lower-volatility pairs. Less frequent rebalances, lower gas cost.",
    readiness: "READY", permissionIntensity: "low",
    pricing: { model: "subscription", amount: "$4", period: "month", protocolCostsNote: "Estimated $0.50–2 per rebalance" },
    supportedProtocols: ["PancakeSwap V3"], supportedPairs: ["BNB/USDT", "USDT/USDC"],
    capitalMin: "$200", automationMode: "Automatic within limits",
    operator: "RangeOps Labs", erc8004Verified: true,
    evidenceSummary: { marketplaceObserved: "14 jobs completed", testsPassed: 4, readinessScore: "92%" },
    categoryMetrics: { type: "rebalancing", timeInRange: "88%", rebalanceFreq: "0.7×/week avg", rebalanceSuccess: "100%", supportsCL: true, strategyType: "Wide symmetric", period: "21d" }
  },
  {
    serviceId: "svc-gridpilot-01", agentId: "agent-gp-01",
    name: "GridPilot", slug: "gridpilot",
    category: "grid",
    description: "Executes a configurable arithmetic or geometric grid strategy on supported BSC pairs. Supports stop-loss and adaptive re-grid.",
    readiness: "READY", permissionIntensity: "medium",
    pricing: { model: "subscription", amount: "$9", period: "month", performanceFee: "5% of net P&L", protocolCostsNote: "~$0.20–0.50 per fill in trading fees + gas" },
    supportedProtocols: ["PancakeSwap V2", "PancakeSwap V3"], supportedPairs: ["BNB/USDT", "ETH/USDT", "BTC/USDT"],
    capitalMin: "$300", automationMode: "Automatic within capital limits",
    operator: "GridPilot Systems", erc8004Verified: true,
    evidenceSummary: { marketplaceObserved: "22 jobs completed", externalFeedback: "9 records", operatorClaimed: "12-month strategy report", testsPassed: 5, readinessScore: "98%" },
    categoryMetrics: { type: "grid", netPnL: "+$142.30", maxDrawdown: "-8.4%", fills: 187, runtime: "47 days", marketRegime: "Range-bound", gridType: "Arithmetic", stopLoss: true, adaptiveReGrid: true, period: "47d observed" }
  },
  {
    serviceId: "svc-yieldpilot-01", agentId: "agent-yp-01",
    name: "YieldPilot", slug: "yieldpilot",
    category: "yield",
    description: "Compares supported USDT yield opportunities across PancakeSwap and Venus and may reallocate capital when a materially better eligible strategy is available.",
    readiness: "LIMITED", readinessNote: "One opportunity source temporarily unavailable. 3 of 4 sources active.",
    permissionIntensity: "medium",
    pricing: { model: "subscription", amount: "$5", period: "month", performanceFee: "2% of net yield", protocolCostsNote: "Protocol deposit/withdrawal gas estimated $0.80–2.50 per reallocation" },
    supportedProtocols: ["PancakeSwap", "Venus"], supportedAssets: ["USDT", "USDC"],
    capitalMin: "$100", automationMode: "Automatic within configured capital limits",
    operator: "YieldPilot Inc.", erc8004Verified: true,
    evidenceSummary: { marketplaceObserved: "31 allocation checks", externalFeedback: "42 records", operatorClaimed: "Historical strategy report", testsPassed: 4, readinessScore: "88%" },
    categoryMetrics: { type: "yield", currentRate: "8.4%", estimatedNet: "7.1%", observedRealised: "7.6%", riskBand: "Moderate", liquidityNote: "Anytime withdrawal on active strategies", autoReallocation: true, period: "30d", rewardComp: "USDT interest + CAKE rewards" }
  },
  {
    serviceId: "svc-venusguard-01", agentId: "agent-vg-01",
    name: "VenusGuard", slug: "venusguard",
    category: "health",
    description: "Continuously monitors Venus Protocol borrowing positions. Provides real-time alerts, recommended actions, and optional automatic protective intervention.",
    readiness: "READY", permissionIntensity: "low",
    pricing: { model: "subscription", amount: "$4", period: "month", protocolCostsNote: "Auto-intervention gas estimated $1–5 per action" },
    supportedProtocols: ["Venus Protocol"], supportedAssets: ["BNB", "USDT", "ETH", "BTC"],
    capitalMin: undefined, automationMode: "Alert + optional automatic intervention",
    operator: "Guardian Finance", erc8004Verified: true,
    evidenceSummary: { marketplaceObserved: "24 monitoring sessions, 0 missed events", externalFeedback: "31 records", testsPassed: 5, readinessScore: "99%" },
    categoryMetrics: { type: "health", monitoringInterval: "Every 60s", detectionLatency: "<90s avg", reliability: "99.7%", protectionModes: ["Alert only", "Recommend actions", "Automatic intervention"], interventions: ["Add collateral", "Partial repayment", "Collateral swap"], alertSupport: true, period: "90d" }
  },
  {
    serviceId: "svc-gridpilot-02", agentId: "agent-gp-01",
    name: "GridPilot Conservative", slug: "gridpilot-conservative",
    category: "grid",
    description: "Conservative grid variant with tighter stop-loss, lower grid count, and mandatory approval before each fill batch.",
    readiness: "TESTNET_ONLY", readinessNote: "Mainnet deployment in progress. Testnet results available.",
    permissionIntensity: "low",
    pricing: { model: "subscription", amount: "$6", period: "month", protocolCostsNote: "~$0.15–0.30 per fill" },
    supportedProtocols: ["PancakeSwap V2"], supportedPairs: ["BNB/USDT"],
    capitalMin: "$150", automationMode: "Approve each fill batch",
    operator: "GridPilot Systems", erc8004Verified: true,
    evidenceSummary: { marketplaceObserved: "Testnet only — 8 testnet jobs", testsPassed: 3, readinessScore: "Testnet" },
    categoryMetrics: { type: "grid", netPnL: "Insufficient evidence", maxDrawdown: "Insufficient evidence", fills: 0, runtime: "Testnet only", marketRegime: "N/A", gridType: "Arithmetic tight", stopLoss: true, adaptiveReGrid: false, period: "Testnet" }
  }
];

export const FINDINGS: Finding[] = [
  {
    findingId: "fnd-001", category: "rebalancing", state: "needs-attention", severity: "attention",
    headline: "Your BNB/USDT LP is outside its active range.",
    summary: "The current BNB price has moved below the position's lower range boundary. The position is not earning fees and is fully composed of BNB.",
    confidence: "high", freshness: "18 sec ago",
    primaryAction: { label: "Find Rebalancing Agents" }, targetRoute: "explore",
    keyValues: [
      { label: "Current price", value: "$218.40" },
      { label: "Active range", value: "$225 – $285" },
      { label: "Position value", value: "~$4,200" },
      { label: "Protocol", value: "PancakeSwap V3" },
    ],
    whatCouldAgentDo: "A rebalancing agent can monitor this position and automatically rebalance when triggered, setting a new range centered on the current price — resuming fee earnings.",
    uncertainties: "Unclaimed fees require on-chain query; value shown is estimated."
  },
  {
    findingId: "fnd-002", category: "yield", state: "opportunity", severity: "opportunity",
    headline: "2,750 USDT not in a supported yield position.",
    summary: "We detected 2,750 USDT in your wallet that is not currently deployed in any supported yield strategy we can check.",
    confidence: "high", freshness: "22 sec ago",
    primaryAction: { label: "Find Yield Agents" }, targetRoute: "explore",
    keyValues: [
      { label: "Asset", value: "2,750 USDT" },
      { label: "Eligible rate range", value: "6.8% – 9.1%" },
      { label: "Supported opportunities", value: "4 found" },
      { label: "Status", value: "Not deployed in supported strategy" },
    ],
    whatCouldAgentDo: "A yield agent can compare current eligible rates, select the most appropriate strategy for your risk and liquidity preferences, and reallocate automatically when better options become available.",
    uncertainties: "We cannot determine your intent for this USDT. It may be reserved for other purposes."
  },
  {
    findingId: "fnd-003", category: "grid", state: "opportunity", severity: "opportunity",
    headline: "BNB/USDT has shown range-bound behavior over 7 days.",
    summary: "Recent price action shows consolidation between $210–$235. This pattern is often compatible with grid strategies, though no guarantee of future behavior.",
    confidence: "medium", freshness: "45 sec ago",
    primaryAction: { label: "Compare Grid Strategies" }, targetRoute: "explore",
    keyValues: [
      { label: "Pair", value: "BNB/USDT" },
      { label: "7-day range", value: "$210 – $235" },
      { label: "Regime confidence", value: "Medium" },
      { label: "Compatible services", value: "2 found" },
    ],
    whatCouldAgentDo: "A grid agent can place automated buy and sell orders across a configured price range, capturing the spread on each oscillation.",
    uncertainties: "Market regime classification is based on 7-day observation only. Regime can change."
  },
  {
    findingId: "fnd-004", category: "health", state: "needs-attention", severity: "attention",
    headline: "Venus borrowing position health factor: 1.42 (watch state).",
    summary: "Your Venus lending position has a health factor of 1.42. While not immediately at risk, this is below the 1.5 watch threshold and warrants monitoring.",
    confidence: "high", freshness: "12 sec ago",
    primaryAction: { label: "Review Protection Agents" }, targetRoute: "explore",
    keyValues: [
      { label: "Health factor", value: "1.42" },
      { label: "Collateral", value: "BNB (~$6,100)" },
      { label: "Debt", value: "USDT ($3,900)" },
      { label: "Liquidation at", value: "HF < 1.00" },
    ],
    whatCouldAgentDo: "A health monitoring agent can watch this position every 60 seconds, alert you to changes, and optionally add collateral or partially repay debt automatically if the health factor approaches a configured threshold.",
    uncertainties: "Oracle freshness: 4 min ago. Safety-critical data — we always show freshness."
  },
];

export const ACTIVATIONS: Activation[] = [
  {
    activationId: "act-001", serviceId: "svc-rangekeeper-01", agentId: "agent-rk-01",
    serviceName: "RangeKeeper", category: "rebalancing", state: "ACTIVE",
    startedAt: "12 days ago", permissionGrantId: "pg-001",
    managedPosition: "BNB/USDT LP", protocol: "PancakeSwap V3",
    currentState: "In range", lastAction: "Rebalanced position",
    lastActionAt: "2 hours ago", authorityUsedToday: "$67", authorityDailyLimit: "$200",
    categorySnapshot: { "Time in range (30d)": "94%", "Rebalances (12d)": "3", "Last range": "$215 – $245" }
  }
];

export const PERMISSION_GRANTS: PermissionGrant[] = [
  {
    permissionGrantId: "pg-001", activationId: "act-001",
    serviceId: "svc-rangekeeper-01", serviceName: "RangeKeeper",
    wallet: "0x7F3a...9c2d", provider: "Altana",
    protocols: ["PancakeSwap V3"], assets: ["BNB", "USDT"],
    dailyLimit: "$200", totalLimit: "$1,000",
    usedToday: "$67", expiry: "5 days remaining",
    state: "ACTIVE", transferCapability: false, withdrawalCapability: false
  }
];

export const ACTIVITY_EVENTS: ActivityEvent[] = [
  { id: "ev-001", activationId: "act-001", eventType: "rebalance", severity: "success", title: "RangeKeeper rebalanced BNB/USDT", description: "Position moved from $208–$238 to $213–$243. New range set based on current price $228.", occurredAt: "2h ago", transactionHash: "0xabc...123", cost: "$1.24" },
  { id: "ev-002", activationId: "act-001", eventType: "check", severity: "info", title: "RangeKeeper checked position", description: "Position in range. No action required. Time in range: 94%.", occurredAt: "3h ago" },
  { id: "ev-003", activationId: "act-001", eventType: "check", severity: "info", title: "RangeKeeper checked position", description: "Position in range. Current price $226. No action taken.", occurredAt: "5h ago" },
  { id: "ev-004", activationId: "act-001", eventType: "check", severity: "info", title: "RangeKeeper checked position", description: "Position in range. No action required.", occurredAt: "8h ago" },
  { id: "ev-005", activationId: "act-001", eventType: "rebalance", severity: "success", title: "RangeKeeper rebalanced BNB/USDT", description: "Position drifted outside lower boundary. Rebalanced to $205–$235.", occurredAt: "3 days ago", transactionHash: "0xdef...456", cost: "$1.18" },
];

export const PLAN_TEMPLATES = [
  { planId: "plan-earn-protect", name: "Earn & Protect", goal: "Earn on eligible capital while monitoring borrowing risk.", categories: ["yield", "health"] as ServiceCategory[], description: "YieldPilot optimises supported yield opportunities while VenusGuard monitors your borrowing position health.", estimatedCost: "$9/month", authorityLevel: "Medium (YieldPilot) + Low (VenusGuard)" },
  { planId: "plan-lp-autopilot", name: "LP Autopilot", goal: "Keep a liquidity position working and earning.", categories: ["rebalancing", "yield"] as ServiceCategory[], description: "RangeKeeper manages your LP range while YieldPilot puts additional capital to work.", estimatedCost: "$12/month", authorityLevel: "Medium (both services)" },
  { planId: "plan-managed-defi", name: "Managed DeFi Position", goal: "Full oversight of LP, idle capital, and borrowing risk.", categories: ["rebalancing", "yield", "health"] as ServiceCategory[], description: "Three specialists covering rebalancing, yield optimisation, and health monitoring — all with independent authority.", estimatedCost: "$16/month", authorityLevel: "Medium + Medium + Low" },
];

export const CHECKOUT_STEPS: CheckoutStep[] = ["job", "authority", "limits", "cost", "risk", "review", "success"];
export const CHECKOUT_STEP_LABELS = { job: "Job", authority: "Authority", limits: "Limits", cost: "Cost", risk: "Risk", review: "Review", success: "Done" };

