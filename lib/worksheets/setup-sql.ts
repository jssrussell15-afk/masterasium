export const WORKSHEET_SETUP_SQL = `create table if not exists public.worksheet_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  title text not null default '',
  instructions text not null default '',
  show_name boolean not null default true,
  show_date boolean not null default true,
  show_grade boolean not null default false,
  show_score boolean not null default false,
  logo_data text,
  created_at timestamptz not null default now()
);

create table if not exists public.worksheets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  access_code text not null unique check (char_length(access_code) between 4 and 12),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  instructions text not null default '',
  subtitle text,
  logo_data text,
  items jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.worksheet_templates enable row level security;
alter table public.worksheets enable row level security;

drop policy if exists "teachers own worksheet templates" on public.worksheet_templates;
create policy "teachers own worksheet templates"
  on public.worksheet_templates for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "teachers own worksheets" on public.worksheets;
create policy "teachers own worksheets"
  on public.worksheets for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on public.worksheet_templates to authenticated;
grant select, insert, update, delete on public.worksheets to authenticated;

create or replace function public.open_practice_set(access_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'code', worksheets.access_code,
    'title', worksheets.title,
    'instructions', worksheets.instructions,
    'subtitle', worksheets.subtitle,
    'logoData', worksheets.logo_data,
    'items', worksheets.items
  )
  into result
  from public.worksheets
  where worksheets.access_code = upper(btrim(access_code));
  return result;
end;
$$;

revoke all on function public.open_practice_set(text) from public;
grant execute on function public.open_practice_set(text) to anon, authenticated;`;
