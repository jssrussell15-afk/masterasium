import { mulberry32 } from "@/lib/content/phase1/random";
import type { EvalForm, EvalTemplate, EvalValues, FilledEval } from "@/lib/eval/types";

const CAP: Record<number, number> = {
  1: 40,
  2: 300,
  3: 2000,
  4: 20_000,
  5: 200_000,
  6: 2_000_000,
};

function hashString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function legal(template: EvalTemplate, values: EvalValues): boolean {
  if (template.accept && !template.accept(values)) return false;
  const answer = template.answer(values);
  return Number.isInteger(answer) && answer >= 0 && answer <= CAP[template.grade];
}

function draw(template: EvalTemplate, seed: number): EvalValues {
  const rng = mulberry32(seed);
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const values: EvalValues = {};
    for (const slot of template.slots) {
      values[slot.name] = slot.min + Math.floor(rng() * (slot.max - slot.min + 1));
    }
    if (legal(template, values)) return values;
  }
  throw new Error(`Could not fill ${template.id}.`);
}

function sameValues(left: EvalValues, right: EvalValues): boolean {
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key]);
}

function drawDistinct(template: EvalTemplate, seed: number, prior: EvalValues): EvalValues {
  for (let bump = 0; bump < 40; bump += 1) {
    const values = draw(template, seed + bump * 997);
    if (!sameValues(values, prior)) return values;
  }
  const slot = template.slots[0];
  for (let next = slot.min; next <= slot.max; next += 1) {
    if (next === prior[slot.name]) continue;
    const values = { ...prior, [slot.name]: next };
    if (legal(template, values)) return values;
  }
  throw new Error(`Could not build a parallel form for ${template.id}.`);
}

export function promptFor(template: EvalTemplate, values: EvalValues): string {
  const shown = template.show ? template.show(values) : values;
  return template.prompt.replace(/\{(\w+)\}/g, (_, name: string) => String(shown[name]));
}

export function fillEval(template: EvalTemplate, form: EvalForm, seed: number): FilledEval {
  const base = (hashString(template.id) ^ (seed >>> 0)) >>> 0;
  const pre = draw(template, base);
  const values = form === "pre" ? pre : drawDistinct(template, base ^ 0x51ed2701, pre);
  return {
    id: template.id,
    grade: template.grade,
    strand: template.strand,
    skill: template.skill,
    topic: template.topic,
    prompt: promptFor(template, values),
    answer: template.answer(values),
    values,
    form,
  };
}

export function promptShape(prompt: string): string {
  return prompt.replace(/\d+/g, "#");
}
