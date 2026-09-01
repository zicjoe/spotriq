create table if not exists operator_auth_challenges (
  challenge_id text primary key,
  address text not null,
  nonce text not null,
  message text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  payload jsonb not null,
  created_at timestamptz not null
);
create index if not exists idx_operator_auth_challenges_address_created on operator_auth_challenges(address, created_at desc);

create table if not exists operator_sessions (
  session_id text primary key,
  address text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null
);
create index if not exists idx_operator_sessions_address_expires on operator_sessions(address, expires_at desc);

create table if not exists operator_agent_claims (
  claim_id text primary key,
  operator_address text not null,
  chain_id integer not null check (chain_id in (56,97)),
  agent_id text not null,
  discovery_id text not null,
  canonical_owner_address text not null,
  canonical_state text not null,
  payload jsonb not null,
  claimed_at timestamptz not null,
  last_verified_at timestamptz not null,
  unique(operator_address, chain_id, agent_id)
);

create table if not exists operator_service_declarations (
  declaration_id text primary key,
  operator_address text not null,
  chain_id integer not null check (chain_id in (56,97)),
  agent_id text not null,
  service_id text not null,
  category text not null check (category in ('rebalancing','grid','yield','health')),
  lifecycle_state text not null check (lifecycle_state in ('DRAFT','SUBMITTED','ACTIVE','PAUSED','SUSPENDED','RETIRED')),
  declaration_version integer not null,
  payload jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique(operator_address, service_id)
);
create index if not exists idx_operator_service_declarations_owner_updated on operator_service_declarations(operator_address, updated_at desc);

create table if not exists operator_supplied_evidence (
  evidence_id text primary key,
  operator_address text not null,
  service_id text not null,
  evidence_type text not null,
  source_label text not null,
  observed_at timestamptz not null,
  payload jsonb not null,
  submitted_at timestamptz not null
);
create index if not exists idx_operator_supplied_evidence_service on operator_supplied_evidence(operator_address, service_id, submitted_at desc);
