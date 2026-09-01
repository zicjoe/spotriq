import type {
  ApiEnvelope,
  FinancialExecutionAdapterResponse,
  FinancialExecutionAdapterStateResponse,
  FinancialExecutionPreflightResponse,
} from "@spotriq/api-contracts";
import type { FinancialExecutionAdapterDescriptor, FinancialExecutionAdapterStateResponseModel, FinancialExecutionPreflight, ServiceCategory } from "../domain/types";
import { apiRequest } from "../api/client";

function unwrap<T>(value: ApiEnvelope<T>): T { return value.data; }

export interface FinancialExecutionAdapterRepository {
  getAdapter(category:ServiceCategory):Promise<FinancialExecutionAdapterDescriptor>;
  preflight(permissionRequestId:string,buyerAddress:string):Promise<FinancialExecutionPreflight>;
  getState(permissionRequestId:string):Promise<FinancialExecutionAdapterStateResponseModel>;
}
class ApiFinancialExecutionAdapterRepository implements FinancialExecutionAdapterRepository {
  async getAdapter(category:ServiceCategory){return unwrap(await apiRequest<ApiEnvelope<FinancialExecutionAdapterResponse>>(`/v1/execution-adapters/${encodeURIComponent(category)}`)).adapter;}
  async preflight(permissionRequestId:string,buyerAddress:string){return unwrap(await apiRequest<ApiEnvelope<FinancialExecutionPreflightResponse>>(`/v1/scoped-permission-requests/${encodeURIComponent(permissionRequestId)}/execution-preflight`,{method:"POST",body:JSON.stringify({buyerAddress})})).preflight;}
  async getState(permissionRequestId:string){return unwrap(await apiRequest<ApiEnvelope<FinancialExecutionAdapterStateResponse>>(`/v1/scoped-permission-requests/${encodeURIComponent(permissionRequestId)}/execution-state`)).state;}
}
export const financialExecutionAdapterRepository:FinancialExecutionAdapterRepository=new ApiFinancialExecutionAdapterRepository();
