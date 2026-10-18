import Link from "next/link";
import type { ParentProgress } from "@/lib/lesson/parent";

export function ParentProgressView({
  progress,
  digestHref,
  missing = false,
}: {
  progress: ParentProgress;
  digestHref: string;
  missing?: boolean;
}) {
  return (
    <section className="parent-progress" aria-label="This week">
      {missing ? (
        <p className="hint">Lesson progress is not available yet.</p>
      ) : null}
      <div>
        <h3 className="font-semibold">Learned this week</h3>
        {progress.learned.length === 0 ? (
          <p className="hint mt-2">No skill was finished this week.</p>
        ) : (
          <ul className="strand-list mt-2">
            {progress.learned.map((skill) => (
              <li key={skill.skillId}>
                <span className="font-semibold">{skill.title}.</span> {skill.sentence}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="font-semibold">Needs a little help</h3>
        {progress.needsHelp.length === 0 ? (
          <p className="hint mt-2">Nothing is stuck right now.</p>
        ) : (
          <ul className="strand-list mt-2">
            {progress.needsHelp.map((skill) => (
              <li key={skill.skillId}>
                <span className="font-semibold">{skill.strand}.</span> {skill.nextStep}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="font-semibold">Coming up for review</h3>
        {progress.upcoming.length === 0 ? (
          <p className="hint mt-2">No review is scheduled yet.</p>
        ) : (
          <ul className="strand-list mt-2">
            {progress.upcoming.map((review) => (
              <li key={`${review.skillId}-${review.dueOn}`}>
                {review.title} — {review.when}
              </li>
            ))}
          </ul>
        )}
      </div>
      <article className="ask-card">
        <h3 className="font-semibold">Ask your child about…</h3>
        {progress.ask.solved ? (
          <p>
            <span className="font-semibold">One they solved.</span> {progress.ask.solved.prompt}{" "}
            <span className="hint">Answer: {progress.ask.solved.answer}</span>
          </p>
        ) : (
          <p className="hint">A solved problem will show up after practice.</p>
        )}
        {progress.ask.repaired ? (
          <p>
            <span className="font-semibold">One they fixed after a miss.</span> {progress.ask.repaired.prompt}{" "}
            <span className="hint">Answer: {progress.ask.repaired.answer}</span>
          </p>
        ) : (
          <p className="hint">A problem they fixed will show up after a miss and a later correct answer.</p>
        )}
      </article>
      <Link className="nav-link lesson-tap w-fit" href={digestHref}>
        Preview the Sunday note
      </Link>
    </section>
  );
}
