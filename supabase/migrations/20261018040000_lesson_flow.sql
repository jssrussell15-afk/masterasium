-- Lesson runs, spaced reviews, and the one problem a parent may ask about.
-- Parents can read rows for their own children. Students write their own rows
-- through the anon key and x-student-token, the same way as skill_states.
-- Do not apply this file to the hosted project from the app.

create table public.lesson_runs (
  child_id uuid not null references public.children (id) on delete cascade,
  skill_id text not null,
  stage text not null default 'intro' check (stage in (
    'intro', 'worked', 'faded', 'practice', 'mastery', 'retry-worked', 'retry-new', 'complete'
  )),
  step_index integer not null default 0 check (step_index >= 0),
  mastery_correct integer not null default 0 check (mastery_correct >= 0),
  mastery_asked integer not null default 0 check (mastery_asked >= mastery_correct),
  generation integer not null default 0 check (generation >= 0),
  last_mistake text,
  feedback_note text,
  feedback_expected text,
  mode text not null default 'learn' check (mode in ('learn', 'review')),
  review_phase text check (review_phase in ('question', 'worked', 'fresh')),
  missed_in_round boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (child_id, skill_id)
);

create index lesson_runs_child_completed_idx
  on public.lesson_runs (child_id, completed_at);

create table public.skill_reviews (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  skill_id text not null,
  gap text not null check (gap in ('day', 'week', 'month')),
  due_on date not null,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  unique (child_id, skill_id, gap)
);

create index skill_reviews_child_due_idx
  on public.skill_reviews (child_id, due_on);

create table public.talk_samples (
  child_id uuid not null references public.children (id) on delete cascade,
  kind text not null check (kind in ('solved', 'repaired')),
  skill_id text not null,
  prompt text not null check (char_length(prompt) between 1 and 500),
  answer text not null check (char_length(answer) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (child_id, kind)
);

create index talk_samples_child_idx on public.talk_samples (child_id);

alter table public.lesson_runs enable row level security;
alter table public.skill_reviews enable row level security;
alter table public.talk_samples enable row level security;

create policy "parents read lesson runs"
  on public.lesson_runs for select
  to authenticated
  using (
    exists (
      select 1 from public.children
      where children.id = lesson_runs.child_id
        and children.parent_id = (select auth.uid())
    )
  );

create policy "parents read skill reviews"
  on public.skill_reviews for select
  to authenticated
  using (
    exists (
      select 1 from public.children
      where children.id = skill_reviews.child_id
        and children.parent_id = (select auth.uid())
    )
  );

create policy "parents read talk samples"
  on public.talk_samples for select
  to authenticated
  using (
    exists (
      select 1 from public.children
      where children.id = talk_samples.child_id
        and children.parent_id = (select auth.uid())
    )
  );

create policy "students own lesson runs"
  on public.lesson_runs for all
  to anon
  using (child_id = (select public.current_student_id()))
  with check (child_id = (select public.current_student_id()));

create policy "students own skill reviews"
  on public.skill_reviews for all
  to anon
  using (child_id = (select public.current_student_id()))
  with check (child_id = (select public.current_student_id()));

create policy "students own talk samples"
  on public.talk_samples for all
  to anon
  using (child_id = (select public.current_student_id()))
  with check (child_id = (select public.current_student_id()));

revoke all on public.lesson_runs from public, anon, authenticated;
revoke all on public.skill_reviews from public, anon, authenticated;
revoke all on public.talk_samples from public, anon, authenticated;

grant select on public.lesson_runs to authenticated;
grant select on public.skill_reviews to authenticated;
grant select, insert, update, delete on public.lesson_runs to anon;

grant select on public.skill_reviews to authenticated;
grant select, insert, update, delete on public.skill_reviews to anon;

grant select on public.talk_samples to authenticated;
grant select, insert, update, delete on public.talk_samples to anon;
