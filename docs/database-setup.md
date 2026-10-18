# Database setup statements

Parents do not see SQL on the desk or in account settings. These statements are for someone applying schema by hand. Prefer the files in `supabase/migrations`.

| What it sets up | Source |
| --- | --- |
| Student login (username, PIN, sessions) | `lib/auth/setup-sql.ts` and `lib/auth/name-sign-in-sql.ts` |
| Grade progress (working grade, unlock, request) | `lib/practice/grade-setup-sql.ts` |
| Practice events | `lib/practice/event-setup-sql.ts` |
| Child profile on signup | `lib/children/name-grade-setup-sql.ts` |
| Grade 3 lesson flow | `supabase/migrations/20261018040000_lesson_flow.sql` |

`/settings` and `/dashboard` do not render these statements.
