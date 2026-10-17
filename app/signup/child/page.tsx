import type { Metadata } from "next";
import { SignupChildForm } from "@/components/signup-child-form";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Add your child · Masterasium",
};

export default async function SignUpChildPage() {
  await requireUser();

  return (
    <Shell narrow role="parent" action={<SignOutButton />}>
      <section className="card mt-8">
        <SignupChildForm />
      </section>
    </Shell>
  );
}
