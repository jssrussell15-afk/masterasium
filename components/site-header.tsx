import Link from "next/link";
import type { ReactNode } from "react";

export function SiteHeader({ action }: { action?: ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <Link href="/" className="wordmark">
        Masterasium
      </Link>
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm sm:justify-end">
        <Link href="/worksheets" className="nav-link">
          Worksheets
        </Link>
        <Link href="/dashboard" className="nav-link">
          Parent desk
        </Link>
        {action ?? (
          <Link href="/login" className="btn btn-primary">
            Sign in
          </Link>
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
}: {
  children: ReactNode;
  action?: ReactNode;
  narrow?: boolean;
  banner?: boolean;
}) {
  return (
    <>
      {banner ? <img src="/banner.png" alt="" className="page-banner" /> : null}
      <SiteHeader action={action} />
      <main
        className={`mx-auto flex w-full flex-1 flex-col px-6 pb-16 ${narrow ? "max-w-xl" : "max-w-5xl"}`}
      >
        {children}
      </main>
    </>
  );
}
