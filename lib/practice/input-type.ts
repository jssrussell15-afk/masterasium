import { answersMatch, normalizeAnswer } from "@/lib/practice/answers";
import { practiceChoices, shuffleChoices } from "@/lib/practice/choices";
import { answerShape } from "@/lib/practice/parts";
import type { InputType } from "@/lib/practice/types";

export type ResolvedInput = {
  inputType: InputType;
  choices: string[] | null;
};

function usableChoices(answer: string, choices: string[] | null | undefined): string[] | null {
  if (!choices || choices.length < 2 || choices.length > 4) return null;
  if (choices.some((choice) => choice.length > 40)) return null;
  const norms = choices.map((choice) => normalizeAnswer(choice));
  if (new Set(norms).size !== norms.length) return null;
  if (choices.filter((choice) => answersMatch(answer, choice)).length !== 1) return null;
  return choices;
}

export function inferInputType(prompt: string, answer: string): InputType {
  const shape = answerShape(prompt, answer);
  if (shape.kind === "parts") return "remainder";
  if (/^\d+\s*\/\s*\d+$/.test(answer.trim())) return "fraction";
  if (shape.inputMode === "decimal") return "decimal";
  if (shape.inputMode === "numeric") return "number";
  return "text";
}

/**
 * Spelling and text stay typed. Grades 1–2 get tiles when the choices are a real set.
 * Every other question follows the shape of its answer.
 */
export function resolveInput(input: {
  grade: number;
  prompt: string;
  answer: string;
  declared?: InputType | null;
  choices?: string[] | null;
  seed: string;
}): ResolvedInput {
  if (input.declared === "spelling" || input.declared === "text") {
    return { inputType: input.declared, choices: null };
  }
  if (input.grade <= 2) {
    const provided = usableChoices(input.answer, input.choices);
    if (provided) return { inputType: "choice", choices: shuffleChoices(provided, input.seed) };
    const generated = practiceChoices(input.grade, input.prompt, input.answer, input.seed);
    if (generated && usableChoices(input.answer, generated)) {
      return { inputType: "choice", choices: generated };
    }
  }
  return { inputType: inferInputType(input.prompt, input.answer), choices: null };
}
