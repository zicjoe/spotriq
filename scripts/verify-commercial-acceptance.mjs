import process from "node:process";
import { randomUUID } from "node:crypto";

const base = (process.env.SPOTRIQ_ACCEPTANCE_BASE_URL || process.env.PUBLIC_API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const buyer = String(process.env.SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS || "").trim().toLowerCase();
if (!/^0x[0-9a-f]{40}$/.test(buyer)) {
  throw new Error("Set SPOTRIQ_ACCEPTANCE_BUYER_ADDRESS to the BSC wallet address you want to use for FREE read-only acceptance records.");
}
const buyerChainId = Number(process.env.SPOTRIQ_ACCEPTANCE_BUYER_CHAIN_ID || "97");
if (buyerChainId !== 56 && buyerChainId !== 97) throw new Error("SPOTRIQ_ACCEPTANCE_BUYER_CHAIN_ID must be 56 or 97.");

const services = ["rangekeeper", "gridpilot", "yieldpilot", "venusguard"];
async function json(path, init) {
  const response = await fetch(`${base}${path}`, { ...init, headers: { accept: "application/json", "content-type": "application/json", ...(init?.headers || {}) } });
  const body = await response.json().catch(() => undefined);
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`);
  return body?.data;
}

for (const slug of services) {
  const serviceId = `svc:reference:${slug}`;
  const offer = (await json(`/v1/services/${encodeURIComponent(serviceId)}/offers`))?.offers?.[0];
  if (!offer?.terms) throw new Error(`${serviceId}: structured Offer terms missing.`);
  if (offer.state !== "AVAILABLE" || offer.terms.commercialModel !== "FREE" || offer.terms.serviceType !== "READ_ONLY_SERVICE" || offer.terms.paymentRail !== "FREE") {
    throw new Error(`${serviceId}: expected AVAILABLE FREE / READ_ONLY_SERVICE / FREE Offer.`);
  }
  if (offer.terms.scope?.walletSigningRequired || offer.terms.scope?.financialAuthorityRequired) throw new Error(`${serviceId}: free read-only Offer must not require wallet signing or financial authority.`);

  const nonce = randomUUID();
  const quote = (await json("/v1/quotes", { method: "POST", body: JSON.stringify({ serviceId, offerId: offer.offerId, buyerAddress: buyer, buyerChainId, idempotencyKey: `acceptance:quote:${serviceId}:${nonce}` }) }))?.quote;
  if (!quote?.quoteId || quote.termsSnapshot?.commercialModel !== "FREE") throw new Error(`${serviceId}: Quote creation failed semantic checks.`);

  const hire = (await json("/v1/hires", { method: "POST", body: JSON.stringify({ quoteId: quote.quoteId, buyerAddress: buyer, idempotencyKey: `acceptance:hire:${serviceId}:${nonce}` }) }))?.hire;
  if (hire?.state !== "READY_TO_ACTIVATE" || hire.paymentRequired || hire.permissionRequired) throw new Error(`${serviceId}: FREE Hire must be READY_TO_ACTIVATE with payment/permission not required.`);

  const payment = (await json(`/v1/hires/${encodeURIComponent(hire.hireId)}/payment`))?.payment;
  if (payment?.state !== "NOT_REQUIRED" || payment?.requirement !== "NOT_REQUIRED") throw new Error(`${serviceId}: FREE Hire must expose NOT_REQUIRED payment evidence, not PAID.`);

  const activation = (await json(`/v1/hires/${encodeURIComponent(hire.hireId)}/activate`, { method: "POST", body: JSON.stringify({ buyerAddress: buyer, idempotencyKey: `acceptance:activation:${serviceId}:${nonce}` }) }))?.activation;
  if (activation?.state !== "ACTIVE" || activation?.activationKind !== "READ_ONLY_SERVICE_RELATIONSHIP") throw new Error(`${serviceId}: read-only Activation was not created.`);
  if (activation.walletSigningAuthorityGranted || activation.financialExecutionAuthorityGranted) throw new Error(`${serviceId}: read-only Activation must not grant signing/execution authority.`);
  console.log(`PASS ${serviceId}: Offer → Quote → Hire → NOT_REQUIRED payment → read-only Activation.`);
}

const state = (await json(`/v1/accounts/${encodeURIComponent(buyer)}/commercial-state`))?.state;
if (!state || !Array.isArray(state.activations) || state.activations.length < 4) throw new Error("Buyer commercial state did not return the expected persisted Activations.");
console.log("PASS: Spotriq v0.23 FREE read-only commercial acceptance contract passed for all four reference services.");
