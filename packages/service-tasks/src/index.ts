import { createHash, randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import type {
  AgentAuthorityBinding,
  MarketplaceServiceRecord,
  MarketplaceServiceTestCoverage,
  RebalancingJobIntent,
  RebalancingServiceProposal,
  ServiceTask,
  ServiceTaskAttempt,
  ServiceTaskOriginProof,
  ServiceTaskRequestContext,
  ServiceTaskState,
} from "@spotriq/domain";
import { createEvidenceEnvelope, DATA_SOURCES, EVIDENCE_METHODS } from "@spotriq/evidence";
import { a2aCardUrl, boundedFetch, type MarketplaceSupplyReader, type SafeHttpResult } from "@spotriq/marketplace-supply";

export const SERVICE_TASK_METHOD = "marketplace.service-task-origin@1.0.0";
export const SPOTRIQ_REBALANCING_PROPOSAL_SCHEMA = "urn:spotriq:rebalancing-proposal:v1";
const TEST_FRESHNESS_MS = 60 * 60_000;

export class ServiceTaskError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_INPUT"
      | "INVALID_STATE"
      | "TASK_NOT_FOUND"
      | "SERVICE_NOT_READY"
      | "UNSUPPORTED_INTERFACE"
      | "AUTH_REQUIRED"
      | "ORIGIN_PROOF_FAILED"
      | "REMOTE_ERROR",
    public readonly retryable = false,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ServiceTaskError";
  }
}

export interface SqlQueryResult<Row = Record<string, unknown>> { rows: Row[]; rowCount?: number | null; }
export interface SqlQueryExecutor { query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<SqlQueryResult<Row>>; }

export interface ServiceTaskStore {
  save(task: ServiceTask): Promise<void>;
  get(serviceTaskId: string): Promise<ServiceTask | undefined>;
  getForJob(jobIntentId: string): Promise<ServiceTask | undefined>;
}

export class MemoryServiceTaskStore implements ServiceTaskStore {
  private readonly tasks = new Map<string, ServiceTask>();
  async save(task: ServiceTask): Promise<void> { this.tasks.set(task.serviceTaskId, structuredClone(task)); }
  async get(serviceTaskId: string): Promise<ServiceTask | undefined> { const value = this.tasks.get(serviceTaskId); return value ? structuredClone(value) : undefined; }
  async getForJob(jobIntentId: string): Promise<ServiceTask | undefined> {
    const values = [...this.tasks.values()].filter((task) => task.jobIntentId === jobIntentId).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
    return values[0] ? structuredClone(values[0]) : undefined;
  }
}

export class PostgresServiceTaskStore implements ServiceTaskStore {
  constructor(private readonly database: SqlQueryExecutor) {}
  async save(task: ServiceTask): Promise<void> {
    await this.database.query(
      `insert into service_tasks (service_task_id,job_intent_id,finding_id,service_id,agent_id,state,protocol,protocol_binding,protocol_version,runtime_endpoint,request_context_hash,remote_task_id,remote_message_id,proposal_state,origin_proof_state,commercial_state,payload,created_at,updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19)
       on conflict (service_task_id) do update set state=excluded.state,protocol_binding=excluded.protocol_binding,protocol_version=excluded.protocol_version,runtime_endpoint=excluded.runtime_endpoint,remote_task_id=excluded.remote_task_id,remote_message_id=excluded.remote_message_id,proposal_state=excluded.proposal_state,origin_proof_state=excluded.origin_proof_state,commercial_state=excluded.commercial_state,payload=excluded.payload,updated_at=excluded.updated_at`,
      [task.serviceTaskId,task.jobIntentId,task.findingId,task.serviceId,task.agentId,task.state,task.protocol,task.protocolBinding??null,task.protocolVersion??null,task.runtimeEndpoint??null,task.requestContextHash,task.remoteTaskId??null,task.remoteMessageId??null,task.proposalState,task.originProof.state,task.commercialState,JSON.stringify(task),task.createdAt,task.updatedAt],
    );
  }
  async get(serviceTaskId: string): Promise<ServiceTask | undefined> {
    const result = await this.database.query<{payload: ServiceTask}>("select payload from service_tasks where service_task_id=$1",[serviceTaskId]);
    return result.rows[0]?.payload;
  }
  async getForJob(jobIntentId: string): Promise<ServiceTask | undefined> {
    const result = await this.database.query<{payload: ServiceTask}>("select payload from service_tasks where job_intent_id=$1 order by updated_at desc limit 1",[jobIntentId]);
    return result.rows[0]?.payload;
  }
}

export interface ServiceTaskOptions {
  fetcher?: typeof fetch;
  resolver?: (hostname: string) => Promise<string[]>;
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxRedirects?: number;
  allowInsecureHttp?: boolean;
  now?: () => Date;
}

export interface ServiceTaskEngine {
  invoke(job: RebalancingJobIntent): Promise<ServiceTask>;
  retry(job: RebalancingJobIntent, serviceTaskId: string): Promise<ServiceTask>;
  reconcile(serviceTaskId: string): Promise<ServiceTask>;
  cancel(serviceTaskId: string): Promise<ServiceTask>;
  get(serviceTaskId: string): Promise<ServiceTask>;
  getForJob(jobIntentId: string): Promise<ServiceTask | undefined>;
}

type A2aBinding = "JSONRPC" | "HTTP+JSON";
interface SelectedA2aInterface { url: string; binding: A2aBinding; version: string; tenant?: string; agentCardUrl: string; }
interface ParsedRemote { task?: Record<string, unknown>; message?: Record<string, unknown>; finalUrl: string; }

function asObject(value: unknown): Record<string, unknown> | undefined { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }
function objects(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.map(asObject).filter((value): value is Record<string, unknown> => Boolean(value)) : []; }
function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function safeText(value: unknown, max = 1000): string | undefined { const valueText = text(value); return valueText ? valueText.slice(0,max) : undefined; }
function sha256(value: string): string { return `sha256:${createHash("sha256").update(value).digest("hex")}`; }
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([key,item]) => [key,stable(item)]));
  return value;
}
function canonical(value: unknown): string { return JSON.stringify(stable(value)); }
function normalizeVersion(value: string): string {
  const match = /^(\d+)\.(\d+)/.exec(value.trim());
  if (!match) throw new ServiceTaskError(`Unsupported A2A protocol version ${value || "unknown"}.`,"UNSUPPORTED_INTERFACE");
  return `${Number(match[1])}.${Number(match[2])}`;
}
function major(version: string): number { return Number(version.split(".")[0] ?? "0"); }
function sameOrigin(a: string, b: string): boolean { try { return new URL(a).origin.toLowerCase() === new URL(b).origin.toLowerCase(); } catch { return false; } }
async function defaultResolver(hostname: string): Promise<string[]> {
  const records = await lookup(hostname,{all:true,verbatim:true}) as Array<{ address: string }>;
  return [...new Set(records.map((record)=>record.address))];
}

export function buildServiceTaskRequestContext(job: RebalancingJobIntent): ServiceTaskRequestContext {
  return {
    jobIntentId: job.jobIntentId,
    findingId: job.findingId,
    serviceId: job.selectedService.serviceId,
    agentId: job.selectedService.agentId,
    walletAddress: job.walletAddress.toLowerCase(),
    category: "rebalancing",
    requestedAction: "PREPARE_RANGE_REBALANCE",
    subject: {
      protocol: "PancakeSwap",
      version: job.subject.version,
      network: job.subject.network,
      tokenId: job.subject.tokenId,
      pair: job.subject.pair,
      tickLower: job.subject.tickLower,
      tickUpper: job.subject.tickUpper,
      currentTick: job.subject.currentTick,
      feePips: job.subject.feePips,
      tickSpacing: job.subject.tickSpacing,
      rangeState: job.subject.rangeState,
      blockNumber: job.subject.blockNumber,
    },
    constraints: {...job.constraints},
    expiresAt: job.expiresAt,
  };
}
export function serviceTaskRequestContextHash(job: RebalancingJobIntent): string { return sha256(canonical(buildServiceTaskRequestContext(job))); }
function serviceTaskId(job: RebalancingJobIntent): string { return `service-task:${serviceTaskRequestContextHash(job).slice("sha256:".length)}`; }
function requestId(id: string, attempt: number): string { return `spotriq-${id.slice(-24)}-${attempt}`; }
function messageId(id: string, attempt: number): string { return `msg-${id.slice(-24)}-${attempt}`; }

function assertInvokableJob(job: RebalancingJobIntent, nowMs: number): void {
  if (job.category !== "rebalancing" || job.executionState !== "NO_EXECUTION" || job.state !== "REVIEWABLE") throw new ServiceTaskError("Only a REVIEWABLE Rebalancing Job Intent with NO_EXECUTION can invoke the selected AgentService.","INVALID_STATE");
  if (new Date(job.expiresAt).getTime() <= nowMs) throw new ServiceTaskError("The Job Intent expired before service invocation. Prepare a fresh intent from current market context.","INVALID_STATE");
}

function exactA2aTestEndpoint(tests: MarketplaceServiceTestCoverage, nowMs: number): string | undefined {
  if (tests.coverage !== "PASS" || !tests.observedAt || nowMs - new Date(tests.observedAt).getTime() > TEST_FRESHNESS_MS) return undefined;
  const byEndpoint = new Map<string, Set<string>>();
  for (const test of tests.tests) {
    if (test.interactionKind !== "A2A" || test.state !== "PASS" || !test.endpoint) continue;
    const codes = byEndpoint.get(test.endpoint) ?? new Set<string>(); codes.add(test.code); byEndpoint.set(test.endpoint,codes);
  }
  return [...byEndpoint.entries()].find(([,codes]) => codes.has("ENDPOINT_REACHABILITY") && codes.has("PROTOCOL_CONTRACT") && codes.has("CATEGORY_CAPABILITY"))?.[0];
}

function hasClientAuthRequirement(card: Record<string, unknown>): boolean {
  // A2A 1.0 uses `securityRequirements`; `security` is retained only as a
  // bounded compatibility check for older cards encountered by Spotriq.
  for (const candidate of [card.securityRequirements, card.security]) {
    if (!Array.isArray(candidate)) continue;
    if (candidate.some((requirement) => requirement && typeof requirement === "object" && !Array.isArray(requirement) && Object.keys(requirement as object).length > 0)) return true;
  }
  return false;
}

function selectA2aInterface(card: Record<string,unknown>, cardUrl: string, observedEndpoint: string): SelectedA2aInterface {
  const modern = objects(card.supportedInterfaces);
  for (const item of modern) {
    const url = text(item.url), binding = text(item.protocolBinding || item.transport).toUpperCase(), rawVersion = text(item.protocolVersion);
    if (!url || !rawVersion || (binding !== "JSONRPC" && binding !== "HTTP+JSON")) continue;
    if (!sameOrigin(url, observedEndpoint) || !sameOrigin(url,cardUrl)) continue;
    const tenant = safeText(item.tenant,256);
    return {url,binding:binding as A2aBinding,version:normalizeVersion(rawVersion),tenant,agentCardUrl:cardUrl};
  }
  const legacyUrl = text(card.url), legacyVersion = text(card.protocolVersion), legacyBinding = text(card.preferredTransport || card.transport || "JSONRPC").toUpperCase();
  if (legacyUrl && legacyVersion && (legacyBinding === "JSONRPC" || legacyBinding === "HTTP+JSON") && sameOrigin(legacyUrl,observedEndpoint) && sameOrigin(legacyUrl,cardUrl)) {
    return {url:legacyUrl,binding:legacyBinding as A2aBinding,version:normalizeVersion(legacyVersion),agentCardUrl:cardUrl};
  }
  throw new ServiceTaskError("The tested A2A Agent Card does not expose a same-origin JSONRPC or HTTP+JSON task interface that Spotriq supports.","UNSUPPORTED_INTERFACE");
}

function requestPayload(context: ServiceTaskRequestContext, contextHash: string) {
  return {
    schema: "urn:spotriq:rebalancing-task-request:v1",
    requestContextHash: contextHash,
    jobIntentId: context.jobIntentId,
    findingId: context.findingId,
    serviceId: context.serviceId,
    action: context.requestedAction,
    subject: context.subject,
    constraints: context.constraints,
    expiresAt: context.expiresAt,
    requiredProposalSchema: SPOTRIQ_REBALANCING_PROPOSAL_SCHEMA,
  };
}
function instruction(contextHash: string): string {
  return `Prepare a proposal for the exact Spotriq Rebalancing Job Intent in the attached structured data. Return a structured data part using schema ${SPOTRIQ_REBALANCING_PROPOSAL_SCHEMA}, echo requestContextHash ${contextHash}, action PREPARE_RANGE_REBALANCE, and integer targetTickLower/targetTickUpper. Do not sign, broadcast, approve tokens, move funds, or assume financial authority.`;
}

function v1SendParams(context: ServiceTaskRequestContext, contextHash: string, messageIdValue: string, tenant?: string): Record<string,unknown> {
  return {
    ...(tenant ? {tenant} : {}),
    message: { role:"ROLE_USER", messageId:messageIdValue, parts:[{text:instruction(contextHash),mediaType:"text/plain"},{data:requestPayload(context,contextHash),mediaType:"application/json"}] },
    configuration: { acceptedOutputModes:["application/json","text/plain"], historyLength:10, returnImmediately:false },
    metadata: { spotriq:{ requestContextHash:contextHash, requiredProposalSchema:SPOTRIQ_REBALANCING_PROPOSAL_SCHEMA } },
  };
}
function v03SendParams(context: ServiceTaskRequestContext, contextHash: string, messageIdValue: string): Record<string,unknown> {
  return {
    message: { role:"user", messageId:messageIdValue, parts:[{kind:"text",text:instruction(contextHash)},{kind:"data",data:requestPayload(context,contextHash)}], metadata:{spotriq:{requestContextHash:contextHash,requiredProposalSchema:SPOTRIQ_REBALANCING_PROPOSAL_SCHEMA}} },
    configuration: { acceptedOutputModes:["application/json","text/plain"], historyLength:10 },
  };
}

function joinOperation(base: string, path: string): string {
  const url = new URL(base); const basePath = url.pathname.replace(/\/+$/,""), suffix = path.startsWith("/") ? path : `/${path}`; url.pathname = `${basePath}${suffix}` || suffix; url.search=""; url.hash=""; return url.toString();
}

function rpcEnvelope(result: SafeHttpResult, expectedId: string): unknown {
  if (result.status < 200 || result.status >= 300) throw new ServiceTaskError(`A2A task request returned HTTP ${result.status}.`,"REMOTE_ERROR",result.status >= 500,{status:result.status});
  if (!/json/i.test(result.contentType)) throw new ServiceTaskError("A2A task response did not return JSON.","REMOTE_ERROR");
  let parsed: unknown; try { parsed=JSON.parse(result.bodyText); } catch { throw new ServiceTaskError("A2A task response was not valid JSON.","REMOTE_ERROR"); }
  const obj=asObject(parsed); if(!obj||obj.jsonrpc!=="2.0") throw new ServiceTaskError("A2A JSON-RPC response does not declare JSON-RPC 2.0.","REMOTE_ERROR");
  if(obj.id!==expectedId) throw new ServiceTaskError("A2A JSON-RPC response ID does not match the Spotriq request ID.","ORIGIN_PROOF_FAILED");
  if(obj.error){const err=asObject(obj.error);throw new ServiceTaskError(`A2A JSON-RPC error: ${safeText(err?.message) ?? safeText(err?.code) ?? "unknown"}.`,"REMOTE_ERROR",false,err);}
  return obj.result;
}
function httpJsonBody(result: SafeHttpResult): unknown {
  if (result.status < 200 || result.status >= 300) throw new ServiceTaskError(`A2A task request returned HTTP ${result.status}.`,"REMOTE_ERROR",result.status>=500,{status:result.status});
  if (!/json/i.test(result.contentType)) throw new ServiceTaskError("A2A HTTP+JSON response did not return JSON.","REMOTE_ERROR");
  try { return JSON.parse(result.bodyText); } catch { throw new ServiceTaskError("A2A HTTP+JSON response was not valid JSON.","REMOTE_ERROR"); }
}

function parseSendResult(value: unknown, finalUrl: string): ParsedRemote {
  const obj=asObject(value); if(!obj) throw new ServiceTaskError("A2A SendMessage response is not an object.","REMOTE_ERROR");
  const nestedTask=asObject(obj.task), nestedMessage=asObject(obj.message);
  if(nestedTask||nestedMessage) return {task:nestedTask,message:nestedMessage,finalUrl};
  // v0.3 JSON-RPC commonly returns the Task or Message object directly.
  if(text(obj.id) && asObject(obj.status)) return {task:obj,finalUrl};
  if(text(obj.messageId) || Array.isArray(obj.parts)) return {message:obj,finalUrl};
  throw new ServiceTaskError("A2A SendMessage response contains neither a Task nor a Message.","REMOTE_ERROR");
}

function remoteTaskState(task?: Record<string,unknown>): {state:ServiceTaskState;remoteStatus?:string} {
  if(!task) return {state:"COMPLETED"};
  const status=asObject(task.status), raw=text(status?.state).toUpperCase().replace(/-/g,"_");
  const simple=raw.replace(/^TASK_STATE_/,"");
  const map:Record<string,ServiceTaskState>={SUBMITTED:"SUBMITTED",WORKING:"WORKING",COMPLETED:"COMPLETED",FAILED:"FAILED",CANCELED:"CANCELLED",CANCELLED:"CANCELLED",INPUT_REQUIRED:"INPUT_REQUIRED",AUTH_REQUIRED:"AUTH_REQUIRED",REJECTED:"REJECTED"};
  return {state:map[simple]??"WORKING",remoteStatus:text(status?.state)||undefined};
}

function partData(part: Record<string,unknown>): unknown {
  if (Object.prototype.hasOwnProperty.call(part,"data")) return part.data;
  if (text(part.kind).toLowerCase()==="data") return part.data;
  return undefined;
}
function collectParts(value: unknown): Record<string,unknown>[] {
  const root=asObject(value); if(!root) return [];
  const parts:Record<string,unknown>[]=[];
  const take=(candidate:unknown)=>{for(const part of objects(asObject(candidate)?.parts))parts.push(part);};
  for(const artifact of objects(root.artifacts)) for(const part of objects(artifact.parts)) parts.push(part);
  take(asObject(root.status)?.message);
  for(const message of objects(root.history)) take(message);
  take(root);
  return parts;
}
function proposalCandidate(remote: ParsedRemote): Record<string,unknown> | undefined {
  for (const container of [remote.task,remote.message]) {
    for (const part of collectParts(container)) {
      const data=asObject(partData(part)); if(!data) continue;
      const nested=asObject(data.spotriqProposal); const candidate=nested??data;
      const schema=text(candidate.schema || candidate.proposalSchema || candidate.type);
      if(schema===SPOTRIQ_REBALANCING_PROPOSAL_SCHEMA) return candidate;
    }
  }
  return undefined;
}
function normalizeProposal(candidate: Record<string,unknown>|undefined, expectedHash:string, receivedAt:string): {state:ServiceTask["proposalState"];proposal?:RebalancingServiceProposal;detail:string} {
  if(!candidate) return {state:"NONE",detail:"The A2A response did not contain the required structured Spotriq Rebalancing proposal data part."};
  if(text(candidate.requestContextHash)!==expectedHash) return {state:"MISMATCH",detail:"The A2A proposal did not echo the exact server-derived Job Intent request-context hash."};
  if(text(candidate.action)!=="PREPARE_RANGE_REBALANCE") return {state:"MISMATCH",detail:"The A2A proposal action does not match PREPARE_RANGE_REBALANCE."};
  const lower=candidate.targetTickLower,upper=candidate.targetTickUpper;
  if(!Number.isInteger(lower)||!Number.isInteger(upper)) return {state:"INVALID",detail:"The A2A proposal must contain integer targetTickLower and targetTickUpper values."};
  const base={requestContextHash:expectedHash,action:"PREPARE_RANGE_REBALANCE" as const,targetTickLower:lower as number,targetTickUpper:upper as number,summary:safeText(candidate.summary,1000),rationale:safeText(candidate.rationale,2000)};
  const proposalHash=sha256(canonical(base));
  const proposalId=safeText(candidate.proposalId,256) ?? `proposal:${proposalHash.slice("sha256:".length)}`;
  return {state:"STRUCTURED",detail:"Spotriq observed a structured proposal bound to the exact server-derived request context.",proposal:{proposalId,proposalHash,...base,receivedAt,provenance:"marketplace-observed"}};
}

function blankOrigin(task: Pick<ServiceTask,"serviceId"|"agentId"|"requestContextHash">, requestIdValue:string,messageIdValue:string):ServiceTaskOriginProof {
  return {state:"UNVERIFIED",serviceId:task.serviceId,agentId:task.agentId,runtimeEndpoint:"",agentCardUrl:"",protocol:"A2A",protocolBinding:"JSONRPC",protocolVersion:"",requestId:requestIdValue,messageId:messageIdValue,requestContextHash:task.requestContextHash,evidenceIds:[],detail:"No attributable A2A response has been observed yet."};
}

export function createServiceTaskEngine(options:{store?:ServiceTaskStore;marketplace:MarketplaceSupplyReader;http?:ServiceTaskOptions}):ServiceTaskEngine {
  const store=options.store??new MemoryServiceTaskStore(); const marketplace=options.marketplace; const http=options.http??{}; const now=http.now??(()=>new Date());
  const httpOptions={fetcher:http.fetcher??fetch,resolver:http.resolver??defaultResolver,timeoutMs:http.timeoutMs??10_000,maxResponseBytes:http.maxResponseBytes??384_000,maxRedirects:http.maxRedirects??2,allowInsecureHttp:http.allowInsecureHttp??false};

  async function get(serviceTaskIdValue:string):Promise<ServiceTask>{const task=await store.get(serviceTaskIdValue);if(!task)throw new ServiceTaskError(`Service task ${serviceTaskIdValue} was not found.`,"TASK_NOT_FOUND");return task;}

  async function discoverInterface(record:MarketplaceServiceRecord, tests:MarketplaceServiceTestCoverage, binding:AgentAuthorityBinding):Promise<SelectedA2aInterface>{
    const testedEndpoint=exactA2aTestEndpoint(tests,now().getTime()); if(!testedEndpoint) throw new ServiceTaskError("A fresh Marketplace Test Lab PASS for a category-capable A2A endpoint is required before real task invocation.","SERVICE_NOT_READY");
    const cardUrl=a2aCardUrl(testedEndpoint,httpOptions.allowInsecureHttp); const response=await boundedFetch(cardUrl,{method:"GET"},httpOptions);
    if(response.status<200||response.status>=300||!/json/i.test(response.contentType))throw new ServiceTaskError("The tested A2A Agent Card is no longer reachable as valid JSON.","SERVICE_NOT_READY",true);
    let card:Record<string,unknown>;try{const parsed=JSON.parse(response.bodyText);card=asObject(parsed)??(()=>{throw new Error();})();}catch{throw new ServiceTaskError("The tested A2A Agent Card is not valid JSON.","SERVICE_NOT_READY");}
    if(hasClientAuthRequirement(card)) throw new ServiceTaskError("This A2A service requires client authentication that Spotriq has not been configured to provide. Service-owned proposal-key proof is not a client credential.","AUTH_REQUIRED");
    const selected=selectA2aInterface(card,response.finalUrl,testedEndpoint);
    if(!sameOrigin(selected.url,binding.runtimeEndpoint)||!sameOrigin(response.finalUrl,binding.agentCardUrl)) throw new ServiceTaskError("The selected A2A task interface does not share the verified service-runtime origin.","ORIGIN_PROOF_FAILED");
    if(selected.binding==="HTTP+JSON"&&major(selected.version)<1)throw new ServiceTaskError("Spotriq v0.21 supports HTTP+JSON task invocation for A2A 1.x only; older A2A services must expose JSONRPC.","UNSUPPORTED_INTERFACE");
    return selected;
  }

  async function send(interfaceInfo:SelectedA2aInterface, context:ServiceTaskRequestContext, contextHash:string, requestIdValue:string,messageIdValue:string):Promise<ParsedRemote>{
    const version=interfaceInfo.version; const headers:Record<string,string>={"A2A-Version":version};
    if(interfaceInfo.binding==="JSONRPC"){
      const method=major(version)>=1?"SendMessage":"message/send"; const params=major(version)>=1?v1SendParams(context,contextHash,messageIdValue,interfaceInfo.tenant):v03SendParams(context,contextHash,messageIdValue);
      const response=await boundedFetch(interfaceInfo.url,{method:"POST",headers:{...headers,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:requestIdValue,method,params})},httpOptions);
      return parseSendResult(rpcEnvelope(response,requestIdValue),response.finalUrl);
    }
    const endpoint=joinOperation(interfaceInfo.url,"message:send"); const body=v1SendParams(context,contextHash,messageIdValue,interfaceInfo.tenant);
    const response=await boundedFetch(endpoint,{method:"POST",headers:{...headers,"Content-Type":"application/a2a+json",Accept:"application/a2a+json, application/json"},body:JSON.stringify(body)},httpOptions);
    return parseSendResult(httpJsonBody(response),response.finalUrl);
  }

  function taskFromRemote(base:ServiceTask, remote:ParsedRemote, selected:SelectedA2aInterface,binding:AgentAuthorityBinding,attempt:ServiceTaskAttempt):ServiceTask{
    const observedAt=now().toISOString(), mapped=remoteTaskState(remote.task), remoteTaskId=safeText(remote.task?.id,512);
    const statusMessage=asObject(asObject(remote.task?.status)?.message);
    const remoteMessageId=safeText(remote.message?.messageId,512)??safeText(statusMessage?.messageId,512);
    const normalized=normalizeProposal(proposalCandidate(remote),base.requestContextHash,observedAt);
    const attributable=Boolean((remoteTaskId||remoteMessageId)&&sameOrigin(remote.finalUrl,selected.url)&&binding.state==="VERIFIED"&&normalized.state==="STRUCTURED");
    const originEvidence=attributable?createEvidenceEnvelope({subjectType:"service_task",subjectId:base.serviceTaskId,metric:"service.task_origin",value:remoteTaskId??remoteMessageId!,provenance:"marketplace-observed",source:DATA_SOURCES.MARKETPLACE,sourceRef:remote.finalUrl,observedAt,confidence:"high",method:EVIDENCE_METHODS.SERVICE_TASK_ORIGIN,methodInputs:[binding.bindingId,base.requestContextHash],limitation:"Spotriq itself sent the A2A request to the tested same-origin runtime after fresh service-key control verification. This proves invocation/proposal origin at observation time; it does not prove hiring, payment, financial authority, profitability, or safe execution."}):undefined;
    const proposalEvidence=normalized.proposal?createEvidenceEnvelope({subjectType:"service_task",subjectId:base.serviceTaskId,metric:"service.task_proposal",value:normalized.proposal.proposalHash,provenance:"marketplace-observed",source:DATA_SOURCES.MARKETPLACE,sourceRef:remote.finalUrl,observedAt,confidence:"high",method:EVIDENCE_METHODS.SERVICE_TASK_ORIGIN,methodInputs:[base.requestContextHash],limitation:"The structured proposal is attributable to the invoked A2A runtime and exact request context, but its financial content remains untrusted until user review and the existing Spotriq execution guard/boundary pipeline independently validates it."}):undefined;
    const updatedAttempt:ServiceTaskAttempt={...attempt,respondedAt:observedAt,state:mapped.state,remoteTaskId,remoteMessageId,remoteStatus:mapped.remoteStatus,detail:normalized.detail};
    const originProof:ServiceTaskOriginProof={state:attributable?"VERIFIED":normalized.state==="STRUCTURED"?"FAILED":"UNVERIFIED",serviceId:base.serviceId,agentId:base.agentId,runtimeEndpoint:selected.url,agentCardUrl:selected.agentCardUrl,protocol:"A2A",protocolBinding:selected.binding,protocolVersion:selected.version,tenant:selected.tenant,authorityBindingId:binding.bindingId,serviceSessionKeyAddress:binding.sessionKeyAddress,requestId:attempt.requestId,messageId:attempt.messageId,requestContextHash:base.requestContextHash,remoteTaskId,remoteMessageId,observedAt,evidenceIds:[originEvidence?.evidenceId,proposalEvidence?.evidenceId].filter((v):v is string=>Boolean(v)),detail:attributable?"Spotriq observed the exact-context A2A proposal from the same runtime origin whose service-owned key control was freshly verified.":normalized.detail};
    return {...base,state:mapped.state,protocolBinding:selected.binding,protocolVersion:selected.version,runtimeEndpoint:selected.url,agentCardUrl:selected.agentCardUrl,tenant:selected.tenant,remoteTaskId,remoteMessageId,remoteStatus:mapped.remoteStatus,proposalState:normalized.state,proposal:normalized.proposal,originProof,evidence:[...base.evidence,...[originEvidence,proposalEvidence].filter((v):v is NonNullable<typeof v>=>Boolean(v))],attempts:[...base.attempts.slice(0,-1),updatedAttempt],updatedAt:observedAt,limitations:["A real A2A invocation is distinct from commercial hiring, payment and marketplace activation.","The external AgentService remains an authenticated proposer only and never receives Spotriq's boundary-controlled financial signer.","Agent-proposed ticks remain untrusted until explicit user review and the existing execution-plan/guard/boundary pipeline independently validates them.",...(originProof.state==="VERIFIED"?["Origin attribution relies on a fresh service-key challenge plus a same-origin TLS A2A exchange; the A2A response itself is not required to carry a separate cryptographic proposal signature."]:[])]};
  }

  async function execute(job:RebalancingJobIntent,forceAttempt:boolean):Promise<ServiceTask>{
    assertInvokableJob(job,now().getTime()); const id=serviceTaskId(job),existing=await store.get(id); if(existing&&!forceAttempt)return existing;
    const context=buildServiceTaskRequestContext(job),contextHash=serviceTaskRequestContextHash(job),attemptNumber=(existing?.attempt??0)+1; const requestIdValue=requestId(id,attemptNumber),messageIdValue=messageId(id,attemptNumber),requestedAt=now().toISOString();
    const attempt:ServiceTaskAttempt={attempt:attemptNumber,requestId:requestIdValue,messageId:messageIdValue,idempotencyKey:`${id}:attempt:${attemptNumber}`,requestedAt,state:"READY_TO_INVOKE"};
    let base:ServiceTask=existing?{...existing,state:"READY_TO_INVOKE",attempt:attemptNumber,attempts:[...existing.attempts,attempt],proposalState:"NONE",proposal:undefined,requestContext:context,requestContextHash:contextHash,updatedAt:requestedAt}:{serviceTaskId:id,jobIntentId:job.jobIntentId,findingId:job.findingId,serviceId:job.selectedService.serviceId,agentId:job.selectedService.agentId,state:"READY_TO_INVOKE",protocol:"A2A",requestContextHash:contextHash,requestContext:context,attempt:attemptNumber,attempts:[attempt],proposalState:"NONE",originProof:blankOrigin({serviceId:job.selectedService.serviceId,agentId:job.selectedService.agentId,requestContextHash:contextHash},requestIdValue,messageIdValue),commercialState:"NOT_PROVEN",evidence:[],createdAt:requestedAt,updatedAt:requestedAt,limitations:["Task invocation is not commercial hiring, payment or marketplace activation."]};
    await store.save(base);
    try{
      const [record,tests,binding]=await Promise.all([marketplace.getService(job.selectedService.serviceId),marketplace.getTests(job.selectedService.serviceId),marketplace.verifyAuthorityBinding(job.selectedService.serviceId)]);
      if(record.service.serviceId!==job.selectedService.serviceId||record.identity.discoveryId!==job.selectedService.agentId)throw new ServiceTaskError("Live AgentService identity no longer matches the Job Intent snapshot.","SERVICE_NOT_READY");
      if(binding.state!=="VERIFIED"||!binding.sessionKeyAddress)throw new ServiceTaskError("A fresh verified service-owned authority binding is required before task-origin attribution.","ORIGIN_PROOF_FAILED");
      const selected=await discoverInterface(record,tests,binding); const remote=await send(selected,context,contextHash,requestIdValue,messageIdValue); const next=taskFromRemote(base,remote,selected,binding,attempt); await store.save(next); return next;
    }catch(error){
      const e=error instanceof ServiceTaskError?error:new ServiceTaskError(error instanceof Error?error.message:String(error),"REMOTE_ERROR",true); const mapped:ServiceTaskState=e.code==="AUTH_REQUIRED"?"AUTH_REQUIRED":e.code==="SERVICE_NOT_READY"?"READINESS_BLOCKED":e.code==="UNSUPPORTED_INTERFACE"?"UNSUPPORTED":e.code==="ORIGIN_PROOF_FAILED"?"ORIGIN_PROOF_FAILED":e.message.toLowerCase().includes("timeout")?"TIMED_OUT":"FAILED"; const ended=now().toISOString(); const failedAttempt={...attempt,respondedAt:ended,state:mapped,detail:e.message}; base={...base,state:mapped,attempts:[...base.attempts.slice(0,-1),failedAttempt],originProof:{...base.originProof,state:e.code==="ORIGIN_PROOF_FAILED"?"FAILED":"UNVERIFIED",detail:e.message},updatedAt:ended,limitations:[...base.limitations,e.message]}; await store.save(base); return base;
    }
  }

  async function requestExisting(task:ServiceTask,operation:"get"|"cancel"):Promise<ParsedRemote>{
    if(!task.remoteTaskId||!task.runtimeEndpoint||!task.protocolBinding||!task.protocolVersion)throw new ServiceTaskError("This service task has no remote A2A task identifier to reconcile or cancel.","INVALID_STATE");
    const params={...(task.tenant?{tenant:task.tenant}:{}),id:task.remoteTaskId,metadata:{spotriq:{serviceTaskId:task.serviceTaskId,requestContextHash:task.requestContextHash}}};
    if(task.protocolBinding==="JSONRPC"){
      const method=major(task.protocolVersion)>=1?(operation==="get"?"GetTask":"CancelTask"):(operation==="get"?"tasks/get":"tasks/cancel"); const idValue=`${operation}-${randomUUID()}`; const response=await boundedFetch(task.runtimeEndpoint,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json","A2A-Version":task.protocolVersion},body:JSON.stringify({jsonrpc:"2.0",id:idValue,method,params})},httpOptions); const value=rpcEnvelope(response,idValue); const obj=asObject(value); return parseSendResult(obj&&obj.task?obj:{task:obj},response.finalUrl);
    }
    const path=operation==="get"?`tasks/${encodeURIComponent(task.remoteTaskId)}`:`tasks/${encodeURIComponent(task.remoteTaskId)}:cancel`; const response=await boundedFetch(joinOperation(task.runtimeEndpoint,path),{method:operation==="get"?"GET":"POST",headers:{Accept:"application/a2a+json, application/json","Content-Type":"application/a2a+json","A2A-Version":task.protocolVersion},body:operation==="get"?undefined:JSON.stringify(params)},httpOptions); const value=httpJsonBody(response); const obj=asObject(value); return parseSendResult(obj&&obj.task?obj:{task:obj},response.finalUrl);
  }

  async function refresh(task:ServiceTask,operation:"get"|"cancel"):Promise<ServiceTask>{
    // A persisted proof is evidence of the earlier observation, not permission to
    // manufacture fresh origin attribution. Reconciliation therefore repeats
    // the service-owned key-control verification before accepting a later task
    // response/proposal as attributable to the selected AgentService.
    const binding=await marketplace.verifyAuthorityBinding(task.serviceId);
    if(binding.state!=="VERIFIED"||!binding.sessionKeyAddress)throw new ServiceTaskError("Fresh service-owned key verification failed during A2A task reconciliation.","ORIGIN_PROOF_FAILED",true);
    if(!task.runtimeEndpoint||!task.agentCardUrl||!sameOrigin(task.runtimeEndpoint,binding.runtimeEndpoint)||!sameOrigin(task.agentCardUrl,binding.agentCardUrl))throw new ServiceTaskError("The persisted A2A task runtime no longer matches the freshly verified service binding.","ORIGIN_PROOF_FAILED");
    const remote=await requestExisting(task,operation); const selected:SelectedA2aInterface={url:task.runtimeEndpoint,binding:task.protocolBinding!,version:task.protocolVersion!,tenant:task.tenant,agentCardUrl:task.agentCardUrl}; const currentAttempt=task.attempts.at(-1)??{attempt:task.attempt,requestId:task.originProof.requestId,messageId:task.originProof.messageId,idempotencyKey:`${task.serviceTaskId}:reconcile`,requestedAt:task.updatedAt,state:task.state}; const next=taskFromRemote(task,remote,selected,binding,currentAttempt); await store.save(next); return next;
  }

  return {
    invoke:(job)=>execute(job,false),
    async retry(job,serviceTaskIdValue){const previous=await get(serviceTaskIdValue);if(previous.jobIntentId!==job.jobIntentId)throw new ServiceTaskError("The retry task does not belong to this Job Intent.","INVALID_INPUT");return execute(job,true);},
    reconcile:async(id)=>refresh(await get(id),"get"),
    cancel:async(id)=>refresh(await get(id),"cancel"),
    get,
    getForJob:(jobIntentId)=>store.getForJob(jobIntentId),
  };
}
