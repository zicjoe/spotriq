import type { FastifyInstance } from "fastify";
import type {
  ApiEnvelope,
  BoundaryApprovalPlanResponse,
  ControlledExecutionResponse,
  ObserveBoundaryApprovalRequest,
  ObserveControlledExecutionRequest,
} from "@spotriq/api-contracts";
import type { ControlledExecutionEngine } from "@spotriq/controlled-execution";
import type { JobIntentEngine } from "@spotriq/job-intents";
import type { ActivityOutcomesEngine } from "@spotriq/activity-outcomes";
import { ApiInputError } from "../errors.js";

function id(value:string|undefined,label:string):string { const v=value?.trim();if(!v||v.length>1024)throw new ApiInputError(`${label} is required.`,"INVALID_ID");return v; }
function envelope<T>(data:T,requestId:string):ApiEnvelope<T>{return{data,meta:{requestId,generatedAt:new Date().toISOString()}};}

export async function registerControlledExecutionRoutes(app:FastifyInstance,engine:ControlledExecutionEngine,jobs:JobIntentEngine,activityOutcomes?:ActivityOutcomesEngine):Promise<void>{
  app.post<{Params:{boundaryId:string}}>("/v1/execution-boundaries/:boundaryId/approval-plans",async(request,reply)=>{
    const result=await engine.prepareApprovalPlan(id(request.params.boundaryId,"boundaryId"));
    const data:BoundaryApprovalPlanResponse={plan:result.plan,readiness:result.readiness};return reply.code(201).send(envelope(data,request.id));
  });
  app.get<{Params:{boundaryId:string}}>("/v1/execution-boundaries/:boundaryId/approval-plan",async(request,reply)=>{
    const plan=await engine.getApprovalPlanForBoundary(id(request.params.boundaryId,"boundaryId"));
    if(!plan)return reply.code(404).send({error:{code:"APPROVAL_PLAN_NOT_FOUND",message:"No bounded approval plan exists for this execution boundary.",recoverable:true,retryable:false,correlationId:request.id}});
    const observation=await engine.getApprovalObservationForPlan(plan.approvalPlanId);const data:BoundaryApprovalPlanResponse={plan,observation};return reply.send(envelope(data,request.id));
  });
  app.post<{Params:{approvalPlanId:string}}>("/v1/approval-plans/:approvalPlanId/review",async(request,reply)=>{const plan=await engine.reviewApprovalPlan(id(request.params.approvalPlanId,"approvalPlanId"));const data:BoundaryApprovalPlanResponse={plan};return reply.send(envelope(data,request.id));});
  app.post<{Params:{approvalPlanId:string};Body:ObserveBoundaryApprovalRequest}>("/v1/approval-plans/:approvalPlanId/observe",async(request,reply)=>{
    if(!request.body?.proof)throw new ApiInputError("Altana approval execution proof is required.","INVALID_APPROVAL_PROOF");
    const result=await engine.observeApproval(id(request.params.approvalPlanId,"approvalPlanId"),request.body.proof);const data:BoundaryApprovalPlanResponse=result;return reply.send(envelope(data,request.id));
  });

  app.post<{Params:{boundaryId:string}}>("/v1/execution-boundaries/:boundaryId/controlled-executions",async(request,reply)=>{
    const result=await engine.prepareExecution(id(request.params.boundaryId,"boundaryId"));const data:ControlledExecutionResponse=result;return reply.code(201).send(envelope(data,request.id));
  });
  app.get<{Params:{boundaryId:string}}>("/v1/execution-boundaries/:boundaryId/controlled-execution",async(request,reply)=>{
    const execution=await engine.getExecutionForBoundary(id(request.params.boundaryId,"boundaryId"));
    if(!execution)return reply.code(404).send({error:{code:"CONTROLLED_EXECUTION_NOT_FOUND",message:"No controlled execution exists for this boundary.",recoverable:true,retryable:false,correlationId:request.id}});
    const data:ControlledExecutionResponse={execution};return reply.send(envelope(data,request.id));
  });
  app.get<{Params:{executionId:string}}>("/v1/controlled-executions/:executionId",async(request,reply)=>{const execution=await engine.getExecution(id(request.params.executionId,"executionId"));const data:ControlledExecutionResponse={execution};return reply.send(envelope(data,request.id));});
  app.post<{Params:{executionId:string};Body:ObserveControlledExecutionRequest}>("/v1/controlled-executions/:executionId/observe",async(request,reply)=>{
    if(!request.body?.proof)throw new ApiInputError("Altana controlled execution proof is required.","INVALID_EXECUTION_PROOF");
    const execution=await engine.observeExecution(id(request.params.executionId,"executionId"),request.body.proof);let intent;
    if(execution.state==="CONFIRMED"){
      intent=await jobs.linkControlledExecution(execution.jobIntentId,execution);
      if(activityOutcomes){
        try{await activityOutcomes.sync(execution.executionId);}
        catch(cause){request.log.warn({err:cause,executionId:execution.executionId},"Activity & Outcomes sync failed after confirmed execution; execution truth remains confirmed and evidence can be refreshed independently.");}
      }
    }
    const data:ControlledExecutionResponse={execution,intent};return reply.send(envelope(data,request.id));
  });
  app.post<{Params:{executionId:string}}>("/v1/controlled-executions/:executionId/reconcile",async(request,reply)=>{
    const execution=await engine.reconcileExecution(id(request.params.executionId,"executionId"));let intent;
    if(execution.state==="CONFIRMED"){
      intent=await jobs.linkControlledExecution(execution.jobIntentId,execution);
      if(activityOutcomes){
        try{await activityOutcomes.sync(execution.executionId);}
        catch(cause){request.log.warn({err:cause,executionId:execution.executionId},"Activity & Outcomes sync failed after confirmed execution; execution truth remains confirmed and evidence can be refreshed independently.");}
      }
    }
    const data:ControlledExecutionResponse={execution,intent};return reply.send(envelope(data,request.id));
  });
}
