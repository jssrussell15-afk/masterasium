import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PracticeSession } from "@/components/practice-session";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { requireStudent } from "@/lib/auth/student";
import { torontoDate } from "@/lib/digest/build";
import { gradeAccessFrom } from "@/lib/practice/grade-access";
import { nextUpFor } from "@/lib/practice/move-ahead-load";
import { readSetLength } from "@/lib/practice/set-length-load";
import { loadCards, loadOrIssueQuestion } from "@/lib/practice/session";
import { skillById } from "@/lib/practice/skills";

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

  const { cards, error: cardError } = await loadCards(supabase, data.id);
  if (cardError) return <p className="feedback bad mt-8">{cardError}</p>;

  const nextUp = await nextUpFor(supabase, data.id, access.working, cards);
  const setLengthMinutes = await readSetLength(supabase, data.id);
  const pending = await supabase
    .from("pending_questions")
    .select("skill_id")
    .eq("child_id", data.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const pendingSkill = pending.data?.skill_id ? skillById(String(pending.data.skill_id)) : undefined;
  const practiceGrade =
    pendingSkill && nextUp.some((skill) => skill.id === pendingSkill.id) ? pendingSkill.grade : access.working;
  const issued = await loadOrIssueQuestion(supabase, data.id, practiceGrade, cards);
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
        setLengthMinutes,
      }}
    />
  );
}
