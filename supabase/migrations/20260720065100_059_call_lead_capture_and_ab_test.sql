-- Two additions to `calls` in support of:
-- 1. Creating/updating a CRM lead the moment a call starts (not just on a
--    successful booking) - receptionist-server now upserts a `customers`
--    row as early in the conversation as it can, and links it here.
-- 2. A/B testing the system prompt: which variant (opening line phrasing,
--    for now) a given call used, stamped from the ?variant= query param on
--    that assistant's webhook URL - see receptionist-server's
--    generate-assistant.js and server.js.

alter table public.calls add column customer_id uuid references public.customers(id) on delete set null;
alter table public.calls add column prompt_variant text;
create index calls_customer_id_idx on public.calls(customer_id);

-- Same multitenancy-hardening shape as migration 027: a call's linked
-- customer must belong to the same company as the call itself.
create or replace function public.validate_call_customer()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.customer_id is not null and not exists (
    select 1 from public.customers c where c.id = new.customer_id and c.company_id = new.company_id
  ) then
    raise exception 'call''s customer does not belong to this company';
  end if;
  return new;
end;
$function$;
revoke all on function public.validate_call_customer() from public, anon, authenticated;
create trigger calls_validate_customer
  before insert or update on public.calls
  for each row execute function public.validate_call_customer();

-- Booking-rate-by-variant, for the A/B test - company-scoped like every
-- other view/RLS-backed read in this app (views inherit the RLS of their
-- underlying tables, so this needs no policy of its own).
create view public.call_variant_performance as
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
