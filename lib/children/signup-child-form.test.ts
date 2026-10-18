import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SignupChildForm } from "@/components/signup-child-form";

describe("signup step 2", () => {
  it("asks for a first name and a grade", () => {
    const html = renderToStaticMarkup(createElement(SignupChildForm));
    expect(html).toContain("Step 2 of 2");
    expect(html).toContain("Add your child");
    expect(html).toContain("Child&#x27;s first name");
    expect(html).toContain('autoComplete="off"');
    expect(html).toContain('autoCapitalize="words"');
    expect(html).toContain('maxLength="30"');
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain("grade-pick-check");
    expect(html).toContain("✓");
    expect(html).toContain("pill-row grade-picks");
    expect(html).toContain("You can change the grade any time.");
    expect(html).toContain('aria-checked="true"');
    for (const grade of [1, 2, 3, 4, 5, 6, 7, 8]) {
      expect(html).toContain(`aria-label="Grade ${grade}"`);
    }
    expect(html).not.toContain("Username");
    expect(html).not.toContain("PIN");
    expect(html).not.toContain('name="username"');
    expect(html).not.toContain('name="pin"');
  });
});
