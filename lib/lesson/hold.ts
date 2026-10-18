import type { AttemptMark } from "@/lib/practice/feedback";

export type QuestionHold = {
  phase: "retry" | "correct" | "revealed";
  firstTryCorrect: boolean;
  given: string;
  showedHow: boolean;
};

export function packHold(hold: QuestionHold): { note: string; expected: string } {
  return {
    note: `hold:${hold.phase}:${hold.firstTryCorrect ? "1" : "0"}:${hold.showedHow ? "1" : "0"}`,
    expected: hold.given,
  };
}

export function readHold(note: string | null, expected: string | null): QuestionHold | null {
  if (!note?.startsWith("hold:")) return null;
  const [, phase, first, showed] = note.split(":");
  if (phase !== "retry" && phase !== "correct" && phase !== "revealed") return null;
  return {
    phase,
    firstTryCorrect: first === "1",
    showedHow: showed === "1",
    given: expected ?? "",
  };
}

export function holdToMark(hold: QuestionHold | null): AttemptMark | null {
  if (!hold) return null;
  return {
    phase: hold.phase,
    firstTryCorrect: hold.firstTryCorrect,
    given: hold.given,
    showedHow: hold.showedHow,
  };
}

export function isHoldNote(note: string | null): boolean {
  return note?.startsWith("hold:") ?? false;
}
