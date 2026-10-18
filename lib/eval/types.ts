export const EVAL_STRANDS = ["number", "operations", "geometry", "measurement", "data"] as const;
export type EvalStrand = (typeof EVAL_STRANDS)[number];

export const EVAL_GRADES = [1, 2, 3, 4, 5, 6] as const;
export type EvalGrade = (typeof EVAL_GRADES)[number];

export type EvalLevel = "strong" | "building" | "not_started";

export const LEVEL_LABEL: Record<EvalLevel, string> = {
  strong: "Strong",
  building: "Building",
  not_started: "Not started yet",
};

export const STRAND_LABEL: Record<EvalStrand, string> = {
  number: "Number sense",
  operations: "Operations",
  geometry: "Shapes",
  measurement: "Measurement",
  data: "Data",
};

export type EvalSlot = { name: string; min: number; max: number };

export type EvalValues = Record<string, number>;

export type EvalTemplate = {
  id: string;
  grade: EvalGrade;
  strand: EvalStrand;
  skill: string;
  topic: string;
  prompt: string;
  slots: EvalSlot[];
  answer: (values: EvalValues) => number;
  accept?: (values: EvalValues) => boolean;
  /** Maps raw slots to the numbers a child sees. */
  show?: (values: EvalValues) => EvalValues;
  review?: string;
};

export type EvalForm = "pre" | "post";

export type FilledEval = {
  id: string;
  grade: EvalGrade;
  strand: EvalStrand;
  skill: string;
  topic: string;
  prompt: string;
  answer: number;
  values: EvalValues;
  form: EvalForm;
};

export type EvalRole = "core" | "ceiling" | "prereq";

export type EvalMark = "correct" | "missed" | "not_learned";

export type ServedEval = {
  templateId: string;
  strand: EvalStrand;
  skill: string;
  grade: number;
  role: EvalRole;
  mark: EvalMark;
};

export const CHILD_START = "Let's see what you already know";
export const CHILD_POST_START = "Let's check how you've grown.";
export const CHILD_END = "Thanks! Here's where we'll start";
export const ALREADY_KNOW = "You already know";
export const PARENT_CHECK_PROMPT = "A check-in is ready when you have a quiet moment.";
export const ADJUSTED_NOTE = "Adjusted starting point.";

/** Check-in rows stay out of the practice attempt log, so they cannot move the 80% bar. */
export const EVAL_COUNTS_TOWARD_MASTERY = false;
