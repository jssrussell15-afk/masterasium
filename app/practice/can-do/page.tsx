import { Suspense } from "react";
import { StudentCanDo } from "@/components/can-do-list";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { studentCanDoChildId } from "@/lib/can-do/access";
import { loadCanDo } from "@/lib/can-do/load";
import { requireStudent } from "@/lib/auth/student";
import { torontoDate } from "@/lib/digest/build";
import { gradeAccessFrom } from "@/lib/practice/grade-access";

export const metadata = {
  title: "Things I can do",
};

export default function CanDoPage() {
  return (
    <Shell narrow role="student" action={<SignOutButton />}>
      <Suspense fallback={<p className="status mt-10">Loading things you can do…</p>}>
        <CanDoLoader />
      </Suspense>
    </Shell>
  );
}

async function CanDoLoader() {
  const session = await requireStudent();
  if ("error" in session) {
    return <p className="feedback bad mt-8">{session.error}</p>;
  }

  const childId = studentCanDoChildId(session.child.id);
  if (!childId) {
    return <p className="feedback bad mt-8">That student session ended. Sign out and sign in again.</p>;
  }

  const access = gradeAccessFrom({
    enrolled: session.child.grade,
    working: session.child.working_grade,
    nextUnlocked: session.child.next_grade_unlocked,
    requested: session.child.requested_grade,
  });
  if (!access) {
    return <p className="feedback bad mt-8">That grade is not open yet.</p>;
  }

  const loaded = await loadCanDo(session.supabase, {
    childId,
    grade: access.working,
    today: torontoDate(),
    showReviewLinks: true,
  });
  if (loaded.error || !loaded.view) {
    return <p className="feedback bad mt-8">{loaded.error ?? "Could not load skills."}</p>;
  }

  return <StudentCanDo view={loaded.view} />;
}
