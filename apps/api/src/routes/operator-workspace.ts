import type { FastifyInstance, FastifyRequest } from "fastify";
import type {
  ApiEnvelope, ClaimOperatorAgentRequest, CreateOperatorChallengeRequest, OperatorAgentClaimResponse,
  OperatorChallengeResponse, OperatorEvidenceResponse, OperatorServiceDeclarationResponse, OperatorSessionResponse,
  OperatorTestLabResponse, OperatorWorkspaceResponse, SubmitOperatorEvidenceRequest, TransitionOperatorServiceRequest,
  UpsertOperatorServiceDeclarationRequest, VerifyOperatorChallengeRequest,
} from "@spotriq/api-contracts";
import type { OperatorSession } from "@spotriq/domain";
import type { OperatorWorkspaceEngine } from "@spotriq/operator-workspace";
import { ApiInputError } from "../errors.js";

function envelope<T>(data:T,requestId:string):ApiEnvelope<T>{return{data,meta:{requestId,generatedAt:new Date().toISOString()}};}
function object<T>(v:T|undefined):T{if(!v||typeof v!=="object"||Array.isArray(v))throw new ApiInputError("A JSON request body is required.","INVALID_BODY");return v;}
function bearer(request:FastifyRequest):string{const h=request.headers.authorization;const m=/^Bearer\s+(.+)$/i.exec(h??"");if(!m)throw new ApiInputError("Bearer operator session is required.","AUTH_REQUIRED");return m[1]!.trim();}

export async function registerOperatorWorkspaceRoutes(app:FastifyInstance,engine:OperatorWorkspaceEngine):Promise<void>{
  async function session(request:FastifyRequest):Promise<OperatorSession>{return engine.authenticate(bearer(request));}
  app.post<{Body:CreateOperatorChallengeRequest}>("/v1/operator/auth/challenge",async(request,reply)=>{const b=object(request.body);const challenge=await engine.createChallenge(b.address);const data:OperatorChallengeResponse={challenge};return reply.code(201).send(envelope(data,request.id));});
  app.post<{Body:VerifyOperatorChallengeRequest}>("/v1/operator/auth/verify",async(request,reply)=>{const b=object(request.body);const result=await engine.verifyChallenge(b);const data:OperatorSessionResponse=result;return reply.code(201).send(envelope(data,request.id));});
  app.get("/v1/operator/workspace",async(request,reply)=>{const workspace=await engine.getWorkspace(await session(request));const data:OperatorWorkspaceResponse={workspace};return reply.send(envelope(data,request.id));});
  app.post<{Body:ClaimOperatorAgentRequest}>("/v1/operator/claims",async(request,reply)=>{const claim=await engine.claimAgent(await session(request),object(request.body));const data:OperatorAgentClaimResponse={claim};return reply.code(201).send(envelope(data,request.id));});
  app.put<{Body:UpsertOperatorServiceDeclarationRequest}>("/v1/operator/services",async(request,reply)=>{const declaration=await engine.upsertDeclaration(await session(request),object(request.body));const data:OperatorServiceDeclarationResponse={declaration};return reply.send(envelope(data,request.id));});
  app.post<{Params:{declarationId:string};Body:TransitionOperatorServiceRequest}>("/v1/operator/services/:declarationId/transition",async(request,reply)=>{const declaration=await engine.transition(await session(request),request.params.declarationId,object(request.body).state);const data:OperatorServiceDeclarationResponse={declaration};return reply.send(envelope(data,request.id));});
  app.post<{Body:SubmitOperatorEvidenceRequest}>("/v1/operator/evidence",async(request,reply)=>{const evidence=await engine.submitEvidence(await session(request),object(request.body));const data:OperatorEvidenceResponse={evidence};return reply.code(201).send(envelope(data,request.id));});
  app.post<{Params:{serviceId:string}}>("/v1/operator/services/:serviceId/test-lab",async(request,reply)=>{const result=await engine.runMarketplaceTests(await session(request),request.params.serviceId);const data:OperatorTestLabResponse=result;return reply.send(envelope(data,request.id));});
}
