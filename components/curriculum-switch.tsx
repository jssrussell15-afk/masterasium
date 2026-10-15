import Link from "next/link";
import { curriculumPath } from "@/lib/curriculum/overview";
import { PROVINCES } from "@/lib/curriculum/provinces";
import type { SupportedGrade } from "@/lib/grades";

export function CurriculumSwitch({
  province,
  grade,
}: {
  province: string;
  grade: SupportedGrade;
}) {
  return (
    <div className="switch-bar">
      <div className="pill-row" role="group" aria-label="Province">
        {PROVINCES.map((item) =>
          item.ready ? (
            <Link
              key={item.slug}
              href={curriculumPath(item.slug, grade)}
              aria-pressed={item.slug === province}
              aria-label={item.name}
              title={item.name}
            >
              {item.short}
            </Link>
          ) : (
            <span
              key={item.slug}
              aria-disabled="true"
              title={`The ${item.name} skill list is not published yet.`}
            >
              {item.short}
            </span>
          ),
        )}
      </div>
      <div className="pill-row" role="group" aria-label="Grade">
        {([1, 2, 3, 4, 5, 6, 7, 8] as SupportedGrade[]).map((item) => (
          <Link
            key={item}
            href={curriculumPath(province, item)}
            aria-pressed={item === grade}
            aria-label={`Grade ${item}`}
          >
            {item}
          </Link>
        ))}
      </div>
    </div>
  );
}
