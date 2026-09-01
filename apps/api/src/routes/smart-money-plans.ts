import type { FastifyInstance } from "fastify";
import type { ApiEnvelope, BuyerSmartMoneyPlansResponse, CreateSmartMoneyPlanRequest, SmartMoneyPlanResponse } from "@spotriq/api-contracts";
import type { SmartMoneyPlanEngine } from "@spotriq/smart-money-plans";

const meta=(requestId:string)=>({requestId,generatedAt:new Date().toISOString()});
export async function registerSmartMoneyPlanRoutes(app:FastifyInstance,plans:SmartMoneyPlanEngine){
  app.post<{Params:{checkSessionId:string};Body:CreateSmartMoneyPlanRequest}>("/v1/checks/:checkSessionId/plans",async(request,reply)=>{
    const plan=await plans.create({checkSessionId:request.params.checkSessionId,buyerAddress:request.body.buyerAddress,idempotencyKey:request.body.idempotencyKey,findingIds:request.body.findingIds});
    const body:ApiEnvelope<SmartMoneyPlanResponse>={data:{plan},meta:meta(request.id)};return reply.code(201).send(body);
  });
  app.get<{Params:{planId:string}}>("/v1/plans/:planId",async(request,reply)=>{
    const plan=await plans.get(request.params.planId);const body:ApiEnvelope<SmartMoneyPlanResponse>={data:{plan},meta:meta(request.id)};return reply.send(body);
  });
  app.get<{Params:{address:string}}>("/v1/accounts/:address/plans",async(request,reply)=>{
    const state=await plans.listForBuyer(request.params.address);const body:ApiEnvelope<BuyerSmartMoneyPlansResponse>={data:{state},meta:meta(request.id)};return reply.send(body);
  });
}
