export type Route =
  | "home" | "explore" | "check" | "agent" | "compare"
  | "try" | "checkout" | "my-agents" | "plans" | "plan-profile"
  | "outcomes" | "authority" | "activity-page" | "operator";

export type CheckPhase = "start" | "scan" | "results";
export type ExploreCategory = "all" | "rebalancing" | "grid" | "yield" | "health";
export type MyAgentsTab = "overview" | "agents" | "plans" | "activity" | "authority" | "outcomes";
export type AgentProfileTab = "overview" | "strategy" | "performance" | "evidence" | "permissions" | "tests" | "reviews";
export type CheckoutStep = "job" | "authority" | "limits" | "cost" | "risk" | "review" | "success";
export type ServiceCategory = "rebalancing" | "grid" | "yield" | "health";
export type ReadinessState = "READY" | "LIMITED" | "DEGRADED" | "OFFLINE" | "TESTNET_ONLY" | "SUSPENDED";
export type PermissionIntensity = "read-only" | "low" | "medium" | "high";
export type FindingState = "needs-attention" | "opportunity" | "healthy" | "informational" | "could-not-assess";
export type FindingSeverity = "info" | "opportunity" | "attention" | "urgent";
export type ActivationState = "ACTIVE" | "PAUSED" | "FAILED" | "PENDING" | "TERMINATED" | "ACTION_REQUIRED";
export type PermissionGrantState =
  | "PENDING" | "ACTIVE" | "NEAR_LIMIT" | "EXHAUSTED" | "EXPIRING"
  | "EXPIRED" | "REVOKED" | "REVOCATION_PENDING" | "PROVIDER_ERROR";
export type EvidenceProvenance = "marketplace-observed" | "marketplace-derived" | "external" | "operator-claimed";
export type AsyncOperationState =
  | "IDLE" | "QUEUED" | "RUNNING" | "PARTIAL" | "AWAITING_USER_ACTION"
  | "AWAITING_WALLET" | "AWAITING_CHAIN_CONFIRMATION" | "COMPLETED"
  | "FAILED" | "CANCELLED" | "EXPIRED";
export type TransactionState =
  | "PREPARED" | "AWAITING_SIGNATURE" | "SUBMITTED" | "INCLUDED"
  | "CONFIRMED" | "FINALIZED" | "FAILED" | "REVERTED" | "CANCELLED";
export type OutcomeState = "COLLECTING" | "MEASURED" | "FINALIZED" | "INSUFFICIENT_DATA" | "CONFOUNDED" | "INVALIDATED";
export type WalletControlState = "WATCH_ONLY" | "CONNECTED" | "VERIFIED_CONTROL";

export interface NavState {
  route: Route;
  agentId?: string;
  findingId?: string;
  compareIds?: string[];
  checkPhase?: CheckPhase;
  checkoutStep?: CheckoutStep;
  myAgentsTab?: MyAgentsTab;
  agentProfileTab?: AgentProfileTab;
  planId?: string;
  exploreCategory?: ExploreCategory;
  activationId?: string;
  fromFinding?: string;
}

export interface AgentOperator {
  operatorId: string;
  displayName: string;
  status: "ACTIVE" | "LIMITED" | "SUSPENDED";
}

export interface AgentIdentity {
  agentId: string;
  network: "BSC";
  registry: "ERC-8004" | "MARKETPLACE_REFERENCE";
  identifier: string;
  owner?: string;
  operatorId: string;
  registrationStatus: "DISCOVERED" | "CLAIMED" | "VERIFIED";
}

export interface AgentListing {
  listingId: string;
  agentId: string;
  slug: string;
  name: string;
  shortDescription: string;
  categoryTags: ServiceCategory[];
  status: "DISCOVERED" | "CLAIMED" | "SUBMITTED" | "TESTING" | "READY" | "ACTIVE" | "DEGRADED" | "PAUSED" | "SUSPENDED" | "RETIRED";
}

export interface RebalancingMetrics { type: "rebalancing"; timeInRange: string; rebalanceFreq: string; rebalanceSuccess: string; supportsCL: boolean; strategyType: string; period: string; }
export interface GridMetrics { type: "grid"; netPnL: string; maxDrawdown: string; fills: number; runtime: string; marketRegime: string; gridType: string; stopLoss: boolean; adaptiveReGrid: boolean; period: string; }
export interface YieldMetrics { type: "yield"; currentRate: string; estimatedNet: string; observedRealised?: string; riskBand: string; liquidityNote: string; autoReallocation: boolean; period?: string; rewardComp: string; }
export interface HealthMetrics { type: "health"; monitoringInterval: string; detectionLatency: string; reliability: string; protectionModes: string[]; interventions: string[]; alertSupport: boolean; period: string; }

export interface AgentService {
  serviceId: string;
  agentId: string;
  name: string;
  slug: string;
  category: ServiceCategory;
  description: string;
  readiness: ReadinessState;
  readinessNote?: string;
  permissionIntensity: PermissionIntensity;
  pricing: { model: string; amount: string; period?: string; performanceFee?: string; protocolCostsNote: string; };
  supportedProtocols: string[];
  supportedAssets?: string[];
  supportedPairs?: string[];
  capitalMin?: string;
  automationMode: string;
  evidenceSummary: {
    marketplaceObserved: string;
    externalFeedback?: string;
    operatorClaimed?: string;
    testsPassed: number;
    readinessScore?: string;
  };
  categoryMetrics: RebalancingMetrics | GridMetrics | YieldMetrics | HealthMetrics;
  operator: string;
  erc8004Verified: boolean;
}

export interface PricingModel {
  pricingId: string;
  serviceId: string;
  model: "FREE" | "PER_TASK" | "SUBSCRIPTION" | "PERFORMANCE" | "HYBRID";
  amount?: string;
  period?: string;
  performanceFee?: string;
}

export interface PermissionProfile {
  permissionProfileId: string;
  serviceId: string;
  protocols: string[];
  assets: string[];
  executionMode: "READ_ONLY" | "RECOMMEND" | "AUTOMATIC_WITH_LIMITS";
}

export interface ReadinessSnapshot {
  readinessSnapshotId: string;
  serviceId: string;
  state: ReadinessState;
  checkedAt: string;
  reasons: string[];
}

export interface EvidenceRecord {
  evidenceId: string;
  subjectType: string;
  subjectId: string;
  metric: string;
  value: string | number;
  unit?: string;
  provenance: EvidenceProvenance;
  sourceName: string;
  observedAt: string;
  confidence?: "high" | "medium" | "low" | "unavailable";
  methodVersion?: string;
  period?: string;
  sampleSize?: number;
  limitation?: string;
}

export interface Finding {
  findingId: string;
  checkSessionId?: string;
  category: ServiceCategory;
  state: FindingState;
  severity: FindingSeverity;
  headline: string;
  summary: string;
  confidence: "high" | "medium" | "low";
  freshness: string;
  primaryAction: { label: string };
  targetRoute: Route;
  keyValues: { label: string; value: string; note?: string }[];
  whatCouldAgentDo: string;
  uncertainties?: string;
  subject?: Record<string, unknown>;
  evidenceIds?: string[];
  methodVersion?: string;
  generatedAt?: string;
  expiresAt?: string;
}

export type CheckSourceKey =
  | "wallet_assets"
  | "pancakeswap_positions"
  | "venus_positions"
  | "market_context"
  | "agent_compatibility";

export type CheckSourceState =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED"
  | "NOT_SUPPORTED";

export interface CheckSourceProgress {
  key: CheckSourceKey;
  label: string;
  state: CheckSourceState;
  detail?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface SmartMoneyCheckCoverage {
  walletAssets: "AVAILABLE" | "PARTIAL" | "FAILED";
  pancakeSwapPositions: "AVAILABLE" | "PARTIAL" | "FAILED";
  venusPositions: "NOT_SUPPORTED" | "AVAILABLE" | "PARTIAL" | "FAILED";
  marketContext: "NOT_SUPPORTED" | "AVAILABLE" | "PARTIAL" | "FAILED";
  agentCompatibility: "NOT_SUPPORTED" | "AVAILABLE" | "PARTIAL" | "FAILED";
  notes: string[];
}

export interface SmartMoneyPortfolioSnapshot {
  portfolioSnapshotId: string;
  checkSessionId: string;
  walletAddress: string;
  network: BscNetwork;
  chainId: number;
  blockNumber: string;
  observedAt: string;
  nativeBalance?: NativeBalanceSnapshot;
  pancakeSwapPositions: PancakeSwapClPositionSnapshot[];
  coverage: SmartMoneyCheckCoverage;
}

export interface CheckSession {
  checkSessionId: string;
  walletAddress: string;
  walletControl: WalletControlState;
  state: "CREATED" | "SCANNING" | "PARTIAL" | "COMPLETED" | "FAILED" | "STALE";
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  failureReason?: string;
  sourceProgress?: CheckSourceProgress[];
  coverage?: SmartMoneyCheckCoverage;
}

export type SmartMoneyCheckEventType =
  | "check.created"
  | "check.started"
  | "check.source.started"
  | "check.source.completed"
  | "check.source.partial"
  | "check.source.failed"
  | "finding.created"
  | "check.completed"
  | "check.failed";

export interface SmartMoneyCheckEvent {
  eventId: string;
  checkSessionId: string;
  sequence: number;
  type: SmartMoneyCheckEventType;
  occurredAt: string;
  source?: CheckSourceKey;
  data?: Record<string, unknown>;
}

export interface RecommendationCandidate {
  recommendationCandidateId: string;
  serviceId: string;
  eligibilityStatus: "ELIGIBLE" | "INELIGIBLE";
  rank?: number;
  highlightLabel?: "Best Fit" | "Lower Authority" | "Lower Cost" | "Strongest Evidence";
  matchReasons: string[];
  tradeoffs: string[];
  failedConstraints: string[];
}

export interface PermissionRequest {
  permissionRequestId: string;
  checkoutId: string;
  serviceId: string;
  protocols: string[];
  assets: string[];
  dailyLimit?: string;
  totalLimit?: string;
  expiresAt?: string;
  status: "DRAFT" | "READY" | "AWAITING_WALLET" | "SUBMITTED" | "CONFIRMED" | "REJECTED" | "FAILED";
}

export interface Activation {
  activationId: string;
  serviceId: string;
  agentId: string;
  serviceName: string;
  category: ServiceCategory;
  state: ActivationState;
  startedAt: string;
  permissionGrantId: string;
  managedPosition: string;
  protocol: string;
  currentState: string;
  lastAction: string;
  lastActionAt: string;
  authorityUsedToday: string;
  authorityDailyLimit: string;
  categorySnapshot: Record<string, string>;
}

export interface PermissionGrant {
  permissionGrantId: string;
  activationId: string;
  serviceId: string;
  serviceName: string;
  wallet: string;
  provider: string;
  protocols: string[];
  assets: string[];
  dailyLimit: string;
  totalLimit: string;
  usedToday: string;
  expiry: string;
  state: PermissionGrantState;
  transferCapability: boolean;
  withdrawalCapability: boolean;
}

export interface AgentAction {
  agentActionId: string;
  activationId: string;
  actionType: string;
  status: "PROPOSED" | "AUTHORIZED" | "EXECUTING" | "COMPLETED" | "FAILED";
  createdAt: string;
  transactionId?: string;
}

export interface TransactionRecord {
  transactionId: string;
  activationId: string;
  agentActionId: string;
  chain: "BSC";
  hash?: string;
  state: TransactionState;
  submittedAt?: string;
  confirmedAt?: string;
}

export interface OutcomeMetric {
  outcomeMetricId: string;
  activationId: string;
  metric: string;
  value: string | number;
  unit?: string;
  attribution: "DIRECT" | "OBSERVED" | "DERIVED" | "COUNTERFACTUAL";
  evidenceIds: string[];
}

export interface OutcomeWindow {
  outcomeWindowId: string;
  activationId: string;
  state: OutcomeState;
  startedAt: string;
  endedAt?: string;
  metrics: OutcomeMetric[];
}

export interface ActivityEvent {
  id: string;
  activationId: string;
  eventType: string;
  severity: "info" | "success" | "warning" | "error";
  title: string;
  description: string;
  occurredAt: string;
  transactionHash?: string;
  cost?: string;
}

export interface SmartMoneyPlanTemplate {
  planId: string;
  name: string;
  goal: string;
  categories: ServiceCategory[];
  description: string;
  estimatedCost: string;
  authorityLevel: string;
}

export type SpotriqEnvironment = "development" | "staging" | "production";
export type BscNetwork = "testnet" | "mainnet";
export type DependencyHealthState = "ok" | "degraded" | "not_configured" | "unavailable";

export interface DependencyHealth {
  name: string;
  state: DependencyHealthState;
  latencyMs?: number;
  detail?: string;
}

export type TruthLayer =
  | "CANONICAL_ONCHAIN"
  | "PROTOCOL_STATE"
  | "EXTERNAL_INDEXED"
  | "OPERATOR_SUPPLIED"
  | "MARKETPLACE_OBSERVED"
  | "MARKETPLACE_DERIVED"
  | "AI_EXPLANATION";

export type FreshnessState = "FRESH" | "AGING" | "STALE" | "UNAVAILABLE";
export type EvidenceAvailabilityState = "AVAILABLE" | "STALE" | "PARTIAL" | "INSUFFICIENT_HISTORY" | "SOURCE_UNAVAILABLE" | "NOT_APPLICABLE" | "NOT_SUPPORTED";
export type ChainFinalityState = "LATEST" | "CONFIRMED" | "FINALIZED";

export interface FreshnessPolicy {
  metric: string;
  targetAgeSeconds: number;
  warnAgeSeconds: number;
  hardExpirySeconds: number;
}

export interface FreshnessAssessment extends FreshnessPolicy {
  state: FreshnessState;
  ageSeconds: number;
}

export interface DataSourceDefinition {
  sourceId: string;
  name: string;
  truthLayer: TruthLayer;
  provider?: string;
  chain?: "BSC";
  networks?: readonly BscNetwork[];
  description: string;
}

export interface EvidenceMethodDefinition {
  methodId: string;
  version: string;
  name: string;
  description: string;
  inputMetrics: readonly string[];
}

export interface ChainEvidenceContext {
  chain: "BSC";
  network: BscNetwork;
  chainId: number;
  blockNumber?: string;
  blockHash?: string;
  transactionHash?: string;
  finality?: ChainFinalityState;
}

export interface EvidenceEnvelope extends EvidenceRecord {
  sourceId: string;
  truthLayer: TruthLayer;
  sourceRef?: string;
  effectiveAt?: string;
  freshnessAssessment: FreshnessAssessment;
  availability: EvidenceAvailabilityState;
  chainContext?: ChainEvidenceContext;
  methodInputs?: string[];
}

export interface EvidenceConflict {
  conflictId: string;
  subjectType: string;
  subjectId: string;
  metric: string;
  evidenceIds: string[];
  detectedAt: string;
  description: string;
}

export interface BscNetworkDefinition {
  network: BscNetwork;
  chainId: 56 | 97;
  nativeSymbol: "BNB" | "tBNB";
  explorerUrl: string;
  defaultRpcUrls: [string, string];
}

export interface BscBlockSummary {
  network: BscNetwork;
  chainId: number;
  number: string;
  hash: string;
  parentHash: string;
  timestamp: string;
}

export interface BscTransactionSummary {
  network: BscNetwork;
  chainId: number;
  hash: string;
  blockNumber?: string;
  blockHash?: string;
  from: string;
  to?: string;
  valueRaw: string;
  input: string;
  transactionIndex?: number;
}

export interface BscTransactionReceiptSummary {
  network: BscNetwork;
  chainId: number;
  transactionHash: string;
  blockNumber: string;
  blockHash: string;
  status: "SUCCESS" | "REVERTED";
  gasUsedRaw: string;
  effectiveGasPriceRaw?: string;
}

export interface NativeBalanceSnapshot {
  assetType: "native";
  chain: "BSC";
  network: BscNetwork;
  chainId: number;
  symbol: "BNB" | "tBNB";
  decimals: 18;
  balanceRaw: string;
  balanceFormatted: string;
  walletAddress: string;
  blockNumber: string;
  observedAt: string;
  evidence: EvidenceEnvelope;
}

export interface Erc20BalanceSnapshot {
  assetType: "erc20";
  chain: "BSC";
  network: BscNetwork;
  chainId: number;
  tokenAddress: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  balanceRaw: string;
  balanceFormatted?: string;
  walletAddress: string;
  blockNumber: string;
  observedAt: string;
  evidence: EvidenceEnvelope;
}

export interface WalletBalanceSnapshot {
  walletAddress: string;
  chain: "BSC";
  network: BscNetwork;
  chainId: number;
  blockNumber: string;
  observedAt: string;
  native: NativeBalanceSnapshot;
  tokens: Erc20BalanceSnapshot[];
  coverage: {
    nativeBalance: "AVAILABLE";
    tokenBalances: "AVAILABLE" | "NOT_REQUESTED" | "PARTIAL";
    failedTokenAddresses: string[];
  };
}

export type PancakeSwapProtocolVersion = "V3" | "INFINITY_CL";
export type LiquidityRangeState =
  | "IN_RANGE"
  | "NEAR_LOWER"
  | "NEAR_UPPER"
  | "OUT_OF_RANGE_BELOW"
  | "OUT_OF_RANGE_ABOVE"
  | "NO_LIQUIDITY";

export interface ProtocolTokenMetadata {
  address: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  isNative: boolean;
}

export interface PancakeSwapContractSet {
  network: BscNetwork;
  v3Factory: string;
  v3PositionManager: string;
  infinityClPoolManager: string;
  infinityClPositionManager: string;
  infinityVault: string;
}

export interface PancakeSwapClPoolSnapshot {
  protocol: "PancakeSwap";
  version: PancakeSwapProtocolVersion;
  network: BscNetwork;
  chainId: number;
  poolAddress?: string;
  poolId?: string;
  token0: ProtocolTokenMetadata;
  token1: ProtocolTokenMetadata;
  hooks?: string;
  feePips: number;
  currentLpFeePips?: number;
  protocolFeePips?: number;
  tickSpacing: number;
  currentTick: number;
  sqrtPriceX96: string;
  liquidityRaw: string;
  currentPriceToken0InToken1?: string;
  blockNumber: string;
  observedAt: string;
  evidence: EvidenceEnvelope[];
}

export interface PancakeSwapClPositionSnapshot {
  protocol: "PancakeSwap";
  version: PancakeSwapProtocolVersion;
  network: BscNetwork;
  chainId: number;
  positionManager: string;
  tokenId: string;
  owner: string;
  pool: PancakeSwapClPoolSnapshot;
  tickLower: number;
  tickUpper: number;
  liquidityRaw: string;
  rangeState: LiquidityRangeState;
  distanceToLowerTicks?: number;
  distanceToUpperTicks?: number;
  recordedTokensOwed0Raw?: string;
  recordedTokensOwed1Raw?: string;
  feeGrowthInside0LastX128?: string;
  feeGrowthInside1LastX128?: string;
  blockNumber: string;
  observedAt: string;
  evidence: EvidenceEnvelope[];
  coverage: {
    ownership: "AVAILABLE";
    poolState: "AVAILABLE";
    tokenMetadata: "AVAILABLE" | "PARTIAL";
    fees: "RECORDED_ONLY" | "NOT_SUPPORTED";
    valuation: "NOT_SUPPORTED";
  };
}

export interface PancakeSwapWalletPositionsSnapshot {
  walletAddress: string;
  network: BscNetwork;
  chainId: number;
  blockNumber: string;
  observedAt: string;
  positions: PancakeSwapClPositionSnapshot[];
  coverage: {
    v3Discovery: "AVAILABLE" | "PARTIAL";
    infinityClDiscovery: "TOKEN_ID_REQUIRED";
    failedV3PositionRefs: string[];
    truncated: boolean;
    maxPositions: number;
  };
}
