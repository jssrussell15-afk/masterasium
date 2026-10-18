import type { ReactNode } from "react";
import { rememberSlug } from "@/lib/curriculum/request-slug";

export default async function CurriculumGradeLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ province: string; grade: string }>;
}) {
  const { province } = await params;
  rememberSlug(province);
  return children;
}
