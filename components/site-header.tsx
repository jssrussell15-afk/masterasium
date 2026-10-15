import Link from "next/link";
import type { ReactNode } from "react";

export function SiteHeader({
  action,
  role = "public",
  homeHref,
}: {
  action?: ReactNode | null;
  role?: "public" | "parent" | "student";
  homeHref?: string;
}) {
  return (
    <header className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <Link href={homeHref ?? (role === "student" ? "/practice" : "/")} className="wordmark">
        Masterasium
      </Link>
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm sm:justify-end">
        {role === "student" ? null : (
          <>
            <Link href="/curriculum/ontario/grade-1" className="nav-link">
              Curriculum
            </Link>
            <Link href="/worksheets" className="nav-link">
              Worksheets
            </Link>
            <Link href="/dashboard" className="nav-link">
              Parent desk
            </Link>
          </>
        )}
        {role === "parent" ? (
          <Link href="/settings" className="nav-link">
            Account settings
          </Link>
        ) : null}
        {action === undefined ? (
          <Link href="/login" className="btn btn-primary">
            Sign in
          </Link>
        ) : (
          action
        )}
      </nav>
    </header>
  );
}

export function Shell({
  children,
  action,
  narrow = false,
  banner = false,
  role = "public",
  homeHref,
}: {
  children: ReactNode;
  action?: ReactNode | null;
  narrow?: boolean;
  banner?: boolean;
  role?: "public" | "parent" | "student";
  homeHref?: string;
}) {
  return (
    <>
      {banner ? <img src="/banner.png" alt="" className="page-banner" /> : null}
      <SiteHeader action={action} role={role} homeHref={homeHref} />
      <main
        className={`mx-auto flex w-full flex-1 flex-col px-6 pb-16 ${narrow ? "max-w-xl" : "max-w-5xl"}`}
      >
        {children}
      </main>
    </>
  );
}
