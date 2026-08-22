-- Spotriq v0.19.0 — bounded wallet approvals + first controlled BSC Testnet Rebalancing execution.

create table if not exists boundary_approval_plans (
  approval_plan_id text primary key,
  boundary_id text not null,
  plan_id text not null,
  state text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index if not exists boundary_approval_plans_boundary_idx on boundary_approval_plans(boundary_id, updated_at desc);

create table if not exists boundary_approval_observations (
  approval_observation_id text primary key,
  approval_plan_id text not null,
  boundary_id text not null,
  state text not null,
  transaction_hash text,
  payload jsonb not null,
  observed_at timestamptz not null
);
create index if not exists boundary_approval_observations_plan_idx on boundary_approval_observations(approval_plan_id, observed_at desc);

create table if not exists controlled_rebalancing_executions (
  execution_id text primary key,
  boundary_id text not null,
  plan_id text not null,
  job_intent_id text not null,
  state text not null,
  transaction_hash text,
  payload jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index if not exists controlled_rebalancing_executions_boundary_idx on controlled_rebalancing_executions(boundary_id, updated_at desc);
create index if not exists controlled_rebalancing_executions_job_idx on controlled_rebalancing_executions(job_intent_id, updated_at desc);
