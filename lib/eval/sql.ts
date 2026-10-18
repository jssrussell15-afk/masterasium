import { evalRows } from "@/lib/eval/catalog";
import { EVAL_PREREQ } from "@/lib/eval/links";

function jsonBody(row: ReturnType<typeof evalRows>[number]): string {
  const body: Record<string, unknown> = {
    prompt: row.template.prompt,
    slots: row.template.slots,
    strand: row.template.strand,
    grade: row.template.grade,
    topic: row.template.topic,
    rule: "Same slots and answer rule. The post form draws different numbers.",
    sample: row.sample,
    answer: row.sampleAnswer,
  };
  if (row.template.review) body.review = row.template.review;
  const json = JSON.stringify(body);
  if (json.includes("$eval$")) throw new Error(`Template ${row.template.id} contains the SQL quote marker.`);
  if (Buffer.byteLength(json) > 8000) throw new Error(`Template ${row.template.id} is over 8,000 bytes.`);
  return json;
}

function prereqSql(): string {
  const values = Object.entries(EVAL_PREREQ)
    .map(([skill, prior]) => `    ('${skill}', '${prior}')`)
    .join(",\n");
  return `
insert into public.skill_prerequisites (skill_id, prerequisite_skill_id)
select skill.id, prior.id
from (
  values
${values}
) as pair(skill_slug, prior_slug)
join public.skill as skill on skill.slug = pair.skill_slug
join public.skill as prior on prior.slug = pair.prior_slug
on conflict do nothing;
`;
}

export function renderEvalSql(): string {
  const header = `-- Grade-band check-in drafts.
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
`;

  const items = evalRows()
    .map((row) => {
      const json = jsonBody(row);
      return `
insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '${row.id}'::uuid,
  skill.id,
  'numeric',
  'eval',
  1,
  $eval$${json}$eval$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = '${row.skillSlug}';`;
    })
    .join("\n");

  return `${header}\n${prereqSql()}\n${items}\n`;
}
