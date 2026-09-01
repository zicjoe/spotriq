import { createHash } from "node:crypto";
import type {
  BoundedPermissionGrant,
  BoundedPermissionRequest,
  BuyerPermissionState,
  MarketplaceActivation,
  PermissionApprovalMode,
  PermissionCheckout,
  PermissionCheckoutBlocker,
  PermissionCheckoutCategoryInput,
  PermissionCheckoutCostSummary,
  PermissionCheckoutLimit,
  PermissionCheckoutRiskSummary,
  PermissionCheckoutScope,
  RebalancingJobIntent,
  ScopedPermissionRequest,
  ServiceCategory,
} from "@spotriq/domain";
import type { CommercialEngine } from "@spotriq/commercial";
import type { MarketplaceSupplyReader } from "@spotriq/marketplace-supply";

export const PERMISSION_CHECKOUT_METHOD = "marketplace.permission-checkout@1.0.0";
export const SCOPED_PERMISSION_REQUEST_METHOD = "marketplace.scoped-permission-request@1.0.0";

export class PermissionCheckoutError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_INPUT"
      | "CHECKOUT_NOT_FOUND"
      | "REQUEST_NOT_FOUND"
      | "WRONG_BUYER"
      | "WRONG_SERVICE"
      | "IDEMPOTENCY_CONFLICT"
      | "INVALID_STATE"
      | "GRANT_MISMATCH"
      | "GRANT_NOT_ACTIVE",
    public readonly retryable = false,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "PermissionCheckoutError";
  }
}

export interface CreatePermissionCheckoutInput {
  buyerAddress: string;
  idempotencyKey: string;
  approvalMode: PermissionApprovalMode;
  validForMinutes: number;
  scope: PermissionCheckoutCategoryInput;
  linkedJobIntentId?: string;
}

export interface PermissionCheckoutStore {
  saveCheckout(checkout: PermissionCheckout): Promise<void>;
  getCheckout(checkoutId: string): Promise<PermissionCheckout | undefined>;
  findCheckoutByIdempotency(buyerAddress: string, idempotencyKey: string): Promise<PermissionCheckout | undefined>;
  getLatestCheckoutForActivation(activationId: string): Promise<PermissionCheckout | undefined>;
  listCheckouts(buyerAddress: string): Promise<PermissionCheckout[]>;
  saveRequest(request: ScopedPermissionRequest): Promise<void>;
  getRequest(permissionRequestId: string): Promise<ScopedPermissionRequest | undefined>;
  getRequestForCheckout(checkoutId: string): Promise<ScopedPermissionRequest | undefined>;
  listRequests(buyerAddress: string): Promise<ScopedPermissionRequest[]>;
}

function clone<T>(value: T): T { return structuredClone(value); }

export class MemoryPermissionCheckoutStore implements PermissionCheckoutStore {
  private readonly checkouts = new Map<string, PermissionCheckout>();
  private readonly requests = new Map<string, ScopedPermissionRequest>();
  async saveCheckout(value: PermissionCheckout): Promise<void> {
    const existing=this.checkouts.get(value.checkoutId);
    if(existing&&(existing.activationId!==value.activationId||existing.buyerAddress!==value.buyerAddress||existing.idempotencyKey!==value.idempotencyKey||existing.scopeHash!==value.scopeHash)) throw new PermissionCheckoutError("Permission checkout idempotency key conflicts with a different Activation or reviewed scope.","IDEMPOTENCY_CONFLICT");
    this.checkouts.set(value.checkoutId, clone(value));
  }
  async getCheckout(id: string): Promise<PermissionCheckout | undefined> { const v=this.checkouts.get(id); return v?clone(v):undefined; }
  async findCheckoutByIdempotency(buyer: string,key:string):Promise<PermissionCheckout|undefined>{const v=[...this.checkouts.values()].find(x=>x.buyerAddress===buyer&&x.idempotencyKey===key);return v?clone(v):undefined;}
  async getLatestCheckoutForActivation(activationId:string):Promise<PermissionCheckout|undefined>{const v=[...this.checkouts.values()].filter(x=>x.activationId===activationId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];return v?clone(v):undefined;}
  async listCheckouts(buyer:string):Promise<PermissionCheckout[]>{return [...this.checkouts.values()].filter(x=>x.buyerAddress===buyer).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(clone);}
  async saveRequest(value:ScopedPermissionRequest):Promise<void>{const existing=this.requests.get(value.permissionRequestId);if(existing&&(existing.checkoutId!==value.checkoutId||existing.buyerAddress!==value.buyerAddress||existing.scopeHash!==value.scopeHash))throw new PermissionCheckoutError("Scoped permission request identity conflicts with a different reviewed scope.","IDEMPOTENCY_CONFLICT");this.requests.set(value.permissionRequestId,clone(value));}
  async getRequest(id:string):Promise<ScopedPermissionRequest|undefined>{const v=this.requests.get(id);return v?clone(v):undefined;}
  async getRequestForCheckout(checkoutId:string):Promise<ScopedPermissionRequest|undefined>{const v=[...this.requests.values()].find(x=>x.checkoutId===checkoutId);return v?clone(v):undefined;}
  async listRequests(buyer:string):Promise<ScopedPermissionRequest[]>{return [...this.requests.values()].filter(x=>x.buyerAddress===buyer).sort((a,b)=>b.reviewedAt.localeCompare(a.reviewedAt)).map(clone);}
}

export interface SqlQueryResult<Row = Record<string, unknown>> { rows: Row[]; rowCount?: number | null; }
export interface SqlQueryExecutor { query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<SqlQueryResult<Row>>; }

export class PostgresPermissionCheckoutStore implements PermissionCheckoutStore {
  constructor(private readonly db:SqlQueryExecutor) {}
  async saveCheckout(c:PermissionCheckout):Promise<void>{const result=await this.db.query(`insert into permission_checkout_sessions (checkout_id,activation_id,service_id,buyer_address,category,state,idempotency_key,scope_hash,payload,expires_at,created_at,updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12) on conflict (checkout_id) do update set state=excluded.state,payload=excluded.payload,updated_at=excluded.updated_at where permission_checkout_sessions.activation_id=excluded.activation_id and permission_checkout_sessions.buyer_address=excluded.buyer_address and permission_checkout_sessions.idempotency_key=excluded.idempotency_key and permission_checkout_sessions.scope_hash=excluded.scope_hash`,[c.checkoutId,c.activationId,c.serviceId,c.buyerAddress,c.category,c.state,c.idempotencyKey,c.scopeHash,JSON.stringify(c),c.expiresAt,c.createdAt,c.updatedAt]);if(result.rowCount===0)throw new PermissionCheckoutError("Permission checkout idempotency key conflicts with a different Activation or reviewed scope.","IDEMPOTENCY_CONFLICT");}
  async getCheckout(id:string):Promise<PermissionCheckout|undefined>{return (await this.db.query<{payload:PermissionCheckout}>("select payload from permission_checkout_sessions where checkout_id=$1",[id])).rows[0]?.payload;}
  async findCheckoutByIdempotency(buyer:string,key:string):Promise<PermissionCheckout|undefined>{return (await this.db.query<{payload:PermissionCheckout}>("select payload from permission_checkout_sessions where buyer_address=$1 and idempotency_key=$2 limit 1",[buyer,key])).rows[0]?.payload;}
  async getLatestCheckoutForActivation(activationId:string):Promise<PermissionCheckout|undefined>{return (await this.db.query<{payload:PermissionCheckout}>("select payload from permission_checkout_sessions where activation_id=$1 order by updated_at desc limit 1",[activationId])).rows[0]?.payload;}
  async listCheckouts(buyer:string):Promise<PermissionCheckout[]>{return (await this.db.query<{payload:PermissionCheckout}>("select payload from permission_checkout_sessions where buyer_address=$1 order by created_at desc",[buyer])).rows.map(r=>r.payload);}
  async saveRequest(r:ScopedPermissionRequest):Promise<void>{const result=await this.db.query(`insert into scoped_permission_requests (permission_request_id,checkout_id,activation_id,service_id,buyer_address,category,state,authority_tier,scope_hash,linked_permission_grant_id,payload,expires_at,reviewed_at,updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14) on conflict (permission_request_id) do update set state=excluded.state,linked_permission_grant_id=excluded.linked_permission_grant_id,payload=excluded.payload,updated_at=excluded.updated_at where scoped_permission_requests.checkout_id=excluded.checkout_id and scoped_permission_requests.buyer_address=excluded.buyer_address and scoped_permission_requests.scope_hash=excluded.scope_hash`,[r.permissionRequestId,r.checkoutId,r.activationId,r.serviceId,r.buyerAddress,r.category,r.state,r.authorityTier,r.scopeHash,r.permissionGrantId??null,JSON.stringify(r),r.expiresAt,r.reviewedAt,r.updatedAt]);if(result.rowCount===0)throw new PermissionCheckoutError("Scoped permission request identity conflicts with a different reviewed scope.","IDEMPOTENCY_CONFLICT");}
  async getRequest(id:string):Promise<ScopedPermissionRequest|undefined>{return (await this.db.query<{payload:ScopedPermissionRequest}>("select payload from scoped_permission_requests where permission_request_id=$1",[id])).rows[0]?.payload;}
  async getRequestForCheckout(checkoutId:string):Promise<ScopedPermissionRequest|undefined>{return (await this.db.query<{payload:ScopedPermissionRequest}>("select payload from scoped_permission_requests where checkout_id=$1 limit 1",[checkoutId])).rows[0]?.payload;}
  async listRequests(buyer:string):Promise<ScopedPermissionRequest[]>{return (await this.db.query<{payload:ScopedPermissionRequest}>("select payload from scoped_permission_requests where buyer_address=$1 order by reviewed_at desc",[buyer])).rows.map(r=>r.payload);}
}

export interface PermissionCheckoutJobReader { get(jobIntentId:string):Promise<RebalancingJobIntent>; }
export interface PermissionCheckoutAuthorityBridge {
  prepare(job:RebalancingJobIntent,input:{token0Limit:string;token1Limit:string;validForMinutes:number},now?:Date):Promise<BoundedPermissionRequest>;
  getGrant(permissionGrantId:string):Promise<BoundedPermissionGrant>;
}

export interface PermissionCheckoutEngine {
  create(activationId:string,input:CreatePermissionCheckoutInput):Promise<PermissionCheckout>;
  get(checkoutId:string):Promise<PermissionCheckout>;
  getForActivation(activationId:string):Promise<PermissionCheckout|undefined>;
  confirm(checkoutId:string,input:{buyerAddress:string}):Promise<ScopedPermissionRequest>;
  getRequest(permissionRequestId:string):Promise<ScopedPermissionRequest>;
  reconcileGrant(permissionRequestId:string,input:{buyerAddress:string;permissionGrantId:string}):Promise<ScopedPermissionRequest>;
  cancel(checkoutId:string,input:{buyerAddress:string}):Promise<PermissionCheckout>;
  getBuyerState(buyerAddress:string):Promise<BuyerPermissionState>;
}

const ADDRESS=/^0x[0-9a-fA-F]{40}$/;
function address(value:string|undefined,label:string):string{if(!value||!ADDRESS.test(value))throw new PermissionCheckoutError(`${label} must be a valid EVM address.`,"INVALID_INPUT");return value.toLowerCase();}
function text(value:string|undefined,label:string,max=180):string{const v=value?.trim();if(!v)throw new PermissionCheckoutError(`${label} is required.`,"INVALID_INPUT");if(v.length>max)throw new PermissionCheckoutError(`${label} is too long.`,"INVALID_INPUT");return v;}
function amount(value:string|undefined,label:string):string{const v=text(value,label,80);if(!/^\d+(?:\.\d+)?$/.test(v)||Number(v)<=0)throw new PermissionCheckoutError(`${label} must be a positive decimal amount.`,"INVALID_INPUT");return v;}
function count(value:number|undefined,label:string,max=1000):number{if(!Number.isInteger(value)||!value||value<1||value>max)throw new PermissionCheckoutError(`${label} must be an integer between 1 and ${max}.`,"INVALID_INPUT");return value;}
function stable(value:unknown):unknown{if(Array.isArray(value))return value.map(stable);if(value&&typeof value==="object"){return Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));}return value;}
function hash(value:unknown):string{return `0x${createHash("sha256").update(JSON.stringify(stable(value))).digest("hex")}`;}
function id(prefix:string,...parts:string[]):string{return `${prefix}:${createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0,32)}`;}
function expired(expiresAt:string,now:Date):boolean{return Date.parse(expiresAt)<=now.getTime();}
function blocker(code:PermissionCheckoutBlocker["code"],label:string,detail:string):PermissionCheckoutBlocker{return{code,label,detail,blocking:true,provenance:"marketplace-derived"};}

function scopeFor(category:ServiceCategory,input:PermissionCheckoutCategoryInput,approvalMode:PermissionApprovalMode,validForMinutes:number,now:Date):PermissionCheckoutScope{
  if(input.category!==category)throw new PermissionCheckoutError(`Permission scope category ${input.category} does not match this ${category} service.`,"WRONG_SERVICE");
  const expiresAt=new Date(now.getTime()+validForMinutes*60_000).toISOString();
  if(category==="rebalancing"){
    const x=input as Extract<PermissionCheckoutCategoryInput,{category:"rebalancing"}>;
    if(!/^\d+$/.test(text(x.positionTokenId,"positionTokenId",96)))throw new PermissionCheckoutError("positionTokenId must be an unsigned integer.","INVALID_INPUT");
    const limits:PermissionCheckoutLimit[]=[
      {code:"TOKEN0_SPEND",label:"Token 0 spend cap",value:amount(x.token0Limit,"token0Limit"),unit:"DISPLAY_AMOUNT",provenance:"user-proposed"},
      {code:"TOKEN1_SPEND",label:"Token 1 spend cap",value:amount(x.token1Limit,"token1Limit"),unit:"DISPLAY_AMOUNT",provenance:"user-proposed"},
      {code:"ACTION_COUNT",label:"Maximum actions per day",value:String(count(x.maxActionsPerDay??4,"maxActionsPerDay",24)),unit:"COUNT",provenance:"user-proposed"},
    ];
    return{category,authorityTier:"BOUNDED_FINANCIAL",approvalMode,protocol:"PancakeSwap",jobSummary:`Manage PancakeSwap position #${x.positionTokenId} within reviewed limits.`,target:{positionTokenId:x.positionTokenId,assetAddresses:[],marketAddresses:[]},allowedActions:["Decrease liquidity on the specified position","Collect proceeds to the reviewed wallet","Increase or mint reviewed concentrated liquidity within a sealed plan"],deniedActions:["Transfer funds to arbitrary wallets","Call unrelated protocols or arbitrary targets","Use router swaps, multicall, withdrawal, Permit2, or blanket approval authority outside an independently reviewed execution path"],limits,validForMinutes,expiresAt,categoryContext:{positionTokenId:x.positionTokenId}};
  }
  if(category==="grid"){
    const x=input as Extract<PermissionCheckoutCategoryInput,{category:"grid"}>; const pool=address(x.poolAddress,"poolAddress"),asset=address(x.capitalAssetAddress,"capitalAssetAddress");
    const limits:PermissionCheckoutLimit[]=[{code:"CAPITAL",label:"Maximum grid capital",value:amount(x.capitalLimit,"capitalLimit"),unit:"DISPLAY_AMOUNT",asset,provenance:"user-proposed"},{code:"SINGLE_ACTION",label:"Maximum per grid action",value:amount(x.perActionLimit,"perActionLimit"),unit:"DISPLAY_AMOUNT",asset,provenance:"user-proposed"},{code:"ACTION_COUNT",label:"Maximum grid actions per day",value:String(count(x.maxActionsPerDay,"maxActionsPerDay",200)),unit:"COUNT",provenance:"user-proposed"}];
    return{category,authorityTier:"BOUNDED_FINANCIAL",approvalMode,protocol:"PancakeSwap",jobSummary:"Operate a bounded grid strategy only in the specified PancakeSwap V3 pool.",target:{poolAddress:pool,assetAddresses:[asset],marketAddresses:[]},allowedActions:["Execute bounded grid actions only in the specified pool","Use only the explicitly reviewed capital asset and limits","Cancel or replace strategy actions only through a future category-specific execution adapter"],deniedActions:["Trade unrelated pairs or pools","Transfer capital to arbitrary wallets","Use unlimited approvals, unrelated routers, protocols, or assets"],limits,validForMinutes,expiresAt,categoryContext:{poolAddress:pool,capitalAssetAddress:asset}};
  }
  if(category==="yield"){
    const x=input as Extract<PermissionCheckoutCategoryInput,{category:"yield"}>; const asset=address(x.assetAddress,"assetAddress"); const markets=(x.allowedMarketAddresses??[]).map((v,i)=>address(v,`allowedMarketAddresses[${i}]`));
    const limits:PermissionCheckoutLimit[]=[{code:"CAPITAL",label:"Maximum yield allocation",value:amount(x.capitalLimit,"capitalLimit"),unit:"DISPLAY_AMOUNT",asset,provenance:"user-proposed"},{code:"SINGLE_ACTION",label:"Maximum per allocation action",value:amount(x.perActionLimit,"perActionLimit"),unit:"DISPLAY_AMOUNT",asset,provenance:"user-proposed"},{code:"ACTION_COUNT",label:"Maximum allocation moves per day",value:String(count(x.maxActionsPerDay,"maxActionsPerDay",48)),unit:"COUNT",provenance:"user-proposed"}];
    return{category,authorityTier:"BOUNDED_FINANCIAL",approvalMode,protocol:"Venus",jobSummary:"Allocate the reviewed asset only across explicitly supported Venus markets within limits.",target:{assetAddresses:[asset],marketAddresses:markets},allowedActions:["Supply the reviewed asset to explicitly allowed Venus markets","Withdraw/reallocate only within the reviewed capital and action limits"],deniedActions:["Borrow new assets","Use unrelated protocols or unreviewed markets","Transfer funds to arbitrary wallets or obtain blanket wallet authority"],limits,validForMinutes,expiresAt,categoryContext:{assetAddress:asset,allowedMarketAddresses:markets}};
  }
  const x=input as Extract<PermissionCheckoutCategoryInput,{category:"health"}>; const asset=address(x.assetAddress,"assetAddress"); const markets=(x.marketAddresses??[]).map((v,i)=>address(v,`marketAddresses[${i}]`)); if(!x.protectiveActions?.length)throw new PermissionCheckoutError("At least one protectiveAction is required for protective-write review.","INVALID_INPUT"); const actions=[...new Set(x.protectiveActions)]; if(actions.some(v=>v!=="REPAY"&&v!=="ADD_COLLATERAL"))throw new PermissionCheckoutError("protectiveActions may contain only REPAY and ADD_COLLATERAL.","INVALID_INPUT"); const hf=amount(x.triggerHealthFactor,"triggerHealthFactor"); if(Number(hf)<=1||Number(hf)>10)throw new PermissionCheckoutError("triggerHealthFactor must be greater than 1 and no more than 10.","INVALID_INPUT");
  const limits:PermissionCheckoutLimit[]=[{code:"INTERVENTION",label:"Maximum protective intervention",value:amount(x.interventionCap,"interventionCap"),unit:"DISPLAY_AMOUNT",asset,provenance:"user-proposed"},{code:"HEALTH_TRIGGER",label:"Protective health-factor trigger",value:hf,unit:"HEALTH_FACTOR",provenance:"user-proposed"},{code:"ACTION_COUNT",label:"Maximum interventions per day",value:String(count(x.maxInterventionsPerDay,"maxInterventionsPerDay",24)),unit:"COUNT",provenance:"user-proposed"}];
  return{category,authorityTier:"PROTECTIVE_WRITE",approvalMode,protocol:"Venus",jobSummary:"Protect the reviewed Venus position only with explicitly bounded repay/add-collateral actions.",target:{assetAddresses:[asset],marketAddresses:markets},allowedActions:actions.map(v=>v==="REPAY"?"Repay supported Venus debt only when the reviewed health trigger is crossed":"Add reviewed collateral only when the reviewed health trigger is crossed"),deniedActions:["Borrow additional assets","Withdraw collateral","Transfer funds to arbitrary wallets","Use unrelated protocols, markets, or assets"],limits,validForMinutes,expiresAt,categoryContext:{assetAddress:asset,marketAddresses:markets,protectiveActions:actions,triggerHealthFactor:hf}};
}

function risks(category:ServiceCategory):PermissionCheckoutRiskSummary{
  const categoryRisk=category==="rebalancing"?"Range changes can realize price exposure, fees and gas costs and may not improve future returns.":category==="grid"?"Grid execution can repeatedly trade into adverse price movement and can consume capital through fees/slippage.":category==="yield"?"Yield rates can change and protocol/market risk remains even when current APY is attractive.":"Protective writes may consume assets and can still fail to prevent liquidation during fast market moves.";
  return{strategyRisk:categoryRisk,protocolRisk:`${category==="yield"||category==="health"?"Venus":"PancakeSwap"} smart-contract and market risks remain independent from Spotriq permission controls.`,authorityRisk:"Financial authority can move or deploy reviewed assets only if a later provider grant exactly matches this scope. Current read-only reference services do not receive that authority.",failureBehavior:"If any prerequisite, provider reconciliation, execution guard, or fresh chain check fails, Spotriq must block the write rather than widen scope.",revocationBehavior:"Marketplace Activation revocation and financial PermissionGrant revocation are separate. Revoking one does not silently claim the other was revoked.",limitations:["This checkout is a human-readable deterministic scope review, not a PermissionGrant or transaction.","Gas and protocol costs remain Could Not Assess until an exact fresh execution plan exists."]};
}

function costs(activation:MarketplaceActivation):PermissionCheckoutCostSummary{
  const price=activation.termsSnapshot.price; const agentKnown=price.amount.trim()!==""; const perf=(activation.termsSnapshot.commercialModel==="PERFORMANCE"||activation.termsSnapshot.commercialModel==="HYBRID")?{state:"UNAVAILABLE" as const,value:"Could Not Assess",detail:"A performance-fee basis is not present in the immutable commercial terms snapshot."}:{state:"NOT_APPLICABLE" as const,value:"Not applicable",detail:"The current commercial terms do not declare a performance-fee model."};
  return{agentFee:{state:agentKnown?"KNOWN":"UNAVAILABLE",value:agentKnown?`${price.amount} ${price.currency}`:"Could Not Assess",detail:"Taken from the immutable commercial terms snapshot; it is separate from protocol costs and gas."},protocolCosts:{state:"UNAVAILABLE",value:"Could Not Assess",detail:"Protocol costs depend on an exact future action plan and are not inferred from category descriptions."},gas:{state:"UNAVAILABLE",value:"Could Not Assess",detail:"Gas is not estimated until an exact BSC transaction plan exists."},performanceFee:perf};
}

function review(scope:PermissionCheckoutScope,serviceName:string):string{
  const limit=scope.limits.find(x=>x.code==="CAPITAL"||x.code==="INTERVENTION"||x.code==="TOKEN0_SPEND")?.value;
  return `You are reviewing ${scope.authorityTier==="PROTECTIVE_WRITE"?"protective":"bounded financial"} authority for ${serviceName}: ${scope.jobSummary}${limit?` Primary reviewed limit: ${limit}.`:""} This review does not grant authority or execute a transaction.`;
}

export function createPermissionCheckoutEngine(options:{store?:PermissionCheckoutStore;commercial:CommercialEngine;marketplace:MarketplaceSupplyReader;jobs?:PermissionCheckoutJobReader;authority?:PermissionCheckoutAuthorityBridge;now?:()=>Date}):PermissionCheckoutEngine{
  const store=options.store??new MemoryPermissionCheckoutStore(); const now=options.now??(()=>new Date());
  async function getCheckout(idValue:string):Promise<PermissionCheckout>{const c=await store.getCheckout(text(idValue,"checkoutId",300));if(!c)throw new PermissionCheckoutError(`Permission checkout ${idValue} was not found.`,"CHECKOUT_NOT_FOUND");const at=now();if(c.state!=="CANCELLED"&&c.state!=="GRANT_RECONCILED"&&expired(c.expiresAt,at)){const next={...c,state:"EXPIRED" as const,updatedAt:at.toISOString()};await store.saveCheckout(next);return next;}return c;}
  async function getRequest(idValue:string):Promise<ScopedPermissionRequest>{const r=await store.getRequest(text(idValue,"permissionRequestId",300));if(!r)throw new PermissionCheckoutError(`Scoped permission request ${idValue} was not found.`,"REQUEST_NOT_FOUND");const at=now();if(r.state!=="CANCELLED"&&r.state!=="GRANT_RECONCILED"&&expired(r.expiresAt,at)){const next={...r,state:"EXPIRED" as const,updatedAt:at.toISOString()};await store.saveRequest(next);return next;}return r;}

  async function create(activationId:string,input:CreatePermissionCheckoutInput):Promise<PermissionCheckout>{
    const buyer=address(input.buyerAddress,"buyerAddress"),key=text(input.idempotencyKey,"idempotencyKey",160),valid=count(input.validForMinutes,"validForMinutes",1440); if(valid<5)throw new PermissionCheckoutError("validForMinutes must be at least 5 minutes.","INVALID_INPUT"); if(input.approvalMode!=="AUTOMATIC_WITHIN_LIMITS"&&input.approvalMode!=="ASK_BEFORE_EXECUTION")throw new PermissionCheckoutError("approvalMode is invalid.","INVALID_INPUT");
    const activation=await options.commercial.getActivation(text(activationId,"activationId",300)); if(activation.buyerAddress!==buyer)throw new PermissionCheckoutError("Only the Activation buyer can create its permission checkout.","WRONG_BUYER"); if(activation.state!=="ACTIVE")throw new PermissionCheckoutError("Permission Checkout requires an ACTIVE marketplace relationship.","INVALID_STATE");
    const record=await options.marketplace.getService(activation.serviceId),category=record.service.category,at=now(),scope=scopeFor(category,input.scope,input.approvalMode,valid,at),requestedScopeHash=hash(scope);
    const prior=await store.findCheckoutByIdempotency(buyer,key); if(prior){if(prior.activationId!==activation.activationId||prior.scopeHash!==requestedScopeHash)throw new PermissionCheckoutError("This permission-checkout idempotency key was already used for a different Activation or reviewed scope.","IDEMPOTENCY_CONFLICT");return prior;}
    const blockers:PermissionCheckoutBlocker[]=[];
    if(record.permissionProfile.executionMode!=="AUTOMATIC_WITH_LIMITS")blockers.push(blocker("SERVICE_READ_ONLY","Service does not declare bounded financial execution",`The current PermissionProfile is ${record.permissionProfile.executionMode}. Spotriq will not turn a read-only declaration into write authority.`));
    if(record.service.marketplaceActivationEligible!==true||record.readiness.state!=="READY")blockers.push(blocker("SERVICE_NOT_FINANCIALLY_READY","Financial readiness is not satisfied",`Current financial readiness is ${record.readiness.state}; commercial/read-only Activation does not override this gate.`));
    if(activation.serviceChainId===56)blockers.push(blocker("MAINNET_EXECUTION_NOT_APPROVED","BSC Mainnet financial execution is not approved","Transactional authority development remains BSC Testnet-first until explicitly approved."));
    let linkedJob:RebalancingJobIntent|undefined;
    if(category==="rebalancing"){
      if(!options.authority)blockers.push(blocker("AUTHORITY_PROVIDER_BRIDGE_REQUIRED","Authority provider bridge required","The bounded Rebalancing authority provider bridge is unavailable; Spotriq cannot prepare or reconcile a financial grant."));
      if(!input.linkedJobIntentId)blockers.push(blocker("REBALANCING_JOB_INTENT_REQUIRED","Reviewed Rebalancing Job Intent required","Bounded Rebalancing authority must bind to the existing exact position/finding JobIntent before provider preparation."));
      else if(!options.jobs)blockers.push(blocker("REBALANCING_JOB_INTENT_REQUIRED","Rebalancing Job Intent reader required","Spotriq cannot verify the linked JobIntent against this buyer, service and position."));
      else {linkedJob=await options.jobs.get(input.linkedJobIntentId);if(linkedJob.walletAddress.toLowerCase()!==buyer||linkedJob.selectedService.serviceId!==activation.serviceId||linkedJob.subject.tokenId!==scope.target.positionTokenId)throw new PermissionCheckoutError("The linked Rebalancing Job Intent does not match this buyer, service, or position.","WRONG_SERVICE");if(linkedJob.state!=="AWAITING_AUTHORITY")blockers.push(blocker("REBALANCING_JOB_INTENT_REQUIRED","Rebalancing Job Intent is not awaiting authority",`The linked JobIntent is ${linkedJob.state}; confirm/review it before preparing financial authority.`));}
    } else {
      blockers.push(blocker("AUTHORITY_PROVIDER_BRIDGE_REQUIRED","Category authority-provider bridge required",`${category === "grid" ? "Grid" : category === "yield" ? "Yield" : "Health protective-write"} now has a deterministic v0.26 execution adapter and argument guard, but Spotriq does not yet have an independently reconciled category PermissionGrant provider bridge. The adapter cannot manufacture authority.`));
    }
    const provider=category==="rebalancing"?"ALTANA" as const:"UNASSIGNED" as const; const providerSubmissionState=blockers.length?category==="rebalancing"&&blockers.every(b=>b.code==="REBALANCING_JOB_INTENT_REQUIRED")?"JOB_INTENT_REQUIRED" as const:"BLOCKED" as const:"READY_FOR_PROVIDER" as const;
    const checkoutId=id("permission-checkout",buyer,key),createdAt=at.toISOString(),scopeHash=requestedScopeHash; const checkout:PermissionCheckout={checkoutId,activationId:activation.activationId,serviceId:activation.serviceId,buyerAddress:buyer,category,state:blockers.length?"BLOCKED":"READY_FOR_REVIEW",idempotencyKey:key,scope,scopeHash,commercialTermsHash:activation.termsHash,permissionProfileSnapshot:record.permissionProfile,cost:costs(activation),risk:risks(category),blockers,provider,providerSubmissionState,linkedJobIntentId:linkedJob?.jobIntentId??input.linkedJobIntentId,reviewSummary:review(scope,record.service.name),createdAt,updatedAt:createdAt,expiresAt:scope.expiresAt,methodVersion:PERMISSION_CHECKOUT_METHOD,limitations:["PermissionProfile ≠ PermissionCheckout ≠ ScopedPermissionRequest ≠ PermissionGrant.","Payment, commercial Activation and financial Permission remain independent resources.","Current read-only reference services remain blocked from write authority until service declaration, financial readiness and an independently reconciled PermissionGrant are real. v0.26 execution adapters do not manufacture provider grants."]}; await store.saveCheckout(checkout); return checkout;
  }

  async function confirm(checkoutId:string,input:{buyerAddress:string}):Promise<ScopedPermissionRequest>{const checkout=await getCheckout(checkoutId),buyer=address(input.buyerAddress,"buyerAddress");if(checkout.buyerAddress!==buyer)throw new PermissionCheckoutError("Only the checkout buyer can confirm this financial scope.","WRONG_BUYER");if(checkout.state==="CANCELLED"||checkout.state==="EXPIRED"||checkout.state==="GRANT_RECONCILED")throw new PermissionCheckoutError(`This checkout is ${checkout.state.toLowerCase()} and cannot create a new request.`,"INVALID_STATE");const existing=await store.getRequestForCheckout(checkout.checkoutId);if(existing)return existing;let bounded:BoundedPermissionRequest|undefined;let state:ScopedPermissionRequest["state"]=checkout.blockers.length?"BLOCKED":"PROVIDER_READY";let submission=checkout.providerSubmissionState;if(!checkout.blockers.length&&checkout.category==="rebalancing"&&checkout.linkedJobIntentId&&options.jobs&&options.authority){const job=await options.jobs.get(checkout.linkedJobIntentId);const token0=checkout.scope.limits.find(x=>x.code==="TOKEN0_SPEND")?.value,token1=checkout.scope.limits.find(x=>x.code==="TOKEN1_SPEND")?.value;if(!token0||!token1)throw new PermissionCheckoutError("Rebalancing checkout spend limits are incomplete.","INVALID_STATE");bounded=await options.authority.prepare(job,{token0Limit:token0,token1Limit:token1,validForMinutes:checkout.scope.validForMinutes},now());submission="READY_FOR_PROVIDER";}
    const at=now().toISOString(),permissionRequestId=id("scoped-permission",checkout.checkoutId,checkout.scopeHash);const request:ScopedPermissionRequest={permissionRequestId,checkoutId:checkout.checkoutId,activationId:checkout.activationId,serviceId:checkout.serviceId,buyerAddress:buyer,category:checkout.category,state,authorityTier:checkout.scope.authorityTier,provider:checkout.provider,providerSubmissionState:submission,scopeSnapshot:clone(checkout.scope),scopeHash:checkout.scopeHash,blockers:clone(checkout.blockers),linkedJobIntentId:checkout.linkedJobIntentId,linkedBoundedPermissionRequestId:bounded?.permissionRequestId,reviewedAt:at,updatedAt:at,expiresAt:checkout.expiresAt,methodVersion:SCOPED_PERMISSION_REQUEST_METHOD,limitations:["This immutable request records the user-reviewed scope. It is not a PermissionGrant and cannot execute anything.",...(state==="BLOCKED"?["Blocking prerequisites remain unresolved; provider submission is prohibited."]:[])]};await store.saveRequest(request);await store.saveCheckout({...checkout,state:"REQUEST_CREATED",permissionRequestId,updatedAt:at});return request;}

  async function reconcileGrant(permissionRequestId:string,input:{buyerAddress:string;permissionGrantId:string}):Promise<ScopedPermissionRequest>{const request=await getRequest(permissionRequestId),buyer=address(input.buyerAddress,"buyerAddress");if(request.buyerAddress!==buyer)throw new PermissionCheckoutError("Only the permission-request buyer can reconcile a grant.","WRONG_BUYER");if(request.state!=="PROVIDER_READY"||request.providerSubmissionState!=="READY_FOR_PROVIDER")throw new PermissionCheckoutError("This scoped permission request is not eligible for provider grant reconciliation.","INVALID_STATE");if(!options.authority)throw new PermissionCheckoutError("No authority provider bridge is configured.","INVALID_STATE");const grant=await options.authority.getGrant(text(input.permissionGrantId,"permissionGrantId",300));if(grant.walletAddress.toLowerCase()!==buyer||grant.serviceId!==request.serviceId||grant.jobIntentId!==request.linkedJobIntentId)throw new PermissionCheckoutError("The provider grant does not belong to this buyer, service, and reviewed JobIntent.","GRANT_MISMATCH");if(grant.state!=="ACTIVE"||!grant.onchainValid||grant.reconciliation!=="EXACT_MATCH")throw new PermissionCheckoutError("The provider grant is not an active exact-match onchain grant.","GRANT_NOT_ACTIVE");if(request.category!=="rebalancing"||!request.linkedBoundedPermissionRequestId||grant.permissionRequestId!==request.linkedBoundedPermissionRequestId)throw new PermissionCheckoutError("The provider grant is not linked to this checkout's bounded Rebalancing request.","GRANT_MISMATCH");const t0=request.scopeSnapshot.limits.find(x=>x.code==="TOKEN0_SPEND")?.value,t1=request.scopeSnapshot.limits.find(x=>x.code==="TOKEN1_SPEND")?.value;if(grant.requestedSpendCaps[0]?.limitDisplay!==t0||grant.requestedSpendCaps[1]?.limitDisplay!==t1)throw new PermissionCheckoutError("The provider grant spend caps do not exactly match the checkout review.","GRANT_MISMATCH");const at=now().toISOString(),next:ScopedPermissionRequest={...request,state:"GRANT_RECONCILED",providerSubmissionState:"RECONCILED",permissionGrantId:grant.permissionGrantId,updatedAt:at,limitations:[...request.limitations,"A real provider grant has been independently reconciled to the exact bounded Rebalancing request. This still does not execute a transaction."]};await store.saveRequest(next);const checkout=await getCheckout(request.checkoutId);await store.saveCheckout({...checkout,state:"GRANT_RECONCILED",permissionGrantId:grant.permissionGrantId,updatedAt:at});return next;}

  async function cancel(checkoutId:string,input:{buyerAddress:string}):Promise<PermissionCheckout>{const c=await getCheckout(checkoutId),buyer=address(input.buyerAddress,"buyerAddress");if(c.buyerAddress!==buyer)throw new PermissionCheckoutError("Only the checkout buyer can cancel it.","WRONG_BUYER");if(c.state==="GRANT_RECONCILED")throw new PermissionCheckoutError("A reconciled PermissionGrant must be revoked through the authority provider; cancelling its checkout is not revocation.","INVALID_STATE");if(c.state==="CANCELLED")return c;const at=now().toISOString(),next={...c,state:"CANCELLED" as const,updatedAt:at};await store.saveCheckout(next);const req=await store.getRequestForCheckout(c.checkoutId);if(req&&req.state!=="GRANT_RECONCILED")await store.saveRequest({...req,state:"CANCELLED",updatedAt:at});return next;}
  async function getBuyerState(buyerAddress:string):Promise<BuyerPermissionState>{const buyer=address(buyerAddress,"buyerAddress"),[checkouts,requests]=await Promise.all([store.listCheckouts(buyer),store.listRequests(buyer)]);return{buyerAddress:buyer,checkouts,requests,activeGrantIds:requests.filter(x=>x.state==="GRANT_RECONCILED"&&x.permissionGrantId).map(x=>x.permissionGrantId!),generatedAt:now().toISOString(),methodVersion:PERMISSION_CHECKOUT_METHOD,limitations:["This state reports Permission Checkout/Request/linked Grant resources only. It does not imply a service is active, executing, profitable, or currently using authority."]};}
  return{create,get:getCheckout,getForActivation:async(activationId)=>{const latest=await store.getLatestCheckoutForActivation(activationId);return latest?getCheckout(latest.checkoutId):undefined;},confirm,getRequest,reconcileGrant,cancel,getBuyerState};
}
