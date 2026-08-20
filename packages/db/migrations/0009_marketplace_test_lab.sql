-- Spotriq v0.12.0 — Marketplace Test Lab + Service Readiness Verification
-- Test runs are marketplace-observed, immutable evidence. Operator metadata cannot edit these rows.

create table if not exists marketplace_service_test_runs (
  run_id text primary key,
  service_id text not null references agent_services(service_id) on delete cascade,
  state text not null,
  coverage text not null,
  method_version text not null,
  payload jsonb not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_service_test_runs_service_idx
  on marketplace_service_test_runs(service_id, completed_at desc);

create index if not exists marketplace_service_test_runs_coverage_idx
  on marketplace_service_test_runs(coverage, completed_at desc);
