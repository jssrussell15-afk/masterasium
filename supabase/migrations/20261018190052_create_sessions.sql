-- Create mode metadata only.
-- No story text, prompts, or images belong in this table.
-- Do not apply this file to the hosted project from the app.
--
-- Retention: keep raw create_sessions rows for 12 months, then roll them
-- up into counts with no child_id. This migration does not schedule or run
-- that roll-up.

alter table public.children
  add column if not exists create_enabled boolean not null default false,
  add column if not exists create_write_own boolean not null default false,
  add column if not exists create_daily_limit smallint not null default 1,
  add column if not exists create_image_consent_at timestamptz,
  add column if not exists create_image_consent_version text;

alter table public.children
  drop constraint if exists children_create_daily_limit_check;

alter table public.children
  add constraint children_create_daily_limit_check
  check (create_daily_limit between 1 and 3);

comment on column public.children.create_enabled is
  'Parent opt-in for Create. Off until a parent turns it on.';
comment on column public.children.create_write_own is
  'Parent opt-in for typed or dictated sentences. Off by default.';
comment on column public.children.create_image_consent_at is
  'When the parent allowed AI image generation. Null means sample images only.';
comment on column public.children.create_image_consent_version is
  'Consent text version the parent accepted.';

create table public.create_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  project_type text not null check (project_type in ('story', 'comic', 'moving')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  steps_completed smallint not null default 0 check (steps_completed between 0 and 6),
  keep_count smallint not null default 0 check (keep_count >= 0),
  retry_count smallint not null default 0 check (retry_count >= 0),
  fix_count smallint not null default 0 check (fix_count >= 0),
  mismatch_flags smallint[] not null default '{}',
  reflection_taps text[] not null default '{}',
  used_write_my_own boolean not null default false,
  choice_ids text[] not null default '{}',
  chip_enums text[] not null default '{}',
  moderation_blocks smallint not null default 0 check (moderation_blocks >= 0),
  prompt_version text not null default 'create-system-2026-10-18',
  report_count smallint not null default 0 check (report_count >= 0),
  constraint create_sessions_mismatch_flags_check check (
    mismatch_flags <@ array[1, 2, 3, 4]::smallint[]
  ),
  constraint create_sessions_reflection_taps_check check (
    reflection_taps <@ array[
      'boring',
      'same',
      'different',
      'liked-look',
      'liked-mood',
      'liked-story',
      'computer-wrong-look',
      'computer-wrong-words',
      'computer-wrong-both',
      'changed-colour',
      'changed-mood',
      'changed-size',
      'changed-special',
      'changed-night',
      'changed-friend',
      'changed-words'
    ]::text[]
  ),
  constraint create_sessions_choice_ids_check check (
    choice_ids <@ array[
      'river', 'market', 'library', 'train', 'garden', 'lighthouse', 'bakery', 'kite', 'bridge', 'cave', 'snow', 'orchard',
      'pip', 'moss', 'lumen',
      'meadow', 'harbour', 'kitchen',
      'story-1-0', 'story-1-1', 'story-1-2', 'story-2-0', 'story-2-1', 'story-2-2',
      'story-3-0', 'story-3-1', 'story-3-2', 'story-4-0', 'story-4-1', 'story-4-2',
      'comic-1-0', 'comic-1-1', 'comic-1-2', 'comic-2-0', 'comic-2-1', 'comic-2-2',
      'comic-3-0', 'comic-3-1', 'comic-3-2',
      'moving-1-0', 'moving-1-1', 'moving-1-2', 'moving-2-0', 'moving-2-1', 'moving-2-2',
      'moving-3-0', 'moving-3-1', 'moving-3-2', 'moving-4-0', 'moving-4-1', 'moving-4-2'
    ]::text[]
  ),
  constraint create_sessions_chip_enums_check check (
    chip_enums <@ array[
      'small', 'medium', 'big', 'blue', 'green', 'amber', 'calm', 'brave', 'sleepy',
      'scarf', 'hat', 'star', 'night', 'friend', 'meadow', 'harbour', 'kitchen'
    ]::text[]
  ),
  constraint create_sessions_prompt_version_check check (
    prompt_version = 'create-system-2026-10-18'
  )
);

comment on table public.create_sessions is
  'Metadata only for Create. No prompts, sentences, or images. Raw rows for 12 months, then roll up to counts with no child_id.';

create index create_sessions_child_started_idx
  on public.create_sessions (child_id, started_at desc);

revoke all on public.create_sessions from public, anon, authenticated;
grant select on public.create_sessions to authenticated;
grant select, insert, update on public.create_sessions to anon;

grant select (
  create_enabled,
  create_write_own,
  create_daily_limit,
  create_image_consent_at,
  create_image_consent_version
) on public.children to authenticated;

grant select (create_enabled, create_write_own, create_daily_limit)
  on public.children to anon;

alter table public.create_sessions enable row level security;

drop policy if exists "parents read create sessions" on public.create_sessions;
create policy "parents read create sessions"
  on public.create_sessions for select
  to authenticated
  using (
    exists (
      select 1 from public.children
      where children.id = create_sessions.child_id
        and children.parent_id = auth.uid()
    )
  );

drop policy if exists "students read their create sessions" on public.create_sessions;
create policy "students read their create sessions"
  on public.create_sessions for select
  to anon
  using (child_id = public.current_student_id());

drop policy if exists "students insert their create sessions" on public.create_sessions;
create policy "students insert their create sessions"
  on public.create_sessions for insert
  to anon
  with check (child_id = public.current_student_id());

drop policy if exists "students update their create sessions" on public.create_sessions;
create policy "students update their create sessions"
  on public.create_sessions for update
  to anon
  using (child_id = public.current_student_id())
  with check (child_id = public.current_student_id());

-- Parents change Create flags through a definer so the column grants stay narrow.
create or replace function public.set_create_settings(
  p_child_id uuid,
  p_enabled boolean,
  p_write_own boolean,
  p_daily_limit smallint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in as a parent first.';
  end if;
  if p_daily_limit is null or p_daily_limit < 1 or p_daily_limit > 3 then
    raise exception 'Choose 1, 2, or 3 projects a day.';
  end if;
  update public.children
  set create_enabled = coalesce(p_enabled, false),
      create_write_own = coalesce(p_write_own, false),
      create_daily_limit = p_daily_limit
  where id = p_child_id
    and parent_id = auth.uid();
  if not found then
    raise exception 'That child profile is not on this account.';
  end if;
end;
$$;

create or replace function public.set_create_image_consent(
  p_child_id uuid,
  p_version text,
  p_grant boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in as a parent first.';
  end if;
  if coalesce(p_grant, false) and coalesce(btrim(p_version), '') = '' then
    raise exception 'Consent needs a version.';
  end if;
  update public.children
  set create_image_consent_at = case when p_grant then now() else null end,
      create_image_consent_version = case when p_grant then btrim(p_version) else null end
  where id = p_child_id
    and parent_id = auth.uid();
  if not found then
    raise exception 'That child profile is not on this account.';
  end if;
end;
$$;

revoke all on function public.set_create_settings(uuid, boolean, boolean, smallint)
  from public, anon, authenticated;
revoke all on function public.set_create_image_consent(uuid, text, boolean)
  from public, anon, authenticated;
grant execute on function public.set_create_settings(uuid, boolean, boolean, smallint)
  to authenticated;
grant execute on function public.set_create_image_consent(uuid, text, boolean)
  to authenticated;

-- Category codes only. Child wording and pictures stay off this table.
create table public.create_moderation_events (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  day date not null,
  category text not null check (category in (
    'sexual', 'violence', 'hate', 'profanity', 'scary', 'personal', 'brand', 'error', 'timeout'
  )),
  prompt_version text not null check (prompt_version = 'create-system-2026-10-18'),
  created_at timestamptz not null default now()
);

comment on table public.create_moderation_events is
  'Moderation block counts by category code. No child text or images. Raw rows follow the 12-month create_sessions policy.';

create table public.create_daily_counters (
  child_id uuid not null references public.children (id) on delete cascade,
  day date not null,
  projects smallint not null default 0 check (projects >= 0),
  generations smallint not null default 0 check (generations >= 0),
  moderation_blocks smallint not null default 0 check (moderation_blocks >= 0),
  primary key (child_id, day)
);

create table public.create_parent_daily (
  parent_id uuid not null,
  day date not null,
  projects smallint not null default 0 check (projects >= 0),
  primary key (parent_id, day)
);

-- Hashed IP only. The route must not write the raw address.
create table public.create_ip_daily (
  ip_hash text not null,
  day date not null,
  generations smallint not null default 0 check (generations >= 0),
  primary key (ip_hash, day)
);

alter table public.create_moderation_events enable row level security;
alter table public.create_daily_counters enable row level security;
alter table public.create_parent_daily enable row level security;
alter table public.create_ip_daily enable row level security;

revoke all on public.create_moderation_events from public, anon, authenticated;
revoke all on public.create_daily_counters from public, anon, authenticated;
revoke all on public.create_parent_daily from public, anon, authenticated;
revoke all on public.create_ip_daily from public, anon, authenticated;
grant select on public.create_moderation_events to authenticated;
grant select on public.create_daily_counters to authenticated;

drop policy if exists "parents read create moderation events" on public.create_moderation_events;
create policy "parents read create moderation events"
  on public.create_moderation_events for select
  to authenticated
  using (
    exists (
      select 1 from public.children
      where children.id = create_moderation_events.child_id
        and children.parent_id = auth.uid()
    )
  );

drop policy if exists "parents read create daily counters" on public.create_daily_counters;
create policy "parents read create daily counters"
  on public.create_daily_counters for select
  to authenticated
  using (
    exists (
      select 1 from public.children
      where children.id = create_daily_counters.child_id
        and children.parent_id = auth.uid()
    )
  );

-- One transaction for the child, the parent account, and the hashed IP.
-- Recommended over a Durable Object because the audit rows and the parent
-- relationship already live in this database. A row lock keeps two tabs
-- from both passing the same limit.
create or replace function public.reserve_create_generation(
  p_child_id uuid,
  p_day date,
  p_starting_project boolean,
  p_daily_limit smallint,
  p_blocked boolean,
  p_category text,
  p_ip_hash text
)
returns table (
  projects smallint,
  generations smallint,
  moderation_blocks smallint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent uuid;
  v_projects smallint;
  v_generations smallint;
  v_blocks smallint;
  v_parent_projects smallint;
  v_ip_generations smallint;
begin
  if p_category is not null and p_category not in (
    'sexual', 'violence', 'hate', 'profanity', 'scary', 'personal', 'brand', 'error', 'timeout'
  ) then
    raise exception 'Unknown moderation category.';
  end if;
  if p_daily_limit is null or p_daily_limit < 1 or p_daily_limit > 3 then
    raise exception 'Choose 1, 2, or 3 projects a day.';
  end if;

  select parent_id into v_parent
  from public.children
  where id = p_child_id
    and (
      parent_id = auth.uid()
      or id = public.current_student_id()
    );
  if v_parent is null then
    raise exception 'That child profile is not on this account.';
  end if;

  insert into public.create_daily_counters (child_id, day)
  values (p_child_id, p_day)
  on conflict (child_id, day) do nothing;
  select c.projects, c.generations, c.moderation_blocks
    into v_projects, v_generations, v_blocks
  from public.create_daily_counters c
  where c.child_id = p_child_id and c.day = p_day
  for update;

  insert into public.create_parent_daily (parent_id, day)
  values (v_parent, p_day)
  on conflict (parent_id, day) do nothing;
  select p.projects into v_parent_projects
  from public.create_parent_daily p
  where p.parent_id = v_parent and p.day = p_day
  for update;

  if p_ip_hash is not null and length(p_ip_hash) between 16 and 128 then
    insert into public.create_ip_daily (ip_hash, day)
    values (p_ip_hash, p_day)
    on conflict (ip_hash, day) do nothing;
    select i.generations into v_ip_generations
    from public.create_ip_daily i
    where i.ip_hash = p_ip_hash and i.day = p_day
    for update;
  else
    v_ip_generations := 0;
  end if;

  if v_blocks >= 6 then
    raise exception 'Create can start again tomorrow.';
  end if;
  if p_starting_project and v_projects >= p_daily_limit then
    raise exception 'Daily project limit reached.';
  end if;
  if p_starting_project and v_parent_projects >= 6 then
    raise exception 'Account project limit reached.';
  end if;
  if v_ip_generations >= 36 then
    raise exception 'Network limit reached.';
  end if;
  if v_generations >= 18 then
    raise exception 'Project generation limit reached.';
  end if;

  v_generations := v_generations + 1;
  if p_starting_project then
    v_projects := v_projects + 1;
    v_parent_projects := v_parent_projects + 1;
  end if;
  if p_blocked then
    v_blocks := v_blocks + 1;
    insert into public.create_moderation_events (child_id, day, category, prompt_version)
    values (p_child_id, p_day, coalesce(p_category, 'error'), 'create-system-2026-10-18');
  end if;

  update public.create_daily_counters
  set projects = v_projects, generations = v_generations, moderation_blocks = v_blocks
  where child_id = p_child_id and day = p_day;
  update public.create_parent_daily
  set projects = v_parent_projects
  where parent_id = v_parent and day = p_day;
  if p_ip_hash is not null and length(p_ip_hash) between 16 and 128 then
    update public.create_ip_daily
    set generations = v_ip_generations + 1
    where ip_hash = p_ip_hash and day = p_day;
  end if;

  return query select v_projects, v_generations, v_blocks;
end;
$$;

revoke all on function public.reserve_create_generation(uuid, date, boolean, smallint, boolean, text, text)
  from public, anon, authenticated;
grant execute on function public.reserve_create_generation(uuid, date, boolean, smallint, boolean, text, text)
  to anon, authenticated;
