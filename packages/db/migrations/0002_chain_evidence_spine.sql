create table if not exists data_sources (
  source_id text primary key,
  name text not null,
  truth_layer text not null,
  provider text,
  chain text,
  networks jsonb not null default '[]'::jsonb,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists evidence_methods (
  method_id text not null,
  version text not null,
  name text not null,
  description text not null,
  input_metrics jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (method_id, version)
);

create table if not exists raw_observations (
  observation_id text primary key,
  source_id text not null references data_sources(source_id) on delete restrict,
  subject_type text not null,
  subject_id text not null,
  metric text not null,
  raw_payload jsonb not null,
  source_ref text,
  chain text,
  network text,
  chain_id integer,
  block_number numeric(78, 0),
  block_hash text,
  transaction_hash text,
  observed_at timestamptz not null,
  raw_artifact_hash text,
  created_at timestamptz not null default now()
);

create index if not exists raw_observations_subject_idx
  on raw_observations(subject_type, subject_id, metric, observed_at desc);
create index if not exists raw_observations_block_idx
  on raw_observations(chain, network, block_number desc);

alter table evidence_records add column if not exists source_id text references data_sources(source_id) on delete restrict;
alter table evidence_records add column if not exists truth_layer text;
alter table evidence_records add column if not exists chain text;
alter table evidence_records add column if not exists network text;
alter table evidence_records add column if not exists chain_id integer;
alter table evidence_records add column if not exists block_number numeric(78, 0);
alter table evidence_records add column if not exists block_hash text;
alter table evidence_records add column if not exists transaction_hash text;
alter table evidence_records add column if not exists effective_at timestamptz;
alter table evidence_records add column if not exists finality text;
alter table evidence_records add column if not exists freshness_state text;
alter table evidence_records add column if not exists freshness_policy jsonb;
alter table evidence_records add column if not exists availability text;
alter table evidence_records add column if not exists method_inputs jsonb not null default '[]'::jsonb;
alter table evidence_records add column if not exists observation_id text references raw_observations(observation_id) on delete set null;

create index if not exists evidence_source_idx on evidence_records(source_id, observed_at desc);
create index if not exists evidence_chain_block_idx on evidence_records(chain, network, block_number desc);

create table if not exists evidence_conflicts (
  conflict_id text primary key,
  subject_type text not null,
  subject_id text not null,
  metric text not null,
  evidence_ids jsonb not null,
  status text not null default 'OPEN',
  description text not null,
  detected_at timestamptz not null,
  resolved_at timestamptz,
  resolution jsonb
);

create index if not exists evidence_conflicts_subject_idx
  on evidence_conflicts(subject_type, subject_id, metric, detected_at desc);

insert into data_sources(source_id, name, truth_layer, provider, chain, networks, description)
values
  ('bsc-rpc', 'BNB Smart Chain JSON-RPC', 'CANONICAL_ONCHAIN', 'BNB Smart Chain', 'BSC', '["testnet","mainnet"]'::jsonb, 'Canonical BSC chain state read through standard JSON-RPC endpoints.'),
  ('pancakeswap', 'PancakeSwap', 'PROTOCOL_STATE', 'PancakeSwap', 'BSC', '["testnet","mainnet"]'::jsonb, 'Normalized PancakeSwap protocol state.'),
  ('venus', 'Venus Protocol', 'PROTOCOL_STATE', 'Venus', 'BSC', '["testnet","mainnet"]'::jsonb, 'Normalized Venus lending state.'),
  ('erc8004', 'ERC-8004 Registry', 'CANONICAL_ONCHAIN', 'ERC-8004', 'BSC', '["testnet","mainnet"]'::jsonb, 'Canonical onchain agent identity/registry evidence.'),
  ('8004scan', '8004scan', 'EXTERNAL_INDEXED', '8004scan', 'BSC', '["testnet","mainnet"]'::jsonb, 'External indexed discovery and reputation evidence.'),
  ('spotriq-marketplace', 'Spotriq Marketplace', 'MARKETPLACE_OBSERVED', 'Spotriq', null, '[]'::jsonb, 'Evidence observed directly by Spotriq.')
on conflict (source_id) do update set
  name = excluded.name,
  truth_layer = excluded.truth_layer,
  provider = excluded.provider,
  chain = excluded.chain,
  networks = excluded.networks,
  description = excluded.description,
  updated_at = now();

insert into evidence_methods(method_id, version, name, description, input_metrics)
values
  ('wallet.native-balance', '1.0.0', 'BSC native balance read', 'Reads native BNB/tBNB balance from eth_getBalance at one observed block.', '["wallet.address","chain.block"]'::jsonb),
  ('wallet.erc20-balance', '1.0.0', 'ERC-20 balance read', 'Reads ERC-20 balanceOf(wallet) with eth_call at one observed block.', '["wallet.address","token.address","chain.block"]'::jsonb)
on conflict (method_id, version) do update set
  name = excluded.name,
  description = excluded.description,
  input_metrics = excluded.input_metrics;
