/* ================================================================
   MATCHDAY: Year 6 subjects and George's favourites.

   History, Science, English (spelling, punctuation and grammar),
   Space and World geography at Year 6 (KS2) level, SATs maths that
   is made up on the spot so it never runs out, plus Music (lots of
   rock), Animals, Romanian and Inventors.

   Each question: [level, question, right answer, [wrong answers]]
   level: 1 easy, 2 medium, 3 hard, 4 World Class.
   Wrong answers go TRICKIEST FIRST: easy questions show the least
   tricky one, hard questions show the trickiest.

   To add a question, copy a line and change the words.
   ================================================================ */
(function (Y6) {
  "use strict";

  const SUBJECTS = {
    history:   { label: "History", emoji: "🏰" },
    science:   { label: "Science", emoji: "🔬" },
    english:   { label: "English", emoji: "✏️" },
    sats:      { label: "SATs maths", emoji: "🧮" },
    space:     { label: "Space", emoji: "🚀" },
    geography: { label: "World geography", emoji: "🗺️" },
    music:     { label: "Music & rock", emoji: "🎸" },
    animals:   { label: "Animals", emoji: "🦁" },
    romanian:  { label: "Romanian", emoji: "🇷🇴" },
    inventors: { label: "Inventors", emoji: "💡" },
  };

  const HISTORY = [
    [1, "Who built Hadrian's Wall?", "The Romans", ["The Vikings", "The Normans", "The Victorians"]],
    [1, "Which people sailed from Scandinavia in longships to raid Britain?", "The Vikings", ["The Romans", "The Normans", "The Tudors"]],
    [1, "In which country are the pyramids of Giza?", "Egypt", ["Greece", "Italy", "Mexico"]],
    [1, "Which famous ship sank in 1912 after hitting an iceberg?", "The Titanic", ["The Mary Rose", "HMS Victory", "The Endeavour"]],
    [1, "Which queen gave her name to the Victorian era?", "Queen Victoria", ["Elizabeth I", "Queen Anne", "Mary I"]],
    [1, "Which king had six wives?", "Henry VIII", ["Henry V", "Richard III", "Charles I"]],
    [1, "What were the kings of Ancient Egypt called?", "Pharaohs", ["Emperors", "Sultans", "Tsars"]],
    [1, "The first Olympic Games were held in which ancient land?", "Greece", ["Egypt", "Rome", "China"]],
    [1, "What were Viking boats called?", "Longships", ["Galleons", "Canoes", "Steamboats"]],
    [1, "In World War 2, what did children carry to school in a box?", "A gas mask", ["A radio", "A torch", "A tablet"]],
    [2, "In which year was the Battle of Hastings?", "1066", ["1086", "1166", "1266"]],
    [2, "Who won the Battle of Hastings?", "William the Conqueror", ["Harold Godwinson", "Alfred the Great", "Richard the Lionheart"]],
    [2, "Which Celtic queen led a revolt against the Romans?", "Boudicca", ["Cleopatra", "Matilda", "Elizabeth I"]],
    [2, "Who was Britain's Prime Minister for most of World War 2?", "Winston Churchill", ["Neville Chamberlain", "Clement Attlee", "David Lloyd George"]],
    [2, "In which year did World War 2 end?", "1945", ["1944", "1939", "1918"]],
    [2, "In which year did World War 2 begin?", "1939", ["1945", "1914", "1929"]],
    [2, "What were children called who were sent to the countryside to escape the bombs in WW2?", "Evacuees", ["Refugees", "Pilgrims", "Cadets"]],
    [2, "Which Anglo-Saxon king was known as 'the Great'?", "Alfred", ["Æthelred", "Harold", "Edward"]],
    [2, "Which famous embroidery shows the Battle of Hastings?", "The Bayeux Tapestry", ["The Domesday Book", "Magna Carta", "The Book of Kells"]],
    [2, "Which boy pharaoh's tomb was discovered in 1922?", "Tutankhamun", ["Ramesses II", "Khufu", "Akhenaten"]],
    [2, "What was the Ancient Egyptian picture writing called?", "Hieroglyphics", ["Cuneiform", "Runes", "Latin"]],
    [2, "Who was the last Tudor monarch?", "Elizabeth I", ["Mary I", "Henry VIII", "Edward VI"]],
    [2, "What did the Romans call Britain?", "Britannia", ["Hibernia", "Gaul", "Germania"]],
    [2, "In which year was the Great Fire of London?", "1666", ["1066", "1566", "1766"]],
    [2, "Where did the Great Fire of London start?", "In a bakery", ["In a church", "In a palace", "In a theatre"]],
    [2, "Which nurse was known as 'the Lady with the Lamp'?", "Florence Nightingale", ["Mary Seacole", "Edith Cavell", "Grace Darling"]],
    [2, "Which war lasted from 1914 to 1918?", "World War 1", ["World War 2", "The Crimean War", "The Boer War"]],
    [2, "In WW2, what was rationing?", "Limiting how much food and goods people could buy", ["A kind of air raid shelter", "A Victorian school lesson", "A Roman road"]],
    [2, "How did Victorians travel quickly across the country?", "By steam train", ["By car", "By aeroplane", "By electric tram"]],
    [3, "What was the German bombing of British cities in 1940–41 called?", "The Blitz", ["The Battle of Britain", "D-Day", "Dunkirk"]],
    [3, "Which English king died at the Battle of Bosworth in 1485?", "Richard III", ["Henry VII", "Edward IV", "Henry VI"]],
    [3, "Where did the Maya people live?", "Central America (Mexico and Guatemala)", ["South America", "Africa", "Asia"]],
    [3, "Who led the Suffragettes, who fought for women's right to vote?", "Emmeline Pankhurst", ["Florence Nightingale", "Mary Seacole", "Queen Victoria"]],
    [3, "What was D-Day in 1944?", "The Allied landings in Normandy", ["The end of the war", "The first night of the Blitz", "The Battle of Britain"]],
    [3, "The Greeks used a wooden horse to capture which city?", "Troy", ["Sparta", "Athens", "Rome"]],
    [3, "Which Roman emperor ordered a wall built across northern Britain?", "Hadrian", ["Julius Caesar", "Claudius", "Nero"]],
    [3, "Which metal gave its name to the age that came after the Stone Age?", "Bronze", ["Iron", "Copper", "Gold"]],
    [3, "Which queen's navy defeated the Spanish Armada in 1588?", "Elizabeth I", ["Mary I", "Victoria", "Anne"]],
    [3, "Who is often called the last pharaoh of Ancient Egypt?", "Cleopatra", ["Nefertiti", "Hatshepsut", "Tutankhamun"]],
    [3, "What was the Roman name for London?", "Londinium", ["Eboracum", "Deva", "Aquae Sulis"]],
    [4, "Which Roman emperor invaded Britain in AD 43?", "Claudius", ["Julius Caesar", "Hadrian", "Augustus"]],
    [4, "The Domesday Book was made on the orders of which king?", "William the Conqueror", ["Alfred the Great", "King John", "Henry VIII"]],
    [4, "Which king agreed to Magna Carta in 1215?", "King John", ["Richard I", "Henry II", "Edward I"]],
    [4, "Which Stone Age village in Orkney is over 5,000 years old?", "Skara Brae", ["Stonehenge", "Jarlshof", "Vindolanda"]],
    [4, "What was the Roman name for York?", "Eboracum", ["Londinium", "Deva", "Camulodunum"]],
    [4, "Which Nottingham-born Victorian started the Salvation Army?", "William Booth", ["Robin Hood", "D. H. Lawrence", "Jesse Boot"]],
  ];

  const SCIENCE = [
    [1, "Which organ pumps blood around your body?", "The heart", ["The lungs", "The brain", "The liver"]],
    [1, "Which organs do we breathe with?", "The lungs", ["The heart", "The kidneys", "The stomach"]],
    [1, "Which part of your body controls everything you do?", "The brain", ["The heart", "The stomach", "The skin"]],
    [1, "How many legs does an insect have?", "6", ["8", "4", "10"]],
    [1, "Which of these does a magnet pick up?", "An iron nail", ["A plastic spoon", "A wooden block", "A glass marble"]],
    [1, "What does a caterpillar turn into?", "A butterfly or moth", ["A beetle", "A spider", "A bee"]],
    [1, "What forms when an object blocks light?", "A shadow", ["A reflection", "A rainbow", "An echo"]],
    [1, "What are the remains of ancient animals preserved in rock called?", "Fossils", ["Crystals", "Minerals", "Pebbles"]],
    [1, "What gas do we need to breathe in to stay alive?", "Oxygen", ["Carbon dioxide", "Helium", "Smoke"]],
    [2, "What are the three states of matter?", "Solid, liquid and gas", ["Ice, water and steam", "Hot, warm and cold", "Rock, sand and soil"]],
    [2, "What is it called when a liquid turns into a gas?", "Evaporation", ["Condensation", "Melting", "Freezing"]],
    [2, "What is it called when water vapour turns back into liquid?", "Condensation", ["Evaporation", "Precipitation", "Freezing"]],
    [2, "At what temperature does water boil?", "100°C", ["90°C", "212°C", "50°C"]],
    [2, "At what temperature does water freeze?", "0°C", ["10°C", "-10°C", "32°C"]],
    [2, "Which force pulls things down towards the Earth?", "Gravity", ["Friction", "Magnetism", "Air resistance"]],
    [2, "Which force slows a bike down when you brake?", "Friction", ["Gravity", "Upthrust", "Magnetism"]],
    [2, "What do we call an animal that eats plants and meat?", "An omnivore", ["A carnivore", "A herbivore", "A producer"]],
    [2, "Which part of a plant takes in water from the soil?", "The roots", ["The leaves", "The petals", "The stem"]],
    [2, "How does light travel?", "In straight lines", ["In curves", "In circles", "In zigzags"]],
    [2, "Which of these is a good conductor of electricity?", "Copper", ["Rubber", "Plastic", "Wood"]],
    [2, "What happens to a bulb if you add another battery to the circuit?", "It gets brighter", ["It gets dimmer", "It goes out", "It changes colour"]],
    [2, "Who came up with the theory of evolution by natural selection?", "Charles Darwin", ["Isaac Newton", "Albert Einstein", "Marie Curie"]],
    [2, "Which group of animals do frogs belong to?", "Amphibians", ["Reptiles", "Mammals", "Fish"]],
    [2, "Which group of animals do snakes belong to?", "Reptiles", ["Amphibians", "Mammals", "Insects"]],
    [2, "Whales and dolphins are...", "Mammals", ["Fish", "Amphibians", "Reptiles"]],
    [2, "What gas do we breathe out?", "Carbon dioxide", ["Oxygen", "Hydrogen", "Helium"]],
    [2, "What carries pollen from flower to flower?", "Bees and other insects", ["Worms", "Roots", "Rain"]],
    [2, "What do we call it when animals sleep through the winter?", "Hibernation", ["Migration", "Camouflage", "Evolution"]],
    [2, "Which scientist is famous for gravity and a falling apple?", "Isaac Newton", ["Charles Darwin", "Albert Einstein", "Galileo"]],
    [2, "Sound is made by things...", "Vibrating", ["Glowing", "Melting", "Stretching"]],
    [3, "Which blood vessels carry blood away from the heart?", "Arteries", ["Veins", "Capillaries", "Nerves"]],
    [3, "Which part of the blood carries oxygen?", "Red blood cells", ["White blood cells", "Platelets", "Plasma"]],
    [3, "What do white blood cells do?", "Fight germs", ["Carry oxygen", "Help blood clot", "Digest food"]],
    [3, "How do plants make food using sunlight?", "Photosynthesis", ["Respiration", "Pollination", "Germination"]],
    [3, "Which scientist found dinosaur fossils at Lyme Regis?", "Mary Anning", ["Marie Curie", "Ada Lovelace", "Rosalind Franklin"]],
    [3, "What do we call it when living things change over millions of years?", "Evolution", ["Adaptation", "Inheritance", "Migration"]],
    [3, "Children get features from their parents. What is this called?", "Inheritance", ["Evolution", "Adaptation", "Variation"]],
    [3, "What are animals with a backbone called?", "Vertebrates", ["Invertebrates", "Mammals", "Amphibians"]],
    [3, "What kind of rock forms when lava cools down?", "Igneous", ["Sedimentary", "Metamorphic", "Chalk"]],
    [3, "What is the largest organ of the human body?", "The skin", ["The liver", "The brain", "The lungs"]],
    [3, "How many bones are in an adult's body?", "206", ["106", "306", "186"]],
    [3, "What do we call a material that lets all light through?", "Transparent", ["Translucent", "Opaque", "Reflective"]],
    [3, "Can sound travel through space?", "No, there's no air to carry it", ["Yes, faster than on Earth", "Yes, just the same", "Only as an echo"]],
    [3, "What does a food chain always start with?", "A plant (a producer)", ["A predator", "A herbivore", "A decomposer"]],
    [3, "What do we call animals that are active at night?", "Nocturnal", ["Diurnal", "Hibernating", "Migrating"]],
    [4, "Chalk and limestone are which type of rock?", "Sedimentary", ["Igneous", "Metamorphic", "Volcanic"]],
    [4, "Which blood vessels are the tiniest?", "Capillaries", ["Veins", "Arteries", "Nerves"]],
    [4, "Which side of the heart pumps blood to the lungs?", "The right side", ["The left side", "Both sides equally", "Neither side"]],
    [4, "What is the name for plants and animals being suited to where they live?", "Adaptation", ["Inheritance", "Evolution", "Variation"]],
  ];

  const ENGLISH = [
    [1, "Which word is a noun?", "football", ["quickly", "jump", "happy"]],
    [1, "Which word is a verb?", "run", ["red", "table", "slowly"]],
    [1, "Which word is an adjective?", "enormous", ["enormously", "ran", "and"]],
    [1, "Which word is an adverb?", "quickly", ["quick", "quicken", "quickest"]],
    [1, "What is the plural of 'child'?", "children", ["childs", "childes", "childrens"]],
    [1, "Which punctuation mark ends a question?", "A question mark", ["A full stop", "A comma", "An apostrophe"]],
    [1, "Which is spelled correctly?", "because", ["becuase", "becose", "beacause"]],
    [1, "What is the short form (contraction) of 'do not'?", "don't", ["dont", "do'nt", "doesn't"]],
    [1, "What is a word that means the same as another word?", "A synonym", ["An antonym", "A homophone", "A prefix"]],
    [2, "Which word is a synonym of 'big'?", "huge", ["tiny", "bigger", "bag"]],
    [2, "Which word is an antonym of 'generous'?", "selfish", ["kind", "giving", "grateful"]],
    [2, "What is the plural of 'mouse'?", "mice", ["mouses", "mices", "meese"]],
    [2, "What is the plural of 'knife'?", "knives", ["knifes", "knive", "knifs"]],
    [2, "Which is spelled correctly?", "necessary", ["neccessary", "necessery", "neccesary"]],
    [2, "Which is spelled correctly?", "definitely", ["definately", "definitly", "defiantly"]],
    [2, "Which is spelled correctly?", "separate", ["seperate", "separete", "seprate"]],
    [2, "Which is spelled correctly?", "believe", ["beleive", "belive", "beleve"]],
    [2, "Which word fits? '___ going to the match later.'", "They're", ["Their", "There", "Thier"]],
    [2, "Which word fits? 'The fans waved ___ scarves.'", "their", ["they're", "there", "thier"]],
    [2, "What is the past tense of 'catch'?", "caught", ["catched", "cought", "catches"]],
    [2, "What is the past tense of 'swim'?", "swam", ["swum", "swimmed", "swims"]],
    [2, "Which prefix makes 'possible' mean the opposite?", "im-", ["un-", "in-", "dis-"]],
    [2, "Which prefix makes 'appear' mean the opposite?", "dis-", ["un-", "mis-", "im-"]],
    [2, "What type of word are 'and', 'but' and 'because'?", "Conjunctions", ["Prepositions", "Adverbs", "Pronouns"]],
    [2, "What type of word are 'she', 'they' and 'him'?", "Pronouns", ["Nouns", "Determiners", "Prepositions"]],
    [2, "Which shows the apostrophe used correctly?", "George's boots", ["Georges' boots", "Georges boot's", "George boot's"]],
    [2, "Which word sounds the same as 'pear' but is spelled differently?", "pair", ["peer", "pier", "pure"]],
    [2, "What do we call sound words like 'bang', 'splash' and 'crash'?", "Onomatopoeia", ["Alliteration", "Simile", "Metaphor"]],
    [2, "'As fast as a cheetah' is an example of a...", "Simile", ["Metaphor", "Onomatopoeia", "Idiom"]],
    [2, "'Freddie the frog found five flies' uses...", "Alliteration", ["Rhyme", "Simile", "Onomatopoeia"]],
    [3, "Which is spelled correctly?", "rhythm", ["rythm", "rhythem", "rhytm"]],
    [3, "Which is correct?", "George and I went to the match.", ["George and me went to the match.", "Me and George went to the match.", "Myself and George went to the match."]],
    [3, "Which suffix turns 'enjoy' into an adjective?", "-able", ["-ment", "-ness", "-ly"]],
    [3, "What type of word are 'under', 'behind' and 'during'?", "Prepositions", ["Conjunctions", "Adverbs", "Determiners"]],
    [3, "What type of word are 'the', 'a' and 'those'?", "Determiners", ["Pronouns", "Adjectives", "Prepositions"]],
    [3, "Which word is a modal verb?", "might", ["running", "quickly", "jumped"]],
    [3, "Which sentence is in the passive voice?", "The ball was kicked by George.", ["George kicked the ball.", "George is kicking the ball.", "George will kick the ball."]],
    [3, "Which sentence has a relative clause?", "The boy who scored the goal is called George.", ["George scored a goal.", "George scored and the crowd cheered.", "After the match, George went home."]],
    [3, "Which punctuation mark can join two related main clauses?", "A semicolon", ["A comma", "A hyphen", "An apostrophe"]],
    [3, "What does a colon often come before?", "A list or an explanation", ["A question", "The end of a paragraph", "Someone's name"]],
    [3, "Which is correct for the kits of more than one team?", "the teams' kits", ["the team's kits", "the teams kit's", "the teams's kits"]],
    [3, "'The goalkeeper was a brick wall' is an example of a...", "Metaphor", ["Simile", "Personification", "Alliteration"]],
    [3, "What is the root word of 'unhappiness'?", "happy", ["unhappy", "happiness", "hap"]],
    [4, "Which is spelled correctly?", "accommodation", ["accomodation", "acommodation", "accommadation"]],
    [4, "Which sentence uses the subjunctive?", "If I were you, I would practise.", ["If I was you, I would practise.", "I am practising every day.", "Were you practising?"]],
    [4, "Which shows the shark eats people?", "a man-eating shark", ["a man eating shark", "a man eating-shark", "a-man eating shark"]],
    [4, "What usually starts a relative clause?", "A relative pronoun like 'who', 'which' or 'that'", ["A conjunction like 'and'", "A preposition like 'under'", "An adverb like 'quickly'"]],
    [4, "Which is spelled correctly?", "embarrass", ["embarass", "embarras", "emberrass"]],
    [4, "Which word is spelled correctly?", "conscience", ["concience", "conscence", "consciense"]],
  ];

  const SPACE = [
    [1, "What is the closest star to Earth?", "The Sun", ["The Moon", "The North Star", "Mars"]],
    [1, "How many planets are in our Solar System?", "8", ["9", "7", "10"]],
    [1, "Who was the first person to walk on the Moon?", "Neil Armstrong", ["Buzz Aldrin", "Yuri Gagarin", "Tim Peake"]],
    [1, "Which planet is called the Red Planet?", "Mars", ["Jupiter", "Venus", "Mercury"]],
    [1, "What is the biggest planet in our Solar System?", "Jupiter", ["Saturn", "Neptune", "Earth"]],
    [1, "How many moons does Earth have?", "1", ["2", "0", "3"]],
    [2, "Which planet is closest to the Sun?", "Mercury", ["Venus", "Mars", "Earth"]],
    [2, "Which planet has the most famous rings?", "Saturn", ["Jupiter", "Uranus", "Neptune"]],
    [2, "How long does the Earth take to go around the Sun?", "About 365 days", ["24 hours", "28 days", "7 days"]],
    [2, "How long does the Earth take to spin round once?", "About 24 hours", ["About 365 days", "About 12 hours", "About 28 days"]],
    [2, "What causes day and night?", "The Earth spinning", ["The Earth going round the Sun", "The Moon blocking the Sun", "Clouds covering the Sun"]],
    [2, "What is the name of our galaxy?", "The Milky Way", ["Andromeda", "The Solar System", "Orion"]],
    [2, "What is the Moon?", "Earth's natural satellite", ["A star", "A planet", "A comet"]],
    [2, "Does the Moon make its own light?", "No, it reflects sunlight", ["Yes, like the Sun", "Yes, but only at night", "Only when it's full"]],
    [2, "About how long does the Moon take to go around the Earth?", "About a month", ["About a day", "About a year", "About a week"]],
    [2, "Which planet is furthest from the Sun?", "Neptune", ["Pluto", "Uranus", "Saturn"]],
    [2, "What is a group of stars that makes a picture in the sky?", "A constellation", ["A galaxy", "A nebula", "A solar system"]],
    [3, "Which planet is the hottest?", "Venus", ["Mercury", "Mars", "Jupiter"]],
    [3, "Who was the first person to travel into space?", "Yuri Gagarin", ["Neil Armstrong", "Buzz Aldrin", "Tim Peake"]],
    [3, "Which British astronaut went to the International Space Station in 2015?", "Tim Peake", ["Helen Sharman", "Chris Hadfield", "Neil Armstrong"]],
    [3, "What is Pluto called now?", "A dwarf planet", ["A moon", "A star", "A comet"]],
    [3, "Which mission first landed people on the Moon?", "Apollo 11", ["Apollo 13", "Apollo 8", "Gemini 4"]],
    [3, "In which year did people first land on the Moon?", "1969", ["1959", "1972", "1979"]],
    [3, "What is a shooting star really?", "A space rock burning up in the air", ["A falling star", "A comet", "A satellite"]],
    [3, "Which planet has the Great Red Spot, a giant storm?", "Jupiter", ["Mars", "Saturn", "Neptune"]],
    [4, "Which planet spins on its side?", "Uranus", ["Neptune", "Saturn", "Mars"]],
    [4, "What is the Sun mostly made of?", "Hydrogen", ["Helium", "Oxygen", "Carbon"]],
    [4, "About how long does sunlight take to reach Earth?", "About 8 minutes", ["About 8 seconds", "About 8 hours", "About 8 days"]],
    [4, "What is the biggest volcano in the Solar System?", "Olympus Mons on Mars", ["Mauna Kea on Earth", "Mount Etna", "Maxwell Montes on Venus"]],
    [4, "What was the name of the first satellite, launched in 1957?", "Sputnik 1", ["Apollo 1", "Voyager 1", "Hubble"]],
  ];

  const GEOGRAPHY = [
    [1, "How many continents are there?", "7", ["6", "5", "8"]],
    [1, "What is the largest ocean?", "The Pacific", ["The Atlantic", "The Indian", "The Arctic"]],
    [1, "Which continent is the UK in?", "Europe", ["Asia", "North America", "Africa"]],
    [1, "Which way does a compass needle point?", "North", ["South", "East", "West"]],
    [1, "Which river flows through London?", "The Thames", ["The Severn", "The Trent", "The Mersey"]],
    [1, "Which famous river flows through Egypt?", "The Nile", ["The Amazon", "The Danube", "The Thames"]],
    [1, "Which continent is Brazil in?", "South America", ["North America", "Africa", "Europe"]],
    [1, "Which is the coldest continent?", "Antarctica", ["The Arctic", "Europe", "Asia"]],
    [1, "Which ocean is between the UK and the USA?", "The Atlantic", ["The Pacific", "The Indian", "The Arctic"]],
    [1, "Which country is shaped like a boot?", "Italy", ["Spain", "Greece", "Norway"]],
    [1, "In which country is the Eiffel Tower?", "France", ["Belgium", "Italy", "Spain"]],
    [1, "In which country is the Great Wall?", "China", ["Japan", "India", "Mongolia"]],
    [2, "What are the four countries of the United Kingdom?", "England, Scotland, Wales and Northern Ireland", ["England, Scotland, Wales and Ireland", "England, Wales, Cornwall and Scotland", "England, Scotland, France and Wales"]],
    [2, "What is the imaginary line around the middle of the Earth?", "The Equator", ["The Prime Meridian", "The Tropic of Cancer", "The Arctic Circle"]],
    [2, "What is the longest river in the UK?", "The River Severn", ["The River Thames", "The River Trent", "The River Tay"]],
    [2, "What is the largest hot desert in the world?", "The Sahara", ["The Gobi", "The Kalahari", "The Arabian"]],
    [2, "Which is the largest country in the world?", "Russia", ["Canada", "China", "USA"]],
    [2, "What is the largest rainforest in the world?", "The Amazon", ["The Congo", "The Daintree", "Sherwood Forest"]],
    [2, "What do we call the place where a river starts?", "The source", ["The mouth", "The delta", "The estuary"]],
    [2, "What do we call the place where a river meets the sea?", "The mouth", ["The source", "The meander", "The tributary"]],
    [2, "Which sea is between Europe and Africa?", "The Mediterranean", ["The Red Sea", "The North Sea", "The Black Sea"]],
    [2, "Which of these mountain ranges is in the UK?", "The Pennines", ["The Alps", "The Andes", "The Rockies"]],
    [2, "Which ocean is around the North Pole?", "The Arctic Ocean", ["The Southern Ocean", "The Atlantic", "The Pacific"]],
    [2, "What does the key on a map tell you?", "What the symbols mean", ["The scale", "Which way is north", "The date"]],
    [2, "Which city is nicknamed 'the Big Apple'?", "New York", ["Los Angeles", "Chicago", "London"]],
    [3, "Which country has the most people?", "India", ["China", "USA", "Indonesia"]],
    [3, "Which is the smallest continent?", "Australia (Oceania)", ["Europe", "Antarctica", "South America"]],
    [3, "What is the thick layer of leaves high up in a rainforest called?", "The canopy", ["The understorey", "The forest floor", "The roots"]],
    [3, "What is a big bend in a river called?", "A meander", ["A tributary", "A delta", "A waterfall"]],
    [3, "A smaller river that joins a bigger one is called a...", "Tributary", ["Meander", "Estuary", "Source"]],
    [3, "What is the line at 0° longitude that runs through Greenwich?", "The Prime Meridian", ["The Equator", "The Tropic of Capricorn", "The International Date Line"]],
    [3, "What is the largest island in the world?", "Greenland", ["Australia", "Madagascar", "Great Britain"]],
    [3, "What measures how much rain has fallen?", "A rain gauge", ["A thermometer", "A barometer", "An anemometer"]],
    [3, "What is a person who studies the weather called?", "A meteorologist", ["A geologist", "An astronomer", "A biologist"]],
    [3, "On a map, what is a line joining places of the same height?", "A contour line", ["A grid line", "A border", "A scale bar"]],
    [3, "What are lines of latitude?", "Imaginary lines running east to west", ["Imaginary lines running north to south", "Time zones", "Mountain ranges"]],
    [4, "Which of these UK cities is furthest north?", "Inverness", ["Aberdeen", "Edinburgh", "Glasgow"]],
    [4, "What is the tallest waterfall in the world?", "Angel Falls", ["Niagara Falls", "Victoria Falls", "Iguazu Falls"]],
    [4, "What is the name for the very top layer of trees poking out of a rainforest?", "The emergent layer", ["The canopy", "The understorey", "The shrub layer"]],
  ];

  const MUSIC = [
    [1, "Which band sang 'We Will Rock You'?", "Queen", ["The Beatles", "AC/DC", "Oasis"]],
    [1, "Which band from Liverpool were called the 'Fab Four'?", "The Beatles", ["The Rolling Stones", "Queen", "Oasis"]],
    [1, "How many strings does a normal guitar have?", "6", ["4", "5", "12"]],
    [1, "Which instrument has black and white keys?", "The piano", ["The guitar", "The violin", "The drums"]],
    [1, "Which instrument do you hit with sticks?", "The drums", ["The trumpet", "The guitar", "The flute"]],
    [2, "Who was the lead singer of Queen?", "Freddie Mercury", ["Brian May", "Mick Jagger", "Bono"]],
    [2, "Which Queen song starts 'Is this the real life? Is this just fantasy?'", "Bohemian Rhapsody", ["Don't Stop Me Now", "We Are the Champions", "We Will Rock You"]],
    [2, "Which band had a hit with 'Wonderwall'?", "Oasis", ["Blur", "Coldplay", "The Beatles"]],
    [2, "Rock band AC/DC come from which country?", "Australia", ["UK", "USA", "Canada"]],
    [2, "Which band sang 'Back in Black' and 'Highway to Hell'?", "AC/DC", ["Metallica", "Kiss", "Guns N' Roses"]],
    [2, "Who is known as the 'King of Rock and Roll'?", "Elvis Presley", ["Chuck Berry", "Little Richard", "Johnny Cash"]],
    [2, "Which band sang 'Smoke on the Water'?", "Deep Purple", ["Led Zeppelin", "Black Sabbath", "AC/DC"]],
    [2, "How many strings does a bass guitar usually have?", "4", ["6", "5", "3"]],
    [2, "The trumpet belongs to which family of instruments?", "Brass", ["Woodwind", "Strings", "Percussion"]],
    [2, "The violin belongs to which family of instruments?", "Strings", ["Woodwind", "Brass", "Percussion"]],
    [2, "What do we call how fast or slow music is?", "Tempo", ["Pitch", "Dynamics", "Rhythm"]],
    [2, "What do we call how high or low a note is?", "Pitch", ["Tempo", "Volume", "Timbre"]],
    [2, "What does 'forte' mean in music?", "Loud", ["Quiet", "Fast", "Slow"]],
    [2, "In which city did the Beatles start?", "Liverpool", ["London", "Manchester", "Birmingham"]],
    [3, "Which band did Ozzy Osbourne sing for?", "Black Sabbath", ["Iron Maiden", "Metallica", "Led Zeppelin"]],
    [3, "Which band recorded 'Stairway to Heaven'?", "Led Zeppelin", ["Pink Floyd", "The Who", "Deep Purple"]],
    [3, "Which band sang 'Sweet Child o' Mine'?", "Guns N' Roses", ["Bon Jovi", "Aerosmith", "Def Leppard"]],
    [3, "Which band sang 'Livin' on a Prayer'?", "Bon Jovi", ["Def Leppard", "Journey", "Queen"]],
    [3, "What is a group of four musicians called?", "A quartet", ["A trio", "A quintet", "A duet"]],
    [3, "Which composer kept writing music after he went deaf?", "Beethoven", ["Mozart", "Bach", "Handel"]],
    [3, "How many lines are on a music stave?", "5", ["4", "6", "3"]],
    [3, "Which famous festival happens at Worthy Farm in Somerset?", "Glastonbury", ["Download", "Reading", "Isle of Wight"]],
    [4, "Download, the big rock festival, is held at which race track near Nottingham?", "Donington Park", ["Silverstone", "Brands Hatch", "Oulton Park"]],
    [4, "Queen guitarist Brian May built his own guitar. What is it called?", "The Red Special", ["Blackie", "Lucille", "The Frankenstrat"]],
    [4, "Which Nirvana album has a baby swimming on the cover?", "Nevermind", ["In Utero", "Bleach", "Unplugged"]],
    [4, "Which band's album 'The Dark Side of the Moon' has a prism on the cover?", "Pink Floyd", ["Led Zeppelin", "Queen", "The Beatles"]],
  ];

  const ANIMALS = [
    [1, "What is the largest animal on Earth?", "The blue whale", ["The whale shark", "The African elephant", "The giraffe"]],
    [1, "What is the fastest land animal?", "The cheetah", ["The lion", "The horse", "The greyhound"]],
    [1, "What is the tallest animal?", "The giraffe", ["The elephant", "The ostrich", "The moose"]],
    [1, "How many legs does a spider have?", "8", ["6", "10", "4"]],
    [1, "What do pandas mainly eat?", "Bamboo", ["Fish", "Berries", "Grass"]],
    [1, "What is a baby frog called?", "A tadpole", ["A cub", "A pup", "A chick"]],
    [1, "How do fish breathe?", "Through gills", ["Through lungs", "Through their skin", "Through their fins"]],
    [1, "Which British bird has a red breast?", "The robin", ["The blue tit", "The blackbird", "The sparrow"]],
    [1, "Which bird can't fly but can run very fast?", "The ostrich", ["The eagle", "The swan", "The parrot"]],
    [2, "What is a group of lions called?", "A pride", ["A pack", "A herd", "A flock"]],
    [2, "What is a group of wolves called?", "A pack", ["A pride", "A flock", "A school"]],
    [2, "What is a group of fish called?", "A school", ["A pack", "A herd", "A flock"]],
    [2, "What is a baby kangaroo called?", "A joey", ["A cub", "A kit", "A calf"]],
    [2, "Which is the largest big cat?", "The tiger", ["The lion", "The jaguar", "The leopard"]],
    [2, "Which mammal can really fly?", "The bat", ["The flying squirrel", "The penguin", "The ostrich"]],
    [2, "Which animal changes colour to blend in?", "The chameleon", ["The iguana", "The gecko", "The frog"]],
    [2, "What is the largest bird in the world?", "The ostrich", ["The emu", "The eagle", "The albatross"]],
    [2, "Which is the slowest mammal?", "The sloth", ["The koala", "The tortoise", "The snail"]],
    [2, "What kind of animal is a Komodo dragon?", "A lizard", ["A snake", "A crocodile", "A dinosaur"]],
    [2, "What is a male deer called?", "A stag", ["A doe", "A fawn", "A hind"]],
    [3, "How many hearts does an octopus have?", "3", ["2", "1", "8"]],
    [3, "Which continent has no snakes at all?", "Antarctica", ["Australia", "Europe", "South America"]],
    [3, "What is a baby owl called?", "An owlet", ["A cygnet", "A gosling", "A duckling"]],
    [3, "What is a baby swan called?", "A cygnet", ["An owlet", "A gosling", "A duckling"]],
    [3, "Which of these animals is a marsupial (carries its baby in a pouch)?", "The kangaroo", ["The panda", "The bear", "The wolf"]],
    [3, "Which of these mammals lays eggs?", "The platypus", ["The kangaroo", "The koala", "The dolphin"]],
    [3, "What is the biggest fish in the sea?", "The whale shark", ["The great white shark", "The hammerhead", "The tiger shark"]],
    [3, "What amazing thing can an axolotl do?", "Regrow lost legs", ["Fly short distances", "Turn into a frog", "Breathe fire"]],
    [3, "Which animal lives in a sett?", "The badger", ["The fox", "The rabbit", "The otter"]],
    [3, "What is a fox's home called?", "A den", ["A sett", "A warren", "A drey"]],
    [4, "A group of crows is called a...", "Murder", ["Parliament", "Gaggle", "Pack"]],
    [4, "What is the fastest bird when it dives?", "The peregrine falcon", ["The golden eagle", "The swift", "The ostrich"]],
    [4, "What is a squirrel's nest called?", "A drey", ["A sett", "A holt", "A burrow"]],
    [4, "What is an otter's home called?", "A holt", ["A drey", "A sett", "A lodge"]],
    [4, "Which animal is thought to have the strongest bite?", "The saltwater crocodile", ["The great white shark", "The lion", "The hippo"]],
  ];

  const ROMANIAN = [
    [1, "How do you say 'hello' in Romanian?", "Bună", ["Ciao", "Hola", "Bonjour"]],
    [1, "What does 'mulțumesc' mean?", "Thank you", ["Please", "Goodbye", "Good morning"]],
    [1, "How do you say 'yes' in Romanian?", "Da", ["Nu", "Si", "Ja"]],
    [1, "How do you say 'no' in Romanian?", "Nu", ["Da", "Non", "Nein"]],
    [1, "What colours are on the Romanian flag?", "Blue, yellow and red", ["Blue, white and red", "Red, white and green", "Black, red and gold"]],
    [1, "What does 'fotbal' mean?", "Football", ["Food", "Photo", "Fish"]],
    [1, "What does 'Hai Forest!' mean?", "Come on Forest!", ["Hi Forest!", "Bye Forest!", "Poor Forest!"]],
    [2, "What does 'câine' mean?", "Dog", ["Cat", "Horse", "Bird"]],
    [2, "What does 'pisică' mean?", "Cat", ["Dog", "Mouse", "Fish"]],
    [2, "How do you say 'good morning' in Romanian?", "Bună dimineața", ["Bună seara", "Noapte bună", "La revedere"]],
    [2, "What does 'La revedere' mean?", "Goodbye", ["Hello", "Thank you", "Good night"]],
    [2, "What does 'Noapte bună' mean?", "Good night", ["Good evening", "Good morning", "Goodbye"]],
    [2, "How do you count 'one, two, three' in Romanian?", "Unu, doi, trei", ["Uno, dos, tres", "Un, deux, trois", "Eins, zwei, drei"]],
    [2, "What is the Romanian word for 'mum'?", "Mamă", ["Tată", "Bunica", "Soră"]],
    [2, "What is the Romanian word for 'dad'?", "Tată", ["Mamă", "Frate", "Bunic"]],
    [2, "What colour is 'roșu'?", "Red", ["Pink", "Orange", "Brown"]],
    [2, "What colour is 'verde'?", "Green", ["Blue", "Yellow", "Black"]],
    [2, "What is Romania's capital called in Romanian?", "București", ["Brașov", "Cluj", "Constanța"]],
    [2, "Which mountains curve across Romania?", "The Carpathians", ["The Alps", "The Pyrenees", "The Urals"]],
    [2, "Which sea is on Romania's coast?", "The Black Sea", ["The Mediterranean", "The Baltic Sea", "The Red Sea"]],
    [3, "What does 'bunica' mean?", "Grandma", ["Grandad", "Sister", "Aunt"]],
    [3, "What does 'apă' mean?", "Water", ["Apple", "Bread", "Milk"]],
    [3, "What does 'pâine' mean?", "Bread", ["Dog", "Water", "Cheese"]],
    [3, "What colour is 'albastru'?", "Blue", ["White", "Green", "Yellow"]],
    [3, "How do you say 'I love you' in Romanian?", "Te iubesc", ["Te rog", "Mulțumesc", "Scuze"]],
    [3, "What does 'Te rog' mean?", "Please", ["Thank you", "Sorry", "You're welcome"]],
    [3, "What is the Romanian word for 'school'?", "Școală", ["Casă", "Masă", "Carte"]],
    [3, "What does 'carte' mean in Romanian?", "Book", ["Card", "Cart", "Car"]],
    [3, "Which famous castle in Romania is linked to the Dracula story?", "Bran Castle", ["Peleș Castle", "Corvin Castle", "Edinburgh Castle"]],
    [3, "Which big river runs along much of Romania's southern border?", "The Danube", ["The Rhine", "The Volga", "The Thames"]],
    [3, "What is Romania's money called?", "The leu", ["The euro", "The pound", "The koruna"]],
    [3, "Which Romanian gymnast scored the first ever perfect 10 at the Olympics, in 1976?", "Nadia Comăneci", ["Simona Halep", "Olga Korbut", "Simone Biles"]],
    [3, "Which Romanian won the Wimbledon women's title in 2019?", "Simona Halep", ["Nadia Comăneci", "Emma Răducanu", "Serena Williams"]],
    [3, "Which Romanian footballer was called 'the Maradona of the Carpathians'?", "Gheorghe Hagi", ["Gheorghe Popescu", "Adrian Mutu", "Dan Petrescu"]],
    [3, "What are 'sarmale'?", "Cabbage rolls stuffed with meat and rice", ["A Romanian dance", "A cheesecake", "A folk song"]],
    [4, "What does 'mâine' mean?", "Tomorrow", ["Hand", "Bread", "Dog"]],
    [4, "What does 'mâncare' mean?", "Food", ["Hand", "Tomorrow", "Sea"]],
    [4, "What is 'mămăligă'?", "A cornmeal porridge", ["A soup", "A sausage", "A sweet pastry"]],
    [4, "What is 'Mărțișor', celebrated on 1 March?", "A spring festival with red-and-white string tokens", ["A winter lantern festival", "A harvest festival", "Romanian New Year"]],
    [4, "The Romanian language comes mostly from which ancient language?", "Latin", ["Greek", "Old English", "Sanskrit"]],
    [4, "What is the traditional embroidered Romanian blouse called?", "Ie", ["Kilt", "Sari", "Poncho"]],
  ];

  const INVENTORS = [
    [1, "Who invented the telephone?", "Alexander Graham Bell", ["Thomas Edison", "Isaac Newton", "John Logie Baird"]],
    [1, "Which brothers flew the first aeroplane in 1903?", "The Wright brothers", ["The Lumière brothers", "The Grimm brothers", "The Mario brothers"]],
    [1, "What did Thomas Edison make work well enough for everyone's homes?", "The light bulb", ["The telephone", "The television", "The car"]],
    [2, "Who invented the World Wide Web?", "Tim Berners-Lee", ["Bill Gates", "Steve Jobs", "Mark Zuckerberg"]],
    [2, "Which Scottish inventor showed the first working television?", "John Logie Baird", ["Alexander Graham Bell", "James Watt", "Alexander Fleming"]],
    [2, "Who discovered penicillin, the first antibiotic?", "Alexander Fleming", ["Louis Pasteur", "Edward Jenner", "Joseph Lister"]],
    [2, "Which codebreaker helped crack the Enigma code in WW2?", "Alan Turing", ["Charles Babbage", "Winston Churchill", "Tim Berners-Lee"]],
    [2, "Which British inventor made the bagless vacuum cleaner?", "James Dyson", ["Percy Shaw", "Clive Sinclair", "Trevor Baylis"]],
    [2, "Who made cars cheap to build with an assembly line?", "Henry Ford", ["Karl Benz", "Enzo Ferrari", "Walt Disney"]],
    [2, "Who showed off the first iPhone in 2007?", "Steve Jobs", ["Bill Gates", "Elon Musk", "Mark Zuckerberg"]],
    [2, "Which Italian artist drew designs for flying machines over 500 years ago?", "Leonardo da Vinci", ["Michelangelo", "Galileo", "Raphael"]],
    [3, "Who made the first vaccine, against smallpox?", "Edward Jenner", ["Louis Pasteur", "Alexander Fleming", "Marie Curie"]],
    [3, "Who invented the printing press in Europe around 1440?", "Johannes Gutenberg", ["William Caxton", "Leonardo da Vinci", "Galileo"]],
    [3, "Who greatly improved the steam engine in the 1700s?", "James Watt", ["Thomas Newcomen", "George Stephenson", "Isambard Kingdom Brunel"]],
    [3, "Which father and son built the famous 'Rocket' steam train?", "The Stephensons", ["The Watts", "The Brunels", "The Trevithicks"]],
    [3, "Who built the Clifton Suspension Bridge and the SS Great Britain?", "Isambard Kingdom Brunel", ["Thomas Telford", "George Stephenson", "James Watt"]],
    [3, "Who designed the Analytical Engine, an early computer?", "Charles Babbage", ["Alan Turing", "Tim Berners-Lee", "Bill Gates"]],
    [3, "Who is called the first computer programmer?", "Ada Lovelace", ["Grace Hopper", "Marie Curie", "Florence Nightingale"]],
    [3, "Who sent the first radio signals across the Atlantic?", "Guglielmo Marconi", ["Nikola Tesla", "Alexander Graham Bell", "Thomas Edison"]],
    [3, "Who invented dynamite and started the Nobel Prizes?", "Alfred Nobel", ["Thomas Edison", "Marie Curie", "Nikola Tesla"]],
    [3, "Which scientist won two Nobel Prizes for her work on radioactivity?", "Marie Curie", ["Rosalind Franklin", "Ada Lovelace", "Mary Anning"]],
    [3, "Who built the first practical petrol-powered car in 1885?", "Karl Benz", ["Henry Ford", "Enzo Ferrari", "Ferdinand Porsche"]],
    [4, "Where did Alan Turing and the codebreakers work in WW2?", "Bletchley Park", ["Downing Street", "Greenwich", "Buckingham Palace"]],
    [4, "Who invented the 'cat's eyes' in the middle of roads?", "Percy Shaw", ["James Dyson", "Frank Whittle", "John Boyd Dunlop"]],
    [4, "Who invented the jet engine in Britain?", "Frank Whittle", ["Barnes Wallis", "James Dyson", "The Wright brothers"]],
    [4, "Who invented the wind-up radio?", "Trevor Baylis", ["James Dyson", "Clive Sinclair", "Guglielmo Marconi"]],
    [4, "Which Romanian inventor designed an early jet aircraft in 1910?", "Henri Coandă", ["Aurel Vlaicu", "Traian Vuia", "Nikola Tesla"]],
    [4, "Which Romanian inventor patented an early fountain pen in 1827?", "Petrache Poenaru", ["Henri Coandă", "Aurel Vlaicu", "Nicolae Paulescu"]],
  ];

  /* ---------------- SATs maths, made up on the spot ----------------
     Level 1: adding, taking away, place value, rounding to 10.
     Level 2: fractions and simple percentages of amounts, negative numbers, Roman numerals.
     Level 3: harder fractions and percentages, order of operations, square and prime numbers.
     Level 4: tricky percentages, adding fractions, brackets, cube numbers, big Roman numerals. */
  const R = Math.random;
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const pickOne = (arr) => arr[Math.floor(R() * arr.length)];
  function roman(n) {
    const map = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
    let s = "";
    map.forEach(([v, r]) => { while (n >= v) { s += r; n -= v; } });
    return s;
  }
  const near = (ans, spread) => [ans + spread, ans - spread, ans + 2 * spread, ans + 1, ans - 1].filter((v, i, a) => v !== ans && a.indexOf(v) === i);
  const isPrime = (n) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };

  function sats(level) {
    const kinds = {
      1: ["add", "sub", "place", "round10"],
      2: ["frac", "pct", "neg", "roman", "round100"],
      3: ["frac2", "pct2", "bodmas", "square", "prime", "decimal"],
      4: ["pct3", "addfrac", "brackets", "cube", "roman2"],
    }[level] || ["add"];
    const kind = pickOne(kinds);
    let q, a, w, id;
    if (kind === "add") { const x = ri(23, 78), y = ri(14, 69); q = `${x} + ${y} = ?`; a = x + y; w = near(a, 10); id = `add${x}+${y}`; }
    else if (kind === "sub") { const x = ri(52, 99), y = ri(13, 48); q = `${x} − ${y} = ?`; a = x - y; w = near(a, 10); id = `sub${x}-${y}`; }
    else if (kind === "place") {
      const n = ri(1200, 9899), digits = String(n).split(""), i = ri(0, 3), d = Number(digits[i]);
      if (d === 0) return sats(level);
      const val = d * Math.pow(10, 3 - i);
      q = `What is the value of the ${d} in ${n.toLocaleString("en-GB")}?`; a = val;
      w = [d * Math.pow(10, 3 - i + 1), d * Math.pow(10, Math.max(0, 3 - i - 1)), d].filter((v) => v !== val); id = `pv${n}-${i}`;
    }
    else if (kind === "round10") { const n = ri(12, 988); if (n % 10 === 5 || n % 10 === 0) return sats(level); a = Math.round(n / 10) * 10; q = `Round ${n} to the nearest 10.`; w = [a + (n % 10 < 5 ? 10 : -10), a + 100, n]; id = `r10-${n}`; }
    else if (kind === "round100") { const n = ri(120, 9880); if (n % 100 === 50 || Math.round(n / 10) % 10 === 0) return sats(level); a = Math.round(n / 100) * 100; q = `Round ${n.toLocaleString("en-GB")} to the nearest 100.`; w = [a + (n % 100 < 50 ? 100 : -100), Math.round(n / 10) * 10, a + 1000]; id = `r100-${n}`; }
    else if (kind === "frac") { const d = pickOne([2, 3, 4, 5, 10]), n = d * ri(3, 12); a = n / d; q = `What is 1/${d} of ${n}?`; w = near(a, d === 10 ? 1 : 2).concat([n * d]); id = `f1/${d}of${n}`; }
    else if (kind === "pct") { const p = pickOne([10, 50, 25]), n = pickOne([40, 60, 80, 120, 200, 360, 400]); a = (p * n) / 100; q = `What is ${p}% of ${n}?`; w = [a * 2, a / 2, a + 10, n - a].filter((v) => v > 0); id = `p${p}of${n}`; }
    else if (kind === "neg") { const x = -ri(2, 9), y = ri(3, 12); a = x + y; q = `${x} + ${y} = ?`; w = [-x + y, x - y, a + 2, a - 1]; id = `neg${x}+${y}`; }
    else if (kind === "roman") { const n = ri(11, 49); a = n; q = `What number is ${roman(n)} in Roman numerals?`; w = near(n, 10).concat([n + 5]); id = `rom${n}`; }
    else if (kind === "frac2") { const [nu, d] = pickOne([[3, 4], [2, 3], [2, 5], [3, 5], [3, 10], [5, 8]]), n = d * ri(3, 10); a = (nu * n) / d; q = `What is ${nu}/${d} of ${n}?`; w = [n / d, a + n / d, a - n / d, nu * n].filter((v, i, arr) => v > 0 && v !== a && arr.indexOf(v) === i); id = `f${nu}/${d}of${n}`; }
    else if (kind === "pct2") { const p = pickOne([20, 30, 75, 5, 15]), n = pickOne([40, 60, 80, 120, 200, 240, 300]); a = (p * n) / 100; q = `What is ${p}% of ${n}?`; w = [a + (n / 10), a - (n / 20), (p * n) / 10, a * 2].filter((v, i, arr) => v > 0 && v !== a && arr.indexOf(v) === i); id = `p${p}of${n}`; }
    else if (kind === "bodmas") { const x = ri(2, 9), y = ri(2, 9), z = ri(2, 9); a = x + y * z; q = `${x} + ${y} × ${z} = ?`; w = [(x + y) * z, a + 1, x * y + z]; id = `bod${x}+${y}x${z}`; }
    else if (kind === "square") { const n = ri(4, 12); a = n * n; q = `What is ${n} squared (${n}²)?`; w = [n * 2, n * (n + 1), a + 1]; id = `sq${n}`; }
    else if (kind === "prime") {
      const primes = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47], ans = pickOne(primes);
      const non = [15, 21, 27, 33, 35, 39, 49, 51, 57, 25].filter((v) => !isPrime(v));
      const wrongs = non.sort(() => R() - 0.5).slice(0, 3);
      return { id: `prime${ans}`, subject: "sats", l: level, q: "Which of these is a prime number?", a: String(ans), w: wrongs.map(String), maths: true };
    }
    else if (kind === "decimal") { const n = ri(12, 98) / 10, m = pickOne([10, 100]); a = Math.round(n * m * 100) / 100; q = `${n} × ${m} = ?`; w = [Math.round(n * (m === 10 ? 100 : 10) * 100) / 100, Math.round((n / m) * 1000) / 1000, a + 1]; id = `dec${n}x${m}`; }
    else if (kind === "pct3") { const p = pickOne([35, 45, 12, 65, 85]), n = pickOne([20, 40, 60, 80, 200, 300]); a = (p * n) / 100; q = `What is ${p}% of ${n}?`; w = [a + n / 20, a - n / 20, a + n / 10, (p * n) / 10].filter((v, i, arr) => v > 0 && v !== a && arr.indexOf(v) === i); id = `p${p}of${n}`; }
    else if (kind === "addfrac") {
      const opts = [["1/2", "1/4", "3/4", ["2/6", "1/6", "2/4"]], ["1/2", "1/3", "5/6", ["2/5", "1/6", "2/3"]], ["1/3", "1/6", "1/2", ["2/9", "2/6", "1/4"]], ["2/5", "1/10", "1/2", ["3/15", "3/10", "2/5"]], ["3/4", "1/8", "7/8", ["4/12", "4/8", "3/8"]]];
      const [x, y, ans, wr] = pickOne(opts);
      return { id: `af${x}+${y}`, subject: "sats", l: level, q: `${x} + ${y} = ?`, a: ans, w: wr, maths: true };
    }
    else if (kind === "brackets") { const x = ri(2, 9), y = ri(2, 9), z = ri(3, 9); a = (x + y) * z; q = `(${x} + ${y}) × ${z} = ?`; w = [x + y * z, a + z, a - z]; id = `br${x}+${y}x${z}`; }
    else if (kind === "cube") { const n = ri(2, 6); a = n * n * n; q = `What is ${n} cubed (${n}³)?`; w = [n * 3, n * n, a + n]; id = `cu${n}`; }
    else { const n = pickOne([1966, 1979, 1980, 1865, 2026, 1492, 1066, 1945]); a = n; q = `What year is ${roman(n)} in Roman numerals?`; w = [n + 10, n - 100, n + 1].concat([n === 1979 ? 1981 : 1979]); id = `rom2-${n}`; }
    w = w.filter((v, i, arr) => v !== a && arr.indexOf(v) === i && (typeof v !== "number" || v >= -100));
    // Always have three wrong answers, so World Class shows four buttons.
    for (const d of [1, -1, 2, 10, -2, -10]) { if (w.length >= 3) break; const v = a + d; if (v >= 0 && !w.includes(v)) w.push(v); }
    return { id: "s:" + id, subject: "sats", l: level, q, a: String(a), w: w.map(String), maths: true };
  }

  const BANK = [];
  [["history", HISTORY], ["science", SCIENCE], ["english", ENGLISH], ["space", SPACE], ["geography", GEOGRAPHY],
   ["music", MUSIC], ["animals", ANIMALS], ["romanian", ROMANIAN], ["inventors", INVENTORS]].forEach(([subject, list]) => {
    list.forEach(([l, q, a, w], i) => BANK.push({ id: subject[0] + subject[1] + i, subject, l, q, a, w }));
  });

  Y6.SUBJECTS = SUBJECTS;
  Y6.BANK = BANK;
  Y6.GENERATORS = { sats };

  /* "Name that riff": play a 30-second clip (Deezer, through the site's
     Worker) and name the song. Only asked when clips can play (see
     matchday-live.js), so they never appear offline. The ids match
     SONGS in worker/more.js. */
  const RIFFS = [
    ['thunderstruck', 'Thunderstruck', 'AC/DC', 2], ['backinblack', 'Back In Black', 'AC/DC', 2], ['highway', 'Highway to Hell', 'AC/DC', 3], ['tnt', 'T.N.T.', 'AC/DC', 3],
    ['rockyou', 'We Will Rock You', 'Queen', 1], ['champions', 'We Are The Champions', 'Queen', 1], ['dontstop', "Don't Stop Me Now", 'Queen', 2], ['bitesdust', 'Another One Bites The Dust', 'Queen', 2],
    ['smoke', 'Smoke on the Water', 'Deep Purple', 3], ['tiger', 'Eye of the Tiger', 'Survivor', 1], ['countdown', 'The Final Countdown', 'Europe', 2], ['prayer', "Livin' On A Prayer", 'Bon Jovi', 3],
    ['sweetchild', "Sweet Child O' Mine", "Guns N' Roses", 3], ['sevennation', 'Seven Nation Army', 'The White Stripes', 1], ['wonderwall', 'Wonderwall', 'Oasis', 2], ['rockinall', "Rockin' All Over The World", 'Status Quo', 3],
  ];
  RIFFS.forEach(([id, title, artist, l]) => {
    const label = (t, a) => `${t} (${a})`;
    // Trickiest wrong answer first: one more song by the same band, then
    // other famous rock songs (never four songs by one band: too hard).
    const same = RIFFS.filter((r) => r[2] === artist && r[0] !== id).sort(() => Math.random() - 0.5).slice(0, 1);
    const others = RIFFS.filter((r) => r[2] !== artist).sort(() => Math.random() - 0.5);
    const w = same.concat(others).slice(0, 4).map((r) => label(r[1], r[2]));
    BANK.push({ id: `riff-${id}`, subject: 'music', l, audio: id, q: '🎧 Name that riff! Press play, then pick the song.', a: label(title, artist), w });
  });
})(window.MQ_Y6 = window.MQ_Y6 || {});
