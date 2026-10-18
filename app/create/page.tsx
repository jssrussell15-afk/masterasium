import { Suspense } from "react";
import { CreateExperience } from "@/components/create/flow";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { requireStudent } from "@/lib/auth/student";
import { loadCreateFlags } from "@/lib/create/access";
import { createGradeOk } from "@/lib/create/types";
import { gradeAccessFrom } from "@/lib/practice/grade-access";

export default function CreatePage() {
  return (
    <Shell narrow role="student" action={<SignOutButton />}>
      <Suspense fallback={<p className="status mt-8">Loading Create…</p>}>
        <CreateEntry />
      </Suspense>
    </Shell>
  );
}

async function CreateEntry() {
  const session = await requireStudent();
  if ("error" in session) return <p className="feedback bad mt-8">{session.error}</p>;
  const access = gradeAccessFrom({
    enrolled: session.child.grade,
    working: session.child.working_grade,
    nextUnlocked: session.child.next_grade_unlocked,
    requested: session.child.requested_grade,
  });
  if (!access || !createGradeOk(access.working)) {
    return <p className="hint mt-8">Create is for Grades 3 to 6.</p>;
  }
  const flags = await loadCreateFlags(session.supabase, session.child.id);
  if (!flags.enabled) {
    return <p className="hint mt-8">Create is turned off for this login.</p>;
  }
  return (
    <CreateExperience
      basePath="/create"
      childId={session.child.id}
      step="pick"
      project={null}
      access={flags}
      homeHref="/practice"
    />
  );
}
