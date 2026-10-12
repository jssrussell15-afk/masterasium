import { describe, expect, it } from "vitest";
import {
  accuracyScheduler,
  isMastered,
  recordAttempt,
  emptyCard,
  type SkillCard,
} from "@/lib/practice/scheduler";
import { skillsForGrade } from "@/lib/practice/skills";

function mastered(skillId: string): SkillCard {
  return { skillId, attempted: 5, correct: 4, streak: 4, fsrs: null };
}

describe("AccuracyScheduler", () => {
  it("starts a new Grade 1 learner on the first skill", () => {
    const skill = accuracyScheduler.chooseSkill({ grade: 1, cards: [], sessionCount: 0 });
    expect(skill.id).toBe("g1-count-on");
  });

  it("moves to the next skill only after the current one is mastered", () => {
    const skill = accuracyScheduler.chooseSkill({
      grade: 1,
      cards: [mastered("g1-count-on")],
      sessionCount: 0,
    });
    expect(skill.id).toBe("g1-compare");
    expect(isMastered(mastered("g1-count-on"))).toBe(true);
    expect(isMastered({ ...mastered("g1-count-on"), correct: 3 })).toBe(false);
  });

  it("does not skip a prerequisite", () => {
    const skill = accuracyScheduler.chooseSkill({
      grade: 5,
      cards: [mastered("g5-place-value")],
      sessionCount: 0,
    });
    expect(skill.id).toBe("g5-mult-facts");
  });

  it("reviews a mastered skill on every fourth question", () => {
    const skill = accuracyScheduler.chooseSkill({
      grade: 1,
      cards: [mastered("g1-count-on")],
      sessionCount: 4,
    });
    expect(skill.id).toBe("g1-count-on");
  });

  it("reviews the weakest mastered skill once the path is finished", () => {
    const cards = skillsForGrade(1).map((skill, index) => ({
      skillId: skill.id,
      attempted: 5,
      correct: index === 2 ? 4 : 5,
      streak: 4,
      fsrs: { stability: 1 },
    }));
    const skill = accuracyScheduler.chooseSkill({ grade: 1, cards, sessionCount: 0 });
    expect(skill.id).toBe("g1-make-ten");
  });

  it("keeps fsrs data when an attempt is recorded", () => {
    const next = recordAttempt({ ...emptyCard("g1-count-on"), fsrs: { due: "later" } }, true);
    expect(next.attempted).toBe(1);
    expect(next.correct).toBe(1);
    expect(next.streak).toBe(1);
    expect(next.fsrs).toEqual({ due: "later" });

    const missed = recordAttempt(next, false);
    expect(missed.streak).toBe(0);
    expect(missed.correct).toBe(1);
  });
});
