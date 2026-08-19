create table if not exists lending_position_snapshots (
  lending_position_snapshot_id text primary key,
  portfolio_snapshot_id text not null references portfolio_snapshots(portfolio_snapshot_id) on delete cascade,
  check_session_id text not null references check_sessions(check_session_id) on delete cascade,
  wallet_address text not null,
  protocol text not null,
  pool_kind text not null,
  pool_name text not null,
  comptroller text not null,
  oracle_address text,
  protocol_liquidity_raw text not null,
  protocol_shortfall_raw text not null,
  total_borrow_value_usd_1e18 text,
  liquidation_adjusted_collateral_usd_1e18 text,
  health_factor text,
  risk_state text not null,
  coverage jsonb not null default '{}'::jsonb,
  limitations jsonb not null default '[]'::jsonb,
  block_number text not null,
  observed_at timestamptz not null
);
create index if not exists lending_position_check_idx on lending_position_snapshots(check_session_id, observed_at desc);
create index if not exists lending_position_wallet_idx on lending_position_snapshots(wallet_address, protocol, observed_at desc);

create table if not exists lending_market_position_snapshots (
  lending_market_position_snapshot_id text primary key,
  lending_position_snapshot_id text not null references lending_position_snapshots(lending_position_snapshot_id) on delete cascade,
  vtoken_address text not null,
  vtoken_symbol text,
  underlying jsonb not null default '{}'::jsonb,
  collateral_enabled boolean not null,
  supplied_vtoken_raw text not null,
  supplied_underlying_raw text not null,
  borrow_underlying_raw text not null,
  exchange_rate_mantissa text not null,
  collateral_factor_mantissa text,
  liquidation_threshold_mantissa text,
  forced_liquidation_enabled boolean,
  oracle_price_raw text,
  supplied_value_usd_1e18 text,
  borrow_value_usd_1e18 text,
  liquidation_adjusted_collateral_usd_1e18 text
);
create index if not exists lending_market_parent_idx on lending_market_position_snapshots(lending_position_snapshot_id);
