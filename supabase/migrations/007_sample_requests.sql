-- Email capture for printed curriculum samples. Consent is required.
-- Paste these statements into the Supabase SQL editor after 006_grade_progress.sql.

create table if not exists public.sample_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 320),
  province text not null check (char_length(province) between 2 and 40),
  grade smallint not null check (grade between 1 and 8),
  consent boolean not null,
  created_at timestamptz not null default now(),
  constraint sample_requests_consent_check check (consent)
);

alter table public.sample_requests enable row level security;

drop policy if exists "anyone can request samples" on public.sample_requests;
create policy "anyone can request samples"
  on public.sample_requests for insert
  to anon, authenticated
  with check (consent);

grant insert on public.sample_requests to anon, authenticated;
