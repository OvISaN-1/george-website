/* ===========================================================
   GEORGE'S WEBSITE: ALL THE EDITABLE CONTENT, IN ONE PLACE
   -----------------------------------------------------------
   To update the site, change the text in this file and nothing
   else. Every page reads from here.

   Rules of thumb:
   - Keep the quotes around text: 'like this'.
   - Put a comma after each item in a list.
   - If a line of text needs an apostrophe, write it as \' or use
     "double quotes" around that text instead.
   =========================================================== */

window.SITE = {

  /* ---------- HOME ---------- */
  home: {
    // "Did you know?" strip. One is picked at random on every visit,
    // and the button under it shows another one.
    facts: [
      'I can do keepy-uppies for over a minute now.',
      'My favourite number is 10, because that is Gibbs-White\'s shirt.',
      'I am trying to learn every capital city in the world. Not there yet.',
      'My best Football Frenzy score keeps going up every week.',
      'I once played a whole FC 26 season as Forest without losing at home.',
      'Forest were European champions twice, in 1979 and 1980. I know every detail.',
      'My favourite band is AC/DC.',
      'Golden Retrievers are the best dogs in the world. Kind, chill and always happy.',
      'If I could invent anything, it would be a ball made for halfway line goals.',
    ],
  },

  /* ---------- FOOTBALL ---------- */
  football: {
    matchdayCaption: 'Matchday with Forest.',

    // How George became a Forest fan, in his own words.
    fanStory: 'I started supporting Forest in September 2024, when they beat Liverpool 1-0 at Anfield. Callum Hudson-Odoi scored the winner, and Liverpool went on to win the league that season. I have been Forest ever since.',

    // Update this by hand once a week or so.
    league: {
      position: '13th',
      played: 5,
      points: 5,
      asOf: '20 September 2026',
    },

    // Favourite player cards. Leave "photo" out to show a plain card.
    players: [
      {
        title: 'Morgan Gibbs-White',
        meta: 'Attacking midfielder',
        description: 'Our captain and he wears number 10, which is the best number. He sets up so many goals.',
        photo: 'assets/images/players/gibbs-white.webp',
        photoAlt: 'Morgan Gibbs-White',
      },
      {
        title: 'Neco Williams',
        meta: 'Left-back',
        description: 'Plays for Wales too and he gets forward and crosses it in like a winger, not just a defender.',
        photo: 'assets/images/players/neco-williams.webp',
        photoAlt: 'Neco Williams',
      },
      {
        title: 'Murillo',
        meta: 'Centre-back',
        description: 'One of the best defenders in the league and he is only young. Wins everything in the air.',
        // Placeholder graphic. Swap for a real photo with the same name when you have one.
        photo: 'assets/images/players/murillo.webp',
        photoAlt: 'Murillo',
      },
    ],

    myTeam: {
      name: 'Riverside Rangers U11s',
      position: 'Striker (and goalie when I play with my dad)',
      // George's own words. Shown instead of goal numbers.
      quote: 'I\'m not always the one scoring, but I\'m always in the game.',
    },

    // Premier League fixtures 2026/27. The "Next match" box and the
    // prediction tracker both work from this list automatically.
    // Dates and kick-off times can move for TV. If one changes, just
    // edit it here. Time is UK time, 24-hour clock.
    // venue: 'H' = home at the City Ground, 'A' = away.
    fixtures: [
      { date: '2026-08-22', time: '15:00', opponent: 'Leeds',          venue: 'H' },
      { date: '2026-08-29', time: '15:00', opponent: 'Liverpool',      venue: 'A' },
      { date: '2026-09-05', time: '15:00', opponent: 'Tottenham',      venue: 'H' },
      { date: '2026-09-12', time: '15:00', opponent: 'Aston Villa',    venue: 'A' },
      { date: '2026-09-19', time: '15:00', opponent: 'Coventry',       venue: 'H' },
      { date: '2026-10-11', time: '13:00', opponent: 'Crystal Palace', venue: 'A' },
      { date: '2026-10-18', time: '15:30', opponent: 'Arsenal',        venue: 'H' },
      { date: '2026-10-23', time: '19:00', opponent: 'Ipswich',        venue: 'A' },
      { date: '2026-10-31', time: '15:00', opponent: 'Brentford',      venue: 'A' },
      { date: '2026-11-07', time: '15:00', opponent: 'Man City',       venue: 'H' },
      { date: '2026-11-21', time: '15:00', opponent: 'Bournemouth',    venue: 'A' },
      { date: '2026-11-28', time: '15:00', opponent: 'Chelsea',        venue: 'H' },
      { date: '2026-12-02', time: '20:00', opponent: 'Hull',           venue: 'A' },
      { date: '2026-12-05', time: '15:00', opponent: 'Brighton',       venue: 'H' },
      { date: '2026-12-12', time: '15:00', opponent: 'Sunderland',     venue: 'A' },
      { date: '2026-12-19', time: '15:00', opponent: 'Everton',        venue: 'H' },
      { date: '2026-12-26', time: '15:00', opponent: 'Man Utd',        venue: 'A' },
      { date: '2026-12-30', time: '20:00', opponent: 'Newcastle',      venue: 'A' },
      { date: '2027-01-02', time: '15:00', opponent: 'Fulham',         venue: 'H' },
      { date: '2027-01-06', time: '20:00', opponent: 'Hull',           venue: 'H' },
      { date: '2027-01-16', time: '15:00', opponent: 'Man City',       venue: 'A' },
      { date: '2027-01-23', time: '15:00', opponent: 'Bournemouth',    venue: 'H' },
      { date: '2027-01-30', time: '15:00', opponent: 'Chelsea',        venue: 'A' },
      { date: '2027-02-06', time: '15:00', opponent: 'Brentford',      venue: 'H' },
      { date: '2027-02-10', time: '20:00', opponent: 'Fulham',         venue: 'A' },
      { date: '2027-02-20', time: '15:00', opponent: 'Man Utd',        venue: 'H' },
      { date: '2027-02-27', time: '15:00', opponent: 'Everton',        venue: 'A' },
      { date: '2027-03-03', time: '20:00', opponent: 'Newcastle',      venue: 'H' },
      { date: '2027-03-13', time: '15:00', opponent: 'Tottenham',      venue: 'A' },
      { date: '2027-03-20', time: '15:00', opponent: 'Aston Villa',    venue: 'H' },
      { date: '2027-04-10', time: '15:00', opponent: 'Leeds',          venue: 'A' },
      { date: '2027-04-17', time: '15:00', opponent: 'Liverpool',      venue: 'H' },
      { date: '2027-04-24', time: '15:00', opponent: 'Sunderland',     venue: 'H' },
      { date: '2027-05-01', time: '15:00', opponent: 'Brighton',       venue: 'A' },
      { date: '2027-05-08', time: '15:00', opponent: 'Crystal Palace', venue: 'H' },
      { date: '2027-05-15', time: '15:00', opponent: 'Arsenal',        venue: 'A' },
      { date: '2027-05-23', time: '15:00', opponent: 'Ipswich',        venue: 'H' },
      { date: '2027-05-30', time: '16:00', opponent: 'Coventry',       venue: 'A' },
    ],
  },

  /* ---------- VIDEO GAMES ---------- */
  games: {
    currentlyPlaying: 'EA Sports FC 26',
    topGames: [
      {
        title: 'Forza Horizon 6',
        meta: 'Top 200 online in Rivals',
        description: 'Racing round Mexico as fast as I can and smashing through the scenery when I get the chance.',
        photo: 'assets/images/games/forza-horizon-6.webp',
        photoAlt: 'Forza Horizon 6 logo',
      },
      {
        title: 'Goat Simulator 3',
        meta: 'Finished the campaign twice',
        description: 'It is just really funny. You can do anything and nothing matters.',
        photo: 'assets/images/games/goat-simulator-3.webp',
        photoAlt: 'Goat Simulator 3 cover art',
      },
      {
        title: 'EA Sports FC 26',
        meta: 'Division 4 online',
        description: 'I always play as Forest and try to win the league every single time.',
        photo: 'assets/images/games/ea-fc-26.webp',
        photoAlt: 'EA Sports FC 26 cover art',
      },
    ],
    topScores: [
      { game: 'EA Sports FC 26', best: 'Division 4 (Online)', date: 'Sep 2026' },
      { game: 'Forza Horizon 6', best: 'Top 200 in Rivals',   date: 'Aug 2026' },
    ],
    tryingToBeat: 'My own high score in Forza Horizon 6\'s speed trap challenges.',
  },

  /* ---------- SCHOOL ZONE ---------- */
  school: {
    favouriteSubject: 'PE',
    favouriteReason: 'we play football every week and I am usually one of the fastest.',
    achievements: [
      {
        title: 'Star of the Week',
        meta: 'At school',
        description: 'Picked as Star of the Week in class.',
        photoAlt: '⭐ Star of the Week',
      },
    ],
    termGoal: {
      title: 'Do well in Year 6 and pass my SATs',
      // The three steps along the progress bar.
      steps: [['📚', 'Autumn term'], ['✏️', 'Spring term'], ['🎓', 'SATs in May']],
      // How many steps are finished: 0, 1, 2 or 3 (3 = goal done!)
      badgesDone: 0,
      progressNote: 'Year 6 has just started. I get lots of questions right, and when I get some wrong I learn from them.',
    },
  },

  /* ---------- ABOUT ME ---------- */
  about: {
    // "Things I love" cards. emoji + a short title + a sentence in George's words.
    loves: [
      { emoji: '🎸', title: 'Rock music', text: 'AC/DC are my favourite band. Turn it up!' },
      { emoji: '🐶', title: 'Dogs', text: 'Golden Retrievers are the best breed, because they are kind, chill and always happy.' },
      { emoji: '🇷🇴', title: 'Romanian food', text: 'Sarmale. Nothing beats them.' },
      { emoji: '💡', title: 'My invention', text: 'If I could invent anything, it would be a ball made for scoring from the halfway line.' },
    ],
    funFacts: [
      'I have been to the City Ground four times and we have won three of them.',
      'My favourite Forest player is Morgan Gibbs-White.',
      'I can name the highest mountain in loads of countries, thanks to Peak Challenge.',
    ],
    quickFire: [
      { q: 'Forest or anyone else?', a: 'Forest, obviously.' },
      { q: 'Favourite way to spend a Saturday?', a: 'Football in the morning, then FC 26 in the afternoon.' },
      { q: 'One thing you\'re proud of this year?', a: 'Getting picked to play in a better position for my team.' },
      { q: 'Xbox, PlayStation, or PC?', a: 'Xbox, no contest.' },
      { q: 'Best thing about school?', a: 'PE, and seeing my mates.' },
      { q: 'Favourite band?', a: 'AC/DC.' },
      { q: 'Best dog breed?', a: 'Golden Retriever.' },
      { q: 'Best Romanian food?', a: 'Sarmale.' },
    ],
  },
};
