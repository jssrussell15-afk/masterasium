import { mistakeAnswerMatches, satisfies } from "@/lib/content/rules";

export const LANES = ["core", "go_further", "review", "eval"] as const;
export type Lane = (typeof LANES)[number];

export const DIFFICULTIES = [1, 2, 3] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  1: "Explore",
  2: "Stretch",
  3: "Puzzle",
};

export const ITEM_STATUSES = ["draft", "reviewed", "published", "retired"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const ITEM_SOURCES = ["code", "hand_written", "ai_draft"] as const;
export type ItemSource = (typeof ITEM_SOURCES)[number];

export const QUESTION_TYPES = [
  "numeric",
  "compare",
  "balance",
  "true-false",
  "many-ways",
  "bar",
  "pattern",
  "explanation",
  "open",
  "estimate",
  "mistake",
  "logic",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const CHECKERS = ["numeric-equal", "choice-match", "true-false", "conditions", "mistake-line"] as const;
export type CheckerKey = (typeof CHECKERS)[number];

export const DECISIONS = ["approve", "request_changes", "retire"] as const;
export type Decision = (typeof DECISIONS)[number];

export const FLAG_SURFACES = ["question", "walkthrough", "explanation"] as const;
export type FlagSurface = (typeof FLAG_SURFACES)[number];

export const FLAG_REASONS = [
  "The numbers look wrong",
  "The answer check looks wrong",
  "The words are confusing",
  "Something else",
] as const;

export type ContentTemplate = {
  prompt: string;
  slots: Record<string, string | number>;
  answer: string;
  choices?: string[];
  steps?: string[];
  lines?: string[];
  wrongLine?: number;
  fix?: string;
  rule?: string;
  topic?: string;
  hint?: string;
  solution?: string;
};

export type ContentItem = {
  id: string;
  skillSlug: string;
  questionType: QuestionType;
  lane: Lane;
  difficulty: Difficulty;
  template: ContentTemplate;
  checker: CheckerKey;
  status: ItemStatus;
  source: ItemSource;
  reviewerId: string | null;
  reviewedAt: string | null;
  version: number;
};

export type ContentReview = {
  itemId: string;
  version: number;
  reviewerId: string;
  decision: Decision;
  notes: string;
  createdAt: string;
};

export type ContentFlag = {
  id: string;
  itemId: string | null;
  generatorKey: string | null;
  prompt: string;
  numbers: string[];
  childId: string;
  reason: string;
  surface: FlagSurface;
  status: "open" | "resolved";
  createdAt: string;
};

/** Practice may serve a row only when an admin has published it. */
export function servableItems(items: readonly ContentItem[]): ContentItem[] {
  return items.filter((item) => item.status === "published");
}

export function decideItem(
  item: ContentItem,
  decision: Decision,
  reviewerId: string,
  at: string,
  notes = "",
): { item: ContentItem; review: ContentReview } {
  const status: ItemStatus =
    decision === "approve" ? "published" : decision === "retire" ? "retired" : "draft";
  return {
    item: {
      ...item,
      status,
      reviewerId,
      reviewedAt: at,
    },
    review: {
      itemId: item.id,
      version: item.version,
      reviewerId,
      decision,
      notes: notes.trim(),
      createdAt: at,
    },
  };
}

/** An edit keeps the same id and starts a new draft version. */
export function reviseItem(item: ContentItem, template: ContentTemplate): ContentItem {
  return {
    ...item,
    template,
    version: item.version + 1,
    status: "draft",
    reviewerId: null,
    reviewedAt: null,
  };
}

export function fillTemplate(template: ContentTemplate): { prompt: string; answer: string } {
  const missing: string[] = [];
  const prompt = template.prompt.replace(/\{([a-z0-9_]+)\}/gi, (_match, key: string) => {
    const value = template.slots[key];
    if (value == null || value === "") {
      missing.push(key);
      return `{${key}}`;
    }
    return String(value);
  });
  if (missing.length > 0) {
    throw new Error(`Missing slot ${missing[0]}.`);
  }
  return { prompt, answer: String(template.answer) };
}

function sameText(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function runChecker(
  checker: CheckerKey,
  template: ContentTemplate,
  given: string,
): { ok: boolean; note: string } {
  const filled = fillTemplate(template);
  if (!CHECKERS.includes(checker)) {
    return { ok: false, note: "That checker is not known." };
  }
  if (checker === "conditions") {
    const ok = satisfies(template.rule ?? "", template.slots, given);
    return { ok, note: ok ? "That matches." : "Those numbers do not fit." };
  }
  if (checker === "mistake-line") {
    const ok = mistakeAnswerMatches(template.wrongLine, template.fix, given);
    return { ok, note: ok ? "That matches." : "That is not the line to fix." };
  }
  const ok =
    checker === "numeric-equal"
      ? given.trim().replace(/\s+/g, "") === filled.answer.trim().replace(/\s+/g, "")
      : sameText(given, filled.answer);
  return { ok, note: ok ? "That matches." : "That does not match." };
}

export function previewItem(item: ContentItem): { prompt: string; answer: string; ok: boolean; note: string } {
  const filled = fillTemplate(item.template);
  const check = runChecker(item.checker, item.template, filled.answer);
  return { prompt: filled.prompt, answer: filled.answer, ok: check.ok, note: check.note };
}

export function numbersIn(prompt: string): string[] {
  return prompt.match(/\d+(?:[./:]\d+)?/g) ?? [];
}

export function flagReason(choice: string, note: string): string | null {
  const trimmed = note.trim();
  if (choice === "Something else") {
    if (trimmed.length < 1 || trimmed.length > 400) return null;
    return trimmed;
  }
  if (!FLAG_REASONS.includes(choice as (typeof FLAG_REASONS)[number])) return null;
  return choice;
}

export type ContentFilter = {
  skill: string;
  questionType: string;
  lane: string;
  difficulty: string;
  status: string;
  source: string;
};

export const EMPTY_FILTER: ContentFilter = {
  skill: "",
  questionType: "",
  lane: "",
  difficulty: "",
  status: "",
  source: "",
};

export function filterItems(items: readonly ContentItem[], filter: ContentFilter): ContentItem[] {
  return items.filter((item) => {
    if (filter.skill && item.skillSlug !== filter.skill) return false;
    if (filter.questionType && item.questionType !== filter.questionType) return false;
    if (filter.lane && item.lane !== filter.lane) return false;
    if (filter.difficulty && String(item.difficulty) !== filter.difficulty) return false;
    if (filter.status && item.status !== filter.status) return false;
    if (filter.source && item.source !== filter.source) return false;
    return true;
  });
}
