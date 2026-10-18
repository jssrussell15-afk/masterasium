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
  return { skillId, attempted: 10, correct: 8, consecutiveCorrect: 4, fsrs: null };
}

describe("AccuracyScheduler", () => {
  it("starts a new Grade 1 learner on the first skill", () => {
    const skill = accuracyScheduler.chooseSkill({ grade: 1, cards: [], sessionCount: 0 });
    expect(skill.id).toBe("g1-count");
  });

  it("moves to the next skill only after 10 questions at 80%", () => {
    const skill = accuracyScheduler.chooseSkill({
      grade: 1,
      cards: [mastered("g1-count")],
      sessionCount: 0,
    });
    expect(skill.id).toBe("g1-add-10");
    expect(isMastered(mastered("g1-count"))).toBe(true);
    expect(isMastered({ ...mastered("g1-count"), correct: 7 })).toBe(false);
    expect(isMastered({ ...mastered("g1-count"), attempted: 9, correct: 9 })).toBe(false);
  });

  it("does not skip a prerequisite", () => {
    const skill = accuracyScheduler.chooseSkill({
      grade: 5,
      cards: [mastered("g5-div-rem")],
      sessionCount: 0,
    });
    expect(skill.id).toBe("g5-mult");
  });

  it("reviews a mastered skill on the 3rd and 7th counts of every 8", () => {
    const cards = [mastered("g1-count")];
    expect(accuracyScheduler.chooseSkill({ grade: 1, cards, sessionCount: 3 }).id).toBe("g1-count");
    expect(accuracyScheduler.chooseSkill({ grade: 1, cards, sessionCount: 4 }).id).toBe("g1-add-10");
    expect(accuracyScheduler.chooseSkill({ grade: 1, cards, sessionCount: 7 }).id).toBe("g1-count");
    expect(accuracyScheduler.chooseSkill({ grade: 1, cards, sessionCount: 8 }).id).toBe("g1-add-10");
  });

  it("keeps the focus skill when nothing is mastered yet", () => {
    const skill = accuracyScheduler.chooseSkill({ grade: 1, cards: [], sessionCount: 3 });
    expect(skill.id).toBe("g1-count");
  });

  it("reviews the weakest mastered skill once the path is finished", () => {
    const cards = skillsForGrade(1).map((skill, index) => ({
      skillId: skill.id,
      attempted: 10,
      correct: index === 2 ? 8 : 10,
      consecutiveCorrect: 4,
      fsrs: { stability: 1 },
    }));
    const skill = accuracyScheduler.chooseSkill({ grade: 1, cards, sessionCount: 0 });
    expect(skill.id).toBe("g1-sub-10");
  });

  it("keeps fsrs data when an attempt is recorded", () => {
    const next = recordAttempt({ ...emptyCard("g1-count"), fsrs: { due: "later" } }, true);
    expect(next.attempted).toBe(1);
    expect(next.correct).toBe(1);
    expect(next.consecutiveCorrect).toBe(1);
    expect(next.fsrs).toEqual({ due: "later" });

    const missed = recordAttempt(next, false);
    expect(missed.consecutiveCorrect).toBe(0);
    expect(missed.correct).toBe(1);
  });
});
