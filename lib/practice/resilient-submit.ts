import { isAttemptId } from "@/lib/practice/attempt-once";
import type { AttemptDraft } from "@/lib/practice/draft-store";

const SETTLED = new Set([
  "That question could not be checked.",
  "That practice session is not available.",
  "That child profile is not available for practice.",
  "Check your answer first.",
  "That question expired. Refresh the page and try again.",
  "Choose a skill to practice.",
  "That skill is not available.",
  "That grade is not available.",
]);

/** Thrown calls and unknown failures are retried. A finished validation message is not. */
export function submitShouldRetry(error: string | undefined, thrown: boolean): boolean {
  if (thrown) return true;
  if (!error) return false;
  return !SETTLED.has(error);
}

/**
 * One check id per press. A retry keeps it. The next press after that check landed gets a new one.
 * The attempt id stays with the question so Next can be recorded once.
 */
export function prepareAttemptFields(input: {
  formData: FormData;
  appliedCheckId: string;
  nextId: () => string;
}): { checkId: string; rotated: boolean } {
  const intent = String(input.formData.get("intent") ?? "");
  let checkId = String(input.formData.get("checkId") ?? "");
  let rotated = false;
  const scoring = intent === "check" || intent === "show-how";
  if (!isAttemptId(checkId)) {
    checkId = input.nextId();
    input.formData.set("checkId", checkId);
    rotated = true;
  } else if (scoring && checkId === input.appliedCheckId) {
    checkId = input.nextId();
    input.formData.set("checkId", checkId);
    rotated = true;
  }
  if (!isAttemptId(String(input.formData.get("attemptId") ?? ""))) {
    input.formData.set("attemptId", input.nextId());
  }
  return { checkId, rotated };
}

export function draftFromForm(formData: FormData): AttemptDraft | null {
  const attemptId = String(formData.get("attemptId") ?? "");
  const checkId = String(formData.get("checkId") ?? "");
  const childId = String(formData.get("childId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (!isAttemptId(attemptId) || !isAttemptId(checkId) || !childId || !questionId) return null;
  if (intent !== "check" && intent !== "next" && intent !== "show-how") return null;
  return {
    attemptId,
    checkId,
    childId,
    questionId,
    answer: String(formData.get("answer") ?? ""),
    remainder: String(formData.get("remainder") ?? ""),
    intent,
    status: "pending",
  };
}

export function formDataFromDraft(
  draft: AttemptDraft,
  extra: { name: string; value: string }[],
): FormData {
  const data = new FormData();
  data.set("childId", draft.childId);
  data.set("questionId", draft.questionId);
  data.set("attemptId", draft.attemptId);
  data.set("checkId", draft.checkId);
  data.set("intent", draft.intent);
  data.set("answer", draft.answer);
  data.set("remainder", draft.remainder);
  for (const field of extra) {
    if (!data.has(field.name)) data.set(field.name, field.value);
  }
  return data;
}

export function carriedFields(formData: FormData): { name: string; value: string }[] {
  return ["elapsedSeconds", "introSkillId", "introCycle"].flatMap((name) => {
    const value = formData.get(name);
    return typeof value === "string" && value ? [{ name, value }] : [];
  });
}
