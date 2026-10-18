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
