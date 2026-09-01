import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ApiEnvelope, AgentStudioDeploymentResponse, AgentStudioOperatorStateResponse, AgentStudioReconciliationResponse, AgentStudioStatusResponse, ImportAgentStudioDeploymentRequest } from "@spotriq/api-contracts";
import type { OperatorWorkspaceEngine } from "@spotriq/operator-workspace";
import type { AgentStudioEngine } from "@spotriq/agent-studio";
import { ApiInputError } from "../errors.js";
function envelope<T>(data:T,requestId:string):ApiEnvelope<T>{return{data,meta:{requestId,generatedAt:new Date().toISOString()}};}
function body<T>(v:T|undefined):T{if(!v||typeof v!=="object"||Array.isArray(v))throw new ApiInputError("A JSON request body is required.","INVALID_BODY");return v;}
function bearer(request:FastifyRequest){const m=/^Bearer\s+(.+)$/i.exec(request.headers.authorization??"");if(!m)throw new ApiInputError("Bearer operator session is required.","AUTH_REQUIRED");return m[1]!.trim();}
export async function registerAgentStudioRoutes(app:FastifyInstance,studio:AgentStudioEngine,operator:OperatorWorkspaceEngine){
  app.get("/v1/agent-studio/status",async(request,reply)=>{const data:AgentStudioStatusResponse={status:await studio.getStatus()};return reply.send(envelope(data,request.id));});
  app.get("/v1/operator/agent-studio/deployments",async(request,reply)=>{const session=await operator.authenticate(bearer(request));const data:AgentStudioOperatorStateResponse={state:await studio.list(session)};return reply.send(envelope(data,request.id));});
  app.post<{Body:ImportAgentStudioDeploymentRequest}>("/v1/operator/agent-studio/deployments",async(request,reply)=>{const session=await operator.authenticate(bearer(request));const deployment=await studio.importDeployment(session,body(request.body));const data:AgentStudioDeploymentResponse={deployment};return reply.code(201).send(envelope(data,request.id));});
  app.post<{Params:{deploymentId:string}}>("/v1/operator/agent-studio/deployments/:deploymentId/reconcile",async(request,reply)=>{const session=await operator.authenticate(bearer(request));const reconciliation=await studio.reconcile(session,request.params.deploymentId);const data:AgentStudioReconciliationResponse={reconciliation};return reply.send(envelope(data,request.id));});
}
