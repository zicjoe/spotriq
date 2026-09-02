# Security Policy

Spotriq handles financial-agent discovery, commercial state, scoped authority and testnet execution boundaries. Security reports should therefore be treated as potentially sensitive.

## Reporting a vulnerability

Do not publish a working exploit, secret, private key, authentication token or user data in a public issue.

Prefer the repository host's private vulnerability-reporting/security-advisory feature when available. If that is not enabled, contact the project owner through a private channel and provide:

- affected version/component;
- impact and prerequisites;
- minimal reproduction steps;
- whether secrets/funds/user data may be exposed;
- suggested mitigation if known.

## Security boundaries

Spotriq deliberately separates identity, readiness, payment, Activation, PermissionGrant, execution and outcomes. A report showing that one boundary can improperly upgrade another is considered security-relevant.

BSC Mainnet financial execution is not approved in v0.38. Transactional/authority development remains BSC Testnet unless the project explicitly changes that policy.
