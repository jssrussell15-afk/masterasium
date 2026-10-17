import { describe, expect, it } from "vitest";
import {
  readSignupHandoff,
  readSignupPractice,
  signupHandoffCookie,
  signupPracticePath,
  signupReadyPath,
} from "@/lib/children/signup-practice";
import { accuracyScheduler } from "@/lib/practice/scheduler";
import { skillsForGrade, warmUpSkill } from "@/lib/practice/skills";

const CHILD_ID = "4f3a0c2e-6b1d-4a8e-9c70-1d2e3f4a5b6c";
const TOKEN = "ab".repeat(32);

describe("signup practice handoff", () => {
  it("reads the child id and practice token", () => {
    expect(readSignupPractice({ child_id: CHILD_ID, token: TOKEN })).toEqual({
      childId: CHILD_ID,
      token: TOKEN,
    });
    expect(readSignupPractice([{ child_id: CHILD_ID, token: TOKEN }])?.childId).toBe(CHILD_ID);
    expect(readSignupPractice(JSON.stringify({ child_id: CHILD_ID, token: TOKEN }))?.token).toBe(TOKEN);
    expect(signupPracticePath(CHILD_ID)).toBe(`/practice/${CHILD_ID}`);
    expect(signupReadyPath(CHILD_ID)).toBe(`/signup/child/ready/${CHILD_ID}`);
    expect(readSignupHandoff(signupHandoffCookie({ childId: CHILD_ID, token: TOKEN }))).toEqual({
      childId: CHILD_ID,
      token: TOKEN,
    });
    expect(readSignupHandoff("")).toBeNull();
    expect(readSignupHandoff(`${CHILD_ID}.short`)).toBeNull();
  });

  it("rejects a save that did not open practice", () => {
    expect(readSignupPractice(CHILD_ID)).toBeNull();
    expect(readSignupPractice({ child_id: CHILD_ID })).toBeNull();
    expect(readSignupPractice({ child_id: "nope", token: TOKEN })).toBeNull();
    expect(readSignupPractice(null)).toBeNull();
  });

  it("starts Grade 3 Ontario on addition and subtraction within 1,000", () => {
    const skill = warmUpSkill(3);
    expect(skill.title).toBe("Addition and subtraction within 1,000");
    expect(skill.id).toBe("g3-add-sub");
    expect(skill.id).not.toBe("g3-fractions");
    expect(accuracyScheduler.chooseSkill({ grade: 3, cards: [], sessionCount: 0 }).id).toBe(skill.id);
    for (const grade of [1, 2, 3, 4, 5, 6, 7, 8] as const) {
      expect(warmUpSkill(grade).id).toBe(skillsForGrade(grade)[0]?.id);
    }
  });
});
