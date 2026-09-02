import process from "node:process";

const base=(process.env.SPOTRIQ_ACCEPTANCE_BASE_URL||process.env.PUBLIC_API_BASE_URL||"https://spotriq-production.up.railway.app").replace(/\/$/,"");
async function request(path,init={}){const response=await fetch(`${base}${path}`,{...init,headers:{accept:"application/json",...(init.body?{"content-type":"application/json"}:{}),...(init.headers||{})}});const body=await response.json().catch(()=>undefined);return{response,body};}
async function data(path,init){const {response,body}=await request(path,init);if(!response.ok)throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`);return body?.data;}
function versionAtLeast(actual,minimum){const parse=value=>{const match=String(value??"").match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);return match?match.slice(1,4).map(Number):null;};const a=parse(actual),m=parse(minimum);if(!a||!m)return false;for(let i=0;i<3;i++){if(a[i]>m[i])return true;if(a[i]<m[i])return false;}return true;}

const {response:healthResponse,body:health}=await request("/health");
if(![200,503].includes(healthResponse.status))throw new Error(`Railway /health returned unexpected HTTP ${healthResponse.status}: ${JSON.stringify(health)}`);
if(health?.service!=="spotriq-api"||!versionAtLeast(health?.version,"0.36.0")||!["ok","degraded"].includes(health?.status)||!Array.isArray(health?.dependencies))throw new Error(`v0.36 security acceptance requires a deployed Spotriq API >=0.36.0; live /health reports ${JSON.stringify(health)}. Deploy the current v0.36 repository before running this live verifier.`);
if((health.status==="ok"&&healthResponse.status!==200)||(health.status==="degraded"&&healthResponse.status!==503))throw new Error(`Railway /health HTTP/status mismatch: HTTP ${healthResponse.status} with status=${health.status}.`);

const caps=await data("/v1/system/capabilities");
const requiredTrue=["securityFailureHardeningEnabled","ssrfPinnedTransportEnabled","maliciousMetadataValidationEnabled","rpcResponseValidationEnabled","rpcDivergenceDetectionEnabled","paymentReplayRaceProtectionEnabled","activationIdempotencyClaimEnabled"];
for(const key of requiredTrue)if(caps?.[key]!==true)throw new Error(`System capabilities must expose ${key}=true for v0.36.`);
if(caps?.runtimeFailureInjectionEndpointEnabled!==false)throw new Error("Failure injection must remain test/verifier-only; runtimeFailureInjectionEndpointEnabled must be false.");
if(caps?.paymentSettlementDispatchEnabled!==false||caps?.agentStudioCliDispatchEnabled!==false||caps?.groundedAiDecisionAuthorityEnabled!==false)throw new Error("Security hardening must not enable payment, Studio CLI, or AI decision dispatch.");

const publicHealth=(await data("/v1/system/health"))?.health;
if(!publicHealth||publicHealth.visibility!=="PUBLIC"||publicHealth.operationalOnly!==true)throw new Error("Public operational health contract is missing during v0.36 verification.");
for(const key of ["marketplaceReadinessAuthority","financialReadinessAuthority","trustAuthority","paymentAuthority","permissionAuthority","executionAuthority","outcomeAuthority"])if(publicHealth[key]!==false)throw new Error(`Operational health must keep ${key}=false under v0.36.`);
const rpc=publicHealth.components?.find(component=>component?.code==="BSC_RPC");
if(!rpc)throw new Error("Public health must retain the BSC_RPC operational component.");
if(!["OK","DEGRADED","UNAVAILABLE","NOT_CONFIGURED","UNKNOWN"].includes(rpc.state))throw new Error(`Unexpected BSC_RPC operational state ${rpc.state}.`);
if("diagnostics" in rpc)throw new Error("Public BSC_RPC health leaked admin diagnostics.");

// A production chaos/failure-injection route would itself become a dangerous control plane.
// The v0.36 contract deliberately keeps hostile injection in tests/verifiers only.
const injection=await request("/v1/admin/failure-injection",{method:"POST",body:JSON.stringify({fault:"rpc_divergence"})});
if(injection.response.status!==404)throw new Error(`Production failure-injection endpoint must not exist; expected 404, got ${injection.response.status}.`);

console.log(`PASS v0.36 capabilities: ${requiredTrue.join(", ")}; runtimeFailureInjectionEndpointEnabled=false.`);
console.log(`PASS operational boundary: BSC_RPC=${rpc.state}; public health remains non-authoritative and redacted; production failure-injection endpoint is absent.`);
console.log("PASS: Spotriq v0.36 Security + Failure Injection Hardening contract passed: hostile URLs/metadata/provider payloads, RPC divergence, payment replay races and Activation idempotency races are hardened while injected faults remain test-only and all financial/marketplace authority boundaries stay closed.");
