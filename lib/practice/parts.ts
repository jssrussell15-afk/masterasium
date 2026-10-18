/**
 * Multi-part answers.
 * Detectors live here. The form renders `parts` and submits one field per part.
 * Scoring always combines the fields with `givenAnswer` before `answersMatch`.
 *
 * Later shapes (mixed numbers, coordinates, time, money, ratios) add a detector
 * and a branch in `joinParts`. Single-answer questions stay `{ kind: "single" }`.
 */

export type PartField = {
  name: string;
  label: string;
  inputMode: "numeric" | "decimal" | "text";
};

export type AnswerShape =
  | { kind: "single"; inputMode?: "numeric" | "decimal" | "text" }
  | { kind: "parts"; id: "remainder"; parts: PartField[] };

const REMAINDER = /^(\d+)\s*r\s*(\d+)$/i;

function wholeNumber(value: string): string {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return String(Number(trimmed));
  return trimmed;
}

export function answerShape(prompt: string, expected: string): AnswerShape {
  const expectedRemainder = REMAINDER.test(expected.trim());
  const promptSaysRemainder = /\bremainder\b/i.test(prompt) && REMAINDER.test(expected.trim());
  if (expectedRemainder || promptSaysRemainder) {
    return {
      kind: "parts",
      id: "remainder",
      parts: [
        { name: "answer", label: "Answer", inputMode: "numeric" },
        { name: "remainder", label: "Remainder", inputMode: "numeric" },
      ],
    };
  }
  return { kind: "single", inputMode: entryMode(expected) };
}

function entryMode(expected: string): "numeric" | "decimal" | "text" {
  const value = expected.trim();
  if (/^-?\d+$/.test(value)) return "numeric";
  if (/^-?\d+\.\d+$/.test(value)) return "decimal";
  return "text";
}

export function joinParts(id: AnswerShape extends { id: infer Id } ? Id : string, values: Record<string, string>): string {
  if (id === "remainder") {
    const quotient = wholeNumber(values.answer ?? "");
    const remainder = wholeNumber(values.remainder ?? "");
    if (!quotient && !remainder) return "";
    return `${quotient} R ${remainder}`;
  }
  return (values.answer ?? "").trim();
}

/** Combine submitted fields using the expected answer's shape. Extra fields on a single answer are ignored. */
export function givenAnswer(expected: string, values: Record<string, string>): string {
  const shape = answerShape("", expected);
  if (shape.kind === "single") return values.answer ?? "";
  return joinParts(shape.id, values);
}
