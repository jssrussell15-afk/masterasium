type DbError = {
  message: string;
  code?: string;
};

export const STUDENT_LOGIN_SETUP_MESSAGE =
  "Student sign-in is not ready yet. Practice can start once the database is updated.";

export const GRADE_PROGRESS_SETUP_MESSAGE =
  "Grade progress is not ready yet. Practice can start once the database is updated.";

export function isGradeProgressMissing(error: DbError): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("working_grade") ||
    message.includes("next_grade_unlocked") ||
    message.includes("requested_grade") ||
    message.includes("adopt_working_grade") ||
    message.includes("request_working_grade") ||
    message.includes("set_next_grade_unlock") ||
    message.includes("decide_grade_request")
  );
}

export function isStudentLoginMissing(error: DbError): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("start_student_session") ||
    message.includes("student_name_key") ||
    message.includes("create_child_profile") ||
    message.includes("set_student_login") ||
    message.includes("reset_student_pin") ||
    message.includes("end_student_session") ||
    message.includes("pin_hash") ||
    message.includes("student_sessions") ||
    message.includes("student_login_attempts") ||
    message.includes("current_student_id") ||
    (message.includes("username") &&
      (message.includes("does not exist") || message.includes("schema cache")))
  );
}

export function friendlyDbError(error: DbError): string {
  const message = error.message.toLowerCase();
  if (error.message.includes("at most 2")) {
    return "This account already has 2 children.";
  }
  if (message.includes("children_grade_check")) {
    return "Grades 2 through 8 are not allowed in the database yet. In the Supabase SQL editor, paste: alter table public.children drop constraint if exists children_grade_check; alter table public.children add constraint children_grade_check check (grade between 1 and 8);";
  }
  if (message.includes("already has a username") || message.includes("reset the pin instead")) {
    return "This student already has a username. Reset the PIN from account settings.";
  }
  if (
    error.code === "23505" &&
    (message.includes("username") || message.includes("children_username"))
  ) {
    return "That username is already taken.";
  }
  if (message.includes("username or pin")) {
    return "That username or PIN is not right.";
  }
  if (message.includes("no grade request")) {
    return "There is no grade request to review.";
  }
  if (message.includes("last grade")) {
    return "Grade 8 is the last grade.";
  }
  if (message.includes("approve that grade")) {
    return "Ask a parent to approve that grade.";
  }
  if (
    (message.includes("create_child_profile") || message.includes("create_signup_child")) &&
    !message.includes("p_username") &&
    !message.includes("p_pin")
  ) {
    return "A child cannot be saved yet. The child profile is not ready in the database.";
  }
  if (isGradeProgressMissing(error)) {
    return GRADE_PROGRESS_SETUP_MESSAGE;
  }
  if (isStudentLoginMissing(error)) {
    return STUDENT_LOGIN_SETUP_MESSAGE;
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
