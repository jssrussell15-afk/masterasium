import {
  MIN_STRATEGY_CONFIDENCE,
  isStrategy,
  type InteractionTrace,
  type Strategy,
  type StrategyTag,
} from "@/lib/strategy/types";

type Candidate = { strategy: Strategy; confidence: number };

function distinct(values: readonly string[]): number {
  return new Set(values.filter((value) => value.length > 0)).size;
}

function candidates(trace: InteractionTrace): Candidate[] {
  const found: Candidate[] = [];
  const jumps = trace.jumps.filter((size) => Number.isInteger(size) && size > 0);
  const tensJump = jumps.some((size) => size === 10 || size === 100);
  const regroup = trace.blocks.some(
    (block) => (block.kind === "group" || block.kind === "ungroup") && (block.size === 10 || block.size === 100),
  );
  if (tensJump || regroup) found.push({ strategy: "base_ten", confidence: regroup ? 0.9 : 0.85 });

  const equal = jumps.length >= 2 && jumps.every((size) => size === jumps[0]);
  const step = jumps[0] ?? 0;
  if (equal && step > 1 && step !== 10 && step !== 100) {
    found.push({ strategy: "skip_counting", confidence: 0.85 });
  }

  const ones = jumps.length > 0 && jumps.every((size) => size === 1);
  if (ones && jumps.length >= 10) found.push({ strategy: "counting_all", confidence: 0.75 });
  if (ones && jumps.length >= 1 && jumps.length < 10) found.push({ strategy: "counting_on", confidence: 0.8 });

  const fastWrongs = distinct(trace.wrongAnswers) >= 3 && trace.msToFirstKey != null && trace.msToFirstKey < 8000;
  if (fastWrongs) found.push({ strategy: "guess_and_check", confidence: 0.7 });

  const noTool = jumps.length === 0 && trace.blocks.length === 0;
  const fastCorrect =
    trace.correct &&
    trace.factItem &&
    noTool &&
    trace.erases === 0 &&
    trace.msToFirstKey != null &&
    trace.msToFirstKey < 4000;
  if (fastCorrect) found.push({ strategy: "known_fact", confidence: 0.85 });

  if (jumps.length > 0 && !tensJump && !equal && !ones) {
    found.push({ strategy: "number_line", confidence: 0.7 });
  }
  return found;
}

function best(found: Candidate[]): StrategyTag {
  const ranked = [...found].sort((left, right) => right.confidence - left.confidence);
  const top = ranked[0];
  if (!top || top.confidence < MIN_STRATEGY_CONFIDENCE) {
    return { strategy: "unknown", source: "none", confidence: 0 };
  }
  return { strategy: top.strategy, source: "inferred", confidence: top.confidence };
}

/**
 * Reads a compact interaction trace. A self-reported strategy from an
 * explain-your-reasoning response wins. Anything under 0.6 becomes unknown.
 */
export function inferStrategy(trace: InteractionTrace, selfReport?: string | null): StrategyTag {
  if (isStrategy(selfReport) && selfReport !== "unknown") {
    return { strategy: selfReport, source: "self_reported", confidence: 1 };
  }
  return best(candidates(trace));
}
