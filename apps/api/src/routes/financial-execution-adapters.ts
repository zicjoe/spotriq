import type { FastifyInstance } from "fastify";
import type {
  ApiEnvelope,
  CategoryExecutionGuardRequest,
  CategoryExecutionGuardResponse,
  FinancialExecutionAdapterResponse,
  FinancialExecutionAdaptersResponse,
  FinancialExecutionAdapterStateResponse,
  FinancialExecutionPreflightRequest,
  FinancialExecutionPreflightResponse,
} from "@spotriq/api-contracts";
import type { ServiceCategory } from "@spotriq/domain";
import type { FinancialExecutionAdapterEngine } from "@spotriq/financial-execution-adapters";
import { ApiInputError } from "../errors.js";

const generatedAt=()=>new Date().toISOString();
const envelope=<T>(data:T,requestId:string):ApiEnvelope<T>=>({data,meta:{requestId,generatedAt:generatedAt()}});
function category(value:string):ServiceCategory{if(value!=="rebalancing"&&value!=="grid"&&value!=="yield"&&value!=="health")throw new ApiInputError("category must be rebalancing, grid, yield, or health.","INVALID_CATEGORY");return value;}
function id(value:string|undefined,label:string){const v=value?.trim();if(!v)throw new ApiInputError(`${label} is required.`,"INVALID_INPUT");return v;}
function body<T>(value:T|undefined,label:string):T{if(!value)throw new ApiInputError(`${label} body is required.`,"INVALID_INPUT");return value;}

export async function registerFinancialExecutionAdapterRoutes(app:FastifyInstance,engine:FinancialExecutionAdapterEngine):Promise<void>{
  app.get("/v1/execution-adapters",async(request,reply)=>{const data:FinancialExecutionAdaptersResponse={adapters:engine.listAdapters()};return reply.send(envelope(data,request.id));});
  app.get<{Params:{category:string}}>("/v1/execution-adapters/:category",async(request,reply)=>{const data:FinancialExecutionAdapterResponse={adapter:engine.getAdapter(category(request.params.category))};return reply.send(envelope(data,request.id));});
  app.post<{Params:{permissionRequestId:string};Body:FinancialExecutionPreflightRequest}>("/v1/scoped-permission-requests/:permissionRequestId/execution-preflight",async(request,reply)=>{const input=body(request.body,"Execution preflight");const preflight=await engine.preflight(id(request.params.permissionRequestId,"permissionRequestId"),input);const data:FinancialExecutionPreflightResponse={preflight};return reply.send(envelope(data,request.id));});
  app.post<{Params:{permissionRequestId:string};Body:CategoryExecutionGuardRequest}>("/v1/scoped-permission-requests/:permissionRequestId/execution-guard",async(request,reply)=>{const input=body(request.body,"Execution guard");const report=await engine.guard(id(request.params.permissionRequestId,"permissionRequestId"),input);const data:CategoryExecutionGuardResponse={report};return reply.send(envelope(data,request.id));});
  app.get<{Params:{permissionRequestId:string}}>("/v1/scoped-permission-requests/:permissionRequestId/execution-state",async(request,reply)=>{const state=await engine.getState(id(request.params.permissionRequestId,"permissionRequestId"));const data:FinancialExecutionAdapterStateResponse={state};return reply.send(envelope(data,request.id));});
}
