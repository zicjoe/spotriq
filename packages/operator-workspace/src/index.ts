import { createHash, randomBytes } from "node:crypto";
import { recoverMessageAddress, type Hex } from "viem";
import type {
  AgentRegistryChainId,
  OperatorAgentClaim,
  OperatorAuthChallenge,
  OperatorCommercialDeclaration,
  OperatorPermissionDeclaration,
  OperatorRuntimeDeclaration,
  OperatorServiceDeclaration,
  OperatorSession,
  OperatorSuppliedEvidenceRecord,
  OperatorSupplyLifecycleState,
  OperatorWorkspaceSnapshot,
  ServiceCategory,
  ServiceOffer,
  CommercialOfferTerms,
} from "@spotriq/domain";
import type { AgentRegistryReader } from "@spotriq/agent-registry";
import type { MarketplaceSupplyReader } from "@spotriq/marketplace-supply";

export const OPERATOR_WORKSPACE_METHOD = "operator-workspace.signed-owner-lifecycle@1.0.0";
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const SIGNATURE = /^0x[0-9a-fA-F]{130}$/;

export class OperatorWorkspaceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_INPUT" | "AUTH_REQUIRED" | "CHALLENGE_NOT_FOUND" | "CHALLENGE_EXPIRED" | "CHALLENGE_USED"
      | "SIGNATURE_INVALID" | "SESSION_EXPIRED" | "CLAIM_NOT_FOUND" | "CANONICAL_OWNER_REQUIRED"
      | "DECLARATION_NOT_FOUND" | "INVALID_LIFECYCLE" | "SERVICE_NOT_OWNED",
    public readonly retryable = false,
    public readonly details?: unknown,
  ) { super(message); this.name = "OperatorWorkspaceError"; }
}

function normalizeAddress(value: string, label = "address"): string {
  const v = value.trim();
  if (!ADDRESS.test(v)) throw new OperatorWorkspaceError(`${label} must be a valid EVM address.`, "INVALID_INPUT");
  return v.toLowerCase();
}
function required(value: string | undefined, label: string, max = 2048): string {
  const v = value?.trim();
  if (!v || v.length > max) throw new OperatorWorkspaceError(`${label} is required.`, "INVALID_INPUT");
  return v;
}
function digest(prefix: string, ...parts: string[]): string {
  return `${prefix}:${createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 32)}`;
}
function tokenHash(token: string): string { return createHash("sha256").update(token).digest("hex"); }
function clone<T>(value: T): T { return structuredClone(value); }
function nowIso(now: () => Date): string { return now().toISOString(); }

export interface SqlQueryExecutor { query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{ rows: Row[]; rowCount?: number | null }>; }

export interface OperatorWorkspaceStore {
  saveChallenge(challenge: OperatorAuthChallenge): Promise<void>;
  getChallenge(challengeId: string): Promise<OperatorAuthChallenge | undefined>;
  consumeChallenge(challengeId: string, usedAt: string): Promise<boolean>;
  saveSession(session: OperatorSession, hash: string): Promise<void>;
  getSessionByTokenHash(hash: string): Promise<OperatorSession | undefined>;
  saveClaim(claim: OperatorAgentClaim): Promise<void>;
  getClaim(operatorAddress: string, chainId: AgentRegistryChainId, agentId: string): Promise<OperatorAgentClaim | undefined>;
  listClaims(operatorAddress: string): Promise<OperatorAgentClaim[]>;
  saveDeclaration(declaration: OperatorServiceDeclaration): Promise<void>;
  getDeclaration(operatorAddress: string, declarationId: string): Promise<OperatorServiceDeclaration | undefined>;
  listDeclarations(operatorAddress: string): Promise<OperatorServiceDeclaration[]>;
  findLatestDeclarationByService(serviceId: string): Promise<OperatorServiceDeclaration | undefined>;
  saveEvidence(record: OperatorSuppliedEvidenceRecord): Promise<void>;
  listEvidence(operatorAddress: string, serviceId?: string): Promise<OperatorSuppliedEvidenceRecord[]>;
}

export class MemoryOperatorWorkspaceStore implements OperatorWorkspaceStore {
  private challenges = new Map<string, OperatorAuthChallenge>();
  private sessions = new Map<string, OperatorSession>();
  private claims = new Map<string, OperatorAgentClaim>();
  private declarations = new Map<string, OperatorServiceDeclaration>();
  private evidence = new Map<string, OperatorSuppliedEvidenceRecord>();
  async saveChallenge(v: OperatorAuthChallenge) { this.challenges.set(v.challengeId, clone(v)); }
  async getChallenge(id: string) { const v = this.challenges.get(id); return v ? clone(v) : undefined; }
  async consumeChallenge(id: string, usedAt: string) { const v = this.challenges.get(id); if (!v || v.usedAt) return false; v.usedAt = usedAt; this.challenges.set(id, v); return true; }
  async saveSession(v: OperatorSession, hash: string) { this.sessions.set(hash, clone(v)); }
  async getSessionByTokenHash(hash: string) { const v = this.sessions.get(hash); return v ? clone(v) : undefined; }
  async saveClaim(v: OperatorAgentClaim) { this.claims.set(`${v.operatorAddress}:${v.chainId}:${v.agentId}`, clone(v)); }
  async getClaim(a: string, c: AgentRegistryChainId, id: string) { const v = this.claims.get(`${a}:${c}:${id}`); return v ? clone(v) : undefined; }
  async listClaims(a: string) { return [...this.claims.values()].filter(v => v.operatorAddress === a).map(clone); }
  async saveDeclaration(v: OperatorServiceDeclaration) { this.declarations.set(v.declarationId, clone(v)); }
  async getDeclaration(a: string, id: string) { const v = this.declarations.get(id); return v?.operatorAddress === a ? clone(v) : undefined; }
  async listDeclarations(a: string) { return [...this.declarations.values()].filter(v => v.operatorAddress === a).sort((x,y)=>y.updatedAt.localeCompare(x.updatedAt)).map(clone); }
  async findLatestDeclarationByService(serviceId:string){const v=[...this.declarations.values()].filter(x=>x.serviceId===serviceId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];return v?clone(v):undefined;}
  async saveEvidence(v: OperatorSuppliedEvidenceRecord) { this.evidence.set(v.evidenceId, clone(v)); }
  async listEvidence(a: string, serviceId?: string) { return [...this.evidence.values()].filter(v => v.operatorAddress === a && (!serviceId || v.serviceId === serviceId)).sort((x,y)=>y.submittedAt.localeCompare(x.submittedAt)).map(clone); }
}

export class PostgresOperatorWorkspaceStore implements OperatorWorkspaceStore {
  constructor(private readonly db: SqlQueryExecutor) {}
  async saveChallenge(v: OperatorAuthChallenge) { await this.db.query(`insert into operator_auth_challenges(challenge_id,address,nonce,message,expires_at,used_at,payload,created_at) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8) on conflict(challenge_id) do nothing`, [v.challengeId,v.address,v.nonce,v.message,v.expiresAt,v.usedAt??null,JSON.stringify(v),v.createdAt]); }
  async getChallenge(id: string) { return (await this.db.query<{payload:OperatorAuthChallenge}>(`select payload || jsonb_build_object('usedAt', used_at) payload from operator_auth_challenges where challenge_id=$1`,[id])).rows[0]?.payload; }
  async consumeChallenge(id: string, usedAt: string) { const r=await this.db.query(`update operator_auth_challenges set used_at=$2,payload=jsonb_set(payload,'{usedAt}',to_jsonb($2::text),true) where challenge_id=$1 and used_at is null`,[id,usedAt]); return (r.rowCount??0)===1; }
  async saveSession(v: OperatorSession, hash: string) { await this.db.query(`insert into operator_sessions(session_id,address,token_hash,expires_at,payload,created_at) values($1,$2,$3,$4,$5::jsonb,$6) on conflict(session_id) do nothing`,[v.sessionId,v.address,hash,v.expiresAt,JSON.stringify(v),v.createdAt]); }
  async getSessionByTokenHash(hash: string) { return (await this.db.query<{payload:OperatorSession}>(`select payload from operator_sessions where token_hash=$1 limit 1`,[hash])).rows[0]?.payload; }
  async saveClaim(v: OperatorAgentClaim) { await this.db.query(`insert into operator_agent_claims(claim_id,operator_address,chain_id,agent_id,discovery_id,canonical_owner_address,canonical_state,payload,claimed_at,last_verified_at) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10) on conflict(operator_address,chain_id,agent_id) do update set canonical_owner_address=excluded.canonical_owner_address,canonical_state=excluded.canonical_state,payload=excluded.payload,last_verified_at=excluded.last_verified_at`,[v.claimId,v.operatorAddress,v.chainId,v.agentId,v.discoveryId,v.canonicalOwnerAddress,v.canonicalVerificationState,JSON.stringify(v),v.claimedAt,v.lastVerifiedAt]); }
  async getClaim(a:string,c:AgentRegistryChainId,id:string){return(await this.db.query<{payload:OperatorAgentClaim}>(`select payload from operator_agent_claims where operator_address=$1 and chain_id=$2 and agent_id=$3`,[a,c,id])).rows[0]?.payload;}
  async listClaims(a:string){return(await this.db.query<{payload:OperatorAgentClaim}>(`select payload from operator_agent_claims where operator_address=$1 order by claimed_at desc`,[a])).rows.map(r=>r.payload);}
  async saveDeclaration(v: OperatorServiceDeclaration){await this.db.query(`insert into operator_service_declarations(declaration_id,operator_address,chain_id,agent_id,service_id,category,lifecycle_state,declaration_version,payload,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11) on conflict(declaration_id) do update set lifecycle_state=excluded.lifecycle_state,declaration_version=excluded.declaration_version,payload=excluded.payload,updated_at=excluded.updated_at`,[v.declarationId,v.operatorAddress,v.chainId,v.agentId,v.serviceId,v.category,v.lifecycleState,v.declarationVersion,JSON.stringify(v),v.createdAt,v.updatedAt]);}
  async getDeclaration(a:string,id:string){return(await this.db.query<{payload:OperatorServiceDeclaration}>(`select payload from operator_service_declarations where operator_address=$1 and declaration_id=$2`,[a,id])).rows[0]?.payload;}
  async listDeclarations(a:string){return(await this.db.query<{payload:OperatorServiceDeclaration}>(`select payload from operator_service_declarations where operator_address=$1 order by updated_at desc`,[a])).rows.map(r=>r.payload);}
  async findLatestDeclarationByService(serviceId:string){return(await this.db.query<{payload:OperatorServiceDeclaration}>(`select payload from operator_service_declarations where service_id=$1 order by updated_at desc limit 1`,[serviceId])).rows[0]?.payload;}
  async saveEvidence(v:OperatorSuppliedEvidenceRecord){await this.db.query(`insert into operator_supplied_evidence(evidence_id,operator_address,service_id,evidence_type,source_label,observed_at,payload,submitted_at) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8) on conflict(evidence_id) do update set payload=excluded.payload,observed_at=excluded.observed_at`,[v.evidenceId,v.operatorAddress,v.serviceId,v.evidenceType,v.sourceLabel,v.observedAt,JSON.stringify(v),v.submittedAt]);}
  async listEvidence(a:string,serviceId?:string){const r=serviceId?await this.db.query<{payload:OperatorSuppliedEvidenceRecord}>(`select payload from operator_supplied_evidence where operator_address=$1 and service_id=$2 order by submitted_at desc`,[a,serviceId]):await this.db.query<{payload:OperatorSuppliedEvidenceRecord}>(`select payload from operator_supplied_evidence where operator_address=$1 order by submitted_at desc`,[a]);return r.rows.map(x=>x.payload);}
}

export function operatorDeclarationToServiceOffer(declaration:OperatorServiceDeclaration):ServiceOffer|undefined{
  if(declaration.lifecycleState==="DRAFT"||declaration.lifecycleState==="SUBMITTED")return undefined;
  const c=declaration.commercial; if(c.commercialModel==="UNDECLARED"||c.paymentRail==="UNDECLARED"||c.availability==="UNDECLARED")return undefined;
  const available=declaration.lifecycleState==="ACTIVE"&&c.availability==="AVAILABLE";
  const availability:CommercialOfferTerms["availability"]=available?"AVAILABLE":declaration.lifecycleState==="PAUSED"?"PAUSED":"UNAVAILABLE";
  const readOnly=!declaration.permission.walletSigningRequired&&!declaration.permission.financialAuthorityRequired&&declaration.permission.executionMode==="READ_ONLY";
  const serviceType:CommercialOfferTerms["serviceType"]=readOnly?(c.commercialModel==="FREE"?"READ_ONLY_SERVICE":declaration.category==="health"?"MONITORING_SERVICE":"TASK_SERVICE"):"FINANCIAL_EXECUTION_SERVICE";
  const price=c.commercialModel==="FREE"?{amount:"0",currency:c.currency??"FREE"}:{amount:c.amount??"",currency:c.currency??"",tokenAddress:c.tokenAddress,amountRaw:c.amountRaw,decimals:c.decimals};
  const terms:CommercialOfferTerms={termsVersion:c.termsVersion,commercialModel:c.commercialModel,serviceType,price,network:"BSC",chainId:declaration.chainId,paymentRail:c.paymentRail,payment:c.payment,scope:{summary:declaration.shortDescription,protocols:declaration.permission.protocols,financialAuthorityRequired:declaration.permission.financialAuthorityRequired,walletSigningRequired:declaration.permission.walletSigningRequired},availability,quoteValiditySeconds:600};
  return{offerId:`offer:operator:${declaration.declarationId}:v${declaration.declarationVersion}`,serviceId:declaration.serviceId,state:available?"AVAILABLE":"UNAVAILABLE",terms,source:"operator-claimed",note:"Operator-declared commercial terms. Canonical owner/lifecycle gates apply; payment still requires independent reconciliation."};
}

export interface OperatorWorkspaceEngine {
  createChallenge(address: string): Promise<OperatorAuthChallenge>;
  verifyChallenge(input:{challengeId:string;signature:string}): Promise<{session:OperatorSession;token:string}>;
  authenticate(token:string): Promise<OperatorSession>;
  claimAgent(session:OperatorSession,input:{chainId:AgentRegistryChainId;agentId:string}): Promise<OperatorAgentClaim>;
  getWorkspace(session:OperatorSession): Promise<OperatorWorkspaceSnapshot>;
  upsertDeclaration(session:OperatorSession,input:{chainId:AgentRegistryChainId;agentId:string;serviceId:string;category:ServiceCategory;name:string;shortDescription:string;runtimeEndpoints:OperatorRuntimeDeclaration[];commercial:OperatorCommercialDeclaration;permission:OperatorPermissionDeclaration;declarationId?:string}): Promise<OperatorServiceDeclaration>;
  transition(session:OperatorSession,declarationId:string,state:OperatorSupplyLifecycleState): Promise<OperatorServiceDeclaration>;
  submitEvidence(session:OperatorSession,input:{serviceId:string;evidenceType:string;value:string;sourceLabel:string;observedAt:string;limitations?:string[]}): Promise<OperatorSuppliedEvidenceRecord>;
  runMarketplaceTests(session:OperatorSession,serviceId:string): Promise<Awaited<ReturnType<MarketplaceSupplyReader["runTests"]>>>;
  resolvePublishedOffer(serviceId:string): Promise<ServiceOffer | undefined>;
}

export function createOperatorWorkspaceEngine(options:{store?:OperatorWorkspaceStore;registry:AgentRegistryReader;marketplace:MarketplaceSupplyReader;now?:()=>Date;challengeTtlMs?:number;sessionTtlMs?:number;recoverAddress?:(message:string,signature:Hex)=>Promise<string>}):OperatorWorkspaceEngine{
  const store=options.store??new MemoryOperatorWorkspaceStore(); const now=options.now??(()=>new Date()); const challengeTtl=options.challengeTtlMs??5*60_000; const sessionTtl=options.sessionTtlMs??8*60*60_000; const recover=options.recoverAddress??((message,signature)=>recoverMessageAddress({message,signature}));
  async function ownClaim(a:string,c:AgentRegistryChainId,id:string){
    const claim=await store.getClaim(a,c,id);
    if(!claim)throw new OperatorWorkspaceError("Claim this ERC-8004 identity before managing services.","CLAIM_NOT_FOUND");
    const verification=await options.registry.verifyIdentity(c,id);
    const canonical=verification.ownerAddress?normalizeAddress(verification.ownerAddress,"canonical owner"):undefined;
    if(verification.state!=="VERIFIED"||!canonical||canonical!==a)throw new OperatorWorkspaceError("Canonical ERC-8004 ownership no longer matches the authenticated operator wallet.","CANONICAL_OWNER_REQUIRED",false,{state:verification.state,ownerAddress:verification.ownerAddress});
    const refreshed:OperatorAgentClaim={...claim,canonicalOwnerAddress:canonical,canonicalVerificationState:verification.state,lastVerifiedAt:nowIso(now)};
    await store.saveClaim(refreshed);
    return refreshed;
  }
  async function serviceOwned(a:string,serviceId:string){const rec=await options.marketplace.getService(serviceId);const ident=rec.identity.identity;const c=ident.chainId as AgentRegistryChainId;const id=ident.agentId; if(!id)throw new OperatorWorkspaceError("Service has no manageable ERC-8004 agent ID.","SERVICE_NOT_OWNED");await ownClaim(a,c,id);return rec;}
  return {
    async createChallenge(raw){const address=normalizeAddress(raw);const created=now();const expires=new Date(created.getTime()+challengeTtl);const nonce=randomBytes(16).toString("hex");const challengeId=digest("opch",address,nonce,created.toISOString());const message=["Spotriq Operator Workspace","","Sign this message to prove control of the operator wallet.",`Address: ${address}`,`Nonce: ${nonce}`,`Issued At: ${created.toISOString()}`,`Expires At: ${expires.toISOString()}`,"","This signature does not grant financial authority or move funds."].join("\n");const out={challengeId,address,nonce,message,createdAt:created.toISOString(),expiresAt:expires.toISOString()};await store.saveChallenge(out);return out;},
    async verifyChallenge(input){const challenge=await store.getChallenge(required(input.challengeId,"challengeId"));if(!challenge)throw new OperatorWorkspaceError("Authentication challenge was not found.","CHALLENGE_NOT_FOUND");if(challenge.usedAt)throw new OperatorWorkspaceError("Authentication challenge was already used.","CHALLENGE_USED");if(Date.parse(challenge.expiresAt)<=now().getTime())throw new OperatorWorkspaceError("Authentication challenge expired.","CHALLENGE_EXPIRED");if(!SIGNATURE.test(input.signature))throw new OperatorWorkspaceError("signature must be a 65-byte EIP-191 signature.","SIGNATURE_INVALID");let recovered:string;try{recovered=normalizeAddress(await recover(challenge.message,input.signature as Hex));}catch(e){throw new OperatorWorkspaceError("Signature could not be verified.","SIGNATURE_INVALID",false,e);}if(recovered!==challenge.address)throw new OperatorWorkspaceError("Signature does not match the challenged wallet.","SIGNATURE_INVALID");const usedAt=nowIso(now);if(!(await store.consumeChallenge(challenge.challengeId,usedAt)))throw new OperatorWorkspaceError("Authentication challenge was already used.","CHALLENGE_USED");const token=randomBytes(32).toString("base64url");const created=now();const session:OperatorSession={sessionId:digest("opsess",challenge.address,token),address:challenge.address,createdAt:created.toISOString(),expiresAt:new Date(created.getTime()+sessionTtl).toISOString()};await store.saveSession(session,tokenHash(token));return{session,token};},
    async authenticate(token){const t=required(token,"session token",4096);const session=await store.getSessionByTokenHash(tokenHash(t));if(!session)throw new OperatorWorkspaceError("Operator authentication is required.","AUTH_REQUIRED");if(Date.parse(session.expiresAt)<=now().getTime())throw new OperatorWorkspaceError("Operator session expired.","SESSION_EXPIRED");return session;},
    async claimAgent(session,input){if(!/^\d+$/.test(input.agentId))throw new OperatorWorkspaceError("agentId must be numeric.","INVALID_INPUT");const agent=await options.registry.getAgent(input.chainId,input.agentId);const verification=await options.registry.verifyIdentity(input.chainId,input.agentId,agent);const canonical=verification.ownerAddress?normalizeAddress(verification.ownerAddress,"canonical owner"):undefined;if(verification.state!=="VERIFIED"||!canonical||canonical!==session.address)throw new OperatorWorkspaceError("Canonical ERC-8004 ownership must be VERIFIED and match the authenticated operator wallet.","CANONICAL_OWNER_REQUIRED",false,{state:verification.state,ownerAddress:verification.ownerAddress});const at=nowIso(now);const existing=await store.getClaim(session.address,input.chainId,input.agentId);const claim:OperatorAgentClaim={claimId:existing?.claimId??digest("opclaim",session.address,String(input.chainId),input.agentId),operatorAddress:session.address,chainId:input.chainId,agentId:input.agentId,discoveryId:agent.discoveryId,canonicalOwnerAddress:canonical,canonicalVerificationState:verification.state,claimedAt:existing?.claimedAt??at,lastVerifiedAt:at};await store.saveClaim(claim);return claim;},
    async getWorkspace(session){const [claims,declarations]=await Promise.all([store.listClaims(session.address),store.listDeclarations(session.address)]);const services=[];for(const declaration of declarations){let marketplace;let latestTest;try{marketplace=await options.marketplace.getService(declaration.serviceId);latestTest=await options.marketplace.getTests(declaration.serviceId);}catch{/* draft service may not yet normalize into public supply */}services.push({declaration,marketplace,latestTest,operatorEvidence:await store.listEvidence(session.address,declaration.serviceId)});}return{operatorAddress:session.address,claims,services,generatedAt:nowIso(now),methodVersion:OPERATOR_WORKSPACE_METHOD,limitations:["Operator declarations are Operator Supplied evidence and cannot overwrite Marketplace Observed Test Lab evidence.","Operator lifecycle can make a service less available, but cannot force marketplace readiness to READY.","Financial PermissionGrants, payments, Activations, executions and outcomes remain independent resources."]};},
    async upsertDeclaration(session,input){await ownClaim(session.address,input.chainId,input.agentId);const serviceId=required(input.serviceId,"serviceId");const expectedServiceId=`svc:erc8004:${input.chainId}:${input.agentId}:${input.category}`;if(serviceId!==expectedServiceId)throw new OperatorWorkspaceError(`serviceId must match the claimed agent/category namespace: ${expectedServiceId}.`,"SERVICE_NOT_OWNED");const name=required(input.name,"name",160);const shortDescription=required(input.shortDescription,"shortDescription",1000);if(input.runtimeEndpoints.length>8)throw new OperatorWorkspaceError("At most 8 runtime endpoints may be declared.","INVALID_INPUT");for(const ep of input.runtimeEndpoints){required(ep.name,"runtime endpoint name",80);const u=new URL(required(ep.endpoint,"runtime endpoint",2048));if(u.protocol!=="https:")throw new OperatorWorkspaceError("Operator runtime endpoints must use HTTPS.","INVALID_INPUT");}
      const commercial=input.commercial;
      const addr=(v:string|undefined,label:string)=>{const x=(v??"").trim().toLowerCase();if(!/^0x[0-9a-f]{40}$/.test(x))throw new OperatorWorkspaceError(`${label} must be a valid EVM address.`,"INVALID_INPUT");return x;};
      if(commercial.paymentRail!=="UNDECLARED"&&commercial.paymentRail!=="FREE"){
        required(commercial.amount??"","commercial amount",80); required(commercial.currency??"","commercial currency",40);
        addr(commercial.tokenAddress,"commercial tokenAddress");
        if(!commercial.amountRaw||!/^\d+$/.test(commercial.amountRaw)||BigInt(commercial.amountRaw)<=0n)throw new OperatorWorkspaceError("Paid commercial declarations require positive amountRaw.","INVALID_INPUT");
        if(commercial.decimals===undefined||!Number.isInteger(commercial.decimals)||commercial.decimals<0||commercial.decimals>36)throw new OperatorWorkspaceError("Paid commercial declarations require token decimals between 0 and 36.","INVALID_INPUT");
      }
      if(commercial.paymentRail==="ERC8183"){addr(commercial.payment?.contractAddress,"ERC-8183 contractAddress");addr(commercial.payment?.providerAddress,"ERC-8183 providerAddress");}
      if(commercial.paymentRail==="X402"||commercial.paymentRail==="B402"){addr(commercial.payment?.payToAddress??commercial.payment?.providerAddress,`${commercial.paymentRail} payToAddress`);const endpoint=new URL(required(commercial.payment?.endpoint??"",`${commercial.paymentRail} payment endpoint`,2048));if(endpoint.protocol!=="https:")throw new OperatorWorkspaceError(`${commercial.paymentRail} payment endpoint must use HTTPS.`,"INVALID_INPUT");}
      let existing=input.declarationId?await store.getDeclaration(session.address,input.declarationId):undefined;const at=nowIso(now);const declarationId=existing?.declarationId??digest("opdecl",session.address,String(input.chainId),input.agentId,serviceId,input.category);const next:OperatorServiceDeclaration={declarationId,operatorAddress:session.address,chainId:input.chainId,agentId:input.agentId,serviceId,category:input.category,lifecycleState:existing?.lifecycleState??"DRAFT",name,shortDescription,runtimeEndpoints:clone(input.runtimeEndpoints),commercial:clone(input.commercial),permission:clone(input.permission),declarationVersion:(existing?.declarationVersion??0)+1,createdAt:existing?.createdAt??at,updatedAt:at,submittedAt:existing?.submittedAt,pausedAt:existing?.pausedAt,retiredAt:existing?.retiredAt,limitations:["This declaration is Operator Supplied and does not establish canonical identity, Test Lab success, marketplace readiness, payment, PermissionGrant, execution, or outcome evidence."]};await store.saveDeclaration(next);return next;},
    async transition(session,declarationId,state){const d=await store.getDeclaration(session.address,required(declarationId,"declarationId"));if(!d)throw new OperatorWorkspaceError("Operator service declaration was not found.","DECLARATION_NOT_FOUND");await ownClaim(session.address,d.chainId,d.agentId);const allowed:Record<OperatorSupplyLifecycleState,OperatorSupplyLifecycleState[]>={DRAFT:["SUBMITTED","RETIRED"],SUBMITTED:["ACTIVE","PAUSED","SUSPENDED","RETIRED"],ACTIVE:["PAUSED","SUSPENDED","RETIRED"],PAUSED:["SUBMITTED","ACTIVE","RETIRED"],SUSPENDED:["SUBMITTED","RETIRED"],RETIRED:[]};if(!allowed[d.lifecycleState].includes(state))throw new OperatorWorkspaceError(`Cannot transition operator service from ${d.lifecycleState} to ${state}.`,"INVALID_LIFECYCLE");const at=nowIso(now);const next={...d,lifecycleState:state,declarationVersion:d.declarationVersion+1,updatedAt:at,submittedAt:state==="SUBMITTED"?(d.submittedAt??at):d.submittedAt,pausedAt:state==="PAUSED"?at:d.pausedAt,retiredAt:state==="RETIRED"?at:d.retiredAt};await store.saveDeclaration(next);return next;},
    async submitEvidence(session,input){await serviceOwned(session.address,input.serviceId);const observedAt=new Date(required(input.observedAt,"observedAt")).toISOString();const submittedAt=nowIso(now);const value=required(input.value,"value",4000);const record:OperatorSuppliedEvidenceRecord={evidenceId:digest("opev",session.address,input.serviceId,input.evidenceType,input.sourceLabel,observedAt,value),operatorAddress:session.address,serviceId:input.serviceId,evidenceType:required(input.evidenceType,"evidenceType",100),value,sourceLabel:required(input.sourceLabel,"sourceLabel",160),observedAt,submittedAt,provenance:"operator-claimed",limitations:input.limitations?.map(x=>x.trim()).filter(Boolean).slice(0,12)??[]};await store.saveEvidence(record);return record;},
    async runMarketplaceTests(session,serviceId){await serviceOwned(session.address,required(serviceId,"serviceId"));return options.marketplace.runTests(serviceId);},
    async resolvePublishedOffer(serviceId){const declaration=await store.findLatestDeclarationByService(required(serviceId,"serviceId"));if(!declaration)return undefined;try{await ownClaim(declaration.operatorAddress,declaration.chainId,declaration.agentId);}catch{return undefined;}return operatorDeclarationToServiceOffer(declaration);},
  };
}
