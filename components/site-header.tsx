import Link from "next/link";
import type { ReactNode } from "react";

export function SiteHeader({ action }: { action?: ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-5">
      <Link href="/" className="wordmark">
        Masterasium
      </Link>
      <nav className="flex items-center gap-4 text-sm">
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
