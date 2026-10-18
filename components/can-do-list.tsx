import Link from "next/link";
import { openSkill } from "@/lib/practice/actions";
import {
  LOOKBACK_LABEL,
  PARENT_CAN_DO_LIMIT,
  PARENT_EMPTY,
  STUDENT_EMPTY,
  workingOnLine,
  type CanDoItem,
  type CanDoView,
} from "@/lib/can-do/view";
import { parentGoFurtherLine } from "@/lib/practice/go-further";

export function StudentCanDo({ view }: { view: CanDoView }) {
  return (
    <div className="can-do">
      <h1 className="display text-4xl">Things I can do</h1>
      <p className="can-do-now">{workingOnLine(view.workingTitle)}</p>
      {view.strands.length === 0 ? (
        <p className="can-do-empty">{STUDENT_EMPTY}</p>
      ) : (
        <StrandGroups view={view} showReview />
      )}
      <FurtherLines lines={view.further} />
      <Link className="can-do-entry" href="/practice">
        Back to practice
      </Link>
    </div>
  );
}

export function ParentCanDoAll({ view, childName }: { view: CanDoView; childName: string }) {
  return (
    <div className="can-do">
      <p className="eyebrow">Parent desk</p>
      <h1 className="display text-4xl">{childName}</h1>
      <h2 className="text-2xl font-semibold">Can do now</h2>
      <p className="can-do-now">{workingOnLine(view.workingTitle)}</p>
      {view.strands.length === 0 ? (
        <p className="can-do-empty">{PARENT_EMPTY}</p>
      ) : (
        <StrandGroups view={view} heading="h3" />
      )}
      <FurtherLines lines={parentLine(view) ? [parentLine(view)!] : []} />
    </div>
  );
}

export function ParentCanDoSummary({ view, seeAllHref }: { view: CanDoView; seeAllHref: string }) {
  const items = view.recent.slice(0, PARENT_CAN_DO_LIMIT);
  return (
    <section className="can-do-desk" aria-label="Can do now">
      <h3 className="font-semibold">Can do now</h3>
      <p className="can-do-now">{workingOnLine(view.workingTitle)}</p>
      {items.length === 0 ? (
        <p className="can-do-empty">{PARENT_EMPTY}</p>
      ) : (
        <ul className="can-do-skills">
          {items.map((skill) => (
            <li key={skill.skillId} className="can-do-skill">
              <QuietCheck />
              <p className="can-do-statement">{skill.statement}</p>
              {skill.month ? <p className="can-do-month">{skill.month}</p> : null}
            </li>
          ))}
        </ul>
      )}
      {view.recent.length > 0 ? (
        <Link className="can-do-see-all" href={seeAllHref}>
          See all
        </Link>
      ) : null}
      <FurtherLines lines={parentLine(view) ? [parentLine(view)!] : []} />
    </section>
  );
}

function parentLine(view: CanDoView): string | null {
  return parentGoFurtherLine(view.furtherSkillIds);
}

function FurtherLines({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="can-do-further-list">
      {lines.map((line) => (
        <p key={line} className="can-do-further">
          {line}
        </p>
      ))}
    </div>
  );
}

function StrandGroups({
  view,
  showReview = false,
  heading = "h2",
}: {
  view: CanDoView;
  showReview?: boolean;
  heading?: "h2" | "h3";
}) {
  const Heading = heading;
  return (
    <div className="can-do-groups">
      {view.strands.map((strand) => (
        <section key={strand.id} className="can-do-strand" aria-label={strand.label}>
          <Heading>{strand.label}</Heading>
          <ul className="can-do-skills">
            {strand.skills.map((skill) => (
              <li key={skill.skillId} className="can-do-skill">
                <QuietCheck />
                <p className="can-do-statement">{skill.statement}</p>
                {skill.month ? <p className="can-do-month">{skill.month}</p> : null}
                {showReview ? <LookBack skill={skill} /> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function LookBack({ skill }: { skill: CanDoItem }) {
  if (!skill.review) return null;
  if (skill.review.kind === "lesson") {
    return (
      <Link className="can-do-lookback" href={skill.review.href}>
        {LOOKBACK_LABEL}
      </Link>
    );
  }
  return (
    <form action={openSkill}>
      <input type="hidden" name="childId" value={skill.review.childId} />
      <input type="hidden" name="skillId" value={skill.review.skillId} />
      <button className="can-do-lookback" type="submit">
        {LOOKBACK_LABEL}
      </button>
    </form>
  );
}

function QuietCheck() {
  return (
    <span className="can-do-check">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M3.2 8.2 6.4 11.4 12.8 4.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="visually-hidden">Learned</span>
    </span>
  );
}
