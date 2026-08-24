import type { FastifyInstance } from "fastify";
import type { ApiEnvelope, ServiceTaskForJobResponse, ServiceTaskResponse } from "@spotriq/api-contracts";
import type { JobIntentEngine } from "@spotriq/job-intents";
import type { ServiceTaskEngine } from "@spotriq/service-tasks";
import { ApiInputError } from "../errors.js";

function id(value:string|undefined,label:string):string { const v=value?.trim(); if(!v||v.length>1024) throw new ApiInputError(`${label} is required.`,"INVALID_ID"); return v; }
function envelope<T>(data:T,requestId:string):ApiEnvelope<T>{return{data,meta:{requestId,generatedAt:new Date().toISOString()}};}

export async function registerServiceTaskRoutes(app:FastifyInstance,tasks:ServiceTaskEngine,jobs:JobIntentEngine):Promise<void>{
  app.post<{Params:{jobIntentId:string}}>('/v1/job-intents/:jobIntentId/service-tasks',async(request,reply)=>{
    const job=await jobs.get(id(request.params.jobIntentId,'jobIntentId'));
    const task=await tasks.invoke(job);
    const intent=await jobs.linkServiceTask(job.jobIntentId,task);
    const data:ServiceTaskResponse={task,intent};
    return reply.code(201).send(envelope(data,request.id));
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
    const intent=await jobs.linkServiceTask(task.jobIntentId,task);
    const data:ServiceTaskResponse={task,intent};
    return reply.send(envelope(data,request.id));
  });

  app.post<{Params:{serviceTaskId:string}}>('/v1/service-tasks/:serviceTaskId/retry',async(request,reply)=>{
    const current=await tasks.get(id(request.params.serviceTaskId,'serviceTaskId'));
    const job=await jobs.get(current.jobIntentId);
    const task=await tasks.retry(job,current.serviceTaskId);
    const intent=await jobs.linkServiceTask(job.jobIntentId,task);
    const data:ServiceTaskResponse={task,intent};
    return reply.send(envelope(data,request.id));
  });

  app.post<{Params:{serviceTaskId:string}}>('/v1/service-tasks/:serviceTaskId/cancel',async(request,reply)=>{
    const task=await tasks.cancel(id(request.params.serviceTaskId,'serviceTaskId'));
    const intent=await jobs.linkServiceTask(task.jobIntentId,task);
    const data:ServiceTaskResponse={task,intent};
    return reply.send(envelope(data,request.id));
  });
}
