import { useEffect, useState } from "react";
import type { PublicOperationalHealthSnapshot } from "../domain/types";
import { systemHealthRepository } from "../repositories/systemHealthRepository";

export function SystemHealthIndicator(){
  const [health,setHealth]=useState<PublicOperationalHealthSnapshot>();
  const [failed,setFailed]=useState(false);
  useEffect(()=>{let active=true;void systemHealthRepository.getPublic().then(value=>{if(active){setHealth(value);setFailed(false);}}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[]);
  if(failed)return <div className="text-[10px] font-mono text-[#6b7d99]">System status unavailable</div>;
  if(!health)return <div className="text-[10px] font-mono text-[#3d5070]">Checking system status…</div>;
  const platformOk=health.platformState==="OPERATIONAL";
  const marketOk=health.marketplaceState==="OPERATIONAL";
  return <div className="rounded border border-white/6 bg-white/[0.02] px-2.5 py-2 max-w-[240px]" title="Operational health is separate from agent readiness, trust, payment, permission and financial outcomes.">
    <div className="flex items-center gap-2 text-[10px] font-mono">
      <span className={`w-1.5 h-1.5 rounded-full ${platformOk?"bg-[#4ade80]":"bg-[#f59e0b]"}`}/>
      <span className="text-[#5a6d88]">Platform {health.platformState.toLowerCase()}</span>
    </div>
    <div className="flex items-center gap-2 text-[10px] font-mono mt-1">
      <span className={`w-1.5 h-1.5 rounded-full ${marketOk?"bg-[#4ade80]":health.marketplaceState==="NOT_CONFIGURED"?"bg-[#6b7d99]":"bg-[#f59e0b]"}`}/>
      <span className="text-[#5a6d88]">Marketplace {health.marketplaceState.toLowerCase().replaceAll("_"," ")}</span>
    </div>
    <div className="text-[9px] text-[#3d5070] mt-1.5">Operational only — not an agent trust/readiness score.</div>
  </div>;
}
