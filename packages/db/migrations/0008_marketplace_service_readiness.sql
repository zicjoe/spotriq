-- Spotriq v0.10.0 — Agent Service + Marketplace Listing/Readiness Engine
-- Preserve AgentIdentity != AgentListing != AgentService != Offer and PermissionProfile != PermissionRequest != PermissionGrant.

alter table agent_services add column if not exists source_kind text not null default 'REFERENCE';
alter table agent_services add column if not exists marketplace_activation_eligible boolean not null default false;
alter table agent_services add column if not exists runtime_endpoints jsonb not null default '[]'::jsonb;
alter table agent_services add column if not exists normalized_at timestamptz;

create table if not exists service_offers (
  offer_id text primary key,
  service_id text not null references agent_services(service_id) on delete cascade,
  state text not null,
  pricing jsonb,
  source text not null,
  note text not null default '',
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists service_offers_service_idx on service_offers(service_id, observed_at desc);

create table if not exists permission_profiles (
  permission_profile_id text primary key,
  service_id text not null references agent_services(service_id) on delete cascade,
  declaration_state text not null,
  execution_mode text not null,
  intensity text not null,
  protocols jsonb not null default '[]'::jsonb,
  assets jsonb not null default '[]'::jsonb,
  provenance text not null,
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists permission_profiles_service_idx on permission_profiles(service_id, observed_at desc);

create table if not exists service_readiness_snapshots (
  readiness_snapshot_id text primary key,
  service_id text not null references agent_services(service_id) on delete cascade,
  state text not null,
  activation_eligible boolean not null default false,
  checks jsonb not null default '[]'::jsonb,
  reasons jsonb not null default '[]'::jsonb,
  limitations jsonb not null default '[]'::jsonb,
  method_version text not null,
  checked_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists service_readiness_service_idx on service_readiness_snapshots(service_id, checked_at desc);
create index if not exists service_readiness_state_idx on service_readiness_snapshots(state, activation_eligible);

create table if not exists agent_capability_claims (
  capability_claim_id text primary key,
  service_id text not null references agent_services(service_id) on delete cascade,
  category text not null,
  claim text not null,
  confidence text not null,
  provenance text not null,
  basis jsonb not null default '[]'::jsonb,
  note text not null default '',
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists agent_capability_claims_service_idx on agent_capability_claims(service_id, category);

create table if not exists marketplace_service_cache (
  service_id text primary key,
  payload jsonb not null,
  normalized_at timestamptz not null,
  updated_at timestamptz not null default now()
);
