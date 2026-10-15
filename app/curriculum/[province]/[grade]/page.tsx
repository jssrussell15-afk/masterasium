import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CurriculumSwitch } from "@/components/curriculum-switch";
import { SampleRequest } from "@/components/sample-request";
import { Shell } from "@/components/site-header";
import { curriculumOverview } from "@/lib/curriculum/overview";
import { PROVINCES } from "@/lib/curriculum/provinces";
import type { SupportedGrade } from "@/lib/grades";

type RouteParams = { province: string; grade: string };

export function generateStaticParams(): RouteParams[] {
  const grades: SupportedGrade[] = [1, 2, 3, 4, 5, 6, 7, 8];
  return PROVINCES.filter((province) => province.ready).flatMap((province) =>
    grades.map((grade) => ({ province: province.slug, grade: `grade-${grade}` })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { province, grade } = await params;
  const page = curriculumOverview(province, grade);
  if (!page) return { title: "Curriculum" };
  return {
    title: `Grade ${page.grade} math curriculum in ${page.province.name}`,
    description: page.intro,
  };
}

export default async function CurriculumPage({ params }: { params: Promise<RouteParams> }) {
  const { province, grade: gradeSlug } = await params;
  const page = curriculumOverview(province, gradeSlug);
  if (!page) notFound();
  const skills = page.strands.flatMap((strand) => strand.skills);

  return (
    <Shell>
      <div className="mt-6 grid gap-6">
        <CurriculumSwitch province={page.province.slug} grade={page.grade} />
        <div>
          <h1 className="display text-4xl md:text-5xl">
            Grade {page.grade} math in {page.province.name}
          </h1>
          <p className="lede mt-3 max-w-2xl">{page.intro}</p>
        </div>
        <div className="grid gap-6">
          {page.strands.map((strand) => (
            <section key={strand.id} aria-labelledby={`strand-${strand.id}`}>
              <h2 id={`strand-${strand.id}`} className="text-lg font-semibold">
                {strand.label}
              </h2>
              <ul className="strand-list">
                {strand.skills.map((skill) => (
                  <li key={skill.id}>
                    <p className="font-semibold">{skill.title}</p>
                    <p className="hint">{skill.line}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <SampleRequest
            province={page.province.slug}
            provinceName={page.province.name}
            grade={page.grade}
            skills={skills}
          />
          <Link href="/signup" className="btn btn-primary">
            Start free trial
          </Link>
        </div>
      </div>
    </Shell>
  );
}
