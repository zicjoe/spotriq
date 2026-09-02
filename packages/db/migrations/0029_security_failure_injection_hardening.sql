-- Spotriq v0.36.0 — Security + Failure Injection Hardening
-- Durable activation-idempotency claims close the race between a successful
-- idempotency pre-check and Activation persistence. Payment settlement replay
-- protection remains enforced by the accepted unique indexes from 0016/0024.

create table if not exists commercial_activation_idempotency_claims (
  buyer_address text not null,
  idempotency_key text not null,
  hire_id text not null references commercial_hires(hire_id) on delete restrict,
  activation_id text not null,
  claimed_at timestamptz not null default now(),
  primary key (buyer_address, idempotency_key),
  unique (activation_id)
);

create index if not exists commercial_activation_idempotency_claims_hire_idx
  on commercial_activation_idempotency_claims(hire_id);
