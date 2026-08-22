import type { FastifyInstance } from "fastify";
import type { ApiEnvelope, BoundaryFinancialReadinessResponse, BoundaryFinancialSessionResponse, ExecutionBoundaryPreflightResponse, FinancialExecutionBoundaryResponse, ObserveBoundaryFinancialSessionRequest, PrepareRebalancingExecutionPlanRequest, RebalancingExecutionPlanResponse, ReverifyBoundaryFinancialSessionRequest } from "@spotriq/api-contracts";
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
  app.post<{Params:{boundaryId:string};Body:ObserveBoundaryFinancialSessionRequest}>("/v1/execution-boundaries/:boundaryId/financial-sessions",async(request,reply)=>{
    const boundary=await boundaries.get(id(request.params.boundaryId,"boundaryId")); if(!request.body?.proof) throw new ApiInputError("Boundary financial-session proof is required.","INVALID_FINANCIAL_SESSION");
    const plan=await plans.get(boundary.planId); const permission=await authority.getRequest(boundary.permissionRequestId);
    const session=await authority.observeBoundaryFinancialSession(boundary,plan,permission,request.body.proof);
    const linked=session.state==="ACTIVE"?await boundaries.linkFinancialSession(boundary.boundaryId,session):boundary;
    const updated=await authority.getRequest(permission.permissionRequestId); const data:BoundaryFinancialSessionResponse={session,boundary:linked,request:updated}; return reply.code(201).send(envelope(data,request.id));
  });
  app.get<{Params:{boundaryId:string}}>("/v1/execution-boundaries/:boundaryId/financial-session",async(request,reply)=>{const boundaryId=id(request.params.boundaryId,"boundaryId");const session=await authority.getBoundaryFinancialSessionForBoundary(boundaryId);if(!session)return reply.code(404).send({error:{code:"BOUNDARY_FINANCIAL_SESSION_NOT_FOUND",message:"No boundary-controlled Altana financial session has been recorded for this execution boundary.",recoverable:true,retryable:false,correlationId:request.id}});const data:BoundaryFinancialSessionResponse={session};return reply.send(envelope(data,request.id));});
  app.get<{Params:{financialSessionId:string}}>("/v1/financial-sessions/:financialSessionId",async(request,reply)=>{const session=await authority.getBoundaryFinancialSession(id(request.params.financialSessionId,"financialSessionId"));const data:BoundaryFinancialSessionResponse={session};return reply.send(envelope(data,request.id));});
  app.post<{Params:{financialSessionId:string};Body:ReverifyBoundaryFinancialSessionRequest}>("/v1/financial-sessions/:financialSessionId/reverify",async(request,reply)=>{const session=await authority.reverifyBoundaryFinancialSession(id(request.params.financialSessionId,"financialSessionId"),request.body??{});const data:BoundaryFinancialSessionResponse={session};return reply.send(envelope(data,request.id));});
  app.post<{Params:{boundaryId:string}}>("/v1/execution-boundaries/:boundaryId/financial-readiness",async(request,reply)=>{const boundary=await boundaries.get(id(request.params.boundaryId,"boundaryId"));const session=await authority.getBoundaryFinancialSessionForBoundary(boundary.boundaryId);if(!session)throw new ApiInputError("Create and verify the boundary-controlled financial session before checking financial readiness.","FINANCIAL_SESSION_REQUIRED");const plan=await plans.get(boundary.planId);const readiness=await authority.assessBoundaryFinancialReadiness(boundary,plan,session.financialSessionId);const data:BoundaryFinancialReadinessResponse={readiness};return reply.send(envelope(data,request.id));});
  app.get<{Params:{boundaryId:string}}>("/v1/execution-boundaries/:boundaryId/financial-readiness",async(request,reply)=>{const boundaryId=id(request.params.boundaryId,"boundaryId");const readiness=await authority.getBoundaryFinancialReadiness(boundaryId);if(!readiness)return reply.code(404).send({error:{code:"FINANCIAL_READINESS_NOT_FOUND",message:"No token balance/allowance readiness observation exists for this boundary.",recoverable:true,retryable:false,correlationId:request.id}});const data:BoundaryFinancialReadinessResponse={readiness};return reply.send(envelope(data,request.id));});
  app.post<{Params:{boundaryId:string}}>("/v1/execution-boundaries/:boundaryId/preflight",async(request,reply)=>{const boundary=await boundaries.get(id(request.params.boundaryId,"boundaryId"));const permission=await authority.getRequest(boundary.permissionRequestId);const session=await authority.getBoundaryFinancialSessionForBoundary(boundary.boundaryId);const preflight=await boundaries.preflight(boundary.boundaryId,permission,session);const data:ExecutionBoundaryPreflightResponse={preflight};return reply.send(envelope(data,request.id));});
}
