-- =====================================================================
-- George's website: LEADERBOARD SAFETY (run once in Supabase)
-- ---------------------------------------------------------------------
-- Every game saves scores straight into the "leaderboard" table. These
-- rules live in the database, so they protect all 8 games at once
-- without changing any game:
--   * names: 1-18 characters, letters/numbers/spaces (and ' - .),
--     at least one letter, and no rude words (tidied up automatically)
--   * scores: whole numbers, 0 up to a generous maximum for each game,
--     and only for George's real games
--   * no flooding: at most 30 new scores a minute across all games
--   * nobody can change or delete scores from the website
--
-- How to use: Supabase > SQL Editor > New query > paste this whole
-- file > Run. Safe to run again (it replaces the rules each time).
-- =====================================================================

-- A time stamp on each score, used for the "no flooding" rule.
alter table public.leaderboard add column if not exists created_at timestamptz not null default now();

create or replace function public.leaderboard_guard() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_score int;
  plain text;
  squashed text;
  bad text;
  -- Rude words, checked after undoing tricks like 5h1t or s-h-i-t.
  whole_words text[] := array['arse','ass','bum','cock','crap','damn','dick','fanny','hell','piss','poo','prick','sex','tit','tits','twat','wank','wanker','bastard','bitch','bollocks','bugger','shit','shite','slag','slut','whore','nazi','hitler','rape','kill','idiot','stupid','loser','dumb','ugly','hate'];
  -- Checked anywhere in the name (only words that never appear inside ordinary
  -- names; words like "cock" would block Hancock or Peacock, so they are
  -- whole-word only).
  anywhere text[] := array['fuck','shit','cunt','wank','nigg','fagg','bitch','twat','piss','bollock','whore','slut','porn','nazi','retard'];
begin
  -- Only George's games, each with a generous top score.
  max_score := case new.game
    when 'matchday' then 50000
    when 'free-kick' then 50000
    when 'keepy-uppy' then 100000
    when 'penalty-shootout' then 500
    when 'football-frenzy' then 1000
    when 'capital-quest' then 1000
    when 'mountain-peaks' then 1000
    when 'times-tables' then 5000
    else null end;
  if max_score is null then raise exception 'unknown game'; end if;
  if new.score is null or new.score < 0 or new.score > max_score or new.score <> trunc(new.score) then
    raise exception 'score not allowed';
  end if;

  -- Tidy the name: trim, single spaces, max 18 characters.
  new.player_name := left(regexp_replace(btrim(coalesce(new.player_name, '')), '\s+', ' ', 'g'), 18);
  if new.player_name = '' or new.player_name !~ '^[[:alnum:] .''-]+$' or new.player_name !~ '[[:alpha:]]' then
    raise exception 'name not allowed';
  end if;

  -- Rude word check. "plain" keeps word gaps, "squashed" removes them.
  plain := lower(translate(new.player_name, '013457@$!', 'oieastasi'));
  plain := regexp_replace(plain, '[^a-z]+', ' ', 'g');
  squashed := replace(plain, ' ', '');
  foreach bad in array whole_words loop
    if plain ~ ('(^| )' || bad || '( |$)') then raise exception 'name not allowed'; end if;
  end loop;
  foreach bad in array anywhere loop
    if position(bad in squashed) > 0 then raise exception 'name not allowed'; end if;
  end loop;

  -- No flooding.
  if (select count(*) from public.leaderboard where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'too many scores, try again in a minute';
  end if;

  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists leaderboard_guard on public.leaderboard;
create trigger leaderboard_guard
  before insert on public.leaderboard
  for each row execute function public.leaderboard_guard();

-- The website can add and read scores, but never change or delete them.
revoke update, delete, truncate on public.leaderboard from anon, authenticated;
