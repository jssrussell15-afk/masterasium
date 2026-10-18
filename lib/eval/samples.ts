import { EVAL_BANK } from "@/lib/eval/bank";
import { fillEval } from "@/lib/eval/fill";
import { alreadyKnow, placeStrand, startTitles, strandDelta, type Placement, type StrandDelta } from "@/lib/eval/place";
import {
  ADJUSTED_NOTE,
  LEVEL_LABEL,
  PARENT_CHECK_PROMPT,
  STRAND_LABEL,
  type EvalStrand,
} from "@/lib/eval/types";

export function sampleQuestion() {
  const template = EVAL_BANK.find((item) => item.id === "g3-add");
  if (!template) throw new Error("Missing the grade 3 addition check-in.");
  return fillEval(template, "pre", 1);
}

export function samplePlacements(): Placement[] {
  return [
    placeStrand({ grade: 3, strand: "number", correct: 4, missed: 0, skipped: 0, moveAhead: true }),
    placeStrand({ grade: 3, strand: "operations", correct: 3, missed: 1, skipped: 0, moveAhead: true }),
    placeStrand({ grade: 3, strand: "geometry", correct: 0, missed: 2, skipped: 0, moveAhead: true }),
    placeStrand({ grade: 3, strand: "measurement", correct: 3, missed: 0, skipped: 0, moveAhead: true }),
    placeStrand({ grade: 3, strand: "data", correct: 4, missed: 0, skipped: 0, moveAhead: true }),
  ];
}

export function sampleEnd() {
  const placements = samplePlacements();
  return {
    known: alreadyKnow(3, placements),
    starts: startTitles(placements),
  };
}

export type MapRow = { strand: EvalStrand; label: string; level: string };

export function sampleMap(): { prompt: string; rows: MapRow[] } {
  return {
    prompt: PARENT_CHECK_PROMPT,
    rows: samplePlacements().map((row) => ({
      strand: row.strand,
      label: STRAND_LABEL[row.strand],
      level: LEVEL_LABEL[row.level],
    })),
  };
}

export function sampleDeltas(): { note: string; rows: StrandDelta[] } {
  return {
    note: ADJUSTED_NOTE,
    rows: [
      strandDelta("Number sense", 0.4, 0.85),
      strandDelta("Operations", 0.62, 0.78),
      strandDelta("Shapes", 0.2, 0.5),
      strandDelta("Measurement", 0.9, 1),
      strandDelta("Data", 0.3, 0.66),
    ],
  };
}
