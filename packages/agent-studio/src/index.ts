import { createHash } from "node:crypto";
import type {
  AgentRegistryChainId,
  AgentStudioDeploymentDeclaration,
  AgentStudioDeploymentReconciliation,
  AgentStudioIntegrationStatus,
  AgentStudioOperatorState,
  AgentStudioProtocol,
  AgentStudioReconciliationCheck,
  OperatorSession,
} from "@spotriq/domain";
import type { AgentRegistryReader } from "@spotriq/agent-registry";
import type { MarketplaceSupplyReader } from "@spotriq/marketplace-supply";
import type { OperatorWorkspaceEngine } from "@spotriq/operator-workspace";

export const AGENT_STUDIO_METHOD = "agent-studio.normalized-reconciliation@1.0.0";
const ADDRESS=/^0x[0-9a-f]{40}$/;
const PROTOCOLS = new Set<AgentStudioProtocol>(["A2A","MCP","X402","ERC8183"]);

export class AgentStudioError extends Error {
  constructor(message:string, public readonly code:"INVALID_INPUT"|"AUTH_REQUIRED"|"CANONICAL_OWNER_REQUIRED"|"SERVICE_NOT_OWNED"|"DEPLOYMENT_NOT_FOUND"|"NETWORK_MISMATCH", public readonly retryable=false, public readonly details?:unknown){super(message);this.name="AgentStudioError";}
}
function required(v:string|undefined,label:string,max=2048){const x=v?.trim();if(!x||x.length>max)throw new AgentStudioError(`${label} is required.`,"INVALID_INPUT");return x;}
function https(v:string,label:string){const x=required(v,label);let u:URL;try{u=new URL(x);}catch{throw new AgentStudioError(`${label} must be a valid HTTPS URL.`,"INVALID_INPUT");}if(u.protocol!=="https:")throw new AgentStudioError(`${label} must use HTTPS.`,"INVALID_INPUT");u.hash="";return u.toString();}
function normalizeAddress(v:string|undefined){const x=(v??"").trim().toLowerCase();return ADDRESS.test(x)?x:undefined;}
function sameEndpoint(a:string|undefined,b:string|undefined){if(!a||!b)return false;try{const x=new URL(a),y=new URL(b);for(const u of [x,y]){u.hash="";u.search="";u.pathname=u.pathname.replace(/\/+$/,"");}return x.toString().replace(/\/$/,"")===y.toString().replace(/\/$/,"");}catch{return false;}}
function digest(prefix:string,...parts:string[]){return `${prefix}:${createHash("sha256").update(parts.join("\0")).digest("hex").slice(0,32)}`;}
function clone<T>(v:T):T{return structuredClone(v);}

export interface SqlQueryExecutor { query<Row=Record<string,unknown>>(text:string,values?:unknown[]):Promise<{rows:Row[];rowCount?:number|null}>; }
export interface AgentStudioStore {
  save(deployment:AgentStudioDeploymentDeclaration,reconciliation?:AgentStudioDeploymentReconciliation|null):Promise<void>;
  get(operatorAddress:string,deploymentId:string):Promise<{deployment:AgentStudioDeploymentDeclaration;reconciliation?:AgentStudioDeploymentReconciliation}|undefined>;
  list(operatorAddress:string):Promise<Array<{deployment:AgentStudioDeploymentDeclaration;reconciliation?:AgentStudioDeploymentReconciliation}>>;
}
export class MemoryAgentStudioStore implements AgentStudioStore {
  private values=new Map<string,{deployment:AgentStudioDeploymentDeclaration;reconciliation?:AgentStudioDeploymentReconciliation}>();
  async save(d:AgentStudioDeploymentDeclaration,r?:AgentStudioDeploymentReconciliation|null){this.values.set(d.deploymentId,{deployment:clone(d),reconciliation:r?clone(r):undefined});}
  async get(a:string,id:string){const v=this.values.get(id);return v?.deployment.operatorAddress===a?clone(v):undefined;}
  async list(a:string){return [...this.values.values()].filter(v=>v.deployment.operatorAddress===a).sort((x,y)=>y.deployment.updatedAt.localeCompare(x.deployment.updatedAt)).map(clone);}
}
export class PostgresAgentStudioStore implements AgentStudioStore {
  constructor(private readonly db:SqlQueryExecutor){}
  async save(d:AgentStudioDeploymentDeclaration,r?:AgentStudioDeploymentReconciliation|null){await this.db.query(`insert into agent_studio_deployments(deployment_id,operator_address,chain_id,agent_id,service_id,state,payload,reconciliation,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10) on conflict(deployment_id) do update set state=excluded.state,payload=excluded.payload,reconciliation=excluded.reconciliation,updated_at=excluded.updated_at`,[d.deploymentId,d.operatorAddress,d.chainId,d.agentId,d.serviceId,r?.state??"DECLARED",JSON.stringify(d),r?JSON.stringify(r):null,d.importedAt,d.updatedAt]);}
  async get(a:string,id:string){const row=(await this.db.query<{payload:AgentStudioDeploymentDeclaration;reconciliation?:AgentStudioDeploymentReconciliation}>(`select payload,reconciliation from agent_studio_deployments where operator_address=$1 and deployment_id=$2`,[a,id])).rows[0];return row?{deployment:row.payload,reconciliation:row.reconciliation??undefined}:undefined;}
  async list(a:string){return(await this.db.query<{payload:AgentStudioDeploymentDeclaration;reconciliation?:AgentStudioDeploymentReconciliation}>(`select payload,reconciliation from agent_studio_deployments where operator_address=$1 order by updated_at desc`,[a])).rows.map(r=>({deployment:r.payload,reconciliation:r.reconciliation??undefined}));}
}

export interface AgentStudioEngine {
  getStatus():Promise<AgentStudioIntegrationStatus>;
  importDeployment(session:OperatorSession,input:{chainId:AgentRegistryChainId;agentId:string;serviceId:string;projectName:string;studioVersion?:string;deploymentTarget:"bnb"|"aws"|"azure";runtimeUrl:string;agentCardUrl:string;protocols:AgentStudioProtocol[];walletKind:"evm-local"|"twak"|"altana"|"unknown";storageProvider:"ipfs"|"local"|"unknown";mcpReadOnly:boolean;declaredVerifyState:"PASSED"|"FAILED"|"NOT_RUN"}):Promise<AgentStudioDeploymentDeclaration>;
  reconcile(session:OperatorSession,deploymentId:string):Promise<AgentStudioDeploymentReconciliation>;
  list(session:OperatorSession):Promise<AgentStudioOperatorState>;
}
export function createAgentStudioEngine(options:{store?:AgentStudioStore;registry:AgentRegistryReader;marketplace:MarketplaceSupplyReader;operatorWorkspace:OperatorWorkspaceEngine;now?:()=>Date}):AgentStudioEngine{
  const store=options.store??new MemoryAgentStudioStore(); const now=options.now??(()=>new Date());
  async function verifyOwner(session:OperatorSession,chainId:AgentRegistryChainId,agentId:string,serviceId?:string){
    const ws=await options.operatorWorkspace.getWorkspace(session); const claim=ws.claims.find(x=>x.chainId===chainId&&x.agentId===agentId); if(!claim)throw new AgentStudioError("Claim the ERC-8004 identity in Operator Workspace before importing an Agent Studio deployment.","SERVICE_NOT_OWNED");
    if(serviceId&&!ws.services.some(x=>x.declaration.serviceId===serviceId&&x.declaration.chainId===chainId&&x.declaration.agentId===agentId))throw new AgentStudioError("Agent Studio deployment must bind to an operator-managed service for the same ERC-8004 identity.","SERVICE_NOT_OWNED");
    const verification=await options.registry.verifyIdentity(chainId,agentId); const owner=normalizeAddress(verification.ownerAddress); if(verification.state!=="VERIFIED"||owner!==session.address.toLowerCase())throw new AgentStudioError("Canonical ERC-8004 owner no longer matches the authenticated operator wallet.","CANONICAL_OWNER_REQUIRED",false,{state:verification.state,ownerAddress:verification.ownerAddress}); return verification;
  }
  return {
    async getStatus(){return{integration:"BNB Agent Studio",mode:"NORMALIZED_ADAPTER",supportedNetworks:["bsc-testnet","bsc-mainnet"],supportedProtocols:["A2A","MCP","X402","ERC8183"],supportedDeploymentTargets:["bnb","aws","azure"],operatorImportRequiresSignedSession:true,operatorImportRequiresCanonicalOwner:true,studioCliDispatchEnabled:false,marketplaceReadinessOverrideEnabled:false,paymentOrExecutionDispatchEnabled:false,checkedAt:now().toISOString(),methodVersion:AGENT_STUDIO_METHOD,limitations:["Spotriq normalizes Agent Studio deployment declarations; it does not shell out to the bag CLI or take custody of Agent Studio wallet secrets.","Operator-supplied Studio metadata never replaces canonical ERC-8004 verification or Marketplace Test Lab evidence.","The managed `bnb` deployment target is treated as testnet-only; mainnet financial/payment dispatch remains disabled."]};},
    async importDeployment(session,input){await verifyOwner(session,input.chainId,input.agentId,input.serviceId); const expectedNetwork=input.chainId===97?"bsc-testnet":"bsc-mainnet"; if(input.deploymentTarget==="bnb"&&input.chainId!==97)throw new AgentStudioError("The managed bnb Agent Studio deployment target is testnet-only.","NETWORK_MISMATCH");
      const protocols=[...new Set(input.protocols)]; if(!protocols.length||protocols.some(p=>!PROTOCOLS.has(p)))throw new AgentStudioError("Agent Studio protocols must use the supported A2A/MCP/X402/ERC8183 set.","INVALID_INPUT"); if(!protocols.includes("A2A"))throw new AgentStudioError("Agent Studio marketplace integration requires an A2A endpoint.","INVALID_INPUT"); if(protocols.includes("MCP")&&!input.mcpReadOnly)throw new AgentStudioError("Agent Studio MCP declaration must remain read-only in Spotriq.","INVALID_INPUT");
      const projectName=required(input.projectName,"projectName",120), runtimeUrl=https(input.runtimeUrl,"runtimeUrl"),agentCardUrl=https(input.agentCardUrl,"agentCardUrl"); const at=now().toISOString(); const deploymentId=digest("studio",session.address,String(input.chainId),input.agentId,input.serviceId,projectName,runtimeUrl); const existing=await store.get(session.address,deploymentId); const d:AgentStudioDeploymentDeclaration={deploymentId,operatorAddress:session.address.toLowerCase(),chainId:input.chainId,network:expectedNetwork,agentId:input.agentId,serviceId:input.serviceId,projectName,studioVersion:input.studioVersion?.trim()||undefined,deploymentTarget:input.deploymentTarget,runtimeUrl,agentCardUrl,protocols,walletKind:input.walletKind,storageProvider:input.storageProvider,mcpReadOnly:input.mcpReadOnly,declaredVerifyState:input.declaredVerifyState,source:"operator-claimed",importedAt:existing?.deployment.importedAt??at,updatedAt:at,limitations:["This is an operator-supplied Agent Studio deployment declaration. Studio provenance is not a substitute for canonical identity, runtime testing, commercial payment evidence, PermissionGrant, execution or outcome evidence."]}; await store.save(d,null); return d;},
    async reconcile(session,deploymentId){const found=await store.get(session.address,required(deploymentId,"deploymentId"));if(!found)throw new AgentStudioError("Agent Studio deployment was not found.","DEPLOYMENT_NOT_FOUND");const d=found.deployment;const verification=await verifyOwner(session,d.chainId,d.agentId,d.serviceId);let service;let tests;try{service=await options.marketplace.getService(d.serviceId);tests=await options.marketplace.getTests(d.serviceId);}catch{/* declaration may not be public yet */}
      const checks:AgentStudioReconciliationCheck[]=[]; const add=(code:AgentStudioReconciliationCheck["code"],label:string,state:AgentStudioReconciliationCheck["state"],required:boolean,provenance:AgentStudioReconciliationCheck["provenance"],detail:string)=>checks.push({code,label,state,required,provenance,detail});
      add("CANONICAL_IDENTITY","Canonical ERC-8004 identity",verification.state==="VERIFIED"?"PASS":"FAIL",true,"marketplace-observed",verification.state==="VERIFIED"?"ERC-8004 identity is canonically verified.":`Canonical verification state is ${verification.state}.`);
      const owner=normalizeAddress(verification.ownerAddress);add("CANONICAL_OWNER","Canonical owner",owner===session.address.toLowerCase()?"PASS":"FAIL",true,"marketplace-observed",owner===session.address.toLowerCase()?"Current ERC-8004 owner matches the authenticated operator.":"Current canonical owner does not match the operator.");
      add("NETWORK","BSC network",(d.chainId===97&&d.network==="bsc-testnet")||(d.chainId===56&&d.network==="bsc-mainnet")?"PASS":"FAIL",true,"marketplace-derived",`${d.network} is bound to chainId ${d.chainId}.`);
      add("SERVICE_BINDING","Spotriq AgentService binding",service&&service.identity.identity.agentId===d.agentId&&service.identity.identity.chainId===d.chainId?"PASS":service?"FAIL":"UNKNOWN",true,"marketplace-derived",service?`Deployment maps to ${d.serviceId}.`:"The operator declaration has not normalized into public marketplace supply yet.");
      const a2a=verification.registrationFile?.services.find(s=>s.name.trim().toUpperCase()==="A2A");add("A2A_REGISTRATION","A2A registration",a2a?(sameEndpoint(a2a.endpoint,d.agentCardUrl)?"PASS":"FAIL"):"UNKNOWN",true,"marketplace-observed",a2a?`Canonical registration A2A endpoint ${a2a.endpoint}.`:"Canonical registration metadata did not expose a parsed A2A service endpoint.");
      add("MARKETPLACE_TEST_LAB","Marketplace Test Lab",tests?.coverage==="PASS"?"PASS":tests?.coverage==="FAIL"?"FAIL":tests?"WARN":"UNKNOWN",true,"marketplace-observed",tests?`Latest Marketplace Test Lab coverage is ${tests.coverage}.`:"No Marketplace Test Lab coverage is available for this service.");
      add("STUDIO_DEPLOY_VERIFY","Agent Studio deploy verify",d.declaredVerifyState==="PASSED"?"PASS":d.declaredVerifyState==="FAILED"?"FAIL":"WARN",false,"operator-claimed",`Operator declared bag deploy verify state: ${d.declaredVerifyState}. This remains Operator Supplied evidence.`);
      add("MCP_READ_ONLY","MCP safety",!d.protocols.includes("MCP")||d.mcpReadOnly?"PASS":"FAIL",true,"operator-claimed",d.protocols.includes("MCP")?"Declared MCP integration is read-only.":"MCP is not declared for this deployment.");
      const rail=service?.offer.terms?.paymentRail; const commerceProtocols=d.protocols.filter(p=>p==="X402"||p==="ERC8183"); const commerceAligned=commerceProtocols.length===0||commerceProtocols.some(p=>(p==="X402"&&rail==="X402")||(p==="ERC8183"&&rail==="ERC8183")); add("COMMERCE_ALIGNMENT","Commerce alignment",commerceAligned?"PASS":"WARN",false,"marketplace-derived",commerceProtocols.length?`Studio declares ${commerceProtocols.join(", ")}; current marketplace Offer rail is ${rail??"undeclared"}.`:"No Studio commerce protocol is declared.");
      add("STORAGE_READINESS","Deployment storage",d.storageProvider==="local"?"WARN":"PASS",false,"operator-claimed",d.storageProvider==="local"?"Local deliverable storage is declared; hosted Agent Studio deployment should use durable remote storage before production use.":`Storage provider: ${d.storageProvider}.`);
      const requiredChecks=checks.filter(c=>c.required);const state:AgentStudioDeploymentReconciliation["state"]=requiredChecks.some(c=>c.state==="FAIL")?"MISMATCH":requiredChecks.every(c=>c.state==="PASS")?"VERIFIED":"PARTIAL";const observedAt=now().toISOString();const r:AgentStudioDeploymentReconciliation={reconciliationId:digest("studio-rec",d.deploymentId,observedAt),deploymentId:d.deploymentId,operatorAddress:d.operatorAddress,serviceId:d.serviceId,chainId:d.chainId,state,checks,canonicalOwnerAddress:owner,marketplaceReadiness:service?.readiness.state,marketplaceTestCoverage:tests?.coverage,observedAt,methodVersion:AGENT_STUDIO_METHOD,limitations:["Agent Studio declaration provenance remains Operator Supplied; only canonical ERC-8004 reads and Marketplace Test Lab observations are decision-grade Spotriq evidence.","A VERIFIED Studio reconciliation does not grant PermissionGrant, payment settlement, financial execution authority or outcome evidence."]};await store.save(d,r);return r;},
    async list(session){return{operatorAddress:session.address.toLowerCase(),deployments:await store.list(session.address.toLowerCase()),generatedAt:now().toISOString(),methodVersion:AGENT_STUDIO_METHOD,limitations:["Agent Studio deployments are normalized provider integrations, not a separate marketplace identity model.","Spotriq does not execute bag CLI commands or receive Agent Studio wallet secrets."]};},
  };
}
