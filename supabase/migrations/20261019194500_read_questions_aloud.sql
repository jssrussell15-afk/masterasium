-- Per-child parent setting: read questions aloud automatically.
-- Null keeps the grade default (on for grades 1–2, off otherwise). The app applies that default.
-- Parents change it only through set_read_questions_aloud.
-- Do not add an UPDATE policy or a column UPDATE grant. On the hosted database,
-- authenticated and anon already have table-level UPDATE on children, so a
-- permissive policy would let a parent rewrite every column.
-- Replay-safe. Do not apply this file to hosted Supabase from the app.
-- Students act as anon and may only read their own row (current_student_id()).

alter table public.children
  add column if not exists read_questions_aloud boolean;

grant select (read_questions_aloud) on public.children to anon, authenticated;

-- Remove the unsafe draft if this file is replayed after it. Does not touch table-level grants.
drop policy if exists "parents update read questions aloud" on public.children;
revoke update (read_questions_aloud) on public.children from public, anon, authenticated;

create or replace function public.set_read_questions_aloud(
  p_child_id uuid,
  p_value boolean
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

  update public.children
  set read_questions_aloud = p_value
  where id = p_child_id
    and parent_id = auth.uid();

  if not found then
    raise exception 'That child profile is not on this account.';
  end if;
end;
$$;

revoke all on function public.set_read_questions_aloud(uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_read_questions_aloud(uuid, boolean) to authenticated;
