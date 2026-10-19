import type { Metadata } from "next";
import Link from "next/link";
import { sessionChrome } from "@/components/header-auth";
import { Shell } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Privacy · Masterasium",
  description: "What Masterasium keeps, and what it does not. Draft for a lawyer to review.",
};

export default async function PrivacyPage() {
  const chrome = await sessionChrome();
  return (
    <Shell narrow {...chrome}>
      <article className="prose-page">
        <p className="draft-note" role="note">
          Draft: to be reviewed by a lawyer
        </p>
        <h1 className="display">Privacy</h1>
        <p className="lede">
          Last updated: October 18, 2026. Plain-language note about the data we keep
          while families try Masterasium.
        </p>

        <h2 className="display">No ads, and we do not sell data</h2>
        <p>
          There are no ads. We do not sell personal information, and we do not share
          it for advertising.
        </p>

        <h2 className="display">What we keep</h2>
        <p>We keep as little as we can, in four buckets:</p>
        <ul>
          <li>
            <strong>Account data</strong> — a parent's email and password, plus each
            child's first name, grade, and province. Kept while the account is active,
            deleted thirty days after closure.
          </li>
          <li>
            <strong>Session and answer data</strong> — the practice records used for
            adaptive learning. Kept twenty-four months rolling, then anonymized or
            purged.
          </li>
          <li>
            <strong>AI Create drafts</strong> — stored only on the child's device.
            Nothing is uploaded to our servers.
          </li>
          <li>
            <strong>Parent dashboard metadata</strong> — one summary line per session.
            Same twenty-four-month window.
          </li>
        </ul>

        <h2 className="display">Homework photos</h2>
        <p>
          If a parent uploads a photo of homework, we use that photo once to build a
          practice page. Then we delete it. We do not keep a library of homework
          photos.
        </p>

        <h2 className="display">How we use it</h2>
        <p>
          To run the learning loop: generate questions, track mastery, send the weekly
          parent note, and improve content. We do not sell personal information. We do
          not use child data for advertising.
        </p>

        <h2 className="display">Who handles the data</h2>
        <p>
          These companies process data for us. They are not allowed to use it for their
          own ads.
        </p>
        <ul>
          <li>Supabase stores the account and practice answers.</li>
          <li>Cloudflare serves the website.</li>
          <li>Stripe is the payment processor, if a payment is added later.</li>
          <li>
            The AI provider generates question and lesson content from prompts — it does
            not receive child identities.
          </li>
        </ul>

        <h2 className="display">Cross-border processing</h2>
        <p>
          Our infrastructure providers may process data in the United States. By creating
          an account you consent to that processing, disclosed here.
        </p>

        <h2 className="display">Children under thirteen</h2>
        <p>
          Accounts are created and managed by a parent. Consent for a child comes from
          the parent, never the child. AI features for children under thirteen require
          the parent opt-in toggle in settings.
        </p>

        <h2 className="display">Your rights</h2>
        <p>
          You may request access to or deletion of your account or a child's information
          at any time. Email{" "}
          <a href="mailto:hello@masterasium.example?subject=Deletion%20request">
            hello@masterasium.example
          </a>{" "}
          — that address is a placeholder until the mailbox is open — or use the{" "}
          <Link href="/contact">contact page</Link>. Every deletion request is logged with a
          timestamp, and we respond within thirty days.
        </p>

        <p>
          <Link href="/">Back to home</Link>
        </p>
      </article>
    </Shell>
  );
}
