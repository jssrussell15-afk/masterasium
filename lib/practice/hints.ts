export type HintLadder = {
  hint: string;
  example: string;
};

const HINT_FALLBACK = "Name what the question is asking, then do the first step.";
const EXAMPLE_FALLBACK = "Use the same steps as the worked example, with this question's numbers.";

function compact(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

function reveals(text: string, expected: string): boolean {
  const answer = compact(expected);
  if (!answer) return false;
  return compact(text).includes(answer);
}

function clip(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 140) return clean;
  return `${clean.slice(0, 137)}...`;
}

/** Short bubble copy. The live answer stays out of the hint and the example. */
export function hintLadder(input: {
  summary: string;
  firstStep: string | null;
  examplePrompt: string;
  exampleAnswer: string;
  expected: string;
  prompt: string;
}): HintLadder {
  const step = input.firstStep?.trim() ?? "";
  const hintSource =
    step && !reveals(step, input.expected)
      ? step
      : !reveals(input.summary, input.expected)
        ? input.summary
        : HINT_FALLBACK;

  const sameProblem = compact(input.examplePrompt) === compact(input.prompt);
  const exampleSource =
    !sameProblem && input.examplePrompt && !reveals(input.examplePrompt, input.expected)
      ? `${input.examplePrompt} Answer: ${input.exampleAnswer}`
      : EXAMPLE_FALLBACK;

  return {
    hint: clip(hintSource),
    example: clip(reveals(exampleSource, input.expected) ? EXAMPLE_FALLBACK : exampleSource),
  };
}
