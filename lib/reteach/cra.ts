import { STYLE_CHANGE_SETS, type CraStage, type SegmentVariant } from "@/lib/reteach/types";

function rawStage(accuracy: number | null): CraStage {
  if (accuracy == null || accuracy < 0.6) return "concrete";
  if (accuracy < 0.85) return "representational";
  return "abstract";
}

/**
 * Catch-up moves concrete → picture → numbers as first-try accuracy rises.
 * A change waits for two sets on the new side of the line, same idea as Show me styles.
 * Standard and Go further stay on the number stage.
 */
export function chooseCraStage(input: {
  segment: SegmentVariant;
  accuracy: number | null;
  previous: CraStage | null;
  setsAtCandidate: number;
}): CraStage {
  if (input.segment !== "catch_up") return "abstract";
  const raw = rawStage(input.accuracy);
  if (input.previous && input.previous !== raw && input.setsAtCandidate < STYLE_CHANGE_SETS) return input.previous;
  return raw;
}
