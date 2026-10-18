import { describe, expect, it } from "vitest";
import {
  childFirstNameError,
  childNameFieldMessage,
  isValidPin,
  isValidUsername,
  normalizeUsername,
} from "@/lib/validation";

describe("student login fields", () => {
  it("stores usernames in lowercase letters and numbers", () => {
    expect(normalizeUsername("  Alex12 ")).toBe("alex12");
    expect(isValidUsername("alex12")).toBe(true);
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("has space")).toBe(false);
    expect(isValidUsername("user_name")).toBe(false);
    expect(isValidUsername("a".repeat(21))).toBe(false);
  });

  it("limits a child first name to 30 characters", () => {
    expect(childFirstNameError("Sam")).toBeNull();
    expect(childFirstNameError("A".repeat(30))).toBeNull();
    expect(childFirstNameError("A".repeat(31))).toBe("Use a first name, up to 30 letters.");
    expect(childFirstNameError("A".repeat(40))).toBe("Use a first name, up to 30 letters.");
    expect(childFirstNameError("")).toBe("Use a first name, up to 30 letters.");
    expect(childNameFieldMessage("Use a first name, up to 30 letters.")).toBe(
      "Use a first name, up to 30 letters.",
    );
    expect(childNameFieldMessage("Choose a grade from 1 to 8.")).toBeUndefined();
  });

  it("accepts a PIN of 4 to 6 digits", () => {
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("123456")).toBe(true);
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("1234567")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
  });
});
