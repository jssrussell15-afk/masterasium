import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SundayNote } from "@/components/sunday-note";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { requireUser } from "@/lib/auth/session";
import { buildSundayDigest } from "@/lib/digest/sunday";
import { torontoDate } from "@/lib/digest/build";
import { buildParentProgress } from "@/lib/lesson/parent";
import { loadParentBundle } from "@/lib/lesson/store";

export default function DigestPreviewPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  return (
    <Shell role="parent" action={<SignOutButton />}>
      <Suspense fallback={<p className="status mt-10">Preparing the Sunday note…</p>}>
        <DigestLoader params={params} />
      </Suspense>
    </Shell>
  );
}

async function DigestLoader({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("children")
    .select("id, first_name")
    .eq("id", childId)
    .eq("parent_id", user.id)
    .maybeSingle();
  if (error) return <p className="feedback bad mt-8">{error.message}</p>;
  if (!data) notFound();

  const bundle = await loadParentBundle(supabase, childId);
  const progress = buildParentProgress({
    today: torontoDate(),
    lessons: bundle.lessons,
    reviews: bundle.reviews,
    attempts: bundle.attempts,
    solved: bundle.solved,
    repaired: bundle.repaired,
  });
  const digest = buildSundayDigest(data.first_name, progress);
  // TODO: call sendSundayDigest(digest) when an email provider is chosen.
  // This preview only renders the note. It does not send email.

  return (
    <div className="mt-6 grid gap-4">
      <p className="question-back">
        <Link href="/dashboard">Parent desk</Link>
      </p>
      {bundle.missing ? (
        <p className="hint">
          The lesson tables are not applied yet, so this note is mostly empty. Nothing is emailed.
        </p>
      ) : null}
      <SundayNote digest={digest} />
    </div>
  );
}
