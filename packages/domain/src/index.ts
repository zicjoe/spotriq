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
}

export interface CheckSession {
  checkSessionId: string;
  walletAddress: string;
  walletControl: WalletControlState;
  state: "CREATED" | "SCANNING" | "PARTIAL" | "COMPLETED" | "FAILED" | "STALE";
  createdAt: string;
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
