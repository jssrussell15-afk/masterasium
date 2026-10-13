import Link from "next/link";
import { NotifyForm } from "@/components/notify-form";
import { Shell } from "@/components/site-header";
import { GRADES } from "@/lib/grades";

export default function HomePage() {
  return (
    <Shell banner>
      <div className="mt-8 grid items-start gap-10 md:mt-16 md:grid-cols-[1.15fr_0.85fr]">
        <section>
          <p className="eyebrow">Ontario · Grades 1–8</p>
          <h1 className="display mt-3 max-w-xl text-5xl md:text-6xl">
            Math practice that follows the school year.
          </h1>
          <p className="lede mt-5 max-w-xl">
            A quiet place for children to practice the skills they are learning in class, and for
            parents to see what to work on next.
          </p>
          <ol className="grade-row mt-8" aria-label="Grades">
            {GRADES.map((grade) => (
              <li key={grade.grade} className={grade.available ? "grade-pill open" : "grade-pill"}>
                <strong>{grade.grade}</strong>
                <span>{grade.available ? "Open" : "Soon"}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn btn-primary">
              Create a free parent account
            </Link>
            <Link href="/login" className="btn btn-secondary">
              Sign in
            </Link>
          </div>
          <p className="hint mt-4 max-w-xl text-sm">
            Grades 1 through 8 are open, free, while we test. Registration does not ask for payment.
          </p>
        </section>

        <aside className="card">
          <h2 className="text-xl font-semibold">A note when practice grows</h2>
          <p className="hint mt-2 text-sm">
            Grades 1 through 8 are open. Leave an email if you want a short note when new skills
            are added.
          </p>
          <NotifyForm />
        </aside>
      </div>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        <article className="card">
          <h2 className="font-semibold">One or two children</h2>
          <p className="hint mt-2 text-sm">
            A parent account holds the profiles. Each child is a first name and a grade. No child
            email.
          </p>
        </article>
        <article className="card">
          <h2 className="font-semibold">One skill at a time</h2>
          <p className="hint mt-2 text-sm">
            Practice stays on a skill until it is steady, then opens the next one. Any skill in the
            grade can be chosen. A short review comes back to earlier skills.
          </p>
        </article>
        <article className="card">
          <h2 className="font-semibold">A parent desk</h2>
          <p className="hint mt-2 text-sm">
            See questions attempted, accuracy, and the skill in focus. A daily email can be saved
            as a draft. It is not sent yet.
          </p>
        </article>
      </section>
    </Shell>
  );
}
