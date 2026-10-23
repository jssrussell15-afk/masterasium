/**
 * Help steps belong to the question on screen.
 * A worked example of a different item has to say so, and show that item.
 */

export function numbersIn(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?/g) ?? [];
}

/**
 * True when the steps are about this prompt.
 * A step list with no numbers is a general instruction.
 * Otherwise a prompt number, or one of its digits when the steps name a digit, has to appear.
 */
export function stepsUseQuestionNumbers(prompt: string, steps: string[]): boolean {
  const promptNumbers = numbersIn(prompt);
  const stepText = steps.join(" ");
  const stepNumbers = numbersIn(stepText);
  if (promptNumbers.length === 0 || stepNumbers.length === 0) return true;

  const present = new Set(stepNumbers);
  if (promptNumbers.some((value) => present.has(value))) return true;

  const talksAboutDigits = /digit/i.test(stepText);
  if (!talksAboutDigits) return false;
  if (promptNumbers.some((value) => value.length > 1)) {
    const digits = new Set(promptNumbers.flatMap((value) => value.replace(".", "").split("")));
    return stepNumbers.some((value) => digits.has(value));
  }
  return false;
}

/** A panel is a different item when its prompt or its numbers are not this question. */
export function isDifferentExample(livePrompt: string, examplePrompt: string, exampleSteps: string[]): boolean {
  if (examplePrompt.trim() && examplePrompt.trim() !== livePrompt.trim()) return true;
  return !stepsUseQuestionNumbers(livePrompt, exampleSteps);
}
