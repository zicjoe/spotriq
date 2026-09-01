-- Spotriq v0.27.0 — four-category Activation Activity + Outcome parity.
-- Reuses the foundation activity/outcome tables while preserving the older
-- controlled-execution outcome path. Activation-scoped records remain distinct
-- from transactions and may explicitly report Could Not Assess.

alter table outcome_windows add column if not exists service_task_id text references service_tasks(service_task_id) on delete set null;
alter table outcome_windows add column if not exists permission_request_id text references scoped_permission_requests(permission_request_id) on delete set null;
alter table outcome_windows add column if not exists category text;

create unique index if not exists outcome_windows_activation_scoped_idx
  on outcome_windows(activation_id)
  where activation_id is not null and attribution_state='ACTIVATION_SCOPED';

create index if not exists outcome_windows_service_task_idx
  on outcome_windows(service_task_id)
  where service_task_id is not null;

create index if not exists outcome_windows_permission_request_idx
  on outcome_windows(permission_request_id)
  where permission_request_id is not null;

create index if not exists activity_events_activation_source_idx
  on activity_events(activation_id, source_type, occurred_at asc)
  where activation_id is not null;
