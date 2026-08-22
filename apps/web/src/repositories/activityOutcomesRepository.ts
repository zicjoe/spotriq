import type { ApiEnvelope, ExecutionActivityOutcomesResponse } from "@spotriq/api-contracts";
import type { ExecutionActivityOutcomeBundle } from "../domain/types";
import { apiRequest } from "../api/client";
function unwrap<T>(v:ApiEnvelope<T>):T{return v.data;}
export interface ActivityOutcomesRepository { get(executionId:string):Promise<ExecutionActivityOutcomeBundle>; sync(executionId:string):Promise<ExecutionActivityOutcomeBundle>; }
export class ApiActivityOutcomesRepository implements ActivityOutcomesRepository {
  async get(id:string){return unwrap(await apiRequest<ApiEnvelope<ExecutionActivityOutcomesResponse>>(`/v1/controlled-executions/${encodeURIComponent(id)}/activity-outcomes`)).bundle;}
  async sync(id:string){return unwrap(await apiRequest<ApiEnvelope<ExecutionActivityOutcomesResponse>>(`/v1/controlled-executions/${encodeURIComponent(id)}/activity-outcomes/sync`,{method:"POST",body:"{}"})).bundle;}
}
export const activityOutcomesRepository:ActivityOutcomesRepository=new ApiActivityOutcomesRepository();
