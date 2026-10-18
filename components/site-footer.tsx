import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <nav aria-label="About">
          <Link href="/for-parents">For parents</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <p>Practice is free while we test.</p>
      </div>
    </footer>
  );
}
