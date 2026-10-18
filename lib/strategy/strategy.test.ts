import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COUNTING_ON_ADDITION,
  MIXED,
  NOT_ENOUGH,
  NUMBER_LINE_SUBTRACTION,
} from "@/lib/strategy/copy";
import { describeStrand, strategyLines } from "@/lib/strategy/desk";
import { catchUpManipulativeFlag } from "@/lib/strategy/flag";
import { inferStrategy } from "@/lib/strategy/infer";
import { rollupStrategies, traceIsDueForRollup } from "@/lib/strategy/rollup";
import { strategyFromForm } from "@/lib/strategy/store";
import { emptyLiveTrace, noteBlock, noteJump, noteKey, noteWrongAnswer, packTrace, unpackTrace } from "@/lib/strategy/trace";
import type { InteractionTrace, Strategy } from "@/lib/strategy/types";

const migrationPath = "supabase/migrations/20261018175541_strategy_tagging.sql";

function trace(over: Partial<InteractionTrace> = {}): InteractionTrace {
  return {
    jumps: [],
    blocks: [],
    keys: [],
    erases: 0,
    retypes: 0,
    msToFirstKey: null,
    showMeStep: null,
    factItem: false,
    correct: false,
    wrongAnswers: [],
    ...over,
  };
}

function tagged(skillId: string, strategy: Strategy, count: number) {
  return Array.from({ length: count }, () => ({ skillId, strategy }));
}

describe("strategy inference", () => {
  it("reads jumps of 1 as counting on, tens as base ten, and equal jumps as skip counting", () => {
    expect(inferStrategy(trace({ jumps: [1, 1, 1] })).strategy).toBe("counting_on");
    expect(inferStrategy(trace({ jumps: [10, 10] })).strategy).toBe("base_ten");
    expect(inferStrategy(trace({ jumps: [100] })).strategy).toBe("base_ten");
    expect(inferStrategy(trace({ blocks: [{ kind: "group", size: 10 }] })).strategy).toBe("base_ten");
    expect(inferStrategy(trace({ jumps: [5, 5, 5] })).strategy).toBe("skip_counting");
  });

  it("reads fast wrong answers as guess and check, and a fast fact as a known fact", () => {
    expect(
      inferStrategy(trace({ wrongAnswers: ["4", "9", "2"], msToFirstKey: 1200 })).strategy,
    ).toBe("guess_and_check");
    expect(
      inferStrategy(trace({ correct: true, factItem: true, msToFirstKey: 900, erases: 0 })).strategy,
    ).toBe("known_fact");
  });

  it("stores unknown when confidence would sit under 0.6", () => {
    expect(inferStrategy(trace()).strategy).toBe("unknown");
    expect(inferStrategy(trace()).confidence).toBe(0);
    expect(inferStrategy(trace()).source).toBe("none");
    expect(inferStrategy(trace({ jumps: [2, 4, 8] })).strategy).toBe("number_line");
    expect(inferStrategy(trace({ jumps: [2, 4, 8] })).confidence).toBeGreaterThanOrEqual(0.6);
  });

  it("lets an explain-your-reasoning response set a self-reported strategy", () => {
    const tag = inferStrategy(trace({ jumps: [1, 1] }), "base_ten");
    expect(tag).toEqual({ strategy: "base_ten", source: "self_reported", confidence: 1 });
  });

  it("packs a trace without free text", () => {
    let live = emptyLiveTrace(1_000);
    live = noteJump(live, 1);
    live = noteBlock(live, "group", 10);
    live = noteKey(live, "4", 1_400);
    live = noteKey(live, "delete", 1_500);
    live = noteWrongAnswer(live, "nope");
    live = noteWrongAnswer(live, "12");
    const packed = packTrace(live);
    expect(packed).not.toContain("nope");
    expect(JSON.parse(packed).w).toEqual(["12"]);
    const unpacked = unpackTrace(packed, { factItem: false, correct: false });
    expect(unpacked?.jumps).toEqual([1]);
    expect(unpacked?.blocks).toEqual([{ kind: "group", size: 10 }]);
    expect(unpacked?.keys).toEqual(["4"]);
    expect(unpacked?.erases).toBe(1);
  });
});

describe("strategy desk", () => {
  it("names a pattern, a mix, and a short record", () => {
    expect(describeStrand(tagged("g3-add-sub", "counting_on", 8))).toBe(COUNTING_ON_ADDITION);
    expect(describeStrand(tagged("g1-sub-10", "number_line", 8))).toBe(NUMBER_LINE_SUBTRACTION);
    expect(
      describeStrand([
        ...tagged("g2-add-sub", "counting_on", 4),
        ...tagged("g1-sub-10", "number_line", 4),
      ]),
    ).toBe(MIXED);
    expect(describeStrand(tagged("g3-add-sub", "counting_on", 3))).toBe(NOT_ENOUGH);
    expect(strategyLines(tagged("g3-add-sub", "counting_on", 8))[0]?.label).toBe("Operations");
    const text = strategyLines(tagged("g3-add-sub", "counting_on", 8)).map((line) => line.text).join(" ");
    expect(text).not.toMatch(/%|score|bad strategy/i);
  });

  it("flags counting on for three-digit addition below 80% and leaves practice alone", () => {
    expect(catchUpManipulativeFlag({ strategy: "counting_on", skillId: "g3-add-sub", mastery: 0.7 })).toEqual({
      flagged: true,
      manipulative: "base_ten",
      pattern: "counting_on_on_three_digit_addition",
    });
    expect(catchUpManipulativeFlag({ strategy: "counting_on", skillId: "g3-add-sub", mastery: 0.8 }).flagged).toBe(false);
    expect(catchUpManipulativeFlag({ strategy: "base_ten", skillId: "g3-add-sub", mastery: 0.4 }).flagged).toBe(false);
    expect(catchUpManipulativeFlag({ strategy: "counting_on", skillId: "g2-add-sub", mastery: 0.4 }).flagged).toBe(false);
  });

  it("rolls traces up without the child id", () => {
    const rows = rollupStrategies([
      { childId: "child-a", skillId: "g3-add-sub", strategy: "counting_on", at: "2026-01-01" },
      { childId: "child-b", skillId: "g3-add-sub", strategy: "counting_on", at: "2026-01-02" },
    ]);
    expect(rows).toEqual([{ skillId: "g3-add-sub", strategy: "counting_on", count: 2 }]);
    expect(JSON.stringify(rows)).not.toContain("child");
    const now = new Date("2026-10-18T00:00:00Z");
    expect(traceIsDueForRollup(new Date("2025-10-01T00:00:00Z"), now)).toBe(true);
    expect(traceIsDueForRollup(new Date("2026-06-01T00:00:00Z"), now)).toBe(false);
  });
});

describe("strategy migration", () => {
  const sql = readFileSync(migrationPath, "utf8");

  it("adds the tag columns and keeps the parent policy in place", () => {
    expect(sql).toContain("add column if not exists strategy text not null default 'unknown'");
    expect(sql).toContain("strategy_source text not null default 'none'");
    expect(sql).toContain("strategy_confidence numeric(4,3) not null default 0");
    expect(sql).toContain("strategy_confidence >= 0 and strategy_confidence <= 1");
    expect(sql).toContain("expected_strategies text[]");
    expect(sql).toContain("interaction_trace");
    expect(sql).toContain("12 months");
    expect(sql).not.toContain("create policy");
    expect(sql).not.toMatch(/grant\s+(select|insert|update|delete)\s+on\s+public\.attempts/i);
    expect(sql).toContain("parents read attempt scores");
  });

  it("stores a self-reported tag from the form and drops free text", () => {
    const stored = strategyFromForm({
      rawTrace: packTrace(noteJump(emptyLiveTrace(), 1)),
      selfReport: "base_ten",
      skillId: "g3-add-sub",
      correct: true,
    });
    expect(stored?.strategy).toBe("base_ten");
    expect(stored?.strategy_source).toBe("self_reported");
    expect(stored?.strategy_confidence).toBe(1);
    expect(stored?.interaction_trace?.w.join("")).not.toMatch(/[A-Za-z]/);
    expect(stored?.interaction_trace?.k.join("")).not.toMatch(/[A-Za-z]/);
  });
});
