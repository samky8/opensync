create table social_background_images (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations on delete cascade,
  image text not null check(octet_length(image) <= 6000000),
  created_at timestamptz not null default now()
);
create index social_background_images_location_created
  on social_background_images(location_id,created_at desc);
alter table social_background_images enable row level security;
revoke all on social_background_images from anon,authenticated;
