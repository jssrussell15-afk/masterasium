import type { Metadata } from "next";
import Link from "next/link";
import { sessionChrome } from "@/components/header-auth";
import { Shell } from "@/components/site-header";

export const metadata: Metadata = {
  title: "For parents · Masterasium",
  description:
    "How Masterasium teaches a skill: a short lesson, guided examples, practice to about 80%, then quiet review.",
};

export default async function ForParentsPage() {
  const chrome = await sessionChrome();
  return (
    <Shell narrow {...chrome}>
      <article className="prose-page">
        <h1 className="display">How a skill is learned</h1>
        <p>
          Masterasium stays with one skill until it sticks. Practice is free while we test. Ontario
          lessons are open. Quebec is not included.
        </p>

        <h2 className="display">A short lesson first</h2>
        <p>
          Each new skill starts with a short video. Your child watches it, then the questions begin.
          Nothing else is on the screen.
        </p>

        <h2 className="display">Guided examples</h2>
        <p>
          The first questions show a starting step, the way a worked example would. Later questions
          leave that step out, so your child finishes the work on their own.
        </p>

        <h2 className="display">Practice until it is mostly right</h2>
        <p>
          A skill stays open until about 8 out of 10 answers are right. That is the 80% line. Then
          the next skill can open.
        </p>

        <h2 className="display">It comes back later</h2>
        <p>
          A skill that is already learned returns for a short review: after 1 day, again after 1
          week, and again after 1 month. The review is the same kind of question, not a new prize.
        </p>

        <h2 className="display">Why there are no rewards</h2>
        <p>
          Points and badges pull attention toward the prize. We leave them out so the math
          is the thing your child is working on. A weekly note tells you what to ask about, instead
          of a scoreboard.
        </p>
        <p>
          <Link href="/">See a lesson</Link>
        </p>
      </article>
    </Shell>
  );
}
