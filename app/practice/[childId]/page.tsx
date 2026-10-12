import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PracticeSession } from "@/components/practice-session";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { friendlyDbError } from "@/lib/db-error";
import { isSupportedGrade } from "@/lib/grades";
import { requireUser } from "@/lib/auth/session";
import { accuracyScheduler } from "@/lib/practice/scheduler";
import { loadCards, loadOrIssueQuestion, totals } from "@/lib/practice/session";

export default function PracticePage(props: PageProps<"/practice/[childId]">) {
  return (
    <Shell narrow action={<SignOutButton />}>
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
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("children")
    .select("id, first_name, grade")
    .eq("id", childId)
    .eq("parent_id", user.id)
    .maybeSingle();

  if (error) return <p className="feedback bad mt-8">{friendlyDbError(error)}</p>;
  if (!data) notFound();
  if (!isSupportedGrade(data.grade)) {
    return <p className="feedback bad mt-8">That grade is not open yet.</p>;
  }

  const { cards, error: cardError } = await loadCards(supabase, data.id);
  if (cardError) return <p className="feedback bad mt-8">{cardError}</p>;

  const issued = await loadOrIssueQuestion(supabase, data.id, data.grade, cards);
  if (!issued.question) {
    return <p className="feedback bad mt-8">{issued.error}</p>;
  }

  const score = totals(cards);
  const focus = accuracyScheduler.chooseSkill({
    grade: data.grade,
    cards,
    sessionCount: 0,
  });

  return (
    <div className="mt-4 grid gap-6">
      <div>
        <Link href="/dashboard" className="nav-link text-sm">
          Back to the parent desk
        </Link>
        <p className="mt-3 text-lg">
          {data.first_name} · Grade {data.grade}
        </p>
      </div>
      <PracticeSession
        view={{
          childId: data.id,
          childName: data.first_name,
          grade: data.grade,
          question: issued.question,
          attempted: score.attempted,
          correct: score.correct,
          focusTitle: focus.title,
        }}
      />
    </div>
  );
}
