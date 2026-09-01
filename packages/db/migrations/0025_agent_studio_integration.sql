-- v0.32 BNB Agent Studio normalized deployment integration.
-- Studio declarations remain operator supplied. Canonical identity/Test Lab truth stays independent.
create table if not exists agent_studio_deployments (
  deployment_id text primary key,
  operator_address text not null,
  chain_id integer not null check (chain_id in (56,97)),
  agent_id text not null,
  service_id text not null,
  state text not null default 'DECLARED',
  payload jsonb not null,
  reconciliation jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index if not exists agent_studio_deployments_operator_idx on agent_studio_deployments(operator_address,updated_at desc);
create index if not exists agent_studio_deployments_service_idx on agent_studio_deployments(service_id,updated_at desc);
