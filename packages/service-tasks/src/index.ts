import { createHash, randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import type {
  ActivationRuntimeState,
  AgentAuthorityBinding,
  MarketplaceActivation,
  MarketplaceServiceRecord,
  MarketplaceServiceTestCoverage,
  RebalancingJobIntent,
  RebalancingServiceProposal,
  ServiceCategory,
  ServiceTask,
  ServiceTaskAttempt,
  ServiceTaskOriginProof,
  ServiceTaskRequestContext,
  ServiceTaskResult,
  ServiceTaskResultKind,
  ServiceTaskState,
} from "@spotriq/domain";
import { createEvidenceEnvelope, DATA_SOURCES, EVIDENCE_METHODS } from "@spotriq/evidence";
import { a2aCardUrl, boundedFetch, type MarketplaceSupplyReader, type SafeHttpResult } from "@spotriq/marketplace-supply";

export const SERVICE_TASK_METHOD = "marketplace.service-task-origin@2.0.0";
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
  getForActivation(activationId: string): Promise<ServiceTask | undefined>;
}

export class MemoryServiceTaskStore implements ServiceTaskStore {
  private readonly tasks = new Map<string, ServiceTask>();
  async save(task: ServiceTask): Promise<void> { this.tasks.set(task.serviceTaskId, structuredClone(task)); }
  async get(serviceTaskId: string): Promise<ServiceTask | undefined> { const value = this.tasks.get(serviceTaskId); return value ? structuredClone(value) : undefined; }
  async getForJob(jobIntentId: string): Promise<ServiceTask | undefined> {
    const values = [...this.tasks.values()].filter((task) => task.jobIntentId === jobIntentId).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
    return values[0] ? structuredClone(values[0]) : undefined;
  }
  async getForActivation(activationId: string): Promise<ServiceTask | undefined> {
    const values = [...this.tasks.values()].filter((task) => task.activationId === activationId).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
    return values[0] ? structuredClone(values[0]) : undefined;
  }
}

export class PostgresServiceTaskStore implements ServiceTaskStore {
  constructor(private readonly database: SqlQueryExecutor) {}
  async save(task: ServiceTask): Promise<void> {
    await this.database.query(
      `insert into service_tasks (service_task_id,job_intent_id,finding_id,service_id,agent_id,state,protocol,protocol_binding,protocol_version,runtime_endpoint,request_context_hash,remote_task_id,remote_message_id,proposal_state,origin_proof_state,commercial_state,activation_id,origin_kind,category,result_state,payload,created_at,updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb,$22,$23)
       on conflict (service_task_id) do update set state=excluded.state,protocol_binding=excluded.protocol_binding,protocol_version=excluded.protocol_version,runtime_endpoint=excluded.runtime_endpoint,remote_task_id=excluded.remote_task_id,remote_message_id=excluded.remote_message_id,proposal_state=excluded.proposal_state,origin_proof_state=excluded.origin_proof_state,commercial_state=excluded.commercial_state,activation_id=excluded.activation_id,origin_kind=excluded.origin_kind,category=excluded.category,result_state=excluded.result_state,payload=excluded.payload,updated_at=excluded.updated_at`,
      [task.serviceTaskId,task.jobIntentId??null,task.findingId??null,task.serviceId,task.agentId,task.state,task.protocol,task.protocolBinding??null,task.protocolVersion??null,task.runtimeEndpoint??null,task.requestContextHash,task.remoteTaskId??null,task.remoteMessageId??null,task.proposalState,task.originProof.state,task.commercialState,task.activationId??null,task.originKind,task.category,task.result.state,JSON.stringify(task),task.createdAt,task.updatedAt],
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
  async getForActivation(activationId: string): Promise<ServiceTask | undefined> {
    const result = await this.database.query<{payload: ServiceTask}>("select payload from service_tasks where activation_id=$1 order by updated_at desc limit 1",[activationId]);
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

export interface InvokeActivationTaskInput {
  tokenId?: string;
  poolAddress?: string;
  capitalAsset?: string;
  capitalAmount?: string;
}

export interface ServiceTaskEngine {
  invoke(job: RebalancingJobIntent, activation?: MarketplaceActivation): Promise<ServiceTask>;
  invokeActivation(activation: MarketplaceActivation, input?: InvokeActivationTaskInput): Promise<ServiceTask>;
  retry(job: RebalancingJobIntent, serviceTaskId: string, activation?: MarketplaceActivation): Promise<ServiceTask>;
  retryActivation(activation: MarketplaceActivation, serviceTaskId: string, input?: InvokeActivationTaskInput): Promise<ServiceTask>;
  reconcile(serviceTaskId: string): Promise<ServiceTask>;
  cancel(serviceTaskId: string): Promise<ServiceTask>;
  get(serviceTaskId: string): Promise<ServiceTask>;
  getForJob(jobIntentId: string): Promise<ServiceTask | undefined>;
  getForActivation(activationId: string): Promise<ServiceTask | undefined>;
  getActivationRuntimeState(activation: MarketplaceActivation): Promise<ActivationRuntimeState>;
}

type A2aBinding = "JSONRPC" | "HTTP+JSON";
interface SelectedA2aInterface { url: string; binding: A2aBinding; version: string; tenant?: string; agentCardUrl: string; }
interface ParsedRemote { task?: Record<string, unknown>; message?: Record<string, unknown>; finalUrl: string; }
interface RuntimeOriginBinding {
  bindingId: string;
  state: "VERIFIED";
  runtimeEndpoint: string;
  agentCardUrl: string;
  sessionKeyAddress?: string;
  evidenceIds: string[];
  detail: string;
  firstParty: boolean;
}

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
    originKind: "JOB_INTENT",
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

function networkFromChainId(chainId: number): "mainnet" | "testnet" {
  return chainId === 56 ? "mainnet" : "testnet";
}
function requiredText(value: string | undefined, label: string, max = 256): string {
  const normalized = value?.trim();
  if (!normalized || normalized.length > max) throw new ServiceTaskError(`${label} is required.`, "INVALID_INPUT");
  return normalized;
}
function optionalText(value: string | undefined, max = 256): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  if (normalized.length > max) throw new ServiceTaskError(`Activation task input exceeds ${max} characters.`, "INVALID_INPUT");
  return normalized;
}
function validatePoolAddress(value: string | undefined): string {
  const address = requiredText(value, "poolAddress", 42).toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(address)) throw new ServiceTaskError("poolAddress must be a 20-byte EVM address.", "INVALID_INPUT");
  return address;
}
function validateTokenId(value: string | undefined): string {
  const tokenId = requiredText(value, "tokenId", 78);
  if (!/^\d+$/.test(tokenId)) throw new ServiceTaskError("tokenId must be a non-negative decimal integer.", "INVALID_INPUT");
  return tokenId;
}

export function buildActivationServiceTaskRequestContext(
  activation: MarketplaceActivation,
  record: MarketplaceServiceRecord,
  input: InvokeActivationTaskInput = {},
  at = new Date(),
): ServiceTaskRequestContext {
  if (activation.state !== "ACTIVE") throw new ServiceTaskError("Only an ACTIVE marketplace Activation can invoke an activation-bound service task.", "INVALID_STATE");
  if (activation.serviceId !== record.service.serviceId) throw new ServiceTaskError("Activation and AgentService do not match.", "INVALID_INPUT");
  if (activation.activationKind !== "READ_ONLY_SERVICE_RELATIONSHIP" || activation.walletSigningAuthorityGranted || activation.financialExecutionAuthorityGranted) {
    throw new ServiceTaskError("v0.24 activation task parity accepts the bounded read-only relationship only; financial authority remains on its separate permission/execution path.", "INVALID_STATE");
  }
  const base = {
    originKind: "ACTIVATION" as const,
    activationId: activation.activationId,
    serviceId: activation.serviceId,
    agentId: record.service.agentId,
    walletAddress: activation.buyerAddress.toLowerCase(),
    expiresAt: new Date(at.getTime() + 10 * 60_000).toISOString(),
  };
  const network = networkFromChainId(activation.serviceChainId);
  switch (record.service.category) {
    case "rebalancing":
      return { ...base, category: "rebalancing", requestedAction: "ANALYZE_POSITION", subject: { protocol: "PancakeSwap", network, tokenId: validateTokenId(input.tokenId) } };
    case "grid": {
      const capitalAsset = optionalText(input.capitalAsset, 80);
      const capitalAmount = optionalText(input.capitalAmount, 80);
      return {
        ...base,
        category: "grid",
        requestedAction: "ANALYZE_GRID_MARKET",
        subject: {
          protocol: "PancakeSwap",
          network,
          poolAddress: validatePoolAddress(input.poolAddress),
          ...((capitalAsset || capitalAmount) ? { capitalContext: { asset: capitalAsset, amount: capitalAmount, note: "Buyer-supplied capital context is descriptive only and grants no spend/trading authority." } } : {}),
        },
      };
    }
    case "yield":
      return { ...base, category: "yield", requestedAction: "SCAN_YIELD_OPPORTUNITIES", subject: { protocol: "Venus", network, walletAddress: activation.buyerAddress.toLowerCase() } };
    case "health":
      return { ...base, category: "health", requestedAction: "INSPECT_HEALTH", subject: { protocol: "Venus", network, walletAddress: activation.buyerAddress.toLowerCase(), monitoringMode: "SNAPSHOT" } };
  }
}

function activationContextHash(context: ServiceTaskRequestContext): string { return sha256(canonical(context)); }
function activationTaskId(context: ServiceTaskRequestContext): string {
  if(context.originKind!=="ACTIVATION")throw new ServiceTaskError("Activation task identity requires an activation request context.","INVALID_INPUT");
  const key={activationId:context.activationId,serviceId:context.serviceId,category:context.category,requestedAction:context.requestedAction,subject:context.subject};
  return `service-task:${sha256(canonical(key)).slice("sha256:".length)}`;
}
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

function activationInput(context: ServiceTaskRequestContext): Record<string, unknown> {
  if (context.originKind !== "ACTIVATION") return {};
  switch (context.category) {
    case "rebalancing": return { tokenId: context.subject.tokenId };
    case "grid": return { poolAddress: context.subject.poolAddress, walletAddress: context.walletAddress };
    case "yield": return { walletAddress: context.subject.walletAddress };
    case "health": return { walletAddress: context.subject.walletAddress };
  }
}

function requestPayload(context: ServiceTaskRequestContext, contextHash: string) {
  if (context.originKind === "JOB_INTENT") {
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
  return {
    schema: "urn:spotriq:activation-service-task-request:v1",
    requestContextHash: contextHash,
    activationId: context.activationId,
    serviceId: context.serviceId,
    category: context.category,
    action: context.requestedAction,
    subject: context.subject,
    input: activationInput(context),
    expiresAt: context.expiresAt,
    authority: { walletSigning: false, financialExecution: false },
  };
}
function instruction(context: ServiceTaskRequestContext, contextHash: string): string {
  if (context.originKind === "JOB_INTENT") {
    return `Prepare a proposal for the exact Spotriq Rebalancing Job Intent in the attached structured data. Return a structured data part using schema ${SPOTRIQ_REBALANCING_PROPOSAL_SCHEMA}, echo requestContextHash ${contextHash}, action PREPARE_RANGE_REBALANCE, and integer targetTickLower/targetTickUpper. Do not sign, broadcast, approve tokens, move funds, or assume financial authority.`;
  }
  const labels: Record<ServiceCategory,string> = {
    rebalancing: "analyze the supplied PancakeSwap position",
    grid: "analyze deterministic PancakeSwap grid market context",
    yield: "scan current Venus yield opportunities",
    health: "inspect current Venus lending health",
  };
  return `Use the attached exact Spotriq Activation task context to ${labels[context.category]}. This task is read-only. Do not sign, broadcast, trade, rebalance, reallocate, repay, withdraw, approve tokens, move funds, or assume financial authority. Echo structured category/action output when supported. requestContextHash=${contextHash}.`;
}

function taskMetadata(context: ServiceTaskRequestContext, contextHash: string): Record<string,unknown> {
  return context.originKind === "JOB_INTENT"
    ? { requestContextHash: contextHash, requiredProposalSchema: SPOTRIQ_REBALANCING_PROPOSAL_SCHEMA }
    : { requestContextHash: contextHash, activationId: context.activationId, category: context.category, financialAuthorityGranted: false };
}

function v1SendParams(context: ServiceTaskRequestContext, contextHash: string, messageIdValue: string, tenant?: string): Record<string,unknown> {
  return {
    ...(tenant ? {tenant} : {}),
    message: { role:"ROLE_USER", messageId:messageIdValue, parts:[{text:instruction(context,contextHash),mediaType:"text/plain"},{data:requestPayload(context,contextHash),mediaType:"application/json"}] },
    configuration: { acceptedOutputModes:["application/json","text/plain"], historyLength:10, returnImmediately:false },
    metadata: { spotriq:taskMetadata(context,contextHash) },
  };
}
function v03SendParams(context: ServiceTaskRequestContext, contextHash: string, messageIdValue: string): Record<string,unknown> {
  return {
    message: { role:"user", messageId:messageIdValue, parts:[{kind:"text",text:instruction(context,contextHash)},{kind:"data",data:requestPayload(context,contextHash)}], metadata:{spotriq:taskMetadata(context,contextHash)} },
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

const ACTIVATION_RUNTIME_ACTION: Record<Exclude<ServiceTaskRequestContext,{originKind:"JOB_INTENT"}>["requestedAction"], string> = {
  ANALYZE_POSITION: "analyze_position",
  ANALYZE_GRID_MARKET: "analyze_market",
  SCAN_YIELD_OPPORTUNITIES: "scan_opportunities",
  INSPECT_HEALTH: "inspect_health",
};
const ACTIVATION_RESULT_KIND: Record<ServiceCategory, ServiceTaskResultKind> = {
  rebalancing: "REBALANCING_ANALYSIS",
  grid: "GRID_MARKET_CONTEXT",
  yield: "YIELD_OPPORTUNITY_SNAPSHOT",
  health: "HEALTH_MONITORING_SNAPSHOT",
};
function activationResultCandidate(remote: ParsedRemote): Record<string,unknown> | undefined {
  for (const container of [remote.task, remote.message]) {
    for (const part of collectParts(container)) {
      const data=asObject(partData(part));
      if (data && (text(data.capability) || text(data.action))) return data;
    }
  }
  return undefined;
}
function normalizeActivationResult(context: ServiceTaskRequestContext, remote: ParsedRemote, observedAt: string): ServiceTaskResult {
  if (context.originKind !== "ACTIVATION") return {state:"NONE",category:context.category,action:context.requestedAction,evidenceIds:[],detail:"This Job Intent task uses the structured Rebalancing proposal contract rather than the activation-result contract.",limitations:[]};
  const candidate=activationResultCandidate(remote);
  if(!candidate) return {state:"UNSTRUCTURED",category:context.category,action:context.requestedAction,observedAt,evidenceIds:[],detail:"The A2A task completed without a structured category result artifact.",limitations:["Runtime completion alone does not establish a category observation or financial outcome."]};
  const expectedAction=ACTIVATION_RUNTIME_ACTION[context.requestedAction];
  const capability=text(candidate.capability).toLowerCase();
  const action=text(candidate.action);
  if(capability!==context.category || action!==expectedAction) return {state:"MISMATCH",category:context.category,action:context.requestedAction,observedAt,payload:candidate,evidenceIds:[],detail:`The A2A result did not match the activated ${context.category} capability/action contract.`,limitations:["Mismatched runtime output is retained as observed payload but is not accepted as category-parity evidence."]};
  return {state:"STRUCTURED",kind:ACTIVATION_RESULT_KIND[context.category],category:context.category,action:context.requestedAction,observedAt,payload:candidate,evidenceIds:[],detail:`Spotriq observed a structured ${context.category} read-only result from the activated AgentService runtime.`,limitations:[
    context.category==="grid"?"Grid market context is descriptive; no profit, drawdown, fill or future-price result is inferred.":
    context.category==="yield"?"Current protocol/rate observations are not realised yield and require later measurement for outcomes.":
    context.category==="health"?"This is a monitoring snapshot only; no protective write intervention or repayment authority is implied.":
    "Position analysis is read-only and does not authorize or execute a rebalance.",
  ]};
}

function blankOrigin(task: Pick<ServiceTask,"serviceId"|"agentId"|"requestContextHash">, requestIdValue:string,messageIdValue:string):ServiceTaskOriginProof {
  return {state:"UNVERIFIED",serviceId:task.serviceId,agentId:task.agentId,runtimeEndpoint:"",agentCardUrl:"",protocol:"A2A",protocolBinding:"JSONRPC",protocolVersion:"",requestId:requestIdValue,messageId:messageIdValue,requestContextHash:task.requestContextHash,evidenceIds:[],detail:"No attributable A2A response has been observed yet."};
}

export function createServiceTaskEngine(options:{store?:ServiceTaskStore;marketplace:MarketplaceSupplyReader;http?:ServiceTaskOptions}):ServiceTaskEngine {
  const store=options.store??new MemoryServiceTaskStore(); const marketplace=options.marketplace; const http=options.http??{}; const now=http.now??(()=>new Date());
  const httpOptions={fetcher:http.fetcher??fetch,resolver:http.resolver??defaultResolver,timeoutMs:http.timeoutMs??10_000,maxResponseBytes:http.maxResponseBytes??384_000,maxRedirects:http.maxRedirects??2,allowInsecureHttp:http.allowInsecureHttp??false};

  async function get(serviceTaskIdValue:string):Promise<ServiceTask>{const task=await store.get(serviceTaskIdValue);if(!task)throw new ServiceTaskError(`Service task ${serviceTaskIdValue} was not found.`,"TASK_NOT_FOUND");return task;}

  async function runtimeBinding(record:MarketplaceServiceRecord):Promise<RuntimeOriginBinding>{
    if(record.service.origin==="REFERENCE"){
      const endpoint=(record.service.runtimeEndpoints??[]).find(item=>item.machineCallable&&item.interactionKind==="A2A");
      if(!endpoint)throw new ServiceTaskError("The first-party reference service has no machine-callable A2A runtime.","SERVICE_NOT_READY");
      if(record.identity.canonicalVerification?.state!=="VERIFIED")throw new ServiceTaskError("A canonically verified ERC-8004 identity is required before Spotriq attributes a first-party reference runtime result.","ORIGIN_PROOF_FAILED");
      return {bindingId:`reference-runtime:${record.service.serviceId}:${record.identity.identity.agentId}`,state:"VERIFIED",runtimeEndpoint:endpoint.endpoint,agentCardUrl:a2aCardUrl(endpoint.endpoint,httpOptions.allowInsecureHttp),evidenceIds:record.identity.canonicalVerification.evidence.map(item=>item.evidenceId),detail:"First-party runtime attribution is bound to canonical ERC-8004 reconciliation, fresh Marketplace Test Lab evidence and the same-origin Spotriq A2A endpoint.",firstParty:true};
    }
    const binding:AgentAuthorityBinding=await marketplace.verifyAuthorityBinding(record.service.serviceId);
    if(binding.state!=="VERIFIED"||!binding.sessionKeyAddress)throw new ServiceTaskError("A fresh verified service-owned authority binding is required before external task-origin attribution.","ORIGIN_PROOF_FAILED");
    return {bindingId:binding.bindingId,state:"VERIFIED",runtimeEndpoint:binding.runtimeEndpoint,agentCardUrl:binding.agentCardUrl,sessionKeyAddress:binding.sessionKeyAddress,evidenceIds:binding.evidenceIds,detail:binding.detail,firstParty:false};
  }

  async function discoverInterface(record:MarketplaceServiceRecord, tests:MarketplaceServiceTestCoverage, binding:RuntimeOriginBinding):Promise<SelectedA2aInterface>{
    const testedEndpoint=exactA2aTestEndpoint(tests,now().getTime()); if(!testedEndpoint) throw new ServiceTaskError("A fresh Marketplace Test Lab PASS for a category-capable A2A endpoint is required before real task invocation.","SERVICE_NOT_READY");
    const cardUrl=a2aCardUrl(testedEndpoint,httpOptions.allowInsecureHttp); const response=await boundedFetch(cardUrl,{method:"GET"},httpOptions);
    if(response.status<200||response.status>=300||!/json/i.test(response.contentType))throw new ServiceTaskError("The tested A2A Agent Card is no longer reachable as valid JSON.","SERVICE_NOT_READY",true);
    let card:Record<string,unknown>;try{const parsed=JSON.parse(response.bodyText);card=asObject(parsed)??(()=>{throw new Error();})();}catch{throw new ServiceTaskError("The tested A2A Agent Card is not valid JSON.","SERVICE_NOT_READY");}
    if(hasClientAuthRequirement(card)) throw new ServiceTaskError("This A2A service requires client authentication that Spotriq has not been configured to provide. Service-owned proposal-key proof is not a client credential.","AUTH_REQUIRED");
    const selected=selectA2aInterface(card,response.finalUrl,testedEndpoint);
    if(!sameOrigin(selected.url,binding.runtimeEndpoint)||!sameOrigin(response.finalUrl,binding.agentCardUrl)) throw new ServiceTaskError("The selected A2A task interface does not share the verified service-runtime origin.","ORIGIN_PROOF_FAILED");
    if(selected.binding==="HTTP+JSON"&&major(selected.version)<1)throw new ServiceTaskError("Spotriq supports HTTP+JSON task invocation for A2A 1.x only; older A2A services must expose JSONRPC.","UNSUPPORTED_INTERFACE");
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

  function taskFromRemote(base:ServiceTask, remote:ParsedRemote, selected:SelectedA2aInterface,binding:RuntimeOriginBinding,attempt:ServiceTaskAttempt):ServiceTask{
    const observedAt=now().toISOString(), mapped=remoteTaskState(remote.task), remoteTaskId=safeText(remote.task?.id,512);
    const statusMessage=asObject(asObject(remote.task?.status)?.message);
    const remoteMessageId=safeText(remote.message?.messageId,512)??safeText(statusMessage?.messageId,512);
    const isJob=base.requestContext.originKind==="JOB_INTENT";
    const normalized:{state:ServiceTask["proposalState"];proposal?:RebalancingServiceProposal;detail:string}=isJob?normalizeProposal(proposalCandidate(remote),base.requestContextHash,observedAt):{state:"NONE",detail:"Activation-bound tasks use category result evidence rather than a Rebalancing proposal."};
    const result=normalizeActivationResult(base.requestContext,remote,observedAt);
    const structuredContract=isJob?normalized.state==="STRUCTURED":result.state==="STRUCTURED";
    const attributable=Boolean((remoteTaskId||remoteMessageId)&&sameOrigin(remote.finalUrl,selected.url)&&binding.state==="VERIFIED"&&structuredContract);
    const originBasis=binding.firstParty?"canonical ERC-8004 reconciliation plus fresh Marketplace Test Lab evidence for the same-origin first-party runtime":"fresh service-owned key-control verification plus the same-origin tested runtime";
    const originEvidence=attributable?createEvidenceEnvelope({subjectType:"service_task",subjectId:base.serviceTaskId,metric:"service.task_origin",value:remoteTaskId??remoteMessageId!,provenance:"marketplace-observed",source:DATA_SOURCES.MARKETPLACE,sourceRef:remote.finalUrl,observedAt,confidence:"high",method:EVIDENCE_METHODS.SERVICE_TASK_ORIGIN,methodInputs:[binding.bindingId,base.requestContextHash],limitation:isJob?`Spotriq itself sent the A2A request after ${originBasis}. This proves invocation/proposal origin at observation time; it does not prove hiring, payment, financial authority, profitability, or safe execution.`:`Spotriq itself sent the activation-bound A2A request after ${originBasis}. This proves the read-only runtime observation origin at this time; it does not prove financial authority, execution, profitability, or a future monitoring result.`}):undefined;
    const proposalEvidence=isJob&&normalized.proposal?createEvidenceEnvelope({subjectType:"service_task",subjectId:base.serviceTaskId,metric:"service.task_proposal",value:normalized.proposal.proposalHash,provenance:"marketplace-observed",source:DATA_SOURCES.MARKETPLACE,sourceRef:remote.finalUrl,observedAt,confidence:"high",method:EVIDENCE_METHODS.SERVICE_TASK_ORIGIN,methodInputs:[base.requestContextHash],limitation:"The structured proposal is attributable to the invoked A2A runtime and exact request context, but its financial content remains untrusted until user review and the existing Spotriq execution guard/boundary pipeline independently validates it."}):undefined;
    const resultEvidence=!isJob&&result.state==="STRUCTURED"?createEvidenceEnvelope({subjectType:"service_task",subjectId:base.serviceTaskId,metric:`service.${base.category}_result`,value:result.kind??result.action,provenance:"marketplace-observed",source:DATA_SOURCES.MARKETPLACE,sourceRef:remote.finalUrl,observedAt,confidence:"high",method:EVIDENCE_METHODS.SERVICE_TASK_ORIGIN,methodInputs:[base.activationId??"",base.requestContextHash],limitation:result.limitations[0]??"This is a read-only category result and not a financial execution or profitability claim."}):undefined;
    const resultWithEvidence:ServiceTaskResult=resultEvidence?{...result,evidenceIds:[resultEvidence.evidenceId]}:result;
    const detail=isJob?normalized.detail:result.detail;
    const updatedAttempt:ServiceTaskAttempt={...attempt,respondedAt:observedAt,state:mapped.state,remoteTaskId,remoteMessageId,remoteStatus:mapped.remoteStatus,detail};
    const originProof:ServiceTaskOriginProof={state:attributable?"VERIFIED":structuredContract?"FAILED":"UNVERIFIED",serviceId:base.serviceId,agentId:base.agentId,runtimeEndpoint:selected.url,agentCardUrl:selected.agentCardUrl,protocol:"A2A",protocolBinding:selected.binding,protocolVersion:selected.version,tenant:selected.tenant,authorityBindingId:binding.bindingId,serviceSessionKeyAddress:binding.sessionKeyAddress,requestId:attempt.requestId,messageId:attempt.messageId,requestContextHash:base.requestContextHash,remoteTaskId,remoteMessageId,observedAt,evidenceIds:[originEvidence?.evidenceId,proposalEvidence?.evidenceId,resultEvidence?.evidenceId].filter((v):v is string=>Boolean(v)),detail:attributable?(isJob?`Spotriq observed the exact-context A2A proposal from the same runtime origin using ${originBasis}.`:`Spotriq observed the exact-context ${base.category} read-only result from the activated AgentService runtime using ${originBasis}.`):detail};
    return {...base,state:mapped.state,protocolBinding:selected.binding,protocolVersion:selected.version,runtimeEndpoint:selected.url,agentCardUrl:selected.agentCardUrl,tenant:selected.tenant,remoteTaskId,remoteMessageId,remoteStatus:mapped.remoteStatus,proposalState:isJob?normalized.state:"NONE",proposal:isJob?normalized.proposal:undefined,result:resultWithEvidence,originProof,evidence:[...base.evidence,...[originEvidence,proposalEvidence,resultEvidence].filter((v):v is NonNullable<typeof v>=>Boolean(v))],attempts:[...base.attempts.slice(0,-1),updatedAttempt],updatedAt:observedAt,limitations:[...base.limitations,...result.limitations,"A real A2A invocation remains distinct from commercial hiring, payment, permission, financial execution, and financial outcome even when an Activation is linked.",...(isJob?["The external AgentService remains an authenticated proposer only and never receives Spotriq's boundary-controlled financial signer.","Agent-proposed ticks remain untrusted until explicit user review and the existing execution-plan/guard/boundary pipeline independently validates them."]:[]),...(originProof.state==="VERIFIED"?[binding.firstParty?"First-party origin attribution relies on canonical ERC-8004 reconciliation, fresh Marketplace Test Lab evidence, and the same-origin Spotriq A2A runtime; the result is not promoted into financial authority or outcome evidence.":"External origin attribution relies on a fresh service-key challenge plus a same-origin TLS A2A exchange; the A2A response itself is not required to carry a separate cryptographic result signature."]:[])]};
  }

  async function execute(job:RebalancingJobIntent,forceAttempt:boolean,activation?:MarketplaceActivation):Promise<ServiceTask>{
    assertInvokableJob(job,now().getTime());
    if (activation) {
      if (activation.state !== "ACTIVE" || activation.serviceId !== job.selectedService.serviceId || activation.buyerAddress.toLowerCase() !== job.walletAddress.toLowerCase()) throw new ServiceTaskError("The supplied marketplace Activation is not active for this Job Intent buyer and selected AgentService.","INVALID_STATE");
    }
    const id=serviceTaskId(job),existing=await store.get(id); if(existing&&!forceAttempt)return existing;
    const context=buildServiceTaskRequestContext(job),contextHash=serviceTaskRequestContextHash(job),attemptNumber=(existing?.attempt??0)+1; const requestIdValue=requestId(id,attemptNumber),messageIdValue=messageId(id,attemptNumber),requestedAt=now().toISOString();
    const attempt:ServiceTaskAttempt={attempt:attemptNumber,requestId:requestIdValue,messageId:messageIdValue,idempotencyKey:`${id}:attempt:${attemptNumber}`,requestedAt,state:"READY_TO_INVOKE"};
    const emptyResult:ServiceTaskResult={state:"NONE",category:"rebalancing",action:"PREPARE_RANGE_REBALANCE",evidenceIds:[],detail:"No AgentService result has been observed yet.",limitations:[]};
    let base:ServiceTask=existing?{...existing,originKind:"JOB_INTENT",category:"rebalancing",state:"READY_TO_INVOKE",attempt:attemptNumber,attempts:[...existing.attempts,attempt],proposalState:"NONE",proposal:undefined,result:emptyResult,requestContext:context,requestContextHash:contextHash,updatedAt:requestedAt}:{serviceTaskId:id,originKind:"JOB_INTENT",jobIntentId:job.jobIntentId,findingId:job.findingId,serviceId:job.selectedService.serviceId,agentId:job.selectedService.agentId,category:"rebalancing",state:"READY_TO_INVOKE",protocol:"A2A",requestContextHash:contextHash,requestContext:context,attempt:attemptNumber,attempts:[attempt],proposalState:"NONE",result:emptyResult,originProof:blankOrigin({serviceId:job.selectedService.serviceId,agentId:job.selectedService.agentId,requestContextHash:contextHash},requestIdValue,messageIdValue),commercialState:activation?(activation.paymentRequired?"PAYMENT_PROVEN":"HIRING_PROVEN"):"NOT_PROVEN",activationId:activation?.activationId,hireId:activation?.hireId,evidence:[],createdAt:requestedAt,updatedAt:requestedAt,limitations:activation?["This ServiceTask is bound to an ACTIVE Spotriq marketplace Activation for the same buyer and AgentService.",activation.paymentRequired?"Independent payment evidence was required by the Activation; ServiceTask binding still does not imply permission, execution or outcome.":"The bound FREE read-only Activation required no payment and grants no wallet signing or transaction authority."]:["Task invocation is not commercial hiring, payment or marketplace activation."]};
    await store.save(base);
    try{
      const [record,tests]=await Promise.all([marketplace.getService(job.selectedService.serviceId),marketplace.getTests(job.selectedService.serviceId)]);
      if(record.service.serviceId!==job.selectedService.serviceId||record.identity.discoveryId!==job.selectedService.agentId)throw new ServiceTaskError("Live AgentService identity no longer matches the Job Intent snapshot.","SERVICE_NOT_READY");
      const binding=await runtimeBinding(record);
      const selected=await discoverInterface(record,tests,binding); const remote=await send(selected,context,contextHash,requestIdValue,messageIdValue); const next=taskFromRemote(base,remote,selected,binding,attempt); await store.save(next); return next;
    }catch(error){
      const e=error instanceof ServiceTaskError?error:new ServiceTaskError(error instanceof Error?error.message:String(error),"REMOTE_ERROR",true); const mapped:ServiceTaskState=e.code==="AUTH_REQUIRED"?"AUTH_REQUIRED":e.code==="SERVICE_NOT_READY"?"READINESS_BLOCKED":e.code==="UNSUPPORTED_INTERFACE"?"UNSUPPORTED":e.code==="ORIGIN_PROOF_FAILED"?"ORIGIN_PROOF_FAILED":e.message.toLowerCase().includes("timeout")?"TIMED_OUT":"FAILED"; const ended=now().toISOString(); const failedAttempt={...attempt,respondedAt:ended,state:mapped,detail:e.message}; base={...base,state:mapped,attempts:[...base.attempts.slice(0,-1),failedAttempt],originProof:{...base.originProof,state:e.code==="ORIGIN_PROOF_FAILED"?"FAILED":"UNVERIFIED",detail:e.message},updatedAt:ended,limitations:[...base.limitations,e.message]}; await store.save(base); return base;
    }
  }

  async function executeActivation(activation:MarketplaceActivation,input:InvokeActivationTaskInput|undefined,forceAttempt:boolean):Promise<ServiceTask>{
    const record=await marketplace.getService(activation.serviceId);
    const context=buildActivationServiceTaskRequestContext(activation,record,input??{},now());
    const id=activationTaskId(context),existing=await store.get(id);
    if(existing&&!forceAttempt)return existing;
    const contextHash=activationContextHash(context),attemptNumber=(existing?.attempt??0)+1,requestIdValue=requestId(id,attemptNumber),messageIdValue=messageId(id,attemptNumber),requestedAt=now().toISOString();
    const attempt:ServiceTaskAttempt={attempt:attemptNumber,requestId:requestIdValue,messageId:messageIdValue,idempotencyKey:`${id}:attempt:${attemptNumber}`,requestedAt,state:"READY_TO_INVOKE"};
    const emptyResult:ServiceTaskResult={state:"NONE",category:record.service.category,action:context.requestedAction,evidenceIds:[],detail:"No activated AgentService result has been observed yet.",limitations:[]};
    let base:ServiceTask=existing?{...existing,originKind:"ACTIVATION",category:record.service.category,state:"READY_TO_INVOKE",attempt:attemptNumber,attempts:[...existing.attempts,attempt],proposalState:"NONE",proposal:undefined,result:emptyResult,requestContext:context,requestContextHash:contextHash,updatedAt:requestedAt}:{serviceTaskId:id,originKind:"ACTIVATION",serviceId:record.service.serviceId,agentId:record.service.agentId,category:record.service.category,state:"READY_TO_INVOKE",protocol:"A2A",requestContextHash:contextHash,requestContext:context,attempt:attemptNumber,attempts:[attempt],proposalState:"NONE",result:emptyResult,originProof:blankOrigin({serviceId:record.service.serviceId,agentId:record.service.agentId,requestContextHash:contextHash},requestIdValue,messageIdValue),commercialState:activation.paymentRequired?"PAYMENT_PROVEN":"HIRING_PROVEN",activationId:activation.activationId,hireId:activation.hireId,evidence:[],createdAt:requestedAt,updatedAt:requestedAt,limitations:["This category task is bound to an ACTIVE marketplace Activation for the same buyer and AgentService.","The v0.24 activation task is read-only and grants no wallet signing or financial execution authority.",record.service.category==="grid"?"Optional capital context is descriptive only; it is never a spend cap, trading permission or proof of capital.":record.service.category==="yield"?"A current rate/opportunity snapshot is not realised yield.":record.service.category==="health"?"Health monitoring begins with an on-demand snapshot; protective writes remain separately gated.":"Position analysis is separate from the existing reviewed Rebalancing execution spine."]};
    await store.save(base);
    try{
      const tests=await marketplace.getTests(record.service.serviceId);
      const binding=await runtimeBinding(record);
      const selected=await discoverInterface(record,tests,binding);
      const remote=await send(selected,context,contextHash,requestIdValue,messageIdValue);
      const next=taskFromRemote(base,remote,selected,binding,attempt);
      await store.save(next);
      return next;
    }catch(error){
      const e=error instanceof ServiceTaskError?error:new ServiceTaskError(error instanceof Error?error.message:String(error),"REMOTE_ERROR",true);
      const mapped:ServiceTaskState=e.code==="AUTH_REQUIRED"?"AUTH_REQUIRED":e.code==="SERVICE_NOT_READY"?"READINESS_BLOCKED":e.code==="UNSUPPORTED_INTERFACE"?"UNSUPPORTED":e.code==="ORIGIN_PROOF_FAILED"?"ORIGIN_PROOF_FAILED":e.message.toLowerCase().includes("timeout")?"TIMED_OUT":"FAILED";
      const ended=now().toISOString(),failedAttempt={...attempt,respondedAt:ended,state:mapped,detail:e.message};
      base={...base,state:mapped,attempts:[...base.attempts.slice(0,-1),failedAttempt],originProof:{...base.originProof,state:e.code==="ORIGIN_PROOF_FAILED"?"FAILED":"UNVERIFIED",detail:e.message},result:{...base.result,detail:e.message},updatedAt:ended,limitations:[...base.limitations,e.message]};
      await store.save(base);
      return base;
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
    const record=await marketplace.getService(task.serviceId);
    const binding=await runtimeBinding(record);
    if(!task.runtimeEndpoint||!task.agentCardUrl||!sameOrigin(task.runtimeEndpoint,binding.runtimeEndpoint)||!sameOrigin(task.agentCardUrl,binding.agentCardUrl))throw new ServiceTaskError("The persisted A2A task runtime no longer matches the freshly verified service binding.","ORIGIN_PROOF_FAILED");
    const remote=await requestExisting(task,operation); const selected:SelectedA2aInterface={url:task.runtimeEndpoint,binding:task.protocolBinding!,version:task.protocolVersion!,tenant:task.tenant,agentCardUrl:task.agentCardUrl}; const currentAttempt=task.attempts.at(-1)??{attempt:task.attempt,requestId:task.originProof.requestId,messageId:task.originProof.messageId,idempotencyKey:`${task.serviceTaskId}:reconcile`,requestedAt:task.updatedAt,state:task.state}; const next=taskFromRemote(task,remote,selected,binding,currentAttempt); await store.save(next); return next;
  }

  async function getActivationRuntimeState(activation:MarketplaceActivation):Promise<ActivationRuntimeState>{
    const task=await store.getForActivation(activation.activationId);
    const generatedAt=now().toISOString();
    const category=task?.category ?? (await marketplace.getService(activation.serviceId)).service.category;
    if(activation.state==="REVOKED"){
      return {activationId:activation.activationId,serviceId:activation.serviceId,buyerAddress:activation.buyerAddress,category,activationState:activation.state,observationState:"REVOKED",latestTask:task,activity:{state:"REVOKED",summary:"The marketplace service relationship is revoked; Spotriq will not start new activation-bound tasks."},...(task?.category==="health"?{monitoring:{state:"REVOKED" as const,detail:"Health monitoring through this marketplace Activation is revoked."}}:{}),outcome:{state:"NOT_APPLICABLE",detail:"Revocation is a relationship state, not a financial outcome."},generatedAt,methodVersion:SERVICE_TASK_METHOD,limitations:["Commercial relationship revocation does not erase historical tasks, transactions or outcomes and does not independently revoke a separate financial permission grant."]};
    }
    if(!task){
      return {activationId:activation.activationId,serviceId:activation.serviceId,buyerAddress:activation.buyerAddress,category,activationState:activation.state,observationState:"NOT_RUN",activity:{state:"NOT_STARTED",summary:"No activation-bound runtime task has been observed yet."},...(category==="health"?{monitoring:{state:"NOT_STARTED" as const,detail:"No health snapshot has been requested through this Activation yet."}}:{}),outcome:{state:category==="health"?"NOT_APPLICABLE":"INSUFFICIENT_DATA",detail:category==="health"?"A health monitoring relationship is observational until an independently authorized intervention exists.":"No financial outcome can be assessed before relevant activity and measurement exist."},generatedAt,methodVersion:SERVICE_TASK_METHOD,limitations:["Activation alone is not execution, activity or financial outcome evidence."]};
    }
    const observed=task.state==="COMPLETED"&&task.result.state==="STRUCTURED";
    const failed=!observed&&["FAILED","TIMED_OUT","REJECTED","READINESS_BLOCKED","ORIGIN_PROOF_FAILED","UNSUPPORTED","AUTH_REQUIRED","CANCELLED"].includes(task.state);
    const observedAt=task.result.observedAt??task.updatedAt;
    return {
      activationId:activation.activationId,serviceId:activation.serviceId,buyerAddress:activation.buyerAddress,category,activationState:activation.state,
      observationState:observed?"OBSERVED":failed?"FAILED":"NOT_RUN",latestTask:task,
      activity:{state:observed?"OBSERVED":failed?"FAILED":"NOT_STARTED",summary:observed?task.result.detail:failed?`The latest ${category} runtime task did not produce an accepted observation: ${task.result.detail}`:"A runtime task exists but no accepted structured category observation is available yet.",...(observed||failed?{observedAt}: {})},
      ...(category==="health"?{monitoring:{state:observed?"SNAPSHOT_OBSERVED" as const:failed?"FAILED" as const:"NOT_STARTED" as const,detail:observed?"A structured Venus health snapshot was observed from the activated service runtime.":failed?"The latest health snapshot attempt failed or could not be attributed safely.":"No accepted health snapshot is available yet.",...(observed||failed?{observedAt}: {})}}:{}),
      outcome:{state:category==="health"?"NOT_APPLICABLE":"INSUFFICIENT_DATA",detail:category==="grid"?"Market context is activity evidence, not profit, drawdown, fill quality or a trading outcome.":category==="yield"?"Current yield opportunities/rates are observations, not realised yield; later balance/time-window measurement is required.":category==="health"?"Health snapshots are monitoring state. A protective intervention and its outcome require separately authorized activity.":"Read-only position analysis is not a completed rebalance outcome; Spotriq's controlled execution/outcome spine remains separate."},
      generatedAt,methodVersion:SERVICE_TASK_METHOD,limitations:["Technical runtime success is never promoted to a good financial outcome.",...task.result.limitations],
    };
  }

  function previousActivationInput(task:ServiceTask):InvokeActivationTaskInput {
    const context=task.requestContext;
    if(context.originKind!=="ACTIVATION")return {};
    if(context.category==="rebalancing")return {tokenId:context.subject.tokenId};
    if(context.category==="grid")return {poolAddress:context.subject.poolAddress,capitalAsset:context.subject.capitalContext?.asset,capitalAmount:context.subject.capitalContext?.amount};
    return {};
  }

  return {
    invoke:(job,activation)=>execute(job,false,activation),
    invokeActivation:(activation,input)=>executeActivation(activation,input,false),
    async retry(job,serviceTaskIdValue,activation){const previous=await get(serviceTaskIdValue);if(previous.jobIntentId!==job.jobIntentId)throw new ServiceTaskError("The retry task does not belong to this Job Intent.","INVALID_INPUT");return execute(job,true,activation);},
    async retryActivation(activation,serviceTaskIdValue,input){const previous=await get(serviceTaskIdValue);if(previous.activationId!==activation.activationId||previous.originKind!=="ACTIVATION")throw new ServiceTaskError("The retry task does not belong to this marketplace Activation.","INVALID_INPUT");return executeActivation(activation,input??previousActivationInput(previous),true);},
    reconcile:async(id)=>refresh(await get(id),"get"),
    cancel:async(id)=>refresh(await get(id),"cancel"),
    get,
    getForJob:(jobIntentId)=>store.getForJob(jobIntentId),
    getForActivation:(activationId)=>store.getForActivation(activationId),
    getActivationRuntimeState,
  };
}
