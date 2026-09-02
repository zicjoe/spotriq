import { createHash, randomUUID } from "node:crypto";

export const PRODUCTION_HARDENING_METHOD = "production-hardening@1.0.0";
export const DURABLE_QUEUE_METHOD = "production-work-queue@1.0.0";
export const RATE_LIMIT_METHOD = "production-rate-limit@1.0.0";

export interface SqlExecutor {
  query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{ rows: Row[]; rowCount?: number | null }>;
}

export interface RateLimitPolicy {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
  count: number;
  methodVersion: typeof RATE_LIMIT_METHOD;
}

export interface RateLimitStore {
  consume(key: string, policy: RateLimitPolicy, now?: Date): Promise<RateLimitResult>;
  cleanup?(now?: Date): Promise<number>;
}

type MemoryBucket = { count: number; windowStartedAt: number; expiresAt: number };

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, MemoryBucket>();
  async consume(key: string, policy: RateLimitPolicy, now = new Date()): Promise<RateLimitResult> {
    const nowMs = now.getTime();
    const fullKey = `${policy.keyPrefix}:${key}`;
    let bucket = this.buckets.get(fullKey);
    if (!bucket || bucket.expiresAt <= nowMs) {
      bucket = { count: 0, windowStartedAt: nowMs, expiresAt: nowMs + policy.windowMs };
    }
    bucket.count += 1;
    this.buckets.set(fullKey, bucket);
    return {
      allowed: bucket.count <= policy.maxRequests,
      limit: policy.maxRequests,
      remaining: Math.max(0, policy.maxRequests - bucket.count),
      resetAt: new Date(bucket.expiresAt).toISOString(),
      count: bucket.count,
      methodVersion: RATE_LIMIT_METHOD,
    };
  }
  async cleanup(now = new Date()): Promise<number> {
    let removed = 0;
    for (const [key, bucket] of this.buckets) {
      if (bucket.expiresAt <= now.getTime()) { this.buckets.delete(key); removed += 1; }
    }
    return removed;
  }
}

export class PostgresRateLimitStore implements RateLimitStore {
  constructor(private readonly db: SqlExecutor) {}
  async consume(key: string, policy: RateLimitPolicy, now = new Date()): Promise<RateLimitResult> {
    const bucketKey = `${policy.keyPrefix}:${key}`;
    const row = (await this.db.query<{count:number;expires_at:string}>(`
      insert into production_rate_limit_buckets(bucket_key, window_started_at, request_count, expires_at, updated_at)
      values ($1, $2::timestamptz, 1, $3::timestamptz, $2::timestamptz)
      on conflict (bucket_key) do update set
        request_count = case when production_rate_limit_buckets.expires_at <= $2::timestamptz then 1 else production_rate_limit_buckets.request_count + 1 end,
        window_started_at = case when production_rate_limit_buckets.expires_at <= $2::timestamptz then $2::timestamptz else production_rate_limit_buckets.window_started_at end,
        expires_at = case when production_rate_limit_buckets.expires_at <= $2::timestamptz then $3::timestamptz else production_rate_limit_buckets.expires_at end,
        updated_at = $2::timestamptz
      returning request_count as count, expires_at
    `,[bucketKey,now.toISOString(),new Date(now.getTime()+policy.windowMs).toISOString()])).rows[0];
    if (!row) throw new Error("Rate-limit bucket could not be persisted.");
    const count=Number(row.count);
    return {allowed:count<=policy.maxRequests,limit:policy.maxRequests,remaining:Math.max(0,policy.maxRequests-count),resetAt:new Date(row.expires_at).toISOString(),count,methodVersion:RATE_LIMIT_METHOD};
  }
  async cleanup(now = new Date()): Promise<number> {
    const result=await this.db.query("delete from production_rate_limit_buckets where expires_at < $1::timestamptz",[now.toISOString()]);
    return result.rowCount ?? 0;
  }
}

export type WorkState = "PENDING" | "LEASED" | "COMPLETED" | "DEAD_LETTER";
export interface DurableWorkItem<T=unknown> {
  jobId:string; kind:string; payload:T; payloadHash:string; idempotencyKey:string; state:WorkState; attempts:number; maxAttempts:number;
  availableAt:string; leaseOwner?:string; leasedUntil?:string; lastError?:string; createdAt:string; updatedAt:string; completedAt?:string;
  methodVersion:typeof DURABLE_QUEUE_METHOD;
}
export interface EnqueueWorkInput<T=unknown>{kind:string;payload:T;idempotencyKey:string;maxAttempts?:number;availableAt?:string}
export interface DurableWorkQueue {
  enqueue<T=unknown>(input:EnqueueWorkInput<T>):Promise<DurableWorkItem<T>>;
  claim<T=unknown>(workerId:string,leaseMs:number,kinds?:string[]):Promise<DurableWorkItem<T>|undefined>;
  complete(jobId:string,workerId:string):Promise<void>;
  fail(jobId:string,workerId:string,error:string,retryDelayMs:number):Promise<DurableWorkItem|undefined>;
  stats():Promise<{pending:number;leased:number;completed:number;deadLetter:number}>;
}

function clone<T>(value:T):T{return structuredClone(value)}
function canonicalJson(value:unknown):string{if(value===null||typeof value!=="object")return JSON.stringify(value);if(Array.isArray(value))return`[${value.map(canonicalJson).join(",")}]`;const record=value as Record<string,unknown>;return`{${Object.keys(record).sort().map(key=>`${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`}
function payloadHash(value:unknown):string{return createHash("sha256").update(canonicalJson(value)).digest("hex")}
function newItem<T>(input:EnqueueWorkInput<T>,now=new Date()):DurableWorkItem<T>{return{jobId:`work_${randomUUID()}`,kind:input.kind,payload:clone(input.payload),payloadHash:payloadHash(input.payload),idempotencyKey:input.idempotencyKey,state:"PENDING",attempts:0,maxAttempts:Math.max(1,Math.min(20,input.maxAttempts??5)),availableAt:input.availableAt??now.toISOString(),createdAt:now.toISOString(),updatedAt:now.toISOString(),methodVersion:DURABLE_QUEUE_METHOD}}

export class MemoryDurableWorkQueue implements DurableWorkQueue {
  private readonly items=new Map<string,DurableWorkItem>();
  async enqueue<T>(input:EnqueueWorkInput<T>):Promise<DurableWorkItem<T>>{const candidate=newItem(input);const existing=[...this.items.values()].find(v=>v.idempotencyKey===input.idempotencyKey);if(existing){if(existing.kind!==candidate.kind||existing.payloadHash!==candidate.payloadHash||existing.maxAttempts!==candidate.maxAttempts)throw new Error("IDEMPOTENCY_CONFLICT: work idempotency key was reused with different immutable inputs.");return clone(existing as DurableWorkItem<T>);}const item=candidate;this.items.set(item.jobId,item);return clone(item)}
  async claim<T>(workerId:string,leaseMs:number,kinds?:string[]):Promise<DurableWorkItem<T>|undefined>{const now=Date.now();const item=[...this.items.values()].filter(v=>(v.state==="PENDING"||(v.state==="LEASED"&&Date.parse(v.leasedUntil??"")<=now))&&Date.parse(v.availableAt)<=now&&(!kinds?.length||kinds.includes(v.kind))).sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt))[0];if(!item)return undefined;item.state="LEASED";item.attempts+=1;item.leaseOwner=workerId;item.leasedUntil=new Date(now+Math.max(1000,leaseMs)).toISOString();item.updatedAt=new Date(now).toISOString();return clone(item as DurableWorkItem<T>)}
  async complete(jobId:string,workerId:string):Promise<void>{const item=this.items.get(jobId);if(!item||item.state!=="LEASED"||item.leaseOwner!==workerId)throw new Error("Work item is not leased by this worker.");item.state="COMPLETED";item.completedAt=new Date().toISOString();item.updatedAt=item.completedAt;item.leaseOwner=undefined;item.leasedUntil=undefined}
  async fail(jobId:string,workerId:string,error:string,retryDelayMs:number):Promise<DurableWorkItem|undefined>{const item=this.items.get(jobId);if(!item||item.state!=="LEASED"||item.leaseOwner!==workerId)throw new Error("Work item is not leased by this worker.");const now=new Date();item.lastError=error.slice(0,1000);item.leaseOwner=undefined;item.leasedUntil=undefined;item.updatedAt=now.toISOString();if(item.attempts>=item.maxAttempts){item.state="DEAD_LETTER"}else{item.state="PENDING";item.availableAt=new Date(now.getTime()+Math.max(1000,retryDelayMs)).toISOString()}return clone(item)}
  async stats(){const values=[...this.items.values()];return{pending:values.filter(v=>v.state==="PENDING").length,leased:values.filter(v=>v.state==="LEASED").length,completed:values.filter(v=>v.state==="COMPLETED").length,deadLetter:values.filter(v=>v.state==="DEAD_LETTER").length}}
}

function mapWork<T=unknown>(row:Record<string,unknown>):DurableWorkItem<T>{return{jobId:String(row.job_id),kind:String(row.kind),payload:clone(row.payload as T),payloadHash:String(row.payload_hash),idempotencyKey:String(row.idempotency_key),state:String(row.state) as WorkState,attempts:Number(row.attempts),maxAttempts:Number(row.max_attempts),availableAt:new Date(String(row.available_at)).toISOString(),leaseOwner:row.lease_owner?String(row.lease_owner):undefined,leasedUntil:row.leased_until?new Date(String(row.leased_until)).toISOString():undefined,lastError:row.last_error?String(row.last_error):undefined,createdAt:new Date(String(row.created_at)).toISOString(),updatedAt:new Date(String(row.updated_at)).toISOString(),completedAt:row.completed_at?new Date(String(row.completed_at)).toISOString():undefined,methodVersion:DURABLE_QUEUE_METHOD}}

export class PostgresDurableWorkQueue implements DurableWorkQueue {
  constructor(private readonly db:SqlExecutor){}
  async enqueue<T>(input:EnqueueWorkInput<T>):Promise<DurableWorkItem<T>>{const item=newItem(input);let row=(await this.db.query<Record<string,unknown>>(`insert into production_work_queue(job_id,kind,payload,payload_hash,idempotency_key,state,attempts,max_attempts,available_at,created_at,updated_at) values($1,$2,$3::jsonb,$4,$5,'PENDING',0,$6,$7::timestamptz,$8::timestamptz,$8::timestamptz) on conflict(idempotency_key) do nothing returning *`,[item.jobId,item.kind,JSON.stringify(item.payload),item.payloadHash,item.idempotencyKey,item.maxAttempts,item.availableAt,item.createdAt])).rows[0];if(!row){row=(await this.db.query<Record<string,unknown>>("select * from production_work_queue where idempotency_key=$1",[item.idempotencyKey])).rows[0];if(!row)throw new Error("Work item could not be persisted.");const existing=mapWork(row);if(existing.kind!==item.kind||existing.payloadHash!==item.payloadHash||existing.maxAttempts!==item.maxAttempts)throw new Error("IDEMPOTENCY_CONFLICT: work idempotency key was reused with different immutable inputs.");}return mapWork<T>(row)}
  async claim<T>(workerId:string,leaseMs:number,kinds?:string[]):Promise<DurableWorkItem<T>|undefined>{const safeLease=Math.max(1000,Math.min(900000,leaseMs));const useKinds=Boolean(kinds?.length);const row=(await this.db.query<Record<string,unknown>>(`with candidate as (select job_id from production_work_queue where ((state='PENDING' and available_at<=now()) or (state='LEASED' and leased_until<=now())) and ($1::boolean=false or kind=any($2::text[])) order by available_at asc, created_at asc for update skip locked limit 1) update production_work_queue q set state='LEASED',attempts=q.attempts+1,lease_owner=$3,leased_until=now()+($4::text||' milliseconds')::interval,updated_at=now() from candidate where q.job_id=candidate.job_id returning q.*`,[useKinds,kinds??[],workerId,String(safeLease)])).rows[0];return row?mapWork<T>(row):undefined}
  async complete(jobId:string,workerId:string):Promise<void>{const result=await this.db.query("update production_work_queue set state='COMPLETED',completed_at=now(),updated_at=now(),lease_owner=null,leased_until=null where job_id=$1 and state='LEASED' and lease_owner=$2",[jobId,workerId]);if((result.rowCount??0)!==1)throw new Error("Work item is not leased by this worker.")}
  async fail(jobId:string,workerId:string,error:string,retryDelayMs:number):Promise<DurableWorkItem|undefined>{const row=(await this.db.query<Record<string,unknown>>(`update production_work_queue set state=case when attempts>=max_attempts then 'DEAD_LETTER' else 'PENDING' end,available_at=case when attempts>=max_attempts then available_at else now()+($4::text||' milliseconds')::interval end,last_error=$3,lease_owner=null,leased_until=null,updated_at=now() where job_id=$1 and state='LEASED' and lease_owner=$2 returning *`,[jobId,workerId,error.slice(0,1000),String(Math.max(1000,retryDelayMs))])).rows[0];return row?mapWork(row):undefined}
  async stats(){const rows=(await this.db.query<{state:WorkState;count:number}>("select state,count(*)::int as count from production_work_queue group by state")).rows;const count=(state:WorkState)=>Number(rows.find(r=>r.state===state)?.count??0);return{pending:count("PENDING"),leased:count("LEASED"),completed:count("COMPLETED"),deadLetter:count("DEAD_LETTER")}}
}

export function stableClientKey(value:string):string{return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0,32)}
export function cacheControlFor(method:string,url:string):string{if(method!=="GET"&&method!=="HEAD")return"no-store";const path=url.split("?")[0]??url;if(path==="/health")return"no-store";const sensitive=["/v1/admin/","/v1/operator/","/v1/accounts/","/v1/checks/","/v1/activations/","/v1/plans/","/v1/explanations","/v1/commercial","/v1/permission","/v1/my-agents","/v1/activity","/v1/outcomes"];if(sensitive.some(prefix=>path.startsWith(prefix)||path.includes(prefix)))return"private, no-store";if(path==="/v1/system/health"||path==="/v1/system/capabilities"||path==="/v1/meta"||path==="/v1/public/adoption"||path==="/v1/reference-agents")return"public, max-age=15, stale-while-revalidate=30";return"private, max-age=0, must-revalidate"}
export function retryDelayMs(attempt:number,baseMs=1000,maxMs=60000):number{return Math.min(maxMs,Math.max(baseMs,baseMs*2**Math.max(0,attempt-1)))}
