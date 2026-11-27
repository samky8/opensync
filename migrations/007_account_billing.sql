-- Keep the legacy tables during the cutover. The account owns its billing
-- records and trial independently of the workspaces it owns.
create table public.account_billing (
  account_id uuid primary key references auth.users(id) on delete cascade,
  customer_id text unique,
  subscription_id text,
  checkout_session_id text,
  plan text not null default 'free',
  status text not null default 'inactive',
  complimentary_business boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.account_pro_trials (
  account_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  constraint account_pro_trials_duration check (ends_at = started_at + interval '336 hours')
);

alter table public.account_billing enable row level security;
alter table public.account_pro_trials enable row level security;
revoke all on public.account_billing, public.account_pro_trials from public, anon, authenticated;

alter table public.webhook_events
  alter column organization_id drop not null,
  add column account_id uuid references auth.users(id) on delete cascade,
  add constraint webhook_event_owner check (organization_id is not null or account_id is not null);

-- Abort rather than discard an active subscription or possibly open checkout.
-- Historical customer rows remain in the legacy table for reconciliation.
do $$
begin
  if exists (
    select 1 from public.subscriptions s
    left join public.memberships m on m.organization_id = s.organization_id and m.role = 'owner'
    where m.user_id is null and (
      s.subscription_id is not null or s.customer_id is not null or s.checkout_session_id is not null
      or (s.plan in ('business', 'pro') and s.status in ('active', 'trialing'))
    )
  ) then
    raise exception 'Reconcile ownerless workspace billing before account billing migration';
  end if;

  if exists (
    select 1 from public.subscriptions s
    join public.memberships m on m.organization_id = s.organization_id and m.role = 'owner'
    where (s.subscription_id is not null and s.status not in ('canceled', 'incomplete_expired'))
      or (s.checkout_session_id is not null and s.subscription_id is null)
      or (s.plan in ('business', 'pro') and s.status in ('active', 'trialing'))
    group by m.user_id
    having count(*) > 1
  ) then
    raise exception 'Reconcile multiple subscriptions or checkout sessions per account before migration';
  end if;
end $$;

insert into public.account_billing (
  account_id, customer_id, subscription_id, checkout_session_id, plan, status, updated_at
)
select distinct on (m.user_id)
  m.user_id, s.customer_id, s.subscription_id, s.checkout_session_id,
  s.plan, s.status, s.updated_at
from public.subscriptions s
join public.memberships m on m.organization_id = s.organization_id and m.role = 'owner'
order by m.user_id,
  ((s.subscription_id is not null and s.status not in ('canceled', 'incomplete_expired'))
    or (s.checkout_session_id is not null and s.subscription_id is null)
    or (s.plan in ('business', 'pro') and s.status in ('active', 'trialing'))) desc,
  (s.customer_id is not null) desc,
  s.updated_at desc,
  s.organization_id;

-- Preserve the latest existing expiry. Having claimed on any owned workspace
-- also prevents claiming another trial when all previous trials have ended.
insert into public.account_pro_trials (account_id, started_at, ends_at)
select distinct on (m.user_id) m.user_id, t.started_at, t.ends_at
from public.pro_trials t
join public.memberships m on m.organization_id = t.organization_id and m.role = 'owner'
order by m.user_id, t.ends_at desc, t.organization_id;
