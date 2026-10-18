-- Per-child "Let them move ahead". Off until a parent turns it on.
-- Parents cannot update children directly, so the change goes through a function.
-- Paste this in the Supabase SQL editor when you want it. Do not apply it from the app.

alter table public.children
  add column if not exists move_ahead boolean not null default false;

create or replace function public.set_move_ahead(
  p_child_id uuid,
  p_enabled boolean
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
  set move_ahead = coalesce(p_enabled, false)
  where id = p_child_id
    and parent_id = auth.uid();

  if not found then
    raise exception 'That child profile is not on this account.';
  end if;
end;
$$;

revoke all on function public.set_move_ahead(uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_move_ahead(uuid, boolean) to authenticated;

grant select (move_ahead) on public.children to anon, authenticated;
