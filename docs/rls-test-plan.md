# RLS test plan

Policies are checked from the migration text in unit tests. They are not applied to hosted Supabase from the app.

## Attempts

`public.attempts` already has parent and student policies from `supabase/migrations/005_student_login.sql`:

- `parents read attempt scores` — `authenticated` select, only when `children.parent_id = auth.uid()`.
- `students read their attempts` — `anon` select, only when `child_id = current_student_id()`.
- `students insert their attempts` — `anon` insert, only when `child_id = current_student_id()`.

`20261018175541_strategy_tagging.sql` adds `strategy`, `strategy_source`, `strategy_confidence`, and `interaction_trace` on that table. It does not create a new attempts policy and it does not grant attempts to a new role. A parent still cannot read another family's rows. A student still cannot insert a row for another child.

`lane` and `difficulty` were added earlier in `20261018164025_content_store.sql`. The strategy migration adds them only if that file has not been applied.

## Content items

`expected_strategies` is a column on `content_items`. The existing policies still apply: anon and authenticated can select published rows, and only an admin can write.

## What a reviewer checks

- The strategy migration contains no `create policy` on `public.attempts`.
- The strategy migration contains no `grant` on `public.attempts`.
- `strategy_confidence` is constrained to 0–1.
- `interaction_trace` is at most 800 bytes and the column comment names the 12-month roll-up.
- `expected_strategies` values are limited to the strategy list.
