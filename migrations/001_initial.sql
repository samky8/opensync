create extension if not exists pgcrypto;
create table organizations(id uuid primary key default gen_random_uuid(),name text not null,created_at timestamptz not null default now());
create table memberships(id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations on delete cascade,user_id uuid not null references auth.users on delete cascade,role text not null default 'owner' check(role in ('owner','admin','editor','viewer')),unique(organization_id,user_id));
create index member_user on memberships(user_id);
create table locations(id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations on delete cascade,draft jsonb not null,draft_version integer not null default 1,published_version integer not null default 0,onboarding_step integer not null default 1 check(onboarding_step between 1 and 6),created_at timestamptz not null default now());
create index location_org on locations(organization_id);
create table revisions(id uuid primary key default gen_random_uuid(),location_id uuid not null references locations on delete cascade,version integer not null,snapshot jsonb not null,actor_id uuid,idempotency_key uuid not null,created_at timestamptz not null default now(),unique(location_id,version),unique(location_id,idempotency_key));
create table jobs(id uuid primary key default gen_random_uuid(),location_id uuid not null references locations on delete cascade,revision_id uuid not null references revisions on delete cascade,destination text not null check(destination in ('website','google')),status text not null default 'queued' check(status in ('queued','published','accepted','retry','failed','superseded')),attempts integer not null default 0,next_attempt timestamptz not null default now(),last_attempt timestamptz,error text,created_at timestamptz not null default now());
create index job_due on jobs(status,next_attempt);
create table connections(location_id uuid primary key references locations on delete cascade,provider text not null default 'google',encrypted_tokens text not null,remote_id text,status text not null default 'select_location',updated_at timestamptz not null default now());
create table subscriptions(organization_id uuid primary key references organizations on delete cascade,customer_id text unique,subscription_id text,plan text not null default 'free',status text not null default 'inactive',updated_at timestamptz not null default now());
create table activity(id uuid primary key default gen_random_uuid(),location_id uuid not null references locations on delete cascade,actor_id uuid,message text not null,created_at timestamptz not null default now());
create index activity_location on activity(location_id,created_at desc);
create table notifications(id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations on delete cascade,message text not null,read_at timestamptz,created_at timestamptz not null default now());
create index notifications_org on notifications(organization_id,created_at desc);
create table interests(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,feature text not null,created_at timestamptz not null default now(),unique(user_id,feature));
create table support(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,message text not null,created_at timestamptz not null default now());
create table preferences(user_id uuid primary key references auth.users on delete cascade,email_notifications integer not null default 0);
create table rate_limits(key text primary key,bucket timestamptz not null default date_trunc('minute',now()),count integer not null default 1);
create or replace function take_rate_limit(p_key text,p_limit int) returns boolean language plpgsql security definer set search_path=public as $$
declare hits int;
begin
 insert into rate_limits(key) values(p_key) on conflict(key) do update set count=case when rate_limits.bucket=date_trunc('minute',now()) then rate_limits.count+1 else 1 end,bucket=date_trunc('minute',now()) returning count into hits;
 if random()<0.01 then delete from rate_limits where bucket<now()-interval '1 day'; end if;
 return hits<=p_limit;
end $$;
revoke all on function take_rate_limit(text,int) from public,anon,authenticated;
create or replace function is_member(org uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from memberships where organization_id=org and user_id=auth.uid())$$;
revoke all on function is_member(uuid) from public;
grant execute on function is_member(uuid) to authenticated;
alter table organizations enable row level security;
alter table memberships enable row level security;
alter table locations enable row level security;
alter table revisions enable row level security;
alter table jobs enable row level security;
alter table connections enable row level security;
alter table subscriptions enable row level security;
alter table activity enable row level security;
alter table notifications enable row level security;
alter table interests enable row level security;
alter table support enable row level security;
alter table preferences enable row level security;
alter table rate_limits enable row level security;
-- All writes flow through validated server endpoints. No anonymous tables, public token reads, or client subscription writes.
revoke all on all tables in schema public from anon,authenticated;
grant select on organizations,memberships,locations,revisions,jobs,activity,notifications,interests,preferences to authenticated;
create policy org_read on organizations for select to authenticated using(is_member(id));
create policy member_read on memberships for select to authenticated using(is_member(organization_id));
create policy location_read on locations for select to authenticated using(is_member(organization_id));
create policy revision_read on revisions for select to authenticated using(exists(select 1 from locations l where l.id=location_id and is_member(l.organization_id)));
create policy job_read on jobs for select to authenticated using(exists(select 1 from locations l where l.id=location_id and is_member(l.organization_id)));
create policy activity_read on activity for select to authenticated using(exists(select 1 from locations l where l.id=location_id and is_member(l.organization_id)));
create policy notification_read on notifications for select to authenticated using(is_member(organization_id));
create policy interest_read on interests for select to authenticated using(user_id=auth.uid());
create policy preference_read on preferences for select to authenticated using(user_id=auth.uid());
-- Deleting the auth identity and tenant data succeeds or fails as one database transaction.
create or replace function cleanup_account() returns trigger language plpgsql security definer set search_path=public as $$
begin
 delete from organizations where id in(select organization_id from memberships where user_id=old.id and role='owner');
 update activity set actor_id=null where actor_id=old.id;
 update revisions set actor_id=null where actor_id=old.id;
 return old;
end $$;
revoke all on function cleanup_account() from public,anon,authenticated;
create trigger cleanup_account_before_delete before delete on auth.users for each row execute function cleanup_account();
