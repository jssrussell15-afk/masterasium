import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NeedsReview } from "@/components/needs-review";
import { PracticeSession } from "@/components/practice-session";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { requireStudent } from "@/lib/auth/student";
import { torontoDate } from "@/lib/digest/build";
import { gradeAccessFrom } from "@/lib/practice/grade-access";
import { buildPortrait } from "@/lib/practice/portrait";
import { accuracyScheduler, describeCatalog } from "@/lib/practice/scheduler";
import { loadAttemptLog, loadCards, loadOrIssueQuestion, totals } from "@/lib/practice/session";

export default function PracticePage(props: PageProps<"/practice/[childId]">) {
  return (
    <Shell narrow banner role="student" action={<SignOutButton />}>
      <Suspense fallback={<p className="status mt-10">Getting a question ready…</p>}>
        <PracticeLoader params={props.params} />
      </Suspense>
    </Shell>
  );
}

async function PracticeLoader({
  params,
}: {
  params: PageProps<"/practice/[childId]">["params"];
}) {
  const { childId } = await params;
  const session = await requireStudent();
  if ("error" in session) {
    return <p className="feedback bad mt-8">{session.error}</p>;
  }
  if (session.child.id !== childId) notFound();

  const { supabase, child: data } = session;
  const access = gradeAccessFrom({
    enrolled: data.grade,
    working: data.working_grade,
    nextUnlocked: data.next_grade_unlocked,
    requested: data.requested_grade,
  });
  if (!access) {
    return <p className="feedback bad mt-8">That grade is not open yet.</p>;
  }

  const { cards, error: cardError } = await loadCards(supabase, data.id);
  if (cardError) return <p className="feedback bad mt-8">{cardError}</p>;

  const issued = await loadOrIssueQuestion(supabase, data.id, access.working, cards);
  if (!issued.question) {
    return <p className="feedback bad mt-8">{issued.error}</p>;
  }

  const log = await loadAttemptLog(supabase, data.id);
  if (log.error) return <p className="feedback bad mt-8">{log.error}</p>;

  const today = torontoDate();
  const score = totals(cards);
  const focus = accuracyScheduler.chooseSkill({
    grade: access.working,
    cards,
    sessionCount: 0,
    today,
  });
  const portrait = buildPortrait({
    grade: access.working,
    cards,
    attempts: log.attempts,
    today,
  });

  return (
    <div className="mt-4 grid gap-6">
      <div>
        <p className="text-lg">
          {data.first_name} · Working in Grade {access.working}
        </p>
        {access.working !== access.enrolled ? (
          <p className="hint text-sm">Enrolled in Grade {access.enrolled}.</p>
        ) : null}
      </div>
      <NeedsReview childId={data.id} items={portrait.needsReview} allowReview />
      <PracticeSession
        view={{
          childId: data.id,
          childName: data.first_name,
          grade: access.working,
          access,
          question: issued.question,
          attempted: score.attempted,
          correct: score.correct,
          focusTitle: focus.title,
          skills: describeCatalog(access, cards),
          streakDays: portrait.streakDays,
          streakMilestone: portrait.streakMilestone,
          recap: portrait.recap,
          requestedGrade: access.requested,
          today,
        }}
      />
    </div>
  );
}
