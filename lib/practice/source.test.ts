import { describe, expect, it } from "vitest";
import { skillById } from "@/lib/practice/skills";
import { getItemSource } from "@/lib/practice/source";

describe("item sources", () => {
  it("generates a question for the starter mode", () => {
    const skill = skillById("g1-make-ten");
    expect(skill).toBeDefined();
    const question = getItemSource("generated").next(skill!, () => 0);
    expect(question.skillId).toBe("g1-make-ten");
    expect(question.answer).toBe("10");
  });

  it("keeps upload mode as an explicit seam", () => {
    const skill = skillById("g5-mult-facts");
    expect(() => getItemSource("uploaded").next(skill!)).toThrow(/not available yet/);
  });
});
