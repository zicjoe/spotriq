# Submission / Ecosystem Adoption Checklist

## Repository
- [ ] `pnpm verify:repo-readiness` passes.
- [ ] `pnpm check` passes on the committed `pnpm-lock.yaml`.
- [ ] all relevant live/production verifiers pass.
- [ ] `pnpm verify:adoption-readiness` passes after deployment.
- [ ] public README identifies the current v0.41 implementation and points to architecture/demo/security evidence.
- [ ] no secrets, `.env`, private keys, seed phrases, admin tokens or passwords are committed.
- [ ] `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` and production operations runbooks are present.
- [ ] GitHub Actions CI is green on the default branch.
- [ ] CodeQL is green with no unresolved submission-blocking alerts.
- [ ] Dependabot alerts/security updates and weekly version updates are enabled/reviewed.
- [ ] Dependency Review is enabled for pull requests.
- [ ] Secret scanning/private vulnerability reporting are enabled where available.
- [ ] default branch blocks force-push/deletion and requires the selected CI/security checks.

## Production
- [ ] Railway `/health` reports the current compatible service version.
- [ ] public adoption manifest is available.
- [ ] system health is redacted/non-authoritative.
- [ ] four reference Agent Cards/runtimes are reachable where expected.
- [ ] BSC Mainnet read-only Smart Money/reference-agent observation works without granting financial authority.
- [ ] BSC Mainnet financial execution remains disabled.
- [ ] final screenshot set is captured from production.
- [ ] `pnpm capture:public-launch-evidence` artifact is archived for the submission package.

## Story
- [ ] explain Spotriq as a BSC financial-agent marketplace, not a generic agent marketplace.
- [ ] show all four categories.
- [ ] show ERC-8004 identity separately from readiness.
- [ ] show broader BSC agent discovery separately from Spotriq-qualified services.
- [ ] show Agent Studio as provider/deployment integration, not marketplace authority.
- [ ] show commercial/payment/permission/execution/outcome separation.
- [ ] show `Could Not Assess` instead of unsupported performance.
- [ ] state BSC Mainnet read-only observation vs BSC Testnet financial-authority/execution policy.

## External artifacts
- [ ] final demo video URL.
- [ ] public frontend URL.
- [ ] public API URL.
- [ ] GitHub repository URL.
- [ ] submission page/project URL.
- [ ] community/contact URLs if the submission requires them.

These external values are intentionally not fabricated by the repository.
