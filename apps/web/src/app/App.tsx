import React, { useState, useEffect, useCallback } from "react";
import {
  Activity, AlertCircle, AlertTriangle, ArrowLeft, ArrowRight,
  ArrowUpRight, Bell, Check, CheckCircle2, ChevronDown, ChevronRight,
  ChevronUp, Clock, Copy, ExternalLink, Eye, Filter, Home,
  Info, Lock, Menu, Minus, MoreHorizontal, Play, Plus,
  RefreshCw, Search, Shield, ShieldCheck, Sliders, Star,
  TrendingDown, TrendingUp, Wallet, X, Zap, BookOpen,
  CircleDot, Timer, Target, GitCompare, RotateCcw,
  Radio, Layers, BarChart2, PieChart, FileText, FlaskConical, Sparkles
} from "lucide-react";


import type {
  Route, CheckPhase, ExploreCategory, MyAgentsTab, AgentProfileTab,
  CheckoutStep, ServiceCategory, ReadinessState, PermissionIntensity,
  FindingState, FindingSeverity, ActivationState, PermissionGrantState,
  EvidenceProvenance, NavState, AgentService, FindingServiceMatch, FindingServiceMatchPage, RebalancingMetrics,
  GridMetrics, YieldMetrics, HealthMetrics, Finding, Activation,
  PermissionGrant, ActivityEvent, CheckSourceProgress, SmartMoneyCheckEvent, DiscoveredAgent, AgentRegistryChainId, MarketplaceServiceRecord, MarketplaceFinancialDiscovery, RebalancingJobIntent, BoundedPermissionRequest, BoundedPermissionGrant, AltanaTestnetProbeObservation, RebalancingExecutionPlan, FinancialExecutionBoundary, ExecutionBoundaryPreflight, BoundaryFinancialSessionObservation, BoundaryFinancialReadiness, BoundaryApprovalPlan, BoundaryApprovalObservation, ControlledRebalancingExecution, ExecutionActivityOutcomeBundle, ServiceTask,
} from "../domain/types";
import { DEMO_MARKETPLACE } from "../repositories/marketplaceRepository";
import { BRAND } from "../config/brand";
import { FOOTER_CONFIG } from "../config/footer";
import { subscribeToMockCheck, runMockActivation, runMockAgentTest } from "../services/mockRealtime";
import { walletHandlers } from "../services/walletHandlers";
import {
  getActiveCheckMode, getActiveCheckSessionId, setActiveLiveCheck, setExampleCheckMode, smartMoneyRepository,
  type SmartMoneyCheckView,
} from "../repositories/smartMoneyRepository";
import { subscribeToSmartMoneyCheck } from "../services/smartMoneyRealtime";
import { agentRegistryRepository } from "../repositories/agentRegistryRepository";
import { marketplaceSupplyRepository } from "../repositories/marketplaceSupplyRepository";
import { jobIntentRepository } from "../repositories/jobIntentRepository";
import { authorityRepository } from "../repositories/authorityRepository";
import { altanaHandlers } from "../services/altanaHandlers";
import { executionPlanRepository } from "../repositories/executionPlanRepository";
import { controlledExecutionRepository } from "../repositories/controlledExecutionRepository";
import { activityOutcomesRepository } from "../repositories/activityOutcomesRepository";
import { serviceTaskRepository } from "../repositories/serviceTaskRepository";

const {
  services: SERVICES,
  findings: FINDINGS,
  activations: ACTIVATIONS,
  permissionGrants: PERMISSION_GRANTS,
  activityEvents: ACTIVITY_EVENTS,
  planTemplates: PLAN_TEMPLATES,
} = DEMO_MARKETPLACE;

// ─── UTILITIES ─────────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  rebalancing: "Rebalancing", grid: "Grid Trading", yield: "Yield Optimisation", health: "Health Factor Monitoring"
};
const CATEGORY_GOALS: Record<ServiceCategory, string> = {
  rebalancing: "Manage my liquidity", grid: "Automate trading", yield: "Put capital to work", health: "Protect my borrowing position"
};
const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  rebalancing: "text-[#60a5fa]", grid: "text-[#a78bfa]", yield: "text-[#2dd4bf]", health: "text-[#4ade80]"
};
const CATEGORY_BG: Record<ServiceCategory, string> = {
  rebalancing: "bg-[#60a5fa]/10 text-[#60a5fa]", grid: "bg-[#a78bfa]/10 text-[#a78bfa]",
  yield: "bg-[#2dd4bf]/10 text-[#2dd4bf]", health: "bg-[#4ade80]/10 text-[#4ade80]"
};

const READINESS_CONFIG: Record<ReadinessState, { label: string; color: string; dot: string }> = {
  READY: { label: "Ready Now", color: "text-[#4ade80]", dot: "bg-[#4ade80]" },
  LIMITED: { label: "Limited", color: "text-[#f59e0b]", dot: "bg-[#f59e0b]" },
  DEGRADED: { label: "Degraded", color: "text-[#f87171]", dot: "bg-[#f87171]" },
  OFFLINE: { label: "Offline", color: "text-[#6b7d99]", dot: "bg-[#6b7d99]" },
  TESTNET_ONLY: { label: "Testnet Only", color: "text-[#a78bfa]", dot: "bg-[#a78bfa]" },
  SUSPENDED: { label: "Suspended", color: "text-[#f87171]", dot: "bg-[#f87171]" },
};

const PERMISSION_CONFIG: Record<PermissionIntensity, { label: string; color: string; bars: number }> = {
  "read-only": { label: "Read-only", color: "text-[#4ade80]", bars: 1 },
  low: { label: "Low authority", color: "text-[#4ade80]", bars: 1 },
  medium: { label: "Medium authority", color: "text-[#f59e0b]", bars: 2 },
  high: { label: "High authority", color: "text-[#f87171]", bars: 3 },
  unknown: { label: "Authority undeclared", color: "text-[#6b7d99]", bars: 0 },
};

const FINDING_CONFIG: Record<FindingState, { label: string; color: string; bg: string; icon: typeof AlertTriangle }> = {
  "needs-attention": { label: "Needs Attention", color: "text-[#f59e0b]", bg: "border-[#f59e0b]/20 bg-[#f59e0b]/5", icon: AlertTriangle },
  opportunity: { label: "Opportunity", color: "text-[#2dd4bf]", bg: "border-[#2dd4bf]/20 bg-[#2dd4bf]/5", icon: TrendingUp },
  healthy: { label: "Healthy", color: "text-[#4ade80]", bg: "border-[#4ade80]/20 bg-[#4ade80]/5", icon: CheckCircle2 },
  informational: { label: "Informational", color: "text-[#60a5fa]", bg: "border-[#60a5fa]/20 bg-[#60a5fa]/5", icon: Info },
  "could-not-assess": { label: "Could Not Assess", color: "text-[#f59e0b]", bg: "border-[#f59e0b]/20 bg-[#f59e0b]/5", icon: AlertCircle },
};

// ─── BASE UI ───────────────────────────────────────────────────────────────────

function Badge({ children, variant = "default", className = "" }: { children: React.ReactNode; variant?: "default" | "teal" | "amber" | "red" | "green" | "blue" | "purple" | "muted"; className?: string }) {
  const v = {
    default: "bg-[#1c2433] text-[#9aacc4] border border-white/5",
    teal: "bg-[#2dd4bf]/10 text-[#2dd4bf] border border-[#2dd4bf]/20",
    amber: "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20",
    red: "bg-[#f87171]/10 text-[#f87171] border border-[#f87171]/20",
    green: "bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20",
    blue: "bg-[#60a5fa]/10 text-[#60a5fa] border border-[#60a5fa]/20",
    purple: "bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20",
    muted: "bg-white/5 text-[#6b7d99] border border-white/5",
  }[variant];
  return <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded font-mono tracking-wide uppercase", v, className)}>{children}</span>;
}

function ProvenanceBadge({ type }: { type: EvidenceProvenance }) {
  const config = {
    "marketplace-observed": { label: "Observed", variant: "teal" as const },
    "marketplace-derived": { label: "Calculated", variant: "blue" as const },
    external: { label: "External", variant: "purple" as const },
    "operator-claimed": { label: "Operator supplied", variant: "muted" as const },
  }[type];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function ReadinessPill({ state, note }: { state: ReadinessState; note?: string }) {
  const cfg = READINESS_CONFIG[state];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", cfg.color)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
      {note && <span className="text-[#6b7d99] font-normal normal-case">·&nbsp;{note}</span>}
    </span>
  );
}

function AuthorityBars({ intensity }: { intensity: PermissionIntensity }) {
  const cfg = PERMISSION_CONFIG[intensity];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", cfg.color)}>
      <span className="flex gap-0.5">
        {[1, 2, 3].map(i => (
          <span key={i} className={cn("w-1 h-3 rounded-sm", i <= cfg.bars ? (cfg.bars === 1 ? "bg-[#4ade80]" : cfg.bars === 2 ? "bg-[#f59e0b]" : "bg-[#f87171]") : "bg-white/10")} />
        ))}
      </span>
      {cfg.label}
    </span>
  );
}

function CategoryPill({ category }: { category: ServiceCategory }) {
  return <span className={cn("inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded font-mono uppercase tracking-wide", CATEGORY_BG[category])}>{CATEGORY_LABELS[category]}</span>;
}

function Btn({ children, variant = "primary", size = "md", onClick, disabled, className = "", type = "button" }: {
  children: React.ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger" | "teal-outline";
  size?: "sm" | "md" | "lg"; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit";
}) {
  const v = {
    primary: "bg-[#2dd4bf] text-[#061010] hover:bg-[#26bfad] font-semibold",
    secondary: "bg-[#1c2433] text-[#dde3ef] hover:bg-[#243045] border border-white/8",
    ghost: "text-[#9aacc4] hover:text-[#dde3ef] hover:bg-white/5",
    danger: "bg-[#f87171]/10 text-[#f87171] hover:bg-[#f87171]/20 border border-[#f87171]/20",
    "teal-outline": "border border-[#2dd4bf]/30 text-[#2dd4bf] hover:bg-[#2dd4bf]/10",
  }[variant];
  const s = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-sm" }[size];
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={cn("inline-flex items-center gap-2 rounded-md transition-colors cursor-pointer", v, s, disabled && "opacity-40 cursor-not-allowed", className)}>
      {children}
    </button>
  );
}

function Card({ children, className = "", hover = false }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={cn("bg-card border border-white/7 rounded-lg", hover && "hover:border-white/12 transition-colors cursor-pointer", className)}>
      {children}
    </div>
  );
}

function SectionHeader({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xs font-mono uppercase tracking-widest text-[#6b7d99]">{label}</h2>
      {action}
    </div>
  );
}

function MetricItem({ label, value, sub, provenance, positive }: { label: string; value: string; sub?: string; provenance?: EvidenceProvenance; positive?: boolean }) {
  return (
    <div>
      <div className={cn("text-lg font-semibold font-mono tabular-nums", positive === true ? "text-[#4ade80]" : positive === false ? "text-[#f87171]" : "text-[#dde3ef]")}>{value}</div>
      <div className="text-xs text-[#6b7d99] mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-[#6b7d99]/70 mt-0.5">{sub}</div>}
      {provenance && <div className="mt-1"><ProvenanceBadge type={provenance} /></div>}
    </div>
  );
}

// ─── CATEGORY VISUALS ────────────────────────────────────────────────────────

function RangeVisual({ lower, upper, current, outOfRange }: { lower: number; upper: number; current: number; outOfRange?: boolean }) {
  const min = lower * 0.9, max = upper * 1.1;
  const toP = (v: number) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
  const lP = toP(lower), uP = toP(upper), cP = toP(current);
  const inRange = current >= lower && current <= upper;
  return (
    <div className="py-3">
      <div className="relative h-6 bg-[#1c2433] rounded overflow-hidden">
        <div className="absolute inset-y-0 bg-[#2dd4bf]/15 border-x border-[#2dd4bf]/30" style={{ left: `${lP}%`, right: `${100 - uP}%` }} />
        <div className={cn("absolute top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full", inRange ? "bg-[#2dd4bf]" : "bg-[#f59e0b]")} style={{ left: `${cP}%` }} />
      </div>
      <div className="flex justify-between mt-1.5 text-[11px] font-mono text-[#6b7d99]">
        <span>${lower}</span>
        <span className={cn("font-medium", inRange ? "text-[#2dd4bf]" : "text-[#f59e0b]")}>
          ${current} {inRange ? "· In range" : "· Outside range"}
        </span>
        <span>${upper}</span>
      </div>
    </div>
  );
}

function GridVisual({ fills, currentPrice }: { fills: number; currentPrice: number }) {
  const levels = [245, 238, 231, 224, 217, 210, 203];
  return (
    <div className="py-2 space-y-0.5">
      {levels.map((p, i) => {
        const filled = i > 2 && i < 6;
        const isCurrent = Math.abs(p - currentPrice) < 7;
        return (
          <div key={p} className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[#6b7d99] w-10 text-right">${p}</span>
            <div className={cn("flex-1 h-2 rounded-sm", filled ? "bg-[#a78bfa]/40" : "bg-[#1c2433]")} />
            {isCurrent && <span className="text-[10px] font-mono text-[#dde3ef]">← current</span>}
            {filled && !isCurrent && <span className="text-[10px] font-mono text-[#6b7d99]">filled</span>}
          </div>
        );
      })}
    </div>
  );
}

function HealthVisual({ healthFactor, warningThreshold = 1.5, liquidationThreshold = 1.0 }: { healthFactor: number; warningThreshold?: number; liquidationThreshold?: number }) {
  const max = 2.5;
  const pct = Math.min(100, (healthFactor / max) * 100);
  const wPct = (warningThreshold / max) * 100;
  const lPct = (liquidationThreshold / max) * 100;
  const color = healthFactor < liquidationThreshold + 0.1 ? "#f87171" : healthFactor < warningThreshold ? "#f59e0b" : "#4ade80";
  return (
    <div className="py-2">
      <div className="relative h-4 bg-[#1c2433] rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color + "33" }} />
        <div className="absolute inset-y-0 w-0.5 bg-[#f59e0b]/50" style={{ left: `${wPct}%` }} />
        <div className="absolute inset-y-0 w-0.5 bg-[#f87171]/60" style={{ left: `${lPct}%` }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2" style={{ left: `calc(${pct}% - 5px)`, backgroundColor: color, borderColor: color + "80" }} />
      </div>
      <div className="flex justify-between mt-1.5 text-[11px] font-mono">
        <span className="text-[#f87171]">Liquidation {liquidationThreshold.toFixed(1)}</span>
        <span style={{ color }} className="font-semibold">HF {healthFactor.toFixed(2)}</span>
        <span className="text-[#f59e0b]">Watch {warningThreshold.toFixed(1)}</span>
      </div>
    </div>
  );
}

function YieldBreakdown({ gross, protocolCost, agentFee, net }: { gross: string; protocolCost: string; agentFee: string; net: string }) {
  const rows = [
    { label: "Current reported rate", value: gross, sign: "positive" },
    { label: "Est. protocol costs", value: protocolCost, sign: "negative" },
    { label: "Agent fee", value: agentFee, sign: "negative" },
    { label: "Est. net rate", value: net, sign: "net", divider: true },
  ];
  return (
    <div className="space-y-1">
      {rows.map((r, i) => (
        <div key={i}>
          {r.divider && <div className="border-t border-white/8 my-1.5" />}
          <div className="flex justify-between text-sm">
            <span className="text-[#6b7d99]">{r.label}</span>
            <span className={cn("font-mono tabular-nums font-medium", r.sign === "positive" ? "text-[#4ade80]" : r.sign === "negative" ? "text-[#f87171]" : "text-[#dde3ef]")}>{r.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── AGENT CARD ────────────────────────────────────────────────────────────────

function AgentCard({ service, onView, onCompare, compareSelected, contextNote }: {
  service: AgentService;
  onView: () => void;
  onCompare?: () => void;
  compareSelected?: boolean;
  contextNote?: string;
}) {
  const rd = READINESS_CONFIG[service.readiness];
  const pm = PERMISSION_CONFIG[service.permissionIntensity];
  const m = service.categoryMetrics!;

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-[#dde3ef]">{service.name}</span>
            {service.erc8004Verified && <Shield className="w-3.5 h-3.5 text-[#2dd4bf] shrink-0" />}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <CategoryPill category={service.category} />
          </div>
          {contextNote && <div className="text-[11px] text-[#2dd4bf] bg-[#2dd4bf]/8 border border-[#2dd4bf]/15 rounded px-2 py-1 mb-2">{contextNote}</div>}
          <p className="text-xs text-[#6b7d99] line-clamp-2">{service.description}</p>
        </div>
        <ReadinessPill state={service.readiness} />
      </div>

      {/* Category-specific metrics */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-white/6">
        {m.type === "rebalancing" && <>
          <MetricItem label="Time in range (30d)" value={m.timeInRange} provenance="marketplace-observed" />
          <MetricItem label="Rebalance success" value={m.rebalanceSuccess} provenance="marketplace-observed" />
          <MetricItem label="Rebalance freq." value={m.rebalanceFreq} provenance="marketplace-observed" />
          <MetricItem label="Strategy" value={m.strategyType} />
        </>}
        {m.type === "grid" && <>
          <MetricItem label="Net P&L observed" value={m.netPnL} provenance="marketplace-observed" positive={m.netPnL.startsWith("+")} />
          <MetricItem label="Max drawdown" value={m.maxDrawdown} provenance="marketplace-observed" />
          <MetricItem label="Fills" value={`${m.fills}`} sub={m.period} provenance="marketplace-observed" />
          <MetricItem label="Grid type" value={m.gridType} />
        </>}
        {m.type === "yield" && <>
          <MetricItem label="Current reported rate" value={m.currentRate} provenance="operator-claimed" />
          <MetricItem label="Est. net rate" value={m.estimatedNet} provenance="marketplace-derived" />
          {m.observedRealised && <MetricItem label="Observed realised (30d)" value={m.observedRealised} provenance="marketplace-observed" />}
          <MetricItem label="Risk band" value={m.riskBand} />
        </>}
        {m.type === "health" && <>
          <MetricItem label="Monitoring interval" value={m.monitoringInterval} />
          <MetricItem label="Detection latency" value={m.detectionLatency} provenance="marketplace-observed" />
          <MetricItem label="Reliability (90d)" value={m.reliability} provenance="marketplace-observed" positive={true} />
          <MetricItem label="Protection modes" value={`${m.protectionModes.length} modes`} />
        </>}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-white/6 space-y-2">
        <div className="flex flex-wrap gap-2 text-xs text-[#6b7d99]">
          <span>{service.supportedProtocols.join(", ")}</span>
          <span>·</span>
          <AuthorityBars intensity={service.permissionIntensity} />
          <span>·</span>
          <span className="text-[#dde3ef]">{service.pricing.amount}{service.pricing.period ? `/${service.pricing.period}` : ""}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <CheckCircle2 className="w-3 h-3 text-[#2dd4bf]" />
          <span className="text-[#2dd4bf]">Marketplace Tested</span>
          <span className="text-[#6b7d99]">· {service.evidenceSummary.testsPassed} tests</span>
        </div>
        <div className="flex items-center justify-between mt-3">
          {onCompare && (
            <label className="flex items-center gap-2 text-xs text-[#6b7d99] cursor-pointer select-none">
              <input type="checkbox" checked={compareSelected} onChange={onCompare}
                className="w-3.5 h-3.5 rounded border-white/20 bg-[#1c2433] accent-[#2dd4bf]" />
              Compare
            </label>
          )}
          {!onCompare && <div />}
          <Btn variant="ghost" size="sm" onClick={onView} className="text-[#2dd4bf]">
            View Agent <ChevronRight className="w-3.5 h-3.5" />
          </Btn>
        </div>
      </div>
    </Card>
  );
}

// ─── FINDING CARD ────────────────────────────────────────────────────────────

function FindingCard({ finding, onAction, onExpand }: {
  finding: Finding;
  onAction: () => void;
  onExpand?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = FINDING_CONFIG[finding.state];
  const Icon = cfg.icon;

  return (
    <div className={cn("border rounded-lg overflow-hidden transition-all", cfg.bg)}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", cfg.color)} />
            <div>
              <div className="flex items-center gap-2">
                <span className={cn("text-[11px] font-mono uppercase tracking-wide font-semibold", cfg.color)}>{cfg.label}</span>
                <CategoryPill category={finding.category} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#6b7d99] shrink-0">
            <Clock className="w-3 h-3" />
            {finding.freshness}
          </div>
        </div>

        <h3 className="text-[#dde3ef] font-medium mb-2">{finding.headline}</h3>
        <p className="text-sm text-[#6b7d99] mb-4">{finding.summary}</p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {finding.keyValues.slice(0, 4).map((kv, i) => (
            <div key={i} className="bg-black/20 rounded px-3 py-2">
              <div className="text-[11px] text-[#6b7d99] mb-0.5">{kv.label}</div>
              <div className="text-sm font-mono font-medium text-[#dde3ef] tabular-nums">{kv.value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={finding.confidence === "high" ? "green" : finding.confidence === "medium" ? "amber" : "muted"}>
            {finding.confidence} confidence
          </Badge>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-white/8 pt-4 space-y-3">
          <div>
            <div className="text-xs font-mono uppercase text-[#6b7d99] mb-1">What an agent could do</div>
            <p className="text-sm text-[#9aacc4]">{finding.whatCouldAgentDo}</p>
          </div>
          {finding.uncertainties && (
            <div>
              <div className="text-xs font-mono uppercase text-[#6b7d99] mb-1">What we are uncertain about</div>
              <p className="text-sm text-[#9aacc4]">{finding.uncertainties}</p>
            </div>
          )}
          <div>
            <div className="text-xs font-mono uppercase text-[#6b7d99] mb-1">Coverage</div>
            <p className="text-sm text-[#9aacc4]">Based on supported BSC positions detected at check time. Does not cover all protocols or assets in your wallet.</p>
          </div>
        </div>
      )}

      <div className="px-5 pb-4 flex items-center gap-3">
        <Btn variant="teal-outline" size="sm" onClick={onAction}>{finding.primaryAction.label}</Btn>
        <button onClick={() => setExpanded(e => !e)} className="text-xs text-[#6b7d99] hover:text-[#9aacc4] flex items-center gap-1 transition-colors">
          {expanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
        </button>
      </div>
    </div>
  );
}

// ─── PLAN CARD ────────────────────────────────────────────────────────────────

function PlanCard({ plan, onView }: { plan: typeof PLAN_TEMPLATES[0]; onView: () => void }) {
  return (
    <Card hover className="p-5" onClick={onView}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-[#dde3ef] mb-1">{plan.name}</h3>
          <p className="text-xs text-[#6b7d99]">{plan.goal}</p>
        </div>
        <span className="text-xs font-mono text-[#9aacc4] shrink-0">{plan.estimatedCost}</span>
      </div>
      <div className="flex gap-1.5 mb-3">
        {plan.categories.map(c => <CategoryPill key={c} category={c} />)}
      </div>
      <p className="text-xs text-[#6b7d99] mb-3">{plan.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#6b7d99]">Authority: {plan.authorityLevel}</span>
        <ChevronRight className="w-4 h-4 text-[#6b7d99]" />
      </div>
    </Card>
  );
}

// ─── GLOBAL NAV ──────────────────────────────────────────────────────────────

function GlobalNav({ nav, navigate, activeAgents }: {
  nav: NavState;
  navigate: (r: Route, p?: Partial<NavState>) => void;
  activeAgents: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links: { label: string; route: Route }[] = [
    { label: "Home", route: "home" },
    { label: "Explore", route: "explore" },
    { label: "Smart Money Check", route: "check" },
    { label: "My Agents", route: "my-agents" },
  ];

  return (
    <header className="h-14 border-b border-white/7 bg-[#0c0f14]/95 backdrop-blur-sm sticky top-0 z-40 flex items-center px-6 gap-6">
      {/* Logo */}
      <button onClick={() => navigate("home")} className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-md bg-[#2dd4bf]/15 border border-[#2dd4bf]/30 flex items-center justify-center">
          <CircleDot className="w-4 h-4 text-[#2dd4bf]" />
        </div>
        <span className="font-semibold text-[#dde3ef] text-sm hidden sm:block">{BRAND.name}</span>
        <span className="text-[11px] font-mono text-[#f0b90b] bg-[#f0b90b]/10 border border-[#f0b90b]/20 px-1.5 py-0.5 rounded hidden sm:block">BSC</span>
      </button>

      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center gap-1 flex-1">
        {links.map(l => (
          <button key={l.route} onClick={() => navigate(l.route)}
            className={cn("px-3 py-1.5 text-sm rounded-md transition-colors", nav.route === l.route ? "text-[#dde3ef] bg-white/8" : "text-[#6b7d99] hover:text-[#9aacc4] hover:bg-white/4")}>
            {l.label}
            {l.route === "my-agents" && activeAgents > 0 && (
              <span className="ml-1.5 text-[10px] font-mono bg-[#2dd4bf]/20 text-[#2dd4bf] px-1.5 py-0.5 rounded-full">{activeAgents}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Right */}
      <div className="flex items-center gap-2 ml-auto">
        <button className="w-8 h-8 flex items-center justify-center text-[#6b7d99] hover:text-[#9aacc4] rounded-md hover:bg-white/5 transition-colors">
          <Search className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-[#6b7d99] hover:text-[#9aacc4] rounded-md hover:bg-white/5 transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#f59e0b] rounded-full" />
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#1c2433] border border-white/8 hover:border-white/14 transition-colors text-sm text-[#9aacc4]">
          <Wallet className="w-3.5 h-3.5" />
          <span className="hidden sm:block font-mono text-xs">0x7F3a...9c2d</span>
        </button>
        <button className="md:hidden w-8 h-8 flex items-center justify-center text-[#6b7d99]" onClick={() => setMenuOpen(m => !m)}>
          {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="absolute top-14 left-0 right-0 bg-[#0f1520] border-b border-white/8 p-4 space-y-1 md:hidden z-50">
          {links.map(l => (
            <button key={l.route} onClick={() => { navigate(l.route); setMenuOpen(false); }}
              className={cn("w-full text-left px-4 py-2.5 rounded-md text-sm", nav.route === l.route ? "text-[#dde3ef] bg-white/8" : "text-[#6b7d99]")}>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

// ─── MOBILE BOTTOM NAV ────────────────────────────────────────────────────────

function MobileBottomNav({ nav, navigate }: { nav: NavState; navigate: (r: Route) => void }) {
  const items = [
    { route: "home" as Route, icon: Home, label: "Home" },
    { route: "explore" as Route, icon: Search, label: "Explore" },
    { route: "check" as Route, icon: Shield, label: "Check" },
    { route: "my-agents" as Route, icon: Layers, label: "My Agents" },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0f1520] border-t border-white/8 flex z-40">
      {items.map(i => {
        const Icon = i.icon;
        const active = nav.route === i.route;
        return (
          <button key={i.route} onClick={() => navigate(i.route)} className="flex-1 flex flex-col items-center justify-center gap-1">
            <Icon className={cn("w-5 h-5", active ? "text-[#2dd4bf]" : "text-[#6b7d99]")} />
            <span className={cn("text-[10px]", active ? "text-[#2dd4bf]" : "text-[#6b7d99]")}>{i.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── CONTEXT BAR ─────────────────────────────────────────────────────────────

function ContextBar({ finding, onClear }: { finding: Finding; onClear: () => void }) {
  return (
    <div className="bg-[#193040] border border-[#2dd4bf]/20 rounded-lg px-4 py-3 flex items-center gap-4">
      <div className="text-xs text-[#6b7d99] shrink-0">Checking agents for:</div>
      <div className="flex flex-wrap gap-2 flex-1">
        {finding.keyValues.slice(0, 3).map((kv, i) => (
          <span key={i} className="text-xs text-[#dde3ef] font-mono">{kv.value}</span>
        ))}
      </div>
      <button onClick={onClear} className="text-xs text-[#6b7d99] hover:text-[#9aacc4] shrink-0 flex items-center gap-1">
        <X className="w-3 h-3" /> Clear
      </button>
    </div>
  );
}

// ─── PAGE: HOME ───────────────────────────────────────────────────────────────

function HomePage({ navigate, hasActivations }: { navigate: (r: Route, p?: Partial<NavState>) => void; hasActivations: boolean }) {
  const categories: { category: ServiceCategory; goal: string; hint: string }[] = [
    { category: "rebalancing", goal: "Manage my liquidity", hint: "For concentrated-liquidity LP positions" },
    { category: "grid", goal: "Automate trading", hint: "Systematic buy/sell across a price range" },
    { category: "yield", goal: "Put capital to work", hint: "Find appropriate yield on eligible assets" },
    { category: "health", goal: "Protect my borrowing position", hint: "Monitor health factor & prevent liquidation" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-16">
      {/* Sample data notice */}
      <div className="text-[11px] font-mono text-center text-[#6b7d99] bg-white/3 border border-white/6 rounded px-3 py-1.5">
        Example Portfolio / Sample Data — all values are synthetic and for demonstration only
      </div>

      {/* Hero */}
      <div className="text-center space-y-6 max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-semibold text-[#dde3ef] leading-tight tracking-tight">
          {BRAND.tagline}
        </h1>
        <p className="text-lg text-[#6b7d99]">{BRAND.description}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Btn variant="primary" size="lg" onClick={() => navigate("check")}>
            <Shield className="w-4 h-4" /> Check My Wallet
          </Btn>
          <Btn variant="secondary" size="lg" onClick={() => navigate("explore")}>
            Explore Agents <ArrowRight className="w-4 h-4" />
          </Btn>
        </div>
        <p className="text-xs text-[#6b7d99] flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3" /> Read-only until you choose to activate an agent.
        </p>
      </div>

      {/* Four goals */}
      <div>
        <SectionHeader label="What would you like to do?" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {categories.map(c => (
            <button key={c.category} onClick={() => navigate("explore", { exploreCategory: c.category })}
              className={cn("text-left p-5 rounded-lg border border-white/7 bg-card hover:border-white/14 hover:bg-[#1c2433]/50 transition-all group")}>
              <div className={cn("text-xs font-mono uppercase tracking-wide mb-2", CATEGORY_COLORS[c.category])}>{CATEGORY_LABELS[c.category]}</div>
              <div className="font-medium text-[#dde3ef] mb-2 group-hover:text-white transition-colors">{c.goal}</div>
              <div className="text-xs text-[#6b7d99]">{c.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Smart Money Check CTA */}
      <div className="bg-[#141b24] border border-[#2dd4bf]/15 rounded-xl p-8 text-center space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-mono text-[#2dd4bf] bg-[#2dd4bf]/10 border border-[#2dd4bf]/20 px-3 py-1.5 rounded-full mb-2">
          <Radio className="w-3 h-3" /> Smart Money Check
        </div>
        <h2 className="text-2xl font-semibold text-[#dde3ef]">Don&apos;t know what you need?</h2>
        <p className="text-[#6b7d99] max-w-lg mx-auto">Smart Money Check reads supported public BSC portfolio data and identifies where specialist agents may be useful — with zero write access.</p>
        <Btn variant="primary" size="lg" onClick={() => navigate("check")}>
          Run Smart Money Check <ArrowRight className="w-4 h-4" />
        </Btn>
      </div>

      {/* Smart Money Plans */}
      <div>
        <SectionHeader label="Smart Money Plans" action={
          <Btn variant="ghost" size="sm" onClick={() => navigate("plans")} className="text-[#2dd4bf]">All plans <ChevronRight className="w-3.5 h-3.5" /></Btn>
        } />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLAN_TEMPLATES.map(p => <PlanCard key={p.planId} plan={p} onView={() => navigate("plan-profile", { planId: p.planId })} />)}
        </div>
      </div>

      {/* Trust section */}
      <div>
        <SectionHeader label="Why trust this marketplace?" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Shield, title: "Verified Identity", desc: "Agents are linked to ERC-8004 on-chain identity records, not just operator claims." },
            { icon: BarChart2, title: "Marketplace Evidence", desc: "Performance data is observed by the marketplace, separated from operator-supplied claims." },
            { icon: CheckCircle2, title: "Standardized Tests", desc: "All listed agents pass required marketplace tests before being marked Ready." },
            { icon: Lock, title: "Scoped Permissions", desc: "You control exactly what each agent can access, with strict limits and expiry." },
            { icon: X, title: "Revocable Anytime", desc: "Cancel any agent's authority immediately. Revocation happens on-chain." },
            { icon: Eye, title: "Full Transparency", desc: "Every agent action is logged. You can always see what was done and why." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-4 rounded-lg border border-white/6 bg-card">
              <Icon className="w-5 h-5 text-[#2dd4bf] mb-3" />
              <div className="font-medium text-[#dde3ef] text-sm mb-1">{title}</div>
              <div className="text-xs text-[#6b7d99]">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}




function LiveServiceCandidateCard({ record, onInspect, inspecting, onRunTests, testing }: { record: MarketplaceServiceRecord; onInspect: () => void; inspecting: boolean; onRunTests: () => void; testing: boolean }) {
  const service = record.service;
  const failedOrUnknown = (record.readiness.checks ?? []).filter((check) => check.state !== "PASS");
  const machineEndpoints = (service.runtimeEndpoints ?? []).filter((endpoint) => endpoint.machineCallable);
  const marketplaceTestCheck = (record.readiness.checks ?? []).find((check) => check.code === "MARKETPLACE_TESTS");
  const testLabel = marketplaceTestCheck?.state === "PASS" ? "Contract tests passed" : marketplaceTestCheck?.state === "FAIL" ? "Tests failed" : marketplaceTestCheck?.state === "WARN" ? "Partial coverage" : "Not run";
  const testClass = marketplaceTestCheck?.state === "PASS" ? "text-[#4ade80]" : marketplaceTestCheck?.state === "FAIL" ? "text-[#f87171]" : "text-[#f59e0b]";
  return (
    <Card className="p-4 space-y-3 border-[#2dd4bf]/15 bg-[#2dd4bf]/[0.025]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[#dde3ef] truncate">{service.name}</span>
            <CategoryPill category={service.category} />
            <Badge variant="teal">Normalized service</Badge>
          </div>
          <div className="text-[11px] text-[#6b7d99] font-mono mt-1">ERC-8004 #{record.identity.identity.agentId} · {record.listing.status}</div>
        </div>
        <ReadinessPill state={service.readiness} />
      </div>

      <p className="text-xs text-[#6b7d99] line-clamp-2">{service.description}</p>

      <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-white/6">
        <div>
          <div className="text-[#6b7d99] mb-0.5">Runtime</div>
          <div className={machineEndpoints.length ? "text-[#dde3ef]" : "text-[#f59e0b]"}>{machineEndpoints.length ? `${machineEndpoints.length} machine endpoint${machineEndpoints.length > 1 ? "s" : ""}` : "No A2A/MCP endpoint"}</div>
          <div className="text-[10px] text-[#6b7d99]">Operator-supplied registration metadata</div>
        </div>
        <div>
          <div className="text-[#6b7d99] mb-0.5">Authority</div>
          <div className="text-[#f59e0b]">Undeclared</div>
          <div className="text-[10px] text-[#6b7d99]">Permission profile required</div>
        </div>
        <div>
          <div className="text-[#6b7d99] mb-0.5">Commercial terms</div>
          <div className="text-[#9aacc4]">{record.offer.state === "AVAILABLE" ? "Offer available" : "Not declared"}</div>
          <div className="text-[10px] text-[#6b7d99]">No inferred pricing</div>
        </div>
        <div>
          <div className="text-[#6b7d99] mb-0.5">Marketplace tests</div>
          <div className={testClass}>{testLabel}</div>
          <div className="text-[10px] text-[#6b7d99]">{service.evidenceSummary.testsPassed} check{service.evidenceSummary.testsPassed === 1 ? "" : "s"} passed · no financial execution</div>
        </div>
      </div>

      {service.supportedProtocols.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {service.supportedProtocols.map((protocol) => <Badge key={protocol} variant="muted">{protocol} · claimed</Badge>)}
        </div>
      )}

      <div className="rounded-md border border-white/6 bg-white/[0.02] px-3 py-2">
        <div className="text-[10px] uppercase tracking-wide font-mono text-[#6b7d99] mb-1">Activation gates</div>
        <div className="space-y-1">
          {failedOrUnknown.slice(0, 3).map((check) => (
            <div key={check.code} className="flex items-start gap-2 text-[11px] text-[#8090a8]">
              <span className={cn("mt-1 w-1.5 h-1.5 rounded-full shrink-0", check.state === "FAIL" ? "bg-[#f87171]" : "bg-[#f59e0b]")} />
              <span>{check.label}: {check.detail}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 gap-3">
        <div className="text-[11px] text-[#6b7d99]">Identity ≠ service readiness · deterministic gates</div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Btn variant="ghost" size="sm" onClick={onInspect} disabled={inspecting || testing} className="text-[#2dd4bf]">
            {inspecting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking</> : <><ShieldCheck className="w-3.5 h-3.5" /> Check readiness</>}
          </Btn>
          <Btn variant="teal-outline" size="sm" onClick={onRunTests} disabled={testing || inspecting || machineEndpoints.length === 0}>
            {testing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing</> : <><FlaskConical className="w-3.5 h-3.5" /> Run Test Lab</>}
          </Btn>
          <Badge variant="muted">Activation blocked</Badge>
        </div>
      </div>
    </Card>
  );
}

function FindingServiceMatchCard({ match, onInspect, inspecting, onRunTests, testing, onPrepareJob, preparingJob }: { match: FindingServiceMatch; onInspect: () => void; inspecting: boolean; onRunTests: () => void; testing: boolean; onPrepareJob?: () => void; preparingJob?: boolean }) {
  const tierLabel = match.tier === "EXACT_CONTEXT" ? "Exact structured context" : match.tier === "CONTEXT_COMPATIBLE" ? "Context compatible" : "Category match";
  const tierVariant = match.tier === "EXACT_CONTEXT" ? "green" as const : match.tier === "CONTEXT_COMPATIBLE" ? "teal" as const : "muted" as const;
  const contextChecks = match.checks.filter((check) => ["CATEGORY", "PROTOCOL", "ASSET", "PAIR"].includes(check.code));
  return (
    <div className="rounded-xl border border-[#2dd4bf]/20 bg-[#2dd4bf]/[0.02] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2dd4bf]/12 bg-[#2dd4bf]/[0.035]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-[#dde3ef]">#{match.rank} matched service</span>
              <Badge variant={tierVariant}>{tierLabel}</Badge>
              <Badge variant={match.activationEligible ? "green" : "amber"}>{match.activationEligible ? "Activation eligible" : "Activation gated"}</Badge>
            </div>
            <p className="text-[11px] text-[#8090a8] mt-1 max-w-3xl">{match.explanation}</p>
          </div>
          <span className="text-[10px] font-mono text-[#52637b] shrink-0">Deterministic rank</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {contextChecks.map((check) => (
            <span key={check.code} className={cn("text-[10px] px-2 py-1 rounded border", check.state === "PASS" ? "text-[#4ade80] border-[#4ade80]/20 bg-[#4ade80]/5" : check.state === "FAIL" ? "text-[#f87171] border-[#f87171]/20 bg-[#f87171]/5" : "text-[#9aacc4] border-white/8 bg-white/[0.025]")}>
              {check.label}: {check.state}
            </span>
          ))}
        </div>
        {match.strengths.length > 0 && <p className="text-[11px] text-[#6b7d99] mt-2">Why it ranks here: {match.strengths.slice(0, 3).join(" ")}</p>}
      </div>
      <div className="p-3 space-y-3">
        <LiveServiceCandidateCard record={match.service} onInspect={onInspect} inspecting={inspecting} onRunTests={onRunTests} testing={testing} />
        {match.service.service.category === "rebalancing" && onPrepareJob && (
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-[11px] text-[#6b7d99]">Prepare a reviewable job for the exact LP position. No permission or execution occurs yet.</p>
            <Btn variant="primary" size="sm" onClick={onPrepareJob} disabled={preparingJob || inspecting || testing}>
              {preparingJob ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Preparing</> : <><FileText className="w-3.5 h-3.5" /> Prepare job</>}
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}

function DiscoveredAgentCard({ agent, onVerify, verifying }: { agent: DiscoveredAgent; onVerify: () => void; verifying: boolean }) {
  const verification = agent.canonicalVerification;
  const verified = verification?.state === "VERIFIED";
  const mismatch = verification?.state === "MISMATCH";
  return (
    <Card className="p-4 space-y-3 border-[#a78bfa]/15 bg-[#a78bfa]/[0.025]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[#dde3ef] truncate">{agent.name}</span>
            <Badge variant="purple">ERC-8004</Badge>
            <Badge variant="muted">Discovered</Badge>
          </div>
          <div className="text-[11px] text-[#6b7d99] font-mono mt-1">BSC #{agent.identity.agentId}</div>
        </div>
        {verification && (
          <span className={cn("text-[11px] font-medium", verified ? "text-[#4ade80]" : mismatch ? "text-[#f87171]" : "text-[#f59e0b]") }>
            {verified ? "Onchain identity confirmed" : mismatch ? "Identity mismatch" : "Verification unavailable"}
          </span>
        )}
      </div>

      <p className="text-xs text-[#6b7d99] line-clamp-2">{agent.description}</p>

      {agent.categoryHints.length > 0 ? (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wide font-mono text-[#6b7d99]">Registry metadata hints · not tested capability</div>
          <div className="flex flex-wrap gap-1.5">
            {agent.categoryHints.slice(0, 4).map((hint) => (
              <span key={hint.category} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-white/[0.035] border border-white/6 text-[#9aacc4]">
                {CATEGORY_LABELS[hint.category]} <span className="text-[#6b7d99]">· Operator supplied</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-[11px] rounded-md px-3 py-2 border border-white/6 bg-white/[0.02] text-[#8090a8]">
          No recognized Spotriq financial-category hint in this identity's current registry metadata. The identity remains visible because registry discovery is broader than marketplace readiness.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/6 text-xs">
        <div>
          <div className="text-[#6b7d99] mb-0.5">External feedback</div>
          <div className="text-[#dde3ef] font-mono">{agent.externalReputation.totalFeedbacks}</div>
          <div className="text-[10px] text-[#6b7d99]">8004scan · external</div>
        </div>
        <div>
          <div className="text-[#6b7d99] mb-0.5">Marketplace service</div>
          <div className="text-[#9aacc4]">{agent.categoryHints.length > 0 ? "Candidate normalizable" : "No candidate category"}</div>
          <div className="text-[10px] text-[#6b7d99]">{agent.categoryHints.length > 0 ? "Readiness-gated · activation blocked" : "Identity remains discovery-only"}</div>
        </div>
      </div>

      {verification?.limitations?.length ? (
        <div className={cn("text-[11px] rounded-md px-3 py-2 border", mismatch ? "text-[#fca5a5] border-[#f87171]/20 bg-[#f87171]/5" : "text-[#8090a8] border-white/6 bg-white/[0.02]") }>
          {verification.limitations[0]}
        </div>
      ) : null}

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-[11px] text-[#a78bfa]">
          <Radio className="w-3.5 h-3.5" /> Live registry discovery
        </div>
        <Btn variant="ghost" size="sm" onClick={onVerify} disabled={verifying} className="text-[#a78bfa]">
          {verifying ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying</> : verification ? <><ShieldCheck className="w-3.5 h-3.5" /> Recheck identity</> : <><Shield className="w-3.5 h-3.5" /> Verify identity</>}
        </Btn>
      </div>
    </Card>
  );
}

// ─── PAGE: EXPLORE ────────────────────────────────────────────────────────────

function ExplorePage({ navigate, initialCategory, fromFinding }: { navigate: (r: Route, p?: Partial<NavState>) => void; initialCategory?: ExploreCategory; fromFinding?: string }) {
  const [category, setCategory] = useState<ExploreCategory>(initialCategory || "all");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [registryAgents, setRegistryAgents] = useState<DiscoveredAgent[]>([]);
  const [registryLoading, setRegistryLoading] = useState(true);
  const [registryError, setRegistryError] = useState<string>();
  const [registrySource, setRegistrySource] = useState<"8004scan" | "cache">("8004scan");
  const [verifyingDiscoveryId, setVerifyingDiscoveryId] = useState<string>();
  const [serviceCandidates, setServiceCandidates] = useState<MarketplaceServiceRecord[]>([]);
  const [supplyDiscovery, setSupplyDiscovery] = useState<MarketplaceFinancialDiscovery>();
  const [supplyLoading, setSupplyLoading] = useState(true);
  const [supplyError, setSupplyError] = useState<string>();
  const [inspectingServiceId, setInspectingServiceId] = useState<string>();
  const [testingServiceId, setTestingServiceId] = useState<string>();
  const [matchPage, setMatchPage] = useState<FindingServiceMatchPage>();
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string>();
  const [preparingJobServiceId, setPreparingJobServiceId] = useState<string>();
  const registryChainId: AgentRegistryChainId = 56;

  const normalizedSearch = searchText.trim().toLowerCase();
  const filtered = SERVICES.filter((service) => {
    if (category !== "all" && service.category !== category) return false;
    if (!normalizedSearch) return true;
    return [service.name, service.description, service.operator, ...service.supportedProtocols, ...(service.supportedAssets ?? []), ...(service.supportedPairs ?? [])]
      .join(" ").toLowerCase().includes(normalizedSearch);
  });

  const registryAgentsWithFinancialHints = registryAgents.filter((agent) => agent.categoryHints.length > 0);
  const visibleRegistryAgents = category === "all"
    ? registryAgents
    : registryAgents.filter((agent) => agent.categoryHints.some((hint) => hint.category === category));

  const visibleServiceCandidates = category === "all"
    ? serviceCandidates
    : serviceCandidates.filter((record) => record.service.category === category);

  const loadRegistry = useCallback(async (semanticQuery?: string) => {
    setRegistryLoading(true);
    setRegistryError(undefined);
    try {
      const query = semanticQuery?.trim();
      const page = query
        ? await agentRegistryRepository.searchAgents(query, { chainId: registryChainId, limit: 8 })
        : await agentRegistryRepository.listAgents({ chainId: registryChainId, limit: 8 });
      setRegistryAgents(page.agents);
      setRegistrySource(page.source);
    } catch (cause) {
      setRegistryError(cause instanceof Error ? cause.message : "Live ERC-8004 discovery is temporarily unavailable.");
    } finally {
      setRegistryLoading(false);
    }
  }, []);

  const loadSupply = useCallback(async (searchQuery?: string) => {
    setSupplyLoading(true);
    setSupplyError(undefined);
    try {
      const page = await marketplaceSupplyRepository.listServices({
        chainId: registryChainId,
        limit: 8,
        search: searchQuery?.trim() || undefined,
      });
      setServiceCandidates(page.services);
      setSupplyDiscovery(page.discovery);
    } catch (cause) {
      setSupplyDiscovery(undefined);
      setSupplyError(cause instanceof Error ? cause.message : "Spotriq could not normalize live marketplace service candidates.");
    } finally {
      setSupplyLoading(false);
    }
  }, []);

  const loadMatches = useCallback(async () => {
    if (!fromFinding || getActiveCheckMode() !== "live") return;
    const checkSessionId = getActiveCheckSessionId();
    if (!checkSessionId) return;
    setMatchLoading(true);
    setMatchError(undefined);
    try {
      const page = await smartMoneyRepository.getFindingMatches(checkSessionId, fromFinding, 8);
      setMatchPage(page);
      setCategory(page.context.category);
    } catch (cause) {
      setMatchError(cause instanceof Error ? cause.message : "Spotriq could not rank live services for this finding.");
    } finally {
      setMatchLoading(false);
    }
  }, [fromFinding]);

  useEffect(() => {
    void loadRegistry();
    void loadSupply();
    void loadMatches();
  }, [loadRegistry, loadSupply, loadMatches]);

  const inspectServiceCandidate = async (serviceId: string) => {
    setInspectingServiceId(serviceId);
    setSupplyError(undefined);
    try {
      const detail = await marketplaceSupplyRepository.getService(serviceId);
      setServiceCandidates((current) => current.map((record) => record.service.serviceId === serviceId ? detail : record));
      setRegistryAgents((current) => current.map((agent) => agent.discoveryId === detail.identity.discoveryId ? detail.identity : agent));
      await loadMatches();
    } catch (cause) {
      setSupplyError(cause instanceof Error ? cause.message : "Spotriq could not complete marketplace readiness inspection.");
    } finally {
      setInspectingServiceId(undefined);
    }
  };

  const runServiceTests = async (serviceId: string) => {
    setTestingServiceId(serviceId);
    setSupplyError(undefined);
    try {
      await marketplaceSupplyRepository.runTests(serviceId);
      const detail = await marketplaceSupplyRepository.getService(serviceId);
      setServiceCandidates((current) => current.map((record) => record.service.serviceId === serviceId ? detail : record));
      setRegistryAgents((current) => current.map((agent) => agent.discoveryId === detail.identity.discoveryId ? detail.identity : agent));
      await loadMatches();
    } catch (cause) {
      setSupplyError(cause instanceof Error ? cause.message : "Spotriq Marketplace Test Lab could not complete the runtime verification.");
    } finally {
      setTestingServiceId(undefined);
    }
  };

  const prepareRebalancingJob = async (match: FindingServiceMatch) => {
    if (!fromFinding || getActiveCheckMode() !== "live") return;
    const checkSessionId = getActiveCheckSessionId();
    if (!checkSessionId) {
      setMatchError("The active Smart Money Check session is unavailable. Run the check again before preparing a job.");
      return;
    }
    setPreparingJobServiceId(match.serviceId);
    setMatchError(undefined);
    try {
      const intent = await jobIntentRepository.prepare(checkSessionId, fromFinding, match.serviceId);
      navigate("checkout", { agentId: match.serviceId, jobIntentId: intent.jobIntentId, fromFinding });
    } catch (cause) {
      setMatchError(cause instanceof Error ? cause.message : "Spotriq could not prepare the reviewable Rebalancing job intent.");
    } finally {
      setPreparingJobServiceId(undefined);
    }
  };

  const verifyDiscoveredAgent = async (agent: DiscoveredAgent) => {
    setVerifyingDiscoveryId(agent.discoveryId);
    try {
      const detail = await agentRegistryRepository.getAgent(agent.identity.chainId, agent.identity.agentId);
      setRegistryAgents((current) => current.map((item) => item.discoveryId === detail.discoveryId ? detail : item));
    } catch (cause) {
      setRegistryError(cause instanceof Error ? cause.message : "Spotriq could not complete canonical ERC-8004 verification.");
    } finally {
      setVerifyingDiscoveryId(undefined);
    }
  };

  const toggleCompare = (id: string) => {
    setCompareIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : ids.length < 3 ? [...ids, id] : ids);
  };

  const categories: { key: ExploreCategory; label: string }[] = [
    { key: "all", label: "All" }, { key: "rebalancing", label: "Rebalancing" },
    { key: "grid", label: "Grid Trading" }, { key: "yield", label: "Yield Optimisation" },
    { key: "health", label: "Health Factor Monitoring" }
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#dde3ef] mb-1">Explore BSC financial agents</h1>
        <p className="text-[#6b7d99] text-sm">Find, evaluate and activate specialist financial agents.</p>
      </div>

      {/* Search bar: local reference-service filtering + live 8004scan semantic discovery on submit; initial load uses standard registry listing */}
      <form className="relative mb-6 flex gap-2" onSubmit={(event) => { event.preventDefault(); void loadRegistry(searchText); void loadSupply(searchText); }}>
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7d99]" />
          <input value={searchText} onChange={(event) => setSearchText(event.target.value)}
            className="w-full bg-[#1c2433] border border-white/8 rounded-lg pl-11 pr-4 py-3 text-sm text-[#dde3ef] placeholder:text-[#6b7d99] focus:outline-none focus:border-[#2dd4bf]/40 transition-colors"
            placeholder="e.g. USDT yield with low permissions and anytime liquidity" />
        </div>
        <Btn type="submit" variant="teal-outline" disabled={registryLoading || supplyLoading}>
          {registryLoading || supplyLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search registry
        </Btn>
      </form>

      {/* Category tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {categories.map(c => (
          <button key={c.key} onClick={() => setCategory(c.key)}
            className={cn("px-4 py-2 rounded-md text-sm whitespace-nowrap transition-colors shrink-0",
              category === c.key ? "bg-[#2dd4bf]/15 text-[#2dd4bf] border border-[#2dd4bf]/30" : "text-[#6b7d99] hover:text-[#9aacc4] hover:bg-white/5")}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Filter panel - desktop */}
        <aside className="hidden md:block w-56 shrink-0 space-y-6">
          <div>
            <div className="text-xs font-mono uppercase text-[#6b7d99] mb-3">Availability</div>
            {["Ready Now", "Limited", "Testnet Only"].map(v => (
              <label key={v} className="flex items-center gap-2 text-sm text-[#9aacc4] mb-2 cursor-pointer hover:text-[#dde3ef]">
                <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/20 bg-[#1c2433] accent-[#2dd4bf]" />
                {v}
              </label>
            ))}
          </div>
          <div>
            <div className="text-xs font-mono uppercase text-[#6b7d99] mb-3">Permission intensity</div>
            {["Read-only", "Low", "Medium", "High"].map(v => (
              <label key={v} className="flex items-center gap-2 text-sm text-[#9aacc4] mb-2 cursor-pointer hover:text-[#dde3ef]">
                <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/20 bg-[#1c2433] accent-[#2dd4bf]" />
                {v}
              </label>
            ))}
          </div>
          <div>
            <div className="text-xs font-mono uppercase text-[#6b7d99] mb-3">Protocol</div>
            {["PancakeSwap V3", "PancakeSwap V2", "Venus Protocol"].map(v => (
              <label key={v} className="flex items-center gap-2 text-sm text-[#9aacc4] mb-2 cursor-pointer hover:text-[#dde3ef]">
                <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/20 bg-[#1c2433] accent-[#2dd4bf]" />
                {v}
              </label>
            ))}
          </div>
          <div>
            <div className="text-xs font-mono uppercase text-[#6b7d99] mb-3">Evidence</div>
            {["Marketplace Tested", "Operator Supplied", "External Feedback"].map(v => (
              <label key={v} className="flex items-center gap-2 text-sm text-[#9aacc4] mb-2 cursor-pointer hover:text-[#dde3ef]">
                <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/20 bg-[#1c2433] accent-[#2dd4bf]" />
                {v}
              </label>
            ))}
          </div>
          <div>
            <div className="text-xs font-mono uppercase text-[#6b7d99] mb-3">Sort by</div>
            {["Strongest Evidence", "Lowest Authority", "Lowest Cost", "Most Active"].map((v, i) => (
              <label key={v} className="flex items-center gap-2 text-sm text-[#9aacc4] mb-2 cursor-pointer hover:text-[#dde3ef]">
                <input type="radio" name="sort" defaultChecked={i === 0} className="w-3.5 h-3.5 border-white/20 accent-[#2dd4bf]" />
                {v}
              </label>
            ))}
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {compareIds.length > 0 && (
            <div className="mb-4 p-3 bg-[#193040] border border-[#2dd4bf]/20 rounded-lg flex items-center gap-3">
              <span className="text-sm text-[#9aacc4]">{compareIds.length} selected</span>
              <Btn size="sm" variant="teal-outline" onClick={() => navigate("compare", { compareIds })} disabled={compareIds.length < 2}>
                <GitCompare className="w-3.5 h-3.5" /> Compare {compareIds.length}
              </Btn>
              <button onClick={() => setCompareIds([])} className="text-xs text-[#6b7d99] ml-auto">Clear</button>
            </div>
          )}

          {fromFinding && getActiveCheckMode() === "live" && (
            <section className="mb-8 rounded-xl border border-[#2dd4bf]/20 bg-[#2dd4bf]/[0.015] p-4">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Target className="w-4 h-4 text-[#2dd4bf]" />
                    <h2 className="text-lg font-semibold text-[#dde3ef]">Best live matches for this finding</h2>
                    <Badge variant="teal">Deterministic compatibility</Badge>
                  </div>
                  <p className="text-xs text-[#6b7d99] max-w-3xl">Spotriq matches the finding against normalized live AgentService candidates using explicit category, protocol and structured context facts. Marketplace-observed evidence and readiness can improve ordering, but this is not a profitability score and it never bypasses activation gates.</p>
                </div>
                <button onClick={() => void loadMatches()} disabled={matchLoading} className="text-xs text-[#2dd4bf] flex items-center gap-1.5 shrink-0 disabled:opacity-50">
                  <RefreshCw className={cn("w-3.5 h-3.5", matchLoading && "animate-spin")} /> Re-rank
                </button>
              </div>
              {matchLoading && !matchPage && <div className="h-28 rounded-lg border border-white/6 bg-white/[0.02] animate-pulse" />}
              {matchError && <div className="p-3 rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/5 text-xs text-[#d6a04a]">Compatibility ranking unavailable: {matchError}</div>}
              {matchPage && (
                <>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#6b7d99] mb-4">
                    <span>Finding: {CATEGORY_LABELS[matchPage.context.category]}</span>
                    {matchPage.context.protocol && <span>Protocol: {matchPage.context.protocol}</span>}
                    {matchPage.context.asset && <span>Asset: {matchPage.context.asset}</span>}
                    {matchPage.context.pair && <span>Pair: {matchPage.context.pair}</span>}
                    <span>{matchPage.consideredServices} normalized candidate{matchPage.consideredServices === 1 ? "" : "s"} considered</span>
                    <span>{matchPage.excludedServices} hard-incompatible excluded</span>
                  </div>
                  <div className="space-y-4">
                    {matchPage.matches.map((match) => (
                      <FindingServiceMatchCard
                        key={match.matchId}
                        match={match}
                        onInspect={() => void inspectServiceCandidate(match.serviceId)}
                        inspecting={inspectingServiceId === match.serviceId}
                        onRunTests={() => void runServiceTests(match.serviceId)}
                        testing={testingServiceId === match.serviceId}
                        onPrepareJob={match.service.service.category === "rebalancing" ? () => void prepareRebalancingJob(match) : undefined}
                        preparingJob={preparingJobServiceId === match.serviceId}
                      />
                    ))}
                  </div>
                  {matchPage.matches.length === 0 && !matchError && (
                    <div className="p-4 rounded-lg border border-white/6 bg-white/[0.02] text-xs text-[#8090a8]">No normalized live service passed the known hard compatibility constraints for this finding in the current bounded registry result. Spotriq will not substitute search relevance or missing metadata for compatibility evidence.</div>
                  )}
                  <p className="text-[10px] text-[#52637b] mt-3">Method {matchPage.methodVersion} · Matching is context compatibility, not financial advice, safety certification, or predicted performance.</p>
                </>
              )}
            </section>
          )}

          {fromFinding && getActiveCheckMode() === "example" && (
            <div className="mb-6 p-4 rounded-lg border border-white/6 bg-white/[0.02] text-xs text-[#6b7d99]">Live compatibility ranking is intentionally available only for live Smart Money Check findings. The reference services below remain sample data and are not presented as live matched supply.</div>
          )}

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#6b7d99]">{filtered.length} reference services</span>
              <Badge variant="muted">Sample data</Badge>
            </div>
            <button onClick={() => setFilterOpen(f => !f)} className="md:hidden flex items-center gap-1.5 text-sm text-[#9aacc4]">
              <Filter className="w-4 h-4" /> Filters
            </button>
          </div>

          <div className="space-y-4">
            {filtered.map(s => (
              <AgentCard key={s.serviceId} service={s}
                onView={() => navigate("agent", { agentId: s.serviceId })}
                onCompare={() => toggleCompare(s.serviceId)}
                compareSelected={compareIds.includes(s.serviceId)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="p-6 rounded-lg border border-white/6 bg-card text-sm text-[#6b7d99]">No sample reference service matches the current filters.</div>
            )}
          </div>


          <section className="mt-10 pt-8 border-t border-white/8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold text-[#dde3ef]">Normalized financial service candidates</h2>
                  <Badge variant="teal">Spotriq derived</Badge>
                </div>
                <p className="text-xs text-[#6b7d99] max-w-2xl">Spotriq actively searches the live registry across Rebalancing, Grid, Yield and Health rather than sampling only the newest identities. Search relevance stays separate from capability proof; only matching operator metadata can become a normalized AgentService candidate.</p>
              </div>
              <button onClick={() => void loadSupply(searchText)} disabled={supplyLoading} className="text-xs text-[#2dd4bf] flex items-center gap-1.5 shrink-0 disabled:opacity-50">
                <RefreshCw className={cn("w-3.5 h-3.5", supplyLoading && "animate-spin")} /> Refresh
              </button>
            </div>

            {supplyError && (
              <div className="mb-4 p-3 rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/5 text-xs text-[#d6a04a]">
                Marketplace service normalization unavailable: {supplyError} Live registry identities below remain independently discoverable.
              </div>
            )}

            {supplyDiscovery && (
              <div className="mb-4 rounded-lg border border-[#2dd4bf]/15 bg-[#2dd4bf]/[0.025] p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Target className="w-4 h-4 text-[#2dd4bf]" />
                      <span className="text-sm font-medium text-[#dde3ef]">{supplyDiscovery.mode === "TARGETED" ? "Targeted financial supply discovery" : "User-directed financial discovery"}</span>
                      <Badge variant="purple">External search relevance</Badge>
                    </div>
                    <p className="text-[11px] text-[#6b7d99] mt-1 max-w-3xl">Search relevance helps Spotriq find candidate identities deeper in the registry. It never becomes capability proof by itself; promotion still requires a matching operator-supplied financial metadata hint.</p>
                  </div>
                  <span className="text-[11px] text-[#6b7d99] shrink-0">{supplyDiscovery.leads.length} unique leads</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                  {supplyDiscovery.searches.map((run, index) => (
                    <div key={`${run.category ?? "query"}-${index}`} className="rounded-md border border-white/6 bg-white/[0.02] px-3 py-2">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-medium text-[#9aacc4]">{run.category ? CATEGORY_LABELS[run.category] : "Registry search"}</span>
                        <span className={cn("text-[10px] font-mono", run.state === "COMPLETE" ? "text-[#4ade80]" : run.state === "PARTIAL" ? "text-[#f59e0b]" : "text-[#f87171]")}>{run.state}</span>
                      </div>
                      <div className="text-[11px] text-[#6b7d99]">{run.returned} search results</div>
                      <div className="text-[11px] text-[#9aacc4]">{run.matchingCapabilityHints} metadata-backed · {run.normalizedServices} normalized</div>
                    </div>
                  ))}
                </div>
                {supplyDiscovery.leads.some((lead) => lead.promotedServiceIds.length === 0) && (
                  <div className="pt-2 border-t border-white/6">
                    <div className="text-[10px] uppercase tracking-wide font-mono text-[#6b7d99] mb-2">Search-relevant leads · capability not established</div>
                    <div className="flex flex-wrap gap-2">
                      {supplyDiscovery.leads.filter((lead) => lead.promotedServiceIds.length === 0).slice(0, 6).map((lead) => (
                        <div key={lead.identity.discoveryId} className="rounded-md border border-white/6 bg-white/[0.02] px-2.5 py-2 min-w-[180px] max-w-[280px]">
                          <div className="text-[11px] text-[#dde3ef] truncate">{lead.identity.name}</div>
                          <div className="text-[10px] text-[#6b7d99] mt-0.5">{lead.matches.map((match) => match.category ? CATEGORY_LABELS[match.category] : "Search").join(" · ")}</div>
                          <div className="text-[10px] text-[#f59e0b] mt-1">Discovery lead only · not a service claim</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {supplyLoading && serviceCandidates.length === 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {[0,1].map((item) => <div key={item} className="h-48 rounded-lg border border-white/6 bg-white/[0.02] animate-pulse" />)}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-[11px] text-[#6b7d99] mb-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2dd4bf]" />
                  <span>{serviceCandidates.length} normalized service candidate{serviceCandidates.length === 1 ? "" : "s"}</span>
                  <span>·</span><span>{serviceCandidates.filter((record) => record.service.marketplaceActivationEligible).length} activation-eligible</span>
                  <span>·</span><span>{serviceCandidates.filter((record) => record.readiness.checks?.find((check) => check.code === "MARKETPLACE_TESTS")?.state === "PASS").length} contract-tested</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {visibleServiceCandidates.map((record) => (
                    <LiveServiceCandidateCard
                      key={record.service.serviceId}
                      record={record}
                      onInspect={() => void inspectServiceCandidate(record.service.serviceId)}
                      inspecting={inspectingServiceId === record.service.serviceId}
                      onRunTests={() => void runServiceTests(record.service.serviceId)}
                      testing={testingServiceId === record.service.serviceId}
                    />
                  ))}
                </div>
                {visibleServiceCandidates.length === 0 && !supplyError && (
                  <div className="p-5 rounded-lg border border-white/6 bg-card text-xs text-[#6b7d99]">
                    {category === "all"
                      ? "Targeted registry discovery did not find a metadata-backed Spotriq financial service candidate in this bounded search. Search-relevant leads may still appear above, but relevance alone is not promoted into a capability claim."
                      : `No normalized ${CATEGORY_LABELS[category]} service candidate is present in the current bounded discovery result. This reflects registry metadata coverage, not a claim that no such agent exists.`}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="mt-10 pt-8 border-t border-white/8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold text-[#dde3ef]">Live ERC-8004 registry discoveries</h2>
                  <Badge variant="purple">External</Badge>
                </div>
                <p className="text-xs text-[#6b7d99] max-w-2xl">Real BSC Mainnet identities discovered through 8004scan. Registry identity and external feedback are evidence, not proof of financial capability. Identities with supported financial hints can now be normalized into readiness-gated service candidates above; identities without those hints remain discovery-only. No registry-derived service is activatable until required gates pass.</p>
              </div>
              <button onClick={() => void loadRegistry(searchText)} disabled={registryLoading} className="text-xs text-[#a78bfa] flex items-center gap-1.5 shrink-0 disabled:opacity-50">
                <RefreshCw className={cn("w-3.5 h-3.5", registryLoading && "animate-spin")} /> Refresh
              </button>
            </div>

            {registryError && (
              <div className="mb-4 p-3 rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/5 text-xs text-[#d6a04a]">
                Live registry source unavailable: {registryError} Reference/sample services above remain available.
              </div>
            )}

            {registryLoading && registryAgents.length === 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {[0,1,2,3].map((item) => <div key={item} className="h-44 rounded-lg border border-white/6 bg-white/[0.02] animate-pulse" />)}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-[11px] text-[#6b7d99] mb-3">
                  <Radio className="w-3.5 h-3.5 text-[#a78bfa]" />
                  {registrySource === "8004scan" ? "Live 8004scan registry discovery" : "Cached registry discoveries"}
                  <span>·</span><span>Chain 56</span>
                  <span>·</span><span>{registryAgents.length} identities returned</span>
                  <span>·</span><span>{registryAgentsWithFinancialHints.length} with recognized financial metadata hints</span>
                  {category !== "all" && <><span>·</span><span>Filtered by operator-supplied metadata hints for {CATEGORY_LABELS[category]}</span></>}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {visibleRegistryAgents.map((agent) => (
                    <DiscoveredAgentCard key={agent.discoveryId} agent={agent} onVerify={() => void verifyDiscoveredAgent(agent)} verifying={verifyingDiscoveryId === agent.discoveryId} />
                  ))}
                </div>
                {visibleRegistryAgents.length === 0 && !registryError && (
                  <div className="p-5 rounded-lg border border-white/6 bg-card text-xs text-[#6b7d99]">
                    {category === "all"
                      ? "No live ERC-8004 identities were returned in this result set."
                      : `No currently loaded live identity carries a ${CATEGORY_LABELS[category]} metadata hint. Switch to All to see the complete live registry result set; missing hints do not mean the identity is invalid.`}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE: SMART MONEY CHECK ──────────────────────────────────────────────────

function CheckStartPage({ navigate }: { navigate: (r: Route, p?: Partial<NavState>) => void }) {
  const [address, setAddress] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string>();
  const coverage = [
    "BSC native wallet balance", "Supported PancakeSwap V3 positions", "Rebalancing range-state findings",
    "Venus Core Pool and Isolated Pool lending positions", "Venus health / liquidation-buffer findings",
    "Wallet-relevant Venus supply opportunities and current base APY",
    "PancakeSwap V3 Grid market context from onchain oracle averages",
    "PancakeSwap Infinity CL reads by known token ID", "Agent matching as coverage expands"
  ];

  const startLiveCheck = async (walletAddress: string, control: "WATCH_ONLY" | "CONNECTED" | "VERIFIED_CONTROL") => {
    setStarting(true);
    setError(undefined);
    try {
      const result = await smartMoneyRepository.startCheck(walletAddress, control);
      setActiveLiveCheck(result.session.checkSessionId);
      navigate("check", { checkPhase: "scan" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Spotriq could not start this Smart Money Check.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-mono text-[#2dd4bf] bg-[#2dd4bf]/10 border border-[#2dd4bf]/20 px-3 py-1.5 rounded-full">
          <Shield className="w-3 h-3" /> Smart Money Check · Read-only
        </div>
        <h1 className="text-3xl font-semibold text-[#dde3ef]">Smart Money Check</h1>
        <p className="text-[#6b7d99]">See where supported BSC financial agents could help your portfolio.</p>
        <div className="inline-flex items-center gap-1.5 text-xs text-[#4ade80] bg-[#4ade80]/8 border border-[#4ade80]/15 px-3 py-1.5 rounded-full">
          <Lock className="w-3 h-3" /> Nothing can move your funds during this scan.
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <Btn variant="primary" className="w-full justify-center" disabled={starting} onClick={async () => {
          try {
            setStarting(true);
            setError(undefined);
            const wallet = await walletHandlers.connectWallet();
            await startLiveCheck(wallet.address, wallet.controlState);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Wallet connection failed.");
            setStarting(false);
          }
        }}>
          <Wallet className="w-4 h-4" /> {starting ? "Starting…" : "Connect Wallet"}
        </Btn>
        <div className="relative flex items-center gap-3">
          <div className="flex-1 border-t border-white/8" />
          <span className="text-xs text-[#6b7d99]">or</span>
          <div className="flex-1 border-t border-white/8" />
        </div>
        <div className="flex gap-2">
          <input className="flex-1 min-w-0 bg-[#1c2433] border border-white/8 rounded-md px-4 py-3 text-sm text-[#dde3ef] placeholder:text-[#6b7d99] focus:outline-none focus:border-[#2dd4bf]/40 transition-colors"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && /^0x[0-9a-fA-F]{40}$/.test(address.trim()) && !starting) void startLiveCheck(address.trim(), "WATCH_ONLY");
            }}
            placeholder="Enter BSC address: 0x..." />
          <Btn variant="secondary" disabled={starting || !/^0x[0-9a-fA-F]{40}$/.test(address.trim())} onClick={() => void startLiveCheck(address.trim(), "WATCH_ONLY")}>
            Check
          </Btn>
        </div>
        <div className="relative flex items-center gap-3">
          <div className="flex-1 border-t border-white/8" />
          <span className="text-xs text-[#6b7d99]">or</span>
          <div className="flex-1 border-t border-white/8" />
        </div>
        <Btn variant="secondary" className="w-full justify-center" onClick={() => { setExampleCheckMode(); navigate("check", { checkPhase: "scan" }); }}>
          <Eye className="w-4 h-4" /> Try Example Portfolio
        </Btn>
        <p className="text-[11px] text-center text-[#6b7d99]">Entering an address does not prove ownership. Activation requires wallet connection.</p>
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-[#f87171]/20 bg-[#f87171]/5 p-3 text-xs text-[#fca5a5]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="text-xs font-mono uppercase text-[#6b7d99] mb-3">Current live coverage</div>
        <div className="space-y-2">
          {coverage.map(c => (
            <div key={c} className="flex items-center gap-2 text-sm text-[#9aacc4]">
              <Check className="w-3.5 h-3.5 text-[#2dd4bf] shrink-0" />
              {c}
            </div>
          ))}
        </div>
        <p className="text-xs text-[#6b7d99] mt-3 pt-3 border-t border-white/6">Coverage is intentionally bounded. Spotriq does not claim to inspect every BSC protocol yet.</p>
      </Card>
    </div>
  );
}

function CheckScanPage({ navigate }: { navigate: (r: Route, p?: Partial<NavState>) => void }) {
  const [progress, setProgress] = useState(0);
  const [liveSources, setLiveSources] = useState<CheckSourceProgress[]>();
  const [error, setError] = useState<string>();
  const mode = getActiveCheckMode();
  const exampleSources = [
    { key: "wallet", label: "Wallet assets", status: progress > 0 ? "done" : "running" },
    { key: "pancake", label: "PancakeSwap positions", status: progress > 1 ? "done" : progress === 1 ? "running" : "queued" },
    { key: "venus", label: "Venus lending positions", status: progress > 2 ? "done" : progress === 2 ? "running" : "queued" },
    { key: "yield", label: "Yield opportunities", status: progress > 3 ? "done" : progress === 3 ? "running" : "queued" },
    { key: "market", label: "Market context", status: progress > 4 ? "done" : progress === 4 ? "running" : "queued" },
    { key: "agents", label: "Agent compatibility", status: progress > 5 ? "done" : progress === 5 ? "running" : "queued" },
  ];

  useEffect(() => {
    if (mode === "example") {
      return subscribeToMockCheck(
        (event) => { if ("progress" in event) setProgress(event.progress); },
        () => navigate("check", { checkPhase: "results" }),
      );
    }

    const checkSessionId = getActiveCheckSessionId();
    if (!checkSessionId) {
      setError("No active Smart Money Check was found. Start a new check.");
      return;
    }
    let closed = false;
    const refresh = async () => {
      try {
        const snapshot = await smartMoneyRepository.getCheck(checkSessionId);
        if (!closed) setLiveSources(snapshot.session.sourceProgress ?? []);
      } catch (cause) {
        if (!closed) setError(cause instanceof Error ? cause.message : "Could not read Smart Money Check progress.");
      }
    };
    void refresh();
    const subscription = subscribeToSmartMoneyCheck(
      checkSessionId,
      (_event: SmartMoneyCheckEvent) => { void refresh(); },
      () => navigate("check", { checkPhase: "results" }),
      (cause) => setError(cause instanceof Error ? cause.message : "Realtime scan updates were interrupted."),
    );
    return () => { closed = true; subscription.close(); };
  }, [mode, navigate]);

  const sourceRows = mode === "example" ? exampleSources : (liveSources ?? []).map((source) => ({
    key: source.key,
    label: source.label,
    status: source.state === "COMPLETED" ? "done" : source.state === "RUNNING" ? "running" : source.state === "PARTIAL" ? "partial" : source.state === "FAILED" ? "failed" : source.state === "NOT_SUPPORTED" ? "unsupported" : "queued",
    detail: source.detail,
  }));

  return (
    <div className="max-w-lg mx-auto px-6 py-16 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold text-[#dde3ef]">Checking your portfolio</h1>
        <div className="text-xs text-[#4ade80] flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3" /> Still read-only.
        </div>
      </div>
      <Card className="p-6 space-y-3">
        {sourceRows.length === 0 && <div className="text-sm text-[#6b7d99]">Preparing live BSC sources…</div>}
        {sourceRows.map(s => (
          <div key={s.key} className="py-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#9aacc4]">{s.label}</span>
              {s.status === "done" && <Check className="w-4 h-4 text-[#4ade80]" />}
              {s.status === "partial" && <span className="flex items-center gap-1.5 text-[#f59e0b] text-xs"><AlertTriangle className="w-3.5 h-3.5" />Partial</span>}
              {s.status === "failed" && <span className="flex items-center gap-1.5 text-[#f87171] text-xs"><AlertCircle className="w-3.5 h-3.5" />Failed</span>}
              {s.status === "unsupported" && <span className="text-[#6b7d99] text-xs">Not supported yet</span>}
              {s.status === "running" && <span className="flex items-center gap-1.5 text-[#2dd4bf] text-xs"><span className="w-2 h-2 rounded-full bg-[#2dd4bf] animate-pulse" />Running</span>}
              {s.status === "queued" && <span className="w-2 h-2 rounded-full bg-[#1c2433] border border-white/15" />}
            </div>
            {'detail' in s && s.detail && <p className="text-[11px] text-[#52637b] mt-1 pr-12">{s.detail}</p>}
          </div>
        ))}
      </Card>
      {error && (
        <div className="rounded-lg border border-[#f87171]/20 bg-[#f87171]/5 p-4 text-sm text-[#fca5a5]">
          {error}
          <div className="mt-3"><Btn variant="ghost" onClick={() => navigate("check", { checkPhase: "start" })}>Start Again</Btn></div>
        </div>
      )}
      <p className="text-center text-xs text-[#6b7d99]">{mode === "example" ? "Example Portfolio · Sample Data" : "Live BSC read · Supported sources only"}</p>
    </div>
  );
}

function CheckResultsPage({ navigate }: { navigate: (r: Route, p?: Partial<NavState>) => void }) {
  const mode = getActiveCheckMode();
  const [snapshot, setSnapshot] = useState<SmartMoneyCheckView>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (mode === "example") return;
    const checkSessionId = getActiveCheckSessionId();
    if (!checkSessionId) {
      setError("No live Smart Money Check was found.");
      return;
    }
    void smartMoneyRepository.getCheck(checkSessionId).then(setSnapshot).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "Could not load Smart Money Check results.");
    });
  }, [mode]);

  if (mode === "example") return <ExampleCheckResultsPage navigate={navigate} />;

  if (error) {
    return <div className="max-w-2xl mx-auto px-6 py-16"><Card className="p-6"><div className="flex gap-2 text-[#fca5a5]"><AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span></div><div className="mt-4"><Btn variant="secondary" onClick={() => navigate("check", { checkPhase: "start" })}>Start a New Check</Btn></div></Card></div>;
  }
  if (!snapshot) {
    return <div className="max-w-2xl mx-auto px-6 py-16"><Card className="p-6"><div className="flex items-center gap-2 text-[#9aacc4]"><RefreshCw className="w-4 h-4 animate-spin" />Loading your live results…</div></Card></div>;
  }

  const needsAttention = snapshot.findings.filter((finding) => finding.state === "needs-attention");
  const opportunities = snapshot.findings.filter((finding) => finding.state === "opportunity");
  const healthy = snapshot.findings.filter((finding) => finding.state === "healthy" || finding.state === "informational");
  const couldNotAssess = snapshot.findings.filter((finding) => finding.state === "could-not-assess");
  const findingAction = (finding: Finding) => navigate("explore", { exploreCategory: finding.category, fromFinding: finding.findingId });
  const sources = snapshot.session.sourceProgress ?? [];
  const shortWallet = `${snapshot.session.walletAddress.slice(0, 6)}…${snapshot.session.walletAddress.slice(-4)}`;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="text-[11px] font-mono text-center text-[#2dd4bf] bg-[#2dd4bf]/5 border border-[#2dd4bf]/15 rounded px-3 py-1.5 mb-6">
        Live BSC data · Read-only · {snapshot.portfolio?.network === "mainnet" ? "BSC Mainnet" : "BSC Testnet"}
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#dde3ef] mb-2">Your Smart Money Check</h1>
        <div className="flex flex-wrap gap-4 text-sm text-[#6b7d99]">
          <span className="flex items-center gap-1.5"><Wallet className="w-4 h-4" /> {shortWallet}</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Checked {snapshot.session.completedAt ? new Date(snapshot.session.completedAt).toLocaleTimeString() : "just now"}</span>
          {needsAttention.length > 0 && <span className="text-[#f59e0b] flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {needsAttention.length} need attention</span>}
          {opportunities.length > 0 && <span className="text-[#2dd4bf] flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> {opportunities.length} opportunit{opportunities.length === 1 ? "y" : "ies"}</span>}
          <span className="text-[#2dd4bf] flex items-center gap-1.5"><CircleDot className="w-4 h-4" /> {snapshot.portfolio?.pancakeSwapPositions.length ?? 0} supported LP positions</span>
          <span className="text-[#4ade80] flex items-center gap-1.5"><Shield className="w-4 h-4" /> {snapshot.portfolio?.venusPositions.length ?? 0} Venus pool positions</span>
        </div>
      </div>

      {needsAttention.length > 0 && <section className="mb-8"><SectionHeader label="Needs Attention" /><div className="space-y-4">{needsAttention.map((finding) => <FindingCard key={finding.findingId} finding={finding} onAction={() => findingAction(finding)} />)}</div></section>}

      {opportunities.length > 0 && <section className="mb-8"><SectionHeader label="Opportunities" /><div className="space-y-4">{opportunities.map((finding) => <FindingCard key={finding.findingId} finding={finding} onAction={() => findingAction(finding)} />)}</div></section>}

      {healthy.length > 0 && <section className="mb-8"><SectionHeader label="Healthy / Informational" /><div className="space-y-4">{healthy.map((finding) => <FindingCard key={finding.findingId} finding={finding} onAction={() => findingAction(finding)} />)}</div></section>}

      {couldNotAssess.length > 0 && <section className="mb-8"><SectionHeader label="Could Not Assess" /><div className="space-y-4">{couldNotAssess.map((finding) => <FindingCard key={finding.findingId} finding={finding} onAction={() => findingAction(finding)} />)}</div></section>}

      {snapshot.findings.length === 0 && (
        <section className="mb-8"><Card className="p-6"><h3 className="font-medium text-[#dde3ef] mb-2">No findings in the currently supported live checks</h3><p className="text-sm text-[#6b7d99]">Spotriq did not detect a supported PancakeSwap V3 LP finding, active Venus health position, or wallet-relevant Venus yield context for this wallet on the current network. This does not mean the wallet has no DeFi positions or financial risks.</p></Card></section>
      )}

      <section>
        <SectionHeader label="Coverage & Sources" />
        <Card className="p-5">
          <div className="space-y-3">
            {sources.map((source) => (
              <div key={source.key} className="flex items-start gap-2 text-sm">
                {source.state === "COMPLETED" ? <Check className="w-3.5 h-3.5 text-[#4ade80] shrink-0 mt-0.5" /> : source.state === "FAILED" ? <AlertCircle className="w-3.5 h-3.5 text-[#f87171] shrink-0 mt-0.5" /> : source.state === "PARTIAL" ? <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b] shrink-0 mt-0.5" /> : <Minus className="w-3.5 h-3.5 text-[#6b7d99] shrink-0 mt-0.5" />}
                <div className="min-w-0"><div className="text-[#9aacc4]">{source.label} <span className="text-[11px] font-mono text-[#52637b] ml-1">{source.state.replaceAll("_", " ")}</span></div>{source.detail && <div className="text-xs text-[#52637b] mt-0.5">{source.detail}</div>}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#6b7d99] mt-4 pt-4 border-t border-white/6">Spotriq only assessed the supported sources shown above. Partial coverage never means your complete portfolio is safe or risk-free.</p>
        </Card>
        <div className="mt-4 flex justify-center"><Btn variant="ghost" onClick={() => navigate("check", { checkPhase: "start" })}><RotateCcw className="w-4 h-4" /> Run Check Again</Btn></div>
      </section>
    </div>
  );
}

function ExampleCheckResultsPage({ navigate }: { navigate: (r: Route, p?: Partial<NavState>) => void }) {
  const urgent = FINDINGS.filter(f => f.state === "needs-attention");
  const opps = FINDINGS.filter(f => f.state === "opportunity");

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="text-[11px] font-mono text-center text-[#6b7d99] bg-white/3 border border-white/6 rounded px-3 py-1.5 mb-6">
        Example Portfolio / Sample Data
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#dde3ef] mb-2">Your Smart Money Check</h1>
        <div className="flex flex-wrap gap-4 text-sm text-[#6b7d99]">
          <span className="flex items-center gap-1.5"><Wallet className="w-4 h-4" /> Example BSC Portfolio</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Checked just now</span>
          <span className="text-[#f59e0b] flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {urgent.length} need attention</span>
          <span className="text-[#2dd4bf] flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /> {opps.length} opportunities</span>
        </div>
      </div>

      {/* Needs attention */}
      <section className="mb-8">
        <SectionHeader label="Needs Attention" />
        <div className="space-y-4">
          {urgent.map(f => (
            <FindingCard key={f.findingId} finding={f}
              onAction={() => navigate("explore", { exploreCategory: f.category, fromFinding: f.findingId })}
            />
          ))}
        </div>
      </section>

      {/* Opportunities */}
      <section className="mb-8">
        <SectionHeader label="Opportunities" />
        <div className="space-y-4">
          {opps.map(f => (
            <FindingCard key={f.findingId} finding={f}
              onAction={() => navigate("explore", { exploreCategory: f.category, fromFinding: f.findingId })}
            />
          ))}
        </div>
      </section>

      {/* Plan suggestion */}
      <section className="mb-8">
        <SectionHeader label="Smart Money Plan Suggestion" />
        <div className="bg-[#141b24] border border-[#2dd4bf]/15 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-[#2dd4bf]" />
            <h3 className="font-semibold text-[#dde3ef]">Earn &amp; Protect</h3>
            <Badge variant="teal">Suggested</Badge>
          </div>
          <p className="text-sm text-[#6b7d99] mb-4">Your portfolio shows both undeployed USDT and a Venus borrowing position. This plan covers both with specialist agents — one for yield, one for health monitoring.</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-black/20 rounded p-3">
              <CategoryPill category="yield" />
              <div className="text-sm text-[#dde3ef] mt-2 font-medium">YieldPilot</div>
              <div className="text-xs text-[#6b7d99]">Optimises USDT yield</div>
            </div>
            <div className="bg-black/20 rounded p-3">
              <CategoryPill category="health" />
              <div className="text-sm text-[#dde3ef] mt-2 font-medium">VenusGuard</div>
              <div className="text-xs text-[#6b7d99]">Monitors borrowing health</div>
            </div>
          </div>
          <Btn variant="teal-outline" onClick={() => navigate("plan-profile", { planId: "plan-earn-protect" })}>
            View Earn &amp; Protect Plan <ChevronRight className="w-4 h-4" />
          </Btn>
        </div>
      </section>

      {/* Coverage */}
      <section>
        <SectionHeader label="Coverage &amp; Sources" />
        <Card className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "BSC Wallet Assets", status: "Checked", ok: true },
              { label: "PancakeSwap V3 Positions", status: "1 position found", ok: true },
              { label: "Venus Lending Positions", status: "1 position found", ok: true },
              { label: "Market Context (BNB/USDT)", status: "7-day data available", ok: true },
              { label: "Agent Compatibility", status: "6 compatible services found", ok: true },
              { label: "PancakeSwap V2", status: "No positions detected", ok: true },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                {item.ok ? <Check className="w-3.5 h-3.5 text-[#4ade80] shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />}
                <span className="text-[#9aacc4]">{item.label}</span>
                <span className="text-[#6b7d99] ml-auto text-xs">{item.status}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#6b7d99] mt-4 pt-4 border-t border-white/6">
            No urgent issue detected in the supported positions we checked. This does not mean your entire portfolio is risk-free.
          </p>
        </Card>
        <div className="mt-4 flex justify-center">
          <Btn variant="ghost" onClick={() => navigate("check", { checkPhase: "start" })}>
            <RotateCcw className="w-4 h-4" /> Run Check Again
          </Btn>
        </div>
      </section>
    </div>
  );
}

// ─── PAGE: AGENT PROFILE ──────────────────────────────────────────────────────

function AgentProfilePage({ serviceId, navigate, initialTab }: {
  serviceId: string;
  navigate: (r: Route, p?: Partial<NavState>) => void;
  initialTab?: AgentProfileTab;
}) {
  const [tab, setTab] = useState<AgentProfileTab>(initialTab || "overview");
  const service = SERVICES.find(s => s.serviceId === serviceId) || SERVICES[0];
  const m = service.categoryMetrics!;

  const tabs: { key: AgentProfileTab; label: string }[] = [
    { key: "overview", label: "Overview" }, { key: "strategy", label: "Strategy" },
    { key: "performance", label: "Performance" }, { key: "evidence", label: "Evidence" },
    { key: "permissions", label: "Permissions" }, { key: "tests", label: "Tests" },
    { key: "reviews", label: "Reviews" }
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <button onClick={() => navigate("explore")} className="flex items-center gap-2 text-sm text-[#6b7d99] hover:text-[#9aacc4] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Explore
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-[#dde3ef]">{service.name}</h1>
              {service.erc8004Verified && <Badge variant="teal"><Shield className="w-3 h-3" /> ERC-8004 Verified</Badge>}
              <ReadinessPill state={service.readiness} note={service.readinessNote} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#6b7d99]">
              <CategoryPill category={service.category} />
              <span>by {service.operator}</span>
            </div>
            <p className="text-[#9aacc4] mt-3 max-w-2xl">{service.description}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-white/7 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn("px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors -mb-px",
                  tab === t.key ? "text-[#2dd4bf] border-[#2dd4bf]" : "text-[#6b7d99] border-transparent hover:text-[#9aacc4]")}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border border-white/7 rounded-lg p-4">
                  <div className="text-xs text-[#6b7d99] mb-1">Automation</div>
                  <div className="text-sm font-medium text-[#dde3ef]">{service.automationMode}</div>
                </div>
                <div className="bg-card border border-white/7 rounded-lg p-4">
                  <div className="text-xs text-[#6b7d99] mb-1">Authority</div>
                  <AuthorityBars intensity={service.permissionIntensity} />
                </div>
                <div className="bg-card border border-white/7 rounded-lg p-4">
                  <div className="text-xs text-[#6b7d99] mb-1">Price</div>
                  <div className="text-sm font-medium text-[#dde3ef]">{service.pricing.amount}{service.pricing.period ? `/${service.pricing.period}` : ""}</div>
                </div>
                {service.capitalMin && (
                  <div className="bg-card border border-white/7 rounded-lg p-4">
                    <div className="text-xs text-[#6b7d99] mb-1">Min. capital</div>
                    <div className="text-sm font-medium text-[#dde3ef]">{service.capitalMin}</div>
                  </div>
                )}
              </div>

              {/* Category-specific visual */}
              <Card className="p-5">
                <div className="text-xs font-mono uppercase text-[#6b7d99] mb-3">Position Visual</div>
                {m.type === "rebalancing" && <RangeVisual lower={225} upper={285} current={218} outOfRange />}
                {m.type === "grid" && <GridVisual fills={m.fills} currentPrice={220} />}
                {m.type === "health" && <HealthVisual healthFactor={1.42} />}
                {m.type === "yield" && <YieldBreakdown gross={m.currentRate} protocolCost="−0.8%" agentFee="−0.5%" net={m.estimatedNet} />}
              </Card>

              <Card className="p-5">
                <div className="text-xs font-mono uppercase text-[#6b7d99] mb-3">Supported Protocols &amp; Assets</div>
                <div className="flex flex-wrap gap-2">
                  {service.supportedProtocols.map(p => <Badge key={p} variant="default">{p}</Badge>)}
                  {service.supportedAssets?.map(a => <Badge key={a} variant="muted">{a}</Badge>)}
                  {service.supportedPairs?.map(p => <Badge key={p} variant="muted">{p}</Badge>)}
                </div>
              </Card>
            </div>
          )}

          {tab === "strategy" && (
            <div className="space-y-6">
              <Card className="p-5">
                <div className="text-xs font-mono uppercase text-[#6b7d99] mb-3">What it does</div>
                <p className="text-[#9aacc4]">{service.description}</p>
                {m.type === "rebalancing" && <p className="text-[#9aacc4] mt-3">When the current price moves outside the configured range, {service.name} triggers a rebalance: withdrawing the position, swapping assets to reach the target ratio, and depositing back at a new symmetric range around the current price.</p>}
                {m.type === "grid" && <p className="text-[#9aacc4] mt-3">{service.name} places a grid of buy and sell orders across a configured price range. Each time price crosses a level, the order on that level is filled and the opposite side is re-armed. Net P&L captures the spread earned on each round trip.</p>}
                {m.type === "yield" && <p className="text-[#9aacc4] mt-3">{service.name} compares supported USDT opportunities and may reallocate capital when another eligible strategy exceeds configured improvement thresholds. Reallocation triggers are deterministic — not AI-based.</p>}
                {m.type === "health" && <p className="text-[#9aacc4] mt-3">{service.name} polls Venus Protocol state every 60 seconds, computing safety buffer and comparing against configured thresholds. Alerts are triggered immediately. Automated interventions execute only within the user's configured limits.</p>}
              </Card>
              <Card className="p-5">
                <div className="text-xs font-mono uppercase text-[#6b7d99] mb-3">Supported market conditions</div>
                {m.type === "rebalancing" && <p className="text-sm text-[#9aacc4]">Works in any market condition. More frequent rebalances in high-volatility markets increases gas cost. Wide-range variant suited to lower volatility.</p>}
                {m.type === "grid" && <p className="text-sm text-[#9aacc4]">Most effective in sideways / range-bound markets. Adaptive re-grid repositions the grid when price breaks range. Stop-loss limits maximum downside in trending markets.</p>}
                {m.type === "yield" && <p className="text-sm text-[#9aacc4]">Strategies are selected from supported protocols. Unsuitable in: markets with active de-peg risk on selected assets, or when protocol liquidity is below safe levels.</p>}
                {m.type === "health" && <p className="text-sm text-[#9aacc4]">Alert-only mode suitable for all conditions. Automatic intervention mode assumes available collateral or capital exists to execute the configured protection action.</p>}
              </Card>
              <Card className="p-5">
                <div className="text-xs font-mono uppercase text-[#6b7d99] mb-3">Known unsuitable conditions</div>
                {m.type === "rebalancing" && <ul className="text-sm text-[#9aacc4] space-y-1 list-disc list-inside"><li>Positions below minimum capital threshold</li><li>Pairs not in supported list</li><li>High gas environments may make frequent rebalancing uneconomical</li></ul>}
                {m.type === "grid" && <ul className="text-sm text-[#9aacc4] space-y-1 list-disc list-inside"><li>Strong trending markets (stop-loss helps but does not eliminate risk)</li><li>Pairs with very low liquidity</li><li>Capital below minimum</li></ul>}
                {m.type === "yield" && <ul className="text-sm text-[#9aacc4] space-y-1 list-disc list-inside"><li>Assets with active de-peg risk</li><li>Users who need guaranteed same-day liquidity</li><li>Capital below minimum effective deployment size</li></ul>}
                {m.type === "health" && <ul className="text-sm text-[#9aacc4] space-y-1 list-disc list-inside"><li>Automatic intervention requires sufficient collateral or liquid assets in wallet</li><li>Alert-only mode if intervention is not authorized</li></ul>}
              </Card>
            </div>
          )}

          {tab === "evidence" && (
            <div className="space-y-6">
              <div className="bg-[#193040] border border-[#2dd4bf]/15 rounded-lg p-4 text-sm text-[#9aacc4]">
                Evidence is grouped by source to help you evaluate its reliability. Marketplace Observed data is collected by the marketplace directly — operators cannot edit it.
              </div>

              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ProvenanceBadge type="marketplace-observed" />
                  <span className="font-medium text-[#dde3ef]">Marketplace Observed</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: service.evidenceSummary.marketplaceObserved, desc: "Recorded from marketplace job execution" },
                    { label: `${service.evidenceSummary.testsPassed} standardized tests passed`, desc: "Run on BSC Testnet by marketplace" },
                    { label: service.evidenceSummary.readinessScore ? `${service.evidenceSummary.readinessScore} readiness score` : "Readiness tracking active", desc: "Composite readiness over 30 days" },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-3 bg-black/20 rounded">
                      <CheckCircle2 className="w-4 h-4 text-[#2dd4bf] shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm text-[#dde3ef] font-medium">{item.label}</div>
                        <div className="text-xs text-[#6b7d99]">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {service.evidenceSummary.externalFeedback && (
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ProvenanceBadge type="external" />
                    <span className="font-medium text-[#dde3ef]">External / On-chain</span>
                  </div>
                  <div className="p-3 bg-black/20 rounded flex items-start gap-3">
                    <ExternalLink className="w-4 h-4 text-[#a78bfa] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm text-[#dde3ef] font-medium">ERC-8004 identity verified</div>
                      <div className="text-xs text-[#6b7d99]">{service.evidenceSummary.externalFeedback} external feedback records · 8004scan</div>
                    </div>
                  </div>
                </Card>
              )}

              {service.evidenceSummary.operatorClaimed && (
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ProvenanceBadge type="operator-claimed" />
                    <span className="font-medium text-[#dde3ef]">Operator Supplied</span>
                  </div>
                  <p className="text-xs text-[#6b7d99] mb-3">This data was supplied by the operator. It has not been independently verified by the marketplace.</p>
                  <div className="p-3 bg-black/20 rounded flex items-start gap-3">
                    <FileText className="w-4 h-4 text-[#6b7d99] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm text-[#dde3ef] font-medium">{service.evidenceSummary.operatorClaimed}</div>
                      <div className="text-xs text-[#6b7d99]">Submitted by operator · Not independently verified</div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {tab === "permissions" && (
            <div className="space-y-6">
              <div className="bg-[#193040] border border-[#2dd4bf]/15 rounded-lg p-4 text-sm text-[#9aacc4]">
                This shows what this service normally requires. Your actual authority is selected during activation — you always configure exact limits.
              </div>
              <Card className="p-5 space-y-4">
                <div>
                  <div className="text-xs font-mono uppercase text-[#4ade80] mb-2">This service normally needs</div>
                  <div className="space-y-2">
                    {[
                      `Use: ${service.supportedAssets?.join(", ") || service.supportedPairs?.join(", ") || "configured assets"}`,
                      `Interact with: ${service.supportedProtocols.join(", ")}`,
                      service.categoryMetrics?.type === "rebalancing" ? "Manage LP position (add/remove liquidity, swap)" : "",
                      service.categoryMetrics?.type === "grid" ? "Place and cancel orders on supported pairs" : "",
                      service.categoryMetrics?.type === "yield" ? "Deposit and withdraw from supported yield protocols" : "",
                      service.categoryMetrics?.type === "health" ? "Read position state from Venus Protocol" : "",
                    ].filter(Boolean).map(item => (
                      <div key={item} className="flex items-center gap-2 text-sm text-[#9aacc4]">
                        <Check className="w-3.5 h-3.5 text-[#4ade80]" /> {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-white/7 pt-4">
                  <div className="text-xs font-mono uppercase text-[#f87171] mb-2">This service cannot</div>
                  <div className="space-y-2">
                    {["Transfer to arbitrary wallets", "Use unrelated protocols", "Access unrelated assets"].map(item => (
                      <div key={item} className="flex items-center gap-2 text-sm text-[#9aacc4]">
                        <X className="w-3.5 h-3.5 text-[#4ade80]" /> {item}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[#6b7d99] mt-2">Restrictions are positive safety constraints, not limitations.</p>
                </div>
                <div className="border-t border-white/7 pt-4 space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-[#6b7d99]">Configurable limits</span><span className="text-[#4ade80]">Yes</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#6b7d99]">Expiry support</span><span className="text-[#4ade80]">Yes</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#6b7d99]">Revocation</span><span className="text-[#4ade80]">Yes — immediate</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#6b7d99]">Permission intensity</span><AuthorityBars intensity={service.permissionIntensity} /></div>
                </div>
              </Card>
            </div>
          )}

          {tab === "tests" && (
            <div className="space-y-4">
              {[
                { name: m.type === "rebalancing" ? "Range rebalance execution" : m.type === "grid" ? "Grid order placement" : m.type === "yield" ? "Yield opportunity comparison" : "Health factor monitoring", result: "PASSED", env: "BSC Testnet", date: "Aug 15", required: true },
                { name: "Permission compliance", result: "PASSED", env: "Marketplace sandbox", date: "Aug 15", required: true },
                { name: "Runtime readiness", result: service.evidenceSummary.readinessScore || "98%", env: "30-day observation", date: "Aug 16", required: true },
                { name: "Failure recovery behavior", result: "PASSED", env: "BSC Testnet", date: "Aug 14", required: false },
              ].map(test => (
                <Card key={test.name} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[#dde3ef]">{test.name}</span>
                      {test.required && <Badge variant="muted">Required</Badge>}
                    </div>
                    <div className="text-xs text-[#6b7d99]">{test.env} · {test.date}</div>
                  </div>
                  <Badge variant={test.result === "PASSED" ? "green" : "amber"}>{test.result}</Badge>
                </Card>
              ))}
              <div className="flex gap-3 mt-4">
                <Btn variant="secondary" size="sm"><Eye className="w-3.5 h-3.5" /> View Test Evidence</Btn>
                <Btn variant="teal-outline" size="sm" onClick={() => navigate("try", { agentId: serviceId })}>
                  <Play className="w-3.5 h-3.5" /> Try Agent
                </Btn>
              </div>
            </div>
          )}

          {tab === "performance" && (
            <div className="space-y-6">
              <div className="flex gap-2">
                {["7D", "30D", "90D", "All"].map(r => (
                  <button key={r} className={cn("px-3 py-1.5 text-xs rounded-md", r === "30D" ? "bg-[#2dd4bf]/15 text-[#2dd4bf] border border-[#2dd4bf]/30" : "text-[#6b7d99] bg-[#1c2433] border border-white/8")}>{r}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {m.type === "rebalancing" && <>
                  <div className="bg-card border border-white/7 rounded-lg p-4"><MetricItem label="Time in range" value={m.timeInRange} sub={m.period} provenance="marketplace-observed" positive /></div>
                  <div className="bg-card border border-white/7 rounded-lg p-4"><MetricItem label="Rebalance success" value={m.rebalanceSuccess} sub={m.period} provenance="marketplace-observed" positive /></div>
                  <div className="bg-card border border-white/7 rounded-lg p-4"><MetricItem label="Rebalance frequency" value={m.rebalanceFreq} sub={m.period} provenance="marketplace-observed" /></div>
                </>}
                {m.type === "grid" && <>
                  <div className="bg-card border border-white/7 rounded-lg p-4"><MetricItem label="Net P&L" value={m.netPnL} sub={m.period} provenance="marketplace-observed" positive={m.netPnL.startsWith("+")} /></div>
                  <div className="bg-card border border-white/7 rounded-lg p-4"><MetricItem label="Max drawdown" value={m.maxDrawdown} sub={m.period} provenance="marketplace-observed" /></div>
                  <div className="bg-card border border-white/7 rounded-lg p-4"><MetricItem label="Total fills" value={`${m.fills}`} sub={m.period} provenance="marketplace-observed" /></div>
                </>}
                {m.type === "yield" && <>
                  <div className="bg-card border border-white/7 rounded-lg p-4"><MetricItem label="Current reported rate" value={m.currentRate} provenance="operator-claimed" /></div>
                  <div className="bg-card border border-white/7 rounded-lg p-4"><MetricItem label="Estimated net rate" value={m.estimatedNet} provenance="marketplace-derived" /></div>
                  {m.observedRealised && <div className="bg-card border border-white/7 rounded-lg p-4"><MetricItem label="Observed realised" value={m.observedRealised} sub={m.period || ""} provenance="marketplace-observed" positive /></div>}
                </>}
                {m.type === "health" && <>
                  <div className="bg-card border border-white/7 rounded-lg p-4"><MetricItem label="Reliability" value={m.reliability} sub={m.period} provenance="marketplace-observed" positive /></div>
                  <div className="bg-card border border-white/7 rounded-lg p-4"><MetricItem label="Detection latency" value={m.detectionLatency} sub={m.period} provenance="marketplace-observed" /></div>
                  <div className="bg-card border border-white/7 rounded-lg p-4"><MetricItem label="Monitoring interval" value={m.monitoringInterval} /></div>
                </>}
              </div>
              <div className="bg-[#1c2433] border border-white/6 rounded-lg p-4 text-xs text-[#6b7d99]">
                <Info className="w-3.5 h-3.5 inline mr-1.5" />
                Performance metrics are from {service.evidenceSummary.marketplaceObserved}. Current reported rates are not guaranteed future returns. Marketplace Observed data is separate from Operator Supplied data and displayed on different axes.
              </div>
            </div>
          )}

          {tab === "reviews" && (
            <div className="space-y-6">
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-[#f59e0b]" />
                  <span className="font-medium text-[#dde3ef]">Verified Marketplace Reviews</span>
                </div>
                <p className="text-sm text-[#6b7d99]">Marketplace reviews are available only for users with qualifying marketplace usage. Reviews are separate from external feedback records.</p>
                <div className="mt-4 space-y-3">
                  {[{ rating: 5, text: "Reliable rebalancing, gas costs as expected. 94% time in range over 3 months.", date: "Aug 2025" },
                    { rating: 4, text: "Works as described. Would appreciate wider pair support.", date: "Jul 2025" }].map((r, i) => (
                    <div key={i} className="p-3 bg-black/20 rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">{Array.from({ length: 5 }).map((_, j) => <Star key={j} className={cn("w-3 h-3", j < r.rating ? "text-[#f59e0b]" : "text-[#1c2433]")} fill={j < r.rating ? "#f59e0b" : "none"} />)}</div>
                        <Badge variant="teal">Verified</Badge>
                        <span className="text-xs text-[#6b7d99] ml-auto">{r.date}</span>
                      </div>
                      <p className="text-sm text-[#9aacc4]">{r.text}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ExternalLink className="w-4 h-4 text-[#a78bfa]" />
                  <span className="font-medium text-[#dde3ef]">External Reputation</span>
                  <ProvenanceBadge type="external" />
                </div>
                <p className="text-sm text-[#6b7d99]">{service.evidenceSummary.externalFeedback || "No external feedback records available."}</p>
              </Card>
            </div>
          )}
        </div>

        {/* Decision rail */}
        <aside className="hidden lg:block w-72 shrink-0 space-y-4 sticky top-20 self-start">
          <Card className="p-5 space-y-4">
            <div>
              <div className="text-xs text-[#6b7d99] mb-1">Price</div>
              <div className="text-xl font-semibold font-mono text-[#dde3ef]">{service.pricing.amount}<span className="text-sm text-[#6b7d99]">/{service.pricing.period}</span></div>
              {service.pricing.performanceFee && <div className="text-xs text-[#6b7d99] mt-0.5">+ {service.pricing.performanceFee}</div>}
              <div className="text-xs text-[#6b7d99] mt-1">{service.pricing.protocolCostsNote}</div>
            </div>
            <div className="border-t border-white/7 pt-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-[#6b7d99]">Automation</span><span className="text-[#dde3ef] text-xs">{service.automationMode}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#6b7d99]">Authority</span><AuthorityBars intensity={service.permissionIntensity} /></div>
              <div className="flex justify-between text-sm"><span className="text-[#6b7d99]">Status</span><ReadinessPill state={service.readiness} /></div>
            </div>
            <div className="border-t border-white/7 pt-4 space-y-2">
              <Btn variant="primary" className="w-full justify-center" onClick={() => navigate("checkout", { agentId: serviceId, checkoutStep: "job" })}>
                Activate Agent
              </Btn>
              <Btn variant="secondary" className="w-full justify-center" onClick={() => navigate("try", { agentId: serviceId })}>
                <Play className="w-4 h-4" /> Try Agent
              </Btn>
              <Btn variant="ghost" className="w-full justify-center text-[#6b7d99]" onClick={() => navigate("compare", { compareIds: [serviceId] })}>
                <GitCompare className="w-4 h-4" /> Compare
              </Btn>
            </div>
          </Card>
        </aside>
      </div>

      {/* Mobile sticky bar */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-[#0c0f14]/95 border-t border-white/7 flex gap-3 z-30">
        <Btn variant="secondary" className="flex-1 justify-center" onClick={() => navigate("try", { agentId: serviceId })}><Play className="w-4 h-4" /> Try</Btn>
        <Btn variant="primary" className="flex-1 justify-center" onClick={() => navigate("checkout", { agentId: serviceId, checkoutStep: "job" })}>Activate</Btn>
      </div>
    </div>
  );
}

// ─── PAGE: COMPARE ────────────────────────────────────────────────────────────

function ComparePage({ compareIds, navigate }: { compareIds: string[]; navigate: (r: Route, p?: Partial<NavState>) => void }) {
  const services = compareIds.slice(0, 3).map(id => SERVICES.find(s => s.serviceId === id)).filter(Boolean) as AgentService[];
  if (services.length === 0) services.push(...SERVICES.slice(0, 3));

  const rows: { label: string; getValue: (s: AgentService) => string | React.ReactNode }[] = [
    { label: "Availability", getValue: s => <ReadinessPill state={s.readiness} /> },
    { label: "Price", getValue: s => `${s.pricing.amount}/${s.pricing.period || "use"}` },
    { label: "Authority", getValue: s => <AuthorityBars intensity={s.permissionIntensity} /> },
    { label: "Automation", getValue: s => s.automationMode },
    { label: "Marketplace Tests", getValue: s => `${s.evidenceSummary.testsPassed} passed` },
    { label: "ERC-8004", getValue: s => s.erc8004Verified ? <span className="text-[#2dd4bf]">Verified</span> : "No" },
    { label: "Min. Capital", getValue: s => s.capitalMin || "—" },
    { label: "Supported Protocols", getValue: s => s.supportedProtocols.join(", ") },
    { label: "Evidence", getValue: s => s.evidenceSummary.marketplaceObserved },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <button onClick={() => navigate("explore")} className="flex items-center gap-2 text-sm text-[#6b7d99] hover:text-[#9aacc4] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-2xl font-semibold text-[#dde3ef] mb-2">Compare agents</h1>
      <p className="text-sm text-[#6b7d99] mb-6">Comparing {services.length} services. Up to 3 allowed.</p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs font-mono uppercase text-[#6b7d99] py-3 pr-4 w-36">Feature</th>
              {services.map(s => (
                <th key={s.serviceId} className="text-left py-3 px-4 border-l border-white/7">
                  <div className="font-semibold text-[#dde3ef]">{s.name}</div>
                  <div className="mt-1"><CategoryPill category={s.category} /></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.label} className="border-t border-white/6 hover:bg-white/2 transition-colors">
                <td className="text-xs text-[#6b7d99] py-3 pr-4 align-top">{row.label}</td>
                {services.map(s => (
                  <td key={s.serviceId} className="py-3 px-4 text-sm text-[#9aacc4] border-l border-white/6 align-top">
                    {row.getValue(s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/10">
              <td />
              {services.map(s => (
                <td key={s.serviceId} className="py-4 px-4 border-l border-white/6">
                  <Btn size="sm" variant="primary" onClick={() => navigate("checkout", { agentId: s.serviceId, checkoutStep: "job" })}>Activate</Btn>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-6 p-4 bg-[#1c2433] border border-white/6 rounded-lg text-xs text-[#6b7d99]">
        <Info className="w-3.5 h-3.5 inline mr-1.5" />
        Missing performance data shows as "Insufficient evidence" — never as zero. No agent is declared a winner. Data provenance is shown on individual profiles.
      </div>
    </div>
  );
}

// ─── PAGE: TRY AGENT ─────────────────────────────────────────────────────────

function TryAgentPage({ serviceId, navigate }: { serviceId: string; navigate: (r: Route, p?: Partial<NavState>) => void }) {
  const [phase, setPhase] = useState<"setup" | "running" | "result">("setup");
  const [mode, setMode] = useState<"simulation" | "testnet" | "demo">("simulation");
  const service = SERVICES.find(s => s.serviceId === serviceId) || SERVICES[0];

  useEffect(() => {
    let cancelled = false;
    if (phase === "running") {
      runMockAgentTest().then(() => {
        if (!cancelled) setPhase("result");
      });
    }
    return () => { cancelled = true; };
  }, [phase]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <button onClick={() => navigate("agent", { agentId: serviceId })} className="flex items-center gap-2 text-sm text-[#6b7d99] hover:text-[#9aacc4] mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to {service.name}
      </button>
      <h1 className="text-2xl font-semibold text-[#dde3ef] mb-1">Try {service.name}</h1>

      {phase === "setup" && (
        <div className="space-y-6 mt-6">
          <Card className="p-5">
            <div className="text-xs font-mono uppercase text-[#6b7d99] mb-3">Test environment</div>
            <div className="space-y-2">
              {(["simulation", "testnet", "demo"] as const).map(m => (
                <label key={m} className="flex items-center gap-3 p-3 rounded-md bg-[#1c2433] border border-white/8 cursor-pointer hover:border-white/14 transition-colors">
                  <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} className="accent-[#2dd4bf]" />
                  <div>
                    <div className="text-sm font-medium text-[#dde3ef] capitalize">{m}</div>
                    <div className="text-xs text-[#6b7d99]">
                      {m === "simulation" && "Simulated execution against example portfolio — no live transaction"}
                      {m === "testnet" && "Real execution on BSC Testnet — no mainnet funds"}
                      {m === "demo" && "Scripted walkthrough of agent behavior"}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="text-xs font-mono uppercase text-[#6b7d99] mb-3">What this will test</div>
            <ul className="text-sm text-[#9aacc4] space-y-1.5">
              {service.category === "rebalancing" && <><li className="flex gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf] shrink-0 mt-0.5" />Position detection and range evaluation</li><li className="flex gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf] shrink-0 mt-0.5" />Rebalance trigger logic</li><li className="flex gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf] shrink-0 mt-0.5" />Permission compliance check</li></>}
              {service.category === "yield" && <><li className="flex gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf] shrink-0 mt-0.5" />Opportunity comparison across supported protocols</li><li className="flex gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf] shrink-0 mt-0.5" />Reallocation decision logic</li></>}
              {service.category === "grid" && <><li className="flex gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf] shrink-0 mt-0.5" />Grid placement logic</li><li className="flex gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf] shrink-0 mt-0.5" />Fill simulation</li></>}
              {service.category === "health" && <><li className="flex gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf] shrink-0 mt-0.5" />Health factor polling</li><li className="flex gap-2"><Check className="w-3.5 h-3.5 text-[#2dd4bf] shrink-0 mt-0.5" />Alert trigger evaluation</li></>}
            </ul>
            <div className="mt-3 pt-3 border-t border-white/7">
              <div className="text-xs font-mono uppercase text-[#6b7d99] mb-2">What will NOT happen</div>
              <div className="flex items-center gap-2 text-sm text-[#9aacc4]"><X className="w-3.5 h-3.5 text-[#4ade80]" /> No live blockchain transaction</div>
              <div className="flex items-center gap-2 text-sm text-[#9aacc4]"><X className="w-3.5 h-3.5 text-[#4ade80]" /> No mainnet funds moved</div>
            </div>
          </Card>
          <Btn variant="primary" size="lg" className="w-full justify-center" onClick={() => setPhase("running")}>
            <Play className="w-4 h-4" /> Run {mode === "simulation" ? "Simulation" : mode === "testnet" ? "Testnet Run" : "Demo"}
          </Btn>
        </div>
      )}

      {phase === "running" && (
        <div className="mt-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 text-sm text-[#2dd4bf]">
            <span className="w-2 h-2 rounded-full bg-[#2dd4bf] animate-pulse" />
            Running {mode}...
          </div>
          <Card className="p-6 text-left space-y-2">
            {["Connecting to example portfolio...", "Reading position state...", "Evaluating triggers..."].map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-[#6b7d99]">
                <Check className="w-3.5 h-3.5 text-[#2dd4bf]" /> {s}
              </div>
            ))}
            <div className="flex items-center gap-2 text-sm text-[#2dd4bf]">
              <span className="w-2 h-2 rounded-full bg-[#2dd4bf] animate-pulse" /> Generating result...
            </div>
          </Card>
        </div>
      )}

      {phase === "result" && (
        <div className="mt-6 space-y-6">
          <div className="flex items-center gap-3 p-4 bg-[#4ade80]/8 border border-[#4ade80]/20 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-[#4ade80]" />
            <div>
              <div className="font-medium text-[#dde3ef]">Completed successfully</div>
              <div className="text-xs text-[#6b7d99]">Environment: {mode} · Example Portfolio / Sample Data</div>
            </div>
          </div>
          <Card className="p-5 space-y-3">
            <div className="text-xs font-mono uppercase text-[#6b7d99] mb-1">What the agent saw</div>
            {service.category === "rebalancing" && <p className="text-sm text-[#9aacc4]">BNB/USDT LP on PancakeSwap V3, range $225–$285, current price $218.40 — outside lower boundary.</p>}
            {service.category === "yield" && <p className="text-sm text-[#9aacc4]">2,750 USDT available. PancakeSwap current USDT-CAKE farm: 8.4%. Venus USDT supply: 6.2%. YieldPilot selected PancakeSwap opportunity.</p>}
            {service.category === "grid" && <p className="text-sm text-[#9aacc4]">BNB/USDT range-bound behavior detected. Grid placed across $210–$235 with 25 levels.</p>}
            {service.category === "health" && <p className="text-sm text-[#9aacc4]">Venus HF: 1.42. Below watch threshold 1.5. Alert would be triggered. No immediate intervention required.</p>}
            <div className="border-t border-white/7 pt-3 text-xs font-mono uppercase text-[#6b7d99] mb-1">What it decided</div>
            {service.category === "rebalancing" && <p className="text-sm text-[#9aacc4]">Rebalance triggered. Would set new range $213–$243 centered on current price.</p>}
            {service.category === "yield" && <p className="text-sm text-[#9aacc4]">Reallocation would proceed to PancakeSwap opportunity. Estimated net improvement: +1.4%.</p>}
            {service.category === "grid" && <p className="text-sm text-[#9aacc4]">Grid initiated. 25 levels active. Next fill expected within range.</p>}
            {service.category === "health" && <p className="text-sm text-[#9aacc4]">Alert generated. No auto-intervention triggered (HF above intervention threshold).</p>}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/7 mt-3">
              <div><div className="text-[11px] text-[#6b7d99]">Response time</div><div className="text-sm font-mono text-[#dde3ef]">1.2s</div></div>
              <div><div className="text-[11px] text-[#6b7d99]">Est. cost</div><div className="text-sm font-mono text-[#dde3ef]">~$1.30 gas</div></div>
              <div><div className="text-[11px] text-[#6b7d99]">Permission</div><div className="text-sm text-[#4ade80]">Compliant</div></div>
            </div>
          </Card>
          <div className="flex flex-wrap gap-3">
            <Btn variant="primary" onClick={() => navigate("checkout", { agentId: serviceId, checkoutStep: "job" })}>Activate Agent</Btn>
            <Btn variant="secondary" onClick={() => navigate("compare", { compareIds: [serviceId] })}>Compare Alternatives</Btn>
            <Btn variant="ghost" onClick={() => setPhase("setup")}>Run Another Test</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAGE: CHECKOUT ────────────────────────────────────────────────────────────

function LiveRebalancingJobIntentPage({ jobIntentId, navigate }: { jobIntentId: string; navigate: (r: Route, p?: Partial<NavState>) => void }) {
  const [intent, setIntent] = useState<RebalancingJobIntent>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [maxSlippageBps, setMaxSlippageBps] = useState("50");
  const [validForMinutes, setValidForMinutes] = useState("30");
  const [allowSwapPreparation, setAllowSwapPreparation] = useState(false);
  const [permissionRequest, setPermissionRequest] = useState<BoundedPermissionRequest>();
  const [permissionGrant, setPermissionGrant] = useState<BoundedPermissionGrant>();
  const [token0Limit, setToken0Limit] = useState("");
  const [token1Limit, setToken1Limit] = useState("");
  const [authorityValidForMinutes, setAuthorityValidForMinutes] = useState("30");
  const [authoritySaving, setAuthoritySaving] = useState(false);
  const [reverifyingGrant, setReverifyingGrant] = useState(false);
  const [bindingVerifying, setBindingVerifying] = useState(false);
  const [guarding, setGuarding] = useState(false);
  const [guardTarget, setGuardTarget] = useState("");
  const [guardCalldata, setGuardCalldata] = useState("");
  const [altanaWalletAddress, setAltanaWalletAddress] = useState<string>();
  const [altanaWalletBusy, setAltanaWalletBusy] = useState(false);
  const [probe, setProbe] = useState<AltanaTestnetProbeObservation>();
  const [probeBusy, setProbeBusy] = useState(false);
  const [executionPlan, setExecutionPlan] = useState<RebalancingExecutionPlan>();
  const [executionBoundary, setExecutionBoundary] = useState<FinancialExecutionBoundary>();
  const [boundaryPreflight, setBoundaryPreflight] = useState<ExecutionBoundaryPreflight>();
  const [financialSession, setFinancialSession] = useState<BoundaryFinancialSessionObservation>();
  const [financialReadiness, setFinancialReadiness] = useState<BoundaryFinancialReadiness>();
  const [financialSessionBusy, setFinancialSessionBusy] = useState(false);
  const [approvalPlan, setApprovalPlan] = useState<BoundaryApprovalPlan>();
  const [approvalObservation, setApprovalObservation] = useState<BoundaryApprovalObservation>();
  const [controlledExecution, setControlledExecution] = useState<ControlledRebalancingExecution>();
  const [controlledBusy, setControlledBusy] = useState(false);
  const [targetTickLower, setTargetTickLower] = useState("");
  const [targetTickUpper, setTargetTickUpper] = useState("");
  const [executionPlanBusy, setExecutionPlanBusy] = useState(false);
  const [serviceTask, setServiceTask] = useState<ServiceTask>();
  const [serviceTaskBusy, setServiceTaskBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    void jobIntentRepository.get(jobIntentId).then((value) => {
      if (!active) return;
      setIntent(value);
      setMaxSlippageBps(String(value.constraints.maxSlippageBps));
      setValidForMinutes(String(value.constraints.validForMinutes));
      setAllowSwapPreparation(value.constraints.allowSwapPreparation);
      setAuthorityValidForMinutes(String(value.constraints.validForMinutes));
      void serviceTaskRepository.getForJob(value.jobIntentId).then((task) => {
        if (!active || !task) return;
        setServiceTask(task);
        if (task.proposal?.targetTickLower !== undefined && task.proposal?.targetTickUpper !== undefined) {
          setTargetTickLower(String(task.proposal.targetTickLower));
          setTargetTickUpper(String(task.proposal.targetTickUpper));
        }
      }).catch(() => undefined);
      if (value.authority.permissionRequestId) {
        void authorityRepository.getRequest(value.authority.permissionRequestId).then((request) => {
          if (!active) return;
          setPermissionRequest(request);
          setGuardTarget(request.positionManager);
          setToken0Limit(request.spendCaps[0]?.limitDisplay ?? "");
          setToken1Limit(request.spendCaps[1]?.limitDisplay ?? "");
          setAuthorityValidForMinutes(String(Math.max(5, Math.ceil((new Date(request.expiresAt).getTime() - Date.now()) / 60_000))));
        }).catch(() => undefined);
      }
      if (value.authority.permissionGrantId) {
        void authorityRepository.getGrant(value.authority.permissionGrantId).then((grant) => { if (active) setPermissionGrant(grant); }).catch(() => undefined);
      }
      void authorityRepository.getTestnetProbeForJob(value.jobIntentId).then((savedProbe) => { if (active && savedProbe) setProbe(savedProbe); }).catch(() => undefined);
      void executionPlanRepository.getForJob(value.jobIntentId).then((savedPlan) => {
        if (!active || !savedPlan) return;
        setExecutionPlan(savedPlan);
        setTargetTickLower(String(savedPlan.targetRange.tickLower));
        setTargetTickUpper(String(savedPlan.targetRange.tickUpper));
        if (savedPlan.enforcementBoundaryId) void executionPlanRepository.getBoundary(savedPlan.enforcementBoundaryId).then((savedBoundary) => {
          if (!active) return; setExecutionBoundary(savedBoundary);
          void executionPlanRepository.getFinancialSession(savedBoundary.boundaryId).then((value)=>{ if(active&&value) setFinancialSession(value); }).catch(()=>undefined);
          void executionPlanRepository.getFinancialReadiness(savedBoundary.boundaryId).then((value)=>{ if(active&&value) setFinancialReadiness(value); }).catch(()=>undefined);
          void controlledExecutionRepository.getApproval(savedBoundary.boundaryId).then((value)=>{ if(active&&value){setApprovalPlan(value.plan);setApprovalObservation(value.observation);} }).catch(()=>undefined);
          void controlledExecutionRepository.getExecutionForBoundary(savedBoundary.boundaryId).then((value)=>{ if(active&&value) setControlledExecution(value); }).catch(()=>undefined);
        }).catch(() => undefined);
      }).catch(() => undefined);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Spotriq could not load this job intent.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [jobIntentId]);

  const saveConstraints = async () => {
    if (!intent) return;
    const slippage = Number(maxSlippageBps);
    const validity = Number(validForMinutes);
    setSaving(true);
    setError(undefined);
    try {
      const next = await jobIntentRepository.revise(intent.jobIntentId, {
        maxSlippageBps: slippage,
        validForMinutes: validity,
        allowSwapPreparation,
      });
      setIntent(next);
      if (!next.serviceTask) setServiceTask(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Spotriq could not save the proposed job limits.");
    } finally {
      setSaving(false);
    }
  };

  const applyServiceTaskResult = (result: { task: ServiceTask; intent?: RebalancingJobIntent }) => {
    setServiceTask(result.task);
    if (result.intent) setIntent(result.intent);
    if (result.task.proposal?.targetTickLower !== undefined && result.task.proposal?.targetTickUpper !== undefined) {
      setTargetTickLower(String(result.task.proposal.targetTickLower));
      setTargetTickUpper(String(result.task.proposal.targetTickUpper));
    }
  };

  const invokeServiceTask = async () => {
    if (!intent) return;
    setServiceTaskBusy(true); setError(undefined);
    try { applyServiceTaskResult(await serviceTaskRepository.invoke(intent.jobIntentId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Spotriq could not invoke the selected AgentService."); }
    finally { setServiceTaskBusy(false); }
  };

  const refreshServiceTask = async () => {
    if (!serviceTask) return;
    setServiceTaskBusy(true); setError(undefined);
    try { applyServiceTaskResult(await serviceTaskRepository.reconcile(serviceTask.serviceTaskId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Spotriq could not reconcile the remote AgentService task."); }
    finally { setServiceTaskBusy(false); }
  };

  const retryServiceTask = async () => {
    if (!serviceTask) return;
    setServiceTaskBusy(true); setError(undefined);
    try { applyServiceTaskResult(await serviceTaskRepository.retry(serviceTask.serviceTaskId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Spotriq could not retry the AgentService task."); }
    finally { setServiceTaskBusy(false); }
  };

  const confirmJob = async () => {
    if (!intent) return;
    setConfirming(true);
    setError(undefined);
    try {
      const next = await jobIntentRepository.confirm(intent.jobIntentId);
      setIntent(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Spotriq could not confirm this job intent.");
    } finally {
      setConfirming(false);
    }
  };

  const prepareBoundedAuthority = async () => {
    if (!intent) return;
    setAuthoritySaving(true);
    setError(undefined);
    try {
      const input = { token0Limit: token0Limit.trim(), token1Limit: token1Limit.trim(), validForMinutes: Number(authorityValidForMinutes) };
      const result = permissionRequest
        ? await authorityRepository.revise(permissionRequest.permissionRequestId, input)
        : await authorityRepository.prepare(intent.jobIntentId, input);
      setPermissionRequest(result.request);
      setGuardTarget(result.request.positionManager);
      if (result.intent) setIntent(result.intent);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Spotriq could not prepare the bounded authority request.");
    } finally {
      setAuthoritySaving(false);
    }
  };

  const verifyTrustedServiceKey = async () => {
    if (!permissionRequest) return;
    setBindingVerifying(true);
    setError(undefined);
    try {
      const result = await authorityRepository.verifyTrustedAgentBinding(permissionRequest.permissionRequestId);
      setPermissionRequest(result.request);
      if (result.intent) setIntent(result.intent);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Spotriq could not verify a service-owned session key from this agent runtime.");
    } finally {
      setBindingVerifying(false);
    }
  };

  const runExecutionGuard = async () => {
    if (!permissionRequest) return;
    if (!guardCalldata.trim()) { setError("Paste one proposed PancakeSwap V3 calldata payload before running the guard."); return; }
    setGuarding(true);
    setError(undefined);
    try {
      const result = await authorityRepository.guardCall(permissionRequest.permissionRequestId, {
        call: { to: guardTarget.trim() || permissionRequest.positionManager, data: guardCalldata.trim(), valueRaw: "0" },
      });
      setPermissionRequest(result.request);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Spotriq could not validate this proposed calldata payload.");
    } finally {
      setGuarding(false);
    }
  };

  const createAltanaTestnetWallet = async () => {
    setAltanaWalletBusy(true);
    setError(undefined);
    try {
      const result = await altanaHandlers.createTestnetPasskeyWallet();
      setAltanaWalletAddress(result.address);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Spotriq could not create the Altana BSC Testnet passkey wallet.");
    } finally {
      setAltanaWalletBusy(false);
    }
  };

  const recoverAltanaTestnetWallet = async () => {
    setAltanaWalletBusy(true);
    setError(undefined);
    try {
      const result = await altanaHandlers.recoverTestnetPasskeyWallet();
      setAltanaWalletAddress(result.address);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Spotriq could not recover the Altana BSC Testnet passkey wallet.");
    } finally {
      setAltanaWalletBusy(false);
    }
  };

  const grantAltanaTestnetProbe = async () => {
    if (!intent || !subject.positionManager) return;
    setProbeBusy(true);
    setError(undefined);
    try {
      const minutes = Math.max(5, Math.min(30, Number(authorityValidForMinutes) || 30));
      const proof = await altanaHandlers.grantReadOnlyProbe({
        expectedWalletAddress: intent.walletAddress,
        target: subject.positionManager,
        expiryUnix: Math.floor(Date.now() / 1000) + minutes * 60,
      });
      const observed = await authorityRepository.observeTestnetProbe(intent.jobIntentId, proof);
      setProbe(observed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Spotriq could not create and verify the Altana BSC Testnet probe grant.");
    } finally {
      setProbeBusy(false);
    }
  };

  const reverifyAltanaTestnetProbe = async () => {
    if (!probe) return;
    setProbeBusy(true);
    setError(undefined);
    try {
      setProbe(await authorityRepository.reverifyTestnetProbe(probe.probeId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Spotriq could not re-verify this Altana BSC Testnet probe.");
    } finally {
      setProbeBusy(false);
    }
  };

  const revokeAltanaTestnetProbe = async () => {
    if (!probe) return;
    setProbeBusy(true);
    setError(undefined);
    try {
      const result = await altanaHandlers.revokeReadOnlyProbe({ expectedWalletAddress: probe.walletAddress, sessionPublicKey: probe.sessionPublicKey });
      setProbe(await authorityRepository.reverifyTestnetProbe(probe.probeId, result.transactionHash));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Spotriq could not revoke and re-verify this Altana BSC Testnet probe.");
    } finally {
      setProbeBusy(false);
    }
  };

  const prepareExecutionPlan = async () => {
    if (!intent || !permissionRequest) return;
    setExecutionPlanBusy(true); setError(undefined);
    try {
      const lower = Number(targetTickLower), upper = Number(targetTickUpper);
      const plan = await executionPlanRepository.prepare(intent.jobIntentId, { targetTickLower: lower, targetTickUpper: upper });
      setExecutionPlan(plan); setExecutionBoundary(undefined); setBoundaryPreflight(undefined);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Spotriq could not prepare the reviewed Rebalancing execution plan."); } finally { setExecutionPlanBusy(false); }
  };
  const reviewExecutionPlan = async () => {
    if (!executionPlan) return; setExecutionPlanBusy(true); setError(undefined);
    try { const plan = await executionPlanRepository.review(executionPlan.planId); setExecutionPlan(plan); if (permissionRequest) setPermissionRequest(await authorityRepository.getRequest(permissionRequest.permissionRequestId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Spotriq could not confirm the execution plan against fresh onchain state."); } finally { setExecutionPlanBusy(false); }
  };
  const sealExecutionBoundary = async () => {
    if (!executionPlan) return; setExecutionPlanBusy(true); setError(undefined);
    try { const boundary = await executionPlanRepository.sealBoundary(executionPlan.planId); setExecutionBoundary(boundary); setExecutionPlan(await executionPlanRepository.get(executionPlan.planId)); if (permissionRequest) setPermissionRequest(await authorityRepository.getRequest(permissionRequest.permissionRequestId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Spotriq could not seal the non-bypassable execution boundary."); } finally { setExecutionPlanBusy(false); }
  };
  const runBoundaryPreflight = async () => {
    if (!executionBoundary) return; setExecutionPlanBusy(true); setError(undefined);
    try { setBoundaryPreflight(await executionPlanRepository.preflight(executionBoundary.boundaryId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Spotriq could not refresh execution-boundary preflight state."); } finally { setExecutionPlanBusy(false); }
  };
  const grantBoundaryFinancialSession = async () => {
    if (!intent || !permissionRequest || !executionBoundary) return;
    setFinancialSessionBusy(true); setError(undefined);
    try {
      if (!altanaWalletAddress || altanaWalletAddress.toLowerCase() !== intent.walletAddress.toLowerCase()) throw new Error("Create or recover the Altana BSC Testnet wallet that exactly matches this Job Intent first.");
      const proof = await altanaHandlers.grantBoundaryFinancialSession({ expectedWalletAddress: intent.walletAddress, calls: permissionRequest.callAllowlist, spendCaps: permissionRequest.spendCaps, expiryUnix: permissionRequest.expiryUnix });
      const result = await executionPlanRepository.observeFinancialSession(executionBoundary.boundaryId, proof);
      setFinancialSession(result.session); if (result.boundary) setExecutionBoundary(result.boundary);
      setPermissionRequest(await authorityRepository.getRequest(permissionRequest.permissionRequestId));
      setBoundaryPreflight(await executionPlanRepository.preflight(executionBoundary.boundaryId));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Spotriq could not grant and verify the boundary-controlled Altana financial session."); } finally { setFinancialSessionBusy(false); }
  };
  const reverifyBoundaryFinancialSession = async () => {
    if (!financialSession || !executionBoundary) return; setFinancialSessionBusy(true); setError(undefined);
    try { setFinancialSession(await executionPlanRepository.reverifyFinancialSession(financialSession.financialSessionId)); setBoundaryPreflight(await executionPlanRepository.preflight(executionBoundary.boundaryId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Spotriq could not re-verify the boundary financial session."); } finally { setFinancialSessionBusy(false); }
  };
  const revokeBoundaryFinancialSession = async () => {
    if (!financialSession || !executionBoundary) return; setFinancialSessionBusy(true); setError(undefined);
    try { const result=await altanaHandlers.revokeBoundaryFinancialSession({expectedWalletAddress:financialSession.walletAddress,sessionPublicKey:financialSession.sessionPublicKey}); setFinancialSession(await executionPlanRepository.reverifyFinancialSession(financialSession.financialSessionId,result.transactionHash)); setBoundaryPreflight(await executionPlanRepository.preflight(executionBoundary.boundaryId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Spotriq could not revoke and re-verify the boundary financial session."); } finally { setFinancialSessionBusy(false); }
  };
  const checkFinancialReadiness = async () => {
    if (!executionBoundary) return; setFinancialSessionBusy(true); setError(undefined);
    try { setFinancialReadiness(await executionPlanRepository.financialReadiness(executionBoundary.boundaryId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Spotriq could not read token balance/allowance readiness."); } finally { setFinancialSessionBusy(false); }
  };

  const prepareExactApprovals = async () => {
    if (!executionBoundary) return; setControlledBusy(true); setError(undefined);
    try { const result=await controlledExecutionRepository.prepareApproval(executionBoundary.boundaryId); setApprovalPlan(result.plan); if(result.readiness)setFinancialReadiness(result.readiness); }
    catch(cause){setError(cause instanceof Error?cause.message:"Spotriq could not prepare exact token approvals.");} finally{setControlledBusy(false);}
  };
  const reviewExactApprovals = async () => {
    if(!approvalPlan)return;setControlledBusy(true);setError(undefined);try{setApprovalPlan(await controlledExecutionRepository.reviewApproval(approvalPlan.approvalPlanId));}catch(cause){setError(cause instanceof Error?cause.message:"Spotriq could not review the exact allowance plan.");}finally{setControlledBusy(false);}
  };
  const executeExactApprovals = async () => {
    if(!approvalPlan||!intent)return;setControlledBusy(true);setError(undefined);try{
      const proof=await altanaHandlers.executeExactApprovalPlan({expectedWalletAddress:intent.walletAddress,calls:approvalPlan.calls.map((item)=>item.call)});
      const result=await controlledExecutionRepository.observeApproval(approvalPlan.approvalPlanId,proof);setApprovalPlan(result.plan);setApprovalObservation(result.observation);if(result.readiness)setFinancialReadiness(result.readiness);
    }catch(cause){setError(cause instanceof Error?cause.message:"Spotriq could not submit or verify the exact allowance plan.");}finally{setControlledBusy(false);}
  };
  const prepareControlledExecution = async () => {
    if(!executionBoundary)return;setControlledBusy(true);setError(undefined);try{const value=await controlledExecutionRepository.prepareExecution(executionBoundary.boundaryId);setControlledExecution(value);setBoundaryPreflight(await executionPlanRepository.preflight(executionBoundary.boundaryId));setFinancialReadiness(await executionPlanRepository.financialReadiness(executionBoundary.boundaryId));}catch(cause){setError(cause instanceof Error?cause.message:"Spotriq could not prepare the one-shot controlled execution.");}finally{setControlledBusy(false);}
  };
  const submitControlledExecution = async () => {
    if(!controlledExecution||!financialSession)return;setControlledBusy(true);setError(undefined);try{
      const proof=await altanaHandlers.executeControlledBoundaryPlan({expectedWalletAddress:controlledExecution.walletAddress,sessionPublicKey:financialSession.sessionPublicKey,calls:controlledExecution.calls.map((call)=>({to:call.to,data:call.data,valueRaw:call.valueRaw}))});
      const result=await controlledExecutionRepository.observeExecution(controlledExecution.executionId,proof);setControlledExecution(result.execution);if(result.intent)setIntent(result.intent);setExecutionBoundary(await executionPlanRepository.getBoundary(controlledExecution.boundaryId));
    }catch(cause){setError(cause instanceof Error?cause.message:"Spotriq could not submit or reconcile the controlled BSC Testnet execution.");}finally{setControlledBusy(false);}
  };
  const reconcileControlledExecution = async () => {
    if(!controlledExecution)return;setControlledBusy(true);setError(undefined);try{const result=await controlledExecutionRepository.reconcileExecution(controlledExecution.executionId);setControlledExecution(result.execution);if(result.intent)setIntent(result.intent);setExecutionBoundary(await executionPlanRepository.getBoundary(controlledExecution.boundaryId));}catch(cause){setError(cause instanceof Error?cause.message:"Spotriq could not reconcile the controlled execution receipt.");}finally{setControlledBusy(false);}
  };

  const reverifyBoundedGrant = async () => {
    if (!permissionGrant) return;
    setReverifyingGrant(true);
    setError(undefined);
    try {
      const result = await authorityRepository.reverify(permissionGrant.permissionGrantId);
      setPermissionGrant(result.grant);
      if (result.intent) setIntent(result.intent);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Spotriq could not re-verify this Altana grant onchain.");
    } finally {
      setReverifyingGrant(false);
    }
  };

  if (loading) return <div className="max-w-3xl mx-auto px-6 py-12"><div className="h-72 rounded-xl border border-white/6 bg-white/[0.02] animate-pulse" /></div>;
  if (!intent || error && !intent) return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-4">
      <h1 className="text-xl font-semibold text-[#dde3ef]">Job intent unavailable</h1>
      <div className="p-4 rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/5 text-sm text-[#d6a04a]">{error ?? "Spotriq could not load this job intent."}</div>
      <Btn variant="secondary" onClick={() => navigate("check", { checkPhase: "results" })}><ArrowLeft className="w-4 h-4" /> Back to findings</Btn>
    </div>
  );

  const isConfirmed = intent.state === "AWAITING_AUTHORITY";
  const subject = intent.subject;
  const evidenceCount = intent.evidenceReferences.findingEvidenceIds.length + intent.evidenceReferences.serviceEvidenceIds.length + intent.evidenceReferences.readinessEvidenceIds.length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <button onClick={() => navigate("explore", { exploreCategory: "rebalancing", fromFinding: intent.findingId })} className="flex items-center gap-2 text-sm text-[#6b7d99] hover:text-[#9aacc4]">
        <ArrowLeft className="w-4 h-4" /> Back to matched services
      </button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="teal">Live Rebalancing handoff</Badge>
            <Badge variant="muted">PREPARE ONLY</Badge>
            <Badge variant={isConfirmed ? "amber" : "teal"}>{isConfirmed ? "Awaiting authority" : "Reviewable"}</Badge>
          </div>
          <h1 className="text-2xl font-semibold text-[#dde3ef]">Review the job before authority</h1>
          <p className="text-sm text-[#6b7d99] mt-1 max-w-2xl">This is a structured job intent for the exact PancakeSwap LP position found by Spotriq. It is not a permission request, transaction, or activation.</p>
        </div>
        <div className="text-right text-[11px] font-mono text-[#52637b]">
          <div>{intent.methodVersion}</div>
          <div className="mt-1">Execution: {intent.executionState}</div>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/5 text-xs text-[#d6a04a]">{error}</div>}

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-white/7 pb-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-wide text-[#6b7d99]">Requested action</div>
            <div className="font-semibold text-[#dde3ef] mt-1">{intent.requestedAction.label}</div>
            <p className="text-xs text-[#8090a8] mt-1 max-w-2xl">{intent.requestedAction.description}</p>
          </div>
          <Target className="w-5 h-5 text-[#2dd4bf] shrink-0" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div><div className="text-xs text-[#6b7d99]">LP pair</div><div className="text-[#dde3ef] font-medium">{subject.pair}</div></div>
          <div><div className="text-xs text-[#6b7d99]">Position NFT</div><div className="text-[#dde3ef] font-mono">#{subject.tokenId}</div></div>
          <div><div className="text-xs text-[#6b7d99]">Protocol</div><div className="text-[#dde3ef]">{subject.protocol} {subject.version === "INFINITY_CL" ? "Infinity CL" : subject.version}</div></div>
          <div><div className="text-xs text-[#6b7d99]">Network</div><div className="text-[#dde3ef]">BSC {subject.network}</div></div>
          <div><div className="text-xs text-[#6b7d99]">Observed range</div><div className="text-[#dde3ef] font-mono">{subject.tickLower} → {subject.tickUpper}</div></div>
          <div><div className="text-xs text-[#6b7d99]">Current tick</div><div className="text-[#dde3ef] font-mono">{subject.currentTick} · {subject.rangeState.replaceAll("_", " ")}</div></div>
          <div className="sm:col-span-2"><div className="text-xs text-[#6b7d99]">Pool</div><div className="text-[#9aacc4] font-mono text-xs break-all">{subject.poolAddress ?? subject.poolId ?? "Pool identifier unavailable"}</div></div>
          <div><div className="text-xs text-[#6b7d99]">Observed block</div><div className="text-[#dde3ef] font-mono">{subject.blockNumber}</div></div>
          <div><div className="text-xs text-[#6b7d99]">Evidence refs</div><div className="text-[#dde3ef]">{evidenceCount} captured</div></div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-mono uppercase tracking-wide text-[#6b7d99]">Selected live service</div>
            <div className="font-semibold text-[#dde3ef] mt-1">{intent.selectedService.name}</div>
            <div className="text-xs text-[#6b7d99] mt-1">Rank #{intent.selectedService.matchRank} · {intent.selectedService.matchTier.replaceAll("_", " ")} · Readiness {intent.selectedService.readiness}</div>
          </div>
          <Badge variant={intent.selectedService.activationEligible ? "green" : "amber"}>{intent.selectedService.activationEligible ? "Activation eligible" : "Activation gated"}</Badge>
        </div>
        <div className="text-xs text-[#8090a8]">Service <span className="font-mono text-[#9aacc4]">{intent.selectedService.serviceId}</span></div>
      </Card>

      <Card className="p-6 space-y-4 border-[#60a5fa]/15">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-mono uppercase tracking-wide text-[#6b7d99]">Real AgentService task origin · v0.21</div>
            <h2 className="font-semibold text-[#dde3ef] mt-1">Invoke the selected service before confirming the job</h2>
            <p className="text-xs text-[#6b7d99] mt-1 max-w-2xl">Spotriq sends the exact server-derived LP/job context through the service's tested A2A interface. A completed structured proposal must be attributable to this service before the Job Intent can advance. Invocation is not payment, hiring, wallet authority or activation.</p>
          </div>
          <Badge variant={serviceTask?.originProof.state === "VERIFIED" && serviceTask?.proposalState === "STRUCTURED" && serviceTask?.state === "COMPLETED" ? "green" : serviceTask ? "amber" : "muted"}>{serviceTask ? serviceTask.state.replaceAll("_", " ") : "Not invoked"}</Badge>
        </div>
        {!serviceTask ? (
          <Btn variant="teal-outline" onClick={() => void invokeServiceTask()} disabled={serviceTaskBusy || isConfirmed}>{serviceTaskBusy ? <><RefreshCw className="w-4 h-4 animate-spin" /> Invoking</> : <><Play className="w-4 h-4" /> Invoke selected service</>}</Btn>
        ) : (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div><span className="text-[#6b7d99]">Origin proof</span><div className={serviceTask.originProof.state === "VERIFIED" ? "text-[#4ade80] mt-0.5" : "text-[#f59e0b] mt-0.5"}>{serviceTask.originProof.state.replaceAll("_", " ")}</div></div>
              <div><span className="text-[#6b7d99]">Proposal</span><div className={serviceTask.proposalState === "STRUCTURED" ? "text-[#4ade80] mt-0.5" : "text-[#f59e0b] mt-0.5"}>{serviceTask.proposalState.replaceAll("_", " ")}</div></div>
              <div><span className="text-[#6b7d99]">Protocol</span><div className="text-[#dde3ef] mt-0.5">{serviceTask.protocolBinding ?? "A2A"} {serviceTask.protocolVersion ?? ""}</div></div>
              <div><span className="text-[#6b7d99]">Commercial state</span><div className="text-[#dde3ef] mt-0.5">{serviceTask.commercialState.replaceAll("_", " ")}</div></div>
              <div className="sm:col-span-2"><span className="text-[#6b7d99]">Request-context hash</span><div className="font-mono text-[#9aacc4] break-all mt-0.5">{serviceTask.requestContextHash}</div></div>
              {(serviceTask.remoteTaskId || serviceTask.remoteMessageId) && <div className="sm:col-span-2"><span className="text-[#6b7d99]">Remote reference</span><div className="font-mono text-[#9aacc4] break-all mt-0.5">{serviceTask.remoteTaskId ?? serviceTask.remoteMessageId}</div></div>}
            </div>
            {serviceTask.proposal && <div className="rounded-lg border border-[#2dd4bf]/15 bg-[#2dd4bf]/[0.025] p-3 text-xs"><div className="font-medium text-[#dde3ef]">AgentService proposal</div><div className="text-[#8090a8] mt-1">Replacement ticks <span className="font-mono text-[#9aacc4]">{serviceTask.proposal.targetTickLower} → {serviceTask.proposal.targetTickUpper}</span></div>{serviceTask.proposal.summary && <p className="text-[#6b7d99] mt-1">{serviceTask.proposal.summary}</p>}<p className="text-[10px] text-[#52637b] mt-2">These values prefill the execution-plan review only. You may change them; Spotriq will record any changed range as a user override rather than agent-originated.</p></div>}
            <div className="flex flex-wrap gap-2">
              {(serviceTask.state === "SUBMITTED" || serviceTask.state === "WORKING" || serviceTask.state === "INPUT_REQUIRED") && <Btn variant="secondary" onClick={() => void refreshServiceTask()} disabled={serviceTaskBusy}><RefreshCw className={cn("w-4 h-4", serviceTaskBusy && "animate-spin")} /> Refresh task</Btn>}
              {(["FAILED","TIMED_OUT","REJECTED","CANCELLED","UNSUPPORTED","AUTH_REQUIRED","READINESS_BLOCKED","ORIGIN_PROOF_FAILED"] as string[]).includes(serviceTask.state) && !isConfirmed && <Btn variant="secondary" onClick={() => void retryServiceTask()} disabled={serviceTaskBusy}><RotateCcw className="w-4 h-4" /> Retry invocation</Btn>}
            </div>
            {serviceTask.originProof.detail && <p className="text-[10px] text-[#6b7d99]">{serviceTask.originProof.detail}</p>}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-[#dde3ef]">Proposed job limits</h2>
          <p className="text-xs text-[#6b7d99] mt-1">These are review bounds for the future job. They do not grant wallet authority.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-xs text-[#6b7d99]">Max slippage (basis points)</span>
            <input type="number" min={1} max={500} disabled={isConfirmed} value={maxSlippageBps} onChange={(event) => setMaxSlippageBps(event.target.value)} className="w-full bg-[#1c2433] border border-white/8 rounded-lg px-3 py-2 text-sm text-[#dde3ef] focus:outline-none focus:border-[#2dd4bf]/40" />
            <span className="text-[10px] text-[#52637b]">1–500 bps · proposed bound only</span>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-[#6b7d99]">Intent validity (minutes)</span>
            <input type="number" min={5} max={1440} disabled={isConfirmed} value={validForMinutes} onChange={(event) => setValidForMinutes(event.target.value)} className="w-full bg-[#1c2433] border border-white/8 rounded-lg px-3 py-2 text-sm text-[#dde3ef] focus:outline-none focus:border-[#2dd4bf]/40" />
            <span className="text-[10px] text-[#52637b]">5–1440 minutes · current context must be revalidated later</span>
          </label>
        </div>
        <label className={cn("flex items-start gap-3 rounded-lg border border-white/7 bg-white/[0.02] p-3", isConfirmed && "opacity-70")}>
          <input type="checkbox" disabled={isConfirmed} checked={allowSwapPreparation} onChange={(event) => setAllowSwapPreparation(event.target.checked)} className="mt-0.5 accent-[#2dd4bf]" />
          <span><span className="text-sm text-[#dde3ef]">Allow the future agent to prepare swap steps if a rebalance requires them</span><span className="block text-[11px] text-[#6b7d99] mt-0.5">Preparation only. No swap permission or execution is granted here.</span></span>
        </label>
        {!isConfirmed && <Btn variant="teal-outline" onClick={() => void saveConstraints()} disabled={saving}>{saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving</> : <><Sliders className="w-4 h-4" /> Save proposed limits</>}</Btn>}
      </Card>

      <Card className="p-6 space-y-4 border-[#f59e0b]/20 bg-[#f59e0b]/[0.025]">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-[#f59e0b] shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-[#dde3ef]">{intent.authority.state === "GRANT_VERIFIED" ? "Bounded authority observed" : intent.authority.state === "REQUEST_PREPARED" ? "Bounded authority request prepared" : "Authority is still unresolved"}</h2>
            <p className="text-xs text-[#6b7d99] mt-1">PermissionRequest and PermissionGrant are separate resources. Direct AgentService grants remain non-executable; v0.18 financial authority is boundary-controlled and testnet-only.</p>
          </div>
        </div>
        <div className="space-y-2">
          {intent.authority.blockers.map((blocker) => <div key={blocker} className="flex gap-2 text-xs text-[#9aacc4]"><AlertCircle className="w-3.5 h-3.5 text-[#f59e0b] shrink-0 mt-0.5" />{blocker}</div>)}
        </div>
        <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-white/7 text-xs">
          <div><span className="text-[#6b7d99]">Wallet control</span><div className="text-[#dde3ef] mt-0.5">{intent.walletControl.replaceAll("_", " ")}</div></div>
          <div><span className="text-[#6b7d99]">Permission declaration</span><div className="text-[#dde3ef] mt-0.5">{intent.authority.declarationState}</div></div>
        </div>
      </Card>

      {isConfirmed && (
        <Card className="p-6 space-y-5 border-[#2dd4bf]/15">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-mono uppercase tracking-wide text-[#6b7d99]">Bounded authority · Altana</div>
              <h2 className="font-semibold text-[#dde3ef] mt-1">Define the maximum authority for this job</h2>
              <p className="text-xs text-[#6b7d99] mt-1 max-w-2xl">Spotriq derives the contract/function allowlist from the observed PancakeSwap V3 position. You choose the per-token daily caps and expiry. Preparing this scope does not sign or grant it.</p>
            </div>
            <ShieldCheck className="w-5 h-5 text-[#2dd4bf] shrink-0" />
          </div>

          {subject.version !== "V3" ? (
            <div className="rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-4 text-xs text-[#d6a04a]">Infinity CL authority remains intentionally blocked until its exact safe call surface is modeled. Spotriq will not copy V3 permissions onto a different protocol interface.</div>
          ) : !subject.positionManager || !subject.token0 || !subject.token1 || subject.token0.decimals === undefined || subject.token1.decimals === undefined ? (
            <div className="rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-4 text-xs text-[#d6a04a]">This Finding does not contain the exact position-manager/token metadata required to calculate enforceable authority. Run a fresh Smart Money Check with the current data model rather than guessing addresses or decimals.</div>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-4">
                <label className="space-y-1.5">
                  <span className="text-xs text-[#6b7d99]">{subject.token0.symbol ?? "Token 0"} daily cap</span>
                  <input value={token0Limit} onChange={(event) => setToken0Limit(event.target.value)} placeholder="Enter amount" disabled={permissionRequest?.status === "CONFIRMED"} className="w-full bg-[#1c2433] border border-white/8 rounded-lg px-3 py-2 text-sm text-[#dde3ef] focus:outline-none focus:border-[#2dd4bf]/40" />
                  <span className="block text-[10px] text-[#52637b] break-all">{subject.token0.address}</span>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-[#6b7d99]">{subject.token1.symbol ?? "Token 1"} daily cap</span>
                  <input value={token1Limit} onChange={(event) => setToken1Limit(event.target.value)} placeholder="Enter amount" disabled={permissionRequest?.status === "CONFIRMED"} className="w-full bg-[#1c2433] border border-white/8 rounded-lg px-3 py-2 text-sm text-[#dde3ef] focus:outline-none focus:border-[#2dd4bf]/40" />
                  <span className="block text-[10px] text-[#52637b] break-all">{subject.token1.address}</span>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-[#6b7d99]">Authority expiry (minutes)</span>
                  <input type="number" min={5} max={1440} value={authorityValidForMinutes} onChange={(event) => setAuthorityValidForMinutes(event.target.value)} disabled={permissionRequest?.status === "CONFIRMED"} className="w-full bg-[#1c2433] border border-white/8 rounded-lg px-3 py-2 text-sm text-[#dde3ef] focus:outline-none focus:border-[#2dd4bf]/40" />
                  <span className="block text-[10px] text-[#52637b]">5–1440 minutes</span>
                </label>
              </div>
              {permissionRequest?.status !== "CONFIRMED" && (
                <Btn variant="teal-outline" onClick={() => void prepareBoundedAuthority()} disabled={authoritySaving || !token0Limit.trim() || !token1Limit.trim()}>
                  {authoritySaving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Preparing scope</> : <><Shield className="w-4 h-4" /> {permissionRequest ? "Update bounded authority" : "Prepare bounded authority"}</>}
                </Btn>
              )}
            </>
          )}

          {permissionRequest && (
            <div className="space-y-4 pt-4 border-t border-white/7">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div><div className="text-xs text-[#6b7d99]">Permission request</div><div className="text-xs font-mono text-[#9aacc4] break-all">{permissionRequest.permissionRequestId}</div></div>
                <div className="flex gap-2"><Badge variant="teal">{permissionRequest.provider}</Badge><Badge variant="muted">{permissionRequest.status}</Badge></div>
              </div>
              <div>
                <div className="text-xs font-medium text-[#dde3ef] mb-2">Allowed contract functions</div>
                <div className="space-y-2">{permissionRequest.callAllowlist.map((call) => <div key={`${call.to}:${call.signature}`} className="rounded-lg border border-white/7 bg-white/[0.02] p-3"><div className="text-xs text-[#dde3ef]">{call.label}</div><div className="text-[10px] font-mono text-[#6b7d99] mt-1 break-all">{call.to} · {call.signature}</div></div>)}</div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">{permissionRequest.spendCaps.map((cap) => <div key={cap.token} className="rounded-lg border border-white/7 bg-white/[0.02] p-3"><div className="text-xs text-[#6b7d99]">Daily spend cap · {cap.symbol ?? "token"}</div><div className="text-sm text-[#dde3ef] mt-1">{cap.limitDisplay}</div><div className="text-[10px] font-mono text-[#52637b] mt-1 break-all">{cap.token} · raw {cap.limitRaw}</div></div>)}</div>
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div><span className="text-[#6b7d99]">Expires</span><div className="text-[#dde3ef] mt-0.5">{new Date(permissionRequest.expiresAt).toLocaleString()}</div></div>
                <div><span className="text-[#6b7d99]">Position manager</span><div className="text-[#9aacc4] font-mono mt-0.5 break-all">{permissionRequest.positionManager}</div></div>
              </div>
              <div className="rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-4">
                <div className="text-xs font-medium text-[#d6a04a]">Grant submission is deliberately blocked</div>
                <div className="grid sm:grid-cols-2 gap-2 mt-3">{permissionRequest.safetyPrerequisites.map((prerequisite) => <div key={prerequisite.code} className="rounded-lg border border-[#f59e0b]/15 bg-black/10 p-3"><div className="flex items-center justify-between gap-2"><div className="text-[11px] font-medium text-[#d6a04a]">{prerequisite.label}</div><Badge variant={prerequisite.state === "SATISFIED" ? "green" : "amber"}>{prerequisite.state}</Badge></div><div className="text-[10px] text-[#9c8663] mt-1.5 leading-relaxed">{prerequisite.detail}</div></div>)}</div>
                <div className="space-y-1.5 mt-3">{permissionRequest.submissionBlockers.filter((blocker) => !permissionRequest.safetyPrerequisites.some((prerequisite) => prerequisite.detail === blocker)).map((blocker) => <div key={blocker} className="flex gap-2 text-[11px] text-[#b99a67]"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{blocker}</div>)}</div>
                <p className="text-[10px] text-[#7f725f] mt-3">These prerequisites are independent. A trusted service-owned session key and a proposal-level calldata guard are both useful evidence, but direct financial authority remains blocked until Spotriq has a non-bypassable execution boundary that the service key cannot route around.</p>
              </div>
              <div className="text-[10px] text-[#52637b] leading-relaxed">No token approve, Permit2 approval, router swap, withdrawal, transfer, arbitrary target, or multicall permission is included. {intent.constraints.allowSwapPreparation ? "Swap preparation remains planning only." : "No swap preparation was requested."}</div>

              <div className="rounded-lg border border-white/7 bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="text-xs font-medium text-[#dde3ef]">Trusted service-owned session key</div><p className="text-[10px] text-[#6b7d99] mt-1">Spotriq fetches the selected service's A2A Agent Card, issues a fresh same-origin challenge, and accepts the key only if the runtime proves control with the exact declared secp256k1 key. Browser-entered keys are never accepted.</p></div>
                  <Badge variant={permissionRequest.trustedAgentBinding?.state === "VERIFIED" ? "green" : "muted"}>{permissionRequest.trustedAgentBinding?.state ?? "NOT CHECKED"}</Badge>
                </div>
                {permissionRequest.trustedAgentBinding?.sessionKeyAddress && <div className="text-[10px] font-mono text-[#9aacc4] break-all">{permissionRequest.trustedAgentBinding.sessionKeyAddress}</div>}
                <Btn variant="secondary" onClick={() => void verifyTrustedServiceKey()} disabled={bindingVerifying}>{bindingVerifying ? <><RefreshCw className="w-4 h-4 animate-spin" /> Verifying service key</> : <><ShieldCheck className="w-4 h-4" /> Verify service-owned key</>}</Btn>
              </div>

              <div className="rounded-lg border border-white/7 bg-white/[0.02] p-4 space-y-3">
                <div><div className="text-xs font-medium text-[#dde3ef]">Argument-level calldata guard</div><p className="text-[10px] text-[#6b7d99] mt-1">Developer/review surface: paste one proposed V3 Position Manager call. Spotriq decodes it and compares the target, NFT, recipient, caps, slippage and deadline to this reviewed Job Intent. No transaction is submitted.</p></div>
                <label className="space-y-1.5 block"><span className="text-[10px] text-[#6b7d99]">Target contract</span><input value={guardTarget} onChange={(event) => setGuardTarget(event.target.value)} className="w-full bg-[#151d2a] border border-white/8 rounded-lg px-3 py-2 text-[11px] font-mono text-[#dde3ef] focus:outline-none focus:border-[#2dd4bf]/40" /></label>
                <label className="space-y-1.5 block"><span className="text-[10px] text-[#6b7d99]">Hex calldata</span><textarea rows={4} value={guardCalldata} onChange={(event) => setGuardCalldata(event.target.value)} placeholder="0x…" className="w-full bg-[#151d2a] border border-white/8 rounded-lg px-3 py-2 text-[11px] font-mono text-[#dde3ef] focus:outline-none focus:border-[#2dd4bf]/40 resize-y" /></label>
                <Btn variant="secondary" onClick={() => void runExecutionGuard()} disabled={guarding || !guardCalldata.trim()}>{guarding ? <><RefreshCw className="w-4 h-4 animate-spin" /> Checking calldata</> : <><Shield className="w-4 h-4" /> Run calldata guard</>}</Btn>
                {permissionRequest.latestExecutionGuard && <div className="rounded-lg border border-white/7 bg-black/10 p-3 space-y-2"><div className="flex items-center justify-between"><span className="text-[11px] text-[#9aacc4]">Latest proposal</span><Badge variant={permissionRequest.latestExecutionGuard.state === "PASS" ? "green" : permissionRequest.latestExecutionGuard.state === "BLOCKED" ? "red" : "amber"}>{permissionRequest.latestExecutionGuard.state}</Badge></div>{permissionRequest.latestExecutionGuard.checks.map((check) => <div key={check.code} className="flex items-start justify-between gap-3 text-[10px]"><span className="text-[#8090a8]">{check.label}<span className="block text-[#52637b] mt-0.5">{check.detail}</span></span><span className={check.state === "PASS" ? "text-[#4ade80]" : check.state === "FAIL" ? "text-[#f87171]" : "text-[#f59e0b]"}>{check.state}</span></div>)}<p className="text-[10px] text-[#7f725f]">Proposal guard evidence is not a non-bypassable financial execution boundary. Execution remains disabled.</p></div>}
              </div>
            </div>
          )}

          {permissionRequest && subject.version === "V3" && (
            <div className="space-y-4 pt-4 border-t border-white/7">
              <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-medium text-[#dde3ef]">Reviewed Rebalancing execution plan</div><p className="text-[10px] text-[#6b7d99] mt-1 max-w-2xl">v0.17 refreshes the exact LP position, simulates <span className="font-mono">decreaseLiquidity</span> with read-only <span className="font-mono">eth_call</span>, builds exact decrease → collect → mint calldata, and requires explicit replacement-range review. Nothing is signed or submitted.</p></div><Badge variant="purple">v0.17</Badge></div>
              <div className="grid sm:grid-cols-2 gap-3"><label className="space-y-1.5"><span className="text-[10px] text-[#6b7d99]">Replacement lower tick</span><input value={targetTickLower} onChange={(event)=>setTargetTickLower(event.target.value)} placeholder={String(subject.currentTick - (subject.tickSpacing ?? 1) * 10)} className="w-full bg-[#151d2a] border border-white/8 rounded-lg px-3 py-2 text-xs font-mono text-[#dde3ef] focus:outline-none focus:border-[#2dd4bf]/40" /></label><label className="space-y-1.5"><span className="text-[10px] text-[#6b7d99]">Replacement upper tick</span><input value={targetTickUpper} onChange={(event)=>setTargetTickUpper(event.target.value)} placeholder={String(subject.currentTick + (subject.tickSpacing ?? 1) * 10)} className="w-full bg-[#151d2a] border border-white/8 rounded-lg px-3 py-2 text-xs font-mono text-[#dde3ef] focus:outline-none focus:border-[#2dd4bf]/40" /></label></div>
              <div className="flex flex-wrap gap-2"><Btn variant="secondary" onClick={()=>void prepareExecutionPlan()} disabled={executionPlanBusy||!targetTickLower||!targetTickUpper}>{executionPlanBusy?<><RefreshCw className="w-4 h-4 animate-spin"/>Refreshing plan</>:<><FileText className="w-4 h-4"/>Prepare exact plan</>}</Btn>{executionPlan?.state==="REVIEWABLE"&&<Btn variant="teal-outline" onClick={()=>void reviewExecutionPlan()} disabled={executionPlanBusy}><CheckCircle2 className="w-4 h-4"/>Review range + refresh quote</Btn>}{executionPlan?.state==="REVIEWED"&&executionPlan.guardState==="PASS"&&!executionBoundary&&<Btn variant="teal-outline" onClick={()=>void sealExecutionBoundary()} disabled={executionPlanBusy}><Lock className="w-4 h-4"/>Seal execution boundary</Btn>}{executionBoundary&&<Btn variant="secondary" onClick={()=>void runBoundaryPreflight()} disabled={executionPlanBusy}><RefreshCw className="w-4 h-4"/>Fresh preflight</Btn>}</div>
              {executionPlan&&<div className="rounded-lg border border-white/7 bg-black/10 p-4 space-y-3"><div className="flex items-center justify-between"><div><div className="text-[11px] text-[#9aacc4]">{executionPlan.targetRange.state==="USER_REVIEWED"?"User-reviewed plan":"Reviewable draft"}</div><div className="text-[10px] font-mono text-[#52637b] mt-0.5 break-all">{executionPlan.planId}</div></div><div className="flex gap-2"><Badge variant={executionPlan.guardState==="PASS"?"green":executionPlan.guardState==="BLOCKED"?"red":"amber"}>{executionPlan.guardState}</Badge><Badge variant="muted">{executionPlan.state}</Badge></div></div><div className="grid sm:grid-cols-3 gap-3 text-[10px]"><div><span className="text-[#6b7d99]">Target range</span><div className="font-mono text-[#dde3ef] mt-0.5">[{executionPlan.targetRange.tickLower}, {executionPlan.targetRange.tickUpper})</div></div><div><span className="text-[#6b7d99]">Quote block</span><div className="font-mono text-[#dde3ef] mt-0.5">{executionPlan.quote.blockNumber}</div></div><div><span className="text-[#6b7d99]">Plan hash</span><div className="font-mono text-[#9aacc4] truncate mt-0.5" title={executionPlan.planHash}>{executionPlan.planHash}</div></div></div><div className="space-y-2">{executionPlan.steps.map((step)=><div key={step.index} className="rounded-md border border-white/6 p-3 flex items-start justify-between gap-3"><div><div className="text-[11px] text-[#dde3ef]">{step.index+1}. {step.label}</div><div className="text-[10px] text-[#52637b] font-mono mt-1 break-all">{step.callHash}</div></div><Badge variant={step.guard.state==="PASS"?"green":step.guard.state==="BLOCKED"?"red":"amber"}>{step.guard.state}</Badge></div>)}</div><p className="text-[10px] text-[#7f725f]">Independent expected decrease outputs: {executionPlan.quote.expectedDecreaseAmount0Raw} / {executionPlan.quote.expectedDecreaseAmount1Raw} raw units. Quote expiry: {new Date(executionPlan.quote.expiresAt).toLocaleTimeString()}.</p></div>}
              {executionBoundary&&<div className="rounded-lg border border-[#2dd4bf]/15 bg-[#2dd4bf]/[0.025] p-4 space-y-2"><div className="flex items-center justify-between"><div><div className="text-[11px] font-medium text-[#dde3ef]">Non-bypassable execution boundary sealed</div><div className="text-[10px] text-[#6b7d99] mt-1">External agent role: authenticated proposer only. {executionBoundary.signerProvisioned ? "Financial signer: boundary-controlled Altana Testnet session provisioned; transaction submission disabled." : "Future financial signer: boundary-controlled and not provisioned."}</div></div><Badge variant="green">SEALED</Badge></div><div className="text-[10px] font-mono text-[#52637b] break-all">{executionBoundary.boundaryId}</div>{boundaryPreflight&&<div className="pt-2 border-t border-white/6"><div className="flex items-center justify-between"><span className="text-[10px] text-[#9aacc4]">Latest preflight</span><Badge variant={boundaryPreflight.state==="PASS_AUTHORITY_REQUIRED"?"green":"amber"}>{boundaryPreflight.state.replaceAll("_"," ")}</Badge></div>{boundaryPreflight.checks.map((check)=><div key={check.code} className="flex items-start justify-between gap-3 mt-2 text-[10px]"><span className="text-[#8090a8]">{check.label}<span className="block text-[#52637b]">{check.detail}</span></span><span className={check.state==="PASS"?"text-[#4ade80]":check.state==="FAIL"?"text-[#f87171]":"text-[#f59e0b]"}>{check.state}</span></div>)}</div>}<p className="text-[10px] text-[#7f725f]">The external AgentService remains proposer-only. v0.18 can attach an independently verified Altana BSC Testnet financial session to this exact sealed boundary; transaction submission remains disabled.</p></div>}
            </div>
          )}

          {subject.network === "testnet" && executionBoundary && permissionRequest && (
            <div className="space-y-4 pt-4 border-t border-white/7">
              <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-medium text-[#dde3ef]">Boundary-controlled Altana financial session</div><p className="text-[10px] text-[#6b7d99] mt-1 max-w-2xl">Real BSC Testnet authority for the sealed execution boundary. The session uses the reviewed call allowlist, token spend caps and expiry exactly; its signer is distinct from the external AgentService proposal key. v0.19 can dispatch only the exact sealed plan after fresh preflight and financial readiness.</p></div><Badge variant="amber">FINANCIAL · TESTNET</Badge></div>
              {(!altanaWalletAddress || altanaWalletAddress.toLowerCase() !== intent.walletAddress.toLowerCase()) && <div className="rounded-lg border border-white/7 bg-white/[0.02] p-3 space-y-2"><p className="text-[10px] text-[#7f8ea5]">Load the Altana passkey wallet that exactly matches this Job Intent wallet before granting boundary-controlled financial authority.</p><div className="flex flex-wrap gap-2"><Btn variant="secondary" onClick={() => void createAltanaTestnetWallet()} disabled={altanaWalletBusy}>{altanaWalletBusy ? <><RefreshCw className="w-4 h-4 animate-spin" /> Altana wallet</> : <><Wallet className="w-4 h-4" /> Create matching passkey wallet</>}</Btn><Btn variant="ghost" onClick={() => void recoverAltanaTestnetWallet()} disabled={altanaWalletBusy}>Recover passkey wallet</Btn></div>{altanaWalletAddress && <div className="text-[10px] text-[#f59e0b]">Loaded wallet <span className="font-mono break-all">{altanaWalletAddress}</span> does not match <span className="font-mono break-all">{intent.walletAddress}</span>.</div>}</div>}
              {altanaWalletAddress && altanaWalletAddress.toLowerCase() === intent.walletAddress.toLowerCase() && <div className="rounded-lg border border-[#2dd4bf]/15 bg-[#2dd4bf]/[0.025] p-3 text-[10px]"><div className="text-[#4ade80]">Matching Altana BSC Testnet wallet loaded</div><div className="font-mono text-[#9aacc4] break-all mt-1">{altanaWalletAddress}</div></div>}
              {!financialSession && <Btn variant="teal-outline" onClick={() => void grantBoundaryFinancialSession()} disabled={financialSessionBusy || !altanaWalletAddress || altanaWalletAddress.toLowerCase() !== intent.walletAddress.toLowerCase()}>{financialSessionBusy ? <><RefreshCw className="w-4 h-4 animate-spin" /> Granting authority</> : <><ShieldCheck className="w-4 h-4" /> Grant boundary financial session</>}</Btn>}
              {financialSession && <div className="rounded-lg border border-[#f59e0b]/15 bg-[#f59e0b]/[0.025] p-4 space-y-3"><div className="flex items-center justify-between gap-3"><div><div className="text-[11px] text-[#9aacc4]">Altana financial session</div><div className="text-[10px] font-mono text-[#52637b] break-all mt-1">{financialSession.financialSessionId}</div></div><div className="flex gap-2"><Badge variant={financialSession.state === "ACTIVE" ? "green" : "amber"}>{financialSession.state}</Badge><Badge variant={financialSession.exactBoundaryScope ? "green" : "red"}>{financialSession.exactBoundaryScope ? "EXACT SCOPE" : "SCOPE MISMATCH"}</Badge></div></div><div className="grid sm:grid-cols-2 gap-3 text-[10px]"><div><span className="text-[#6b7d99]">Keystore</span><div className={financialSession.onchainValid ? "text-[#4ade80] mt-0.5" : "text-[#f87171] mt-0.5"}>{financialSession.onchainValid ? "Valid now" : "Not valid"}</div></div><div><span className="text-[#6b7d99]">Signer separation</span><div className={financialSession.distinctFromAgentProposalKey ? "text-[#4ade80] mt-0.5" : "text-[#f87171] mt-0.5"}>{financialSession.distinctFromAgentProposalKey ? "Boundary key ≠ agent proposal key" : "Not proven"}</div></div><div className="sm:col-span-2"><span className="text-[#6b7d99]">Session public key</span><div className="font-mono text-[#9aacc4] break-all mt-0.5">{financialSession.sessionPublicKey}</div></div>{financialSession.transactionHash&&<div className="sm:col-span-2"><span className="text-[#6b7d99]">Grant transaction</span><div className="font-mono text-[#9aacc4] break-all mt-0.5">{financialSession.transactionHash}</div></div>}</div><div className="flex flex-wrap gap-2"><Btn variant="secondary" onClick={() => void reverifyBoundaryFinancialSession()} disabled={financialSessionBusy}><RefreshCw className={cn("w-4 h-4",financialSessionBusy&&"animate-spin")}/> Re-check session</Btn>{financialSession.state === "ACTIVE"&&<Btn variant="danger" onClick={() => void revokeBoundaryFinancialSession()} disabled={financialSessionBusy}>Revoke financial session</Btn>}<Btn variant="secondary" onClick={() => void checkFinancialReadiness()} disabled={financialSessionBusy || financialSession.state !== "ACTIVE"}>Check balances & allowances</Btn></div></div>}
              {financialReadiness && <div className="rounded-lg border border-white/7 bg-black/10 p-4 space-y-3">
                <div className="flex items-center justify-between"><div className="text-[11px] text-[#9aacc4]">Financial readiness</div><Badge variant={financialReadiness.state === "READY_FOR_CONTROLLED_EXECUTION_MILESTONE" ? "green" : "amber"}>{financialReadiness.state.replaceAll("_"," ")}</Badge></div>
                {financialReadiness.assets.map((asset)=><div key={asset.token} className="grid sm:grid-cols-3 gap-2 text-[10px] border-t border-white/5 pt-2"><div><span className="text-[#6b7d99]">{asset.symbol ?? "Token"} balance</span><div className="text-[#9aacc4] font-mono">{asset.currentBalanceRaw}</div><div className="text-[#52637b]">Projected + collect: {asset.projectedBalanceRaw}</div></div><div><span className="text-[#6b7d99]">Mint required</span><div className="text-[#9aacc4] font-mono">{asset.requiredForMintRaw}</div><div className={asset.balanceState === "INSUFFICIENT" ? "text-[#f87171]" : "text-[#4ade80]"}>{asset.balanceState.replaceAll("_"," ")}</div></div><div><span className="text-[#6b7d99]">Position Manager allowance</span><div className="text-[#9aacc4] font-mono">{asset.allowanceToPositionManagerRaw}</div><div className={asset.allowanceState === "SUFFICIENT" ? "text-[#4ade80]" : "text-[#f59e0b]"}>{asset.allowanceState.replaceAll("_"," ")}</div></div></div>)}
                <p className="text-[10px] text-[#52637b]">v0.19 never grants unlimited allowance. If approval is required, Spotriq prepares an exact, reviewable ERC-20 approval plan for the reviewed mint and submits it only through the user-controlled wallet-admin/passkey path.</p>
                {financialReadiness.state === "APPROVAL_REQUIRED" && !approvalPlan && <Btn variant="secondary" onClick={() => void prepareExactApprovals()} disabled={controlledBusy}><ShieldCheck className="w-4 h-4" /> Prepare exact approvals</Btn>}
              </div>}

              {approvalPlan && <div className="rounded-lg border border-[#60a5fa]/15 bg-[#60a5fa]/[0.025] p-4 space-y-3">
                <div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-medium text-[#dde3ef]">Exact wallet-admin approval plan</div><div className="text-[10px] font-mono text-[#52637b] break-all mt-1">{approvalPlan.approvalPlanId}</div></div><Badge variant={approvalPlan.state === "CONFIRMED" ? "green" : approvalPlan.state === "FAILED" ? "red" : "blue"}>{approvalPlan.state.replaceAll("_"," ")}</Badge></div>
                {approvalPlan.calls.length === 0 ? <p className="text-[10px] text-[#4ade80]">No token approval is required.</p> : <div className="space-y-2">{approvalPlan.calls.map((call)=><div key={`${call.token}:${call.index}`} className="grid sm:grid-cols-3 gap-2 rounded-md border border-white/6 p-3 text-[10px]"><div><span className="text-[#6b7d99]">Token</span><div className="font-mono text-[#9aacc4] break-all">{call.symbol ?? call.token}</div></div><div><span className="text-[#6b7d99]">Action</span><div className="text-[#dde3ef]">{call.phase === "RESET" ? "Reset allowance to 0" : "Set exact allowance"}</div></div><div><span className="text-[#6b7d99]">Amount raw</span><div className="font-mono text-[#9aacc4]">{call.approvalAmountRaw}</div></div></div>)}</div>}
                <div className="flex flex-wrap gap-2">{approvalPlan.state === "REVIEW_REQUIRED" && <Btn variant="teal-outline" onClick={() => void reviewExactApprovals()} disabled={controlledBusy}><CheckCircle2 className="w-4 h-4" /> Review exact amounts</Btn>}{approvalPlan.state === "REVIEWED" && <Btn variant="primary" onClick={() => void executeExactApprovals()} disabled={controlledBusy || !altanaWalletAddress || altanaWalletAddress.toLowerCase() !== intent.walletAddress.toLowerCase()}><Wallet className="w-4 h-4" /> Approve exact amounts on BSC Testnet</Btn>}</div>
                {approvalObservation && <div className="text-[10px] text-[#8090a8]">Provider: {approvalObservation.providerStatus}. Onchain allowances satisfied: <span className={approvalObservation.allowancesSatisfied ? "text-[#4ade80]" : "text-[#f59e0b]"}>{approvalObservation.allowancesSatisfied ? "yes" : "no"}</span>{approvalObservation.transactionHash ? <span className="block font-mono break-all text-[#52637b] mt-1">{approvalObservation.transactionHash}</span> : null}</div>}
                <p className="text-[10px] text-[#52637b]">The external AgentService and the bounded financial session never receive ERC-20 approve authority.</p>
              </div>}

              {financialReadiness?.state === "READY_FOR_CONTROLLED_EXECUTION_MILESTONE" && executionBoundary.state === "SEALED" && !controlledExecution && <Btn variant="teal-outline" onClick={() => void prepareControlledExecution()} disabled={controlledBusy}><Lock className="w-4 h-4" /> Prepare one-shot controlled execution</Btn>}

              {controlledExecution && <div className="rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/[0.025] p-4 space-y-3">
                <div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-medium text-[#dde3ef]">Controlled BSC Testnet execution</div><div className="text-[10px] font-mono text-[#52637b] break-all mt-1">{controlledExecution.executionId}</div></div><Badge variant={controlledExecution.state === "CONFIRMED" ? "green" : controlledExecution.state === "FAILED" ? "red" : controlledExecution.state === "READY_TO_DISPATCH" ? "amber" : "blue"}>{controlledExecution.state.replaceAll("_"," ")}</Badge></div>
                <div className="space-y-2">{controlledExecution.calls.map((call)=><div key={call.index} className="rounded-md border border-white/6 p-3 flex items-start justify-between gap-3"><div><div className="text-[11px] text-[#dde3ef]">{call.index+1}. {call.kind.replaceAll("_"," ")}</div><div className="text-[10px] font-mono text-[#52637b] break-all mt-1">{call.callHash}</div></div><Badge variant="green">SEALED</Badge></div>)}</div>
                {controlledExecution.state === "READY_TO_DISPATCH" && financialSession && <div className="space-y-2"><div className={altanaHandlers.hasBoundaryFinancialSessionSigner(financialSession.sessionPublicKey) ? "text-[10px] text-[#4ade80]" : "text-[10px] text-[#f59e0b]"}>{altanaHandlers.hasBoundaryFinancialSessionSigner(financialSession.sessionPublicKey) ? "Boundary session signer is present in this browser process." : "The ephemeral boundary signer is not present after reload. Spotriq will not reconstruct private key material; create a fresh financial session before execution."}</div><Btn variant="danger" onClick={() => void submitControlledExecution()} disabled={controlledBusy || !altanaHandlers.hasBoundaryFinancialSessionSigner(financialSession.sessionPublicKey)}><Play className="w-4 h-4" /> Execute exact reviewed plan on BSC Testnet</Btn></div>}
                {controlledExecution.state === "SUBMITTED" && <Btn variant="secondary" onClick={() => void reconcileControlledExecution()} disabled={controlledBusy}><RefreshCw className="w-4 h-4" /> Reconcile BSC receipt</Btn>}
                {controlledExecution.transactionHash && <div className="text-[10px]"><span className="text-[#6b7d99]">Transaction</span><div className="font-mono text-[#9aacc4] break-all mt-1">{controlledExecution.transactionHash}</div></div>}
                {controlledExecution.state === "CONFIRMED" && <div className="rounded-md border border-[#4ade80]/15 bg-[#4ade80]/[0.03] p-3 text-[10px] space-y-2"><div className="text-[#4ade80] font-medium">Confirmed on BSC Testnet; sealed boundary consumed.</div>{controlledExecution.mintedPositionTokenId && <div className="text-[#9aacc4]">Replacement LP NFT: <span className="font-mono">{controlledExecution.mintedPositionTokenId}</span> · verified: {controlledExecution.mintedPositionVerified ? "yes" : "not fully"}</div>}<div className="text-[#6b7d99]">{controlledExecution.postStateDetail}</div><Btn variant="teal-outline" size="sm" onClick={() => navigate("outcomes", { executionId: controlledExecution.executionId })}><Activity className="w-3.5 h-3.5" /> Activity & Outcomes</Btn></div>}
                <p className="text-[10px] text-[#7f725f]">This button dispatches only the exact server-authorized sealed batch through the boundary-controlled Altana session. It is BSC Testnet-only. The external AgentService cannot supply arbitrary calldata to the signer.</p>
              </div>}

            </div>
          )}

          {subject.network === "testnet" && subject.version === "V3" && subject.positionManager && (
            <div className="space-y-4 pt-4 border-t border-white/7">
              <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-medium text-[#dde3ef]">Altana BSC Testnet integration proof</div><p className="text-[10px] text-[#6b7d99] mt-1 max-w-2xl">This creates or recovers an Altana passkey smart wallet and can register a real session restricted to the read-only <span className="font-mono">positions(uint256)</span> selector on this exact Position Manager. It proves grant, Keystore verification and revoke plumbing only — it is not the selected agent's financial authority.</p></div><Badge variant="purple">TESTNET PROBE</Badge></div>
              <div className="flex flex-wrap gap-2"><Btn variant="secondary" onClick={() => void createAltanaTestnetWallet()} disabled={altanaWalletBusy}>{altanaWalletBusy ? <><RefreshCw className="w-4 h-4 animate-spin" /> Altana wallet</> : <><Wallet className="w-4 h-4" /> Create testnet passkey wallet</>}</Btn><Btn variant="ghost" onClick={() => void recoverAltanaTestnetWallet()} disabled={altanaWalletBusy}>Recover passkey wallet</Btn></div>
              {altanaWalletAddress && <div className="rounded-lg border border-white/7 bg-white/[0.02] p-3 text-[10px]"><div className="text-[#6b7d99]">Loaded Altana wallet</div><div className="font-mono text-[#9aacc4] break-all mt-1">{altanaWalletAddress}</div><div className={altanaWalletAddress.toLowerCase() === intent.walletAddress.toLowerCase() ? "text-[#4ade80] mt-1" : "text-[#f59e0b] mt-1"}>{altanaWalletAddress.toLowerCase() === intent.walletAddress.toLowerCase() ? "Matches this Job Intent wallet." : "Does not match this Job Intent wallet. Run the Smart Money Check against this Altana wallet before creating a probe."}</div></div>}
              {!probe && <Btn variant="teal-outline" onClick={() => void grantAltanaTestnetProbe()} disabled={probeBusy || !altanaWalletAddress || altanaWalletAddress.toLowerCase() !== intent.walletAddress.toLowerCase()}>{probeBusy ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating probe</> : <><FlaskConical className="w-4 h-4" /> Grant read-only testnet probe</>}</Btn>}
              {probe && <div className="rounded-lg border border-white/7 bg-black/10 p-4 space-y-3"><div className="flex items-center justify-between gap-3"><div><div className="text-[11px] text-[#9aacc4]">Observed Altana probe</div><div className="text-[10px] font-mono text-[#52637b] break-all mt-1">{probe.probeId}</div></div><Badge variant={probe.state === "ACTIVE" ? "green" : probe.state === "REVOKED" ? "amber" : "muted"}>{probe.state}</Badge></div><div className="grid sm:grid-cols-2 gap-3 text-[10px]"><div><span className="text-[#6b7d99]">Onchain key</span><div className={probe.onchainValid ? "text-[#4ade80] mt-0.5" : "text-[#f59e0b] mt-0.5"}>{probe.onchainValid ? "Valid now" : "Not valid"}</div></div><div><span className="text-[#6b7d99]">Verified block</span><div className="font-mono text-[#9aacc4] mt-0.5">{probe.verifiedBlockNumber ?? "Unavailable"}</div></div><div className="sm:col-span-2"><span className="text-[#6b7d99]">Session public key</span><div className="font-mono text-[#9aacc4] break-all mt-0.5">{probe.sessionPublicKey}</div></div>{probe.transactionHash && <div className="sm:col-span-2"><span className="text-[#6b7d99]">Grant transaction</span><div className="font-mono text-[#9aacc4] break-all mt-0.5">{probe.transactionHash}</div></div>}{probe.revocationTransactionHash && <div className="sm:col-span-2"><span className="text-[#6b7d99]">Revocation transaction</span><div className="font-mono text-[#9aacc4] break-all mt-0.5">{probe.revocationTransactionHash}</div></div>}</div><div className="flex flex-wrap gap-2"><Btn variant="secondary" onClick={() => void reverifyAltanaTestnetProbe()} disabled={probeBusy}><RefreshCw className={cn("w-4 h-4", probeBusy && "animate-spin")} /> Re-check probe</Btn>{probe.state === "ACTIVE" && <Btn variant="danger" onClick={() => void revokeAltanaTestnetProbe()} disabled={probeBusy}>Revoke probe</Btn>}</div></div>}
            </div>
          )}

          {subject.network !== "testnet" && (
            <div className="pt-4 border-t border-white/7 text-[10px] text-[#6b7d99]">The live Altana integration probe is intentionally BSC Testnet-only. Spotriq will not create a mainnet grant as part of this milestone.</div>
          )}

          {permissionGrant && (
            <div className="space-y-3 pt-4 border-t border-white/7">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div><div className="text-xs text-[#6b7d99]">Observed permission grant</div><div className="text-xs font-mono text-[#9aacc4] break-all">{permissionGrant.permissionGrantId}</div></div>
                <div className="flex gap-2"><Badge variant={permissionGrant.state === "ACTIVE" ? "green" : "amber"}>{permissionGrant.state}</Badge><Badge variant={permissionGrant.reconciliation === "EXACT_MATCH" ? "green" : "amber"}>{permissionGrant.reconciliation.replaceAll("_", " ")}</Badge></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div><span className="text-[#6b7d99]">Onchain key validity</span><div className={permissionGrant.onchainValid ? "text-[#4ade80] mt-0.5" : "text-[#f59e0b] mt-0.5"}>{permissionGrant.onchainValid ? "Valid now" : "Not valid"}</div></div>
                <div><span className="text-[#6b7d99]">Verified block</span><div className="text-[#dde3ef] font-mono mt-0.5">{permissionGrant.verifiedBlockNumber ?? "Unavailable"}</div></div>
                <div className="sm:col-span-2"><span className="text-[#6b7d99]">Altana key ID</span><div className="text-[#9aacc4] font-mono mt-0.5 break-all">{permissionGrant.keyId}</div></div>
              </div>
              <Btn variant="secondary" onClick={() => void reverifyBoundedGrant()} disabled={reverifyingGrant}>{reverifyingGrant ? <><RefreshCw className="w-4 h-4 animate-spin" /> Re-checking</> : <><RefreshCw className="w-4 h-4" /> Re-check onchain authority</>}</Btn>
              <p className="text-[10px] text-[#52637b]">Spotriq can observe expiry/revocation through Altana Keystore, but it does not hold the wallet admin key and cannot fake a revoke transaction.</p>
            </div>
          )}
        </Card>
      )}

      {isConfirmed ? (
        <div className="rounded-xl border border-[#2dd4bf]/20 bg-[#2dd4bf]/[0.03] p-5 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#2dd4bf] shrink-0 mt-0.5" />
          <div><div className="font-medium text-[#dde3ef]">{intent.authority.state === "GRANT_VERIFIED" ? "Bounded grant verified — execution still disabled" : intent.authority.state === "REQUEST_PREPARED" ? "Job confirmed — bounded authority scope prepared" : "Job confirmed — define bounded authority below"}</div><p className="text-xs text-[#8090a8] mt-1">Spotriq has recorded the job and can now derive an explicit permission scope. Spotriq now supports the first controlled BSC Testnet Rebalancing execution path. A transaction can be submitted only after the exact reviewed plan is sealed, Altana authority is re-verified, balances/allowances are fresh, the v0.17 preflight passes, and every call hash is re-authorized in order. Missing ERC-20 allowance uses a separate exact wallet-admin approval plan; unlimited approvals and AgentService-controlled approvals remain forbidden.</p></div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <Btn variant="primary" size="lg" className="flex-1 justify-center" onClick={() => void confirmJob()} disabled={confirming || saving || !intent.serviceTask || intent.serviceTask.state !== "COMPLETED" || intent.serviceTask.originProofState !== "VERIFIED" || intent.serviceTask.proposalState !== "STRUCTURED"}>
            {confirming ? <><RefreshCw className="w-4 h-4 animate-spin" /> Confirming</> : <>Confirm job intent <ArrowRight className="w-4 h-4" /></>}
          </Btn>
          <Btn variant="secondary" size="lg" onClick={() => navigate("explore", { exploreCategory: "rebalancing", fromFinding: intent.findingId })}>Choose another service</Btn>
          {(!intent.serviceTask || intent.serviceTask.state !== "COMPLETED" || intent.serviceTask.originProofState !== "VERIFIED" || intent.serviceTask.proposalState !== "STRUCTURED") && <p className="w-full text-[10px] text-[#f59e0b]">Confirm stays locked until the real selected AgentService completes an attributable structured proposal.</p>}
        </div>
      )}

      <p className="text-[10px] text-[#52637b] leading-relaxed">{intent.limitations.join(" ")}</p>
    </div>
  );
}

function CheckoutPage({ serviceId, jobIntentId, navigate }: { serviceId: string; jobIntentId?: string; navigate: (r: Route, p?: Partial<NavState>) => void }) {
  if (jobIntentId) return <LiveRebalancingJobIntentPage jobIntentId={jobIntentId} navigate={navigate} />;
  return <ReferenceCheckoutPage serviceId={serviceId} navigate={navigate} />;
}

function ReferenceCheckoutPage({ serviceId, navigate }: { serviceId: string; navigate: (r: Route, p?: Partial<NavState>) => void }) {
  const [step, setStep] = useState(0);
  const [dailyLimit, setDailyLimit] = useState("200");
  const [maxAction, setMaxAction] = useState("75");
  const [duration, setDuration] = useState("7");
  const [approvalMode, setApprovalMode] = useState<"auto" | "ask">("auto");
  const [activating, setActivating] = useState(false);
  const [activationResult, setActivationResult] = useState<Awaited<ReturnType<typeof runMockActivation>> | null>(null);
  const service = SERVICES.find(s => s.serviceId === serviceId) || SERVICES[0];
  const steps: { key: CheckoutStep; label: string }[] = [
    { key: "job", label: "Job" }, { key: "authority", label: "Authority" }, { key: "limits", label: "Limits" },
    { key: "cost", label: "Cost" }, { key: "risk", label: "Risk" }, { key: "review", label: "Review" }
  ];

  const handleActivate = async () => {
    setActivating(true);
    try {
      const result = await runMockActivation();
      setActivationResult(result);
      setStep(6);
    } finally {
      setActivating(false);
    }
  };

  if (step === 6) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-[#4ade80]/15 border border-[#4ade80]/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-[#4ade80]" />
        </div>
        <h1 className="text-2xl font-semibold text-[#dde3ef]">{service.name} is now active</h1>
        <p className="text-[#6b7d99]">The agent has been authorized and activated. You can monitor its activity and revoke authority at any time.</p>
        <div className="bg-card border border-white/7 rounded-lg p-4 text-left space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#6b7d99]">Activation ID</span><span className="font-mono text-[#dde3ef] text-xs">{activationResult?.activation.activationId ?? "pending"}</span></div>
          <div className="flex justify-between"><span className="text-[#6b7d99]">Permission grant</span><span className="font-mono text-[#dde3ef] text-xs">{activationResult?.permissionGrant.permissionGrantId ?? "pending"} · <span className="text-[#4ade80]">ACTIVE</span></span></div>
          <div className="flex justify-between"><span className="text-[#6b7d99]">Daily limit</span><span className="font-mono text-[#dde3ef]">${dailyLimit}</span></div>
          <div className="flex justify-between"><span className="text-[#6b7d99]">Expires</span><span className="text-[#dde3ef]">In {duration} days</span></div>
        </div>
        <div className="flex flex-col gap-3">
          <Btn variant="primary" className="justify-center" onClick={() => navigate("my-agents")}>
            View in My Agents <ArrowRight className="w-4 h-4" />
          </Btn>
          <Btn variant="ghost" className="justify-center text-[#6b7d99]" onClick={() => navigate("home")}>Return to Home</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <button onClick={() => navigate("agent", { agentId: serviceId })} className="flex items-center gap-2 text-sm text-[#6b7d99] hover:text-[#9aacc4] mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Progress */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1 shrink-0">
            <button onClick={() => i < step && setStep(i)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                i === step ? "bg-[#2dd4bf]/15 text-[#2dd4bf] border border-[#2dd4bf]/30" :
                  i < step ? "bg-[#4ade80]/10 text-[#4ade80] cursor-pointer" : "text-[#6b7d99]")}>
              {i < step ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 text-center text-[10px]">{i + 1}</span>}
              {s.label}
            </button>
            {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-[#1c2433]" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#dde3ef]">Confirm the job</h2>
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-white/7">
              <div className="w-10 h-10 rounded-md bg-[#2dd4bf]/15 border border-[#2dd4bf]/30 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#2dd4bf]" />
              </div>
              <div>
                <div className="font-semibold text-[#dde3ef]">{service.name}</div>
                <div><CategoryPill category={service.category} /></div>
              </div>
            </div>
            {[
              { label: "Job", value: service.category === "rebalancing" ? "Manage BNB/USDT PancakeSwap V3 LP position" : service.category === "yield" ? "Optimise USDT yield across supported protocols" : service.category === "grid" ? "Run BNB/USDT grid strategy" : "Monitor Venus borrowing position" },
              { label: "Position / Assets", value: service.category === "rebalancing" ? "~$4,212 BNB/USDT LP" : service.category === "yield" ? "2,750 USDT" : service.category === "grid" ? "1,000 USDT capital" : "Venus position (HF 1.42)" },
              { label: "Mode", value: service.automationMode },
              { label: "Duration", value: "7 days (configurable)" },
            ].map(row => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-[#6b7d99]">{row.label}</span>
                <span className="text-[#dde3ef] text-right max-w-[60%]">{row.value}</span>
              </div>
            ))}
          </Card>
          <Btn variant="primary" size="lg" className="w-full justify-center" onClick={() => setStep(1)}>Continue <ArrowRight className="w-4 h-4" /></Btn>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#dde3ef]">Authority this agent will have</h2>
          <Card className="p-6 space-y-4">
            <div>
              <div className="text-xs font-mono uppercase text-[#4ade80] mb-3">This agent will be able to</div>
              <div className="space-y-2">
                {[
                  service.category === "rebalancing" ? "Manage this BNB/USDT LP position" : service.category === "yield" ? "Deposit and withdraw USDT from supported protocols" : service.category === "grid" ? "Place and cancel orders on BNB/USDT" : "Read your Venus position state",
                  `Call approved ${service.supportedProtocols[0]} functions`,
                  "Use only specified assets and position",
                ].map(item => (
                  <div key={item} className="flex gap-2 text-sm text-[#9aacc4]"><Check className="w-3.5 h-3.5 text-[#4ade80] shrink-0 mt-0.5" />{item}</div>
                ))}
              </div>
            </div>
            <div className="border-t border-white/7 pt-4">
              <div className="text-xs font-mono uppercase text-[#6b7d99] mb-3">This agent cannot</div>
              <div className="space-y-2">
                {["Transfer to arbitrary wallets", "Use unrelated protocols or assets", "Access any other part of your wallet"].map(item => (
                  <div key={item} className="flex gap-2 text-sm text-[#9aacc4]"><X className="w-3.5 h-3.5 text-[#4ade80] shrink-0 mt-0.5" />{item}</div>
                ))}
              </div>
              <p className="text-xs text-[#6b7d99] mt-3 bg-[#193040] border border-[#2dd4bf]/10 rounded p-2">These are positive safety constraints, not limitations. They protect you by design.</p>
            </div>
          </Card>
          <div className="flex gap-3">
            <Btn variant="secondary" onClick={() => setStep(0)}><ArrowLeft className="w-4 h-4" /></Btn>
            <Btn variant="primary" className="flex-1 justify-center" onClick={() => setStep(2)}>Continue <ArrowRight className="w-4 h-4" /></Btn>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#dde3ef]">Set limits</h2>
          <Card className="p-6 space-y-6">
            <div>
              <label className="block text-sm text-[#9aacc4] mb-2">Daily execution limit ($)</label>
              <input type="number" value={dailyLimit} onChange={e => setDailyLimit(e.target.value)}
                className="w-full bg-[#1c2433] border border-white/10 rounded-md px-4 py-2.5 text-sm font-mono text-[#dde3ef] focus:outline-none focus:border-[#2dd4bf]/40" />
              <div className="flex gap-2 mt-2">
                {["100", "200", "500"].map(v => (
                  <button key={v} onClick={() => setDailyLimit(v)}
                    className={cn("px-3 py-1 text-xs rounded border transition-colors", dailyLimit === v ? "bg-[#2dd4bf]/15 border-[#2dd4bf]/30 text-[#2dd4bf]" : "border-white/8 text-[#6b7d99] hover:text-[#9aacc4]")}>
                    ${v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-[#9aacc4] mb-2">Maximum single action ($)</label>
              <input type="number" value={maxAction} onChange={e => setMaxAction(e.target.value)}
                className="w-full bg-[#1c2433] border border-white/10 rounded-md px-4 py-2.5 text-sm font-mono text-[#dde3ef] focus:outline-none focus:border-[#2dd4bf]/40" />
            </div>
            <div>
              <label className="block text-sm text-[#9aacc4] mb-2">Session duration (days)</label>
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
                className="w-full bg-[#1c2433] border border-white/10 rounded-md px-4 py-2.5 text-sm font-mono text-[#dde3ef] focus:outline-none focus:border-[#2dd4bf]/40" />
            </div>
            <div>
              <label className="block text-sm text-[#9aacc4] mb-2">Approval mode</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-[#1c2433] rounded-md border border-white/8 cursor-pointer">
                  <input type="radio" name="approval" checked={approvalMode === "auto"} onChange={() => setApprovalMode("auto")} className="accent-[#2dd4bf]" />
                  <div><div className="text-sm text-[#dde3ef]">Automatic within limits</div><div className="text-xs text-[#6b7d99]">Agent executes without confirmation if within set limits</div></div>
                </label>
                <label className="flex items-center gap-3 p-3 bg-[#1c2433] rounded-md border border-white/8 cursor-pointer">
                  <input type="radio" name="approval" checked={approvalMode === "ask"} onChange={() => setApprovalMode("ask")} className="accent-[#2dd4bf]" />
                  <div><div className="text-sm text-[#dde3ef]">Ask before execution</div><div className="text-xs text-[#6b7d99]">You approve each action before it happens</div></div>
                </label>
              </div>
            </div>
          </Card>
          <div className="flex gap-3">
            <Btn variant="secondary" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4" /></Btn>
            <Btn variant="primary" className="flex-1 justify-center" onClick={() => setStep(3)}>Continue <ArrowRight className="w-4 h-4" /></Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#dde3ef]">Cost breakdown</h2>
          <Card className="p-6">
            <div className="space-y-3 text-sm">
              {[
                { label: "Agent subscription fee", value: `${service.pricing.amount}/${service.pricing.period}`, note: "Billed by operator" },
                { label: "Estimated gas per operation", value: "~$1.00–2.50", note: "Estimate — varies with network" },
                { label: "Protocol costs", value: service.pricing.protocolCostsNote, note: "Charged by protocol directly" },
                service.pricing.performanceFee ? { label: "Performance fee", value: service.pricing.performanceFee, note: "Charged by operator on net gain" } : null,
              ].filter(Boolean).map(row => (
                <div key={row!.label}>
                  <div className="flex justify-between">
                    <span className="text-[#6b7d99]">{row!.label}</span>
                    <span className="text-[#dde3ef] font-mono">{row!.value}</span>
                  </div>
                  <div className="text-[11px] text-[#6b7d99]/70 mt-0.5">{row!.note}</div>
                </div>
              ))}
              <div className="border-t border-white/10 pt-3 flex justify-between font-medium">
                <span className="text-[#9aacc4]">Starting cost estimate</span>
                <span className="text-[#dde3ef] font-mono">~{service.pricing.amount} + gas</span>
              </div>
            </div>
            <p className="text-[11px] text-[#6b7d99] mt-4 pt-3 border-t border-white/7">All cost items are estimates. Actual amounts may vary. Protocol costs are separate from agent fees and are not hidden inside the subscription price.</p>
          </Card>
          <div className="flex gap-3">
            <Btn variant="secondary" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4" /></Btn>
            <Btn variant="primary" className="flex-1 justify-center" onClick={() => setStep(4)}>Continue <ArrowRight className="w-4 h-4" /></Btn>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#dde3ef]">Understand the risks</h2>
          <Card className="p-6 space-y-4 text-sm text-[#9aacc4]">
            {[
              { title: "Strategy risk", text: service.category === "rebalancing" ? "Rebalancing incurs gas and swap costs. In high-volatility markets, frequent rebalances may exceed fee earnings." : service.category === "yield" ? "Yield rates change. Reallocations incur gas. Estimated net rates are not guaranteed." : service.category === "grid" ? "Grid trading can result in losses in strongly trending markets. Stop-loss limits but does not eliminate downside." : "Automatic intervention depends on available liquidity. Alert-only mode does not prevent liquidation — it notifies." },
              { title: "Protocol risk", text: `Using ${service.supportedProtocols.join(", ")}. Smart contract risk inherent to DeFi protocols applies.` },
              { title: "Failure behavior", text: "If the agent runtime is unavailable, no automated action occurs. Alerts may be delayed. You can revoke authority at any time — the agent stops acting when revoked." },
              { title: "Revocation", text: "You can revoke this agent's authority instantly from My Agents > Authority. Revocation takes effect on-chain. Pending actions may still complete." },
            ].map(item => (
              <div key={item.title}>
                <div className="font-medium text-[#dde3ef] mb-1">{item.title}</div>
                <p>{item.text}</p>
              </div>
            ))}
          </Card>
          <div className="flex gap-3">
            <Btn variant="secondary" onClick={() => setStep(3)}><ArrowLeft className="w-4 h-4" /></Btn>
            <Btn variant="primary" className="flex-1 justify-center" onClick={() => setStep(5)}>I understand — Continue <ArrowRight className="w-4 h-4" /></Btn>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#dde3ef]">Review &amp; activate</h2>
          <div className="bg-[#1c2433] border border-white/8 rounded-lg p-5 text-sm text-[#9aacc4] leading-relaxed">
            "You are activating <strong className="text-[#dde3ef]">{service.name}</strong> to {service.category === "rebalancing" ? "manage your BNB/USDT PancakeSwap LP position" : service.category === "yield" ? "optimise USDT yield across supported protocols" : service.category === "grid" ? "run a grid strategy on BNB/USDT" : "monitor your Venus borrowing position"} for <strong className="text-[#dde3ef]">{duration} days</strong> with a maximum daily execution amount of <strong className="text-[#dde3ef]">${dailyLimit}</strong>. It cannot transfer funds to arbitrary addresses."
          </div>
          <Card className="p-5 space-y-2 text-sm">
            {[
              { label: "Service", value: service.name },
              { label: "Daily limit", value: `$${dailyLimit}` },
              { label: "Max single action", value: `$${maxAction}` },
              { label: "Expires", value: `${duration} days from activation` },
              { label: "Approval mode", value: approvalMode === "auto" ? "Automatic within limits" : "Ask before execution" },
              { label: "Transfer capability", value: "None" },
              { label: "Revocation", value: "Immediate, from My Agents" },
            ].map(row => (
              <div key={row.label} className="flex justify-between">
                <span className="text-[#6b7d99]">{row.label}</span>
                <span className="text-[#dde3ef] font-mono text-right">{row.value}</span>
              </div>
            ))}
          </Card>
          <div className="flex gap-3">
            <Btn variant="secondary" onClick={() => setStep(4)}><ArrowLeft className="w-4 h-4" /></Btn>
            <Btn variant="primary" size="lg" className="flex-1 justify-center" onClick={handleActivate} disabled={activating}>
              {activating ? <><span className="w-4 h-4 border-2 border-[#061010]/40 border-t-[#061010] rounded-full animate-spin" /> Authorizing…</> : <><ShieldCheck className="w-4 h-4" /> Authorize &amp; Activate</>}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAGE: LIVE EXECUTION ACTIVITY & OUTCOMES ──────────────────────────────────
function ExecutionActivityOutcomesPage({ executionId, navigate }: { executionId: string; navigate: (r: Route, p?: Partial<NavState>) => void }) {
  const [bundle, setBundle] = useState<ExecutionActivityOutcomeBundle>();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string>();
  const load = useCallback(async (refresh = false) => {
    refresh ? setSyncing(true) : setLoading(true);
    setError(undefined);
    try { setBundle(refresh ? await activityOutcomesRepository.sync(executionId) : await activityOutcomesRepository.get(executionId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Spotriq could not load execution evidence."); }
    finally { refresh ? setSyncing(false) : setLoading(false); }
  }, [executionId]);
  useEffect(() => { void load(false); }, [load]);
  if (loading) return <div className="max-w-5xl mx-auto px-6 py-10"><div className="flex items-center gap-2 text-sm text-[#6b7d99]"><RefreshCw className="w-4 h-4 animate-spin" /> Loading Activity & Outcomes…</div></div>;
  if (error || !bundle) return <div className="max-w-5xl mx-auto px-6 py-10"><Card className="p-5"><div className="text-sm text-[#f87171]">{error ?? "Execution evidence is unavailable."}</div><Btn variant="secondary" className="mt-3" onClick={() => void load(false)}>Retry</Btn></Card></div>;
  const outcome=bundle.outcome;
  return <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
    <button onClick={() => navigate("checkout", { jobIntentId: bundle.execution.jobIntentId })} className="flex items-center gap-2 text-sm text-[#6b7d99] hover:text-[#9aacc4]"><ArrowLeft className="w-4 h-4" /> Back to reviewed job</button>
    <div className="flex items-start justify-between gap-4"><div><div className="text-[11px] font-mono uppercase tracking-wide text-[#2dd4bf]">Marketplace observed evidence</div><h1 className="text-2xl font-semibold text-[#dde3ef] mt-1">Activity & Outcomes</h1><p className="text-sm text-[#6b7d99] mt-1 max-w-2xl">Execution-scoped evidence for the controlled BSC Testnet Rebalancing transaction. This does not claim the external AgentService was hired or that the strategy was profitable.</p></div><Btn variant="secondary" onClick={() => void load(true)} disabled={syncing}>{syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refresh evidence</Btn></div>
    <div className="grid md:grid-cols-4 gap-3">
      <Card className="p-4"><div className="text-[11px] text-[#6b7d99]">Execution</div><div className="text-sm text-[#4ade80] font-medium mt-1">{bundle.execution.state}</div></Card>
      <Card className="p-4"><div className="text-[11px] text-[#6b7d99]">Replacement NFT</div><div className="text-sm font-mono text-[#dde3ef] mt-1">{outcome?.replacementPositionTokenId ?? "Not measured"}</div></Card>
      <Card className="p-4"><div className="text-[11px] text-[#6b7d99]">Gas</div><div className="text-sm font-mono text-[#dde3ef] mt-1">{outcome?.gasCostNativeFormatted ? `${outcome.gasCostNativeFormatted} ${outcome.gasAsset}` : "Unavailable"}</div></Card>
      <Card className="p-4"><div className="text-[11px] text-[#6b7d99]">Performance</div><div className="text-sm text-[#f59e0b] mt-1">{outcome?.performanceMeasurement.state.replaceAll("_"," ") ?? "Not measured"}</div></Card>
    </div>
    <Card className="p-5"><div className="flex items-center justify-between mb-4"><SectionHeader label="Execution timeline" /><Badge variant="teal">Observed</Badge></div><div className="space-y-4">{bundle.activity.map((ev,i)=><div key={ev.activityEventId} className="flex gap-3"><div className="flex flex-col items-center"><span className={cn("w-2.5 h-2.5 rounded-full mt-1",ev.severity==="success"?"bg-[#4ade80]":ev.severity==="error"?"bg-[#f87171]":ev.severity==="warning"?"bg-[#f59e0b]":"bg-[#60a5fa]")} />{i<bundle.activity.length-1&&<span className="w-px flex-1 bg-white/8 mt-1" />}</div><div className="pb-4 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-medium text-[#dde3ef]">{ev.title}</div><div className="text-[10px] text-[#6b7d99]">{new Date(ev.occurredAt).toLocaleString()}</div></div><div className="text-xs text-[#6b7d99] mt-1">{ev.description}</div>{ev.transactionHash&&<div className="text-[10px] font-mono text-[#2dd4bf] break-all mt-1">{ev.transactionHash}</div>}</div></div>)}</div></Card>
    {outcome ? <Card className="p-5 space-y-4"><div className="flex items-center justify-between"><SectionHeader label="Immediate execution outcome" /><Badge variant="amber">{outcome.state}</Badge></div><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{outcome.metrics.map(m=><div key={m.outcomeMetricId} className="rounded-lg border border-white/7 bg-white/[0.02] p-3"><div className="text-[10px] uppercase font-mono text-[#6b7d99]">{m.metric.replaceAll("_"," ")}</div><div className="text-sm text-[#dde3ef] font-mono mt-1 break-all">{m.value}{m.unit ? ` ${m.unit}` : ""}</div><div className="flex items-center gap-2 mt-2"><ProvenanceBadge type={m.provenance} /><span className="text-[10px] text-[#52637b]">{m.attribution}</span></div></div>)}</div><div className="rounded-lg border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-4"><div className="text-xs font-medium text-[#d6a04a]">Performance claims remain unavailable</div><p className="text-[11px] text-[#9c8663] mt-1">{outcome.performanceMeasurement.detail}</p></div><div className="space-y-1">{outcome.limitations.map(x=><div key={x} className="text-[10px] text-[#6b7d99]">• {x}</div>)}</div></Card> : <Card className="p-5"><SectionHeader label="Outcome" /><p className="text-sm text-[#6b7d99]">No reconciled execution outcome exists yet. Failed or blocked attempts remain visible in the activity timeline without being converted into performance claims.</p></Card>}
    <Card className="p-5"><SectionHeader label="Evidence records" /><div className="space-y-2 mt-3">{bundle.evidence.length ? bundle.evidence.map(ev=><div key={ev.evidenceId} className="rounded-md border border-white/6 p-3"><div className="flex items-center justify-between gap-3"><div className="text-xs text-[#dde3ef]">{ev.metric}</div><ProvenanceBadge type={ev.provenance} /></div><div className="text-[10px] font-mono text-[#6b7d99] mt-1 break-all">{String(ev.value)}</div>{ev.limitation&&<div className="text-[10px] text-[#52637b] mt-1">{ev.limitation}</div>}</div>) : <div className="text-sm text-[#6b7d99]">No outcome evidence records are available for this execution state.</div>}</div></Card>
  </div>;
}

// ─── PAGE: MY AGENTS ──────────────────────────────────────────────────────────

function MyAgentsPage({ navigate, initialTab = "overview" }: { navigate: (r: Route, p?: Partial<NavState>) => void; initialTab?: MyAgentsTab }) {
  const [tab, setTab] = useState<MyAgentsTab>(initialTab);
  const tabs: { key: MyAgentsTab; label: string }[] = [
    { key: "overview", label: "Overview" }, { key: "agents", label: "Agents" },
    { key: "plans", label: "Plans" }, { key: "activity", label: "Activity" },
    { key: "authority", label: "Authority" }, { key: "outcomes", label: "Outcomes" },
  ];
  const activation = ACTIVATIONS[0];
  const grant = PERMISSION_GRANTS[0];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#dde3ef]">My Agents</h1>
        <Btn variant="teal-outline" size="sm" onClick={() => navigate("explore")}>
          <Plus className="w-3.5 h-3.5" /> Add Agent
        </Btn>
      </div>

      <div className="flex gap-1 mb-4 border-b border-white/7 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors",
              tab === t.key ? "text-[#2dd4bf] border-[#2dd4bf]" : "text-[#6b7d99] border-transparent hover:text-[#9aacc4]")}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="text-[10px] font-mono text-center text-[#6b7d99] bg-white/3 border border-white/6 rounded px-3 py-1.5 mb-6">Example Portfolio / Sample Data · Live execution Activity & Outcomes are opened from a confirmed controlled Job Intent.</div>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Active agents", value: "1", sub: "RangeKeeper" },
              { label: "Authority grants", value: "1", sub: "1 active" },
              { label: "Actions (30d)", value: "3", sub: "0 failed" },
              { label: "Total cost (30d)", value: "$9.42", sub: "Gas + fees" },
            ].map(s => (
              <div key={s.label} className="bg-card border border-white/7 rounded-lg p-4">
                <div className="text-xl font-semibold font-mono text-[#dde3ef]">{s.value}</div>
                <div className="text-xs text-[#6b7d99]">{s.label}</div>
                <div className="text-[11px] text-[#6b7d99]/60 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          <div>
            <SectionHeader label="Working for you" />
            <Card className="p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[#dde3ef]">{activation.serviceName}</span>
                    <Badge variant="green">ACTIVE</Badge>
                  </div>
                  <div className="text-xs text-[#6b7d99]">{activation.managedPosition} · {activation.protocol}</div>
                </div>
                <Btn size="sm" variant="ghost" onClick={() => setTab("agents")}>View <ChevronRight className="w-3.5 h-3.5" /></Btn>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div><div className="text-xs text-[#6b7d99]">Current state</div><div className="text-sm text-[#4ade80] font-medium mt-0.5">{activation.currentState}</div></div>
                <div><div className="text-xs text-[#6b7d99]">Time in range (30d)</div><div className="text-sm font-mono font-medium text-[#dde3ef] mt-0.5">{activation.categorySnapshot["Time in range (30d)"]}</div></div>
                <div><div className="text-xs text-[#6b7d99]">Last action</div><div className="text-sm text-[#dde3ef] mt-0.5">{activation.lastActionAt}</div></div>
                <div><div className="text-xs text-[#6b7d99]">Daily authority used</div><div className="text-sm font-mono text-[#dde3ef] mt-0.5">{activation.authorityUsedToday}/{activation.authorityDailyLimit}</div></div>
              </div>
              <div className="h-1.5 bg-[#1c2433] rounded-full overflow-hidden">
                <div className="h-full bg-[#2dd4bf] rounded-full" style={{ width: `${(parseInt(activation.authorityUsedToday.replace("$", "")) / parseInt(activation.authorityDailyLimit.replace("$", ""))) * 100}%` }} />
              </div>
            </Card>
          </div>

          <div>
            <SectionHeader label="Recent Activity" />
            <div className="space-y-2">
              {ACTIVITY_EVENTS.slice(0, 3).map(ev => (
                <div key={ev.id} className="flex items-start gap-3 p-3 bg-card border border-white/6 rounded-lg">
                  <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", ev.severity === "success" ? "bg-[#4ade80]" : ev.severity === "warning" ? "bg-[#f59e0b]" : "bg-[#60a5fa]")} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#dde3ef]">{ev.title}</div>
                    <div className="text-xs text-[#6b7d99]">{ev.description.slice(0, 80)}…</div>
                  </div>
                  <div className="text-xs text-[#6b7d99] shrink-0">{ev.occurredAt}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setTab("activity")} className="mt-2 text-sm text-[#2dd4bf] flex items-center gap-1">
              View all activity <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {tab === "agents" && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[#dde3ef]">{activation.serviceName}</span>
                  <Badge variant="green">ACTIVE</Badge>
                  <CategoryPill category={activation.category} />
                </div>
                <div className="text-xs text-[#6b7d99]">Started {activation.startedAt} · {activation.managedPosition} · {activation.protocol}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {Object.entries(activation.categorySnapshot).map(([k, v]) => (
                <div key={k}><div className="text-xs text-[#6b7d99]">{k}</div><div className="text-sm font-mono font-medium text-[#dde3ef] mt-0.5">{v}</div></div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/7">
              <Btn size="sm" variant="secondary"><span className="w-2 h-2 bg-[#f59e0b] rounded-full" /> Pause</Btn>
              <Btn size="sm" variant="ghost" onClick={() => navigate("compare", { compareIds: [activation.serviceId] })}>Compare Alternatives</Btn>
              <Btn size="sm" variant="ghost" onClick={() => setTab("authority")}>Review Authority</Btn>
              <Btn size="sm" variant="danger">Revoke / End</Btn>
            </div>
          </Card>
        </div>
      )}

      {tab === "activity" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            {["All", "Rebalancing", "Success", "Errors"].map(f => (
              <button key={f} className={cn("px-3 py-1.5 text-xs rounded-md", f === "All" ? "bg-[#2dd4bf]/15 text-[#2dd4bf] border border-[#2dd4bf]/30" : "text-[#6b7d99] bg-[#1c2433] border border-white/8")}>{f}</button>
            ))}
          </div>
          {ACTIVITY_EVENTS.map(ev => (
            <div key={ev.id} className="flex gap-4 p-4 bg-card border border-white/6 rounded-lg hover:border-white/10 transition-colors">
              <div className="text-xs font-mono text-[#6b7d99] w-12 shrink-0 pt-0.5">{ev.occurredAt}</div>
              <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", ev.severity === "success" ? "bg-[#4ade80]" : ev.severity === "warning" ? "bg-[#f59e0b]" : "bg-[#60a5fa]")} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#dde3ef] mb-0.5">{ev.title}</div>
                <div className="text-sm text-[#6b7d99]">{ev.description}</div>
                <div className="flex items-center gap-3 mt-2">
                  {ev.transactionHash && <a href="#" className="text-xs text-[#2dd4bf] flex items-center gap-1"><ExternalLink className="w-3 h-3" /> {ev.transactionHash}</a>}
                  {ev.cost && <span className="text-xs text-[#6b7d99]">Cost: {ev.cost}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "authority" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[{ label: "Active grants", value: "1" }, { label: "High authority", value: "0" }, { label: "Expiring (7d)", value: "1" }, { label: "Near limit", value: "0" }].map(s => (
              <div key={s.label} className="bg-card border border-white/7 rounded-lg p-4">
                <div className="text-xl font-semibold font-mono text-[#dde3ef]">{s.value}</div>
                <div className="text-xs text-[#6b7d99]">{s.label}</div>
              </div>
            ))}
          </div>
          <Card className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[#dde3ef]">{grant.serviceName}</span>
                  <Badge variant="green">{grant.state}</Badge>
                </div>
                <div className="text-xs text-[#6b7d99]">via {grant.provider} · Wallet: {grant.wallet}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              {[
                { label: "Protocols", value: grant.protocols.join(", ") },
                { label: "Assets", value: grant.assets.join(", ") },
                { label: "Daily limit", value: grant.dailyLimit },
                { label: "Used today", value: grant.usedToday },
                { label: "Expiry", value: grant.expiry },
                { label: "Transfer capability", value: grant.transferCapability ? "Yes" : "None" },
              ].map(row => (
                <div key={row.label}>
                  <div className="text-[#6b7d99] text-xs">{row.label}</div>
                  <div className="text-[#dde3ef] mt-0.5 font-mono">{row.value}</div>
                </div>
              ))}
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-xs text-[#6b7d99] mb-1">
                <span>Daily usage</span><span>{grant.usedToday} / {grant.dailyLimit}</span>
              </div>
              <div className="h-2 bg-[#1c2433] rounded-full overflow-hidden">
                <div className="h-full bg-[#2dd4bf] rounded-full" style={{ width: "33%" }} />
              </div>
            </div>
            <div className="flex gap-2">
              <Btn size="sm" variant="secondary">Change Limits</Btn>
              <Btn size="sm" variant="danger"><X className="w-3 h-3" /> Revoke</Btn>
            </div>
          </Card>
        </div>
      )}

      {tab === "outcomes" && (
        <div className="space-y-6">
          <div className="flex gap-2">
            {["7D", "30D", "90D", "All"].map(r => (
              <button key={r} className={cn("px-3 py-1.5 text-xs rounded-md", r === "30D" ? "bg-[#2dd4bf]/15 text-[#2dd4bf] border border-[#2dd4bf]/30" : "text-[#6b7d99] bg-[#1c2433] border border-white/8")}>{r}</button>
            ))}
          </div>
          <div>
            <SectionHeader label="Rebalancing — RangeKeeper (30d)" />
            <Card className="p-5 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-[#6b7d99]">Time in range</span><span className="text-[#4ade80] font-mono">94%</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#6b7d99]">Rebalances</span><span className="font-mono text-[#dde3ef]">3</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#6b7d99]">Fees earned (LP)</span><span className="text-[#4ade80] font-mono">+$28.40</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#6b7d99]">Gas cost</span><span className="text-[#f87171] font-mono">−$3.72</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#6b7d99]">Agent fee (30d)</span><span className="text-[#f87171] font-mono">−$7.00</span></div>
              <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-medium"><span className="text-[#9aacc4]">Net result</span><span className="text-[#4ade80] font-mono">+$17.68</span></div>
              <ProvenanceBadge type="marketplace-observed" />
              <p className="text-[11px] text-[#6b7d99]">Attribution: fees earned are OBSERVED from LP position data. Gas is DIRECT (on-chain). Net result is DERIVED. Outcome state: MEASURED over 12-day active window.</p>
            </Card>
          </div>
          <button className="text-sm text-[#2dd4bf] flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> View Evidence
          </button>
        </div>
      )}

      {tab === "plans" && (
        <div className="space-y-4">
          <p className="text-sm text-[#6b7d99]">No active plans. Explore curated combinations of specialist agents.</p>
          <Btn variant="teal-outline" onClick={() => navigate("plans")}>Browse Smart Money Plans <ChevronRight className="w-4 h-4" /></Btn>
        </div>
      )}
    </div>
  );
}

// ─── PAGE: PLAN PROFILE ───────────────────────────────────────────────────────

function PlanProfilePage({ planId, navigate }: { planId: string; navigate: (r: Route, p?: Partial<NavState>) => void }) {
  const plan = PLAN_TEMPLATES.find(p => p.planId === planId) || PLAN_TEMPLATES[0];
  const members = plan.categories.map((cat, i) => ({
    role: cat, service: SERVICES.find(s => s.category === cat) || SERVICES[0],
  }));
  const [selectedMembers, setSelectedMembers] = useState(members.map(m => m.service.serviceId));

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <button onClick={() => navigate("plans")} className="flex items-center gap-2 text-sm text-[#6b7d99] hover:text-[#9aacc4] mb-6">
        <ArrowLeft className="w-4 h-4" /> All Plans
      </button>
      <div className="text-[11px] font-mono text-center text-[#6b7d99] bg-white/3 border border-white/6 rounded px-3 py-1.5 mb-6">
        Example Portfolio / Sample Data
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-semibold text-[#dde3ef]">{plan.name}</h1>
          <div className="flex gap-1.5">{plan.categories.map(c => <CategoryPill key={c} category={c} />)}</div>
        </div>
        <p className="text-[#9aacc4]">{plan.goal}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="p-5">
            <div className="text-xs font-mono uppercase text-[#6b7d99] mb-4">Why multiple specialists?</div>
            <div className="space-y-4">
              {members.map((m, i) => (
                <div key={i} className="p-3 bg-black/20 rounded">
                  <div className="flex items-center gap-2 mb-1.5">
                    <CategoryPill category={m.role} />
                    <span className="font-medium text-[#dde3ef]">{m.service.name}</span>
                  </div>
                  <p className="text-sm text-[#6b7d99]">{m.service.description}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-xs font-mono uppercase text-[#6b7d99] mb-4">Why this plan matches you</div>
            <div className="space-y-2">
              {plan.planId === "plan-earn-protect" && [
                "2,750 USDT not in a supported yield position",
                "Venus borrowing position detected (HF 1.42)",
                "Both services support BSC",
                "Compatible permission models — no overlap in authority",
              ].map(r => (
                <div key={r} className="flex items-center gap-2 text-sm text-[#9aacc4]">
                  <Check className="w-3.5 h-3.5 text-[#2dd4bf] shrink-0" />{r}
                </div>
              ))}
              {plan.planId !== "plan-earn-protect" && <p className="text-sm text-[#9aacc4]">Run Smart Money Check to see personalized match reasons.</p>}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-xs font-mono uppercase text-[#6b7d99] mb-4">Agent roles</div>
            <div className="space-y-3">
              {members.map((m, i) => {
                const roleService = SERVICES.find(s => s.serviceId === selectedMembers[i]) || m.service;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <CategoryPill category={m.role} />
                    <select value={selectedMembers[i]}
                      onChange={e => { const n = [...selectedMembers]; n[i] = e.target.value; setSelectedMembers(n); }}
                      className="flex-1 bg-[#1c2433] border border-white/10 rounded-md px-3 py-2 text-sm text-[#dde3ef] focus:outline-none">
                      {SERVICES.filter(s => s.category === m.role).map(s => (
                        <option key={s.serviceId} value={s.serviceId}>{s.name}</option>
                      ))}
                    </select>
                    <ReadinessPill state={roleService.readiness} />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div>
              <div className="text-xs text-[#6b7d99] mb-1">Combined cost</div>
              <div className="text-xl font-semibold font-mono text-[#dde3ef]">{plan.estimatedCost}</div>
              <div className="text-xs text-[#6b7d99]">+ protocol costs per action</div>
            </div>
            <div className="border-t border-white/7 pt-4">
              <div className="text-xs text-[#6b7d99] mb-2">Combined authority</div>
              <div className="space-y-2 text-sm">
                {members.map((m, i) => {
                  const s = SERVICES.find(sv => sv.serviceId === selectedMembers[i]) || m.service;
                  return (
                    <div key={i} className="p-2 bg-black/20 rounded">
                      <div className="text-xs text-[#9aacc4] font-medium">{s.name}</div>
                      <AuthorityBars intensity={s.permissionIntensity} />
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-[#6b7d99] mt-2">No overlap in asset control. Independent grants.</div>
            </div>
            <div className="border-t border-white/7 pt-4 space-y-2">
              <Btn variant="primary" className="w-full justify-center" onClick={() => navigate("checkout", { agentId: selectedMembers[0], checkoutStep: "job" })}>
                Activate Plan
              </Btn>
              <Btn variant="secondary" className="w-full justify-center text-sm">
                Compare Alternative Combination
              </Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE: PLANS ──────────────────────────────────────────────────────────────

function PlansPage({ navigate }: { navigate: (r: Route, p?: Partial<NavState>) => void }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-[#dde3ef] mb-2">Smart Money Plans</h1>
      <p className="text-[#6b7d99] mb-8">Curated combinations of compatible specialist agents for common financial goals.</p>
      <div className="grid md:grid-cols-3 gap-4">
        {PLAN_TEMPLATES.map(p => <PlanCard key={p.planId} plan={p} onView={() => navigate("plan-profile", { planId: p.planId })} />)}
      </div>
      <div className="mt-8 p-5 bg-card border border-white/7 rounded-lg">
        <div className="text-xs font-mono uppercase text-[#6b7d99] mb-2">About Smart Money Plans</div>
        <p className="text-sm text-[#9aacc4]">Plans coordinate separate specialist services. Each specialist keeps its own authority grant, activation record, and activity log. Plans are not super-agents — they are curated financial combinations.</p>
      </div>
    </div>
  );
}


// ─── PAGE: OPERATOR WORKSPACE ────────────────────────────────────────────────

function OperatorWorkspacePage({ navigate }: { navigate: (r: Route, p?: Partial<NavState>) => void }) {
  const [section, setSection] = useState<"dashboard" | "agents" | "services" | "tests" | "evidence" | "usage" | "settings">("dashboard");
  const items = [
    ["dashboard", "Dashboard"], ["agents", "Agents"], ["services", "Services"],
    ["tests", "Tests"], ["evidence", "Evidence"], ["usage", "Usage"], ["settings", "Settings"],
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <button onClick={() => navigate("home")} className="text-xs text-[#6b7d99] hover:text-[#9aacc4] mb-3 flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Spotriq
          </button>
          <div className="text-xs font-mono uppercase tracking-wide text-[#2dd4bf] mb-1">{BRAND.name}</div>
          <h1 className="text-2xl font-semibold text-[#dde3ef]">Operator Workspace</h1>
          <p className="text-sm text-[#6b7d99] mt-1">Manage agents and financial services listed on Spotriq.</p>
        </div>
        <Btn variant="primary"><Plus className="w-4 h-4" /> List an Agent</Btn>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[190px_1fr] gap-6">
        <aside className="bg-card border border-white/7 rounded-lg p-2 h-fit">
          {items.map(([key, label]) => (
            <button key={key} onClick={() => setSection(key)}
              className={cn("w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                section === key ? "bg-white/8 text-[#dde3ef]" : "text-[#6b7d99] hover:text-[#9aacc4] hover:bg-white/4")}>
              {label}
            </button>
          ))}
        </aside>

        <div className="space-y-6">
          {section === "dashboard" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ["Active listings", "4"], ["Ready services", "3"], ["Needs attention", "1"], ["Activations · 30d", "67"],
                ].map(([label, value]) => (
                  <Card key={label} className="p-4">
                    <div className="text-xs text-[#6b7d99] mb-1">{label}</div>
                    <div className="text-xl font-mono text-[#dde3ef]">{value}</div>
                  </Card>
                ))}
              </div>
              <Card className="p-5 border-[#f59e0b]/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-[#f59e0b] mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[#dde3ef]">Action required</div>
                    <p className="text-xs text-[#6b7d99] mt-1">YieldPilot is Limited because one opportunity source is unavailable. Marketplace readiness remains visible to users.</p>
                  </div>
                  <Btn size="sm" variant="secondary" onClick={() => setSection("services")}>Review service</Btn>
                </div>
              </Card>
              <div>
                <SectionHeader label="Marketplace services" />
                <div className="space-y-3">
                  {SERVICES.slice(0, 4).map(service => (
                    <Card key={service.serviceId} className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-medium text-[#dde3ef]">{service.name}</div>
                          <div className="text-xs text-[#6b7d99] mt-1">{CATEGORY_LABELS[service.category]} · {service.supportedProtocols.join(", ")}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <ReadinessPill state={service.readiness} />
                          <span className="text-xs text-[#6b7d99]">{service.evidenceSummary.testsPassed} tests passed</span>
                          <Btn size="sm" variant="secondary" onClick={() => setSection("services")}>Manage</Btn>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}

          {section !== "dashboard" && (
            <Card className="p-6">
              <div className="text-xs font-mono uppercase tracking-wide text-[#2dd4bf] mb-2">{section}</div>
              <h2 className="text-xl font-semibold text-[#dde3ef] mb-2">
                {items.find(([key]) => key === section)?.[1]}
              </h2>
              <p className="text-sm text-[#6b7d99] max-w-2xl">
                This frontend surface is now routed and backend-ready. Its data remains sample data until the corresponding Spotriq operator API milestone is connected.
              </p>
              {section === "evidence" && (
                <div className="grid md:grid-cols-2 gap-4 mt-5">
                  <Card className="p-4 bg-[#0f1520]">
                    <div className="text-xs font-mono text-[#2dd4bf] mb-2">SPOTRIQ MARKETPLACE EVIDENCE · READ-ONLY</div>
                    <p className="text-sm text-[#9aacc4]">Readiness snapshots, marketplace tests and production observations cannot be edited by operators.</p>
                  </Card>
                  <Card className="p-4 bg-[#0f1520]">
                    <div className="text-xs font-mono text-[#6b7d99] mb-2">YOUR CLAIMS · EDITABLE</div>
                    <p className="text-sm text-[#9aacc4]">Strategy documents, operator-supplied historical performance and methodology remain clearly provenance-labelled.</p>
                  </Card>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────

type FooterNavLink = { label: string; route: Route | null; category?: ExploreCategory; tab?: MyAgentsTab };

function FooterLink({ item, navigate }: {
  item: FooterNavLink;
  navigate: (r: Route, p?: Partial<NavState>) => void;
}) {
  const base = "text-sm text-[#5a6d88] hover:text-[#9aacc4] transition-colors leading-relaxed cursor-pointer text-left";
  if (!item.route) {
    return (
      <span className={cn(base, "opacity-60 cursor-default")} title="Coming soon">
        {item.label}
      </span>
    );
  }
  return (
    <button
      onClick={() => navigate(item.route!, item.category ? { exploreCategory: item.category } : item.tab ? { myAgentsTab: item.tab } : undefined)}
      className={base}
    >
      {item.label}
    </button>
  );
}

interface FooterColumnProps {
  label: string;
  links: FooterNavLink[];
  navigate: (r: Route, p?: Partial<NavState>) => void;
}

function FooterColumn({ label, links, navigate }: FooterColumnProps) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#3d5070] mb-4 font-medium">
        {label}
      </div>
      <ul className="space-y-2.5">
        {links.map(l => (
          <li key={l.label}>
            <FooterLink item={l} navigate={navigate} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterMobileSection({ label, links, navigate }: FooterColumnProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-3.5 text-left"
      >
        <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#3d5070] font-medium">
          {label}
        </span>
        <span className={cn("transition-transform duration-200 text-[#3d5070]", open && "rotate-180")}>
          <ChevronDown className="w-3.5 h-3.5" />
        </span>
      </button>
      {open && (
        <ul className="pb-4 space-y-3 pl-0.5">
          {links.map(l => (
            <li key={l.label}>
              <FooterLink item={l} navigate={navigate} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Footer({ navigate }: { navigate: (r: Route, p?: Partial<NavState>) => void }) {
  const cfg = FOOTER_CONFIG;
  const year = new Date().getFullYear();

  const columns: FooterColumnProps[] = [
    { label: "Product", links: cfg.nav.product as FooterNavLink[], navigate },
    { label: "Explore", links: cfg.nav.explore as FooterNavLink[], navigate },
    { label: "Trust & Resources", links: cfg.nav.resources as FooterNavLink[], navigate },
  ];

  return (
    <footer className="border-t border-white/6 bg-[#080b10]">

      {/* ── Main grid ── */}
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10 lg:gap-16">

          {/* Brand column */}
          <div className="space-y-5">
            {/* Logo + wordmark */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#2dd4bf]/12 border border-[#2dd4bf]/25 flex items-center justify-center shrink-0">
                <CircleDot className="w-3.5 h-3.5 text-[#2dd4bf]" />
              </div>
              <div>
                <div className="font-semibold text-[#c4cedf] text-sm tracking-tight">{cfg.product.name}</div>
                <div className="text-[10px] font-mono text-[#3d5070] mt-0.5">{cfg.product.descriptor}</div>
              </div>
            </div>

            {/* Tagline */}
            <p className="text-sm text-[#4d6280] leading-relaxed max-w-[240px]">
              {cfg.product.tagline}
            </p>

            {/* Secondary line */}
            <p className="text-xs text-[#3d5070] leading-relaxed max-w-[240px]">
              {cfg.product.secondaryLine}
            </p>

            {/* BSC ecosystem indicator */}
            <div className="inline-flex items-center gap-1.5 border border-[#f0b90b]/15 bg-[#f0b90b]/5 rounded px-2.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f0b90b] shrink-0" />
              <span className="text-[10px] font-mono text-[#f0b90b]/70 tracking-wide">
                {cfg.product.ecosystemNote}
              </span>
            </div>
          </div>

          {/* Nav columns — desktop 3-col grid */}
          <div className="hidden md:grid grid-cols-4 gap-8 lg:gap-10">
            {columns.map(col => (
              <FooterColumn key={col.label} {...col} />
            ))}

            {/* Operator column */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#3d5070] mb-4 font-medium">
                Operators
              </div>
              <ul className="space-y-2.5">
                {cfg.nav.operator.map(l => (
                  <li key={l.label}>
                    <FooterLink item={l as FooterNavLink} navigate={navigate} />
                  </li>
                ))}
              </ul>

              {/* Subtle separator + attribution */}
              <div className="mt-8 pt-5 border-t border-white/4">
                <p className="text-[11px] text-[#2d3d52] leading-relaxed">
                  {cfg.legal.ecosystemAttribution}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile accordion nav */}
          <div className="md:hidden border-t border-white/5 pt-2">
            {columns.map(col => (
              <FooterMobileSection key={col.label} {...col} />
            ))}

            {/* Operator as flat list on mobile — small enough to not need accordion */}
            <div className="pt-4 pb-2">
              <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#3d5070] mb-3 font-medium">
                Operators
              </div>
              <ul className="flex gap-5">
                {cfg.nav.operator.map(l => (
                  <li key={l.label}>
                    <FooterLink item={l as FooterNavLink} navigate={navigate} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <div className="border-t border-white/4">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <p className="text-[12px] text-[#3a4e65] leading-[1.75] max-w-4xl">
            <span className="text-[#4d6280] font-medium">Disclaimer. </span>
            {cfg.legal.disclaimer}
          </p>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-white/4 pb-safe">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center gap-x-6 gap-y-3 justify-between">
          {/* Copyright */}
          <span className="text-[11px] font-mono text-[#2d3d52] tracking-wide">
            © {year} {cfg.legal.copyrightName}. All rights reserved.
          </span>

          {/* Legal links */}
          <nav aria-label="Legal links" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {cfg.legal.links.map((l, i) => (
              <React.Fragment key={l.label}>
                {i > 0 && (
                  <span className="text-[#1e2d3d] select-none hidden sm:inline" aria-hidden>·</span>
                )}
                <button
                  onClick={l.route ? () => navigate(l.route as Route) : undefined}
                  className={cn(
                    "text-[11px] font-mono text-[#2d3d52] hover:text-[#4d6280] transition-colors",
                    !l.route && "cursor-default"
                  )}
                >
                  {l.label}
                </button>
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Extra mobile bottom clearance for fixed bottom nav */}
        <div className="h-16 md:hidden" aria-hidden />
      </div>
    </footer>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

export default function App() {
  const [nav, setNav] = useState<NavState>({ route: "home", checkPhase: "start" });

  const navigate = useCallback((route: Route, params?: Partial<NavState>) => {
    setNav({ route, checkPhase: "start", ...params });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const renderPage = () => {
    switch (nav.route) {
      case "home":
        return <HomePage navigate={navigate} hasActivations={ACTIVATIONS.length > 0} />;

      case "explore":
        return <ExplorePage navigate={navigate} initialCategory={nav.exploreCategory} fromFinding={nav.fromFinding} />;

      case "check":
        if (nav.checkPhase === "scan") return <CheckScanPage navigate={navigate} />;
        if (nav.checkPhase === "results") return <CheckResultsPage navigate={navigate} />;
        return <CheckStartPage navigate={navigate} />;

      case "agent":
        return <AgentProfilePage serviceId={nav.agentId || "svc-rangekeeper-01"} navigate={navigate} initialTab={nav.agentProfileTab} />;

      case "compare":
        return <ComparePage compareIds={nav.compareIds || []} navigate={navigate} />;

      case "try":
        return <TryAgentPage serviceId={nav.agentId || "svc-rangekeeper-01"} navigate={navigate} />;

      case "checkout":
        return <CheckoutPage serviceId={nav.agentId || "svc-rangekeeper-01"} jobIntentId={nav.jobIntentId} navigate={navigate} />;

      case "my-agents":
        return <MyAgentsPage navigate={navigate} initialTab={nav.myAgentsTab} />;

      case "plans":
        return <PlansPage navigate={navigate} />;

      case "plan-profile":
        return <PlanProfilePage planId={nav.planId || "plan-earn-protect"} navigate={navigate} />;

      case "outcomes":
      case "activity-page":
        return nav.executionId ? <ExecutionActivityOutcomesPage executionId={nav.executionId} navigate={navigate} /> : <MyAgentsPage navigate={navigate} initialTab={nav.route === "outcomes" ? "outcomes" : "activity"} />;

      case "operator":
        return <OperatorWorkspacePage navigate={navigate} />;

      default:
        return <HomePage navigate={navigate} hasActivations={false} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <GlobalNav nav={nav} navigate={navigate} activeAgents={ACTIVATIONS.length} />
      <main className="flex-1">
        {renderPage()}
      </main>
      <Footer navigate={navigate} />
      <MobileBottomNav nav={nav} navigate={navigate} />
    </div>
  );
}
