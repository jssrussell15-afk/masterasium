import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SignupReady } from "@/components/signup-ready";

describe("signup confirmation", () => {
  it("names the child and grade and offers quiet choices", () => {
    const html = renderToStaticMarkup(
      createElement(SignupReady, {
        firstName: "Sam",
        grade: 3,
        childId: "4f3a0c2e-6b1d-4a8e-9c70-1d2e3f4a5b6c",
      }),
    );
    expect(html).toContain("Sam is set up for Grade 3");
    expect(html).toContain("signup-ready");
    expect(html).toContain("btn btn-primary");
    expect(html).toContain("Start practice on this device");
    expect(html).toContain("Use this tablet for Sam");
    expect(html).toContain("btn btn-secondary");
    expect(html).toContain("Go to parent desk");
    expect(html).not.toContain("confetti");
    expect(html).not.toContain("streak");
    expect(html).not.toContain("points");
    expect(html).not.toContain("Username");
    expect(html).not.toContain("PIN");
  });

  it("says when this tablet already remembers the child", () => {
    const html = renderToStaticMarkup(
      createElement(SignupReady, {
        firstName: "Sam",
        grade: 3,
        childId: "4f3a0c2e-6b1d-4a8e-9c70-1d2e3f4a5b6c",
        remembered: true,
      }),
    );
    expect(html).toContain("This tablet remembers Sam.");
    expect(html).not.toContain("Use this tablet for Sam");
  });
});
