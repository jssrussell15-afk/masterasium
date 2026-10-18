const BLOCKED = [
  "kill",
  "hate",
  "gun",
  "blood",
  "sex",
  "nude",
  "damn",
  "stupid",
];

export type ModerationResult =
  | { ok: true }
  | { ok: false; reason: "empty" | "long" | "blocked" };

/**
 * Prototype pre-filter. It does not log the sentence.
 * A real moderation test set is still required before live image calls.
 */
export function prefilterWriteMyOwn(text: string): ModerationResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  if (trimmed.length > 80) return { ok: false, reason: "long" };
  const folded = trimmed.toLowerCase();
  if (BLOCKED.some((word) => folded.includes(word))) return { ok: false, reason: "blocked" };
  return { ok: true };
}

export interface SafetyFilter {
  checkOutput(assetId: string): { ok: boolean; reason?: "sample" | "blocked" };
}

/** Stub post-filter. Sample files we drew are treated as safe. */
export const stubSafety: SafetyFilter = {
  checkOutput(assetId: string) {
    if (!assetId.startsWith("sample-")) return { ok: false, reason: "blocked" };
    return { ok: true, reason: "sample" };
  },
};
