import type { FastifyInstance } from "fastify";
import type { ApiEnvelope, ExecutionActivityOutcomesResponse, ExecutionActivityResponse, ExecutionOutcomeResponse } from "@spotriq/api-contracts";
import type { ActivityOutcomesEngine } from "@spotriq/activity-outcomes";
import { ApiInputError } from "../errors.js";

function id(value:string|undefined,label:string):string{const v=value?.trim();if(!v||v.length>1024)throw new ApiInputError(`${label} is required.`,"INVALID_ID");return v;}
function envelope<T>(data:T,requestId:string):ApiEnvelope<T>{return{data,meta:{requestId,generatedAt:new Date().toISOString()}};}

export async function registerActivityOutcomeRoutes(app:FastifyInstance,engine:ActivityOutcomesEngine):Promise<void>{
  app.post<{Params:{executionId:string}}>("/v1/controlled-executions/:executionId/activity-outcomes/sync",async(request,reply)=>{const bundle=await engine.sync(id(request.params.executionId,"executionId"));const data:ExecutionActivityOutcomesResponse={bundle};return reply.send(envelope(data,request.id));});
  app.get<{Params:{executionId:string}}>("/v1/controlled-executions/:executionId/activity-outcomes",async(request,reply)=>{const bundle=await engine.get(id(request.params.executionId,"executionId"));const data:ExecutionActivityOutcomesResponse={bundle};return reply.send(envelope(data,request.id));});
  app.get<{Params:{executionId:string}}>("/v1/controlled-executions/:executionId/activity",async(request,reply)=>{const bundle=await engine.get(id(request.params.executionId,"executionId"));const data:ExecutionActivityResponse={executionId:bundle.execution.executionId,activity:bundle.activity};return reply.send(envelope(data,request.id));});
  app.get<{Params:{executionId:string}}>("/v1/controlled-executions/:executionId/outcome",async(request,reply)=>{const bundle=await engine.get(id(request.params.executionId,"executionId"));const data:ExecutionOutcomeResponse={executionId:bundle.execution.executionId,outcome:bundle.outcome,evidence:bundle.evidence};return reply.send(envelope(data,request.id));});
}
