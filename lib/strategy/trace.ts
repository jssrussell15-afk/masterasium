import type { BlockAction, InteractionTrace } from "@/lib/strategy/types";

const MAX_JUMPS = 20;
const MAX_BLOCKS = 12;
const MAX_KEYS = 40;
const MAX_WRONG = 8;

export type LiveTrace = {
  jumps: number[];
  blocks: BlockAction[];
  keys: string[];
  erases: number;
  retypes: number;
  msToFirstKey: number | null;
  showMeStep: number | null;
  wrongAnswers: string[];
  openedAt: number | null;
  erased: boolean;
};

export function emptyLiveTrace(now = Date.now()): LiveTrace {
  return {
    jumps: [],
    blocks: [],
    keys: [],
    erases: 0,
    retypes: 0,
    msToFirstKey: null,
    showMeStep: null,
    wrongAnswers: [],
    openedAt: now,
    erased: false,
  };
}

function token(value: string): string | null {
  const cleaned = value.replace(/[^0-9]/g, "");
  if (!cleaned || cleaned.length > 8) return null;
  return cleaned;
}

export function noteJump(trace: LiveTrace, size: number): LiveTrace {
  if (!Number.isInteger(size) || size <= 0 || size > 1000) return trace;
  return { ...trace, jumps: [...trace.jumps, size].slice(-MAX_JUMPS) };
}

export function noteBlock(trace: LiveTrace, kind: BlockAction["kind"], size: number): LiveTrace {
  if (!Number.isInteger(size) || size <= 0) return trace;
  return { ...trace, blocks: [...trace.blocks, { kind, size }].slice(-MAX_BLOCKS) };
}

export function noteKey(trace: LiveTrace, key: string, now = Date.now()): LiveTrace {
  const digit = key === "delete" ? "d" : token(key);
  if (!digit) return trace;
  const first = trace.msToFirstKey == null && trace.openedAt != null ? Math.max(0, now - trace.openedAt) : trace.msToFirstKey;
  if (digit === "d") {
    return { ...trace, erases: trace.erases + 1, erased: true, msToFirstKey: first };
  }
  return {
    ...trace,
    keys: [...trace.keys, digit].slice(-MAX_KEYS),
    retypes: trace.erased ? trace.retypes + 1 : trace.retypes,
    erased: false,
    msToFirstKey: first,
  };
}

export function noteShowMeStep(trace: LiveTrace, step: number): LiveTrace {
  if (!Number.isInteger(step) || step < 0 || step > 12) return trace;
  return { ...trace, showMeStep: step };
}

export function noteWrongAnswer(trace: LiveTrace, answer: string): LiveTrace {
  const cleaned = token(answer);
  if (!cleaned) return trace;
  return { ...trace, wrongAnswers: [...trace.wrongAnswers, cleaned].slice(-MAX_WRONG) };
}

export function toInteractionTrace(trace: LiveTrace, input: { factItem: boolean; correct: boolean }): InteractionTrace {
  return {
    jumps: trace.jumps,
    blocks: trace.blocks,
    keys: trace.keys,
    erases: trace.erases,
    retypes: trace.retypes,
    msToFirstKey: trace.msToFirstKey,
    showMeStep: trace.showMeStep,
    factItem: input.factItem,
    correct: input.correct,
    wrongAnswers: trace.wrongAnswers,
  };
}

/** Compact JSON. Drops anything that is not a number or a short token. */
export function packTrace(trace: LiveTrace): string {
  const body = {
    v: 1,
    j: trace.jumps.slice(-MAX_JUMPS),
    b: trace.blocks.slice(-MAX_BLOCKS).map((block) => `${block.kind === "group" ? "g" : "u"}${block.size}`),
    k: trace.keys.slice(-MAX_KEYS),
    e: trace.erases,
    r: trace.retypes,
    t: trace.msToFirstKey,
    s: trace.showMeStep,
    w: trace.wrongAnswers.slice(-MAX_WRONG),
  };
  const json = JSON.stringify(body);
  return json.length <= 800 ? json : JSON.stringify({ v: 1, j: body.j.slice(-8), k: body.k.slice(-12), e: body.e, r: body.r, t: body.t, s: body.s });
}

export function unpackTrace(raw: string, input: { factItem: boolean; correct: boolean }): InteractionTrace | null {
  try {
    const parsed = JSON.parse(raw) as {
      v?: number;
      j?: unknown;
      b?: unknown;
      k?: unknown;
      e?: unknown;
      r?: unknown;
      t?: unknown;
      s?: unknown;
      w?: unknown;
    };
    if (parsed.v !== 1) return null;
    const jumps = Array.isArray(parsed.j) ? parsed.j.filter((size): size is number => Number.isInteger(size) && size > 0) : [];
    const blocks = Array.isArray(parsed.b)
      ? parsed.b.flatMap((item) => {
          if (typeof item !== "string") return [];
          const match = item.match(/^([gu])(\d+)$/);
          if (!match) return [];
          return [{ kind: match[1] === "g" ? ("group" as const) : ("ungroup" as const), size: Number(match[2]) }];
        })
      : [];
    const keys = Array.isArray(parsed.k) ? parsed.k.filter((key): key is string => typeof key === "string" && /^[0-9d]$/.test(key)) : [];
    const wrongAnswers = Array.isArray(parsed.w)
      ? parsed.w.filter((item): item is string => typeof item === "string" && /^[0-9]{1,8}$/.test(item))
      : [];
    return {
      jumps: jumps.slice(-MAX_JUMPS),
      blocks: blocks.slice(-MAX_BLOCKS),
      keys: keys.slice(-MAX_KEYS),
      erases: typeof parsed.e === "number" && parsed.e >= 0 ? Math.min(99, Math.floor(parsed.e)) : 0,
      retypes: typeof parsed.r === "number" && parsed.r >= 0 ? Math.min(99, Math.floor(parsed.r)) : 0,
      msToFirstKey: typeof parsed.t === "number" && parsed.t >= 0 ? Math.min(120000, Math.floor(parsed.t)) : null,
      showMeStep: typeof parsed.s === "number" && parsed.s >= 0 ? Math.min(12, Math.floor(parsed.s)) : null,
      factItem: input.factItem,
      correct: input.correct,
      wrongAnswers: wrongAnswers.slice(-MAX_WRONG),
    };
  } catch {
    return null;
  }
}
