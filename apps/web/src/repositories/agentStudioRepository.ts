import type { ApiEnvelope, AgentStudioDeploymentResponse, AgentStudioOperatorStateResponse, AgentStudioReconciliationResponse, AgentStudioStatusResponse, ImportAgentStudioDeploymentRequest } from "@spotriq/api-contracts";
import { apiRequest } from "../api/client";
function token(){return sessionStorage.getItem("spotriq.operator.session")??"";}
function auth():HeadersInit{const t=token();return t?{authorization:`Bearer ${t}`}:{}}
async function data<T>(path:string,init?:RequestInit):Promise<T>{const body=await apiRequest<ApiEnvelope<T>>(path,{...init,headers:{...(init?.headers??{}),...auth()}});return body.data;}
export const agentStudioRepository={
  async status(){return (await data<AgentStudioStatusResponse>("/v1/agent-studio/status")).status;},
  async list(){return (await data<AgentStudioOperatorStateResponse>("/v1/operator/agent-studio/deployments")).state;},
  async importDeployment(input:ImportAgentStudioDeploymentRequest){return (await data<AgentStudioDeploymentResponse>("/v1/operator/agent-studio/deployments",{method:"POST",body:JSON.stringify(input)})).deployment;},
  async reconcile(deploymentId:string){return (await data<AgentStudioReconciliationResponse>(`/v1/operator/agent-studio/deployments/${encodeURIComponent(deploymentId)}/reconcile`,{method:"POST",body:"{}"})).reconciliation;},
};
