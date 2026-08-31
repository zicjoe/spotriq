-- Spotriq v0.23.0 — Commercial Hiring + Marketplace Activation Kernel.
-- Offer != Quote != Hire != Payment != Activation. Permission and execution remain independent.

alter table service_offers add column if not exists terms jsonb;
alter table service_offers add column if not exists terms_version text;

create table if not exists commercial_quotes (
  quote_id text primary key,
  offer_id text not null,
  service_id text not null references agent_services(service_id) on delete cascade,
  buyer_address text not null,
  buyer_chain_id integer not null check (buyer_chain_id in (56,97)),
  idempotency_key text not null,
  terms_hash text not null,
  expires_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null
);
create unique index if not exists commercial_quotes_buyer_idempotency_idx on commercial_quotes(buyer_address,idempotency_key);
create index if not exists commercial_quotes_service_idx on commercial_quotes(service_id,created_at desc);
create index if not exists commercial_quotes_buyer_idx on commercial_quotes(buyer_address,created_at desc);

create table if not exists commercial_hires (
  hire_id text primary key,
  quote_id text not null unique references commercial_quotes(quote_id) on delete restrict,
  offer_id text not null,
  service_id text not null references agent_services(service_id) on delete restrict,
  buyer_address text not null,
  buyer_chain_id integer not null check (buyer_chain_id in (56,97)),
  state text not null,
  idempotency_key text not null,
  terms_hash text not null,
  payment_required boolean not null,
  permission_required boolean not null,
  payload jsonb not null,
  accepted_at timestamptz not null,
  updated_at timestamptz not null
);
create unique index if not exists commercial_hires_buyer_idempotency_idx on commercial_hires(buyer_address,idempotency_key);
create index if not exists commercial_hires_buyer_idx on commercial_hires(buyer_address,accepted_at desc);
create index if not exists commercial_hires_service_idx on commercial_hires(service_id,state,updated_at desc);

create table if not exists commercial_payment_evidence (
  payment_evidence_id text primary key,
  hire_id text not null references commercial_hires(hire_id) on delete cascade,
  service_id text not null references agent_services(service_id) on delete restrict,
  buyer_address text not null,
  rail text not null,
  state text not null,
  provider_ref text,
  payload jsonb not null,
  observed_at timestamptz not null
);
create index if not exists commercial_payment_hire_idx on commercial_payment_evidence(hire_id,observed_at desc);
create index if not exists commercial_payment_buyer_idx on commercial_payment_evidence(buyer_address,observed_at desc);
create unique index if not exists commercial_payment_provider_ref_idx on commercial_payment_evidence(rail,provider_ref) where provider_ref is not null;

alter table activations add column if not exists hire_id text references commercial_hires(hire_id) on delete restrict;
alter table activations add column if not exists quote_id text references commercial_quotes(quote_id) on delete restrict;
alter table activations add column if not exists buyer_address text;
alter table activations add column if not exists buyer_chain_id integer check (buyer_chain_id is null or buyer_chain_id in (56,97));
alter table activations add column if not exists activation_kind text;
alter table activations add column if not exists commercial_terms_hash text;
alter table activations add column if not exists commercial_payload jsonb;
alter table activations add column if not exists commercial_method_version text;
create unique index if not exists activations_commercial_hire_idx on activations(hire_id) where hire_id is not null;
create index if not exists activations_commercial_buyer_idx on activations(buyer_address,started_at desc) where commercial_payload is not null;

alter table service_tasks add column if not exists activation_id text references activations(activation_id) on delete set null;
create index if not exists service_tasks_activation_idx on service_tasks(activation_id,updated_at desc) where activation_id is not null;
