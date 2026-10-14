import { describe, expect, it } from "vitest";
import { isValidPin, isValidUsername, normalizeUsername } from "@/lib/validation";

describe("student login fields", () => {
  it("stores usernames in lowercase letters and numbers", () => {
    expect(normalizeUsername("  Alex12 ")).toBe("alex12");
    expect(isValidUsername("alex12")).toBe(true);
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("has space")).toBe(false);
    expect(isValidUsername("user_name")).toBe(false);
    expect(isValidUsername("a".repeat(21))).toBe(false);
  });

  it("accepts a PIN of 4 to 6 digits", () => {
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("123456")).toBe(true);
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("1234567")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
  });
});
