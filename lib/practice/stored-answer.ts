export function packStoredAnswer(answer: string, steps: string[]): string {
  return JSON.stringify({ v: 1, answer, steps });
}

export function unpackStoredAnswer(stored: string): { answer: string; steps: string[] } {
  try {
    const parsed = JSON.parse(stored) as { v?: number; answer?: unknown; steps?: unknown };
    if (parsed?.v === 1 && typeof parsed.answer === "string" && Array.isArray(parsed.steps)) {
      return {
        answer: parsed.answer,
        steps: parsed.steps.filter((step): step is string => typeof step === "string"),
      };
    }
  } catch {
    // Older rows stored the answer as plain text.
  }
  return { answer: stored, steps: [] };
}
