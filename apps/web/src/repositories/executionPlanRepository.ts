import type { ApiEnvelope, BoundaryFinancialReadinessResponse, BoundaryFinancialSessionResponse, ExecutionBoundaryPreflightResponse, FinancialExecutionBoundaryResponse, ObserveBoundaryFinancialSessionRequest, PrepareRebalancingExecutionPlanRequest, RebalancingExecutionPlanResponse, ReverifyBoundaryFinancialSessionRequest } from "@spotriq/api-contracts";
import type { BoundaryFinancialReadiness, BoundaryFinancialSessionObservation, BoundaryFinancialSessionProof, ExecutionBoundaryPreflight, FinancialExecutionBoundary, RebalancingExecutionPlan } from "../domain/types";
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
  observeFinancialSession(boundaryId:string,proof:BoundaryFinancialSessionProof):Promise<{session:BoundaryFinancialSessionObservation;boundary?:FinancialExecutionBoundary}>;
  getFinancialSession(boundaryId:string):Promise<BoundaryFinancialSessionObservation|undefined>;
  reverifyFinancialSession(financialSessionId:string,revocationTransactionHash?:string):Promise<BoundaryFinancialSessionObservation>;
  financialReadiness(boundaryId:string):Promise<BoundaryFinancialReadiness>;
  getFinancialReadiness(boundaryId:string):Promise<BoundaryFinancialReadiness|undefined>;
}
export class ApiExecutionPlanRepository implements ExecutionPlanRepository {
  async prepare(jobIntentId:string,input:PrepareRebalancingExecutionPlanRequest){return unwrap(await apiRequest<ApiEnvelope<RebalancingExecutionPlanResponse>>(`/v1/job-intents/${encodeURIComponent(jobIntentId)}/execution-plans`,{method:"POST",body:JSON.stringify(input)})).plan;}
  async get(planId:string){return unwrap(await apiRequest<ApiEnvelope<RebalancingExecutionPlanResponse>>(`/v1/execution-plans/${encodeURIComponent(planId)}`)).plan;}
  async getForJob(jobIntentId:string){try{return unwrap(await apiRequest<ApiEnvelope<RebalancingExecutionPlanResponse>>(`/v1/job-intents/${encodeURIComponent(jobIntentId)}/execution-plan`)).plan;}catch(cause){if(cause instanceof ApiError&&cause.status===404)return undefined;throw cause;}}
  async review(planId:string){return unwrap(await apiRequest<ApiEnvelope<RebalancingExecutionPlanResponse>>(`/v1/execution-plans/${encodeURIComponent(planId)}/review`,{method:"POST",body:"{}"})).plan;}
  async sealBoundary(planId:string){return unwrap(await apiRequest<ApiEnvelope<FinancialExecutionBoundaryResponse>>(`/v1/execution-plans/${encodeURIComponent(planId)}/seal-boundary`,{method:"POST",body:"{}"})).boundary;}
  async getBoundary(boundaryId:string){return unwrap(await apiRequest<ApiEnvelope<FinancialExecutionBoundaryResponse>>(`/v1/execution-boundaries/${encodeURIComponent(boundaryId)}`)).boundary;}
  async preflight(boundaryId:string){return unwrap(await apiRequest<ApiEnvelope<ExecutionBoundaryPreflightResponse>>(`/v1/execution-boundaries/${encodeURIComponent(boundaryId)}/preflight`,{method:"POST",body:"{}"})).preflight;}
  async observeFinancialSession(boundaryId:string,proof:BoundaryFinancialSessionProof){const payload:ObserveBoundaryFinancialSessionRequest={proof};const value=unwrap(await apiRequest<ApiEnvelope<BoundaryFinancialSessionResponse>>(`/v1/execution-boundaries/${encodeURIComponent(boundaryId)}/financial-sessions`,{method:"POST",body:JSON.stringify(payload)}));return{session:value.session,boundary:value.boundary};}
  async getFinancialSession(boundaryId:string){try{return unwrap(await apiRequest<ApiEnvelope<BoundaryFinancialSessionResponse>>(`/v1/execution-boundaries/${encodeURIComponent(boundaryId)}/financial-session`)).session;}catch(cause){if(cause instanceof ApiError&&cause.status===404)return undefined;throw cause;}}
  async reverifyFinancialSession(financialSessionId:string,revocationTransactionHash?:string){const payload:ReverifyBoundaryFinancialSessionRequest={revocationTransactionHash};return unwrap(await apiRequest<ApiEnvelope<BoundaryFinancialSessionResponse>>(`/v1/financial-sessions/${encodeURIComponent(financialSessionId)}/reverify`,{method:"POST",body:JSON.stringify(payload)})).session;}
  async financialReadiness(boundaryId:string){return unwrap(await apiRequest<ApiEnvelope<BoundaryFinancialReadinessResponse>>(`/v1/execution-boundaries/${encodeURIComponent(boundaryId)}/financial-readiness`,{method:"POST",body:"{}"})).readiness;}
  async getFinancialReadiness(boundaryId:string){try{return unwrap(await apiRequest<ApiEnvelope<BoundaryFinancialReadinessResponse>>(`/v1/execution-boundaries/${encodeURIComponent(boundaryId)}/financial-readiness`)).readiness;}catch(cause){if(cause instanceof ApiError&&cause.status===404)return undefined;throw cause;}}
}

export const executionPlanRepository:ExecutionPlanRepository=new ApiExecutionPlanRepository();
