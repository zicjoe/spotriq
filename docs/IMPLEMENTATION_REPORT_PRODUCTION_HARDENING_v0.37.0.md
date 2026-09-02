# Spotriq v0.37.0 Implementation Report — Production Hardening + Scale Readiness

Implemented a production hardening layer over the accepted v0.36 baseline.

Key changes: bounded API body/request/connection timeouts; trusted-proxy hop configuration; distributed PostgreSQL rate limiting with local degraded fallback; conservative cache/security headers; configurable PostgreSQL pool and statement timeouts; advisory-locked/checksummed migrations; targeted indexes; durable lease/retry/dead-letter maintenance queue; worker drain/retry behavior; backup/restore/deployment runbooks; and `verify:production-hardening`.

The durable queue does not dispatch Smart Money financial work. `workerFinancialJobDispatchEnabled=false` and current financial job mode remains `API_INLINE`.

Migration: `0030_production_hardening_scale_readiness.sql`.
