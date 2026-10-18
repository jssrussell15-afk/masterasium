import { describe, expect, it } from "vitest";
import { lessonById, lessonSkillIds } from "@/lib/lesson/catalog";
import {
  explainMiss,
  FADED_COUNT,
  freshRun,
  gapsToClose,
  MASTERY_PASS,
  MASTERY_SIZE,
  PRACTICE_COUNT,
  reduceLesson,
  RETRY_NEW_COUNT,
  reviewPlanDates,
  type LessonEvent,
  type LessonRun,
} from "@/lib/lesson/flow";
import { buildLessonScreen, lessonTask } from "@/lib/lesson/screen";
import { addDays } from "@/lib/practice/dates";
import { applyLearning } from "@/lib/practice/learning";
import { readLearn, writeLearn } from "@/lib/practice/memory";
import { accuracyScheduler, emptyCard, isConfirmed } from "@/lib/practice/scheduler";
import { skillById } from "@/lib/practice/skills";
import { buildParentProgress } from "@/lib/lesson/parent";
import { buildSundayDigest, renderSundayDigestText } from "@/lib/digest/sunday";

const today = "2026-10-18";

function answer(correct: boolean, note: string | null = correct ? null : "Recount the last step."): LessonEvent {
  return { type: "answer", correct, note, expected: "42" };
}

function step(run: LessonRun, event: LessonEvent): LessonRun {
  return reduceLesson(run, event).run;
}

function answerAndClear(run: LessonRun, correct: boolean): { run: LessonRun; justCompleted: boolean } {
  const result = reduceLesson(run, answer(correct));
  if (!result.run.feedbackNote) return { run: result.run, justCompleted: result.justCompleted };
  return { run: reduceLesson(result.run, { type: "continue" }).run, justCompleted: result.justCompleted };
}

describe("grade 3 lessons", () => {
  it("covers eight catalog skills and maps the obvious videos", () => {
    expect(lessonSkillIds()).toEqual([
      "g3-place",
      "g3-add-sub",
      "g3-mult",
      "g3-div-rem",
      "g3-fractions",
      "g3-perimeter",
      "g3-time",
      "g3-data",
    ]);
    for (const id of lessonSkillIds()) {
      expect(skillById(id)?.grade).toBe(3);
      expect(lessonById(id)?.sentence.length).toBeGreaterThan(20);
    }
    expect(lessonById("g3-place")?.video).toMatchObject({ id: "G3-01", url: null });
    expect(lessonById("g3-add-sub")?.video?.id).toBe("G3-02");
    expect(lessonById("g3-mult")?.video?.id).toBe("G3-04");
    expect(lessonById("g3-fractions")?.video?.id).toBe("G3-08");
    expect(lessonById("g3-perimeter")?.video?.id).toBe("G3-07");
    expect(lessonById("g3-time")?.video?.id).toBe("G3-12");
    expect(lessonById("g3-div-rem")?.video).toBeNull();
    expect(lessonById("g3-data")?.video).toBeNull();
  });

  it("walks intro, a worked example, faded steps, practice, then a 4-of-5 check", () => {
    let run = freshRun("g3-mult");
    run = step(run, { type: "continue" });
    expect(run.stage).toBe("worked");
    run = step(run, { type: "continue" });
    expect(run.stage).toBe("faded");

    for (let index = 0; index < FADED_COUNT; index += 1) run = step(run, answer(true));
    expect(run.stage).toBe("practice");
    for (let index = 0; index < PRACTICE_COUNT; index += 1) run = step(run, answer(true));
    expect(run.stage).toBe("mastery");
    expect(run.masteryAsked).toBe(0);

    const pattern = [true, true, false, true, true];
    expect(pattern.filter(Boolean).length).toBeGreaterThanOrEqual(MASTERY_PASS);
    let completed = false;
    for (const correct of pattern) {
      const result = answerAndClear(run, correct);
      run = result.run;
      completed = completed || result.justCompleted;
    }
    expect(pattern).toHaveLength(MASTERY_SIZE);
    expect(completed).toBe(true);
    expect(run.stage).toBe("complete");
    expect(run.feedbackNote).toBeNull();
  });

  it("shows the miss, then a worked example and new numbers, when the check is under 80%", () => {
    let run: LessonRun = { ...freshRun("g3-div-rem"), stage: "mastery" };
    const pattern = [true, false, true, false, false];
    for (const correct of pattern.slice(0, -1)) {
      run = answerAndClear(run, correct).run;
    }
    const last = reduceLesson(run, answer(false));
    run = last.run;
    expect(pattern.filter(Boolean).length).toBeLessThan(MASTERY_PASS);
    expect(run.stage).toBe("retry-worked");
    expect(run.feedbackNote).toBeTruthy();
    expect(run.masteryAsked).toBe(0);

    run = step(run, { type: "continue" });
    expect(run.feedbackNote).toBeNull();
    expect(run.stage).toBe("retry-worked");
    run = step(run, { type: "continue" });
    expect(run.stage).toBe("retry-new");
    expect(run.generation).toBe(1);
    for (let index = 0; index < RETRY_NEW_COUNT; index += 1) run = step(run, answer(true));
    expect(run.stage).toBe("mastery");
    expect(run.masteryAsked).toBe(0);
  });

  it("names what went wrong instead of a bare incorrect", () => {
    const note = explainMiss("6 × 7 = ?", "42", "13");
    expect(note.toLowerCase()).not.toBe("incorrect");
    expect(note.toLowerCase()).toContain("added");
  });

  it("keeps the faded example on the worked numbers, then changes them", () => {
    const skill = skillById("g3-place");
    expect(skill).toBeDefined();
    if (!skill) return;
    const faded = lessonTask({ ...freshRun(skill.id), stage: "faded", stepIndex: 0 }, skill);
    expect(faded?.prompt).toBe(skill.examplePrompt);
    expect(faded?.answer).toBe(skill.exampleAnswer);
    expect(faded?.steps).toEqual(skill.exampleSteps.slice(0, -1));
    expect(faded?.hint).toBeTruthy();
    const later = lessonTask({ ...freshRun(skill.id), stage: "faded", stepIndex: 1 }, skill);
    expect(later?.prompt).not.toBe(skill.examplePrompt);
  });

  it("does not confirm a skill while its lesson is still open", () => {
    const held = {
      ...emptyCard("g3-add-sub"),
      attempted: 10,
      correct: 10,
      fsrs: writeLearn(null, { lessonHold: true }),
    };
    expect(isConfirmed(held)).toBe(false);
    expect(accuracyScheduler.chooseSkill({ grade: 3, cards: [held], sessionCount: 0, today }).id).toBe(
      "g3-add-sub",
    );
    expect(isConfirmed({ ...held, fsrs: writeLearn(held.fsrs, { lessonCheck: "passed" }) })).toBe(true);
  });

  it("schedules day, week, and month reviews and interleaves a due one", () => {
    expect(reviewPlanDates(today)).toEqual([
      addDays(today, 1),
      addDays(today, 7),
      addDays(today, 30),
    ]);
    const place = {
      ...emptyCard("g3-place"),
      attempted: 8,
      correct: 7,
      fsrs: writeLearn(null, {
        lessonCheck: "passed",
        reviewDueAt: today,
        reviewPlan: reviewPlanDates(addDays(today, -1)),
      }),
    };
    expect(
      accuracyScheduler.chooseSkill({ grade: 3, cards: [place], sessionCount: 3, today }).id,
    ).toBe("g3-place");
    expect(accuracyScheduler.chooseSkill({ grade: 3, cards: [place], sessionCount: 4, today }).id).toBe(
      "g3-add-sub",
    );

    const cleared = applyLearning({ card: place, correct: true, kind: "review", today }).card;
    const learn = readLearn(cleared.fsrs);
    expect(learn.reviewDueAt).toBe(addDays(today, 6));
    expect(learn.needsReview).toBeUndefined();
    expect(gapsToClose(learn.reviewPlan, today, [{ gap: "day", dueOn: today }])).toEqual(["day"]);

    const missed = applyLearning({ card: place, correct: false, kind: "review", today }).card;
    expect(readLearn(missed.fsrs).needsReview).toBe(true);
    expect(readLearn(missed.fsrs).reviewPlan).toEqual(readLearn(place.fsrs).reviewPlan);
  });

  it("ends on a calm sentence with no points or a win", () => {
    const skill = skillById("g3-time");
    const lesson = lessonById("g3-time");
    expect(skill && lesson).toBeTruthy();
    if (!skill || !lesson) return;
    const screen = buildLessonScreen(
      { ...freshRun(skill.id), stage: "complete" },
      skill,
      lesson,
      { nextReview: addDays(today, 1) },
    );
    expect(screen.kind).toBe("complete");
    if (screen.kind !== "complete") return;
    const text = `${screen.sentence} ${screen.title}`.toLowerCase();
    expect(text).not.toMatch(/point|streak|badge|you win|confetti/);
  });
});

describe("parent week", () => {
  it("lists what was learned, what needs help, reviews, and two problems to ask about", () => {
    const progress = buildParentProgress({
      today,
      lessons: [
        {
          skillId: "g3-place",
          title: "Place value to 1,000",
          sentence: "Where a digit sits tells what it is worth.",
          stage: "complete",
          completedOn: "2026-10-16",
          lastMistake: null,
        },
        {
          skillId: "g3-mult",
          title: "Multiplication facts to 10×10",
          sentence: "Equal groups tell a multiplication.",
          stage: "practice",
          completedOn: null,
          lastMistake: "The numbers were added. This question uses a different operation.",
        },
      ],
      reviews: [
        { skillId: "g3-place", title: "Place value to 1,000", gap: "day", dueOn: "2026-10-19", done: false },
        { skillId: "g3-place", title: "Place value to 1,000", gap: "day", dueOn: "2026-10-12", done: true },
      ],
      attempts: [{ skillId: "g3-mult", title: "Multiplication facts to 10×10", correct: false, date: today }],
      solved: { title: "Place value", prompt: "In 482, what is the value of the hundreds digit?", answer: "400" },
      repaired: { title: "Multiplication", prompt: "6 × 7 = ?", answer: "42" },
    });
    expect(progress.learned.map((item) => item.skillId)).toEqual(["g3-place"]);
    expect(progress.needsHelp[0]?.strand).toBe("Multiplication facts to 10×10");
    expect(progress.needsHelp[0]?.nextStep).toContain("worked example");
    expect(progress.upcoming).toHaveLength(1);
    expect(progress.upcoming[0]?.when).toContain("About a day later");
    expect(progress.ask.solved?.answer).toBe("400");
    expect(progress.ask.repaired?.prompt).toBe("6 × 7 = ?");

    const digest = buildSundayDigest("Sam", progress);
    const text = renderSundayDigestText(digest);
    expect(digest.subject).toBe("Sam's math week");
    expect(text).toContain("What they learned");
    expect(text).toContain("Ask them about");
    expect(text).toContain("Coming up next");
    expect(text).toContain("/settings");
    expect(text.toLowerCase()).not.toMatch(/streak|badge|you win|confetti/);
  });
});
