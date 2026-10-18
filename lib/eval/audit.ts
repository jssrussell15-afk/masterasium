import { readability } from "@/lib/content/readability";
import { EVAL_BANK } from "@/lib/eval/bank";
import { fillEval, promptShape } from "@/lib/eval/fill";
import { WEAK_PREREQ_NOTES } from "@/lib/eval/links";
import type { EvalTemplate } from "@/lib/eval/types";

export type CheckFailure = { id: string; note: string };

export type EvalAudit = {
  failures: CheckFailure[];
  reviews: CheckFailure[];
  fills: number;
};

function inRange(template: EvalTemplate, values: Record<string, number>): boolean {
  return template.slots.every((slot) => values[slot.name] >= slot.min && values[slot.name] <= slot.max);
}

export function auditTemplate(template: EvalTemplate, seeds: readonly number[]): CheckFailure[] {
  const failures: CheckFailure[] = [];
  for (const seed of seeds) {
    let pre;
    let post;
    try {
      pre = fillEval(template, "pre", seed);
      post = fillEval(template, "post", seed);
    } catch (error) {
      failures.push({ id: template.id, note: error instanceof Error ? error.message : "Fill failed." });
      continue;
    }
    if (!inRange(template, pre.values) || !inRange(template, post.values)) {
      failures.push({ id: template.id, note: "A number is outside its range." });
    }
    if (pre.answer !== template.answer(pre.values) || post.answer !== template.answer(post.values)) {
      failures.push({ id: template.id, note: "The answer does not match the rule." });
    }
    if (!Number.isInteger(pre.answer) || !Number.isInteger(post.answer) || pre.answer < 0 || post.answer < 0) {
      failures.push({ id: template.id, note: "The answer is not a whole number." });
    }
    if (promptShape(pre.prompt) !== promptShape(post.prompt)) {
      failures.push({ id: template.id, note: "The pre and post prompts do not share a shape." });
    }
    if (JSON.stringify(pre.values) === JSON.stringify(post.values) || pre.prompt === post.prompt) {
      failures.push({ id: template.id, note: "The pre and post forms are the same item." });
    }
    for (const filled of [pre, post]) {
      const reading = readability(filled.prompt);
      for (const issue of reading.issues) {
        failures.push({ id: template.id, note: issue });
      }
    }
  }
  return failures;
}

export function auditEval(seeds: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]): EvalAudit {
  const failures = EVAL_BANK.flatMap((template) => auditTemplate(template, seeds));
  const reviews = [
    ...EVAL_BANK.filter((template) => template.review).map((template) => ({
      id: template.id,
      note: template.review as string,
    })),
    ...WEAK_PREREQ_NOTES.map((row) => ({
      id: `${row.skill} → ${row.prereq}`,
      note: row.note,
    })),
  ];
  return { failures, reviews, fills: EVAL_BANK.length * seeds.length * 2 };
}

export function humanReviewList(): CheckFailure[] {
  return auditEval([1]).reviews;
}
