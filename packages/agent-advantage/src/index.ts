import { createHash } from "node:crypto";
import type {
  ActivationActivityOutcomeBundle,
  ActivationOutcomeMetric,
  AgentAdvantageAssessmentState,
  AgentAdvantageReport,
  BuyerAgentAdvantageState,
  ServiceCategory,
} from "@spotriq/domain";
import type { ActivationActivityOutcomesEngine } from "@spotriq/activity-outcomes";

export const AGENT_ADVANTAGE_METHOD = "marketplace.agent-advantage@1.0.0";
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const ADVANTAGE_METRICS = new Set(["agent_advantage_bps", "agent_advantage_delta"]);

export class AgentAdvantageError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_INPUT" | "REPORT_NOT_FOUND",
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AgentAdvantageError";
  }
}

export interface AgentAdvantageDatabase {
  query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{ rows: Row[]; rowCount?: number | null }>;
}

export interface AgentAdvantageStore {
  save(report: AgentAdvantageReport): Promise<void>;
  findByFingerprint(activationId: string, sourceFingerprint: string): Promise<AgentAdvantageReport | undefined>;
  latestForActivation(activationId: string): Promise<AgentAdvantageReport | undefined>;
  listForActivation(activationId: string): Promise<AgentAdvantageReport[]>;
  listForBuyer(buyerAddress: string): Promise<AgentAdvantageReport[]>;
}

function clone<T>(value: T): T { return structuredClone(value); }

export class MemoryAgentAdvantageStore implements AgentAdvantageStore {
  private readonly reports = new Map<string, AgentAdvantageReport>();
  async save(report: AgentAdvantageReport): Promise<void> { this.reports.set(report.reportId, clone(report)); }
  async findByFingerprint(activationId: string, fingerprint: string): Promise<AgentAdvantageReport | undefined> {
    const value = [...this.reports.values()].find(x => x.activationId === activationId && x.sourceFingerprint === fingerprint);
    return value ? clone(value) : undefined;
  }
  async latestForActivation(activationId: string): Promise<AgentAdvantageReport | undefined> {
    const value = [...this.reports.values()].filter(x => x.activationId === activationId).sort((a,b) => b.generatedAt.localeCompare(a.generatedAt))[0];
    return value ? clone(value) : undefined;
  }
  async listForActivation(activationId: string): Promise<AgentAdvantageReport[]> {
    return [...this.reports.values()].filter(x => x.activationId === activationId).sort((a,b) => b.generatedAt.localeCompare(a.generatedAt)).map(clone);
  }
  async listForBuyer(buyerAddress: string): Promise<AgentAdvantageReport[]> {
    return [...this.reports.values()].filter(x => x.buyerAddress === buyerAddress).sort((a,b) => b.generatedAt.localeCompare(a.generatedAt)).map(clone);
  }
}

export class PostgresAgentAdvantageStore implements AgentAdvantageStore {
  constructor(private readonly db: AgentAdvantageDatabase) {}
  async save(report: AgentAdvantageReport): Promise<void> {
    await this.db.query(
      `insert into agent_advantage_reports (report_id,activation_id,service_id,buyer_address,category,relationship_state,report_state,window_started_at,window_ended_at,source_outcome_id,source_outcome_measured_at,source_fingerprint,payload,generated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14)
       on conflict (report_id) do nothing`,
      [report.reportId,report.activationId,report.serviceId,report.buyerAddress,report.category,report.relationshipState,report.state,report.window.startedAt,report.window.endedAt,report.sourceOutcomeId,report.sourceOutcomeMeasuredAt,report.sourceFingerprint,JSON.stringify(report),report.generatedAt],
    );
  }
  async findByFingerprint(activationId: string, sourceFingerprint: string): Promise<AgentAdvantageReport | undefined> {
    return (await this.db.query<{payload:AgentAdvantageReport}>("select payload from agent_advantage_reports where activation_id=$1 and source_fingerprint=$2 order by generated_at desc limit 1",[activationId,sourceFingerprint])).rows[0]?.payload;
  }
  async latestForActivation(activationId: string): Promise<AgentAdvantageReport | undefined> {
    return (await this.db.query<{payload:AgentAdvantageReport}>("select payload from agent_advantage_reports where activation_id=$1 order by generated_at desc limit 1",[activationId])).rows[0]?.payload;
  }
  async listForActivation(activationId: string): Promise<AgentAdvantageReport[]> {
    return (await this.db.query<{payload:AgentAdvantageReport}>("select payload from agent_advantage_reports where activation_id=$1 order by generated_at desc",[activationId])).rows.map(x=>x.payload);
  }
  async listForBuyer(buyerAddress: string): Promise<AgentAdvantageReport[]> {
    return (await this.db.query<{payload:AgentAdvantageReport}>("select payload from agent_advantage_reports where buyer_address=$1 order by generated_at desc",[buyerAddress])).rows.map(x=>x.payload);
  }
}

export interface AgentAdvantageEngine {
  status(): {
    state: "AVAILABLE";
    explicitMeasurementWindowsEnabled: true;
    persistedReportHistoryEnabled: true;
    financialAdvantageInferenceEnabled: false;
    transactionSuccessImpliesAdvantage: false;
    couldNotAssessPreserved: true;
    methodVersion: string;
  };
  measure(activationId: string): Promise<AgentAdvantageReport>;
  latest(activationId: string): Promise<AgentAdvantageReport>;
  listForActivation(activationId: string): Promise<AgentAdvantageReport[]>;
  listForBuyer(buyerAddress: string): Promise<BuyerAgentAdvantageState>;
}

function text(value: string | undefined, label: string): string {
  const v = value?.trim();
  if (!v) throw new AgentAdvantageError(`${label} is required.`, "INVALID_INPUT");
  return v;
}
function address(value: string): string {
  if (!ADDRESS.test(value)) throw new AgentAdvantageError("buyerAddress must be a valid EVM address.", "INVALID_INPUT");
  return value.toLowerCase();
}
function sha(...parts: string[]): string { return createHash("sha256").update(parts.join("\u0000")).digest("hex"); }
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(k => `${JSON.stringify(k)}:${stable(record[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function unique(values: string[]): string[] { return [...new Set(values.filter(Boolean))]; }
function durationSeconds(startedAt: string, endedAt: string): number {
  return Math.max(0, Math.floor((Date.parse(endedAt) - Date.parse(startedAt)) / 1000));
}
function nextStep(category: ServiceCategory, financialState: string, transactionObserved: boolean): string {
  if (!transactionObserved) return category === "rebalancing"
    ? "Reconcile an Activation-attributable transaction before measuring post-rebalance position behavior over a defensible window."
    : category === "grid"
      ? "Reconcile attributable fills before measuring slippage, realised PnL and drawdown over a defined window."
      : category === "yield"
        ? "Reconcile an attributable position change, then observe cash flows and realised yield net of costs over a defined window."
        : "Reconcile an attributable protective action plus before/after risk state; avoided liquidation must not be fabricated as a counterfactual fact.";
  if (financialState === "INSUFFICIENT_HISTORY") return "Continue collecting independently attributable outcome evidence until the existing methodology says the measurement window is sufficient.";
  return "Review the cited deterministic outcome evidence; Spotriq does not convert a measured outcome into financial advice.";
}
function explicitAdvantageMetric(metrics: ActivationOutcomeMetric[]): ActivationOutcomeMetric | undefined {
  return metrics.find(m => ADVANTAGE_METRICS.has(m.metric) && typeof m.value === "number" && m.evidenceIds.length > 0);
}

function sourceFingerprint(bundle: ActivationActivityOutcomeBundle): string {
  const task = bundle.serviceTask;
  const request = bundle.permissionRequest;
  const preflight = bundle.executionState?.latestPreflight;
  const guard = bundle.executionState?.latestGuard;
  return sha(stable({
    activation:{id:bundle.activation.activationId,state:bundle.activation.state,updatedAt:bundle.activation.updatedAt},
    task:task?{id:task.serviceTaskId,state:task.state,result:task.result,originProof:task.originProof}:null,
    permission:request?{id:request.permissionRequestId,state:request.state,permissionGrantId:request.permissionGrantId,blockers:request.blockers}:null,
    preflight:preflight?{id:preflight.preflightId,state:preflight.state,checks:preflight.checks}:null,
    guard:guard?{id:guard.guardReportId,state:guard.state,limitations:guard.limitations}:null,
    outcome:{state:bundle.outcome.state,transactionObserved:bundle.outcome.transactionObserved,technicalObservation:bundle.outcome.technicalObservation,financialOutcome:bundle.outcome.financialOutcome,metrics:bundle.outcome.metrics,evidenceIds:bundle.outcome.evidenceIds},
  }));
}

function buildReport(bundle: ActivationActivityOutcomeBundle, fingerprint: string, generatedAt: string): AgentAdvantageReport {
  const outcome = bundle.outcome;
  const activation = bundle.activation;
  const serviceEvidence = unique([...(bundle.serviceTask?.originProof.evidenceIds ?? []), ...(bundle.serviceTask?.result.evidenceIds ?? [])]);
  const serviceContribution = outcome.technicalObservation.state === "OBSERVED"
    ? { state:"OBSERVED" as const, value:"Observed" as const, detail:`Spotriq observed a structured ${outcome.category} service result. This proves service contribution, not financial benefit.`, evidenceIds:serviceEvidence }
    : outcome.technicalObservation.state === "FAILED"
      ? { state:"FAILED" as const, value:"Failed" as const, detail:"The latest Activation-bound runtime did not produce an accepted structured observation.", evidenceIds:serviceEvidence }
      : { state:"NOT_OBSERVED" as const, value:"Not observed" as const, detail:"No accepted Activation-bound structured service observation exists yet.", evidenceIds:serviceEvidence };
  const txEvidence = unique(outcome.transactionObserved ? outcome.evidenceIds : []);
  const financialEvidence = unique(outcome.evidenceIds);
  const metric = explicitAdvantageMetric(outcome.metrics);
  let advantageState: AgentAdvantageAssessmentState = "COULD_NOT_ASSESS";
  let advantageValue: string = "Could Not Assess";
  let advantageDetail = "Spotriq does not have a transaction-attributable, evidence-backed Agent Advantage metric for this Activation.";
  let advantageEvidence: string[] = [];
  if (outcome.financialOutcome.state === "INSUFFICIENT_HISTORY" && outcome.transactionObserved) {
    advantageState = "INSUFFICIENT_HISTORY";
    advantageValue = "Insufficient History";
    advantageDetail = "An attributable transaction may exist, but the deterministic outcome layer says the history window is not sufficient for an Agent Advantage measurement.";
    advantageEvidence = financialEvidence;
  } else if (outcome.financialOutcome.state === "MEASURED" && outcome.transactionObserved && metric) {
    advantageState = "MEASURED";
    advantageValue = `${metric.value}${metric.unit ? ` ${metric.unit}` : ""}`;
    advantageDetail = `A standardized ${metric.metric} metric is explicitly present with evidence. Spotriq reports the measurement without inferring advice or causality beyond its stated attribution.`;
    advantageEvidence = unique(metric.evidenceIds);
  } else if (outcome.financialOutcome.state === "MEASURED" && outcome.transactionObserved) {
    advantageDetail = "A financial outcome is measured, but no standardized evidence-backed Agent Advantage metric is present. Transaction or outcome success alone is not Agent Advantage.";
    advantageEvidence = financialEvidence;
  }
  const endedAt = activation.state === "REVOKED" ? activation.updatedAt : bundle.syncedAt;
  const state: AgentAdvantageReport["state"] = advantageState === "MEASURED" ? "MEASURED" : serviceContribution.state === "OBSERVED" || outcome.financialOutcome.state !== "COULD_NOT_ASSESS" ? "PARTIAL_EVIDENCE" : "COULD_NOT_ASSESS";
  const reportId = `advantage:${sha(activation.activationId,fingerprint).slice(0,32)}`;
  return {
    reportId,
    activationId:activation.activationId,
    serviceId:activation.serviceId,
    buyerAddress:activation.buyerAddress,
    category:outcome.category,
    relationshipState:activation.state,
    state,
    window:{startedAt:activation.activatedAt,endedAt,durationSeconds:durationSeconds(activation.activatedAt,endedAt),basis:activation.state === "REVOKED" ? "ACTIVATION_TO_REVOCATION" : "ACTIVATION_TO_RECONCILIATION"},
    serviceContribution,
    transactionEvidence:{observed:Boolean(outcome.transactionObserved),value:outcome.transactionObserved?"Transaction observed":"No transaction observed",detail:outcome.transactionObserved?"The source outcome explicitly reports independently reconciled transaction evidence.":"No independently reconciled Activation-attributable transaction is reported by the source outcome.",evidenceIds:txEvidence},
    financialOutcome:{state:outcome.financialOutcome.state,value:outcome.financialOutcome.value,detail:outcome.financialOutcome.detail,evidenceIds:financialEvidence},
    agentAdvantage:{state:advantageState,value:advantageValue,detail:advantageDetail,metricId:metric?.outcomeMetricId,evidenceIds:advantageEvidence},
    metrics:clone(outcome.metrics),
    nextMeasurementStep:nextStep(outcome.category,outcome.financialOutcome.state,Boolean(outcome.transactionObserved)),
    sourceOutcomeId:outcome.outcomeId,
    sourceOutcomeMeasuredAt:outcome.measuredAt,
    sourceFingerprint:fingerprint,
    generatedAt,
    methodVersion:AGENT_ADVANTAGE_METHOD,
    limitations:[
      "Service contribution is not financial advantage.",
      "Transaction success is not financial advantage.",
      "A measured financial outcome is not automatically Agent Advantage; a standardized evidence-backed advantage metric is required.",
      "Could Not Assess is preserved whenever attribution, transaction evidence, history or comparison evidence is insufficient.",
      "This report is deterministic measurement/reporting, not investment advice or an AI-generated score.",
    ],
  };
}

export function createAgentAdvantageEngine(options: { store?: AgentAdvantageStore; activityOutcomes: ActivationActivityOutcomesEngine; now?:()=>Date }): AgentAdvantageEngine {
  const store = options.store ?? new MemoryAgentAdvantageStore();
  const now = options.now ?? (()=>new Date());
  return {
    status:()=>({state:"AVAILABLE",explicitMeasurementWindowsEnabled:true,persistedReportHistoryEnabled:true,financialAdvantageInferenceEnabled:false,transactionSuccessImpliesAdvantage:false,couldNotAssessPreserved:true,methodVersion:AGENT_ADVANTAGE_METHOD}),
    async measure(activationId:string){
      const id=text(activationId,"activationId");
      const bundle=await options.activityOutcomes.sync(id);
      const fingerprint=sourceFingerprint(bundle);
      const existing=await store.findByFingerprint(id,fingerprint);
      if(existing)return existing;
      const report=buildReport(bundle,fingerprint,now().toISOString());
      await store.save(report);
      return (await store.findByFingerprint(id,fingerprint))??report;
    },
    async latest(activationId:string){const id=text(activationId,"activationId");const report=await store.latestForActivation(id);if(!report)throw new AgentAdvantageError(`No Agent Advantage report exists for Activation ${id}.`,"REPORT_NOT_FOUND");return report;},
    listForActivation:(activationId:string)=>store.listForActivation(text(activationId,"activationId")),
    async listForBuyer(buyerAddress:string){const buyer=address(buyerAddress);return{buyerAddress:buyer,reports:await store.listForBuyer(buyer),generatedAt:now().toISOString(),methodVersion:AGENT_ADVANTAGE_METHOD,limitations:["Buyer report history contains only persisted deterministic Agent Advantage reconciliations.","Missing reports are not interpreted as zero benefit or negative performance."]};},
  };
}
