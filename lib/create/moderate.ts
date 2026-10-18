export const KID_SAFETY_MESSAGE = "Let's try a different choice.";
export const CREATE_PAUSE_MESSAGE = "Create can start again tomorrow.";

export const SAFETY_CATEGORIES = [
  "sexual",
  "violence",
  "hate",
  "profanity",
  "scary",
  "personal",
  "brand",
  "error",
  "timeout",
] as const;

export type SafetyCategory = (typeof SAFETY_CATEGORIES)[number];

export type SafetyVerdict = { ok: true } | { ok: false; category: SafetyCategory };

/**
 * Output check for generated text and images.
 * Live mode should call a provider such as OpenAI omni-moderation.
 * The provider is still an open question. This stub does not use the network.
 * Fail closed: a throw or a timeout becomes a block.
 */
export interface SafetyFilter {
  check(input: { assetIds: string[] }): Promise<SafetyVerdict>;
}

export const stubSafety: SafetyFilter = {
  async check({ assetIds }) {
    if (assetIds.length === 0 || assetIds.some((id) => !id.startsWith("sample-"))) {
      return { ok: false, category: "error" };
    }
    return { ok: true };
  },
};

export async function runSafety(
  filter: SafetyFilter,
  assetIds: string[],
  timeoutMs = 1500,
): Promise<SafetyVerdict> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      filter.check({ assetIds }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
      }),
    ]);
  } catch (error) {
    const timedOut = error instanceof Error && error.message === "timeout";
    return { ok: false, category: timedOut ? "timeout" : "error" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
