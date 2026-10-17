import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { StudentLoginForm } from "@/components/student-login-form";
import { Shell } from "@/components/site-header";
import { readRememberedChildren, TABLET_CHILDREN_COOKIE } from "@/lib/children/tablet";

export async function generateMetadata({
  searchParams,
}: PageProps<"/login">): Promise<Metadata> {
  const params = await searchParams;
  const requested = Array.isArray(params.as) ? params.as[0] : params.as;
  return {
    title:
      requested === "student"
        ? "Student sign in · Masterasium"
        : "Parent sign in · Masterasium",
  };
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Suspense
      fallback={
        <Shell narrow slimLink={{ href: "/signup", label: "Create account" }}>
          <p className="status">Loading…</p>
        </Shell>
      }
    >
      <LoginBody searchParams={props.searchParams} />
    </Suspense>
  );
}

function SignInSwitch({ mode }: { mode: "parent" | "student" }) {
  return (
    <div className="segmented" role="group" aria-label="Who is signing in">
      <Link href="/login" aria-pressed={mode === "parent"}>
        Parent
      </Link>
      <Link href="/login?as=student" aria-pressed={mode === "student"}>
        Student
      </Link>
    </div>
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
  const store = await cookies();
  const students = readRememberedChildren(store.get(TABLET_CHILDREN_COOKIE)?.value);

  return (
    <Shell
      narrow
      role={mode === "student" ? "student" : "public"}
      homeHref="/"
      slimLink={{ href: "/signup", label: "Create account" }}
      action={
        mode === "parent" ? (
          <Link href="/signup" className="btn btn-secondary">
            Create account
          </Link>
        ) : null
      }
    >
    <section className="card mt-8 grid gap-4">
      {mode === "parent" ? (
        <>
          <AuthForm
            mode="sign-in"
            before={
              <>
                <SignInSwitch mode={mode} />
                <div>
                  <h1 className="display text-4xl">Parent sign in</h1>
                  <p className="hint mt-2">
                    Email and password. This account holds enrollment, account settings, and the
                    parent desk. Practice is free while we test.
                  </p>
                </div>
                {confirmFailed ? (
                  <p className="feedback bad" role="alert">
                    That confirmation link did not work. Try signing in, or create the account again.
                  </p>
                ) : null}
              </>
            }
          />
          <p className="text-sm">
            New here?{" "}
            <Link href="/signup" className="nav-link">
              Create a free parent account
            </Link>
          </p>
        </>
      ) : (
        <StudentLoginForm
          students={students}
          before={
            <>
              <SignInSwitch mode={mode} />
              <div>
                <h1 className="display text-4xl">Student sign in</h1>
                <p className="hint mt-2">Tap your name. Ask a grown-up if you forget your PIN.</p>
              </div>
            </>
          }
        />
      )}
    </section>
    </Shell>
  );
}
