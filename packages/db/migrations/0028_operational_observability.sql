-- Spotriq v0.35.0 — Operational observability + marketplace/system health.
-- Operational health is intentionally separate from marketplace readiness, trust,
-- payment, PermissionGrant, execution and financial outcome state.

create table if not exists operational_health_snapshots (
  snapshot_id text primary key,
  platform_state text not null check (platform_state in ('OPERATIONAL','DEGRADED','UNAVAILABLE')),
  marketplace_state text not null check (marketplace_state in ('OPERATIONAL','DEGRADED','UNAVAILABLE','NOT_CONFIGURED')),
  payload jsonb not null,
  generated_at timestamptz not null
);

create index if not exists operational_health_snapshots_generated_at_idx
  on operational_health_snapshots (generated_at desc);

create table if not exists operational_worker_heartbeats (
  worker_id text primary key,
  service text not null,
  version text not null,
  environment text not null,
  network text not null,
  database_state text not null,
  redis_configured boolean not null,
  jobs_enabled boolean not null,
  job_execution_mode text not null check (job_execution_mode in ('API_INLINE','WORKER_QUEUE')),
  payload jsonb not null,
  observed_at timestamptz not null
);

create index if not exists operational_worker_heartbeats_observed_at_idx
  on operational_worker_heartbeats (observed_at desc);
