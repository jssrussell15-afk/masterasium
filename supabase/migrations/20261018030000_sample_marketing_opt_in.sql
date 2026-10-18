-- Product email is optional and separate from requesting a sample sheet.
-- consent stays true for the sheet request. marketing_opt_in defaults off.

alter table public.sample_requests
  add column if not exists marketing_opt_in boolean not null default false;
