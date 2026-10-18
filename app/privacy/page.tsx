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
        <p>This is a plain-language note about the data we keep while families try Masterasium.</p>

        <h2 className="display">No ads, and we do not sell data</h2>
        <p>There are no ads. We do not sell personal information, and we do not share it for advertising.</p>

        <h2 className="display">What we keep</h2>
        <p>We keep as little as we can:</p>
        <ul>
          <li>A parent&apos;s email and password, so they can sign in.</li>
          <li>A child&apos;s first name, grade, and the answers they practise.</li>
        </ul>
        <p>
          A child&apos;s information is added only from a parent account. That is how we get a
          parent&apos;s consent before any child&apos;s data is stored.
        </p>

        <h2 className="display">Homework photos</h2>
        <p>
          If a parent uploads a photo of homework, we use that photo once to build a practice page.
          Then we delete it. We do not keep a library of homework photos.
        </p>

        <h2 className="display">Who handles the data</h2>
        <p>These companies process data for us. They are not allowed to use it for their own ads.</p>
        <ul>
          <li>Supabase stores the account and practice answers.</li>
          <li>Cloudflare serves the website.</li>
          <li>Stripe is the payment processor, if a payment is added later.</li>
        </ul>

        <h2 className="display">Asking us to delete something</h2>
        <p>
          A parent can ask us to delete their account or a child&apos;s information. Email{" "}
          <a href="mailto:hello@masterasium.example?subject=Deletion%20request">
            hello@masterasium.example
          </a>{" "}
          and we will take it down. That address is a placeholder until the mailbox is open. You can
          also use the <Link href="/contact">contact page</Link>.
        </p>
      </article>
    </Shell>
  );
}
