import { describe, expect, it } from "vitest";
import {
  freshFeedback,
  progressLabel,
  reduceFeedback,
  whyLine,
  type FeedbackState,
} from "@/lib/practice/feedback";

function check(state: FeedbackState, correct: boolean) {
  return reduceFeedback(state, { type: "check", correct });
}

describe("practice feedback", () => {
  it("stays on a correct answer and does not advance", () => {
    const typed = reduceFeedback(freshFeedback(), { type: "type", draft: "7" });
    const result = check(typed.state, true);
    expect(result.advance).toBe(false);
    expect(result.state.phase).toBe("correct");
    expect(result.state.firstTryCorrect).toBe(true);
    expect(result.record).toBe(true);
    expect(result.announcement).toBe("That's right.");
    expect(result.state.draft).toBe("7");
    expect(result.state.checks).toBe(1);
  });

  it("keeps a wrong first try on the same question, then accepts the retry", () => {
    const first = check(freshFeedback(), false);
    expect(first.advance).toBe(false);
    expect(first.state.phase).toBe("retry");
    expect(first.state.firstTryCorrect).toBe(false);
    expect(first.state.hintOpen).toBe(true);
    expect(first.record).toBe(false);
    expect(first.announcement).toBe("Not quite. Try again.");

    const kept = reduceFeedback(first.state, { type: "type", draft: "7" });
    expect(kept.state.draft).toBe("7");

    const second = check(kept.state, true);
    expect(second.advance).toBe(false);
    expect(second.state.phase).toBe("correct");
    expect(second.state.firstTryCorrect).toBe(false);
    expect(second.record).toBeNull();
    expect(second.announcement).toBe("That's right.");
    expect(second.state.draft).toBe("7");
  });

  it("reveals the worked steps after a second miss", () => {
    const first = check(freshFeedback(), false);
    const second = check(first.state, false);
    expect(second.advance).toBe(false);
    expect(second.state.phase).toBe("revealed");
    expect(second.state.firstTryCorrect).toBe(false);
    expect(second.record).toBeNull();
    expect(second.announcement).toBe("Here's how.");
  });

  it("counts Show me as not a first-try success, then the next question can be one", () => {
    const opened = reduceFeedback(freshFeedback(), { type: "show-me" });
    expect(opened.advance).toBe(false);
    expect(opened.state.phase).toBe("revealed");
    expect(opened.state.firstTryCorrect).toBe(false);
    expect(opened.record).toBe(false);
    expect(opened.announcement).toBe("Show me.");

    const again = reduceFeedback(opened.state, { type: "show-me" });
    expect(again.record).toBeNull();
    expect(again.state.firstTryCorrect).toBe(false);

    const missed = check(freshFeedback(), false);
    const second = check(missed.state, false);
    expect(second.state.phase).toBe("revealed");
    expect(second.state.firstTryCorrect).toBe(false);
    expect(second.record).toBeNull();

    const cleared = reduceFeedback(opened.state, { type: "next" });
    expect(cleared.advance).toBe(true);
    expect(cleared.state.firstTryCorrect).toBeNull();
    const followUp = check(cleared.state, true);
    expect(followUp.record).toBe(true);
    expect(followUp.state.firstTryCorrect).toBe(true);
  });

  it("counts Show me how as not a first-try success, then waits for Next", () => {
    const revealed = reduceFeedback(freshFeedback(), { type: "show-how" });
    expect(revealed.advance).toBe(false);
    expect(revealed.state.phase).toBe("revealed");
    expect(revealed.state.firstTryCorrect).toBe(false);
    expect(revealed.record).toBe(false);
    expect(revealed.announcement).toBe("Here's how.");

    const again = reduceFeedback(revealed.state, { type: "show-how" });
    expect(again.record).toBeNull();
    expect(again.state.phase).toBe("revealed");
  });

  it("does not advance until Next, and Next clears the typed answer", () => {
    const correct = check({ ...freshFeedback(), draft: "4" }, true);
    expect(correct.advance).toBe(false);
    const blocked = reduceFeedback(freshFeedback(), { type: "next" });
    expect(blocked.advance).toBe(false);
    expect(blocked.state.phase).toBe("answering");

    const next = reduceFeedback(correct.state, { type: "next" });
    expect(next.advance).toBe(true);
    expect(next.record).toBeNull();
    expect(next.state).toEqual(freshFeedback());
    expect(next.state.draft).toBe("");
  });

  it("uses a quiet question count and a one-line why", () => {
    expect(progressLabel(3, 10)).toBe("Question 3 of 10");
    expect(progressLabel(0, 10)).toBeNull();
    expect(progressLabel(3, 10)).not.toMatch(/score|point|streak/i);
    expect(whyLine(["Start at 4 and count on 3.", "4 + 3 = 7."])).toBe("Start at 4 and count on 3.");
    expect(whyLine([])).toBeNull();
  });
});
