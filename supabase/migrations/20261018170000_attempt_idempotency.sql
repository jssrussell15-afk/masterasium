-- One client attempt id records a first try once.
-- A retry that reaches the server again does not add a second attempt.
-- Do not apply this file to hosted Supabase from the app.

alter table public.attempts
  add column if not exists client_attempt_id uuid;

alter table public.attempts
  add column if not exists learning_applied boolean not null default false;

create unique index if not exists attempts_client_attempt_idx
  on public.attempts (child_id, client_attempt_id)
  where client_attempt_id is not null;
