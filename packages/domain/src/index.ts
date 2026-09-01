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
export type PermissionIntensity = "read-only" | "low" | "medium" | "high" | "unknown";
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
  jobIntentId?: string;
  executionId?: string;
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
  categoryMetrics?: RebalancingMetrics | GridMetrics | YieldMetrics | HealthMetrics;
  operator: string;
  erc8004Verified: boolean;
  origin?: "REFERENCE" | "ERC8004";
  listingId?: string;
  marketplaceActivationEligible?: boolean;
  runtimeEndpoints?: ServiceRuntimeEndpoint[];
  readinessSnapshotId?: string;
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
  executionMode: "UNDECLARED" | "READ_ONLY" | "RECOMMEND" | "AUTOMATIC_WITH_LIMITS";
  declarationState?: "UNDECLARED" | "DECLARED";
  intensity?: PermissionIntensity;
  provenance?: EvidenceProvenance;
}

export type ReadinessCheckState = "PASS" | "WARN" | "FAIL" | "UNKNOWN";

export interface ServiceRuntimeEndpoint {
  name: string;
  endpoint: string;
  version?: string;
  interactionKind: "A2A" | "MCP" | "WEB" | "OTHER";
  machineCallable: boolean;
  provenance: "operator-claimed";
}

export interface AgentCapabilityClaim {
  capabilityClaimId: string;
  serviceId: string;
  category: ServiceCategory;
  claim: string;
  confidence: "high" | "medium" | "low";
  provenance: "operator-claimed";
  basis: string[];
  note: string;
}

export type CommercialServiceType = "READ_ONLY_SERVICE" | "TASK_SERVICE" | "MONITORING_SERVICE" | "FINANCIAL_EXECUTION_SERVICE";
export type CommercialPaymentRail = "FREE" | "ERC8183" | "X402" | "B402";
export type CommercialAvailability = "AVAILABLE" | "PAUSED" | "UNAVAILABLE";

export interface CommercialOfferTerms {
  termsVersion: string;
  commercialModel: PricingModel["model"];
  serviceType: CommercialServiceType;
  price: {
    amount: string;
    currency: string;
    tokenAddress?: string;
    amountRaw?: string;
    decimals?: number;
  };
  network: "BSC";
  chainId: AgentRegistryChainId;
  paymentRail: CommercialPaymentRail;
  payment?: {
    contractAddress?: string;
    providerAddress?: string;
  };
  scope: {
    summary: string;
    protocols: string[];
    financialAuthorityRequired: boolean;
    walletSigningRequired: boolean;
  };
  availability: CommercialAvailability;
  quoteValiditySeconds: number;
}

export interface ServiceOffer {
  offerId: string;
  serviceId: string;
  state: "UNDECLARED" | "AVAILABLE" | "UNAVAILABLE";
  pricing?: PricingModel;
  terms?: CommercialOfferTerms;
  source: "operator-claimed" | "marketplace-observed";
  note: string;
}

export type CommercialQuoteState = "OPEN" | "EXPIRED";
export interface CommercialQuote {
  quoteId: string;
  offerId: string;
  serviceId: string;
  buyerAddress: string;
  buyerChainId: AgentRegistryChainId;
  state: CommercialQuoteState;
  termsSnapshot: CommercialOfferTerms;
  termsHash: string;
  idempotencyKey: string;
  quotedAt: string;
  expiresAt: string;
  methodVersion: string;
  evidence: EvidenceEnvelope[];
  limitations: string[];
}

export type CommercialHireState = "AWAITING_PAYMENT" | "AWAITING_PERMISSION" | "READY_TO_ACTIVATE" | "ACTIVATED" | "CANCELLED";
export interface CommercialHire {
  hireId: string;
  quoteId: string;
  offerId: string;
  serviceId: string;
  buyerAddress: string;
  buyerChainId: AgentRegistryChainId;
  state: CommercialHireState;
  termsHash: string;
  paymentRequired: boolean;
  permissionRequired: boolean;
  paymentEvidenceId?: string;
  activationId?: string;
  idempotencyKey: string;
  acceptedAt: string;
  updatedAt: string;
  methodVersion: string;
  limitations: string[];
}

export type CommercialPaymentEvidenceState = "NOT_REQUIRED" | "PENDING" | "VERIFIED" | "MISMATCH" | "FAILED";
export interface Erc8183PaymentObservation {
  chainId: AgentRegistryChainId;
  contractAddress: string;
  jobId: string;
  client: string;
  provider: string;
  evaluator: string;
  description: string;
  budgetRaw: string;
  paymentToken: string;
  expiredAtUnix: string;
  status: "OPEN" | "FUNDED" | "SUBMITTED" | "COMPLETED" | "REJECTED" | "EXPIRED";
  fundingSatisfied: boolean;
  settlementObserved: boolean;
  blockNumber: string;
}

export interface CommercialPaymentEvidence {
  paymentEvidenceId: string;
  hireId: string;
  serviceId: string;
  buyerAddress: string;
  requirement: "NOT_REQUIRED" | "REQUIRED";
  state: CommercialPaymentEvidenceState;
  rail: CommercialPaymentRail;
  chainId: AgentRegistryChainId;
  amount: string;
  currency: string;
  tokenAddress?: string;
  providerRef?: string;
  observation?: Erc8183PaymentObservation;
  observedAt: string;
  methodVersion: string;
  provenance: EvidenceProvenance;
  evidence: EvidenceEnvelope[];
  limitations: string[];
}

export type MarketplaceActivationState = "ACTIVE" | "SUSPENDED" | "REVOKED" | "ENDED";
export interface MarketplaceActivation {
  activationId: string;
  hireId: string;
  quoteId: string;
  serviceId: string;
  buyerAddress: string;
  buyerChainId: AgentRegistryChainId;
  serviceChainId: AgentRegistryChainId;
  state: MarketplaceActivationState;
  activationKind: "READ_ONLY_SERVICE_RELATIONSHIP" | "FINANCIAL_SERVICE_RELATIONSHIP";
  termsSnapshot: CommercialOfferTerms;
  termsHash: string;
  paymentRequired: boolean;
  paymentEvidenceId?: string;
  permissionRequired: boolean;
  permissionGrantId?: string;
  walletSigningAuthorityGranted: boolean;
  financialExecutionAuthorityGranted: boolean;
  idempotencyKey: string;
  activatedAt: string;
  updatedAt: string;
  methodVersion: string;
  evidence: EvidenceEnvelope[];
  limitations: string[];
}

export type ActivationControlTier = "READ_ONLY" | "BOUNDED_FINANCIAL" | "PROTECTIVE_WRITE";
export interface ActivationControlProfile {
  activationId: string;
  serviceId: string;
  buyerAddress: string;
  category: ServiceCategory;
  activationState: MarketplaceActivationState;
  controlTier: ActivationControlTier;
  runtimeCapability: {
    code: "ANALYZE_POSITION" | "ANALYZE_GRID_MARKET" | "SCAN_YIELD_OPPORTUNITIES" | "INSPECT_HEALTH";
    label: string;
    mode: "READ_ONLY";
    inputRequirements: string[];
  };
  permissions: {
    readOnly: string[];
    financialWrite: string[];
    walletSigningAuthorityGranted: boolean;
    financialExecutionAuthorityGranted: boolean;
    permissionGrantId?: string;
  };
  revocable: boolean;
  revokeEffect: string;
  methodVersion: string;
  limitations: string[];
}

export type ActivationRuntimeObservationState = "NOT_RUN" | "OBSERVED" | "FAILED" | "REVOKED";
export type ActivationOutcomeAssessmentState = "NOT_APPLICABLE" | "INSUFFICIENT_DATA" | "MEASURED";
export interface ActivationRuntimeState {
  activationId: string;
  serviceId: string;
  buyerAddress: string;
  category: ServiceCategory;
  activationState: MarketplaceActivationState;
  observationState: ActivationRuntimeObservationState;
  latestTask?: ServiceTask;
  activity: {
    state: "NOT_STARTED" | "OBSERVED" | "FAILED" | "REVOKED";
    summary: string;
    observedAt?: string;
  };
  monitoring?: {
    state: "NOT_STARTED" | "SNAPSHOT_OBSERVED" | "FAILED" | "REVOKED";
    detail: string;
    observedAt?: string;
  };
  outcome: {
    state: ActivationOutcomeAssessmentState;
    detail: string;
  };
  generatedAt: string;
  methodVersion: string;
  limitations: string[];
}

export interface BuyerCommercialState {
  buyerAddress: string;
  quotes: CommercialQuote[];
  hires: CommercialHire[];
  payments: CommercialPaymentEvidence[];
  activations: MarketplaceActivation[];
  generatedAt: string;
  methodVersion: string;
  limitations: string[];
}

export interface ReadinessCheck {
  code: string;
  label: string;
  state: ReadinessCheckState;
  requiredForActivation: boolean;
  detail: string;
  evidenceIds?: string[];
}

export interface ReadinessSnapshot {
  readinessSnapshotId: string;
  serviceId: string;
  state: ReadinessState;
  checkedAt: string;
  reasons: string[];
  checks?: ReadinessCheck[];
  activationEligible?: boolean;
  limitations?: string[];
  methodVersion?: string;
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
  | "yield_opportunities"
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
  yieldOpportunities: "NOT_SUPPORTED" | "AVAILABLE" | "PARTIAL" | "FAILED";
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
  venusPositions: VenusPoolPositionSnapshot[];
  yieldOpportunities: YieldOpportunitySnapshot[];
  gridMarketContexts: GridMarketContextSnapshot[];
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

export type PermissionCheckoutState = "READY_FOR_REVIEW" | "BLOCKED" | "REQUEST_CREATED" | "GRANT_RECONCILED" | "CANCELLED" | "EXPIRED";
export type ScopedPermissionRequestState = "BLOCKED" | "PROVIDER_READY" | "GRANT_RECONCILED" | "CANCELLED" | "EXPIRED";
export type FinancialAuthorityTier = "BOUNDED_FINANCIAL" | "PROTECTIVE_WRITE";
export type PermissionApprovalMode = "AUTOMATIC_WITHIN_LIMITS" | "ASK_BEFORE_EXECUTION";
export type PermissionCheckoutBlockerCode =
  | "SERVICE_READ_ONLY"
  | "SERVICE_NOT_FINANCIALLY_READY"
  | "MAINNET_EXECUTION_NOT_APPROVED"
  | "REBALANCING_JOB_INTENT_REQUIRED"
  | "AUTHORITY_PROVIDER_BRIDGE_REQUIRED"
  | "GRID_EXECUTION_ADAPTER_REQUIRED"
  | "YIELD_EXECUTION_ADAPTER_REQUIRED"
  | "HEALTH_PROTECTIVE_WRITE_ADAPTER_REQUIRED";

export interface PermissionCheckoutBlocker {
  code: PermissionCheckoutBlockerCode;
  label: string;
  detail: string;
  blocking: true;
  provenance: "marketplace-derived";
}

export type PermissionCheckoutCategoryInput =
  | {
      category: "rebalancing";
      positionTokenId: string;
      token0Limit: string;
      token1Limit: string;
      maxActionsPerDay?: number;
    }
  | {
      category: "grid";
      poolAddress: string;
      capitalAssetAddress: string;
      capitalLimit: string;
      perActionLimit: string;
      maxActionsPerDay: number;
    }
  | {
      category: "yield";
      assetAddress: string;
      allowedMarketAddresses?: string[];
      capitalLimit: string;
      perActionLimit: string;
      maxActionsPerDay: number;
    }
  | {
      category: "health";
      assetAddress: string;
      marketAddresses?: string[];
      protectiveActions: Array<"REPAY" | "ADD_COLLATERAL">;
      interventionCap: string;
      triggerHealthFactor: string;
      maxInterventionsPerDay: number;
    };

export interface PermissionCheckoutLimit {
  code: "DAILY" | "SINGLE_ACTION" | "CAPITAL" | "INTERVENTION" | "ACTION_COUNT" | "HEALTH_TRIGGER" | "TOKEN0_SPEND" | "TOKEN1_SPEND";
  label: string;
  value: string;
  unit: "DISPLAY_AMOUNT" | "COUNT" | "HEALTH_FACTOR";
  asset?: string;
  provenance: "user-proposed";
}

export interface PermissionCheckoutScope {
  category: ServiceCategory;
  authorityTier: FinancialAuthorityTier;
  approvalMode: PermissionApprovalMode;
  protocol: "PancakeSwap" | "Venus";
  jobSummary: string;
  target: {
    positionTokenId?: string;
    poolAddress?: string;
    assetAddresses: string[];
    marketAddresses: string[];
  };
  allowedActions: string[];
  deniedActions: string[];
  limits: PermissionCheckoutLimit[];
  validForMinutes: number;
  expiresAt: string;
  categoryContext: Record<string, string | string[] | number | boolean>;
}

export interface PermissionCheckoutCostSummary {
  agentFee: { state: "KNOWN" | "UNAVAILABLE"; value: string; detail: string };
  protocolCosts: { state: "UNAVAILABLE"; value: "Could Not Assess"; detail: string };
  gas: { state: "UNAVAILABLE"; value: "Could Not Assess"; detail: string };
  performanceFee: { state: "KNOWN" | "NOT_APPLICABLE" | "UNAVAILABLE"; value: string; detail: string };
}

export interface PermissionCheckoutRiskSummary {
  strategyRisk: string;
  protocolRisk: string;
  authorityRisk: string;
  failureBehavior: string;
  revocationBehavior: string;
  limitations: string[];
}

export interface PermissionCheckout {
  checkoutId: string;
  activationId: string;
  serviceId: string;
  buyerAddress: string;
  category: ServiceCategory;
  state: PermissionCheckoutState;
  idempotencyKey: string;
  scope: PermissionCheckoutScope;
  scopeHash: string;
  commercialTermsHash: string;
  permissionProfileSnapshot: PermissionProfile;
  cost: PermissionCheckoutCostSummary;
  risk: PermissionCheckoutRiskSummary;
  blockers: PermissionCheckoutBlocker[];
  provider: PermissionAuthorityProvider | "UNASSIGNED";
  providerSubmissionState: "BLOCKED" | "JOB_INTENT_REQUIRED" | "CATEGORY_ADAPTER_REQUIRED" | "READY_FOR_PROVIDER" | "RECONCILED";
  linkedJobIntentId?: string;
  permissionRequestId?: string;
  permissionGrantId?: string;
  reviewSummary: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  methodVersion: string;
  limitations: string[];
}

export interface ScopedPermissionRequest {
  permissionRequestId: string;
  checkoutId: string;
  activationId: string;
  serviceId: string;
  buyerAddress: string;
  category: ServiceCategory;
  state: ScopedPermissionRequestState;
  authorityTier: FinancialAuthorityTier;
  provider: PermissionAuthorityProvider | "UNASSIGNED";
  providerSubmissionState: PermissionCheckout["providerSubmissionState"];
  scopeSnapshot: PermissionCheckoutScope;
  scopeHash: string;
  blockers: PermissionCheckoutBlocker[];
  linkedJobIntentId?: string;
  linkedBoundedPermissionRequestId?: string;
  permissionGrantId?: string;
  reviewedAt: string;
  updatedAt: string;
  expiresAt: string;
  methodVersion: string;
  limitations: string[];
}

export interface BuyerPermissionState {
  buyerAddress: string;
  checkouts: PermissionCheckout[];
  requests: ScopedPermissionRequest[];
  activeGrantIds: string[];
  generatedAt: string;
  methodVersion: string;
  limitations: string[];
}

export type PermissionAuthorityProvider = "ALTANA";
export type PermissionSpendPeriod = "hour" | "day";
export type PermissionGrantReconciliationState =
  | "PENDING"
  | "EXACT_MATCH"
  | "WALLET_MISMATCH"
  | "SCOPE_MISMATCH"
  | "ONCHAIN_INVALID"
  | "EXPIRED";

export interface PermissionCallScope {
  to: string;
  signature: string;
  label: string;
  provenance: "marketplace-derived";
}

export interface PermissionSpendScope {
  token: string;
  symbol?: string;
  decimals: number;
  limitDisplay: string;
  limitRaw: string;
  period: PermissionSpendPeriod;
  provenance: "user-proposed";
}

export type AuthoritySafetyPrerequisiteCode =
  | "TRUSTED_AGENT_SESSION_KEY"
  | "ARGUMENT_LEVEL_EXECUTION_GUARD"
  | "NON_BYPASSABLE_FINANCIAL_EXECUTION_BOUNDARY";

export interface AuthoritySafetyPrerequisite {
  code: AuthoritySafetyPrerequisiteCode;
  state: "REQUIRED" | "SATISFIED";
  blocking: boolean;
  label: string;
  detail: string;
  provenance: "marketplace-derived";
}


export type AgentAuthorityBindingState = "VERIFIED" | "UNAVAILABLE" | "FAILED";

export interface AgentAuthorityBinding {
  bindingId: string;
  serviceId: string;
  agentId: string;
  state: AgentAuthorityBindingState;
  interactionKind: "A2A";
  runtimeEndpoint: string;
  agentCardUrl: string;
  extensionUri: string;
  challengeUrl?: string;
  signatureScheme: "EIP191_SECP256K1";
  sessionPublicKey?: string;
  sessionKeyAddress?: string;
  observedAt: string;
  evidenceIds: string[];
  methodVersion: string;
  detail: string;
  limitations: string[];
}

export type RebalancingGuardCallKind = "DECREASE_LIQUIDITY" | "COLLECT" | "INCREASE_LIQUIDITY" | "MINT";
export type ExecutionGuardCheckState = "PASS" | "FAIL" | "INCONCLUSIVE";

export interface RebalancingExecutionProposal {
  proposalId: string;
  jobIntentId: string;
  permissionRequestId: string;
  serviceId: string;
  call: { to: string; data: string; valueRaw?: string };
  proposedAt: string;
}

export interface ExecutionGuardCheck {
  code: string;
  label: string;
  state: ExecutionGuardCheckState;
  detail: string;
}

export interface RebalancingExecutionGuardReport {
  reportId: string;
  proposalId: string;
  jobIntentId: string;
  permissionRequestId: string;
  serviceId: string;
  state: "PASS" | "BLOCKED" | "INCONCLUSIVE";
  callKind?: RebalancingGuardCallKind;
  decodedFunction?: string;
  checks: ExecutionGuardCheck[];
  checkedAt: string;
  methodVersion: string;
  argumentGuardSatisfied: boolean;
  nonBypassableBoundarySatisfied: false;
  executionEligible: false;
  limitations: string[];
}

export interface AltanaTestnetProbeProof {
  walletAddress: string;
  target: string;
  signature: "positions(uint256)";
  sessionPublicKey: string;
  transactionHash?: string;
  expiryUnix: number;
}

export interface AltanaTestnetProbeObservation {
  probeId: string;
  jobIntentId: string;
  walletAddress: string;
  target: string;
  signature: "positions(uint256)";
  sessionPublicKey: string;
  transactionHash?: string;
  expiryUnix: number;
  state: "ACTIVE" | "REVOKED" | "EXPIRED" | "INVALID";
  keyId: string;
  keystoreAddress: string;
  onchainValid: boolean;
  verifiedAt: string;
  verifiedBlockNumber?: string;
  revocationTransactionHash?: string;
  methodVersion: string;
  limitations: string[];
}


export interface BoundaryFinancialSessionProof {
  walletAddress: string;
  sessionPublicKey: string;
  transactionHash?: string;
  calls: Array<{ to: string; signature: string }>;
  spend: Array<{ token: string; limitRaw: string; period: PermissionSpendPeriod }>;
  expiryUnix: number;
}

export interface BoundaryFinancialSessionObservation {
  financialSessionId: string;
  boundaryId: string;
  planId: string;
  jobIntentId: string;
  permissionRequestId: string;
  serviceId: string;
  walletAddress: string;
  network: "testnet";
  chainId: 97;
  provider: "ALTANA";
  state: "ACTIVE" | "REVOKED" | "EXPIRED" | "INVALID";
  custody: "SPOTRIQ_BOUNDARY_EPHEMERAL_CLIENT_SIGNER";
  sessionPublicKey: string;
  keyId: string;
  transactionHash?: string;
  revocationTransactionHash?: string;
  requestedCalls: PermissionCallScope[];
  grantedCalls: Array<{ to: string; signature: string }>;
  requestedSpendCaps: PermissionSpendScope[];
  grantedSpendCaps: Array<{ token: string; limitRaw: string; period: PermissionSpendPeriod }>;
  expiryUnix: number;
  expiresAt: string;
  reconciliation: PermissionGrantReconciliationState;
  reconciliationReasons: string[];
  keystoreAddress: string;
  onchainValid: boolean;
  verifiedAt: string;
  verifiedBlockNumber?: string;
  exactBoundaryScope: boolean;
  distinctFromAgentProposalKey: boolean;
  externalAgentHasFinancialSigner: false;
  signerProvisioned: boolean;
  executionEligible: false;
  methodVersion: string;
  limitations: string[];
}

export interface FinancialAssetReadiness {
  token: string;
  symbol?: string;
  decimals: number;
  requiredForMintRaw: string;
  currentBalanceRaw: string;
  expectedPlanInflowRaw: string;
  projectedBalanceRaw: string;
  allowanceToPositionManagerRaw: string;
  balanceState: "CURRENT_SUFFICIENT" | "PROJECTED_SUFFICIENT" | "INSUFFICIENT";
  allowanceState: "SUFFICIENT" | "APPROVAL_REQUIRED";
}

export interface BoundaryFinancialReadiness {
  readinessId: string;
  boundaryId: string;
  planId: string;
  financialSessionId: string;
  walletAddress: string;
  positionManager: string;
  state: "READY_FOR_CONTROLLED_EXECUTION_MILESTONE" | "APPROVAL_REQUIRED" | "INSUFFICIENT_BALANCE" | "SESSION_INVALID" | "STALE";
  assets: FinancialAssetReadiness[];
  observedBlockNumber: string;
  checkedAt: string;
  sessionOnchainValid: boolean;
  exactBoundaryScope: boolean;
  freshBoundaryRequired: true;
  executionEligible: false;
  limitations: string[];
}

export interface BoundedPermissionRequest {
  permissionRequestId: string;
  jobIntentId: string;
  serviceId: string;
  walletAddress: string;
  provider: PermissionAuthorityProvider;
  network: BscNetwork;
  chainId: 56 | 97;
  protocol: "PancakeSwap";
  positionManager: string;
  tokenId: string;
  callAllowlist: PermissionCallScope[];
  spendCaps: PermissionSpendScope[];
  expiresAt: string;
  expiryUnix: number;
  status: "READY" | "SUBMITTED" | "CONFIRMED" | "REJECTED" | "FAILED" | "EXPIRED";
  providerSubmissionState: "SAFETY_PREREQUISITES_REQUIRED" | "SESSION_KEY_REQUIRED" | "READY_FOR_WALLET" | "BOUNDARY_SIGNER_REQUIRED" | "SUBMITTED" | "RECONCILED";
  safetyPrerequisites: AuthoritySafetyPrerequisite[];
  trustedAgentBinding?: AgentAuthorityBinding;
  latestExecutionGuard?: RebalancingExecutionGuardReport;
  executionPlanId?: string;
  executionBoundaryId?: string;
  financialDelegateMode?: "SPOTRIQ_EXECUTION_BOUNDARY";
  submissionBlockers: string[];
  walletControl: WalletControlState;
  scopeProvenance: "marketplace-derived";
  activationEligible: false;
  methodVersion: string;
  createdAt: string;
  updatedAt: string;
  limitations: string[];
}

export interface AltanaGrantProof {
  walletAddress: string;
  sessionPublicKey: string;
  transactionHash?: string;
  calls: Array<{ to: string; signature: string }>;
  spend: Array<{ token: string; limitRaw: string; period: PermissionSpendPeriod }>;
  expiryUnix: number;
}

export interface BoundedPermissionGrant {
  permissionGrantId: string;
  permissionRequestId: string;
  jobIntentId: string;
  serviceId: string;
  walletAddress: string;
  provider: PermissionAuthorityProvider;
  network: BscNetwork;
  chainId: 56 | 97;
  sessionPublicKey: string;
  keyId: string;
  transactionHash?: string;
  state: PermissionGrantState;
  reconciliation: PermissionGrantReconciliationState;
  requestedCalls: PermissionCallScope[];
  grantedCalls: Array<{ to: string; signature: string }>;
  requestedSpendCaps: PermissionSpendScope[];
  grantedSpendCaps: Array<{ token: string; limitRaw: string; period: PermissionSpendPeriod }>;
  expiresAt: string;
  expiryUnix: number;
  keystoreAddress: string;
  onchainValid: boolean;
  verifiedAt: string;
  verifiedBlockNumber?: string;
  executionSafetyPrerequisites: AuthoritySafetyPrerequisite[];
  executionEligible: false;
  reconciliationReasons: string[];
  limitations: string[];
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

export interface BscLogSummary {
  address: string;
  topics: string[];
  data: string;
  logIndex?: number;
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
  logs?: BscLogSummary[];
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



export type VenusPoolKind = "CORE" | "ISOLATED";
export type VenusRiskState = "NO_BORROW" | "COMFORTABLE" | "WATCH" | "HIGHER_ATTENTION" | "LIQUIDATABLE" | "COULD_NOT_ASSESS";

export interface VenusContractSet {
  network: BscNetwork;
  protocolShareReserve: string;
  poolRegistry?: string;
  corePoolComptroller?: string;
  vBNB?: string;
  wBNB?: string;
}

export interface VenusMarketPositionSnapshot {
  protocol: "Venus";
  poolKind: VenusPoolKind;
  poolName: string;
  comptroller: string;
  vToken: string;
  vTokenSymbol?: string;
  underlying: ProtocolTokenMetadata;
  collateralEnabled: boolean;
  suppliedVTokenRaw: string;
  suppliedUnderlyingRaw: string;
  borrowUnderlyingRaw: string;
  exchangeRateMantissa: string;
  collateralFactorMantissa?: string;
  liquidationThresholdMantissa?: string;
  forcedLiquidationEnabled?: boolean;
  oraclePriceRaw?: string;
  suppliedValueUsd1e18?: string;
  borrowValueUsd1e18?: string;
  liquidationAdjustedCollateralUsd1e18?: string;
  evidence: EvidenceEnvelope[];
}

export interface VenusPoolPositionSnapshot {
  protocol: "Venus";
  network: BscNetwork;
  chainId: number;
  poolKind: VenusPoolKind;
  poolName: string;
  comptroller: string;
  oracle?: string;
  walletAddress: string;
  protocolLiquidityRaw: string;
  protocolShortfallRaw: string;
  totalBorrowValueUsd1e18?: string;
  liquidationAdjustedCollateralUsd1e18?: string;
  healthFactor?: string;
  riskState: VenusRiskState;
  markets: VenusMarketPositionSnapshot[];
  blockNumber: string;
  observedAt: string;
  evidence: EvidenceEnvelope[];
  coverage: {
    accountLiquidity: "AVAILABLE" | "FAILED";
    marketPositions: "AVAILABLE" | "PARTIAL" | "FAILED";
    healthFactor: "AVAILABLE" | "UNAVAILABLE" | "CONFLICT";
  };
  limitations: string[];
}

export interface VenusWalletPositionsSnapshot {
  walletAddress: string;
  network: BscNetwork;
  chainId: number;
  blockNumber: string;
  observedAt: string;
  contracts: VenusContractSet;
  positions: VenusPoolPositionSnapshot[];
  coverage: {
    corePool: "AVAILABLE" | "PARTIAL" | "FAILED";
    isolatedPools: "AVAILABLE" | "PARTIAL" | "FAILED";
    failedComptrollers: string[];
  };
}



export type YieldRateType = "CURRENT_PROTOCOL_APY" | "ESTIMATED_NET_APY" | "OBSERVED_REALISED_YIELD";

export interface YieldOpportunitySnapshot {
  opportunityId: string;
  protocol: "Venus";
  network: BscNetwork;
  chainId: number;
  poolKind: VenusPoolKind;
  poolName: string;
  comptroller: string;
  vToken: string;
  underlying: ProtocolTokenMetadata;
  walletBalanceRaw: string;
  walletBalanceFormatted?: string;
  existingSupplyUnderlyingRaw: string;
  existingSupplyFormatted?: string;
  currentSupplyRatePerBlockRaw: string;
  currentSupplyApyPercent?: string;
  currentRateType: "CURRENT_PROTOCOL_APY";
  estimatedNetApyPercent?: string;
  observedRealisedYieldPercent?: string;
  availableLiquidityRaw?: string;
  blockNumber: string;
  observedAt: string;
  evidence: EvidenceEnvelope[];
  coverage: {
    walletBalance: "AVAILABLE" | "FAILED";
    existingSupply: "AVAILABLE" | "FAILED";
    currentRate: "AVAILABLE" | "FAILED";
    incentives: "NOT_SUPPORTED";
    estimatedNet: "NOT_SUPPORTED";
    realisedYield: "NOT_SUPPORTED";
  };
  limitations: string[];
}

export interface YieldWalletSnapshot {
  walletAddress: string;
  network: BscNetwork;
  chainId: number;
  blockNumber: string;
  observedAt: string;
  opportunities: YieldOpportunitySnapshot[];
  coverage: {
    venusMarkets: "AVAILABLE" | "PARTIAL" | "FAILED";
    pancakeSwapYieldContext: "POSITION_ONLY" | "NOT_AVAILABLE";
    failedMarketRefs: string[];
    truncated: boolean;
  };
  limitations: string[];
}


export type GridMarketRegime = "RANGE_LIKE" | "TRENDING_UP" | "TRENDING_DOWN" | "MIXED" | "INSUFFICIENT_HISTORY";

export interface GridTwapWindowSnapshot {
  seconds: number;
  label: string;
  averageTick?: number;
  averagePriceToken0InToken1?: string;
  state: "AVAILABLE" | "UNAVAILABLE";
}

export interface GridMarketContextSnapshot {
  contextId: string;
  protocol: "PancakeSwap";
  version: "V3";
  network: BscNetwork;
  chainId: number;
  poolAddress: string;
  pairLabel: string;
  token0: ProtocolTokenMetadata;
  token1: ProtocolTokenMetadata;
  feePips: number;
  currentTick: number;
  currentPriceToken0InToken1?: string;
  liquidityRaw: string;
  windows: GridTwapWindowSnapshot[];
  twapBandLow?: string;
  twapBandHigh?: string;
  twapDispersionBps?: number;
  regime: GridMarketRegime;
  confidence: "high" | "medium" | "low" | "unavailable";
  walletCompatibility: {
    token0BalanceRaw?: string;
    token1BalanceRaw?: string;
    nativeBalanceRaw?: string;
    hasAnyCompatibleAsset: boolean;
    positionExposure: boolean;
  };
  blockNumber: string;
  observedAt: string;
  evidence: EvidenceEnvelope[];
  coverage: { poolState: "AVAILABLE" | "FAILED"; oracleHistory: "AVAILABLE" | "PARTIAL" | "INSUFFICIENT_HISTORY"; walletBalances: "AVAILABLE" | "PARTIAL" | "FAILED" | "NOT_REQUESTED"; };
  limitations: string[];
}

export interface GridWalletMarketSnapshot {
  walletAddress: string;
  network: BscNetwork;
  chainId: number;
  observedAt: string;
  contexts: GridMarketContextSnapshot[];
  coverage: { configuredMarkets: "AVAILABLE" | "PARTIAL" | "FAILED"; failedMarketRefs: string[]; };
  limitations: string[];
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


// ─── ERC-8004 / 8004scan marketplace discovery ──────────────────────────────
export type AgentRegistryChainId = 56 | 97;
export type AgentCanonicalVerificationState = "VERIFIED" | "MISMATCH" | "UNAVAILABLE" | "NOT_CHECKED";
export type AgentRegistrationMetadataState = "PARSED_DATA_URI" | "REMOTE_URI_NOT_FETCHED" | "UNAVAILABLE" | "INVALID";

export interface AgentRegistryReference {
  namespace: "eip155" | "marketplace";
  chainId: AgentRegistryChainId;
  registryAddress?: string;
  agentId: string;
  identifier: string;
}

export interface AgentRegistrationServiceEndpoint {
  name: string;
  endpoint: string;
  version?: string;
  skills?: string[];
  domains?: string[];
}

export interface AgentRegistrationFile {
  type?: string;
  name?: string;
  description?: string;
  image?: string;
  services: AgentRegistrationServiceEndpoint[];
  x402Support?: boolean;
  active?: boolean;
  registrations: Array<{ agentId: string; agentRegistry: string }>;
  supportedTrust: string[];
}

export interface AgentCategoryHint {
  category: ServiceCategory;
  confidence: "high" | "medium" | "low";
  basis: string[];
  provenance: "operator-claimed";
  note: string;
}

export interface ExternalAgentReputationSummary {
  source: "8004scan" | "none";
  totalScore?: number;
  starCount?: number;
  totalFeedbacks: number;
  note: string;
}

export interface AgentCanonicalVerification {
  state: AgentCanonicalVerificationState;
  checkedAt: string;
  registryAddress: string;
  ownerAddress?: string;
  indexedOwnerMatches?: boolean;
  agentUri?: string;
  agentWallet?: string;
  registrationMetadataState: AgentRegistrationMetadataState;
  registrationBacklinkMatches?: boolean;
  registrationFile?: AgentRegistrationFile;
  evidence: EvidenceEnvelope[];
  limitations: string[];
}

export interface DiscoveredAgent {
  discoveryId: string;
  sourceKind?: "ERC8004" | "MARKETPLACE_REFERENCE";
  identity: AgentRegistryReference;
  name: string;
  description: string;
  imageUrl?: string;
  ownerAddress?: string;
  supportedProtocols: string[];
  categoryHints: AgentCategoryHint[];
  active?: boolean;
  x402Support?: boolean;
  supportedTrust: string[];
  registrationServices: AgentRegistrationServiceEndpoint[];
  externalReputation: ExternalAgentReputationSummary;
  indexedAt?: string;
  createdAt?: string;
  canonicalVerification?: AgentCanonicalVerification;
  evidence: EvidenceEnvelope[];
  listingState: "DISCOVERED";
  marketplaceServiceState: "NOT_CREATED";
  limitations: string[];
}

export interface MarketplaceListingRecord {
  identity: DiscoveredAgent;
  listing: AgentListing;
  serviceCount: number;
  normalizedAt: string;
  limitations: string[];
}

export interface MarketplaceServiceRecord {
  identity: DiscoveredAgent;
  listing: AgentListing;
  service: AgentService;
  permissionProfile: PermissionProfile;
  offer: ServiceOffer;
  readiness: ReadinessSnapshot;
  capabilityClaims: AgentCapabilityClaim[];
  evidence: EvidenceEnvelope[];
  normalizedAt: string;
  limitations: string[];
}

export type FinancialSupplyDiscoveryMode = "TARGETED" | "USER_QUERY";

export interface FinancialSupplySearchRun {
  category?: ServiceCategory;
  query: string;
  returned: number;
  matchingCapabilityHints: number;
  normalizedServices: number;
  source: "8004scan" | "cache";
  state: "COMPLETE" | "PARTIAL" | "UNAVAILABLE";
  limitations: string[];
}

export interface FinancialSupplyDiscoveryMatch {
  category?: ServiceCategory;
  query: string;
  relevanceSource: "8004scan-semantic-search" | "8004scan-keyword-fallback";
  capabilityEvidence: "OPERATOR_METADATA_HINT" | "NOT_ESTABLISHED";
  note: string;
}

export interface FinancialSupplyLead {
  identity: DiscoveredAgent;
  matches: FinancialSupplyDiscoveryMatch[];
  promotedServiceIds: string[];
  note: string;
}

export interface MarketplaceFinancialDiscovery {
  methodVersion: string;
  mode: FinancialSupplyDiscoveryMode;
  chainId: AgentRegistryChainId;
  searches: FinancialSupplySearchRun[];
  leads: FinancialSupplyLead[];
  categoriesRequested: ServiceCategory[];
  categoriesWithNormalizedSupply: ServiceCategory[];
  generatedAt: string;
  limitations: string[];
}

export interface MarketplaceSupplyPage {
  services: MarketplaceServiceRecord[];
  chainId: AgentRegistryChainId;
  page: number;
  limit: number;
  total?: number;
  source: "8004scan" | "cache";
  fetchedAt: string;
  normalizationMethodVersion: string;
  discovery?: MarketplaceFinancialDiscovery;
  limitations: string[];
}

export interface MarketplaceListingPage {
  listings: MarketplaceListingRecord[];
  chainId: AgentRegistryChainId;
  page: number;
  limit: number;
  total?: number;
  source: "8004scan" | "cache";
  fetchedAt: string;
  limitations: string[];
}

export type FindingServiceCompatibilityState = "PASS" | "WARN" | "FAIL" | "UNKNOWN";
export type FindingServiceMatchTier = "EXACT_CONTEXT" | "CONTEXT_COMPATIBLE" | "CATEGORY_ONLY";

export interface FindingCompatibilityContext {
  category: ServiceCategory;
  protocol?: string;
  asset?: string;
  assetAddress?: string;
  pair?: string;
  network?: string;
  findingState: FindingState;
  severity: FindingSeverity;
}

export interface FindingServiceCompatibilityCheck {
  code: "CATEGORY" | "PROTOCOL" | "ASSET" | "PAIR" | "CANONICAL_IDENTITY" | "RUNTIME_REACHABILITY" | "MARKETPLACE_TESTS" | "PERMISSION_PROFILE";
  label: string;
  state: FindingServiceCompatibilityState;
  requiredForCompatibility: boolean;
  detail: string;
}

export interface FindingServiceMatch {
  matchId: string;
  findingId: string;
  serviceId: string;
  rank: number;
  tier: FindingServiceMatchTier;
  activationEligible: boolean;
  service: MarketplaceServiceRecord;
  checks: FindingServiceCompatibilityCheck[];
  strengths: string[];
  limitations: string[];
  explanation: string;
}

export interface FindingServiceMatchPage {
  findingId: string;
  checkSessionId?: string;
  context: FindingCompatibilityContext;
  matches: FindingServiceMatch[];
  consideredServices: number;
  excludedServices: number;
  source: "8004scan" | "cache";
  methodVersion: string;
  generatedAt: string;
  limitations: string[];
}

export type MarketplaceServiceTestState = "PASS" | "WARN" | "FAIL" | "SKIPPED" | "INCONCLUSIVE";
export type MarketplaceServiceTestCoverageState = "NOT_RUN" | "PASS" | "PARTIAL" | "FAIL";
export type MarketplaceServiceTestRunState = "COMPLETED" | "PARTIAL" | "FAILED";

export interface MarketplaceServiceTestResult {
  testId: string;
  code: "ENDPOINT_POLICY" | "ENDPOINT_REACHABILITY" | "PROTOCOL_DISCOVERY" | "PROTOCOL_CONTRACT" | "CATEGORY_CAPABILITY";
  label: string;
  state: MarketplaceServiceTestState;
  requiredForReadiness: boolean;
  detail: string;
  endpoint?: string;
  interactionKind?: ServiceRuntimeEndpoint["interactionKind"];
  protocolVersion?: string;
  observedAt: string;
  durationMs?: number;
  evidenceIds?: string[];
}

export interface MarketplaceServiceTestRun {
  runId: string;
  serviceId: string;
  state: MarketplaceServiceTestRunState;
  coverage: MarketplaceServiceTestCoverageState;
  startedAt: string;
  completedAt: string;
  methodVersion: string;
  tests: MarketplaceServiceTestResult[];
  evidence: EvidenceEnvelope[];
  limitations: string[];
}

export interface MarketplaceServiceTestCoverage {
  serviceId: string;
  coverage: MarketplaceServiceTestCoverageState;
  latestRunId?: string;
  tests: MarketplaceServiceTestResult[];
  evidence: EvidenceEnvelope[];
  observedAt?: string;
  methodVersion: string;
  note: string;
  limitations: string[];
}

export interface MarketplaceSupplyStatus {
  engine: "Spotriq Marketplace Supply";
  normalizationMethodVersion: string;
  readinessMethodVersion: string;
  activationGate: "ENFORCED";
  referenceServicesRemainSample: boolean;
  liveReferenceServices: boolean;
  checkedAt: string;
  capabilities: {
    erc8004IdentityInput: true;
    listingNormalization: true;
    serviceNormalization: true;
    runtimeEndpointNormalization: true;
    permissionProfileNormalization: true;
    offerNormalization: true;
    deterministicReadiness: true;
    targetedFinancialDiscovery: true;
    marketplaceTesting: boolean;
    findingServiceCompatibility: boolean;
    liveReferenceAgentSupply: boolean;
    activation: false;
  };
  limitations: string[];
}

export interface AgentDiscoveryPage {
  agents: DiscoveredAgent[];
  chainId: AgentRegistryChainId;
  page: number;
  limit: number;
  total?: number;
  hasMore?: boolean;
  source: "8004scan" | "cache";
  fetchedAt: string;
  limitations: string[];
}

export interface ExternalAgentFeedbackRecord {
  feedbackId: string;
  source: "8004scan";
  chainId: AgentRegistryChainId;
  agentId: string;
  externalUserId?: string;
  score?: number;
  comment?: string;
  createdAt?: string;
  provenance: "external";
  note: string;
}

export interface ExternalAgentFeedbackPage {
  feedback: ExternalAgentFeedbackRecord[];
  chainId: AgentRegistryChainId;
  agentId: string;
  page: number;
  limit: number;
  total?: number;
  hasMore?: boolean;
  fetchedAt: string;
}

export interface AgentRegistryStatus {
  provider: "8004scan + ERC-8004";
  defaultDiscoveryChainId: AgentRegistryChainId;
  apiBaseUrl: string;
  apiKeyConfigured: boolean;
  indexState: "AVAILABLE" | "UNAVAILABLE";
  canonicalVerification: "ENABLED";
  registries: Array<{
    chainId: AgentRegistryChainId;
    network: BscNetwork;
    identityRegistry: string;
    reputationRegistry: string;
  }>;
  checkedAt: string;
  lastRateLimit?: { limit?: number; remaining?: number; resetAt?: string };
  limitations: string[];
}

// ─── Real AgentService task invocation / origin proof (v0.21 → v0.24) ───────
export type ServiceTaskState =
  | "READY_TO_INVOKE" | "SUBMITTED" | "WORKING" | "INPUT_REQUIRED"
  | "COMPLETED" | "FAILED" | "CANCELLED" | "REJECTED" | "TIMED_OUT"
  | "UNSUPPORTED" | "AUTH_REQUIRED" | "READINESS_BLOCKED" | "ORIGIN_PROOF_FAILED";
export type ServiceTaskOriginProofState = "UNVERIFIED" | "VERIFIED" | "FAILED";
export type ServiceTaskProposalState = "NONE" | "STRUCTURED" | "MISMATCH" | "INVALID";
export type ServiceTaskCommercialState = "NOT_PROVEN" | "FREE_INVOCATION_DECLARED" | "HIRING_PROVEN" | "PAYMENT_PROVEN";
export type ServiceTaskOriginKind = "JOB_INTENT" | "ACTIVATION";
export type ServiceTaskResultState = "NONE" | "STRUCTURED" | "MISMATCH" | "UNSTRUCTURED";
export type ActivationServiceTaskAction = "ANALYZE_POSITION" | "ANALYZE_GRID_MARKET" | "SCAN_YIELD_OPPORTUNITIES" | "INSPECT_HEALTH";
export type ServiceTaskResultKind = "REBALANCING_ANALYSIS" | "GRID_MARKET_CONTEXT" | "YIELD_OPPORTUNITY_SNAPSHOT" | "HEALTH_MONITORING_SNAPSHOT";

export interface RebalancingServiceProposal {
  proposalId: string;
  proposalHash: string;
  requestContextHash: string;
  action: "PREPARE_RANGE_REBALANCE";
  targetTickLower: number;
  targetTickUpper: number;
  summary?: string;
  rationale?: string;
  receivedAt: string;
  provenance: "marketplace-observed";
}

export interface ServiceTaskResult {
  state: ServiceTaskResultState;
  kind?: ServiceTaskResultKind;
  category: ServiceCategory;
  action: string;
  observedAt?: string;
  payload?: unknown;
  evidenceIds: string[];
  detail: string;
  limitations: string[];
}

export interface ServiceTaskAttempt {
  attempt: number;
  requestId: string;
  messageId: string;
  idempotencyKey: string;
  requestedAt: string;
  respondedAt?: string;
  state: ServiceTaskState;
  remoteTaskId?: string;
  remoteMessageId?: string;
  remoteStatus?: string;
  detail?: string;
}

export interface ServiceTaskOriginProof {
  state: ServiceTaskOriginProofState;
  serviceId: string;
  agentId: string;
  runtimeEndpoint: string;
  agentCardUrl: string;
  protocol: "A2A";
  protocolBinding: "JSONRPC" | "HTTP+JSON";
  protocolVersion: string;
  tenant?: string;
  authorityBindingId?: string;
  serviceSessionKeyAddress?: string;
  requestId: string;
  messageId: string;
  requestContextHash: string;
  remoteTaskId?: string;
  remoteMessageId?: string;
  observedAt?: string;
  evidenceIds: string[];
  detail: string;
}

export interface RebalancingJobServiceTaskRequestContext {
  originKind: "JOB_INTENT";
  jobIntentId: string;
  findingId: string;
  serviceId: string;
  agentId: string;
  walletAddress: string;
  category: "rebalancing";
  requestedAction: "PREPARE_RANGE_REBALANCE";
  subject: {
    protocol: "PancakeSwap";
    version: "V3" | "INFINITY_CL";
    network: BscNetwork;
    tokenId: string;
    pair: string;
    tickLower: number;
    tickUpper: number;
    currentTick: number;
    feePips?: number;
    tickSpacing?: number;
    rangeState: LiquidityRangeState;
    blockNumber: string;
  };
  constraints: RebalancingJobConstraints;
  expiresAt: string;
}

interface ActivationServiceTaskRequestContextBase {
  originKind: "ACTIVATION";
  activationId: string;
  serviceId: string;
  agentId: string;
  walletAddress: string;
  expiresAt: string;
}

export interface RebalancingActivationServiceTaskRequestContext extends ActivationServiceTaskRequestContextBase {
  category: "rebalancing";
  requestedAction: "ANALYZE_POSITION";
  subject: { protocol: "PancakeSwap"; network: BscNetwork; tokenId: string };
}

export interface GridActivationServiceTaskRequestContext extends ActivationServiceTaskRequestContextBase {
  category: "grid";
  requestedAction: "ANALYZE_GRID_MARKET";
  subject: {
    protocol: "PancakeSwap";
    network: BscNetwork;
    poolAddress: string;
    capitalContext?: { asset?: string; amount?: string; note: string };
  };
}

export interface YieldActivationServiceTaskRequestContext extends ActivationServiceTaskRequestContextBase {
  category: "yield";
  requestedAction: "SCAN_YIELD_OPPORTUNITIES";
  subject: { protocol: "Venus"; network: BscNetwork; walletAddress: string };
}

export interface HealthActivationServiceTaskRequestContext extends ActivationServiceTaskRequestContextBase {
  category: "health";
  requestedAction: "INSPECT_HEALTH";
  subject: { protocol: "Venus"; network: BscNetwork; walletAddress: string; monitoringMode: "SNAPSHOT" };
}

export type ServiceTaskRequestContext =
  | RebalancingJobServiceTaskRequestContext
  | RebalancingActivationServiceTaskRequestContext
  | GridActivationServiceTaskRequestContext
  | YieldActivationServiceTaskRequestContext
  | HealthActivationServiceTaskRequestContext;

export interface ServiceTask {
  serviceTaskId: string;
  originKind: ServiceTaskOriginKind;
  jobIntentId?: string;
  findingId?: string;
  serviceId: string;
  agentId: string;
  category: ServiceCategory;
  state: ServiceTaskState;
  protocol: "A2A";
  protocolBinding?: "JSONRPC" | "HTTP+JSON";
  protocolVersion?: string;
  runtimeEndpoint?: string;
  agentCardUrl?: string;
  tenant?: string;
  requestContextHash: string;
  requestContext: ServiceTaskRequestContext;
  attempt: number;
  attempts: ServiceTaskAttempt[];
  remoteTaskId?: string;
  remoteMessageId?: string;
  remoteStatus?: string;
  proposalState: ServiceTaskProposalState;
  proposal?: RebalancingServiceProposal;
  result: ServiceTaskResult;
  originProof: ServiceTaskOriginProof;
  commercialState: ServiceTaskCommercialState;
  activationId?: string;
  hireId?: string;
  evidence: EvidenceEnvelope[];
  createdAt: string;
  updatedAt: string;
  limitations: string[];
}

export interface JobIntentServiceTaskLink {
  serviceTaskId: string;
  state: ServiceTaskState;
  originProofState: ServiceTaskOriginProofState;
  proposalState: ServiceTaskProposalState;
  requestContextHash: string;
  proposalId?: string;
  proposalHash?: string;
  proposedTickLower?: number;
  proposedTickUpper?: number;
  commercialState: ServiceTaskCommercialState;
  activationId?: string;
  hireId?: string;
  linkedAt: string;
}

// ─── Rebalancing vertical handoff / reviewable job intent ────────────────────
export type JobIntentState = "REVIEWABLE" | "AWAITING_AUTHORITY" | "COMPLETED" | "CANCELLED" | "EXPIRED";
export type JobIntentExecutionState = "NO_EXECUTION" | "CONTROLLED_TESTNET_EXECUTED";

export interface RebalancingJobConstraints {
  executionMode: "PREPARE_ONLY";
  maxSlippageBps: number;
  maxActionCount: 4;
  validForMinutes: number;
  allowSwapPreparation: boolean;
}

export interface RebalancingJobIntentSubject {
  protocol: "PancakeSwap";
  version: "V3" | "INFINITY_CL";
  network: BscNetwork;
  tokenId: string;
  positionManager?: string;
  token0?: ProtocolTokenMetadata;
  token1?: ProtocolTokenMetadata;
  poolAddress?: string;
  poolId?: string;
  pair: string;
  tickLower: number;
  tickUpper: number;
  currentTick: number;
  feePips?: number;
  tickSpacing?: number;
  rangeState: LiquidityRangeState;
  blockNumber: string;
  findingGeneratedAt?: string;
  findingExpiresAt?: string;
}

export interface RebalancingJobIntentServiceSnapshot {
  serviceId: string;
  agentId: string;
  listingId?: string;
  name: string;
  operator: string;
  matchId: string;
  matchRank: number;
  matchTier: FindingServiceMatchTier;
  readiness: ReadinessState;
  readinessSnapshotId?: string;
  activationEligible: boolean;
  supportedProtocols: string[];
  runtimeEndpoints: ServiceRuntimeEndpoint[];
}

export interface JobIntentAuthorityRequirement {
  state: "UNRESOLVED" | "REQUEST_PREPARED" | "GRANT_VERIFIED";
  requiredBeforeExecution: true;
  permissionProfileId: string;
  declarationState: "UNDECLARED" | "DECLARED";
  walletControl: WalletControlState;
  permissionRequestId?: string;
  permissionGrantId?: string;
  provider?: PermissionAuthorityProvider;
  blockers: string[];
}

export interface RebalancingJobIntent {
  jobIntentId: string;
  state: JobIntentState;
  executionState: JobIntentExecutionState;
  category: "rebalancing";
  checkSessionId: string;
  findingId: string;
  walletAddress: string;
  walletControl: WalletControlState;
  requestedAction: {
    code: "PREPARE_RANGE_REBALANCE";
    label: string;
    description: string;
  };
  subject: RebalancingJobIntentSubject;
  constraints: RebalancingJobConstraints;
  selectedService: RebalancingJobIntentServiceSnapshot;
  evidenceReferences: {
    findingEvidenceIds: string[];
    serviceEvidenceIds: string[];
    readinessEvidenceIds: string[];
  };
  authority: JobIntentAuthorityRequirement;
  serviceTask?: JobIntentServiceTaskLink;
  methodVersion: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  limitations: string[];
}


// ─── Reviewed Rebalancing execution plan + enforcement boundary (v0.17) ─────

export interface PancakeSwapV3DecreaseQuote {
  protocol: "PancakeSwap";
  version: "V3";
  network: BscNetwork;
  chainId: number;
  positionManager: string;
  tokenId: string;
  owner: string;
  liquidityRaw: string;
  expectedAmount0Raw: string;
  expectedAmount1Raw: string;
  recordedTokensOwed0Raw: string;
  recordedTokensOwed1Raw: string;
  blockNumber: string;
  observedAt: string;
  quoteMethod: "ETH_CALL_SIMULATION";
  limitations: string[];
}

export interface RebalancingTargetRangeReview {
  tickLower: number;
  tickUpper: number;
  tickSpacing: number;
  currentTickAtReview: number;
  state: "PROPOSED" | "USER_REVIEWED";
  proposedBy: "USER" | "SPOTRIQ_DETERMINISTIC_DRAFT" | "AGENT_SERVICE";
  reviewedAt?: string;
  detail: string;
}

export interface RebalancingExecutionQuote {
  quoteId: string;
  jobIntentId: string;
  blockNumber: string;
  observedAt: string;
  expiresAt: string;
  method: "PANCAKESWAP_V3_ETH_CALL_SIMULATION";
  liquidityRaw: string;
  expectedDecreaseAmount0Raw: string;
  expectedDecreaseAmount1Raw: string;
  recordedTokensOwed0Raw: string;
  recordedTokensOwed1Raw: string;
  expectedCollectAmount0Raw: string;
  expectedCollectAmount1Raw: string;
  evidenceState: "OBSERVED";
  limitations: string[];
}

export type RebalancingExecutionStepKind = "DECREASE_LIQUIDITY" | "COLLECT" | "MINT";

export interface RebalancingExecutionPlanStep {
  index: number;
  kind: RebalancingExecutionStepKind;
  label: string;
  call: { to: string; data: string; valueRaw: string };
  callHash: string;
  decodedSummary: Record<string, string | number | boolean>;
  guard: RebalancingExecutionGuardReport;
}

export interface RebalancingExecutionPlanPositionSnapshot {
  tokenId: string;
  owner: string;
  positionManager: string;
  poolAddress?: string;
  token0: ProtocolTokenMetadata;
  token1: ProtocolTokenMetadata;
  feePips: number;
  tickLower: number;
  tickUpper: number;
  currentTick: number;
  tickSpacing: number;
  liquidityRaw: string;
  recordedTokensOwed0Raw: string;
  recordedTokensOwed1Raw: string;
  blockNumber: string;
  observedAt: string;
}

export interface RebalancingExecutionPlan {
  planId: string;
  jobIntentId: string;
  permissionRequestId: string;
  serviceId: string;
  walletAddress: string;
  network: BscNetwork;
  chainId: 56 | 97;
  state: "REVIEWABLE" | "REVIEWED" | "STALE" | "BLOCKED";
  targetRange: RebalancingTargetRangeReview;
  proposalOrigin?: {
    serviceTaskId: string;
    proposalId: string;
    proposalHash: string;
    requestContextHash: string;
    attribution: "AGENT_SERVICE" | "USER_OVERRIDE";
  };
  positionSnapshot: RebalancingExecutionPlanPositionSnapshot;
  quote: RebalancingExecutionQuote;
  steps: RebalancingExecutionPlanStep[];
  planHash: string;
  guardState: "PASS" | "BLOCKED" | "INCONCLUSIVE";
  enforcementBoundaryId?: string;
  executionEligible: false;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  methodVersion: string;
  limitations: string[];
}

export interface FinancialExecutionBoundary {
  boundaryId: string;
  planId: string;
  jobIntentId: string;
  permissionRequestId: string;
  serviceId: string;
  walletAddress: string;
  network: BscNetwork;
  state: "SEALED" | "STALE" | "BLOCKED" | "CONSUMED";
  planHash: string;
  approvedCallHashes: string[];
  approvedStepCount: number;
  dispatchPolicy: "EXACT_PLAN_CALL_HASH_AND_ORDER";
  externalAgentRole: "AUTHENTICATED_PROPOSER_ONLY";
  financialSignerCustody: "BOUNDARY_CONTROLLED_NOT_PROVISIONED" | "BOUNDARY_CONTROLLED_ALTANA_TESTNET_SESSION";
  financialSessionId?: string;
  signerProvisioned: boolean;
  nonBypassable: true;
  executionEligible: false;
  sealedAt: string;
  expiresAt: string;
  methodVersion: string;
  limitations: string[];
}

export interface ExecutionBoundaryCheck {
  code: string;
  label: string;
  state: "PASS" | "FAIL" | "REQUIRED";
  detail: string;
}

export interface ExecutionBoundaryPreflight {
  preflightId: string;
  boundaryId: string;
  planId: string;
  state: "PASS_AUTHORITY_REQUIRED" | "PASS_EXECUTION_DISABLED" | "BLOCKED" | "STALE";
  checks: ExecutionBoundaryCheck[];
  observedBlockNumber?: string;
  checkedAt: string;
  financialGrantRequired: boolean;
  financialSessionId?: string;
  signerProvisioned: boolean;
  executionEligible: false;
  limitations: string[];
}

export interface ExecutionBoundaryDecision {
  boundaryId: string;
  planId: string;
  stepIndex: number;
  callHash: string;
  state: "APPROVED_FOR_BOUNDARY" | "BLOCKED";
  exactPlanCall: boolean;
  correctOrder: boolean;
  signerProvisioned: boolean;
  financialSessionId?: string;
  executionEligible: false;
  checkedAt: string;
  detail: string;
}


// ─── Controlled BSC Testnet execution / bounded approval flow ───────────────
export interface BoundaryApprovalPlanCall {
  index: number;
  token: string;
  symbol?: string;
  spender: string;
  phase: "RESET" | "SET_EXACT";
  currentAllowanceRaw: string;
  requiredAllowanceRaw: string;
  approvalAmountRaw: string;
  call: { to: string; data: string; valueRaw: "0" };
  callHash: string;
}

export interface BoundaryApprovalPlan {
  approvalPlanId: string;
  boundaryId: string;
  planId: string;
  financialSessionId: string;
  readinessId: string;
  walletAddress: string;
  network: "testnet";
  chainId: 97;
  positionManager: string;
  state: "NOT_REQUIRED" | "REVIEW_REQUIRED" | "REVIEWED" | "CONFIRMED" | "FAILED" | "STALE";
  calls: BoundaryApprovalPlanCall[];
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  executionEligible: false;
  methodVersion: string;
  limitations: string[];
}

export interface BoundaryApprovalExecutionProof {
  callsId: string;
  status: "CONFIRMED" | "FAILED" | "PENDING";
  transactionHash?: string;
}

export interface BoundaryApprovalObservation {
  approvalObservationId: string;
  approvalPlanId: string;
  boundaryId: string;
  walletAddress: string;
  provider: "ALTANA";
  providerStatus: "CONFIRMED" | "FAILED" | "PENDING";
  callsId: string;
  transactionHash?: string;
  receipt?: BscTransactionReceiptSummary;
  state: "PENDING" | "CONFIRMED" | "FAILED" | "UNVERIFIED";
  refreshedReadinessId?: string;
  allowancesSatisfied: boolean;
  observedAt: string;
  methodVersion: string;
  limitations: string[];
}

export interface ControlledExecutionCall {
  index: number;
  kind: RebalancingExecutionStepKind;
  to: string;
  data: string;
  valueRaw: string;
  callHash: string;
}

export interface ControlledExecutionProof {
  callsId: string;
  status: "CONFIRMED" | "FAILED" | "PENDING";
  transactionHash?: string;
}

export interface ControlledRebalancingExecution {
  executionId: string;
  boundaryId: string;
  planId: string;
  planHash: string;
  jobIntentId: string;
  permissionRequestId: string;
  financialSessionId: string;
  serviceId: string;
  walletAddress: string;
  network: "testnet";
  chainId: 97;
  state: "READY_TO_DISPATCH" | "SUBMITTED" | "CONFIRMED" | "FAILED" | "BLOCKED" | "STALE";
  calls: ControlledExecutionCall[];
  preflightId: string;
  readinessId: string;
  sessionVerifiedAt: string;
  providerCallsId?: string;
  providerStatus?: "CONFIRMED" | "FAILED" | "PENDING";
  transactionHash?: string;
  receipt?: BscTransactionReceiptSummary;
  mintedPositionTokenId?: string;
  oldPositionLiquidityRawAfter?: string;
  mintedPositionVerified?: boolean;
  postStateDetail?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  executionEligible: boolean;
  methodVersion: string;
  limitations: string[];
}


// ─── Controlled execution Activity & Outcomes (v0.20) ───────────────────────
export type ExecutionActivityEventType =
  | "JOB_INTENT_CONFIRMED"
  | "BOUNDARY_AUTHORITY_ACTIVE"
  | "APPROVALS_CONFIRMED"
  | "EXECUTION_PREPARED"
  | "EXECUTION_SUBMITTED"
  | "EXECUTION_CONFIRMED"
  | "EXECUTION_BLOCKED"
  | "EXECUTION_FAILED"
  | "REPLACEMENT_POSITION_VERIFIED"
  | "BOUNDARY_CONSUMED"
  | "JOB_INTENT_COMPLETED"
  | "FINANCIAL_SESSION_REVOKED";

export interface ExecutionActivityEvent {
  activityEventId: string;
  executionId: string;
  jobIntentId: string;
  serviceId: string;
  walletAddress: string;
  network: "testnet";
  chainId: 97;
  eventType: ExecutionActivityEventType;
  severity: "info" | "success" | "warning" | "error";
  title: string;
  description: string;
  occurredAt: string;
  provenance: EvidenceProvenance;
  sourceType: "JOB_INTENT" | "BOUNDARY_FINANCIAL_SESSION" | "APPROVAL_PLAN" | "CONTROLLED_EXECUTION" | "BSC_RECEIPT" | "PANCAKESWAP_POSITION" | "FINANCIAL_EXECUTION_BOUNDARY";
  sourceId: string;
  transactionHash?: string;
  blockNumber?: string;
  evidenceIds: string[];
  metadata: Record<string, string | number | boolean>;
}

export interface ExecutionOutcomeMetric {
  outcomeMetricId: string;
  executionId: string;
  metric: string;
  value: string | number;
  unit?: string;
  attribution: "DIRECT" | "OBSERVED" | "DERIVED";
  provenance: EvidenceProvenance;
  evidenceIds: string[];
  limitation?: string;
}

export interface RebalancingExecutionOutcome {
  outcomeId: string;
  executionId: string;
  jobIntentId: string;
  serviceId: string;
  walletAddress: string;
  network: "testnet";
  chainId: 97;
  state: OutcomeState;
  transactionHash: string;
  receiptBlockNumber: string;
  oldPositionTokenId: string;
  replacementPositionTokenId: string;
  replacementPosition: PancakeSwapClPositionSnapshot;
  gasUsedRaw: string;
  effectiveGasPriceRaw?: string;
  gasCostNativeRaw?: string;
  gasCostNativeFormatted?: string;
  gasAsset: "tBNB";
  startedAt: string;
  measuredAt: string;
  metrics: ExecutionOutcomeMetric[];
  evidenceIds: string[];
  performanceMeasurement: {
    state: "INSUFFICIENT_HISTORY" | "COLLECTING";
    detail: string;
  };
  limitations: string[];
  methodVersion: string;
}

export interface ExecutionActivityOutcomeBundle {
  execution: ControlledRebalancingExecution;
  activity: ExecutionActivityEvent[];
  outcome?: RebalancingExecutionOutcome;
  evidence: EvidenceRecord[];
  syncedAt: string;
  limitations: string[];
}
