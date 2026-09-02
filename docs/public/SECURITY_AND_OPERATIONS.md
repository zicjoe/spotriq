# Security and Operations Brief

Spotriq's public launch posture includes:

- signed operator sessions plus canonical ERC-8004 owner gating;
- SSRF/public-network policy and DNS-pinned Test Lab transport;
- bounded Agent Card/provider/RPC payloads;
- BSC RPC validation/failover/divergence visibility;
- payment replay/race protection;
- Activation idempotency claims;
- redacted public health and bearer-protected admin diagnostics;
- distributed rate limiting with local degraded fallback;
- bounded request/body/time budgets;
- migration advisory lock and historical checksum drift detection;
- durable lease/retry/dead-letter maintenance queue;
- graceful API/worker drain behavior;
- backup/restore/deploy/rollback runbook.

No production failure-injection endpoint exists. Failure injection remains test/verifier-only.

Financial Smart Money work remains `API_INLINE` at v0.38; worker financial dispatch remains disabled.

See `docs/runbooks/PRODUCTION_OPERATIONS.md` and `SECURITY.md`.
