import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Target } from "lucide-react";
import type { AgentAdvantageReport } from "@spotriq/domain";
import { ApiError } from "../api/client";
import { agentAdvantageRepository } from "../repositories/agentAdvantageRepository";

export function AgentAdvantageReportPanel({activationId}:{activationId:string}){
  const [report,setReport]=useState<AgentAdvantageReport>();
  const [loading,setLoading]=useState(true);
  const [syncing,setSyncing]=useState(false);
  const [error,setError]=useState<string>();
  const load=useCallback(async()=>{setLoading(true);setError(undefined);try{setReport(await agentAdvantageRepository.latest(activationId));}catch(cause){if(cause instanceof ApiError&&cause.status===404)setReport(undefined);else setError(cause instanceof Error?cause.message:"Could not load Agent Advantage report.");}finally{setLoading(false);}},[activationId]);
  useEffect(()=>{void load();},[load]);
  const sync=async()=>{setSyncing(true);setError(undefined);try{setReport(await agentAdvantageRepository.sync(activationId));}catch(cause){setError(cause instanceof Error?cause.message:"Could not measure Agent Advantage.");}finally{setSyncing(false);}};
  if(loading)return <div className="rounded-lg border border-white/7 bg-white/[0.02] p-4 text-xs text-[#6b7d99] flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin"/>Loading Agent Advantage report…</div>;
  return <div className="rounded-lg border border-white/7 bg-white/[0.02] p-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-medium text-[#dde3ef]"><Target className="w-4 h-4 text-[#2dd4bf]"/>Agent Advantage</div><div className="text-[10px] text-[#52637b] mt-1">Deterministic measurement. Service contribution ≠ transaction ≠ financial outcome ≠ Agent Advantage.</div></div><button onClick={()=>void sync()} disabled={syncing} className="px-3 py-1.5 rounded-md border border-white/10 text-xs text-[#9aacc4] hover:text-[#dde3ef] disabled:opacity-50 flex items-center gap-1.5">{syncing?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<RefreshCw className="w-3.5 h-3.5"/>}{report?"Refresh measurement":"Measure advantage"}</button></div>
    {error&&<div className="text-xs text-[#f87171]">{error}</div>}
    {!report&&!error&&<div className="text-xs text-[#6b7d99]">No persisted report exists yet. Measuring reconciles the latest Activation Activity & Outcomes evidence without inventing performance.</div>}
    {report&&<>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <Metric label="Service contribution" value={report.serviceContribution.value} tone={report.serviceContribution.state==="OBSERVED"?"good":report.serviceContribution.state==="FAILED"?"bad":"muted"}/>
        <Metric label="Transaction evidence" value={report.transactionEvidence.value} tone={report.transactionEvidence.observed?"good":"muted"}/>
        <Metric label="Financial outcome" value={report.financialOutcome.value} tone={report.financialOutcome.state==="MEASURED"?"good":"warn"}/>
        <Metric label="Agent Advantage" value={report.agentAdvantage.value} tone={report.agentAdvantage.state==="MEASURED"?"good":"warn"}/>
      </div>
      <div className="text-xs text-[#6b7d99]">{report.agentAdvantage.detail}</div>
      <div className="rounded-md border border-white/6 p-3"><div className="text-[10px] uppercase font-mono text-[#6b7d99]">Measurement window</div><div className="text-xs text-[#9aacc4] mt-1">{new Date(report.window.startedAt).toLocaleString()} → {new Date(report.window.endedAt).toLocaleString()} · {report.window.basis.replaceAll("_"," ").toLowerCase()}</div></div>
      <div className="text-[11px] text-[#9aacc4]"><span className="text-[#6b7d99]">Next evidence step:</span> {report.nextMeasurementStep}</div>
      <div className="text-[10px] text-[#52637b]">Could Not Assess is intentional when attribution, transaction evidence, history or comparison evidence is insufficient.</div>
    </>}
  </div>;
}
function Metric({label,value,tone}:{label:string;value:string;tone:"good"|"warn"|"bad"|"muted"}){
  const cls=tone==="good"?"text-[#4ade80]":tone==="warn"?"text-[#f59e0b]":tone==="bad"?"text-[#f87171]":"text-[#9aacc4]";
  return <div className="rounded-md border border-white/6 p-3"><div className="text-[10px] uppercase font-mono text-[#6b7d99]">{label}</div><div className={`text-xs mt-1 ${cls}`}>{value}</div></div>;
}
