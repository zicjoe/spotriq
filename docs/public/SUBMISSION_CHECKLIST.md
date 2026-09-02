# Submission / Ecosystem Adoption Checklist

## Repository
- [ ] v0.38 `pnpm check` passes.
- [ ] all historical live verifiers pass.
- [ ] `pnpm verify:adoption-readiness` passes after deployment.
- [ ] public README points to architecture/demo/security evidence.
- [ ] no secrets, `.env`, private keys or passwords are committed.
- [ ] SECURITY.md and production operations runbook are present.

## Production
- [ ] Railway `/health` reports >=0.38.0.
- [ ] public adoption manifest is available.
- [ ] system health is redacted/non-authoritative.
- [ ] four reference Agent Cards/runtimes are reachable where expected.
- [ ] final screenshot set is captured from production.
- [ ] `pnpm capture:public-launch-evidence` artifact is archived for the submission package.

## Story
- [ ] explain Spotriq as a BSC financial-agent marketplace, not a generic agent marketplace.
- [ ] show all four categories.
- [ ] show ERC-8004 identity separately from readiness.
- [ ] show Agent Studio as provider/deployment integration, not marketplace authority.
- [ ] show commercial/payment/permission/execution/outcome separation.
- [ ] show `Could Not Assess` instead of unsupported performance.
- [ ] state BSC Mainnet discovery vs BSC Testnet transactional development policy.

## External artifacts
- [ ] final demo video URL.
- [ ] public frontend URL.
- [ ] public API URL.
- [ ] GitHub repository URL.
- [ ] submission page/project URL.
- [ ] community/contact URLs if the submission requires them.

These external values are intentionally not fabricated by the repository.
