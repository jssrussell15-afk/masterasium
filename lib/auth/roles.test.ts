import { describe, expect, it } from "vitest";
import { can, canAccessPath, homeFor, navFor, roleFromSession } from "@/lib/auth/roles";

describe("role permissions", () => {
  it("keeps each role in one list", () => {
    expect(can("student", "practice")).toBe(true);
    expect(can("student", "events.write")).toBe(true);
    expect(can("student", "desk")).toBe(false);
    expect(can("student", "worksheets")).toBe(false);
    expect(can("parent", "desk")).toBe(true);
    expect(can("parent", "settings")).toBe(true);
    expect(can("parent", "practice")).toBe(false);
    expect(can("teacher", "worksheets")).toBe(true);
    expect(can("teacher", "desk")).toBe(false);
    expect(can("tutor", "practice.observe")).toBe(true);
    expect(can("tutor", "practice")).toBe(false);
    expect(can(null, "practice")).toBe(false);
  });

  it("sends each signed-in role to its own home", () => {
    expect(roleFromSession({ hasStudent: true, hasParent: true })).toBe("student");
    expect(roleFromSession({ hasStudent: false, hasParent: true })).toBe("parent");
    expect(roleFromSession({ hasStudent: false, hasParent: false })).toBeNull();
    expect(canAccessPath("student", "/practice/child")).toBe(true);
    expect(canAccessPath("student", "/dashboard")).toBe(false);
    expect(canAccessPath("parent", "/practice")).toBe(false);
    expect(canAccessPath("parent", "/settings")).toBe(true);
    expect(canAccessPath(null, "/curriculum/ontario/grade-1")).toBe(true);
    expect(canAccessPath(null, "/practice")).toBe(false);
    expect(homeFor("student")).toBe("/practice");
    expect(homeFor("parent")).toBe("/dashboard");
    expect(navFor("student")).toEqual([]);
    expect(navFor("public").map((link) => link.label)).toEqual([
      "Curriculum",
      "Worksheets",
      "Parent desk",
    ]);
    expect(navFor("parent").map((link) => link.label)).toContain("Account settings");
    expect(navFor("teacher").map((link) => link.label)).not.toContain("Parent desk");
  });
});
