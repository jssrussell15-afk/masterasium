import { answersMatch, normalizeAnswer } from "@/lib/practice/answers";
import { isInputType, type InputType } from "@/lib/practice/types";

type QuestionInput = {
  prompt: string;
  answer: string;
  inputType?: string | null;
  choices?: string[] | null;
  speak?: string | null;
};

export type QuestionValidation<T> =
  | { ok: true; question: T & { inputType: InputType; choices: string[] | null }; repairs: string[] }
  | { ok: false; reasons: string[] };

function wholeNumber(answer: string): boolean {
  return /^-?\d+$/.test(answer.trim());
}

function dropDuplicateChoices(choices: string[]): { choices: string[]; removed: boolean } {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const choice of choices) {
    const key = normalizeAnswer(choice);
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(choice);
  }
  return { choices: next, removed: next.length !== choices.length };
}

function choiceProblems(answer: string, choices: string[]): string[] {
  const reasons: string[] = [];
  if (choices.length < 2 || choices.length > 4) reasons.push("A choice question needs 2–4 choices.");
  if (choices.some((choice) => choice.length > 40)) reasons.push("Each choice must be 40 characters or fewer.");
  const norms = choices.map((choice) => normalizeAnswer(choice));
  if (new Set(norms).size !== norms.length) reasons.push("Choices must be distinct.");
  if (choices.filter((choice) => answersMatch(answer, choice)).length !== 1) {
    reasons.push("Exactly one choice must match the answer.");
  }
  return reasons;
}

function formatProblem(
  inputType: InputType,
  answer: string,
  prompt: string,
  speak: string | null | undefined,
): string | null {
  const value = answer.trim();
  if (inputType === "number" && !/^-?\d+$/.test(value)) return "Number answers must be integers.";
  if (inputType === "decimal" && !/^-?\d+\.\d+$/.test(value)) return "Decimal answers must look like 1.5.";
  if (inputType === "fraction") {
    const fraction = value.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (!fraction || Number(fraction[2]) === 0) return "Fraction answers must look like 3/4.";
  }
  if (inputType === "remainder" && !/^\d+\s*r\s*\d+$/i.test(value)) {
    return "Remainder answers must look like 4 R 1.";
  }
  if (inputType === "spelling") {
    if (!/^[a-z]+$/.test(value)) return "A spelling answer must be one lowercase word.";
    if (!speak?.trim()) return "A spelling question needs a speak line.";
    if (new RegExp(`\\b${value}\\b`, "i").test(prompt)) return "A spelling answer cannot appear in the prompt.";
  }
  return null;
}

export function validateQuestion<T extends QuestionInput>(question: T): QuestionValidation<T> {
  const reasons: string[] = [];
  const prompt = question.prompt ?? "";
  if (prompt.trim().length < 1 || prompt.length > 200) reasons.push("Prompt must be 1–200 characters.");
  if (!question.answer?.trim()) reasons.push("Answer is empty.");
  if (!isInputType(question.inputType)) reasons.push("Input type is missing or unknown.");
  if (reasons.length > 0 || !isInputType(question.inputType)) return { ok: false, reasons };

  const repairs: string[] = [];
  let inputType: InputType = question.inputType;
  let choices = question.choices ? [...question.choices] : [];

  if (inputType === "choice") {
    const dropped = dropDuplicateChoices(choices);
    if (dropped.removed) {
      repairs.push("Dropped duplicate choices.");
      choices = dropped.choices;
    }
    const problems = choiceProblems(question.answer, choices);
    if (problems.length > 0) {
      if (wholeNumber(question.answer)) {
        repairs.push("Turned a broken choice question into a number.");
        inputType = "number";
        choices = [];
      } else {
        reasons.push(...problems);
      }
    }
  }

  if (reasons.length === 0) {
    const format = formatProblem(inputType, question.answer, prompt, question.speak);
    if (format) reasons.push(format);
  }
  if (reasons.length > 0) return { ok: false, reasons };

  return {
    ok: true,
    question: {
      ...question,
      inputType,
      choices: inputType === "choice" ? choices : null,
    },
    repairs,
  };
}
