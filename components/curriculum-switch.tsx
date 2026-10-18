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
  const available = PROVINCES.filter((item) => item.ready && item.slug !== "quebec");
  const moreComing = PROVINCES.some((item) => !item.ready && item.slug !== "quebec");

  return (
    <div className="switch-bar">
      <div className="province-pick">
        <div className="pill-row" role="group" aria-label="Province">
          {available.map((item) => (
            <Link
              key={item.slug}
              href={curriculumPath(item.slug, grade)}
              aria-current={item.slug === province ? "page" : undefined}
              aria-label={item.name}
            >
              {item.name}
            </Link>
          ))}
        </div>
        {moreComing ? <p className="province-soon">More provinces coming soon.</p> : null}
      </div>
      <div className="pill-row" role="group" aria-label="Grade">
        {([1, 2, 3, 4, 5, 6, 7, 8] as SupportedGrade[]).map((item) => (
          <Link
            key={item}
            href={curriculumPath(province, item)}
            aria-current={item === grade ? "page" : undefined}
            aria-label={`Grade ${item}`}
          >
            {item}
          </Link>
        ))}
      </div>
    </div>
  );
}
