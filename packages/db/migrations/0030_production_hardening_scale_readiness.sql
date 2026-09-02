-- Spotriq v0.37.0 — Production Hardening + Scale Readiness

create table if not exists production_rate_limit_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists idx_production_rate_limit_expiry on production_rate_limit_buckets(expires_at);

create table if not exists production_work_queue (
  job_id text primary key,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  payload_hash text not null,
  idempotency_key text not null unique,
  state text not null check (state in ('PENDING','LEASED','COMPLETED','DEAD_LETTER')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  available_at timestamptz not null default now(),
  lease_owner text,
  leased_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_production_work_queue_claim on production_work_queue(state, available_at, created_at);
create index if not exists idx_production_work_queue_lease on production_work_queue(leased_until) where state='LEASED';

-- Add targeted indexes for common buyer/operator/history paths without changing domain semantics.
create index if not exists idx_activations_buyer_started_v037 on activations(buyer_address, started_at desc) where buyer_address is not null;
