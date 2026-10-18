-- Go further results sit beside mastery. They do not change skill_states.
-- Paste this in the Supabase SQL editor when you want it. Do not apply it from the app.

create table if not exists public.go_further_sets (
  child_id uuid not null references public.children (id) on delete cascade,
  skill_id text not null,
  asked integer not null check (asked >= 0 and asked <= 12),
  correct integer not null check (correct >= 0 and correct <= asked),
  completed_at timestamptz,
  primary key (child_id, skill_id),
  constraint go_further_sets_skill_len check (char_length(skill_id) <= 80)
);

alter table public.go_further_sets enable row level security;

drop policy if exists "students read go further sets" on public.go_further_sets;
create policy "students read go further sets"
  on public.go_further_sets for select
  to anon
  using (child_id = (select public.current_student_id()));

drop policy if exists "students insert go further sets" on public.go_further_sets;
create policy "students insert go further sets"
  on public.go_further_sets for insert
  to anon
  with check (child_id = (select public.current_student_id()));

drop policy if exists "students update go further sets" on public.go_further_sets;
create policy "students update go further sets"
  on public.go_further_sets for update
  to anon
  using (child_id = (select public.current_student_id()))
  with check (child_id = (select public.current_student_id()));

drop policy if exists "parents read go further sets" on public.go_further_sets;
create policy "parents read go further sets"
  on public.go_further_sets for select
  to authenticated
  using (
    exists (
      select 1 from public.children
      where children.id = go_further_sets.child_id
        and children.parent_id = (select auth.uid())
    )
  );

revoke all on public.go_further_sets from public, anon, authenticated;
grant select, insert, update on public.go_further_sets to anon;
grant select on public.go_further_sets to authenticated;
