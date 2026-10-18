import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthForm } from "@/components/auth-form";
import SignUpPage from "@/app/signup/page";

describe("signup step 1", () => {
  it("asks for one password and points to the next step", () => {
    const html = renderToStaticMarkup(createElement(SignUpPage));
    expect(html).toContain("Step 1 of 2");
    expect(html).toContain("Email and a password. Next, you&#x27;ll add your child.");
    expect(html).toContain("At least 8 characters");
    expect(html).toContain('id="signup-password-hint"');
    expect(html).toContain('aria-describedby="signup-password-hint"');
    expect(html).toContain('autoComplete="new-password"');
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('aria-label="Show password"');
    expect(html).toContain('class="password-toggle"');
    expect(html).toContain("<svg");
    expect(html).not.toContain(">Show<");
    expect(html).not.toContain(">Hide<");
    expect(html).not.toContain('name="confirm"');
    expect(html).not.toContain("Confirm password");
    expect(html.match(/name="password"/g)).toHaveLength(1);
  });

  it("leaves the parent sign-in form without the signup hint", () => {
    const html = renderToStaticMarkup(createElement(AuthForm, { mode: "sign-in" }));
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain('aria-label="Show password"');
    expect(html).toContain('class="password-toggle"');
    expect(html).toContain("<svg");
    expect(html).not.toContain("At least 8 characters");
    expect(html).not.toContain('autoComplete="new-password"');
    expect(html).not.toContain('name="confirm"');
    expect(html).not.toContain("Confirm password");
    expect(html.match(/name="password"/g)).toHaveLength(1);
  });
});
