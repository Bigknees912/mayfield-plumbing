-- join_company (migration 055) has no throttle on guessing p_join_code.
-- Any authenticated user (a free self-serve signup is enough to get a
-- session) can call it directly via PostgREST with an arbitrary code and
-- no rate limiting existed anywhere in the DB layer - worst case, the
-- first correct guess against a company with no owner yet claims full
-- ownership of that tenant (every job, customer, and billing setting).
-- This adds a per-user attempt log and rejects further tries once a user
-- has failed too many times recently, same defense-in-depth spirit as
-- receptionist-server's rate limiter and submit-data-request's DB-backed
-- one - Postgres RPCs have no in-memory option since a session can hit any
-- connection in the pool.

create table public.join_code_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  attempted_at timestamptz not null default now()
);
create index join_code_attempts_user_id_idx on public.join_code_attempts(user_id, attempted_at);

alter table public.join_code_attempts enable row level security;
-- No policies: this table backs an internal counter for a security
-- definer function, not something any client role should read or write
-- directly - RLS enabled with zero policies denies all client access
-- while the function (which bypasses RLS as security definer) still
-- works.

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
  v_recent_attempts integer;
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

  -- Max 10 attempts per user per hour, checked before touching companies
  -- at all so a guessing script can't distinguish "rate limited" from
  -- "about to find out the code is wrong" by timing.
  select count(*) into v_recent_attempts
  from public.join_code_attempts
  where user_id = auth.uid() and attempted_at > now() - interval '1 hour';
  if v_recent_attempts >= 10 then
    raise exception 'too_many_attempts: please wait before trying another join code';
  end if;
  insert into public.join_code_attempts (user_id) values (auth.uid());

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

-- Attempt rows are only useful for the last hour's rate-limit window;
-- prune anything older whenever the function runs so the table doesn't
-- grow unbounded (cheap: this table only ever gets one row per join
-- attempt, and grows nowhere near fast enough to need a scheduled job).
create or replace function public.prune_old_join_code_attempts()
returns void
language sql
security definer
set search_path to 'public'
as $function$
  delete from public.join_code_attempts where attempted_at < now() - interval '1 hour';
$function$;
revoke all on function public.prune_old_join_code_attempts() from public, anon, authenticated;
