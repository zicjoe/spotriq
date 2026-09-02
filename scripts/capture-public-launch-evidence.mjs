import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const base=(process.env.SPOTRIQ_ACCEPTANCE_BASE_URL||process.env.PUBLIC_API_BASE_URL||"https://spotriq-production.up.railway.app").replace(/\/$/,"");
async function get(route){const response=await fetch(`${base}${route}`,{headers:{accept:"application/json"}});const body=await response.json().catch(()=>undefined);if(!response.ok&&route!=="/health")throw new Error(`${route} returned HTTP ${response.status}: ${JSON.stringify(body)}`);return{status:response.status,body};}
function versionAtLeast(actual,minimum){const parse=value=>{const m=String(value??"").match(/^(\d+)\.(\d+)\.(\d+)/);return m?m.slice(1,4).map(Number):null;};const a=parse(actual),b=parse(minimum);if(!a||!b)return false;for(let i=0;i<3;i++){if(a[i]>b[i])return true;if(a[i]<b[i])return false;}return true;}

const evidence={
  schemaVersion:"spotriq.public-launch-evidence@1.0.0",
  capturedAt:new Date().toISOString(),
  baseUrl:base,
  health:await get("/health"),
  meta:await get("/v1/meta"),
  capabilities:await get("/v1/system/capabilities"),
  systemHealth:await get("/v1/system/health"),
  adoption:await get("/v1/public/adoption"),
  referenceAgents:await get("/v1/reference-agents"),
};
if(!versionAtLeast(evidence.health.body?.version,"0.38.0"))throw new Error(`Production must be >=0.38.0 before launch evidence is captured; /health reports ${JSON.stringify(evidence.health.body)}.`);
const manifest=evidence.adoption.body?.data;
if(manifest?.networks?.bscMainnetFinancialExecutionApproved!==false||manifest?.readiness?.mainnetFinancialExecutionApproved!==false)throw new Error("Launch evidence capture refuses a manifest that silently approves BSC Mainnet financial execution.");
await mkdir(path.resolve("artifacts"),{recursive:true});
const file=path.resolve("artifacts/spotriq-v0.38-public-launch-evidence.json");
await writeFile(file,JSON.stringify(evidence,null,2)+"\n","utf8");
console.log(`PASS: captured public launch evidence to ${file}`);
