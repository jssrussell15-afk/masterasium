-- Run this in the Supabase SQL editor if 001_init.sql is already applied.
-- Signup creates the profile row. The dashboard then saves it again, and
-- Postgres treats that save as an update. Without an update policy, the
-- save fails with "new row violates row-level security policy (USING expression)".

grant update on public.profiles to authenticated;

drop policy if exists "parents update their profile" on public.profiles;

create policy "parents update their profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
