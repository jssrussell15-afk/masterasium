/**
 * What happens after Check, Help me with this, Show me an example, Show me, and Next.
 * Check never advances. Only Next does, and it clears the typed answer.
 * The first check (or Show me, if they have not checked) is the try that counts.
 * Show me records that try as not correct.
 */

export type FeedbackPhase = "answering" | "retry" | "correct" | "revealed";

export type AttemptMark = {
  phase: "retry" | "correct" | "revealed";
  firstTryCorrect: boolean;
  given: string;
  showedHow: boolean;
  /** Client id for this check. A retry with the same id does not count again. */
  clientCheckId?: string;
};

export type FeedbackState = {
  phase: FeedbackPhase;
  checks: number;
  firstTryCorrect: boolean | null;
  hintOpen: boolean;
  exampleOpen: boolean;
  /** Typed answer. Next clears it. */
  draft: string;
};

export type FeedbackEvent =
  | { type: "type"; draft: string }
  | { type: "check"; correct: boolean }
  | { type: "hint" }
  | { type: "example" }
  | { type: "show-how" }
  | { type: "show-me" }
  | { type: "next" };

export type FeedbackResult = {
  state: FeedbackState;
  /** True only for Next after the question is finished. */
  advance: boolean;
  /**
   * The first-try result, when this event decides it.
   * True means the first try was correct. False means it was not.
   * Null means this event does not decide mastery.
   */
  record: boolean | null;
  announcement: string | null;
};

export function freshFeedback(): FeedbackState {
  return {
    phase: "answering",
    checks: 0,
    firstTryCorrect: null,
    hintOpen: false,
    exampleOpen: false,
    draft: "",
  };
}

export function feedbackFromMark(mark: AttemptMark | null): FeedbackState {
  if (!mark) return freshFeedback();
  return {
    phase: mark.phase,
    checks: mark.phase === "retry" ? 1 : mark.firstTryCorrect ? 1 : 2,
    firstTryCorrect: mark.firstTryCorrect,
    hintOpen: mark.phase === "retry",
    exampleOpen: false,
    draft: mark.given,
  };
}

export function markFromState(
  state: FeedbackState,
  previous: AttemptMark | null,
  given: string,
  showedHow: boolean,
): AttemptMark | null {
  if (state.phase === "answering" || state.firstTryCorrect == null) return previous;
  return {
    phase: state.phase,
    firstTryCorrect: state.firstTryCorrect,
    given: previous?.given ?? given,
    showedHow: Boolean(previous?.showedHow) || showedHow,
  };
}

export function reduceFeedback(state: FeedbackState, event: FeedbackEvent): FeedbackResult {
  const stay = (
    next: FeedbackState,
    announcement: string | null = null,
    record: boolean | null = null,
  ): FeedbackResult => ({
    state: next,
    advance: false,
    record,
    announcement,
  });

  if (event.type === "type") {
    if (state.phase === "correct" || state.phase === "revealed") return stay(state);
    return stay({ ...state, draft: event.draft });
  }

  if (event.type === "hint") {
    if (state.phase === "correct" || state.phase === "revealed") return stay(state);
    return stay({ ...state, hintOpen: true });
  }

  if (event.type === "example") {
    if (state.phase === "correct" || state.phase === "revealed") return stay(state);
    return stay({ ...state, exampleOpen: true });
  }

  if (event.type === "check") {
    if (state.phase === "correct" || state.phase === "revealed") return stay(state);
    if (state.phase === "answering") {
      if (event.correct) {
        return stay(
          {
            ...state,
            phase: "correct",
            checks: 1,
            firstTryCorrect: true,
          },
          "That's right.",
          true,
        );
      }
      return stay(
        {
          ...state,
          phase: "retry",
          checks: 1,
          firstTryCorrect: false,
          hintOpen: true,
        },
        "Not quite. Try again.",
        false,
      );
    }
    if (event.correct) {
      return stay(
        { ...state, phase: "correct", checks: state.checks + 1 },
        "That's right.",
        null,
      );
    }
    return stay(
      { ...state, phase: "revealed", checks: state.checks + 1 },
      "Here's how.",
      null,
    );
  }

  if (event.type === "show-how" || event.type === "show-me") {
    if (state.phase === "correct" || state.phase === "revealed") return stay(state);
    const decides = state.firstTryCorrect == null;
    return stay(
      {
        ...state,
        phase: "revealed",
        firstTryCorrect: false,
      },
      event.type === "show-me" ? "Show me." : "Here's how.",
      decides ? false : null,
    );
  }

  if (state.phase !== "correct" && state.phase !== "revealed") return stay(state);
  return {
    state: freshFeedback(),
    advance: true,
    record: null,
    announcement: null,
  };
}

/** One sentence a child can read after a correct answer. */
export function whyLine(steps: string[]): string | null {
  for (const step of steps) {
    const clean = step.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    const sentence = clean.split(/(?<=[.!])\s/)[0] ?? clean;
    if (!sentence) continue;
    if (sentence.length > 160) return `${sentence.slice(0, 157)}...`;
    return sentence;
  }
  return null;
}

export const PRACTICE_SET_SIZE = 10;

export function progressLabel(index: number, total: number): string | null {
  if (!Number.isInteger(index) || !Number.isInteger(total)) return null;
  if (index < 1 || total < 1 || index > total) return null;
  return `Question ${index} of ${total}`;
}
