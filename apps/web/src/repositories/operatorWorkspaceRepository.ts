import type {
  ClaimOperatorAgentRequest, OperatorAgentClaimResponse, OperatorChallengeResponse, OperatorEvidenceResponse,
  OperatorServiceDeclarationResponse, OperatorSessionResponse, OperatorTestLabResponse, OperatorWorkspaceResponse,
  SubmitOperatorEvidenceRequest, TransitionOperatorServiceRequest, UpsertOperatorServiceDeclarationRequest,
} from "@spotriq/api-contracts";
import type { ApiEnvelope } from "@spotriq/api-contracts";
import type { OperatorSupplyLifecycleState } from "../domain/types";
import { apiRequest } from "../api/client";

let token = sessionStorage.getItem("spotriq.operator.session") ?? "";
function auth():HeadersInit{return token?{authorization:`Bearer ${token}`}:{}}
async function data<T>(path:string,init?:RequestInit):Promise<T>{const body=await apiRequest<ApiEnvelope<T>>(path,{...init,headers:{...(init?.headers??{}),...auth()}});return body.data;}
export const operatorWorkspaceRepository={
  hasSession:()=>Boolean(token),
  clearSession(){token="";sessionStorage.removeItem("spotriq.operator.session");},
  async challenge(address:string){return (await data<OperatorChallengeResponse>("/v1/operator/auth/challenge",{method:"POST",body:JSON.stringify({address})})).challenge;},
  async verify(challengeId:string,signature:string){const result=await data<OperatorSessionResponse>("/v1/operator/auth/verify",{method:"POST",body:JSON.stringify({challengeId,signature})});token=result.token;sessionStorage.setItem("spotriq.operator.session",token);return result.session;},
  async workspace(){return (await data<OperatorWorkspaceResponse>("/v1/operator/workspace")).workspace;},
  async claim(input:ClaimOperatorAgentRequest){return (await data<OperatorAgentClaimResponse>("/v1/operator/claims",{method:"POST",body:JSON.stringify(input)})).claim;},
  async saveService(input:UpsertOperatorServiceDeclarationRequest){return (await data<OperatorServiceDeclarationResponse>("/v1/operator/services",{method:"PUT",body:JSON.stringify(input)})).declaration;},
  async transition(declarationId:string,state:OperatorSupplyLifecycleState){const input:TransitionOperatorServiceRequest={state};return (await data<OperatorServiceDeclarationResponse>(`/v1/operator/services/${encodeURIComponent(declarationId)}/transition`,{method:"POST",body:JSON.stringify(input)})).declaration;},
  async evidence(input:SubmitOperatorEvidenceRequest){return (await data<OperatorEvidenceResponse>("/v1/operator/evidence",{method:"POST",body:JSON.stringify(input)})).evidence;},
  async test(serviceId:string){return data<OperatorTestLabResponse>(`/v1/operator/services/${encodeURIComponent(serviceId)}/test-lab`,{method:"POST",body:"{}"});},
};
