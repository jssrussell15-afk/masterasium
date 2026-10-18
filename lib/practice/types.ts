import type { SupportedGrade } from "@/lib/grades";
import type { GradeAccess } from "@/lib/practice/grade-access";
import type { WorkedExample } from "@/lib/practice/example";
import type { FeedbackPhase } from "@/lib/practice/feedback";
import type { HintLadder } from "@/lib/practice/hints";
import type { SkillIntro } from "@/lib/practice/intro-view";
import type { AnswerShape } from "@/lib/practice/parts";
import type { StreakMilestone } from "@/lib/practice/streak";
import type { Walkthrough } from "@/lib/practice/walk";

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
  /** Guided steps, when this skill can highlight the prompt. Otherwise null. */
  walk?: Walkthrough | null;
};

export type QuestionKind = "focus" | "review" | "check" | "support";

export type AssistView = {
  setup: string;
  firstStep: string | null;
};

export type QuestionView = {
  questionId: string;
  prompt: string;
  skillId: string;
  skillTitle: string;
  responseHint: string | null;
  kind: QuestionKind;
  shape: AnswerShape;
  assist: AssistView | null;
  /** Set only for the first question after a topic intro. The client hides the prompt until the timer ends. */
  intro?: SkillIntro;
  /** Short bubble copy. The live answer is not included. */
  hints?: HintLadder;
  /** A different worked example of this kind, or null when one cannot be checked. */
  example?: WorkedExample | null;
  /** Show me steps. Null keeps the text "Here's how" fallback. */
  walk?: Walkthrough | null;
  /** Restored after a refresh so a retry does not become a new first try. */
  resume?: {
    phase: Exclude<FeedbackPhase, "answering">;
    why: string | null;
    steps: string[];
    expected: string | null;
    /** The first typed answer, so a refresh keeps it in the box. */
    draft: string;
  };
};

export type SkillStatus = "mastered" | "practicing" | "not-started" | "check";

export type SkillProgress = {
  id: string;
  grade: SupportedGrade;
  title: string;
  summary: string;
  examplePrompt: string;
  exampleSteps: string[];
  exampleAnswer: string;
  status: SkillStatus;
  /** True after the short "show what you know" check. Legacy mastered skills stay false. */
  checked: boolean;
  current: boolean;
};

export type PracticeView = {
  childId: string;
  childName: string;
  grade: SupportedGrade;
  access: GradeAccess;
  question: QuestionView;
  attempted: number;
  correct: number;
  focusTitle: string;
  skills: SkillProgress[];
  streakDays: number;
  streakMilestone: StreakMilestone | null;
  recap: string | null;
  requestedGrade: SupportedGrade | null;
  today: string;
};

export type PracticeState = {
  error?: string;
  correct?: boolean;
  expected?: string;
  steps?: string[];
  note?: string;
  /** Which question the feedback below belongs to. */
  feedbackFor?: string;
  phase?: Exclude<FeedbackPhase, "answering">;
  why?: string | null;
  next?: QuestionView;
  attempted?: number;
  correctCount?: number;
  focusTitle?: string;
  skills?: SkillProgress[];
  streakDays?: number;
  streakMilestone?: StreakMilestone | null;
  recap?: string | null;
  requestNote?: string;
  requestedGrade?: SupportedGrade | null;
  workingGrade?: SupportedGrade;
  /** Calm save state while a retry is in flight. */
  saveNote?: "saving" | "saved";
};
