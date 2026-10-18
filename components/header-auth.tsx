import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { readHeaderSession, type HeaderSession } from "@/lib/auth/header-session";
import { homeFor, type Role } from "@/lib/auth/roles";

export function signInLink(className = "btn btn-primary") {
  return (
    <Link href="/login" className={className}>
      Sign in
    </Link>
  );
}

export function headerAction(session: HeaderSession, signedOut?: ReactNode) {
  if (session.signedIn) return <SignOutButton />;
  return signedOut ?? signInLink();
}

export async function sessionChrome(signInClass = "btn btn-primary"): Promise<{
  role: Role | "public";
  homeHref: string;
  action: ReactNode;
}> {
  const session = await readHeaderSession();
  return {
    role: session.role,
    homeHref: homeFor(session.role),
    action: headerAction(session, signInLink(signInClass)),
  };
}
