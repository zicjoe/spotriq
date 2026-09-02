import React, { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, ShieldCheck, Network, FileCheck2, AlertTriangle } from "lucide-react";
import type { PublicAdoptionManifest } from "@spotriq/adoption-readiness";
import type { NavState, Route } from "../domain/types";
import { adoptionReadinessRepository } from "../repositories/adoptionReadinessRepository";

const card="rounded-xl border border-white/8 bg-[#111824]";

export function LaunchReadinessPage({navigate}:{navigate:(route:Route,params?:Partial<NavState>)=>void}){
  const [manifest,setManifest]=useState<PublicAdoptionManifest>();
  const [error,setError]=useState<string>();
  useEffect(()=>{let active=true;void adoptionReadinessRepository.getPublicManifest().then(value=>{if(active)setManifest(value)}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:"Public adoption manifest is unavailable.")});return()=>{active=false}},[]);
  return <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
    <button onClick={()=>navigate("home")} className="text-sm text-[#6b7d99] hover:text-[#9aacc4] flex items-center gap-2"><ArrowLeft className="w-4 h-4"/>Back to Spotriq</button>
    <div className="space-y-3">
      <div className="text-[11px] uppercase tracking-wider font-mono text-[#f0b90b]">BNB ecosystem adoption package</div>
      <h1 className="text-3xl md:text-4xl font-semibold text-[#dde3ef]">How Spotriq fits the BSC financial-agent stack</h1>
      <p className="text-[#6b7d99] max-w-3xl">A public, machine-readable view of Spotriq's protocol integrations, trust boundaries, network policy and launch evidence. Operational or ecosystem integration status never upgrades financial authority.</p>
    </div>
    {error&&<div className={`${card} p-4 text-sm text-[#f87171]`}>{error}</div>}
    {!manifest&&!error&&<div className={`${card} p-5 text-sm text-[#6b7d99]`}>Loading public adoption manifest…</div>}
    {manifest&&<>
      <div className="grid md:grid-cols-3 gap-4">
        <div className={`${card} p-5`}><FileCheck2 className="w-5 h-5 text-[#2dd4bf]"/><div className="mt-3 text-xs text-[#6b7d99]">Release</div><div className="text-lg font-semibold text-[#dde3ef]">v{manifest.release.version}</div><div className="text-xs font-mono text-[#2dd4bf] mt-1">{manifest.release.status}</div></div>
        <div className={`${card} p-5`}><Network className="w-5 h-5 text-[#60a5fa]"/><div className="mt-3 text-xs text-[#6b7d99]">Discovery</div><div className="text-lg font-semibold text-[#dde3ef]">BSC Mainnet</div><div className="text-xs text-[#6b7d99] mt-1">chainId {manifest.networks.discovery.chainId} · ERC-8004 discovery</div></div>
        <div className={`${card} p-5`}><ShieldCheck className="w-5 h-5 text-[#a78bfa]"/><div className="mt-3 text-xs text-[#6b7d99]">Financial development</div><div className="text-lg font-semibold text-[#dde3ef]">BSC Testnet</div><div className="text-xs text-[#6b7d99] mt-1">Mainnet execution approved: <span className="text-[#f59e0b]">No</span></div></div>
      </div>
      <section className={`${card} overflow-hidden`}>
        <div className="p-5 border-b border-white/7"><h2 className="font-semibold text-[#dde3ef]">BNB + protocol integration map</h2><p className="text-xs text-[#6b7d99] mt-1">Each row states what the integration does and what it cannot prove.</p></div>
        <div className="divide-y divide-white/6">{manifest.integrations.map(item=><div key={item.code} className="p-5 grid md:grid-cols-[180px_1fr] gap-4"><div><div className="text-sm font-medium text-[#dde3ef]">{item.label}</div><div className="text-[10px] font-mono text-[#2dd4bf] mt-1">{item.state}</div>{item.officialReference&&<a className="inline-flex items-center gap-1 text-[11px] text-[#60a5fa] mt-2 hover:underline" href={item.officialReference} target="_blank" rel="noreferrer">Official reference <ExternalLink className="w-3 h-3"/></a>}</div><div><p className="text-sm text-[#9aacc4]">{item.role}</p><p className="text-xs text-[#6b7d99] mt-2"><span className="text-[#f59e0b]">Boundary:</span> {item.boundary}</p></div></div>)}</div>
      </section>
      <section className="grid md:grid-cols-2 gap-4">
        <div className={`${card} p-5`}><h2 className="font-semibold text-[#dde3ef]">Truth boundaries</h2><div className="mt-4 space-y-2">{manifest.truthBoundaries.map(boundary=><div key={boundary} className="flex gap-2 text-xs text-[#9aacc4]"><CheckCircle2 className="w-4 h-4 text-[#2dd4bf] shrink-0"/><span>{boundary}</span></div>)}</div></div>
        <div className={`${card} p-5`}><h2 className="font-semibold text-[#dde3ef]">External launch items</h2><div className="mt-4 space-y-2">{manifest.readiness.unresolvedExternalItems.map(item=><div key={item} className="flex gap-2 text-xs text-[#9aacc4]"><AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0"/><span>{item}</span></div>)}</div><p className="text-[11px] text-[#52637b] mt-4">These are deliberately visible so a polished launch package cannot masquerade as evidence that has not yet been captured.</p></div>
      </section>
    </>}
  </div>;
}
