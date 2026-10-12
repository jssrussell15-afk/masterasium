type DbError = {
  message: string;
  code?: string;
};

export function friendlyDbError(error: DbError): string {
  const message = error.message.toLowerCase();
  if (error.message.includes("at most 2")) {
    return "This account already has 2 children.";
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
