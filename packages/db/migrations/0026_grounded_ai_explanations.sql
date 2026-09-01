-- Spotriq v0.33 — Grounded AI Explanation Layer
-- AI output is an auditable downstream communication artifact. It never mutates deterministic truth resources.

create table if not exists grounded_ai_explanations (
  explanation_id text primary key,
  subject_type text not null check (subject_type in ('FINDING','SERVICE','ACTIVATION','SMART_MONEY_PLAN','PERMISSION_REQUEST')),
  subject_id text not null,
  context_id text,
  buyer_address text,
  style text not null check (style in ('PLAIN','CONCISE','DETAILED')),
  provider_kind text not null check (provider_kind in ('OPENAI_RESPONSES','DETERMINISTIC_TEMPLATE')),
  model text,
  explanation_state text not null check (explanation_state in ('AI_GENERATED','DETERMINISTIC_FALLBACK')),
  grounding_packet_hash text not null,
  payload jsonb not null,
  generated_at timestamptz not null
);

create index if not exists grounded_ai_explanations_subject_idx
  on grounded_ai_explanations(subject_type, subject_id, generated_at desc);

create index if not exists grounded_ai_explanations_buyer_idx
  on grounded_ai_explanations(lower(buyer_address), generated_at desc)
  where buyer_address is not null;

create index if not exists grounded_ai_explanations_packet_idx
  on grounded_ai_explanations(grounding_packet_hash);
