import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type {
  AdminOperationalHealthHistoryResponse,
  AdminOperationalHealthResponse,
  ApiEnvelope,
  ApiErrorBody,
  PublicSystemHealthResponse,
} from "@spotriq/api-contracts";
import type { OperationalHealthEngine } from "@spotriq/observability";

function envelope<T>(data:T,requestId:string):ApiEnvelope<T>{return{data,meta:{requestId,generatedAt:new Date().toISOString()}};}
function digest(value:string):Buffer{return createHash("sha256").update(value).digest();}
function bearer(request:FastifyRequest):string|undefined{const value=request.headers.authorization?.trim();if(!value?.toLowerCase().startsWith("bearer "))return undefined;return value.slice(7).trim()||undefined;}
function authorized(request:FastifyRequest,expected:string|undefined):boolean{const actual=bearer(request);if(!expected||!actual)return false;return timingSafeEqual(digest(actual),digest(expected));}

function adminError(requestId:string,code:string,message:string,retryable=false):ApiErrorBody{return{error:{code,message,recoverable:true,retryable,correlationId:requestId}};}

export async function registerObservabilityRoutes(app:FastifyInstance,engine:OperationalHealthEngine,adminToken?:string):Promise<void>{
  app.get("/v1/system/health",async(request,reply)=>{
    const data:PublicSystemHealthResponse={health:await engine.publicCurrent()};
    return reply.send(envelope(data,request.id));
  });

  const requireAdmin=(request:FastifyRequest,reply:FastifyReply):boolean=>{
    if(!adminToken){reply.code(503).send(adminError(request.id,"ADMIN_DIAGNOSTICS_NOT_CONFIGURED","Admin diagnostics are disabled until SPOTRIQ_ADMIN_DIAGNOSTICS_TOKEN is configured."));return false;}
    if(!authorized(request,adminToken)){reply.code(401).header("www-authenticate","Bearer").send(adminError(request.id,"ADMIN_DIAGNOSTICS_AUTH_REQUIRED","A valid admin diagnostics bearer token is required."));return false;}
    return true;
  };

  app.get("/v1/admin/observability",async(request,reply)=>{
    if(!requireAdmin(request,reply))return;
    const data:AdminOperationalHealthResponse={health:await engine.current()};
    return reply.send(envelope(data,request.id));
  });

  app.post("/v1/admin/observability/snapshots",async(request,reply)=>{
    if(!requireAdmin(request,reply))return;
    const data:AdminOperationalHealthResponse={health:await engine.sync()};
    return reply.code(201).send(envelope(data,request.id));
  });

  app.get<{Querystring:{limit?:string}}>("/v1/admin/observability/snapshots",async(request,reply)=>{
    if(!requireAdmin(request,reply))return;
    const raw=request.query.limit;const parsed=raw===undefined?20:Number(raw);
    if(!Number.isInteger(parsed)||parsed<1||parsed>100)return reply.code(400).send(adminError(request.id,"INVALID_LIMIT","limit must be an integer from 1 to 100."));
    const data:AdminOperationalHealthHistoryResponse={history:await engine.history(parsed)};
    return reply.send(envelope(data,request.id));
  });
}
