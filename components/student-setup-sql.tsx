import { NAME_SIGN_IN_SQL } from "@/lib/auth/name-sign-in-sql";
import { STUDENT_LOGIN_SETUP_SQL } from "@/lib/auth/setup-sql";

export function StudentSetupSql({ open = false }: { open?: boolean }) {
  return (
    <details className="setup-sql" open={open}>
      <summary>Copy these statements into the Supabase SQL editor</summary>
      <pre>{`${STUDENT_LOGIN_SETUP_SQL}\n${NAME_SIGN_IN_SQL}`}</pre>
    </details>
  );
}
