-- Spotriq v0.7.0: Yield Optimisation data foundation
create table if not exists yield_opportunity_snapshots (
  yield_opportunity_snapshot_id text primary key,
  portfolio_snapshot_id text not null references portfolio_snapshots(portfolio_snapshot_id) on delete cascade,
  check_session_id text not null references check_sessions(check_session_id) on delete cascade,
  wallet_address text not null,
  protocol text not null,
  pool_kind text not null,
  pool_name text not null,
  comptroller text not null,
  vtoken_address text not null,
  underlying jsonb not null,
  wallet_balance_raw numeric(78,0) not null,
  wallet_balance_formatted text,
  existing_supply_underlying_raw numeric(78,0) not null,
  existing_supply_formatted text,
  current_supply_rate_per_block_raw numeric(78,0) not null,
  current_supply_apy_percent text,
  current_rate_type text not null,
  available_liquidity_raw numeric(78,0),
  coverage jsonb not null,
  limitations jsonb not null,
  block_number numeric(78,0) not null,
  observed_at timestamptz not null
);
create index if not exists yield_opportunity_snapshots_check_idx on yield_opportunity_snapshots(check_session_id);
create index if not exists yield_opportunity_snapshots_wallet_idx on yield_opportunity_snapshots(wallet_address);
create index if not exists yield_opportunity_snapshots_underlying_idx on yield_opportunity_snapshots((underlying->>'address'));
