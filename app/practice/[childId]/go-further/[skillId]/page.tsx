import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GoFurtherSession } from "@/components/go-further-session";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { requireStudent } from "@/lib/auth/student";
import { torontoDate } from "@/lib/digest/build";
import { buildGoFurtherSet, goFurtherOffered, goFurtherSeed, isGoFurtherSkill } from "@/lib/practice/go-further";
import { loadCards } from "@/lib/practice/session";

export default function GoFurtherPage({
  params,
}: {
  params: Promise<{ childId: string; skillId: string }>;
}) {
  return (
    <Shell narrow role="student" action={<SignOutButton />}>
      <Suspense fallback={<p className="status mt-10">Opening Go further…</p>}>
        <GoFurtherLoader params={params} />
      </Suspense>
    </Shell>
  );
}

async function GoFurtherLoader({
  params,
}: {
  params: Promise<{ childId: string; skillId: string }>;
}) {
  const { childId, skillId } = await params;
  if (!isGoFurtherSkill(skillId)) notFound();

  const session = await requireStudent();
  if ("error" in session) return <p className="feedback bad mt-8">{session.error}</p>;
  if (session.child.id !== childId) return <p className="feedback bad mt-8">That practice session is not available.</p>;

  const loaded = await loadCards(session.supabase, childId);
  if (loaded.error) return <p className="feedback bad mt-8">{loaded.error}</p>;
  const card = loaded.cards.find((item) => item.skillId === skillId);
  if (!goFurtherOffered(skillId, card)) {
    return (
      <p className="hint mt-8">
        Go further opens after this skill is mastered.
      </p>
    );
  }

  const questions = buildGoFurtherSet(skillId, goFurtherSeed(skillId, torontoDate()));
  return <GoFurtherSession questions={questions} childId={childId} backHref="/practice" />;
}
