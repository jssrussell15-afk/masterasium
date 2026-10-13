type DbError = {
  message: string;
  code?: string;
};

export function friendlyDbError(error: DbError): string {
  const message = error.message.toLowerCase();
  if (error.message.includes("at most 2")) {
    return "This account already has 2 children.";
  }
  if (message.includes("children_grade_check")) {
    return "Grades 2 through 8 are not allowed in the database yet. In the Supabase SQL editor, paste: alter table public.children drop constraint if exists children_grade_check; alter table public.children add constraint children_grade_check check (grade between 1 and 8);";
  }
  if (message.includes("worksheet") || message.includes("open_practice_set")) {
    return "The worksheet tables are not in the database yet. Paste the worksheet setup statements shown on this page into the Supabase SQL editor.";
  }
  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  ) {
    return "The database tables are missing. Run supabase/migrations/001_init.sql in the Supabase SQL editor.";
  }
  return error.message;
}
