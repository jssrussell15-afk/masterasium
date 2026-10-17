import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SetPinForm } from "@/components/student-access-forms";
import { StudentLoginForm } from "@/components/student-login-form";

describe("Set PIN", () => {
  it("asks for a numeric PIN and does not ask for a username", () => {
    const html = renderToStaticMarkup(
      createElement(SetPinForm, {
        childId: "child-1",
        firstName: "Sam",
        hasLogin: false,
        returnTo: "dashboard",
      }),
    );
    expect(html).toContain(">Set PIN<");
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('name="pin"');
    expect(html).toContain('pattern="[0-9]{4,6}"');
    expect(html).not.toContain('name="username"');
    expect(html).toContain("signs in with their first name");
  });

  it("shows remembered names and a PIN pad instead of a username", () => {
    const html = renderToStaticMarkup(
      createElement(StudentLoginForm, {
        students: [
          { id: "4f3a0c2e-6b1d-4a8e-9c70-1d2e3f4a5b6c", firstName: "Sam" },
          { id: "8b1d4a2e-6b1d-4a8e-9c70-1d2e3f4a5b6d", firstName: "Alex" },
        ],
      }),
    );
    expect(html).toContain(">Sam<");
    expect(html).toContain(">Alex<");
    expect(html).toContain('class="pin-pad"');
    expect(html).toContain(">Delete<");
    expect(html).toContain("Choose another name");
    expect(html).toContain('name="firstName"');
    expect(html).not.toContain('name="username"');
    expect(html).not.toContain(">Username<");
    expect(html).not.toContain(">First name<");
    expect(html).not.toContain("streak");
    expect(html).not.toContain("points");
  });
});
