-- Phase 1 Go further drafts.
-- Do not apply this file from the app, and do not run it against hosted Supabase from here.
-- Every row stays a draft. Wording was drafted offline, so source is ai_draft.
-- There is no live model call in this migration.

alter table public.content_items drop constraint if exists content_items_question_type_check;
alter table public.content_items add constraint content_items_question_type_check
  check (question_type in (
    'numeric', 'compare', 'balance', 'true-false', 'many-ways', 'bar', 'pattern', 'explanation',
    'open', 'estimate', 'mistake', 'logic'
  ));

alter table public.content_items drop constraint if exists content_items_checker_check;
alter table public.content_items add constraint content_items_checker_check
  check (checker in ('numeric-equal', 'choice-match', 'true-false', 'conditions', 'mistake-line'));

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000001'::uuid,
  skill.id,
  'open',
  'go_further',
  1,
  $p1${"prompt":"Name two numbers that add to 132 and differ by 62.","slots":{"sum":132,"diff":62},"answer":"97 and 35","rule":"sum-diff","topic":"Regrouping"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000002'::uuid,
  skill.id,
  'open',
  'go_further',
  2,
  $p1${"prompt":"Name two numbers that add to 622 and differ by 164.","slots":{"sum":622,"diff":164},"answer":"393 and 229","rule":"sum-diff","topic":"Regrouping"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000003'::uuid,
  skill.id,
  'open',
  'go_further',
  3,
  $p1${"prompt":"Name two numbers that add to 892 and differ by 684.","slots":{"sum":892,"diff":684},"answer":"788 and 104","rule":"sum-diff","topic":"Regrouping"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000004'::uuid,
  skill.id,
  'open',
  'go_further',
  1,
  $p1${"prompt":"Name a number from 12 to 40. When you add it to 28, you trade ones for a ten.","slots":{"addTo":28,"low":12,"high":40},"answer":"15","rule":"ones-trade","topic":"Regrouping"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000005'::uuid,
  skill.id,
  'open',
  'go_further',
  2,
  $p1${"prompt":"Name a number from 100 to 180. When you add it to 146, you trade ones for a ten.","slots":{"addTo":146,"low":100,"high":180},"answer":"155","rule":"ones-trade","topic":"Regrouping"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000006'::uuid,
  skill.id,
  'open',
  'go_further',
  3,
  $p1${"prompt":"Name a number from 500 to 560. When you add it to 508, you trade ones for a ten.","slots":{"addTo":508,"low":500,"high":560},"answer":"517","rule":"ones-trade","topic":"Regrouping"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000007'::uuid,
  skill.id,
  'bar',
  'go_further',
  1,
  $p1${"prompt":"Sam has 62 marbles. He gets 19 more. Then he gives 6 away. How many are left?","slots":{"p0":62,"p1":19,"take":6},"answer":"75","steps":["Has: 62","Gets: 19","Whole: 81","Take away: 6","Left: 75"],"rule":"bar","topic":"Regrouping"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000008'::uuid,
  skill.id,
  'bar',
  'go_further',
  2,
  $p1${"prompt":"Sam has 239 marbles. He gets 161 more. Then he gives 38 away. How many are left?","slots":{"p0":239,"p1":161,"take":38},"answer":"362","steps":["Has: 239","Gets: 161","Whole: 400","Take away: 38","Left: 362"],"rule":"bar","topic":"Regrouping"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000009'::uuid,
  skill.id,
  'bar',
  'go_further',
  3,
  $p1${"prompt":"Sam has 619 marbles. He gets 145 more. Then he gets 139 more. Then he gives 45 away. How many are left?","slots":{"p0":619,"p1":145,"p2":139,"take":45},"answer":"858","steps":["Has: 619","Gets: 145","Gets more: 139","Whole: 903","Take away: 45","Left: 858"],"rule":"bar","topic":"Regrouping"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000000a'::uuid,
  skill.id,
  'estimate',
  'go_further',
  1,
  $p1${"prompt":"Round each number to the nearest ten. Then add. What is 48 + 43 about?","slots":{"a":48,"b":43,"place":10},"answer":"90","rule":"rounded-sum","topic":"Regrouping"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000000b'::uuid,
  skill.id,
  'estimate',
  'go_further',
  2,
  $p1${"prompt":"Round each number to the nearest ten. Then add. What is 319 + 238 about?","slots":{"a":319,"b":238,"place":10},"answer":"560","rule":"rounded-sum","topic":"Regrouping"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000000c'::uuid,
  skill.id,
  'estimate',
  'go_further',
  3,
  $p1${"prompt":"Round each number to the nearest hundred. Then add. What is 744 + 217 about?","slots":{"a":744,"b":217,"place":100},"answer":"900","rule":"rounded-sum","topic":"Regrouping"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000000d'::uuid,
  skill.id,
  'explanation',
  'go_further',
  1,
  $p1${"prompt":"Why does 22 + 89 need a trade?","slots":{"a":22,"b":89},"answer":"The ones are 2 + 9 = 11. Trade 10 ones for a ten.","choices":["The ones are 2 + 9 = 11. Trade 10 ones for a ten.","The ones are 2 + 9 = 1. No trade is needed.","Add the tens first and skip the ones."],"rule":"explain-add","topic":"Regrouping"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000000e'::uuid,
  skill.id,
  'explanation',
  'go_further',
  2,
  $p1${"prompt":"Why does 404 + 437 need a trade?","slots":{"a":404,"b":437},"answer":"The ones are 4 + 7 = 11. Trade 10 ones for a ten.","choices":["The ones are 4 + 7 = 11. Trade 10 ones for a ten.","The ones are 4 + 7 = 1. No trade is needed.","Add the tens first and skip the ones."],"rule":"explain-add","topic":"Regrouping"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000000f'::uuid,
  skill.id,
  'explanation',
  'go_further',
  3,
  $p1${"prompt":"Why does 147 + 626 need a trade?","slots":{"a":147,"b":626},"answer":"The ones are 7 + 6 = 13. Trade 10 ones for a ten.","choices":["The ones are 7 + 6 = 13. Trade 10 ones for a ten.","The ones are 7 + 6 = 3. No trade is needed.","Add the tens first and skip the ones."],"rule":"explain-add","topic":"Regrouping"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000010'::uuid,
  skill.id,
  'mistake',
  'go_further',
  1,
  $p1${"prompt":"Look at the work for 26 + 87. Tap the line that is wrong. Then type the fix.","slots":{"a":26,"b":87},"answer":"2: Trade 10 ones for 1 ten.","lines":["6 + 7 = 13.","Do not trade ones.","26 + 87 = 113.","The sum is 113."],"wrongLine":2,"fix":"Trade 10 ones for 1 ten.","rule":"mistake-add","topic":"Regrouping"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000011'::uuid,
  skill.id,
  'mistake',
  'go_further',
  2,
  $p1${"prompt":"Look at the work for 306 + 314. Tap the line that is wrong. Then type the fix.","slots":{"a":306,"b":314},"answer":"1: 6 + 4 = 10.","lines":["6 + 4 = 11.","Trade 10 ones for 1 ten.","306 + 314 = 620.","The sum is 620."],"wrongLine":1,"fix":"6 + 4 = 10.","rule":"mistake-add","topic":"Regrouping"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000012'::uuid,
  skill.id,
  'mistake',
  'go_further',
  3,
  $p1${"prompt":"Look at the work for 316 + 596. Tap the line that is wrong. Then type the fix.","slots":{"a":316,"b":596},"answer":"4: The sum is 912.","lines":["6 + 6 = 12.","Trade 10 ones for 1 ten.","316 + 596 = 912.","The sum is 922."],"wrongLine":4,"fix":"The sum is 912.","rule":"mistake-add","topic":"Regrouping"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000013'::uuid,
  skill.id,
  'logic',
  'go_further',
  1,
  $p1${"prompt":"33, 38, 43, 48. Each number is 5 more. What comes next?","slots":{"start":33,"step":5,"shown":4},"answer":"53","rule":"next","topic":"Regrouping"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000014'::uuid,
  skill.id,
  'logic',
  'go_further',
  2,
  $p1${"prompt":"185, 195, 205, 215. Each number is 10 more. What comes next?","slots":{"start":185,"step":10,"shown":4},"answer":"225","rule":"next","topic":"Regrouping"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000015'::uuid,
  skill.id,
  'logic',
  'go_further',
  3,
  $p1${"prompt":"572, 612, 652, 692. Each number is 40 more. What comes next?","slots":{"start":572,"step":40,"shown":4},"answer":"732","rule":"next","topic":"Regrouping"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000016'::uuid,
  skill.id,
  'logic',
  'go_further',
  1,
  $p1${"prompt":"Which sum is greater: 43 + 37, or 53 + 26?","slots":{"a":43,"b":37,"c":53,"d":26},"answer":"43 + 37","choices":["43 + 37","53 + 26"],"rule":"greater-sum","topic":"Regrouping"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000017'::uuid,
  skill.id,
  'logic',
  'go_further',
  2,
  $p1${"prompt":"Which sum is greater: 147 + 115, or 168 + 156?","slots":{"a":147,"b":115,"c":168,"d":156},"answer":"168 + 156","choices":["147 + 115","168 + 156"],"rule":"greater-sum","topic":"Regrouping"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000018'::uuid,
  skill.id,
  'logic',
  'go_further',
  3,
  $p1${"prompt":"Which sum is greater: 615 + 145, or 347 + 232?","slots":{"a":615,"b":145,"c":347,"d":232},"answer":"615 + 145","choices":["615 + 145","347 + 232"],"rule":"greater-sum","topic":"Regrouping"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000019'::uuid,
  skill.id,
  'open',
  'go_further',
  1,
  $p1${"prompt":"Name a number from 10 to 99 that has 7 tens.","slots":{"low":10,"high":99,"place":10,"digit":7},"answer":"78","rule":"digit-place","topic":"Place value"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000001a'::uuid,
  skill.id,
  'open',
  'go_further',
  2,
  $p1${"prompt":"Name a number from 100 to 499 that has 1 hundreds.","slots":{"low":100,"high":499,"place":100,"digit":1},"answer":"136","rule":"digit-place","topic":"Place value"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000001b'::uuid,
  skill.id,
  'open',
  'go_further',
  3,
  $p1${"prompt":"Name a number from 500 to 999 that has 7 hundreds.","slots":{"low":500,"high":999,"place":100,"digit":7},"answer":"754","rule":"digit-place","topic":"Place value"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000001c'::uuid,
  skill.id,
  'open',
  'go_further',
  1,
  $p1${"prompt":"Name two numbers from 10 to 99. One is 10 more than the other. The ones digit stays the same.","slots":{"low":10,"high":99,"step":10},"answer":"16 and 26","rule":"plus-step","topic":"Place value"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000001d'::uuid,
  skill.id,
  'open',
  'go_further',
  2,
  $p1${"prompt":"Name two numbers from 100 to 499. One is 100 more than the other. The tens and ones stay the same.","slots":{"low":100,"high":499,"step":100},"answer":"372 and 472","rule":"plus-step","topic":"Place value"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000001e'::uuid,
  skill.id,
  'open',
  'go_further',
  3,
  $p1${"prompt":"Name two numbers from 500 to 999. One is 100 more than the other. The tens and ones stay the same.","slots":{"low":500,"high":999,"step":100},"answer":"641 and 741","rule":"plus-step","topic":"Place value"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000001f'::uuid,
  skill.id,
  'bar',
  'go_further',
  1,
  $p1${"prompt":"There are 2 tens and 2 ones. Then 1 more tens are added. How many are there?","slots":{"p0":20,"p1":2,"p2":10,"take":0},"answer":"32","steps":["Tens: 20","Ones: 2","More tens: 10","Whole: 32","Left: 32"],"rule":"bar","topic":"Place value"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000020'::uuid,
  skill.id,
  'bar',
  'go_further',
  2,
  $p1${"prompt":"The number 224 is 2 hundreds and 24 more. Then 3 more tens are added. How many are there?","slots":{"p0":200,"p1":24,"p2":30,"take":0},"answer":"254","steps":["Hundreds: 200","Rest: 24","More tens: 30","Whole: 254","Left: 254"],"rule":"bar","topic":"Place value"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000021'::uuid,
  skill.id,
  'bar',
  'go_further',
  3,
  $p1${"prompt":"The number 633 is 6 hundreds and 33 more. Then 2 more tens are added. How many are there?","slots":{"p0":600,"p1":33,"p2":20,"take":0},"answer":"653","steps":["Hundreds: 600","Rest: 33","More tens: 20","Whole: 653","Left: 653"],"rule":"bar","topic":"Place value"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000022'::uuid,
  skill.id,
  'estimate',
  'go_further',
  1,
  $p1${"prompt":"Round 38 to the nearest ten.","slots":{"n":38,"place":10},"answer":"40","rule":"rounded-one","topic":"Place value"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000023'::uuid,
  skill.id,
  'estimate',
  'go_further',
  2,
  $p1${"prompt":"Round 236 to the nearest hundred.","slots":{"n":236,"place":100},"answer":"200","rule":"rounded-one","topic":"Place value"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000024'::uuid,
  skill.id,
  'estimate',
  'go_further',
  3,
  $p1${"prompt":"Round 811 to the nearest hundred.","slots":{"n":811,"place":100},"answer":"800","rule":"rounded-one","topic":"Place value"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000025'::uuid,
  skill.id,
  'explanation',
  'go_further',
  1,
  $p1${"prompt":"In 28, what is the 2 worth?","slots":{"n":28,"digit":2,"place":10},"answer":"The 2 is worth 20.","choices":["The 2 is worth 20.","The 2 is worth 2.","The 2 is worth 200."],"rule":"explain-place","topic":"Place value"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000026'::uuid,
  skill.id,
  'explanation',
  'go_further',
  2,
  $p1${"prompt":"In 421, what is the 4 worth?","slots":{"n":421,"digit":4,"place":100},"answer":"The 4 is worth 400.","choices":["The 4 is worth 400.","The 4 is worth 4.","The 4 is worth 40."],"rule":"explain-place","topic":"Place value"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000027'::uuid,
  skill.id,
  'explanation',
  'go_further',
  3,
  $p1${"prompt":"In 721, what is the 7 worth?","slots":{"n":721,"digit":7,"place":100},"answer":"The 7 is worth 700.","choices":["The 7 is worth 700.","The 7 is worth 7.","The 7 is worth 70."],"rule":"explain-place","topic":"Place value"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000028'::uuid,
  skill.id,
  'mistake',
  'go_further',
  1,
  $p1${"prompt":"Look at the work for 76. Tap the line that is wrong. Then type the fix.","slots":{"n":76},"answer":"1: The 7 is worth 70.","lines":["The 7 is worth 7.","The 6 is worth 6.","76 has 7 tens."],"wrongLine":1,"fix":"The 7 is worth 70.","rule":"mistake-place","topic":"Place value"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000029'::uuid,
  skill.id,
  'mistake',
  'go_further',
  2,
  $p1${"prompt":"Look at the work for 193. Tap the line that is wrong. Then type the fix.","slots":{"n":193},"answer":"2: The 9 is worth 90.","lines":["The 1 is worth 100.","The 9 is worth 9.","The 3 is worth 3.","193 has 1 hundreds."],"wrongLine":2,"fix":"The 9 is worth 90.","rule":"mistake-place","topic":"Place value"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000002a'::uuid,
  skill.id,
  'mistake',
  'go_further',
  3,
  $p1${"prompt":"Look at the work for 714. Tap the line that is wrong. Then type the fix.","slots":{"n":714},"answer":"3: The 4 is worth 4.","lines":["The 7 is worth 700.","The 1 is worth 10.","The 4 is worth 14.","714 has 7 hundreds."],"wrongLine":3,"fix":"The 4 is worth 4.","rule":"mistake-place","topic":"Place value"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-place';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000002b'::uuid,
  skill.id,
  'logic',
  'go_further',
  1,
  $p1${"prompt":"Use the digits 7 and 2 once. What is the largest number you can make?","slots":{"d0":7,"d1":2},"answer":"72","rule":"largest","topic":"Place value"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000002c'::uuid,
  skill.id,
  'logic',
  'go_further',
  2,
  $p1${"prompt":"Use the digits 4, 2, 3 once. What is the largest number you can make?","slots":{"d0":4,"d1":2,"d2":3},"answer":"432","rule":"largest","topic":"Place value"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000002d'::uuid,
  skill.id,
  'logic',
  'go_further',
  3,
  $p1${"prompt":"Use the digits 7, 8, 9 once. What is the largest number you can make?","slots":{"d0":7,"d1":8,"d2":9},"answer":"987","rule":"largest","topic":"Place value"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000002e'::uuid,
  skill.id,
  'logic',
  'go_further',
  1,
  $p1${"prompt":"14, 24, 34, 44. Each number is 10 more. What comes next?","slots":{"start":14,"step":10,"shown":4},"answer":"54","rule":"next","topic":"Place value"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000002f'::uuid,
  skill.id,
  'logic',
  'go_further',
  2,
  $p1${"prompt":"172, 182, 192, 202. Each number is 10 more. What comes next?","slots":{"start":172,"step":10,"shown":4},"answer":"212","rule":"next","topic":"Place value"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000030'::uuid,
  skill.id,
  'logic',
  'go_further',
  3,
  $p1${"prompt":"579, 629, 679, 729. Each number is 50 more. What comes next?","slots":{"start":579,"step":50,"shown":4},"answer":"779","rule":"next","topic":"Place value"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000031'::uuid,
  skill.id,
  'open',
  'go_further',
  1,
  $p1${"prompt":"Name two numbers from 2 to 5 whose product is 6.","slots":{"product":6,"min":2,"max":5},"answer":"2 and 3","rule":"factor-pair","topic":"Equal groups"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000032'::uuid,
  skill.id,
  'open',
  'go_further',
  2,
  $p1${"prompt":"Name two numbers from 2 to 8 whose product is 28.","slots":{"product":28,"min":2,"max":8},"answer":"4 and 7","rule":"factor-pair","topic":"Equal groups"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000033'::uuid,
  skill.id,
  'open',
  'go_further',
  3,
  $p1${"prompt":"Name two numbers from 2 to 10 whose product is 80.","slots":{"product":80,"min":2,"max":10},"answer":"8 and 10","rule":"factor-pair","topic":"Equal groups"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000034'::uuid,
  skill.id,
  'bar',
  'go_further',
  1,
  $p1${"prompt":"There are 5 bags. Each bag has 5 apples. Then 23 apples are eaten. How many apples are left?","slots":{"p0":25,"take":23},"answer":"2","steps":["Apples: 25","Whole: 25","Take away: 23","Left: 2"],"rule":"bar","topic":"Equal groups"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000035'::uuid,
  skill.id,
  'bar',
  'go_further',
  2,
  $p1${"prompt":"There are 8 bags of 6 apples. There are 3 more bags of 6 apples. How many apples are there?","slots":{"p0":48,"p1":18,"take":0},"answer":"66","steps":["First bags: 48","More bags: 18","Whole: 66","Left: 66"],"rule":"bar","topic":"Equal groups"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000036'::uuid,
  skill.id,
  'bar',
  'go_further',
  3,
  $p1${"prompt":"There are 10 bags of 6 apples. There are 2 more bags of 6 apples. Then 3 apples are eaten. How many are left?","slots":{"p0":60,"p1":12,"take":3},"answer":"69","steps":["First bags: 60","More bags: 12","Whole: 72","Take away: 3","Left: 69"],"rule":"bar","topic":"Equal groups"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000037'::uuid,
  skill.id,
  'bar',
  'go_further',
  1,
  $p1${"prompt":"Which has more apples: 4 bags of 2, or 4 bags of 5?","slots":{"g1":4,"n1":2,"g2":4,"n2":5},"answer":"4 bags of 5","choices":["4 bags of 2","4 bags of 5"],"rule":"more-groups","topic":"Equal groups"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000038'::uuid,
  skill.id,
  'bar',
  'go_further',
  2,
  $p1${"prompt":"Which has more apples: 8 bags of 4, or 5 bags of 3?","slots":{"g1":8,"n1":4,"g2":5,"n2":3},"answer":"8 bags of 4","choices":["8 bags of 4","5 bags of 3"],"rule":"more-groups","topic":"Equal groups"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000039'::uuid,
  skill.id,
  'bar',
  'go_further',
  3,
  $p1${"prompt":"Which has more apples: 3 bags of 3, or 10 bags of 9?","slots":{"g1":3,"n1":3,"g2":10,"n2":9},"answer":"10 bags of 9","choices":["3 bags of 3","10 bags of 9"],"rule":"more-groups","topic":"Equal groups"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000003a'::uuid,
  skill.id,
  'estimate',
  'go_further',
  1,
  $p1${"prompt":"There are 4 rows of 12 chairs. Round 12 to the nearest ten. About how many chairs?","slots":{"g":4,"n":12},"answer":"40","rule":"rounded-product","topic":"Equal groups"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000003b'::uuid,
  skill.id,
  'estimate',
  'go_further',
  2,
  $p1${"prompt":"There are 8 rows of 12 chairs. Round 12 to the nearest ten. About how many chairs?","slots":{"g":8,"n":12},"answer":"80","rule":"rounded-product","topic":"Equal groups"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000003c'::uuid,
  skill.id,
  'estimate',
  'go_further',
  3,
  $p1${"prompt":"There are 9 rows of 12 chairs. Round 12 to the nearest ten. About how many chairs?","slots":{"g":9,"n":12},"answer":"90","rule":"rounded-product","topic":"Equal groups"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000003d'::uuid,
  skill.id,
  'explanation',
  'go_further',
  1,
  $p1${"prompt":"What does 2 × 3 mean?","slots":{"g":2,"n":3},"answer":"2 groups of 3 is 6.","choices":["2 groups of 3 is 6.","2 + 3 is 5.","2 groups of 2 is 4."],"rule":"explain-groups","topic":"Equal groups"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000003e'::uuid,
  skill.id,
  'explanation',
  'go_further',
  2,
  $p1${"prompt":"What does 3 × 8 mean?","slots":{"g":3,"n":8},"answer":"3 groups of 8 is 24.","choices":["3 groups of 8 is 24.","3 + 8 is 11.","3 groups of 3 is 9."],"rule":"explain-groups","topic":"Equal groups"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000003f'::uuid,
  skill.id,
  'explanation',
  'go_further',
  3,
  $p1${"prompt":"What does 5 × 10 mean?","slots":{"g":5,"n":10},"answer":"5 groups of 10 is 50.","choices":["5 groups of 10 is 50.","5 + 10 is 15.","5 groups of 5 is 25."],"rule":"explain-groups","topic":"Equal groups"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000040'::uuid,
  skill.id,
  'mistake',
  'go_further',
  1,
  $p1${"prompt":"Look at the work for 4 groups of 5. Tap the line that is wrong. Then type the fix.","slots":{"g":4,"n":5},"answer":"1: There are 4 equal groups.","lines":["There are 5 equal groups.","Each group has 5.","You count every group.","The total is 20."],"wrongLine":1,"fix":"There are 4 equal groups.","rule":"mistake-groups","topic":"Equal groups"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000041'::uuid,
  skill.id,
  'mistake',
  'go_further',
  2,
  $p1${"prompt":"Look at the work for 8 groups of 4. Tap the line that is wrong. Then type the fix.","slots":{"g":8,"n":4},"answer":"2: Each group has 4.","lines":["There are 8 equal groups.","Each group has 5.","You count every group.","The total is 32."],"wrongLine":2,"fix":"Each group has 4.","rule":"mistake-groups","topic":"Equal groups"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000042'::uuid,
  skill.id,
  'mistake',
  'go_further',
  3,
  $p1${"prompt":"Look at the work for 9 groups of 4. Tap the line that is wrong. Then type the fix.","slots":{"g":9,"n":4},"answer":"4: The total is 36.","lines":["There are 9 equal groups.","Each group has 4.","You count every group.","The total is 37."],"wrongLine":4,"fix":"The total is 36.","rule":"mistake-groups","topic":"Equal groups"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000043'::uuid,
  skill.id,
  'mistake',
  'go_further',
  1,
  $p1${"prompt":"Look at the work for 2 × 3. Tap the line that is wrong. Then type the fix.","slots":{"g":2,"n":3},"answer":"4: The total is 6.","lines":["There are 2 equal groups.","Each group has 3.","You count every group.","The total is 7."],"wrongLine":4,"fix":"The total is 6.","rule":"mistake-groups","topic":"Equal groups"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000044'::uuid,
  skill.id,
  'mistake',
  'go_further',
  2,
  $p1${"prompt":"Look at the work for 8 × 8. Tap the line that is wrong. Then type the fix.","slots":{"g":8,"n":8},"answer":"2: Each group has 8.","lines":["There are 8 equal groups.","Each group has 9.","You count every group.","The total is 64."],"wrongLine":2,"fix":"Each group has 8.","rule":"mistake-groups","topic":"Equal groups"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000045'::uuid,
  skill.id,
  'mistake',
  'go_further',
  3,
  $p1${"prompt":"Look at the work for 10 × 2. Tap the line that is wrong. Then type the fix.","slots":{"g":10,"n":2},"answer":"1: There are 10 equal groups.","lines":["There are 11 equal groups.","Each group has 2.","You count every group.","The total is 20."],"wrongLine":1,"fix":"There are 10 equal groups.","rule":"mistake-groups","topic":"Equal groups"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-mult';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000046'::uuid,
  skill.id,
  'logic',
  'go_further',
  1,
  $p1${"prompt":"4, 6, 8, 10. Each number adds one more group of 2. What comes next?","slots":{"start":4,"step":2,"shown":4},"answer":"12","rule":"next","topic":"Equal groups"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000047'::uuid,
  skill.id,
  'logic',
  'go_further',
  2,
  $p1${"prompt":"12, 18, 24, 30. Each number adds one more group of 6. What comes next?","slots":{"start":12,"step":6,"shown":4},"answer":"36","rule":"next","topic":"Equal groups"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000048'::uuid,
  skill.id,
  'logic',
  'go_further',
  3,
  $p1${"prompt":"20, 30, 40, 50. Each number adds one more group of 10. What comes next?","slots":{"start":20,"step":10,"shown":4},"answer":"60","rule":"next","topic":"Equal groups"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000049'::uuid,
  skill.id,
  'open',
  'go_further',
  1,
  $p1${"prompt":"Name a fraction equal to 1/2. Use a bottom number from 2 to 4.","slots":{"denMax":4},"answer":"2/4","rule":"half","topic":"Fractions"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000004a'::uuid,
  skill.id,
  'open',
  'go_further',
  2,
  $p1${"prompt":"Name a fraction equal to 1/2. Use a bottom number from 2 to 8.","slots":{"denMax":8},"answer":"4/8","rule":"half","topic":"Fractions"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000004b'::uuid,
  skill.id,
  'open',
  'go_further',
  3,
  $p1${"prompt":"Name a fraction equal to 1/2. Use a bottom number from 2 to 12.","slots":{"denMax":12},"answer":"6/12","rule":"half","topic":"Fractions"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000004c'::uuid,
  skill.id,
  'bar',
  'go_further',
  1,
  $p1${"prompt":"A line has 3 equal parts. You shade 1 part. Then you shade 2 more. What fraction is shaded?","slots":{"num":3,"den":3},"answer":"3/3","steps":["First shade: 1","Then shade: 2","Shaded: 3/3"],"rule":"fraction","topic":"Fractions"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000004d'::uuid,
  skill.id,
  'bar',
  'go_further',
  2,
  $p1${"prompt":"A line has 5 equal parts. You shade 1 part. Then you shade 4 more. What fraction is shaded?","slots":{"num":5,"den":5},"answer":"5/5","steps":["First shade: 1","Then shade: 4","Shaded: 5/5"],"rule":"fraction","topic":"Fractions"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000004e'::uuid,
  skill.id,
  'bar',
  'go_further',
  3,
  $p1${"prompt":"A line has 10 equal parts. You shade 1 part. Then you shade 7 more. What fraction is shaded?","slots":{"num":8,"den":10},"answer":"8/10","steps":["First shade: 1","Then shade: 7","Shaded: 8/10"],"rule":"fraction","topic":"Fractions"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000004f'::uuid,
  skill.id,
  'estimate',
  'go_further',
  1,
  $p1${"prompt":"Is 1/3 closer to 0, to 1/2, or to 1?","slots":{"num":1,"den":3},"answer":"1/2","choices":["0","1/2","1"],"rule":"closest","topic":"Fractions"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000050'::uuid,
  skill.id,
  'estimate',
  'go_further',
  2,
  $p1${"prompt":"Is 5/8 closer to 0, to 1/2, or to 1?","slots":{"num":5,"den":8},"answer":"1/2","choices":["0","1/2","1"],"rule":"closest","topic":"Fractions"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000051'::uuid,
  skill.id,
  'estimate',
  'go_further',
  3,
  $p1${"prompt":"Is 2/12 closer to 0, to 1/2, or to 1?","slots":{"num":2,"den":12},"answer":"0","choices":["0","1/2","1"],"rule":"closest","topic":"Fractions"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000052'::uuid,
  skill.id,
  'explanation',
  'go_further',
  1,
  $p1${"prompt":"A line has 3 equal parts. You hop 1. What fraction is that?","slots":{"hops":1,"den":3},"answer":"Count 1 equal parts out of 3. The fraction is 1/3.","choices":["Count 1 equal parts out of 3. The fraction is 1/3.","Count 1 tick marks. The fraction is 1/1.","The whole line is 1 parts."],"rule":"explain-fraction","topic":"Fractions"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000053'::uuid,
  skill.id,
  'explanation',
  'go_further',
  2,
  $p1${"prompt":"A line has 7 equal parts. You hop 3. What fraction is that?","slots":{"hops":3,"den":7},"answer":"Count 3 equal parts out of 7. The fraction is 3/7.","choices":["Count 3 equal parts out of 7. The fraction is 3/7.","Count 3 tick marks. The fraction is 3/3.","The whole line is 3 parts."],"rule":"explain-fraction","topic":"Fractions"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000054'::uuid,
  skill.id,
  'explanation',
  'go_further',
  3,
  $p1${"prompt":"A line has 11 equal parts. You hop 4. What fraction is that?","slots":{"hops":4,"den":11},"answer":"Count 4 equal parts out of 11. The fraction is 4/11.","choices":["Count 4 equal parts out of 11. The fraction is 4/11.","Count 4 tick marks. The fraction is 4/4.","The whole line is 4 parts."],"rule":"explain-fraction","topic":"Fractions"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000055'::uuid,
  skill.id,
  'explanation',
  'go_further',
  1,
  $p1${"prompt":"Which piece is smaller, 1/2 or 1/4?","slots":{"den":4},"answer":"The whole is the same. 1/4 is smaller than 1/2.","choices":["The whole is the same. 1/4 is smaller than 1/2.","1/4 is bigger because 4 is bigger.","They are the same size."],"rule":"explain-size","topic":"Fractions"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000056'::uuid,
  skill.id,
  'explanation',
  'go_further',
  2,
  $p1${"prompt":"Which piece is smaller, 1/2 or 1/8?","slots":{"den":8},"answer":"The whole is the same. 1/8 is smaller than 1/2.","choices":["The whole is the same. 1/8 is smaller than 1/2.","1/8 is bigger because 8 is bigger.","They are the same size."],"rule":"explain-size","topic":"Fractions"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000057'::uuid,
  skill.id,
  'explanation',
  'go_further',
  3,
  $p1${"prompt":"Which piece is smaller, 1/2 or 1/10?","slots":{"den":10},"answer":"The whole is the same. 1/10 is smaller than 1/2.","choices":["The whole is the same. 1/10 is smaller than 1/2.","1/10 is bigger because 10 is bigger.","They are the same size."],"rule":"explain-size","topic":"Fractions"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000058'::uuid,
  skill.id,
  'mistake',
  'go_further',
  1,
  $p1${"prompt":"A line has 3 equal parts. The point is 1 hops along. Tap the line that is wrong. Then type the fix.","slots":{"den":3,"hops":1},"answer":"3: The fraction is 1/3.","lines":["The whole has 3 equal parts.","You hop 1 parts.","The fraction is 1/4.","1/3 is less than 1/2."],"wrongLine":3,"fix":"The fraction is 1/3.","rule":"mistake-fraction","topic":"Fractions"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000059'::uuid,
  skill.id,
  'mistake',
  'go_further',
  2,
  $p1${"prompt":"A line has 5 equal parts. The point is 2 hops along. Tap the line that is wrong. Then type the fix.","slots":{"den":5,"hops":2},"answer":"2: You hop 2 parts.","lines":["The whole has 5 equal parts.","You hop 3 parts.","The fraction is 2/5.","2/5 is less than 1/2."],"wrongLine":2,"fix":"You hop 2 parts.","rule":"mistake-fraction","topic":"Fractions"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000005a'::uuid,
  skill.id,
  'mistake',
  'go_further',
  3,
  $p1${"prompt":"A line has 9 equal parts. The point is 8 hops along. Tap the line that is wrong. Then type the fix.","slots":{"den":9,"hops":8},"answer":"1: The whole has 9 equal parts.","lines":["The whole has 10 equal parts.","You hop 8 parts.","The fraction is 8/9.","8/9 is more than 1/2."],"wrongLine":1,"fix":"The whole has 9 equal parts.","rule":"mistake-fraction","topic":"Fractions"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000005b'::uuid,
  skill.id,
  'logic',
  'go_further',
  1,
  $p1${"prompt":"1/4, 2/4. The top number goes up by 1. What fraction comes next?","slots":{"num":3,"den":4},"answer":"3/4","rule":"fraction","topic":"Fractions"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000005c'::uuid,
  skill.id,
  'logic',
  'go_further',
  2,
  $p1${"prompt":"1/8, 2/8. The top number goes up by 1. What fraction comes next?","slots":{"num":3,"den":8},"answer":"3/8","rule":"fraction","topic":"Fractions"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000005d'::uuid,
  skill.id,
  'logic',
  'go_further',
  3,
  $p1${"prompt":"1/12, 2/12. The top number goes up by 1. What fraction comes next?","slots":{"num":3,"den":12},"answer":"3/12","rule":"fraction","topic":"Fractions"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000005e'::uuid,
  skill.id,
  'logic',
  'go_further',
  1,
  $p1${"prompt":"Which fraction is greater: 3/4 or 1/4?","slots":{"left":3,"right":1,"den":4},"answer":"3/4","choices":["3/4","1/4"],"rule":"compare-frac","topic":"Fractions"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000005f'::uuid,
  skill.id,
  'logic',
  'go_further',
  2,
  $p1${"prompt":"Which fraction is greater: 1/5 or 2/5?","slots":{"left":1,"right":2,"den":5},"answer":"2/5","choices":["1/5","2/5"],"rule":"compare-frac","topic":"Fractions"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000060'::uuid,
  skill.id,
  'logic',
  'go_further',
  3,
  $p1${"prompt":"Which fraction is greater: 7/11 or 8/11?","slots":{"left":7,"right":8,"den":11},"answer":"8/11","choices":["7/11","8/11"],"rule":"compare-frac","topic":"Fractions"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000061'::uuid,
  skill.id,
  'open',
  'go_further',
  1,
  $p1${"prompt":"Name the two missing numbers. One box plus the other is 170. The bigger minus the smaller is 14.","slots":{"sum":170,"diff":14},"answer":"92 and 78","rule":"sum-diff","topic":"Missing-number equations"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000062'::uuid,
  skill.id,
  'open',
  'go_further',
  2,
  $p1${"prompt":"Name the two missing numbers. One box plus the other is 410. The bigger minus the smaller is 82.","slots":{"sum":410,"diff":82},"answer":"246 and 164","rule":"sum-diff","topic":"Missing-number equations"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000063'::uuid,
  skill.id,
  'open',
  'go_further',
  3,
  $p1${"prompt":"Name the two missing numbers. One box plus the other is 940. The bigger minus the smaller is 524.","slots":{"sum":940,"diff":524},"answer":"732 and 208","rule":"sum-diff","topic":"Missing-number equations"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000064'::uuid,
  skill.id,
  'open',
  'go_further',
  1,
  $p1${"prompt":"Name two different numbers from 10 to 30 that add to 40.","slots":{"low":10,"high":30,"sum":40},"answer":"17 and 23","rule":"pair-sum","topic":"Missing-number equations"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000065'::uuid,
  skill.id,
  'open',
  'go_further',
  2,
  $p1${"prompt":"Name two different numbers from 100 to 300 that add to 400.","slots":{"low":100,"high":300,"sum":400},"answer":"153 and 247","rule":"pair-sum","topic":"Missing-number equations"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000066'::uuid,
  skill.id,
  'open',
  'go_further',
  3,
  $p1${"prompt":"Name two different numbers from 200 to 500 that add to 700.","slots":{"low":200,"high":500,"sum":700},"answer":"200 and 500","rule":"pair-sum","topic":"Missing-number equations"}$p1$::jsonb,
  'conditions',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000067'::uuid,
  skill.id,
  'bar',
  'go_further',
  1,
  $p1${"prompt":"A rope is 84 cm. One piece is 40 cm. Then 3 cm is cut off the other piece. How long is that piece now?","slots":{"rope":84,"piece":40,"cut":3},"answer":"41","steps":["Whole: 84","One piece: 40","Other piece: 44","Cut off: 3","Left: 41"],"rule":"rope","topic":"Missing-number equations"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000068'::uuid,
  skill.id,
  'bar',
  'go_further',
  2,
  $p1${"prompt":"A rope is 287 cm. One piece is 155 cm. Then 25 cm is cut off the other piece. How long is that piece now?","slots":{"rope":287,"piece":155,"cut":25},"answer":"107","steps":["Whole: 287","One piece: 155","Other piece: 132","Cut off: 25","Left: 107"],"rule":"rope","topic":"Missing-number equations"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000069'::uuid,
  skill.id,
  'bar',
  'go_further',
  3,
  $p1${"prompt":"A rope is 668 cm. One piece is 263 cm. Then 20 cm is cut off the other piece. How long is that piece now?","slots":{"rope":668,"piece":263,"cut":20},"answer":"385","steps":["Whole: 668","One piece: 263","Other piece: 405","Cut off: 20","Left: 385"],"rule":"rope","topic":"Missing-number equations"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000006a'::uuid,
  skill.id,
  'estimate',
  'go_further',
  1,
  $p1${"prompt":"Blank + 17 = 69. Round each number to the nearest ten. About what is the blank?","slots":{"a":17,"total":69,"place":10},"answer":"50","rule":"rounded-blank","topic":"Missing-number equations"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000006b'::uuid,
  skill.id,
  'estimate',
  'go_further',
  2,
  $p1${"prompt":"Blank + 174 = 477. Round each number to the nearest ten. About what is the blank?","slots":{"a":174,"total":477,"place":10},"answer":"310","rule":"rounded-blank","topic":"Missing-number equations"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000006c'::uuid,
  skill.id,
  'estimate',
  'go_further',
  3,
  $p1${"prompt":"Blank + 139 = 956. Round each number to the nearest hundred. About what is the blank?","slots":{"a":139,"total":956,"place":100},"answer":"900","rule":"rounded-blank","topic":"Missing-number equations"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000006d'::uuid,
  skill.id,
  'explanation',
  'go_further',
  1,
  $p1${"prompt":"32 + ☐ = 48. What number goes in the blank?","slots":{"a":32,"total":48},"answer":"The blank is 16, because 32 + 16 = 48.","choices":["The blank is 16, because 32 + 16 = 48.","The blank is 48, the number after the equals sign.","The blank is 32, the first number."],"rule":"explain-blank","topic":"Missing-number equations"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000006e'::uuid,
  skill.id,
  'explanation',
  'go_further',
  2,
  $p1${"prompt":"153 + ☐ = 253. What number goes in the blank?","slots":{"a":153,"total":253},"answer":"The blank is 100, because 153 + 100 = 253.","choices":["The blank is 100, because 153 + 100 = 253.","The blank is 253, the number after the equals sign.","The blank is 153, the first number."],"rule":"explain-blank","topic":"Missing-number equations"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-00000000006f'::uuid,
  skill.id,
  'explanation',
  'go_further',
  3,
  $p1${"prompt":"246 + ☐ = 713. What number goes in the blank?","slots":{"a":246,"total":713},"answer":"The blank is 467, because 246 + 467 = 713.","choices":["The blank is 467, because 246 + 467 = 713.","The blank is 713, the number after the equals sign.","The blank is 246, the first number."],"rule":"explain-blank","topic":"Missing-number equations"}$p1$::jsonb,
  'choice-match',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000070'::uuid,
  skill.id,
  'mistake',
  'go_further',
  1,
  $p1${"prompt":"Look at the work for 37 + ☐ = 47. Tap the line that is wrong. Then type the fix.","slots":{"a":37,"total":47},"answer":"2: The blank is 10.","lines":["47 - 37 = 10.","The blank is 47.","Check: 37 + 10 = 47."],"wrongLine":2,"fix":"The blank is 10.","rule":"mistake-missing-add","topic":"Missing-number equations"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000071'::uuid,
  skill.id,
  'mistake',
  'go_further',
  2,
  $p1${"prompt":"Look at the work for 101 + ☐ = 395. Tap the line that is wrong. Then type the fix.","slots":{"a":101,"total":395},"answer":"2: The blank is 294.","lines":["395 - 101 = 294.","The blank is 395.","Check: 101 + 294 = 395."],"wrongLine":2,"fix":"The blank is 294.","rule":"mistake-missing-add","topic":"Missing-number equations"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000072'::uuid,
  skill.id,
  'mistake',
  'go_further',
  3,
  $p1${"prompt":"Look at the work for 232 + ☐ = 907. Tap the line that is wrong. Then type the fix.","slots":{"a":232,"total":907},"answer":"2: The blank is 675.","lines":["907 - 232 = 675.","The blank is 907.","Check: 232 + 675 = 907."],"wrongLine":2,"fix":"The blank is 675.","rule":"mistake-missing-add","topic":"Missing-number equations"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000073'::uuid,
  skill.id,
  'mistake',
  'go_further',
  1,
  $p1${"prompt":"Look at the work for ☐ - 18 = 26. Tap the line that is wrong. Then type the fix.","slots":{"start":44,"taken":18},"answer":"2: The blank is 44.","lines":["26 + 18 = 44.","The blank is 26.","Check: 44 - 18 = 26."],"wrongLine":2,"fix":"The blank is 44.","rule":"mistake-missing-sub","topic":"Missing-number equations"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000074'::uuid,
  skill.id,
  'mistake',
  'go_further',
  2,
  $p1${"prompt":"Look at the work for ☐ - 16 = 367. Tap the line that is wrong. Then type the fix.","slots":{"start":383,"taken":16},"answer":"2: The blank is 383.","lines":["367 + 16 = 383.","The blank is 367.","Check: 383 - 16 = 367."],"wrongLine":2,"fix":"The blank is 383.","rule":"mistake-missing-sub","topic":"Missing-number equations"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000075'::uuid,
  skill.id,
  'mistake',
  'go_further',
  3,
  $p1${"prompt":"Look at the work for ☐ - 28 = 787. Tap the line that is wrong. Then type the fix.","slots":{"start":815,"taken":28},"answer":"2: The blank is 815.","lines":["787 + 28 = 815.","The blank is 787.","Check: 815 - 28 = 787."],"wrongLine":2,"fix":"The blank is 815.","rule":"mistake-missing-sub","topic":"Missing-number equations"}$p1$::jsonb,
  'mistake-line',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-add-sub';

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '11111111-0000-4000-8000-000000000076'::uuid,
  skill.id,
  'logic',
  'go_further',
  1,
  $p1${"prompt":"33, ☐, 39, 42. Each number is 3 more than the one before. What is the missing number?","slots":{"start":33,"step":3},"answer":"36","rule":"missing-term","topic":"Missing-number equations"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000077'::uuid,
  skill.id,
  'logic',
  'go_further',
  2,
  $p1${"prompt":"100, ☐, 120, 130. Each number is 10 more than the one before. What is the missing number?","slots":{"start":100,"step":10},"answer":"110","rule":"missing-term","topic":"Missing-number equations"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000078'::uuid,
  skill.id,
  'logic',
  'go_further',
  3,
  $p1${"prompt":"623, ☐, 683, 713. Each number is 30 more than the one before. What is the missing number?","slots":{"start":623,"step":30},"answer":"653","rule":"missing-term","topic":"Missing-number equations"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000079'::uuid,
  skill.id,
  'logic',
  'go_further',
  1,
  $p1${"prompt":"Each block is the sum of the two blocks under it. The bottom row is 4, 7, and 2. What number goes on top?","slots":{},"answer":"20","steps":["Middle: 11 and 9.","Top: 11 + 9 = 20."],"topic":"Number pyramid"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000007a'::uuid,
  skill.id,
  'logic',
  'go_further',
  2,
  $p1${"prompt":"Each block is the sum of the two blocks under it. The top is 20. The bottom left is 4 and the bottom middle is 7. The middle left is 11. What is the bottom right?","slots":{},"answer":"2","steps":["Middle right is 20 − 11 = 9.","9 − 7 = 2."],"topic":"Number pyramid"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000007b'::uuid,
  skill.id,
  'logic',
  'go_further',
  1,
  $p1${"prompt":"In this magic square each row adds to 15. The middle row is 9, 5, and a blank. The blank is a digit from 1 to 9, and it is not 9 or 5. What is the blank?","slots":{},"answer":"1","steps":["9 + 5 + blank = 15.","The blank is 1."],"topic":"Magic square"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000007c'::uuid,
  skill.id,
  'logic',
  'go_further',
  3,
  $p1${"prompt":"A magic square uses 1 to 9 once. Each row adds to 15. The rows are 2, 7, blank; then 9, 5, 1; then blank, 3, 8. What is the top-right number?","slots":{},"answer":"6","steps":["2 + 7 + 6 = 15.","4 + 3 + 8 = 15.","The top right is 6."],"topic":"Magic square"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000007d'::uuid,
  skill.id,
  'logic',
  'go_further',
  2,
  $p1${"prompt":"Use 2, 5, and 8 once. Make a two-digit number plus a one-digit number. What is the largest sum you can make?","slots":{},"answer":"87","steps":["85 + 2 = 87.","82 + 5 = 87.","The largest sum is 87."],"topic":"Digit placement"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000007e'::uuid,
  skill.id,
  'logic',
  'go_further',
  1,
  $p1${"prompt":"Use 1, 4, and 5 once to make a true addition equation. What number is on the right of the equals sign?","slots":{},"answer":"5","steps":["1 + 4 = 5.","4 + 1 = 5.","The right side is 5."],"topic":"Digit placement"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000007f'::uuid,
  skill.id,
  'logic',
  'go_further',
  1,
  $p1${"prompt":"The pans balance. Blank + 6 = 9 + 4. What number is the blank?","slots":{},"answer":"7","steps":["9 + 4 = 13.","13 − 6 = 7."],"topic":"Balance"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000080'::uuid,
  skill.id,
  'logic',
  'go_further',
  2,
  $p1${"prompt":"Two equal groups of the blank balance 8 + 6. What number is the blank?","slots":{},"answer":"7","steps":["8 + 6 = 14.","Two groups of 7 make 14."],"topic":"Balance"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000081'::uuid,
  skill.id,
  'logic',
  'go_further',
  1,
  $p1${"prompt":"14, 17, 20, 23. Each number is 3 more than the one before. What comes next?","slots":{},"answer":"26","steps":["23 + 3 = 26."],"topic":"What comes next"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000082'::uuid,
  skill.id,
  'logic',
  'go_further',
  2,
  $p1${"prompt":"2, 4, 8, 16. Each number is double the one before. What comes next?","slots":{},"answer":"32","steps":["16 + 16 = 32."],"topic":"What comes next"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000083'::uuid,
  skill.id,
  'logic',
  'go_further',
  1,
  $p1${"prompt":"A magic row adds to 15. The row is 8, 1, and a missing digit. The missing digit is not 8 or 1. What is it?","slots":{},"answer":"6","steps":["8 + 1 = 9.","15 − 9 = 6."],"topic":"Magic square"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000084'::uuid,
  skill.id,
  'logic',
  'go_further',
  1,
  $p1${"prompt":"Use the digits 3 and 6 once. What is the largest number you can make?","slots":{},"answer":"63","steps":["63 is larger than 36."],"topic":"Digit placement"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000085'::uuid,
  skill.id,
  'logic',
  'go_further',
  2,
  $p1${"prompt":"A cat and one book balance two books. One book is 3 kilograms. How many kilograms is the cat?","slots":{},"answer":"3","steps":["A cat and a book match two books.","The cat matches one book.","The cat is 3 kilograms."],"topic":"Balance"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000086'::uuid,
  skill.id,
  'logic',
  'go_further',
  3,
  $p1${"prompt":"1, 4, 9, 16. These are 1×1, 2×2, 3×3, and 4×4. What comes next?","slots":{},"answer":"25","steps":["5 × 5 = 25."],"topic":"What comes next"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000087'::uuid,
  skill.id,
  'logic',
  'go_further',
  2,
  $p1${"prompt":"4☐ + 25 = 73. The box is one digit. What digit goes in the box?","slots":{},"answer":"8","steps":["73 − 25 = 48.","The box is 8."],"topic":"Digit placement"}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000088'::uuid,
  skill.id,
  'logic',
  'go_further',
  2,
  $p1${"prompt":"Each block is the sum of the two blocks under it. The bottom row is 6, 5, and 4. What number is on the top block?","slots":{"week":1},"answer":"20","steps":["Whole story: The block tower"],"topic":"Weekly pyramid","hint":"Add the two blocks that sit under a block. Do the middle row first.","solution":"The middle blocks are 11 and 9. 11 + 9 = 20."}$p1$::jsonb,
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
  '11111111-0000-4000-8000-000000000089'::uuid,
  skill.id,
  'logic',
  'go_further',
  2,
  $p1${"prompt":"This square uses 1 to 9 once. Each row, column, and diagonal adds to 15. The rows are 2, 7, blank; then 9, 5, 1; then blank, 3, 8. What is the top-right number?","slots":{"week":2},"answer":"6","steps":["Whole story: The almost-magic square"],"topic":"Weekly magic square","hint":"Each row adds to 15. Fill the top row, then check a column.","solution":"2 + 7 + 6 = 15, so the top right is 6. 4 + 3 + 8 = 15, so the bottom left is 4."}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000008a'::uuid,
  skill.id,
  'bar',
  'go_further',
  2,
  $p1${"prompt":"There are 4 baskets with 6 apples in each basket. Then 2 more baskets with 6 apples are added. Then 5 apples are eaten. How many apples are left?","slots":{"week":3},"answer":"31","steps":["Whole story: Baskets of apples"],"topic":"Weekly groups","hint":"Find how many apples there are before anyone eats. Then take 5 away.","solution":"4 groups of 6 is 24. 2 more groups make 12 more. 24 + 12 = 36. 36 − 5 = 31."}$p1$::jsonb,
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
  '11111111-0000-4000-8000-00000000008b'::uuid,
  skill.id,
  'logic',
  'go_further',
  2,
  $p1${"prompt":"A number line from 0 to 1 is split into 8 equal parts. A point is 6 hops from 0. What fraction is the point?","slots":{"week":4},"answer":"6/8","steps":["Whole story: The hop on the line"],"topic":"Weekly fraction","hint":"Count the equal spaces, not the tick marks. Half of 8 is 4, so you can also ask if the point is past halfway.","solution":"6 hops of 1/8 land on 6/8. 6/8 is more than 4/8, and 4/8 is the same as 1/2."}$p1$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = 'g3-fractions';
