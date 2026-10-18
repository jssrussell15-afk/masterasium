import type { CheckerKey, ContentItem, ContentTemplate, Difficulty, QuestionType } from "@/lib/content/model";
import { auditBuilt } from "@/lib/content/phase1/audit";
import { HAND_PUZZLES } from "@/lib/content/phase1/puzzles";
import { mulberry32 } from "@/lib/content/phase1/random";
import { PHASE1_TEMPLATES } from "@/lib/content/phase1/templates";
import type { Built, ReviewNote, TemplateDef } from "@/lib/content/phase1/types";
import { WEEKLY_PUZZLES } from "@/lib/content/phase1/weekly";

export const FILLS_PER_DIFFICULTY = 30;

const OPEN_RULES = new Set(["sum-diff", "ones-trade", "digit-place", "plus-step", "factor-pair", "half", "pair-sum"]);

export type Phase1Row = ContentItem & {
  templateId: string;
  topic: string;
  skillLabel: string;
  spread: string;
  attention: string | null;
};

export type Phase1Catalog = {
  rows: Phase1Row[];
  review: ReviewNote[];
};

function phase1Id(index: number): string {
  return `11111111-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

function questionTypeFor(def: TemplateDef): QuestionType {
  if (def.kind === "explain") return "explanation";
  return def.kind;
}

function checkerFor(built: Built): CheckerKey {
  if (OPEN_RULES.has(built.rule)) return "conditions";
  if (built.rule.startsWith("mistake-")) return "mistake-line";
  if (built.choices && built.choices.length > 0) return "choice-match";
  return "numeric-equal";
}

function toTemplate(built: Built, topic: string, extra: Partial<ContentTemplate> = {}): ContentTemplate {
  return {
    prompt: built.prompt,
    slots: built.slots,
    answer: built.answer,
    choices: built.choices,
    steps: built.steps,
    lines: built.lines,
    wrongLine: built.wrongLine,
    fix: built.fix,
    rule: built.rule,
    topic,
    ...extra,
  };
}

function rowFrom(
  index: number,
  fields: Omit<Phase1Row, "id" | "lane" | "status" | "source" | "reviewerId" | "reviewedAt" | "version">,
): Phase1Row {
  return {
    id: phase1Id(index),
    lane: "go_further",
    status: "draft",
    source: "ai_draft",
    reviewerId: null,
    reviewedAt: null,
    version: 1,
    ...fields,
  };
}

export function buildPhase1(): Phase1Catalog {
  const review: ReviewNote[] = [];
  const seen = new Set<string>();
  const flag = (note: ReviewNote) => {
    const key = `${note.id}|${note.difficulty ?? ""}|${note.reason}`;
    if (seen.has(key)) return;
    seen.add(key);
    review.push(note);
  };
  const rows: Phase1Row[] = [];
  let index = 1;

  PHASE1_TEMPLATES.forEach((def, templateIndex) => {
    for (const difficulty of [1, 2, 3] as const) {
      const sample = def.fill(difficulty, mulberry32(templateIndex * 100 + difficulty));
      const reasons = new Set(auditBuilt(def, sample, difficulty));
      for (let fill = 0; fill < FILLS_PER_DIFFICULTY; fill += 1) {
        const extra = def.fill(difficulty, mulberry32(50_000 + templateIndex * 400 + difficulty * 40 + fill));
        for (const reason of auditBuilt(def, extra, difficulty)) reasons.add(reason);
      }
      for (const reason of reasons) {
        flag({
          id: def.id,
          skill: def.skillLabel,
          topic: def.topic,
          kind: def.kind,
          difficulty,
          reason,
        });
      }
      rows.push(
        rowFrom(index, {
          templateId: def.id,
          topic: def.topic,
          skillLabel: def.skillLabel,
          spread: def.spread,
          attention: def.attention,
          skillSlug: def.skillSlug,
          questionType: questionTypeFor(def),
          difficulty,
          template: toTemplate(sample, def.topic),
          checker: checkerFor(sample),
        }),
      );
      index += 1;
    }
  });

  for (const puzzle of HAND_PUZZLES) {
    const answers = puzzle.solve();
    if (answers.length !== 1 || answers[0] !== puzzle.answer) {
      flag({
        id: puzzle.id,
        skill: puzzle.skillLabel,
        topic: puzzle.topic,
        kind: "logic",
        difficulty: puzzle.difficulty,
        reason:
          answers.length !== 1
            ? `The search found ${answers.length} answers.`
            : `The search found ${answers[0]}, not ${puzzle.answer}.`,
      });
    }
    rows.push(
      rowFrom(index, {
        templateId: puzzle.id,
        topic: puzzle.topic,
        skillLabel: puzzle.skillLabel,
        spread: "One hand-written fill.",
        attention: puzzle.attention,
        skillSlug: puzzle.skillSlug,
        questionType: "logic",
        difficulty: puzzle.difficulty,
        checker: "numeric-equal",
        template: {
          prompt: puzzle.prompt,
          slots: {},
          answer: puzzle.answer,
          steps: puzzle.steps,
          topic: puzzle.topic,
        },
      }),
    );
    index += 1;
  }

  for (const weekly of WEEKLY_PUZZLES) {
    const answers = weekly.solve();
    if (answers.length !== 1 || answers[0] !== weekly.answer) {
      flag({
        id: `weekly-${weekly.week}`,
        skill: weekly.skillLabel,
        topic: weekly.topic,
        kind: weekly.kind,
        difficulty: 2,
        reason:
          answers.length !== 1
            ? `The search found ${answers.length} answers.`
            : `The search found ${answers[0]}, not ${weekly.answer}.`,
      });
    }
    rows.push(
      rowFrom(index, {
        templateId: `weekly-${weekly.week}`,
        topic: weekly.topic,
        skillLabel: weekly.skillLabel,
        spread: "One weekly draft.",
        attention: "Read the parent hint. It should stay a hint.",
        skillSlug: weekly.skillSlug,
        questionType: weekly.kind,
        difficulty: 2,
        checker: "numeric-equal",
        template: {
          prompt: weekly.prompt,
          slots: { week: weekly.week },
          answer: weekly.answer,
          topic: weekly.topic,
          hint: weekly.hint,
          solution: weekly.solution,
          steps: [`Whole story: ${weekly.title}`],
        },
      }),
    );
    index += 1;
  }

  return { rows, review };
}

let cached: Phase1Catalog | null = null;

export function loadPhase1(): Phase1Catalog {
  if (!cached) cached = buildPhase1();
  return cached;
}

export function phase1Sample(kind: string): Phase1Row {
  const { rows } = loadPhase1();
  if (kind === "puzzle") return rows.find((row) => row.templateId === "pyramid-top") ?? rows[0]!;
  if (kind === "weekly") return rows.find((row) => row.templateId === "weekly-1") ?? rows[0]!;
  const match = rows.find((row) => row.questionType === (kind === "explain" ? "explanation" : kind) && row.difficulty === 1);
  return match ?? rows[0]!;
}

export function attentionItems(): Array<{ id: string; skill: string; topic: string; kind: string; note: string }> {
  const notes: Array<{ id: string; skill: string; topic: string; kind: string; note: string }> = [];
  for (const def of PHASE1_TEMPLATES) {
    if (def.attention) notes.push({ id: def.id, skill: def.skillLabel, topic: def.topic, kind: def.kind, note: def.attention });
  }
  for (const puzzle of HAND_PUZZLES) {
    if (puzzle.attention) {
      notes.push({ id: puzzle.id, skill: puzzle.skillLabel, topic: puzzle.topic, kind: "logic", note: puzzle.attention });
    }
  }
  for (const weekly of WEEKLY_PUZZLES) {
    notes.push({
      id: `weekly-${weekly.week}`,
      skill: weekly.skillLabel,
      topic: weekly.topic,
      kind: weekly.kind,
      note: "Read the parent hint. It should stay a hint.",
    });
  }
  return notes;
}
