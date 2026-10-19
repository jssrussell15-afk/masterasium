-- Placement quick check and parent starting point.
-- NOT applied to the hosted Supabase project by the app. Apply this file yourself
-- in the SQL editor when you want the quick check to save.
-- The child never sees a score. This only stores where practice starts.

alter table public.children
  add column if not exists placement jsonb;

alter table public.children drop constraint if exists children_placement_shape;
alter table public.children
  add constraint children_placement_shape
  check (
    placement is null
    or (
      jsonb_typeof(placement) = 'object'
      and placement->>'status' in ('skipped', 'placed')
      and (placement->>'placedGrade') ~ '^[1-8]$'
      and (placement->>'startSkillId') ~ '^g[1-8]-[a-z0-9-]+$'
    )
  );

comment on column public.children.placement is
  'Where practice starts after the quick check or a parent change. Not a score.';

-- The student session may move one grade down after the check, or stay on the enrolled grade.
create or replace function public.save_placement(
  p_placed_grade integer,
  p_start_skill_id text,
  p_topic text,
  p_ready_strand text,
  p_early_stop boolean,
  p_cleared_all boolean,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.current_student_id();
  v_enrolled smallint;
  v_topic text;
begin
  if v_id is null then
    raise exception 'Sign in as a student first.';
  end if;

  select grade into v_enrolled
  from public.children
  where id = v_id;

  if not found then
    raise exception 'That student session ended.';
  end if;

  if p_status is null or p_status not in ('skipped', 'placed') then
    raise exception 'That placement could not be saved.';
  end if;

  if p_placed_grade is null or p_placed_grade < 1 or p_placed_grade > 8 then
    raise exception 'That placement could not be saved.';
  end if;

  if p_placed_grade <> v_enrolled and p_placed_grade <> v_enrolled - 1 then
    raise exception 'That placement could not be saved.';
  end if;

  if coalesce(p_early_stop, false) and coalesce(p_cleared_all, false) then
    raise exception 'That placement could not be saved.';
  end if;

  if coalesce(p_early_stop, false) and p_placed_grade <> v_enrolled - 1 then
    raise exception 'That placement could not be saved.';
  end if;

  if not coalesce(p_early_stop, false) and p_placed_grade <> v_enrolled then
    raise exception 'That placement could not be saved.';
  end if;

  if p_status = 'skipped' and (p_placed_grade <> v_enrolled or coalesce(p_early_stop, false)) then
    raise exception 'That placement could not be saved.';
  end if;

  if p_ready_strand is not null
     and p_ready_strand not in ('number', 'operations', 'geometry', 'measurement', 'data') then
    raise exception 'That placement could not be saved.';
  end if;

  if p_start_skill_id is null
     or p_start_skill_id !~ ('^g' || p_placed_grade::text || '-[a-z0-9-]+$') then
    raise exception 'That starting point is not in the grade.';
  end if;

  v_topic := btrim(coalesce(p_topic, ''));
  if char_length(v_topic) < 1 or char_length(v_topic) > 120 then
    raise exception 'That placement could not be saved.';
  end if;

  update public.children
  set working_grade = p_placed_grade,
      placement = jsonb_build_object(
        'status', p_status,
        'statedGrade', v_enrolled,
        'placedGrade', p_placed_grade,
        'startSkillId', p_start_skill_id,
        'topic', v_topic,
        'readyStrand', p_ready_strand,
        'earlyStop', coalesce(p_early_stop, false),
        'clearedAll', coalesce(p_cleared_all, false)
      )
  where id = v_id;

  delete from public.pending_questions where child_id = v_id;
end;
$$;

-- A parent moves only the starting skill, back on the child's own grade.
create or replace function public.set_starting_point(
  p_child_id uuid,
  p_start_skill_id text,
  p_topic text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grade smallint;
  v_topic text;
begin
  if auth.uid() is null then
    raise exception 'Sign in as a parent first.';
  end if;

  select grade into v_grade
  from public.children
  where id = p_child_id
    and parent_id = auth.uid();

  if not found then
    raise exception 'That child profile is not on this account.';
  end if;

  if p_start_skill_id is null
     or p_start_skill_id !~ ('^g' || v_grade::text || '-[a-z0-9-]+$') then
    raise exception 'That starting point is not in the grade.';
  end if;

  v_topic := btrim(coalesce(p_topic, ''));
  if char_length(v_topic) < 1 or char_length(v_topic) > 120 then
    raise exception 'That starting point is not in the grade.';
  end if;

  update public.children
  set working_grade = v_grade,
      placement = jsonb_build_object(
        'status', 'placed',
        'statedGrade', v_grade,
        'placedGrade', v_grade,
        'startSkillId', p_start_skill_id,
        'topic', v_topic,
        'readyStrand', null,
        'earlyStop', false,
        'clearedAll', false
      )
  where id = p_child_id
    and parent_id = auth.uid();

  delete from public.pending_questions where child_id = p_child_id;
end;
$$;

revoke all on function public.save_placement(integer, text, text, text, boolean, boolean, text) from public, anon, authenticated;
revoke all on function public.set_starting_point(uuid, text, text) from public, anon, authenticated;

grant execute on function public.save_placement(integer, text, text, text, boolean, boolean, text) to anon, authenticated;
grant execute on function public.set_starting_point(uuid, text, text) to authenticated;

grant select (placement) on public.children to anon, authenticated;
