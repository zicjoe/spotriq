# Spotriq v0.22 External Acceptance Report

**Acceptance status:** COMPLETE  
**Acceptance environment:** public Railway API, BSC Testnet execution/runtime context, ERC-8004 BSC Testnet identities  
**Recorded:** 2026-08-31  
**Public API:** `https://spotriq-production.up.railway.app`

## Purpose

This report records the external acceptance work performed after the v0.22.x repository implementation. Repository implementation alone did not prove that the four first-party reference services were publicly reachable, independently testable, or canonically registered through ERC-8004. Those facts were established against the deployed environment before v0.22 was closed.

The environment-specific ERC-8004 token IDs are intentionally read from the live `/v1/reference-agents` response rather than duplicated as immutable source-code constants. This prevents deployment identity bindings from becoming stale repository truth. Run `pnpm verify:reference-acceptance` to print the current live IDs and readiness state.

## Accepted reference services

| Service | Category | Public runtime | Test Lab | ERC-8004 | Canonical identity | Readiness | Activation eligible |
|---|---|---|---|---|---|---|---|
| RangeKeeper | Rebalancing | PASS | PASS | REGISTERED_VERIFIED | PASS | TESTNET_ONLY | false |
| GridPilot | Grid Trading | PASS | PASS | REGISTERED_VERIFIED | PASS | TESTNET_ONLY | false |
| YieldPilot | Yield Optimisation | PASS | PASS | REGISTERED_VERIFIED | PASS | TESTNET_ONLY | false |
| VenusGuard | Health Factor Monitoring | PASS | PASS | REGISTERED_VERIFIED | PASS | TESTNET_ONLY | false |

All four public Agent Cards resolve under the Spotriq Railway HTTPS deployment and advertise same-deployment A2A runtimes. Marketplace Test Lab evidence is persisted separately from ERC-8004 identity evidence.

## Acceptance contract proven for all four

The final operator audit confirmed the following live contract for each reference service:

- reference catalog registration state is `REGISTERED_VERIFIED`;
- ERC-8004 identity is bound on chain ID `97` (BSC Testnet);
- Marketplace Test Lab coverage is `PASS`;
- readiness `CANONICAL_IDENTITY = PASS`;
- readiness `RUNTIME_REACHABILITY = PASS`;
- readiness `MARKETPLACE_TESTS = PASS`;
- overall readiness is `TESTNET_ONLY`;
- `activationEligible = false`.

`TESTNET_ONLY` plus `activationEligible = false` is the expected successful state. v0.22 proves real public supply, runtime observation and canonical identity; it does not manufacture commercial hiring, production/mainnet activation, or financial outcome claims.

## RangeKeeper canonical proof captured during acceptance

RangeKeeper was the first service used to prove the complete reconciliation path and is retained here as a concrete evidence example:

- ERC-8004 chain: BSC Testnet (`97`)
- Agent ID: `2017`
- canonical owner: `0x08a594e828133d18a43918cc804754f46daf44db`
- registration transaction: `0x13946a59189a24d0743ff82d2dcab50be0105b2a40069ca38bdbacb6852a5be1`
- canonical verification: `VERIFIED`
- indexed owner matched canonical owner;
- registration data URI parsed;
- registration backlink matched;
- registered A2A endpoint matched the expected public RangeKeeper Agent Card.

The remaining three agents completed the same service-level acceptance contract. Their current IDs are deployment/runtime facts and are surfaced by the acceptance verifier rather than hard-coded into this report.

## Evidence boundaries

This acceptance does **not** prove:

- profitability or investment performance;
- BSC Mainnet financial execution;
- commercial payment/hiring;
- unrestricted wallet authority;
- safe strategy performance under every market condition;
- long-horizon outcomes.

It proves that Spotriq now has four genuine public, machine-callable, category-specific first-party services whose runtime and canonical ERC-8004 identity can be independently observed and reconciled without bypassing readiness rules.

## Re-verification

From the repository root:

```powershell
pnpm verify:reference-acceptance
```

To audit a different deployment:

```powershell
pnpm verify:reference-acceptance -- --base-url https://your-api.example.com
```

The command fails if any reference agent is missing, not canonically registered, loses Test Lab coverage, loses required readiness gates, stops being `TESTNET_ONLY`, or becomes activation-eligible prematurely.

## Milestone closure

v0.22 external acceptance is complete. The next product/engineering milestone is **v0.23 — Commercial Hiring + Marketplace Activation Kernel**.

Target seam:

`AgentService → Offer/Quote → Commercial Hire/Job → funding/payment evidence → Activation → Activation-bound ServiceTask`

ERC-8183 and x402/B402 remain provider-neutral commerce/payment adapters where their actual semantics fit. They must not collapse permission, payment, Activation, execution and outcome into one resource.
