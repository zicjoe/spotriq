import type {
  CheckSession,
  Finding,
  FindingServiceMatch,
  RebalancingJobConstraints,
  RebalancingJobIntent,
} from "@spotriq/domain";

export const REBALANCING_JOB_INTENT_METHOD = "marketplace.rebalancing-job-intent@1.0.0";

export class JobIntentError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_INPUT" | "UNSUPPORTED_FINDING" | "MATCH_REQUIRED" | "JOB_INTENT_NOT_FOUND" | "INVALID_STATE",
    public readonly retryable = false,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "JobIntentError";
  }
}

export interface JobIntentStore {
  save(intent: RebalancingJobIntent): Promise<void>;
  get(jobIntentId: string): Promise<RebalancingJobIntent | undefined>;
}

export class MemoryJobIntentStore implements JobIntentStore {
  private readonly intents = new Map<string, RebalancingJobIntent>();

  async save(intent: RebalancingJobIntent): Promise<void> {
    this.intents.set(intent.jobIntentId, structuredClone(intent));
  }

  async get(jobIntentId: string): Promise<RebalancingJobIntent | undefined> {
    const intent = this.intents.get(jobIntentId);
    return intent ? structuredClone(intent) : undefined;
  }
}

export interface SqlQueryResult<Row = Record<string, unknown>> {
  rows: Row[];
  rowCount?: number | null;
}

export interface SqlQueryExecutor {
  query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<SqlQueryResult<Row>>;
}

export class PostgresJobIntentStore implements JobIntentStore {
  constructor(private readonly database: SqlQueryExecutor) {}

  async save(intent: RebalancingJobIntent): Promise<void> {
    await this.database.query(
      `
        insert into checkouts (checkout_id, service_id, status, job_context, expires_at, created_at, updated_at)
        values ($1,$2,$3,$4::jsonb,$5,$6,$7)
        on conflict (checkout_id) do update set
          service_id=excluded.service_id,
          status=excluded.status,
          job_context=excluded.job_context,
          expires_at=excluded.expires_at,
          updated_at=excluded.updated_at
      `,
      [
        intent.jobIntentId,
        intent.selectedService.serviceId,
        intent.state,
        JSON.stringify(intent),
        intent.expiresAt,
        intent.createdAt,
        intent.updatedAt,
      ],
    );
  }

  async get(jobIntentId: string): Promise<RebalancingJobIntent | undefined> {
    const result = await this.database.query<{ job_context: RebalancingJobIntent }>(
      "select job_context from checkouts where checkout_id = $1",
      [jobIntentId],
    );
    return result.rows[0]?.job_context;
  }
}

export interface PrepareRebalancingJobIntentInput {
  session: CheckSession;
  finding: Finding;
  match: FindingServiceMatch;
  constraints?: Partial<Omit<RebalancingJobConstraints, "executionMode" | "maxActionCount">>;
  now?: Date;
}

export interface JobIntentEngine {
  prepare(input: PrepareRebalancingJobIntentInput): Promise<RebalancingJobIntent>;
  get(jobIntentId: string): Promise<RebalancingJobIntent>;
  revise(jobIntentId: string, constraints: Partial<Omit<RebalancingJobConstraints, "executionMode" | "maxActionCount">>): Promise<RebalancingJobIntent>;
  confirm(jobIntentId: string): Promise<RebalancingJobIntent>;
}

function asString(subject: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = subject?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(subject: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = subject?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizedConstraints(
  input: Partial<Omit<RebalancingJobConstraints, "executionMode" | "maxActionCount">> | undefined,
): RebalancingJobConstraints {
  const maxSlippageBps = input?.maxSlippageBps ?? 50;
  const validForMinutes = input?.validForMinutes ?? 30;
  const allowSwapPreparation = input?.allowSwapPreparation ?? false;
  if (!Number.isInteger(maxSlippageBps) || maxSlippageBps < 1 || maxSlippageBps > 500) {
    throw new JobIntentError("maxSlippageBps must be an integer between 1 and 500.", "INVALID_INPUT");
  }
  if (!Number.isInteger(validForMinutes) || validForMinutes < 5 || validForMinutes > 1_440) {
    throw new JobIntentError("validForMinutes must be an integer between 5 and 1440.", "INVALID_INPUT");
  }
  if (typeof allowSwapPreparation !== "boolean") {
    throw new JobIntentError("allowSwapPreparation must be a boolean.", "INVALID_INPUT");
  }
  return {
    executionMode: "PREPARE_ONLY",
    maxSlippageBps,
    maxActionCount: 1,
    validForMinutes,
    allowSwapPreparation,
  };
}

function deterministicIntentId(findingId: string, serviceId: string): string {
  return `job:rebalancing:${encodeURIComponent(findingId)}:${encodeURIComponent(serviceId)}`;
}

function authorityBlockers(session: CheckSession, match: FindingServiceMatch): string[] {
  const blockers = new Set<string>();
  if (session.walletControl !== "VERIFIED_CONTROL") blockers.add("Wallet control has not been verified for this Smart Money Check.");
  if (match.service.permissionProfile.declarationState !== "DECLARED") blockers.add("The selected service does not yet publish an explicit permission profile.");
  if (!match.activationEligible) blockers.add(`The selected service is ${match.service.readiness.state} and is not activation-eligible.`);
  blockers.add("Spotriq v0.14 creates a reviewable PREPARE_ONLY job intent and performs no financial execution.");
  return [...blockers];
}

function buildIntent(input: PrepareRebalancingJobIntentInput, existing?: RebalancingJobIntent): RebalancingJobIntent {
  const { session, finding, match } = input;
  if (finding.category !== "rebalancing") {
    throw new JobIntentError("Only Rebalancing findings can become a v0.14 job intent.", "UNSUPPORTED_FINDING");
  }
  if (match.findingId !== finding.findingId || match.service.service.category !== "rebalancing") {
    throw new JobIntentError("The selected service match does not belong to this Rebalancing finding.", "MATCH_REQUIRED");
  }
  const subject = finding.subject;
  const protocol = asString(subject, "protocol");
  const version = asString(subject, "version");
  const tokenId = asString(subject, "tokenId");
  const pair = asString(subject, "pair");
  const tickLower = asNumber(subject, "tickLower");
  const tickUpper = asNumber(subject, "tickUpper");
  const currentTick = asNumber(subject, "currentTick");
  const rangeState = asString(subject, "rangeState");
  const blockNumber = asString(subject, "blockNumber");
  const network = asString(subject, "network");
  if (protocol !== "PancakeSwap" || (version !== "V3" && version !== "INFINITY_CL") || !tokenId || !pair || tickLower === undefined || tickUpper === undefined || currentTick === undefined || !rangeState || !blockNumber || (network !== "mainnet" && network !== "testnet")) {
    throw new JobIntentError("The Rebalancing finding does not contain the exact structured PancakeSwap LP context required for a reviewable job intent.", "INVALID_INPUT", false, { findingId: finding.findingId });
  }

  const now = input.now ?? new Date();
  const constraints = normalizedConstraints(input.constraints ?? existing?.constraints);
  const createdAt = existing?.createdAt ?? now.toISOString();
  const expiresAt = new Date(now.getTime() + constraints.validForMinutes * 60_000).toISOString();
  const readinessEvidenceIds = match.service.readiness.checks?.flatMap((check) => check.evidenceIds ?? []) ?? [];
  const serviceEvidenceIds = match.service.evidence.map((evidence) => evidence.evidenceId);
  const authority = {
    state: "UNRESOLVED" as const,
    requiredBeforeExecution: true as const,
    permissionProfileId: match.service.permissionProfile.permissionProfileId,
    declarationState: match.service.permissionProfile.declarationState ?? "UNDECLARED",
    walletControl: session.walletControl,
    blockers: authorityBlockers(session, match),
  };

  return {
    jobIntentId: deterministicIntentId(finding.findingId, match.serviceId),
    state: existing?.state === "AWAITING_AUTHORITY" ? "AWAITING_AUTHORITY" : "REVIEWABLE",
    executionState: "NO_EXECUTION",
    category: "rebalancing",
    checkSessionId: session.checkSessionId,
    findingId: finding.findingId,
    walletAddress: session.walletAddress,
    walletControl: session.walletControl,
    requestedAction: {
      code: "PREPARE_RANGE_REBALANCE",
      label: "Prepare a PancakeSwap range rebalance",
      description: "Ask the selected service to prepare a bounded range-management plan for this exact LP position. No transaction or asset movement is authorized in v0.14.",
    },
    subject: {
      protocol: "PancakeSwap",
      version,
      network,
      tokenId,
      positionManager: asString(subject, "positionManager"),
      poolAddress: asString(subject, "poolAddress"),
      poolId: asString(subject, "poolId"),
      pair,
      tickLower,
      tickUpper,
      currentTick,
      rangeState: rangeState as RebalancingJobIntent["subject"]["rangeState"],
      blockNumber,
      findingGeneratedAt: finding.generatedAt,
      findingExpiresAt: finding.expiresAt,
    },
    constraints,
    selectedService: {
      serviceId: match.serviceId,
      agentId: match.service.service.agentId,
      listingId: match.service.service.listingId,
      name: match.service.service.name,
      operator: match.service.service.operator,
      matchId: match.matchId,
      matchRank: match.rank,
      matchTier: match.tier,
      readiness: match.service.readiness.state,
      readinessSnapshotId: match.service.readiness.readinessSnapshotId,
      activationEligible: match.activationEligible,
      supportedProtocols: [...match.service.service.supportedProtocols],
      runtimeEndpoints: [...(match.service.service.runtimeEndpoints ?? [])],
    },
    evidenceReferences: {
      findingEvidenceIds: [...new Set(finding.evidenceIds ?? [])],
      serviceEvidenceIds: [...new Set(serviceEvidenceIds)],
      readinessEvidenceIds: [...new Set(readinessEvidenceIds)],
    },
    authority,
    methodVersion: REBALANCING_JOB_INTENT_METHOD,
    createdAt,
    updatedAt: now.toISOString(),
    expiresAt,
    limitations: [
      "This job intent is a reviewable handoff, not an execution instruction, transaction, permission request, or permission grant.",
      "The selected service match is compatibility evidence only; it is not a profitability, safety, or performance prediction.",
      "Any later execution must revalidate current LP state, service readiness, wallet control, explicit bounded authority, and network conditions.",
      "Proposed slippage and swap-preparation bounds do not become wallet authority until a later permission flow explicitly grants them.",
    ],
  };
}

export function createJobIntentEngine(store: JobIntentStore = new MemoryJobIntentStore()): JobIntentEngine {
  return {
    async prepare(input) {
      const id = deterministicIntentId(input.finding.findingId, input.match.serviceId);
      const existing = await store.get(id);
      if (existing?.state === "CANCELLED" || existing?.state === "EXPIRED") {
        throw new JobIntentError(`Job intent ${id} cannot be revised from ${existing.state}.`, "INVALID_STATE");
      }
      if (existing?.state === "AWAITING_AUTHORITY") return existing;
      const intent = buildIntent(input, existing);
      await store.save(intent);
      return intent;
    },

    async get(jobIntentId) {
      const intent = await store.get(jobIntentId);
      if (!intent) throw new JobIntentError(`Job intent ${jobIntentId} was not found.`, "JOB_INTENT_NOT_FOUND");
      return intent;
    },

    async revise(jobIntentId, constraints) {
      const intent = await store.get(jobIntentId);
      if (!intent) throw new JobIntentError(`Job intent ${jobIntentId} was not found.`, "JOB_INTENT_NOT_FOUND");
      if (intent.state !== "REVIEWABLE") throw new JobIntentError("Only a REVIEWABLE job intent can be revised.", "INVALID_STATE");
      const merged = normalizedConstraints({ ...intent.constraints, ...constraints });
      const now = new Date();
      const next: RebalancingJobIntent = {
        ...intent,
        constraints: merged,
        updatedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + merged.validForMinutes * 60_000).toISOString(),
      };
      await store.save(next);
      return next;
    },

    async confirm(jobIntentId) {
      const intent = await store.get(jobIntentId);
      if (!intent) throw new JobIntentError(`Job intent ${jobIntentId} was not found.`, "JOB_INTENT_NOT_FOUND");
      if (intent.state === "AWAITING_AUTHORITY") return intent;
      if (intent.state !== "REVIEWABLE") throw new JobIntentError("Only a REVIEWABLE job intent can be confirmed.", "INVALID_STATE");
      if (new Date(intent.expiresAt).getTime() <= Date.now()) {
        const expired: RebalancingJobIntent = { ...intent, state: "EXPIRED", updatedAt: new Date().toISOString() };
        await store.save(expired);
        throw new JobIntentError("This job intent expired. Re-open the Finding and prepare a fresh intent from current context.", "INVALID_STATE");
      }
      const next: RebalancingJobIntent = {
        ...intent,
        state: "AWAITING_AUTHORITY",
        executionState: "NO_EXECUTION",
        updatedAt: new Date().toISOString(),
      };
      await store.save(next);
      return next;
    },
  };
}
