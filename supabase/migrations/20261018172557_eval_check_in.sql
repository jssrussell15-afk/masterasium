-- Grade-band check-in drafts.
-- Do not apply this file from the app, and do not run it against hosted Supabase from here.
-- Every content row stays a draft. Wording was drafted offline, so source is ai_draft.
--
-- Eval answers live in eval_answers, not in the practice attempt log.
-- The practice lane check stays limited to core, go_further, and review, so a check-in row cannot be stored as practice.
-- That keeps the 10-question, 80% mastery bar on practice only.
-- Sessions, per-question marks, a strand rollup, and the placed starting skill are separate tables.

alter table public.content_items drop constraint if exists content_items_lane_check;
alter table public.content_items add constraint content_items_lane_check
  check (lane in ('core', 'go_further', 'review', 'eval'));

create table public.eval_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  grade_band smallint not null check (grade_band between 1 and 6),
  kind text not null check (kind in ('pre', 'post')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  pre_session_id uuid references public.eval_sessions (id),
  created_at timestamptz not null default now()
);

create index eval_sessions_child_idx on public.eval_sessions (child_id, started_at);

create table public.eval_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.eval_sessions (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  content_item_id uuid references public.content_items (id),
  template_key text not null,
  strand text not null,
  skill_slug text not null,
  role text not null check (role in ('core', 'ceiling', 'prereq')),
  form text not null check (form in ('pre', 'post')),
  mark text not null check (mark in ('correct', 'missed', 'not_learned')),
  response text,
  created_at timestamptz not null default now()
);

create index eval_answers_session_idx on public.eval_answers (session_id);

create table public.eval_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.eval_sessions (id) on delete cascade,
  strand text not null,
  skill_slug text not null,
  items_attempted integer not null check (items_attempted >= 0),
  correct integer not null check (correct >= 0),
  skipped_not_learned integer not null check (skipped_not_learned >= 0),
  estimated_level text not null check (estimated_level in ('strong', 'building', 'not_started')),
  unique (session_id, strand)
);

create table public.eval_placements (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  strand text not null,
  skill_slug text not null,
  status text not null check (status in ('placed', 'provisional', 'confirmed', 'stepped_back')),
  note text,
  updated_at timestamptz not null default now(),
  unique (child_id, strand)
);

alter table public.eval_sessions enable row level security;
alter table public.eval_answers enable row level security;
alter table public.eval_results enable row level security;
alter table public.eval_placements enable row level security;

revoke all on table public.eval_sessions from public, anon, authenticated;
revoke all on table public.eval_answers from public, anon, authenticated;
revoke all on table public.eval_results from public, anon, authenticated;
revoke all on table public.eval_placements from public, anon, authenticated;

grant select on table public.eval_sessions to authenticated;
grant select, insert, update on table public.eval_sessions to anon;
grant select on table public.eval_answers to authenticated;
grant select, insert on table public.eval_answers to anon;
grant select on table public.eval_results to authenticated;
grant select, insert on table public.eval_results to anon;
grant select on table public.eval_placements to authenticated;
grant select, insert, update on table public.eval_placements to anon;

create policy "parents read eval sessions"
  on public.eval_sessions for select
  to authenticated
  using (exists (
    select 1 from public.children
    where children.id = eval_sessions.child_id
      and children.parent_id = (select auth.uid())
  ));

create policy "students read eval sessions"
  on public.eval_sessions for select
  to anon
  using (child_id = (select public.current_student_id()));

create policy "students insert eval sessions"
  on public.eval_sessions for insert
  to anon
  with check (child_id = (select public.current_student_id()));

create policy "students update eval sessions"
  on public.eval_sessions for update
  to anon
  using (child_id = (select public.current_student_id()))
  with check (child_id = (select public.current_student_id()));

create policy "parents read eval answers"
  on public.eval_answers for select
  to authenticated
  using (exists (
    select 1 from public.children
    where children.id = eval_answers.child_id
      and children.parent_id = (select auth.uid())
  ));

create policy "students read eval answers"
  on public.eval_answers for select
  to anon
  using (child_id = (select public.current_student_id()));

create policy "students insert eval answers"
  on public.eval_answers for insert
  to anon
  with check (child_id = (select public.current_student_id()));

create policy "parents read eval results"
  on public.eval_results for select
  to authenticated
  using (exists (
    select 1 from public.eval_sessions
    join public.children on children.id = eval_sessions.child_id
    where eval_sessions.id = eval_results.session_id
      and children.parent_id = (select auth.uid())
  ));

create policy "students read eval results"
  on public.eval_results for select
  to anon
  using (exists (
    select 1 from public.eval_sessions
    where eval_sessions.id = eval_results.session_id
      and eval_sessions.child_id = (select public.current_student_id())
  ));

create policy "students insert eval results"
  on public.eval_results for insert
  to anon
  with check (exists (
    select 1 from public.eval_sessions
    where eval_sessions.id = eval_results.session_id
      and eval_sessions.child_id = (select public.current_student_id())
  ));

create policy "parents read eval placements"
  on public.eval_placements for select
  to authenticated
  using (exists (
    select 1 from public.children
    where children.id = eval_placements.child_id
      and children.parent_id = (select auth.uid())
  ));

create policy "students read eval placements"
  on public.eval_placements for select
  to anon
  using (child_id = (select public.current_student_id()));

create policy "students insert eval placements"
  on public.eval_placements for insert
  to anon
  with check (child_id = (select public.current_student_id()));

create policy "students update eval placements"
  on public.eval_placements for update
  to anon
  using (child_id = (select public.current_student_id()))
  with check (child_id = (select public.current_student_id()));


insert into public.skill_prerequisites (skill_id, prerequisite_skill_id)
select skill.id, prior.id
from (
  values
    ('g2-place', 'g1-place'),
    ('g2-compare', 'g1-compare'),
    ('g2-add-sub', 'g1-add-10'),
    ('g2-groups', 'g1-share'),
    ('g2-fractions', 'g1-share'),
    ('g2-measure', 'g1-measure'),
    ('g2-data', 'g1-count'),
    ('g2-even-odd', 'g1-count'),
    ('g3-place', 'g2-place'),
    ('g3-add-sub', 'g2-add-sub'),
    ('g3-mult', 'g2-groups'),
    ('g3-fractions', 'g2-fractions'),
    ('g3-div-rem', 'g2-groups'),
    ('g3-perimeter', 'g2-measure'),
    ('g3-time', 'g2-measure'),
    ('g3-data', 'g2-data'),
    ('g4-place', 'g3-place'),
    ('g4-round', 'g3-place'),
    ('g4-decimals', 'g3-fractions'),
    ('g4-equiv', 'g3-fractions'),
    ('g4-mult', 'g3-mult'),
    ('g4-div', 'g3-div-rem'),
    ('g4-facts-10x10', 'g3-mult'),
    ('g4-area', 'g3-perimeter'),
    ('repeated-addition-of-unit-fractions', 'g3-fractions'),
    ('g5-place', 'g4-place'),
    ('g5-decimals', 'g4-decimals'),
    ('g5-mult', 'g4-mult'),
    ('g5-div-rem', 'g4-div'),
    ('g5-frac', 'g4-equiv'),
    ('g5-equations', 'g4-mult'),
    ('g5-area', 'g4-area'),
    ('g6-decimals', 'g5-decimals'),
    ('g6-ratios', 'g5-frac'),
    ('g6-percent', 'g5-frac'),
    ('g6-frac', 'g5-frac'),
    ('g6-equations', 'g5-equations'),
    ('g6-area', 'g5-area'),
    ('g6-surface', 'g5-area'),
    ('g6-data', 'g5-place')
) as pair(skill_slug, prior_slug)
join public.skill as skill on skill.slug = pair.skill_slug
join public.skill as prior on prior.slug = pair.prior_slug
on conflict do nothing;


insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000001'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What number comes just after {a}?","slots":[{"name":"a","min":1,"max":18}],"strand":"number","grade":1,"topic":"Counting on","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":12},"answer":"13"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g1-count';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000002'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What number comes just before {a}?","slots":[{"name":"a","min":2,"max":20}],"strand":"number","grade":1,"topic":"Counting back","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":6},"answer":"5"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g1-count';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000003'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"Which number is more, {a} or {b}?","slots":[{"name":"a","min":0,"max":20},{"name":"b","min":0,"max":20}],"strand":"number","grade":1,"topic":"Comparing","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":18,"b":6},"answer":"18"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g1-compare';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000004'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"The number {a} has how many ones?","slots":[{"name":"a","min":10,"max":19}],"strand":"number","grade":1,"topic":"Ones","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":14},"answer":"4"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g1-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000005'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is {a} + {b}?","slots":[{"name":"a","min":0,"max":8},{"name":"b","min":0,"max":8}],"strand":"operations","grade":1,"topic":"Adding","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":0,"b":6},"answer":"6"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g1-add-10';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000006'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is {a} - {b}?","slots":[{"name":"a","min":2,"max":10},{"name":"b","min":0,"max":8}],"strand":"operations","grade":1,"topic":"Subtracting","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":4,"b":3},"answer":"1"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g1-sub-10';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000007'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} shared by {b}. How many each?","slots":[{"name":"a","min":4,"max":10},{"name":"b","min":2,"max":5}],"strand":"operations","grade":1,"topic":"Equal shares","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":5,"b":5},"answer":"1"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g1-share';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000008'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} + what = {b}?","slots":[{"name":"a","min":0,"max":8},{"name":"b","min":2,"max":10}],"strand":"operations","grade":1,"topic":"Missing part","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":0,"b":7},"answer":"7"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g1-add-10';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000009'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} triangles have how many sides?","slots":[{"name":"a","min":1,"max":4}],"strand":"geometry","grade":1,"topic":"Triangle sides","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":1},"answer":"3","review":"No geometry skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g1-patterns';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000000a'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} squares have how many corners?","slots":[{"name":"a","min":1,"max":4}],"strand":"geometry","grade":1,"topic":"Square corners","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":4},"answer":"16","review":"No geometry skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g1-patterns';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000000b'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"Count the sides of {a} rectangles.","slots":[{"name":"a","min":1,"max":4}],"strand":"geometry","grade":1,"topic":"Rectangle sides","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":1},"answer":"4","review":"No geometry skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g1-patterns';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000000c'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"How much longer is {a} cm than {b} cm?","slots":[{"name":"a","min":3,"max":18},{"name":"b","min":1,"max":12}],"strand":"measurement","grade":1,"topic":"Length","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":15,"b":3},"answer":"12"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g1-measure';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000000d'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"A {a} cm ribbon and a {b} cm ribbon. How many cm in all?","slots":[{"name":"a","min":1,"max":10},{"name":"b","min":1,"max":10}],"strand":"measurement","grade":1,"topic":"Length in all","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":2,"b":1},"answer":"3"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g1-measure';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000000e'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} clips of {b} cm. How many cm?","slots":[{"name":"a","min":2,"max":5},{"name":"b","min":2,"max":4}],"strand":"measurement","grade":1,"topic":"Units of length","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":3,"b":3},"answer":"9"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g1-measure';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000000f'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"A string is {a} cm. You cut {b} cm. How many cm are left?","slots":[{"name":"a","min":6,"max":20},{"name":"b","min":1,"max":10}],"strand":"measurement","grade":1,"topic":"Length left","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":10,"b":2},"answer":"8"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g1-measure';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000010'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} cats and {b} dogs. How many pets?","slots":[{"name":"a","min":1,"max":10},{"name":"b","min":1,"max":10}],"strand":"data","grade":1,"topic":"Counts in all","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":6,"b":6},"answer":"12","review":"No data skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g1-count';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000011'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"How many more is {a} than {b}?","slots":[{"name":"a","min":3,"max":18},{"name":"b","min":1,"max":12}],"strand":"data","grade":1,"topic":"Compare counts","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":17,"b":6},"answer":"11","review":"No data skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g1-count';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000012'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"Which count is bigger, {a} or {b}?","slots":[{"name":"a","min":0,"max":20},{"name":"b","min":0,"max":20}],"strand":"data","grade":1,"topic":"Larger count","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":8,"b":10},"answer":"10","review":"No data skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g1-count';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000013'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"How many tens are in {a}?","slots":[{"name":"a","min":10,"max":99}],"strand":"number","grade":2,"topic":"Tens","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":57},"answer":"5"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g2-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000014'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"How many ones are in {a}?","slots":[{"name":"a","min":10,"max":99}],"strand":"number","grade":2,"topic":"Ones","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":69},"answer":"9"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g2-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000015'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"Which is greater, {a} or {b}?","slots":[{"name":"a","min":10,"max":99},{"name":"b","min":10,"max":99}],"strand":"number","grade":2,"topic":"Comparing","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":28,"b":46},"answer":"46"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g2-compare';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000016'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is half of {a}?","slots":[{"name":"a","min":2,"max":20}],"strand":"number","grade":2,"topic":"Half","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":8},"answer":"4"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g2-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000017'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is {a} + {b}?","slots":[{"name":"a","min":12,"max":60},{"name":"b","min":10,"max":40}],"strand":"operations","grade":2,"topic":"Adding","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":32,"b":15},"answer":"47"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g2-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000018'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is {a} - {b}?","slots":[{"name":"a","min":30,"max":99},{"name":"b","min":10,"max":70}],"strand":"operations","grade":2,"topic":"Subtracting","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":69,"b":42},"answer":"27"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g2-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000019'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} groups of {b}. How many in all?","slots":[{"name":"a","min":2,"max":8},{"name":"b","min":2,"max":8}],"strand":"operations","grade":2,"topic":"Equal groups","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":3,"b":8},"answer":"24"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g2-groups';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000001a'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"The next even number after {a} is what?","slots":[{"name":"a","min":2,"max":40}],"strand":"operations","grade":2,"topic":"Even numbers","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":20},"answer":"22"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g2-even-odd';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000001b'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} triangles have how many sides?","slots":[{"name":"a","min":2,"max":8}],"strand":"geometry","grade":2,"topic":"Triangle sides","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":5},"answer":"15","review":"No geometry skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g2-measure';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000001c'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} squares have how many corners?","slots":[{"name":"a","min":2,"max":8}],"strand":"geometry","grade":2,"topic":"Square corners","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":6},"answer":"24","review":"No geometry skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g2-measure';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000001d'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"Count the sides of {a} pentagons.","slots":[{"name":"a","min":1,"max":6}],"strand":"geometry","grade":2,"topic":"Five-sided shapes","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":1},"answer":"5","review":"No geometry skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g2-measure';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000001e'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"The rope is {a} cm. You add {b} cm. How many cm now?","slots":[{"name":"a","min":10,"max":60},{"name":"b","min":5,"max":30}],"strand":"measurement","grade":2,"topic":"Length","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":31,"b":10},"answer":"41"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g2-measure';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000001f'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} m is how many cm?","slots":[{"name":"a","min":1,"max":3}],"strand":"measurement","grade":2,"topic":"Metres","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":3},"answer":"300"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g2-measure';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000020'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"The path is {a} m. You walked {b} m. How many m are left?","slots":[{"name":"a","min":8,"max":30},{"name":"b","min":2,"max":20}],"strand":"measurement","grade":2,"topic":"Length left","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":30,"b":8},"answer":"22"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g2-measure';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000021'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"How many cm longer is {a} cm than {b} cm?","slots":[{"name":"a","min":20,"max":90},{"name":"b","min":5,"max":70}],"strand":"measurement","grade":2,"topic":"Compare length","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":38,"b":34},"answer":"4"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g2-measure';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000022'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a}, {b}, and {c}. How many in all?","slots":[{"name":"a","min":2,"max":20},{"name":"b","min":2,"max":20},{"name":"c","min":2,"max":20}],"strand":"data","grade":2,"topic":"Total count","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":4,"b":15,"c":20},"answer":"39"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g2-data';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000023'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"How many more is {a} than {b}?","slots":[{"name":"a","min":8,"max":40},{"name":"b","min":1,"max":30}],"strand":"data","grade":2,"topic":"Compare counts","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":15,"b":4},"answer":"11"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g2-data';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000024'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"Each picture is {a}. There are {b} pictures. How many?","slots":[{"name":"a","min":2,"max":5},{"name":"b","min":2,"max":8}],"strand":"data","grade":2,"topic":"Pictures","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":2,"b":4},"answer":"8"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g2-data';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000025'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"How many hundreds are in {a}?","slots":[{"name":"a","min":100,"max":999}],"strand":"number","grade":3,"topic":"Hundreds","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":646},"answer":"6"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000026'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is the tens digit of {a}?","slots":[{"name":"a","min":100,"max":999}],"strand":"number","grade":3,"topic":"Tens digit","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":796},"answer":"9"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000027'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"In {a}/{b}, what is the top number?","slots":[{"name":"a","min":1,"max":8},{"name":"b","min":2,"max":12}],"strand":"number","grade":3,"topic":"Numerator","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":1,"b":7},"answer":"1"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000028'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is half of {a}?","slots":[{"name":"a","min":2,"max":40}],"strand":"number","grade":3,"topic":"Half","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":26},"answer":"13"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000029'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is {a} + {b}?","slots":[{"name":"a","min":120,"max":600},{"name":"b","min":40,"max":400}],"strand":"operations","grade":3,"topic":"Adding","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":409,"b":337},"answer":"746"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000002a'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is {a} - {b}?","slots":[{"name":"a","min":250,"max":900},{"name":"b","min":40,"max":500}],"strand":"operations","grade":3,"topic":"Subtracting","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":474,"b":141},"answer":"333"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000002b'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is {a} times {b}?","slots":[{"name":"a","min":2,"max":10},{"name":"b","min":2,"max":10}],"strand":"operations","grade":3,"topic":"Multiplication","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":5,"b":8},"answer":"40"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000002c'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"How many groups of {b} are in {a}?","slots":[{"name":"a","min":12,"max":80},{"name":"b","min":2,"max":9}],"strand":"operations","grade":3,"topic":"Equal groups","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":68,"b":4},"answer":"17"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-div-rem';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000002d'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} put into groups of {b}. How many are left over?","slots":[{"name":"a","min":13,"max":80},{"name":"b","min":2,"max":9}],"strand":"operations","grade":3,"topic":"Left over","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":50,"b":6},"answer":"2"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-div-rem';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000002e'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} + what = {b}?","slots":[{"name":"a","min":40,"max":400},{"name":"b","min":120,"max":800}],"strand":"operations","grade":3,"topic":"Missing part","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":393,"b":738},"answer":"345"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000002f'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"A rectangle is {a} cm by {b} cm. How many cm is the long side?","slots":[{"name":"a","min":3,"max":20},{"name":"b","min":3,"max":20}],"strand":"geometry","grade":3,"topic":"Longer side","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":5,"b":18},"answer":"18","review":"No geometry skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-perimeter';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000030'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} triangles have how many corners?","slots":[{"name":"a","min":2,"max":8}],"strand":"geometry","grade":3,"topic":"Triangle corners","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":4},"answer":"12","review":"No geometry skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-perimeter';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000031'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"How many sides do {a} squares have in all?","slots":[{"name":"a","min":2,"max":8}],"strand":"geometry","grade":3,"topic":"Square sides","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":5},"answer":"20","review":"No geometry skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-perimeter';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000032'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"A rectangle is {a} cm by {b} cm. What is the perimeter in cm?","slots":[{"name":"a","min":3,"max":24},{"name":"b","min":2,"max":18}],"strand":"measurement","grade":3,"topic":"Perimeter","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":17,"b":17},"answer":"68"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-perimeter';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000033'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} hours and {b} more hours. How many hours?","slots":[{"name":"a","min":1,"max":8},{"name":"b","min":1,"max":6}],"strand":"measurement","grade":3,"topic":"Hours","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":7,"b":4},"answer":"11"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-time';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000034'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} hours is how many minutes?","slots":[{"name":"a","min":1,"max":4}],"strand":"measurement","grade":3,"topic":"Minutes","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":4},"answer":"240"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-time';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000035'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"The bars are {a}, {b}, and {c}. What is the total?","slots":[{"name":"a","min":2,"max":16},{"name":"b","min":2,"max":16},{"name":"c","min":2,"max":16}],"strand":"data","grade":3,"topic":"Bar total","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":16,"b":11,"c":4},"answer":"31"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-data';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000036'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"How many more is {a} than {b}?","slots":[{"name":"a","min":6,"max":24},{"name":"b","min":1,"max":16}],"strand":"data","grade":3,"topic":"Taller bar","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":16,"b":13},"answer":"3"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-data';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000037'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"Each picture stands for {a}. You see {b} pictures. How many?","slots":[{"name":"a","min":2,"max":5},{"name":"b","min":2,"max":8}],"strand":"data","grade":3,"topic":"Picture scale","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":3,"b":6},"answer":"18"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-data';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000038'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is the mean of {a}, {b}, and {c}?","slots":[{"name":"a","min":2,"max":12},{"name":"b","min":2,"max":12},{"name":"c","min":2,"max":12}],"strand":"data","grade":3,"topic":"Mean","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":6,"b":6,"c":6},"answer":"6"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-data';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000039'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"How many thousands are in {a}?","slots":[{"name":"a","min":1000,"max":9999}],"strand":"number","grade":4,"topic":"Thousands","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":7831},"answer":"7"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g4-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000003a'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"Round {a} to the nearest ten.","slots":[{"name":"a","min":21,"max":180}],"strand":"number","grade":4,"topic":"Nearest ten","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":120},"answer":"120"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g4-round';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000003b'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} tenths plus {b} tenths. How many tenths?","slots":[{"name":"a","min":1,"max":15},{"name":"b","min":1,"max":15}],"strand":"number","grade":4,"topic":"Tenths","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":15,"b":4},"answer":"19"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g4-decimals';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000003c'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} equal parts. Half of them is how many?","slots":[{"name":"a","min":4,"max":12}],"strand":"number","grade":4,"topic":"Half of the parts","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":8},"answer":"4"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g4-equiv';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000003d'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is {a} times {b}?","slots":[{"name":"a","min":12,"max":30},{"name":"b","min":2,"max":9}],"strand":"operations","grade":4,"topic":"Multiplying","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":22,"b":3},"answer":"66"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g4-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000003e'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"How many groups of {b} are in {a}?","slots":[{"name":"a","min":20,"max":96},{"name":"b","min":2,"max":9}],"strand":"operations","grade":4,"topic":"Dividing","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":34,"b":2},"answer":"17"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g4-div';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000003f'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is {a} times {b}?","slots":[{"name":"a","min":2,"max":10},{"name":"b","min":2,"max":10}],"strand":"operations","grade":4,"topic":"Facts","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":8,"b":9},"answer":"72"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g4-facts-10x10';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000040'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"In {a}/{b}, how many unit parts are counted?","slots":[{"name":"a","min":1,"max":8},{"name":"b","min":2,"max":12}],"strand":"operations","grade":4,"topic":"Unit parts","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":1,"b":7},"answer":"1"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'repeated-addition-of-unit-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000041'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} triangles have how many sides?","slots":[{"name":"a","min":2,"max":9}],"strand":"geometry","grade":4,"topic":"Triangle sides","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":5},"answer":"15","review":"No geometry skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g4-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000042'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} squares have how many corners?","slots":[{"name":"a","min":2,"max":9}],"strand":"geometry","grade":4,"topic":"Square corners","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":6},"answer":"24","review":"No geometry skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g4-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000043'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"Count the sides of {a} rectangles.","slots":[{"name":"a","min":2,"max":8}],"strand":"geometry","grade":4,"topic":"Rectangle sides","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":5},"answer":"20","review":"No geometry skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g4-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000044'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"A rectangle is {a} cm by {b} cm. What is the area?","slots":[{"name":"a","min":3,"max":20},{"name":"b","min":2,"max":12}],"strand":"measurement","grade":4,"topic":"Area","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":20,"b":4},"answer":"80"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g4-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000045'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"The area is {a} and the width is {b}. What is the length?","slots":[{"name":"a","min":12,"max":80},{"name":"b","min":2,"max":10}],"strand":"measurement","grade":4,"topic":"Missing side","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":75,"b":5},"answer":"15"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g4-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000046'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"A square side is {a} cm. What is the perimeter?","slots":[{"name":"a","min":3,"max":20}],"strand":"measurement","grade":4,"topic":"Square perimeter","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":19},"answer":"76"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g4-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000047'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"A side is {a} cm. Double it. How many cm?","slots":[{"name":"a","min":4,"max":40}],"strand":"measurement","grade":4,"topic":"Double a side","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":32},"answer":"64"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g4-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000048'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a}, {b}, and {c}. How many in all?","slots":[{"name":"a","min":4,"max":30},{"name":"b","min":4,"max":30},{"name":"c","min":4,"max":30}],"strand":"data","grade":4,"topic":"Total count","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":30,"b":29,"c":12},"answer":"71","review":"No data skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g4-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000049'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"How many more is {a} than {b}?","slots":[{"name":"a","min":12,"max":60},{"name":"b","min":2,"max":40}],"strand":"data","grade":4,"topic":"Compare counts","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":44,"b":24},"answer":"20","review":"No data skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g4-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000004a'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"Each picture is {a}. There are {b} pictures. How many?","slots":[{"name":"a","min":2,"max":10},{"name":"b","min":2,"max":8}],"strand":"data","grade":4,"topic":"Picture scale","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":6,"b":6},"answer":"36","review":"No data skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g4-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000004b'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"How many groups of 10000 are in {a}?","slots":[{"name":"a","min":10000,"max":99999}],"strand":"number","grade":5,"topic":"Ten thousands","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":95938},"answer":"9"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g5-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000004c'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is the hundreds digit of {a}?","slots":[{"name":"a","min":1000,"max":99999}],"strand":"number","grade":5,"topic":"Hundreds digit","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":85826},"answer":"8"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g5-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000004d'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} tenths plus {b} tenths. How many tenths?","slots":[{"name":"a","min":2,"max":40},{"name":"b","min":2,"max":40}],"strand":"number","grade":5,"topic":"Tenths","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":18,"b":16},"answer":"34"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g5-decimals';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000004e'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"In {a}/{b}, what is the top number?","slots":[{"name":"a","min":1,"max":10},{"name":"b","min":2,"max":12}],"strand":"number","grade":5,"topic":"Numerator","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":2,"b":11},"answer":"2"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g5-frac';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000004f'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is {a} times {b}?","slots":[{"name":"a","min":2,"max":12},{"name":"b","min":2,"max":12}],"strand":"operations","grade":5,"topic":"Facts","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":11,"b":12},"answer":"132"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g5-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000050'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} put into groups of {b}. How many are left over?","slots":[{"name":"a","min":40,"max":200},{"name":"b","min":6,"max":18}],"strand":"operations","grade":5,"topic":"Left over","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":119,"b":6},"answer":"5"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g5-div-rem';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000051'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} + n = {b}. What is n?","slots":[{"name":"a","min":3,"max":40},{"name":"b","min":10,"max":90}],"strand":"operations","grade":5,"topic":"Equation","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":6,"b":49},"answer":"43"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g5-equations';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000052'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"How many groups of {b} are in {a}?","slots":[{"name":"a","min":24,"max":144},{"name":"b","min":2,"max":12}],"strand":"operations","grade":5,"topic":"Equal groups","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":90,"b":2},"answer":"45"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g5-div-rem';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000053'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} triangles have how many sides?","slots":[{"name":"a","min":2,"max":10}],"strand":"geometry","grade":5,"topic":"Triangle sides","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":3},"answer":"9","review":"No geometry skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g5-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000054'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} squares have how many corners?","slots":[{"name":"a","min":2,"max":10}],"strand":"geometry","grade":5,"topic":"Square corners","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":10},"answer":"40","review":"No geometry skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g5-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000055'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"Count the sides of {a} rectangles.","slots":[{"name":"a","min":2,"max":9}],"strand":"geometry","grade":5,"topic":"Rectangle sides","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":3},"answer":"12","review":"No geometry skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g5-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000056'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"A triangle has base {a} and height {b}. What is the area?","slots":[{"name":"a","min":4,"max":20},{"name":"b","min":2,"max":16}],"strand":"measurement","grade":5,"topic":"Triangle area","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":9,"b":12},"answer":"54"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g5-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000057'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"A rectangle is {a} cm by {b} cm. What is the area?","slots":[{"name":"a","min":6,"max":30},{"name":"b","min":4,"max":18}],"strand":"measurement","grade":5,"topic":"Rectangle area","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":15,"b":15},"answer":"225"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g5-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000058'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"A box is {a} by {b} by {c} cubes. How many cubes?","slots":[{"name":"a","min":2,"max":6},{"name":"b","min":2,"max":6},{"name":"c","min":2,"max":6}],"strand":"measurement","grade":5,"topic":"Cubes in a box","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":6,"b":5,"c":3},"answer":"90","review":"No g5-volume skill row. Linked to g5-area."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g5-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000059'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"A rectangle is {a} cm by {b} cm. What is the perimeter in cm?","slots":[{"name":"a","min":5,"max":30},{"name":"b","min":3,"max":20}],"strand":"measurement","grade":5,"topic":"Perimeter","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":12,"b":3},"answer":"30"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g5-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000005a'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a}, {b}, and {c}. How many in all?","slots":[{"name":"a","min":8,"max":40},{"name":"b","min":8,"max":40},{"name":"c","min":8,"max":40}],"strand":"data","grade":5,"topic":"Total count","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":18,"b":22,"c":28},"answer":"68","review":"No data skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g5-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000005b'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"How many more is {a} than {b}?","slots":[{"name":"a","min":20,"max":80},{"name":"b","min":4,"max":50}],"strand":"data","grade":5,"topic":"Compare counts","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":66,"b":41},"answer":"25","review":"No data skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g5-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000005c'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"Each picture is {a}. There are {b} pictures. How many?","slots":[{"name":"a","min":2,"max":12},{"name":"b","min":2,"max":8}],"strand":"data","grade":5,"topic":"Picture scale","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":4,"b":6},"answer":"24","review":"No data skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g5-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000005d'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} tenths plus {b} tenths. How many tenths?","slots":[{"name":"a","min":3,"max":50},{"name":"b","min":3,"max":50}],"strand":"number","grade":6,"topic":"Tenths","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":6,"b":26},"answer":"32"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g6-decimals';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000005e'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"For every {a} red there are {b} blue. There are {c} groups. How many blue?","slots":[{"name":"a","min":2,"max":6},{"name":"b","min":2,"max":8},{"name":"c","min":2,"max":6}],"strand":"number","grade":6,"topic":"Ratio","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":2,"b":2,"c":6},"answer":"12"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g6-ratios';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000005f'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is {p} percent of {n}?","slots":[{"name":"p","min":0,"max":3},{"name":"n","min":8,"max":80}],"strand":"number","grade":6,"topic":"Percent","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"p":3,"n":80},"answer":"40"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g6-percent';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000060'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is 1/{b} of {a}?","slots":[{"name":"a","min":12,"max":72},{"name":"b","min":2,"max":8}],"strand":"number","grade":6,"topic":"Fraction of a number","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":70,"b":5},"answer":"14"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g6-frac';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000061'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"n + {a} = {b}. What is n?","slots":[{"name":"a","min":4,"max":40},{"name":"b","min":12,"max":90}],"strand":"operations","grade":6,"topic":"Equation","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":16,"b":47},"answer":"31"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g6-equations';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000062'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"n - {a} = {b}. What is n?","slots":[{"name":"a","min":2,"max":30},{"name":"b","min":4,"max":50}],"strand":"operations","grade":6,"topic":"Equation","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":23,"b":26},"answer":"49"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g6-equations';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000063'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is {a}/{b} of {c}?","slots":[{"name":"a","min":1,"max":5},{"name":"b","min":2,"max":8},{"name":"c","min":12,"max":64}],"strand":"operations","grade":6,"topic":"Fraction of a set","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":1,"b":2,"c":38},"answer":"19"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g6-frac';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000064'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"How many groups of {b} are in {a}?","slots":[{"name":"a","min":24,"max":120},{"name":"b","min":3,"max":12}],"strand":"operations","grade":6,"topic":"Equal groups","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":69,"b":3},"answer":"23"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g6-equations';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000065'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} triangles have how many sides?","slots":[{"name":"a","min":2,"max":10}],"strand":"geometry","grade":6,"topic":"Triangle sides","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":7},"answer":"21","review":"No geometry skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g6-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000066'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"{a} squares have how many corners?","slots":[{"name":"a","min":2,"max":10}],"strand":"geometry","grade":6,"topic":"Square corners","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":7},"answer":"28","review":"No geometry skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g6-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000067'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"Count the sides of {a} rectangles.","slots":[{"name":"a","min":2,"max":9}],"strand":"geometry","grade":6,"topic":"Rectangle sides","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":8},"answer":"32","review":"No geometry skill in this grade. Linked to the nearest skill."}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g6-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000068'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"A triangle has base {a} and height {b}. What is the area?","slots":[{"name":"a","min":4,"max":24},{"name":"b","min":2,"max":18}],"strand":"measurement","grade":6,"topic":"Triangle area","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":8,"b":4},"answer":"16"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g6-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-000000000069'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"A rectangle is {a} cm by {b} cm. What is the area?","slots":[{"name":"a","min":6,"max":30},{"name":"b","min":4,"max":16}],"strand":"measurement","grade":6,"topic":"Rectangle area","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":21,"b":12},"answer":"252"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g6-area';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000006a'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"A cube side is {a}. What is the area of one face?","slots":[{"name":"a","min":2,"max":12}],"strand":"measurement","grade":6,"topic":"One face","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":2},"answer":"4"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g6-surface';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000006b'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"A prism has 3 pairs of faces. Each pair has area {a}. What is the surface area?","slots":[{"name":"a","min":6,"max":40}],"strand":"measurement","grade":6,"topic":"Surface","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":40},"answer":"120"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g6-surface';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000006c'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is the mean of {a}, {b}, and {c}?","slots":[{"name":"a","min":2,"max":18},{"name":"b","min":2,"max":18},{"name":"c","min":2,"max":18}],"strand":"data","grade":6,"topic":"Mean","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":18,"b":12,"c":9},"answer":"13"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g6-data';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000006d'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"What is the median of {a}, {b}, and {c}?","slots":[{"name":"a","min":1,"max":20},{"name":"b","min":1,"max":20},{"name":"c","min":1,"max":20}],"strand":"data","grade":6,"topic":"Median","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":3,"b":12,"c":12},"answer":"12"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g6-data';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '22222222-0000-4000-8000-00000000006e'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval${"prompt":"From {a} up to {b}, what is the gap?","slots":[{"name":"a","min":2,"max":30},{"name":"b","min":10,"max":60}],"strand":"data","grade":6,"topic":"Range","rule":"Same slots and answer rule. The post form draws different numbers.","sample":{"a":15,"b":39},"answer":"24"}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g6-data';
