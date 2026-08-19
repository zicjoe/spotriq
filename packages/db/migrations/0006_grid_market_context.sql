-- Spotriq v0.8.0: Grid Trading market-context foundation
create table if not exists grid_market_context_snapshots (
  grid_market_context_snapshot_id text primary key,
  portfolio_snapshot_id text not null references portfolio_snapshots(portfolio_snapshot_id) on delete cascade,
  check_session_id text not null references check_sessions(check_session_id) on delete cascade,
  wallet_address text not null,
  protocol text not null,
  pool_address text not null,
  pair_label text not null,
  token0 jsonb not null,
  token1 jsonb not null,
  fee_pips integer not null,
  current_tick integer not null,
  current_price_token0_in_token1 text,
  liquidity_raw numeric(78,0) not null,
  windows jsonb not null,
  twap_band_low text,
  twap_band_high text,
  twap_dispersion_bps numeric,
  regime text not null,
  confidence text not null,
  wallet_compatibility jsonb not null,
  coverage jsonb not null,
  limitations jsonb not null,
  block_number numeric(78,0) not null,
  observed_at timestamptz not null
);
create index if not exists grid_market_context_check_idx on grid_market_context_snapshots(check_session_id);
create index if not exists grid_market_context_wallet_idx on grid_market_context_snapshots(wallet_address, observed_at desc);
create index if not exists grid_market_context_pool_idx on grid_market_context_snapshots(pool_address, observed_at desc);

insert into evidence_methods(method_id, version, name, description, input_metrics)
values
  ('grid.market-regime', '1.0.0', 'PancakeSwap V3 TWAP market-regime context', 'Classifies supported Grid market context from current PancakeSwap V3 price plus available 1h/6h/24h onchain TWAP observations. TWAP dispersion is not realised volatility or a profitability forecast.', '["market.current_price","pancakeswap.v3.twap.1h","pancakeswap.v3.twap.6h","pancakeswap.v3.twap.24h"]'::jsonb),
  ('smart-money.grid-finding', '1.0.0', 'PancakeSwap V3 grid market-context finding', 'Surfaces wallet-relevant Grid Trading context from a supported PancakeSwap V3 pool without predicting profit or inferring user risk/capital preferences.', '["grid.market_regime","wallet.compatibility"]'::jsonb)
on conflict (method_id, version) do update set name=excluded.name, description=excluded.description, input_metrics=excluded.input_metrics;
