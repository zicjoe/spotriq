import type { FastifyInstance } from "fastify";
import type {
  ApiEnvelope,
  EndMyAgentRelationshipRequest,
  MarketplaceActivationResponse,
  MyAgentsPortfolioResponse,
  MyAgentSwitchResponse,
  MyAgentSwitchesResponse,
  SwitchMyAgentRequest,
} from "@spotriq/api-contracts";
import type { MyAgentsEngine } from "@spotriq/my-agents";
import { ApiInputError } from "../errors.js";

function id(value:string|undefined,label:string,max=1024):string{const v=value?.trim();if(!v||v.length>max)throw new ApiInputError(`${label} is required.`,"INVALID_ID");return v;}
function bodyObject<T>(value:T|undefined):T{if(!value||typeof value!=="object"||Array.isArray(value))throw new ApiInputError("A JSON request body is required.","INVALID_BODY");return value;}
function envelope<T>(data:T,requestId:string):ApiEnvelope<T>{return{data,meta:{requestId,generatedAt:new Date().toISOString()}};}

export async function registerMyAgentsRoutes(app:FastifyInstance,myAgents:MyAgentsEngine):Promise<void>{
  app.get<{Params:{address:string}}>('/v1/accounts/:address/my-agents',async(request,reply)=>{
    const portfolio=await myAgents.getPortfolio(id(request.params.address,'address'));
    const data:MyAgentsPortfolioResponse={portfolio};
    return reply.send(envelope(data,request.id));
  });
  app.get<{Params:{address:string}}>('/v1/accounts/:address/my-agents/switches',async(request,reply)=>{
    const switches=await myAgents.listSwitches(id(request.params.address,'address'));
    const data:MyAgentSwitchesResponse={switches};
    return reply.send(envelope(data,request.id));
  });
  app.post<{Params:{address:string;activationId:string};Body:SwitchMyAgentRequest}>('/v1/accounts/:address/my-agents/:activationId/switch',async(request,reply)=>{
    const input=bodyObject(request.body);
    const result=await myAgents.switchService({buyerAddress:id(request.params.address,'address'),sourceActivationId:id(request.params.activationId,'activationId'),targetServiceId:id(input.targetServiceId,'targetServiceId'),idempotencyKey:id(input.idempotencyKey,'idempotencyKey',160)});
    const data:MyAgentSwitchResponse={switch:result};
    return reply.code(result.state==='COMPLETED'?201:200).send(envelope(data,request.id));
  });
  app.post<{Params:{address:string;activationId:string};Body:EndMyAgentRelationshipRequest}>('/v1/accounts/:address/my-agents/:activationId/revoke',async(request,reply)=>{
    const input=bodyObject(request.body);
    const address=id(request.params.address,'address');
    if(input.buyerAddress.trim().toLowerCase()!==address.trim().toLowerCase())throw new ApiInputError("buyerAddress must match the account path.","WRONG_BUYER");
    const activation=await myAgents.revokeRelationship({buyerAddress:address,activationId:id(request.params.activationId,'activationId')});
    const data:MarketplaceActivationResponse={activation};
    return reply.send(envelope(data,request.id));
  });
}
