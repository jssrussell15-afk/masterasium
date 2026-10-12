import { generateQuestion } from "@/lib/practice/generate";
import type { Skill } from "@/lib/practice/skills";
import type { Question } from "@/lib/practice/types";

/**
 * Where the next question comes from.
 *
 * `generated` builds a question from the skill.
 * `uploaded` is the seam for upload-to-similar practice: a later source can
 * turn a parent-uploaded problem into a Question with the same shape.
 */
export type PracticeMode = "generated" | "uploaded";

export interface ItemSource {
  readonly id: PracticeMode;
  next(skill: Skill, rng?: () => number): Question;
}

export const generatedItemSource: ItemSource = {
  id: "generated",
  next(skill, rng = Math.random) {
    return generateQuestion(skill.id, rng);
  },
};

const uploadedItemSource: ItemSource = {
  id: "uploaded",
  next() {
    throw new Error(
      "Upload-to-similar practice is not available yet. Add that ItemSource in lib/practice/source.ts.",
    );
  },
};

export function getItemSource(mode: PracticeMode = "generated"): ItemSource {
  if (mode === "uploaded") return uploadedItemSource;
  return generatedItemSource;
}
