-- Already applied to the hosted project on 2026-10-18. Trigger-only functions should not be callable through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
alter function public.enforce_two_children() set search_path = public, pg_temp;
