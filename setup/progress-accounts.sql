-- =====================================================================
-- George's website: PROGRESS ACCOUNTS (run once in Supabase)
-- ---------------------------------------------------------------------
-- Lets George keep his progress (Matchday career, Free Kick unlocks,
-- badges, settings...) under a username and password, so it follows him
-- to any device or browser. No email address is asked for or stored.
--
--   * The website can only call the five functions below. It can never
--     read or change the table directly.
--   * Passwords are scrambled (bcrypt) in the database, never stored as
--     typed. After 8 wrong guesses an account is locked for 15 minutes.
--   * Each device gets its own random key when it logs in, so the
--     password isn't kept on the device. A device can be logged out.
--   * A save is refused if the account was saved from another device
--     since this one last synced, so two devices can't silently
--     overwrite each other.
--
-- How to use: Supabase > SQL Editor > New query > paste this whole
-- file > click once in the editor, press Ctrl+A (select all) and Run.
-- (If only part of the text is highlighted, Supabase runs only that
-- part and fails with "unterminated dollar-quoted string".)
-- Safe to run again.
--
-- If George forgets his password (there is no email reset), run this
-- with his username and a new password:
--   update public.progress_accounts
--      set pass_hash = extensions.crypt('new-password', extensions.gen_salt('bf', 10)),
--          failed = 0, locked_until = null, tokens = '{}'
--    where username = 'his-username';
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.progress_accounts (
  username     text primary key,                  -- lower case
  display      text not null,                     -- as George typed it
  pass_hash    text not null,
  tokens       text[] not null default '{}',      -- hashed device keys (newest 6)
  data         jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  failed       int not null default 0,
  locked_until timestamptz
);

alter table public.progress_accounts enable row level security;
revoke all on public.progress_accounts from anon, authenticated;

-- ---------------------------------------------------------------------
-- Create an account (and save this device's progress into it).
-- ---------------------------------------------------------------------
create or replace function public.progress_create(p_user text, p_pass text, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u text := lower(btrim(coalesce(p_user, '')));
  tok text;
  stamp timestamptz := now();
begin
  if u !~ '^[a-z0-9_-]{3,18}$' then return jsonb_build_object('ok', false, 'error', 'bad_username'); end if;
  if length(coalesce(p_pass, '')) < 4 or length(p_pass) > 72 then return jsonb_build_object('ok', false, 'error', 'bad_password'); end if;
  if octet_length(coalesce(p_data, '{}'::jsonb)::text) > 1500000 then return jsonb_build_object('ok', false, 'error', 'too_big'); end if;
  if (select count(*) from public.progress_accounts where created_at > now() - interval '1 minute') >= 10 then
    return jsonb_build_object('ok', false, 'error', 'busy');
  end if;
  if exists (select 1 from public.progress_accounts where username = u) then
    return jsonb_build_object('ok', false, 'error', 'taken');
  end if;
  tok := encode(gen_random_bytes(24), 'hex');
  insert into public.progress_accounts (username, display, pass_hash, tokens, data, updated_at)
  values (u, left(btrim(p_user), 18), crypt(p_pass, gen_salt('bf', 10)), array[encode(digest(tok, 'sha256'), 'hex')], coalesce(p_data, '{}'::jsonb), stamp);
  return jsonb_build_object('ok', true, 'token', tok, 'updated_at', stamp, 'display', left(btrim(p_user), 18));
exception when unique_violation then
  return jsonb_build_object('ok', false, 'error', 'taken');
end;
$$;

-- ---------------------------------------------------------------------
-- Log in on a device: returns a key for that device and the saved progress.
-- ---------------------------------------------------------------------
create or replace function public.progress_login(p_user text, p_pass text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u text := lower(btrim(coalesce(p_user, '')));
  a public.progress_accounts;
  tok text;
  newtokens text[];
begin
  perform 1 from public.progress_accounts where username = u for update;
  a := (select t from public.progress_accounts t where t.username = u);
  if a.username is null then
    perform pg_sleep(0.4);     -- same wait as a wrong password, so names can't be guessed
    return jsonb_build_object('ok', false, 'error', 'wrong');
  end if;
  if a.locked_until is not null and a.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', 'locked');
  end if;
  if a.pass_hash <> crypt(coalesce(p_pass, ''), a.pass_hash) then
    -- (A normal return, not an error, so the count is kept.)
    update public.progress_accounts
       set failed = case when failed + 1 >= 8 then 0 else failed + 1 end,
           locked_until = case when failed + 1 >= 8 then now() + interval '15 minutes' else locked_until end
     where username = u;
    return jsonb_build_object('ok', false, 'error', 'wrong');
  end if;
  tok := encode(gen_random_bytes(24), 'hex');
  newtokens := a.tokens || encode(digest(tok, 'sha256'), 'hex');
  if array_length(newtokens, 1) > 6 then newtokens := newtokens[array_length(newtokens, 1) - 5:]; end if;
  update public.progress_accounts set tokens = newtokens, failed = 0, locked_until = null where username = u;
  return jsonb_build_object('ok', true, 'token', tok, 'data', a.data, 'updated_at', a.updated_at, 'display', a.display);
end;
$$;

-- ---------------------------------------------------------------------
-- Ask whether there is newer progress than the device has.
-- ---------------------------------------------------------------------
create or replace function public.progress_pull(p_user text, p_token text, p_since timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u text := lower(btrim(coalesce(p_user, '')));
  a public.progress_accounts;
begin
  a := (select t from public.progress_accounts t where t.username = u);
  if a.username is null or not (encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') = any (a.tokens)) then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;
  if p_since is not null and a.updated_at <= p_since then
    return jsonb_build_object('ok', true, 'changed', false, 'updated_at', a.updated_at);
  end if;
  return jsonb_build_object('ok', true, 'changed', true, 'data', a.data, 'updated_at', a.updated_at);
end;
$$;

-- ---------------------------------------------------------------------
-- Save progress. p_base is the time this device last synced; if the
-- account has been saved since (from another device) nothing is
-- overwritten unless p_force is true.
-- ---------------------------------------------------------------------
create or replace function public.progress_save(p_user text, p_token text, p_data jsonb, p_base timestamptz default null, p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u text := lower(btrim(coalesce(p_user, '')));
  a public.progress_accounts;
  stamp timestamptz := clock_timestamp();
begin
  perform 1 from public.progress_accounts where username = u for update;
  a := (select t from public.progress_accounts t where t.username = u);
  if a.username is null or not (encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') = any (a.tokens)) then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;
  if octet_length(coalesce(p_data, '{}'::jsonb)::text) > 1500000 then
    return jsonb_build_object('ok', false, 'error', 'too_big');
  end if;
  if not coalesce(p_force, false) and p_base is not null and a.updated_at > p_base then
    return jsonb_build_object('ok', false, 'error', 'conflict', 'updated_at', a.updated_at);
  end if;
  update public.progress_accounts set data = coalesce(p_data, '{}'::jsonb), updated_at = stamp where username = u;
  return jsonb_build_object('ok', true, 'updated_at', stamp);
end;
$$;

-- ---------------------------------------------------------------------
-- Log a device out (its key stops working).
-- ---------------------------------------------------------------------
create or replace function public.progress_logout(p_user text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u text := lower(btrim(coalesce(p_user, '')));
  h text := encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
begin
  update public.progress_accounts set tokens = array_remove(tokens, h) where username = u;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.progress_create(text, text, jsonb) from public;
revoke all on function public.progress_login(text, text) from public;
revoke all on function public.progress_pull(text, text, timestamptz) from public;
revoke all on function public.progress_save(text, text, jsonb, timestamptz, boolean) from public;
revoke all on function public.progress_logout(text, text) from public;
grant execute on function public.progress_create(text, text, jsonb) to anon, authenticated;
grant execute on function public.progress_login(text, text) to anon, authenticated;
grant execute on function public.progress_pull(text, text, timestamptz) to anon, authenticated;
grant execute on function public.progress_save(text, text, jsonb, timestamptz, boolean) to anon, authenticated;
grant execute on function public.progress_logout(text, text) to anon, authenticated;
