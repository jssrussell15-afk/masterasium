import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SignupReady } from "@/components/signup-ready";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { requireUser } from "@/lib/auth/session";
import { readRememberedChildren, TABLET_CHILDREN_COOKIE } from "@/lib/children/tablet";
import { friendlyDbError } from "@/lib/db-error";
import { isSupportedGrade } from "@/lib/grades";

export const metadata: Metadata = {
  title: "Child set up · Masterasium",
};

export default async function SignupReadyPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("children")
    .select("id, first_name, grade")
    .eq("id", childId)
    .maybeSingle();

  const grade = data?.grade;
  const ready = data && typeof grade === "number" && isSupportedGrade(grade);
  const store = await cookies();
  const remembered = Boolean(
    ready &&
      readRememberedChildren(store.get(TABLET_CHILDREN_COOKIE)?.value).some((child) => child.id === data.id),
  );

  return (
    <Shell narrow role="parent" action={<SignOutButton />}>
      <section className="card mt-8">
        {ready ? (
          <SignupReady
            firstName={data.first_name}
            grade={grade}
            childId={data.id}
            remembered={remembered}
          />
        ) : (
          <p className="feedback bad" role="alert">
            {error ? friendlyDbError(error) : "That child is not on this account."}
          </p>
        )}
      </section>
    </Shell>
  );
}
