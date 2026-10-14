import Link from "next/link";
import { Suspense } from "react";
import { AddChildForm } from "@/components/add-child-form";
import { BadgeTree } from "@/components/badge-tree";
import { DigestPanel } from "@/components/digest-panel";
import { NeedsReview } from "@/components/needs-review";
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
import { formatAccuracy } from "@/lib/practice/format";
import { isSupportedGrade } from "@/lib/grades";
import { masteryLabel, masteryMark } from "@/lib/practice/mastery";
import { buildPortrait } from "@/lib/practice/portrait";
import { accuracyScheduler, describeSkills } from "@/lib/practice/scheduler";
import { loadAttemptLog, loadCards, totals } from "@/lib/practice/session";

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
  const score = totals(cards);
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
      <StreakMark days={portrait.streakDays} />
      <div className="stat-grid">
        <div>
          <p>Questions attempted</p>
          <strong>{score.attempted}</strong>
        </div>
        <div>
          <p>Accuracy</p>
          <strong>{formatAccuracy(score.attempted, score.correct)}</strong>
        </div>
        <div>
          <p>Current skill</p>
          <strong>{focus.title}</strong>
        </div>
      </div>
      <NeedsReview
        childId={child.id}
        items={portrait.needsReview}
        note="Skill names only. The student opens the questions from their own login."
      />
      <BadgeTree badges={portrait.badges} />
      <div>
        <h3 className="font-semibold">Skills</h3>
        <p className="hint mt-1 text-sm">
          These are the skills in the grade they are working in. A skill is mastered after 10
          questions at 80% accuracy. The next grade can be opened without finishing every skill.
        </p>
        <ul className="skill-list mt-2">
          {skills.map((skill) => (
            <li key={skill.id} className={skill.current ? "skill-current" : undefined}>
              <span className="skill-title">
                <MasteryMark status={skill.status} />
                {skill.title}
              </span>
              <span className="hint">
                {skill.current ? "Current · " : ""}
                {masteryLabel(masteryMark(skill.status))}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <DigestPanel childId={child.id} savedText={saved} />
    </article>
  );
}
