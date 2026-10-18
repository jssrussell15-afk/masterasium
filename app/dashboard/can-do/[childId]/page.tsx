import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ParentCanDoAll } from "@/components/can-do-list";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { requireUser } from "@/lib/auth/session";
import { parentCanDoChildId } from "@/lib/can-do/access";
import { loadCanDo } from "@/lib/can-do/load";
import { loadRoster } from "@/lib/children/roster";
import { torontoDate } from "@/lib/digest/build";
import { isSupportedGrade } from "@/lib/grades";

export const metadata = {
  title: "Can do now",
};

export default function ParentCanDoPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  return (
    <Shell role="parent" action={<SignOutButton />}>
      <Suspense fallback={<p className="status mt-10">Loading skills…</p>}>
        <ParentCanDoLoader params={params} />
      </Suspense>
    </Shell>
  );
}

async function ParentCanDoLoader({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const { supabase, user } = await requireUser();
  const roster = await loadRoster(supabase, user.id);
  if (roster.error) return <p className="feedback bad mt-8">{roster.error}</p>;

  const allowed = parentCanDoChildId(
    roster.children.map((child) => child.id),
    childId,
  );
  if (!allowed) notFound();

  const child = roster.children.find((item) => item.id === allowed);
  if (!child) notFound();
  if (!isSupportedGrade(child.workingGrade)) {
    return (
      <div className="mt-6 grid gap-3">
        <Link className="can-do-entry" href="/dashboard">
          Parent desk
        </Link>
        <p className="hint">Grade {child.grade} is not open yet.</p>
      </div>
    );
  }

  const loaded = await loadCanDo(supabase, {
    childId: allowed,
    grade: child.workingGrade,
    today: torontoDate(),
    showReviewLinks: false,
  });
  if (loaded.error || !loaded.view) {
    return <p className="feedback bad mt-8">{loaded.error ?? "Could not load skills."}</p>;
  }

  return (
    <div className="mt-6 grid gap-4">
      <Link className="can-do-entry" href="/dashboard">
        Parent desk
      </Link>
      <ParentCanDoAll view={loaded.view} childName={child.first_name} />
    </div>
  );
}
