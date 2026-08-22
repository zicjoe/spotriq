-- Spotriq v0.17.0 — Reviewed Rebalancing execution plan + non-bypassable financial execution boundary.

create table if not exists rebalancing_execution_plans (
  plan_id text primary key,
  job_intent_id text not null references checkouts(checkout_id) on delete cascade,
  permission_request_id text not null references permission_requests(permission_request_id) on delete cascade,
  service_id text not null references agent_services(service_id) on delete cascade,
  state text not null,
  plan_hash text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index if not exists rebalancing_execution_plans_job_idx on rebalancing_execution_plans(job_intent_id, updated_at desc);
create index if not exists rebalancing_execution_plans_state_idx on rebalancing_execution_plans(state, expires_at);

create table if not exists financial_execution_boundaries (
  boundary_id text primary key,
  plan_id text not null references rebalancing_execution_plans(plan_id) on delete cascade,
  job_intent_id text not null references checkouts(checkout_id) on delete cascade,
  permission_request_id text not null references permission_requests(permission_request_id) on delete cascade,
  service_id text not null references agent_services(service_id) on delete cascade,
  state text not null,
  plan_hash text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  sealed_at timestamptz not null,
  updated_at timestamptz not null
);
create index if not exists financial_execution_boundaries_plan_idx on financial_execution_boundaries(plan_id, sealed_at desc);
create index if not exists financial_execution_boundaries_state_idx on financial_execution_boundaries(state, expires_at);
