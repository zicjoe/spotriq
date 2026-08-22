import type {
  AgentAuthorityBinding,
  AltanaGrantProof,
  AltanaTestnetProbeObservation,
  AltanaTestnetProbeProof,
  AuthoritySafetyPrerequisite,
  BoundedPermissionGrant,
  BoundedPermissionRequest,
  PermissionCallScope,
  PermissionSpendScope,
  RebalancingExecutionGuardReport,
  RebalancingExecutionPlan,
  FinancialExecutionBoundary,
  RebalancingJobIntent,
} from "@spotriq/domain";

export const BOUNDED_AUTHORITY_METHOD = "marketplace.bounded-authority@1.1.0";

export class AuthorityError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_INPUT"
      | "INVALID_STATE"
      | "UNSUPPORTED_JOB"
      | "PERMISSION_REQUEST_NOT_FOUND"
      | "PERMISSION_GRANT_NOT_FOUND"
      | "ONCHAIN_VERIFICATION_FAILED",
    public readonly retryable = false,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AuthorityError";
  }
}

export interface PrepareBoundedAuthorityInput {
  token0Limit: string;
  token1Limit: string;
  validForMinutes: number;
}

export interface AltanaKeyVerification {
  keyId: string;
  keystoreAddress: string;
  valid: boolean;
  blockNumber?: string;
}

export interface AltanaKeystoreVerifier {
  verify(args: { walletAddress: string; sessionPublicKey: string; network: "mainnet" | "testnet" }): Promise<AltanaKeyVerification>;
}

export interface AuthorityStore {
  saveRequest(request: BoundedPermissionRequest): Promise<void>;
  getRequest(permissionRequestId: string): Promise<BoundedPermissionRequest | undefined>;
  saveGrant(grant: BoundedPermissionGrant): Promise<void>;
  getGrant(permissionGrantId: string): Promise<BoundedPermissionGrant | undefined>;
  saveProbe(probe: AltanaTestnetProbeObservation): Promise<void>;
  getProbe(probeId: string): Promise<AltanaTestnetProbeObservation | undefined>;
  getProbeForJob(jobIntentId: string): Promise<AltanaTestnetProbeObservation | undefined>;
}

export class MemoryAuthorityStore implements AuthorityStore {
  private readonly requests = new Map<string, BoundedPermissionRequest>();
  private readonly grants = new Map<string, BoundedPermissionGrant>();
  private readonly probes = new Map<string, AltanaTestnetProbeObservation>();
  async saveRequest(request: BoundedPermissionRequest): Promise<void> { this.requests.set(request.permissionRequestId, structuredClone(request)); }
  async getRequest(id: string): Promise<BoundedPermissionRequest | undefined> { const value = this.requests.get(id); return value ? structuredClone(value) : undefined; }
  async saveGrant(grant: BoundedPermissionGrant): Promise<void> { this.grants.set(grant.permissionGrantId, structuredClone(grant)); }
  async getGrant(id: string): Promise<BoundedPermissionGrant | undefined> { const value = this.grants.get(id); return value ? structuredClone(value) : undefined; }
  async saveProbe(probe: AltanaTestnetProbeObservation): Promise<void> { this.probes.set(probe.probeId, structuredClone(probe)); }
  async getProbe(id: string): Promise<AltanaTestnetProbeObservation | undefined> { const value = this.probes.get(id); return value ? structuredClone(value) : undefined; }
  async getProbeForJob(jobIntentId: string): Promise<AltanaTestnetProbeObservation | undefined> {
    const values = [...this.probes.values()].filter((value) => value.jobIntentId === jobIntentId).sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt));
    return values[0] ? structuredClone(values[0]) : undefined;
  }
}

export interface SqlQueryResult<Row = Record<string, unknown>> { rows: Row[]; rowCount?: number | null; }
export interface SqlQueryExecutor { query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<SqlQueryResult<Row>>; }

export class PostgresAuthorityStore implements AuthorityStore {
  constructor(private readonly database: SqlQueryExecutor) {}

  async saveRequest(request: BoundedPermissionRequest): Promise<void> {
    await this.database.query(
      `insert into permission_requests (permission_request_id, checkout_id, service_id, status, protocols, assets, limits, expires_at, created_at)
       values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9)
       on conflict (permission_request_id) do update set
         status=excluded.status, protocols=excluded.protocols, assets=excluded.assets, limits=excluded.limits, expires_at=excluded.expires_at`,
      [
        request.permissionRequestId,
        request.jobIntentId,
        request.serviceId,
        request.status,
        JSON.stringify([request.protocol]),
        JSON.stringify(request.spendCaps),
        JSON.stringify(request),
        request.expiresAt,
        request.createdAt,
      ],
    );
  }

  async getRequest(permissionRequestId: string): Promise<BoundedPermissionRequest | undefined> {
    const result = await this.database.query<{ limits: BoundedPermissionRequest }>(
      "select limits from permission_requests where permission_request_id = $1",
      [permissionRequestId],
    );
    return result.rows[0]?.limits;
  }

  async saveGrant(grant: BoundedPermissionGrant): Promise<void> {
    await this.database.query(
      `insert into permission_grants (permission_grant_id, permission_request_id, service_id, provider, state, scope, usage, provider_ref, granted_at, expires_at)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10)
       on conflict (permission_grant_id) do update set
         state=excluded.state, scope=excluded.scope, usage=excluded.usage, provider_ref=excluded.provider_ref, expires_at=excluded.expires_at`,
      [
        grant.permissionGrantId,
        grant.permissionRequestId,
        grant.serviceId,
        grant.provider,
        grant.state,
        JSON.stringify(grant),
        JSON.stringify({ reconciliation: grant.reconciliation, reasons: grant.reconciliationReasons, onchainValid: grant.onchainValid }),
        grant.keyId,
        grant.verifiedAt,
        grant.expiresAt,
      ],
    );
  }

  async getGrant(permissionGrantId: string): Promise<BoundedPermissionGrant | undefined> {
    const result = await this.database.query<{ scope: BoundedPermissionGrant }>(
      "select scope from permission_grants where permission_grant_id = $1",
      [permissionGrantId],
    );
    return result.rows[0]?.scope;
  }

  async saveProbe(probe: AltanaTestnetProbeObservation): Promise<void> {
    await this.database.query(`
      insert into altana_testnet_probe_grants (probe_id, job_intent_id, wallet_address, session_public_key, state, transaction_hash, revocation_transaction_hash, payload, verified_at, updated_at)
      values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,now())
      on conflict (probe_id) do update set state=excluded.state, transaction_hash=excluded.transaction_hash, revocation_transaction_hash=excluded.revocation_transaction_hash, payload=excluded.payload, verified_at=excluded.verified_at, updated_at=now()
    `, [probe.probeId, probe.jobIntentId, probe.walletAddress, probe.sessionPublicKey, probe.state, probe.transactionHash ?? null, probe.revocationTransactionHash ?? null, JSON.stringify(probe), probe.verifiedAt]);
  }

  async getProbe(probeId: string): Promise<AltanaTestnetProbeObservation | undefined> {
    const result = await this.database.query<{ payload: AltanaTestnetProbeObservation }>("select payload from altana_testnet_probe_grants where probe_id = $1", [probeId]);
    return result.rows[0]?.payload;
  }

  async getProbeForJob(jobIntentId: string): Promise<AltanaTestnetProbeObservation | undefined> {
    const result = await this.database.query<{ payload: AltanaTestnetProbeObservation }>(
      "select payload from altana_testnet_probe_grants where job_intent_id = $1 order by updated_at desc limit 1",
      [jobIntentId],
    );
    return result.rows[0]?.payload;
  }
}

export interface AuthorityEngine {
  prepare(jobIntent: RebalancingJobIntent, input: PrepareBoundedAuthorityInput, now?: Date): Promise<BoundedPermissionRequest>;
  getRequest(permissionRequestId: string): Promise<BoundedPermissionRequest>;
  revise(permissionRequestId: string, jobIntent: RebalancingJobIntent, input: PrepareBoundedAuthorityInput, now?: Date): Promise<BoundedPermissionRequest>;
  reconcile(permissionRequestId: string, proof: AltanaGrantProof, now?: Date): Promise<BoundedPermissionGrant>;
  getGrant(permissionGrantId: string): Promise<BoundedPermissionGrant>;
  reverify(permissionGrantId: string, now?: Date): Promise<BoundedPermissionGrant>;
  applyTrustedAgentBinding(permissionRequestId: string, binding: AgentAuthorityBinding, now?: Date): Promise<BoundedPermissionRequest>;
  applyExecutionGuard(permissionRequestId: string, report: RebalancingExecutionGuardReport, now?: Date): Promise<BoundedPermissionRequest>;
  applyExecutionPlan(permissionRequestId: string, plan: RebalancingExecutionPlan, now?: Date): Promise<BoundedPermissionRequest>;
  applyExecutionBoundary(permissionRequestId: string, boundary: FinancialExecutionBoundary, now?: Date): Promise<BoundedPermissionRequest>;
  observeTestnetProbe(jobIntent: RebalancingJobIntent, proof: AltanaTestnetProbeProof, now?: Date): Promise<AltanaTestnetProbeObservation>;
  getTestnetProbe(probeId: string): Promise<AltanaTestnetProbeObservation>;
  getTestnetProbeForJob(jobIntentId: string): Promise<AltanaTestnetProbeObservation | undefined>;
  reverifyTestnetProbe(probeId: string, input?: { revocationTransactionHash?: string }, now?: Date): Promise<AltanaTestnetProbeObservation>;
}

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

function assertAddress(value: string | undefined, label: string): string {
  if (!value || !ADDRESS.test(value)) throw new AuthorityError(`${label} must be a valid EVM address.`, "INVALID_INPUT");
  return value;
}

function normalizeAddress(value: string): string { return value.toLowerCase(); }
function normalizeSignature(value: string): string { return value.replaceAll(" ", "").trim(); }

function parseDisplayUnits(value: string, decimals: number, label: string): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new AuthorityError(`${label} token decimals are unavailable or invalid.`, "INVALID_INPUT");
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) throw new AuthorityError(`${label} must be a positive decimal amount without scientific notation.`, "INVALID_INPUT");
  const [whole, fraction = ""] = trimmed.split(".");
  if (fraction.length > decimals) throw new AuthorityError(`${label} has more than ${decimals} decimal places.`, "INVALID_INPUT");
  const raw = `${whole}${fraction.padEnd(decimals, "0")}`.replace(/^0+(?=\d)/, "");
  if (BigInt(raw || "0") <= 0n) throw new AuthorityError(`${label} must be greater than zero.`, "INVALID_INPUT");
  if (raw.length > 96) throw new AuthorityError(`${label} is unreasonably large.`, "INVALID_INPUT");
  return raw || "0";
}

function requestId(jobIntentId: string): string { return `permission:altana:${encodeURIComponent(jobIntentId)}`; }
function grantId(permissionRequestId: string, keyId: string): string { return `grant:altana:${encodeURIComponent(permissionRequestId)}:${keyId.slice(2, 18)}`; }
function probeId(jobIntentId: string, keyId: string): string { return `probe:altana:testnet:${encodeURIComponent(jobIntentId)}:${keyId.slice(2, 18)}`; }

function callAllowlist(positionManager: string): PermissionCallScope[] {
  const to = assertAddress(positionManager, "PancakeSwap V3 position manager");
  return [
    { to, signature: "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256))", label: "Decrease liquidity", provenance: "marketplace-derived" },
    { to, signature: "collect((uint256,address,uint128,uint128))", label: "Collect position tokens/fees", provenance: "marketplace-derived" },
    { to, signature: "increaseLiquidity((uint256,uint256,uint256,uint256,uint256,uint256))", label: "Increase liquidity", provenance: "marketplace-derived" },
    { to, signature: "mint((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256))", label: "Mint replacement V3 position", provenance: "marketplace-derived" },
  ];
}

function spendScopes(job: RebalancingJobIntent, input: PrepareBoundedAuthorityInput): PermissionSpendScope[] {
  const token0 = job.subject.token0;
  const token1 = job.subject.token1;
  if (!token0 || !token1) throw new AuthorityError("Exact token0/token1 metadata is required before bounded spend caps can be created.", "INVALID_INPUT");
  const token0Address = assertAddress(token0.address, "token0 address");
  const token1Address = assertAddress(token1.address, "token1 address");
  if (token0.decimals === undefined || token1.decimals === undefined) throw new AuthorityError("Token decimals must be known before converting user caps into onchain units.", "INVALID_INPUT");
  return [
    { token: token0Address, symbol: token0.symbol, decimals: token0.decimals, limitDisplay: input.token0Limit.trim(), limitRaw: parseDisplayUnits(input.token0Limit, token0.decimals, token0.symbol ?? "token0 cap"), period: "day", provenance: "user-proposed" },
    { token: token1Address, symbol: token1.symbol, decimals: token1.decimals, limitDisplay: input.token1Limit.trim(), limitRaw: parseDisplayUnits(input.token1Limit, token1.decimals, token1.symbol ?? "token1 cap"), period: "day", provenance: "user-proposed" },
  ];
}

function validateJob(job: RebalancingJobIntent): void {
  if (job.category !== "rebalancing" || job.state !== "AWAITING_AUTHORITY" || job.executionState !== "NO_EXECUTION") {
    throw new AuthorityError("Only a confirmed Rebalancing Job Intent in AWAITING_AUTHORITY can produce a permission request.", "INVALID_STATE");
  }
  if (job.subject.version !== "V3") {
    throw new AuthorityError("Spotriq currently derives exact selector-scoped authority only for PancakeSwap V3. Infinity CL authority is blocked until its safe call surface is modeled explicitly.", "UNSUPPORTED_JOB");
  }
  assertAddress(job.walletAddress, "Job wallet");
  assertAddress(job.subject.positionManager, "PancakeSwap V3 position manager");
}

function normalizedCallKey(call: { to: string; signature: string }): string {
  return `${normalizeAddress(call.to)}|${normalizeSignature(call.signature)}`;
}
function normalizedSpendKey(spend: { token: string; limitRaw: string; period: string }): string {
  return `${normalizeAddress(spend.token)}|${spend.limitRaw}|${spend.period}`;
}

function validateGrantProof(proof: AltanaGrantProof): void {
  assertAddress(proof.walletAddress, "Altana grant wallet");
  if (!Array.isArray(proof.calls) || proof.calls.length === 0) throw new AuthorityError("Altana grant proof must include an explicit call allowlist.", "INVALID_INPUT");
  for (const call of proof.calls) {
    assertAddress(call?.to, "Altana granted call target");
    if (typeof call?.signature !== "string" || !call.signature.trim()) throw new AuthorityError("Every Altana granted call must include a function signature/selector.", "INVALID_INPUT");
  }
  if (!Array.isArray(proof.spend) || proof.spend.length === 0) throw new AuthorityError("Altana grant proof must include explicit token spend caps.", "INVALID_INPUT");
  for (const spend of proof.spend) {
    assertAddress(spend?.token, "Altana spend token");
    if (!/^\d+$/.test(spend?.limitRaw ?? "") || BigInt(spend.limitRaw) <= 0n) throw new AuthorityError("Every Altana spend cap must contain a positive raw-unit limit.", "INVALID_INPUT");
    if (spend.period !== "hour" && spend.period !== "day") throw new AuthorityError("Altana spend period must be hour or day.", "INVALID_INPUT");
  }
  if (!Number.isInteger(proof.expiryUnix) || proof.expiryUnix <= 0) throw new AuthorityError("Altana grant expiry must be a positive unix timestamp.", "INVALID_INPUT");
  if (proof.transactionHash && !/^0x[0-9a-fA-F]{64}$/.test(proof.transactionHash)) throw new AuthorityError("Altana grant transactionHash must be a 32-byte transaction hash when provided.", "INVALID_INPUT");
}

function compareScope(request: BoundedPermissionRequest, proof: AltanaGrantProof): { exact: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (normalizeAddress(proof.walletAddress) !== normalizeAddress(request.walletAddress)) reasons.push("The Altana grant wallet does not match the Job Intent wallet.");
  const requestedCalls = request.callAllowlist.map(normalizedCallKey).sort();
  const grantedCalls = proof.calls.map(normalizedCallKey).sort();
  if (requestedCalls.length !== grantedCalls.length || requestedCalls.some((value, index) => value !== grantedCalls[index])) {
    reasons.push("Granted call permissions do not exactly match the reviewed contract/function allowlist.");
  }
  const requestedSpend = request.spendCaps.map(normalizedSpendKey).sort();
  const grantedSpend = proof.spend.map(normalizedSpendKey).sort();
  if (requestedSpend.length !== grantedSpend.length || requestedSpend.some((value, index) => value !== grantedSpend[index])) {
    reasons.push("Granted spend caps do not exactly match the reviewed token limits and periods.");
  }
  if (proof.expiryUnix !== request.expiryUnix) reasons.push("Granted expiry does not exactly match the reviewed permission expiry.");
  return { exact: reasons.length === 0, reasons };
}

function buildRequest(job: RebalancingJobIntent, input: PrepareBoundedAuthorityInput, existing: BoundedPermissionRequest | undefined, now: Date): BoundedPermissionRequest {
  validateJob(job);
  if (!Number.isInteger(input.validForMinutes) || input.validForMinutes < 5 || input.validForMinutes > 1_440) {
    throw new AuthorityError("Authority validity must be an integer between 5 and 1440 minutes.", "INVALID_INPUT");
  }
  const calls = callAllowlist(job.subject.positionManager!);
  const spendCaps = spendScopes(job, input);
  const expiryUnix = Math.floor(now.getTime() / 1000) + input.validForMinutes * 60;
  const safetyPrerequisites: AuthoritySafetyPrerequisite[] = [
    {
      code: "TRUSTED_AGENT_SESSION_KEY",
      state: "REQUIRED",
      blocking: true,
      label: "Trusted agent session key",
      detail: "The selected AgentService must bind a service-owned proposal/authentication public key that Spotriq can authenticate. This key proves who proposed the plan; v0.17 no longer intends to use it as the financial signing key.",
      provenance: "marketplace-derived",
    },
    {
      code: "ARGUMENT_LEVEL_EXECUTION_GUARD",
      state: "REQUIRED",
      blocking: true,
      label: "Argument-level execution guard",
      detail: "Altana call permissions constrain contract + function signature, not PancakeSwap V3 tokenId/recipient/amount/slippage/deadline arguments. Spotriq must validate exact calldata against the reviewed Job Intent before any live grant can be used for execution.",
      provenance: "marketplace-derived",
    },
    {
      code: "NON_BYPASSABLE_FINANCIAL_EXECUTION_BOUNDARY",
      state: "REQUIRED",
      blocking: true,
      label: "Non-bypassable financial execution boundary",
      detail: "Financial signing authority must be held behind a Spotriq execution boundary that accepts only exact reviewed plan call hashes/order. The external AgentService proposal key must never receive direct financial selector authority.",
      provenance: "marketplace-derived",
    },
  ];
  const blockers = safetyPrerequisites.filter((item) => item.blocking && item.state !== "SATISFIED").map((item) => item.detail);
  if (job.walletControl !== "VERIFIED_CONTROL") blockers.unshift("Spotriq's current Smart Money Check has not marked wallet control as verified. A real Altana admin signature/onchain grant remains authoritative proof of control.");
  return {
    permissionRequestId: requestId(job.jobIntentId),
    jobIntentId: job.jobIntentId,
    serviceId: job.selectedService.serviceId,
    walletAddress: job.walletAddress,
    provider: "ALTANA",
    network: job.subject.network,
    chainId: job.subject.network === "mainnet" ? 56 : 97,
    protocol: "PancakeSwap",
    positionManager: job.subject.positionManager!,
    tokenId: job.subject.tokenId,
    callAllowlist: calls,
    spendCaps,
    expiresAt: new Date(expiryUnix * 1000).toISOString(),
    expiryUnix,
    status: "READY",
    providerSubmissionState: "SAFETY_PREREQUISITES_REQUIRED",
    safetyPrerequisites,
    submissionBlockers: blockers,
    walletControl: job.walletControl,
    scopeProvenance: "marketplace-derived",
    activationEligible: false,
    methodVersion: BOUNDED_AUTHORITY_METHOD,
    createdAt: existing?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
    limitations: [
      "This is a Spotriq-derived maximum authority proposal for the reviewed Job Intent; it is not an operator claim that the selected service can use this exact scope.",
      "Altana call permissions are selector-scoped, not tokenId/argument-scoped. The V3 position-manager signatures can therefore address more than the single NFT, and collect/mint contain recipient arguments. Live grant submission remains blocked until an argument-level execution guard enforces the reviewed tokenId, recipient, amounts, slippage/deadline, targets, spend caps, expiry, and wallet ownership.",
      "No ERC-20 approve, Permit2 approval, router swap, withdrawal, transfer, arbitrary target, or multicall permission is included.",
      job.constraints.allowSwapPreparation
        ? "The Job Intent allows swap preparation only. No swap/router execution permission is included in this authority request."
        : "The Job Intent does not request swap preparation, and no swap/router permission is included.",
      "A PermissionRequest is not a PermissionGrant. Spotriq must reconcile the provider-returned scope and verify the session key on the Altana Keystore before calling a grant active.",
      "Even a reconciled grant remains non-executable in Spotriq v0.16; a non-bypassable financial execution boundary is still required before financial selector authority can become usable.",
    ],
  };
}

export function createAuthorityEngine(options: { store?: AuthorityStore; verifier: AltanaKeystoreVerifier }): AuthorityEngine {
  const store = options.store ?? new MemoryAuthorityStore();
  const verifier = options.verifier;
  return {
    async prepare(jobIntent, input, now = new Date()) {
      const id = requestId(jobIntent.jobIntentId);
      const existing = await store.getRequest(id);
      if (existing?.status === "CONFIRMED" || existing?.status === "SUBMITTED") return existing;
      const request = buildRequest(jobIntent, input, existing, now);
      await store.saveRequest(request);
      return request;
    },
    async getRequest(permissionRequestId) {
      const request = await store.getRequest(permissionRequestId);
      if (!request) throw new AuthorityError(`Permission request ${permissionRequestId} was not found.`, "PERMISSION_REQUEST_NOT_FOUND");
      return request;
    },
    async revise(permissionRequestId, jobIntent, input, now = new Date()) {
      const existing = await store.getRequest(permissionRequestId);
      if (!existing) throw new AuthorityError(`Permission request ${permissionRequestId} was not found.`, "PERMISSION_REQUEST_NOT_FOUND");
      if (existing.status !== "READY") throw new AuthorityError("Only a READY permission request can be revised before provider submission.", "INVALID_STATE");
      if (existing.jobIntentId !== jobIntent.jobIntentId) throw new AuthorityError("Permission request does not belong to this Job Intent.", "INVALID_INPUT");
      const request = buildRequest(jobIntent, input, existing, now);
      await store.saveRequest(request);
      return request;
    },
    async reconcile(permissionRequestId, proof, now = new Date()) {
      const request = await store.getRequest(permissionRequestId);
      if (!request) throw new AuthorityError(`Permission request ${permissionRequestId} was not found.`, "PERMISSION_REQUEST_NOT_FOUND");
      if (!/^0x[0-9a-fA-F]+$/.test(proof.sessionPublicKey) || proof.sessionPublicKey.length < 68 || proof.sessionPublicKey.length % 2 !== 0) {
        throw new AuthorityError("Altana sessionPublicKey must be a SEC1-encoded hex public key.", "INVALID_INPUT");
      }
      validateGrantProof(proof);
      const scope = compareScope(request, proof);
      if (request.trustedAgentBinding?.state === "VERIFIED" && request.trustedAgentBinding.sessionPublicKey && request.trustedAgentBinding.sessionPublicKey.toLowerCase() !== proof.sessionPublicKey.toLowerCase()) {
        scope.exact = false;
        scope.reasons.push("The provider-returned session key does not match the service-owned key Spotriq verified from the selected AgentService runtime.");
      }
      let verification: AltanaKeyVerification;
      try {
        verification = await verifier.verify({ walletAddress: request.walletAddress, sessionPublicKey: proof.sessionPublicKey, network: request.network });
      } catch (cause) {
        throw new AuthorityError("Spotriq could not independently verify the Altana session key onchain.", "ONCHAIN_VERIFICATION_FAILED", true, cause instanceof Error ? cause.message : cause);
      }
      const expired = proof.expiryUnix <= Math.floor(now.getTime() / 1000);
      let reconciliation: BoundedPermissionGrant["reconciliation"] = "EXACT_MATCH";
      const reasons = [...scope.reasons];
      if (normalizeAddress(proof.walletAddress) !== normalizeAddress(request.walletAddress)) reconciliation = "WALLET_MISMATCH";
      else if (expired) { reconciliation = "EXPIRED"; reasons.push("The provider-returned session is already expired."); }
      else if (!scope.exact) reconciliation = "SCOPE_MISMATCH";
      else if (!verification.valid) { reconciliation = "ONCHAIN_INVALID"; reasons.push("Altana Keystore isValidKey returned false for this wallet/session key."); }
      const active = reconciliation === "EXACT_MATCH" && verification.valid && !expired;
      if (active) reasons.push("Provider-returned scope exactly matches the reviewed request and Altana Keystore currently reports the session key as valid.");
      const grant: BoundedPermissionGrant = {
        permissionGrantId: grantId(request.permissionRequestId, verification.keyId),
        permissionRequestId: request.permissionRequestId,
        jobIntentId: request.jobIntentId,
        serviceId: request.serviceId,
        walletAddress: request.walletAddress,
        provider: "ALTANA",
        network: request.network,
        chainId: request.chainId,
        sessionPublicKey: proof.sessionPublicKey,
        keyId: verification.keyId,
        transactionHash: proof.transactionHash,
        state: active ? "ACTIVE" : expired ? "EXPIRED" : "PROVIDER_ERROR",
        reconciliation,
        requestedCalls: request.callAllowlist,
        grantedCalls: proof.calls,
        requestedSpendCaps: request.spendCaps,
        grantedSpendCaps: proof.spend,
        expiresAt: new Date(proof.expiryUnix * 1000).toISOString(),
        expiryUnix: proof.expiryUnix,
        keystoreAddress: verification.keystoreAddress,
        onchainValid: verification.valid,
        verifiedAt: now.toISOString(),
        verifiedBlockNumber: verification.blockNumber,
        executionSafetyPrerequisites: request.safetyPrerequisites,
        executionEligible: false,
        reconciliationReasons: reasons,
        limitations: [
          "Altana Keystore validity proves that the session key is currently authorized for the wallet; Spotriq separately compares the provider-returned policy to the reviewed PermissionRequest.",
          "Spotriq does not persist or transmit the service session private key and does not execute financial actions with this grant in v0.16.",
          "Grant validity can change through expiry or revocation. Re-verify isValidKey immediately before any future execution.",
        ],
      };
      await store.saveGrant(grant);
      await store.saveRequest({ ...request, status: active ? "CONFIRMED" : "FAILED", providerSubmissionState: "RECONCILED", updatedAt: now.toISOString() });
      return grant;
    },
    async getGrant(permissionGrantId) {
      const grant = await store.getGrant(permissionGrantId);
      if (!grant) throw new AuthorityError(`Permission grant ${permissionGrantId} was not found.`, "PERMISSION_GRANT_NOT_FOUND");
      return grant;
    },
    async reverify(permissionGrantId, now = new Date()) {
      const existing = await store.getGrant(permissionGrantId);
      if (!existing) throw new AuthorityError(`Permission grant ${permissionGrantId} was not found.`, "PERMISSION_GRANT_NOT_FOUND");
      let verification: AltanaKeyVerification;
      try {
        verification = await verifier.verify({ walletAddress: existing.walletAddress, sessionPublicKey: existing.sessionPublicKey, network: existing.network });
      } catch (cause) {
        throw new AuthorityError("Spotriq could not re-verify the Altana session key onchain.", "ONCHAIN_VERIFICATION_FAILED", true, cause instanceof Error ? cause.message : cause);
      }
      const expired = existing.expiryUnix <= Math.floor(now.getTime() / 1000);
      const previouslyActive = existing.state === "ACTIVE" || existing.reconciliation === "EXACT_MATCH";
      const state: BoundedPermissionGrant["state"] = expired ? "EXPIRED" : verification.valid ? "ACTIVE" : previouslyActive ? "REVOKED" : "PROVIDER_ERROR";
      const reconciliation: BoundedPermissionGrant["reconciliation"] = expired ? "EXPIRED" : verification.valid ? existing.reconciliation : "ONCHAIN_INVALID";
      const reasons = verification.valid && !expired
        ? ["Altana Keystore currently reports this exact session key as valid for the wallet."]
        : expired
          ? ["The permission grant has passed its reviewed expiry."]
          : ["Altana Keystore isValidKey currently returns false. A previously active grant is treated as revoked/unusable until a fresh grant is created."];
      const next: BoundedPermissionGrant = {
        ...existing,
        keyId: verification.keyId,
        keystoreAddress: verification.keystoreAddress,
        onchainValid: verification.valid,
        verifiedAt: now.toISOString(),
        verifiedBlockNumber: verification.blockNumber,
        state,
        reconciliation,
        executionEligible: false,
        reconciliationReasons: reasons,
      };
      await store.saveGrant(next);
      return next;
    },
    async applyTrustedAgentBinding(permissionRequestId, binding, now = new Date()) {
      const request = await store.getRequest(permissionRequestId);
      if (!request) throw new AuthorityError(`Permission request ${permissionRequestId} was not found.`, "PERMISSION_REQUEST_NOT_FOUND");
      if (binding.serviceId !== request.serviceId || binding.state !== "VERIFIED" || !binding.sessionPublicKey) {
        throw new AuthorityError("Only a VERIFIED authority binding for the exact selected AgentService can satisfy the trusted-session-key prerequisite.", "INVALID_INPUT");
      }
      const safetyPrerequisites = request.safetyPrerequisites.map((item) => item.code === "TRUSTED_AGENT_SESSION_KEY"
        ? { ...item, state: "SATISFIED" as const, blocking: false, detail: `Spotriq observed the selected AgentService prove control of session key ${binding.sessionKeyAddress ?? binding.sessionPublicKey}.` }
        : item);
      const submissionBlockers = safetyPrerequisites.filter((item) => item.blocking && item.state !== "SATISFIED").map((item) => item.detail);
      const next: BoundedPermissionRequest = { ...request, trustedAgentBinding: binding, safetyPrerequisites, submissionBlockers, providerSubmissionState: submissionBlockers.length ? "SAFETY_PREREQUISITES_REQUIRED" : "READY_FOR_WALLET", updatedAt: now.toISOString() };
      await store.saveRequest(next);
      return next;
    },
    async applyExecutionGuard(permissionRequestId, report, now = new Date()) {
      const request = await store.getRequest(permissionRequestId);
      if (!request) throw new AuthorityError(`Permission request ${permissionRequestId} was not found.`, "PERMISSION_REQUEST_NOT_FOUND");
      if (report.permissionRequestId !== request.permissionRequestId || report.jobIntentId !== request.jobIntentId || report.serviceId !== request.serviceId) {
        throw new AuthorityError("Execution-guard report does not belong to this reviewed permission request.", "INVALID_INPUT");
      }
      const satisfied = report.state === "PASS" && report.argumentGuardSatisfied;
      const safetyPrerequisites = request.safetyPrerequisites.map((item) => item.code === "ARGUMENT_LEVEL_EXECUTION_GUARD"
        ? { ...item, state: satisfied ? "SATISFIED" as const : "REQUIRED" as const, blocking: !satisfied, detail: satisfied ? `Spotriq decoded and validated proposal ${report.proposalId} against the reviewed Job Intent. This is proposal-level evidence only.` : `The latest proposal guard is ${report.state}; every proposed calldata payload must pass before it can be considered.` }
        : item);
      const submissionBlockers = safetyPrerequisites.filter((item) => item.blocking && item.state !== "SATISFIED").map((item) => item.detail);
      const next: BoundedPermissionRequest = { ...request, latestExecutionGuard: report, safetyPrerequisites, submissionBlockers, providerSubmissionState: submissionBlockers.length ? "SAFETY_PREREQUISITES_REQUIRED" : "READY_FOR_WALLET", updatedAt: now.toISOString() };
      await store.saveRequest(next);
      return next;
    },
    async applyExecutionPlan(permissionRequestId, plan, now = new Date()) {
      const request = await store.getRequest(permissionRequestId);
      if (!request) throw new AuthorityError(`Permission request ${permissionRequestId} was not found.`, "PERMISSION_REQUEST_NOT_FOUND");
      if (plan.permissionRequestId !== request.permissionRequestId || plan.jobIntentId !== request.jobIntentId || plan.serviceId !== request.serviceId || plan.state !== "REVIEWED" || plan.guardState !== "PASS") {
        throw new AuthorityError("Only a REVIEWED execution plan whose complete step set passed the argument guard can satisfy the plan-level guard prerequisite.", "INVALID_INPUT");
      }
      const safetyPrerequisites = request.safetyPrerequisites.map((item) => item.code === "ARGUMENT_LEVEL_EXECUTION_GUARD"
        ? { ...item, state: "SATISFIED" as const, blocking: false, detail: `Execution plan ${plan.planId} contains ${plan.steps.length} exact reviewed calls and every step passed deterministic calldata validation.` }
        : item);
      const submissionBlockers = safetyPrerequisites.filter((item) => item.blocking && item.state !== "SATISFIED").map((item) => item.detail);
      const next: BoundedPermissionRequest = { ...request, executionPlanId: plan.planId, safetyPrerequisites, submissionBlockers, providerSubmissionState: submissionBlockers.length ? "SAFETY_PREREQUISITES_REQUIRED" : "BOUNDARY_SIGNER_REQUIRED", updatedAt: now.toISOString() };
      await store.saveRequest(next);
      return next;
    },
    async applyExecutionBoundary(permissionRequestId, boundary, now = new Date()) {
      const request = await store.getRequest(permissionRequestId);
      if (!request) throw new AuthorityError(`Permission request ${permissionRequestId} was not found.`, "PERMISSION_REQUEST_NOT_FOUND");
      if (boundary.permissionRequestId !== request.permissionRequestId || boundary.jobIntentId !== request.jobIntentId || boundary.serviceId !== request.serviceId || boundary.state !== "SEALED" || !boundary.nonBypassable || request.executionPlanId !== boundary.planId) {
        throw new AuthorityError("Execution boundary does not seal the exact reviewed plan for this PermissionRequest.", "INVALID_INPUT");
      }
      const safetyPrerequisites = request.safetyPrerequisites.map((item) => item.code === "NON_BYPASSABLE_FINANCIAL_EXECUTION_BOUNDARY"
        ? { ...item, state: "SATISFIED" as const, blocking: false, detail: `Boundary ${boundary.boundaryId} seals exact call hashes/order and keeps the future financial signer inaccessible to the external AgentService.` }
        : item);
      const submissionBlockers = safetyPrerequisites.filter((item) => item.blocking && item.state !== "SATISFIED").map((item) => item.detail);
      const next: BoundedPermissionRequest = { ...request, executionBoundaryId: boundary.boundaryId, financialDelegateMode: "SPOTRIQ_EXECUTION_BOUNDARY", safetyPrerequisites, submissionBlockers, providerSubmissionState: submissionBlockers.length ? "SAFETY_PREREQUISITES_REQUIRED" : "BOUNDARY_SIGNER_REQUIRED", updatedAt: now.toISOString(), limitations: [...request.limitations.filter((x) => !x.includes("non-bypassable financial execution boundary is still required")), "v0.17 has a non-bypassable exact-plan enforcement boundary, but no financial Altana session signer is provisioned. v0.18 must grant authority to the boundary-controlled executor, never directly to the external AgentService proposal key."] };
      await store.saveRequest(next);
      return next;
    },
    async observeTestnetProbe(jobIntent, proof, now = new Date()) {
      if (jobIntent.subject.network !== "testnet" || jobIntent.subject.version !== "V3" || jobIntent.executionState !== "NO_EXECUTION") {
        throw new AuthorityError("The live Altana probe is only available for a BSC Testnet V3 Job Intent with NO_EXECUTION.", "INVALID_STATE");
      }
      if (proof.walletAddress.toLowerCase() !== jobIntent.walletAddress.toLowerCase()) {
        throw new AuthorityError("Altana probe wallet must exactly match the Job Intent wallet. Create/recover the Altana smart wallet first, then run Spotriq against that address.", "INVALID_INPUT");
      }
      if (proof.target.toLowerCase() !== jobIntent.subject.positionManager?.toLowerCase() || proof.signature !== "positions(uint256)") {
        throw new AuthorityError("Altana probe must be scoped only to positions(uint256) on the exact BSC Testnet V3 Position Manager from the Job Intent.", "INVALID_INPUT");
      }
      if (!/^0x[0-9a-fA-F]+$/.test(proof.sessionPublicKey) || proof.sessionPublicKey.length < 68 || proof.sessionPublicKey.length % 2 !== 0) {
        throw new AuthorityError("Altana probe sessionPublicKey must be a SEC1-encoded hex public key.", "INVALID_INPUT");
      }
      if (proof.transactionHash && !/^0x[0-9a-fA-F]{64}$/.test(proof.transactionHash)) throw new AuthorityError("Altana probe transactionHash must be a 32-byte transaction hash.", "INVALID_INPUT");
      let verification: AltanaKeyVerification;
      try {
        verification = await verifier.verify({ walletAddress: proof.walletAddress, sessionPublicKey: proof.sessionPublicKey, network: "testnet" });
      } catch (cause) {
        throw new AuthorityError("Spotriq could not verify the Altana BSC Testnet probe key onchain.", "ONCHAIN_VERIFICATION_FAILED", true, cause instanceof Error ? cause.message : cause);
      }
      const expired = proof.expiryUnix <= Math.floor(now.getTime() / 1000);
      const probe: AltanaTestnetProbeObservation = {
        probeId: probeId(jobIntent.jobIntentId, verification.keyId),
        jobIntentId: jobIntent.jobIntentId,
        walletAddress: proof.walletAddress,
        target: proof.target,
        signature: "positions(uint256)",
        sessionPublicKey: proof.sessionPublicKey,
        transactionHash: proof.transactionHash,
        expiryUnix: proof.expiryUnix,
        state: expired ? "EXPIRED" : verification.valid ? "ACTIVE" : "INVALID",
        keyId: verification.keyId,
        keystoreAddress: verification.keystoreAddress,
        onchainValid: verification.valid,
        verifiedAt: now.toISOString(),
        verifiedBlockNumber: verification.blockNumber,
        methodVersion: "marketplace.altana-testnet-probe@1.0.0",
        limitations: [
          "This is a real BSC Testnet Altana grant/revocation integration probe scoped to the read-only positions(uint256) selector. It is not the selected AgentService's financial authority.",
          "The probe exists to prove Spotriq can create/recover an Altana smart wallet, register a scoped session, capture transaction evidence, independently verify Keystore state, and later observe revocation without moving assets.",
          "Financial selector grants remain blocked by the non-bypassable execution-boundary prerequisite.",
        ],
      };
      await store.saveProbe(probe);
      return probe;
    },
    async getTestnetProbe(probeIdValue) {
      const probe = await store.getProbe(probeIdValue);
      if (!probe) throw new AuthorityError(`Altana testnet probe ${probeIdValue} was not found.`, "PERMISSION_GRANT_NOT_FOUND");
      return probe;
    },
    async getTestnetProbeForJob(jobIntentId) {
      return store.getProbeForJob(jobIntentId);
    },
    async reverifyTestnetProbe(probeIdValue, input = {}, now = new Date()) {
      const existing = await store.getProbe(probeIdValue);
      if (!existing) throw new AuthorityError(`Altana testnet probe ${probeIdValue} was not found.`, "PERMISSION_GRANT_NOT_FOUND");
      let verification: AltanaKeyVerification;
      try {
        verification = await verifier.verify({ walletAddress: existing.walletAddress, sessionPublicKey: existing.sessionPublicKey, network: "testnet" });
      } catch (cause) {
        throw new AuthorityError("Spotriq could not re-verify the Altana BSC Testnet probe key onchain.", "ONCHAIN_VERIFICATION_FAILED", true, cause instanceof Error ? cause.message : cause);
      }
      const expired = existing.expiryUnix <= Math.floor(now.getTime() / 1000);
      const state: AltanaTestnetProbeObservation["state"] = expired ? "EXPIRED" : verification.valid ? "ACTIVE" : existing.state === "ACTIVE" ? "REVOKED" : "INVALID";
      const next: AltanaTestnetProbeObservation = { ...existing, keyId: verification.keyId, keystoreAddress: verification.keystoreAddress, onchainValid: verification.valid, state, verifiedAt: now.toISOString(), verifiedBlockNumber: verification.blockNumber, revocationTransactionHash: input.revocationTransactionHash ?? existing.revocationTransactionHash };
      await store.saveProbe(next);
      return next;
    },
  };
}
