import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { requireStudent } from "@/lib/auth/student";

export default async function PracticeIndexPage() {
  const session = await requireStudent();
  if ("error" in session) {
    return (
      <Shell narrow banner role="student" action={<SignOutButton />}>
        <p className="feedback bad mt-8">{session.error}</p>
      </Shell>
    );
  }
  redirect(`/practice/${session.child.id}`);
}
