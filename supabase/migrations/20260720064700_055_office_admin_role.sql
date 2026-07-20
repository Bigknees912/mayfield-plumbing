-- Adds a third team role, Office Admin, alongside Owner and Technician.
-- Office Admin can see/manage jobs, the calendar, and the clients CRM, but
-- not Settings, pricing config, billing, or the super-admin panel (those
-- stay owner/super_admin-only and are untouched here).

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role = any (array['owner'::text, 'tech'::text, 'office_admin'::text]));

-- "current_role"() already returns whatever's in profiles.role, so no change
-- needed there. Broaden the owner-only write policies that gate the three
-- areas office_admin is meant to manage (jobs/calendar = jobs table,
-- clients CRM = customers + leads).

drop policy jobs_owner_insert on public.jobs;
create policy jobs_owner_insert on public.jobs
  for insert
  with check (
    (company_id = current_company_id())
    and ("current_role"() = any (array['owner'::text, 'office_admin'::text]))
    and ((customer_id is null) or (exists (select 1 from customers c where c.id = jobs.customer_id and c.company_id = current_company_id())))
    and ((job_type_id is null) or (exists (select 1 from job_types jt where jt.id = jobs.job_type_id and jt.company_id = current_company_id())))
    and ((assigned_tech_id is null) or (exists (select 1 from profiles p where p.id = jobs.assigned_tech_id and p.company_id = current_company_id())))
    and ((call_id is null) or (exists (select 1 from calls ca where ca.id = jobs.call_id and ca.company_id = current_company_id())))
  );

drop policy jobs_update on public.jobs;
create policy jobs_update on public.jobs
  for update
  using (
    (company_id = current_company_id())
    and (("current_role"() = any (array['owner'::text, 'office_admin'::text])) or (assigned_tech_id = (select auth.uid())))
  )
  with check (
    (company_id = current_company_id())
    and ((customer_id is null) or (exists (select 1 from customers c where c.id = jobs.customer_id and c.company_id = current_company_id())))
    and ((job_type_id is null) or (exists (select 1 from job_types jt where jt.id = jobs.job_type_id and jt.company_id = current_company_id())))
    and ((assigned_tech_id is null) or (exists (select 1 from profiles p where p.id = jobs.assigned_tech_id and p.company_id = current_company_id())))
    and ((call_id is null) or (exists (select 1 from calls ca where ca.id = jobs.call_id and ca.company_id = current_company_id())))
  );

drop policy jobs_owner_delete on public.jobs;
create policy jobs_owner_delete on public.jobs
  for delete
  using ((company_id = current_company_id()) and ("current_role"() = any (array['owner'::text, 'office_admin'::text])));

drop policy customers_delete on public.customers;
create policy customers_delete on public.customers
  for delete
  using ((company_id = current_company_id()) and ("current_role"() = any (array['owner'::text, 'office_admin'::text])));

drop policy leads_owner_update on public.leads;
create policy leads_owner_update on public.leads
  for update
  using ((company_id = current_company_id()) and ("current_role"() = any (array['owner'::text, 'office_admin'::text])))
  with check (company_id = current_company_id());

-- join_company: lets the joiner request a role (defaults to 'tech').
-- 'owner' can never be requested through this path - the first person to
-- redeem a company's join code still becomes owner automatically, same as
-- before; every joiner after that gets whichever of tech/office_admin they
-- asked for.
drop function public.join_company(text, text);
create or replace function public.join_company(p_join_code text, p_name text, p_role text default 'tech')
returns companies
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_company public.companies;
  v_role text;
  v_seat_limit integer;
  v_current_seats integer;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile already exists for this user';
  end if;
  if p_role not in ('tech', 'office_admin') then
    raise exception 'invalid role: must be tech or office_admin';
  end if;

  select * into v_company from public.companies where join_code = upper(trim(p_join_code));
  if v_company.id is null then
    raise exception 'invalid join code';
  end if;

  select p.seat_limit into v_seat_limit
  from public.subscriptions s
  join public.plans p on p.key = s.plan
  where s.company_id = v_company.id;

  if v_seat_limit is not null then
    select count(*) into v_current_seats from public.profiles where company_id = v_company.id;
    if v_current_seats >= v_seat_limit then
      raise exception 'seat_limit_reached: this company''s plan allows up to % team members', v_seat_limit;
    end if;
  end if;

  v_role := case when exists (select 1 from public.profiles where company_id = v_company.id and role = 'owner')
    then p_role else 'owner' end;

  insert into public.profiles (id, company_id, role, name, email)
  values (auth.uid(), v_company.id, v_role, p_name, (select email from auth.users where id = auth.uid()));

  return v_company;
end;
$function$;

revoke all on function public.join_company(text, text, text) from public;
grant execute on function public.join_company(text, text, text) to authenticated;
