# Spotriq v0.31.0 — Paid Commercial Rails + ERC-8183 / x402 / B402 Reconciliation

## Goal

Make paid commercial evidence first-class without turning Spotriq into a wallet or collapsing `Payment` into `Hire`, `Permission`, `Activation`, `Execution` or `Outcome`.

## Architecture

`@spotriq/commercial` remains the provider-neutral commercial kernel. `@spotriq/payment-rails` supplies x402/B402 settlement observers; the existing ERC-8183 adapter observes on-chain job/escrow state.

For x402/B402 Spotriq accepts a BSC transaction hash only as a lookup reference. Verification then reads canonical BSC transaction/receipt/block data and requires an ERC-20 `Transfer` matching:

- immutable Quote chain;
- Quote buyer as token payer;
- pinned payee from Quote terms;
- exact payment token;
- exact raw amount;
- successful receipt;
- settlement block timestamp not earlier than Hire acceptance.

A facilitator response, browser `paid=true`, or arbitrary receipt payload is not trusted.

## Current boundaries

Spotriq v0.31 does not generate EIP-3009/Permit2 signatures, invoke a facilitator to pay, broadcast x402/B402 settlement, or fund/settle ERC-8183 jobs. Payment dispatch remains disabled. Mainnet financial/payment dispatch remains blocked pending explicit approval.

## Operator declarations

Operators may declare paid terms only with explicit token/raw-amount metadata. ERC-8183 requires contract/provider addresses. x402/B402 require an HTTPS payment endpoint and pinned payee address. These declarations remain Operator Supplied evidence and do not prove settlement.

## Persistence

Migration `0024_paid_commercial_payment_rails.sql` makes settlement transaction hash/block queryable while preserving the full evidence payload.

## Acceptance

`pnpm verify:paid-rails` verifies that ERC-8183/x402/B402 reconciliation surfaces are enabled while payment settlement dispatch remains disabled.
