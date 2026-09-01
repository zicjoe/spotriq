import type { FastifyInstance } from "fastify";
import type { ActivationActivityOutcomesEngine } from "@spotriq/activity-outcomes";
import type { ActivationActivityOutcomesResponse, ActivationActivityResponse, ActivationOutcomeResponse, ApiEnvelope } from "@spotriq/api-contracts";
import { ApiInputError } from "../errors.js";

function id(value:string|undefined,label:string){const v=value?.trim();if(!v)throw new ApiInputError(`${label} is required.`,"INVALID_INPUT");return v;}
function envelope<T>(data:T,requestId:string):ApiEnvelope<T>{return{data,meta:{requestId,generatedAt:new Date().toISOString()}};}

export async function registerActivationActivityOutcomeRoutes(app:FastifyInstance,engine:ActivationActivityOutcomesEngine):Promise<void>{
  app.post<{Params:{activationId:string}}>("/v1/activations/:activationId/activity-outcomes/sync",async(request,reply)=>{const bundle=await engine.sync(id(request.params.activationId,"activationId"));const data:ActivationActivityOutcomesResponse={bundle};return reply.send(envelope(data,request.id));});
  app.get<{Params:{activationId:string}}>("/v1/activations/:activationId/activity-outcomes",async(request,reply)=>{const bundle=await engine.get(id(request.params.activationId,"activationId"));const data:ActivationActivityOutcomesResponse={bundle};return reply.send(envelope(data,request.id));});
  app.get<{Params:{activationId:string}}>("/v1/activations/:activationId/activity",async(request,reply)=>{const bundle=await engine.get(id(request.params.activationId,"activationId"));const data:ActivationActivityResponse={activationId:bundle.activation.activationId,activity:bundle.activity};return reply.send(envelope(data,request.id));});
  app.get<{Params:{activationId:string}}>("/v1/activations/:activationId/outcome",async(request,reply)=>{const bundle=await engine.get(id(request.params.activationId,"activationId"));const data:ActivationOutcomeResponse={activationId:bundle.activation.activationId,outcome:bundle.outcome};return reply.send(envelope(data,request.id));});
}
