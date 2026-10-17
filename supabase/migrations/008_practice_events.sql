-- Practice events: intro viewed, hint rung, question attempted, time on task.
-- Paste after 006. Rows never store the question text.

create table if not exists public.practice_events (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  kind text not null check (kind in ('intro_viewed', 'hint_rung', 'question_attempted', 'time_on_task')),
  skill_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint practice_events_skill_len check (skill_id is null or char_length(skill_id) <= 80),
  constraint practice_events_detail_len check (octet_length(detail::text) <= 500)
);

alter table public.practice_events enable row level security;

drop policy if exists "students insert practice events" on public.practice_events;
create policy "students insert practice events"
  on public.practice_events for insert
  to anon
  with check (child_id = public.current_student_id());

drop policy if exists "students read practice events" on public.practice_events;
create policy "students read practice events"
  on public.practice_events for select
  to anon
  using (child_id = public.current_student_id());

drop policy if exists "parents read practice events" on public.practice_events;
create policy "parents read practice events"
  on public.practice_events for select
  to authenticated
  using (
    exists (
      select 1 from public.children
      where children.id = practice_events.child_id
        and children.parent_id = auth.uid()
    )
  );

grant insert, select on public.practice_events to anon;
grant select on public.practice_events to authenticated;
