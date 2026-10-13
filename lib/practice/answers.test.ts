import { describe, expect, it } from "vitest";
import { answersMatch } from "@/lib/practice/answers";

describe("answersMatch", () => {
  it("accepts commas, spaces, and equivalent numbers", () => {
    expect(answersMatch("70000", "70,000")).toBe(true);
    expect(answersMatch("70 000", "70000")).toBe(true);
    expect(answersMatch("1.50", "1.5")).toBe(true);
    expect(answersMatch("3/8", "3 / 8")).toBe(true);
    expect(answersMatch("-4", "−4")).toBe(true);
    expect(answersMatch("20", "$20")).toBe(true);
    expect(answersMatch("3 R 2", "3r2")).toBe(true);
  });

  it("rejects a blank answer and a different fraction", () => {
    expect(answersMatch("4", "")).toBe(false);
    expect(answersMatch("4", "   ")).toBe(false);
    expect(answersMatch("3/8", "5/8")).toBe(false);
    expect(answersMatch("9", "10")).toBe(false);
  });
});
