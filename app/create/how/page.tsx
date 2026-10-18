import { notFound } from "next/navigation";
import { HowCreateWorks } from "@/components/create/flow";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { requireStudent } from "@/lib/auth/student";
import { loadCreateFlags } from "@/lib/create/access";
import { createAccessDecision } from "@/lib/create/gate";
import { gradeAccessFrom } from "@/lib/practice/grade-access";

export default async function CreateHowPage() {
  const session = await requireStudent();
  if ("error" in session) return <p className="feedback bad mt-8">{session.error}</p>;
  const access = gradeAccessFrom({
    enrolled: session.child.grade,
    working: session.child.working_grade,
    nextUnlocked: session.child.next_grade_unlocked,
    requested: session.child.requested_grade,
  });
  const flags = await loadCreateFlags(session.supabase, session.child.id);
  if (!access || createAccessDecision({ enabled: flags.enabled, grade: access.working }) === "not-found") {
    notFound();
  }
  return (
    <Shell narrow role="student" action={<SignOutButton />}>
      <HowCreateWorks />
    </Shell>
  );
}
