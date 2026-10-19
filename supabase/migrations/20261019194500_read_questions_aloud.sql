-- Per-child parent setting: read questions aloud automatically.
-- Null keeps the grade default (on for grades 1–2, off otherwise). The app applies that default.
-- Replay-safe: add column if not exists, drop policy if exists, and repeatable grants.
-- Do not apply this file to hosted Supabase from the app.
-- Students act as anon and may only read their own row (current_student_id()).
-- Parents are authenticated and may update only this column on their own children.

alter table public.children
  add column if not exists read_questions_aloud boolean;

grant select (read_questions_aloud) on public.children to anon, authenticated;
grant update (read_questions_aloud) on public.children to authenticated;

drop policy if exists "parents update read questions aloud" on public.children;
create policy "parents update read questions aloud"
  on public.children
  for update
  to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());
