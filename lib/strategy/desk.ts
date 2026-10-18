import { STRANDS, ontarioLine, type StrandId } from "@/lib/curriculum/ontario";
import {
  BASE_TEN,
  COUNTING_ALL,
  COUNTING_ON_ADDITION,
  GUESS_AND_CHECK,
  KNOWN_FACT,
  MIXED,
  NOT_ENOUGH,
  NUMBER_LINE,
  NUMBER_LINE_SUBTRACTION,
  SKIP_COUNTING,
} from "@/lib/strategy/copy";
import { TAGGED_MIN, type Strategy } from "@/lib/strategy/types";

export type TaggedAnswer = {
  skillId: string;
  strategy: Strategy;
};

export type StrandLine = {
  strand: StrandId;
  label: string;
  text: string;
};

const PATTERN_LINE: Record<Strategy, string> = {
  base_ten: BASE_TEN,
  counting_on: COUNTING_ON_ADDITION,
  counting_all: COUNTING_ALL,
  skip_counting: SKIP_COUNTING,
  number_line: NUMBER_LINE,
  guess_and_check: GUESS_AND_CHECK,
  known_fact: KNOWN_FACT,
  unknown: NOT_ENOUGH,
};

function additionSkill(skillId: string): boolean {
  return skillId.includes("add");
}

function subtractionSkill(skillId: string): boolean {
  return skillId.includes("sub");
}

function lineFor(strategy: Strategy, answers: TaggedAnswer[]): string {
  if (strategy === "counting_on" && answers.some((answer) => additionSkill(answer.skillId))) {
    return COUNTING_ON_ADDITION;
  }
  if (strategy === "number_line" && answers.some((answer) => subtractionSkill(answer.skillId))) {
    return NUMBER_LINE_SUBTRACTION;
  }
  return PATTERN_LINE[strategy];
}

/** One quiet line per strand. Under 8 tagged answers, the line stays general. */
export function describeStrand(answers: readonly TaggedAnswer[]): string {
  const tagged = answers.filter((answer) => answer.strategy !== "unknown");
  if (tagged.length < TAGGED_MIN) return NOT_ENOUGH;
  const counts = new Map<Strategy, number>();
  for (const answer of tagged) counts.set(answer.strategy, (counts.get(answer.strategy) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  const top = ranked[0];
  const next = ranked[1];
  if (!top) return NOT_ENOUGH;
  const majority = top[1] >= Math.ceil(tagged.length * 0.6) && top[1] > (next?.[1] ?? 0);
  if (!majority) return MIXED;
  return lineFor(top[0], tagged);
}

export function strategyLines(answers: readonly TaggedAnswer[]): StrandLine[] {
  const byStrand = new Map<StrandId, TaggedAnswer[]>();
  for (const answer of answers) {
    const strand = ontarioLine(answer.skillId)?.strand;
    if (!strand) continue;
    const list = byStrand.get(strand) ?? [];
    list.push(answer);
    byStrand.set(strand, list);
  }
  return STRANDS.flatMap((strand) => {
    const rows = byStrand.get(strand.id);
    if (!rows || rows.length === 0) return [];
    return [{ strand: strand.id, label: strand.label, text: describeStrand(rows) }];
  });
}
