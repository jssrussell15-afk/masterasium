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
    expect(html).toContain(">Show<");
    expect(html).toContain('class="password-toggle"');
    expect(html).not.toContain('name="confirm"');
    expect(html).not.toContain("Confirm password");
  });

  it("leaves the parent sign-in form without the signup hint", () => {
    const html = renderToStaticMarkup(createElement(AuthForm, { mode: "sign-in" }));
    expect(html).toContain('autoComplete="current-password"');
    expect(html).not.toContain("At least 8 characters");
    expect(html).not.toContain("password-toggle");
    expect(html).not.toContain('name="confirm"');
  });
});
