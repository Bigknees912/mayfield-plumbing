-- The view was created without security_invoker, so it ran as its owner
-- (the postgres migration role, which bypasses RLS on public.calls) instead
-- of the querying user, leaking every company's call/booking stats to any
-- authenticated user. security_invoker makes it evaluate calls' RLS as the
-- caller, same as querying the table directly.
create or replace view public.call_variant_performance
with (security_invoker = true) as
select
  company_id,
  coalesce(prompt_variant, 'unassigned') as prompt_variant,
  count(*) as total_calls,
  count(*) filter (where outcome = 'booked') as booked_calls,
  round(
    100.0 * count(*) filter (where outcome = 'booked') / greatest(count(*), 1),
    1
  ) as booked_pct
from public.calls
group by company_id, coalesce(prompt_variant, 'unassigned');
