import type { ActivationActivityOutcomesResponse, ApiEnvelope } from "@spotriq/api-contracts";
import type { ActivationActivityOutcomeBundle } from "../domain/types";
import { apiRequest } from "../api/client";
function unwrap<T>(value:ApiEnvelope<T>):T{return value.data;}
export interface ActivationActivityOutcomesRepository { get(activationId:string):Promise<ActivationActivityOutcomeBundle>; sync(activationId:string):Promise<ActivationActivityOutcomeBundle>; }
export class ApiActivationActivityOutcomesRepository implements ActivationActivityOutcomesRepository {
  async get(id:string){return unwrap(await apiRequest<ApiEnvelope<ActivationActivityOutcomesResponse>>(`/v1/activations/${encodeURIComponent(id)}/activity-outcomes`)).bundle;}
  async sync(id:string){return unwrap(await apiRequest<ApiEnvelope<ActivationActivityOutcomesResponse>>(`/v1/activations/${encodeURIComponent(id)}/activity-outcomes/sync`,{method:"POST",body:"{}"})).bundle;}
}
export const activationActivityOutcomesRepository:ActivationActivityOutcomesRepository=new ApiActivationActivityOutcomesRepository();
