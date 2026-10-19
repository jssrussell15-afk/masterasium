import { describe, expect, it } from "vitest";
import { newAttemptId, readDrafts, upsertDraft, type AttemptDraft } from "@/lib/practice/draft-store";
import { flushDraft } from "@/lib/practice/submit-queue";

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

function draft(): AttemptDraft {
  return {
    attemptId: newAttemptId(),
    checkId: newAttemptId(),
    childId: "child-1",
    questionId: "q1",
    answer: "8",
    remainder: "",
    intent: "next",
    status: "draft",
  };
}

describe("offline submit queue", () => {
  it("retries a dropped send with the same attempt id and then clears it", async () => {
    const storage = memory();
    const item = draft();
    const seen: string[] = [];
    const notes: string[] = [];
    let tries = 0;
    const result = await flushDraft({
      draft: item,
      storage,
      delaysMs: [5, 5, 5],
      sleep: async () => undefined,
      onStatus: (status) => notes.push(status),
      send: async (pending) => {
        tries += 1;
        seen.push(pending.attemptId);
        if (tries < 3) throw new Error("offline");
        return { ok: true };
      },
    });
    expect(result).toBe("saved");
    expect(tries).toBe(3);
    expect(new Set(seen)).toEqual(new Set([item.attemptId]));
    expect(notes).toEqual(["saving", "saved"]);
    expect(readDrafts(storage)).toEqual([]);
  });

  it("leaves the draft pending when every try fails", async () => {
    const storage = memory();
    const item = draft();
    upsertDraft(storage, item);
    const result = await flushDraft({
      draft: item,
      storage,
      delaysMs: [1],
      sleep: async () => undefined,
      send: async () => {
        throw new Error("offline");
      },
    });
    expect(result).toBe("saving");
    expect(readDrafts(storage).map((row) => row.attemptId)).toEqual([item.attemptId]);
    expect(readDrafts(storage)[0]?.status).toBe("pending");
  });
});
