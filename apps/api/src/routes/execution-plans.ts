import type { FastifyInstance } from "fastify";
import type { ApiEnvelope, ExecutionBoundaryPreflightResponse, FinancialExecutionBoundaryResponse, PrepareRebalancingExecutionPlanRequest, RebalancingExecutionPlanResponse } from "@spotriq/api-contracts";
import type { AuthorityEngine } from "@spotriq/authority";
import type { ExecutionBoundaryEngine } from "@spotriq/execution-boundary";
import type { ExecutionPlanEngine } from "@spotriq/execution-plans";
import type { JobIntentEngine } from "@spotriq/job-intents";
import { ApiInputError } from "../errors.js";

function id(value:string|undefined,label:string):string { const v=value?.trim(); if(!v||v.length>1024) throw new ApiInputError(`${label} is required.`,"INVALID_ID"); return v; }
function ticks(body:PrepareRebalancingExecutionPlanRequest|undefined):PrepareRebalancingExecutionPlanRequest { if(!body||!Number.isInteger(body.targetTickLower)||!Number.isInteger(body.targetTickUpper)) throw new ApiInputError("targetTickLower and targetTickUpper must be integers.","INVALID_EXECUTION_PLAN"); return body; }
function envelope<T>(data:T,requestId:string):ApiEnvelope<T>{return{data,meta:{requestId,generatedAt:new Date().toISOString()}};}

export async function registerExecutionPlanRoutes(app:FastifyInstance, plans:ExecutionPlanEngine, boundaries:ExecutionBoundaryEngine, authority:AuthorityEngine, jobs:JobIntentEngine):Promise<void>{
  app.post<{Params:{jobIntentId:string};Body:PrepareRebalancingExecutionPlanRequest}>("/v1/job-intents/:jobIntentId/execution-plans",async(request,reply)=>{
    const job=await jobs.get(id(request.params.jobIntentId,"jobIntentId"));
    if(!job.authority.permissionRequestId) throw new ApiInputError("Prepare bounded authority before constructing the execution plan.","PERMISSION_REQUIRED");
    const permission=await authority.getRequest(job.authority.permissionRequestId);
    const plan=await plans.prepare(job,permission,ticks(request.body));
    const data:RebalancingExecutionPlanResponse={plan,request:permission}; return reply.code(201).send(envelope(data,request.id));
  });
  app.get<{Params:{planId:string}}>("/v1/execution-plans/:planId",async(request,reply)=>{const plan=await plans.get(id(request.params.planId,"planId"));const data:RebalancingExecutionPlanResponse={plan};return reply.send(envelope(data,request.id));});
  app.get<{Params:{jobIntentId:string}}>("/v1/job-intents/:jobIntentId/execution-plan",async(request,reply)=>{const plan=await plans.getForJob(id(request.params.jobIntentId,"jobIntentId"));if(!plan)return reply.code(404).send({error:{code:"EXECUTION_PLAN_NOT_FOUND",message:"No execution plan exists for this Job Intent.",recoverable:true,retryable:false,correlationId:request.id}});const data:RebalancingExecutionPlanResponse={plan};return reply.send(envelope(data,request.id));});
  app.post<{Params:{planId:string}}>("/v1/execution-plans/:planId/review",async(request,reply)=>{
    const existing=await plans.get(id(request.params.planId,"planId"));const job=await jobs.get(existing.jobIntentId);const permission=await authority.getRequest(existing.permissionRequestId);const plan=await plans.review(existing.planId,job,permission);const updated=await authority.applyExecutionPlan(permission.permissionRequestId,plan);const data:RebalancingExecutionPlanResponse={plan,request:updated};return reply.send(envelope(data,request.id));
  });
  app.post<{Params:{planId:string}}>("/v1/execution-plans/:planId/seal-boundary",async(request,reply)=>{
    const plan=await plans.get(id(request.params.planId,"planId"));const permission=await authority.getRequest(plan.permissionRequestId);const boundary=await boundaries.seal(plan,permission);await plans.linkBoundary(plan.planId,boundary.boundaryId);const updated=await authority.applyExecutionBoundary(permission.permissionRequestId,boundary);const data:FinancialExecutionBoundaryResponse={boundary,request:updated};return reply.code(201).send(envelope(data,request.id));
  });
  app.get<{Params:{boundaryId:string}}>("/v1/execution-boundaries/:boundaryId",async(request,reply)=>{const boundary=await boundaries.get(id(request.params.boundaryId,"boundaryId"));const data:FinancialExecutionBoundaryResponse={boundary};return reply.send(envelope(data,request.id));});
  app.post<{Params:{boundaryId:string}}>("/v1/execution-boundaries/:boundaryId/preflight",async(request,reply)=>{const boundary=await boundaries.get(id(request.params.boundaryId,"boundaryId"));const permission=await authority.getRequest(boundary.permissionRequestId);const preflight=await boundaries.preflight(boundary.boundaryId,permission);const data:ExecutionBoundaryPreflightResponse={preflight};return reply.send(envelope(data,request.id));});
}
