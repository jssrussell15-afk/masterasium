import {
  RECENT_MIN,
  RECENT_WINDOW,
  STYLE_CHANGE_SETS,
  type ShowStyle,
  type StyleChoice,
  type StyleInput,
  type StyleSnapshot,
} from "@/lib/show-me/types";

/** First-try accuracy over the last 8–10 questions. Fewer than 8 leaves the rate unused. */
export function recentAccuracy(firstTries: readonly boolean[]): number | null {
  if (firstTries.length < RECENT_MIN) return null;
  const window = firstTries.slice(-RECENT_WINDOW);
  const hits = window.filter(Boolean).length;
  return hits / window.length;
}

function rawStyle(input: StyleInput, accuracy: number | null): ShowStyle {
  if (input.helpsInLast5 >= 2) return "guided";
  if (accuracy != null && accuracy < 0.6) return "guided";
  const strong =
    input.mastery === "mastered" || input.mastery === "review-passed" || input.segment === "go-further";
  if (accuracy != null && accuracy >= 0.85 && strong) return "buggy";
  if (accuracy != null) return "standard";
  if (input.segment === "catch-up" || input.evalLevel === "not_started") return "guided";
  if (input.segment === "go-further" && input.evalLevel === "strong") return "buggy";
  return "standard";
}

function reasonFor(style: ShowStyle, input: StyleInput, accuracy: number | null): string {
  if (input.helpsInLast5 >= 2) return "Two helps in the last five questions.";
  if (accuracy != null && accuracy < 0.6) return "Recent accuracy is under 60%.";
  if (style === "buggy" && accuracy == null) return "Go further after a strong check-in.";
  if (style === "buggy" && input.segment === "go-further") return "Go further and a strong recent record.";
  if (style === "buggy") return "Recent accuracy is at least 85% on a mastered skill.";
  if (style === "guided" && accuracy == null) return "Placement still points at a catch-up start.";
  if (style === "standard" && accuracy == null) return "A short history stays on the middle style.";
  if (style === "standard" && accuracy != null && accuracy >= 0.85) return "Recent accuracy is high, and the skill is still building.";
  if (style === "standard") return "Recent work sits between 60% and 85%.";
  return "Guided walk.";
}

/**
 * Picks guided, standard, or buggy for one Show me open.
 * Two misses on this question always return guided.
 * Any other change waits for two finished sets on the new side of the line.
 */
export function chooseShowMeStyle(input: StyleInput): StyleChoice {
  const accuracy = recentAccuracy(input.recentFirstTries);
  const snapshotBase = {
    segment: input.segment,
    accuracy,
    mastery: input.mastery,
    helps: input.helpsInLast5,
    evalLevel: input.evalLevel,
    stuck: input.stuck,
    previous: input.previousStyle,
    sets: input.setsAtCandidate,
  };

  if (input.stuck) {
    const snapshot: StyleSnapshot = { ...snapshotBase, style: "guided", reason: "Two misses on this question." };
    return { style: "guided", reason: snapshot.reason, snapshot };
  }

  const raw = rawStyle(input, accuracy);
  const hold = input.previousStyle != null && input.previousStyle !== raw && input.setsAtCandidate < STYLE_CHANGE_SETS;
  const style = hold ? input.previousStyle! : raw;
  const reason = hold
    ? `Hold ${input.previousStyle}. The next style waits for ${STYLE_CHANGE_SETS} sets.`
    : reasonFor(raw, input, accuracy);
  const snapshot: StyleSnapshot = { ...snapshotBase, style, reason };
  return { style, reason, snapshot };
}

/** Dev-only override. Production practice ignores it. The preview page has its own switch. */
export function forcedShowMeStyle(
  value: string | undefined = process.env.SHOW_ME_STYLE,
  nodeEnv = process.env.NODE_ENV,
): ShowStyle | null {
  if (nodeEnv === "production") return null;
  if (value === "guided" || value === "standard" || value === "buggy") return value;
  return null;
}
