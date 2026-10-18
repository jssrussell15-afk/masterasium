-- Idempotency for Stripe webhooks, and server-side xAI spend rows.
-- No child names, PINs, prompts, or emails. Clients cannot read these tables.
-- Do not apply this file to hosted Supabase from the app.

create table if not exists public.stripe_events (
  event_id text primary key check (char_length(event_id) between 1 and 255),
  event_type text not null check (char_length(event_type) between 1 and 120),
  received_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from public, anon, authenticated;

drop policy if exists "no client access to stripe events" on public.stripe_events;
create policy "no client access to stripe events"
  on public.stripe_events
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.xai_usage (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  model text not null check (char_length(model) between 1 and 80),
  input_tokens integer not null check (input_tokens >= 0),
  output_tokens integer not null check (output_tokens >= 0),
  estimated_cost_usd numeric(12, 6) not null check (estimated_cost_usd >= 0),
  month_key text not null check (month_key ~ '^[0-9]{4}-[0-9]{2}$')
);

create index if not exists xai_usage_month_idx on public.xai_usage (month_key);

alter table public.xai_usage enable row level security;
revoke all on public.xai_usage from public, anon, authenticated;

drop policy if exists "no client access to xai usage" on public.xai_usage;
create policy "no client access to xai usage"
  on public.xai_usage
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.spend_alerts (
  alert_key text primary key check (char_length(alert_key) between 1 and 80),
  sent_at timestamptz not null default now()
);

alter table public.spend_alerts enable row level security;
revoke all on public.spend_alerts from public, anon, authenticated;

drop policy if exists "no client access to spend alerts" on public.spend_alerts;
create policy "no client access to spend alerts"
  on public.spend_alerts
  for all
  to anon, authenticated
  using (false)
  with check (false);
