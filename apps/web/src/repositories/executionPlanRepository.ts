import type { ApiEnvelope, ExecutionBoundaryPreflightResponse, FinancialExecutionBoundaryResponse, PrepareRebalancingExecutionPlanRequest, RebalancingExecutionPlanResponse } from "@spotriq/api-contracts";
import type { ExecutionBoundaryPreflight, FinancialExecutionBoundary, RebalancingExecutionPlan } from "../domain/types";
import { ApiError, apiRequest } from "../api/client";
function unwrap<T>(v:ApiEnvelope<T>):T{return v.data;}
export interface ExecutionPlanRepository {
  prepare(jobIntentId:string,input:PrepareRebalancingExecutionPlanRequest):Promise<RebalancingExecutionPlan>;
  get(planId:string):Promise<RebalancingExecutionPlan>;
  getForJob(jobIntentId:string):Promise<RebalancingExecutionPlan|undefined>;
  review(planId:string):Promise<RebalancingExecutionPlan>;
  sealBoundary(planId:string):Promise<FinancialExecutionBoundary>;
  getBoundary(boundaryId:string):Promise<FinancialExecutionBoundary>;
  preflight(boundaryId:string):Promise<ExecutionBoundaryPreflight>;
}
export class ApiExecutionPlanRepository implements ExecutionPlanRepository {
  async prepare(jobIntentId:string,input:PrepareRebalancingExecutionPlanRequest){return unwrap(await apiRequest<ApiEnvelope<RebalancingExecutionPlanResponse>>(`/v1/job-intents/${encodeURIComponent(jobIntentId)}/execution-plans`,{method:"POST",body:JSON.stringify(input)})).plan;}
  async get(planId:string){return unwrap(await apiRequest<ApiEnvelope<RebalancingExecutionPlanResponse>>(`/v1/execution-plans/${encodeURIComponent(planId)}`)).plan;}
  async getForJob(jobIntentId:string){try{return unwrap(await apiRequest<ApiEnvelope<RebalancingExecutionPlanResponse>>(`/v1/job-intents/${encodeURIComponent(jobIntentId)}/execution-plan`)).plan;}catch(cause){if(cause instanceof ApiError&&cause.status===404)return undefined;throw cause;}}
  async review(planId:string){return unwrap(await apiRequest<ApiEnvelope<RebalancingExecutionPlanResponse>>(`/v1/execution-plans/${encodeURIComponent(planId)}/review`,{method:"POST",body:"{}"})).plan;}
  async sealBoundary(planId:string){return unwrap(await apiRequest<ApiEnvelope<FinancialExecutionBoundaryResponse>>(`/v1/execution-plans/${encodeURIComponent(planId)}/seal-boundary`,{method:"POST",body:"{}"})).boundary;}
  async getBoundary(boundaryId:string){return unwrap(await apiRequest<ApiEnvelope<FinancialExecutionBoundaryResponse>>(`/v1/execution-boundaries/${encodeURIComponent(boundaryId)}`)).boundary;}
  async preflight(boundaryId:string){return unwrap(await apiRequest<ApiEnvelope<ExecutionBoundaryPreflightResponse>>(`/v1/execution-boundaries/${encodeURIComponent(boundaryId)}/preflight`,{method:"POST",body:"{}"})).preflight;}
}
export const executionPlanRepository:ExecutionPlanRepository=new ApiExecutionPlanRepository();
