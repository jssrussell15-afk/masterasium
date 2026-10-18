import { buildCanDo, type CanDoView } from "@/lib/can-do/view";
import { writeLearn } from "@/lib/practice/memory";
import { emptyCard } from "@/lib/practice/scheduler";

const today = "2026-10-18";

/** Sample mastered skills for previews. Not a real child. */
export function sampleCanDo(kind: "filled" | "empty", showReviewLinks: boolean): CanDoView {
  if (kind === "empty") {
    return buildCanDo({
      grade: 3,
      today,
      childId: "sample-child",
      showReviewLinks,
      lessons: [],
      reviews: [],
      cards: [],
    });
  }

  return buildCanDo({
    grade: 3,
    today,
    childId: "sample-child",
    showReviewLinks,
    lessons: [
      { skillId: "g3-time", stage: "complete", completedOn: "2026-10-16" },
      { skillId: "g3-perimeter", stage: "complete", completedOn: "2026-10-09" },
      { skillId: "g3-fractions", stage: "complete", completedOn: "2026-09-28" },
      { skillId: "g3-mult", stage: "complete", completedOn: "2026-09-12" },
      { skillId: "g3-div-rem", stage: "complete", completedOn: "2026-08-30" },
      { skillId: "g3-add-sub", stage: "complete", completedOn: "2026-08-02" },
      { skillId: "g3-place", stage: "practice", completedOn: null },
    ],
    reviews: [
      { skillId: "g3-time", gap: "day", dueOn: "2026-10-17", done: false },
      { skillId: "g3-time", gap: "week", dueOn: "2026-10-23", done: false },
      { skillId: "g3-mult", gap: "month", dueOn: "2026-10-12", done: true },
      { skillId: "g3-place", gap: "day", dueOn: "2026-10-01", done: false },
    ],
    cards: [
      {
        ...emptyCard("g3-place"),
        attempted: 3,
        correct: 2,
        fsrs: writeLearn(null, { lessonHold: true }),
      },
    ],
  });
}
