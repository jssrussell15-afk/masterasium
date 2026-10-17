import { CHILD_NAME_GRADE_SETUP_SQL } from "@/lib/children/name-grade-setup-sql";

export function ChildNameSetupSql() {
  return (
    <details className="setup-sql">
      <summary>Child profile statements</summary>
      <p className="hint mt-2">
        Paste these after the grade progress statements. Signup can then save the child's name and
        grade and open practice. Paste this copy again if an earlier one is already in the database.
        A PIN is set later from the parent desk. The sign-in name is the child's first name.
      </p>
      <pre>{CHILD_NAME_GRADE_SETUP_SQL}</pre>
    </details>
  );
}
