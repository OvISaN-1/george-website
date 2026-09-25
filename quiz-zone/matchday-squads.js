/* ================================================================
   MATCHDAY: squads, kits, grounds and referees.

   PLEASE CHECK THESE NAMES. They are the 2026/27 squads as best we
   know them, but transfers happen all the time. To fix one, just edit
   the line: the game reads everything from this file.

   Each player: num = shirt number, name = full name, short = the name
   shown on the pitch and in commentary, pos = position.
   The first 11 in "xi" start, in formation order (see FORMATIONS).
   "subs" come on in the second half.

   The opponent keys match the names used in js/content.js fixtures,
   so "This week's match" and the season follow the real fixture list.
   ================================================================ */
(function (MD) {
  "use strict";

  /* Where each shirt stands, in metres on a 105 x 68 pitch.
     x = 0 is our own goal line, x = 105 the one we attack.
     y = 0 is the left touchline (as we attack), y = 68 the right. */
  const FORMATIONS = {
    "4-2-3-1": [
      [5, 34],                                // GK
      [30, 60], [27, 44], [27, 24], [30, 8],  // RB, RCB, LCB, LB
      [43, 42], [43, 26],                     // two holding midfielders
      [63, 58], [60, 34], [63, 10],           // RW, CAM, LW
      [77, 34],                               // ST
    ],
    "4-3-3": [
      [5, 34],
      [30, 60], [27, 44], [27, 24], [30, 8],
      [46, 34], [50, 50], [50, 18],           // DM, RCM, LCM
      [70, 58], [76, 34], [70, 10],           // RW, ST, LW
    ],
    "4-4-2": [
      [5, 34],
      [30, 60], [27, 44], [27, 24], [30, 8],
      [52, 60], [48, 42], [48, 26], [52, 8],  // RM, RCM, LCM, LM
      [74, 42], [74, 26],                     // two strikers
    ],
    "3-4-2-1": [
      [5, 34],
      [27, 50], [25, 34], [27, 18],           // three centre-backs
      [50, 62], [45, 42], [45, 26], [50, 6],  // RWB, two CMs, LWB
      [66, 46], [66, 22],                     // two No.10s
      [77, 34],                               // ST
    ],
  };

  /* George always plays up front for Forest and wears his Free Kick
     Masters kit (home red unless he has picked another one). */
  const GEORGE = { num: 10, name: "George", short: "George", pos: "ST", george: true };

  const FOREST = {
    key: "Forest", name: "Nottingham Forest", abbr: "NFO", tier: 2,
    ground: "The City Ground", city: "Nottingham",
    formation: "4-2-3-1",
    kit:  { shirt: "#d7102b", trim: "#ffffff", shorts: "#f4f1ee", text: "#ffffff" },
    away: { shirt: "#f4f1ee", trim: "#d7102b", shorts: "#15121a", text: "#d7102b" },
    keeperKit: "#f2c200",
    xi: [
      { num: 26, name: "Matz Sels", short: "Sels", pos: "GK" },
      { num: 34, name: "Ola Aina", short: "Aina", pos: "RB" },
      { num: 31, name: "Nikola Milenković", short: "Milenković", pos: "CB" },
      { num: 5,  name: "Murillo", short: "Murillo", pos: "CB" },
      { num: 3,  name: "Neco Williams", short: "N. Williams", pos: "LB" },
      { num: 6,  name: "Ibrahim Sangaré", short: "Sangaré", pos: "DM" },
      { num: 8,  name: "Elliot Anderson", short: "Anderson", pos: "CM" },
      { num: 21, name: "Omari Hutchinson", short: "Hutchinson", pos: "RW" },
      // Gibbs-White really wears 10. George has the 10 in Matchday, so
      // MGW borrows 20 for the day. Change it here if you like.
      { num: 20, name: "Morgan Gibbs-White", short: "Gibbs-White", pos: "CAM", captain: true },
      { num: 14, name: "Dan Ndoye", short: "Ndoye", pos: "LW" },
      GEORGE,
    ],
    subs: [
      { num: 11, name: "Chris Wood", short: "Wood", pos: "ST", for: 9 },       // replaces the LW slot
      { num: 7,  name: "Callum Hudson-Odoi", short: "Hudson-Odoi", pos: "RW", for: 7 },
      { num: 22, name: "Ryan Yates", short: "Yates", pos: "CM", for: 6 },
      { num: 19, name: "Igor Jesus", short: "Igor Jesus", pos: "ST" },
      { num: 16, name: "Nicolás Domínguez", short: "Domínguez", pos: "CM" },
      { num: 4,  name: "Morato", short: "Morato", pos: "CB" },
      { num: 13, name: "John Victor", short: "John Victor", pos: "GK" },
    ],
  };

  /* tier: 1 = should beat them, 2 = a proper game, 3 = the big boys.
     alt: the kit they change into when their normal one clashes with
     Forest red at the City Ground. */
  const OPPONENTS = {
    "Leeds": { name: "Leeds United", abbr: "LEE", tier: 1, ground: "Elland Road", formation: "4-3-3",
      kit: { shirt: "#ffffff", trim: "#1d428a", shorts: "#ffffff", text: "#1d428a" }, keeperKit: "#7ee04a",
      xi: [[1, "Lucas Perri", "Perri"], [2, "Jayden Bogle", "Bogle"], [6, "Joe Rodon", "Rodon"], [21, "Pascal Struijk", "Struijk"], [3, "Gabriel Gudmundsson", "Gudmundsson"],
        [4, "Ethan Ampadu", "Ampadu"], [8, "Sean Longstaff", "Longstaff"], [18, "Anton Stach", "Stach"], [7, "Daniel James", "James"], [9, "Dominic Calvert-Lewin", "Calvert-Lewin"], [11, "Brenden Aaronson", "Aaronson"]] },
    "Liverpool": { name: "Liverpool", abbr: "LIV", tier: 3, ground: "Anfield", formation: "4-2-3-1",
      kit: { shirt: "#c8102e", trim: "#f6eb61", shorts: "#c8102e", text: "#ffffff" },
      alt: { shirt: "#ffffff", trim: "#c8102e", shorts: "#ffffff", text: "#c8102e" }, keeperKit: "#15121a",
      xi: [[1, "Alisson", "Alisson"], [30, "Jeremie Frimpong", "Frimpong"], [5, "Ibrahima Konaté", "Konaté"], [4, "Virgil van Dijk", "Van Dijk"], [6, "Milos Kerkez", "Kerkez"],
        [38, "Ryan Gravenberch", "Gravenberch"], [10, "Alexis Mac Allister", "Mac Allister"], [11, "Mohamed Salah", "Salah"], [7, "Florian Wirtz", "Wirtz"], [8, "Dominik Szoboszlai", "Szoboszlai"], [9, "Alexander Isak", "Isak"]] },
    "Tottenham": { name: "Tottenham Hotspur", abbr: "TOT", tier: 2, ground: "Tottenham Hotspur Stadium", formation: "4-3-3",
      kit: { shirt: "#ffffff", trim: "#132257", shorts: "#132257", text: "#132257" }, keeperKit: "#f2c200",
      xi: [[1, "Guglielmo Vicario", "Vicario"], [23, "Pedro Porro", "Porro"], [17, "Cristian Romero", "Romero"], [37, "Micky van de Ven", "Van de Ven"], [13, "Destiny Udogie", "Udogie"],
        [6, "João Palhinha", "Palhinha"], [29, "Pape Matar Sarr", "Sarr"], [30, "Rodrigo Bentancur", "Bentancur"], [20, "Mohammed Kudus", "Kudus"], [19, "Dominic Solanke", "Solanke"], [7, "Xavi Simons", "Simons"]] },
    "Aston Villa": { name: "Aston Villa", abbr: "AVL", tier: 2, ground: "Villa Park", formation: "4-2-3-1",
      kit: { shirt: "#670e36", trim: "#95bfe5", shorts: "#ffffff", text: "#95bfe5" }, keeperKit: "#f2c200",
      xi: [[23, "Emiliano Martínez", "Martínez"], [2, "Matty Cash", "Cash"], [4, "Ezri Konsa", "Konsa"], [14, "Pau Torres", "Torres"], [12, "Lucas Digne", "Digne"],
        [44, "Boubacar Kamara", "Kamara"], [8, "Youri Tielemans", "Tielemans"], [7, "John McGinn", "McGinn"], [27, "Morgan Rogers", "Rogers"], [10, "Emiliano Buendía", "Buendía"], [11, "Ollie Watkins", "Watkins"]] },
    "Coventry": { name: "Coventry City", abbr: "COV", tier: 1, ground: "Coventry Building Society Arena", formation: "4-2-3-1",
      kit: { shirt: "#6cb4ee", trim: "#ffffff", shorts: "#6cb4ee", text: "#ffffff" }, keeperKit: "#15121a",
      xi: [[1, "Carl Rushworth", "Rushworth"], [27, "Milan van Ewijk", "Van Ewijk"], [4, "Bobby Thomas", "B. Thomas"], [15, "Liam Kitching", "Kitching"], [3, "Jay Dasilva", "Dasilva"],
        [8, "Matt Grimes", "Grimes"], [29, "Victor Torp", "Torp"], [7, "Tatsuhiro Sakamoto", "Sakamoto"], [10, "Jack Rudoni", "Rudoni"], [11, "Ephron Mason-Clark", "Mason-Clark"], [9, "Ellis Simms", "Simms"]] },
    "Crystal Palace": { name: "Crystal Palace", abbr: "CRY", tier: 2, ground: "Selhurst Park", formation: "3-4-2-1",
      kit: { shirt: "#1b458f", trim: "#c4122e", shorts: "#1b458f", text: "#ffffff" }, keeperKit: "#ff7a1a",
      xi: [[1, "Dean Henderson", "Henderson"], [23, "Jaydee Canvot", "Canvot"], [5, "Maxence Lacroix", "Lacroix"], [26, "Chris Richards", "Richards"],
        [2, "Daniel Muñoz", "Muñoz"], [20, "Adam Wharton", "Wharton"], [18, "Daichi Kamada", "Kamada"], [3, "Tyrick Mitchell", "Mitchell"],
        [7, "Ismaïla Sarr", "Sarr"], [10, "Yeremy Pino", "Pino"], [14, "Jean-Philippe Mateta", "Mateta"]] },
    "Arsenal": { name: "Arsenal", abbr: "ARS", tier: 3, ground: "Emirates Stadium", formation: "4-3-3",
      kit: { shirt: "#ef0107", trim: "#ffffff", shorts: "#ffffff", text: "#ffffff" },
      alt: { shirt: "#1b2a4a", trim: "#9bc3e6", shorts: "#1b2a4a", text: "#ffffff" }, keeperKit: "#7ee04a",
      xi: [[1, "David Raya", "Raya"], [12, "Jurriën Timber", "Timber"], [2, "William Saliba", "Saliba"], [6, "Gabriel", "Gabriel"], [33, "Riccardo Calafiori", "Calafiori"],
        [36, "Martín Zubimendi", "Zubimendi"], [41, "Declan Rice", "Rice"], [8, "Martin Ødegaard", "Ødegaard"], [7, "Bukayo Saka", "Saka"], [14, "Viktor Gyökeres", "Gyökeres"], [10, "Eberechi Eze", "Eze"]] },
    "Ipswich": { name: "Ipswich Town", abbr: "IPS", tier: 1, ground: "Portman Road", formation: "4-2-3-1",
      kit: { shirt: "#1e4fa0", trim: "#ffffff", shorts: "#ffffff", text: "#ffffff" }, keeperKit: "#f2c200",
      xi: [[28, "Christian Walton", "Walton"], [2, "Darnell Furlong", "Furlong"], [26, "Dara O'Shea", "O'Shea"], [24, "Jacob Greaves", "Greaves"], [3, "Leif Davis", "Davis"],
        [5, "Azor Matusiwa", "Matusiwa"], [12, "Jens Cajuste", "Cajuste"], [15, "Kasey McAteer", "McAteer"], [20, "Marcelino Núñez", "Núñez"], [47, "Jack Clarke", "Clarke"], [27, "George Hirst", "Hirst"]] },
    "Brentford": { name: "Brentford", abbr: "BRE", tier: 2, ground: "Gtech Community Stadium", formation: "4-2-3-1",
      kit: { shirt: "#e30613", trim: "#ffffff", shorts: "#15121a", text: "#ffffff" },
      alt: { shirt: "#15121a", trim: "#f2c200", shorts: "#15121a", text: "#f2c200" }, keeperKit: "#b44cff",
      xi: [[1, "Caoimhín Kelleher", "Kelleher"], [33, "Michael Kayode", "Kayode"], [22, "Nathan Collins", "Collins"], [4, "Sepp van den Berg", "Van den Berg"], [20, "Kristoffer Ajer", "Ajer"],
        [6, "Jordan Henderson", "Henderson"], [18, "Yehor Yarmoliuk", "Yarmoliuk"], [7, "Kevin Schade", "Schade"], [24, "Mikkel Damsgaard", "Damsgaard"], [19, "Dango Ouattara", "Ouattara"], [9, "Igor Thiago", "Thiago"]] },
    "Man City": { name: "Manchester City", abbr: "MCI", tier: 3, ground: "Etihad Stadium", formation: "4-2-3-1",
      kit: { shirt: "#6cabdd", trim: "#ffffff", shorts: "#ffffff", text: "#1c2c5b" }, keeperKit: "#ff4fa3",
      xi: [[25, "Gianluigi Donnarumma", "Donnarumma"], [27, "Matheus Nunes", "Nunes"], [3, "Rúben Dias", "Dias"], [24, "Joško Gvardiol", "Gvardiol"], [33, "Nico O'Reilly", "O'Reilly"],
        [16, "Rodri", "Rodri"], [4, "Tijjani Reijnders", "Reijnders"], [47, "Phil Foden", "Foden"], [10, "Rayan Cherki", "Cherki"], [11, "Jérémy Doku", "Doku"], [9, "Erling Haaland", "Haaland"]] },
    "Bournemouth": { name: "AFC Bournemouth", abbr: "BOU", tier: 2, ground: "Vitality Stadium", formation: "4-2-3-1",
      kit: { shirt: "#da291c", trim: "#15121a", shorts: "#15121a", text: "#ffffff" },
      alt: { shirt: "#ffffff", trim: "#da291c", shorts: "#ffffff", text: "#da291c" }, keeperKit: "#7ee04a",
      xi: [[1, "Đorđe Petrović", "Petrović"], [15, "Adam Smith", "Smith"], [5, "Marcos Senesi", "Senesi"], [18, "Bafodé Diakité", "Diakité"], [3, "Adrien Truffert", "Truffert"],
        [12, "Tyler Adams", "Adams"], [8, "Alex Scott", "Scott"], [16, "Marcus Tavernier", "Tavernier"], [19, "Justin Kluivert", "Kluivert"], [7, "David Brooks", "Brooks"], [9, "Evanilson", "Evanilson"]] },
    "Chelsea": { name: "Chelsea", abbr: "CHE", tier: 3, ground: "Stamford Bridge", formation: "4-2-3-1",
      kit: { shirt: "#034694", trim: "#ffffff", shorts: "#034694", text: "#ffffff" }, keeperKit: "#f2c200",
      xi: [[1, "Robert Sánchez", "Sánchez"], [24, "Reece James", "James"], [29, "Wesley Fofana", "Fofana"], [6, "Levi Colwill", "Colwill"], [3, "Marc Cucurella", "Cucurella"],
        [25, "Moisés Caicedo", "Caicedo"], [8, "Enzo Fernández", "Enzo"], [41, "Estêvão", "Estêvão"], [10, "Cole Palmer", "Palmer"], [7, "Pedro Neto", "Neto"], [20, "João Pedro", "João Pedro"]] },
    "Hull": { name: "Hull City", abbr: "HUL", tier: 1, ground: "MKM Stadium", formation: "4-2-3-1",
      kit: { shirt: "#f5a12d", trim: "#15121a", shorts: "#15121a", text: "#15121a" }, keeperKit: "#1f9d55",
      xi: [[1, "Ivor Pandur", "Pandur"], [2, "Lewie Coyle", "Coyle"], [6, "Semi Ajayi", "Ajayi"], [4, "Charlie Hughes", "Hughes"], [3, "Ryan Giles", "Giles"],
        [27, "Regan Slater", "Slater"], [8, "Amir Hadžiahmetović", "Hadžiahmetović"], [25, "Matt Crooks", "Crooks"], [10, "Mohamed Belloumi", "Belloumi"], [7, "Joe Gelhardt", "Gelhardt"], [9, "Oli McBurnie", "McBurnie"]] },
    "Brighton": { name: "Brighton & Hove Albion", abbr: "BHA", tier: 2, ground: "Amex Stadium", formation: "4-2-3-1",
      kit: { shirt: "#0057b8", trim: "#ffffff", shorts: "#0057b8", text: "#ffffff" }, keeperKit: "#f2c200",
      xi: [[1, "Bart Verbruggen", "Verbruggen"], [34, "Joël Veltman", "Veltman"], [6, "Jan Paul van Hecke", "Van Hecke"], [5, "Lewis Dunk", "Dunk"], [29, "Maxim De Cuyper", "De Cuyper"],
        [17, "Carlos Baleba", "Baleba"], [26, "Yasin Ayari", "Ayari"], [11, "Yankuba Minteh", "Minteh"], [10, "Georginio Rutter", "Rutter"], [22, "Kaoru Mitoma", "Mitoma"], [18, "Danny Welbeck", "Welbeck"]] },
    "Sunderland": { name: "Sunderland", abbr: "SUN", tier: 1, ground: "Stadium of Light", formation: "4-2-3-1",
      kit: { shirt: "#eb172b", trim: "#ffffff", shorts: "#15121a", text: "#ffffff" },
      alt: { shirt: "#15121a", trim: "#eb172b", shorts: "#15121a", text: "#ffffff" }, keeperKit: "#7ee04a",
      xi: [[22, "Robin Roefs", "Roefs"], [32, "Trai Hume", "Hume"], [5, "Dan Ballard", "Ballard"], [15, "Omar Alderete", "Alderete"], [17, "Reinildo", "Reinildo"],
        [34, "Granit Xhaka", "Xhaka"], [27, "Noah Sadiki", "Sadiki"], [7, "Chemsdine Talbi", "Talbi"], [28, "Enzo Le Fée", "Le Fée"], [24, "Simon Adingra", "Adingra"], [18, "Wilson Isidor", "Isidor"]] },
    "Everton": { name: "Everton", abbr: "EVE", tier: 2, ground: "Hill Dickinson Stadium", formation: "4-2-3-1",
      kit: { shirt: "#003399", trim: "#ffffff", shorts: "#ffffff", text: "#ffffff" }, keeperKit: "#f2c200",
      xi: [[1, "Jordan Pickford", "Pickford"], [15, "Jake O'Brien", "O'Brien"], [6, "James Tarkowski", "Tarkowski"], [5, "Michael Keane", "Keane"], [19, "Vitaliy Mykolenko", "Mykolenko"],
        [27, "Idrissa Gueye", "Gueye"], [37, "James Garner", "Garner"], [22, "Kiernan Dewsbury-Hall", "Dewsbury-Hall"], [18, "Jack Grealish", "Grealish"], [10, "Iliman Ndiaye", "Ndiaye"], [9, "Thierno Barry", "Barry"]] },
    "Man Utd": { name: "Manchester United", abbr: "MUN", tier: 2, ground: "Old Trafford", formation: "3-4-2-1",
      kit: { shirt: "#da291c", trim: "#15121a", shorts: "#ffffff", text: "#ffffff" },
      alt: { shirt: "#ffffff", trim: "#da291c", shorts: "#15121a", text: "#da291c" }, keeperKit: "#1f9d55",
      xi: [[31, "Senne Lammens", "Lammens"], [4, "Matthijs de Ligt", "De Ligt"], [5, "Harry Maguire", "Maguire"], [15, "Leny Yoro", "Yoro"],
        [2, "Diogo Dalot", "Dalot"], [18, "Casemiro", "Casemiro"], [8, "Bruno Fernandes", "Fernandes"], [23, "Luke Shaw", "Shaw"],
        [19, "Bryan Mbeumo", "Mbeumo"], [10, "Matheus Cunha", "Cunha"], [30, "Benjamin Šeško", "Šeško"]] },
    "Newcastle": { name: "Newcastle United", abbr: "NEW", tier: 2, ground: "St James' Park", formation: "4-3-3",
      kit: { shirt: "#241f20", trim: "#ffffff", shorts: "#241f20", text: "#ffffff" }, keeperKit: "#f2c200",
      xi: [[1, "Nick Pope", "Pope"], [2, "Kieran Trippier", "Trippier"], [12, "Malick Thiaw", "Thiaw"], [4, "Sven Botman", "Botman"], [3, "Lewis Hall", "Hall"],
        [39, "Bruno Guimarães", "Guimarães"], [8, "Sandro Tonali", "Tonali"], [7, "Joelinton", "Joelinton"], [11, "Harvey Barnes", "Barnes"], [27, "Nick Woltemade", "Woltemade"], [10, "Anthony Gordon", "Gordon"]] },
    "Fulham": { name: "Fulham", abbr: "FUL", tier: 2, ground: "Craven Cottage", formation: "4-2-3-1",
      kit: { shirt: "#ffffff", trim: "#15121a", shorts: "#15121a", text: "#15121a" }, keeperKit: "#7ee04a",
      xi: [[1, "Bernd Leno", "Leno"], [2, "Kenny Tete", "Tete"], [5, "Joachim Andersen", "Andersen"], [3, "Calvin Bassey", "Bassey"], [33, "Antonee Robinson", "Robinson"],
        [16, "Sander Berge", "Berge"], [20, "Saša Lukić", "Lukić"], [17, "Alex Iwobi", "Iwobi"], [32, "Emile Smith Rowe", "Smith Rowe"], [8, "Harry Wilson", "Wilson"], [7, "Raúl Jiménez", "Jiménez"]] },
  };

  // Premier League referees. One is picked for each match, plus one on VAR.
  const REFEREES = [
    "Michael Oliver", "Anthony Taylor", "Simon Hooper", "Chris Kavanagh", "Stuart Attwell", "Jarred Gillett",
    "Paul Tierney", "Craig Pawson", "Robert Jones", "Sam Barrott", "Tony Harrington", "Andy Madley",
    "Peter Bankes", "John Brooks", "Tim Robinson", "Rebecca Welch",
  ];

  // Opponent xi rows are [num, name, short]. Give them positions from their formation.
  const POS_BY_FORMATION = {
    "4-2-3-1": ["GK", "RB", "CB", "CB", "LB", "DM", "CM", "RW", "CAM", "LW", "ST"],
    "4-3-3": ["GK", "RB", "CB", "CB", "LB", "DM", "CM", "CM", "RW", "ST", "LW"],
    "4-4-2": ["GK", "RB", "CB", "CB", "LB", "RM", "CM", "CM", "LM", "ST", "ST"],
    "3-4-2-1": ["GK", "CB", "CB", "CB", "RWB", "CM", "CM", "LWB", "AM", "AM", "ST"],
  };
  Object.keys(OPPONENTS).forEach((key) => {
    const t = OPPONENTS[key];
    t.key = key;
    const posList = POS_BY_FORMATION[t.formation];
    t.xi = t.xi.map((row, i) => ({ num: row[0], name: row[1], short: row[2], pos: posList[i] }));
  });

  MD.FORMATIONS = FORMATIONS;
  MD.FOREST = FOREST;
  MD.OPPONENTS = OPPONENTS;
  MD.REFEREES = REFEREES;
})(window.MD = window.MD || {});
