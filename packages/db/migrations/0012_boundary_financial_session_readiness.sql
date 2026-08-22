create table if not exists boundary_financial_sessions (
  financial_session_id text primary key,
  boundary_id text not null,
  permission_request_id text not null,
  wallet_address text not null,
  session_public_key text not null,
  state text not null,
  payload jsonb not null,
  verified_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists boundary_financial_sessions_boundary_idx on boundary_financial_sessions(boundary_id, updated_at desc);

create table if not exists boundary_financial_readiness (
  readiness_id text primary key,
  boundary_id text not null,
  financial_session_id text not null,
  state text not null,
  payload jsonb not null,
  checked_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists boundary_financial_readiness_boundary_idx on boundary_financial_readiness(boundary_id, updated_at desc);
