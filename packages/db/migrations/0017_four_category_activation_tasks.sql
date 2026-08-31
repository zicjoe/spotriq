-- Spotriq v0.24.0 — Four-Category End-to-End Activation Parity.
-- ServiceTask becomes activation-capable across all four financial categories while
-- preserving the existing Rebalancing JobIntent linkage when one exists.

alter table service_tasks alter column job_intent_id drop not null;
alter table service_tasks alter column finding_id drop not null;
alter table service_tasks add column if not exists origin_kind text not null default 'JOB_INTENT';
alter table service_tasks add column if not exists category text;
alter table service_tasks add column if not exists result_state text;

update service_tasks
set category = coalesce(category, payload->>'category', payload#>>'{requestContext,category}', 'rebalancing'),
    origin_kind = coalesce(nullif(origin_kind,''), payload->>'originKind', 'JOB_INTENT'),
    result_state = coalesce(result_state, payload#>>'{result,state}', 'NONE')
where category is null or result_state is null;

alter table service_tasks alter column category set not null;
alter table service_tasks alter column result_state set not null;

create index if not exists service_tasks_activation_category_idx
  on service_tasks(activation_id, category, updated_at desc)
  where activation_id is not null;

create unique index if not exists service_tasks_activation_context_idx
  on service_tasks(activation_id, request_context_hash)
  where activation_id is not null;
