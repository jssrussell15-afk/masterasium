import { Suspense } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { StudentDashboard } from "@/components/student-dashboard";
import { requireStudent } from "@/lib/auth/student";
import { torontoDate } from "@/lib/digest/build";
import { gradeAccessFrom } from "@/lib/practice/grade-access";
import { studentHome } from "@/lib/practice/home";
import { describeCatalog } from "@/lib/practice/scheduler";
import { practiceAnchor } from "@/lib/practice/placement";
import { loadPlacement } from "@/lib/practice/placement-store";
import { loadAttemptLog, loadCards } from "@/lib/practice/session";

export default function PracticeIndexPage() {
  return (
    <Shell narrow role="student" action={<SignOutButton />}>
      <Suspense fallback={<p className="status mt-10">Loading your skills…</p>}>
        <StudentHomeLoader />
      </Suspense>
    </Shell>
  );
}

async function StudentHomeLoader() {
  const session = await requireStudent();
  if ("error" in session) {
    return <p className="feedback bad mt-8">{session.error}</p>;
  }

  const { supabase, child } = session;
  const access = gradeAccessFrom({
    enrolled: child.grade,
    working: child.working_grade,
    nextUnlocked: child.next_grade_unlocked,
    requested: child.requested_grade,
  });
  if (!access) {
    return <p className="feedback bad mt-8">That grade is not open yet.</p>;
  }

  const { cards, error: cardError } = await loadCards(supabase, child.id);
  if (cardError) return <p className="feedback bad mt-8">{cardError}</p>;

  const log = await loadAttemptLog(supabase, child.id);
  if (log.error) return <p className="feedback bad mt-8">{log.error}</p>;

  const placement = await loadPlacement(supabase, child.id);
  const anchor = practiceAnchor(placement.placement, access.working);
  const home = studentHome({
    grade: access.working,
    cards,
    attempts: log.attempts,
    today: torontoDate(),
    startSkillId: anchor.startSkillId,
  });

  return (
    <StudentDashboard
      childId={child.id}
      childName={child.first_name}
      grade={access.working}
      home={home}
      skills={describeCatalog(access, cards, anchor.startSkillId)}
      access={access}
      requestedGrade={access.requested}
    />
  );
}
