create table if not exists users (
  user_id text primary key,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists wallets (
  wallet_id text primary key,
  user_id text references users(user_id) on delete set null,
  chain text not null default 'BSC',
  address text not null,
  control_state text not null,
  created_at timestamptz not null default now(),
  unique(chain, address)
);

create table if not exists agent_operators (
  operator_id text primary key,
  display_name text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists agent_identities (
  agent_id text primary key,
  operator_id text references agent_operators(operator_id) on delete set null,
  network text not null,
  registry text not null,
  identifier text not null,
  owner_address text,
  registration_status text not null,
  synced_at timestamptz,
  unique(network, registry, identifier)
);

create table if not exists agent_listings (
  listing_id text primary key,
  agent_id text not null references agent_identities(agent_id) on delete cascade,
  slug text not null unique,
  name text not null,
  short_description text not null default '',
  status text not null,
  category_tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agent_services (
  service_id text primary key,
  agent_id text not null references agent_identities(agent_id) on delete cascade,
  listing_id text references agent_listings(listing_id) on delete set null,
  slug text not null,
  name text not null,
  category text not null,
  description text not null default '',
  readiness_state text not null,
  permission_intensity text not null,
  pricing jsonb not null default '{}'::jsonb,
  supported_protocols jsonb not null default '[]'::jsonb,
  supported_assets jsonb not null default '[]'::jsonb,
  supported_pairs jsonb not null default '[]'::jsonb,
  automation_mode text not null,
  category_profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(agent_id, slug)
);

create index if not exists agent_services_category_idx on agent_services(category);
create index if not exists agent_services_readiness_idx on agent_services(readiness_state);

create table if not exists evidence_records (
  evidence_id text primary key,
  subject_type text not null,
  subject_id text not null,
  metric text not null,
  value jsonb not null,
  unit text,
  provenance text not null,
  source_name text not null,
  source_ref text,
  observed_at timestamptz not null,
  confidence text,
  method_version text,
  period text,
  sample_size integer,
  limitation text,
  created_at timestamptz not null default now()
);

create index if not exists evidence_subject_idx on evidence_records(subject_type, subject_id);
create index if not exists evidence_metric_idx on evidence_records(metric, observed_at desc);

create table if not exists check_sessions (
  check_session_id text primary key,
  wallet_id text references wallets(wallet_id) on delete set null,
  wallet_address text not null,
  wallet_control text not null,
  state text not null,
  coverage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists portfolio_snapshots (
  portfolio_snapshot_id text primary key,
  check_session_id text not null references check_sessions(check_session_id) on delete cascade,
  wallet_address text not null,
  observed_at timestamptz not null,
  coverage jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb
);

create table if not exists findings (
  finding_id text primary key,
  check_session_id text not null references check_sessions(check_session_id) on delete cascade,
  category text not null,
  state text not null,
  severity text not null,
  confidence text not null,
  headline text not null,
  summary text not null,
  subject jsonb not null default '{}'::jsonb,
  evidence_ids jsonb not null default '[]'::jsonb,
  uncertainties jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists findings_check_idx on findings(check_session_id, generated_at desc);
create index if not exists findings_category_idx on findings(category, state);

create table if not exists recommendation_sessions (
  recommendation_session_id text primary key,
  finding_id text references findings(finding_id) on delete set null,
  context jsonb not null default '{}'::jsonb,
  method_version text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists recommendation_candidates (
  recommendation_candidate_id text primary key,
  recommendation_session_id text not null references recommendation_sessions(recommendation_session_id) on delete cascade,
  service_id text not null references agent_services(service_id) on delete cascade,
  eligibility_status text not null,
  rank integer,
  highlight_label text,
  match_reasons jsonb not null default '[]'::jsonb,
  tradeoffs jsonb not null default '[]'::jsonb,
  failed_constraints jsonb not null default '[]'::jsonb
);

create table if not exists checkouts (
  checkout_id text primary key,
  wallet_id text references wallets(wallet_id) on delete set null,
  service_id text references agent_services(service_id) on delete set null,
  status text not null,
  job_context jsonb not null default '{}'::jsonb,
  quote jsonb,
  risk_disclosure jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists permission_requests (
  permission_request_id text primary key,
  checkout_id text not null references checkouts(checkout_id) on delete cascade,
  service_id text not null references agent_services(service_id) on delete cascade,
  status text not null,
  protocols jsonb not null default '[]'::jsonb,
  assets jsonb not null default '[]'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists permission_grants (
  permission_grant_id text primary key,
  permission_request_id text references permission_requests(permission_request_id) on delete set null,
  service_id text not null references agent_services(service_id) on delete cascade,
  wallet_id text references wallets(wallet_id) on delete set null,
  provider text not null,
  state text not null,
  scope jsonb not null default '{}'::jsonb,
  usage jsonb not null default '{}'::jsonb,
  provider_ref text,
  granted_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz
);

create index if not exists permission_grants_service_idx on permission_grants(service_id, state);

create table if not exists activations (
  activation_id text primary key,
  service_id text not null references agent_services(service_id) on delete cascade,
  wallet_id text references wallets(wallet_id) on delete set null,
  permission_grant_id text references permission_grants(permission_grant_id) on delete set null,
  state text not null,
  managed_subject jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists agent_actions (
  agent_action_id text primary key,
  activation_id text not null references activations(activation_id) on delete cascade,
  action_type text not null,
  status text not null,
  intent jsonb not null default '{}'::jsonb,
  result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists transaction_records (
  transaction_id text primary key,
  activation_id text not null references activations(activation_id) on delete cascade,
  agent_action_id text references agent_actions(agent_action_id) on delete set null,
  chain text not null,
  network text not null,
  hash text,
  state text not null,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  raw_receipt jsonb
);

create index if not exists transaction_hash_idx on transaction_records(chain, hash);

create table if not exists activity_events (
  activity_event_id text primary key,
  activation_id text references activations(activation_id) on delete cascade,
  event_type text not null,
  severity text not null,
  title text not null,
  description text not null,
  source_type text,
  source_id text,
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists outcome_windows (
  outcome_window_id text primary key,
  activation_id text not null references activations(activation_id) on delete cascade,
  state text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  attribution_state text,
  methodology_version text
);

create table if not exists outcome_metrics (
  outcome_metric_id text primary key,
  outcome_window_id text not null references outcome_windows(outcome_window_id) on delete cascade,
  activation_id text not null references activations(activation_id) on delete cascade,
  metric text not null,
  value jsonb not null,
  unit text,
  attribution text not null,
  evidence_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists outcome_metrics_activation_idx on outcome_metrics(activation_id, metric);
