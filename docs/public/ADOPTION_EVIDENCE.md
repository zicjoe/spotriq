# Adoption Evidence

## Evidence classes

Public claims should point to one or more of:

1. repository/source evidence;
2. live API evidence;
3. canonical BSC transaction/identity evidence;
4. production screenshots/video captured after deployment.

Do not turn documentation prose into proof.

## Machine-readable live evidence

After v0.38 deploy, run:

`pnpm capture:public-launch-evidence`

This writes `artifacts/spotriq-v0.38-public-launch-evidence.json` containing timestamped responses from the public health, capability, system-health, adoption-manifest and reference-agent endpoints.

The capture script fails if production is below v0.38.0 or if the public adoption manifest violates the mainnet/authority boundary.

## Repository evidence

Relevant source areas include:
- `packages/agent-registry`
- `packages/marketplace-supply`
- `packages/reference-agents`
- `packages/commercial`
- `packages/payment-rails`
- `packages/permission-checkout`
- `packages/agent-studio`
- `packages/grounded-explanations`
- `packages/agent-advantage`
- `packages/observability`
- `packages/security-hardening`
- `packages/production-hardening`
- `packages/adoption-readiness`

## External proof still required

Actual production screenshots, final demo video, submission URLs and any final hackathon/ecosystem form fields are external artifacts. They must be captured from the deployed product; this repository deliberately does not fabricate them.
