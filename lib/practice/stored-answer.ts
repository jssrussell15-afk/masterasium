import type { AttemptMark } from "@/lib/practice/feedback";
import type { QuestionKind } from "@/lib/practice/types";
import type { Walkthrough } from "@/lib/practice/walk";

export type StoredPlan = {
  kind: QuestionKind | null;
  rollbackSkillId: string | null;
  onRamp: boolean;
};

export function packStoredAnswer(
  answer: string,
  steps: string[],
  meta?: { kind?: QuestionKind; rollbackSkillId?: string; walk?: Walkthrough | null; onRamp?: boolean },
): string {
  return JSON.stringify({
    v: 1,
    answer,
    steps,
    ...(meta?.kind ? { kind: meta.kind } : {}),
    ...(meta?.rollbackSkillId ? { rollbackSkillId: meta.rollbackSkillId } : {}),
    ...(meta?.walk ? { walk: meta.walk } : {}),
    ...(meta?.onRamp ? { onRamp: true } : {}),
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
    const parsed = JSON.parse(stored) as {
      v?: number;
      kind?: unknown;
      rollbackSkillId?: unknown;
      onRamp?: unknown;
    };
    if (parsed?.v === 1) {
      const kind = parsed.kind;
      return {
        kind:
          kind === "focus" || kind === "review" || kind === "check" || kind === "support" ? kind : null,
        rollbackSkillId: typeof parsed.rollbackSkillId === "string" ? parsed.rollbackSkillId : null,
        onRamp: parsed.onRamp === true,
      };
    }
  } catch {
    // Plain answers have no plan.
  }
  return { kind: null, rollbackSkillId: null, onRamp: false };
}

export function readStoredWalk(stored: string): Walkthrough | null {
  try {
    const parsed = JSON.parse(stored) as { v?: number; walk?: unknown };
    if (parsed?.v !== 1) return null;
    return walkValue(parsed.walk);
  } catch {
    return null;
  }
}

function walkValue(value: unknown): Walkthrough | null {
  if (!value || typeof value !== "object") return null;
  const walk = value as Partial<Walkthrough>;
  if (typeof walk.answer !== "string" || !Array.isArray(walk.steps)) return null;
  if (walk.steps.length < 3 || walk.steps.length > 5) return null;
  const steps = walk.steps.filter(
    (step): step is Walkthrough["steps"][number] =>
      Boolean(step) &&
      typeof step === "object" &&
      typeof (step as { target?: unknown }).target === "string" &&
      typeof (step as { caption?: unknown }).caption === "string",
  );
  if (steps.length !== walk.steps.length) return null;
  return { answer: walk.answer, steps };
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
      ...(mark.showedExample === true ? { showedExample: true } : {}),
      ...(typeof mark.clientCheckId === "string" ? { clientCheckId: mark.clientCheckId } : {}),
    };
  } catch {
    return null;
  }
}

export function withAttemptMark(stored: string, mark: AttemptMark): string {
  const { answer, steps } = unpackStoredAnswer(stored);
  const plan = readStoredPlan(stored);
  const walk = readStoredWalk(stored);
  return JSON.stringify({
    v: 1,
    answer,
    steps,
    ...(plan.kind ? { kind: plan.kind } : {}),
    ...(plan.rollbackSkillId ? { rollbackSkillId: plan.rollbackSkillId } : {}),
    ...(walk ? { walk } : {}),
    ...(plan.onRamp ? { onRamp: true } : {}),
    mark,
  });
}
