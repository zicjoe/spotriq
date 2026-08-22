-- Spotriq v0.20.0 — execution-scoped Activity & Outcomes evidence.
-- Reuses the original activity/outcome foundation without fabricating a marketplace Activation.

create index if not exists activity_events_source_idx on activity_events(source_type, source_id, occurred_at asc);

alter table outcome_windows alter column activation_id drop not null;
alter table outcome_windows add column if not exists controlled_execution_id text;
alter table outcome_windows add column if not exists job_intent_id text;
alter table outcome_windows add column if not exists service_id text;
alter table outcome_windows add column if not exists transaction_hash text;
alter table outcome_windows add column if not exists metadata jsonb not null default '{}'::jsonb;
create unique index if not exists outcome_windows_execution_idx on outcome_windows(controlled_execution_id) where controlled_execution_id is not null;
create index if not exists outcome_windows_service_idx on outcome_windows(service_id, started_at desc) where service_id is not null;

alter table outcome_metrics alter column activation_id drop not null;
alter table outcome_metrics add column if not exists controlled_execution_id text;
create index if not exists outcome_metrics_execution_idx on outcome_metrics(controlled_execution_id, metric) where controlled_execution_id is not null;
