export const SHOW_STYLES = ["guided", "standard", "buggy"] as const;
export type ShowStyle = (typeof SHOW_STYLES)[number];

export const SEGMENTS = ["catch-up", "on-level", "go-further"] as const;
export type SegmentPrior = (typeof SEGMENTS)[number];

export const MASTERY_STATES = ["below", "mastered", "review-passed"] as const;
export type MasteryState = (typeof MASTERY_STATES)[number];

export type EvalLevel = "strong" | "building" | "not_started" | null;

export type StyleInput = {
  segment: SegmentPrior;
  /** First-try hits in the recent window. Ignored until there are 8. */
  recentFirstTries: readonly boolean[];
  mastery: MasteryState;
  /** Hint or Show me uses in the last 5 questions on this skill. */
  helpsInLast5: number;
  evalLevel: EvalLevel;
  /** Show me opened after two misses on this question. */
  stuck: boolean;
  previousStyle: ShowStyle | null;
  /** Consecutive finished sets whose raw style is the new one. */
  setsAtCandidate: number;
};

export type StyleSnapshot = {
  style: ShowStyle;
  reason: string;
  segment: SegmentPrior;
  accuracy: number | null;
  mastery: MasteryState;
  helps: number;
  evalLevel: EvalLevel;
  stuck: boolean;
  previous: ShowStyle | null;
  sets: number;
};

export type StyleChoice = {
  style: ShowStyle;
  reason: string;
  snapshot: StyleSnapshot;
};

export type ShowStep = {
  caption: string;
  result: number;
};

export type BuggyVariant = {
  id: string;
  wrongIndex: number;
  wrongCaption: string;
  wrongResult: number;
  misconceptionId: string;
};

export type ShowTemplate = {
  id: string;
  skill: string;
  topic: string;
  prompt: string;
  highlight: string;
  steps: ShowStep[];
  answer: string;
  fadeCount: 1 | 2;
  misconceptionId: string;
  buggy: BuggyVariant[];
};

export const BUGGY_PARENT_LINE = "Checked a worked example for mistakes";
export const WHY_WRONG = "Why was that step wrong?";
export const WHY_MAX_PER_SET = 2;
export const RECENT_WINDOW = 10;
export const RECENT_MIN = 8;
export const STYLE_CHANGE_SETS = 2;
