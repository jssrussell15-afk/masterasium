import { describe, expect, it } from "vitest";
import { classifyMistake } from "@/lib/practice/mistakes";
import { exampleForMistake, shouldTeach } from "@/lib/worksheets/teach";

describe("teachable moments", () => {
  it("teaches a known pattern on the first miss", () => {
    expect(shouldTeach("off-by-one", 1)).toBe(true);
    expect(shouldTeach("remainder", 1)).toBe(true);
  });

  it("waits for a second similar format or calculation miss", () => {
    expect(shouldTeach("format", 1)).toBe(false);
    expect(shouldTeach("calculation", 1)).toBe(false);
    expect(shouldTeach("format", 2)).toBe(true);
    expect(shouldTeach("calculation", 2)).toBe(true);
  });

  it("pairs a wrong answer with that question's steps and a short example", () => {
    const mistake = classifyMistake("4 + 3 = ?", "7", "6");
    expect(mistake.type).toBe("off-by-one");
    expect(shouldTeach(mistake.type, 1)).toBe(true);
    const example = exampleForMistake(mistake.type, null);
    expect(example?.prompt).toBe("6 + 2 = ?");
    expect(example?.answer).toBe("8");
    expect(example?.steps.length).toBeGreaterThan(0);
    expect(mistake.note.length).toBeGreaterThan(0);
  });
});
