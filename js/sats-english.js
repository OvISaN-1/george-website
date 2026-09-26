/* ===========================================================
   SATs PRACTICE: ENGLISH
   -----------------------------------------------------------
   Grammar, punctuation and spelling (the "GPS" paper) and
   reading comprehension, Year 6 (KS2) level.

   Each question: [question, right answer, [wrong answers], how to work it out]
   =========================================================== */
(function () {
  'use strict';

  const GPS = [
    {
      id: 'wordclass', name: 'Word classes', emoji: '🏷️',
      qs: [
        ['In the sentence "The <u>brave</u> goalkeeper saved the penalty", what word class is the underlined word?', 'adjective', ['adverb', 'noun', 'verb'], 'An adjective describes a noun. "Brave" describes the goalkeeper.'],
        ['In the sentence "She ran <u>quickly</u> to the bus stop", what word class is the underlined word?', 'adverb', ['adjective', 'verb', 'preposition'], 'An adverb tells you more about a verb. "Quickly" tells you how she ran.'],
        ['In the sentence "We walked <u>under</u> the bridge", what word class is the underlined word?', 'preposition', ['conjunction', 'adverb', 'determiner'], 'A preposition shows where something is, or when, in relation to something else. "Under" shows where.'],
        ['In the sentence "I wanted to play, <u>but</u> it was raining", what word class is the underlined word?', 'conjunction', ['preposition', 'adverb', 'pronoun'], 'A conjunction joins words or clauses. "But" joins the two clauses.'],
        ['In the sentence "<u>They</u> cheered when Forest scored", what word class is the underlined word?', 'pronoun', ['noun', 'determiner', 'adjective'], 'A pronoun stands in for a noun. "They" stands in for the people cheering.'],
        ['In the sentence "<u>Those</u> boots are mine", what word class is the underlined word?', 'determiner', ['pronoun', 'adjective', 'adverb'], 'A determiner comes before a noun and tells you which one. "Those" tells you which boots. (If it stood alone, like "Those are mine", it would be a pronoun.)'],
        ['Which word is a noun in this sentence? "The happiness in the stadium was amazing."', 'happiness', ['amazing', 'was', 'the'], 'Nouns name things, including feelings and ideas. "Happiness" is an abstract noun.'],
        ['Which word is a verb in this sentence? "After lunch, the children explored the castle."', 'explored', ['lunch', 'after', 'castle'], 'A verb is a doing or being word. "Explored" is what the children did.'],
        ['Which word is an adverb in this sentence? "Tomorrow, we will visit Grandma in Romania."', 'Tomorrow', ['visit', 'Grandma', 'in'], 'An adverb can tell you when something happens. "Tomorrow" tells you when we will visit.'],
        ['In the sentence "My dog is <u>kind</u>", what word class is the underlined word?', 'adjective', ['noun', 'adverb', 'verb'], '"Kind" describes the dog, so it is an adjective, even though it comes after the verb "is".'],
        ['Which word is a subordinating conjunction?', 'although', ['and', 'but', 'or'], 'Subordinating conjunctions start a subordinate clause: although, because, when, if, since, until, while. "And", "but" and "or" are coordinating conjunctions.'],
        ['Which word is a modal verb?', 'might', ['running', 'quickly', 'went'], 'Modal verbs show how likely or possible something is: can, could, will, would, shall, should, may, might, must.'],
        ['Which word is a possessive pronoun?', 'theirs', ['their', 'they', 'them'], 'Possessive pronouns stand alone: mine, yours, his, hers, ours, theirs. "Their" is a determiner because it needs a noun after it ("their ball").'],
      ],
    },
    {
      id: 'punctuation', name: 'Punctuation', emoji: '❗',
      qs: [
        ['Which sentence uses the apostrophe correctly?', 'The dog\'s bowl was empty.', ['The dogs\' bowl\'s was empty.', 'The dog\'s bowl\'s was empty.', 'The dogs bowl was empty\'.'], 'The apostrophe shows the bowl belongs to one dog: "the dog\'s bowl".'],
        ['Which sentence shows that the bikes belong to more than one boy?', 'The boys\' bikes were outside.', ['The boy\'s bikes were outside.', 'The boys bike\'s were outside.', 'The boy\'s bike\'s were outside.'], 'For a plural ending in s, the apostrophe goes after the s: "the boys\' bikes".'],
        ['Which sentence is punctuated correctly?', '"Where are my boots?" asked George.', ['"Where are my boots"? asked George.', '"Where are my boots," asked George?', 'Where are my boots? "asked George."'], 'The question mark belongs to the spoken words, so it goes inside the inverted commas.'],
        ['Where should the comma go? "After the match we went for pizza."', 'After the match, we went for pizza.', ['After, the match we went for pizza.', 'After the match we went, for pizza.', 'After the match we, went for pizza.'], 'Put a comma after a fronted adverbial: "After the match," tells you when.'],
        ['Which sentence uses a colon correctly?', 'I packed three things: boots, shin pads and a drink.', ['I packed: three things boots, shin pads and a drink.', 'I: packed three things, boots, shin pads and a drink.', 'I packed three things boots: shin pads and a drink.'], 'A colon can introduce a list. The part before the colon must make sense on its own.'],
        ['Which sentence uses a semi-colon correctly?', 'It was pouring with rain; the match was cancelled.', ['It was pouring; with rain the match was cancelled.', 'It was; pouring with rain the match was cancelled.', 'It was pouring with rain the; match was cancelled.'], 'A semi-colon joins two main clauses that are closely linked. Each side must make sense as a sentence.'],
        ['Which sentence uses brackets correctly?', 'Murillo (a centre-back) won every header.', ['Murillo a (centre-back) won every header.', '(Murillo a centre-back) won every header.', 'Murillo a centre-back won (every header).'], 'Brackets hold extra information (parenthesis). The sentence must still make sense without the part in brackets.'],
        ['Which sentence needs a question mark?', 'Can you pass me the ball', ['Pass me the ball', 'I wonder if you can pass me the ball', 'What a great pass that was'], '"Can you pass me the ball" asks a direct question, so it needs a question mark. "I wonder if..." is a statement.'],
        ['What is the contraction of "they are"?', 'they\'re', ['their', 'there', 'theyr\'e'], 'The apostrophe shows where the letter "a" is missing: they are → they\'re.'],
        ['Which sentence uses a hyphen to avoid confusion?', 'I saw a man-eating shark.', ['I saw a man eating-shark.', 'I-saw a man eating shark.', 'I saw a-man eating shark.'], 'Without the hyphen, "man eating shark" could mean a man eating a shark! The hyphen joins "man-eating" into one describing word.'],
        ['Which sentence uses dashes correctly?', 'The crowd – all 30,000 of them – went wild.', ['The crowd all – 30,000 of them went – wild.', 'The – crowd all 30,000 of them went wild –.', '– The crowd all 30,000 of them – went wild.'], 'A pair of dashes can hold extra information, like brackets. Take it out and the sentence still works: "The crowd went wild."'],
        ['Which is the correct way to write this list? "I like dogs cats and hamsters."', 'I like dogs, cats and hamsters.', ['I like, dogs, cats, and, hamsters.', 'I like dogs cats, and, hamsters.', 'I, like dogs cats and hamsters.'], 'Use commas to separate items in a list. You usually don\'t need one before "and".'],
        ['What is the contraction of "should have"?', 'should\'ve', ['should of', 'shouldn\'t', 'shoul\'dve'], '"Should have" becomes "should\'ve". It is never "should of", even though it sounds like it.'],
        ['Which sentence is an exclamation?', 'What an amazing goal that was!', ['That was an amazing goal!', 'Score a goal!', 'Was that an amazing goal!'], 'In SATs, an exclamation sentence starts with "What" or "How" and has a verb. "That was an amazing goal!" is a statement with an exclamation mark.'],
      ],
    },
    {
      id: 'sentences', name: 'Clauses & sentences', emoji: '🧩',
      qs: [
        ['Which part of this sentence is the main clause? "Because it was raining, we stayed inside."', 'we stayed inside', ['Because it was raining', 'it was raining', 'Because'], 'A main clause makes sense on its own. "We stayed inside" works as a sentence; "because it was raining" doesn\'t.'],
        ['Which sentence contains a relative clause?', 'The boy who scored the goal is my friend.', ['The boy scored the goal and he is my friend.', 'When the boy scored, we cheered.', 'My friend scored a goal.'], 'A relative clause adds information about a noun, starting with who, which, that, whose, where or when.'],
        ['What type of sentence is this? "Put your boots on."', 'command', ['question', 'statement', 'exclamation'], 'A command tells someone to do something. It usually starts with a bossy (imperative) verb: "Put".'],
        ['What type of sentence is this? "Forest won on Saturday."', 'statement', ['command', 'question', 'exclamation'], 'A statement tells you a fact or an idea.'],
        ['Which word is the subject in this sentence? "The referee blew his whistle."', 'The referee', ['his whistle', 'blew', 'whistle'], 'The subject is who or what is doing the verb. The referee did the blowing.'],
        ['Which word is the object in this sentence? "George kicked the ball."', 'the ball', ['George', 'kicked', 'George kicked'], 'The object is the thing that the verb is done to. The ball was kicked.'],
        ['Which sentence has a subordinate clause?', 'I will play outside if it stops raining.', ['I will play outside and have fun.', 'It is raining.', 'I will play outside.'], '"If it stops raining" is a subordinate clause: it starts with a subordinating conjunction and doesn\'t make sense alone.'],
        ['Which sentence is written in Standard English?', 'We were going to the park.', ['We was going to the park.', 'We is going to the park.', 'We be going to the park.'], 'With "we", the past tense of "to be" is "were". "We was" is not Standard English.'],
        ['Which sentence is written in Standard English?', 'I did my homework yesterday.', ['I done my homework yesterday.', 'I have did my homework yesterday.', 'I doed my homework yesterday.'], 'The simple past of "do" is "did". "Done" needs "have": "I have done my homework."'],
        ['Which is a noun phrase?', 'the old red bus', ['ran quickly', 'under the table', 'very happily'], 'A noun phrase is built around a noun. "The old red bus" is all about the noun "bus".'],
        ['Which sentence is the most formal?', 'Please ensure that you arrive promptly.', ['Make sure you get here on time, OK?', 'Don\'t be late, mate!', 'Get here on time, yeah?'], 'Formal writing uses careful vocabulary ("ensure", "promptly") and no slang or chatty tags.'],
        ['Which is a fronted adverbial?', 'Later that evening,', ['the dog barked', 'very loudly', 'and then'], 'A fronted adverbial comes at the start of the sentence, tells you when, where or how, and is followed by a comma.'],
      ],
    },
    {
      id: 'tenses', name: 'Verbs & tenses', emoji: '⏳',
      qs: [
        ['Which sentence is in the present perfect?', 'I have finished my homework.', ['I finished my homework.', 'I was finishing my homework.', 'I finish my homework.'], 'The present perfect uses "have" or "has" plus the past participle: "have finished".'],
        ['Which sentence is in the past progressive?', 'We were watching the match.', ['We watched the match.', 'We are watching the match.', 'We have watched the match.'], 'The past progressive uses "was" or "were" plus an -ing verb: "were watching".'],
        ['Which sentence is written in the passive voice?', 'The window was broken by the ball.', ['The ball broke the window.', 'The ball is breaking the window.', 'The ball will break the window.'], 'In the passive, the thing the action happens to comes first, and you often get "by...": "The window was broken by the ball."'],
        ['Rewrite in the active voice: "The cake was eaten by the dog."', 'The dog ate the cake.', ['The cake ate the dog.', 'The dog was eating the cake.', 'The cake was eating by the dog.'], 'In the active voice, the one doing the action (the dog) comes first.'],
        ['Which sentence uses the subjunctive?', 'If I were the manager, I would pick George.', ['If I was the manager, I would pick George.', 'I am the manager, so I pick George.', 'When I am the manager, I pick George.'], 'The subjunctive is used for wishes and "what if" situations: "If I were...", not "If I was...".'],
        ['Which verb completes the sentence? "Yesterday, the team ___ really well."', 'played', ['plays', 'play', 'playing'], '"Yesterday" means it happened in the past, so use the simple past: "played".'],
        ['Which modal verb shows that something is certain?', 'will', ['might', 'could', 'may'], '"Will" shows certainty. "Might", "could" and "may" show that something is only possible.'],
        ['Which sentence is in the present progressive?', 'Dad is cooking sarmale.', ['Dad cooked sarmale.', 'Dad has cooked sarmale.', 'Dad cooks sarmale.'], 'The present progressive uses "am", "is" or "are" plus an -ing verb: "is cooking".'],
        ['What is the past tense of "catch"?', 'caught', ['catched', 'catching', 'cought'], '"Catch" is an irregular verb. Its past tense is "caught".'],
        ['Which sentence is in the future tense?', 'Forest will play Arsenal next week.', ['Forest played Arsenal last week.', 'Forest are playing Arsenal now.', 'Forest have played Arsenal.'], '"Will" plus a verb talks about the future: "will play".'],
        ['Which verb form completes the sentence? "By the time we arrived, the match ___."', 'had started', ['has started', 'starts', 'is starting'], 'The past perfect ("had" + past participle) shows something happened before another past event.'],
        ['Which sentence uses "were" correctly?', 'You were brilliant today.', ['You was brilliant today.', 'He were brilliant today.', 'I were brilliant today.'], 'Use "were" with you, we and they. Use "was" with I, he, she and it.'],
      ],
    },
    {
      id: 'spelling', name: 'Spelling', emoji: '✍️',
      qs: [
        ['Which word is spelt correctly?', 'necessary', ['neccessary', 'necesary', 'neccesary'], 'One collar, two sleeves: one c, two s\'s. ne-c-e-ss-ary.'],
        ['Which word is spelt correctly?', 'accommodate', ['accomodate', 'acommodate', 'acomodate'], 'Double c and double m: a-cc-o-mm-odate.'],
        ['Which word is spelt correctly?', 'rhythm', ['rythm', 'rhythem', 'rhythum'], 'Rhythm Helps Your Two Hips Move: r-h-y-t-h-m.'],
        ['Which word is spelt correctly?', 'definitely', ['definately', 'definitly', 'defanitely'], 'It has "finite" inside it: de-finite-ly.'],
        ['Which word is spelt correctly?', 'separate', ['seperate', 'separete', 'seprate'], 'There\'s "a rat" in sep-a-rat-e.'],
        ['Which word is spelt correctly?', 'government', ['goverment', 'govenment', 'governmant'], 'The people who govern: govern + ment.'],
        ['Which word is spelt correctly?', 'environment', ['enviroment', 'envirnment', 'enviornment'], 'Don\'t forget the n in the middle: environ + ment.'],
        ['Which word is spelt correctly?', 'yacht', ['yaught', 'yot', 'yatch'], '"Yacht" is a tricky Year 5/6 word: y-a-c-h-t.'],
        ['Which word is spelt correctly?', 'occur', ['ocurr', 'occurr', 'ocur'], 'Double c, single r: o-cc-u-r (but "occurred" doubles the r).'],
        ['Which word is spelt correctly?', 'embarrass', ['embarass', 'embarras', 'emberrass'], 'Double r and double s: em-ba-rr-a-ss.'],
        ['Which word completes the sentence? "The ___ on the pitch was awful."', 'weather', ['whether', 'wether', 'weathar'], '"Weather" is rain and sun. "Whether" is like "if".'],
        ['Which word completes the sentence? "I need to ___ for my SATs."', 'practise', ['practice', 'practese', 'practis'], 'In British English, practise (with s) is the verb and practice (with c) is the noun, like advise and advice.'],
        ['Which word completes the sentence? "Can you give me some ___?"', 'advice', ['advise', 'advize', 'adwice'], '"Advice" (with c) is the noun, a thing you give. "Advise" is the verb.'],
        ['Which word completes the sentence? "We ___ the match yesterday."', 'lost', ['loosed', 'lossed', 'losted'], '"Lost" is the past tense of "lose". "Loose" means not tight.'],
        ['Which word is spelt correctly?', 'mischievous', ['mischievious', 'mischevious', 'mischivous'], 'There\'s no extra "i": mis-chie-vous (three syllables).'],
        ['Which word is spelt correctly?', 'restaurant', ['restaraunt', 'resturant', 'restarant'], 'Say it slowly: rest-au-rant.'],
        ['Which word completes the sentence? "The ___ were cheering loudly."', 'fans', ['fan\'s', 'fans\'', 'fanns'], 'This is just a plural, more than one fan. No apostrophe, because nothing belongs to them.'],
        ['Which word is spelt correctly?', 'conscience', ['concience', 'consience', 'conscence'], 'It has "science" inside it: con-science.'],
      ],
    },
    {
      id: 'words', name: 'Prefixes, suffixes & word meanings', emoji: '🔠',
      qs: [
        ['Which prefix makes the opposite of "possible"?', 'im', ['un', 'dis', 'in'], '"Impossible". Words starting with p or m often take "im": impatient, immature.'],
        ['Which prefix makes the opposite of "appear"?', 'dis', ['un', 'im', 'mis'], '"Disappear". "Dis" means the opposite or not.'],
        ['Which prefix makes the opposite of "legal"?', 'il', ['un', 'im', 'ir'], '"Illegal". Words starting with l often take "il": illegible, illogical.'],
        ['Which prefix makes the opposite of "responsible"?', 'ir', ['un', 'im', 'dis'], '"Irresponsible". Words starting with r often take "ir": irregular, irrelevant.'],
        ['Which suffix turns "enjoy" into a noun?', 'ment', ['ly', 'ful', 'ous'], '"Enjoyment" is a noun. "-ment", "-ness" and "-tion" often make nouns.'],
        ['Which suffix turns "danger" into an adjective?', 'ous', ['ment', 'ly', 'ness'], '"Dangerous" is an adjective. "-ous", "-ful" and "-less" often make adjectives.'],
        ['What does the prefix "sub" mean in "submarine" and "subway"?', 'under', ['above', 'again', 'not'], '"Sub" means under: a submarine goes under the sea.'],
        ['What does the prefix "re" mean in "replay" and "rewrite"?', 'again', ['before', 'not', 'wrongly'], '"Re" means again: replay means play again.'],
        ['Which word is a synonym for "enormous"?', 'huge', ['tiny', 'quick', 'loud'], 'A synonym means the same (or nearly the same). Enormous and huge both mean very big.'],
        ['Which word is an antonym for "generous"?', 'selfish', ['kind', 'giving', 'friendly'], 'An antonym means the opposite. Generous means happy to give; selfish is the opposite.'],
        ['Which word is a synonym for "furious"?', 'angry', ['happy', 'calm', 'tired'], 'Furious means very angry.'],
        ['Which word belongs to the same word family as "sign"?', 'signature', ['sing', 'sigh', 'sight'], '"Signature" comes from "sign". That\'s also why "sign" has a silent g.'],
        ['What does the prefix "auto" mean in "autograph" and "autobiography"?', 'self', ['car', 'many', 'far'], '"Auto" means self: an autobiography is a story about yourself, written by yourself.'],
        ['Which word is an antonym for "ancient"?', 'modern', ['old', 'historic', 'antique'], 'Ancient means very old. Modern means new or of today.'],
        ['What does the prefix "mis" mean in "misbehave" and "misspell"?', 'wrongly', ['again', 'under', 'before'], '"Mis" means badly or wrongly: misspell means spell wrongly.'],
      ],
    },
  ];

  /* ---------------- Reading: short passages ---------------- */
  const READING = [
    {
      id: 'reading-keeper', title: 'The Last-Minute Save',
      text: 'The rain had been falling since kick-off, turning the goalmouth into a sticky brown swamp. With a minute left, Ellie\'s team were clinging on to a one-goal lead. She crouched on her line, gloves dripping, eyes fixed on the striker racing towards her. Everyone in the crowd seemed to hold their breath at once. The striker shot low and hard. Ellie flung herself to the left, and somehow, the tips of her fingers pushed the ball round the post. For a moment there was silence, and then her whole team came sprinting towards her, cheering so loudly that she could not even hear the final whistle.',
      qs: [
        ['How long had it been raining?', 'Since the start of the match', ['For a minute', 'Since the night before', 'Only in the second half'], '"The rain had been falling since kick-off": kick-off is the start of the match.'],
        ['What does "clinging on" suggest about the team?', 'They were only just keeping their lead', ['They were winning easily', 'They were holding on to the goalposts', 'They had given up'], '"Clinging on" means holding on with difficulty, so the lead was in danger.'],
        ['Why does the writer say the crowd "seemed to hold their breath"?', 'To show everyone was tense and waiting', ['Because it was cold', 'Because the crowd was underwater', 'To show the crowd was bored'], 'Holding your breath is what people do when they are nervous and waiting to see what happens.'],
        ['Which word is closest in meaning to "flung" in "Ellie flung herself to the left"?', 'threw', ['walked', 'turned', 'lowered'], '"Flung" means threw quickly and with force.'],
        ['Why could Ellie not hear the final whistle?', 'Her team-mates were cheering too loudly', ['The referee forgot to blow it', 'She had water in her ears', 'The crowd had gone home'], 'The last sentence says her team cheered "so loudly that she could not even hear the final whistle".'],
      ],
    },
    {
      id: 'reading-danube', title: 'The River Danube',
      text: 'The Danube is the second-longest river in Europe, after the Volga. It begins in the Black Forest in Germany and flows for about 2,850 kilometres, passing through or along the borders of ten countries, more than any other river in the world. Four capital cities stand on its banks: Vienna, Bratislava, Budapest and Belgrade. At the end of its journey, the Danube spreads out into a huge delta in Romania before it reaches the Black Sea. The delta is a maze of channels, lakes and reed beds, and it is home to more than 300 kinds of birds, including pelicans. Because it is so important for wildlife, the delta is protected, and visitors must follow strict rules.',
      qs: [
        ['Which river in Europe is longer than the Danube?', 'The Volga', ['The Thames', 'The Rhine', 'The Black Sea'], 'The first sentence: "the second-longest river in Europe, after the Volga".'],
        ['Where does the Danube begin?', 'In the Black Forest in Germany', ['In the Black Sea', 'In Romania', 'In Vienna'], '"It begins in the Black Forest in Germany."'],
        ['What makes the Danube special compared to every other river?', 'It flows through or along more countries', ['It is the longest river', 'It has no fish', 'It flows into two seas'], '"...ten countries, more than any other river in the world."'],
        ['What is a "delta", from the way it is described?', 'An area where a river spreads out into many channels', ['A type of bird', 'A capital city', 'A mountain'], 'The text says the river "spreads out into a huge delta" and describes it as "a maze of channels, lakes and reed beds".'],
        ['Why do visitors have to follow strict rules in the delta?', 'To protect the wildlife', ['Because it is dangerous to swim', 'Because it is in a capital city', 'To stop people getting lost'], '"Because it is so important for wildlife, the delta is protected."'],
      ],
    },
    {
      id: 'reading-inventor', title: 'A Happy Accident',
      text: 'In 1928, the Scottish scientist Alexander Fleming returned from a holiday to find his laboratory in a mess. He had left dishes of bacteria on his workbench, and one of them had grown a fuzzy blue-green mould. Most people would simply have thrown it away. Fleming, however, looked more closely. Around the mould, there was a clear ring where the bacteria had died. Curious, he tested the mould and discovered that it produced a substance that could kill many kinds of harmful bacteria. He called it penicillin. It took other scientists more than ten years to work out how to make enough of it to use as medicine, but since then, penicillin has saved millions of lives.',
      qs: [
        ['When did Fleming make his discovery?', '1928', ['1828', 'Ten years later', 'While on holiday'], 'The first words are "In 1928".'],
        ['What word does the writer use to describe the look of the mould?', 'fuzzy', ['clear', 'harmful', 'curious'], '"...a fuzzy blue-green mould".'],
        ['What does "however" tell you about Fleming?', 'He did something different from most people', ['He was on holiday', 'He threw the mould away', 'He did not like mould'], '"Most people would simply have thrown it away. Fleming, however, looked more closely." "However" shows a contrast.'],
        ['What made Fleming curious?', 'A clear ring around the mould where bacteria had died', ['His messy laboratory', 'The colour of the dish', 'A letter from another scientist'], 'He noticed "a clear ring where the bacteria had died" and then tested the mould.'],
        ['Why is the discovery called a "happy accident"?', 'Fleming did not plan it, but it turned out to be very useful', ['Fleming was happy on holiday', 'The mould made people laugh', 'It happened on his birthday'], 'The mould grew by chance while he was away, but it led to a medicine that saved millions of lives.'],
      ],
    },
    {
      id: 'reading-dog', title: 'Biscuit',
      text: 'Biscuit was not the smartest dog on our street. He chased his own tail, barked at the washing machine and once got his head stuck in a box of cornflakes. But when my little sister fell off her bike at the bottom of the hill, it was Biscuit who reached her first. He did not bark or jump. Instead, he lay down beside her, rested his golden head on her knee and waited, perfectly still, until Mum came running. After that day, nobody on our street ever called him silly again. Well, not out loud.',
      qs: [
        ['Which of these is NOT something silly that Biscuit did?', 'He fell off a bike', ['He chased his own tail', 'He barked at the washing machine', 'He got his head stuck in a cereal box'], 'The sister fell off the bike, not Biscuit. The other three are listed in the second sentence.'],
        ['What does the word "But" at the start of the third sentence show?', 'The story is about to show a different side of Biscuit', ['Biscuit is about to do something silly', 'The story is ending', 'Biscuit is going home'], '"But" shows a contrast: after all the silly things, Biscuit does something sensible and kind.'],
        ['How did Biscuit help the sister?', 'He lay beside her and stayed with her until Mum came', ['He barked for help', 'He ran home to get Mum', 'He fixed the bike'], '"He did not bark or jump. Instead, he lay down beside her... and waited."'],
        ['What kind of dog is Biscuit most likely to be, from the clues?', 'A calm, caring dog with golden fur', ['A fierce guard dog', 'A tiny dog with black fur', 'A dog who ignores people'], 'His "golden head" gives his colour, and waiting "perfectly still" by the sister shows he is caring.'],
        ['What does "Well, not out loud" suggest?', 'People still thought he was a bit silly sometimes', ['People shouted at Biscuit', 'Biscuit could talk', 'The street was very quiet'], 'It is a joke: people stopped saying he was silly, but they might still have thought it!'],
      ],
    },
  ];

  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const make = (topic, [q, a, w, explain], passage) => ({ topic, q, a, type: 'choice', options: shuffle([a].concat(w.slice(0, 3))), explain, passage: passage || null });

  window.SATS_ENGLISH = {
    gps: GPS.map(({ id, name, emoji, qs }) => ({ id, name, emoji, count: qs.length })),
    reading: READING.map(({ id, title, qs }) => ({ id, name: title, emoji: '📖', count: qs.length })),
    // All the questions for a topic, in a random order.
    questions(topicId) {
      const g = GPS.find((t) => t.id === topicId);
      if (g) return shuffle(g.qs).map((x) => make(topicId, x));
      const r = READING.find((t) => t.id === topicId);
      if (r) return r.qs.map((x) => make(topicId, x, { title: r.title, text: r.text }));
      return [];
    },
    _gps: GPS,
    _reading: READING,
  };
})();
