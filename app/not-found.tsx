import Link from "next/link";
import { sessionChrome } from "@/components/header-auth";
import { Shell } from "@/components/site-header";

export default async function NotFound() {
  const chrome = await sessionChrome();
  return (
    <Shell narrow {...chrome}>
      <section className="card mt-8">
        <h1 className="display text-4xl">That page is not here</h1>
        <Link href="/" className="btn btn-primary mt-5">
          Back home
        </Link>
      </section>
    </Shell>
  );
}
