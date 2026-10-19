import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ContactPage from "@/app/contact/page";
import ForParentsPage from "@/app/for-parents/page";
import HomePage from "@/app/page";
import NotFound from "@/app/not-found";
import PrivacyPage from "@/app/privacy/page";

describe("public pages", () => {
  it("leads with a free lesson and a real Grade 3 question", async () => {
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain("Calm, self-paced math");
    expect(html).toContain("Try a free lesson");
    expect(html).toContain("Sign in");
    expect(html).toContain("Practice is free while we test");
    expect(html).toContain("Quebec is not included");
    expect(html).toContain("6 × 7 = ?");
    expect(html).toContain("Count by sevens.");
    expect(html).toContain("Ask your child about…");
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/for-parents"');
    expect(html).toContain('href="/contact"');
    expect(html.toLowerCase()).not.toContain("streak");
    expect(html).not.toContain("Pricing");
    expect(html).not.toContain("$");
    expect(html.toLowerCase()).not.toContain("badge");
    expect(html).not.toContain("banner.png");
  });

  it("marks the privacy note as a draft and names the processors", async () => {
    const html = renderToStaticMarkup(await PrivacyPage());
    expect(html).toContain("Draft: to be reviewed by a lawyer");
    expect(html).toContain("no ads");
    expect(html).toContain("do not sell");
    expect(html).toContain("Supabase");
    expect(html).toContain("Cloudflare");
    expect(html).toContain("Stripe");
    expect(html).toContain("delete");
    expect(html).toContain("mailto:hello@masterasium.example");
    expect(html).not.toContain("$");
  });

  it("explains mastery without rewards", async () => {
    const html = renderToStaticMarkup(await ForParentsPage());
    expect(html).toContain("short video");
    expect(html).toContain("80%");
    expect(html).toContain("1 day");
    expect(html).toContain("1 week");
    expect(html).toContain("1 month");
    expect(html).toContain("streaks");
    expect(html).toContain("Why do we do a quick check?");
    expect(html).toContain("Why might my child start below their grade?");
    expect(html).toContain("How do I change the starting point?");
    expect(html).not.toContain("$");
  });

  it("offers a mailto and does not store a form", async () => {
    const html = renderToStaticMarkup(await ContactPage());
    expect(html).toContain("mailto:hello@masterasium.example");
    expect(html).toContain("placeholder");
    expect(html).not.toContain("<form");
  });

  it("shows a calm missing page without a technical code", async () => {
    const html = renderToStaticMarkup(await NotFound());
    expect(html).toContain("That page isn&#x27;t here");
    expect(html).toContain("Back home");
    expect(html).not.toContain("404");
    expect(html.toLowerCase()).not.toContain("exception");
    expect(html.toLowerCase()).not.toContain("stack");
  });
});
