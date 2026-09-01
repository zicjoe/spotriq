create table if not exists my_agent_switches (
  switch_id text primary key,
  buyer_address text not null,
  source_activation_id text not null references activations(activation_id),
  source_service_id text not null,
  target_service_id text not null,
  category text not null check (category in ('rebalancing','grid','yield','health')),
  state text not null check (state in ('BLOCKED','COMPLETED','FAILED')),
  idempotency_key text not null,
  payload jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (buyer_address, idempotency_key)
);

create index if not exists idx_my_agent_switches_buyer_created
  on my_agent_switches (buyer_address, created_at desc);
create index if not exists idx_my_agent_switches_source
  on my_agent_switches (source_activation_id, created_at desc);
