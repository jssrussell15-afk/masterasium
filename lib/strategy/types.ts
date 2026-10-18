export const STRATEGIES = [
  "base_ten",
  "counting_on",
  "counting_all",
  "skip_counting",
  "number_line",
  "guess_and_check",
  "known_fact",
  "unknown",
] as const;

export type Strategy = (typeof STRATEGIES)[number];

export const STRATEGY_SOURCES = ["inferred", "self_reported", "none"] as const;
export type StrategySource = (typeof STRATEGY_SOURCES)[number];

/** Below this, the tag is unknown. A low guess is not stored as a strategy. */
export const MIN_STRATEGY_CONFIDENCE = 0.6;

export const TAGGED_MIN = 8;

export const TRACE_RETENTION_MONTHS = 12;

export type BlockAction = { kind: "group" | "ungroup"; size: number };

/** What the checker reads. Numbers and short tokens only. */
export type InteractionTrace = {
  jumps: number[];
  blocks: BlockAction[];
  keys: string[];
  erases: number;
  retypes: number;
  msToFirstKey: number | null;
  showMeStep: number | null;
  factItem: boolean;
  correct: boolean;
  wrongAnswers: string[];
};

export type StrategyTag = {
  strategy: Strategy;
  source: StrategySource;
  confidence: number;
};

export function isStrategy(value: string | null | undefined): value is Strategy {
  return STRATEGIES.includes(value as Strategy);
}
