import Link from "next/link";
import { Shell } from "@/components/site-header";
import { JURISDICTIONS } from "@/lib/curriculum/jurisdictions";
import { readSlug } from "@/lib/curriculum/request-slug";

const PUBLISHED = JURISDICTIONS.filter((item) => item.publishStatus === "published");

export default function CurriculumNotFound() {
  const jurisdiction = JURISDICTIONS.find((item) => item.slug === readSlug());
  const comingSoon = jurisdiction?.publishStatus === "coming_soon";
  return (
    <Shell narrow>
      <section className="card mt-8">
        <h1 className="display text-4xl">That page is not here</h1>
        {comingSoon ? (
          <p className="mt-4">
            {jurisdiction.name} is coming soon. We publish a province only after checking its current official curriculum.
          </p>
        ) : (
          <p className="mt-4">This grade is not published. Choose a province we have checked.</p>
        )}
        <ul className="strand-list">
          {PUBLISHED.map((item) => (
            <li key={item.slug}>
              <Link href={`/curriculum/${item.slug}/grade-1`}>{item.name}</Link>
            </li>
          ))}
        </ul>
      </section>
    </Shell>
  );
}
