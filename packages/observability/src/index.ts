import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { BscChainReader, BscChainStatus } from "@spotriq/chain";
import type {
  AgentStudioIntegrationStatus,
  DependencyHealth,
  OperationalHealthComponent,
  OperationalHealthHistory,
  OperationalHealthSnapshot,
  OperationalRequestMetrics,
  MarketplaceServiceTestCoverage,
  PaymentRailStatus,
  PublicOperationalHealthSnapshot,
  WorkerOperationalHeartbeat,
} from "@spotriq/domain";

export const OPERATIONAL_HEALTH_METHOD = "marketplace.operational-health@1.0.0";
export const WORKER_HEARTBEAT_METHOD = "marketplace.worker-heartbeat@1.0.0";

export interface ObservabilityDatabase {
  query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{ rows: Row[]; rowCount?: number | null }>;
}

export interface OperationalHealthStore {
  saveSnapshot(snapshot: OperationalHealthSnapshot): Promise<void>;
  listSnapshots(limit: number): Promise<OperationalHealthSnapshot[]>;
  saveWorkerHeartbeat(heartbeat: WorkerOperationalHeartbeat): Promise<void>;
  latestWorkerHeartbeat(): Promise<WorkerOperationalHeartbeat | undefined>;
}

const clone = <T,>(value: T): T => structuredClone(value);

export class MemoryOperationalHealthStore implements OperationalHealthStore {
  private readonly snapshots: OperationalHealthSnapshot[] = [];
  private heartbeat?: WorkerOperationalHeartbeat;
  async saveSnapshot(snapshot: OperationalHealthSnapshot): Promise<void> {
    this.snapshots.unshift(clone(snapshot));
    if (this.snapshots.length > 100) this.snapshots.length = 100;
  }
  async listSnapshots(limit: number): Promise<OperationalHealthSnapshot[]> {
    return this.snapshots.slice(0, limit).map(clone);
  }
  async saveWorkerHeartbeat(heartbeat: WorkerOperationalHeartbeat): Promise<void> { this.heartbeat = clone(heartbeat); }
  async latestWorkerHeartbeat(): Promise<WorkerOperationalHeartbeat | undefined> { return this.heartbeat ? clone(this.heartbeat) : undefined; }
}

export class PostgresOperationalHealthStore implements OperationalHealthStore {
  constructor(private readonly db: ObservabilityDatabase) {}
  async saveSnapshot(snapshot: OperationalHealthSnapshot): Promise<void> {
    await this.db.query(
      `insert into operational_health_snapshots (snapshot_id,platform_state,marketplace_state,payload,generated_at)
       values ($1,$2,$3,$4::jsonb,$5)
       on conflict (snapshot_id) do nothing`,
      [snapshot.snapshotId, snapshot.platformState, snapshot.marketplaceState, JSON.stringify(snapshot), snapshot.generatedAt],
    );
  }
  async listSnapshots(limit: number): Promise<OperationalHealthSnapshot[]> {
    const result = await this.db.query<{ payload: OperationalHealthSnapshot }>(
      "select payload from operational_health_snapshots order by generated_at desc limit $1",
      [limit],
    );
    return result.rows.map(row => row.payload);
  }
  async saveWorkerHeartbeat(heartbeat: WorkerOperationalHeartbeat): Promise<void> {
    await this.db.query(
      `insert into operational_worker_heartbeats (worker_id,service,version,environment,network,database_state,redis_configured,jobs_enabled,job_execution_mode,payload,observed_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
       on conflict (worker_id) do update set
         service=excluded.service,version=excluded.version,environment=excluded.environment,network=excluded.network,
         database_state=excluded.database_state,redis_configured=excluded.redis_configured,jobs_enabled=excluded.jobs_enabled,
         job_execution_mode=excluded.job_execution_mode,payload=excluded.payload,observed_at=excluded.observed_at`,
      [heartbeat.workerId, heartbeat.service, heartbeat.version, heartbeat.environment, heartbeat.network, heartbeat.databaseState, heartbeat.redisConfigured, heartbeat.jobsEnabled, heartbeat.jobExecutionMode, JSON.stringify(heartbeat), heartbeat.observedAt],
    );
  }
  async latestWorkerHeartbeat(): Promise<WorkerOperationalHeartbeat | undefined> {
    const result = await this.db.query<{ payload: WorkerOperationalHeartbeat }>(
      "select payload from operational_worker_heartbeats order by observed_at desc limit 1",
    );
    return result.rows[0]?.payload;
  }
}

export class RequestMetricsTracker {
  private readonly startedAt: string;
  private requests = 0;
  private clientErrors = 0;
  private serverErrors = 0;
  private readonly latencies: number[] = [];
  constructor(private readonly now: () => Date = () => new Date(), private readonly maxSamples = 500) {
    this.startedAt = now().toISOString();
  }
  observe(statusCode: number, latencyMs: number): void {
    this.requests += 1;
    if (statusCode >= 400 && statusCode < 500) this.clientErrors += 1;
    if (statusCode >= 500) this.serverErrors += 1;
    if (Number.isFinite(latencyMs) && latencyMs >= 0) {
      this.latencies.push(Math.round(latencyMs * 100) / 100);
      if (this.latencies.length > this.maxSamples) this.latencies.splice(0, this.latencies.length - this.maxSamples);
    }
  }
  snapshot(): OperationalRequestMetrics {
    const sorted = [...this.latencies].sort((a,b) => a-b);
    const average = sorted.length ? Math.round((sorted.reduce((sum,value) => sum + value, 0) / sorted.length) * 100) / 100 : undefined;
    const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] : undefined;
    const max = sorted.length ? sorted[sorted.length - 1] : undefined;
    return {
      windowStartedAt: this.startedAt,
      observedAt: this.now().toISOString(),
      requests: this.requests,
      clientErrors: this.clientErrors,
      serverErrors: this.serverErrors,
      serverErrorRate: this.requests ? Math.round((this.serverErrors / this.requests) * 10000) / 10000 : 0,
      latencyMs: { sampleSize: sorted.length, average, p95, max },
    };
  }
}

export interface MarketplaceOperationalTestReader { getTests(serviceId:string):Promise<MarketplaceServiceTestCoverage>; }

export interface OperationalHealthEngine {
  current(): Promise<OperationalHealthSnapshot>;
  publicCurrent(): Promise<PublicOperationalHealthSnapshot>;
  sync(): Promise<OperationalHealthSnapshot>;
  history(limit?: number): Promise<OperationalHealthHistory>;
  saveWorkerHeartbeat(heartbeat: WorkerOperationalHeartbeat): Promise<void>;
  latestWorkerHeartbeat(): Promise<WorkerOperationalHeartbeat | undefined>;
  requestMetrics: RequestMetricsTracker;
}

export interface CreateOperationalHealthEngineOptions {
  release: string;
  chain: BscChainReader;
  marketplace: MarketplaceOperationalTestReader;
  referenceServiceIds: string[];
  databaseHealth: () => Promise<DependencyHealth>;
  paymentRailsStatus: () => Promise<{ rails: PaymentRailStatus[]; checkedAt: string; limitations: string[] }>;
  agentStudioStatus: () => Promise<AgentStudioIntegrationStatus>;
  localServiceIds?: () => Promise<string[]>;
  store?: OperationalHealthStore;
  requestMetrics?: RequestMetricsTracker;
  now?: () => Date;
  testLabTargetAgeSeconds?: number;
  testLabStaleAfterSeconds?: number;
  workerStaleAfterSeconds?: number;
  workerUnavailableAfterSeconds?: number;
  jobExecutionMode?: "API_INLINE" | "WORKER_QUEUE";
  publicCacheTtlMs?: number;
}

function safeEndpointRef(value: string): string {
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "configured-endpoint";
  }
}

function sanitizeDiagnostic(value: string): string {
  return value
    .replace(/https?:\/\/[^\s,\]})]+/gi, "[endpoint]")
    .replace(/(api[-_]?key|token|secret|password)=([^\s&]+)/gi, "$1=[redacted]")
    .slice(0, 600);
}

function ageSeconds(now: Date, observedAt?: string): number | undefined {
  if (!observedAt) return undefined;
  const timestamp = Date.parse(observedAt);
  if (!Number.isFinite(timestamp)) return undefined;
  return Math.max(0, Math.floor((now.getTime() - timestamp) / 1000));
}

function freshness(now: Date, observedAt: string | undefined, target: number, stale: number) {
  const age = ageSeconds(now, observedAt);
  const state = age === undefined ? "UNAVAILABLE" as const : age <= target ? "FRESH" as const : age <= stale ? "AGING" as const : "STALE" as const;
  return { observedAt, ageSeconds: age, state, targetAgeSeconds: target, staleAfterSeconds: stale };
}

function dependencyState(value: DependencyHealth["state"]): OperationalHealthComponent["state"] {
  if (value === "ok") return "OK";
  if (value === "degraded") return "DEGRADED";
  if (value === "unavailable") return "UNAVAILABLE";
  return "NOT_CONFIGURED";
}

function component(input: OperationalHealthComponent): OperationalHealthComponent { return input; }

function platformState(components: OperationalHealthComponent[]): OperationalHealthSnapshot["platformState"] {
  const states = components.filter(item => item.scope === "PLATFORM").map(item => item.state);
  if (states.includes("UNAVAILABLE")) return "UNAVAILABLE";
  if (states.includes("DEGRADED") || states.includes("NOT_CONFIGURED") || states.includes("UNKNOWN")) return "DEGRADED";
  return "OPERATIONAL";
}

function marketplaceState(components: OperationalHealthComponent[]): OperationalHealthSnapshot["marketplaceState"] {
  const states = components.filter(item => item.scope === "MARKETPLACE").map(item => item.state);
  const active = states.filter(state => state !== "NOT_CONFIGURED" && state !== "UNKNOWN");
  if (!active.length) return "NOT_CONFIGURED";
  if (active.every(state => state === "UNAVAILABLE")) return "UNAVAILABLE";
  if (active.some(state => state === "UNAVAILABLE" || state === "DEGRADED")) return "DEGRADED";
  return "OPERATIONAL";
}

function snapshotId(release: string, generatedAt: string, components: OperationalHealthComponent[]): string {
  const digest = createHash("sha256").update(JSON.stringify({ release, generatedAt, components: components.map(x => [x.code,x.state,x.checkedAt]) })).digest("hex").slice(0,24);
  return `health:${digest}`;
}

function apiComponent(metrics: OperationalRequestMetrics, now: Date): OperationalHealthComponent {
  const enoughTraffic = metrics.requests >= 20;
  const degraded = enoughTraffic && metrics.serverErrorRate > 0.05;
  return component({
    code: "API", label: "Spotriq API", scope: "PLATFORM", state: degraded ? "DEGRADED" : "OK", checkedAt: now.toISOString(),
    summary: degraded ? `API 5xx rate is ${(metrics.serverErrorRate * 100).toFixed(1)}% in the current process window.` : "API process is serving requests; no elevated 5xx rate is currently established.",
    metrics: { requests: metrics.requests, clientErrors: metrics.clientErrors, serverErrors: metrics.serverErrors, serverErrorRate: metrics.serverErrorRate, p95LatencyMs: metrics.latencyMs.p95 ?? null, processUptimeSeconds: Math.floor(process.uptime()) },
    diagnostics: [`Request window started ${metrics.windowStartedAt}.`, `Latency samples retained: ${metrics.latencyMs.sampleSize}.`],
    limitations: ["In-process request metrics reset when the API process restarts; persisted operational snapshots preserve sampled state, not a full tracing backend."],
  });
}

async function databaseComponent(reader: () => Promise<DependencyHealth>, now: Date): Promise<OperationalHealthComponent> {
  const started = performance.now();
  try {
    const health = await reader();
    return component({
      code: "DATABASE", label: "PostgreSQL", scope: "PLATFORM", state: dependencyState(health.state), checkedAt: now.toISOString(), latencyMs: health.latencyMs ?? Math.round(performance.now() - started),
      summary: health.state === "ok" ? "Database connectivity probe succeeded." : health.state === "not_configured" ? "Database is not configured for this process." : "Database connectivity is degraded or unavailable.",
      metrics: { configured: health.state !== "not_configured" },
      diagnostics: health.detail ? [sanitizeDiagnostic(health.detail)] : [],
      limitations: ["Database health proves connectivity only; it does not prove every migration, query path, or historical record is correct."],
    });
  } catch (error) {
    return component({ code:"DATABASE",label:"PostgreSQL",scope:"PLATFORM",state:"UNAVAILABLE",checkedAt:now.toISOString(),latencyMs:Math.round(performance.now()-started),summary:"Database health probe failed.",metrics:{configured:true},diagnostics:[sanitizeDiagnostic(error instanceof Error?error.message:String(error))],limitations:["Probe failure is operational evidence only and does not mutate marketplace state."] });
  }
}

async function chainComponent(chain: BscChainReader, now: Date): Promise<OperationalHealthComponent> {
  const started = performance.now();
  try {
    const status: BscChainStatus = await chain.getStatus();
    const ok = status.endpoints.filter(item => item.state === "ok").length;
    const mismatch = status.endpoints.filter(item => item.state === "chain_mismatch").length;
    const unavailable = status.endpoints.filter(item => item.state === "unavailable").length;
    const invalid = status.endpoints.filter(item => item.state === "invalid_response").length;
    const divergent = status.blockDivergence?.state === "divergent";
    const state: OperationalHealthComponent["state"] = ok === 0 ? "UNAVAILABLE" : mismatch > 0 || unavailable > 0 || invalid > 0 || divergent ? "DEGRADED" : "OK";
    return component({
      code:"BSC_RPC",label:`BSC ${status.network} RPC`,scope:"PLATFORM",state,checkedAt:now.toISOString(),latencyMs:Math.round(performance.now()-started),
      summary: state === "OK" ? `${ok} BSC RPC endpoint${ok===1?"":"s"} responded on expected chain ${status.expectedChainId} without material block divergence.` : state === "DEGRADED" ? divergent ? `BSC RPC endpoints disagree by ${status.blockDivergence?.spreadBlocks??"unknown"} blocks, beyond the ${status.blockDivergence?.toleranceBlocks??"configured"}-block tolerance.` : "At least one BSC RPC endpoint is degraded while another remains usable." : "No configured/fallback BSC RPC endpoint is currently usable on the expected chain.",
      metrics:{ expectedChainId:status.expectedChainId, endpointCount:status.endpoints.length, healthyEndpoints:ok, unavailableEndpoints:unavailable, invalidResponseEndpoints:invalid, chainMismatchEndpoints:mismatch, latestBlockNumber:status.latestBlockNumber??null, rpcMode:status.rpcMode, blockDivergenceState:status.blockDivergence?.state??"unknown", blockDivergenceSpreadBlocks:status.blockDivergence?.spreadBlocks??null, blockDivergenceToleranceBlocks:status.blockDivergence?.toleranceBlocks??null },
      diagnostics:[...status.endpoints.map(item=>`${item.role} ${safeEndpointRef(item.url)}: ${item.state}${item.latencyMs!==undefined?` (${item.latencyMs}ms)`:""}${item.detail?` — ${sanitizeDiagnostic(item.detail)}`:""}`),...(divergent?[`RPC block divergence detected: min=${status.blockDivergence?.minBlockNumber??"?"}, max=${status.blockDivergence?.maxBlockNumber??"?"}.`]:[])],
      limitations:["RPC health confirms endpoint reachability, chain identity and bounded cross-provider block agreement; it does not establish protocol correctness, financial readiness, or transaction finality for unrelated operations.","RPC divergence is an operational warning only. Decision-grade financial reads remain responsible for their own pinned-block evidence and fail-closed behavior."],
    });
  } catch (error) {
    return component({code:"BSC_RPC",label:`BSC ${chain.network} RPC`,scope:"PLATFORM",state:"UNAVAILABLE",checkedAt:now.toISOString(),latencyMs:Math.round(performance.now()-started),summary:"BSC RPC status probe failed.",metrics:{expectedChainId:chain.definition.chainId},diagnostics:[sanitizeDiagnostic(error instanceof Error?error.message:String(error))],limitations:["RPC probe failure never changes canonical marketplace readiness by itself."]});
  }
}

interface ServiceObservation {
  serviceId: string;
  coverage: "NOT_RUN" | "PASS" | "PARTIAL" | "FAIL" | "ERROR";
  observedAt?: string;
  reachability: "PASS" | "WARN" | "FAIL" | "UNKNOWN";
  diagnostics: string[];
}

async function observeServices(marketplace: MarketplaceOperationalTestReader, ids: string[]): Promise<ServiceObservation[]> {
  return Promise.all(ids.map(async serviceId => {
    try {
      const tests = await marketplace.getTests(serviceId);
      const reach = tests.tests.find(test => test.code === "ENDPOINT_REACHABILITY");
      const reachability: ServiceObservation["reachability"] = reach?.state === "PASS" ? "PASS" : reach?.state === "FAIL" ? "FAIL" : reach?.state === "WARN" || reach?.state === "INCONCLUSIVE" ? "WARN" : "UNKNOWN";
      return { serviceId, coverage: tests.coverage, observedAt: tests.observedAt, reachability, diagnostics: [`coverage=${tests.coverage}`,`reachability=${reachability}`,`observedAt=${tests.observedAt??"unavailable"}`] };
    } catch (error) {
      return { serviceId, coverage:"ERROR" as const, reachability:"UNKNOWN" as const, diagnostics:[sanitizeDiagnostic(error instanceof Error?error.message:String(error))] };
    }
  }));
}

function marketplaceComponents(observations: ServiceObservation[], now: Date, targetAge: number, staleAfter: number): [OperationalHealthComponent,OperationalHealthComponent] {
  if (!observations.length) {
    const empty = (code:"MARKETPLACE_TEST_LAB"|"AGENT_RUNTIME", label:string):OperationalHealthComponent => component({code,label,scope:"MARKETPLACE",state:"NOT_CONFIGURED",checkedAt:now.toISOString(),summary:"No locally known AgentService runtime observations are available.",metrics:{servicesObserved:0},limitations:["Operational health does not invent runtime evidence when Marketplace Test Lab has no local service state."]});
    return [empty("MARKETPLACE_TEST_LAB","Marketplace Test Lab"),empty("AGENT_RUNTIME","Agent runtimes")];
  }
  const ages = observations.map(item => ageSeconds(now,item.observedAt)).filter((value):value is number => value !== undefined);
  const oldestAge = ages.length ? Math.max(...ages) : undefined;
  const oldestObservedAt = oldestAge === undefined ? undefined : new Date(now.getTime()-oldestAge*1000).toISOString();
  const fresh = freshness(now,oldestObservedAt,targetAge,staleAfter);
  const count = (coverage:ServiceObservation["coverage"]) => observations.filter(item=>item.coverage===coverage).length;
  const testErrors=count("ERROR"), failed=count("FAIL"), partial=count("PARTIAL"), notRun=count("NOT_RUN"), passed=count("PASS");
  const testState:OperationalHealthComponent["state"] = testErrors===observations.length ? "UNAVAILABLE" : failed>0||partial>0||notRun>0||testErrors>0||fresh.state==="STALE" ? "DEGRADED" : "OK";
  const reachPass=observations.filter(item=>item.reachability==="PASS").length;
  const reachFail=observations.filter(item=>item.reachability==="FAIL").length;
  const reachUnknown=observations.length-reachPass-reachFail;
  const runtimeState:OperationalHealthComponent["state"] = reachPass===0&&reachFail>0 ? "UNAVAILABLE" : reachFail>0||reachUnknown>0||fresh.state==="STALE" ? "DEGRADED" : "OK";
  const diagnostics=observations.map(item=>`${item.serviceId}: ${item.diagnostics.join(", ")}`);
  return [
    component({code:"MARKETPLACE_TEST_LAB",label:"Marketplace Test Lab",scope:"MARKETPLACE",state:testState,checkedAt:now.toISOString(),summary:testState==="OK"?`${passed}/${observations.length} locally known services have fresh PASS Test Lab coverage.`:`Marketplace Test Lab coverage is incomplete, stale, failing, or unavailable for part of locally known supply.`,freshness:fresh,metrics:{servicesObserved:observations.length,pass:passed,partial,fail:failed,notRun,probeErrors:testErrors},diagnostics,limitations:["This component summarizes persisted Marketplace Test Lab evidence. It does not run arbitrary third-party endpoints merely because a health page was requested.","Test Lab health is not marketplace readiness authority; readiness remains deterministic per AgentService."]}),
    component({code:"AGENT_RUNTIME",label:"Agent runtimes",scope:"MARKETPLACE",state:runtimeState,checkedAt:now.toISOString(),summary:runtimeState==="OK"?`${reachPass}/${observations.length} locally known services have fresh observed endpoint reachability.`:runtimeState==="UNAVAILABLE"?"No observed runtime endpoint is currently supported by a successful reachability observation.":"Some runtime reachability observations are missing, stale, warning, or failed.",freshness:fresh,metrics:{servicesObserved:observations.length,reachabilityPass:reachPass,reachabilityFail:reachFail,reachabilityUnknown:reachUnknown},diagnostics,limitations:["Runtime health is based on bounded Test Lab observations, not continuous invasive probing.","A reachable runtime does not imply canonical identity, marketplace readiness, payment, PermissionGrant, execution authority, or good financial outcomes."]}),
  ];
}

async function paymentComponent(reader: CreateOperationalHealthEngineOptions["paymentRailsStatus"], now: Date): Promise<OperationalHealthComponent> {
  const started=performance.now();
  try {
    const status=await reader(); const available=status.rails.filter(rail=>rail.state==="AVAILABLE").length; const degraded=status.rails.length-available;
    return component({code:"PAYMENT_RAILS",label:"Payment reconciliation adapters",scope:"MARKETPLACE",state:degraded?"DEGRADED":"OK",checkedAt:status.checkedAt||now.toISOString(),latencyMs:Math.round(performance.now()-started),summary:degraded?`${degraded}/${status.rails.length} payment reconciliation rails are degraded.`:`${available}/${status.rails.length} payment reconciliation rails report available.`,metrics:{rails:status.rails.length,available,degraded,settlementDispatchEnabled:false},diagnostics:status.rails.map(rail=>`${rail.rail}: ${rail.state} (${rail.reconciliationMode})`),limitations:[...status.limitations,"Payment adapter health never marks a Hire paid and never authorizes settlement dispatch."]});
  } catch(error) {
    return component({code:"PAYMENT_RAILS",label:"Payment reconciliation adapters",scope:"MARKETPLACE",state:"UNAVAILABLE",checkedAt:now.toISOString(),latencyMs:Math.round(performance.now()-started),summary:"Payment rail status could not be observed.",metrics:{settlementDispatchEnabled:false},diagnostics:[sanitizeDiagnostic(error instanceof Error?error.message:String(error))],limitations:["Adapter health is operational only; payment satisfaction still requires Hire-bound canonical reconciliation evidence."]});
  }
}

async function studioComponent(reader: CreateOperationalHealthEngineOptions["agentStudioStatus"], now: Date): Promise<OperationalHealthComponent> {
  try {
    const status=await reader();
    return component({code:"AGENT_STUDIO",label:"BNB Agent Studio adapter",scope:"INFORMATIONAL",state:"OK",checkedAt:status.checkedAt||now.toISOString(),summary:"Normalized Agent Studio integration layer is available.",metrics:{mode:status.mode,studioCliDispatchEnabled:status.studioCliDispatchEnabled,marketplaceReadinessOverrideEnabled:status.marketplaceReadinessOverrideEnabled,paymentOrExecutionDispatchEnabled:status.paymentOrExecutionDispatchEnabled},diagnostics:[`Supported networks: ${status.supportedNetworks.join(", ")}.`,`Supported protocols: ${status.supportedProtocols.join(", ")}.`],limitations:["This is integration-layer health only. It does not verify any operator deployment and cannot override canonical identity, Test Lab, readiness, payment, permission, execution, or outcome state."]});
  } catch(error) {
    return component({code:"AGENT_STUDIO",label:"BNB Agent Studio adapter",scope:"INFORMATIONAL",state:"UNAVAILABLE",checkedAt:now.toISOString(),summary:"Agent Studio normalized integration status could not be read.",metrics:{},diagnostics:[sanitizeDiagnostic(error instanceof Error?error.message:String(error))],limitations:["Agent Studio integration failure does not change unrelated AgentService truth."]});
  }
}

function workerComponent(heartbeat: WorkerOperationalHeartbeat | undefined, now: Date, staleAfter: number, unavailableAfter: number, jobMode:"API_INLINE"|"WORKER_QUEUE"): OperationalHealthComponent {
  if (!heartbeat) {
    const required = jobMode === "WORKER_QUEUE";
    return component({code:"WORKER_JOBS",label:"Worker / job execution",scope:required?"PLATFORM":"INFORMATIONAL",state:required?"UNAVAILABLE":"NOT_CONFIGURED",checkedAt:now.toISOString(),summary:required?"Worker queue mode is enabled but no persisted worker heartbeat is available.":"Dedicated queue worker is not required; current Smart Money Check jobs execute in the API process.",metrics:{jobExecutionMode:jobMode,heartbeatObserved:false,jobsEnabled:required},limitations:["Absence of a dedicated worker heartbeat is not a failure while job execution mode is API_INLINE."]});
  }
  const age=ageSeconds(now,heartbeat.observedAt)??Number.POSITIVE_INFINITY;
  const state:OperationalHealthComponent["state"] = age<=staleAfter?"OK":age<=unavailableAfter?"DEGRADED":"UNAVAILABLE";
  return component({code:"WORKER_JOBS",label:"Worker / job execution",scope:heartbeat.jobsEnabled?"PLATFORM":"INFORMATIONAL",state,checkedAt:now.toISOString(),summary:state==="OK"?"Latest worker heartbeat is fresh.":state==="DEGRADED"?"Latest worker heartbeat is aging.":"Latest worker heartbeat is stale beyond the availability threshold.",freshness:freshness(now,heartbeat.observedAt,staleAfter,unavailableAfter),metrics:{jobExecutionMode:heartbeat.jobExecutionMode,jobsEnabled:heartbeat.jobsEnabled,redisConfigured:heartbeat.redisConfigured,databaseState:heartbeat.databaseState,processUptimeSeconds:heartbeat.processUptimeSeconds},diagnostics:[`workerId=${heartbeat.workerId}`,`workerVersion=${heartbeat.version}`,`observedAt=${heartbeat.observedAt}`],limitations:["Worker heartbeat health does not prove any individual financial job succeeded and cannot mutate job, activation, permission, transaction, or outcome state."]});
}

function publicProjection(snapshot: OperationalHealthSnapshot): PublicOperationalHealthSnapshot {
  return {
    ...clone(snapshot),
    visibility:"PUBLIC",
    components:snapshot.components.map(({diagnostics:_diagnostics,...rest})=>rest),
  };
}

export function createOperationalHealthEngine(options: CreateOperationalHealthEngineOptions): OperationalHealthEngine {
  const store=options.store??new MemoryOperationalHealthStore();
  const now=options.now??(()=>new Date());
  const requestMetrics=options.requestMetrics??new RequestMetricsTracker(now);
  const targetAge=options.testLabTargetAgeSeconds??21_600;
  const staleAfter=options.testLabStaleAfterSeconds??86_400;
  const workerStale=options.workerStaleAfterSeconds??90;
  const workerUnavailable=options.workerUnavailableAfterSeconds??300;
  const jobMode=options.jobExecutionMode??"API_INLINE";
  const publicCacheTtlMs=Math.max(1000,options.publicCacheTtlMs??15000);
  let cachedPublicSource:{snapshot:OperationalHealthSnapshot;expiresAtMs:number}|undefined;

  async function collect():Promise<OperationalHealthSnapshot>{
    const at=now(); const metrics=requestMetrics.snapshot();
    let serviceIds=[...new Set(options.referenceServiceIds)];
    if(options.localServiceIds){try{serviceIds=[...new Set([...serviceIds,...await options.localServiceIds()])].slice(0,100);}catch{/* local inventory failure is reflected through DB component */}}
    const servicePromise=observeServices(options.marketplace,serviceIds).catch(()=>[] as ServiceObservation[]);
    const [database,bsc,observations,payment,studio,heartbeat]=await Promise.all([
      databaseComponent(options.databaseHealth,at), chainComponent(options.chain,at), servicePromise, paymentComponent(options.paymentRailsStatus,at), studioComponent(options.agentStudioStatus,at), store.latestWorkerHeartbeat().catch(()=>undefined),
    ]);
    const [testLab,runtimes]=marketplaceComponents(observations,at,targetAge,staleAfter);
    const components=[apiComponent(metrics,at),database,bsc,testLab,runtimes,payment,studio,workerComponent(heartbeat,at,workerStale,workerUnavailable,jobMode)];
    const generatedAt=at.toISOString();
    return {
      snapshotId:snapshotId(options.release,generatedAt,components),service:"Spotriq",release:options.release,platformState:platformState(components),marketplaceState:marketplaceState(components),components,requestMetrics:metrics,generatedAt,methodVersion:OPERATIONAL_HEALTH_METHOD,
      operationalOnly:true,marketplaceReadinessAuthority:false,financialReadinessAuthority:false,trustAuthority:false,paymentAuthority:false,permissionAuthority:false,executionAuthority:false,outcomeAuthority:false,
      limitations:["Operational health describes whether Spotriq dependencies and integration surfaces are functioning; it is not marketplace trust, AgentService readiness, financial safety, payment evidence, PermissionGrant, execution evidence, or financial outcome.","Public health redacts component diagnostics and configured endpoint references. Admin diagnostics require an independent server-side secret and still have no write authority over marketplace/financial state."]
    };
  }

  return {
    requestMetrics,
    current:collect,
    async publicCurrent(){const atMs=now().getTime();if(cachedPublicSource&&cachedPublicSource.expiresAtMs>atMs)return publicProjection(cachedPublicSource.snapshot);const snapshot=await collect();cachedPublicSource={snapshot:clone(snapshot),expiresAtMs:atMs+publicCacheTtlMs};return publicProjection(snapshot);},
    async sync(){const snapshot=await collect();await store.saveSnapshot(snapshot);cachedPublicSource={snapshot:clone(snapshot),expiresAtMs:now().getTime()+publicCacheTtlMs};return snapshot;},
    async history(limit=20){const safe=Math.max(1,Math.min(100,Math.floor(limit)||20));return{snapshots:await store.listSnapshots(safe),generatedAt:now().toISOString(),methodVersion:OPERATIONAL_HEALTH_METHOD};},
    saveWorkerHeartbeat:(heartbeat)=>store.saveWorkerHeartbeat(heartbeat),
    latestWorkerHeartbeat:()=>store.latestWorkerHeartbeat(),
  };
}

export function createWorkerHeartbeat(input:{workerId:string;version:string;environment:WorkerOperationalHeartbeat["environment"];network:WorkerOperationalHeartbeat["network"];databaseState:WorkerOperationalHeartbeat["databaseState"];redisConfigured:boolean;jobsEnabled:boolean;jobExecutionMode:"API_INLINE"|"WORKER_QUEUE";processUptimeSeconds:number;observedAt?:string}):WorkerOperationalHeartbeat{
  return{workerId:input.workerId,service:"spotriq-worker",version:input.version,environment:input.environment,network:input.network,databaseState:input.databaseState,redisConfigured:input.redisConfigured,jobsEnabled:input.jobsEnabled,jobExecutionMode:input.jobExecutionMode,processUptimeSeconds:Math.max(0,Math.floor(input.processUptimeSeconds)),observedAt:input.observedAt??new Date().toISOString(),methodVersion:WORKER_HEARTBEAT_METHOD};
}
