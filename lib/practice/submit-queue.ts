import { markDraftSaved, upsertDraft, type AttemptDraft } from "@/lib/practice/draft-store";

export type SubmitResult = { ok: true } | { ok: false; retry: boolean };

const DEFAULT_DELAYS = [400, 800, 1600, 3200];

/**
 * Keeps one attempt id across offline retries.
 * The question stays put until a send succeeds. Later tries reuse the same id.
 */
export async function flushDraft(input: {
  draft: AttemptDraft;
  storage: Storage;
  send: (draft: AttemptDraft) => Promise<SubmitResult>;
  delaysMs?: number[];
  sleep?: (ms: number) => Promise<void>;
  onStatus?: (status: "saving" | "saved") => void;
}): Promise<"saved" | "saving"> {
  const delays = input.delaysMs ?? DEFAULT_DELAYS;
  const sleep = input.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const pending = { ...input.draft, status: "pending" as const };
  upsertDraft(input.storage, pending);
  input.onStatus?.("saving");

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      const result = await input.send(pending);
      if (result.ok) {
        markDraftSaved(input.storage, pending.attemptId);
        input.onStatus?.("saved");
        return "saved";
      }
      if (!result.retry) return "saving";
    } catch {
      // Offline or a dropped response. The attempt id stays in localStorage.
    }
    if (attempt < delays.length) await sleep(delays[attempt] ?? 0);
  }
  return "saving";
}
