import { createHash } from "node:crypto";
import type {
  BuyerSmartMoneyPlans,
  Finding,
  MyAgentPortfolioItem,
  ServiceCategory,
  SmartMoneyPlan,
  SmartMoneyPlanConflict,
  SmartMoneyPlanConflictReport,
  SmartMoneyPlanMember,
} from "@spotriq/domain";
import type { SmartMoneyEngine } from "@spotriq/smart-money";
import type { MarketplaceSupplyReader } from "@spotriq/marketplace-supply";
import type { MyAgentsEngine } from "@spotriq/my-agents";

export const SMART_MONEY_PLAN_METHOD = "smart-money.plan-composition@1.0.0";
export const SMART_MONEY_PLAN_CONFLICT_METHOD = "smart-money.plan-conflicts@1.0.0";

export class SmartMoneyPlanError extends Error {
  constructor(message: string, public readonly code: "INVALID_INPUT" | "NOT_FOUND" | "WRONG_BUYER" | "IDEMPOTENCY_CONFLICT") { super(message); }
}

export interface SmartMoneyPlanStore {
  save(plan: SmartMoneyPlan): Promise<void>;
  get(planId: string): Promise<SmartMoneyPlan | undefined>;
  findByIdempotency(buyerAddress: string, idempotencyKey: string): Promise<SmartMoneyPlan | undefined>;
  listByBuyer(buyerAddress: string): Promise<SmartMoneyPlan[]>;
}
export interface SqlQueryResult<Row = Record<string, unknown>> { rows: Row[]; rowCount?: number | null; }
export interface SqlQueryExecutor { query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<SqlQueryResult<Row>>; }

export class MemorySmartMoneyPlanStore implements SmartMoneyPlanStore {
  private plans = new Map<string, SmartMoneyPlan>();
  async save(plan: SmartMoneyPlan) {
    const existing = this.plans.get(plan.planId);
    if (existing && existing.compositionHash !== plan.compositionHash) throw new SmartMoneyPlanError("The deterministic plan ID already exists with different immutable composition input.", "IDEMPOTENCY_CONFLICT");
    this.plans.set(plan.planId, structuredClone(plan));
  }
  async get(planId: string) { const value=this.plans.get(planId); return value ? structuredClone(value) : undefined; }
  async findByIdempotency(buyerAddress: string, idempotencyKey: string) { return [...this.plans.values()].find(x=>x.buyerAddress===buyerAddress&&x.idempotencyKey===idempotencyKey); }
  async listByBuyer(buyerAddress: string) { return [...this.plans.values()].filter(x=>x.buyerAddress===buyerAddress).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(x=>structuredClone(x)); }
}

export class PostgresSmartMoneyPlanStore implements SmartMoneyPlanStore {
  constructor(private readonly db: SqlQueryExecutor) {}
  async save(plan: SmartMoneyPlan) {
    await this.db.query(
      `insert into smart_money_plans(plan_id,buyer_address,check_session_id,state,idempotency_key,composition_hash,payload,created_at,updated_at)
       values($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)
       on conflict (plan_id) do update set state=excluded.state,payload=excluded.payload,updated_at=excluded.updated_at
       where smart_money_plans.buyer_address=excluded.buyer_address
         and smart_money_plans.check_session_id=excluded.check_session_id
         and smart_money_plans.composition_hash=excluded.composition_hash`,
      [plan.planId,plan.buyerAddress,plan.checkSessionId,plan.state,plan.idempotencyKey,plan.compositionHash,JSON.stringify(plan),plan.createdAt,plan.updatedAt],
    );
    const saved=await this.get(plan.planId);
    if(saved&&saved.compositionHash!==plan.compositionHash)throw new SmartMoneyPlanError("The plan idempotency key raced with different immutable composition input.","IDEMPOTENCY_CONFLICT");
  }
  async get(planId:string){return (await this.db.query<{payload:SmartMoneyPlan}>("select payload from smart_money_plans where plan_id=$1",[planId])).rows[0]?.payload;}
  async findByIdempotency(buyerAddress:string,idempotencyKey:string){return (await this.db.query<{payload:SmartMoneyPlan}>("select payload from smart_money_plans where buyer_address=$1 and idempotency_key=$2 limit 1",[buyerAddress,idempotencyKey])).rows[0]?.payload;}
  async listByBuyer(buyerAddress:string){return (await this.db.query<{payload:SmartMoneyPlan}>("select payload from smart_money_plans where buyer_address=$1 order by created_at desc",[buyerAddress])).rows.map(r=>r.payload);}
}

export interface SmartMoneyPlanEngine {
  create(input:{checkSessionId:string;buyerAddress:string;findingIds?:string[];idempotencyKey:string}):Promise<SmartMoneyPlan>;
  get(planId:string):Promise<SmartMoneyPlan>;
  listForBuyer(buyerAddress:string):Promise<BuyerSmartMoneyPlans>;
}

function address(value:string){const normalized=value.trim().toLowerCase();if(!/^0x[0-9a-f]{40}$/.test(normalized))throw new SmartMoneyPlanError("buyerAddress must be a valid EVM address.","INVALID_INPUT");return normalized;}
function text(value:string,label:string,max=180){const out=value?.trim();if(!out||out.length>max)throw new SmartMoneyPlanError(`${label} is required and must be at most ${max} characters.`,"INVALID_INPUT");return out;}
function hash(value:unknown){return createHash("sha256").update(JSON.stringify(value)).digest("hex");}
function id(prefix:string,...parts:string[]){return `${prefix}_${createHash("sha256").update(parts.join("|")).digest("hex").slice(0,28)}`;}
function uniq(values:string[]){return [...new Set(values.filter(Boolean).map(x=>x.toLowerCase()))].sort();}
function subjectStrings(finding:Finding, keys:string[]):string[]{const s=finding.subject??{};const out:string[]=[];for(const key of keys){const value=s[key];if(typeof value==="string"&&value.trim())out.push(value.trim());else if(value&&typeof value==="object"){for(const nested of Object.values(value as Record<string,unknown>)){if(typeof nested==="string"&&nested.trim())out.push(nested.trim());}}}return uniq(out);}
function assetKeys(finding:Finding){return subjectStrings(finding,["asset","assetAddress","capitalAsset","capitalAssetAddress","token0","token1","underlying","underlyingAddress"]);}
function protocolKeys(finding:Finding){const direct=subjectStrings(finding,["protocol"]);if(direct.length)return direct;return finding.category==="rebalancing"||finding.category==="grid"?["pancakeswap"]:["venus"];}
function overlap(a:string[],b:string[]){const set=new Set(a);return b.filter(x=>set.has(x));}
function conflict(input:Omit<SmartMoneyPlanConflict,"conflictId"|"provenance">):SmartMoneyPlanConflict{return{...input,conflictId:id("planconflict",input.code,...input.findingIds,...input.serviceIds,...input.assetKeys,...input.protocolKeys),provenance:"marketplace-derived"};}
function activeForService(active:MyAgentPortfolioItem[],serviceId:string){return active.find(x=>x.service.serviceId===serviceId);}
function activeAuthorityAssets(item:MyAgentPortfolioItem):string[]{return item.hasReconciledPermissionGrant?uniq(item.permissionRequest?.scopeSnapshot.target.assetAddresses??[]):[];}

export function createSmartMoneyPlanEngine(options:{store?:SmartMoneyPlanStore;smartMoney:SmartMoneyEngine;marketplace:MarketplaceSupplyReader;myAgents:MyAgentsEngine;now?:()=>Date}):SmartMoneyPlanEngine{
  const store=options.store??new MemorySmartMoneyPlanStore();const now=options.now??(()=>new Date());
  async function create(input:{checkSessionId:string;buyerAddress:string;findingIds?:string[];idempotencyKey:string}):Promise<SmartMoneyPlan>{
    const buyer=address(input.buyerAddress);const checkSessionId=text(input.checkSessionId,"checkSessionId");const key=text(input.idempotencyKey,"idempotencyKey",160);
    const existing=await store.findByIdempotency(buyer,key);
    if(existing){const requested=[...(input.findingIds??existing.findingIds)].sort();if(existing.checkSessionId!==checkSessionId||JSON.stringify([...existing.findingIds].sort())!==JSON.stringify(requested))throw new SmartMoneyPlanError("This plan idempotency key was already used with different check/finding input.","IDEMPOTENCY_CONFLICT");return existing;}
    const snapshot=await options.smartMoney.getCheck(checkSessionId);if(!snapshot)throw new SmartMoneyPlanError("Smart Money Check was not found.","NOT_FOUND");if(snapshot.session.walletAddress.toLowerCase()!==buyer)throw new SmartMoneyPlanError("The Smart Money Check belongs to a different wallet.","WRONG_BUYER");
    const wanted=input.findingIds?.length?uniq(input.findingIds):snapshot.findings.map(x=>x.findingId);const selected=wanted.map(fid=>snapshot.findings.find(x=>x.findingId===fid)).filter((x):x is Finding=>Boolean(x));if(selected.length!==wanted.length)throw new SmartMoneyPlanError("One or more requested findings do not belong to this Smart Money Check.","INVALID_INPUT");if(!selected.length)throw new SmartMoneyPlanError("A Smart Money Plan requires at least one real finding from the selected Smart Money Check.","INVALID_INPUT");
    const portfolio=await options.myAgents.getPortfolio(buyer);const conflicts:SmartMoneyPlanConflict[]=[];const members:SmartMoneyPlanMember[]=[];
    for(const finding of selected){
      const page=await options.marketplace.matchFinding(finding,{limit:10});const existingMatch=page.matches.find(m=>portfolio.active.some(a=>a.service.serviceId===m.serviceId));const match=existingMatch??page.matches[0];
      if(!match){conflicts.push(conflict({code:"MISSING_SERVICE_MATCH",severity:"BLOCK",title:`No compatible ${finding.category} service`,detail:"No current AgentService passed deterministic finding compatibility for this finding.",categories:[finding.category],findingIds:[finding.findingId],serviceIds:[],assetKeys:assetKeys(finding),protocolKeys:protocolKeys(finding),resolution:"Keep the finding separate and retry marketplace discovery later; do not invent a plan member."}));continue;}
      const active=activeForService(portfolio.active,match.serviceId);const member:SmartMoneyPlanMember={memberId:id("planmember",finding.findingId,match.serviceId),findingId:finding.findingId,category:finding.category,serviceId:match.serviceId,serviceName:match.service.service.name,matchId:match.matchId,matchRank:match.rank,matchTier:match.tier,readiness:match.service.readiness.state,activationEligible:match.activationEligible,existingActivationId:active?.activation.activationId,assetKeys:assetKeys(finding),protocolKeys:protocolKeys(finding),authorityState:active?.hasReconciledPermissionGrant?"GRANT_RECONCILED":active?.permissionRequest?"REVIEWED_SCOPE":"NONE",roleSummary:finding.whatCouldAgentDo,limitations:[...match.limitations,"Plan membership is a recommendation/composition record, not permission or execution authority."]};members.push(member);
      const serviceChainId=match.service.offer.terms?.chainId;if(snapshot.portfolio&&serviceChainId&&serviceChainId!==snapshot.portfolio.chainId)conflicts.push(conflict({code:"NETWORK_MISMATCH",severity:"BLOCK",title:"Service network conflicts with checked portfolio",detail:`${member.serviceName} commercial terms are on chain ${serviceChainId}, while this check observed chain ${snapshot.portfolio.chainId}.`,categories:[finding.category],findingIds:[finding.findingId],serviceIds:[match.serviceId],assetKeys:member.assetKeys,protocolKeys:member.protocolKeys,resolution:"Use a service on the same network as the checked portfolio."}));
      if(["OFFLINE","DEGRADED","SUSPENDED"].includes(member.readiness))conflicts.push(conflict({code:"SERVICE_READINESS",severity:"BLOCK",title:"Selected service is operationally unavailable",detail:`${member.serviceName} readiness is ${member.readiness}.`,categories:[finding.category],findingIds:[finding.findingId],serviceIds:[member.serviceId],assetKeys:member.assetKeys,protocolKeys:member.protocolKeys,resolution:"Choose another compatible service or wait until readiness recovers."}));else if(member.readiness!=="READY")conflicts.push(conflict({code:"SERVICE_READINESS",severity:"WARN",title:"Service is not financially ready",detail:`${member.serviceName} readiness is ${member.readiness}. The plan may be reviewed, but this status cannot be treated as execution eligibility.`,categories:[finding.category],findingIds:[finding.findingId],serviceIds:[member.serviceId],assetKeys:member.assetKeys,protocolKeys:member.protocolKeys,resolution:"Review the plan now; satisfy service-specific activation/permission/execution gates independently later."}));
      if(active)conflicts.push(conflict({code:"EXISTING_RELATIONSHIP",severity:"INFO",title:"Service is already active",detail:`${member.serviceName} already has MarketplaceActivation ${active.activation.activationId} for this buyer.`,categories:[finding.category],findingIds:[finding.findingId],serviceIds:[member.serviceId],assetKeys:member.assetKeys,protocolKeys:member.protocolKeys,resolution:"Reuse the existing relationship instead of hiring the same service again."}));
      if(finding.expiresAt&&new Date(finding.expiresAt).getTime()<=now().getTime())conflicts.push(conflict({code:"STALE_FINDING",severity:"WARN",title:"Finding context is stale",detail:`Finding ${finding.findingId} has passed its observation expiry.`,categories:[finding.category],findingIds:[finding.findingId],serviceIds:[member.serviceId],assetKeys:member.assetKeys,protocolKeys:member.protocolKeys,resolution:"Rerun Smart Money Check before creating authority or execution instructions."}));
      for(const activeItem of portfolio.active){
        if(activeItem.service.serviceId===member.serviceId||!activeItem.hasReconciledPermissionGrant)continue;
        const assets=overlap(member.assetKeys,activeAuthorityAssets(activeItem));
        if(!assets.length)continue;
        conflicts.push(conflict({code:"AUTHORITY_OVERLAP",severity:"BLOCK",title:"Plan capital overlaps an existing financial grant",detail:`${member.serviceName} references ${assets.join(", ")}, already covered by reconciled PermissionGrant ${activeItem.permissionRequest?.permissionGrantId} for ${activeItem.service.name}.`,categories:[member.category,activeItem.service.category],findingIds:[member.findingId],serviceIds:[member.serviceId,activeItem.service.serviceId],assetKeys:assets,protocolKeys:member.protocolKeys,resolution:"Revoke or narrow the existing provider grant, or remove the overlapping plan member before proceeding."}));
      }
    }
    for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++){
      const a=members[i]!,b=members[j]!;const assets=overlap(a.assetKeys,b.assetKeys);const protocols=overlap(a.protocolKeys,b.protocolKeys);
      if(a.serviceId===b.serviceId)conflicts.push(conflict({code:"SAME_SERVICE_MULTI_ROLE",severity:"BLOCK",title:"One AgentService is assigned to multiple plan roles",detail:`${a.serviceName} was selected for both ${a.category} and ${b.category}. Spotriq will not treat one service as a hidden super-agent.`,categories:[a.category,b.category],findingIds:[a.findingId,b.findingId],serviceIds:[a.serviceId],assetKeys:assets,protocolKeys:protocols,resolution:"Select distinct specialist services or keep the findings as separate decisions."}));
      if(assets.length){const grantOverlap=a.authorityState==="GRANT_RECONCILED"&&b.authorityState==="GRANT_RECONCILED";conflicts.push(conflict({code:grantOverlap?"AUTHORITY_OVERLAP":"ASSET_OVERLAP",severity:grantOverlap?"BLOCK":"WARN",title:grantOverlap?"Active financial authority overlaps":"Plan members touch overlapping assets",detail:grantOverlap?`Both services have independently reconciled financial authority touching ${assets.join(", ")}.`:`${a.serviceName} and ${b.serviceName} both reference ${assets.join(", ")}. Capital ownership/allocation must remain explicit before any authority is granted.`,categories:[a.category,b.category],findingIds:[a.findingId,b.findingId],serviceIds:[a.serviceId,b.serviceId],assetKeys:assets,protocolKeys:protocols,resolution:grantOverlap?"Revoke or narrow one provider grant before proceeding.":"Review capital allocation and ensure independent per-service limits do not double-count the same funds."}));}
      if(protocols.length)conflicts.push(conflict({code:"PROTOCOL_OVERLAP",severity:"INFO",title:"Plan members share protocol scope",detail:`${a.serviceName} and ${b.serviceName} both interact with ${protocols.join(", ")}. This is not automatically unsafe, but actions must remain independently attributable.`,categories:[a.category,b.category],findingIds:[a.findingId,b.findingId],serviceIds:[a.serviceId,b.serviceId],assetKeys:assets,protocolKeys:protocols,resolution:"Keep separate Activations, PermissionGrants, tasks and activity records for each service."}));
    }
    const blockingCount=conflicts.filter(x=>x.severity==="BLOCK").length,warningCount=conflicts.filter(x=>x.severity==="WARN").length,infoCount=conflicts.filter(x=>x.severity==="INFO").length;const checkedAt=now().toISOString();const report:SmartMoneyPlanConflictReport={state:blockingCount?"BLOCK":warningCount?"WARN":"PASS",conflicts,blockingCount,warningCount,infoCount,checkedAt,methodVersion:SMART_MONEY_PLAN_CONFLICT_METHOD};
    const immutable={checkSessionId,buyer,findingIds:wanted,members:members.map(x=>({findingId:x.findingId,serviceId:x.serviceId}))};const compositionHash=hash(immutable);const createdAt=checkedAt;const plan:SmartMoneyPlan={planId:id("smplan",buyer,key),checkSessionId,buyerAddress:buyer,chainId:snapshot.portfolio?.chainId??97,state:blockingCount?"BLOCKED":"REVIEWABLE",idempotencyKey:key,compositionHash,findingIds:wanted,members,conflictReport:report,activationMode:"INDEPENDENT_PER_SERVICE",authorityMode:"INDEPENDENT_PER_SERVICE",executionMode:"NO_SHARED_EXECUTION",reviewSummary:blockingCount?`Plan is blocked by ${blockingCount} deterministic conflict${blockingCount===1?"":"s"}.`:`Plan is reviewable with ${warningCount} warning${warningCount===1?"":"s"}; each service remains independently hired, permissioned and executed.`,createdAt,updatedAt:createdAt,expiresAt:new Date(now().getTime()+15*60_000).toISOString(),methodVersion:SMART_MONEY_PLAN_METHOD,limitations:["Plan ≠ Super-agent. A Smart Money Plan never owns a shared signer, PermissionGrant or execution session.","Member ranking is deterministic finding/service compatibility, not financial advice or a prediction of returns.","Asset/protocol overlap is surfaced for review; only independently reconciled authority conflicts block by themselves.","Any stale finding must be refreshed before downstream authority or execution decisions."]};await store.save(plan);return plan;
  }
  async function get(planId:string){const plan=await store.get(text(planId,"planId"));if(!plan)throw new SmartMoneyPlanError("Smart Money Plan was not found.","NOT_FOUND");return plan;}
  async function listForBuyer(buyerAddress:string):Promise<BuyerSmartMoneyPlans>{const buyer=address(buyerAddress);return{buyerAddress:buyer,plans:await store.listByBuyer(buyer),generatedAt:now().toISOString(),methodVersion:SMART_MONEY_PLAN_METHOD,limitations:["Plans are buyer-scoped review records; they do not merge member commercial, permission, execution or outcome state."]};}
  return{create,get,listForBuyer};
}
