import type { Phase1Row } from "@/lib/content/phase1/catalog";
import type { ContentTemplate } from "@/lib/content/model";

function templateBody(template: ContentTemplate): string {
  const body: Record<string, unknown> = {
    prompt: template.prompt,
    slots: template.slots,
    answer: template.answer,
  };
  if (template.choices) body.choices = template.choices;
  if (template.steps) body.steps = template.steps;
  if (template.lines) body.lines = template.lines;
  if (template.wrongLine != null) body.wrongLine = template.wrongLine;
  if (template.fix) body.fix = template.fix;
  if (template.rule) body.rule = template.rule;
  if (template.topic) body.topic = template.topic;
  if (template.hint) body.hint = template.hint;
  if (template.solution) body.solution = template.solution;
  const json = JSON.stringify(body);
  if (json.includes("$p1$")) throw new Error("A template contains the SQL quote marker.");
  if (Buffer.byteLength(json) > 8000) throw new Error("A template is over 8,000 bytes.");
  return json;
}

export function renderPhase1Sql(rows: readonly Phase1Row[]): string {
  const header = `-- Phase 1 Go further drafts.
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
`;
  const inserts = rows.map((row) => {
    const json = templateBody(row.template);
    return `
insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  '${row.id}'::uuid,
  skill.id,
  '${row.questionType}',
  'go_further',
  ${row.difficulty},
  $p1$${json}$p1$::jsonb,
  '${row.checker}',
  'draft',
  'ai_draft',
  1
from public.skill as skill
where skill.slug = '${row.skillSlug}';`;
  });
  return `${header}${inserts.join("\n")}\n`;
}
