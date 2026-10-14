import { GRADE_PROGRESS_SETUP_SQL } from "@/lib/practice/grade-setup-sql";

export function GradeSetupSql({ open = false }: { open?: boolean }) {
  return (
    <details className="setup-sql" open={open}>
      <summary>Copy the grade progress statements into the Supabase SQL editor</summary>
      <pre>{GRADE_PROGRESS_SETUP_SQL}</pre>
    </details>
  );
}
