alter table check_sessions add column if not exists updated_at timestamptz not null default now();
alter table check_sessions add column if not exists failure_reason text;

create unique index if not exists portfolio_snapshots_check_unique
  on portfolio_snapshots(check_session_id);

alter table findings add column if not exists presentation jsonb not null default '{}'::jsonb;
alter table findings add column if not exists method_version text;

create table if not exists check_events (
  event_id text primary key,
  check_session_id text not null references check_sessions(check_session_id) on delete cascade,
  sequence integer not null,
  event_type text not null,
  source_key text,
  event_data jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  unique(check_session_id, sequence)
);

create index if not exists check_events_session_idx
  on check_events(check_session_id, sequence asc);

insert into data_sources(source_id, name, truth_layer, provider, chain, networks, description)
values
  ('spotriq-derived', 'Spotriq Derived', 'MARKETPLACE_DERIVED', 'Spotriq', null, '[]'::jsonb, 'Versioned calculations produced by Spotriq from referenced canonical, protocol, or marketplace evidence.')
on conflict (source_id) do update set
  name = excluded.name,
  truth_layer = excluded.truth_layer,
  provider = excluded.provider,
  description = excluded.description,
  updated_at = now();

insert into evidence_methods(method_id, version, name, description, input_metrics)
values
  ('smart-money.rebalancing-finding', '1.0.0', 'PancakeSwap concentrated-liquidity rebalancing finding', 'Creates a rebalancing finding from current PancakeSwap concentrated-liquidity range state without inferring profitability or user intent.', '["liquidity.range_state","pool.current_tick","position.tick_lower","position.tick_upper"]'::jsonb)
on conflict (method_id, version) do update set
  name = excluded.name,
  description = excluded.description,
  input_metrics = excluded.input_metrics;
