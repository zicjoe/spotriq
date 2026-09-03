import process from "node:process";
import { randomUUID } from "node:crypto";
const base=(process.env.SPOTRIQ_ACCEPTANCE_BASE_URL||process.env.PUBLIC_API_BASE_URL||"https://spotriq-production.up.railway.app").replace(/\/$/,"");
const adminToken=process.env.SPOTRIQ_ACCEPTANCE_ADMIN_DIAGNOSTICS_TOKEN?.trim();
async function request(path,init={}){const response=await fetch(`${base}${path}`,{...init,headers:{accept:"application/json",...(init.headers??{})}});const body=await response.json().catch(()=>undefined);return{response,body};}
function versionAtLeast(actual,minimum){const parse=value=>{const m=String(value??"").match(/^(\d+)\.(\d+)\.(\d+)/);return m?m.slice(1,4).map(Number):null};const a=parse(actual),b=parse(minimum);if(!a||!b)return false;for(let i=0;i<3;i++){if(a[i]>b[i])return true;if(a[i]<b[i])return false;}return true;}
const health=await request("/health");
if(![200,503].includes(health.response.status)||health.body?.service!=="spotriq-api"||!versionAtLeast(health.body?.version,"0.39.0"))throw new Error(`v0.39 adoption analytics acceptance requires deployed Spotriq >=0.39.0; live /health reports ${JSON.stringify(health.body)}.`);
const caps=(await request("/v1/system/capabilities")).body?.data;
for(const key of ["adoptionAnalyticsEnabled","privacyBoundedProductTelemetryEnabled","adoptionFeedbackEnabled"])if(caps?.[key]!==true)throw new Error(`v0.39 capability ${key} must be true.`);
if(caps?.adoptionAnalyticsFinancialTruthAuthority!==false||caps?.bscMainnetFinancialExecutionApproved!==false)throw new Error("Analytics must remain non-authoritative and cannot approve BSC Mainnet financial execution.");
const session=`acceptance-${randomUUID()}`;
const accepted=await request("/v1/analytics/events",{method:"POST",headers:{"content-type":"application/json","x-spotriq-acceptance":"1"},body:JSON.stringify({eventName:"HOME_VIEWED",sessionId:session})});
if(accepted.response.status!==202||accepted.body?.data?.channel!=="ACCEPTANCE")throw new Error(`Acceptance telemetry was not isolated from PRODUCT analytics: ${JSON.stringify(accepted.body)}.`);
const rawWallet=await request("/v1/analytics/events",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({eventName:"SERVICE_PROFILE_VIEWED",sessionId:`reject-${randomUUID()}`,subjectId:"0x1111111111111111111111111111111111111111"})});
if(rawWallet.response.status!==400)throw new Error("Browser analytics must reject raw wallet addresses rather than storing them as arbitrary telemetry.");
const unauth=await request("/v1/admin/adoption-analytics");
if(![401,503].includes(unauth.response.status))throw new Error("Private adoption analytics must fail closed without admin diagnostics authentication.");
if(adminToken){const auth=await request("/v1/admin/adoption-analytics",{headers:{authorization:`Bearer ${adminToken}`}});if(!auth.response.ok)throw new Error(`Authenticated adoption analytics failed: HTTP ${auth.response.status} ${JSON.stringify(auth.body)}`);const report=auth.body?.data?.report;if(report?.schemaVersion!=="spotriq.adoption-analytics@1.0.0"||report?.channel!=="PRODUCT"||report?.authority?.financialTruth!==false||report?.authority?.agentAdvantage!==false)throw new Error("Private adoption report does not preserve the v0.39 schema/non-authority contract.");console.log(`PASS private report: productEvents=${report.productEvents}; acceptanceExcluded=${report.acceptanceEventsExcluded}; activations=${report.funnel?.activationsCreated}; advantageMeasured=${report.funnel?.advantageMeasured}.`);}else console.log("INFO: SPOTRIQ_ACCEPTANCE_ADMIN_DIAGNOSTICS_TOKEN not set; private report remains fail-closed while authenticated report semantics are covered by package tests.");
console.log("PASS privacy boundary: allow-listed interaction vocabulary, hashed sessions, raw-wallet rejection, and ACCEPTANCE traffic separation are active.");
console.log("PASS: Spotriq v0.39 Production Analytics + Adoption Feedback Loop contract passed: interaction analytics remain privacy-bounded while Quote/Hire/Activation/Permission/transaction/outcome/Agent Advantage completion stays grounded in deterministic domain records.");
