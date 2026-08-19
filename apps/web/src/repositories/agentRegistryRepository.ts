import type { ApiEnvelope, AgentDiscoveryDetailResponse, AgentDiscoveryResponse, AgentRegistryStatusResponse } from "@spotriq/api-contracts";
import type { AgentDiscoveryPage, AgentRegistryChainId, AgentRegistryStatus, DiscoveredAgent } from "../domain/types";
import { apiRequest } from "../api/client";

function unwrap<T>(value: ApiEnvelope<T>): T { return value.data; }

export interface AgentRegistryRepository {
  getStatus(): Promise<AgentRegistryStatus>;
  listAgents(input?: { chainId?: AgentRegistryChainId; page?: number; limit?: number; search?: string }): Promise<AgentDiscoveryPage>;
  searchAgents(query: string, input?: { chainId?: AgentRegistryChainId; limit?: number }): Promise<AgentDiscoveryPage>;
  getAgent(chainId: AgentRegistryChainId, agentId: string): Promise<DiscoveredAgent>;
}

export class ApiAgentRegistryRepository implements AgentRegistryRepository {
  async getStatus() {
    return unwrap(await apiRequest<ApiEnvelope<AgentRegistryStatusResponse>>("/v1/registry/status")).status;
  }
  async listAgents(input: { chainId?: AgentRegistryChainId; page?: number; limit?: number; search?: string } = {}) {
    const params = new URLSearchParams();
    if (input.chainId) params.set("chainId", String(input.chainId));
    if (input.page) params.set("page", String(input.page));
    if (input.limit) params.set("limit", String(input.limit));
    if (input.search?.trim()) params.set("search", input.search.trim());
    const suffix = params.size ? `?${params.toString()}` : "";
    return unwrap(await apiRequest<ApiEnvelope<AgentDiscoveryResponse>>(`/v1/agents${suffix}`)).page;
  }
  async searchAgents(query: string, input: { chainId?: AgentRegistryChainId; limit?: number } = {}) {
    const params = new URLSearchParams({ q: query });
    if (input.chainId) params.set("chainId", String(input.chainId));
    if (input.limit) params.set("limit", String(input.limit));
    return unwrap(await apiRequest<ApiEnvelope<AgentDiscoveryResponse>>(`/v1/agents/search?${params.toString()}`)).page;
  }
  async getAgent(chainId: AgentRegistryChainId, agentId: string) {
    return unwrap(await apiRequest<ApiEnvelope<AgentDiscoveryDetailResponse>>(`/v1/agents/${chainId}/${encodeURIComponent(agentId)}`)).agent;
  }
}

export const agentRegistryRepository: AgentRegistryRepository = new ApiAgentRegistryRepository();
