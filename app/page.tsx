import Link from "next/link";
import type { Metadata } from "next";
import { sessionChrome } from "@/components/header-auth";
import { LessonPreview } from "@/components/lesson-preview";
import { Shell } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Masterasium",
  description:
    "Calm, self-paced math that follows your province's curriculum. Watch, try with help, then practise until it sticks. Practice is free while we test.",
};

export default async function HomePage() {
  const chrome = await sessionChrome("btn btn-secondary");
  return (
    <Shell {...chrome}>
      <section className="hero">
        <div>
          <h1 className="display hero-title">
            Calm, self-paced math that follows your province&apos;s curriculum.
          </h1>
          <p className="lede mt-5">
            Watch a short lesson, try a question with help, then practise until it sticks.
          </p>
          <p className="trust-line">
            Practice is free while we test. Ontario lessons are open. Quebec is not included.
          </p>
          <div className="cta-row">
            <Link href="/signup" className="btn btn-primary">
              Try a free lesson
            </Link>
            <Link href="/login" className="btn btn-quiet">
              Sign in
            </Link>
          </div>
        </div>
        <LessonPreview />
      </section>

      <section className="section-block" aria-labelledby="how-heading">
        <h2 id="how-heading" className="display">
          How it works
        </h2>
        <ol className="step-list mt-4">
          <li>
            <span>
              <strong>Watch.</strong> A short lesson introduces the skill.
            </span>
          </li>
          <li>
            <span>
              <strong>Try with help.</strong> The first questions show a starting step.
            </span>
          </li>
          <li>
            <span>
              <strong>Practise until it sticks.</strong> Keep going until the skill is steady, then
              it comes back later.
            </span>
          </li>
        </ol>
      </section>

      <section className="section-block" aria-labelledby="parents-heading">
        <h2 id="parents-heading" className="display">
          For parents
        </h2>
        <article className="card weekly-note mt-4">
          <p className="eyebrow">This week</p>
          <h3 className="display">Ask your child about…</h3>
          <p className="mt-2">counting equal groups.</p>
          <p className="hint mt-2">
            Multiplication facts to 10×10. A short note like this arrives once a week.
          </p>
        </article>
      </section>
    </Shell>
  );
}
