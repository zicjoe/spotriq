import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AdoptionAnalyticsEngine, AdoptionCategory, AdoptionEventInput, AdoptionFeedbackInput } from "@spotriq/adoption-analytics";

function digest(value:string):Buffer{return createHash("sha256").update(value).digest();}
function bearer(request:FastifyRequest):string|undefined{const value=request.headers.authorization?.trim();if(!value?.toLowerCase().startsWith("bearer "))return undefined;return value.slice(7).trim()||undefined;}
function authorized(request:FastifyRequest,expected:string|undefined):boolean{const actual=bearer(request);if(!expected||!actual)return false;return timingSafeEqual(digest(actual),digest(expected));}
function adminError(requestId:string,code:string,message:string){return{error:{code,message,recoverable:true,retryable:false,correlationId:requestId}};}
function sessionId(request:FastifyRequest,body:Record<string,unknown>):string{const fromBody=typeof body.sessionId==="string"?body.sessionId:"";const fromHeader=typeof request.headers["x-spotriq-session-id"]==="string"?request.headers["x-spotriq-session-id"]:"";return fromBody||fromHeader;}
function acceptance(request:FastifyRequest):boolean{return request.headers["x-spotriq-acceptance"]==="1";}

export async function registerAdoptionAnalyticsRoutes(app:FastifyInstance,engine:AdoptionAnalyticsEngine,adminToken?:string):Promise<void>{
  app.post<{Body:Record<string,unknown>}>('/v1/analytics/events',async(request,reply)=>{
    const body=request.body??{};
    const input:AdoptionEventInput={eventName:body.eventName as AdoptionEventInput["eventName"],sessionId:sessionId(request,body),channel:acceptance(request)?"ACCEPTANCE":"PRODUCT",category:body.category as AdoptionCategory|undefined,serviceId:typeof body.serviceId==="string"?body.serviceId:undefined,subjectId:typeof body.subjectId==="string"?body.subjectId:undefined};
    const event=await engine.recordEvent(input);
    return reply.code(202).send({data:{accepted:true,eventId:event.eventId,eventName:event.eventName,channel:event.channel},meta:{requestId:request.id,generatedAt:new Date().toISOString()}});
  });
  app.post<{Body:Record<string,unknown>}>('/v1/analytics/feedback',async(request,reply)=>{
    const body=request.body??{};
    const input:AdoptionFeedbackInput={context:body.context as AdoptionFeedbackInput["context"],sessionId:sessionId(request,body),channel:acceptance(request)?"ACCEPTANCE":"PRODUCT",category:body.category as AdoptionCategory|undefined,serviceId:typeof body.serviceId==="string"?body.serviceId:undefined,reasonCode:body.reasonCode as AdoptionFeedbackInput["reasonCode"],score:typeof body.score==="number"?body.score as 1|2|3|4|5:undefined,comment:typeof body.comment==="string"?body.comment:undefined};
    const feedback=await engine.recordFeedback(input);
    return reply.code(202).send({data:{accepted:true,feedbackId:feedback.feedbackId,context:feedback.context,channel:feedback.channel},meta:{requestId:request.id,generatedAt:new Date().toISOString()}});
  });
  const requireAdmin=(request:FastifyRequest,reply:FastifyReply):boolean=>{if(!adminToken){reply.code(503).send(adminError(request.id,"ADMIN_DIAGNOSTICS_NOT_CONFIGURED","Adoption analytics administration is disabled until SPOTRIQ_ADMIN_DIAGNOSTICS_TOKEN is configured."));return false;}if(!authorized(request,adminToken)){reply.code(401).header("www-authenticate","Bearer").send(adminError(request.id,"ADMIN_DIAGNOSTICS_AUTH_REQUIRED","A valid admin diagnostics bearer token is required."));return false;}return true;};
  app.get<{Querystring:{from?:string;to?:string;category?:AdoptionCategory}}>('/v1/admin/adoption-analytics',async(request,reply)=>{if(!requireAdmin(request,reply))return;const report=await engine.report(request.query);return reply.send({data:{report},meta:{requestId:request.id,generatedAt:new Date().toISOString()}});});
  app.get<{Querystring:{from?:string;to?:string;category?:AdoptionCategory}}>('/v1/admin/adoption-analytics/export',async(request,reply)=>{if(!requireAdmin(request,reply))return;const report=await engine.report(request.query);reply.header("Content-Disposition",`attachment; filename=spotriq-adoption-${new Date().toISOString().slice(0,10)}.json`);reply.type("application/json; charset=utf-8");return reply.send(JSON.stringify({report},null,2));});
}
