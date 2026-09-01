const base=(process.env.SPOTRIQ_ACCEPTANCE_BASE_URL??"https://spotriq-production.up.railway.app").replace(/\/$/,"");
async function json(path,init){const r=await fetch(`${base}${path}`,init);let b;try{b=await r.json();}catch{b={};}if(!r.ok)throw new Error(`${path} returned HTTP ${r.status}: ${JSON.stringify(b)}`);return b.data;}
const {status}=await json("/v1/agent-studio/status");
if(status.integration!=="BNB Agent Studio"||status.mode!=="NORMALIZED_ADAPTER")throw new Error("Agent Studio normalized integration status is not active.");
for(const p of ["A2A","MCP","X402","ERC8183"])if(!status.supportedProtocols.includes(p))throw new Error(`Agent Studio status is missing ${p}.`);
for(const t of ["bnb","aws","azure"])if(!status.supportedDeploymentTargets.includes(t))throw new Error(`Agent Studio status is missing deployment target ${t}.`);
if(status.operatorImportRequiresSignedSession!==true||status.operatorImportRequiresCanonicalOwner!==true)throw new Error("Agent Studio import must require signed operator auth plus canonical owner verification.");
if(status.studioCliDispatchEnabled!==false||status.marketplaceReadinessOverrideEnabled!==false||status.paymentOrExecutionDispatchEnabled!==false)throw new Error("Agent Studio integration must not shell out, override readiness, or dispatch payment/execution.");
const caps=await json("/v1/system/capabilities");
if(caps.agentStudioIntegrationEnabled!==true||caps.agentStudioDeploymentReconciliationEnabled!==true||caps.agentStudioCliDispatchEnabled!==false)throw new Error("System capabilities do not expose the v0.32 Agent Studio safety contract.");
const unauthorized=await fetch(`${base}/v1/operator/agent-studio/deployments`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({})});
if(unauthorized.ok)throw new Error("Unauthenticated Agent Studio import unexpectedly succeeded.");
console.log("PASS: Spotriq v0.32 BNB Agent Studio normalized integration contract passed: canonical-owner/operator reconciliation is enabled while Studio CLI, readiness override and payment/execution dispatch remain disabled.");
