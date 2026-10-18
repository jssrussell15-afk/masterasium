import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CurriculumGrade } from "@/components/curriculum-grade";
import { sessionChrome } from "@/components/header-auth";
import { Shell } from "@/components/site-header";
import { jurisdictionBySlug } from "@/lib/curriculum/jurisdictions";
import { gradeFromSlug, isGradePublished, loadGradePage, staticCurriculumParams } from "@/lib/curriculum/view";

type RouteParams = { province: string; grade: string };

export const revalidate = 86400;

export function generateStaticParams(): RouteParams[] {
  return staticCurriculumParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { province, grade } = await params;
  const gradeNumber = gradeFromSlug(grade);
  const page = gradeNumber ? loadGradePage(province, gradeNumber, null) : null;
  if (!page) return { title: "Curriculum" };
  return {
    title: `Grade ${page.grade} math curriculum in ${page.jurisdiction.name}`,
    description: page.intro,
  };
}

export default async function CurriculumPage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<{ view?: string; from?: string }>;
}) {
  const { province, grade: gradeSlug } = await params;
  const query = await searchParams;
  const gradeNumber = gradeFromSlug(gradeSlug);
  const jurisdiction = jurisdictionBySlug(province);
  if (!gradeNumber || !jurisdiction || jurisdiction.publishStatus === "hidden") notFound();
  if (jurisdiction.publishStatus !== "published" || !isGradePublished(jurisdiction.code, gradeNumber)) notFound();
  const from = query.from && /^[1-8]$/.test(query.from) ? Number(query.from) : null;
  const page = loadGradePage(province, gradeNumber, from);
  if (!page) notFound();
  const view = query.view === "sequence" && page.sequence ? "sequence" : "strands";
  const chrome = await sessionChrome();
  return (
    <Shell {...chrome}>
      <CurriculumGrade page={page} view={view} />
    </Shell>
  );
}
