# Contributing to Spotriq

Spotriq is a financial-agent marketplace with explicit evidence, authority and execution boundaries. Contributions should preserve those boundaries rather than optimize around them.

## Before opening a pull request

1. Create a focused branch from the current default branch.
2. Install dependencies with the committed lockfile: `pnpm install --frozen-lockfile`.
3. Run `pnpm verify:repo-readiness`.
4. Run `pnpm check`.
5. Run any subsystem-specific verifier named in the relevant implementation report.
6. Do not commit secrets, `.env` files, private keys, wallet seed phrases, admin diagnostics tokens, database credentials, or provider API keys.

## Locked engineering principles

- AI explains; deterministic systems decide.
- Search relevance is not capability proof.
- ERC-8004 identity is not marketplace readiness.
- External reputation is not a Spotriq trust score.
- Offer, Quote, Hire, Payment and Activation remain separate resources.
- PermissionGrant is separate from Activation and execution.
- Prepared calldata is not a transaction; a submitted transaction is not a financial outcome.
- BSC Mainnet read-only observation must not silently widen into Mainnet financial execution.

## Pull requests

Keep changes small enough to review. Explain the problem, the evidence that motivated the change, the domain boundaries affected, and the validation performed. Update canonical state/release documentation whenever implementation truth changes.

## Security

Do not report exploitable vulnerabilities in public issues. Follow `SECURITY.md` and GitHub private vulnerability reporting/security advisories when enabled.
