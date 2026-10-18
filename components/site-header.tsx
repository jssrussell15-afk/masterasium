import Link from "next/link";
import type { ReactNode } from "react";
import { homeFor, navFor, type Role } from "@/lib/auth/roles";

export function SiteHeader({
  action,
  role = "public",
  homeHref,
  slimLink,
}: {
  action?: ReactNode | null;
  role?: Role | "public";
  homeHref?: string;
  slimLink?: { href: string; label: string };
}) {
  const links = navFor(role);
  return (
      <header
        className={`mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between ${role === "parent" ? "parent-page" : ""}`}
      >
      <Link href={homeHref ?? homeFor(role)} className="wordmark">
        Masterasium
      </Link>
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm sm:justify-end">
        {links.length === 0 ? (
          <Link href={homeHref ?? homeFor(role)} className="header-home">
            Home
          </Link>
        ) : null}
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="nav-link">
            {link.label}
          </Link>
        ))}
        {role === "public" ? (
          <Link href="/login?as=student" className="student-entry">
            Student sign in
          </Link>
        ) : null}
        {action === undefined ? (
          <Link href="/login" className="btn btn-primary">
            Sign in
          </Link>
        ) : (
          action
        )}
        {slimLink ? (
          <Link href={slimLink.href} className="auth-slim">
            {slimLink.label}
          </Link>
        ) : null}
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
  slimLink,
}: {
  children: ReactNode;
  action?: ReactNode | null;
  narrow?: boolean;
  banner?: boolean;
  role?: Role | "public";
  homeHref?: string;
  slimLink?: { href: string; label: string };
}) {
  const screen = (
    <>
      {banner ? <img src="/banner.png" alt="" className="page-banner" /> : null}
      <SiteHeader action={action} role={role} homeHref={homeHref} slimLink={slimLink} />
      <main
        className={`mx-auto flex w-full flex-1 flex-col px-6 pb-16 ${narrow ? "max-w-xl" : "max-w-5xl"} ${role === "parent" ? "parent-page" : ""}`}
      >
        {children}
      </main>
      <footer className="site-footer">
        <p>Practice is free while we test.</p>
      </footer>
    </>
  );
  if (!slimLink) return screen;
  return <div className="auth-screen contents">{screen}</div>;
}
