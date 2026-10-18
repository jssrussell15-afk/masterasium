import Link from "next/link";
import { SHOW_COMING_SOON_PILLS } from "@/lib/curriculum/config";
import type { Jurisdiction } from "@/lib/curriculum/jurisdictions";
import {
  gradeHref,
  hasPublishedSequence,
  pillProvinces,
  provinceHref,
  publishedGrades,
} from "@/lib/curriculum/view";
import type { SupportedGrade } from "@/lib/grades";

export function CurriculumSwitch({
  province,
  provinceCode,
  grade,
  view,
  showSequenceToggle,
  jurisdictions,
}: {
  province: string;
  provinceCode: string;
  grade: SupportedGrade;
  view: "strands" | "sequence" | null;
  showSequenceToggle: boolean;
  /** Defaults to the live jurisdiction list. Tests pass an override. */
  jurisdictions?: Jurisdiction[];
}) {
  const provinces = jurisdictions ?? pillProvinces(SHOW_COMING_SOON_PILLS);
  const grades = publishedGrades(provinceCode);
  const activeView = view === "sequence" && hasPublishedSequence(provinceCode, grade) ? "sequence" : null;
  return (
    <div className="switch-bar">
      <div className="pill-row" role="group" aria-label="Province">
        {provinces.map((item) =>
          item.publishStatus === "published" ? (
            <Link
              key={item.slug}
              href={provinceHref(item, grade, activeView)}
              aria-current={item.slug === province ? "page" : undefined}
            >
              {item.name}
            </Link>
          ) : (
            <span key={item.slug} aria-disabled="true">
              {item.name} · <span className="pill-soon">Coming soon</span>
            </span>
          ),
        )}
      </div>
      {showSequenceToggle ? (
        <div className="segmented" role="group" aria-label="Curriculum view">
          <Link href={gradeHref(province, grade, null)} aria-current={activeView === "sequence" ? undefined : "page"}>
            By strand
          </Link>
          <Link href={gradeHref(province, grade, "sequence")} aria-current={activeView === "sequence" ? "page" : undefined}>
            Suggested order
          </Link>
        </div>
      ) : null}
      <div className="pill-row" role="group" aria-label="Grade">
        {([1, 2, 3, 4, 5, 6, 7, 8] as SupportedGrade[]).map((item) =>
          grades.includes(item) ? (
            <Link
              key={item}
              href={gradeHref(province, item, activeView)}
              aria-current={item === grade ? "page" : undefined}
              aria-label={`Grade ${item}`}
            >
              {item}
            </Link>
          ) : (
            <span key={item} aria-disabled="true">
              {item} <span className="pill-soon">Coming soon</span>
            </span>
          ),
        )}
      </div>
    </div>
  );
}
