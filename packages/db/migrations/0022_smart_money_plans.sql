create table if not exists smart_money_plans (
  plan_id text primary key,
  buyer_address text not null,
  check_session_id text not null references check_sessions(check_session_id),
  state text not null check (state in ('REVIEWABLE','BLOCKED','STALE','CANCELLED')),
  idempotency_key text not null,
  composition_hash text not null,
  payload jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (buyer_address, idempotency_key)
);
create index if not exists idx_smart_money_plans_buyer_created on smart_money_plans (buyer_address, created_at desc);
create index if not exists idx_smart_money_plans_check on smart_money_plans (check_session_id, created_at desc);
