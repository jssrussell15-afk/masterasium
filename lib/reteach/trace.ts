/**
 * Compact manipulative trace. Keys match the strategy-tagging checker
 * (j jumps, b blocks, k keys) so the sibling PR can read them. No free text.
 */

export type ReteachTrace = {
  j: number[];
  b: string[];
  k: string[];
  e: number;
  r: number;
  t: number | null;
  s: number | null;
};

export function emptyReteachTrace(): ReteachTrace {
  return { j: [], b: [], k: [], e: 0, r: 0, t: null, s: null };
}

export function noteJump(trace: ReteachTrace, size: number): ReteachTrace {
  if (!Number.isInteger(size) || size <= 0 || size > 1000) return trace;
  return { ...trace, j: [...trace.j, size].slice(-20) };
}

export function noteBlock(trace: ReteachTrace, kind: "group" | "ungroup", size: number): ReteachTrace {
  if (!Number.isInteger(size) || size <= 0) return trace;
  const token = `${kind === "group" ? "g" : "u"}${size}`;
  return { ...trace, b: [...trace.b, token].slice(-12) };
}

export function packReteachTrace(trace: ReteachTrace): string {
  return JSON.stringify({ v: 1, ...trace });
}
