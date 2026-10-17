import { describe, expect, it } from "vitest";
import { buildPracticeEvent } from "@/lib/practice/events";

describe("practice events", () => {
  it("keeps the four event kinds and drops question text", () => {
    expect(
      buildPracticeEvent({
        kind: "intro_viewed",
        skillId: "g2-add",
        detail: { cycle: "new", prompt: "What is 4 + 5?" },
      }),
    ).toEqual({ kind: "intro_viewed", skillId: "g2-add", detail: { cycle: "new" } });

    expect(
      buildPracticeEvent({
        kind: "hint_rung",
        skillId: "g2-add",
        detail: { rung: "example" },
      })?.detail,
    ).toEqual({ rung: "example" });

    expect(
      buildPracticeEvent({
        kind: "question_attempted",
        skillId: "g2-add",
        detail: { correct: 1, expected: "9" },
      })?.detail,
    ).toEqual({ correct: 1 });

    expect(
      buildPracticeEvent({
        kind: "time_on_task",
        skillId: "g2-add",
        detail: { seconds: 12 },
      })?.detail,
    ).toEqual({ seconds: 12 });

    expect(buildPracticeEvent({ kind: "hint_rung", skillId: "g2-add", detail: {} })).toBeNull();
    expect(buildPracticeEvent({ kind: "points", skillId: "g2-add" })).toBeNull();
    expect(
      buildPracticeEvent({ kind: "time_on_task", skillId: "g2-add", detail: { seconds: 9000 } }),
    ).toBeNull();
  });
});
