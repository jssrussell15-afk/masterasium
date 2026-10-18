-- Strategy tags on answer records.
-- Do not apply this file from the app, and do not run it against hosted Supabase from here.
--
-- Lane and difficulty already exist on public.attempts from the content store migration.
-- This file adds them only when that migration has not been applied.
-- The new columns sit on attempts, so the existing policies cover them:
--   "parents read attempt scores"  — a parent reads their own children
--   "students read their attempts" — a student reads their own rows
--   "students insert their attempts" — a student inserts their own rows
-- No new attempts policy is created here. See docs/rls-test-plan.md.
--
-- interaction_trace is a compact keypad and manipulative log. It holds no free text.
-- Raw traces are kept for 12 months, then cleared. The strategy tag stays.

alter table public.attempts
  add column if not exists lane text,
  add column if not exists difficulty smallint;

alter table public.attempts
  add column if not exists strategy text not null default 'unknown',
  add column if not exists strategy_source text not null default 'none',
  add column if not exists strategy_confidence numeric(4,3) not null default 0,
  add column if not exists interaction_trace jsonb;

alter table public.attempts drop constraint if exists attempts_strategy_check;
alter table public.attempts
  add constraint attempts_strategy_check
  check (strategy in (
    'base_ten',
    'counting_on',
    'counting_all',
    'skip_counting',
    'number_line',
    'guess_and_check',
    'known_fact',
    'unknown'
  ));

alter table public.attempts drop constraint if exists attempts_strategy_source_check;
alter table public.attempts
  add constraint attempts_strategy_source_check
  check (strategy_source in ('inferred', 'self_reported', 'none'));

alter table public.attempts drop constraint if exists attempts_strategy_confidence_check;
alter table public.attempts
  add constraint attempts_strategy_confidence_check
  check (strategy_confidence >= 0 and strategy_confidence <= 1);

alter table public.attempts drop constraint if exists attempts_trace_len;
alter table public.attempts
  add constraint attempts_trace_len
  check (interaction_trace is null or octet_length(interaction_trace::text) <= 800);

comment on column public.attempts.interaction_trace is
  'Compact trace. Raw for 12 months, then set to null. The strategy tag is the roll-up. No free text.';

alter table public.content_items
  add column if not exists expected_strategies text[] not null default '{}';

alter table public.content_items drop constraint if exists content_items_expected_strategies_check;
alter table public.content_items
  add constraint content_items_expected_strategies_check
  check (
    expected_strategies <@ array[
      'base_ten',
      'counting_on',
      'counting_all',
      'skip_counting',
      'number_line',
      'guess_and_check',
      'known_fact',
      'unknown'
    ]::text[]
  );

-- After 12 months an operator can clear raw traces. This statement is not run from the app:
-- update public.attempts
-- set interaction_trace = null
-- where created_at < now() - interval '12 months'
--   and interaction_trace is not null;
