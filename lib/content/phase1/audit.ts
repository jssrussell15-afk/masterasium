import type { Difficulty } from "@/lib/content/model";
import { childText, readability } from "@/lib/content/readability";
import { auditMistake, countSolutions, expectedClosed, intsIn, satisfies } from "@/lib/content/rules";
import type { Built, TemplateDef } from "@/lib/content/phase1/types";

const OPEN_RULES = new Set(["sum-diff", "ones-trade", "digit-place", "plus-step", "factor-pair", "half", "pair-sum"]);

export function auditBuilt(def: TemplateDef, built: Built, difficulty: Difficulty): string[] {
  const reasons: string[] = [];
  const reading = readability(
    childText([built.prompt, ...(built.choices ?? []), ...(built.lines ?? []), ...(built.steps ?? [])]),
  );
  reasons.push(...reading.issues);

  const band = def.band(difficulty);
  if (built.bandValues.length === 0) reasons.push("No number was checked against the band.");
  if (built.bandValues.some((value) => value < band.min || value > band.max)) {
    reasons.push("A number is outside this difficulty band.");
  }
  if (!built.bandValues.some((value) => value >= band.floor)) {
    reasons.push("No number reaches this difficulty.");
  }
  if (intsIn(childText([built.prompt, ...(built.steps ?? []), built.fix])).some((value) => value > 1000)) {
    reasons.push("A number is above 1,000.");
  }
  if (def.skillSlug === "g3-fractions" && built.bandValues.some((value) => value < 2 || value > 12)) {
    reasons.push("A denominator is outside 2 to 12.");
  }

  if (OPEN_RULES.has(built.rule)) {
    if (!satisfies(built.rule, built.slots, built.answer)) reasons.push("The sample answer does not fit the conditions.");
    const count = countSolutions(built.rule, built.slots);
    if (built.openEnded && count < 2) reasons.push(`Open item has ${count} solutions.`);
    if (!built.openEnded && count !== 1) reasons.push(`This item has ${count} solutions.`);
    if (satisfies(built.rule, built.slots, "0")) reasons.push("Zero was accepted.");
  } else if (built.rule.startsWith("mistake-")) {
    const kind = built.rule.slice("mistake-".length);
    const issue = auditMistake(kind, built.slots, built.lines ?? [], built.wrongLine ?? 0, built.fix ?? "");
    if (issue) reasons.push(issue);
    if (built.answer !== `${built.wrongLine}: ${built.fix}`) reasons.push("The stored answer does not name the fix.");
  } else {
    try {
      const expected = expectedClosed(built.rule, built.slots);
      if (built.answer !== expected) reasons.push("The answer does not match the checker.");
    } catch (error) {
      reasons.push(error instanceof Error ? error.message : "The checker failed.");
    }
    if (built.choices && !built.choices.includes(built.answer)) reasons.push("The answer is not one of the choices.");
    if (built.choices && new Set(built.choices).size !== built.choices.length) reasons.push("Two choices say the same thing.");
  }

  if (built.rule === "explain-add" || built.rule === "mistake-add") {
    const left = Number(built.slots.a);
    const right = Number(built.slots.b);
    if ((left % 10) + (right % 10) < 10) reasons.push("This addition does not trade ones.");
  }
  if ((def.id === "regroup-sum-diff" || def.id === "miss-sum-diff") && built.answer) {
    const [left, right] = intsIn(built.answer);
    if (left == null || right == null || (left % 10) + (right % 10) < 10) {
      reasons.push("This pair does not trade ones.");
    }
  }
  if (def.id === "regroup-bar") {
    const left = Number(built.slots.p0);
    const right = Number(built.slots.p1);
    if ((left % 10) + (right % 10) < 10) reasons.push("This story does not trade ones.");
  }
  if (def.skillSlug === "g3-mult" && (built.rule === "bar" || built.rule === "more-groups" || built.rule === "rounded-product")) {
    const totals =
      built.rule === "more-groups"
        ? [Number(built.slots.g1) * Number(built.slots.n1), Number(built.slots.g2) * Number(built.slots.n2)]
        : built.rule === "rounded-product"
          ? [Number(built.answer)]
          : [built.slots.p0, built.slots.p1, built.slots.p2].filter((value): value is number => typeof value === "number");
    if (totals.some((value) => value > 100)) reasons.push("A groups total is above 100.");
  }

  const left = built.steps?.find((step) => step.startsWith("Left: "));
  if (left && /^\d+$/.test(built.answer) && left !== `Left: ${built.answer}`) {
    reasons.push("The bar total does not match the answer.");
  }
  return reasons;
}
