-- Students sign in with their first name and PIN. The username is stored from the
-- first name and is not typed at sign-in.
-- Paste after the student login statements. Paste this again if an earlier copy is already there.

create or replace function public.student_name_key(p_name text)
returns text
language sql
stable
set search_path = public
as $$
  select regexp_replace(
    translate(
      lower(btrim(coalesce(p_name, ''))),
      'àáâãäåāăąèéêëēĕėęìíîïīĭįòóôõöōŏőùúûüūŭůűñçýÿ',
      'aaaaaaaaaeeeeeeeeiiiiiiioooooooouuuuuuuuncyy'
    ),
    '[^a-z0-9]',
    '',
    'g'
  );
$$;

-- Wrong name and wrong PIN return null. The failure is committed so the limit holds.
create or replace function public.start_student_session_by_name(
  p_first_name text,
  p_pin text
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_key text;
  v_child_id uuid;
  v_matches integer := 0;
  v_recent integer;
  v_token text;
  v_row record;
  v_dummy text := '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
begin
  v_key := public.student_name_key(p_first_name);
  if v_key = '' or char_length(v_key) > 40 or coalesce(p_pin, '') !~ '^[0-9]{4,6}$' then
    return null;
  end if;

  delete from public.student_login_attempts
  where attempted_at < now() - interval '1 day';

  select count(*) into v_recent
  from public.student_login_attempts
  where username = v_key
    and attempted_at > now() - interval '15 minutes';

  if v_recent >= 8 then
    return 'locked';
  end if;

  insert into public.student_login_attempts (username)
  values (v_key);

  for v_row in
    select id, pin_hash
    from public.children
    where public.student_name_key(first_name) = v_key
      and pin_hash is not null
  loop
    if crypt(p_pin, coalesce(v_row.pin_hash, v_dummy)) = v_row.pin_hash then
      v_matches := v_matches + 1;
      v_child_id := v_row.id;
    end if;
  end loop;

  if v_matches <> 1 then
    return null;
  end if;

  delete from public.student_login_attempts
  where username = v_key;

  delete from public.student_sessions
  where child_id = v_child_id
    and expires_at <= now();

  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.student_sessions (child_id, token_hash, expires_at)
  values (
    v_child_id,
    encode(digest(v_token, 'sha256'), 'hex'),
    now() + interval '14 days'
  );

  return v_token;
end;
$$;

revoke all on function public.student_name_key(text) from public, anon, authenticated;
revoke all on function public.start_student_session_by_name(text, text) from public, anon, authenticated;
grant execute on function public.start_student_session_by_name(text, text) to anon, authenticated;
