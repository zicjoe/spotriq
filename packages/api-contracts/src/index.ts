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
  marketplaceActivationEnabled: boolean;
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
