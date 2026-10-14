import { STUDENT_LOGIN_SETUP_SQL } from "@/lib/auth/setup-sql";

export function StudentSetupSql({ open = false }: { open?: boolean }) {
  return (
    <details className="setup-sql" open={open}>
      <summary>Copy these statements into the Supabase SQL editor</summary>
      <pre>{STUDENT_LOGIN_SETUP_SQL}</pre>
    </details>
  );
}
