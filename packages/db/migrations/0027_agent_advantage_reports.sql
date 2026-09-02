-- Spotriq v0.34 — Agent Advantage Measurement + Report
-- Reports are deterministic downstream measurements over explicit Activation windows.
-- They never upgrade runtime/transaction success into financial advantage without evidence.

create table if not exists agent_advantage_reports (
  report_id text primary key,
  activation_id text not null,
  service_id text not null,
  buyer_address text not null,
  category text not null check (category in ('rebalancing','grid','yield','health')),
  relationship_state text not null,
  report_state text not null check (report_state in ('COULD_NOT_ASSESS','PARTIAL_EVIDENCE','MEASURED')),
  window_started_at timestamptz not null,
  window_ended_at timestamptz not null,
  source_outcome_id text not null,
  source_outcome_measured_at timestamptz not null,
  source_fingerprint text not null,
  payload jsonb not null,
  generated_at timestamptz not null,
  unique (activation_id, source_fingerprint),
  check (window_ended_at >= window_started_at)
);

create index if not exists agent_advantage_reports_activation_idx
  on agent_advantage_reports(activation_id, generated_at desc);

create index if not exists agent_advantage_reports_buyer_idx
  on agent_advantage_reports(lower(buyer_address), generated_at desc);

create index if not exists agent_advantage_reports_service_idx
  on agent_advantage_reports(service_id, generated_at desc);
