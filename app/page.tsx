import Link from "next/link";
import type { Metadata } from "next";
import { DashboardMock } from "@/components/dashboard-mock";
import { PracticeShot } from "@/components/practice-shot";
import { Shell } from "@/components/site-header";
import { PRICING } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Masterasium",
  description:
    "Adaptive math practice for Grades 1–8, aligned to your province's curriculum. Every province except Quebec.",
};

export default function HomePage() {
  return (
    <Shell
      action={
        <Link href="/login" className="btn btn-secondary">
          Sign in
        </Link>
      }
    >
      <section className="mt-8 grid items-center gap-10 md:mt-14 md:grid-cols-[1.05fr_0.95fr]">
        <div>
          <h1 className="display text-4xl md:text-5xl">
            Adaptive math practice for Grades 1–8, aligned to your province&apos;s curriculum.
          </h1>
          <p className="lede mt-5 max-w-xl">
            Practice covers every province except Quebec.
          </p>
          <Link href="/signup" className="btn btn-primary mt-8">
            Start free trial
          </Link>
        </div>
        <DashboardMock />
      </section>

      <p className="trust-line">Built with teachers and parents in Ontario.</p>

      <section className="mt-14 grid items-start gap-8 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="display text-3xl">How it works</h2>
          <ol className="step-list mt-4">
            <li>
              <strong>Pick a skill.</strong> Choose what the class is working on, or stay with the
              next skill in the grade.
            </li>
            <li>
              <strong>Practice with hints.</strong> The first questions show a starting step. Later
              questions stand on their own.
            </li>
            <li>
              <strong>See progress.</strong> The parent desk follows the grade: a short note for
              Grades 1–3, and a skill breakdown from Grade 4 up.
            </li>
          </ol>
        </div>
        <PracticeShot />
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-2">
        <article className="card">
          <h2 className="text-xl font-semibold">For parents</h2>
          <p className="hint mt-2">
            The desk shows what your child is working on and how that skill is moving. Grades 1–3
            stay to a streak, whether they practiced today, and one line on the current skill.
            Grade 4 and up adds the skill list, four weeks of accuracy, and what is due for a later
            review.
          </p>
        </article>
        <article className="card">
          <h2 className="text-xl font-semibold">For teachers</h2>
          <p className="hint mt-2">
            Teachers get a free tool: upload a worksheet page, generate a new sheet, and share a
            class link.
          </p>
          <Link href="/worksheets" className="nav-link mt-3 inline-block">
            Open the teacher tool
          </Link>
        </article>
      </section>

      <section className="mt-14">
        <h2 className="display text-3xl">Pricing</h2>
        <p className="lede mt-3">Every plan starts with a free trial. Signup does not ask for a card.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="card">
            <h3 className="font-semibold">Monthly</h3>
            <p className="display mt-2 text-4xl">${PRICING.monthlyCad}</p>
            <p className="hint mt-1">per month after the trial</p>
          </article>
          <article className="card">
            <h3 className="font-semibold">Annual</h3>
            <p className="display mt-2 text-4xl">${PRICING.annualCad}</p>
            <p className="hint mt-1">per year after the trial</p>
          </article>
        </div>
      </section>

      <section className="mt-14">
        <Link href="/signup" className="btn btn-primary">
          Start free trial
        </Link>
      </section>
    </Shell>
  );
}
