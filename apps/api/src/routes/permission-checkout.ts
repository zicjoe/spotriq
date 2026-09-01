import type { FastifyInstance } from "fastify";
import type {
  ApiEnvelope,
  BuyerPermissionStateResponse,
  CancelPermissionCheckoutRequest,
  ConfirmPermissionCheckoutRequest,
  CreatePermissionCheckoutRequest,
  PermissionCheckoutResponse,
  ReconcileScopedPermissionGrantRequest,
  ScopedPermissionRequestResponse,
} from "@spotriq/api-contracts";
import type { PermissionCheckoutEngine } from "@spotriq/permission-checkout";
import { ApiInputError } from "../errors.js";

function generatedAt():string{return new Date().toISOString();}
function id(value:string|undefined,label:string):string{if(!value?.trim())throw new ApiInputError(`${label} is required.`,"INVALID_ID");return value.trim();}
function body<T>(value:T|undefined,label:string):T{if(!value||typeof value!=="object")throw new ApiInputError(`${label} is required.`,"INVALID_PERMISSION_SCOPE");return value;}

export async function registerPermissionCheckoutRoutes(app:FastifyInstance,engine:PermissionCheckoutEngine):Promise<void>{
  app.post<{Params:{activationId:string};Body:CreatePermissionCheckoutRequest}>("/v1/activations/:activationId/permission-checkouts",async(request,reply)=>{
    const input=body(request.body,"Permission checkout input");
    const checkout=await engine.create(id(request.params.activationId,"activationId"),input);
    const data:PermissionCheckoutResponse={checkout}; const envelope:ApiEnvelope<PermissionCheckoutResponse>={data,meta:{requestId:request.id,generatedAt:generatedAt()}}; return reply.code(201).send(envelope);
  });
  app.get<{Params:{activationId:string}}>("/v1/activations/:activationId/permission-checkout",async(request,reply)=>{
    const checkout=await engine.getForActivation(id(request.params.activationId,"activationId"));
    const data:{checkout:import("@spotriq/domain").PermissionCheckout|null}={checkout:checkout??null}; const envelope:ApiEnvelope<typeof data>={data,meta:{requestId:request.id,generatedAt:generatedAt()}}; return reply.send(envelope);
  });
  app.get<{Params:{checkoutId:string}}>("/v1/permission-checkouts/:checkoutId",async(request,reply)=>{
    const checkout=await engine.get(id(request.params.checkoutId,"checkoutId")); const data:PermissionCheckoutResponse={checkout}; const envelope:ApiEnvelope<PermissionCheckoutResponse>={data,meta:{requestId:request.id,generatedAt:generatedAt()}}; return reply.send(envelope);
  });
  app.post<{Params:{checkoutId:string};Body:ConfirmPermissionCheckoutRequest}>("/v1/permission-checkouts/:checkoutId/confirm",async(request,reply)=>{
    const input=body(request.body,"Permission checkout confirmation"); const scoped=await engine.confirm(id(request.params.checkoutId,"checkoutId"),input); const data:ScopedPermissionRequestResponse={request:scoped}; const envelope:ApiEnvelope<ScopedPermissionRequestResponse>={data,meta:{requestId:request.id,generatedAt:generatedAt()}}; return reply.code(201).send(envelope);
  });
  app.post<{Params:{checkoutId:string};Body:CancelPermissionCheckoutRequest}>("/v1/permission-checkouts/:checkoutId/cancel",async(request,reply)=>{
    const input=body(request.body,"Permission checkout cancellation"); const checkout=await engine.cancel(id(request.params.checkoutId,"checkoutId"),input); const data:PermissionCheckoutResponse={checkout}; const envelope:ApiEnvelope<PermissionCheckoutResponse>={data,meta:{requestId:request.id,generatedAt:generatedAt()}}; return reply.send(envelope);
  });
  app.get<{Params:{permissionRequestId:string}}>("/v1/scoped-permission-requests/:permissionRequestId",async(request,reply)=>{
    const scoped=await engine.getRequest(id(request.params.permissionRequestId,"permissionRequestId")); const data:ScopedPermissionRequestResponse={request:scoped}; const envelope:ApiEnvelope<ScopedPermissionRequestResponse>={data,meta:{requestId:request.id,generatedAt:generatedAt()}}; return reply.send(envelope);
  });
  app.post<{Params:{permissionRequestId:string};Body:ReconcileScopedPermissionGrantRequest}>("/v1/scoped-permission-requests/:permissionRequestId/reconcile",async(request,reply)=>{
    const input=body(request.body,"Permission grant reconciliation"); const scoped=await engine.reconcileGrant(id(request.params.permissionRequestId,"permissionRequestId"),input); const data:ScopedPermissionRequestResponse={request:scoped}; const envelope:ApiEnvelope<ScopedPermissionRequestResponse>={data,meta:{requestId:request.id,generatedAt:generatedAt()}}; return reply.send(envelope);
  });
  app.get<{Params:{address:string}}>("/v1/accounts/:address/permission-state",async(request,reply)=>{
    const state=await engine.getBuyerState(id(request.params.address,"address")); const data:BuyerPermissionStateResponse={state}; const envelope:ApiEnvelope<BuyerPermissionStateResponse>={data,meta:{requestId:request.id,generatedAt:generatedAt()}}; return reply.send(envelope);
  });
}
