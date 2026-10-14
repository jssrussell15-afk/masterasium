import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { StudentLoginForm } from "@/components/student-login-form";
import { Shell } from "@/components/site-header";

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Suspense
      fallback={
        <Shell narrow>
          <p className="status">Loading…</p>
        </Shell>
      }
    >
      <LoginBody searchParams={props.searchParams} />
    </Suspense>
  );
}

async function LoginBody({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const params = await searchParams;
  const requested = Array.isArray(params.as) ? params.as[0] : params.as;
  const mode = requested === "student" ? "student" : "parent";
  const confirmFailed = params.error === "confirm";

  return (
    <Shell
      narrow
      role={mode === "student" ? "student" : "public"}
      homeHref="/"
      action={
        mode === "parent" ? (
          <Link href="/signup" className="btn btn-secondary">
            Create account
          </Link>
        ) : null
      }
    >
    <section className="card mt-8 grid gap-4">
      <div className="segmented" role="group" aria-label="Who is signing in">
        <Link href="/login" aria-pressed={mode === "parent"}>
          Parent
        </Link>
        <Link href="/login?as=student" aria-pressed={mode === "student"}>
          Student
        </Link>
      </div>

      {mode === "parent" ? (
        <>
          <div>
            <h1 className="display text-4xl">Parent sign in</h1>
            <p className="hint mt-2">
              Email and password. This account holds enrollment, account settings, and the parent
              desk. Practice is free while we test.
            </p>
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
              Create a free parent account
            </Link>
          </p>
        </>
      ) : (
        <>
          <div>
            <h1 className="display text-4xl">Student sign in</h1>
            <p className="hint mt-2">
              Username and PIN. This opens practice only. A parent creates the login. If you forget
              the PIN, ask them to reset it. Students cannot reset it themselves.
            </p>
          </div>
          <StudentLoginForm />
        </>
      )}
    </section>
    </Shell>
  );
}
