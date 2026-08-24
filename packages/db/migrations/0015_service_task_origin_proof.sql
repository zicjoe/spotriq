-- Spotriq v0.21.0 — durable real AgentService task invocation / origin proof.
-- This table intentionally remains separate from marketplace activations: invocation is not hiring/payment/activation.

create table if not exists service_tasks (
  service_task_id text primary key,
  job_intent_id text not null references checkouts(checkout_id) on delete cascade,
  finding_id text not null,
  service_id text not null,
  agent_id text not null,
  state text not null,
  protocol text not null,
  protocol_binding text,
  protocol_version text,
  runtime_endpoint text,
  request_context_hash text not null,
  remote_task_id text,
  remote_message_id text,
  proposal_state text not null,
  origin_proof_state text not null,
  commercial_state text not null default 'NOT_PROVEN',
  payload jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists service_tasks_job_idx on service_tasks(job_intent_id, updated_at desc);
create index if not exists service_tasks_service_idx on service_tasks(service_id, state, updated_at desc);
create unique index if not exists service_tasks_context_idx on service_tasks(job_intent_id, request_context_hash);
