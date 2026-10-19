import { CATCH_UP_ITEMS, GUIDED_EXAMPLES } from "@/lib/reteach/catalog";

function itemId(prefix: string, index: number): string {
  return `${prefix}-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

function json(value: unknown): string {
  const body = JSON.stringify(value);
  if (body.includes("$rt$")) throw new Error("A template contains the SQL quote marker.");
  if (Buffer.byteLength(body) > 8000) throw new Error("A template is over 8,000 bytes.");
  return body;
}

export function renderReteachSql(): string {
  const header = `-- Re-teach events and catch-up drafts.
-- Do not apply this file from the app, and do not run it against hosted Supabase from here.
-- Every content row stays a draft. Wording was drafted offline, so source is ai_draft.
-- Practice still requests published core or review items. These rows stay draft.
--
-- reteach_events uses the same parent scope as attempts:
-- a parent reads rows only for their own children, and a student writes only their own rows.
-- reteach_rate_counts() is admin-only and returns no child id.

alter table public.content_items
  add column if not exists manipulative text not null default 'none',
  add column if not exists cra_stage text not null default 'abstract',
  add column if not exists segment_variant text not null default 'standard';

alter table public.content_items drop constraint if exists content_items_manipulative_check;
alter table public.content_items
  add constraint content_items_manipulative_check
  check (manipulative in ('none', 'base_ten', 'number_line', 'fraction_bars'));

alter table public.content_items drop constraint if exists content_items_cra_stage_check;
alter table public.content_items
  add constraint content_items_cra_stage_check
  check (cra_stage in ('concrete', 'representational', 'abstract'));

alter table public.content_items drop constraint if exists content_items_segment_variant_check;
alter table public.content_items
  add constraint content_items_segment_variant_check
  check (segment_variant in ('catch_up', 'standard', 'go_further'));

create table if not exists public.reteach_events (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  current_skill text not null check (char_length(current_skill) between 1 and 80),
  prerequisite_skill text not null check (char_length(prerequisite_skill) between 1 and 80),
  trigger_item_ids uuid[] not null default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  outcome text,
  prereq_items_correct smallint,
  constraint reteach_events_outcome_check check (
    outcome is null or outcome in ('returned', 'needs_review', 'abandoned')
  ),
  constraint reteach_events_correct_check check (
    prereq_items_correct is null or prereq_items_correct between 0 and 3
  ),
  constraint reteach_events_trigger_len check (cardinality(trigger_item_ids) <= 8)
);

alter table public.reteach_events enable row level security;

drop policy if exists "students insert reteach events" on public.reteach_events;
create policy "students insert reteach events"
  on public.reteach_events for insert
  to anon
  with check (child_id = (select public.current_student_id()));

drop policy if exists "students update their reteach events" on public.reteach_events;
create policy "students update their reteach events"
  on public.reteach_events for update
  to anon
  using (child_id = (select public.current_student_id()))
  with check (child_id = (select public.current_student_id()));

drop policy if exists "students read their reteach events" on public.reteach_events;
create policy "students read their reteach events"
  on public.reteach_events for select
  to anon
  using (child_id = (select public.current_student_id()));

drop policy if exists "parents read reteach events" on public.reteach_events;
create policy "parents read reteach events"
  on public.reteach_events for select
  to authenticated
  using (
    exists (
      select 1 from public.children
      where children.id = reteach_events.child_id
        and children.parent_id = (select auth.uid())
    )
  );

grant insert, select, update on public.reteach_events to anon;
grant select on public.reteach_events to authenticated;

create or replace function public.reteach_rate_counts()
returns table (
  current_skill text,
  prerequisite_skill text,
  fires bigint,
  returned bigint,
  needs_review bigint,
  abandoned bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_content_admin() then
    raise exception 'Admin only.';
  end if;
  return query
  select
    events.current_skill,
    events.prerequisite_skill,
    count(*)::bigint as fires,
    count(*) filter (where events.outcome = 'returned')::bigint as returned,
    count(*) filter (where events.outcome = 'needs_review')::bigint as needs_review,
    count(*) filter (where events.outcome = 'abandoned')::bigint as abandoned
  from public.reteach_events as events
  group by events.current_skill, events.prerequisite_skill;
end;
$$;

revoke all on function public.reteach_rate_counts() from public, anon, authenticated;
grant execute on function public.reteach_rate_counts() to authenticated;

comment on function public.reteach_rate_counts() is
  'Admin-only re-teach counts per skill and prerequisite. The result has no child id.';

insert into public.skill_prerequisites (skill_id, prerequisite_skill_id)
select skill.id, prior.id
from (
  values
    ('g3-place', 'g2-place'),
    ('g3-add-sub', 'g2-add-sub'),
    ('g3-mult', 'g2-groups'),
    ('g3-div-rem', 'g2-groups'),
    ('g3-fractions', 'g2-fractions'),
    ('g3-perimeter', 'g2-measure'),
    ('g3-time', 'g2-measure'),
    ('g3-data', 'g2-data')
) as pair (skill_slug, prior_slug)
join public.skill as skill on skill.slug = pair.skill_slug
join public.skill as prior on prior.slug = pair.prior_slug
on conflict do nothing;
`;

  const catchUp = CATCH_UP_ITEMS.map((item, index) => {
    const body = json({
      prompt: item.prompt,
      slots: {},
      answer: item.answer,
      topic: item.topic,
      surface: "catch-up",
      prerequisite: item.prerequisite,
      style: "guided",
    });
    return insertItem({
      id: itemId("44444444", index + 1),
      skill: item.skill,
      questionType: "numeric",
      manipulative: item.manipulative,
      stage: item.stage,
      segment: "catch_up",
      body,
    });
  }).join("\n");

  const guided = GUIDED_EXAMPLES.map((example, index) => {
    const body = json({
      prompt: example.prompt,
      slots: {},
      answer: example.answer,
      topic: example.topic,
      surface: "reteach",
      style: "guided",
      steps: example.steps,
    });
    return insertItem({
      id: itemId("55555555", index + 1),
      skill: example.skill,
      questionType: "explanation",
      manipulative: "none",
      stage: "abstract",
      segment: "standard",
      body,
    });
  }).join("\n");

  return `${header}\n${catchUp}\n${guided}\n`;
}

function insertItem(input: {
  id: string;
  skill: string;
  questionType: string;
  manipulative: string;
  stage: string;
  segment: string;
  body: string;
}): string {
  return `
insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '${input.id}'::uuid,
  skill.id,
  '${input.questionType}',
  'core',
  1,
  $rt$${input.body}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  '${input.manipulative}',
  '${input.stage}',
  '${input.segment}'
from public.skill as skill
where skill.slug = '${input.skill}';`;
}
