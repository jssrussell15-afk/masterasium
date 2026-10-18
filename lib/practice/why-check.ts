import { generateQuestion } from "@/lib/practice/generate";
import {
  fillTemplate,
  lengthsClose,
  statedNumbers,
  statesToken,
  WHY_SKILLS,
  wordCount,
  type FilledWhy,
  type PreparedQuestion,
  type WhyQuestion,
  type WhySkill,
  type WhyTemplate,
} from "@/lib/practice/why";

export type WhyFailure = {
  skillId: string;
  templateId: string;
  prompt: string;
  reason: string;
};

export type WhyReport = {
  failures: WhyFailure[];
  counts: Record<string, number>;
  reviews: string[];
};

const QUESTIONS_PER_SEED = 8;
const SEEDS = 200;

export function runWhyCheck(): WhyReport {
  const failures: WhyFailure[] = [];
  const counts: Record<string, number> = {};
  const reviews = WHY_SKILLS.flatMap((skill) => skill.review.map((note) => `${skill.title}: ${note}`));

  for (const skill of WHY_SKILLS) {
    if (skill.templates.length < 2 || skill.templates.length > 4) {
      failures.push({
        skillId: skill.id,
        templateId: "*",
        prompt: "",
        reason: `expected 2 to 4 templates, found ${skill.templates.length}`,
      });
    }
    const questions = skill.generatorId ? generatedQuestions(skill) : skill.samples;
    if (!skill.generatorId && skill.samples.length < 12) {
      failures.push({
        skillId: skill.id,
        templateId: "*",
        prompt: "",
        reason: "sample set is too small to check",
      });
    }
    for (const question of questions) {
      const prepared = skill.prepare(toWhyQuestion(question));
      if (!prepared) continue;
      for (const templateId of prepared.templateIds) {
        const template = skill.templates.find((item) => item.id === templateId);
        if (!template) {
          failures.push({
            skillId: skill.id,
            templateId,
            prompt: question.prompt,
            reason: "template id is not in the skill",
          });
          continue;
        }
        counts[templateId] = (counts[templateId] ?? 0) + 1;
        const filled = fillTemplate(template, toWhyQuestion(question), prepared);
        if (!filled) {
          failures.push({
            skillId: skill.id,
            templateId,
            prompt: question.prompt,
            reason: "a slot did not resolve",
          });
          continue;
        }
        const problem = checkFilled(template, toWhyQuestion(question), prepared, filled);
        if (problem) {
          failures.push({ skillId: skill.id, templateId, prompt: question.prompt, reason: problem });
        }
      }
    }
    for (const template of skill.templates) {
      if ((counts[template.id] ?? 0) < 1) {
        failures.push({
          skillId: skill.id,
          templateId: template.id,
          prompt: "",
          reason: "template never matched a question",
        });
      }
    }
  }

  return { failures, counts, reviews };
}

function generatedQuestions(skill: WhySkill): WhyQuestion[] {
  const questions: WhyQuestion[] = [];
  for (const generatorId of [skill.generatorId, ...skill.alsoGenerates]) {
    if (!generatorId) continue;
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const rng = mulberry32(seed);
      for (let index = 0; index < QUESTIONS_PER_SEED; index += 1) {
        const question = generateQuestion(generatorId, rng);
        questions.push({
          prompt: question.prompt,
          answer: question.answer,
          steps: question.steps,
          walk: question.walk ?? null,
        });
      }
    }
  }
  return questions;
}

function checkFilled(
  template: WhyTemplate,
  question: WhyQuestion,
  prepared: PreparedQuestion,
  filled: FilledWhy,
): string | null {
  if (wordCount(filled.prompt) > 12) return `prompt has ${wordCount(filled.prompt)} words`;
  if (filled.feedback.includes("\n") || wordCount(filled.feedback) < 3) return "feedback is not one line";
  for (const text of [filled.right, filled.mixup, filled.irrelevant, filled.feedback, filled.caption]) {
    if (/\{[a-zA-Z]+\}/.test(text)) return "a slot did not resolve";
  }
  for (const value of statedNumbers(filled.right)) {
    if (!prepared.allowed.includes(value)) return `right reason states ${value}, which is not an intermediate`;
  }
  if (!prepared.facts.wrong) return "missing wrong number";
  if (!statesToken(filled.mixup, prepared.facts.wrong)) return "mix-up does not state its wrong number";
  if (prepared.facts.wrong === question.answer) return "mix-up number equals the answer";
  if (statesToken(filled.irrelevant, question.answer)) return "irrelevant choice states the answer";
  for (const value of statedNumbers(filled.irrelevant)) {
    if (!prepared.allowed.includes(value)) return `irrelevant choice states ${value}, which is not true here`;
  }
  const choices = [filled.right, filled.mixup, filled.irrelevant];
  if (new Set(choices).size !== 3) return "choices are not distinct";
  if (!lengthsClose(choices)) {
    return `choice lengths ${choices.map((choice) => choice.length).join("/")} are not within 40%: ${choices.join(" | ")}`;
  }
  if (filled.right === filled.feedback) return "feedback repeats a choice";
  if (template.captionSource === "none") {
    if (question.walk?.steps.length) return "caption source says none, but Show me steps exist";
    if (question.steps.length > 0) return "caption source says none, but Here's how text exists";
    return null;
  }
  const lines = template.captionSource === "show-me" ? (question.walk?.steps.map((step) => step.caption) ?? []) : question.steps;
  if (!lines.includes(filled.caption)) return `caption is not an exact line: ${filled.caption}`;
  const matched = lines.find((line) => line === filled.caption) ?? "";
  const words = new Set(matched.toLowerCase().match(/[a-z]+/g) ?? []);
  const overlap = template.captionKeywords.some((keyword) => words.has(keyword.toLowerCase()));
  if (!overlap) return "caption keywords do not overlap the matched line";
  return null;
}

function toWhyQuestion(question: WhyQuestion): WhyQuestion {
  return question;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
