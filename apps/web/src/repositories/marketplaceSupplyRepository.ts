import type {
  ApiEnvelope,
  MarketplaceServiceDetailResponse,
  MarketplaceServicesResponse,
  MarketplaceSupplyStatusResponse,
} from "@spotriq/api-contracts";
import type {
  AgentRegistryChainId,
  MarketplaceServiceRecord,
  MarketplaceSupplyPage,
  MarketplaceSupplyStatus,
  ServiceCategory,
} from "../domain/types";
import { apiRequest } from "../api/client";

function unwrap<T>(value: ApiEnvelope<T>): T { return value.data; }

export interface MarketplaceSupplyRepository {
  getStatus(): Promise<MarketplaceSupplyStatus>;
  listServices(input?: { chainId?: AgentRegistryChainId; page?: number; limit?: number; search?: string; category?: ServiceCategory }): Promise<MarketplaceSupplyPage>;
  getService(serviceId: string): Promise<MarketplaceServiceRecord>;
}

export class ApiMarketplaceSupplyRepository implements MarketplaceSupplyRepository {
  async getStatus() {
    return unwrap(await apiRequest<ApiEnvelope<MarketplaceSupplyStatusResponse>>("/v1/marketplace/status")).status;
  }
  async listServices(input: { chainId?: AgentRegistryChainId; page?: number; limit?: number; search?: string; category?: ServiceCategory } = {}) {
    const params = new URLSearchParams();
    if (input.chainId) params.set("chainId", String(input.chainId));
    if (input.page) params.set("page", String(input.page));
    if (input.limit) params.set("limit", String(input.limit));
    if (input.search?.trim()) params.set("search", input.search.trim());
    if (input.category) params.set("category", input.category);
    const suffix = params.size ? `?${params.toString()}` : "";
    return unwrap(await apiRequest<ApiEnvelope<MarketplaceServicesResponse>>(`/v1/services${suffix}`)).page;
  }
  async getService(serviceId: string) {
    return unwrap(await apiRequest<ApiEnvelope<MarketplaceServiceDetailResponse>>(`/v1/services/${encodeURIComponent(serviceId)}`)).record;
  }
}

export const marketplaceSupplyRepository: MarketplaceSupplyRepository = new ApiMarketplaceSupplyRepository();
