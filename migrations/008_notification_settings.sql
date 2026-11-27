update public.preferences set email_notifications = 15 where email_notifications = 1;

alter table public.notifications
  add column kind text not null default 'publishing_issue',
  add column dedupe_key text,
  add column location_id uuid references public.locations(id) on delete cascade;
create unique index notifications_dedupe
  on public.notifications(organization_id, kind, dedupe_key)
  where dedupe_key is not null;

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  kind text not null check(kind in ('hours_discrepancy','upcoming_holiday','publishing_issue','weekly_summary')),
  dedupe_key text not null,
  subject text not null,
  body text not null,
  status text not null default 'queued' check(status in ('queued','sending','sent','failed')),
  attempts integer not null default 0 check(attempts >= 0),
  next_attempt timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  constraint notification_delivery_unique unique(user_id, kind, dedupe_key)
);
create index notification_delivery_due on public.notification_deliveries(status, next_attempt);

create table public.notification_checks (
  location_id uuid primary key references public.locations(id) on delete cascade,
  hours_checked_at timestamptz
);

alter table public.notification_deliveries enable row level security;
alter table public.notification_checks enable row level security;
revoke all on public.notification_deliveries, public.notification_checks from public, anon, authenticated;
