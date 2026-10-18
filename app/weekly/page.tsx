import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { Shell } from "@/components/site-header";
import { WEEKLY_PUZZLES, type WeeklyPuzzle } from "@/lib/content/phase1/weekly";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Weekly puzzle",
};

export default async function WeeklyPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const requested = Number((await searchParams).week ?? "1");
  const puzzle = WEEKLY_PUZZLES.find((item) => item.week === requested) ?? WEEKLY_PUZZLES[0]!;
  return (
    <Shell role="public" homeHref="/weekly">
      <WeeklySheet puzzle={puzzle} />
    </Shell>
  );
}

function WeeklySheet({ puzzle }: { puzzle: WeeklyPuzzle }) {
  return (
    <article className="weekly-sheet" data-week={puzzle.week}>
      <p className="eyebrow">Weekly puzzle</p>
      <div className="weekly-heading">
        <h1 className="display text-3xl">{puzzle.title}</h1>
        <PrintButton />
      </div>
      <p className="hint">A puzzle to do together. Week {puzzle.week} of 4. This draft is not scored.</p>
      <nav className="week-links no-print" aria-label="Weeks">
        {WEEKLY_PUZZLES.map((item) => (
          <Link key={item.week} href={`/weekly?week=${item.week}`} aria-current={item.week === puzzle.week ? "page" : undefined}>
            Week {item.week}
          </Link>
        ))}
      </nav>
      <p className="phase-prompt">{puzzle.prompt}</p>
      <section className="weekly-note">
        <h2>For the parent</h2>
        <p>{puzzle.hint}</p>
      </section>
      <section className="weekly-solution">
        <h2>Short solution</h2>
        <p className="hint">Cover this until you are ready.</p>
        <p>{puzzle.solution}</p>
      </section>
    </article>
  );
}
