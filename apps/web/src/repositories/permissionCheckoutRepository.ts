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
import type { BuyerPermissionState, PermissionCheckout, ScopedPermissionRequest } from "../domain/types";
import { apiRequest } from "../api/client";

function unwrap<T>(value:ApiEnvelope<T>):T{return value.data;}
export interface PermissionCheckoutRepository{
  create(activationId:string,input:CreatePermissionCheckoutRequest):Promise<PermissionCheckout>;
  get(checkoutId:string):Promise<PermissionCheckout>;
  getForActivation(activationId:string):Promise<PermissionCheckout|null>;
  confirm(checkoutId:string,input:ConfirmPermissionCheckoutRequest):Promise<ScopedPermissionRequest>;
  cancel(checkoutId:string,input:CancelPermissionCheckoutRequest):Promise<PermissionCheckout>;
  getRequest(permissionRequestId:string):Promise<ScopedPermissionRequest>;
  reconcile(permissionRequestId:string,input:ReconcileScopedPermissionGrantRequest):Promise<ScopedPermissionRequest>;
  getBuyerState(address:string):Promise<BuyerPermissionState>;
}
class ApiPermissionCheckoutRepository implements PermissionCheckoutRepository{
  async create(activationId:string,input:CreatePermissionCheckoutRequest){return unwrap(await apiRequest<ApiEnvelope<PermissionCheckoutResponse>>(`/v1/activations/${encodeURIComponent(activationId)}/permission-checkouts`,{method:"POST",body:JSON.stringify(input)})).checkout;}
  async get(checkoutId:string){return unwrap(await apiRequest<ApiEnvelope<PermissionCheckoutResponse>>(`/v1/permission-checkouts/${encodeURIComponent(checkoutId)}`)).checkout;}
  async getForActivation(activationId:string){return unwrap(await apiRequest<ApiEnvelope<{checkout:PermissionCheckout|null}>>(`/v1/activations/${encodeURIComponent(activationId)}/permission-checkout`)).checkout;}
  async confirm(checkoutId:string,input:ConfirmPermissionCheckoutRequest){return unwrap(await apiRequest<ApiEnvelope<ScopedPermissionRequestResponse>>(`/v1/permission-checkouts/${encodeURIComponent(checkoutId)}/confirm`,{method:"POST",body:JSON.stringify(input)})).request;}
  async cancel(checkoutId:string,input:CancelPermissionCheckoutRequest){return unwrap(await apiRequest<ApiEnvelope<PermissionCheckoutResponse>>(`/v1/permission-checkouts/${encodeURIComponent(checkoutId)}/cancel`,{method:"POST",body:JSON.stringify(input)})).checkout;}
  async getRequest(permissionRequestId:string){return unwrap(await apiRequest<ApiEnvelope<ScopedPermissionRequestResponse>>(`/v1/scoped-permission-requests/${encodeURIComponent(permissionRequestId)}`)).request;}
  async reconcile(permissionRequestId:string,input:ReconcileScopedPermissionGrantRequest){return unwrap(await apiRequest<ApiEnvelope<ScopedPermissionRequestResponse>>(`/v1/scoped-permission-requests/${encodeURIComponent(permissionRequestId)}/reconcile`,{method:"POST",body:JSON.stringify(input)})).request;}
  async getBuyerState(address:string){return unwrap(await apiRequest<ApiEnvelope<BuyerPermissionStateResponse>>(`/v1/accounts/${encodeURIComponent(address)}/permission-state`)).state;}
}
export const permissionCheckoutRepository:PermissionCheckoutRepository=new ApiPermissionCheckoutRepository();
