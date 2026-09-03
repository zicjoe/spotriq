import { useState } from "react";
import type { ServiceCategory } from "../domain/types";
import { adoptionAnalyticsRepository, type FeedbackContext } from "../repositories/adoptionAnalyticsRepository";
export function AdoptionFeedbackPrompt({context,serviceId,category,prompt="Was this useful?"}:{context:FeedbackContext;serviceId?:string;category?:ServiceCategory;prompt?:string}){
  const [sent,setSent]=useState(false);const [busy,setBusy]=useState(false);
  if(sent)return <div className="text-[11px] text-[#6b7d99]">Thanks — feedback is recorded separately from Spotriq's deterministic decision state.</div>;
  const submit=async(score:1|5,reasonCode:"USEFUL"|"NOT_USEFUL")=>{setBusy(true);try{await adoptionAnalyticsRepository.feedback(context,{serviceId,category,score,reasonCode});setSent(true);}catch{/* Feedback must never block the product flow. */}finally{setBusy(false);}};
  return <div className="rounded-md border border-white/6 bg-black/10 p-3"><div className="text-xs text-[#8090a8]">{prompt}</div><div className="flex gap-2 mt-2"><button disabled={busy} onClick={()=>void submit(5,"USEFUL")} className="px-2.5 py-1 rounded border border-white/10 text-xs text-[#9aacc4]">Yes</button><button disabled={busy} onClick={()=>void submit(1,"NOT_USEFUL")} className="px-2.5 py-1 rounded border border-white/10 text-xs text-[#9aacc4]">Not really</button></div></div>;
}
