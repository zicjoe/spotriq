import process from "node:process";
import { mkdir, writeFile } from "node:fs/promises";
const base=(process.env.SPOTRIQ_ACCEPTANCE_BASE_URL||process.env.PUBLIC_API_BASE_URL||"https://spotriq-production.up.railway.app").replace(/\/$/,"");
const token=(process.env.SPOTRIQ_ACCEPTANCE_ADMIN_DIAGNOSTICS_TOKEN||"").trim();
if(!token)throw new Error("SPOTRIQ_ACCEPTANCE_ADMIN_DIAGNOSTICS_TOKEN is required to capture the private adoption baseline. Do not commit this token.");
async function json(path,auth=false){const response=await fetch(`${base}${path}`,{headers:{accept:"application/json",...(auth?{authorization:`Bearer ${token}`}:{})}});const body=await response.json().catch(()=>undefined);if(!response.ok)throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`);return body;}
const health=await json("/health");
const report=await json("/v1/admin/adoption-analytics",true);
if(report?.data?.report?.schemaVersion!=="spotriq.adoption-analytics@1.0.0")throw new Error("Live adoption report schema is not v0.39.");
if(report.data.report.authority?.financialTruth!==false)throw new Error("Adoption analytics unexpectedly claim financial truth authority.");
const artifact={schemaVersion:"spotriq.adoption-baseline@1.0.0",capturedAt:new Date().toISOString(),baseUrl:base,release:health.version,report:report.data.report,note:"Private production measurement artifact. Counts describe observed adoption; they are not financial-performance or readiness claims."};
await mkdir("artifacts",{recursive:true});const file="artifacts/spotriq-v0.39-adoption-baseline.json";await writeFile(file,JSON.stringify(artifact,null,2)+"\n");console.log(`PASS: captured private v0.39 adoption baseline to ${file}`);
