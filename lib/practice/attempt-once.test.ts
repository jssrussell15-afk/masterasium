import { describe, expect, it } from "vitest";
import { attemptWritePlan, isAttemptId } from "@/lib/practice/attempt-once";

const ID = "11111111-1111-4111-8111-111111111111";

describe("attempt write plan", () => {
  it("accepts a uuid and rejects anything else", () => {
    expect(isAttemptId(ID)).toBe(true);
    expect(isAttemptId("not-an-id")).toBe(false);
    expect(isAttemptId("")).toBe(false);
  });

  it("inserts once, finishes a partial write, and skips a completed one", () => {
    expect(attemptWritePlan(null)).toBe("insert");
    expect(attemptWritePlan({ learning_applied: false })).toBe("apply");
    expect(attemptWritePlan({ learning_applied: true })).toBe("skip");
  });
});
