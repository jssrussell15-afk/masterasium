import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NotFound from "@/app/not-found";
import { headerAction } from "@/components/header-auth";
import { SiteHeader } from "@/components/site-header";

describe("header auth", () => {
  it("keeps a home link on the student header", () => {
    const html = renderToStaticMarkup(
      createElement(SiteHeader, { role: "student", homeHref: "/", action: null }),
    );
    expect(html).toContain('class="wordmark"');
    expect(html).toContain('href="/"');
    expect(html).toContain(">Home<");
    expect(html).toContain("Masterasium");
  });

  it("shows Sign out for a signed-in parent and Sign in when signed out", () => {
    const signedIn = renderToStaticMarkup(headerAction({ role: "parent", signedIn: true }));
    expect(signedIn).toContain(">Sign out<");
    expect(signedIn).not.toContain(">Sign in<");

    const signedOut = renderToStaticMarkup(headerAction({ role: "public", signedIn: false }));
    expect(signedOut).toContain(">Sign in<");
    expect(signedOut).not.toContain(">Sign out<");
  });

  it("shows Sign in on a 404 when nobody is signed in", async () => {
    const html = renderToStaticMarkup(await NotFound());
    expect(html).toContain(">Sign in<");
    expect(html).toContain('class="wordmark"');
    expect(html).toContain("That page isn&#x27;t here");
  });
});
