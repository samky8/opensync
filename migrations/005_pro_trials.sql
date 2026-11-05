-- App-owned trials are separate from Stripe subscriptions so webhooks cannot
-- restart a trial or replace its expiry. One claim per workspace, enforced by PK.
create table public.pro_trials (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  claimed_by uuid not null,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  constraint pro_trials_duration check (ends_at = started_at + interval '336 hours')
);
alter table public.pro_trials enable row level security;
revoke all on public.pro_trials from public, anon, authenticated;
-- Access is through the authenticated, owner-checked application route only.
