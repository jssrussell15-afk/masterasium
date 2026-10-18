import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";
import SignUpPage from "@/app/signup/page";
import { DashboardMock } from "@/components/dashboard-mock";

describe("public copy", () => {
  it("says practice is free while we test and does not publish a price or trial", async () => {
    const home = renderToStaticMarkup(await HomePage());
    const signup = renderToStaticMarkup(createElement(SignUpPage));
    for (const html of [home, signup]) {
      expect(html).toContain("Practice is free while we test.");
      expect(html).toContain("Student sign in");
      expect(html.toLowerCase()).not.toContain("free trial");
      expect(html).not.toContain("per month");
      expect(html).not.toContain("per year");
      expect(html).not.toContain("$12");
      expect(html).not.toContain("$96");
      expect(html.toLowerCase()).not.toContain("does not ask for a card");
    }
    expect(home).not.toContain("12-day streak");
    expect(home).not.toContain("streak");
    expect(home).toContain("Try a free lesson");
    expect(home).toContain("6 × 7 = ?");
  });

  it("keeps rewards off the parent desk preview", () => {
    const mock = renderToStaticMarkup(createElement(DashboardMock));
    expect(mock).toContain("Learned this week: decimals to hundredths");
    expect(mock.toLowerCase()).not.toContain("streak");
    expect(mock).not.toContain("in a row");
  });
});