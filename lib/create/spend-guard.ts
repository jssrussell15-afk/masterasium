export type SpendReason = "missing-key" | "missing-cap" | "cap" | "store" | "prototype";

export type SpendDecision = {
  allowed: boolean;
  reason?: SpendReason;
  spentUsd: number;
  capUsd: number;
  mode: "prototype" | "live";
};

/**
 * Import seam for the xAI spend guard.
 *
 * PR #12 (lib/xai/spend.ts, branch cursor/security-hardening-d128) is not on
 * this branch. After it merges, the live branch below should call
 * beforeXaiCall from @/lib/xai/spend and pass UsageStore plus monthlyCapUsd().
 * Prototype mode must keep skipping that module and must not read the xAI key.
 */
export async function spendGuard(input: {
  mode: "prototype" | "live";
  spentUsd?: number;
  capUsd?: number;
  fetchImpl?: typeof fetch;
}): Promise<SpendDecision> {
  if (input.mode === "prototype") {
    return {
      allowed: true,
      reason: "prototype",
      spentUsd: 0,
      capUsd: input.capUsd ?? 0,
      mode: "prototype",
    };
  }
  const spentUsd = input.spentUsd ?? 0;
  const capUsd = input.capUsd ?? 0;
  if (!(capUsd > 0)) {
    return { allowed: false, reason: "missing-cap", spentUsd, capUsd, mode: "live" };
  }
  if (spentUsd >= capUsd) {
    return { allowed: false, reason: "cap", spentUsd, capUsd, mode: "live" };
  }
  return { allowed: true, spentUsd, capUsd, mode: "live" };
}
