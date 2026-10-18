import { describe, expect, it } from "vitest";
import { newAttemptId } from "@/lib/practice/draft-store";
import { draftFromForm, formDataFromDraft, prepareAttemptFields, submitShouldRetry } from "@/lib/practice/resilient-submit";

describe("resilient submit", () => {
  it("retries a dropped call and leaves a settled message alone", () => {
    expect(submitShouldRetry(undefined, true)).toBe(true);
    expect(submitShouldRetry("Could not reach the database.", false)).toBe(true);
    expect(submitShouldRetry("Check your answer first.", false)).toBe(false);
    expect(submitShouldRetry(undefined, false)).toBe(false);
  });

  it("keeps the check id on a retry and mints a new one after that check landed", () => {
    const attemptId = newAttemptId();
    const checkId = newAttemptId();
    const form = new FormData();
    form.set("intent", "check");
    form.set("attemptId", attemptId);
    form.set("checkId", checkId);
    const again = prepareAttemptFields({
      formData: form,
      appliedCheckId: "",
      nextId: newAttemptId,
    });
    expect(again.rotated).toBe(false);
    expect(again.checkId).toBe(checkId);
    expect(form.get("attemptId")).toBe(attemptId);

    const nextPress = prepareAttemptFields({
      formData: form,
      appliedCheckId: checkId,
      nextId: newAttemptId,
    });
    expect(nextPress.rotated).toBe(true);
    expect(nextPress.checkId).not.toBe(checkId);
    expect(form.get("attemptId")).toBe(attemptId);
  });

  it("round-trips the same attempt id into the retry payload", () => {
    const attemptId = newAttemptId();
    const checkId = newAttemptId();
    const form = new FormData();
    form.set("intent", "next");
    form.set("attemptId", attemptId);
    form.set("checkId", checkId);
    form.set("childId", "child-1");
    form.set("questionId", "q1");
    form.set("answer", "8");
    form.set("remainder", "");
    form.set("elapsedSeconds", "4");
    const draft = draftFromForm(form);
    expect(draft?.attemptId).toBe(attemptId);
    const retry = formDataFromDraft(draft!, [{ name: "elapsedSeconds", value: "4" }]);
    expect(retry.get("attemptId")).toBe(attemptId);
    expect(retry.get("checkId")).toBe(checkId);
    expect(retry.get("elapsedSeconds")).toBe("4");
  });
});
