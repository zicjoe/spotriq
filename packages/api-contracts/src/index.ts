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
  };
  coverageNotes: string[];
}

export interface PancakeSwapPositionResponse {
  position: import("@spotriq/domain").PancakeSwapClPositionSnapshot;
}

export interface PancakeSwapWalletPositionsResponse {
  snapshot: import("@spotriq/domain").PancakeSwapWalletPositionsSnapshot;
}
