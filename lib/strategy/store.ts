import { inferStrategy } from "@/lib/strategy/infer";
import { unpackTrace } from "@/lib/strategy/trace";
import { isStrategy, type StrategyTag } from "@/lib/strategy/types";

const FACT_SKILLS = new Set(["g1-add-10", "g1-sub-10", "g3-mult", "g4-mult"]);

export function isFactSkill(skillId: string): boolean {
  return FACT_SKILLS.has(skillId);
}

export type StoredStrategy = {
  strategy: StrategyTag["strategy"];
  strategy_source: StrategyTag["source"];
  strategy_confidence: number;
  interaction_trace: InteractionPayload | null;
};

type InteractionPayload = {
  v: 1;
  j: number[];
  b: string[];
  k: string[];
  e: number;
  r: number;
  t: number | null;
  s: number | null;
  w: string[];
};

/** Turns the hidden form field into columns. Empty input stores nothing extra. */
export function strategyFromForm(input: {
  rawTrace: string;
  selfReport: string;
  skillId: string;
  correct: boolean;
}): StoredStrategy | null {
  const selfReport = isStrategy(input.selfReport) ? input.selfReport : null;
  const trimmed = input.rawTrace.trim();
  if (!trimmed && !selfReport) return null;
  const trace = trimmed
    ? unpackTrace(trimmed, { factItem: isFactSkill(input.skillId), correct: input.correct })
    : null;
  if (!trace && !selfReport) return null;
  const tag = inferStrategy(
    trace ?? {
      jumps: [],
      blocks: [],
      keys: [],
      erases: 0,
      retypes: 0,
      msToFirstKey: null,
      showMeStep: null,
      factItem: isFactSkill(input.skillId),
      correct: input.correct,
      wrongAnswers: [],
    },
    selfReport,
  );
  let payload: InteractionPayload | null = null;
  if (trace) {
    payload = {
      v: 1,
      j: trace.jumps,
      b: trace.blocks.map((block) => `${block.kind === "group" ? "g" : "u"}${block.size}`),
      k: trace.keys,
      e: trace.erases,
      r: trace.retypes,
      t: trace.msToFirstKey,
      s: trace.showMeStep,
      w: trace.wrongAnswers,
    };
    if (JSON.stringify(payload).length > 800) payload = null;
  }
  return {
    strategy: tag.strategy,
    strategy_source: tag.source,
    strategy_confidence: tag.confidence,
    interaction_trace: payload,
  };
}
