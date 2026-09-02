import process from "node:process";

const base=(process.env.SPOTRIQ_ACCEPTANCE_BASE_URL||process.env.PUBLIC_API_BASE_URL||"https://spotriq-production.up.railway.app").replace(/\/$/,"");
async function request(path,init){const response=await fetch(`${base}${path}`,{...init,headers:{accept:"application/json",...(init?.body?{"content-type":"application/json"}:{}),...(init?.headers||{})}});const body=await response.json().catch(()=>undefined);return{response,body};}
async function data(path,init){const {response,body}=await request(path,init);if(!response.ok)throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`);return body?.data;}
function versionAtLeast(actual,minimum){const parse=value=>{const match=String(value??"").match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);return match?match.slice(1,4).map(Number):null;};const a=parse(actual),m=parse(minimum);if(!a||!m)return false;for(let i=0;i<3;i++){if(a[i]>m[i])return true;if(a[i]<m[i])return false;}return true;}

const {response:legacyResponse,body:legacy}=await request("/health");
if(![200,503].includes(legacyResponse.status))throw new Error(`/health returned unexpected HTTP ${legacyResponse.status}: ${JSON.stringify(legacy)}`);
if(legacy?.service!=="spotriq-api"||!versionAtLeast(legacy?.version,"0.35.0")||!["ok","degraded"].includes(legacy?.status)||!Array.isArray(legacy?.dependencies))throw new Error(`Railway /health no longer exposes the compatible direct API/database/BSC health contract required since v0.35; live payload=${JSON.stringify(legacy)}.`);
if((legacy.status==="ok"&&legacyResponse.status!==200)||(legacy.status==="degraded"&&legacyResponse.status!==503))throw new Error(`Railway /health HTTP/status mismatch: HTTP ${legacyResponse.status} with status=${legacy.status}.`);

const health=(await data("/v1/system/health"))?.health;
if(!health||health.visibility!=="PUBLIC"||health.methodVersion!=="marketplace.operational-health@1.0.0")throw new Error("Public system health did not expose the v0.35 operational snapshot contract.");
if(health.operationalOnly!==true||health.marketplaceReadinessAuthority!==false||health.financialReadinessAuthority!==false||health.trustAuthority!==false||health.paymentAuthority!==false||health.permissionAuthority!==false||health.executionAuthority!==false||health.outcomeAuthority!==false)throw new Error("Operational health must remain non-authoritative for readiness/trust/payment/permission/execution/outcome truth.");
if(!["OPERATIONAL","DEGRADED","UNAVAILABLE"].includes(health.platformState))throw new Error(`Unexpected platformState ${health.platformState}.`);
if(!["OPERATIONAL","DEGRADED","UNAVAILABLE","NOT_CONFIGURED"].includes(health.marketplaceState))throw new Error(`Unexpected marketplaceState ${health.marketplaceState}.`);
const required=["API","DATABASE","BSC_RPC","MARKETPLACE_TEST_LAB","AGENT_RUNTIME","PAYMENT_RAILS","AGENT_STUDIO","WORKER_JOBS"];
const components=health.components??[];for(const code of required){const item=components.find(component=>component?.code===code);if(!item)throw new Error(`Public operational health is missing ${code}.`);if(!["OK","DEGRADED","UNAVAILABLE","NOT_CONFIGURED","UNKNOWN"].includes(item.state))throw new Error(`${code} has invalid state ${item.state}.`);if("diagnostics" in item)throw new Error(`Public ${code} leaked admin diagnostics.`);}
if(JSON.stringify(health).match(/api[-_]?key=|password=|secret=/i))throw new Error("Public operational health appears to expose secret-shaped diagnostic material.");

const caps=await data("/v1/system/capabilities");
if(caps.operationalObservabilityEnabled!==true||caps.publicSystemHealthEnabled!==true||caps.operationalHealthMarketplaceReadinessAuthority!==false||caps.operationalHealthFinancialReadinessAuthority!==false)throw new Error("System capabilities do not expose the v0.35 observability truth boundary.");

const unauth=await request("/v1/admin/observability");
if(unauth.response.ok)throw new Error("Admin observability endpoint must fail closed without an admin bearer token.");
if(![401,503].includes(unauth.response.status))throw new Error(`Admin diagnostics fail-closed response should be 401 or 503, got ${unauth.response.status}.`);

const adminToken=String(process.env.SPOTRIQ_ACCEPTANCE_ADMIN_DIAGNOSTICS_TOKEN||process.env.SPOTRIQ_ADMIN_DIAGNOSTICS_TOKEN||"").trim();
if(adminToken){
  const headers={authorization:`Bearer ${adminToken}`};
  const admin=(await data("/v1/admin/observability",{headers}))?.health;
  if(!admin?.components?.some(component=>Array.isArray(component.diagnostics)))throw new Error("Authenticated admin observability did not expose diagnostic details.");
  const saved=(await data("/v1/admin/observability/snapshots",{method:"POST",headers,body:"{}"}))?.health;
  if(!saved?.snapshotId)throw new Error("Admin observability snapshot was not persisted.");
  const history=(await data("/v1/admin/observability/snapshots?limit=5",{headers}))?.history;
  if(!history?.snapshots?.some(snapshot=>snapshot.snapshotId===saved.snapshotId))throw new Error("Persisted admin operational snapshot is missing from history.");
  console.log(`PASS admin diagnostics: authenticated snapshot ${saved.snapshotId} persisted without changing marketplace/financial authority.`);
}else{
  console.log("INFO: no admin diagnostics token supplied to the verifier; fail-closed admin access was verified. Set SPOTRIQ_ACCEPTANCE_ADMIN_DIAGNOSTICS_TOKEN to exercise authenticated snapshot/history persistence.");
}

console.log(`PASS public health: platform=${health.platformState}; marketplace=${health.marketplaceState}; components=${components.map(component=>`${component.code}:${component.state}`).join(", ")}.`);
console.log("PASS: Spotriq v0.35 Observability + Marketplace/System Health contract passed: operational health is structured/redacted, admin diagnostics fail closed, provider degradation is visible, and health cannot become readiness, trust, payment, permission, execution or outcome authority.");
