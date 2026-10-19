export type AttemptDraft = {
  attemptId: string;
  checkId: string;
  childId: string;
  questionId: string;
  answer: string;
  remainder: string;
  intent: "check" | "next" | "show-how";
  status: "draft" | "pending";
};

const KEY = "masterasium.attemptDrafts";

export function newAttemptId(): string {
  return crypto.randomUUID();
}

export function readDrafts(storage: Pick<Storage, "getItem">): AttemptDraft[] {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDraft);
  } catch {
    return [];
  }
}

export function writeDrafts(storage: Pick<Storage, "setItem">, drafts: AttemptDraft[]): void {
  storage.setItem(KEY, JSON.stringify(drafts.slice(-20)));
}

export function upsertDraft(storage: Storage, draft: AttemptDraft): void {
  const rest = readDrafts(storage).filter((item) => item.attemptId !== draft.attemptId);
  writeDrafts(storage, [...rest, draft]);
}

/** Typing while a send is still retrying must not replace that pending payload. */
export function rememberDraft(storage: Storage, draft: AttemptDraft): void {
  const current = readDrafts(storage).find((item) => item.attemptId === draft.attemptId);
  if (current?.status === "pending") return;
  upsertDraft(storage, draft);
}

export function draftForQuestion(storage: Pick<Storage, "getItem">, childId: string, questionId: string): AttemptDraft | null {
  const matches = readDrafts(storage).filter((item) => item.childId === childId && item.questionId === questionId);
  return matches.at(-1) ?? null;
}

export function markDraftSaved(storage: Storage, attemptId: string): void {
  writeDrafts(
    storage,
    readDrafts(storage).filter((item) => item.attemptId !== attemptId),
  );
}

export function pendingDrafts(storage: Pick<Storage, "getItem">): AttemptDraft[] {
  return readDrafts(storage).filter((item) => item.status === "pending");
}

function isDraft(value: unknown): value is AttemptDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<AttemptDraft>;
  return (
    typeof draft.attemptId === "string" &&
    typeof draft.checkId === "string" &&
    typeof draft.childId === "string" &&
    typeof draft.questionId === "string" &&
    typeof draft.answer === "string" &&
    typeof draft.remainder === "string" &&
    (draft.intent === "check" || draft.intent === "next" || draft.intent === "show-how") &&
    (draft.status === "draft" || draft.status === "pending")
  );
}
