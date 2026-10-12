import Link from "next/link";
import { Shell } from "@/components/site-header";

export default function NotFound() {
  return (
    <Shell narrow>
      <section className="card mt-8">
        <h1 className="display text-4xl">That page is not here</h1>
        <Link href="/" className="btn btn-primary mt-5">
          Back home
        </Link>
      </section>
    </Shell>
  );
}
