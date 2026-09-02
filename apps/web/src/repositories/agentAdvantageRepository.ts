import type { AgentAdvantageReportResponse, AgentAdvantageReportsResponse, ApiEnvelope, BuyerAgentAdvantageResponse } from "@spotriq/api-contracts";
import type { AgentAdvantageReport, BuyerAgentAdvantageState } from "../domain/types";
import { apiRequest } from "../api/client";
function unwrap<T>(value:ApiEnvelope<T>):T{return value.data;}
export interface AgentAdvantageRepository {
  sync(activationId:string):Promise<AgentAdvantageReport>;
  latest(activationId:string):Promise<AgentAdvantageReport>;
  history(activationId:string):Promise<AgentAdvantageReport[]>;
  forBuyer(address:string):Promise<BuyerAgentAdvantageState>;
}
export class ApiAgentAdvantageRepository implements AgentAdvantageRepository {
  async sync(id:string){return unwrap(await apiRequest<ApiEnvelope<AgentAdvantageReportResponse>>(`/v1/activations/${encodeURIComponent(id)}/advantage-reports/sync`,{method:"POST",body:"{}"})).report;}
  async latest(id:string){return unwrap(await apiRequest<ApiEnvelope<AgentAdvantageReportResponse>>(`/v1/activations/${encodeURIComponent(id)}/advantage-reports/latest`)).report;}
  async history(id:string){return unwrap(await apiRequest<ApiEnvelope<AgentAdvantageReportsResponse>>(`/v1/activations/${encodeURIComponent(id)}/advantage-reports`)).reports;}
  async forBuyer(address:string){return unwrap(await apiRequest<ApiEnvelope<BuyerAgentAdvantageResponse>>(`/v1/accounts/${encodeURIComponent(address)}/advantage-reports`)).state;}
}
export const agentAdvantageRepository:AgentAdvantageRepository=new ApiAgentAdvantageRepository();
