import type { FastifyInstance } from "fastify";
import type {
  ActivationRuntimeStateResponse,
  ApiEnvelope,
  InvokeActivationServiceTaskRequest,
  InvokeServiceTaskRequest,
  ServiceTaskForActivationResponse,
  ServiceTaskForJobResponse,
  ServiceTaskResponse,
} from "@spotriq/api-contracts";
import type { JobIntentEngine } from "@spotriq/job-intents";
import type { ServiceTaskEngine } from "@spotriq/service-tasks";
import type { CommercialEngine } from "@spotriq/commercial";
import { ApiInputError } from "../errors.js";

function id(value:string|undefined,label:string):string { const v=value?.trim(); if(!v||v.length>1024) throw new ApiInputError(`${label} is required.`,"INVALID_ID"); return v; }
function bodyObject<T>(value:T|undefined):T{if(!value||typeof value!=="object"||Array.isArray(value))throw new ApiInputError("A JSON request body is required.","INVALID_BODY");return value;}
function envelope<T>(data:T,requestId:string):ApiEnvelope<T>{return{data,meta:{requestId,generatedAt:new Date().toISOString()}};}

export async function registerServiceTaskRoutes(app:FastifyInstance,tasks:ServiceTaskEngine,jobs:JobIntentEngine,commercial:CommercialEngine):Promise<void>{
  app.post<{Params:{jobIntentId:string};Body?:InvokeServiceTaskRequest}>('/v1/job-intents/:jobIntentId/service-tasks',async(request,reply)=>{
    const job=await jobs.get(id(request.params.jobIntentId,'jobIntentId'));
    const activationId=request.body?.activationId?.trim();
    const activation=activationId?await commercial.assertActivationForService({activationId,serviceId:job.selectedService.serviceId,buyerAddress:job.walletAddress}):undefined;
    const task=await tasks.invoke(job,activation);
    const intent=await jobs.linkServiceTask(job.jobIntentId,task);
    const data:ServiceTaskResponse={task,intent};
    return reply.code(201).send(envelope(data,request.id));
  });

  app.post<{Params:{activationId:string};Body:InvokeActivationServiceTaskRequest}>('/v1/activations/:activationId/service-tasks',async(request,reply)=>{
    const input=bodyObject(request.body);
    const activation=await commercial.getActivation(id(request.params.activationId,'activationId'));
    await commercial.assertActivationForService({activationId:activation.activationId,serviceId:activation.serviceId,buyerAddress:input.buyerAddress});
    const task=await tasks.invokeActivation(activation,{tokenId:input.tokenId,poolAddress:input.poolAddress,capitalAsset:input.capitalAsset,capitalAmount:input.capitalAmount});
    const data:ServiceTaskResponse={task};
    return reply.code(201).send(envelope(data,request.id));
  });

  app.get<{Params:{activationId:string}}>('/v1/activations/:activationId/service-task',async(request,reply)=>{
    const activation=await commercial.getActivation(id(request.params.activationId,'activationId'));
    const task=await tasks.getForActivation(activation.activationId)??null;
    const data:ServiceTaskForActivationResponse={task};
    return reply.send(envelope(data,request.id));
  });

  app.get<{Params:{activationId:string}}>('/v1/activations/:activationId/runtime-state',async(request,reply)=>{
    const activation=await commercial.getActivation(id(request.params.activationId,'activationId'));
    const state=await tasks.getActivationRuntimeState(activation);
    const data:ActivationRuntimeStateResponse={state};
    return reply.send(envelope(data,request.id));
  });

  app.post<{Params:{activationId:string};Body:InvokeActivationServiceTaskRequest}>('/v1/activations/:activationId/service-task/retry',async(request,reply)=>{
    const input=bodyObject(request.body);
    const activation=await commercial.getActivation(id(request.params.activationId,'activationId'));
    await commercial.assertActivationForService({activationId:activation.activationId,serviceId:activation.serviceId,buyerAddress:input.buyerAddress});
    const current=await tasks.getForActivation(activation.activationId);
    if(!current)throw new ApiInputError("No activation-bound service task exists to retry.","INVALID_ID");
    const task=await tasks.retryActivation(activation,current.serviceTaskId,{tokenId:input.tokenId,poolAddress:input.poolAddress,capitalAsset:input.capitalAsset,capitalAmount:input.capitalAmount});
    const data:ServiceTaskResponse={task};
    return reply.send(envelope(data,request.id));
  });

  app.get<{Params:{jobIntentId:string}}>('/v1/job-intents/:jobIntentId/service-task',async(request,reply)=>{
    const jobIntentId=id(request.params.jobIntentId,'jobIntentId');
    await jobs.get(jobIntentId);
    const task=await tasks.getForJob(jobIntentId)??null;
    const data:ServiceTaskForJobResponse={task};
    return reply.send(envelope(data,request.id));
  });

  app.get<{Params:{serviceTaskId:string}}>('/v1/service-tasks/:serviceTaskId',async(request,reply)=>{
    const task=await tasks.get(id(request.params.serviceTaskId,'serviceTaskId'));
    const data:ServiceTaskResponse={task};
    return reply.send(envelope(data,request.id));
  });

  app.post<{Params:{serviceTaskId:string}}>('/v1/service-tasks/:serviceTaskId/reconcile',async(request,reply)=>{
    const task=await tasks.reconcile(id(request.params.serviceTaskId,'serviceTaskId'));
    const intent=task.jobIntentId?await jobs.linkServiceTask(task.jobIntentId,task):undefined;
    const data:ServiceTaskResponse={task,intent};
    return reply.send(envelope(data,request.id));
  });

  app.post<{Params:{serviceTaskId:string}}>('/v1/service-tasks/:serviceTaskId/retry',async(request,reply)=>{
    const current=await tasks.get(id(request.params.serviceTaskId,'serviceTaskId'));
    if(!current.jobIntentId)throw new ApiInputError("Activation-bound tasks must be retried through the Activation route so buyer coherence is checked.","INVALID_ID");
    const job=await jobs.get(current.jobIntentId);
    const task=await tasks.retry(job,current.serviceTaskId);
    const intent=await jobs.linkServiceTask(job.jobIntentId,task);
    const data:ServiceTaskResponse={task,intent};
    return reply.send(envelope(data,request.id));
  });

  app.post<{Params:{serviceTaskId:string}}>('/v1/service-tasks/:serviceTaskId/cancel',async(request,reply)=>{
    const task=await tasks.cancel(id(request.params.serviceTaskId,'serviceTaskId'));
    const intent=task.jobIntentId?await jobs.linkServiceTask(task.jobIntentId,task):undefined;
    const data:ServiceTaskResponse={task,intent};
    return reply.send(envelope(data,request.id));
  });
}
