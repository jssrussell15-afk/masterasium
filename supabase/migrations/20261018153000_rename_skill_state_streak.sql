-- skill_states.streak counts consecutive correct answers for one skill.
-- It is not a daily streak, a reward, or a parent-facing counter.
-- Rename it so the column name matches that job. Do not edit earlier migrations.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'skill_states'
      and column_name = 'streak'
  ) then
    alter table public.skill_states rename column streak to consecutive_correct;
  end if;
end $$;
