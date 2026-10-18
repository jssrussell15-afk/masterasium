import { Shell } from "@/components/site-header";
import { StudentDashboard } from "@/components/student-dashboard";
import { gradeAccessFrom } from "@/lib/practice/grade-access";
import type { SkillProgress } from "@/lib/practice/types";

export const metadata = { robots: { index: false, follow: false }, title: "Create home sample" };

export default function PreviewCreateHome() {
  const access = gradeAccessFrom({ enrolled: 3 });
  if (!access) return null;
  const skills: SkillProgress[] = [];
  return (
    <Shell narrow role="student" action={null} homeHref="/preview/create/home">
      <StudentDashboard
        childId="preview-child"
        childName="Sam"
        grade={3}
        home={{
          assigned: [{ id: "g3-place", title: "Place value", grade: 3, note: "A short practice" }],
          recommended: [],
          recent: [],
        }}
        skills={skills}
        access={access}
        requestedGrade={null}
        createEnabled
        createHref="/preview/create"
      />
    </Shell>
  );
}
