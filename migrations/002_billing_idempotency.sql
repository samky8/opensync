create table webhook_events(event_id text primary key,organization_id uuid not null references organizations on delete cascade,created_at timestamptz not null default now());
alter table webhook_events enable row level security;
revoke all on webhook_events from anon,authenticated;
alter table subscriptions add column checkout_session_id text;
