import type { BscNetwork, DependencyHealth, SpotriqEnvironment } from "@spotriq/domain";

export interface ApiEnvelope<T> {
  data: T;
  meta?: {
    requestId?: string;
    generatedAt: string;
  };
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    recoverable: boolean;
    retryable: boolean;
    correlationId?: string;
    details?: unknown;
  };
}

export interface HealthResponse {
  service: "spotriq-api";
  version: string;
  status: "ok" | "degraded";
  environment: SpotriqEnvironment;
  network: BscNetwork;
  checkedAt: string;
  dependencies: DependencyHealth[];
}

export interface MetaResponse {
  brand: "Spotriq";
  descriptor: "BSC financial-agent marketplace";
  environment: SpotriqEnvironment;
  network: BscNetwork;
  apiVersion: "v1";
}

export interface CapabilityResponse {
  persistenceConfigured: boolean;
  redisConfigured: boolean;
  bscRpcConfigured: boolean;
  liveMarketplaceData: boolean;
  chainAdapterEnabled: boolean;
  evidenceEngineEnabled: boolean;
  pancakeSwapAdapterEnabled: boolean;
  venusAdapterEnabled: boolean;
  yieldDataEnabled: boolean;
  gridMarketContextEnabled: boolean;
  smartMoneyCheckEnabled: boolean;
  agentRegistryEnabled: boolean;
  externalAgentDiscoveryEnabled: boolean;
  canonicalAgentIdentityVerificationEnabled: boolean;
  marketplaceServiceNormalizationEnabled: boolean;
  marketplaceReadinessEngineEnabled: boolean;
  marketplaceTestingEnabled: boolean;
  findingServiceCompatibilityEnabled: boolean;
  liveReferenceAgentSupplyEnabled: boolean;
  referenceAgentRuntimeEnabled: boolean;
  rebalancingJobIntentEnabled: boolean;
  boundedPermissionAuthorityEnabled: boolean;
  trustedAgentSessionKeyBindingEnabled: boolean;
  argumentLevelExecutionGuardEnabled: boolean;
  altanaTestnetProbeGrantEnabled: boolean;
  altanaKeystoreVerificationEnabled: boolean;
  rebalancingExecutionPlanEnabled: boolean;
  nonBypassableExecutionBoundaryEnabled: boolean;
  boundaryControlledAltanaFinancialSessionEnabled: boolean;
  financialAssetReadinessEnabled: boolean;
  liveFinancialSignerEnabled: boolean;
  boundedTokenApprovalFlowEnabled: boolean;
  controlledBscTestnetExecutionEnabled: boolean;
  executionActivityOutcomesEnabled: boolean;
  serviceTaskOriginProofEnabled: boolean;
  commercialOfferEnabled: boolean;
  commercialQuoteEnabled: boolean;
  commercialHireEnabled: boolean;
  commercialPaymentReconciliationEnabled: boolean;
  erc8183PaymentObservationEnabled: boolean;
  x402B402PaymentAdaptersEnabled: boolean;
  freeReadOnlyActivationEnabled: boolean;
  marketplaceActivationEnabled: boolean;
  fourCategoryActivationTaskParityEnabled: boolean;
  activationControlRevocationEnabled: boolean;
  healthMonitoringSnapshotEnabled: boolean;
  permissionCheckoutEnabled: boolean;
  fourCategoryAuthorityScopeParityEnabled: boolean;
  scopedPermissionRequestEnabled: boolean;
  permissionGrantReconciliationBridgeEnabled: boolean;
  fourCategoryFinancialExecutionAdapterParityEnabled: boolean;
  categoryArgumentGuardEnabled: boolean;
  categoryExecutionDispatchEnabled: boolean;
  fourCategoryActivityOutcomeParityEnabled: boolean;
  activationOutcomeCouldNotAssessEnabled: boolean;
  myAgentsPortfolioEnabled: boolean;
  myAgentsSwitchingEnabled: boolean;
  liveMarketplaceProfileCompareTryEnabled: boolean;
  smartMoneyPlansEnabled: boolean;
  planCompatibilityConflictHandlingEnabled: boolean;
  operatorWorkspaceEnabled: boolean;
  operatorSignedSessionAuthEnabled: boolean;
  operatorCanonicalOwnerClaimEnabled: boolean;
  operatorSupplyLifecycleEnabled: boolean;
  operatorTestLabTriggerEnabled: boolean;
  smartMoneyPersistence: "postgres" | "memory";
  notes: string[];
}

export interface ChainStatusResponse {
  network: BscNetwork;
  expectedChainId: number;
  rpcMode: "configured" | "official_public_fallback";
  latestBlockNumber?: string;
  activeRpcUrl?: string;
  endpoints: Array<{
    url: string;
    role: "primary" | "secondary";
    state: "ok" | "unavailable" | "chain_mismatch" | "unchecked";
    latencyMs?: number;
    detail?: string;
  }>;
}

export interface ChainBlockResponse {
  block: import("@spotriq/domain").BscBlockSummary;
  evidence: import("@spotriq/domain").EvidenceEnvelope[];
}

export interface ChainTransactionResponse {
  transaction: import("@spotriq/domain").BscTransactionSummary | null;
  receipt: import("@spotriq/domain").BscTransactionReceiptSummary | null;
  evidence: import("@spotriq/domain").EvidenceEnvelope[];
}

export interface WalletBalancesResponse {
  snapshot: import("@spotriq/domain").WalletBalanceSnapshot;
}

export interface EvidenceSourcesResponse {
  sources: import("@spotriq/domain").DataSourceDefinition[];
  methods: import("@spotriq/domain").EvidenceMethodDefinition[];
}

export interface PancakeSwapStatusResponse {
  protocol: "PancakeSwap";
  network: BscNetwork;
  chainId: number;
  contracts: import("@spotriq/domain").PancakeSwapContractSet;
  capabilities: {
    v3WalletDiscovery: true;
    v3PositionRead: true;
    infinityClPositionReadByTokenId: true;
    infinityClWalletDiscovery: false;
    positionValuation: false;
    historicalAnalytics: false;
    v3OracleTwap: true;
  };
  coverageNotes: string[];
}

export interface PancakeSwapPositionResponse {
  position: import("@spotriq/domain").PancakeSwapClPositionSnapshot;
}

export interface PancakeSwapWalletPositionsResponse {
  snapshot: import("@spotriq/domain").PancakeSwapWalletPositionsSnapshot;
}


export interface VenusStatusResponse {
  protocol: "Venus";
  network: BscNetwork;
  chainId: number;
  contracts: import("@spotriq/domain").VenusContractSet;
  capabilities: {
    corePoolDiscovery: boolean;
    isolatedPoolDiscovery: boolean;
    accountLiquidity: true;
    marketSnapshots: true;
    derivedHealthFactor: true;
    automatedProtection: false;
    yieldMarketDiscovery: true;
    currentBaseSupplyApy: true;
  };
  coverageNotes: string[];
}

export interface VenusWalletPositionsResponse {
  snapshot: import("@spotriq/domain").VenusWalletPositionsSnapshot;
}

export interface VenusYieldOpportunitiesResponse {
  snapshot: import("@spotriq/domain").YieldWalletSnapshot;
}

export interface VenusMarketCatalogResponse {
  snapshot: import("@spotriq/domain").VenusMarketCatalogSnapshot;
}

export interface StartSmartMoneyCheckRequest {
  walletAddress: string;
  walletControl?: import("@spotriq/domain").WalletControlState;
}

export interface SmartMoneyCheckResponse {
  session: import("@spotriq/domain").CheckSession;
  portfolio?: import("@spotriq/domain").SmartMoneyPortfolioSnapshot;
  findings: import("@spotriq/domain").Finding[];
}

export interface SmartMoneyCheckEventsResponse {
  events: import("@spotriq/domain").SmartMoneyCheckEvent[];
}

export interface GridMarketContextResponse { snapshot: import("@spotriq/domain").GridWalletMarketSnapshot; }
export interface GridPoolContextResponse { context: import("@spotriq/domain").GridMarketContextSnapshot; }

export interface AgentRegistryStatusResponse {
  status: import("@spotriq/domain").AgentRegistryStatus;
}

export interface AgentDiscoveryResponse {
  page: import("@spotriq/domain").AgentDiscoveryPage;
}

export interface AgentDiscoveryDetailResponse {
  agent: import("@spotriq/domain").DiscoveredAgent;
}

export interface AgentFeedbackResponse {
  page: import("@spotriq/domain").ExternalAgentFeedbackPage;
}



export interface MarketplaceSupplyStatusResponse {
  status: import("@spotriq/domain").MarketplaceSupplyStatus;
}

export interface MarketplaceListingResponse {
  page: import("@spotriq/domain").MarketplaceListingPage;
}

export interface MarketplaceServicesResponse {
  page: import("@spotriq/domain").MarketplaceSupplyPage;
}

export interface MarketplaceServiceDetailResponse {
  record: import("@spotriq/domain").MarketplaceServiceRecord;
}

export interface MarketplaceServiceReadinessResponse {
  readiness: import("@spotriq/domain").ReadinessSnapshot;
}

export interface MarketplaceServiceEvidenceResponse {
  evidence: import("@spotriq/domain").EvidenceEnvelope[];
}

export interface MarketplaceServiceTestsResponse {
  tests: import("@spotriq/domain").MarketplaceServiceTestCoverage;
}

export interface RunMarketplaceServiceTestsResponse {
  tests: import("@spotriq/domain").MarketplaceServiceTestCoverage;
  readiness: import("@spotriq/domain").ReadinessSnapshot;
}

export interface FindingServiceMatchesResponse {
  page: import("@spotriq/domain").FindingServiceMatchPage;
}

export interface PrepareRebalancingJobIntentRequest {
  serviceId: string;
  constraints?: Partial<Omit<import("@spotriq/domain").RebalancingJobConstraints, "executionMode" | "maxActionCount">>;
}

export interface ReviseRebalancingJobIntentRequest {
  constraints: Partial<Omit<import("@spotriq/domain").RebalancingJobConstraints, "executionMode" | "maxActionCount">>;
}

export interface RebalancingJobIntentResponse {
  intent: import("@spotriq/domain").RebalancingJobIntent;
}

export interface MarketplaceOffersResponse {
  offers: import("@spotriq/domain").ServiceOffer[];
}

export interface CreateCommercialQuoteRequest {
  serviceId: string;
  offerId?: string;
  buyerAddress: string;
  buyerChainId: number;
  idempotencyKey: string;
}
export interface CommercialQuoteResponse { quote: import("@spotriq/domain").CommercialQuote; }

export interface CreateCommercialHireRequest {
  quoteId: string;
  buyerAddress: string;
  idempotencyKey: string;
}
export interface CommercialHireResponse { hire: import("@spotriq/domain").CommercialHire; }

export interface ReconcileCommercialPaymentRequest {
  buyerAddress: string;
  reference?: { jobId?: string };
}
export interface CommercialPaymentResponse { payment: import("@spotriq/domain").CommercialPaymentEvidence; }

export interface ActivateCommercialHireRequest {
  buyerAddress: string;
  idempotencyKey: string;
}
export interface MarketplaceActivationResponse { activation: import("@spotriq/domain").MarketplaceActivation; }
export interface ActivationControlResponse { control: import("@spotriq/domain").ActivationControlProfile; }
export interface RevokeMarketplaceActivationRequest { buyerAddress: string; }
export interface BuyerCommercialStateResponse { state: import("@spotriq/domain").BuyerCommercialState; }

export interface CreatePermissionCheckoutRequest {
  buyerAddress: string;
  idempotencyKey: string;
  approvalMode: import("@spotriq/domain").PermissionApprovalMode;
  validForMinutes: number;
  scope: import("@spotriq/domain").PermissionCheckoutCategoryInput;
  linkedJobIntentId?: string;
}
export interface PermissionCheckoutResponse { checkout: import("@spotriq/domain").PermissionCheckout; }
export interface ConfirmPermissionCheckoutRequest { buyerAddress: string; }
export interface ScopedPermissionRequestResponse { request: import("@spotriq/domain").ScopedPermissionRequest; }
export interface ReconcileScopedPermissionGrantRequest { buyerAddress: string; permissionGrantId: string; }
export interface CancelPermissionCheckoutRequest { buyerAddress: string; }
export interface BuyerPermissionStateResponse { state: import("@spotriq/domain").BuyerPermissionState; }

export interface FinancialExecutionAdaptersResponse { adapters: import("@spotriq/domain").FinancialExecutionAdapterDescriptor[]; }
export interface FinancialExecutionAdapterResponse { adapter: import("@spotriq/domain").FinancialExecutionAdapterDescriptor; }
export interface FinancialExecutionPreflightRequest { buyerAddress: string; }
export interface FinancialExecutionPreflightResponse { preflight: import("@spotriq/domain").FinancialExecutionPreflight; }
export interface CategoryExecutionGuardRequest { buyerAddress: string; proposal: import("@spotriq/domain").PrepareFinancialExecutionInput; }
export interface CategoryExecutionGuardResponse { report: import("@spotriq/domain").CategoryExecutionGuardReport; }
export interface FinancialExecutionAdapterStateResponse { state: import("@spotriq/domain").FinancialExecutionAdapterStateResponseModel; }

export interface InvokeServiceTaskRequest { activationId?: string; }
export interface InvokeActivationServiceTaskRequest {
  buyerAddress: string;
  tokenId?: string;
  poolAddress?: string;
  capitalAsset?: string;
  capitalAmount?: string;
}
export interface ServiceTaskForActivationResponse { task: import("@spotriq/domain").ServiceTask | null; }
export interface ActivationRuntimeStateResponse { state: import("@spotriq/domain").ActivationRuntimeState; }

export interface ServiceTaskResponse {
  task: import("@spotriq/domain").ServiceTask;
  intent?: import("@spotriq/domain").RebalancingJobIntent;
}

export interface ServiceTaskForJobResponse {
  task: import("@spotriq/domain").ServiceTask | null;
}

export interface PrepareBoundedPermissionRequest {
  token0Limit: string;
  token1Limit: string;
  validForMinutes: number;
}

export interface BoundedPermissionRequestResponse {
  request: import("@spotriq/domain").BoundedPermissionRequest;
  intent?: import("@spotriq/domain").RebalancingJobIntent;
}

export interface ReconcileAltanaGrantRequest {
  proof: import("@spotriq/domain").AltanaGrantProof;
}

export interface BoundedPermissionGrantResponse {
  grant: import("@spotriq/domain").BoundedPermissionGrant;
  intent?: import("@spotriq/domain").RebalancingJobIntent;
}
export interface VerifyTrustedAgentBindingResponse {
  binding: import("@spotriq/domain").AgentAuthorityBinding;
  request: import("@spotriq/domain").BoundedPermissionRequest;
  intent?: import("@spotriq/domain").RebalancingJobIntent;
}

export interface GuardRebalancingCallRequest {
  proposalId?: string;
  call: { to: string; data: string; valueRaw?: string };
}

export interface GuardRebalancingCallResponse {
  report: import("@spotriq/domain").RebalancingExecutionGuardReport;
  request: import("@spotriq/domain").BoundedPermissionRequest;
}

export interface ObserveAltanaTestnetProbeRequest {
  proof: import("@spotriq/domain").AltanaTestnetProbeProof;
}

export interface AltanaTestnetProbeResponse {
  probe: import("@spotriq/domain").AltanaTestnetProbeObservation;
}

export interface ReverifyAltanaTestnetProbeRequest {
  revocationTransactionHash?: string;
}

export interface ObserveBoundaryFinancialSessionRequest {
  proof: import("@spotriq/domain").BoundaryFinancialSessionProof;
}

export interface BoundaryFinancialSessionResponse {
  session: import("@spotriq/domain").BoundaryFinancialSessionObservation;
  boundary?: import("@spotriq/domain").FinancialExecutionBoundary;
  request?: import("@spotriq/domain").BoundedPermissionRequest;
}

export interface ReverifyBoundaryFinancialSessionRequest {
  revocationTransactionHash?: string;
}

export interface BoundaryFinancialReadinessResponse {
  readiness: import("@spotriq/domain").BoundaryFinancialReadiness;
}



export interface PrepareRebalancingExecutionPlanRequest {
  targetTickLower: number;
  targetTickUpper: number;
}
export interface RebalancingExecutionPlanResponse {
  plan: import("@spotriq/domain").RebalancingExecutionPlan;
  request?: import("@spotriq/domain").BoundedPermissionRequest;
}
export interface FinancialExecutionBoundaryResponse {
  boundary: import("@spotriq/domain").FinancialExecutionBoundary;
  request?: import("@spotriq/domain").BoundedPermissionRequest;
}
export interface ExecutionBoundaryPreflightResponse {
  preflight: import("@spotriq/domain").ExecutionBoundaryPreflight;
}

// ─── Controlled BSC Testnet Rebalancing execution ───────────────────────────
export interface BoundaryApprovalPlanResponse {
  plan: import("@spotriq/domain").BoundaryApprovalPlan;
  readiness?: import("@spotriq/domain").BoundaryFinancialReadiness;
  observation?: import("@spotriq/domain").BoundaryApprovalObservation;
}
export interface ObserveBoundaryApprovalRequest {
  proof: import("@spotriq/domain").BoundaryApprovalExecutionProof;
}
export interface ControlledExecutionResponse {
  execution: import("@spotriq/domain").ControlledRebalancingExecution;
  readiness?: import("@spotriq/domain").BoundaryFinancialReadiness;
  preflight?: import("@spotriq/domain").ExecutionBoundaryPreflight;
  session?: import("@spotriq/domain").BoundaryFinancialSessionObservation;
  intent?: import("@spotriq/domain").RebalancingJobIntent;
}
export interface ObserveControlledExecutionRequest {
  proof: import("@spotriq/domain").ControlledExecutionProof;
}


// ─── Execution Activity & Outcomes (v0.20) ─────────────────────────────────
export interface ExecutionActivityOutcomesResponse {
  bundle: import("@spotriq/domain").ExecutionActivityOutcomeBundle;
}
export interface ExecutionActivityResponse {
  executionId: string;
  activity: import("@spotriq/domain").ExecutionActivityEvent[];
}
export interface ExecutionOutcomeResponse {
  executionId: string;
  outcome?: import("@spotriq/domain").RebalancingExecutionOutcome;
  evidence: import("@spotriq/domain").EvidenceRecord[];
}

// ─── Four-category Activation Activity & Outcomes (v0.27) ───────────────────
export interface ActivationActivityOutcomesResponse {
  bundle: import("@spotriq/domain").ActivationActivityOutcomeBundle;
}
export interface ActivationActivityResponse {
  activationId: string;
  activity: import("@spotriq/domain").ActivationActivityEvent[];
}
export interface ActivationOutcomeResponse {
  activationId: string;
  outcome: import("@spotriq/domain").ActivationOutcomeSnapshot;
}


// v0.28 My Agents + switching
export interface MyAgentsPortfolioResponse { portfolio: import("@spotriq/domain").MyAgentsPortfolio; }
export interface SwitchMyAgentRequest { targetServiceId: string; idempotencyKey: string; }
export interface MyAgentSwitchResponse { switch: import("@spotriq/domain").MyAgentSwitchRecord; }
export interface MyAgentSwitchesResponse { switches: import("@spotriq/domain").MyAgentSwitchRecord[]; }
export interface EndMyAgentRelationshipRequest { buyerAddress: string; }

// v0.29 Smart Money Plans + compatibility/conflicts
export interface CreateSmartMoneyPlanRequest {
  buyerAddress: string;
  findingIds?: string[];
  idempotencyKey: string;
}
export interface SmartMoneyPlanResponse { plan: import("@spotriq/domain").SmartMoneyPlan; }
export interface BuyerSmartMoneyPlansResponse { state: import("@spotriq/domain").BuyerSmartMoneyPlans; }

// v0.30 Operator Supply Lifecycle + Workspace
export interface CreateOperatorChallengeRequest { address: string; }
export interface OperatorChallengeResponse { challenge: import("@spotriq/domain").OperatorAuthChallenge; }
export interface VerifyOperatorChallengeRequest { challengeId: string; signature: string; }
export interface OperatorSessionResponse { session: import("@spotriq/domain").OperatorSession; token: string; }
export interface OperatorWorkspaceResponse { workspace: import("@spotriq/domain").OperatorWorkspaceSnapshot; }
export interface ClaimOperatorAgentRequest { chainId: import("@spotriq/domain").AgentRegistryChainId; agentId: string; }
export interface OperatorAgentClaimResponse { claim: import("@spotriq/domain").OperatorAgentClaim; }
export interface UpsertOperatorServiceDeclarationRequest {
  declarationId?: string;
  chainId: import("@spotriq/domain").AgentRegistryChainId;
  agentId: string;
  serviceId: string;
  category: import("@spotriq/domain").ServiceCategory;
  name: string;
  shortDescription: string;
  runtimeEndpoints: import("@spotriq/domain").OperatorRuntimeDeclaration[];
  commercial: import("@spotriq/domain").OperatorCommercialDeclaration;
  permission: import("@spotriq/domain").OperatorPermissionDeclaration;
}
export interface OperatorServiceDeclarationResponse { declaration: import("@spotriq/domain").OperatorServiceDeclaration; }
export interface TransitionOperatorServiceRequest { state: import("@spotriq/domain").OperatorSupplyLifecycleState; }
export interface SubmitOperatorEvidenceRequest { serviceId: string; evidenceType: string; value: string; sourceLabel: string; observedAt: string; limitations?: string[]; }
export interface OperatorEvidenceResponse { evidence: import("@spotriq/domain").OperatorSuppliedEvidenceRecord; }
export interface OperatorTestLabResponse { tests: import("@spotriq/domain").MarketplaceServiceTestCoverage; readiness: import("@spotriq/domain").ReadinessSnapshot; }
