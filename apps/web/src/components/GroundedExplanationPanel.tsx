import React, { useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import type { GroundedExplanationRecord, GroundedExplanationStyle, GroundedExplanationSubjectType } from "../domain/types";
import { groundedExplanationRepository } from "../repositories/groundedExplanationRepository";

type Props = {
  subjectType: GroundedExplanationSubjectType;
  subjectId: string;
  contextId?: string;
  buyerAddress?: string;
  title?: string;
  defaultStyle?: GroundedExplanationStyle;
};

export function GroundedExplanationPanel({ subjectType, subjectId, contextId, buyerAddress, title = "Explain from evidence", defaultStyle = "PLAIN" }: Props) {
  const [record, setRecord] = useState<GroundedExplanationRecord>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [showFacts, setShowFacts] = useState(false);

  async function explain() {
    setBusy(true); setError(undefined);
    try {
      setRecord(await groundedExplanationRepository.explain({ subjectType, subjectId, contextId, buyerAddress, style: defaultStyle }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Spotriq could not generate this grounded explanation.");
    } finally { setBusy(false); }
  }

  const factById = new Map(record?.packet.facts.map((fact) => [fact.factId, fact]) ?? []);
  return <div className="rounded-xl border border-[#60a5fa]/15 bg-[#60a5fa]/[0.025] p-4 space-y-3">
    <div className="flex items-start justify-between gap-4">
      <div><div className="flex items-center gap-2 text-sm font-medium text-[#dde3ef]"><Sparkles className="w-4 h-4 text-[#60a5fa]"/>Grounded explanation</div><div className="text-[11px] text-[#6b7d99] mt-1">AI explains. Deterministic Spotriq resources still decide readiness, payment, authority, execution and outcomes.</div></div>
      {!record && <button disabled={busy} onClick={()=>void explain()} className="shrink-0 px-3 py-1.5 rounded-md border border-[#60a5fa]/25 text-xs text-[#93c5fd] disabled:opacity-50 flex items-center gap-1.5">{busy?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Sparkles className="w-3.5 h-3.5"/>}{busy?"Explaining…":title}</button>}
    </div>
    {error && <div className="text-xs text-[#fca5a5]">{error}</div>}
    {record && <>
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono"><span className="px-2 py-1 rounded bg-[#60a5fa]/10 text-[#93c5fd]">{record.state === "AI_GENERATED" ? `AI · ${record.model ?? "provider"}` : "DETERMINISTIC FALLBACK"}</span><span className="px-2 py-1 rounded bg-[#4ade80]/10 text-[#86efac]">GROUNDING {record.validation.state}</span><span className="text-[#52637b]">{record.packet.facts.length} cited facts</span></div>
      <div><div className="text-sm font-medium text-[#dde3ef]">{record.content.headline}</div><div className="mt-2 space-y-2">{record.content.summary.map((claim,i)=><Claim key={`s-${i}`} text={claim.text} factIds={claim.factIds} factById={factById}/>)}</div></div>
      {record.content.caveats.length>0 && <div className="border-t border-white/6 pt-3"><div className="text-[10px] uppercase font-mono text-[#f59e0b] mb-2">Caveats</div><div className="space-y-2">{record.content.caveats.map((claim,i)=><Claim key={`c-${i}`} text={claim.text} factIds={claim.factIds} factById={factById}/>)}</div></div>}
      <div className="border-t border-white/6 pt-3"><div className="text-[10px] uppercase font-mono text-[#2dd4bf] mb-1">Next review step</div><Claim text={record.content.nextStep.text} factIds={record.content.nextStep.factIds} factById={factById}/></div>
      <button onClick={()=>setShowFacts(v=>!v)} className="text-xs text-[#6b7d99] hover:text-[#9aacc4] flex items-center gap-1">{showFacts?<ChevronUp className="w-3 h-3"/>:<ChevronDown className="w-3 h-3"/>}{showFacts?"Hide grounding packet":"Show grounding packet"}</button>
      {showFacts && <div className="space-y-2 border-t border-white/6 pt-3">{record.packet.facts.map(fact=><div key={fact.factId} className="rounded border border-white/6 bg-black/10 p-2.5"><div className="flex items-start justify-between gap-3"><div><div className="text-[11px] text-[#9aacc4]">{fact.label}</div><div className="text-xs text-[#dde3ef] mt-0.5 break-words">{fact.value}</div></div><span className="text-[9px] font-mono text-[#52637b] shrink-0">{fact.kind}</span></div><div className="text-[9px] text-[#52637b] mt-1.5">{fact.provenance} · {fact.sourceName} · {fact.factId}</div>{fact.limitation&&<div className="text-[10px] text-[#d6a04a] mt-1">{fact.limitation}</div>}</div>)}</div>}
      <div className="flex items-center justify-between gap-3 text-[10px] text-[#52637b]"><span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3"/>No web/tools or write-back authority</span><button onClick={()=>void explain()} disabled={busy} className="hover:text-[#9aacc4]">Regenerate from current facts</button></div>
    </>}
  </div>;
}

function Claim({text,factIds,factById}:{text:string;factIds:string[];factById:Map<string,GroundedExplanationRecord["packet"]["facts"][number]>}) {
  const labels=factIds.map(id=>factById.get(id)?.label).filter((x):x is string=>Boolean(x));
  return <div className="text-xs text-[#9aacc4] leading-relaxed"><span>{text}</span>{labels.length>0&&<span className="ml-2 text-[9px] font-mono text-[#60a5fa]">[{labels.join(" · ")}]</span>}</div>;
}
