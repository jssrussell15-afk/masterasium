import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CurriculumSwitch } from "@/components/curriculum-switch";
import { PROVINCES } from "@/lib/curriculum/provinces";

describe("province selector", () => {
  it("shows Ontario as available and does not list Quebec or greyed provinces", () => {
    const html = renderToStaticMarkup(
      createElement(CurriculumSwitch, { province: "ontario", grade: 3 }),
    );
    expect(html).toContain("Ontario");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("More provinces coming soon.");
    expect(html).not.toContain("Quebec");
    expect(html).not.toContain("aria-disabled");
    expect(html).not.toContain(">BC<");
    expect(html).not.toContain("British Columbia");
    expect(PROVINCES.some((province) => province.slug === "quebec")).toBe(false);
  });
});
