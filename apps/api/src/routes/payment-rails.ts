import type { FastifyInstance } from "fastify";
import type { BscChainReader } from "@spotriq/chain";
import type { ApiEnvelope, PaymentRailsStatusResponse } from "@spotriq/api-contracts";
import { readPaymentRailsStatus } from "@spotriq/payment-rails";
function envelope<T>(data:T,requestId:string):ApiEnvelope<T>{return{data,meta:{requestId,generatedAt:new Date().toISOString()}};}
export async function registerPaymentRailRoutes(app:FastifyInstance,chain:BscChainReader):Promise<void>{
  app.get('/v1/payment-rails/status',async(request,reply)=>{const data:PaymentRailsStatusResponse=await readPaymentRailsStatus(chain);return reply.send(envelope(data,request.id));});
}
