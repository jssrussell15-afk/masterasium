import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Shell } from "@/components/site-header";

export default function SignUpPage() {
  return (
    <Shell narrow action={<Link href="/login" className="btn btn-secondary">Sign in</Link>}>
      <section className="card mt-8 grid gap-4">
        <div>
          <h1 className="display text-4xl">Create a parent account</h1>
          <p className="hint mt-2">
            Email and a password. This starts the free trial and does not ask for a card. After
            this you can add one or two children, each with a first name, grade, username, and PIN.
          </p>
        </div>
        <AuthForm mode="sign-up" />
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
