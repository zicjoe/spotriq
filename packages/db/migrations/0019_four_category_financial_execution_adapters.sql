-- Spotriq v0.26.0 — four-category financial execution adapter assessments.
-- These rows are deterministic preflight/guard artifacts. They are not PermissionGrants,
-- transaction submissions, receipts, or financial outcomes.

create table if not exists financial_execution_adapter_assessments (
  assessment_id text primary key,
  permission_request_id text not null references scoped_permission_requests(permission_request_id) on delete cascade,
  kind text not null check (kind in ('PREFLIGHT','GUARD')),
  state text not null,
  payload jsonb not null,
  created_at timestamptz not null
);

create index if not exists financial_execution_adapter_assessments_request_idx
  on financial_execution_adapter_assessments(permission_request_id, created_at desc);
