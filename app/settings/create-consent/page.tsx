import { Suspense } from "react";
import { ConsentScreen } from "@/components/create/consent-screen";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { ensureProfile, requireUser } from "@/lib/auth/session";
import { saveCreateConsent } from "@/lib/create/actions";
import { loadCreateFlags } from "@/lib/create/access";
import { loadRoster } from "@/lib/children/roster";
import { friendlyDbError } from "@/lib/db-error";

export default function ConsentPage(props: PageProps<"/settings/create-consent">) {
  return (
    <Shell role="parent" action={<SignOutButton />}>
      <Suspense fallback={<p className="status mt-8">Loading consent…</p>}>
        <Consent searchParams={props.searchParams} />
      </Suspense>
    </Shell>
  );
}

async function Consent({
  searchParams,
}: {
  searchParams: PageProps<"/settings/create-consent">["searchParams"];
}) {
  const params = await searchParams;
  const childId = Array.isArray(params.child) ? params.child[0] : params.child;
  const { supabase, user } = await requireUser();
  const profileError = await ensureProfile(supabase, user.id);
  if (profileError) return <p className="feedback bad mt-8">{friendlyDbError(profileError)}</p>;
  const roster = await loadRoster(supabase, user.id);
  const child = roster.children.find((item) => item.id === childId) ?? roster.children[0];
  if (!child) return <p className="hint mt-8">Add a child from the parent desk first.</p>;
  const flags = await loadCreateFlags(supabase, child.id);
  return (
    <ConsentScreen
      childName={child.first_name}
      initialAt={flags.consentAt}
      initialVersion={flags.consentVersion}
      save={(grant) => saveCreateConsent(child.id, grant)}
    />
  );
}
