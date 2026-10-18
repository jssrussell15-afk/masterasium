import type { AttemptMark } from "@/lib/practice/feedback";
import type { QuestionKind } from "@/lib/practice/types";

export type StoredPlan = {
  kind: QuestionKind | null;
  rollbackSkillId: string | null;
};

export type StoredContent = {
  itemId: string | null;
  lane: "core" | "go_further" | "review";
  difficulty: 1 | 2 | 3;
  answer: Record<string, unknown>;
};

export function packStoredAnswer(
  answer: string,
  steps: string[],
  meta?: { kind?: QuestionKind; rollbackSkillId?: string; content?: StoredContent },
): string {
  return JSON.stringify({
    v: 1,
    answer,
    steps,
    ...(meta?.kind ? { kind: meta.kind } : {}),
    ...(meta?.rollbackSkillId ? { rollbackSkillId: meta.rollbackSkillId } : {}),
    ...(meta?.content ? { content: meta.content } : {}),
  });
}

export function unpackStoredAnswer(stored: string): { answer: string; steps: string[] } {
  try {
    const parsed = JSON.parse(stored) as { v?: number; answer?: unknown; steps?: unknown };
    if (parsed?.v === 1 && typeof parsed.answer === "string" && Array.isArray(parsed.steps)) {
      return {
        answer: parsed.answer,
        steps: parsed.steps.filter((step): step is string => typeof step === "string"),
      };
    }
  } catch {
    // Older rows stored the answer as plain text.
  }
  return { answer: stored, steps: [] };
}

export function readStoredPlan(stored: string): StoredPlan {
  try {
    const parsed = JSON.parse(stored) as { v?: number; kind?: unknown; rollbackSkillId?: unknown };
    if (parsed?.v === 1) {
      const kind = parsed.kind;
      return {
        kind:
          kind === "focus" || kind === "review" || kind === "check" || kind === "support" ? kind : null,
        rollbackSkillId: typeof parsed.rollbackSkillId === "string" ? parsed.rollbackSkillId : null,
      };
    }
  } catch {
    // Plain answers have no plan.
  }
  return { kind: null, rollbackSkillId: null };
}

export function readAttemptMark(stored: string): AttemptMark | null {
  try {
    const parsed = JSON.parse(stored) as { v?: number; mark?: unknown };
    if (parsed?.v !== 1 || !parsed.mark || typeof parsed.mark !== "object") return null;
    const mark = parsed.mark as Partial<AttemptMark>;
    if (mark.phase !== "retry" && mark.phase !== "correct" && mark.phase !== "revealed") return null;
    if (typeof mark.firstTryCorrect !== "boolean") return null;
    return {
      phase: mark.phase,
      firstTryCorrect: mark.firstTryCorrect,
      given: typeof mark.given === "string" ? mark.given : "",
      showedHow: mark.showedHow === true,
    };
  } catch {
    return null;
  }
}

export function readStoredContent(stored: string): StoredContent | null {
  try {
    const parsed = JSON.parse(stored) as { v?: number; content?: Partial<StoredContent> };
    const content = parsed?.v === 1 ? parsed.content : undefined;
    if (!content) return null;
    if (content.lane !== "core" && content.lane !== "go_further" && content.lane !== "review") return null;
    if (content.difficulty !== 1 && content.difficulty !== 2 && content.difficulty !== 3) return null;
    const answer = content.answer;
    return {
      itemId: typeof content.itemId === "string" ? content.itemId : null,
      lane: content.lane,
      difficulty: content.difficulty,
      answer: answer && typeof answer === "object" ? (answer as Record<string, unknown>) : {},
    };
  } catch {
    return null;
  }
}

export function withAttemptMark(stored: string, mark: AttemptMark): string {
  const { answer, steps } = unpackStoredAnswer(stored);
  const plan = readStoredPlan(stored);
  const content = readStoredContent(stored);
  return JSON.stringify({
    v: 1,
    answer,
    steps,
    ...(plan.kind ? { kind: plan.kind } : {}),
    ...(plan.rollbackSkillId ? { rollbackSkillId: plan.rollbackSkillId } : {}),
    ...(content ? { content } : {}),
    mark,
  });
}
