/* ================================================================
   MATCHDAY: questions, difficulty levels and the "brain" that
   learns from George's answers.

   Every question has a starting level: 1 = easy, 2 = medium, 3 = hard.
   That's only a first guess. The brain remembers every answer on this
   device and moves each question up or down to match how George
   actually does. Questions he gets wrong come back more often.

   A question's difficulty on the pitch also depends on:
     - how many answer buttons are shown (2 easy, 3 medium, 4 hard)
     - how tricky the wrong answers are
     - the timer (set by the game)

   Adding questions: w = wrong answers, TRICKIEST FIRST. Easy questions
   show the least tricky ones, hard questions show the trickiest.
   ================================================================ */
(function (MQ) {
  "use strict";

  const rand = Math.random;
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const SUBJECTS = {
    maths:     { label: "Times tables", emoji: "✖️" },
    capitals:  { label: "Capital cities", emoji: "🌍" },
    mountains: { label: "Mountains", emoji: "🏔️" },
    football:  { label: "Football", emoji: "⚽" },
    forest:    { label: "Forest", emoji: "🌳" },
  };

  /* ---------------- Football ---------------- */
  const FOOTBALL = [
    // level 1
    { l: 1, q: "How many players does each team have on the pitch?", a: "11", w: ["10", "12", "9"] },
    { l: 1, q: "What colour card gets a player sent off?", a: "Red", w: ["Yellow", "Blue", "Green"] },
    { l: 1, q: "How many minutes is a normal football match?", a: "90", w: ["80", "100", "60"] },
    { l: 1, q: "Which country is Lionel Messi from?", a: "Argentina", w: ["Brazil", "Spain", "Italy"] },
    { l: 1, q: "Which country is Cristiano Ronaldo from?", a: "Portugal", w: ["Spain", "Brazil", "France"] },
    { l: 1, q: "Which player is the only one allowed to handle the ball?", a: "The goalkeeper", w: ["The captain", "The striker", "The defender"] },
    { l: 1, q: "What does VAR stand for?", a: "Video Assistant Referee", w: ["Very Angry Referee", "Video Action Replay", "Visual Area Rule"] },
    { l: 1, q: "Which team plays at Old Trafford?", a: "Manchester United", w: ["Manchester City", "Liverpool", "Arsenal"] },
    { l: 1, q: "Which team plays at Anfield?", a: "Liverpool", w: ["Everton", "Chelsea", "Leeds"] },
    { l: 1, q: "How many points do you get for a win in the Premier League?", a: "3", w: ["2", "1", "4"] },
    { l: 1, q: "Erling Haaland plays for which club?", a: "Manchester City", w: ["Manchester United", "Chelsea", "Arsenal"] },
    // level 2
    { l: 2, q: "How far is the penalty spot from the goal line?", a: "12 yards", w: ["10 yards", "18 yards", "6 yards"] },
    { l: 2, q: "How far must the wall stand from a free kick?", a: "10 yards", w: ["12 yards", "8 yards", "5 yards"] },
    { l: 2, q: "Which country won the 2022 World Cup?", a: "Argentina", w: ["France", "Brazil", "England"] },
    { l: 2, q: "Which club is nicknamed 'The Toffees'?", a: "Everton", w: ["Fulham", "Brentford", "Leeds"] },
    { l: 2, q: "Which club is nicknamed 'The Cherries'?", a: "Bournemouth", w: ["Brentford", "Crystal Palace", "Sunderland"] },
    { l: 2, q: "Which club plays at Selhurst Park?", a: "Crystal Palace", w: ["Fulham", "Brentford", "Tottenham"] },
    { l: 2, q: "Which club plays at Villa Park?", a: "Aston Villa", w: ["Coventry", "Leeds", "Everton"] },
    { l: 2, q: "What is it called when a player scores three goals in one match?", a: "A hat-trick", w: ["A treble", "A triple", "A brace"] },
    { l: 2, q: "Which country hosted the 2022 World Cup?", a: "Qatar", w: ["Russia", "Brazil", "USA"] },
    { l: 2, q: "Which club is nicknamed 'The Black Cats'?", a: "Sunderland", w: ["Hull", "Newcastle", "Fulham"] },
    { l: 2, q: "Which country will co-host the 2026 World Cup with Canada and Mexico?", a: "USA", w: ["Brazil", "England", "Spain"] },
    // level 3
    { l: 3, q: "Which club has won the most English top-flight titles?", a: "Manchester United", w: ["Liverpool", "Arsenal", "Everton"] },
    { l: 3, q: "In which year did England win the World Cup?", a: "1966", w: ["1970", "1962", "1990"] },
    { l: 3, q: "Which club went a whole Premier League season unbeaten in 2003/04?", a: "Arsenal", w: ["Chelsea", "Manchester United", "Liverpool"] },
    { l: 3, q: "Who is the Premier League's all-time top scorer?", a: "Alan Shearer", w: ["Harry Kane", "Wayne Rooney", "Sergio Agüero"] },
    { l: 3, q: "Which club is nicknamed 'The Tractor Boys'?", a: "Ipswich", w: ["Hull", "Coventry", "Norwich"] },
    { l: 3, q: "Which club is nicknamed 'The Sky Blues'?", a: "Coventry", w: ["Manchester City", "Brighton", "Everton"] },
    { l: 3, q: "Which club is nicknamed 'The Tigers'?", a: "Hull", w: ["Leicester", "Sunderland", "Wolves"] },
    { l: 3, q: "How wide is a full-size goal?", a: "8 yards", w: ["7 yards", "10 yards", "6 yards"] },
    { l: 3, q: "Which country has won the most World Cups?", a: "Brazil", w: ["Germany", "Italy", "Argentina"] },
    { l: 3, q: "How many substitutes can a Premier League team use in a match?", a: "5", w: ["3", "4", "6"] },
    // more level 1
    { l: 1, q: "Who is in charge of a football match?", a: "The referee", w: ["The captain", "The manager", "The goalkeeper"] },
    { l: 1, q: "What does a yellow card mean?", a: "A warning", w: ["You're sent off", "A goal", "Half-time"] },
    { l: 1, q: "Harry Kane plays for which country?", a: "England", w: ["Scotland", "Wales", "Ireland"] },
    { l: 1, q: "Mohamed Salah is from which country?", a: "Egypt", w: ["Morocco", "Nigeria", "Brazil"] },
    { l: 1, q: "Kylian Mbappé plays for which country?", a: "France", w: ["Belgium", "Spain", "Portugal"] },
    { l: 1, q: "Which team plays at the Emirates Stadium?", a: "Arsenal", w: ["Tottenham", "Chelsea", "Fulham"] },
    { l: 1, q: "Which team plays at Stamford Bridge?", a: "Chelsea", w: ["Arsenal", "Brentford", "Leeds"] },
    { l: 1, q: "What is the line across the middle of the pitch called?", a: "The halfway line", w: ["The goal line", "The touchline", "The penalty line"] },
    { l: 1, q: "What is the big box in front of each goal called?", a: "The penalty area", w: ["The centre circle", "The dugout", "The corner"] },
    { l: 1, q: "Who wears gloves and can use their hands?", a: "The goalkeeper", w: ["The referee", "The striker", "The linesman"] },
    { l: 1, q: "What does the linesman wave when a player is offside?", a: "A flag", w: ["A card", "A whistle", "A scarf"] },
    // more level 2
    { l: 2, q: "How long is each half of a normal match?", a: "45 minutes", w: ["40 minutes", "50 minutes", "30 minutes"] },
    { l: 2, q: "What is a 'clean sheet'?", a: "Not letting in any goals", w: ["A new kit", "A match with no fouls", "Winning by five"] },
    { l: 2, q: "Which club is nicknamed 'The Gunners'?", a: "Arsenal", w: ["Tottenham", "Chelsea", "West Ham"] },
    { l: 2, q: "Which club is nicknamed 'The Magpies'?", a: "Newcastle", w: ["Sunderland", "Fulham", "Everton"] },
    { l: 2, q: "Which club is nicknamed 'The Seagulls'?", a: "Brighton", w: ["Bournemouth", "Ipswich", "Hull"] },
    { l: 2, q: "Which club is nicknamed 'The Bees'?", a: "Brentford", w: ["Leeds", "Coventry", "Fulham"] },
    { l: 2, q: "Which club is nicknamed 'Spurs'?", a: "Tottenham", w: ["Arsenal", "Chelsea", "Crystal Palace"] },
    { l: 2, q: "Which club plays at the Etihad Stadium?", a: "Manchester City", w: ["Manchester United", "Everton", "Leeds"] },
    { l: 2, q: "Which club plays at Elland Road?", a: "Leeds", w: ["Hull", "Sunderland", "Coventry"] },
    { l: 2, q: "How many teams are in the Premier League?", a: "20", w: ["18", "22", "24"] },
    { l: 2, q: "How long is extra time altogether?", a: "30 minutes", w: ["20 minutes", "45 minutes", "10 minutes"] },
    { l: 2, q: "Which country won Euro 2024?", a: "Spain", w: ["England", "France", "Germany"] },
    { l: 2, q: "What are England's women's team called?", a: "The Lionesses", w: ["The Tigers", "The Roses", "The Eagles"] },
    { l: 2, q: "What is it called when a player scores two goals in a match?", a: "A brace", w: ["A hat-trick", "A double top", "A pair"] },
    // more level 3
    { l: 3, q: "Which country won the very first World Cup in 1930?", a: "Uruguay", w: ["Argentina", "Brazil", "Italy"] },
    { l: 3, q: "Which club did Steven Gerrard captain?", a: "Liverpool", w: ["Everton", "Chelsea", "Manchester United"] },
    { l: 3, q: "Which club is nicknamed 'The Villans'?", a: "Aston Villa", w: ["West Ham", "Coventry", "Crystal Palace"] },
    { l: 3, q: "Which club is nicknamed 'The Eagles'?", a: "Crystal Palace", w: ["Brighton", "Fulham", "Brentford"] },
    { l: 3, q: "Which club plays at Portman Road?", a: "Ipswich", w: ["Hull", "Coventry", "Norwich"] },
    { l: 3, q: "Which club plays at the Stadium of Light?", a: "Sunderland", w: ["Newcastle", "Leeds", "Hull"] },
    { l: 3, q: "In which year did the Premier League start?", a: "1992", w: ["1988", "1995", "2000"] },
    { l: 3, q: "Which player has won the most Ballon d'Or awards?", a: "Lionel Messi", w: ["Cristiano Ronaldo", "Michel Platini", "Johan Cruyff"] },
    { l: 3, q: "How high is the crossbar from the ground?", a: "8 feet", w: ["7 feet", "9 feet", "10 feet"] },
    { l: 3, q: "Which country has won the Men's Euros the most times?", a: "Spain", w: ["Germany", "France", "Italy"] },
    { l: 3, q: "What is a 'Panenka'?", a: "A chipped penalty down the middle", w: ["A bicycle kick", "A back-heel pass", "A long throw"] },
  ];

  /* ---------------- Forest ----------------
     Most come from forest-questions.js (shared with the Penalty
     Shootout and Free Kick games). These are Matchday extras. */
  const FOREST_HARD = [
    { l: 3, q: "Who scored the winner for Forest in the 1979 European Cup final?", a: "Trevor Francis", w: ["John Robertson", "Garry Birtles", "Tony Woodcock"] },
    { l: 3, q: "Who scored the winner for Forest in the 1980 European Cup final?", a: "John Robertson", w: ["Trevor Francis", "Garry Birtles", "Martin O'Neill"] },
    { l: 3, q: "Which team did Forest beat in the 1979 European Cup final?", a: "Malmö", w: ["Hamburg", "Liverpool", "Ajax"] },
    { l: 3, q: "Which team did Forest beat in the 1980 European Cup final?", a: "Hamburg", w: ["Malmö", "Bayern Munich", "Real Madrid"] },
    { l: 3, q: "Who was Brian Clough's assistant manager at Forest?", a: "Peter Taylor", w: ["Martin O'Neill", "Frank Clark", "Stuart Pearce"] },
    { l: 3, q: "In which season did Forest win the English league title?", a: "1977/78", w: ["1979/80", "1975/76", "1990/91"] },
    { l: 3, q: "Which Forest legend was nicknamed 'Psycho'?", a: "Stuart Pearce", w: ["Roy Keane", "Des Walker", "Nigel Clough"] },
    { l: 3, q: "In which year was Nottingham Forest founded?", a: "1865", w: ["1878", "1892", "1901"] },
    // Nottingham and Forest extras (levels 1 and 2 too)
    { l: 1, q: "What is the name of Nottingham's famous castle?", a: "Nottingham Castle", w: ["Windsor Castle", "Edinburgh Castle", "Warwick Castle"] },
    { l: 1, q: "Robin Hood lived in which forest?", a: "Sherwood Forest", w: ["Epping Forest", "The New Forest", "Kielder Forest"] },
    { l: 1, q: "What sport do Nottingham Forest play?", a: "Football", w: ["Rugby", "Cricket", "Hockey"] },
    { l: 2, q: "What were Robin Hood's band of friends called?", a: "The Merry Men", w: ["The Happy Gang", "The Green Team", "The Forest Five"] },
    { l: 2, q: "Who was the baddie in the Robin Hood stories?", a: "The Sheriff of Nottingham", w: ["The Mayor of Derby", "King Arthur", "The Duke of York"] },
    { l: 2, q: "Which manager took Forest back to the Premier League in 2022?", a: "Steve Cooper", w: ["Sean Dyche", "Nuno Espírito Santo", "Martin O'Neill"] },
    { l: 2, q: "Which European competition did Forest play in in 2025/26?", a: "Europa League", w: ["Champions League", "Conference League", "Intertoto Cup"] },
    { l: 3, q: "Which Nottingham club is the oldest professional club in the world?", a: "Notts County", w: ["Nottingham Forest", "Sheffield FC", "Stoke City"] },
    { l: 3, q: "Which Forest keeper was the play-off semi-final shootout hero in 2022?", a: "Brice Samba", w: ["Matz Sels", "Dean Henderson", "Ethan Horvath"] },
    { l: 3, q: "Which Forest legend scored a free kick in the 1991 FA Cup final?", a: "Stuart Pearce", w: ["Nigel Clough", "Des Walker", "Roy Keane"] },
    { l: 3, q: "Brian Clough's son played up front for Forest. What is his name?", a: "Nigel Clough", w: ["Simon Clough", "Peter Clough", "David Clough"] },
    { l: 3, q: "Which Nottingham pub claims to be the oldest inn in England?", a: "Ye Olde Trip to Jerusalem", w: ["The Robin Hood Arms", "The Castle Inn", "The Sherwood Oak"] },
  ];

  /* ---------------- Capitals ----------------
     region is used to find tricky wrong answers (other capitals nearby).
     trick = cities people often guess by mistake. */
  const CAPITALS = [
    ["France", "Paris", 1, "Europe"], ["Spain", "Madrid", 1, "Europe"], ["Italy", "Rome", 1, "Europe"], ["Germany", "Berlin", 1, "Europe"],
    ["the United Kingdom", "London", 1, "Europe"], ["Ireland", "Dublin", 1, "Europe"], ["Japan", "Tokyo", 1, "Asia"], ["Egypt", "Cairo", 1, "Africa"],
    ["Greece", "Athens", 1, "Europe"], ["Portugal", "Lisbon", 1, "Europe"], ["Russia", "Moscow", 1, "Europe"], ["China", "Beijing", 1, "Asia"],
    ["the USA", "Washington, D.C.", 2, "Americas", ["New York", "Los Angeles"]],
    ["Scotland", "Edinburgh", 2, "Europe", ["Glasgow", "Aberdeen"]], ["Wales", "Cardiff", 2, "Europe", ["Swansea"]],
    ["the Netherlands", "Amsterdam", 2, "Europe", ["Rotterdam"]], ["Belgium", "Brussels", 2, "Europe"], ["Norway", "Oslo", 2, "Europe"],
    ["Sweden", "Stockholm", 2, "Europe"], ["Denmark", "Copenhagen", 2, "Europe"], ["Poland", "Warsaw", 2, "Europe", ["Kraków"]],
    ["Austria", "Vienna", 2, "Europe"], ["Argentina", "Buenos Aires", 2, "Americas"], ["Mexico", "Mexico City", 2, "Americas"],
    ["India", "New Delhi", 2, "Asia", ["Mumbai"]], ["Kenya", "Nairobi", 2, "Africa"], ["South Korea", "Seoul", 2, "Asia"],
    ["Hungary", "Budapest", 2, "Europe"], ["Czechia", "Prague", 2, "Europe"], ["Romania", "Bucharest", 2, "Europe"],
    ["Australia", "Canberra", 3, "Oceania", ["Sydney", "Melbourne"]], ["Canada", "Ottawa", 3, "Americas", ["Toronto", "Vancouver"]],
    ["Brazil", "Brasília", 3, "Americas", ["Rio de Janeiro", "São Paulo"]], ["Turkey", "Ankara", 3, "Europe", ["Istanbul"]],
    ["Switzerland", "Bern", 3, "Europe", ["Zurich", "Geneva"]], ["New Zealand", "Wellington", 3, "Oceania", ["Auckland"]],
    ["Nigeria", "Abuja", 3, "Africa", ["Lagos"]], ["Morocco", "Rabat", 3, "Africa", ["Casablanca", "Marrakesh"]],
    ["Pakistan", "Islamabad", 3, "Asia", ["Karachi", "Lahore"]], ["Vietnam", "Hanoi", 3, "Asia", ["Ho Chi Minh City"]],
    ["Iceland", "Reykjavík", 3, "Europe"], ["Croatia", "Zagreb", 3, "Europe", ["Split"]], ["Colombia", "Bogotá", 3, "Americas", ["Medellín"]],
    ["Chile", "Santiago", 3, "Americas"], ["Peru", "Lima", 3, "Americas"], ["Finland", "Helsinki", 3, "Europe"],
    ["Thailand", "Bangkok", 2, "Asia", ["Phuket"]], ["Jamaica", "Kingston", 2, "Americas", ["Montego Bay"]], ["Cuba", "Havana", 2, "Americas"],
    ["Ukraine", "Kyiv", 2, "Europe", ["Odesa"]], ["Indonesia", "Jakarta", 2, "Asia", ["Bali"]], ["the Philippines", "Manila", 2, "Asia"],
    ["Northern Ireland", "Belfast", 2, "Europe", ["Derry"]], ["Monaco", "Monaco", 2, "Europe", ["Monte Carlo"]], ["Singapore", "Singapore", 2, "Asia"],
    ["Serbia", "Belgrade", 3, "Europe"], ["Bulgaria", "Sofia", 3, "Europe"], ["Slovakia", "Bratislava", 3, "Europe"], ["Slovenia", "Ljubljana", 3, "Europe"],
    ["Estonia", "Tallinn", 3, "Europe"], ["Latvia", "Riga", 3, "Europe"], ["Lithuania", "Vilnius", 3, "Europe"], ["Malta", "Valletta", 3, "Europe"],
    ["Ghana", "Accra", 3, "Africa"], ["Ethiopia", "Addis Ababa", 3, "Africa"], ["Tanzania", "Dodoma", 3, "Africa", ["Dar es Salaam", "Zanzibar"]],
    ["Saudi Arabia", "Riyadh", 3, "Asia", ["Jeddah", "Mecca"]], ["the United Arab Emirates", "Abu Dhabi", 3, "Asia", ["Dubai"]],
    ["Malaysia", "Kuala Lumpur", 3, "Asia"], ["Iran", "Tehran", 3, "Asia"], ["Bangladesh", "Dhaka", 3, "Asia"],
    ["Uruguay", "Montevideo", 3, "Americas"], ["Venezuela", "Caracas", 3, "Americas"], ["Ecuador", "Quito", 3, "Americas", ["Guayaquil"]],
  ];

  /* ---------------- Mountains ---------------- */
  const MOUNTAINS = [
    { l: 1, q: "What is the highest mountain in the world?", a: "Mount Everest", w: ["K2", "Mont Blanc", "Ben Nevis"] },
    { l: 1, q: "What is the highest mountain in the UK?", a: "Ben Nevis", w: ["Snowdon", "Scafell Pike", "Mount Everest"] },
    { l: 1, q: "Mount Fuji is in which country?", a: "Japan", w: ["China", "Nepal", "Italy"] },
    { l: 2, q: "What is the highest mountain in England?", a: "Scafell Pike", w: ["Helvellyn", "Ben Nevis", "Snowdon"] },
    { l: 2, q: "What is the highest mountain in Wales?", a: "Yr Wyddfa (Snowdon)", w: ["Pen y Fan", "Scafell Pike", "Ben Nevis"] },
    { l: 2, q: "What is the highest mountain in Africa?", a: "Kilimanjaro", w: ["Mount Kenya", "Atlas", "Table Mountain"] },
    { l: 2, q: "Mont Blanc is on the border of France and which country?", a: "Italy", w: ["Switzerland", "Spain", "Germany"] },
    { l: 2, q: "About how tall is Mount Everest?", a: "8,849 m", w: ["7,500 m", "10,200 m", "5,000 m"] },
    { l: 2, q: "In which country is Ben Nevis?", a: "Scotland", w: ["Wales", "England", "Ireland"] },
    { l: 3, q: "What is the second highest mountain in the world?", a: "K2", w: ["Kangchenjunga", "Lhotse", "Makalu"] },
    { l: 3, q: "What is the highest mountain in South America?", a: "Aconcagua", w: ["Chimborazo", "Huascarán", "Illimani"] },
    { l: 3, q: "What is the highest mountain in North America?", a: "Denali", w: ["Mount Logan", "Mount Whitney", "Mount Rainier"] },
    { l: 3, q: "What is the highest mountain in Europe?", a: "Mount Elbrus", w: ["Mont Blanc", "Matterhorn", "Mount Olympus"] },
    { l: 3, q: "What is the highest mountain in Australia?", a: "Mount Kosciuszko", w: ["Uluru", "Mount Townsend", "Mount Bogong"] },
    { l: 3, q: "What is the highest mountain in Romania?", a: "Moldoveanu", w: ["Negoiu", "Omu", "Parângu Mare"] },
    { l: 3, q: "About how tall is Ben Nevis?", a: "1,345 m", w: ["1,085 m", "978 m", "2,100 m"] },
    { l: 1, q: "What do we call a mountain that can erupt?", a: "A volcano", w: ["A glacier", "A canyon", "A valley"] },
    { l: 1, q: "Which is usually bigger: a mountain or a hill?", a: "A mountain", w: ["A hill", "They're the same", "A molehill"] },
    { l: 1, q: "The Alps are mountains on which continent?", a: "Europe", w: ["Asia", "Africa", "South America"] },
    { l: 1, q: "The Rocky Mountains are on which continent?", a: "North America", w: ["Europe", "Asia", "Australia"] },
    { l: 2, q: "Mount Everest is in which mountain range?", a: "The Himalayas", w: ["The Alps", "The Andes", "The Rockies"] },
    { l: 2, q: "Which long mountain range runs down South America?", a: "The Andes", w: ["The Alps", "The Urals", "The Atlas"] },
    { l: 2, q: "Which mountains are on the border of France and Spain?", a: "The Pyrenees", w: ["The Alps", "The Dolomites", "The Carpathians"] },
    { l: 2, q: "Which volcano buried the Roman town of Pompeii?", a: "Vesuvius", w: ["Etna", "Stromboli", "Fuji"] },
    { l: 2, q: "Mount Olympus is in which country?", a: "Greece", w: ["Italy", "Turkey", "Cyprus"] },
    { l: 2, q: "Table Mountain looks over which city?", a: "Cape Town", w: ["Nairobi", "Cairo", "Lagos"] },
    { l: 2, q: "Who first climbed Everest in 1953?", a: "Edmund Hillary and Tenzing Norgay", w: ["George Mallory and Andrew Irvine", "Reinhold Messner", "Neil Armstrong"] },
    { l: 3, q: "Kilimanjaro is in which country?", a: "Tanzania", w: ["Kenya", "Uganda", "Ethiopia"] },
    { l: 3, q: "What is the highest mountain in Ireland?", a: "Carrauntoohil", w: ["Slieve Donard", "Croagh Patrick", "Lugnaquilla"] },
    { l: 3, q: "Mount Etna is a volcano on which island?", a: "Sicily", w: ["Sardinia", "Crete", "Corsica"] },
    { l: 3, q: "Ben Nevis is in which mountain range?", a: "The Grampians", w: ["The Cairngorms", "The Pennines", "The Cheviots"] },
    { l: 3, q: "Which mountains run between Europe and Asia in Russia?", a: "The Urals", w: ["The Caucasus", "The Carpathians", "The Balkans"] },
    { l: 3, q: "What is the line on a mountain above which trees can't grow?", a: "The tree line", w: ["The snow line", "The contour line", "The ridge line"] },
  ];

  /* ---------------- World Class (level 4) ----------------
     For when George is getting nearly everything right. */
  const WORLD_CLASS = [
    // football
    ["football", "Which club won the 2005 Champions League final in Istanbul?", "Liverpool", ["AC Milan", "Chelsea", "Barcelona"]],
    ["football", "Which team won the Premier League in 2015/16 as 5000-1 outsiders?", "Leicester City", ["Tottenham", "West Ham", "Southampton"]],
    ["football", "Who scored the famous last-minute goal to win Man City the 2012 title?", "Sergio Agüero", ["Edin Džeko", "Yaya Touré", "Mario Balotelli"]],
    ["football", "Which country won Euro 2016?", "Portugal", ["France", "Wales", "Germany"]],
    ["football", "Which club won the very first Premier League title in 1992/93?", "Manchester United", ["Aston Villa", "Blackburn Rovers", "Arsenal"]],
    ["football", "Who scored the winner in the 2014 World Cup final?", "Mario Götze", ["Thomas Müller", "Lionel Messi", "Miroslav Klose"]],
    ["football", "Brazil lost 7-1 at their own World Cup in 2014. Who beat them?", "Germany", ["Netherlands", "Argentina", "Spain"]],
    ["football", "Which Italian club is nicknamed 'The Old Lady'?", "Juventus", ["AC Milan", "Inter Milan", "Roma"]],
    ["football", "What is Barcelona's stadium called?", "Camp Nou", ["Bernabéu", "Metropolitano", "Mestalla"]],
    ["football", "What is Bayern Munich's stadium called?", "Allianz Arena", ["Signal Iduna Park", "Olympiastadion", "Red Bull Arena"]],
    ["football", "Ajax are a famous club from which country?", "Netherlands", ["Belgium", "Denmark", "Greece"]],
    ["football", "Who scored 36 goals in the 2022/23 Premier League, a record?", "Erling Haaland", ["Mohamed Salah", "Harry Kane", "Alan Shearer"]],
    ["football", "How many Premier League titles did Arsène Wenger win with Arsenal?", "3", ["2", "4", "5"]],
    ["football", "Which country hosted the 2018 World Cup?", "Russia", ["Qatar", "Brazil", "Germany"]],
    // Forest
    ["forest", "In which year did Forest move to the City Ground?", "1898", ["1865", "1919", "1935"]],
    ["forest", "Forest won the 1978 League Cup final replay against which team?", "Liverpool", ["Everton", "Leeds", "Southampton"]],
    ["forest", "Who did Forest beat 3-2 in the 1979 League Cup final?", "Southampton", ["Liverpool", "Arsenal", "Wolves"]],
    ["forest", "Who was Forest's manager when they won the League Cup in 1989 and 1990?", "Brian Clough", ["Frank Clark", "Peter Taylor", "Dave Bassett"]],
    ["forest", "Forest's record scorer, with over 200 goals, is...", "Grenville Morris", ["Trevor Francis", "Ian Storey-Moore", "Nigel Clough"]],
    // capitals
    ["capitals", "What is the capital of Kazakhstan?", "Astana", ["Almaty", "Tashkent", "Bishkek"]],
    ["capitals", "What is the capital of Myanmar?", "Naypyidaw", ["Yangon", "Mandalay", "Bangkok"]],
    ["capitals", "What is the capital of Côte d'Ivoire (Ivory Coast)?", "Yamoussoukro", ["Abidjan", "Accra", "Dakar"]],
    ["capitals", "What is the capital of Belize?", "Belmopan", ["Belize City", "San Salvador", "Kingston"]],
    ["capitals", "What is the capital of Bhutan?", "Thimphu", ["Kathmandu", "Paro", "Dhaka"]],
    ["capitals", "What is the capital of Mongolia?", "Ulaanbaatar", ["Astana", "Bishkek", "Harbin"]],
    ["capitals", "What is the capital of Liechtenstein?", "Vaduz", ["Schaan", "Bern", "Innsbruck"]],
    ["capitals", "What is the capital of Madagascar?", "Antananarivo", ["Toamasina", "Maputo", "Nairobi"]],
    ["capitals", "What is the capital of Paraguay?", "Asunción", ["Montevideo", "Encarnación", "La Paz"]],
    ["capitals", "What is the capital of Georgia (the country)?", "Tbilisi", ["Batumi", "Yerevan", "Baku"]],
    ["capitals", "What is the capital of Cameroon?", "Yaoundé", ["Douala", "Lagos", "Libreville"]],
    ["capitals", "What is the capital of Burkina Faso?", "Ouagadougou", ["Bamako", "Niamey", "Bobo-Dioulasso"]],
    ["capitals", "What is the capital of Montenegro?", "Podgorica", ["Kotor", "Sarajevo", "Tirana"]],
    ["capitals", "What is the capital of North Macedonia?", "Skopje", ["Ohrid", "Sofia", "Pristina"]],
    ["capitals", "What is the capital of Nepal?", "Kathmandu", ["Pokhara", "Thimphu", "Lhasa"]],
    // mountains
    ["mountains", "What is the highest mountain in Antarctica?", "Mount Vinson", ["Mount Erebus", "Mount Kirkpatrick", "Mount Tyree"]],
    ["mountains", "Aconcagua, South America's highest mountain, is in which country?", "Argentina", ["Chile", "Peru", "Bolivia"]],
    ["mountains", "What was Denali called until 2015?", "Mount McKinley", ["Mount Washington", "Mount Rainier", "Mount Lincoln"]],
    ["mountains", "About how tall is Kilimanjaro?", "5,895 m", ["4,807 m", "6,961 m", "3,776 m"]],
    ["mountains", "About how tall is Mount Fuji?", "3,776 m", ["2,915 m", "4,478 m", "5,642 m"]],
    ["mountains", "Which country has the most of the world's 8,000-metre peaks?", "Nepal", ["China", "Pakistan", "India"]],
    ["mountains", "What is the highest mountain in Canada?", "Mount Logan", ["Mount Robson", "Denali", "Mount Assiniboine"]],
    ["mountains", "What is the highest mountain in New Zealand?", "Aoraki / Mount Cook", ["Mount Ruapehu", "Mount Taranaki", "Mount Aspiring"]],
    ["mountains", "The highest mountain in Spain is a volcano on Tenerife. What is it called?", "Teide", ["Mulhacén", "Aneto", "Etna"]],
    ["mountains", "What is the highest mountain in Scandinavia?", "Galdhøpiggen", ["Kebnekaise", "Glittertind", "Halti"]],
  ];

  /* ---------------- Build the bank ---------------- */
  const BANK = [];
  let n = 0;
  function add(subject, item) { BANK.push(Object.assign({ id: subject[0] + ":" + (item.id || ++n), subject }, item)); }

  FOOTBALL.forEach((x, i) => add("football", Object.assign({ id: "fb" + i }, x)));
  FOREST_HARD.forEach((x, i) => add("forest", Object.assign({ id: "fh" + i }, x)));
  const FQ = window.FOREST_QUESTIONS || {};
  (FQ.easy || []).forEach((x, i) => add("forest", { id: "fe" + i, l: 1, q: x.q, a: x.a, w: x.o.filter((o) => o !== x.a) }));
  (FQ.medium || []).forEach((x, i) => add("forest", { id: "fm" + i, l: 2, q: x.q, a: x.a, w: x.o.filter((o) => o !== x.a) }));
  CAPITALS.forEach(([country, city, l, region, trick]) => {
    const near = CAPITALS.filter((c) => c[3] === region && c[1] !== city).map((c) => c[1]);
    const far = CAPITALS.filter((c) => c[3] !== region).map((c) => c[1]);
    add("capitals", { id: "cap-" + country, l, q: `What is the capital of ${country}?`, a: city, w: (trick || []).concat(shuffle(near)), far });
  });
  MOUNTAINS.forEach((x, i) => add("mountains", Object.assign({ id: "mt" + i }, x)));
  WORLD_CLASS.forEach(([subject, q, a, w], i) => add(subject, { id: "wc" + i, l: 4, q, a, w }));

  /* ---------------- Times tables (made up on the spot) ----------------
     Easy: x1, x2, x5, x10.  Medium: x3, x4, x6, x11.  Hard: x7, x8, x9, x12,
     plus "missing number" sums like ? x 8 = 72. */
  const TABLES = { 1: [2, 5, 10], 2: [3, 4, 6, 11], 3: [7, 8, 9, 12] };
  function mathsQuestion(level) {
    if (level >= 4) return mathsWorldClass();
    const a = pick(TABLES[level]);
    const b = level === 1 ? 1 + Math.floor(rand() * 10) : 2 + Math.floor(rand() * 11);
    const [x, y] = rand() < 0.5 ? [a, b] : [b, a];
    const ans = a * b;
    const id = "m:" + Math.min(a, b) + "x" + Math.max(a, b);
    const missing = level === 3 && rand() < 0.35;
    const q = missing ? `? × ${y} = ${ans}` : `${x} × ${y} = ?`;
    const right = missing ? x : ans;
    let wrong;
    if (missing) {
      wrong = [right + 1, right - 1, right + 2].filter((v) => v > 0 && v !== right);
    } else {
      // Trickiest first: next-door answers from the same tables, then further away.
      wrong = [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, ans + 10, ans - 10, ans + 1]
        .filter((v, i, arr) => v > 0 && v !== ans && arr.indexOf(v) === i);
      if (level === 1) wrong = [ans + 10 + Math.floor(rand() * 10), Math.max(1, ans - 9 - Math.floor(rand() * 8)), ans * 2 + 3].filter((v) => v !== ans);
    }
    return { id, subject: "maths", l: level, q, a: String(right), w: wrong.map(String), maths: true };
  }

  /* World Class sums: bigger times tables, squares and sharing. */
  function mathsWorldClass() {
    const kind = pick(["big", "big", "square", "divide"]);
    let q, ans, id, wrong;
    if (kind === "big") {
      const a = 12 + Math.floor(rand() * 14), b = 3 + Math.floor(rand() * 7);
      ans = a * b; q = `${a} × ${b} = ?`; id = `m4:${a}x${b}`;
      wrong = [a * (b + 1), a * (b - 1), ans + 10, ans - 10, ans + 2];
    } else if (kind === "square") {
      const a = 11 + Math.floor(rand() * 5);
      ans = a * a; q = `${a} × ${a} = ?`; id = `m4:sq${a}`;
      wrong = [a * (a + 1), a * (a - 1), ans + 10, ans - 11];
    } else {
      const b = 6 + Math.floor(rand() * 7), c = 6 + Math.floor(rand() * 7);
      ans = c; q = `${b * c} ÷ ${b} = ?`; id = `m4:${b * c}d${b}`;
      wrong = [c + 1, c - 1, c + 2, c - 2];
    }
    wrong = wrong.filter((v, i, arr) => v > 0 && v !== ans && arr.indexOf(v) === i);
    return { id, subject: "maths", l: 4, q, a: String(ans), w: wrong.map(String), maths: true };
  }

  /* ================================================================
     THE BRAIN: remembers how George does on every question.
     Saved on this device only.
     ================================================================ */
  const BRAIN_KEY = "gz_matchday_brain_v1";
  let brain = {};
  try { brain = JSON.parse(localStorage.getItem(BRAIN_KEY)) || {}; } catch (e) { brain = {}; }
  function saveBrain() { try { localStorage.setItem(BRAIN_KEY, JSON.stringify(brain)); } catch (e) {} }

  /* Level the question plays at for George right now.
     Starts at its label. After a few tries:
       gets it right 4 times out of 5 (or better) -> one level easier
       gets it wrong more often than right        -> one level harder */
  function effectiveLevel(q) {
    const s = brain[q.id];
    let lvl = q.l;
    if (s && s.seen >= 3) {
      const acc = s.right / s.seen;
      if (acc >= 0.8) lvl -= 1;
      else if (acc < 0.5) lvl += 1;
    }
    return Math.max(1, Math.min(4, lvl));
  }

  /* Form: the last 24 answers. When George is on fire, every question
     gets pushed up a level (up to World Class). */
  const FORM_KEY = "gz_matchday_form_v1";
  let form = [];
  try { form = JSON.parse(localStorage.getItem(FORM_KEY)) || []; } catch (e) { form = []; }
  function stretch() {
    if (form.length < 10) return 0;
    const acc = form.reduce((a, b) => a + b, 0) / form.length;
    return acc >= 0.8 ? 1 : acc < 0.45 ? -1 : 0;
  }
  function adjust(level) { return Math.max(1, Math.min(4, level + stretch())); }
  function formPct() { return form.length ? Math.round((form.reduce((a, b) => a + b, 0) / form.length) * 100) : null; }

  function record(q, correct) {
    const s = brain[q.id] || { seen: 0, right: 0, last: 0, wrongStreak: 0, text: "" };
    s.seen += 1;
    if (correct) { s.right += 1; s.wrongStreak = 0; } else { s.wrongStreak += 1; }
    s.last = Date.now();
    s.text = q.q.length > 60 ? q.q.slice(0, 57) + "..." : q.q;
    s.lastResult = correct ? 1 : 0;
    brain[q.id] = s;
    saveBrain();
    form.push(correct ? 1 : 0);
    if (form.length > 24) form = form.slice(-24);
    try { localStorage.setItem(FORM_KEY, JSON.stringify(form)); } catch (e) {}
  }

  /* How likely a question is to be picked. Ones George got wrong come
     back more often; ones he just saw wait their turn. */
  function weight(q) {
    const s = brain[q.id];
    if (!s) return 1.2;                                    // new: try it
    let w = 1;
    if (s.wrongStreak > 0) w += 2.5;                       // got it wrong last time: practise it
    if (s.seen >= 3 && s.right / s.seen >= 0.9) w *= 0.4;  // nailed on: see it less
    const minutes = (Date.now() - s.last) / 60000;
    if (minutes < 10) w *= 0.15;                           // just seen it
    return w;
  }

  function weightedPick(list) {
    const total = list.reduce((t, q) => t + weight(q), 0);
    let r = rand() * total;
    for (const q of list) { r -= weight(q); if (r <= 0) return q; }
    return list[list.length - 1];
  }

  /* Pick a question for a moment in the match.
     level: 1-3, subjects: array of subject keys, used: Set of ids
     already asked this match. */
  function nextQuestion(level, subjects, used) {
    const subs = subjects && subjects.length ? subjects : Object.keys(SUBJECTS);
    const subject = pick(subs);
    if (subject === "maths") {
      // Try a few so the same sum doesn't come up twice in one match.
      for (let i = 0; i < 12; i++) {
        const mq = mathsQuestion(level);
        if (!used.has(mq.id) || i === 11) {
          // The brain can make a sum harder or easier for George too.
          const eff = effectiveLevel(mq);
          if (eff !== level && i < 8) continue;
          return present(mq, level);
        }
      }
    }
    let pool = BANK.filter((q) => q.subject === subject && !used.has(q.id));
    if (!pool.length) pool = BANK.filter((q) => subs.includes(q.subject) && !used.has(q.id));
    if (!pool.length) pool = BANK.slice();
    // Closest level first: exact match, then one away, then anything.
    for (const gap of [0, 1, 2, 3]) {
      const fit = pool.filter((q) => Math.abs(effectiveLevel(q) - level) === gap);
      if (fit.length) return present(weightedPick(fit), level);
    }
    return present(pick(pool), level);
  }

  /* Turn a bank question into what goes on screen for a given level:
     level 1 -> 2 buttons (least tricky wrong answer)
     level 2 -> 3 buttons
     level 3 -> 4 buttons (trickiest wrong answers)
     level 4 -> 4 buttons, trickiest, World Class */
  function present(q, level) {
    const count = level === 1 ? 1 : level === 2 ? 2 : 3;
    let wrong;
    if (level >= 3) wrong = q.w.slice(0, count);
    else if (level === 2) wrong = shuffle(q.w.slice(0, 4)).slice(0, count);
    else wrong = q.far ? [pick(q.far)] : [q.w[q.w.length - 1]];
    wrong = wrong.filter((x) => x !== q.a);
    while (wrong.length < count && q.far) { const f = pick(q.far); if (f !== q.a && !wrong.includes(f)) wrong.push(f); }
    return { id: q.id, subject: q.subject, level, q: q.q, a: q.a, options: shuffle([q.a].concat(wrong)), src: q };
  }

  /* For the end-of-match "what I've learned" box. */
  function report() {
    const entries = Object.entries(brain);
    const mastered = entries.filter(([, s]) => s.seen >= 3 && s.right / s.seen >= 0.8).length;
    const practising = entries.filter(([, s]) => s.wrongStreak > 0).sort((a, b) => b[1].last - a[1].last).slice(0, 4).map(([, s]) => s.text);
    const total = entries.length;
    return { mastered, practising, total };
  }

  MQ.SUBJECTS = SUBJECTS;
  MQ.nextQuestion = nextQuestion;
  MQ.record = record;
  MQ.report = report;
  MQ.effectiveLevel = effectiveLevel;
  MQ.adjust = adjust;
  MQ.stretch = stretch;
  MQ.formPct = formPct;
  MQ._bank = BANK;
})(window.MQ = window.MQ || {});
