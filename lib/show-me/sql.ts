import { SHOW_TEMPLATES, TIME_MIXUP } from "@/lib/show-me/templates";

function itemId(index: number): string {
  return `33333333-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

function body(index: number): string {
  const template = SHOW_TEMPLATES[index];
  if (!template) throw new Error("Missing Show me template.");
  const json = JSON.stringify({
    prompt: template.prompt,
    slots: {},
    answer: template.answer,
    topic: template.topic,
    surface: "show-me",
    fadeCount: template.fadeCount,
    misconceptionId: template.misconceptionId,
    steps: template.steps,
    variants: template.buggy.map((variant) => ({
      id: variant.id,
      exampleStyle: "buggy",
      wrongIndex: variant.wrongIndex,
      wrongCaption: variant.wrongCaption,
      wrongResult: variant.wrongResult,
      misconceptionId: variant.misconceptionId,
    })),
    standard: { exampleStyle: "standard", fadeCount: template.fadeCount },
  });
  if (json.includes("$show$")) throw new Error("A template contains the SQL quote marker.");
  if (Buffer.byteLength(json) > 8000) throw new Error("A template is over 8,000 bytes.");
  return json;
}

export function renderShowMeSql(): string {
  const header = `-- Show me style drafts.
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
`;
  const misconception = `
insert into public.misconceptions (id, skill_id, description)
select
  'hour_stays_past_sixty',
  skill.id,
  'The hour was left in place after the minutes passed 60.'
from public.skill as skill
where skill.slug = 'g3-time'
on conflict (id) do update set description = excluded.description;
`;
  const items = SHOW_TEMPLATES.map((template, index) => {
    return `
insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '${itemId(index + 1)}'::uuid,
  skill.id,
  'explanation',
  'core',
  1,
  $show$${body(index)}$show$::jsonb,
  'numeric-equal',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = '${template.skill}';`;
  }).join("\n");
  return `${header}\n${misconception}\n${items}\n`;
}

export { TIME_MIXUP };
