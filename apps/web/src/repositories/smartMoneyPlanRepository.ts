import type { ApiEnvelope, BuyerSmartMoneyPlansResponse, CreateSmartMoneyPlanRequest, SmartMoneyPlanResponse } from "@spotriq/api-contracts";
import type { BuyerSmartMoneyPlans, SmartMoneyPlan } from "../domain/types";
import { apiRequest } from "../api/client";

const unwrap=<T,>(value:ApiEnvelope<T>):T=>value.data;
export interface SmartMoneyPlanRepository {
  create(checkSessionId:string,input:CreateSmartMoneyPlanRequest):Promise<SmartMoneyPlan>;
  get(planId:string):Promise<SmartMoneyPlan>;
  listForBuyer(address:string):Promise<BuyerSmartMoneyPlans>;
}
export class ApiSmartMoneyPlanRepository implements SmartMoneyPlanRepository {
  async create(checkSessionId:string,input:CreateSmartMoneyPlanRequest){return unwrap(await apiRequest<ApiEnvelope<SmartMoneyPlanResponse>>(`/v1/checks/${encodeURIComponent(checkSessionId)}/plans`,{method:"POST",body:JSON.stringify(input)})).plan;}
  async get(planId:string){return unwrap(await apiRequest<ApiEnvelope<SmartMoneyPlanResponse>>(`/v1/plans/${encodeURIComponent(planId)}`)).plan;}
  async listForBuyer(address:string){return unwrap(await apiRequest<ApiEnvelope<BuyerSmartMoneyPlansResponse>>(`/v1/accounts/${encodeURIComponent(address)}/plans`)).state;}
}
export const smartMoneyPlanRepository:SmartMoneyPlanRepository=new ApiSmartMoneyPlanRepository();
