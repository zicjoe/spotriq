-- Spotriq v0.39.0 — Production Analytics + Adoption Feedback Loop
-- Interaction analytics remain non-authoritative. Completed lifecycle stages are measured from existing deterministic domain tables.

create table if not exists adoption_analytics_events (
  event_id text primary key,
  event_name text not null check (event_name in (
    'HOME_VIEWED','EXPLORE_VIEWED','RECOMMENDATION_VIEWED','SERVICE_PROFILE_VIEWED','SERVICE_COMPARE_VIEWED',
    'PERMISSION_CHECKOUT_VIEWED','MY_AGENTS_VIEWED','AGENT_ADVANTAGE_VIEWED'
  )),
  channel text not null check (channel in ('PRODUCT','ACCEPTANCE')),
  session_hash text not null,
  category text check (category is null or category in ('rebalancing','grid','yield','health')),
  service_id text,
  subject_id text,
  occurred_at timestamptz not null,
  method_version text not null
);
create index if not exists adoption_analytics_events_time_idx on adoption_analytics_events(channel,occurred_at desc);
create index if not exists adoption_analytics_events_name_time_idx on adoption_analytics_events(event_name,occurred_at desc);
create index if not exists adoption_analytics_events_category_time_idx on adoption_analytics_events(category,occurred_at desc) where category is not null;
create index if not exists adoption_analytics_events_service_time_idx on adoption_analytics_events(service_id,occurred_at desc) where service_id is not null;

create table if not exists adoption_feedback (
  feedback_id text primary key,
  context text not null check (context in ('SMART_MONEY_CHECK','AGENT_MATCH','AGENT_PROFILE','PERMISSION_CHECKOUT','ACTIVATION','AGENT_ADVANTAGE','SWITCH','REVOKE','OPERATOR_WORKSPACE')),
  channel text not null check (channel in ('PRODUCT','ACCEPTANCE')),
  session_hash text not null,
  category text check (category is null or category in ('rebalancing','grid','yield','health')),
  service_id text,
  reason_code text check (reason_code is null or reason_code in ('USEFUL','NOT_USEFUL','UNCLEAR','TOO_EXPENSIVE','PERMISSION_TOO_BROAD','RUNTIME_UNRELIABLE','FOUND_BETTER_AGENT','NO_LONGER_NEEDED','DID_NOT_HELP','ACTIVATION_FRICTION','OTHER')),
  score integer check (score is null or score between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  submitted_at timestamptz not null,
  method_version text not null
);
create index if not exists adoption_feedback_time_idx on adoption_feedback(channel,submitted_at desc);
create index if not exists adoption_feedback_context_time_idx on adoption_feedback(context,submitted_at desc);
create index if not exists adoption_feedback_category_time_idx on adoption_feedback(category,submitted_at desc) where category is not null;
