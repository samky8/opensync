create unique index job_revision_destination on jobs(revision_id,destination);
create unique index organization_single_owner on memberships(organization_id) where role='owner';
alter table revisions add constraint positive_revision check(version>0);
create or replace function protect_revision() returns trigger language plpgsql set search_path=public as $$
begin
 if new.snapshot is distinct from old.snapshot or new.version is distinct from old.version or new.location_id is distinct from old.location_id or new.idempotency_key is distinct from old.idempotency_key or new.created_at is distinct from old.created_at then
  raise exception 'Publication revisions are immutable';
 end if;
 return new;
end $$;
create trigger revision_immutable before update on revisions for each row execute function protect_revision();
