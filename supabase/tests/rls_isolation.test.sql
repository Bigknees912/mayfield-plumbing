-- Database-level multi-tenancy isolation test.
--
-- This project has no local Postgres / Supabase CLI in this dev
-- environment (see AUTH.md), so this is a plain SQL script, not a pgTAP
-- suite - run it against the real project via the Supabase SQL editor,
-- `psql "$DATABASE_URL" -f supabase/tests/rls_isolation.test.sql`, or the
-- Supabase MCP `execute_sql` tool. It creates two throwaway companies,
-- exercises cross-tenant access through RLS as each company's own users
-- (not as postgres/service_role, which bypasses RLS entirely), asserts
-- every cross-tenant attempt is rejected BY THE DATABASE (not by app
-- code), and rolls back at the end - nothing is left behind whether it
-- passes or fails.
--
-- On success the whole script commits nothing and returns a single
-- 'ALL RLS ISOLATION TESTS PASSED' row. On failure, whichever assertion
-- failed raises a real ERROR with a message identifying which check
-- broke - read that message, not just "it errored".

begin;

-- ---------------------------------------------------------------------
-- Fixtures: two companies, each with an owner and a tech, one job/
-- customer/call apiece, plus a third user who isn't in any company yet.
-- ---------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('a0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-owner-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), '{}', '{}'),
  ('a0000002-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-tech-a@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), '{}', '{}'),
  ('b0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-owner-b@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), '{}', '{}'),
  ('e0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-nobody@test.com', crypt('x', gen_salt('bf')), now(), now(), now(), '{}', '{}');

insert into public.companies (id, name, trade, join_code) values
  ('a0000000-0000-0000-0000-00000000000a', 'RLS Test Co A', 'Plumbing', 'RLSA-TEST'),
  ('b0000000-0000-0000-0000-00000000000b', 'RLS Test Co B', 'Electrical', 'RLSB-TEST');

insert into public.profiles (id, company_id, role, name, email) values
  ('a0000001-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'owner', 'Owner A', 'rls-owner-a@test.com'),
  ('a0000002-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 'tech',  'Tech A',  'rls-tech-a@test.com'),
  ('b0000001-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-00000000000b', 'owner', 'Owner B', 'rls-owner-b@test.com');

insert into public.job_types (id, company_id, key, label, base_hours, hourly_rate_override, parts_cost) values
  ('a0000010-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-00000000000a', 'drain', 'Drain Cleaning', 1, 135, 0),
  ('b0000010-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-00000000000b', 'panel', 'Panel Repair', 3, 145, 600);

insert into public.customers (id, company_id, name, phone) values
  ('a0000020-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-00000000000a', 'Customer A', '+15550000001'),
  ('b0000020-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-00000000000b', 'Customer B', '+15550000002');

insert into public.jobs (id, company_id, customer_id, job_type_id, description, address, urgency, status) values
  ('a0000030-0000-0000-0000-000000000030', 'a0000000-0000-0000-0000-00000000000a', 'a0000020-0000-0000-0000-000000000020', 'a0000010-0000-0000-0000-000000000010', 'Drain job for A', '1 A St', 'standard', 'unassigned'),
  ('b0000030-0000-0000-0000-000000000030', 'b0000000-0000-0000-0000-00000000000b', 'b0000020-0000-0000-0000-000000000020', 'b0000010-0000-0000-0000-000000000010', 'Panel job for B', '1 B St', 'standard', 'unassigned');

insert into public.calls (id, company_id, customer_phone, outcome) values
  ('a0000040-0000-0000-0000-000000000040', 'a0000000-0000-0000-0000-00000000000a', '+15550000001', 'quoted');

-- ---------------------------------------------------------------------
-- Act as Owner A for the rest of the script.
-- ---------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'a0000001-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

do $$
declare
  v_count integer;
begin
  -- READ isolation: Owner A must see only Company A's rows, never B's,
  -- across every company-scoped table someone might query directly.
  select count(*) into v_count from public.companies where id = 'b0000000-0000-0000-0000-00000000000b';
  if v_count <> 0 then raise exception 'FAIL: Owner A can read Company B''s companies row'; end if;

  select count(*) into v_count from public.customers where company_id = 'b0000000-0000-0000-0000-00000000000b';
  if v_count <> 0 then raise exception 'FAIL: Owner A can read Company B''s customers'; end if;

  select count(*) into v_count from public.jobs where company_id = 'b0000000-0000-0000-0000-00000000000b';
  if v_count <> 0 then raise exception 'FAIL: Owner A can read Company B''s jobs'; end if;

  select count(*) into v_count from public.profiles where company_id = 'b0000000-0000-0000-0000-00000000000b';
  if v_count <> 0 then raise exception 'FAIL: Owner A can read Company B''s team profiles'; end if;

  select count(*) into v_count from public.job_types where company_id = 'b0000000-0000-0000-0000-00000000000b';
  if v_count <> 0 then raise exception 'FAIL: Owner A can read Company B''s service catalog'; end if;

  -- A direct id lookup (not a company_id filter) must also come back
  -- empty - proves RLS filters the row, not just app-level query shape.
  select count(*) into v_count from public.jobs where id = 'b0000030-0000-0000-0000-000000000030';
  if v_count <> 0 then raise exception 'FAIL: Owner A can read Company B''s job by direct id lookup'; end if;

  -- WRITE isolation: Owner A must not be able to plant a row that claims
  -- to belong to Company B, even by setting company_id explicitly.
  begin
    insert into public.customers (company_id, name) values ('b0000000-0000-0000-0000-00000000000b', 'Injected Customer');
    raise exception 'FAIL: Owner A was able to insert a customer directly into Company B';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    -- any other error (RLS violation) is the expected outcome - continue
  end;

  -- FK-hardening (migration 027): Owner A must not be able to create an
  -- Company-A-owned job that points its customer_id at Company B's
  -- customer, even though the job row itself is correctly scoped.
  begin
    insert into public.jobs (company_id, customer_id, description, address, urgency, status)
    values ('a0000000-0000-0000-0000-00000000000a', 'b0000020-0000-0000-0000-000000000020', 'Cross-tenant FK attempt', '1 X St', 'standard', 'unassigned');
    raise exception 'FAIL: Owner A was able to link a Company-A job to Company B''s customer';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;

  -- Owner A must not be able to update Company B's job (e.g. to cancel a
  -- competitor's work order). Note: we can't verify this by reading the
  -- row back as Owner A - jobs_select would hide Company B's job from
  -- them either way (blocked-and-unchanged looks identical to
  -- successfully-deleted from their own restricted viewpoint), so this
  -- update's effect gets checked below via an unrestricted read.
  update public.jobs set status = 'cancelled' where id = 'b0000030-0000-0000-0000-000000000030';

  -- Owner A must not be able to delete Company B's job (same caveat -
  -- verified below via an unrestricted read, not through their own RLS).
  delete from public.jobs where id = 'b0000030-0000-0000-0000-000000000030';
end $$;

-- Verify the update/delete attempts above via an UNRESTRICTED read (as
-- postgres, which bypasses RLS via table ownership) - this is the only
-- way to tell "blocked, row unchanged" apart from "succeeded, row gone",
-- since Owner A's own queries can't see Company B's row either way.
reset role;
do $$
declare
  v_status text;
begin
  select status into v_status from public.jobs where id = 'b0000030-0000-0000-0000-000000000030';
  if v_status is null then
    raise exception 'FAIL: Owner A was able to delete Company B''s job (row is gone)';
  end if;
  if v_status = 'cancelled' then
    raise exception 'FAIL: Owner A was able to update Company B''s job status';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- A user with no company at all (freshly signed up, mid-onboarding) must
-- see nothing anywhere - current_company_id() resolves to NULL for them.
-- ---------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'e0000001-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.jobs;
  if v_count <> 0 then raise exception 'FAIL: a companyless user can see jobs (expected 0, got %)', v_count; end if;
  select count(*) into v_count from public.customers;
  if v_count <> 0 then raise exception 'FAIL: a companyless user can see customers (expected 0, got %)', v_count; end if;
end $$;

-- ---------------------------------------------------------------------
-- Sanity check: same-company access still works normally - isolation
-- shouldn't have collaterally broken legitimate access.
-- ---------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'a0000001-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.jobs where company_id = 'a0000000-0000-0000-0000-00000000000a';
  if v_count <> 1 then raise exception 'FAIL: Owner A cannot see their own company''s job (isolation fix broke legitimate access)'; end if;
end $$;

select 'ALL RLS ISOLATION TESTS PASSED' as result;

rollback;
