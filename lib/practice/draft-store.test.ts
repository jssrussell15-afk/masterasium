import { describe, expect, it } from "vitest";
import {
  draftForQuestion,
  markDraftSaved,
  newAttemptId,
  pendingDrafts,
  rememberDraft,
  upsertDraft,
  type AttemptDraft,
} from "@/lib/practice/draft-store";

function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  } satisfies Storage;
}

function draft(over: Partial<AttemptDraft> = {}): AttemptDraft {
  return {
    attemptId: newAttemptId(),
    checkId: newAttemptId(),
    childId: "child-1",
    questionId: "q1",
    answer: "8",
    remainder: "",
    intent: "check",
    status: "draft",
    ...over,
  };
}

describe("attempt drafts", () => {
  it("restores the latest draft for a question after a reload", () => {
    const storage = memory();
    const first = draft({ answer: "4" });
    const second = draft({ answer: "8", remainder: "1" });
    upsertDraft(storage, first);
    upsertDraft(storage, second);
    expect(draftForQuestion(storage, "child-1", "q1")).toEqual(second);
    expect(draftForQuestion(storage, "child-1", "other")).toBeNull();
  });

  it("keeps a pending send while the child keeps typing", () => {
    const storage = memory();
    const pending = draft({ status: "pending", answer: "5" });
    upsertDraft(storage, pending);
    rememberDraft(storage, { ...pending, status: "draft", answer: "9" });
    expect(draftForQuestion(storage, "child-1", "q1")?.answer).toBe("5");
    expect(pendingDrafts(storage)).toHaveLength(1);
  });

  it("drops a draft once the server has saved it", () => {
    const storage = memory();
    const saved = draft({ status: "pending" });
    upsertDraft(storage, saved);
    markDraftSaved(storage, saved.attemptId);
    expect(draftForQuestion(storage, "child-1", "q1")).toBeNull();
  });
});
