import { describe, expect, it } from "vitest";
import { masteryLabel, masteryMark } from "@/lib/practice/mastery";

describe("mastery marks", () => {
  it("maps the three selector states", () => {
    expect(masteryMark("mastered")).toBe("mastered");
    expect(masteryMark("practicing")).toBe("in-progress");
    expect(masteryMark("check")).toBe("in-progress");
    expect(masteryMark("not-started")).toBe("not-started");
  });

  it("uses a short label for each mark", () => {
    expect(masteryLabel("mastered")).toBe("Mastered");
    expect(masteryLabel("in-progress")).toBe("In progress");
    expect(masteryLabel("not-started")).toBe("Not started");
  });
});
