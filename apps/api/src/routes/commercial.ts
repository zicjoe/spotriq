import type { FastifyInstance } from "fastify";
import type {
  ActivateCommercialHireRequest,
  ActivationControlResponse,
  ApiEnvelope,
  BuyerCommercialStateResponse,
  CommercialHireResponse,
  CommercialPaymentResponse,
  CommercialQuoteResponse,
  CreateCommercialHireRequest,
  CreateCommercialQuoteRequest,
  MarketplaceActivationResponse,
  MarketplaceOffersResponse,
  ReconcileCommercialPaymentRequest,
  RevokeMarketplaceActivationRequest,
} from "@spotriq/api-contracts";
import type { CommercialEngine } from "@spotriq/commercial";
import type { PermissionCheckoutEngine } from "@spotriq/permission-checkout";
import { ApiInputError } from "../errors.js";

function id(value:string|undefined,label:string):string{const v=value?.trim();if(!v||v.length>1024)throw new ApiInputError(`${label} is required.`,"INVALID_ID");return v;}
function bodyObject<T>(value:T|undefined):T{if(!value||typeof value!=="object"||Array.isArray(value))throw new ApiInputError("A JSON request body is required.","INVALID_BODY");return value;}
function envelope<T>(data:T,requestId:string):ApiEnvelope<T>{return{data,meta:{requestId,generatedAt:new Date().toISOString()}};}

export async function registerCommercialRoutes(app:FastifyInstance,commercial:CommercialEngine,permissionCheckout?:PermissionCheckoutEngine):Promise<void>{
  app.get<{Params:{serviceId:string}}>('/v1/services/:serviceId/offers',async(request,reply)=>{
    const offers=await commercial.listOffers(id(request.params.serviceId,'serviceId'));
    const data:MarketplaceOffersResponse={offers};
    return reply.send(envelope(data,request.id));
  });

  app.post<{Body:CreateCommercialQuoteRequest}>('/v1/quotes',async(request,reply)=>{
    const input=bodyObject(request.body);
    const quote=await commercial.createQuote(input);
    const data:CommercialQuoteResponse={quote};
    return reply.code(201).send(envelope(data,request.id));
  });
  app.get<{Params:{quoteId:string}}>('/v1/quotes/:quoteId',async(request,reply)=>{
    const quote=await commercial.getQuote(id(request.params.quoteId,'quoteId'));
    const data:CommercialQuoteResponse={quote};
    return reply.send(envelope(data,request.id));
  });

  app.post<{Body:CreateCommercialHireRequest}>('/v1/hires',async(request,reply)=>{
    const input=bodyObject(request.body);
    const hire=await commercial.createHire(input);
    const data:CommercialHireResponse={hire};
    return reply.code(201).send(envelope(data,request.id));
  });
  app.get<{Params:{hireId:string}}>('/v1/hires/:hireId',async(request,reply)=>{
    const hire=await commercial.getHire(id(request.params.hireId,'hireId'));
    const data:CommercialHireResponse={hire};
    return reply.send(envelope(data,request.id));
  });
  app.get<{Params:{hireId:string}}>('/v1/hires/:hireId/payment',async(request,reply)=>{
    const payment=await commercial.getPayment(id(request.params.hireId,'hireId'));
    const data:CommercialPaymentResponse={payment};
    return reply.send(envelope(data,request.id));
  });
  app.post<{Params:{hireId:string};Body:ReconcileCommercialPaymentRequest}>('/v1/hires/:hireId/payment/reconcile',async(request,reply)=>{
    const input=bodyObject(request.body);
    const payment=await commercial.reconcilePayment(id(request.params.hireId,'hireId'),{buyerAddress:input.buyerAddress,reference:input.reference??{}});
    const data:CommercialPaymentResponse={payment};
    return reply.send(envelope(data,request.id));
  });
  app.post<{Params:{hireId:string};Body:ActivateCommercialHireRequest}>('/v1/hires/:hireId/activate',async(request,reply)=>{
    const input=bodyObject(request.body);
    const activation=await commercial.activate(id(request.params.hireId,'hireId'),input);
    const data:MarketplaceActivationResponse={activation};
    return reply.code(201).send(envelope(data,request.id));
  });

  app.get<{Params:{activationId:string}}>('/v1/activations/:activationId',async(request,reply)=>{
    const activation=await commercial.getActivation(id(request.params.activationId,'activationId'));
    const data:MarketplaceActivationResponse={activation};
    return reply.send(envelope(data,request.id));
  });
  app.get<{Params:{activationId:string}}>('/v1/activations/:activationId/control',async(request,reply)=>{
    const control=await commercial.getActivationControl(id(request.params.activationId,'activationId'));
    const data:ActivationControlResponse={control};
    return reply.send(envelope(data,request.id));
  });
  app.post<{Params:{activationId:string};Body:RevokeMarketplaceActivationRequest}>('/v1/activations/:activationId/revoke',async(request,reply)=>{
    const input=bodyObject(request.body);
    const activationId=id(request.params.activationId,'activationId');
    if(permissionCheckout){
      const checkout=await permissionCheckout.getForActivation(activationId);
      if(checkout?.permissionRequestId){
        const permissionRequest=await permissionCheckout.getRequest(checkout.permissionRequestId);
        if(permissionRequest.state==='GRANT_RECONCILED'&&permissionRequest.permissionGrantId) throw new ApiInputError(`PermissionGrant ${permissionRequest.permissionGrantId} is independently active. Revoke the provider grant before ending the marketplace relationship.`,'ACTIVE_PERMISSION_GRANT');
      }
    }
    const activation=await commercial.revokeActivation(activationId,input);
    const data:MarketplaceActivationResponse={activation};
    return reply.send(envelope(data,request.id));
  });
  app.get<{Params:{address:string}}>('/v1/accounts/:address/commercial-state',async(request,reply)=>{
    const state=await commercial.getBuyerState(id(request.params.address,'address'));
    const data:BuyerCommercialStateResponse={state};
    return reply.send(envelope(data,request.id));
  });
}
