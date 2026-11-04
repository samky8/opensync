create table social_oauth (
  state_hash text primary key,
  location_id uuid not null references locations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  expires_at timestamptz not null
);
create table social_accounts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations on delete cascade,
  page_id text not null,
  name text not null,
  instagram_id text,
  instagram_name text,
  instagram_type text,
  encrypted_token text not null,
  updated_at timestamptz not null default now(),
  unique(location_id,page_id)
);
create table social_publications (
  id uuid primary key,
  location_id uuid not null references locations on delete cascade,
  account_id uuid references social_accounts on delete set null,
  account_name text not null,
  platform text not null check(platform in ('Instagram','Facebook')),
  format text not null check(format in ('post','story')),
  caption text not null,
  payload_hash text not null,
  image text,
  media_key text not null unique,
  media_expires_at timestamptz not null,
  status text not null check(status in ('preparing','ready','checking','publishing','published','failed','unknown')),
  container_id text,
  remote_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index social_publication_location on social_publications(location_id,created_at desc);
alter table social_oauth enable row level security;
alter table social_accounts enable row level security;
alter table social_publications enable row level security;
revoke all on social_oauth,social_accounts,social_publications from anon,authenticated;
