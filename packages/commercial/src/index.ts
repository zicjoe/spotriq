import { createHash } from "node:crypto";
import { decodeFunctionResult, encodeFunctionData } from "viem";
import type { BscChainReader } from "@spotriq/chain";
import type {
  ActivationControlProfile,
  AgentRegistryChainId,
  BuyerCommercialState,
  CommercialHire,
  CommercialOfferTerms,
  CommercialPaymentEvidence,
  CommercialQuote,
  Erc8183PaymentObservation,
  MarketplaceActivation,
  MarketplaceServiceRecord,
  ServiceOffer,
} from "@spotriq/domain";
import { createEvidenceEnvelope, DATA_SOURCES, EVIDENCE_METHODS } from "@spotriq/evidence";
import type { MarketplaceSupplyReader } from "@spotriq/marketplace-supply";
import { isDatabaseUniqueViolation, validateExternalHttpUrl } from "@spotriq/security-hardening";

export const COMMERCIAL_KERNEL_METHOD = "marketplace.commercial-kernel@1.0.0";
export const ERC8183_RECONCILIATION_METHOD = "marketplace.erc8183-payment-reconciliation@1.0.0";

export class CommercialError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_INPUT"
      | "OFFER_NOT_FOUND"
      | "QUOTE_NOT_FOUND"
      | "HIRE_NOT_FOUND"
      | "ACTIVATION_NOT_FOUND"
      | "IDEMPOTENCY_CONFLICT"
      | "QUOTE_EXPIRED"
      | "OFFER_STALE"
      | "NETWORK_MISMATCH"
      | "PAYMENT_REQUIRED"
      | "PAYMENT_MISMATCH"
      | "PAYMENT_ADAPTER_UNAVAILABLE"
      | "PERMISSION_REQUIRED"
      | "SERVICE_NOT_READY"
      | "WRONG_BUYER"
      | "WRONG_SERVICE"
      | "ONCHAIN_OBSERVATION_FAILED",
    public readonly retryable = false,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "CommercialError";
  }
}

export interface SqlQueryResult<Row = Record<string, unknown>> { rows: Row[]; rowCount?: number | null; }
export interface SqlQueryExecutor { query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<SqlQueryResult<Row>>; }

export interface CommercialStore {
  saveQuote(quote: CommercialQuote): Promise<void>;
  getQuote(quoteId: string): Promise<CommercialQuote | undefined>;
  findQuoteByIdempotency(buyerAddress: string, idempotencyKey: string): Promise<CommercialQuote | undefined>;
  listQuotes(buyerAddress: string): Promise<CommercialQuote[]>;
  saveHire(hire: CommercialHire): Promise<void>;
  getHire(hireId: string): Promise<CommercialHire | undefined>;
  findHireByIdempotency(buyerAddress: string, idempotencyKey: string): Promise<CommercialHire | undefined>;
  listHires(buyerAddress: string): Promise<CommercialHire[]>;
  savePayment(payment: CommercialPaymentEvidence): Promise<void>;
  getPayment(paymentEvidenceId: string): Promise<CommercialPaymentEvidence | undefined>;
  getLatestPaymentForHire(hireId: string): Promise<CommercialPaymentEvidence | undefined>;
  findPaymentByProviderRef(rail: CommercialPaymentEvidence["rail"], providerRef: string): Promise<CommercialPaymentEvidence | undefined>;
  findPaymentBySettlementRef(transactionHash:string,logIndex:number):Promise<CommercialPaymentEvidence|undefined>;
  listPayments(buyerAddress: string): Promise<CommercialPaymentEvidence[]>;
  saveActivation(activation: MarketplaceActivation): Promise<void>;
  getActivation(activationId: string): Promise<MarketplaceActivation | undefined>;
  getActivationForHire(hireId: string): Promise<MarketplaceActivation | undefined>;
  findActivationByIdempotency(buyerAddress: string, idempotencyKey: string): Promise<MarketplaceActivation | undefined>;
  claimActivationIdempotency(buyerAddress: string, idempotencyKey: string, hireId: string, activationId: string, claimedAt: string): Promise<{buyerAddress:string;idempotencyKey:string;hireId:string;activationId:string}>;
  listActivations(buyerAddress: string): Promise<MarketplaceActivation[]>;
}

function clone<T>(value: T): T { return structuredClone(value); }

export class MemoryCommercialStore implements CommercialStore {
  private readonly quotes = new Map<string, CommercialQuote>();
  private readonly hires = new Map<string, CommercialHire>();
  private readonly payments = new Map<string, CommercialPaymentEvidence>();
  private readonly activations = new Map<string, MarketplaceActivation>();
  private readonly activationClaims = new Map<string,{buyerAddress:string;idempotencyKey:string;hireId:string;activationId:string}>();

  async saveQuote(quote: CommercialQuote): Promise<void> { if (!this.quotes.has(quote.quoteId)) this.quotes.set(quote.quoteId, clone(quote)); }
  async getQuote(id: string): Promise<CommercialQuote | undefined> { const v=this.quotes.get(id); return v?clone(v):undefined; }
  async findQuoteByIdempotency(buyer: string,key:string):Promise<CommercialQuote|undefined>{return this.sorted(this.quotes.values(),buyer).find(v=>v.idempotencyKey===key);}
  async listQuotes(buyer:string):Promise<CommercialQuote[]>{return this.sorted(this.quotes.values(),buyer);}
  async saveHire(hire:CommercialHire):Promise<void>{this.hires.set(hire.hireId,clone(hire));}
  async getHire(id:string):Promise<CommercialHire|undefined>{const v=this.hires.get(id);return v?clone(v):undefined;}
  async findHireByIdempotency(buyer:string,key:string):Promise<CommercialHire|undefined>{return this.sorted(this.hires.values(),buyer).find(v=>v.idempotencyKey===key);}
  async listHires(buyer:string):Promise<CommercialHire[]>{return this.sorted(this.hires.values(),buyer);}
  async savePayment(payment:CommercialPaymentEvidence):Promise<void>{
    if(payment.providerRef){const prior=await this.findPaymentByProviderRef(payment.rail,payment.providerRef);if(prior&&prior.hireId!==payment.hireId)throw new CommercialError("This external payment/funding reference is already reconciled to a different Hire.","PAYMENT_MISMATCH");}
    if(payment.observation?.kind==="HTTP402_SETTLEMENT"&&payment.observation.transferLogIndex!==undefined){const prior=await this.findPaymentBySettlementRef(payment.observation.transactionHash,payment.observation.transferLogIndex);if(prior&&prior.hireId!==payment.hireId)throw new CommercialError("This on-chain settlement transfer is already reconciled to a different Hire.","PAYMENT_MISMATCH");}
    this.payments.set(payment.paymentEvidenceId,clone(payment));
  }
  async getPayment(id:string):Promise<CommercialPaymentEvidence|undefined>{const v=this.payments.get(id);return v?clone(v):undefined;}
  async getLatestPaymentForHire(hireId:string):Promise<CommercialPaymentEvidence|undefined>{return [...this.payments.values()].filter(v=>v.hireId===hireId).sort((a,b)=>b.observedAt.localeCompare(a.observedAt)).map(clone)[0];}
  async findPaymentByProviderRef(rail:CommercialPaymentEvidence["rail"],providerRef:string):Promise<CommercialPaymentEvidence|undefined>{const v=[...this.payments.values()].find(item=>item.rail===rail&&item.providerRef===providerRef);return v?clone(v):undefined;}
  async findPaymentBySettlementRef(transactionHash:string,logIndex:number):Promise<CommercialPaymentEvidence|undefined>{const v=[...this.payments.values()].find(item=>item.observation?.kind==="HTTP402_SETTLEMENT"&&item.observation.transactionHash===transactionHash&&item.observation.transferLogIndex===logIndex);return v?clone(v):undefined;}
  async listPayments(buyer:string):Promise<CommercialPaymentEvidence[]>{return this.sorted(this.payments.values(),buyer);}
  async saveActivation(activation:MarketplaceActivation):Promise<void>{this.activations.set(activation.activationId,clone(activation));}
  async getActivation(id:string):Promise<MarketplaceActivation|undefined>{const v=this.activations.get(id);return v?clone(v):undefined;}
  async getActivationForHire(hireId:string):Promise<MarketplaceActivation|undefined>{return [...this.activations.values()].find(v=>v.hireId===hireId)?clone([...this.activations.values()].find(v=>v.hireId===hireId)!):undefined;}
  async findActivationByIdempotency(buyer:string,key:string):Promise<MarketplaceActivation|undefined>{return this.sorted(this.activations.values(),buyer).find(v=>v.idempotencyKey===key);}
  async claimActivationIdempotency(buyer:string,key:string,hireId:string,activationId:string):Promise<{buyerAddress:string;idempotencyKey:string;hireId:string;activationId:string}>{const claimKey=`${buyer.toLowerCase()}:${key}`;const prior=this.activationClaims.get(claimKey);if(prior)return clone(prior);const claim={buyerAddress:buyer.toLowerCase(),idempotencyKey:key,hireId,activationId};this.activationClaims.set(claimKey,claim);return clone(claim);}
  async listActivations(buyer:string):Promise<MarketplaceActivation[]>{return this.sorted(this.activations.values(),buyer);}
  private sorted<T extends {buyerAddress:string}>(values:Iterable<T>,buyer:string):T[]{return [...values].filter(v=>v.buyerAddress===buyer).map(clone).sort((a,b)=>JSON.stringify(b).localeCompare(JSON.stringify(a)));}
}

export class PostgresCommercialStore implements CommercialStore {
  constructor(private readonly database: SqlQueryExecutor) {}
  async saveQuote(q:CommercialQuote):Promise<void>{await this.database.query(`insert into commercial_quotes (quote_id,offer_id,service_id,buyer_address,buyer_chain_id,idempotency_key,terms_hash,expires_at,payload,created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10) on conflict (quote_id) do nothing`,[q.quoteId,q.offerId,q.serviceId,q.buyerAddress,q.buyerChainId,q.idempotencyKey,q.termsHash,q.expiresAt,JSON.stringify(q),q.quotedAt]);}
  async getQuote(id:string):Promise<CommercialQuote|undefined>{return (await this.database.query<{payload:CommercialQuote}>("select payload from commercial_quotes where quote_id=$1",[id])).rows[0]?.payload;}
  async findQuoteByIdempotency(buyer:string,key:string):Promise<CommercialQuote|undefined>{return (await this.database.query<{payload:CommercialQuote}>("select payload from commercial_quotes where buyer_address=$1 and idempotency_key=$2 limit 1",[buyer,key])).rows[0]?.payload;}
  async listQuotes(buyer:string):Promise<CommercialQuote[]>{return (await this.database.query<{payload:CommercialQuote}>("select payload from commercial_quotes where buyer_address=$1 order by created_at desc",[buyer])).rows.map(r=>r.payload);}
  async saveHire(h:CommercialHire):Promise<void>{await this.database.query(`insert into commercial_hires (hire_id,quote_id,offer_id,service_id,buyer_address,buyer_chain_id,state,idempotency_key,terms_hash,payment_required,permission_required,payload,accepted_at,updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14) on conflict (hire_id) do update set state=excluded.state,payment_required=excluded.payment_required,permission_required=excluded.permission_required,payload=excluded.payload,updated_at=excluded.updated_at where commercial_hires.quote_id=excluded.quote_id and commercial_hires.buyer_address=excluded.buyer_address and commercial_hires.terms_hash=excluded.terms_hash`,[h.hireId,h.quoteId,h.offerId,h.serviceId,h.buyerAddress,h.buyerChainId,h.state,h.idempotencyKey,h.termsHash,h.paymentRequired,h.permissionRequired,JSON.stringify(h),h.acceptedAt,h.updatedAt]);}
  async getHire(id:string):Promise<CommercialHire|undefined>{return (await this.database.query<{payload:CommercialHire}>("select payload from commercial_hires where hire_id=$1",[id])).rows[0]?.payload;}
  async findHireByIdempotency(buyer:string,key:string):Promise<CommercialHire|undefined>{return (await this.database.query<{payload:CommercialHire}>("select payload from commercial_hires where buyer_address=$1 and idempotency_key=$2 limit 1",[buyer,key])).rows[0]?.payload;}
  async listHires(buyer:string):Promise<CommercialHire[]>{return (await this.database.query<{payload:CommercialHire}>("select payload from commercial_hires where buyer_address=$1 order by accepted_at desc",[buyer])).rows.map(r=>r.payload);}
  async savePayment(p:CommercialPaymentEvidence):Promise<void>{const tx=p.observation?.kind==="HTTP402_SETTLEMENT"?p.observation.transactionHash:undefined;const block=p.observation?.kind==="HTTP402_SETTLEMENT"?p.observation.blockNumber:p.observation?.kind==="ERC8183_JOB"?p.observation.blockNumber:undefined;const logIndex=p.observation?.kind==="HTTP402_SETTLEMENT"?p.observation.transferLogIndex:undefined;try{await this.database.query(`insert into commercial_payment_evidence (payment_evidence_id,hire_id,service_id,buyer_address,rail,state,provider_ref,payload,observed_at,settlement_tx_hash,settlement_block_number,settlement_log_index) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12) on conflict (payment_evidence_id) do update set state=excluded.state,provider_ref=excluded.provider_ref,payload=excluded.payload,observed_at=excluded.observed_at,settlement_tx_hash=excluded.settlement_tx_hash,settlement_block_number=excluded.settlement_block_number,settlement_log_index=excluded.settlement_log_index`,[p.paymentEvidenceId,p.hireId,p.serviceId,p.buyerAddress,p.rail,p.state,p.providerRef??null,JSON.stringify(p),p.observedAt,tx??null,block??null,logIndex??null]);}catch(error){if(isDatabaseUniqueViolation(error))throw new CommercialError("This payment/funding reference or on-chain settlement transfer was concurrently claimed by another Hire.","PAYMENT_MISMATCH",false);throw error;}}
  async getPayment(id:string):Promise<CommercialPaymentEvidence|undefined>{return (await this.database.query<{payload:CommercialPaymentEvidence}>("select payload from commercial_payment_evidence where payment_evidence_id=$1",[id])).rows[0]?.payload;}
  async getLatestPaymentForHire(hireId:string):Promise<CommercialPaymentEvidence|undefined>{return (await this.database.query<{payload:CommercialPaymentEvidence}>("select payload from commercial_payment_evidence where hire_id=$1 order by observed_at desc limit 1",[hireId])).rows[0]?.payload;}
  async findPaymentByProviderRef(rail:CommercialPaymentEvidence["rail"],providerRef:string):Promise<CommercialPaymentEvidence|undefined>{return (await this.database.query<{payload:CommercialPaymentEvidence}>("select payload from commercial_payment_evidence where rail=$1 and provider_ref=$2 limit 1",[rail,providerRef])).rows[0]?.payload;}
  async findPaymentBySettlementRef(transactionHash:string,logIndex:number):Promise<CommercialPaymentEvidence|undefined>{return (await this.database.query<{payload:CommercialPaymentEvidence}>("select payload from commercial_payment_evidence where settlement_tx_hash=$1 and settlement_log_index=$2 limit 1",[transactionHash,logIndex])).rows[0]?.payload;}
  async listPayments(buyer:string):Promise<CommercialPaymentEvidence[]>{return (await this.database.query<{payload:CommercialPaymentEvidence}>("select payload from commercial_payment_evidence where buyer_address=$1 order by observed_at desc",[buyer])).rows.map(r=>r.payload);}
  async saveActivation(a:MarketplaceActivation):Promise<void>{await this.database.query(`insert into activations (activation_id,service_id,state,started_at,updated_at,hire_id,quote_id,buyer_address,buyer_chain_id,activation_kind,commercial_terms_hash,commercial_payload,commercial_method_version) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13) on conflict (activation_id) do update set state=excluded.state,updated_at=excluded.updated_at,commercial_payload=excluded.commercial_payload`,[a.activationId,a.serviceId,a.state,a.activatedAt,a.updatedAt,a.hireId,a.quoteId,a.buyerAddress,a.buyerChainId,a.activationKind,a.termsHash,JSON.stringify(a),a.methodVersion]);}
  async getActivation(id:string):Promise<MarketplaceActivation|undefined>{return (await this.database.query<{commercial_payload:MarketplaceActivation}>("select commercial_payload from activations where activation_id=$1 and commercial_payload is not null",[id])).rows[0]?.commercial_payload;}
  async getActivationForHire(hireId:string):Promise<MarketplaceActivation|undefined>{return (await this.database.query<{commercial_payload:MarketplaceActivation}>("select commercial_payload from activations where hire_id=$1 and commercial_payload is not null limit 1",[hireId])).rows[0]?.commercial_payload;}
  async findActivationByIdempotency(buyer:string,key:string):Promise<MarketplaceActivation|undefined>{return (await this.database.query<{commercial_payload:MarketplaceActivation}>("select commercial_payload from activations where buyer_address=$1 and commercial_payload->>'idempotencyKey'=$2 and commercial_payload is not null limit 1",[buyer,key])).rows[0]?.commercial_payload;}
  async claimActivationIdempotency(buyer:string,key:string,hireId:string,activationId:string,claimedAt:string):Promise<{buyerAddress:string;idempotencyKey:string;hireId:string;activationId:string}>{const inserted=await this.database.query<{buyer_address:string;idempotency_key:string;hire_id:string;activation_id:string}>(`insert into commercial_activation_idempotency_claims (buyer_address,idempotency_key,hire_id,activation_id,claimed_at) values ($1,$2,$3,$4,$5) on conflict (buyer_address,idempotency_key) do nothing returning buyer_address,idempotency_key,hire_id,activation_id`,[buyer,key,hireId,activationId,claimedAt]);const row=inserted.rows[0]??(await this.database.query<{buyer_address:string;idempotency_key:string;hire_id:string;activation_id:string}>(`select buyer_address,idempotency_key,hire_id,activation_id from commercial_activation_idempotency_claims where buyer_address=$1 and idempotency_key=$2`,[buyer,key])).rows[0];if(!row)throw new CommercialError("Activation idempotency claim could not be established.","IDEMPOTENCY_CONFLICT",true);return{buyerAddress:row.buyer_address,idempotencyKey:row.idempotency_key,hireId:row.hire_id,activationId:row.activation_id};}
  async listActivations(buyer:string):Promise<MarketplaceActivation[]>{return (await this.database.query<{commercial_payload:MarketplaceActivation}>("select commercial_payload from activations where buyer_address=$1 and commercial_payload is not null order by started_at desc",[buyer])).rows.map(r=>r.commercial_payload);}
}

export interface PaymentReconciliationContext {
  hire: CommercialHire;
  quote: CommercialQuote;
  terms: CommercialOfferTerms;
  reference: { jobId?: string; transactionHash?: string };
  now: Date;
}
export interface CommercialPaymentAdapter {
  readonly rail: "ERC8183" | "X402" | "B402";
  reconcile(context: PaymentReconciliationContext): Promise<CommercialPaymentEvidence>;
}

const ERC8183_ABI = [
  { type:"function", name:"getJob", stateMutability:"view", inputs:[{name:"jobId",type:"uint256"}], outputs:[{name:"",type:"tuple",components:[
    {name:"id",type:"uint256"},{name:"client",type:"address"},{name:"provider",type:"address"},{name:"evaluator",type:"address"},{name:"description",type:"string"},{name:"budget",type:"uint256"},{name:"expiredAt",type:"uint256"},{name:"status",type:"uint8"},{name:"hook",type:"address"}
  ]}]},
  { type:"function", name:"paymentToken", stateMutability:"view", inputs:[], outputs:[{name:"",type:"address"}]},
] as const;

function normalizedAddress(value:string,label="address"):string { const v=value.trim().toLowerCase(); if(!/^0x[0-9a-f]{40}$/.test(v)) throw new CommercialError(`${label} must be a valid EVM address.`,"INVALID_INPUT"); return v; }
function nonempty(value:string,label:string,max=256):string { const v=value.trim(); if(!v||v.length>max) throw new CommercialError(`${label} is required and must be at most ${max} characters.`,"INVALID_INPUT"); return v; }
function chainId(value:number):AgentRegistryChainId { if(value!==56&&value!==97) throw new CommercialError("BSC chainId must be 56 or 97.","INVALID_INPUT"); return value; }
function canonical(value:unknown):string { const stable=(v:unknown):unknown=>Array.isArray(v)?v.map(stable):v&&typeof v==="object"?Object.fromEntries(Object.entries(v as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])):v; return JSON.stringify(stable(value)); }
function sha(value:string):string{return `sha256:${createHash("sha256").update(value).digest("hex")}`;}
function deterministicId(prefix:string,...parts:string[]):string{return `${prefix}:${createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0,32)}`;}
function numericZero(value:string):boolean { try{return BigInt(value||"0")===0n;}catch{return Number(value)===0;} }
function termsHash(terms:CommercialOfferTerms):string{return sha(canonical(terms));}
function isPaymentRequired(terms:CommercialOfferTerms):boolean{return terms.paymentRail!=="FREE" || !numericZero(terms.price.amountRaw ?? terms.price.amount);}
function isPermissionRequired(terms:CommercialOfferTerms):boolean{return terms.scope.financialAuthorityRequired || terms.scope.walletSigningRequired;}
function currentQuoteState(q:CommercialQuote,now:Date):CommercialQuote{return new Date(q.expiresAt).getTime()<=now.getTime()?{...q,state:"EXPIRED"}:q;}

function termsForObservationChain(offer:ServiceOffer, terms:CommercialOfferTerms, requestedChainId:AgentRegistryChainId|undefined):CommercialOfferTerms {
  if(requestedChainId===undefined||requestedChainId===terms.chainId)return structuredClone(terms);
  const supported=offer.readOnlyObservationChainIds??[];
  if(terms.serviceType!=="READ_ONLY_SERVICE"||terms.paymentRail!=="FREE"||terms.scope.walletSigningRequired||terms.scope.financialAuthorityRequired||!supported.includes(requestedChainId)){
    throw new CommercialError(`This Offer does not support read-only observation on BSC chain ${requestedChainId}.`,"NETWORK_MISMATCH");
  }
  return {...structuredClone(terms),chainId:requestedChainId};
}

function validateOffer(offer:ServiceOffer):CommercialOfferTerms {
  if(offer.state!=="AVAILABLE"||!offer.terms) throw new CommercialError("This AgentService does not currently publish a structured available commercial Offer.","OFFER_NOT_FOUND");
  const t=offer.terms;
  if(t.network!=="BSC"||(t.chainId!==56&&t.chainId!==97)) throw new CommercialError("Offer network terms are unsupported.","INVALID_INPUT");
  if(t.availability!=="AVAILABLE") throw new CommercialError("This commercial Offer is not currently available for quoting.","OFFER_STALE");
  if(!t.termsVersion.trim()||t.quoteValiditySeconds<60||t.quoteValiditySeconds>86400) throw new CommercialError("Offer termsVersion or quote validity is invalid.","INVALID_INPUT");
  if(t.paymentRail==="FREE"&&(!numericZero(t.price.amountRaw??t.price.amount)||t.commercialModel!=="FREE")) throw new CommercialError("FREE offers must have a zero price and FREE commercial model.","INVALID_INPUT");
  if(t.commercialModel==="FREE"&&t.paymentRail!=="FREE") throw new CommercialError("FREE commercial terms cannot require a paid payment rail.","INVALID_INPUT");
  if(t.paymentRail==="ERC8183"&&!t.payment?.contractAddress) throw new CommercialError("ERC-8183 Offer terms require a contractAddress.","INVALID_INPUT");
  if(t.paymentRail==="X402"||t.paymentRail==="B402"){
    normalizedAddress(t.price.tokenAddress??"","price.tokenAddress");
    normalizedAddress(t.payment?.payToAddress??t.payment?.providerAddress??"","payment.payToAddress");
    if(!t.price.amountRaw||!/^\d+$/.test(t.price.amountRaw)||BigInt(t.price.amountRaw)<=0n) throw new CommercialError(`${t.paymentRail} paid Offer requires a positive price.amountRaw.`,"INVALID_INPUT");
    if(t.payment?.endpoint){try{validateExternalHttpUrl(t.payment.endpoint,{label:`${t.paymentRail} payment endpoint`});}catch(error){throw new CommercialError(error instanceof Error?error.message:`${t.paymentRail} payment endpoint is invalid.`,"INVALID_INPUT");}}
  }
  return structuredClone(t);
}

function requireCommercialServiceReady(record:MarketplaceServiceRecord, terms:CommercialOfferTerms, offer:ServiceOffer):void {
  if(record.service.serviceId!==offer.serviceId) throw new CommercialError("Service and Offer identifiers do not reconcile.","WRONG_SERVICE");
  if(offer.state!=="AVAILABLE"||offer.terms?.availability!=="AVAILABLE") throw new CommercialError("The commercial Offer is not currently available.","OFFER_STALE");
  if(record.readiness.state==="SUSPENDED"||record.readiness.state==="OFFLINE"||record.readiness.state==="DEGRADED") throw new CommercialError(`The service is ${record.readiness.state} and cannot be commercially activated.`,"SERVICE_NOT_READY");
  if(terms.serviceType==="READ_ONLY_SERVICE") {
    if(record.permissionProfile.executionMode!=="READ_ONLY"||terms.scope.walletSigningRequired||terms.scope.financialAuthorityRequired) throw new CommercialError("A read-only commercial activation cannot require or imply wallet signing/financial authority.","SERVICE_NOT_READY");
    const required=["CANONICAL_IDENTITY","ACTIVE_METADATA","MACHINE_ENDPOINT","RUNTIME_REACHABILITY","PERMISSION_PROFILE","MARKETPLACE_TESTS"];
    const byCode=new Map((record.readiness.checks??[]).map(c=>[c.code,c]));
    const missing=required.filter(code=>byCode.get(code)?.state!=="PASS");
    if(missing.length) throw new CommercialError(`Commercial activation is blocked until readiness checks pass: ${missing.join(", ")}.`,"SERVICE_NOT_READY",false,{missing});
  }
}

export function createErc8183PaymentAdapter(options:{chain:BscChainReader}):CommercialPaymentAdapter {
  const chain=options.chain;
  return { rail:"ERC8183", async reconcile(context){
    if (chain.definition.chainId !== context.terms.chainId) throw new CommercialError(`ERC-8183 reconciliation requires a BSC chain reader for chain ${context.terms.chainId}; this deployment is configured for ${chain.definition.chainId}.`,"NETWORK_MISMATCH");
    const contract=context.terms.payment?.contractAddress;
    if(!contract) throw new CommercialError("The immutable Quote does not contain an ERC-8183 contract address.","PAYMENT_MISMATCH");
    const contractAddress=normalizedAddress(contract,"ERC-8183 contractAddress");
    const rawJobId=nonempty(context.reference.jobId??"","ERC-8183 jobId",78);
    let jobId:bigint; try{jobId=BigInt(rawJobId);}catch{throw new CommercialError("ERC-8183 jobId must be an unsigned integer.","INVALID_INPUT");}
    if(jobId<0n) throw new CommercialError("ERC-8183 jobId must be an unsigned integer.","INVALID_INPUT");
    try {
      const jobCall=await chain.callContract(contractAddress,encodeFunctionData({abi:ERC8183_ABI,functionName:"getJob",args:[jobId]}));
      const tokenCall=await chain.callContract(contractAddress,encodeFunctionData({abi:ERC8183_ABI,functionName:"paymentToken"}),jobCall.blockNumber);
      const decodedRaw=decodeFunctionResult({abi:ERC8183_ABI,functionName:"getJob",data:jobCall.data as `0x${string}`}) as unknown;
      const decoded=Array.isArray(decodedRaw)
        ? { id: decodedRaw[0], client: decodedRaw[1], provider: decodedRaw[2], evaluator: decodedRaw[3], description: decodedRaw[4], budget: decodedRaw[5], expiredAt: decodedRaw[6], status: decodedRaw[7], hook: decodedRaw[8] }
        : decodedRaw as { id: bigint; client: string; provider: string; evaluator: string; description: string; budget: bigint; expiredAt: bigint; status: number | bigint; hook: string };
      const paymentToken=String(decodeFunctionResult({abi:ERC8183_ABI,functionName:"paymentToken",data:tokenCall.data as `0x${string}`}));
      const statusNames=["OPEN","FUNDED","SUBMITTED","COMPLETED","REJECTED","EXPIRED"] as const;
      const status=statusNames[Number(decoded.status)]??"EXPIRED";
      const client=normalizedAddress(String(decoded.client),"ERC-8183 client");
      const provider=normalizedAddress(String(decoded.provider),"ERC-8183 provider");
      const token=normalizedAddress(paymentToken,"ERC-8183 paymentToken");
      const expectedProvider=context.terms.payment?.providerAddress?normalizedAddress(context.terms.payment.providerAddress,"Offer providerAddress"):undefined;
      const expectedToken=context.terms.price.tokenAddress?normalizedAddress(context.terms.price.tokenAddress,"Offer tokenAddress"):undefined;
      const clientMatches=client===context.hire.buyerAddress;
      const providerMatches=!expectedProvider||provider===expectedProvider;
      const budgetMatches=!context.terms.price.amountRaw||BigInt(decoded.budget).toString()===context.terms.price.amountRaw;
      const tokenMatches=!expectedToken||token===expectedToken;
      const fundingSatisfied=(status==="FUNDED"||status==="SUBMITTED"||status==="COMPLETED")&&clientMatches&&providerMatches&&budgetMatches&&tokenMatches;
      const observation:Erc8183PaymentObservation={kind:"ERC8183_JOB",chainId:chain.definition.chainId as AgentRegistryChainId,contractAddress,jobId:BigInt(decoded.id).toString(),client,provider,evaluator:normalizedAddress(String(decoded.evaluator),"ERC-8183 evaluator"),description:String(decoded.description),budgetRaw:BigInt(decoded.budget).toString(),paymentToken:token,expiredAtUnix:BigInt(decoded.expiredAt).toString(),status,fundingSatisfied,settlementObserved:status==="COMPLETED",blockNumber:jobCall.blockNumber};
      const state:CommercialPaymentEvidence["state"]=fundingSatisfied?"VERIFIED":"MISMATCH";
      const observedAt=context.now.toISOString();
      const evidence=createEvidenceEnvelope({subjectType:"commercial_hire",subjectId:context.hire.hireId,metric:"commercial.payment",value:state,provenance:"marketplace-observed",source:DATA_SOURCES.ERC8183,sourceRef:`eip155:${chain.definition.chainId}:${contractAddress}:job:${jobId}`,observedAt,confidence:"high",method:EVIDENCE_METHODS.ERC8183_PAYMENT,methodInputs:[context.quote.termsHash,observation.jobId,observation.blockNumber],limitation:"This observes ERC-8183 job/funding state only. It is not Spotriq permission, activation, execution, or outcome evidence."});
      return {paymentEvidenceId:deterministicId("payment",context.hire.hireId,"ERC8183",observation.jobId),hireId:context.hire.hireId,serviceId:context.hire.serviceId,buyerAddress:context.hire.buyerAddress,requirement:"REQUIRED",state,rail:"ERC8183",chainId:observation.chainId,amount:context.terms.price.amount,currency:context.terms.price.currency,tokenAddress:context.terms.price.tokenAddress,providerRef:`${contractAddress}:${observation.jobId}`,observation,observedAt,methodVersion:ERC8183_RECONCILIATION_METHOD,provenance:"marketplace-observed",evidence:[evidence],limitations:["Spotriq reads the on-chain ERC-8183 job; it never accepts a client supplied paid=true claim.",...(fundingSatisfied?[]:[`Funding evidence did not satisfy every immutable Quote condition: client=${clientMatches}, provider=${providerMatches}, budget=${budgetMatches}, token=${tokenMatches}, status=${status}.`]) ]};
    } catch(error) {
      if(error instanceof CommercialError) throw error;
      throw new CommercialError("Spotriq could not reconcile the ERC-8183 job from BSC.","ONCHAIN_OBSERVATION_FAILED",true,error instanceof Error?error.message:String(error));
    }
  }};
}

export interface CommercialEngine {
  listOffers(serviceId:string):Promise<ServiceOffer[]>;
  createQuote(input:{serviceId:string;offerId?:string;buyerAddress:string;buyerChainId:number;serviceChainId?:number;idempotencyKey:string}):Promise<CommercialQuote>;
  getQuote(quoteId:string):Promise<CommercialQuote>;
  createHire(input:{quoteId:string;buyerAddress:string;idempotencyKey:string}):Promise<CommercialHire>;
  getHire(hireId:string):Promise<CommercialHire>;
  getPayment(hireId:string):Promise<CommercialPaymentEvidence>;
  reconcilePayment(hireId:string,input:{buyerAddress:string;reference:{jobId?:string;transactionHash?:string}}):Promise<CommercialPaymentEvidence>;
  activate(hireId:string,input:{buyerAddress:string;idempotencyKey:string}):Promise<MarketplaceActivation>;
  getActivation(activationId:string):Promise<MarketplaceActivation>;
  getBuyerState(buyerAddress:string):Promise<BuyerCommercialState>;
  assertActivationForService(input:{activationId:string;serviceId:string;buyerAddress:string}):Promise<MarketplaceActivation>;
  getActivationControl(activationId:string):Promise<ActivationControlProfile>;
  revokeActivation(activationId:string,input:{buyerAddress:string}):Promise<MarketplaceActivation>;
}

export function createCommercialEngine(options:{marketplace:MarketplaceSupplyReader;store?:CommercialStore;paymentAdapters?:CommercialPaymentAdapter[];offerOverlay?:(serviceId:string)=>Promise<ServiceOffer|undefined>;now?:()=>Date}):CommercialEngine {
  const marketplace=options.marketplace; const store=options.store??new MemoryCommercialStore(); const now=options.now??(()=>new Date());
  const adapters=new Map((options.paymentAdapters??[]).map(a=>[a.rail,a]));

  async function resolveOffer(serviceId:string,record?:MarketplaceServiceRecord):Promise<ServiceOffer>{const normalized=nonempty(serviceId,"serviceId",1024);const overlay=await options.offerOverlay?.(normalized);if(overlay)return structuredClone(overlay);const rec=record??await marketplace.getService(normalized);return structuredClone(rec.offer);}
  async function listOffers(serviceId:string):Promise<ServiceOffer[]>{const record=await marketplace.getService(nonempty(serviceId,"serviceId",1024)); return [await resolveOffer(record.service.serviceId,record)];}
  async function getQuote(id:string):Promise<CommercialQuote>{const q=await store.getQuote(nonempty(id,"quoteId",1024));if(!q)throw new CommercialError("Commercial Quote not found.","QUOTE_NOT_FOUND");return currentQuoteState(q,now());}
  async function getHire(id:string):Promise<CommercialHire>{const h=await store.getHire(nonempty(id,"hireId",1024));if(!h)throw new CommercialError("Commercial Hire not found.","HIRE_NOT_FOUND");return h;}
  async function getActivation(id:string):Promise<MarketplaceActivation>{const a=await store.getActivation(nonempty(id,"activationId",1024));if(!a)throw new CommercialError("Marketplace Activation not found.","ACTIVATION_NOT_FOUND");return a;}

  async function createQuote(input:{serviceId:string;offerId?:string;buyerAddress:string;buyerChainId:number;serviceChainId?:number;idempotencyKey:string}):Promise<CommercialQuote>{
    const buyer=normalizedAddress(input.buyerAddress,"buyerAddress"), buyerChain=chainId(input.buyerChainId), key=nonempty(input.idempotencyKey,"idempotencyKey",160), serviceId=nonempty(input.serviceId,"serviceId",1024);
    const requestedServiceChain = input.serviceChainId === undefined ? undefined : chainId(input.serviceChainId);
    const prior=await store.findQuoteByIdempotency(buyer,key);
    if(prior){
      if(prior.serviceId!==serviceId||prior.buyerChainId!==buyerChain||(input.offerId&&prior.offerId!==input.offerId)||(requestedServiceChain!==undefined&&prior.termsSnapshot.chainId!==requestedServiceChain))throw new CommercialError("This quote idempotency key was already used for different commercial input.","IDEMPOTENCY_CONFLICT");
      return currentQuoteState(prior,now());
    }
    const record=await marketplace.getService(serviceId); const offer=await resolveOffer(serviceId,record);
    if(input.offerId&&input.offerId!==offer.offerId)throw new CommercialError("The requested Offer does not belong to this AgentService.","OFFER_NOT_FOUND");
    const terms=termsForObservationChain(offer,validateOffer(offer),requestedServiceChain);
    if(isPaymentRequired(terms)&&buyerChain!==terms.chainId)throw new CommercialError(`Paid Offer settlement requires buyer chain ${terms.chainId}; received ${buyerChain}.`,"NETWORK_MISMATCH");
    const quotedAt=now(); const expiresAt=new Date(quotedAt.getTime()+terms.quoteValiditySeconds*1000).toISOString(); const hash=termsHash(terms);
    const quoteId=deterministicId("quote",buyer,key);
    const evidence=createEvidenceEnvelope({subjectType:"commercial_quote",subjectId:quoteId,metric:"commercial.quote",value:hash,provenance:"marketplace-observed",source:DATA_SOURCES.MARKETPLACE,sourceRef:offer.offerId,observedAt:quotedAt.toISOString(),confidence:"high",method:EVIDENCE_METHODS.COMMERCIAL_QUOTE,methodInputs:[offer.offerId,terms.termsVersion,buyer],limitation:"Quote terms are an immutable commercial snapshot. This evidence does not prove payment, permission, activation, execution, or outcome."});
    const quote:CommercialQuote={quoteId,offerId:offer.offerId,serviceId,buyerAddress:buyer,buyerChainId:buyerChain,state:"OPEN",termsSnapshot:terms,termsHash:hash,idempotencyKey:key,quotedAt:quotedAt.toISOString(),expiresAt,methodVersion:COMMERCIAL_KERNEL_METHOD,evidence:[evidence],limitations:["The Quote freezes Offer terms at quote time; later Offer edits do not mutate this snapshot.","Buyer address coherence is enforced by Spotriq, but this endpoint alone is not a cryptographic proof of wallet ownership."]};
    await store.saveQuote(quote); const saved=await store.getQuote(quoteId);
    if(saved&&(saved.serviceId!==serviceId||saved.offerId!==offer.offerId||saved.buyerAddress!==buyer||saved.buyerChainId!==buyerChain||saved.termsHash!==hash)) throw new CommercialError("This quote idempotency key raced with different commercial input.","IDEMPOTENCY_CONFLICT");
    return saved??quote;
  }

  async function ensureFreePaymentEvidence(hire:CommercialHire,q:CommercialQuote,observedAt?:string):Promise<CommercialHire>{
    if(hire.paymentRequired)return hire;
    const paymentId=hire.paymentEvidenceId??deterministicId("payment",hire.hireId,"FREE");
    const existing=await store.getPayment(paymentId);
    if(!existing){
      const payment:CommercialPaymentEvidence={paymentEvidenceId:paymentId,hireId:hire.hireId,serviceId:q.serviceId,buyerAddress:hire.buyerAddress,requirement:"NOT_REQUIRED",state:"NOT_REQUIRED",rail:"FREE",chainId:q.termsSnapshot.chainId,amount:"0",currency:q.termsSnapshot.price.currency,observedAt:observedAt??now().toISOString(),methodVersion:COMMERCIAL_KERNEL_METHOD,provenance:"marketplace-derived",evidence:[],limitations:["No payment is required for this FREE Offer. NOT_REQUIRED is not the same as PAID."]};
      await store.savePayment(payment);
    }
    if(hire.paymentEvidenceId===paymentId)return hire;
    const updated:CommercialHire={...hire,paymentEvidenceId:paymentId,updatedAt:now().toISOString()};
    await store.saveHire(updated);
    return updated;
  }

  async function createHire(input:{quoteId:string;buyerAddress:string;idempotencyKey:string}):Promise<CommercialHire>{
    const buyer=normalizedAddress(input.buyerAddress,"buyerAddress"),key=nonempty(input.idempotencyKey,"idempotencyKey",160),quoteId=nonempty(input.quoteId,"quoteId",1024);
    const prior=await store.findHireByIdempotency(buyer,key);
    if(prior){
      if(prior.quoteId!==quoteId)throw new CommercialError("This hire idempotency key was already used for a different Quote.","IDEMPOTENCY_CONFLICT");
      return ensureFreePaymentEvidence(prior,await getQuote(prior.quoteId));
    }
    const q=await getQuote(quoteId); if(q.buyerAddress!==buyer)throw new CommercialError("Only the Quote buyer can create this Hire.","WRONG_BUYER"); if(q.state==="EXPIRED")throw new CommercialError("This Quote expired before acceptance. Request a fresh Quote.","QUOTE_EXPIRED");
    const paymentRequired=isPaymentRequired(q.termsSnapshot),permissionRequired=isPermissionRequired(q.termsSnapshot); const acceptedAt=now().toISOString(); const hireId=deterministicId("hire",buyer,key);
    const state:CommercialHire["state"]=paymentRequired?"AWAITING_PAYMENT":permissionRequired?"AWAITING_PERMISSION":"READY_TO_ACTIVATE";
    const hire:CommercialHire={hireId,quoteId:q.quoteId,offerId:q.offerId,serviceId:q.serviceId,buyerAddress:buyer,buyerChainId:q.buyerChainId,state,termsHash:q.termsHash,paymentRequired,permissionRequired,idempotencyKey:key,acceptedAt,updatedAt:acceptedAt,methodVersion:COMMERCIAL_KERNEL_METHOD,limitations:["Hire proves buyer acceptance of the immutable Quote. It is not payment, permission, activation, execution, or outcome."]};
    await store.saveHire(hire);
    const saved=await store.getHire(hireId);
    if(saved&&(saved.quoteId!==q.quoteId||saved.buyerAddress!==buyer||saved.termsHash!==q.termsHash)) throw new CommercialError("This hire idempotency key raced with a different Quote.","IDEMPOTENCY_CONFLICT");
    return ensureFreePaymentEvidence(saved??hire,q,acceptedAt);
  }

  async function getPayment(hireId:string):Promise<CommercialPaymentEvidence>{const hire=await getHire(hireId); const payment=hire.paymentEvidenceId?await store.getPayment(hire.paymentEvidenceId):await store.getLatestPaymentForHire(hire.hireId); if(payment)return payment; const q=await getQuote(hire.quoteId); return {paymentEvidenceId:deterministicId("payment-pending",hire.hireId),hireId:hire.hireId,serviceId:hire.serviceId,buyerAddress:hire.buyerAddress,requirement:"REQUIRED",state:"PENDING",rail:q.termsSnapshot.paymentRail,chainId:q.termsSnapshot.chainId,amount:q.termsSnapshot.price.amount,currency:q.termsSnapshot.price.currency,tokenAddress:q.termsSnapshot.price.tokenAddress,observedAt:now().toISOString(),methodVersion:COMMERCIAL_KERNEL_METHOD,provenance:"marketplace-derived",evidence:[],limitations:["No independently reconciled payment/funding evidence exists yet."]};}

  async function reconcilePayment(hireId:string,input:{buyerAddress:string;reference:{jobId?:string;transactionHash?:string}}):Promise<CommercialPaymentEvidence>{
    const hire=await getHire(hireId),buyer=normalizedAddress(input.buyerAddress,"buyerAddress"); if(hire.buyerAddress!==buyer)throw new CommercialError("Only the Hire buyer can reconcile its payment.","WRONG_BUYER"); const quote=await getQuote(hire.quoteId);
    if(!hire.paymentRequired)return getPayment(hire.hireId);
    const rail=quote.termsSnapshot.paymentRail; if(rail==="FREE")throw new CommercialError("This Hire does not require payment reconciliation.","INVALID_INPUT"); const adapter=adapters.get(rail as "ERC8183"|"X402"|"B402"); if(!adapter)throw new CommercialError(`${rail} is represented by the commercial kernel but no live payment adapter is configured for this deployment.`,"PAYMENT_ADAPTER_UNAVAILABLE");
    const payment=await adapter.reconcile({hire,quote,terms:quote.termsSnapshot,reference:input.reference??{},now:now()});
    if(payment.providerRef){const priorPayment=await store.findPaymentByProviderRef(payment.rail,payment.providerRef);if(priorPayment&&priorPayment.hireId!==hire.hireId)throw new CommercialError("This external payment/funding reference is already reconciled to a different Hire.","PAYMENT_MISMATCH");}
    if(payment.observation?.kind==="HTTP402_SETTLEMENT"&&payment.observation.transferLogIndex!==undefined){const priorSettlement=await store.findPaymentBySettlementRef(payment.observation.transactionHash,payment.observation.transferLogIndex);if(priorSettlement&&priorSettlement.hireId!==hire.hireId)throw new CommercialError("This on-chain settlement transfer is already reconciled to a different Hire.","PAYMENT_MISMATCH");}
    await store.savePayment(payment);
    const updated:CommercialHire={...hire,paymentEvidenceId:payment.paymentEvidenceId,state:payment.state==="VERIFIED"?(hire.permissionRequired?"AWAITING_PERMISSION":"READY_TO_ACTIVATE"):"AWAITING_PAYMENT",updatedAt:now().toISOString()}; await store.saveHire(updated); return payment;
  }

  async function activate(hireId:string,input:{buyerAddress:string;idempotencyKey:string}):Promise<MarketplaceActivation>{
    const hire=await getHire(hireId),buyer=normalizedAddress(input.buyerAddress,"buyerAddress"),key=nonempty(input.idempotencyKey,"idempotencyKey",160);
    if(hire.buyerAddress!==buyer)throw new CommercialError("Only the Hire buyer can activate this service relationship.","WRONG_BUYER");
    const priorByKey=await store.findActivationByIdempotency(buyer,key); if(priorByKey){if(priorByKey.hireId!==hire.hireId)throw new CommercialError("This activation idempotency key was already used for a different Hire.","IDEMPOTENCY_CONFLICT");return priorByKey;}
    const prior=await store.getActivationForHire(hire.hireId); if(prior)return prior;
    const quote=await getQuote(hire.quoteId),record=await marketplace.getService(hire.serviceId),currentOffer=await resolveOffer(hire.serviceId,record);
    if(currentOffer.offerId!==hire.offerId)throw new CommercialError("The hired Offer is no longer the current Offer for this service.","OFFER_STALE");
    const currentTerms=termsForObservationChain(currentOffer,validateOffer(currentOffer),quote.termsSnapshot.chainId);
    if(termsHash(currentTerms)!==quote.termsHash)throw new CommercialError("The service Offer changed after this Quote was accepted. Request a fresh Quote before activation.","OFFER_STALE");
    requireCommercialServiceReady(record,quote.termsSnapshot,currentOffer);
    if(hire.paymentRequired){const p=await store.getLatestPaymentForHire(hire.hireId);if(!p||p.state!=="VERIFIED")throw new CommercialError("Independent payment/funding evidence is required before activation.","PAYMENT_REQUIRED");}
    if(hire.permissionRequired)throw new CommercialError("This Offer requires financial permission/authority. v0.23 never treats commercial Hire or payment as permission; activate it only after a future explicit permission reconciliation path is connected.","PERMISSION_REQUIRED");
    if(quote.termsSnapshot.serviceType!=="READ_ONLY_SERVICE")throw new CommercialError("v0.23 live marketplace activation is limited to read-only service relationships; financial execution remains gated.","PERMISSION_REQUIRED");
    const activatedAt=now().toISOString(),activationId=deterministicId("activation",hire.hireId);
    const claim=await store.claimActivationIdempotency(buyer,key,hire.hireId,activationId,activatedAt);
    if(claim.hireId!==hire.hireId||claim.activationId!==activationId)throw new CommercialError("This activation idempotency key was concurrently claimed for a different Hire.","IDEMPOTENCY_CONFLICT");
    const evidence=createEvidenceEnvelope({subjectType:"marketplace_activation",subjectId:activationId,metric:"commercial.activation",value:"ACTIVE_READ_ONLY",provenance:"marketplace-observed",source:DATA_SOURCES.MARKETPLACE,sourceRef:hire.hireId,observedAt:activatedAt,confidence:"high",method:EVIDENCE_METHODS.COMMERCIAL_ACTIVATION,methodInputs:[hire.hireId,quote.termsHash,record.readiness.readinessSnapshotId],limitation:"This activation proves a Spotriq read-only service relationship only. It grants no wallet signing, fund movement, strategy execution, or autonomous transaction authority."});
    const activation:MarketplaceActivation={activationId,hireId:hire.hireId,quoteId:hire.quoteId,serviceId:hire.serviceId,buyerAddress:buyer,buyerChainId:hire.buyerChainId,serviceChainId:quote.termsSnapshot.chainId,state:"ACTIVE",activationKind:"READ_ONLY_SERVICE_RELATIONSHIP",termsSnapshot:quote.termsSnapshot,termsHash:quote.termsHash,paymentRequired:hire.paymentRequired,paymentEvidenceId:hire.paymentEvidenceId,permissionRequired:false,walletSigningAuthorityGranted:false,financialExecutionAuthorityGranted:false,idempotencyKey:key,activatedAt,updatedAt:activatedAt,methodVersion:COMMERCIAL_KERNEL_METHOD,evidence:[evidence],limitations:["This activates a read-only Spotriq service relationship. It does not grant wallet signing or transaction authority.","Activation is separate from ServiceTask invocation, AgentAction, blockchain Transaction, and financial Outcome.",...(quote.termsSnapshot.chainId===56?["BSC Mainnet is observation-only for this Activation. Financial execution remains disabled on chain 56."]:[])]};
    await store.saveActivation(activation); const updatedHire:CommercialHire={...hire,state:"ACTIVATED",activationId,paymentEvidenceId:hire.paymentEvidenceId,updatedAt:activatedAt}; await store.saveHire(updatedHire); return activation;
  }

  async function getBuyerState(address:string):Promise<BuyerCommercialState>{const buyer=normalizedAddress(address,"address"); const [quotes,hires,payments,activations]=await Promise.all([store.listQuotes(buyer),store.listHires(buyer),store.listPayments(buyer),store.listActivations(buyer)]); const at=now(); return {buyerAddress:buyer,quotes:quotes.map(q=>currentQuoteState(q,at)),hires,payments,activations,generatedAt:at.toISOString(),methodVersion:COMMERCIAL_KERNEL_METHOD,limitations:["Buyer commercial state describes Offer/Quote/Hire/Payment/Activation only. It is separate from My Agents authority, execution, activity, and outcome state."]};}
  async function assertActivationForService(input:{activationId:string;serviceId:string;buyerAddress:string}):Promise<MarketplaceActivation>{const a=await getActivation(input.activationId),buyer=normalizedAddress(input.buyerAddress,"buyerAddress"); if(a.state!=="ACTIVE")throw new CommercialError("The supplied Activation is not active.","SERVICE_NOT_READY"); if(a.serviceId!==input.serviceId)throw new CommercialError("The supplied Activation belongs to a different AgentService.","WRONG_SERVICE"); if(a.buyerAddress!==buyer)throw new CommercialError("The supplied Activation belongs to a different buyer wallet.","WRONG_BUYER"); return a;}

  async function getActivationControl(activationId:string):Promise<ActivationControlProfile>{
    const activation=await getActivation(activationId);
    const record=await marketplace.getService(activation.serviceId);
    const category=record.service.category;
    const capability=category==="rebalancing"
      ? {code:"ANALYZE_POSITION" as const,label:"Analyze PancakeSwap position",mode:"READ_ONLY" as const,inputRequirements:["tokenId"]}
      : category==="grid"
        ? {code:"ANALYZE_GRID_MARKET" as const,label:"Analyze PancakeSwap grid market context",mode:"READ_ONLY" as const,inputRequirements:["poolAddress","optional capital context"]}
        : category==="yield"
          ? {code:"SCAN_YIELD_OPPORTUNITIES" as const,label:"Scan supported Venus yield opportunities",mode:"READ_ONLY" as const,inputRequirements:["buyer wallet (server-derived)"]}
          : {code:"INSPECT_HEALTH" as const,label:"Inspect Venus health state",mode:"READ_ONLY" as const,inputRequirements:["buyer wallet (server-derived)"]};
    const readOnly=category==="rebalancing"
      ? ["Read supported PancakeSwap position and range state"]
      : category==="grid"
        ? ["Read supported PancakeSwap V3 pool and TWAP market context"]
        : category==="yield"
          ? ["Read current supported Venus supply-yield opportunity data"]
          : ["Read current Venus lending positions, liquidity and shortfall health state"];
    return {
      activationId:activation.activationId,serviceId:activation.serviceId,buyerAddress:activation.buyerAddress,category,activationState:activation.state,
      controlTier:activation.financialExecutionAuthorityGranted?"BOUNDED_FINANCIAL":"READ_ONLY",runtimeCapability:capability,
      permissions:{readOnly,financialWrite:[],walletSigningAuthorityGranted:activation.walletSigningAuthorityGranted,financialExecutionAuthorityGranted:activation.financialExecutionAuthorityGranted,permissionGrantId:activation.permissionGrantId},
      revocable:activation.state==="ACTIVE",
      revokeEffect:"Revoking this marketplace relationship stops new activation-bound service tasks. It does not erase commercial history and is separate from revoking any independently granted financial permission.",
      methodVersion:COMMERCIAL_KERNEL_METHOD,
      limitations:[
        "The current four reference-service activation path is read-only; no wallet signing or financial execution authority is implied.",
        category==="grid"?"Grid analysis does not authorize orders, capital deployment or strategy execution.":category==="yield"?"Yield observations describe current supported opportunities; they do not prove realised yield.":category==="health"?"Health monitoring is observational; protective writes require a separate authority tier.":"Read-only position analysis is separate from Spotriq's controlled Rebalancing execution spine."
      ],
    };
  }

  async function revokeActivation(activationId:string,input:{buyerAddress:string}):Promise<MarketplaceActivation>{
    const activation=await getActivation(activationId);
    const buyer=normalizedAddress(input.buyerAddress,"buyerAddress");
    if(activation.buyerAddress!==buyer)throw new CommercialError("Only the Activation buyer can revoke this marketplace relationship.","WRONG_BUYER");
    if(activation.state==="REVOKED")return activation;
    if(activation.state!=="ACTIVE")throw new CommercialError(`Activation ${activation.activationId} is ${activation.state.toLowerCase()} and cannot be revoked as an active relationship.`,"SERVICE_NOT_READY");
    const updatedAt=now().toISOString();
    const evidence=createEvidenceEnvelope({subjectType:"marketplace_activation",subjectId:activation.activationId,metric:"commercial.activation_state",value:"REVOKED",provenance:"marketplace-observed",source:DATA_SOURCES.MARKETPLACE,sourceRef:activation.hireId,observedAt:updatedAt,confidence:"high",method:EVIDENCE_METHODS.COMMERCIAL_ACTIVATION,methodInputs:[activation.activationId,activation.hireId,buyer],limitation:"This records revocation of the Spotriq marketplace service relationship only. Independent permission grants, transactions and historical outcomes are separate resources."});
    const revoked:MarketplaceActivation={...activation,state:"REVOKED",updatedAt,evidence:[...activation.evidence,evidence],limitations:[...activation.limitations,"This marketplace service relationship was revoked. Commercial history is retained; any independently issued financial permission must be revoked through its own authority mechanism."]};
    await store.saveActivation(revoked);
    return revoked;
  }

  return {listOffers,createQuote,getQuote,createHire,getHire,getPayment,reconcilePayment,activate,getActivation,getBuyerState,assertActivationForService,getActivationControl,revokeActivation};
}
