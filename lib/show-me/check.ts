import { readability } from "@/lib/content/readability";
import { SHOW_TEMPLATES } from "@/lib/show-me/templates";
import { WHY_MAX_PER_SET, WHY_WRONG, type BuggyVariant, type ShowTemplate } from "@/lib/show-me/types";

export type StyleCheck = { id: string; note: string };

export function presentedSteps(template: ShowTemplate, variant: BuggyVariant | null): { caption: string; result: number; wrong: boolean }[] {
  return template.steps.map((step, index) => {
    if (variant && index === variant.wrongIndex) {
      return { caption: variant.wrongCaption, result: variant.wrongResult, wrong: true };
    }
    return { caption: step.caption, result: step.result, wrong: false };
  });
}

export function fadedIndexes(template: ShowTemplate): number[] {
  const start = Math.max(0, template.steps.length - template.fadeCount);
  return template.steps.map((_, index) => index).filter((index) => index >= start);
}

/** After a buggy example, ask once or twice in the set, then stop. */
export function whyAfterBuggy(usedInSet: number): string | null {
  if (usedInSet >= WHY_MAX_PER_SET) return null;
  return WHY_WRONG;
}

export function auditTemplate(template: ShowTemplate): StyleCheck[] {
  const notes: StyleCheck[] = [];
  if (template.buggy.length < 2) notes.push({ id: template.id, note: "Expected two buggy variants." });
  if (template.fadeCount < 1 || template.fadeCount > 2) notes.push({ id: template.id, note: "Fade the last 1 or 2 steps." });
  const answer = template.answer.trim();
  if (!answer) notes.push({ id: template.id, note: "The answer is empty." });
  const last = template.steps[template.steps.length - 1];
  if (last && /^\d+$/.test(answer) && String(last.result) !== answer) {
    notes.push({ id: template.id, note: "The last step does not match the answer." });
  }
  if (answer && !/^\d+$/.test(answer) && !template.steps.some((step) => step.caption.includes(answer))) {
    notes.push({ id: template.id, note: "The guided steps never state the answer." });
  }
  for (const step of template.steps) {
    for (const issue of readability(step.caption).issues) notes.push({ id: template.id, note: issue });
  }
  for (const variant of template.buggy) {
    const steps = presentedSteps(template, variant);
    const wrong = steps.filter((step) => step.wrong);
    if (wrong.length !== 1) notes.push({ id: variant.id, note: "A buggy variant needs exactly one wrong step." });
    if (variant.wrongIndex < 0 || variant.wrongIndex >= template.steps.length) {
      notes.push({ id: variant.id, note: "The wrong step is out of range." });
      continue;
    }
    const correct = template.steps[variant.wrongIndex];
    if (!correct) continue;
    if (variant.wrongCaption === correct.caption) notes.push({ id: variant.id, note: "The wrong step uses the guided caption." });
    if (variant.wrongResult === correct.result) notes.push({ id: variant.id, note: "The wrong step has the same result." });
    steps.forEach((step, index) => {
      if (index === variant.wrongIndex) return;
      if (step.caption !== template.steps[index]?.caption) {
        notes.push({ id: variant.id, note: "A correct step caption changed." });
      }
    });
    for (const issue of readability(variant.wrongCaption).issues) notes.push({ id: variant.id, note: issue });
    if (variant.misconceptionId !== template.misconceptionId) {
      notes.push({ id: variant.id, note: "The misconception does not match the template." });
    }
  }
  return notes;
}

export function auditShowStyles(): StyleCheck[] {
  return SHOW_TEMPLATES.flatMap((template) => auditTemplate(template));
}
