import { createHash, randomUUID } from "node:crypto";

export const ADOPTION_ANALYTICS_METHOD = "adoption-analytics@1.0.0" as const;
export const ADOPTION_ANALYTICS_SCHEMA = "spotriq.adoption-analytics@1.0.0" as const;

export const ADOPTION_EVENT_NAMES = [
  "HOME_VIEWED",
  "EXPLORE_VIEWED",
  "RECOMMENDATION_VIEWED",
  "SERVICE_PROFILE_VIEWED",
  "SERVICE_COMPARE_VIEWED",
  "PERMISSION_CHECKOUT_VIEWED",
  "MY_AGENTS_VIEWED",
  "AGENT_ADVANTAGE_VIEWED",
] as const;
export type AdoptionEventName = typeof ADOPTION_EVENT_NAMES[number];
export type AdoptionChannel = "PRODUCT" | "ACCEPTANCE";
export type AdoptionCategory = "rebalancing" | "grid" | "yield" | "health";

export const FEEDBACK_CONTEXTS = [
  "SMART_MONEY_CHECK",
  "AGENT_MATCH",
  "AGENT_PROFILE",
  "PERMISSION_CHECKOUT",
  "ACTIVATION",
  "AGENT_ADVANTAGE",
  "SWITCH",
  "REVOKE",
  "OPERATOR_WORKSPACE",
] as const;
export type FeedbackContext = typeof FEEDBACK_CONTEXTS[number];

export const FEEDBACK_REASON_CODES = [
  "USEFUL","NOT_USEFUL","UNCLEAR","TOO_EXPENSIVE","PERMISSION_TOO_BROAD","RUNTIME_UNRELIABLE",
  "FOUND_BETTER_AGENT","NO_LONGER_NEEDED","DID_NOT_HELP","ACTIVATION_FRICTION","OTHER",
] as const;
export type FeedbackReasonCode = typeof FEEDBACK_REASON_CODES[number];

export interface AdoptionEventInput {
  eventName: AdoptionEventName;
  sessionId: string;
  channel?: AdoptionChannel;
  category?: AdoptionCategory;
  serviceId?: string;
  subjectId?: string;
}
export interface AdoptionFeedbackInput {
  context: FeedbackContext;
  sessionId: string;
  channel?: AdoptionChannel;
  category?: AdoptionCategory;
  serviceId?: string;
  reasonCode?: FeedbackReasonCode;
  score?: 1|2|3|4|5;
  comment?: string;
}
export interface PersistedAdoptionEvent {
  eventId:string; eventName:AdoptionEventName; channel:AdoptionChannel; sessionHash:string; category?:AdoptionCategory;
  serviceId?:string; subjectId?:string; occurredAt:string; methodVersion:typeof ADOPTION_ANALYTICS_METHOD;
}
export interface PersistedAdoptionFeedback {
  feedbackId:string; context:FeedbackContext; channel:AdoptionChannel; sessionHash:string; category?:AdoptionCategory;
  serviceId?:string; reasonCode?:FeedbackReasonCode; score?:1|2|3|4|5; comment?:string; submittedAt:string; methodVersion:typeof ADOPTION_ANALYTICS_METHOD;
}
export interface AdoptionReportFilters { from?:string; to?:string; category?:AdoptionCategory; }
export interface AdoptionFunnel {
  homeViews:number; exploreViews:number; smartMoneyChecksStarted:number; smartMoneyChecksCompleted:number; findingsProduced:number;
  recommendationsProduced:number; serviceProfilesViewed:number; comparesViewed:number; quotesCreated:number; hiresCreated:number;
  activationsCreated:number; permissionCheckouts:number; permissionGrantsLinked:number; runtimeTasks:number; transactionsObserved:number;
  outcomesMeasured:number; advantageReports:number; advantageMeasured:number; switchesCompleted:number; relationshipsRevoked:number;
}
export interface SupplyMetrics {
  agentServices:number; operatorDeclarations:number; operatorSubmittedOrActive:number; testLabRuns:number; agentStudioDeployments:number;
}
export interface FeedbackMetrics { total:number; byContext:Record<string,number>; byReason:Record<string,number>; averageScore?:number; }
export interface AdoptionAnalyticsReport {
  schemaVersion:typeof ADOPTION_ANALYTICS_SCHEMA;
  generatedAt:string;
  filters:AdoptionReportFilters;
  channel:"PRODUCT";
  productEvents:number;
  acceptanceEventsExcluded:number;
  funnel:AdoptionFunnel;
  supply:SupplyMetrics;
  feedback:FeedbackMetrics;
  limitations:string[];
  authority:{financialTruth:false;readiness:false;payment:false;permission:false;execution:false;outcome:false;agentAdvantage:false};
}

export interface SqlExecutor { query<Row=Record<string,unknown>>(text:string,values?:unknown[]):Promise<{rows:Row[];rowCount?:number|null}>; }
export interface AdoptionAnalyticsStore {
  insertEvent(event:PersistedAdoptionEvent):Promise<void>;
  insertFeedback(feedback:PersistedAdoptionFeedback):Promise<void>;
  report(filters:AdoptionReportFilters):Promise<AdoptionAnalyticsReport>;
}

export class AdoptionAnalyticsError extends Error {
  constructor(public readonly code:"INVALID_INPUT"|"PERSISTENCE_FAILED",message:string){super(message);this.name="AdoptionAnalyticsError";}
}

const EVENT_SET=new Set<string>(ADOPTION_EVENT_NAMES);
const CONTEXT_SET=new Set<string>(FEEDBACK_CONTEXTS);
const REASON_SET=new Set<string>(FEEDBACK_REASON_CODES);
const CATEGORY_SET=new Set<string>(["rebalancing","grid","yield","health"]);
const CONTROL_OR_BIDI=/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const EVM_ADDRESS=/0x[a-fA-F0-9]{40}/;
function bounded(value:string|undefined,label:string,max:number):string|undefined {
  if(value===undefined)return undefined;
  const text=value.trim();
  if(!text||text.length>max)throw new AdoptionAnalyticsError("INVALID_INPUT",`${label} must be 1-${max} characters.`);
  if(CONTROL_OR_BIDI.test(text))throw new AdoptionAnalyticsError("INVALID_INPUT",`${label} contains unsafe control/directional characters.`);
  if(EVM_ADDRESS.test(text))throw new AdoptionAnalyticsError("INVALID_INPUT",`${label} must not contain a raw wallet address.`);
  return text;
}
function sessionHash(sessionId:string,pepper:string):string {
  const safe=bounded(sessionId,"sessionId",160);
  if(!safe||safe.length<8)throw new AdoptionAnalyticsError("INVALID_INPUT","sessionId must contain at least 8 characters.");
  return createHash("sha256").update(`${pepper}:${safe}`).digest("hex");
}
function parseTime(value:string|undefined,label:string):string|undefined {
  if(!value)return undefined; const ms=Date.parse(value); if(!Number.isFinite(ms))throw new AdoptionAnalyticsError("INVALID_INPUT",`${label} must be an ISO timestamp.`);return new Date(ms).toISOString();
}
export function normalizeFilters(input:AdoptionReportFilters={}):AdoptionReportFilters {
  const from=parseTime(input.from,"from"),to=parseTime(input.to,"to");
  if(from&&to&&Date.parse(from)>=Date.parse(to))throw new AdoptionAnalyticsError("INVALID_INPUT","from must be earlier than to.");
  if(from&&Date.now()-Date.parse(from)>366*24*60*60*1000)throw new AdoptionAnalyticsError("INVALID_INPUT","analytics windows are bounded to the most recent 366 days.");
  if(input.category&&!CATEGORY_SET.has(input.category))throw new AdoptionAnalyticsError("INVALID_INPUT","Unsupported category filter.");
  return {from,to,category:input.category};
}
function baseReport(filters:AdoptionReportFilters):AdoptionAnalyticsReport {
  return {schemaVersion:ADOPTION_ANALYTICS_SCHEMA,generatedAt:new Date().toISOString(),filters,channel:"PRODUCT",productEvents:0,acceptanceEventsExcluded:0,
    funnel:{homeViews:0,exploreViews:0,smartMoneyChecksStarted:0,smartMoneyChecksCompleted:0,findingsProduced:0,recommendationsProduced:0,serviceProfilesViewed:0,comparesViewed:0,quotesCreated:0,hiresCreated:0,activationsCreated:0,permissionCheckouts:0,permissionGrantsLinked:0,runtimeTasks:0,transactionsObserved:0,outcomesMeasured:0,advantageReports:0,advantageMeasured:0,switchesCompleted:0,relationshipsRevoked:0},
    supply:{agentServices:0,operatorDeclarations:0,operatorSubmittedOrActive:0,testLabRuns:0,agentStudioDeployments:0},feedback:{total:0,byContext:{},byReason:{}},
    limitations:["Analytics describe observed product usage and persisted domain facts; they do not establish financial success, agent trust or marketplace readiness.","Wallet-connect conversion is not reported until Spotriq has a deterministic server-observed wallet-connect fact.","Acceptance/verifier traffic is stored separately and excluded from PRODUCT adoption totals."],
    authority:{financialTruth:false,readiness:false,payment:false,permission:false,execution:false,outcome:false,agentAdvantage:false}};
}

export class MemoryAdoptionAnalyticsStore implements AdoptionAnalyticsStore {
  readonly events:PersistedAdoptionEvent[]=[]; readonly feedback:PersistedAdoptionFeedback[]=[];
  constructor(private readonly domain:Partial<AdoptionFunnel&SupplyMetrics>={}){}
  async insertEvent(event:PersistedAdoptionEvent){this.events.push(structuredClone(event));}
  async insertFeedback(feedback:PersistedAdoptionFeedback){this.feedback.push(structuredClone(feedback));}
  async report(raw:AdoptionReportFilters){const filters=normalizeFilters(raw);const r=baseReport(filters);const inWindow=(at:string)=> (!filters.from||at>=filters.from)&&(!filters.to||at<filters.to);const product=this.events.filter(e=>e.channel==="PRODUCT"&&inWindow(e.occurredAt)&&(!filters.category||e.category===filters.category));r.productEvents=product.length;r.acceptanceEventsExcluded=this.events.filter(e=>e.channel==="ACCEPTANCE"&&inWindow(e.occurredAt)).length;r.funnel={...r.funnel,...this.domain};r.funnel.homeViews=product.filter(e=>e.eventName==="HOME_VIEWED").length;r.funnel.exploreViews=product.filter(e=>e.eventName==="EXPLORE_VIEWED").length;r.funnel.serviceProfilesViewed=product.filter(e=>e.eventName==="SERVICE_PROFILE_VIEWED").length;r.funnel.comparesViewed=product.filter(e=>e.eventName==="SERVICE_COMPARE_VIEWED").length;const fb=this.feedback.filter(f=>f.channel==="PRODUCT"&&inWindow(f.submittedAt)&&(!filters.category||f.category===filters.category));r.feedback.total=fb.length;for(const f of fb){r.feedback.byContext[f.context]=(r.feedback.byContext[f.context]??0)+1;if(f.reasonCode)r.feedback.byReason[f.reasonCode]=(r.feedback.byReason[f.reasonCode]??0)+1;}const scores=fb.flatMap(f=>f.score?[f.score]:[]);if(scores.length)r.feedback.averageScore=scores.reduce((a,b)=>a+b,0)/scores.length;return r;}
}

function filterSql(column:string,categoryColumn?:string){return `($1::timestamptz is null or ${column} >= $1::timestamptz) and ($2::timestamptz is null or ${column} < $2::timestamptz)${categoryColumn?` and ($3::text is null or ${categoryColumn}=$3::text)`:""}`;}
export class PostgresAdoptionAnalyticsStore implements AdoptionAnalyticsStore {
  constructor(private readonly db:SqlExecutor){}
  async insertEvent(e:PersistedAdoptionEvent){await this.db.query(`insert into adoption_analytics_events(event_id,event_name,channel,session_hash,category,service_id,subject_id,occurred_at,method_version) values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[e.eventId,e.eventName,e.channel,e.sessionHash,e.category??null,e.serviceId??null,e.subjectId??null,e.occurredAt,e.methodVersion]);}
  async insertFeedback(f:PersistedAdoptionFeedback){await this.db.query(`insert into adoption_feedback(feedback_id,context,channel,session_hash,category,service_id,reason_code,score,comment,submitted_at,method_version) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[f.feedbackId,f.context,f.channel,f.sessionHash,f.category??null,f.serviceId??null,f.reasonCode??null,f.score??null,f.comment??null,f.submittedAt,f.methodVersion]);}
  async report(raw:AdoptionReportFilters){const filters=normalizeFilters(raw);const r=baseReport(filters);const p=[filters.from??null,filters.to??null,filters.category??null];const count=async(sql:string,values=p)=>Number((await this.db.query<{n:string|number}>(sql,values)).rows[0]?.n??0);
    r.productEvents=await count(`select count(*) n from adoption_analytics_events where channel='PRODUCT' and ${filterSql("occurred_at","category")}`);
    r.acceptanceEventsExcluded=await count(`select count(*) n from adoption_analytics_events where channel='ACCEPTANCE' and ${filterSql("occurred_at")}`,p.slice(0,2));
    r.funnel.homeViews=await count(`select count(*) n from adoption_analytics_events where channel='PRODUCT' and event_name='HOME_VIEWED' and ${filterSql("occurred_at","category")}`);
    r.funnel.exploreViews=await count(`select count(*) n from adoption_analytics_events where channel='PRODUCT' and event_name='EXPLORE_VIEWED' and ${filterSql("occurred_at","category")}`);
    r.funnel.serviceProfilesViewed=await count(`select count(*) n from adoption_analytics_events where channel='PRODUCT' and event_name='SERVICE_PROFILE_VIEWED' and ${filterSql("occurred_at","category")}`);
    r.funnel.comparesViewed=await count(`select count(*) n from adoption_analytics_events where channel='PRODUCT' and event_name='SERVICE_COMPARE_VIEWED' and ${filterSql("occurred_at","category")}`);
    const checkCategory=filters.category?`exists(select 1 from findings f where f.check_session_id=c.check_session_id and f.category=$3)`:"true";
    r.funnel.smartMoneyChecksStarted=await count(`select count(*) n from check_sessions c where ${filterSql("c.created_at")} and ${checkCategory}`,filters.category?p:p.slice(0,2));
    r.funnel.smartMoneyChecksCompleted=await count(`select count(*) n from check_sessions c where c.completed_at is not null and ${filterSql("c.completed_at")} and ${checkCategory}`,filters.category?p:p.slice(0,2));
    r.funnel.findingsProduced=await count(`select count(*) n from findings f where ${filterSql("f.generated_at","f.category")}`);
    r.funnel.recommendationsProduced=await count(`select count(*) n from recommendation_candidates rc join recommendation_sessions rs on rs.recommendation_session_id=rc.recommendation_session_id left join findings f on f.finding_id=rs.finding_id where ${filterSql("rs.created_at","f.category")}`);
    const serviceCount=async(table:string,timeCol:string,extra="")=>count(`select count(*) n from ${table} x join agent_services s on s.service_id=x.service_id where ${filterSql(`x.${timeCol}`,"s.category")} ${extra}`);
    r.funnel.quotesCreated=await serviceCount("commercial_quotes","created_at");
    r.funnel.hiresCreated=await serviceCount("commercial_hires","accepted_at");
    r.funnel.activationsCreated=await serviceCount("activations","started_at","and x.started_at is not null");
    r.funnel.permissionCheckouts=await count(`select count(*) n from permission_checkout_sessions x where ${filterSql("x.created_at","x.category")}`);
    r.funnel.permissionGrantsLinked=await count(`select count(*) n from scoped_permission_requests x where x.linked_permission_grant_id is not null and ${filterSql("x.reviewed_at","x.category")}`);
    r.funnel.runtimeTasks=await serviceCount("service_tasks","created_at");
    r.funnel.transactionsObserved=await count(`select count(*) n from transaction_records x join activations a on a.activation_id=x.activation_id join agent_services s on s.service_id=a.service_id where x.hash is not null and ${filterSql("coalesce(x.confirmed_at,x.submitted_at)","s.category")}`);
    r.funnel.outcomesMeasured=await count(`select count(distinct om.outcome_window_id) n from outcome_metrics om join activations a on a.activation_id=om.activation_id join agent_services s on s.service_id=a.service_id where ${filterSql("om.created_at","s.category")}`);
    r.funnel.advantageReports=await count(`select count(*) n from agent_advantage_reports x where ${filterSql("x.generated_at","x.category")}`);
    r.funnel.advantageMeasured=await count(`select count(*) n from agent_advantage_reports x where x.report_state='MEASURED' and ${filterSql("x.generated_at","x.category")}`);
    r.funnel.switchesCompleted=await count(`select count(*) n from my_agent_switches x where x.state='COMPLETED' and ${filterSql("x.created_at","x.category")}`);
    r.funnel.relationshipsRevoked=await serviceCount("activations","ended_at","and x.ended_at is not null");
    r.supply.agentServices=await count(`select count(*) n from agent_services s where ($3::text is null or s.category=$3)`,[null,null,filters.category??null]);
    r.supply.operatorDeclarations=await count(`select count(*) n from operator_service_declarations x where ${filterSql("x.created_at","x.category")}`);
    r.supply.operatorSubmittedOrActive=await count(`select count(*) n from operator_service_declarations x where x.lifecycle_state in ('SUBMITTED','ACTIVE') and ${filterSql("x.updated_at","x.category")}`);
    r.supply.testLabRuns=await serviceCount("marketplace_service_test_runs","completed_at");
    r.supply.agentStudioDeployments=await serviceCount("agent_studio_deployments","created_at");
    const fb=(await this.db.query<{context:string;reason_code:string|null;score:number|null}>(`select context,reason_code,score from adoption_feedback where channel='PRODUCT' and ${filterSql("submitted_at","category")}`,p)).rows;r.feedback.total=fb.length;let scoreTotal=0,scoreCount=0;for(const row of fb){r.feedback.byContext[row.context]=(r.feedback.byContext[row.context]??0)+1;if(row.reason_code)r.feedback.byReason[row.reason_code]=(r.feedback.byReason[row.reason_code]??0)+1;if(row.score){scoreTotal+=Number(row.score);scoreCount++;}}if(scoreCount)r.feedback.averageScore=scoreTotal/scoreCount;return r;}
}

export interface AdoptionAnalyticsEngine { recordEvent(input:AdoptionEventInput):Promise<PersistedAdoptionEvent>; recordFeedback(input:AdoptionFeedbackInput):Promise<PersistedAdoptionFeedback>; report(filters?:AdoptionReportFilters):Promise<AdoptionAnalyticsReport>; }
export function createAdoptionAnalyticsEngine(options:{store:AdoptionAnalyticsStore;sessionPepper?:string;now?:()=>Date}):AdoptionAnalyticsEngine {
  const pepper=options.sessionPepper?.trim()||ADOPTION_ANALYTICS_METHOD;const now=options.now??(()=>new Date());
  return {
    async recordEvent(input){if(!EVENT_SET.has(input.eventName))throw new AdoptionAnalyticsError("INVALID_INPUT","Unknown analytics eventName.");if(input.category&&!CATEGORY_SET.has(input.category))throw new AdoptionAnalyticsError("INVALID_INPUT","Unsupported analytics category.");const event:PersistedAdoptionEvent={eventId:`evt_${randomUUID()}`,eventName:input.eventName,channel:input.channel??"PRODUCT",sessionHash:sessionHash(input.sessionId,pepper),category:input.category,serviceId:bounded(input.serviceId,"serviceId",160),subjectId:bounded(input.subjectId,"subjectId",160),occurredAt:now().toISOString(),methodVersion:ADOPTION_ANALYTICS_METHOD};await options.store.insertEvent(event);return event;},
    async recordFeedback(input){if(!CONTEXT_SET.has(input.context))throw new AdoptionAnalyticsError("INVALID_INPUT","Unknown feedback context.");if(input.category&&!CATEGORY_SET.has(input.category))throw new AdoptionAnalyticsError("INVALID_INPUT","Unsupported feedback category.");if(input.reasonCode&&!REASON_SET.has(input.reasonCode))throw new AdoptionAnalyticsError("INVALID_INPUT","Unknown feedback reasonCode.");if(input.score!==undefined&&(!Number.isInteger(input.score)||input.score<1||input.score>5))throw new AdoptionAnalyticsError("INVALID_INPUT","score must be an integer from 1 to 5.");const feedback:PersistedAdoptionFeedback={feedbackId:`fb_${randomUUID()}`,context:input.context,channel:input.channel??"PRODUCT",sessionHash:sessionHash(input.sessionId,pepper),category:input.category,serviceId:bounded(input.serviceId,"serviceId",160),reasonCode:input.reasonCode,score:input.score,comment:bounded(input.comment,"comment",500),submittedAt:now().toISOString(),methodVersion:ADOPTION_ANALYTICS_METHOD};await options.store.insertFeedback(feedback);return feedback;},
    report(filters={}){return options.store.report(normalizeFilters(filters));},
  };
}
