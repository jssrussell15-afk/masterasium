import Link from "next/link";
import type { ReactNode } from "react";
import { homeFor, navFor, type Role } from "@/lib/auth/roles";

export function SiteHeader({
  action,
  role = "public",
  homeHref,
}: {
  action?: ReactNode | null;
  role?: Role | "public";
  homeHref?: string;
}) {
  const links = navFor(role);
  return (
    <header className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <Link href={homeHref ?? homeFor(role)} className="wordmark">
        Masterasium
      </Link>
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm sm:justify-end">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="nav-link">
            {link.label}
          </Link>
        ))}
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
  role?: Role | "public";
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
