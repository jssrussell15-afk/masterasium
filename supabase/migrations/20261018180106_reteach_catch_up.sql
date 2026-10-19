-- Re-teach events and catch-up drafts.
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


insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-000000000001'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"Group the ones in 46 + 27.","slots":{},"answer":"73","topic":"Adding","surface":"catch-up","prerequisite":"g2-add-sub","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'base_ten',
  'concrete',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-000000000002'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"The picture shows the tens and ones in 46 + 27. What is the sum?","slots":{},"answer":"73","topic":"Adding","surface":"catch-up","prerequisite":"g2-add-sub","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'base_ten',
  'representational',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-000000000003'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"46 + 27 = ?","slots":{},"answer":"73","topic":"Adding","surface":"catch-up","prerequisite":"g2-add-sub","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'none',
  'abstract',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-000000000004'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"Make 352 with blocks. What is the 5 worth?","slots":{},"answer":"50","topic":"Place value","surface":"catch-up","prerequisite":"g2-place","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'base_ten',
  'concrete',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-000000000005'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"The picture shows 3 hundreds, 5 tens, and 2 ones. What is the 5 worth?","slots":{},"answer":"50","topic":"Place value","surface":"catch-up","prerequisite":"g2-place","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'base_ten',
  'representational',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-000000000006'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"In 352, what is the 5 worth?","slots":{},"answer":"50","topic":"Place value","surface":"catch-up","prerequisite":"g2-place","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'none',
  'abstract',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-000000000007'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"Jump by 6, four times. Where do you land?","slots":{},"answer":"24","topic":"Equal groups","surface":"catch-up","prerequisite":"g2-groups","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'number_line',
  'concrete',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-000000000008'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"The picture shows 4 jumps of 6. What is 4 times 6?","slots":{},"answer":"24","topic":"Equal groups","surface":"catch-up","prerequisite":"g2-groups","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'number_line',
  'representational',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-000000000009'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"4 × 6 = ?","slots":{},"answer":"24","topic":"Equal groups","surface":"catch-up","prerequisite":"g2-groups","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'none',
  'abstract',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-00000000000a'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"Jump by 5. How many full jumps fit into 17?","slots":{},"answer":"3","topic":"Equal groups","surface":"catch-up","prerequisite":"g2-groups","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'number_line',
  'concrete',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-div-rem';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-00000000000b'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"The picture shows jumps of 5 up to 17. How many full jumps fit?","slots":{},"answer":"3","topic":"Equal groups","surface":"catch-up","prerequisite":"g2-groups","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'number_line',
  'representational',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-div-rem';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-00000000000c'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"How many full groups of 5 fit into 17?","slots":{},"answer":"3","topic":"Equal groups","surface":"catch-up","prerequisite":"g2-groups","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'none',
  'abstract',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-div-rem';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-00000000000d'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"Split the bar into 4 equal parts. Shade 3. How many parts are shaded?","slots":{},"answer":"3","topic":"Fractions","surface":"catch-up","prerequisite":"g2-fractions","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'fraction_bars',
  'concrete',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-00000000000e'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"The picture shows a bar in 4 equal parts, with 3 shaded. How many are shaded?","slots":{},"answer":"3","topic":"Fractions","surface":"catch-up","prerequisite":"g2-fractions","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'fraction_bars',
  'representational',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-00000000000f'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"3 of 4 equal parts are shaded. How many parts are shaded?","slots":{},"answer":"3","topic":"Fractions","surface":"catch-up","prerequisite":"g2-fractions","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'none',
  'abstract',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-000000000010'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"A rectangle is 6 cm by 4 cm. Jump each side. How far around?","slots":{},"answer":"20","topic":"Perimeter","surface":"catch-up","prerequisite":"g2-measure","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'number_line',
  'concrete',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-perimeter';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-000000000011'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"The picture shows sides of 6 cm and 4 cm. How far around?","slots":{},"answer":"20","topic":"Perimeter","surface":"catch-up","prerequisite":"g2-measure","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'number_line',
  'representational',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-perimeter';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-000000000012'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"A rectangle is 6 cm by 4 cm. What is the distance around?","slots":{},"answer":"20","topic":"Perimeter","surface":"catch-up","prerequisite":"g2-measure","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'none',
  'abstract',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-perimeter';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-000000000013'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"Start at 15 minutes. Jump 20. What minute do you land on?","slots":{},"answer":"35","topic":"Time","surface":"catch-up","prerequisite":"g2-measure","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'number_line',
  'concrete',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-time';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-000000000014'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"The picture shows a jump of 20 from 15 minutes. Where do you land?","slots":{},"answer":"35","topic":"Time","surface":"catch-up","prerequisite":"g2-measure","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'number_line',
  'representational',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-time';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-000000000015'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"15 + 20 = ?","slots":{},"answer":"35","topic":"Time","surface":"catch-up","prerequisite":"g2-measure","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'none',
  'abstract',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-time';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-000000000016'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"The cat bar is 4. Jump 7 more for the dogs. How many animals?","slots":{},"answer":"11","topic":"Data","surface":"catch-up","prerequisite":"g2-data","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'number_line',
  'concrete',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-data';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-000000000017'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"The picture shows a bar of 4 and a bar of 7. How many in all?","slots":{},"answer":"11","topic":"Data","surface":"catch-up","prerequisite":"g2-data","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'number_line',
  'representational',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-data';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '44444444-0000-4000-8000-000000000018'::uuid,
  skill.id,
  'numeric',
  'core',
  1,
  $rt${"prompt":"4 + 7 = ?","slots":{},"answer":"11","topic":"Data","surface":"catch-up","prerequisite":"g2-data","style":"guided"}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'none',
  'abstract',
  'catch_up'
from public.skill as skill
where skill.slug = 'g3-data';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '55555555-0000-4000-8000-000000000001'::uuid,
  skill.id,
  'explanation',
  'core',
  1,
  $rt${"prompt":"46 + 27 = ?","slots":{},"answer":"73","topic":"Adding","surface":"reteach","style":"guided","steps":["Add the ones first.","Trade 10 ones for a ten.","Add the tens next.","The sum is 73."]}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'none',
  'abstract',
  'standard'
from public.skill as skill
where skill.slug = 'g2-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '55555555-0000-4000-8000-000000000002'::uuid,
  skill.id,
  'explanation',
  'core',
  1,
  $rt${"prompt":"52 − 18 = ?","slots":{},"answer":"34","topic":"Subtracting","surface":"reteach","style":"guided","steps":["Start with the ones.","Trade a ten when you need more ones.","Subtract the tens.","The difference is 34."]}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'none',
  'abstract',
  'standard'
from public.skill as skill
where skill.slug = 'g2-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '55555555-0000-4000-8000-000000000003'::uuid,
  skill.id,
  'explanation',
  'core',
  1,
  $rt${"prompt":"In 83, what is the 8 worth?","slots":{},"answer":"80","topic":"Place value","surface":"reteach","style":"guided","steps":["Find the 8.","The 8 is in the tens.","8 tens is 80.","Type 80."]}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'none',
  'abstract',
  'standard'
from public.skill as skill
where skill.slug = 'g2-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '55555555-0000-4000-8000-000000000004'::uuid,
  skill.id,
  'explanation',
  'core',
  1,
  $rt${"prompt":"4 groups of 3. How many?","slots":{},"answer":"12","topic":"Equal groups","surface":"reteach","style":"guided","steps":["Make 4 groups.","Each group has 3.","Count every group.","There are 12."]}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'none',
  'abstract',
  'standard'
from public.skill as skill
where skill.slug = 'g2-groups';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '55555555-0000-4000-8000-000000000005'::uuid,
  skill.id,
  'explanation',
  'core',
  1,
  $rt${"prompt":"5 groups of 2. How many?","slots":{},"answer":"10","topic":"Equal groups","surface":"reteach","style":"guided","steps":["Make 5 groups.","Each group has 2.","Count every group.","There are 10."]}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'none',
  'abstract',
  'standard'
from public.skill as skill
where skill.slug = 'g2-groups';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '55555555-0000-4000-8000-000000000006'::uuid,
  skill.id,
  'explanation',
  'core',
  1,
  $rt${"prompt":"A bar has 2 equal parts. 1 is shaded. How many are shaded?","slots":{},"answer":"1","topic":"Fractions","surface":"reteach","style":"guided","steps":["Count the equal parts.","Count the shaded part.","1 part is shaded.","Type 1."]}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'none',
  'abstract',
  'standard'
from public.skill as skill
where skill.slug = 'g2-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '55555555-0000-4000-8000-000000000007'::uuid,
  skill.id,
  'explanation',
  'core',
  1,
  $rt${"prompt":"A ribbon is 8 cm. You cut 3 cm. How many cm are left?","slots":{},"answer":"5","topic":"Length","surface":"reteach","style":"guided","steps":["Start at 8 cm.","Take away 3 cm.","5 cm are left.","Type 5."]}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'none',
  'abstract',
  'standard'
from public.skill as skill
where skill.slug = 'g2-measure';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '55555555-0000-4000-8000-000000000008'::uuid,
  skill.id,
  'explanation',
  'core',
  1,
  $rt${"prompt":"Which is more, 46 or 28?","slots":{},"answer":"46","topic":"Comparing","surface":"reteach","style":"guided","steps":["Look at the tens first.","4 tens is more than 2 tens.","46 is more.","Type 46."]}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'none',
  'abstract',
  'standard'
from public.skill as skill
where skill.slug = 'g2-compare';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '55555555-0000-4000-8000-000000000009'::uuid,
  skill.id,
  'explanation',
  'core',
  1,
  $rt${"prompt":"Is 8 even or odd? Type 8 if it is even.","slots":{},"answer":"8","topic":"Even and odd","surface":"reteach","style":"guided","steps":["Even numbers make pairs.","8 makes 4 pairs.","8 is even.","Type 8."]}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'none',
  'abstract',
  'standard'
from public.skill as skill
where skill.slug = 'g2-even-odd';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version,
  manipulative, cra_stage, segment_variant
)
select
  '55555555-0000-4000-8000-00000000000a'::uuid,
  skill.id,
  'explanation',
  'core',
  1,
  $rt${"prompt":"A graph shows 3 cats and 4 dogs. How many pets?","slots":{},"answer":"7","topic":"Data","surface":"reteach","style":"guided","steps":["Read the cat bar.","Read the dog bar.","Add the two bars.","There are 7."]}$rt$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1,
  'none',
  'abstract',
  'standard'
from public.skill as skill
where skill.slug = 'g2-data';
