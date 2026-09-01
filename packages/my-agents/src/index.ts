import { createHash } from "node:crypto";
import type {
  MarketplaceActivation,
  MarketplaceServiceRecord,
  MyAgentAlternative,
  MyAgentPortfolioItem,
  MyAgentsPortfolio,
  MyAgentSwitchRecord,
  ServiceCategory,
} from "@spotriq/domain";
import type { CommercialEngine } from "@spotriq/commercial";
import type { MarketplaceSupplyReader } from "@spotriq/marketplace-supply";
import type { PermissionCheckoutEngine } from "@spotriq/permission-checkout";
import type { ActivationActivityOutcomesEngine } from "@spotriq/activity-outcomes";

export const MY_AGENTS_METHOD = "my-agents.portfolio-switching@1.0.0";
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export class MyAgentsError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_INPUT"
      | "WRONG_BUYER"
      | "ACTIVATION_NOT_ACTIVE"
      | "SAME_SERVICE"
      | "CATEGORY_MISMATCH"
      | "NETWORK_MISMATCH"
      | "TARGET_NOT_ELIGIBLE"
      | "ACTIVE_PERMISSION_GRANT"
      | "IDEMPOTENCY_CONFLICT",
    public readonly retryable = false,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "MyAgentsError";
  }
}

function address(value: string | undefined, label: string): string {
  if (!value || !ADDRESS.test(value)) throw new MyAgentsError(`${label} must be a valid EVM address.`, "INVALID_INPUT");
  return value.toLowerCase();
}
function text(value: string | undefined, label: string, max = 1024): string {
  const v = value?.trim();
  if (!v || v.length > max) throw new MyAgentsError(`${label} is required.`, "INVALID_INPUT");
  return v;
}
function id(prefix: string, ...parts: string[]): string {
  return `${prefix}:${createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 32)}`;
}
function clone<T>(value: T): T { return structuredClone(value); }

export interface SqlQueryExecutor {
  query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{ rows: Row[]; rowCount?: number | null }>;
}

export interface MyAgentsStore {
  saveSwitch(record: MyAgentSwitchRecord): Promise<void>;
  getSwitch(switchId: string): Promise<MyAgentSwitchRecord | undefined>;
  findSwitchByIdempotency(buyerAddress: string, idempotencyKey: string): Promise<MyAgentSwitchRecord | undefined>;
  listSwitches(buyerAddress: string): Promise<MyAgentSwitchRecord[]>;
}

export class MemoryMyAgentsStore implements MyAgentsStore {
  private readonly switches = new Map<string, MyAgentSwitchRecord>();
  async saveSwitch(record: MyAgentSwitchRecord): Promise<void> {
    const existing = this.switches.get(record.switchId);
    if (existing && (existing.buyerAddress !== record.buyerAddress || existing.sourceActivationId !== record.sourceActivationId || existing.targetServiceId !== record.targetServiceId)) return;
    this.switches.set(record.switchId, clone(record));
  }
  async getSwitch(switchId: string): Promise<MyAgentSwitchRecord | undefined> { const v = this.switches.get(switchId); return v ? clone(v) : undefined; }
  async findSwitchByIdempotency(buyerAddress: string, idempotencyKey: string): Promise<MyAgentSwitchRecord | undefined> {
    const v = [...this.switches.values()].find(x => x.buyerAddress === buyerAddress && x.idempotencyKey === idempotencyKey);
    return v ? clone(v) : undefined;
  }
  async listSwitches(buyerAddress: string): Promise<MyAgentSwitchRecord[]> {
    return [...this.switches.values()].filter(x => x.buyerAddress === buyerAddress).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(clone);
  }
}

export class PostgresMyAgentsStore implements MyAgentsStore {
  constructor(private readonly db: SqlQueryExecutor) {}
  async saveSwitch(record: MyAgentSwitchRecord): Promise<void> {
    await this.db.query(
      `insert into my_agent_switches (switch_id,buyer_address,source_activation_id,source_service_id,target_service_id,category,state,idempotency_key,payload,created_at,updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)
       on conflict (switch_id) do update set state=excluded.state,payload=excluded.payload,updated_at=excluded.updated_at
       where my_agent_switches.buyer_address=excluded.buyer_address
         and my_agent_switches.source_activation_id=excluded.source_activation_id
         and my_agent_switches.target_service_id=excluded.target_service_id`,
      [record.switchId,record.buyerAddress,record.sourceActivationId,record.sourceServiceId,record.targetServiceId,record.category,record.state,record.idempotencyKey,JSON.stringify(record),record.createdAt,record.updatedAt],
    );
  }
  async getSwitch(switchId: string): Promise<MyAgentSwitchRecord | undefined> {
    return (await this.db.query<{ payload: MyAgentSwitchRecord }>("select payload from my_agent_switches where switch_id=$1", [switchId])).rows[0]?.payload;
  }
  async findSwitchByIdempotency(buyerAddress: string, idempotencyKey: string): Promise<MyAgentSwitchRecord | undefined> {
    return (await this.db.query<{ payload: MyAgentSwitchRecord }>("select payload from my_agent_switches where buyer_address=$1 and idempotency_key=$2 limit 1", [buyerAddress,idempotencyKey])).rows[0]?.payload;
  }
  async listSwitches(buyerAddress: string): Promise<MyAgentSwitchRecord[]> {
    return (await this.db.query<{ payload: MyAgentSwitchRecord }>("select payload from my_agent_switches where buyer_address=$1 order by created_at desc", [buyerAddress])).rows.map(r => r.payload);
  }
}

export interface MyAgentsEngine {
  getPortfolio(buyerAddress: string): Promise<MyAgentsPortfolio>;
  switchService(input: { buyerAddress: string; sourceActivationId: string; targetServiceId: string; idempotencyKey: string }): Promise<MyAgentSwitchRecord>;
  revokeRelationship(input: { buyerAddress: string; activationId: string }): Promise<MarketplaceActivation>;
  listSwitches(buyerAddress: string): Promise<MyAgentSwitchRecord[]>;
}

function alternative(record: MarketplaceServiceRecord, source: MarketplaceActivation): MyAgentAlternative {
  const terms = record.offer.terms;
  const sameNetwork = terms?.chainId === source.serviceChainId;
  const freeReadOnly = record.offer.state === "AVAILABLE" && terms?.availability === "AVAILABLE" && terms.commercialModel === "FREE" && terms.paymentRail === "FREE" && terms.serviceType === "READ_ONLY_SERVICE" && !terms.scope.financialAuthorityRequired && !terms.scope.walletSigningRequired;
  const readinessOk = !["OFFLINE", "DEGRADED", "SUSPENDED"].includes(record.readiness.state);
  const eligible = record.service.serviceId !== source.serviceId && sameNetwork && freeReadOnly && readinessOk;
  const reason = record.service.serviceId === source.serviceId
    ? "This is the currently active service."
    : !sameNetwork
      ? `Service commercial network does not match active chain ${source.serviceChainId}.`
      : !freeReadOnly
        ? "Only truthful FREE read-only replacement offers are switchable in v0.28."
        : !readinessOk
          ? `Service readiness is ${record.readiness.state}.`
          : "Eligible same-category FREE read-only alternative.";
  return { serviceId: record.service.serviceId, name: record.service.name, category: record.service.category, readiness: record.readiness.state, serviceChainId: terms?.chainId, commercialModel: terms?.commercialModel, serviceType: terms?.serviceType, eligible, reason };
}

export function createMyAgentsEngine(options: {
  store?: MyAgentsStore;
  commercial: CommercialEngine;
  marketplace: MarketplaceSupplyReader;
  permissionCheckout: PermissionCheckoutEngine;
  activityOutcomes: ActivationActivityOutcomesEngine;
  now?: () => Date;
}): MyAgentsEngine {
  const store = options.store ?? new MemoryMyAgentsStore();
  const now = options.now ?? (() => new Date());

  async function permissionForActivation(activationId: string) {
    const checkout = await options.permissionCheckout.getForActivation(activationId);
    const request = checkout?.permissionRequestId ? await options.permissionCheckout.getRequest(checkout.permissionRequestId) : undefined;
    return { checkout, request };
  }

  async function hasActiveGrant(activationId: string): Promise<{ active: boolean; grantId?: string }> {
    const { request } = await permissionForActivation(activationId);
    return { active: request?.state === "GRANT_RECONCILED" && Boolean(request.permissionGrantId), grantId: request?.permissionGrantId };
  }

  const categoryCache = new Map<ServiceCategory, Promise<MarketplaceServiceRecord[]>>();
  async function categoryServices(category: ServiceCategory): Promise<MarketplaceServiceRecord[]> {
    let value = categoryCache.get(category);
    if (!value) {
      value = options.marketplace.listServices({ category, limit: 100 }).then(page => page.services);
      categoryCache.set(category, value);
    }
    return value;
  }

  async function portfolioItem(activation: MarketplaceActivation): Promise<MyAgentPortfolioItem> {
    const [record, control, permission, services] = await Promise.all([
      options.marketplace.getService(activation.serviceId),
      options.commercial.getActivationControl(activation.activationId),
      permissionForActivation(activation.activationId),
      options.marketplace.getService(activation.serviceId).then(r => categoryServices(r.service.category)),
    ]);
    let activityOutcome: MyAgentPortfolioItem["activityOutcome"];
    try { activityOutcome = await options.activityOutcomes.get(activation.activationId); } catch { activityOutcome = undefined; }
    const grant = permission.request?.state === "GRANT_RECONCILED" && Boolean(permission.request.permissionGrantId);
    const alternatives = services.filter(x => x.service.category === record.service.category).map(x => alternative(x, activation));
    return {
      activation,
      service: record.service,
      readiness: record.readiness,
      control,
      permissionCheckout: permission.checkout,
      permissionRequest: permission.request,
      activityOutcome,
      relationshipBucket: activation.state === "ACTIVE" ? "ACTIVE" : "HISTORY",
      hasReconciledPermissionGrant: grant,
      canEndRelationship: activation.state === "ACTIVE" && !grant,
      endRelationshipBlocker: grant ? `PermissionGrant ${permission.request?.permissionGrantId} is independently active. Revoke that grant through its authority provider before ending or switching this marketplace relationship.` : undefined,
      alternatives,
    };
  }

  async function getPortfolio(buyerAddress: string): Promise<MyAgentsPortfolio> {
    categoryCache.clear();
    const buyer = address(buyerAddress, "buyerAddress");
    const commercial = await options.commercial.getBuyerState(buyer);
    const items = await Promise.all(commercial.activations.map(portfolioItem));
    const switches = await store.listSwitches(buyer);
    return {
      buyerAddress: buyer,
      active: items.filter(x => x.relationshipBucket === "ACTIVE"),
      history: items.filter(x => x.relationshipBucket === "HISTORY"),
      switches,
      generatedAt: now().toISOString(),
      methodVersion: MY_AGENTS_METHOD,
      limitations: [
        "My Agents aggregates existing Spotriq resources; it does not merge Payment, Permission, Activation, Runtime, Transaction or Outcome into one status.",
        "Financial performance is shown only when independently supported by outcome evidence. Missing transaction/outcome evidence remains Could Not Assess.",
        "Switching in v0.28 is limited to same-category, same-network FREE read-only alternatives and fails closed when an independently reconciled PermissionGrant would be stranded.",
      ],
    };
  }

  async function blockedSwitch(input: { buyer: string; source: MarketplaceActivation; targetServiceId: string; key: string; category: ServiceCategory; blockers: string[] }): Promise<MyAgentSwitchRecord> {
    const at = now().toISOString();
    const record: MyAgentSwitchRecord = {
      switchId: id("agent-switch", input.buyer, input.key), buyerAddress: input.buyer, sourceActivationId: input.source.activationId, sourceServiceId: input.source.serviceId, targetServiceId: input.targetServiceId, category: input.category, state: "BLOCKED", idempotencyKey: input.key, blockers: input.blockers, createdAt: at, updatedAt: at, methodVersion: MY_AGENTS_METHOD,
      limitations: ["A BLOCKED switch changes no Activation and revokes no PermissionGrant.", "Commercial activation and independent financial authority remain separate resources."],
    };
    await store.saveSwitch(record);
    const saved = await store.getSwitch(record.switchId);
    if (saved && (saved.sourceActivationId !== record.sourceActivationId || saved.targetServiceId !== record.targetServiceId || saved.buyerAddress !== record.buyerAddress)) throw new MyAgentsError("This switching idempotency key raced with different immutable switch input.", "IDEMPOTENCY_CONFLICT");
    return saved ?? record;
  }

  async function switchService(input: { buyerAddress: string; sourceActivationId: string; targetServiceId: string; idempotencyKey: string }): Promise<MyAgentSwitchRecord> {
    const buyer = address(input.buyerAddress, "buyerAddress");
    const sourceActivationId = text(input.sourceActivationId, "sourceActivationId");
    const targetServiceId = text(input.targetServiceId, "targetServiceId");
    const key = text(input.idempotencyKey, "idempotencyKey", 160);
    const existing = await store.findSwitchByIdempotency(buyer, key);
    if (existing) {
      if (existing.sourceActivationId !== sourceActivationId || existing.targetServiceId !== targetServiceId) throw new MyAgentsError("This switching idempotency key was already used with different source/target input.", "IDEMPOTENCY_CONFLICT");
      return existing;
    }
    const source = await options.commercial.getActivation(sourceActivationId);
    if (source.buyerAddress !== buyer) throw new MyAgentsError("The source Activation belongs to a different buyer.", "WRONG_BUYER");
    const sourceRecord = await options.marketplace.getService(source.serviceId);
    if (source.state !== "ACTIVE") return blockedSwitch({ buyer, source, targetServiceId, key, category: sourceRecord.service.category, blockers: [`Source Activation is ${source.state}.`] });
    if (source.serviceId === targetServiceId) return blockedSwitch({ buyer, source, targetServiceId, key, category: sourceRecord.service.category, blockers: ["The target service is already active; switching to the same AgentService is not a state transition."] });
    const target = await options.marketplace.getService(targetServiceId);
    if (target.service.category !== sourceRecord.service.category) return blockedSwitch({ buyer, source, targetServiceId, key, category: sourceRecord.service.category, blockers: [`Target category ${target.service.category} does not match ${sourceRecord.service.category}.`] });
    const candidate = alternative(target, source);
    if (!candidate.eligible) return blockedSwitch({ buyer, source, targetServiceId, key, category: sourceRecord.service.category, blockers: [candidate.reason] });
    const grant = await hasActiveGrant(source.activationId);
    if (grant.active) return blockedSwitch({ buyer, source, targetServiceId, key, category: sourceRecord.service.category, blockers: [`PermissionGrant ${grant.grantId} is independently reconciled and must be revoked through its authority provider before switching.`] });

    const quote = await options.commercial.createQuote({ serviceId: targetServiceId, buyerAddress: buyer, buyerChainId: source.buyerChainId, idempotencyKey: `switch:${id("quote",buyer,key)}` });
    const hire = await options.commercial.createHire({ quoteId: quote.quoteId, buyerAddress: buyer, idempotencyKey: `switch:${id("hire",buyer,key)}` });
    const replacement = await options.commercial.activate(hire.hireId, { buyerAddress: buyer, idempotencyKey: `switch:${id("activation",buyer,key)}` });
    await options.commercial.revokeActivation(source.activationId, { buyerAddress: buyer });
    const at = now().toISOString();
    const record: MyAgentSwitchRecord = {
      switchId: id("agent-switch",buyer,key), buyerAddress: buyer, sourceActivationId: source.activationId, sourceServiceId: source.serviceId, targetServiceId, category: sourceRecord.service.category, state: "COMPLETED", idempotencyKey: key, replacementActivationId: replacement.activationId, blockers: [], createdAt: at, updatedAt: at, completedAt: at, methodVersion: MY_AGENTS_METHOD,
      limitations: ["The replacement Activation was established before the old marketplace relationship was revoked.", "Switching did not revoke or manufacture a PermissionGrant. Independent financial authority must be handled through its provider."],
    };
    await store.saveSwitch(record);
    const saved = await store.getSwitch(record.switchId);
    if (saved && (saved.sourceActivationId !== source.activationId || saved.targetServiceId !== targetServiceId || saved.buyerAddress !== buyer)) throw new MyAgentsError("This switching idempotency key raced with different immutable switch input.", "IDEMPOTENCY_CONFLICT");
    return saved ?? record;
  }

  async function revokeRelationship(input: { buyerAddress: string; activationId: string }): Promise<MarketplaceActivation> {
    const buyer = address(input.buyerAddress, "buyerAddress");
    const activation = await options.commercial.getActivation(text(input.activationId, "activationId"));
    if (activation.buyerAddress !== buyer) throw new MyAgentsError("The Activation belongs to a different buyer.", "WRONG_BUYER");
    if (activation.state !== "ACTIVE") return activation;
    const grant = await hasActiveGrant(activation.activationId);
    if (grant.active) throw new MyAgentsError(`PermissionGrant ${grant.grantId} is independently reconciled. Revoke the provider grant before ending this marketplace relationship.`, "ACTIVE_PERMISSION_GRANT");
    return options.commercial.revokeActivation(activation.activationId, { buyerAddress: buyer });
  }

  return { getPortfolio, switchService, revokeRelationship, listSwitches: async buyerAddress => store.listSwitches(address(buyerAddress,"buyerAddress")) };
}
