import Link from "next/link";
import { Suspense } from "react";
import { AddChildForm } from "@/components/add-child-form";
import { DigestPanel } from "@/components/digest-panel";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { friendlyDbError } from "@/lib/db-error";
import { renderDigestText, type DigestSummary } from "@/lib/digest/build";
import { isSupportedGrade } from "@/lib/grades";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureProfile, requireUser } from "@/lib/auth/session";
import { formatAccuracy } from "@/lib/practice/format";
import { accuracyScheduler } from "@/lib/practice/scheduler";
import { loadCards, totals } from "@/lib/practice/session";

export default function DashboardPage() {
  return (
    <Shell action={<SignOutButton />}>
      <Suspense fallback={<p className="status mt-10">Loading the parent desk…</p>}>
        <Desk />
      </Suspense>
    </Shell>
  );
}

type ChildRow = {
  id: string;
  first_name: string;
  grade: number;
};

async function Desk() {
  const { supabase, user } = await requireUser();
  const profileError = await ensureProfile(supabase, user.id);

  const { data, error } = await supabase
    .from("children")
    .select("id, first_name, grade")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: true });

  const problem = profileError ?? error;
  if (problem) {
    return <p className="feedback bad mt-8">{friendlyDbError(problem)}</p>;
  }

  const children = (data ?? []) as ChildRow[];

  return (
    <div className="mt-6 grid gap-6">
      <div>
        <p className="eyebrow">Parent desk</p>
        <h1 className="display mt-2 text-4xl">Your children</h1>
        <p className="hint mt-2">{user.email}</p>
      </div>

      {children.length === 0 ? (
        <p className="hint">Add a child to start practice. First name only, up to two.</p>
      ) : (
        <div className="grid gap-4">
          {children.map((child) => (
            <ChildCard key={child.id} child={child} supabase={supabase} />
          ))}
        </div>
      )}

      {children.length < 2 ? <AddChildForm /> : <p className="hint">Two children is the limit on this account.</p>}
    </div>
  );
}

async function ChildCard({
  child,
  supabase,
}: {
  child: ChildRow;
  supabase: SupabaseClient;
}) {
  if (!isSupportedGrade(child.grade)) {
    return (
      <article className="card">
        <h2 className="text-2xl font-semibold">{child.first_name}</h2>
        <p className="hint mt-2">Grade {child.grade} is not open yet.</p>
      </article>
    );
  }

  const { cards, error } = await loadCards(supabase, child.id);
  if (error) return <p className="feedback bad">{error}</p>;

  const score = totals(cards);
  const focus = accuracyScheduler.chooseSkill({
    grade: child.grade,
    cards,
    sessionCount: 0,
  });

  const { data: stub } = await supabase
    .from("digest_stubs")
    .select("summary")
    .eq("child_id", child.id)
    .order("period_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const saved = stub?.summary ? renderDigestText(stub.summary as DigestSummary) : null;

  return (
    <article className="card grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl font-semibold">{child.first_name}</h2>
        <p className="hint">Grade {child.grade}</p>
      </div>
      <div className="stat-grid">
        <div>
          <p>Questions attempted</p>
          <strong>{score.attempted}</strong>
        </div>
        <div>
          <p>Accuracy</p>
          <strong>{formatAccuracy(score.attempted, score.correct)}</strong>
        </div>
        <div>
          <p>Current focus</p>
          <strong>{focus.title}</strong>
        </div>
      </div>
      <Link href={`/practice/${child.id}`} className="btn btn-primary w-fit">
        Practice
      </Link>
      <DigestPanel childId={child.id} savedText={saved} />
    </article>
  );
}
