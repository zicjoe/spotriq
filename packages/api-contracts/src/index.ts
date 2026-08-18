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
  notes: string[];
}
