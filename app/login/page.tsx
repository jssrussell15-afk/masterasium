import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { Shell } from "@/components/site-header";

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Shell narrow action={<Link href="/signup" className="btn btn-secondary">Create account</Link>}>
      <Suspense fallback={<p className="status">Loading…</p>}>
        <LoginBody searchParams={props.searchParams} />
      </Suspense>
    </Shell>
  );
}

async function LoginBody({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const params = await searchParams;
  const confirmFailed = params.error === "confirm";

  return (
    <section className="card mt-8 grid gap-4">
      <div>
        <h1 className="display text-4xl">Sign in</h1>
        <p className="hint mt-2">Parent accounts only. Practice is free while we test.</p>
      </div>
      {confirmFailed ? (
        <p className="feedback bad" role="alert">
          That confirmation link did not work. Try signing in, or create the account again.
        </p>
      ) : null}
      <AuthForm mode="sign-in" />
      <p className="text-sm">
        New here?{" "}
        <Link href="/signup" className="nav-link">
          Create a free account
        </Link>
      </p>
    </section>
  );
}
