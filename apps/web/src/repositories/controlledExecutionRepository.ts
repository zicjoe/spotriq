import type { ApiEnvelope, BoundaryApprovalPlanResponse, ControlledExecutionResponse, ObserveBoundaryApprovalRequest, ObserveControlledExecutionRequest } from "@spotriq/api-contracts";
import type { BoundaryApprovalExecutionProof, BoundaryApprovalObservation, BoundaryApprovalPlan, BoundaryFinancialReadiness, ControlledExecutionProof, ControlledRebalancingExecution } from "../domain/types";
import { ApiError, apiRequest } from "../api/client";
function unwrap<T>(v:ApiEnvelope<T>):T{return v.data;}
export interface ControlledExecutionRepository {
  prepareApproval(boundaryId:string):Promise<{plan:BoundaryApprovalPlan;readiness?:BoundaryFinancialReadiness}>;
  getApproval(boundaryId:string):Promise<{plan:BoundaryApprovalPlan;observation?:BoundaryApprovalObservation}|undefined>;
  reviewApproval(approvalPlanId:string):Promise<BoundaryApprovalPlan>;
  observeApproval(approvalPlanId:string,proof:BoundaryApprovalExecutionProof):Promise<{plan:BoundaryApprovalPlan;readiness?:BoundaryFinancialReadiness;observation?:BoundaryApprovalObservation}>;
  prepareExecution(boundaryId:string):Promise<ControlledRebalancingExecution>;
  getExecutionForBoundary(boundaryId:string):Promise<ControlledRebalancingExecution|undefined>;
  observeExecution(executionId:string,proof:ControlledExecutionProof):Promise<{execution:ControlledRebalancingExecution;intent?:import("../domain/types").RebalancingJobIntent}>;
  reconcileExecution(executionId:string):Promise<{execution:ControlledRebalancingExecution;intent?:import("../domain/types").RebalancingJobIntent}>;
}
export class ApiControlledExecutionRepository implements ControlledExecutionRepository {
  async prepareApproval(boundaryId:string){const v=unwrap(await apiRequest<ApiEnvelope<BoundaryApprovalPlanResponse>>(`/v1/execution-boundaries/${encodeURIComponent(boundaryId)}/approval-plans`,{method:"POST",body:"{}"}));return{plan:v.plan,readiness:v.readiness};}
  async getApproval(boundaryId:string){try{const v=unwrap(await apiRequest<ApiEnvelope<BoundaryApprovalPlanResponse>>(`/v1/execution-boundaries/${encodeURIComponent(boundaryId)}/approval-plan`));return{plan:v.plan,observation:v.observation};}catch(cause){if(cause instanceof ApiError&&cause.status===404)return undefined;throw cause;}}
  async reviewApproval(id:string){return unwrap(await apiRequest<ApiEnvelope<BoundaryApprovalPlanResponse>>(`/v1/approval-plans/${encodeURIComponent(id)}/review`,{method:"POST",body:"{}"})).plan;}
  async observeApproval(id:string,proof:BoundaryApprovalExecutionProof){const payload:ObserveBoundaryApprovalRequest={proof};const v=unwrap(await apiRequest<ApiEnvelope<BoundaryApprovalPlanResponse>>(`/v1/approval-plans/${encodeURIComponent(id)}/observe`,{method:"POST",body:JSON.stringify(payload)}));return{plan:v.plan,readiness:v.readiness,observation:v.observation};}
  async prepareExecution(boundaryId:string){return unwrap(await apiRequest<ApiEnvelope<ControlledExecutionResponse>>(`/v1/execution-boundaries/${encodeURIComponent(boundaryId)}/controlled-executions`,{method:"POST",body:"{}"})).execution;}
  async getExecutionForBoundary(boundaryId:string){try{return unwrap(await apiRequest<ApiEnvelope<ControlledExecutionResponse>>(`/v1/execution-boundaries/${encodeURIComponent(boundaryId)}/controlled-execution`)).execution;}catch(cause){if(cause instanceof ApiError&&cause.status===404)return undefined;throw cause;}}
  async observeExecution(id:string,proof:ControlledExecutionProof){const payload:ObserveControlledExecutionRequest={proof};const v=unwrap(await apiRequest<ApiEnvelope<ControlledExecutionResponse>>(`/v1/controlled-executions/${encodeURIComponent(id)}/observe`,{method:"POST",body:JSON.stringify(payload)}));return{execution:v.execution,intent:v.intent};}
  async reconcileExecution(id:string){const v=unwrap(await apiRequest<ApiEnvelope<ControlledExecutionResponse>>(`/v1/controlled-executions/${encodeURIComponent(id)}/reconcile`,{method:"POST",body:"{}"}));return{execution:v.execution,intent:v.intent};}
}
export const controlledExecutionRepository:ControlledExecutionRepository=new ApiControlledExecutionRepository();
