alter table agent_identities add column if not exists chain_id integer;
alter table agent_identities add column if not exists token_id numeric(78,0);
alter table agent_identities add column if not exists registry_address text;
alter table agent_identities add column if not exists agent_uri text;
alter table agent_identities add column if not exists agent_wallet text;
alter table agent_identities add column if not exists image_url text;
alter table agent_identities add column if not exists external_source text;
alter table agent_identities add column if not exists external_record_id text;
alter table agent_identities add column if not exists external_total_score numeric;
alter table agent_identities add column if not exists external_star_count integer;
alter table agent_identities add column if not exists external_feedback_count integer not null default 0;
alter table agent_identities add column if not exists canonical_status text not null default 'NOT_CHECKED';
alter table agent_identities add column if not exists metadata_status text not null default 'UNAVAILABLE';
alter table agent_identities add column if not exists active boolean;
alter table agent_identities add column if not exists x402_support boolean;
alter table agent_identities add column if not exists supported_protocols jsonb not null default '[]'::jsonb;
alter table agent_identities add column if not exists supported_trust jsonb not null default '[]'::jsonb;
alter table agent_identities add column if not exists category_hints jsonb not null default '[]'::jsonb;
alter table agent_identities add column if not exists raw_registration jsonb;

create unique index if not exists agent_identity_registry_token_idx
  on agent_identities(chain_id, registry_address, token_id)
  where chain_id is not null and registry_address is not null and token_id is not null;

create index if not exists agent_identity_sync_idx on agent_identities(synced_at desc);
create index if not exists agent_identity_canonical_status_idx on agent_identities(canonical_status);

create table if not exists agent_discovery_cache (
  agent_id text primary key references agent_identities(agent_id) on delete cascade,
  name text not null,
  description text not null default '',
  payload jsonb not null,
  source text not null,
  synced_at timestamptz not null default now()
);

create index if not exists agent_discovery_cache_synced_idx on agent_discovery_cache(synced_at desc);

create table if not exists external_feedback_records (
  feedback_id text primary key,
  agent_id text not null references agent_identities(agent_id) on delete cascade,
  source text not null,
  chain_id integer not null,
  token_id numeric(78,0) not null,
  external_user_id text,
  score numeric,
  comment text,
  external_created_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create index if not exists external_feedback_agent_idx on external_feedback_records(agent_id, external_created_at desc);

create table if not exists agent_registry_sync_runs (
  sync_run_id text primary key,
  chain_id integer not null,
  source text not null,
  status text not null,
  requested_page integer,
  requested_limit integer,
  records_received integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  detail text
);
