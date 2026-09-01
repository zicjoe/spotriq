const base=(process.env.SPOTRIQ_ACCEPTANCE_BASE_URL??"https://spotriq-production.up.railway.app").replace(/\/$/,"");
async function json(path,init){const r=await fetch(`${base}${path}`,init);let b;try{b=await r.json();}catch{b={};}if(!r.ok)throw new Error(`${path} returned HTTP ${r.status}: ${JSON.stringify(b)}`);return b.data;}
const {status}=await json("/v1/explanations/status");
if(status.state!=="AVAILABLE"||status.structuredOutputEnabled!==true||status.webSearchEnabled!==false||status.toolUseEnabled!==false||status.decisionAuthorityEnabled!==false||status.deterministicFallbackEnabled!==true)throw new Error("Grounded explanation status does not preserve the v0.33 safety contract.");
for(const key of ["financialTruthMutationEnabled","readinessMutationEnabled","permissionMutationEnabled","executionMutationEnabled","outcomeMutationEnabled"]){if(status[key]!==false)throw new Error(`Grounded explanation status unexpectedly enables ${key}.`);}
const subject={subjectType:"SERVICE",subjectId:"svc:reference:rangekeeper"};
const {packet}=await json("/v1/explanations/grounding",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(subject)});
if(!packet?.contentHash||!Array.isArray(packet.facts)||packet.facts.length<3)throw new Error("Grounding packet is missing deterministic facts.");
const ids=new Set(packet.facts.map(f=>f.factId));
if(ids.size!==packet.facts.length)throw new Error("Grounding packet fact IDs must be unique.");
if(!packet.facts.some(f=>f.kind==="NEXT_STEP"))throw new Error("Grounding packet must contain a deterministic next-review step.");
const {explanation}=await json("/v1/explanations",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...subject,style:"PLAIN"})});
if(!["AI_GENERATED","DETERMINISTIC_FALLBACK"].includes(explanation.state))throw new Error(`Unexpected explanation state ${explanation.state}.`);
if(explanation.validation?.state!=="PASS"&&explanation.validation?.state!=="REJECTED_TO_FALLBACK")throw new Error("Explanation validation state is invalid.");
if(explanation.packet?.contentHash!==packet.contentHash)throw new Error("Explanation was not generated from the same deterministic grounding packet.");
const claims=[...(explanation.content?.summary??[]),...(explanation.content?.caveats??[]),explanation.content?.nextStep].filter(Boolean);
if(!claims.length)throw new Error("Explanation contains no cited claims.");
for(const claim of claims){if(!Array.isArray(claim.factIds)||claim.factIds.length===0)throw new Error("Every explanation claim must cite at least one grounding fact.");for(const id of claim.factIds){if(!ids.has(id))throw new Error(`Explanation cited unknown fact ${id}.`);}}
const persisted=(await json(`/v1/explanations/${encodeURIComponent(explanation.explanationId)}`)).explanation;
if(persisted?.explanationId!==explanation.explanationId||persisted?.packet?.contentHash!==explanation.packet.contentHash)throw new Error("Grounded explanation did not persist consistently.");
const caps=await json("/v1/system/capabilities");
if(caps.groundedAiExplanationEnabled!==true||caps.groundedAiStructuredOutputEnabled!==true||caps.groundedAiWebSearchEnabled!==false||caps.groundedAiDecisionAuthorityEnabled!==false)throw new Error("System capabilities do not expose the v0.33 grounded-AI safety contract.");
console.log(`PASS svc:reference:rangekeeper: deterministic grounding packet → ${explanation.state} → citation validation → persisted explanation; externalProviderConfigured=${status.externalProviderConfigured}.`);
console.log("PASS: Spotriq v0.33 Grounded AI Explanation contract passed: explanations are constrained to deterministic fact packets with citation validation, deterministic fallback, and no decision/write authority.");
