import { createHash } from "node:crypto";

const base=(process.env.SPOTRIQ_ACCEPTANCE_BASE_URL??"https://spotriq-production.up.railway.app").replace(/\/$/,"");
async function json(path,init){const r=await fetch(`${base}${path}`,init);let b;try{b=await r.json();}catch{b={};}if(!r.ok)throw new Error(`${path} returned HTTP ${r.status}: ${JSON.stringify(b)}`);return b.data;}
function originalSubjectOrder(subject){return {type:subject.type,id:subject.id,contextId:subject.contextId,buyerAddress:subject.buyerAddress};}
function originalFactOrder(fact){return {factId:fact.factId,kind:fact.kind,label:fact.label,value:fact.value,provenance:fact.provenance,sourceName:fact.sourceName,observedAt:fact.observedAt,methodVersion:fact.methodVersion,evidenceIds:fact.evidenceIds,limitation:fact.limitation};}
function contentHash(packet){
  // grounded-ai.packet@1.0.0 was hashed with JSON.stringify over the builder's insertion order.
  // PostgreSQL jsonb preserves values but not object-key order, so reconstruct that schema order
  // before recomputing the accepted packet hash from a persisted payload. Undefined optional
  // fields are intentionally retained here because JSON.stringify omits them exactly as the
  // original PacketBuilder did.
  const material={
    subject:originalSubjectOrder(packet.subject),
    facts:packet.facts.map(originalFactOrder),
    limitations:packet.limitations,
    methodVersion:packet.methodVersion,
  };
  return createHash("sha256").update(JSON.stringify(material)).digest("hex");
}
function validatePacket(packet,label){
  if(!packet?.contentHash||!packet?.packetId||!packet?.subject||!Array.isArray(packet.facts)||packet.facts.length<3)throw new Error(`${label} is missing deterministic grounding facts.`);
  if(packet.contentHash!==contentHash(packet))throw new Error(`${label} contentHash does not match its deterministic subject/facts/limitations payload.`);
  if(packet.packetId!==`gpacket:${packet.contentHash.slice(0,32)}`)throw new Error(`${label} packetId is not derived from its deterministic contentHash.`);
  const ids=new Set(packet.facts.map(f=>f.factId));
  if(ids.size!==packet.facts.length)throw new Error(`${label} fact IDs must be unique.`);
  if(!packet.facts.some(f=>f.kind==="NEXT_STEP"))throw new Error(`${label} must contain a deterministic next-review step.`);
  return ids;
}
const {status}=await json("/v1/explanations/status");
if(status.state!=="AVAILABLE"||status.structuredOutputEnabled!==true||status.webSearchEnabled!==false||status.toolUseEnabled!==false||status.decisionAuthorityEnabled!==false||status.deterministicFallbackEnabled!==true)throw new Error("Grounded explanation status does not preserve the v0.33 safety contract.");
for(const key of ["financialTruthMutationEnabled","readinessMutationEnabled","permissionMutationEnabled","executionMutationEnabled","outcomeMutationEnabled"]){if(status[key]!==false)throw new Error(`Grounded explanation status unexpectedly enables ${key}.`);}
const subject={subjectType:"SERVICE",subjectId:"svc:reference:rangekeeper"};
const {packet:previewPacket}=await json("/v1/explanations/grounding",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(subject)});
validatePacket(previewPacket,"Grounding preview packet");
const {explanation}=await json("/v1/explanations",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...subject,style:"PLAIN"})});
if(!["AI_GENERATED","DETERMINISTIC_FALLBACK"].includes(explanation.state))throw new Error(`Unexpected explanation state ${explanation.state}.`);
if(explanation.validation?.state!=="PASS"&&explanation.validation?.state!=="REJECTED_TO_FALLBACK")throw new Error("Explanation validation state is invalid.");
const explanationPacket=explanation.packet;
const ids=validatePacket(explanationPacket,"Explanation grounding packet");
if(explanationPacket.subject?.type!==subject.subjectType||explanationPacket.subject?.id!==subject.subjectId)throw new Error("Explanation was generated for a different deterministic subject than requested.");
if(explanationPacket.methodVersion!==previewPacket.methodVersion)throw new Error("Grounding preview and explanation packet use different grounding method versions.");
const claims=[...(explanation.content?.summary??[]),...(explanation.content?.caveats??[]),explanation.content?.nextStep].filter(Boolean);
if(!claims.length)throw new Error("Explanation contains no cited claims.");
for(const claim of claims){if(!Array.isArray(claim.factIds)||claim.factIds.length===0)throw new Error("Every explanation claim must cite at least one grounding fact.");for(const id of claim.factIds){if(!ids.has(id))throw new Error(`Explanation cited unknown fact ${id}.`);}}
const persisted=(await json(`/v1/explanations/${encodeURIComponent(explanation.explanationId)}`)).explanation;
if(persisted?.explanationId!==explanation.explanationId||persisted?.packet?.contentHash!==explanationPacket.contentHash)throw new Error("Grounded explanation did not persist consistently.");
if(persisted?.packet?.contentHash!==contentHash(persisted.packet))throw new Error("Persisted explanation packet contentHash is not self-consistent.");
const caps=await json("/v1/system/capabilities");
if(caps.groundedAiExplanationEnabled!==true||caps.groundedAiStructuredOutputEnabled!==true||caps.groundedAiWebSearchEnabled!==false||caps.groundedAiDecisionAuthorityEnabled!==false)throw new Error("System capabilities do not expose the v0.33 grounded-AI safety contract.");
if(previewPacket.contentHash!==explanationPacket.contentHash)console.log("INFO: grounding preview and explanation used distinct live deterministic snapshots; both packet hashes validated independently. This is expected when readiness/evidence timestamps change between requests.");
console.log(`PASS svc:reference:rangekeeper: deterministic grounding packet → ${explanation.state} → citation validation → persisted explanation; externalProviderConfigured=${status.externalProviderConfigured}.`);
console.log("PASS: Spotriq v0.33 Grounded AI Explanation contract passed: explanations are constrained to deterministic fact packets with citation validation, deterministic fallback, and no decision/write authority.");
