import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CurriculumSwitch } from "@/components/curriculum-switch";
import { PROVINCES } from "@/lib/curriculum/provinces";

describe("province selector", () => {
  it("shows Ontario as the current province, lists checked provinces, and hides Quebec", () => {
    const html = renderToStaticMarkup(
      createElement(CurriculumSwitch, {
        province: "ontario",
        provinceCode: "ON",
        grade: 3,
        view: "strands",
        showSequenceToggle: false,
      }),
    );
    expect(html).toContain("Ontario");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("British Columbia");
    expect(html).toContain("Coming soon");
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain("Quebec");
    expect(html).not.toContain("More provinces coming soon.");
    expect(PROVINCES.some((province) => province.slug === "quebec")).toBe(false);
    expect(PROVINCES.some((province) => province.slug === "ontario" && province.ready)).toBe(true);
  });
});
