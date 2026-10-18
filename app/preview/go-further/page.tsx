import Link from "next/link";
import { GoFurtherSession } from "@/components/go-further-session";
import { Shell } from "@/components/site-header";
import { buildGoFurtherSet, parentGoFurtherLine, wentFurtherLine, type GoFurtherQuestion } from "@/lib/practice/go-further";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Go further sample",
};

const SCENES = ["entry", "compare", "balance", "true-false", "many-ways", "bar", "pattern", "parent"] as const;
type Scene = (typeof SCENES)[number];

export default async function GoFurtherPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ scene?: string; skill?: string }>;
}) {
  const params = await searchParams;
  const scene: Scene = SCENES.includes(params.scene as Scene) ? (params.scene as Scene) : "compare";
  const skillId = params.skill === "g3-place" || params.skill === "g3-mult" || params.skill === "g3-fractions" ? params.skill : "g3-add-sub";
  const questions = buildGoFurtherSet(skillId, 11);

  return (
    <Shell narrow role="student" action={null} homeHref="/preview/go-further?scene=entry">
      {scene === "entry" ? <EntryPreview /> : null}
      {scene === "parent" ? <ParentPreview /> : null}
      {scene !== "entry" && scene !== "parent" ? (
        <GoFurtherSession questions={questions} startIndex={indexOf(questions, scene)} childId={null} backHref="/preview/go-further?scene=entry" />
      ) : null}
    </Shell>
  );
}

function indexOf(questions: GoFurtherQuestion[], scene: Scene): number {
  const index = questions.findIndex((question) => question.kind === scene);
  return index >= 0 ? index : 0;
}

function EntryPreview() {
  return (
    <div className="practice-home mt-4 grid gap-4" data-go-further="entry">
      <div>
        <h1 className="display text-4xl">Sam</h1>
        <p className="hint mt-1">Grade 3</p>
        <Link href="/preview/go-further?scene=entry" className="can-do-entry home-link">
          Things I can do
        </Link>
      </div>
      <section className="card dash-widget" aria-label="Go further">
        <h2>Go further</h2>
        <ul className="skill-taps">
          <li>
            <Link className="skill-tap" href="/preview/go-further?scene=compare">
              <span>Addition and subtraction within 1,000</span>
              <span className="hint">Same numbers, a deeper look</span>
            </Link>
          </li>
        </ul>
      </section>
      <section className="can-do" aria-label="Things I can do">
        <h2 className="text-2xl font-semibold">Things I can do</h2>
        <p className="can-do-statement">I can add and subtract numbers up to 1,000.</p>
        <p className="can-do-further">{wentFurtherLine("g3-add-sub")}</p>
      </section>
    </div>
  );
}

function ParentPreview() {
  return (
    <article className="card grid gap-3 mt-4" data-go-further="parent">
      <h1 className="text-2xl font-semibold">Sam</h1>
      <section className="can-do-desk" aria-label="Can do now">
        <h2 className="font-semibold">Can do now</h2>
        <p className="can-do-further">{parentGoFurtherLine(["g3-add-sub", "g3-mult"])}</p>
      </section>
    </article>
  );
}
