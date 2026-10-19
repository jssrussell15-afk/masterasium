# RLS test plan

Policies are checked from the migration text in unit tests. They are not applied to hosted Supabase from the app.

## Attempts

`public.attempts` keeps the policies from `supabase/migrations/005_student_login.sql`:

- `parents read attempt scores` — a parent reads only their own children.
- `students read their attempts` and `students insert their attempts` — a student touches only `current_student_id()`.

## Re-teach events

`20261018180106_reteach_catch_up.sql` adds `public.reteach_events` with the same scope:

- Students insert, update, and read only their own rows.
- Parents select only rows whose child belongs to `auth.uid()`.
- `reteach_rate_counts()` runs only when `is_content_admin()` is true. The result columns are skill, prerequisite, and counts. There is no child id.
- Execute is granted to `authenticated` and revoked from `anon`.

## Content items

`manipulative`, `cra_stage`, and `segment_variant` are columns on `content_items`. Published-read and admin-write policies are unchanged. Catch-up rows in this migration stay `draft`.
