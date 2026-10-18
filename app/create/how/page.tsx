import { HowCreateWorks } from "@/components/create/flow";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { requireStudent } from "@/lib/auth/student";

export default async function CreateHowPage() {
  const session = await requireStudent();
  return (
    <Shell narrow role="student" action={<SignOutButton />}>
      {"error" in session ? <p className="feedback bad mt-8">{session.error}</p> : <HowCreateWorks />}
    </Shell>
  );
}
