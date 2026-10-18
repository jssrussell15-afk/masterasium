import Link from "next/link";
import type { SundayDigest } from "@/lib/digest/sunday";

export function SundayNote({ digest }: { digest: SundayDigest }) {
  return (
    <article className="digest-sheet" aria-label="Sunday note preview">
      <p className="eyebrow">Sunday note</p>
      <h1 className="display text-3xl">{digest.subject}</h1>
      <p className="hint">Preview only. This note is not emailed.</p>
      <section>
        <h2>What they learned</h2>
        <ul className="strand-list mt-2">
          {digest.learned.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Ask them about</h2>
        <ul className="strand-list mt-2">
          {digest.ask.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Coming up next</h2>
        <ul className="strand-list mt-2">
          {digest.comingUp.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <p>
        <Link className="nav-link lesson-tap" href={digest.settingsHref}>
          Change what this note includes
        </Link>
      </p>
    </article>
  );
}
