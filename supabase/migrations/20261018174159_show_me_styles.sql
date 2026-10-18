-- Show me style drafts.
-- Do not apply this file from the app, and do not run it against hosted Supabase from here.
-- Every content row stays a draft. Wording was drafted offline, so source is ai_draft.
--
-- Styles live in template.variants on one row per Show me template.
-- A separate example_style column would split one walk into three rows and make the
-- guided captions drift from the buggy step. The array keeps the guided steps, the
-- faded tail, and each single wrong step together.
-- Practice still requests published core or review items. These rows stay draft.

alter table public.practice_events drop constraint if exists practice_events_kind_check;
alter table public.practice_events add constraint practice_events_kind_check
  check (kind in (
    'intro_viewed', 'hint_rung', 'question_attempted', 'time_on_task', 'show_me_style'
  ));


insert into public.misconceptions (id, skill_id, description)
select
  'hour_stays_past_sixty',
  skill.id,
  'The hour was left in place after the minutes passed 60.'
from public.skill as skill
where skill.slug = 'g3-time'
on conflict (id) do update set description = excluded.description;


insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '33333333-0000-4000-8000-000000000001'::uuid,
  skill.id,
  'explanation',
  'core',
  1,
  $show${"prompt":"46 + 27 = ?","slots":{},"answer":"73","topic":"Regrouping","surface":"show-me","fadeCount":2,"misconceptionId":"forgot_carried_ten","steps":[{"caption":"Add the ones first.","result":13},{"caption":"Trade 10 ones for a ten.","result":10},{"caption":"Add the tens next.","result":70},{"caption":"The sum is 73.","result":73}],"variants":[{"id":"g3-add-trade-a","exampleStyle":"buggy","wrongIndex":1,"wrongCaption":"The ones are 6 + 7 = 3. No trade is needed.","wrongResult":3,"misconceptionId":"forgot_carried_ten"},{"id":"g3-add-trade-b","exampleStyle":"buggy","wrongIndex":0,"wrongCaption":"Add the tens first and skip the ones.","wrongResult":60,"misconceptionId":"forgot_carried_ten"}],"standard":{"exampleStyle":"standard","fadeCount":2}}$show$::jsonb,
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
  '33333333-0000-4000-8000-000000000002'::uuid,
  skill.id,
  'explanation',
  'core',
  1,
  $show${"prompt":"4 × 6 = ?","slots":{},"answer":"24","topic":"Equal groups","surface":"show-me","fadeCount":2,"misconceptionId":"added_instead_of_grouped","steps":[{"caption":"Make 4 groups.","result":4},{"caption":"Each group has 6.","result":6},{"caption":"Count the groups.","result":24},{"caption":"There are 24.","result":24}],"variants":[{"id":"g3-groups-a","exampleStyle":"buggy","wrongIndex":2,"wrongCaption":"4 + 6 is 10.","wrongResult":10,"misconceptionId":"added_instead_of_grouped"},{"id":"g3-groups-b","exampleStyle":"buggy","wrongIndex":2,"wrongCaption":"4 groups of 4 is 16.","wrongResult":16,"misconceptionId":"added_instead_of_grouped"}],"standard":{"exampleStyle":"standard","fadeCount":2}}$show$::jsonb,
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
  '33333333-0000-4000-8000-000000000003'::uuid,
  skill.id,
  'explanation',
  'core',
  1,
  $show${"prompt":"A line has 4 equal parts. You hop 3.","slots":{},"answer":"3/4","topic":"Fractions","surface":"show-me","fadeCount":2,"misconceptionId":"counted_tick_marks_not_spaces","steps":[{"caption":"Count the equal parts.","result":4},{"caption":"Hop 3 parts.","result":3},{"caption":"The fraction is 3/4.","result":4},{"caption":"Type 3/4.","result":4}],"variants":[{"id":"g3-fraction-hop-a","exampleStyle":"buggy","wrongIndex":0,"wrongCaption":"Count 3 tick marks. The fraction is 3/3.","wrongResult":3,"misconceptionId":"counted_tick_marks_not_spaces"},{"id":"g3-fraction-hop-b","exampleStyle":"buggy","wrongIndex":0,"wrongCaption":"The whole line is 3 parts.","wrongResult":3,"misconceptionId":"counted_tick_marks_not_spaces"}],"standard":{"exampleStyle":"standard","fadeCount":2}}$show$::jsonb,
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
  '33333333-0000-4000-8000-000000000004'::uuid,
  skill.id,
  'explanation',
  'core',
  1,
  $show${"prompt":"In 352, what is the 5 worth?","slots":{},"answer":"50","topic":"Place value","surface":"show-me","fadeCount":2,"misconceptionId":"compared_digits_not_place_value","steps":[{"caption":"Find the 5.","result":5},{"caption":"The 5 is in the tens.","result":10},{"caption":"The 5 is worth 50.","result":50},{"caption":"Type 50.","result":50}],"variants":[{"id":"g3-place-tens-a","exampleStyle":"buggy","wrongIndex":2,"wrongCaption":"The 5 is worth 5.","wrongResult":5,"misconceptionId":"compared_digits_not_place_value"},{"id":"g3-place-tens-b","exampleStyle":"buggy","wrongIndex":2,"wrongCaption":"The 5 is worth 500.","wrongResult":500,"misconceptionId":"compared_digits_not_place_value"}],"standard":{"exampleStyle":"standard","fadeCount":2}}$show$::jsonb,
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
  '33333333-0000-4000-8000-000000000005'::uuid,
  skill.id,
  'explanation',
  'core',
  1,
  $show${"prompt":"It is 2:50. What time is it 20 minutes later?","slots":{},"answer":"3:10","topic":"Time","surface":"show-me","fadeCount":2,"misconceptionId":"hour_stays_past_sixty","steps":[{"caption":"Start at 2:50.","result":2},{"caption":"Add the 20.","result":20},{"caption":"The new time is 3:10.","result":10},{"caption":"The hour moves to 3.","result":3}],"variants":[{"id":"g3-time-later-a","exampleStyle":"buggy","wrongIndex":3,"wrongCaption":"The hour stays 2.","wrongResult":2,"misconceptionId":"hour_stays_past_sixty"},{"id":"g3-time-later-b","exampleStyle":"buggy","wrongIndex":2,"wrongCaption":"The minutes stay 70.","wrongResult":70,"misconceptionId":"hour_stays_past_sixty"}],"standard":{"exampleStyle":"standard","fadeCount":2}}$show$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-time';
