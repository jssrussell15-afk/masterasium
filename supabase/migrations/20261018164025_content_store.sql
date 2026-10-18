-- Content store, review, and practice length.
-- Paste this in the Supabase SQL editor when you want it. Do not apply it from the app.
-- Reuses public.skill (slug is the practice skill id), public.attempts, public.children.move_ahead,
-- and public.profiles. Does not recreate those tables.

-- ---------------------------------------------------------------------------
-- Practice length, beside move_ahead. Parents cannot update children, so the
-- change goes through set_practice_length.
-- ---------------------------------------------------------------------------

alter table public.children
  add column if not exists set_length_minutes smallint not null default 15;

alter table public.children drop constraint if exists children_set_length_minutes_check;
alter table public.children
  add constraint children_set_length_minutes_check
  check (set_length_minutes in (10, 15, 20));

create or replace function public.set_practice_length(
  p_child_id uuid,
  p_minutes integer
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
  if p_minutes not in (10, 15, 20) then
    raise exception 'Practice length is 10, 15, or 20 minutes.';
  end if;

  update public.children
  set set_length_minutes = p_minutes
  where id = p_child_id
    and parent_id = auth.uid();

  if not found then
    raise exception 'That child profile is not on this account.';
  end if;
end;
$$;

revoke all on function public.set_practice_length(uuid, integer) from public, anon, authenticated;
grant execute on function public.set_practice_length(uuid, integer) to authenticated;
grant select (set_length_minutes) on public.children to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admins. There is no admin role in the app session. A row here is the check.
-- Add one in the SQL editor (service role bypasses RLS). Authenticated users
-- can read only their own row, so they cannot list other admins.
-- insert into public.admins (user_id) values ('<profile uuid>');
-- ---------------------------------------------------------------------------

create table public.admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create policy "admins read their own row"
  on public.admins for select
  to authenticated
  using (user_id = (select auth.uid()));

grant select on public.admins to authenticated;

create or replace function public.is_content_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_content_admin() from public, anon, authenticated;
grant execute on function public.is_content_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Items. skill_id points at public.skill, whose slug is the practice id
-- (g3-add-sub and the rest of the Ontario seed).
-- ---------------------------------------------------------------------------

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skill (id),
  question_type text not null check (question_type in (
    'numeric', 'compare', 'balance', 'true-false', 'many-ways', 'bar', 'pattern', 'explanation'
  )),
  lane text not null check (lane in ('core', 'go_further', 'review')),
  difficulty smallint not null check (difficulty in (1, 2, 3)),
  template jsonb not null,
  checker text not null check (checker in ('numeric-equal', 'choice-match', 'true-false')),
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'published', 'retired')),
  source text not null check (source in ('code', 'hand_written', 'ai_draft')),
  reviewer_id uuid references public.profiles (id),
  reviewed_at timestamptz,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_items_template_len check (octet_length(template::text) <= 8000)
);

create index content_items_skill_idx on public.content_items (skill_id);
create index content_items_published_idx
  on public.content_items (skill_id, lane)
  where status = 'published';
create index content_items_status_idx on public.content_items (status);

create table public.content_reviews (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.content_items (id) on delete cascade,
  version integer not null check (version >= 1),
  reviewer_id uuid not null references public.profiles (id),
  decision text not null check (decision in ('approve', 'request_changes', 'retire')),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);

create index content_reviews_item_idx on public.content_reviews (item_id, version);

create table public.content_flags (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.content_items (id) on delete set null,
  generator_key text,
  prompt text not null check (char_length(prompt) between 1 and 2000),
  numbers jsonb not null default '[]'::jsonb,
  child_id uuid not null references public.children (id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 1 and 400),
  surface text not null default 'question' check (surface in ('question', 'walkthrough', 'explanation')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  constraint content_flags_target check (item_id is not null or generator_key is not null),
  constraint content_flags_generator_len check (generator_key is null or char_length(generator_key) <= 80),
  constraint content_flags_numbers_len check (octet_length(numbers::text) <= 1000)
);

create index content_flags_open_idx on public.content_flags (created_at desc) where status = 'open';
create index content_flags_item_idx on public.content_flags (item_id);

create table public.misconceptions (
  id text primary key check (id ~ '^[a-z0-9_]+$' and char_length(id) <= 80),
  skill_id uuid not null references public.skill (id),
  description text not null check (char_length(description) between 1 and 400)
);

create table public.skill_prerequisites (
  skill_id uuid not null references public.skill (id) on delete cascade,
  prerequisite_skill_id uuid not null references public.skill (id) on delete cascade,
  primary key (skill_id, prerequisite_skill_id),
  constraint skill_prerequisites_not_self check (skill_id <> prerequisite_skill_id)
);

create index skill_prerequisites_prior_idx on public.skill_prerequisites (prerequisite_skill_id);

-- Answer detail on the existing attempts table. practice_events stays a short
-- log and still does not store the question.
alter table public.attempts
  add column if not exists lane text,
  add column if not exists difficulty smallint,
  add column if not exists content_item_id uuid references public.content_items (id),
  add column if not exists answer jsonb;

alter table public.attempts drop constraint if exists attempts_lane_check;
alter table public.attempts
  add constraint attempts_lane_check
  check (lane is null or lane in ('core', 'go_further', 'review'));

alter table public.attempts drop constraint if exists attempts_difficulty_check;
alter table public.attempts
  add constraint attempts_difficulty_check
  check (difficulty is null or difficulty in (1, 2, 3));

alter table public.attempts drop constraint if exists attempts_answer_len;
alter table public.attempts
  add constraint attempts_answer_len
  check (answer is null or octet_length(answer::text) <= 4000);

create index attempts_content_item_idx
  on public.attempts (content_item_id)
  where content_item_id is not null;

-- ---------------------------------------------------------------------------
-- RLS
-- Students (anon) and parents (authenticated) can read published items only.
-- Writes are admin-only. Flags can be inserted by the child or their parent,
-- and only an admin can read them.
-- ---------------------------------------------------------------------------

alter table public.content_items enable row level security;
alter table public.content_reviews enable row level security;
alter table public.content_flags enable row level security;
alter table public.misconceptions enable row level security;
alter table public.skill_prerequisites enable row level security;

create policy "published items are readable"
  on public.content_items for select
  to anon, authenticated
  using (status = 'published');

create policy "admins read content items"
  on public.content_items for select
  to authenticated
  using (exists (
    select 1 from public.admins
    where admins.user_id = (select auth.uid())
  ));

create policy "admins insert content items"
  on public.content_items for insert
  to authenticated
  with check (exists (
    select 1 from public.admins
    where admins.user_id = (select auth.uid())
  ));

create policy "admins update content items"
  on public.content_items for update
  to authenticated
  using (exists (
    select 1 from public.admins
    where admins.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.admins
    where admins.user_id = (select auth.uid())
  ));

create policy "admins read reviews"
  on public.content_reviews for select
  to authenticated
  using (exists (
    select 1 from public.admins
    where admins.user_id = (select auth.uid())
  ));

create policy "admins insert reviews"
  on public.content_reviews for insert
  to authenticated
  with check (exists (
    select 1 from public.admins
    where admins.user_id = (select auth.uid())
  ));

create policy "students insert flags"
  on public.content_flags for insert
  to anon
  with check (child_id = (select public.current_student_id()));

create policy "parents insert flags"
  on public.content_flags for insert
  to authenticated
  with check (exists (
    select 1 from public.children
    where children.id = content_flags.child_id
      and children.parent_id = (select auth.uid())
  ));

create policy "admins read flags"
  on public.content_flags for select
  to authenticated
  using (exists (
    select 1 from public.admins
    where admins.user_id = (select auth.uid())
  ));

create policy "admins update flags"
  on public.content_flags for update
  to authenticated
  using (exists (
    select 1 from public.admins
    where admins.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.admins
    where admins.user_id = (select auth.uid())
  ));

create policy "read misconceptions"
  on public.misconceptions for select
  to anon, authenticated
  using (true);

create policy "admins write misconceptions"
  on public.misconceptions for all
  to authenticated
  using (exists (
    select 1 from public.admins
    where admins.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.admins
    where admins.user_id = (select auth.uid())
  ));

create policy "read skill prerequisites"
  on public.skill_prerequisites for select
  to anon, authenticated
  using (true);

create policy "admins write skill prerequisites"
  on public.skill_prerequisites for all
  to authenticated
  using (exists (
    select 1 from public.admins
    where admins.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.admins
    where admins.user_id = (select auth.uid())
  ));

grant select on public.content_items to anon, authenticated;
grant insert, update on public.content_items to authenticated;

grant select, insert on public.content_reviews to authenticated;

-- Student sessions use the anon key, so the flag insert has to be granted to anon.
grant insert on public.content_flags to anon, authenticated;
grant select, update on public.content_flags to authenticated;

grant select on public.misconceptions to anon, authenticated;
grant insert, update, delete on public.misconceptions to authenticated;

grant select on public.skill_prerequisites to anon, authenticated;
grant insert, update, delete on public.skill_prerequisites to authenticated;

-- ---------------------------------------------------------------------------
-- Seed. Draft only, so practice does not serve it until an admin publishes it.
-- Misconception ids match the explanation-template mix-up tags.
-- ---------------------------------------------------------------------------

insert into public.misconceptions (id, skill_id, description)
select seed.id, skill.id, seed.description
from (
  values
    (
      'forgot_carried_ten',
      'g3-add-sub',
      'The ones were added, and the extra ten was not carried to the next place.'
    ),
    (
      'compared_digits_not_place_value',
      'g3-place',
      'The digits were compared one by one, without the place each digit is in.'
    ),
    (
      'added_instead_of_grouped',
      'g3-mult',
      'The numbers were added instead of counting equal groups.'
    ),
    (
      'counted_tick_marks_not_spaces',
      'g3-fractions',
      'The marks on the line were counted, instead of the spaces between them.'
    ),
    (
      'treated_equals_as_answer_here',
      'g3-add-sub',
      'The blank was treated as the answer to the whole line, instead of the missing part.'
    )
) as seed(id, skill_slug, description)
join public.skill on skill.slug = seed.skill_slug
on conflict (id) do update set description = excluded.description;

insert into public.skill_prerequisites (skill_id, prerequisite_skill_id)
select child.id, prior.id
from (
  values
    ('g3-place', 'g2-place'),
    ('g3-add-sub', 'g2-add-sub'),
    ('g3-mult', 'g2-groups'),
    ('g3-fractions', 'g2-fractions')
) as pair(skill_slug, prior_slug)
join public.skill as child on child.slug = pair.skill_slug
join public.skill as prior on prior.slug = pair.prior_slug
on conflict do nothing;

insert into public.content_items (
  id, skill_id, question_type, lane, difficulty, template, checker, status, source, version
)
select
  'c0ffee00-0000-4000-8000-000000000001',
  skill.id,
  'numeric',
  'core',
  1,
  '{"prompt":"{a} + {b} = ?","slots":{"a":46,"b":27},"answer":"73","steps":["Add the ones first.","Trade ones for a ten."]}'::jsonb,
  'numeric-equal',
  'draft',
  'hand_written',
  1
from public.skill
where skill.slug = 'g3-add-sub'
on conflict (id) do nothing;
