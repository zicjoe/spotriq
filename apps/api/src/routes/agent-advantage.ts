import type { FastifyInstance } from "fastify";
import type { AgentAdvantageEngine } from "@spotriq/agent-advantage";
import type {
  AgentAdvantageReportResponse,
  AgentAdvantageReportsResponse,
  AgentAdvantageStatusResponse,
  ApiEnvelope,
  BuyerAgentAdvantageResponse,
} from "@spotriq/api-contracts";
import { ApiInputError } from "../errors.js";

function id(value:string|undefined,label:string){const v=value?.trim();if(!v)throw new ApiInputError(`${label} is required.`,"INVALID_INPUT");return v;}
function envelope<T>(data:T,requestId:string):ApiEnvelope<T>{return{data,meta:{requestId,generatedAt:new Date().toISOString()}};}

export async function registerAgentAdvantageRoutes(app:FastifyInstance,engine:AgentAdvantageEngine):Promise<void>{
  app.get("/v1/agent-advantage/status",async(request,reply)=>{const data:AgentAdvantageStatusResponse={status:engine.status()};return reply.send(envelope(data,request.id));});
  app.post<{Params:{activationId:string}}>("/v1/activations/:activationId/advantage-reports/sync",async(request,reply)=>{const report=await engine.measure(id(request.params.activationId,"activationId"));const data:AgentAdvantageReportResponse={report};return reply.send(envelope(data,request.id));});
  app.get<{Params:{activationId:string}}>("/v1/activations/:activationId/advantage-reports/latest",async(request,reply)=>{const report=await engine.latest(id(request.params.activationId,"activationId"));const data:AgentAdvantageReportResponse={report};return reply.send(envelope(data,request.id));});
  app.get<{Params:{activationId:string}}>("/v1/activations/:activationId/advantage-reports",async(request,reply)=>{const reports=await engine.listForActivation(id(request.params.activationId,"activationId"));const data:AgentAdvantageReportsResponse={reports};return reply.send(envelope(data,request.id));});
  app.get<{Params:{address:string}}>("/v1/accounts/:address/advantage-reports",async(request,reply)=>{const state=await engine.listForBuyer(id(request.params.address,"address"));const data:BuyerAgentAdvantageResponse={state};return reply.send(envelope(data,request.id));});
}
