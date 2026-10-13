import type { SupportedGrade } from "@/lib/grades";

/**
 * A question is the same shape whether it was generated or, later,
 * built from a worksheet the parent uploaded.
 */
export type Question = {
  skillId: string;
  prompt: string;
  answer: string;
  steps: string[];
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

export type SkillStatus = "mastered" | "practicing" | "not-started";

export type SkillProgress = {
  id: string;
  title: string;
  summary: string;
  examplePrompt: string;
  exampleSteps: string[];
  exampleAnswer: string;
  status: SkillStatus;
  current: boolean;
};

export type PracticeView = {
  childId: string;
  childName: string;
  grade: SupportedGrade;
  question: QuestionView;
  attempted: number;
  correct: number;
  focusTitle: string;
  skills: SkillProgress[];
};

export type PracticeState = {
  error?: string;
  correct?: boolean;
  expected?: string;
  steps?: string[];
  note?: string;
  next?: QuestionView;
  attempted?: number;
  correctCount?: number;
  focusTitle?: string;
  skills?: SkillProgress[];
};
