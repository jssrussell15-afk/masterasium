import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LessonSession } from "@/components/lesson-session";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { requireStudent } from "@/lib/auth/student";
import { torontoDate } from "@/lib/digest/build";
import { lessonById } from "@/lib/lesson/catalog";
import { buildLessonScreen } from "@/lib/lesson/screen";
import { nextReviewDate, prepareRun } from "@/lib/lesson/store";
import { gradeAccessFrom } from "@/lib/practice/grade-access";
import { readsAloudAutomatically } from "@/lib/children/read-aloud";
import { readHold } from "@/lib/lesson/hold";
import { resolvedShowLevel } from "@/lib/practice/fade";
import { readLearn } from "@/lib/practice/memory";
import { isReviewDue } from "@/lib/practice/review";
import { cardFor, loadCards, refreshShowGap } from "@/lib/practice/session";
import { skillById } from "@/lib/practice/skills";
import { skillCanWalk } from "@/lib/practice/walk";

export default function LessonPage({
  params,
}: {
  params: Promise<{ childId: string; skillId: string }>;
}) {
  return (
    <Shell narrow role="student" action={<SignOutButton />}>
      <Suspense fallback={<p className="status mt-10">Opening the lesson…</p>}>
        <LessonLoader params={params} />
      </Suspense>
    </Shell>
  );
}

async function LessonLoader({ params }: { params: Promise<{ childId: string; skillId: string }> }) {
  const { childId, skillId } = await params;
  const session = await requireStudent();
  if ("error" in session) return <p className="feedback bad mt-8">{session.error}</p>;
  if (session.child.id !== childId) notFound();

  const skill = skillById(skillId);
  const lesson = lessonById(skillId);
  if (!skill || !lesson) notFound();

  const access = gradeAccessFrom({
    enrolled: session.child.grade,
    working: session.child.working_grade,
    nextUnlocked: session.child.next_grade_unlocked,
    requested: session.child.requested_grade,
  });
  if (!access || access.working !== skill.grade) {
    return <p className="feedback bad mt-8">That lesson is not open yet.</p>;
  }

  const { supabase } = session;
  const { cards, error: cardError } = await loadCards(supabase, childId);
  if (cardError) return <p className="feedback bad mt-8">{cardError}</p>;
  const learn = readLearn(cardFor(cards, skillId).fsrs);
  const prepared = await prepareRun(supabase, childId, skillId, isReviewDue(learn, torontoDate()));
  if (prepared.error) return <p className="feedback bad mt-8">{prepared.error}</p>;

  const { cards: freshCards } = await loadCards(supabase, childId);
  const today = torontoDate();
  const gapped = await refreshShowGap(supabase, childId, skillId, freshCards, today);
  const freshLearn = readLearn(cardFor(gapped, skillId).fsrs);
  const screen = buildLessonScreen(prepared.run, skill, lesson, {
    nextReview: nextReviewDate(freshLearn),
    showLevel: resolvedShowLevel(freshLearn.showLevel, skillCanWalk(skillId)),
    walkMode: readHold(prepared.run.feedbackNote, prepared.run.feedbackExpected)?.walkMode ?? null,
  });

  return (
    <LessonSession
      initial={{ screen }}
      childId={childId}
      skillId={skillId}
      grade={skill.grade}
      autoRead={readsAloudAutomatically(skill.grade, session.child.read_questions_aloud)}
    />
  );
}
