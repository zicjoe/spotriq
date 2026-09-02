import process from "node:process";

const base=(process.env.SPOTRIQ_ACCEPTANCE_BASE_URL||process.env.PUBLIC_API_BASE_URL||"https://spotriq-production.up.railway.app").replace(/\/$/,"");
const buyer=String(process.env.SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS||"").trim().toLowerCase();
if(!/^0x[0-9a-f]{40}$/.test(buyer))throw new Error("Set SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS to the BSC Testnet wallet used for acceptance. Run the existing v0.27 acceptance flow first so this wallet has Activation Activity & Outcomes evidence.");
async function json(path,init){const response=await fetch(`${base}${path}`,{...init,headers:{accept:"application/json",...(init?.body?{"content-type":"application/json"}:{}),...(init?.headers||{})}});const body=await response.json().catch(()=>undefined);if(!response.ok)throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`);return body?.data;}

const status=(await json("/v1/agent-advantage/status"))?.status;
if(status?.state!=="AVAILABLE"||status.explicitMeasurementWindowsEnabled!==true||status.persistedReportHistoryEnabled!==true||status.financialAdvantageInferenceEnabled!==false||status.transactionSuccessImpliesAdvantage!==false||status.couldNotAssessPreserved!==true)throw new Error("Agent Advantage status does not preserve the v0.34 deterministic measurement contract.");
const portfolio=(await json(`/v1/accounts/${encodeURIComponent(buyer)}/my-agents`))?.portfolio;
const items=[...(portfolio?.active??[]),...(portfolio?.history??[])];
const item=items.find(x=>x?.activityOutcome?.outcome)||items[0];
if(!item?.activation?.activationId)throw new Error("No accepted Activation exists for this buyer. Run the v0.27 Activity + Outcome verifier first using the same SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS.");
const activationId=item.activation.activationId;
const report=(await json(`/v1/activations/${encodeURIComponent(activationId)}/advantage-reports/sync`,{method:"POST",body:"{}"}))?.report;
if(!report?.reportId||report.activationId!==activationId)throw new Error("Agent Advantage reconciliation did not return the expected Activation report.");
if(!report.window?.startedAt||!report.window?.endedAt||!Number.isInteger(report.window.durationSeconds)||report.window.durationSeconds<0)throw new Error("Agent Advantage report is missing an explicit valid measurement window.");
if(!["COULD_NOT_ASSESS","PARTIAL_EVIDENCE","MEASURED"].includes(report.state))throw new Error(`Unexpected report state ${report.state}.`);
if(!["COULD_NOT_ASSESS","INSUFFICIENT_HISTORY","MEASURED"].includes(report.agentAdvantage?.state))throw new Error("Agent Advantage assessment state is invalid.");
if(report.transactionEvidence?.observed===false&&report.agentAdvantage?.state!=="COULD_NOT_ASSESS")throw new Error("No-transaction evidence must preserve Agent Advantage as Could Not Assess.");
if(report.transactionEvidence?.observed===true&&report.financialOutcome?.state==="MEASURED"&&report.agentAdvantage?.state==="MEASURED"&&(!report.agentAdvantage.metricId||!(report.agentAdvantage.evidenceIds?.length>0)))throw new Error("Measured Agent Advantage requires an explicit standardized metric and evidence.");
if(!String(report.limitations??[]).includes("Transaction success is not financial advantage"))throw new Error("Report limitations must preserve transaction ≠ financial advantage.");
const retry=(await json(`/v1/activations/${encodeURIComponent(activationId)}/advantage-reports/sync`,{method:"POST",body:"{}"}))?.report;
if(retry?.sourceFingerprint===report.sourceFingerprint&&retry?.reportId!==report.reportId)throw new Error("Unchanged source facts must be idempotent instead of manufacturing report history.");
const latest=(await json(`/v1/activations/${encodeURIComponent(activationId)}/advantage-reports/latest`))?.report;
if(latest?.activationId!==activationId)throw new Error("Latest Agent Advantage report did not persist.");
const history=(await json(`/v1/activations/${encodeURIComponent(activationId)}/advantage-reports`))?.reports??[];
if(!history.some(x=>x.reportId===report.reportId))throw new Error("Activation report history is missing the persisted Agent Advantage report.");
const buyerState=(await json(`/v1/accounts/${encodeURIComponent(buyer)}/advantage-reports`))?.state;
if(!buyerState?.reports?.some(x=>x.reportId===report.reportId))throw new Error("Buyer Agent Advantage history is missing the persisted report.");
const caps=await json("/v1/system/capabilities");
if(caps.agentAdvantageMeasurementEnabled!==true||caps.agentAdvantageReportHistoryEnabled!==true||caps.agentAdvantageFinancialInferenceEnabled!==false||caps.agentAdvantageTransactionSuccessImpliesAdvantage!==false)throw new Error("System capabilities do not expose the v0.34 Agent Advantage truth boundary.");
console.log(`PASS ${activationId}: explicit window ${report.window.startedAt} → ${report.window.endedAt}; serviceContribution=${report.serviceContribution.state}; transactionObserved=${report.transactionEvidence.observed}; financialOutcome=${report.financialOutcome.state}; agentAdvantage=${report.agentAdvantage.state}.`);
console.log("PASS: Spotriq v0.34 Agent Advantage Measurement + Report contract passed: service contribution, transaction evidence, financial outcome and Agent Advantage remain separate; Could Not Assess is preserved without sufficient evidence.");
