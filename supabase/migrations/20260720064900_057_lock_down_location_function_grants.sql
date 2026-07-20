-- Trigger functions have no business being callable as RPCs, and
-- current_location_id() should require a session - same tightening
-- migrations 007/008 did for the original helper functions.
revoke all on function public.validate_profile_location() from public, anon, authenticated;
revoke all on function public.validate_job_location() from public, anon, authenticated;
revoke all on function public.current_location_id() from anon;
