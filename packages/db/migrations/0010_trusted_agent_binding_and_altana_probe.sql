-- Spotriq v0.16.0 — Trusted service-key binding + safe Altana testnet proof surfaces.

create table if not exists agent_authority_bindings (
  binding_id text primary key,
  service_id text not null unique references agent_services(service_id) on delete cascade,
  state text not null,
  session_public_key text,
  payload jsonb not null,
  observed_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists agent_authority_bindings_state_idx
  on agent_authority_bindings(state, observed_at desc);

create table if not exists altana_testnet_probe_grants (
  probe_id text primary key,
  job_intent_id text not null references checkouts(checkout_id) on delete cascade,
  wallet_address text not null,
  session_public_key text not null,
  state text not null,
  transaction_hash text,
  revocation_transaction_hash text,
  payload jsonb not null,
  verified_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists altana_testnet_probe_grants_job_idx
  on altana_testnet_probe_grants(job_intent_id, verified_at desc);
