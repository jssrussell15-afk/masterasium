import Link from "next/link";
import { Suspense } from "react";
import { AddChildForm } from "@/components/add-child-form";
import { DigestPanel } from "@/components/digest-panel";
import { SignOutButton } from "@/components/sign-out-button";
import { StreakMark } from "@/components/streak-mark";
import { Shell } from "@/components/site-header";
import { GradeSetupSql } from "@/components/grade-setup-sql";
import { MasteryMark } from "@/components/mastery-mark";
import { StudentSetupSql } from "@/components/student-setup-sql";
import { loadRoster, type RosterChild } from "@/lib/children/roster";
import { friendlyDbError } from "@/lib/db-error";
import { renderDigestText, torontoDate, type DigestSummary } from "@/lib/digest/build";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureProfile, requireUser } from "@/lib/auth/session";
import { isSimpleDesk } from "@/lib/dashboard/desk";
import { formatAccuracy } from "@/lib/practice/format";
import { weeklyAccuracy } from "@/lib/practice/trend";
import { isSupportedGrade } from "@/lib/grades";
import { masteryLabel, masteryMark } from "@/lib/practice/mastery";
import { buildPortrait } from "@/lib/practice/portrait";
import { accuracyScheduler, describeSkills, type SkillCard } from "@/lib/practice/scheduler";
import type { SkillProgress } from "@/lib/practice/types";
import type { TrendWeek } from "@/lib/practice/trend";
import { loadAttemptLog, loadCards } from "@/lib/practice/session";

export default function DashboardPage() {
  return (
    <Shell role="parent" action={<SignOutButton />}>
      <Suspense fallback={<p className="status mt-10">Loading the parent desk…</p>}>
        <Desk />
      </Suspense>
    </Shell>
  );
}

async function Desk() {
  const { supabase, user } = await requireUser();
  const profileError = await ensureProfile(supabase, user.id);
  const roster = await loadRoster(supabase, user.id);
  const problem = profileError ? friendlyDbError(profileError) : roster.error;
  if (problem) {
    return <p className="feedback bad mt-8">{problem}</p>;
  }

  const children = roster.children;

  return (
    <div className="mt-6 grid gap-6">
      <div>
        <p className="eyebrow">Parent desk</p>
        <h1 className="display mt-2 text-4xl">Your children</h1>
        <p className="hint mt-2">{user.email}</p>
        <p className="hint mt-2">
          Progress here is scores and skill names. Question text stays on the student login.{" "}
          <Link href="/settings" className="nav-link">
            Account settings
          </Link>
        </p>
      </div>

      {roster.studentSetup ? (
        <div className="grid gap-3">
          <p className="feedback bad" role="alert">
            {roster.studentSetup}
          </p>
          <StudentSetupSql open />
        </div>
      ) : null}
      {roster.gradeSetup ? (
        <div className="grid gap-3">
          <p className="feedback bad" role="alert">
            {roster.gradeSetup}
          </p>
          <GradeSetupSql open />
        </div>
      ) : null}

      {children.length === 0 ? (
        <p className="hint">
          Add a child to start practice. First name, grade, username, and a PIN. Up to two.
        </p>
      ) : (
        <div className="grid gap-4">
          {children.map((child) => (
            <ChildCard key={child.id} child={child} supabase={supabase} />
          ))}
        </div>
      )}

      {children.length < 2 ? <AddChildForm /> : <p className="hint">Two children is the limit on this account.</p>}
    </div>
  );
}

async function ChildCard({
  child,
  supabase,
}: {
  child: RosterChild;
  supabase: SupabaseClient;
}) {
  const working = isSupportedGrade(child.workingGrade) ? child.workingGrade : null;
  if (!isSupportedGrade(child.grade) || !working) {
    return (
      <article className="card">
        <h2 className="text-2xl font-semibold">{child.first_name}</h2>
        <p className="hint mt-2">Grade {child.grade} is not open yet.</p>
      </article>
    );
  }

  const { cards, error } = await loadCards(supabase, child.id);
  if (error) return <p className="feedback bad">{error}</p>;
  const log = await loadAttemptLog(supabase, child.id);
  if (log.error) return <p className="feedback bad">{log.error}</p>;

  const today = torontoDate();
  const focus = accuracyScheduler.chooseSkill({
    grade: working,
    cards,
    sessionCount: 0,
    today,
  });
  const skills = describeSkills(working, cards);
  const portrait = buildPortrait({ grade: working, cards, attempts: log.attempts, today });

  const { data: stub } = await supabase
    .from("digest_stubs")
    .select("summary")
    .eq("child_id", child.id)
    .order("period_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const saved = stub?.summary ? renderDigestText(stub.summary as DigestSummary) : null;

  return (
    <article className="card grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl font-semibold">{child.first_name}</h2>
        <p className="hint">
          Enrolled in Grade {child.grade}
          {working === child.grade ? "" : ` · Working in Grade ${working}`}
          {child.username ? ` · ${child.username}` : ""}
        </p>
      </div>
      {child.requestedGrade ? (
        <p className="hint text-sm">
          Asked to work in Grade {child.requestedGrade}. Approve it in account settings.
        </p>
      ) : null}
      {child.username ? (
        <p className="hint text-sm">
          Signs in with this username and a PIN. Reset the PIN in account settings.
        </p>
      ) : (
        <p className="hint text-sm">
          <Link href="/settings" className="nav-link">
            Create a student login
          </Link>{" "}
          so they can practice with a username and PIN.
        </p>
      )}
      {isSimpleDesk(working) ? (
        <SimpleProgress
          days={portrait.streakDays}
          practicedToday={log.attempts.some((attempt) => attempt.date === today)}
          focusTitle={focus.title}
        />
      ) : (
        <FullProgress
          skills={skills}
          cards={cards}
          weeks={weeklyAccuracy(log.attempts, today)}
          review={portrait.needsReview}
        />
      )}
      <DigestPanel childId={child.id} savedText={saved} />
    </article>
  );
}

function SimpleProgress({
  days,
  practicedToday,
  focusTitle,
}: {
  days: number;
  practicedToday: boolean;
  focusTitle: string;
}) {
  return (
    <div className="grid gap-2">
      <StreakMark days={days} />
      <p>{practicedToday ? "Practiced today." : "Not yet today."}</p>
      <p>Working on {focusTitle}.</p>
    </div>
  );
}

function FullProgress({
  skills,
  cards,
  weeks,
  review,
}: {
  skills: SkillProgress[];
  cards: SkillCard[];
  weeks: TrendWeek[];
  review: { skillId: string; title: string }[];
}) {
  const byId = new Map(cards.map((card) => [card.skillId, card]));
  const quiet = weeks.every((week) => week.attempted === 0);
  return (
    <div className="grid gap-4">
      <div>
        <h3 className="font-semibold">Skills</h3>
        <ul className="skill-list mt-2">
          {skills.map((skill) => {
            const card = byId.get(skill.id);
            return (
              <li key={skill.id} className={skill.current ? "skill-current" : undefined}>
                <span className="skill-title">
                  <MasteryMark status={skill.status} />
                  {skill.title}
                </span>
                <span className="hint">
                  {skill.current ? "Current · " : ""}
                  {masteryLabel(masteryMark(skill.status))}
                  {card && card.attempted > 0 ? ` · ${formatAccuracy(card.attempted, card.correct)}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <h3 className="font-semibold">Accuracy, last four weeks</h3>
        {quiet ? (
          <p className="hint mt-2 text-sm">No practice in the last four weeks.</p>
        ) : (
          <ul className="trend mt-2">
            {weeks.map((week) => (
              <li key={week.start}>
                <span>{week.label}</span>
                <span className="trend-track" aria-hidden="true">
                  <span
                    style={{
                      width: week.attempted === 0 ? "0%" : `${Math.round((week.correct / week.attempted) * 100)}%`,
                    }}
                  />
                </span>
                <span className="hint">{formatAccuracy(week.attempted, week.correct)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="font-semibold">Spaced review</h3>
        {review.length === 0 ? (
          <p className="hint mt-2 text-sm">Nothing is waiting for a later review.</p>
        ) : (
          <ul className="strand-list mt-2">
            {review.map((item) => (
              <li key={item.skillId}>{item.title}</li>
            ))}
          </ul>
        )}
        <p className="hint mt-2 text-sm">
          Skill names only. The student opens the questions from their own login.
        </p>
      </div>
    </div>
  );
}
