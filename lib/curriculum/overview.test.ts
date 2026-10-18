import { describe, expect, it } from "vitest";
import { PROVINCES } from "@/lib/curriculum/provinces";
import { isGradePublished, loadGradePage } from "@/lib/curriculum/view";

describe("curriculum pages", () => {
  it("hides Quebec and publishes the checked provinces", () => {
    expect(PROVINCES.some((province) => province.slug === "quebec")).toBe(false);
    expect(PROVINCES.find((province) => province.slug === "ontario")?.ready).toBe(true);
    expect(PROVINCES.find((province) => province.slug === "nunavut")?.ready).toBe(false);
  });

  it("rejects unpublished routes", () => {
    expect(loadGradePage("quebec", 3, null)).toBeNull();
    expect(loadGradePage("nunavut", 1, null)).toBeNull();
    expect(loadGradePage("ontario", 3, null)?.grade).toBe(3);
  });

  it("switches Alberta grade 7 off on 2027-09-01", () => {
    expect(isGradePublished("AB", 7, "2027-08-31")).toBe(true);
    expect(isGradePublished("AB", 7, "2027-09-01")).toBe(false);
  });
});
