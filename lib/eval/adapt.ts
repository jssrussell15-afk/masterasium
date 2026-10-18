import { EVAL_PREREQ, STRAND_ANCHOR } from "@/lib/eval/links";
import { EVAL_STRANDS, type EvalGrade, type EvalMark, type EvalRole, type EvalStrand, type EvalTemplate, type ServedEval } from "@/lib/eval/types";

export type EvalRef = {
  id: string;
  grade: number;
  strand: EvalStrand;
  skill: string;
};

export type NextEval = { item: EvalRef; role: EvalRole };

function bad(mark: EvalMark): boolean {
  return mark === "missed" || mark === "not_learned";
}

function nextInStrand(grade: EvalGrade, strand: EvalStrand, bank: readonly EvalRef[], served: readonly ServedEval[]): NextEval | null {
  const cores = bank.filter((item) => item.grade === grade && item.strand === strand);
  const servedCore = served.filter((item) => item.strand === strand && item.role === "core");
  const shortened = servedCore.length >= 2 && bad(servedCore[0].mark) && bad(servedCore[1].mark);

  if (!shortened) {
    const nextCore = cores.find((item) => !served.some((row) => row.templateId === item.id));
    if (nextCore) return { item: nextCore, role: "core" };
  }

  if (shortened) {
    if (served.some((row) => row.strand === strand && row.role === "prereq")) return null;
    if (grade <= 1) return null;
    const priorGrade = bank.filter((item) => item.grade === grade - 1 && item.strand === strand);
    const priorSkill = EVAL_PREREQ[STRAND_ANCHOR[grade][strand].skill];
    const preferred = priorSkill ? priorGrade.find((item) => item.skill === priorSkill) : undefined;
    const probe = preferred ?? priorGrade[0];
    if (!probe || served.some((row) => row.templateId === probe.id)) return null;
    return { item: probe, role: "prereq" };
  }

  const finished = cores.length > 0 && servedCore.length === cores.length && servedCore.every((row) => row.mark === "correct");
  if (!finished || grade >= 6) return null;
  const ceilings = served.filter((row) => row.strand === strand && row.role === "ceiling");
  if (ceilings.length >= 2) return null;
  const higher = bank.filter((item) => item.grade === grade + 1 && item.strand === strand);
  const probe = higher.find((item) => !served.some((row) => row.templateId === item.id));
  if (!probe) return null;
  return { item: probe, role: "ceiling" };
}

/** Serves a strand's core items in order. The first two answers can shorten that strand or open a ceiling. */
export function nextEvalItem(grade: EvalGrade, bank: readonly EvalRef[], served: readonly ServedEval[]): NextEval | null {
  for (const strand of EVAL_STRANDS) {
    const next = nextInStrand(grade, strand, bank, served);
    if (next) return next;
  }
  return null;
}

export type StrandRollup = {
  strand: EvalStrand;
  skill: string;
  itemsAttempted: number;
  correct: number;
  missed: number;
  skippedNotLearned: number;
};

/** Ceiling and prerequisite probes stay out of the strand percent. */
export function rollupStrand(served: readonly ServedEval[], strand: EvalStrand, skill: string): StrandRollup {
  const core = served.filter((item) => item.strand === strand && item.role === "core");
  const correct = core.filter((item) => item.mark === "correct").length;
  const missed = core.filter((item) => item.mark === "missed").length;
  const skippedNotLearned = core.filter((item) => item.mark === "not_learned").length;
  return {
    strand,
    skill,
    itemsAttempted: core.length,
    correct,
    missed,
    skippedNotLearned,
  };
}

export function asRefs(bank: readonly EvalTemplate[]): EvalRef[] {
  return bank.map((item) => ({ id: item.id, grade: item.grade, strand: item.strand, skill: item.skill }));
}
