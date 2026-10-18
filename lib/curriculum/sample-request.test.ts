import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SampleRequest } from "@/components/sample-request";

describe("sample sheet request", () => {
  it("asks only for an email, and keeps product email optional", () => {
    const html = renderToStaticMarkup(
      createElement(SampleRequest, {
        province: "ontario",
        provinceName: "Ontario",
        grade: 3,
        skills: [],
      }),
    );
    expect(html).toContain("Enter your email to request the Grade 3 sample sheet.");
    expect(html).toContain('name="email"');
    expect(html).toContain('name="marketing"');
    expect(html).toContain("You can unsubscribe at any time.");
    expect(html).not.toContain('name="consent"');
    expect(html).not.toContain("agree to hear from us");
    expect(html).not.toContain("occasional notes");
    const marketing = html.slice(html.indexOf('name="marketing"'), html.indexOf('name="marketing"') + 180);
    expect(marketing).not.toContain("required");
    expect(marketing).not.toContain("checked");
  });
});
