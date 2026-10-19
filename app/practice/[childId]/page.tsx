import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlacementCheck } from "@/components/placement-check";
import { PracticeSession } from "@/components/practice-session";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { requireStudent } from "@/lib/auth/student";
import { readsAloudAutomatically } from "@/lib/children/read-aloud";
import { torontoDate } from "@/lib/digest/build";
import { gradeAccessFrom } from "@/lib/practice/grade-access";
import { loadPlacement } from "@/lib/practice/placement-store";
import { loadCards, loadOrIssueQuestion } from "@/lib/practice/session";

export default function PracticePage(props: PageProps<"/practice/[childId]">) {
  return (
    <Shell narrow role="student" action={<SignOutButton />}>
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

  const placement = await loadPlacement(supabase, data.id);
  if (placement.error) return <p className="feedback bad mt-8">{placement.error}</p>;
  if (placement.available && !placement.placement) {
    return <PlacementCheck childId={data.id} grade={access.enrolled} />;
  }

  const { cards, error: cardError } = await loadCards(supabase, data.id);
  if (cardError) return <p className="feedback bad mt-8">{cardError}</p>;

  const issued = await loadOrIssueQuestion(supabase, data.id, access.working, cards);
  if (!issued.question) {
    return <p className="feedback bad mt-8">{issued.error}</p>;
  }

  return (
    <PracticeSession
      view={{
        childId: data.id,
        childName: data.first_name,
        grade: access.working,
        access,
        question: issued.question,
        attempted: 0,
        correct: 0,
        focusTitle: issued.question.skillTitle,
        skills: [],
        streakDays: 0,
        streakMilestone: null,
        recap: null,
        requestedGrade: access.requested,
        today: torontoDate(),
        autoRead: readsAloudAutomatically(access.working, data.read_questions_aloud),
      }}
    />
  );
}
