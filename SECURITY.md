# Security Policy

Spotriq handles financial-agent discovery, commercial state, scoped authority, read-only BSC Mainnet observation and guarded BSC Testnet execution boundaries. Security reports should therefore be treated as potentially sensitive.

## Supported security posture

The current implementation is **v0.41.0**. The accepted analytics/production baseline remains v0.39, with evidence-driven v0.40 supply discovery and v0.41 buyer-interpretation changes layered on top.

- BSC Mainnet (`56`) is permitted for supported **read-only** wallet/protocol observation and read-only specialist analysis.
- **BSC Mainnet financial execution remains disabled.**
- Financial authority/execution development remains constrained to BSC Testnet (`97`) unless a later, explicit security review approves an individual Mainnet write path.
- Wallet connection alone is not a PermissionGrant, Activation or execution authority.

## Reporting a vulnerability

Do **not** publish a working exploit, secret, private key, seed phrase, authentication token, database credential, admin diagnostics token or user-sensitive data in a public issue.

For a public GitHub repository, enable and use **Private vulnerability reporting / Repository security advisories**. A good report includes:

- affected version/component;
- impact and prerequisites;
- minimal reproduction steps;
- whether secrets, funds, authority or user data may be exposed;
- whether the issue crosses a locked Spotriq domain boundary;
- suggested mitigation if known.

If GitHub private vulnerability reporting is temporarily unavailable, contact the project owner through a private channel rather than opening a public exploit report.

## Security-sensitive boundaries

Spotriq deliberately separates:

- `AgentIdentity ≠ AgentListing ≠ AgentService ≠ Offer`
- `Offer ≠ Quote ≠ Hire ≠ Payment ≠ Activation`
- `PermissionProfile ≠ PermissionRequest ≠ PermissionGrant`
- `Activation ≠ PermissionGrant ≠ Execution`
- `AgentAction ≠ Blockchain Transaction ≠ Financial Outcome`
- `External reputation ≠ Spotriq trust score`
- `Operational health ≠ marketplace readiness`

A report showing that one boundary can improperly upgrade another is security-relevant and should be disclosed privately.

## Secrets and credentials

Production secrets belong in Railway/Vercel/GitHub encrypted secret stores, never in source control. `.env.example` contains names/placeholders only. Rotate any credential immediately if there is evidence it was committed, logged publicly or otherwise exposed.
