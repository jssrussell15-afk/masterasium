-- Multi-province curriculum model.
-- Adds tables beside the existing Ontario app tables. Does not drop or rename them.
-- Apply in the Supabase SQL editor or with `supabase db reset`. Do not point this at
-- production until you mean to.
--
-- btree_gist lives in the extensions schema on Supabase. Operator classes on the
-- exclusion constraint are schema-qualified so this file does not change search_path.

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.jurisdiction (
  code text primary key, -- 'ON','BC','YT','NT','AB','SK','MB','QC','NB','NS','PE','NL','NU'
  slug text unique not null, -- 'ontario','british-columbia','yukon',...
  name text not null,
  display_order int not null,
  publish_status text not null check (publish_status in ('published', 'coming_soon', 'hidden')),
  note text
);

create table public.curriculum_doc (
  id uuid primary key default gen_random_uuid(),
  doc_key text unique not null, -- e.g. 'ON-MATH-2020', 'BC-MATH-K9-2016'
  owner_jurisdiction text not null references public.jurisdiction (code),
  title text not null,
  publisher text not null,
  published_year int,
  source_url text not null,
  status text not null check (status in ('current', 'being_replaced', 'legacy', 'draft', 'unverified')),
  last_verified date not null,
  notes text
);

-- Which document is in force for which jurisdiction + grade, and when.
create table public.doc_applicability (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.curriculum_doc (id) on delete cascade,
  jurisdiction_code text not null references public.jurisdiction (code),
  grade int not null check (grade between 0 and 12),
  effective_from date not null,
  effective_to date, -- null = open-ended; inclusive last day in force
  note text,
  constraint doc_applicability_no_overlap exclude using gist (
    jurisdiction_code extensions.gist_text_ops with =,
    grade extensions.gist_int4_ops with =,
    daterange(effective_from, effective_to, '[]') pg_catalog.range_ops with &&
  )
);

create table public.strand (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.curriculum_doc (id) on delete cascade,
  code text not null, -- 'A'..'F' for Ontario; derived for others (e.g. 'N','PR','SS','SP')
  code_type text not null check (code_type in ('official', 'derived')),
  name text not null,
  display_order int not null,
  unique (doc_id, code)
);

create table public.standard (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.curriculum_doc (id) on delete cascade,
  strand_id uuid not null references public.strand (id),
  grade int not null,
  code text not null, -- published code (B2.5, 3.N.1) or a derived key (BC-MA-G3-C01)
  code_type text not null check (code_type in ('official', 'derived')),
  source_system_id text, -- e.g. LearnAlberta id; never displayed as a code
  level text not null check (level in ('overall', 'specific', 'outcome', 'content', 'competency', 'big_idea')),
  parent_id uuid references public.standard (id),
  text text not null, -- verbatim wording from the source; never paraphrase
  extra jsonb not null default '{}',
  source_url text not null,
  display_order int not null,
  needs_review boolean not null default false,
  last_verified date not null,
  unique (doc_id, grade, code)
);

-- Shared practice-skill bank. Province-neutral.
create table public.skill (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  created_at timestamptz default now()
);

create table public.alignment (
  skill_id uuid references public.skill (id) on delete cascade,
  standard_id uuid references public.standard (id) on delete cascade,
  strength text not null check (strength in ('primary', 'partial')),
  note text,
  reviewed_by text,
  reviewed_at timestamptz,
  primary key (skill_id, standard_id)
);

-- Suggested teaching order, kept separate from strand display.
create table public.sequence (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_code text not null references public.jurisdiction (code),
  grade int not null,
  doc_id uuid not null references public.curriculum_doc (id),
  label text not null default 'Suggested by Masterasium',
  basis text not null,
  version int not null default 1,
  effective_from date not null,
  effective_to date,
  is_published boolean not null default false
);

create table public.sequence_item (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.sequence (id) on delete cascade,
  position int not null,
  block_title text not null,
  approx_weeks int,
  standard_id uuid references public.standard (id),
  skill_id uuid references public.skill (id),
  is_spiral boolean not null default false, -- true = revisit every block (facts, mental math)
  check (standard_id is not null or skill_id is not null),
  unique (sequence_id, position, standard_id, skill_id)
);

create index doc_applicability_jurisdiction_grade_idx
  on public.doc_applicability (jurisdiction_code, grade, effective_from);

create index strand_doc_idx on public.strand (doc_id);
create index standard_doc_grade_idx on public.standard (doc_id, grade);
create index standard_strand_idx on public.standard (strand_id);
create index standard_parent_idx on public.standard (parent_id);
create index alignment_standard_idx on public.alignment (standard_id);
create index sequence_jurisdiction_grade_idx
  on public.sequence (jurisdiction_code, grade, effective_from);
create index sequence_item_sequence_idx
  on public.sequence_item (sequence_id, position);

-- ---------------------------------------------------------------------------
-- current_doc: the document in force for a jurisdiction and grade on a date.
-- effective_to is inclusive. A null effective_to is open-ended.
-- ---------------------------------------------------------------------------

create or replace function public.current_doc(
  p_jurisdiction text,
  p_grade int,
  p_on date default current_date
) returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select da.doc_id
  from public.doc_applicability da
  where da.jurisdiction_code = p_jurisdiction
    and da.grade = p_grade
    and da.effective_from <= p_on
    and (da.effective_to is null or da.effective_to >= p_on);
$$;

comment on function public.current_doc(text, int, date) is
  'Document in force for a jurisdiction and grade on p_on (default current_date). effective_to is inclusive; null effective_to is open-ended.';

-- Strand rows for the document current_doc returns today. Filtering by
-- jurisdiction_code and grade switches automatically on the effective date.
create or replace view public.strand_view
with (security_invoker = true) as
select
  da.jurisdiction_code,
  da.grade,
  s.id,
  s.doc_id,
  s.code,
  s.code_type,
  s.name,
  s.display_order
from public.doc_applicability da
join public.strand s on s.doc_id = da.doc_id
where da.effective_from <= current_date
  and (da.effective_to is null or da.effective_to >= current_date)
  and s.doc_id = public.current_doc(da.jurisdiction_code, da.grade, current_date);

comment on view public.strand_view is
  'Strands of the document current_doc returns for each jurisdiction and grade. The row set changes on the effective date.';

-- Sequences whose document is the one current_doc returns today, and whose
-- own effective range contains today.
create or replace view public.sequence_view
with (security_invoker = true) as
select
  q.id,
  q.jurisdiction_code,
  q.grade,
  q.doc_id,
  q.label,
  q.basis,
  q.version,
  q.effective_from,
  q.effective_to,
  q.is_published
from public.sequence q
where q.effective_from <= current_date
  and (q.effective_to is null or q.effective_to >= current_date)
  and q.doc_id = public.current_doc(q.jurisdiction_code, q.grade, current_date);

comment on view public.sequence_view is
  'Sequences for the document current_doc returns. A document switch on the effective date drops sequences tied to the previous document.';

-- ---------------------------------------------------------------------------
-- RLS: public read (anon and authenticated select). Writes for service_role,
-- which bypasses RLS. No insert, update, or delete policy is created.
-- ---------------------------------------------------------------------------

alter table public.jurisdiction enable row level security;
alter table public.curriculum_doc enable row level security;
alter table public.doc_applicability enable row level security;
alter table public.strand enable row level security;
alter table public.standard enable row level security;
alter table public.skill enable row level security;
alter table public.alignment enable row level security;
alter table public.sequence enable row level security;
alter table public.sequence_item enable row level security;

create policy "public read jurisdiction"
  on public.jurisdiction for select
  to anon, authenticated
  using (true);

create policy "public read curriculum_doc"
  on public.curriculum_doc for select
  to anon, authenticated
  using (true);

create policy "public read doc_applicability"
  on public.doc_applicability for select
  to anon, authenticated
  using (true);

create policy "public read strand"
  on public.strand for select
  to anon, authenticated
  using (true);

create policy "public read standard"
  on public.standard for select
  to anon, authenticated
  using (true);

create policy "public read skill"
  on public.skill for select
  to anon, authenticated
  using (true);

create policy "public read alignment"
  on public.alignment for select
  to anon, authenticated
  using (true);

create policy "public read sequence"
  on public.sequence for select
  to anon, authenticated
  using (true);

create policy "public read sequence_item"
  on public.sequence_item for select
  to anon, authenticated
  using (true);

revoke all on table public.jurisdiction from public, anon, authenticated;
revoke all on table public.curriculum_doc from public, anon, authenticated;
revoke all on table public.doc_applicability from public, anon, authenticated;
revoke all on table public.strand from public, anon, authenticated;
revoke all on table public.standard from public, anon, authenticated;
revoke all on table public.skill from public, anon, authenticated;
revoke all on table public.alignment from public, anon, authenticated;
revoke all on table public.sequence from public, anon, authenticated;
revoke all on table public.sequence_item from public, anon, authenticated;

grant select on table public.jurisdiction to anon, authenticated;
grant select on table public.curriculum_doc to anon, authenticated;
grant select on table public.doc_applicability to anon, authenticated;
grant select on table public.strand to anon, authenticated;
grant select on table public.standard to anon, authenticated;
grant select on table public.skill to anon, authenticated;
grant select on table public.alignment to anon, authenticated;
grant select on table public.sequence to anon, authenticated;
grant select on table public.sequence_item to anon, authenticated;

grant select, insert, update, delete on table public.jurisdiction to service_role;
grant select, insert, update, delete on table public.curriculum_doc to service_role;
grant select, insert, update, delete on table public.doc_applicability to service_role;
grant select, insert, update, delete on table public.strand to service_role;
grant select, insert, update, delete on table public.standard to service_role;
grant select, insert, update, delete on table public.skill to service_role;
grant select, insert, update, delete on table public.alignment to service_role;
grant select, insert, update, delete on table public.sequence to service_role;
grant select, insert, update, delete on table public.sequence_item to service_role;

revoke all on table public.strand_view from public, anon, authenticated;
revoke all on table public.sequence_view from public, anon, authenticated;
grant select on table public.strand_view to anon, authenticated, service_role;
grant select on table public.sequence_view to anon, authenticated, service_role;

revoke all on function public.current_doc(text, int, date) from public;
grant execute on function public.current_doc(text, int, date) to anon, authenticated, service_role;
