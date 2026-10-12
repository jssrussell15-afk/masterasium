-- Masterasium starter schema.
-- Run this in the Supabase SQL editor. Registration stays free: there is no plan or payment table.
-- A parent (auth.users) can have at most two children, first name only.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 40),
  grade smallint not null check (grade in (1, 5)),
  created_at timestamptz not null default now()
);

create table public.skill_states (
  child_id uuid not null references public.children (id) on delete cascade,
  skill_id text not null,
  attempted integer not null default 0 check (attempted >= 0),
  correct integer not null default 0 check (correct >= 0 and correct <= attempted),
  streak integer not null default 0,
  -- Reserved for a later FSRS scheduler: stability, difficulty, due, state.
  fsrs jsonb,
  updated_at timestamptz not null default now(),
  primary key (child_id, skill_id)
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  skill_id text not null,
  prompt text not null,
  expected text not null,
  given text not null,
  correct boolean not null,
  created_at timestamptz not null default now()
);

create table public.pending_questions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  skill_id text not null,
  prompt text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create table public.notify_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) <= 320),
  created_at timestamptz not null default now()
);

-- A saved daily summary. status stays 'stubbed' until a mailer exists.
create table public.digest_stubs (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  child_id uuid references public.children (id) on delete cascade,
  period_date date not null,
  summary jsonb not null,
  status text not null default 'stubbed' check (status in ('stubbed', 'sent', 'skipped')),
  created_at timestamptz not null default now(),
  unique (parent_id, child_id, period_date)
);

create index attempts_child_created_idx on public.attempts (child_id, created_at desc);
create index children_parent_idx on public.children (parent_id);
create index pending_questions_child_idx on public.pending_questions (child_id, created_at desc);

create or replace function public.enforce_two_children()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.children where parent_id = new.parent_id) >= 2 then
    raise exception 'A parent account can have at most 2 child profiles';
  end if;
  return new;
end;
$$;

create trigger children_limit
  before insert on public.children
  for each row execute function public.enforce_two_children();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.skill_states enable row level security;
alter table public.attempts enable row level security;
alter table public.pending_questions enable row level security;
alter table public.notify_emails enable row level security;
alter table public.digest_stubs enable row level security;

create policy "parents read their profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "parents insert their profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "parents own their children"
  on public.children for all
  to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

create policy "parents own skill states"
  on public.skill_states for all
  to authenticated
  using (
    exists (
      select 1 from public.children
      where children.id = skill_states.child_id
        and children.parent_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.children
      where children.id = skill_states.child_id
        and children.parent_id = auth.uid()
    )
  );

create policy "parents own attempts"
  on public.attempts for all
  to authenticated
  using (
    exists (
      select 1 from public.children
      where children.id = attempts.child_id
        and children.parent_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.children
      where children.id = attempts.child_id
        and children.parent_id = auth.uid()
    )
  );

create policy "parents own pending questions"
  on public.pending_questions for all
  to authenticated
  using (
    exists (
      select 1 from public.children
      where children.id = pending_questions.child_id
        and children.parent_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.children
      where children.id = pending_questions.child_id
        and children.parent_id = auth.uid()
    )
  );

create policy "parents own digest drafts"
  on public.digest_stubs for all
  to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

create policy "anyone can join the notify list"
  on public.notify_emails for insert
  to anon, authenticated
  with check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

grant select, insert on public.profiles to authenticated;
grant select, insert, update, delete on public.children to authenticated;
grant select, insert, update, delete on public.skill_states to authenticated;
grant select, insert, update, delete on public.attempts to authenticated;
grant select, insert, update, delete on public.pending_questions to authenticated;
grant select, insert, update, delete on public.digest_stubs to authenticated;
grant insert on public.notify_emails to anon, authenticated;
