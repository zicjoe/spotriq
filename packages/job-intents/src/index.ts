import type {
  BoundedPermissionGrant,
  BoundedPermissionRequest,
  ControlledRebalancingExecution,
  CheckSession,
  Finding,
  FindingServiceMatch,
  ProtocolTokenMetadata,
  RebalancingJobConstraints,
  RebalancingJobIntent,
  ServiceTask,
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
  linkServiceTask(jobIntentId: string, task: ServiceTask): Promise<RebalancingJobIntent>;
  linkPermissionRequest(jobIntentId: string, request: BoundedPermissionRequest): Promise<RebalancingJobIntent>;
  linkPermissionGrant(jobIntentId: string, grant: BoundedPermissionGrant): Promise<RebalancingJobIntent>;
  linkControlledExecution(jobIntentId: string, execution: ControlledRebalancingExecution): Promise<RebalancingJobIntent>;
}

function asString(subject: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = subject?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(subject: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = subject?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asToken(subject: Record<string, unknown> | undefined, key: string): ProtocolTokenMetadata | undefined {
  const value = subject?.[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const token = value as Record<string, unknown>;
  const address = typeof token.address === "string" ? token.address.trim() : "";
  const decimals = typeof token.decimals === "number" && Number.isInteger(token.decimals) ? token.decimals : undefined;
  if (!address) return undefined;
  return {
    address,
    symbol: typeof token.symbol === "string" ? token.symbol : undefined,
    name: typeof token.name === "string" ? token.name : undefined,
    decimals,
    isNative: token.isNative === true,
  };
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
    maxActionCount: 4,
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
  blockers.add("This reviewable PREPARE_ONLY Job Intent allows at most four reviewed plan steps but does not authorize or perform financial execution.");
  return [...blockers];
}

function buildIntent(input: PrepareRebalancingJobIntentInput, existing?: RebalancingJobIntent): RebalancingJobIntent {
  const { session, finding, match } = input;
  if (finding.category !== "rebalancing") {
    throw new JobIntentError("Only Rebalancing findings can enter the current live Job Intent vertical.", "UNSUPPORTED_FINDING");
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
      description: "Ask the selected service to prepare a bounded range-management plan for this exact LP position. No transaction or asset movement is authorized by the Job Intent itself.",
    },
    subject: {
      protocol: "PancakeSwap",
      version,
      network,
      tokenId,
      positionManager: asString(subject, "positionManager"),
      token0: asToken(subject, "token0"),
      token1: asToken(subject, "token1"),
      poolAddress: asString(subject, "poolAddress"),
      poolId: asString(subject, "poolId"),
      pair,
      tickLower,
      tickUpper,
      currentTick,
      feePips: asNumber(subject, "feePips"),
      tickSpacing: asNumber(subject, "tickSpacing"),
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
    serviceTask: existing?.serviceTask,
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
      if (existing?.state === "AWAITING_AUTHORITY" || existing?.serviceTask) return existing;
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
        serviceTask: undefined,
        updatedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + merged.validForMinutes * 60_000).toISOString(),
        limitations: intent.serviceTask
          ? [...intent.limitations, "The previously linked AgentService task was invalidated because the Job Intent constraints/expiry changed. Invoke the selected service again before confirmation."]
          : intent.limitations,
      };
      await store.save(next);
      return next;
    },

    async confirm(jobIntentId) {
      const intent = await store.get(jobIntentId);
      if (!intent) throw new JobIntentError(`Job intent ${jobIntentId} was not found.`, "JOB_INTENT_NOT_FOUND");
      if (intent.state === "AWAITING_AUTHORITY") return intent;
      if (intent.state !== "REVIEWABLE") throw new JobIntentError("Only a REVIEWABLE job intent can be confirmed.", "INVALID_STATE");
      if (!intent.serviceTask || intent.serviceTask.state !== "COMPLETED" || intent.serviceTask.originProofState !== "VERIFIED" || intent.serviceTask.proposalState !== "STRUCTURED" || !intent.serviceTask.proposalId || !intent.serviceTask.proposalHash) {
        throw new JobIntentError("The selected AgentService must complete a real server-originated task with verified origin and a structured proposal before this Job Intent can be confirmed.", "INVALID_STATE");
      }
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

    async linkServiceTask(jobIntentId, task) {
      const intent = await store.get(jobIntentId);
      if (!intent) throw new JobIntentError(`Job intent ${jobIntentId} was not found.`, "JOB_INTENT_NOT_FOUND");
      if (intent.state !== "REVIEWABLE" || intent.executionState !== "NO_EXECUTION") throw new JobIntentError("Service task evidence can only be linked while the Job Intent remains REVIEWABLE with NO_EXECUTION.", "INVALID_STATE");
      if (task.jobIntentId !== intent.jobIntentId || task.findingId !== intent.findingId || task.serviceId !== intent.selectedService.serviceId || task.agentId !== intent.selectedService.agentId) {
        throw new JobIntentError("Service task origin evidence does not belong to this Job Intent and selected AgentService.", "INVALID_INPUT");
      }
      const next: RebalancingJobIntent = {
        ...intent,
        serviceTask: {
          serviceTaskId: task.serviceTaskId,
          state: task.state,
          originProofState: task.originProof.state,
          proposalState: task.proposalState,
          requestContextHash: task.requestContextHash,
          proposalId: task.proposal?.proposalId,
          proposalHash: task.proposal?.proposalHash,
          proposedTickLower: task.proposal?.targetTickLower,
          proposedTickUpper: task.proposal?.targetTickUpper,
          commercialState: task.commercialState,
          linkedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
        limitations: [
          ...intent.limitations.filter((item) => !item.includes("selected service match is compatibility evidence only")),
          task.originProof.state === "VERIFIED" && task.proposalState === "STRUCTURED"
            ? "Spotriq observed a real selected AgentService task/proposal origin. Invocation is proven, but commercial hiring/payment/marketplace activation remain separate and unproven."
            : "The selected AgentService task exists, but verified proposal origin is not yet sufficient for Job Intent confirmation.",
        ],
      };
      await store.save(next);
      return next;
    },

    async linkPermissionRequest(jobIntentId, request) {
      const intent = await store.get(jobIntentId);
      if (!intent) throw new JobIntentError(`Job intent ${jobIntentId} was not found.`, "JOB_INTENT_NOT_FOUND");
      if (intent.state !== "AWAITING_AUTHORITY") throw new JobIntentError("The job intent must be AWAITING_AUTHORITY before a permission request can be linked.", "INVALID_STATE");
      if (request.jobIntentId !== intent.jobIntentId || request.serviceId !== intent.selectedService.serviceId || request.walletAddress.toLowerCase() !== intent.walletAddress.toLowerCase()) {
        throw new JobIntentError("Permission request does not belong to this job intent.", "INVALID_INPUT");
      }
      const next: RebalancingJobIntent = {
        ...intent,
        executionState: "NO_EXECUTION",
        updatedAt: new Date().toISOString(),
        authority: {
          ...intent.authority,
          state: "REQUEST_PREPARED",
          permissionRequestId: request.permissionRequestId,
          provider: request.provider,
          blockers: [...new Set([...request.submissionBlockers, "Spotriq keeps financial execution disabled even after a provider grant is reconciled until every execution-safety prerequisite is independently satisfied."])],
        },
      };
      await store.save(next);
      return next;
    },

    async linkPermissionGrant(jobIntentId, grant) {
      const intent = await store.get(jobIntentId);
      if (!intent) throw new JobIntentError(`Job intent ${jobIntentId} was not found.`, "JOB_INTENT_NOT_FOUND");
      if (grant.jobIntentId !== intent.jobIntentId || grant.permissionRequestId !== intent.authority.permissionRequestId) {
        throw new JobIntentError("Permission grant does not belong to this job intent or its prepared request.", "INVALID_INPUT");
      }
      const verified = grant.state === "ACTIVE" && grant.reconciliation === "EXACT_MATCH" && grant.onchainValid;
      const next: RebalancingJobIntent = {
        ...intent,
        executionState: "NO_EXECUTION",
        updatedAt: new Date().toISOString(),
        authority: {
          ...intent.authority,
          state: verified ? "GRANT_VERIFIED" : "REQUEST_PREPARED",
          permissionGrantId: grant.permissionGrantId,
          provider: grant.provider,
          blockers: verified
            ? [
                ...grant.executionSafetyPrerequisites.filter((item) => item.blocking && item.state !== "SATISFIED").map((item) => item.detail),
                "A bounded Altana grant is verified, but Spotriq deliberately keeps execution disabled. Provider authority does not replace trusted service-key binding, proposal-level calldata validation, or the required non-bypassable financial execution boundary.",
              ]
            : [...grant.reconciliationReasons, ...grant.executionSafetyPrerequisites.filter((item) => item.blocking && item.state !== "SATISFIED").map((item) => item.detail), "The observed grant is not sufficient for activation."],
        },
      };
      await store.save(next);
      return next;
    },

    async linkControlledExecution(jobIntentId, execution) {
      const intent = await store.get(jobIntentId);
      if (!intent) throw new JobIntentError(`Job intent ${jobIntentId} was not found.`, "JOB_INTENT_NOT_FOUND");
      if (execution.jobIntentId !== intent.jobIntentId || execution.serviceId !== intent.selectedService.serviceId || execution.walletAddress.toLowerCase() !== intent.walletAddress.toLowerCase()) {
        throw new JobIntentError("Controlled execution does not belong to this Job Intent.", "INVALID_INPUT");
      }
      if (execution.state !== "CONFIRMED" || !execution.transactionHash || execution.receipt?.status !== "SUCCESS") {
        throw new JobIntentError("Only an independently receipt-confirmed BSC Testnet controlled execution can complete a Job Intent.", "INVALID_STATE");
      }
      const next: RebalancingJobIntent = {
        ...intent,
        state: "COMPLETED",
        executionState: "CONTROLLED_TESTNET_EXECUTED",
        updatedAt: new Date().toISOString(),
        limitations: [...intent.limitations.filter((item) => !item.includes("not an execution instruction")), `Controlled BSC Testnet execution ${execution.executionId} was confirmed in transaction ${execution.transactionHash}. Realised performance and complete outcome accounting remain separate Activity & Outcomes evidence.`],
      };
      await store.save(next);
      return next;
    },
  };
}
