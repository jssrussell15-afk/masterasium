import type { SupportedGrade } from "@/lib/grades";

/**
 * A question is the same shape whether it was generated or, later,
 * built from a worksheet the parent uploaded.
 */
export type Question = {
  skillId: string;
  prompt: string;
  answer: string;
  responseHint: string | null;
};

export type QuestionView = {
  questionId: string;
  prompt: string;
  skillId: string;
  skillTitle: string;
  responseHint: string | null;
  kind: "focus" | "review";
};

export type PracticeView = {
  childId: string;
  childName: string;
  grade: SupportedGrade;
  question: QuestionView;
  attempted: number;
  correct: number;
  focusTitle: string;
};

export type PracticeState = {
  error?: string;
  correct?: boolean;
  expected?: string;
  next?: QuestionView;
  attempted?: number;
  correctCount?: number;
  focusTitle?: string;
};
