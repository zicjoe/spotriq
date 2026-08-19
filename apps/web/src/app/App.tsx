import React, { useState, useEffect, useCallback } from "react";
import {
  Activity, AlertCircle, AlertTriangle, ArrowLeft, ArrowRight,
  ArrowUpRight, Bell, Check, CheckCircle2, ChevronDown, ChevronRight,
  ChevronUp, Clock, Copy, ExternalLink, Eye, Filter, Home,
  Info, Lock, Menu, Minus, MoreHorizontal, Play, Plus,
  RefreshCw, Search, Shield, ShieldCheck, Sliders, Star,
  TrendingDown, TrendingUp, Wallet, X, Zap, BookOpen,
  CircleDot, Timer, Target, GitCompare, RotateCcw,
  Radio, Layers, BarChart2, PieChart, FileText
} from "lucide-react";


import type {
  Route, CheckPhase, ExploreCategory, MyAgentsTab, AgentProfileTab,
  CheckoutStep, ServiceCategory, ReadinessState, PermissionIntensity,
  FindingState, FindingSeverity, ActivationState, PermissionGrantState,
  EvidenceProvenance, NavState, AgentService, RebalancingMetrics,
  GridMetrics, YieldMetrics, HealthMetrics, Finding, Activation,
  PermissionGrant, ActivityEvent, CheckSourceProgress, SmartMoneyCheckEvent,
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
};

const PERMISSION_CONFIG: Record<PermissionIntensity, { label: string; color: string; bars: number }> = {
  "read-only": { label: "Read-only", color: "text-[#4ade80]", bars: 1 },
  low: { label: "Low authority", color: "text-[#4ade80]", bars: 1 },
  medium: { label: "Medium authority", color: "text-[#f59e0b]", bars: 2 },
  high: { label: "High authority", color: "text-[#f87171]", bars: 3 },
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
  const m = service.categoryMetrics;

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

// ─── PAGE: EXPLORE ────────────────────────────────────────────────────────────

function ExplorePage({ navigate, initialCategory }: { navigate: (r: Route, p?: Partial<NavState>) => void; initialCategory?: ExploreCategory }) {
  const [category, setCategory] = useState<ExploreCategory>(initialCategory || "all");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = category === "all" ? SERVICES : SERVICES.filter(s => s.category === category);

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

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7d99]" />
        <input className="w-full bg-[#1c2433] border border-white/8 rounded-lg pl-11 pr-4 py-3 text-sm text-[#dde3ef] placeholder:text-[#6b7d99] focus:outline-none focus:border-[#2dd4bf]/40 transition-colors"
          placeholder="e.g. USDT yield with low permissions and anytime liquidity" />
      </div>

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

          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[#6b7d99]">{filtered.length} services</span>
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
          </div>
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
    "PancakeSwap Infinity CL reads by known token ID", "Grid market context / agent matching as coverage expands"
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
  const m = service.categoryMetrics;

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
                      service.categoryMetrics.type === "rebalancing" ? "Manage LP position (add/remove liquidity, swap)" : "",
                      service.categoryMetrics.type === "grid" ? "Place and cancel orders on supported pairs" : "",
                      service.categoryMetrics.type === "yield" ? "Deposit and withdraw from supported yield protocols" : "",
                      service.categoryMetrics.type === "health" ? "Read position state from Venus Protocol" : "",
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

function CheckoutPage({ serviceId, navigate }: { serviceId: string; navigate: (r: Route, p?: Partial<NavState>) => void }) {
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

      <div className="flex gap-1 mb-6 border-b border-white/7 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors",
              tab === t.key ? "text-[#2dd4bf] border-[#2dd4bf]" : "text-[#6b7d99] border-transparent hover:text-[#9aacc4]")}>
            {t.label}
          </button>
        ))}
      </div>

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
        return <ExplorePage navigate={navigate} initialCategory={nav.exploreCategory} />;

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
        return <CheckoutPage serviceId={nav.agentId || "svc-rangekeeper-01"} navigate={navigate} />;

      case "my-agents":
        return <MyAgentsPage navigate={navigate} initialTab={nav.myAgentsTab} />;

      case "plans":
        return <PlansPage navigate={navigate} />;

      case "plan-profile":
        return <PlanProfilePage planId={nav.planId || "plan-earn-protect"} navigate={navigate} />;

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
