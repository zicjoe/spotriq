-- Spotriq v0.25.0 — Permission Checkout + Scoped Financial Authority Parity.
-- PermissionProfile != PermissionCheckout != ScopedPermissionRequest != PermissionGrant.
-- Commercial Activation, payment, permission, execution, and outcomes remain independent.

create table if not exists permission_checkout_sessions (
  checkout_id text primary key,
  activation_id text not null references activations(activation_id) on delete restrict,
  service_id text not null references agent_services(service_id) on delete restrict,
  buyer_address text not null,
  category text not null check (category in ('rebalancing','grid','yield','health')),
  state text not null,
  idempotency_key text not null,
  scope_hash text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create unique index if not exists permission_checkout_buyer_idempotency_idx
  on permission_checkout_sessions(buyer_address,idempotency_key);

create index if not exists permission_checkout_activation_idx
  on permission_checkout_sessions(activation_id,updated_at desc);

create index if not exists permission_checkout_buyer_idx
  on permission_checkout_sessions(buyer_address,created_at desc);

create table if not exists scoped_permission_requests (
  permission_request_id text primary key,
  checkout_id text not null unique references permission_checkout_sessions(checkout_id) on delete restrict,
  activation_id text not null references activations(activation_id) on delete restrict,
  service_id text not null references agent_services(service_id) on delete restrict,
  buyer_address text not null,
  category text not null check (category in ('rebalancing','grid','yield','health')),
  state text not null,
  authority_tier text not null check (authority_tier in ('BOUNDED_FINANCIAL','PROTECTIVE_WRITE')),
  scope_hash text not null,
  linked_permission_grant_id text references permission_grants(permission_grant_id) on delete set null,
  payload jsonb not null,
  expires_at timestamptz not null,
  reviewed_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists scoped_permission_requests_activation_idx
  on scoped_permission_requests(activation_id,reviewed_at desc);

create index if not exists scoped_permission_requests_buyer_idx
  on scoped_permission_requests(buyer_address,reviewed_at desc);

create index if not exists scoped_permission_requests_grant_idx
  on scoped_permission_requests(linked_permission_grant_id)
  where linked_permission_grant_id is not null;
