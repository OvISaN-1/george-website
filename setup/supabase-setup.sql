-- =====================================================================
-- George's website: Supabase setup for the PREDICTION TRACKER
-- ---------------------------------------------------------------------
-- How to use:
--   1. Open your Supabase project > SQL Editor > New query.
--   2. Paste this whole file.
--   3. BEFORE running it, change CHANGE-ME-TO-A-SECRET below to the PIN
--      you and George will type on the Football page. Use at least 6
--      characters (a word + numbers is fine, e.g. tricky-trees-79).
--      Do NOT save your real PIN back into this file: this file is
--      published on GitHub with the rest of the site.
--   4. Click Run. It is safe to run again later (for example to change
--      the PIN), nothing gets deleted.
-- =====================================================================

-- Needed for crypt() / gen_salt(). Supabase keeps it in the "extensions" schema.
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. The predictions table: one row per Forest match.
-- ---------------------------------------------------------------------
create table if not exists public.predictions (
  match_key        text primary key,          -- e.g. 2026-10-11-crystal-palace
  match_date       date not null,
  opponent         text not null,
  venue            text not null check (venue in ('H', 'A')),
  pred_forest      smallint check (pred_forest between 0 and 20),
  pred_opponent    smallint check (pred_opponent between 0 and 20),
  result_forest    smallint check (result_forest between 0 and 20),
  result_opponent  smallint check (result_opponent between 0 and 20),
  updated_at       timestamptz not null default now()
);

alter table public.predictions enable row level security;

-- Anyone can READ predictions (the page shows them to every visitor).
drop policy if exists "predictions are readable by everyone" on public.predictions;
create policy "predictions are readable by everyone"
  on public.predictions for select
  to anon, authenticated
  using (true);

-- There is deliberately NO insert/update policy. Visitors cannot write to
-- this table directly. The only way in is the save_prediction() function
-- below, which checks the PIN first.

-- ---------------------------------------------------------------------
-- 2. Where the PIN lives (hashed, never readable through the website).
-- ---------------------------------------------------------------------
create table if not exists public.site_secrets (
  name      text primary key,
  pin_hash  text not null
);
alter table public.site_secrets enable row level security;
-- No policies at all = the website can never read this table.

insert into public.site_secrets (name, pin_hash)
values ('predictions', extensions.crypt('999999', extensions.gen_salt('bf')))
on conflict (name) do update set pin_hash = excluded.pin_hash;

-- ---------------------------------------------------------------------
-- 3. The PIN-protected save function the Football page calls.
--    p_kind = 'prediction' (George's guess) or 'result' (the final score).
-- ---------------------------------------------------------------------
create or replace function public.save_prediction(
  p_pin            text,
  p_match_key      text,
  p_match_date     date,
  p_opponent       text,
  p_venue          text,
  p_kind           text,
  p_forest         int,
  p_opponent_goals int
) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  -- Small delay makes guessing the PIN over and over painfully slow.
  perform pg_sleep(0.5);

  if not exists (
    select 1 from public.site_secrets
    where name = 'predictions' and pin_hash = crypt(p_pin, pin_hash)
  ) then
    raise exception 'wrong pin';
  end if;

  if p_kind not in ('prediction', 'result') then
    raise exception 'bad kind';
  end if;
  if p_forest is null or p_opponent_goals is null
     or p_forest not between 0 and 20 or p_opponent_goals not between 0 and 20 then
    raise exception 'bad score';
  end if;
  if p_venue not in ('H', 'A') or length(p_opponent) > 40 or length(p_match_key) > 80 then
    raise exception 'bad match';
  end if;

  -- Predictions close once match day arrives.
  if p_kind = 'prediction' and p_match_date < (now() at time zone 'Europe/London')::date then
    raise exception 'too late';
  end if;

  insert into public.predictions (match_key, match_date, opponent, venue)
  values (p_match_key, p_match_date, p_opponent, p_venue)
  on conflict (match_key) do nothing;

  if p_kind = 'prediction' then
    update public.predictions
       set pred_forest = p_forest, pred_opponent = p_opponent_goals, updated_at = now()
     where match_key = p_match_key;
  else
    update public.predictions
       set result_forest = p_forest, result_opponent = p_opponent_goals, updated_at = now()
     where match_key = p_match_key;
  end if;
end;
$$;

revoke all on function public.save_prediction(text, text, date, text, text, text, int, int) from public;
grant execute on function public.save_prediction(text, text, date, text, text, text, int, int) to anon, authenticated;


-- =====================================================================
-- KEEPY-UPPY + TIMES TABLES on the shared leaderboard
-- ---------------------------------------------------------------------
-- The two new games save to the same "leaderboard" table as the three
-- quizzes, using game = 'keepy-uppy' and game = 'times-tables'.
-- If you set up that table with a rule that only allows the original
-- three game names, new scores will be refused. Run these two queries
-- to check. If neither mentions game names, you don't need to do anything.
-- Newer games save with game = 'free-kick' and game = 'matchday' too.
-- =====================================================================
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.leaderboard'::regclass;
-- select policyname, cmd, qual, with_check from pg_policies where tablename = 'leaderboard';
