/**
 * Explanation prompts stay off the practice card unless this is exactly "1".
 * The dev preview does not read this flag.
 */
export function whyPromptsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_WHY_PROMPTS === "1";
}
