import Link from "next/link";
import { Suspense } from "react";
import { AddChildForm } from "@/components/add-child-form";
import { StartPracticeButton } from "@/components/start-practice-button";
import { SetPinForm } from "@/components/student-access-forms";
import { DigestPanel } from "@/components/digest-panel";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { MasteryMark } from "@/components/mastery-mark";
import { ParentCanDoSummary } from "@/components/can-do-list";
import { MoveAheadSetting } from "@/components/move-ahead-setting";
import { SetLengthSetting } from "@/components/set-length-setting";
import { ParentProgressView } from "@/components/parent-progress";
import { loadCanDo } from "@/lib/can-do/load";
import { loadRoster, type RosterChild } from "@/lib/children/roster";
import { friendlyDbError } from "@/lib/db-error";
import { renderDigestText, torontoDate, type DigestSummary } from "@/lib/digest/build";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureProfile, requireUser } from "@/lib/auth/session";
import { isSimpleDesk } from "@/lib/dashboard/desk";
import { formatAccuracy } from "@/lib/practice/format";
import { weeklyAccuracy } from "@/lib/practice/trend";
import { isSupportedGrade, type SupportedGrade } from "@/lib/grades";
import { masteryLabel, masteryMark } from "@/lib/practice/mastery";
import { buildPortrait } from "@/lib/practice/portrait";
import { accuracyScheduler, describeSkills, type SkillCard } from "@/lib/practice/scheduler";
import type { SkillProgress } from "@/lib/practice/types";
import type { TrendWeek } from "@/lib/practice/trend";
import { buildParentProgress } from "@/lib/lesson/parent";
import { loadParentBundle } from "@/lib/lesson/store";
import { EvalDesk } from "@/components/eval-desk";
import { ShowMeDesk } from "@/components/show-me-desk";
import { loadAttemptLog, loadCards } from "@/lib/practice/session";

export default function DashboardPage(props: PageProps<"/dashboard">) {
  return (
    <Shell role="parent" action={<SignOutButton />}>
      <Suspense fallback={<p className="status mt-10">Loading the parent desk…</p>}>
        <Desk searchParams={props.searchParams} />
      </Suspense>
    </Shell>
  );
}

async function Desk({
  searchParams,
}: {
  searchParams: PageProps<"/dashboard">["searchParams"];
}) {
  const params = await searchParams;
  const notice = Array.isArray(params.notice) ? params.notice[0] : params.notice;
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
        <p className="feedback bad" role="alert">
          {roster.studentSetup}
        </p>
      ) : null}
      {roster.gradeSetup ? (
        <p className="feedback bad" role="alert">
          {roster.gradeSetup}
        </p>
      ) : null}

      {children.length === 0 ? (
        <p className="hint">
          Add a child to start practice. First name, grade, and a PIN. Up to two.
        </p>
      ) : (
        <div className="grid gap-4">
          {children.map((child) => (
            <ChildCard key={child.id} child={child} supabase={supabase} pinSaved={notice === "pin"} />
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
  pinSaved,
}: {
  child: RosterChild;
  supabase: SupabaseClient;
  pinSaved: boolean;
}) {
  const working = isSupportedGrade(child.workingGrade) ? child.workingGrade : null;
  if (!isSupportedGrade(child.grade) || !working) {
    return (
      <article className="card grid gap-3">
        <h2 className="text-2xl font-semibold">{child.first_name}</h2>
        <p className="hint mt-2">Grade {child.grade} is not open yet.</p>
        <StartPracticeButton childId={child.id} />
        <SetPinForm
          childId={child.id}
          firstName={child.first_name}
          hasLogin={Boolean(child.username)}
          returnTo="dashboard"
          saved={pinSaved}
        />
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
        </p>
      </div>
      {child.requestedGrade ? (
        <p className="hint">
          Asked to work in Grade {child.requestedGrade}. Approve it in account settings.
        </p>
      ) : null}
      <StartPracticeButton childId={child.id} />
      <EvalDesk supabase={supabase} childId={child.id} />
      <ShowMeDesk supabase={supabase} childId={child.id} />
      <SetPinForm
        childId={child.id}
        firstName={child.first_name}
        hasLogin={Boolean(child.username)}
        returnTo="dashboard"
        saved={pinSaved}
      />
      <LearningStatus practicedToday={log.attempts.some((attempt) => attempt.date === today)} />
      <MoveAheadSetting childId={child.id} enabled={child.moveAhead} />
      <SetLengthSetting childId={child.id} minutes={child.setLengthMinutes} />
      <ChildCanDo
        childId={child.id}
        grade={working}
        supabase={supabase}
        today={today}
        fallbackTitle={focus.title}
      />
      {working === 3 ? (
        <GradeThreeProgress childId={child.id} supabase={supabase} today={today} />
      ) : isSimpleDesk(working) ? null : (
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

async function ChildCanDo({
  childId,
  grade,
  supabase,
  today,
  fallbackTitle,
}: {
  childId: string;
  grade: SupportedGrade;
  supabase: SupabaseClient;
  today: string;
  fallbackTitle: string;
}) {
  const loaded = await loadCanDo(supabase, {
    childId,
    grade,
    today,
    showReviewLinks: false,
  });
  if (loaded.error || !loaded.view) {
    return (
      <section className="can-do-desk" aria-label="Can do now">
        <h3 className="font-semibold">Can do now</h3>
        <p className="can-do-now">Working on now: {fallbackTitle}.</p>
        <p className="feedback bad">{loaded.error ?? "Could not load skills."}</p>
      </section>
    );
  }
  return <ParentCanDoSummary view={loaded.view} seeAllHref={`/dashboard/can-do/${childId}`} />;
}

async function GradeThreeProgress({
  childId,
  supabase,
  today,
}: {
  childId: string;
  supabase: SupabaseClient;
  today: string;
}) {
  const bundle = await loadParentBundle(supabase, childId);
  const progress = buildParentProgress({
    today,
    lessons: bundle.lessons,
    reviews: bundle.reviews,
    attempts: bundle.attempts,
    solved: bundle.solved,
    repaired: bundle.repaired,
  });
  return (
    <ParentProgressView
      progress={progress}
      digestHref={`/dashboard/digest/${childId}`}
      missing={bundle.missing}
    />
  );
}

function LearningStatus({ practicedToday }: { practicedToday: boolean }) {
  return <p>{practicedToday ? "Practiced today." : "Not yet today."}</p>;
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
          <p className="hint mt-2">No practice in the last four weeks.</p>
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
          <p className="hint mt-2">Nothing is waiting for a later review.</p>
        ) : (
          <ul className="strand-list mt-2">
            {review.map((item) => (
              <li key={item.skillId}>{item.title}</li>
            ))}
          </ul>
        )}
        <p className="hint mt-2">
          Skill names only. The student opens the questions from their own login.
        </p>
      </div>
    </div>
  );
}
