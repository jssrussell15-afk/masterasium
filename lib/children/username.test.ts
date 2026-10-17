import { describe, expect, it } from "vitest";
import { nameLetters, storedUsername } from "@/lib/children/username";

describe("username from a first name", () => {
  it("keeps letters and digits and drops spaces and marks", () => {
    expect(nameLetters("  Mary Jane ")).toBe("maryjane");
    expect(nameLetters("José")).toBe("jose");
    expect(nameLetters("O'Brien")).toBe("obrien");
  });

  it("builds a stored username and numbers the later tries", () => {
    expect(storedUsername("Sam", 1)).toBe("sam");
    expect(storedUsername("Sam", 2)).toBe("sam2");
    expect(storedUsername("Li", 1)).toBe("li1");
    expect(storedUsername("Li", 2)).toBe("li2");
    expect(storedUsername("---", 1)).toBeNull();
  });
});
