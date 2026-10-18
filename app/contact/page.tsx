import type { Metadata } from "next";
import Link from "next/link";
import { sessionChrome } from "@/components/header-auth";
import { Shell } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Contact · Masterasium",
  description: "Email Masterasium. This mailbox is a placeholder and does not store a form.",
};

export default async function ContactPage() {
  const chrome = await sessionChrome();
  return (
    <Shell narrow {...chrome}>
      <article className="prose-page">
        <h1 className="display">Contact</h1>
        <p>Send a note by email. We do not keep a form on this page, so nothing is stored here.</p>
        <p>
          <a className="btn btn-primary" href="mailto:hello@masterasium.example">
            Email hello@masterasium.example
          </a>
        </p>
        <p className="hint">This address is a placeholder until the mailbox is open.</p>
        <p>
          For a deletion request, use the same address with the subject &ldquo;Deletion request&rdquo;,
          or write from the <Link href="/privacy">privacy page</Link>.
        </p>
      </article>
    </Shell>
  );
}
