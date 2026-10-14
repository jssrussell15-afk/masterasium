/**
 * One or two lines for the end of a session and the parent digest.
 * The second line follows the focus skill. It is not a fixed phrase.
 */
export function sessionRecap(input: {
  todayAttempted: number;
  todayCorrect: number;
  skillTitle: string;
  earlierAttempted: number;
  earlierCorrect: number;
}): string | null {
  if (input.todayAttempted <= 0) return null;
  const score = `You got ${input.todayCorrect} of ${input.todayAttempted} today`;
  if (input.todayAttempted < 4) return `${score}.`;

  const todayAccuracy = input.todayCorrect / input.todayAttempted;
  const earlierAttempted = Math.max(0, input.earlierAttempted);
  const earlierCorrect = Math.min(earlierAttempted, Math.max(0, input.earlierCorrect));
  let trend: "easier" | "another-look" | null = null;

  if (earlierAttempted >= 4) {
    const earlierAccuracy = earlierCorrect / earlierAttempted;
    if (todayAccuracy - earlierAccuracy >= 0.05) trend = "easier";
    else if (earlierAccuracy - todayAccuracy >= 0.15) trend = "another-look";
  }
  if (!trend && todayAccuracy >= 0.8) trend = "easier";

  if (trend === "easier") return `${score}, and ${input.skillTitle} is getting easier.`;
  if (trend === "another-look") return `${score}, and ${input.skillTitle} needs another look.`;
  return `${score}.`;
}
