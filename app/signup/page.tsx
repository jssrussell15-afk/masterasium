import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Shell } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Create a parent account · Masterasium",
};

export default function SignUpPage() {
  return (
    <Shell
      narrow
      slimLink={{ href: "/login", label: "Sign in" }}
      action={
        <Link href="/login" className="btn btn-secondary">
          Sign in
        </Link>
      }
    >
      <section className="card mt-8 grid gap-4">
        <AuthForm
          mode="sign-up"
          before={
            <div>
              <p className="step-kicker">Step 1 of 2</p>
              <h1 className="display text-4xl">Create a parent account</h1>
              <p className="hint mt-2">Email and a password. Next, you&apos;ll add your child.</p>
              <p className="hint mt-2">Practice is free while we test.</p>
            </div>
          }
        />
        <p className="text-sm">
          Already have an account?{" "}
          <Link href="/login" className="nav-link">
            Sign in
          </Link>
        </p>
      </section>
    </Shell>
  );
}
