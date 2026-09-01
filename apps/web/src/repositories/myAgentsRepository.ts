import type {
  ApiEnvelope,
  EndMyAgentRelationshipRequest,
  MarketplaceActivationResponse,
  MyAgentsPortfolioResponse,
  MyAgentSwitchResponse,
  SwitchMyAgentRequest,
} from "@spotriq/api-contracts";
import type { MarketplaceActivation, MyAgentsPortfolio, MyAgentSwitchRecord } from "../domain/types";
import { apiRequest } from "../api/client";

function unwrap<T>(value: ApiEnvelope<T>): T { return value.data; }

export interface MyAgentsRepository {
  getPortfolio(address: string): Promise<MyAgentsPortfolio>;
  switchService(address: string, activationId: string, input: SwitchMyAgentRequest): Promise<MyAgentSwitchRecord>;
  revokeRelationship(address: string, activationId: string, input: EndMyAgentRelationshipRequest): Promise<MarketplaceActivation>;
}

export class ApiMyAgentsRepository implements MyAgentsRepository {
  async getPortfolio(address: string) {
    return unwrap(await apiRequest<ApiEnvelope<MyAgentsPortfolioResponse>>(`/v1/accounts/${encodeURIComponent(address)}/my-agents`)).portfolio;
  }
  async switchService(address: string, activationId: string, input: SwitchMyAgentRequest) {
    return unwrap(await apiRequest<ApiEnvelope<MyAgentSwitchResponse>>(`/v1/accounts/${encodeURIComponent(address)}/my-agents/${encodeURIComponent(activationId)}/switch`, { method: "POST", body: JSON.stringify(input) })).switch;
  }
  async revokeRelationship(address: string, activationId: string, input: EndMyAgentRelationshipRequest) {
    return unwrap(await apiRequest<ApiEnvelope<MarketplaceActivationResponse>>(`/v1/accounts/${encodeURIComponent(address)}/my-agents/${encodeURIComponent(activationId)}/revoke`, { method: "POST", body: JSON.stringify(input) })).activation;
  }
}

export const myAgentsRepository: MyAgentsRepository = new ApiMyAgentsRepository();
