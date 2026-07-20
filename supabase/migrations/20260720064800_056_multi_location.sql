-- Multi-location support for Fleet-tier ('pro' plan) companies. Each
-- location has its own jobs, calendar (jobs.scheduled_*), and team;
-- backward compatible for every existing single-location company because
-- location_id defaults to null everywhere and null means "unscoped" - a
-- company that never creates a location behaves exactly as it did before
-- this migration.

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now()
);
create index locations_company_id_idx on public.locations(company_id);

alter table public.locations enable row level security;

create policy locations_select on public.locations
  for select
  using (company_id = current_company_id());

create policy locations_insert on public.locations
  for insert
  with check (company_id = current_company_id() and "current_role"() = 'owner');

create policy locations_update on public.locations
  for update
  using (company_id = current_company_id() and "current_role"() = 'owner')
  with check (company_id = current_company_id());

create policy locations_delete on public.locations
  for delete
  using (company_id = current_company_id() and "current_role"() = 'owner');

alter table public.profiles add column location_id uuid references public.locations(id) on delete set null;
alter table public.jobs add column location_id uuid references public.locations(id) on delete set null;
create index jobs_location_id_idx on public.jobs(location_id);

-- A location must belong to the same company as whatever it's attached to
-- - same "multitenancy FK hardening" shape as migration 027.
create or replace function public.validate_profile_location()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.location_id is not null and not exists (
    select 1 from public.locations l where l.id = new.location_id and l.company_id = new.company_id
  ) then
    raise exception 'location does not belong to this company';
  end if;
  return new;
end;
$function$;
create trigger profiles_validate_location
  before insert or update on public.profiles
  for each row execute function public.validate_profile_location();

create or replace function public.validate_job_location()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.location_id is not null and not exists (
    select 1 from public.locations l where l.id = new.location_id and l.company_id = new.company_id
  ) then
    raise exception 'location does not belong to this company';
  end if;
  return new;
end;
$function$;
create trigger jobs_validate_location
  before insert or update on public.jobs
  for each row execute function public.validate_job_location();

-- Non-owners (tech, office_admin) only see jobs at their own location once
-- they've been assigned one; owners always see every job in the company
-- (the "combined view"). A non-owner with no location_id set yet keeps
-- seeing every company job, so nothing breaks mid-rollout.
create or replace function public.current_location_id()
returns uuid
language sql
stable security definer
set search_path to 'public'
as $function$
  select location_id from public.profiles where id = auth.uid()
$function$;

drop policy jobs_select on public.jobs;
create policy jobs_select on public.jobs
  for select
  using (
    company_id = current_company_id()
    and (
      "current_role"() = 'owner'
      or current_location_id() is null
      or location_id is null
      or location_id = current_location_id()
    )
  );

-- Owner-only: assign a team member to a location (or clear it, i.e. "all
-- locations" for that member - normally left null for the owner).
create or replace function public.assign_profile_location(p_profile_id uuid, p_location_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if "current_role"() <> 'owner' then
    raise exception 'only an owner can assign a team member''s location';
  end if;
  update public.profiles
  set location_id = p_location_id
  where id = p_profile_id and company_id = current_company_id();
end;
$function$;
revoke all on function public.assign_profile_location(uuid, uuid) from public;
grant execute on function public.assign_profile_location(uuid, uuid) to authenticated;
