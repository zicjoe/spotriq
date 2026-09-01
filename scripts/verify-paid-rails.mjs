const base=(process.env.SPOTRIQ_ACCEPTANCE_BASE_URL??"https://spotriq-production.up.railway.app").replace(/\/$/,"");
async function json(path){const response=await fetch(`${base}${path}`,{headers:{accept:"application/json"}});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(`${path} HTTP ${response.status}: ${JSON.stringify(body)}`);return body?.data;}
const cap=await json("/v1/system/capabilities");
for(const key of ["commercialPaymentReconciliationEnabled","erc8183PaymentObservationEnabled","x402B402PaymentAdaptersEnabled","paidCommercialRailsReconciliationEnabled"]){if(cap?.[key]!==true)throw new Error(`Capability ${key} is not enabled.`);}
if(cap?.paymentSettlementDispatchEnabled!==false)throw new Error("v0.31 must keep payment settlement dispatch disabled.");
const status=await json("/v1/payment-rails/status");
if(status?.settlementDispatchEnabled!==false)throw new Error("Payment rail status must keep settlementDispatchEnabled=false.");
if(!Array.isArray(status?.rails)||status.rails.length!==3)throw new Error("Expected ERC8183, X402 and B402 rail status records.");
for(const rail of ["ERC8183","X402","B402"]){const r=status.rails.find(x=>x.rail===rail);if(!r)throw new Error(`${rail} status missing.`);if(r.settlementDispatchEnabled!==false)throw new Error(`${rail} must not dispatch payment settlement.`);if(!["AVAILABLE","DEGRADED"].includes(r.state))throw new Error(`${rail} reconciliation state invalid: ${r.state}`);}
const erc=status.rails.find(x=>x.rail==="ERC8183");if(status.chainId===97&&erc.state!=="AVAILABLE")throw new Error(`BSC Testnet canonical ERC-8183 observer is not available: ${JSON.stringify(erc)}`);
for(const rail of ["X402","B402"]){const r=status.rails.find(x=>x.rail===rail);if(r.reconciliationMode!=="ONCHAIN_ERC20_SETTLEMENT")throw new Error(`${rail} must reconcile canonical on-chain ERC-20 settlement evidence.`);if(!r.requirements.some(x=>x.includes("transactionHash")))throw new Error(`${rail} must require a BSC transactionHash rather than a paid flag.`);}
console.log("PASS: Spotriq v0.31 paid commercial rails contract passed: ERC-8183 escrow observation plus x402/B402 canonical settlement reconciliation are enabled while payment signing/dispatch remains disabled.");
