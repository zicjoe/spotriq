import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const app=read("apps/web/src/app/App.tsx");
const state=read("PROJECT_STATE.md");
const roadmap=read("CORRECTED_ROADMAP.md");
for (const marker of [
  'type BuyerServiceState = "AVAILABLE" | "TESTED" | "EVALUATING" | "LIMITED"',
  'Why Spotriq is showing it',
  'Can I use it now?',
  'What Spotriq verified',
  'Still unknown',
  'View technical evidence',
  'Ready to use',
  'Being evaluated',
  'BSC agent discoveries',
  'Discovery only',
]) if(!app.includes(marker)) throw new Error(`buyer-facing external-agent UX missing ${marker}`);
if(!app.includes('new URLSearchParams(window.location.search).get("demo") === "samples"')) throw new Error("sample services must be gated behind explicit demo mode");
if(!app.includes('Explicit demo mode only · never mixed into normal production Explore')) throw new Error("sample-service demo boundary must be explicit");
if(app.includes('{visibleSampleServices.length} legacy sample services')) throw new Error("legacy sample services must not remain in normal production Explore");
if(!app.includes('0 universal trust scores')) throw new Error("Explore must make the no-universal-trust-score policy explicit");
if(!app.includes('How Spotriq searched the BSC agent universe') || !app.includes('discoveryDetailsOpen')) throw new Error("technical supply-search diagnostics must be collapsed behind an explicit buyer-controlled details view");
if(!app.includes('Discovery ≠ verified capability ≠ readiness')) throw new Error("external buyer card must preserve discovery/capability/readiness separation");
if(!state.includes('v0.41.0') || !state.includes('External Agent Buyer Interpretation')) throw new Error("PROJECT_STATE.md must record v0.41 buyer interpretation milestone");
if(!roadmap.includes('v0.41.0') || !roadmap.includes('External Agent Buyer Interpretation')) throw new Error("CORRECTED_ROADMAP.md must record v0.41 buyer interpretation milestone");
console.log("PASS: Spotriq v0.41 external-agent buyer UX hides synthetic samples from normal Explore and translates real BSC agent evidence into buyer-readable service cards without inventing trust or performance.");
