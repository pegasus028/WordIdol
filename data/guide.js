/* WordIdol guide content (W3). Global: GUIDE.
   Plain data only: runs unchanged in the browser, in Node (vm) and in Apps Script V8.
   Fact source: wi-work/src/SOURCES.md only. Every entry carries src.
   src codes: RN§n = research notes section; VID-x = "Plan Your Slang Promotion" video and plan template
   (SAFE, WHO, WHY, WHAT, ONLINE, EVID, BRAIN, PLAN, SUBMIT); KIT-01 = Lab Book weekly entry;
   Ln = lesson n (content_lessons.py); RDG-09 = glossary and sentence frames; SPEC§n = SPEC.md.
   Text uses curly apostrophes and curly quotation marks; posReasons keeps the exact SPEC §3.3 characters. */
(function () {
  var root = (typeof window !== "undefined") ? window : globalThis;
  var ALL = ["W01", "W02", "W03", "W04", "W05", "W06", "W07", "W08", "W09", "W10", "W11", "W12", "W13"];
  var SIGHT = ["W02", "W03", "W04", "W05", "W06", "W07", "W08", "W09", "W10", "W11", "W12"];
  var TO12 = ["W01", "W02", "W03", "W04", "W05", "W06", "W07", "W08", "W09", "W10", "W11", "W12"];

  var GUIDE = {};

  /* ------------------------------------------------------------------ stages (7) */
  GUIDE.stages = [
    { stageId: "s1", name: "Audition", tagline: "Show us your word.",
      now: [
        "Write your word, its meaning and one example sentence.",
        "Check the part of speech and write your rules for using the word.",
        "Finish your word card: how it was formed, its purpose and two more examples.",
        "Record your zero-baseline check and send your word for approval.",
        "Score your word on FUDGE, then write your research question and hypotheses."
      ],
      doneWhen: "Your word card is complete and your word has gone to T.Chris for approval.",
      src: "SPEC§4.2; RN§7.1; RN§7.2-P0" },
    { stageId: "s2", name: "Debut plan", tagline: "Plan before you perform.",
      now: [
        "Choose one small home group that will hear your word first.",
        "Decide why they need your word and what they will hear or see.",
        "Read and tick the six rules.",
        "Write at least three actions. At least one must be in person.",
        "Build your Baseline report from what you have saved."
      ],
      doneWhen: "The six rules are ticked and your plan has at least three actions.",
      src: "SPEC§4.2; VID-WHO; VID-WHY; VID-WHAT; VID-PLAN" },
    { stageId: "s3", name: "Fan club", tagline: "Start with your home crowd.",
      now: [
        "Use your word out loud at school, with people you know.",
        "Do not explain it unless someone asks.",
        "Keep it for breaks, lunch and after school. Never during lessons.",
        "Log what happened tonight, even if nothing happened.",
        "Write one Lab Book reflection this week."
      ],
      doneWhen: "You have logged three actions and done one weekly review.",
      src: "SPEC§4.2; SPEC§10.2; RN§7.2-P1; VID-PLAN" },
    { stageId: "s4", name: "On tour", tagline: "Take your word to a new crowd.",
      now: [
        "Find one bridge person: a friend who belongs to your group and to another group.",
        "Use the word about a new topic and in a new kind of sentence.",
        "Online is your choice, and only after the six rules and the L9 safety briefing.",
        "Give every sighting an Evidence Level.",
        "Analyse one action that failed or changed."
      ],
      doneWhen: "Every sighting has a level and you have analysed one failed or changed action.",
      src: "SPEC§4.2; RN§7.2-P2; RN§7.2-P3" },
    { stageId: "s5", name: "Charts", tagline: "Read the numbers honestly.",
      now: [
        "Read your wave card: your word, the control words and the foil words.",
        "Look at corrected recognition, not only recognition.",
        "Write what the result tells you, and what it does not tell you.",
        "From Wave 2, check each hypothesis: supported, not supported, or too early to say."
      ],
      doneWhen: "Each published wave has your note and, from Wave 2, your hypothesis checks.",
      src: "SPEC§4.2; SPEC§13.4; RN§7.3" },
    { stageId: "s6", name: "Summit stage", tagline: "Seven minutes to tell your research story.",
      now: [
        "Fill in the six parts of your talk outline.",
        "Write your analysis-over-adoption statement.",
        "Choose your charts and write your 50-word abstract.",
        "Prepare five answers and rehearse twice with the timer.",
        "After your talk, note the questions and the feedback."
      ],
      doneWhen: "Your Summit Pack is ready, your talk is done and your feedback is in the Lab Book.",
      src: "SPEC§4.2; SPEC§11" },
    { stageId: "s7", name: "Encore", tagline: "Change one thing and try again.",
      now: [
        "Fill in your Pivot card: what to keep, stop and start.",
        "Change one thing only, and write a phase 2 hypothesis.",
        "Run phase 2 until Fri 15 Jan. Then stop pushing and watch what stays.",
        "Use Waves 3 and 4 to compare your word with the control words.",
        "Plan, draft and revise your research article."
      ],
      doneWhen: "Your Final report, your research article and your final reflection are finished.",
      src: "SPEC§4.2; SPEC§4.3; RN§7.2-P4; L15" }
  ];

  /* ------------------------------------------------------------------ brainstorm (>= 8 per stage) */
  GUIDE.brainstorm = [
    /* s1 Audition: the word itself */
    { id: "bs-s1-01", stageId: "s1", prompt: "Say your word five times fast. Is it still easy to say?", src: "RN§7.1-R1" },
    { id: "bs-s1-02", stageId: "s1", prompt: "Could three classmates read your word aloud the same way, with no help?", src: "RN§7.1-R2" },
    { id: "bs-s1-03", stageId: "s1", prompt: "How was your word made: blending, clipping, a new meaning for an old word, or something else?", src: "RN§7.1-R3" },
    { id: "bs-s1-04", stageId: "s1", prompt: "Finish this sentence: “We need a word for when ...”", src: "RN§7.1-R4" },
    { id: "bs-s1-05", stageId: "s1", prompt: "When did you last need a word for this and not have one?", src: "RN§7.1-R4; SPEC§10.2" },
    { id: "bs-s1-06", stageId: "s1", prompt: "If a classmate heard your word once, could she guess the meaning from the sentence?", src: "VID-BRAIN; RN§7.1-R5" },
    { id: "bs-s1-07", stageId: "s1", prompt: "Can you write three sentences with your word as three different parts of speech?", src: "RN§7.1-R6" },
    { id: "bs-s1-08", stageId: "s1", prompt: "Which three topics could your word fit: school, food, friends, exams?", src: "RN§7.1-R7" },
    { id: "bs-s1-09", stageId: "s1", prompt: "Which new forms could people build from your word, with -er, -ed, -ing or -y?", src: "RN§7.1-R8; VID-WHAT" },
    { id: "bs-s1-10", stageId: "s1", prompt: "Does another word already do this job? What does your word add?", src: "RN§7.4" },
    { id: "bs-s1-11", stageId: "s1", prompt: "Does your word name a daily need, or is it mostly fun to say?", src: "RN§0-4; VID-WHY" },

    /* s2 Debut plan: who, why, what, carrier, trigger */
    { id: "bs-s2-01", stageId: "s2", prompt: "Who would use your word without you?", src: "VID-BRAIN" },
    { id: "bs-s2-02", stageId: "s2", prompt: "Who would never use your word? What does that tell you about your crowd?", src: "VID-BRAIN" },
    { id: "bs-s2-03", stageId: "s2", prompt: "Which small home group will hear your word first? Why that group?", src: "VID-WHO" },
    { id: "bs-s2-04", stageId: "s2", prompt: "What happens often at school that could remind people to use your word?", src: "VID-WHY" },
    { id: "bs-s2-05", stageId: "s2", prompt: "What will people copy with the word: a fixed sentence, a gesture, an emoji, or a short call and answer?", src: "VID-BRAIN" },
    { id: "bs-s2-06", stageId: "s2", prompt: "Is your word useful, fun to say, or both? Which matters more to your crowd?", src: "VID-WHY" },
    { id: "bs-s2-07", stageId: "s2", prompt: "What could make people stop using your word?", src: "VID-BRAIN" },
    { id: "bs-s2-08", stageId: "s2", prompt: "Could a friend copy your carrier in three seconds?", src: "RN§7.2-P0" },
    { id: "bs-s2-09", stageId: "s2", prompt: "For each action, can you say where, what, why, when and how you will record it?", src: "VID-PLAN" },
    { id: "bs-s2-10", stageId: "s2", prompt: "Will you try your family as a planned spread test? Who, and when?", src: "VID-WHO" },

    /* s3 Fan club: launch in the home group */
    { id: "bs-s3-01", stageId: "s3", prompt: "Who in your class would enjoy saying this word? Why her?", src: "RN§6-Crowd; SPEC§10.2" },
    { id: "bs-s3-02", stageId: "s3", prompt: "Where will your friends hear the word from you more than once this week?", src: "RN§7.2-P1" },
    { id: "bs-s3-03", stageId: "s3", prompt: "Which moment tomorrow fits your word best: before school, at break, at lunch or after school?", src: "RN§7.2-P0" },
    { id: "bs-s3-04", stageId: "s3", prompt: "How will you use the word without saying that it is new?", src: "RN§7.2-P1" },
    { id: "bs-s3-05", stageId: "s3", prompt: "If someone asks what it means, what short answer will you give?", src: "RN§7.2-P1; SPEC§10.2" },
    { id: "bs-s3-06", stageId: "s3", prompt: "Which friends do you see most days? They can hear the word many times.", src: "RN§6-Crowd" },
    { id: "bs-s3-07", stageId: "s3", prompt: "Which club or team that you already belong to could be your home group?", src: "VID-PLAN" },
    { id: "bs-s3-08", stageId: "s3", prompt: "Did anyone repeat the word, or only your sentence or gesture?", src: "RN§7.3" },
    { id: "bs-s3-09", stageId: "s3", prompt: "What will you write in your Lab Book tonight if nothing happens?", src: "RN§7.2-P1" },

    /* s4 On tour: bridges, new contexts, online by choice */
    { id: "bs-s4-01", stageId: "s4", prompt: "Which classmates belong to several groups: sport, music, student council, another year group?", src: "RN§7.2-P2" },
    { id: "bs-s4-02", stageId: "s4", prompt: "Who is a peer that others like to copy?", src: "RN§7.2-P2" },
    { id: "bs-s4-03", stageId: "s4", prompt: "Which new topic could your word move into this week?", src: "RN§7.2-P2; RN§7.1-R7" },
    { id: "bs-s4-04", stageId: "s4", prompt: "Which new kind of sentence could you try: a question, a reaction or a description?", src: "RN§7.2-P2; RN§7.1-R6" },
    { id: "bs-s4-05", stageId: "s4", prompt: "Which apps do five people you know from your target group open every day? Ask them.", src: "VID-ONLINE" },
    { id: "bs-s4-06", stageId: "s4", prompt: "Which format fits the app your crowd already uses?", src: "VID-ONLINE" },
    { id: "bs-s4-07", stageId: "s4", prompt: "Has anyone made a new form of your word? What was it?", src: "RN§7.3" },
    { id: "bs-s4-08", stageId: "s4", prompt: "How many different friend groups have used your word so far?", src: "RN§7.3" },
    { id: "bs-s4-09", stageId: "s4", prompt: "Which one bridge person could carry your word further than ten repeats in your own group?", src: "RN§7.2-P2" },

    /* s5 Charts: reading wave results */
    { id: "bs-s5-01", stageId: "s5", prompt: "What did you predict for this wave? What happened?", src: "L6; SPEC§13.4" },
    { id: "bs-s5-02", stageId: "s5", prompt: "How does your word compare with the control words?", src: "RN§7.3; RDG-09§5" },
    { id: "bs-s5-03", stageId: "s5", prompt: "How many people said they knew the foil words? What does that mean for your number?", src: "L6; RDG-09" },
    { id: "bs-s5-04", stageId: "s5", prompt: "Is recognition different from comprehension for your word? Why might that be?", src: "RDG-09§5; SPEC§13.4" },
    { id: "bs-s5-05", stageId: "s5", prompt: "What does this result not tell you?", src: "SPEC§13.4" },
    { id: "bs-s5-06", stageId: "s5", prompt: "Which hypothesis can you check now? Which one is too early to say?", src: "L6; SPEC§13.4" },
    { id: "bs-s5-07", stageId: "s5", prompt: "How many topics and parts of speech appear in your sightings?", src: "RN§7.3" },
    { id: "bs-s5-08", stageId: "s5", prompt: "Is your evidence mostly owned or mostly earned? What would you need to see next?", src: "L6; RN§7.3" },
    { id: "bs-s5-09", stageId: "s5", prompt: "With this number of respondents, how sure can you be?", src: "RDG-09§3" },

    /* s6 Summit stage: the talk */
    { id: "bs-s6-01", stageId: "s6", prompt: "Which sentence from a sighting, or from your own example, would make a good hook?", src: "SPEC§11.1" },
    { id: "bs-s6-02", stageId: "s6", prompt: "Which theory idea explains your campaign best?", src: "SPEC§11.1; L8; L10" },
    { id: "bs-s6-03", stageId: "s6", prompt: "What is your strongest evidence, and which Evidence Level is it?", src: "SPEC§11.2" },
    { id: "bs-s6-04", stageId: "s6", prompt: "What do you not have evidence for yet?", src: "SPEC§11.2" },
    { id: "bs-s6-05", stageId: "s6", prompt: "What did not work, and what did you learn from it?", src: "SPEC§11.1; SPEC§1.1" },
    { id: "bs-s6-06", stageId: "s6", prompt: "Which question would be hardest for you to answer? Prepare that answer first.", src: "SPEC§11.5" },
    { id: "bs-s6-07", stageId: "s6", prompt: "What one thing would you change in phase 2, and why?", src: "SPEC§11.1" },
    { id: "bs-s6-08", stageId: "s6", prompt: "Which chart shows your result most clearly?", src: "SPEC§11.3" },
    { id: "bs-s6-09", stageId: "s6", prompt: "Did people copy the word or the carrier? How can you show that?", src: "RN§7.3" },

    /* s7 Encore: pivot, decay, article */
    { id: "bs-s7-01", stageId: "s7", prompt: "What will you keep, stop and start in phase 2?", src: "SPEC§5.8; L15" },
    { id: "bs-s7-02", stageId: "s7", prompt: "Which one thing will you change? Why only one?", src: "L15" },
    { id: "bs-s7-03", stageId: "s7", prompt: "What do you expect to happen after that change?", src: "L15" },
    { id: "bs-s7-04", stageId: "s7", prompt: "Is it time to stop pushing? Do people seem to hear your word too often?", src: "RN§7.2-P4" },
    { id: "bs-s7-05", stageId: "s7", prompt: "Does Wave 4 show that your word lasts? Compare it with the control words.", src: "RN§7.2-P4" },
    { id: "bs-s7-06", stageId: "s7", prompt: "How did phase 1 and phase 2 differ in users, topics and new forms?", src: "RN§7.3" },
    { id: "bs-s7-07", stageId: "s7", prompt: "Which limitation of your study must a reader know?", src: "L16-L26" },
    { id: "bs-s7-08", stageId: "s7", prompt: "Which claims need careful words because your numbers are small?", src: "L16-L26; RDG-09§3" },
    { id: "bs-s7-09", stageId: "s7", prompt: "Looking back, did your word name a lasting need, or was it mostly fun? What is your evidence?", src: "RN§0-4" }
  ];

  /* ------------------------------------------------------------------ idea banks */
  GUIDE.banks = {};

  /* carriers: things that carry a word (>= 12) */
  GUIDE.banks.carriers = [
    { id: "car-01", text: "One fixed sentence that always carries the word", mode: "either", ideaIds: ["id_speak", "id_chats"], src: "RN§7.2-P0" },
    { id: "car-02", text: "A small gesture that goes with the word", mode: "inperson", ideaIds: ["id_speak"], src: "RN§7.2-P0" },
    { id: "car-03", text: "One emoji that you always pair with the word", mode: "online", ideaIds: ["id_chats", "id_replies"], src: "RN§7.2-P0" },
    { id: "car-04", text: "A short call and answer between friends, outside lessons", mode: "inperson", ideaIds: ["id_speak", "id_clubs"], src: "RN§7.2-P0" },
    { id: "car-05", text: "A running joke at lunch", mode: "inperson", ideaIds: ["id_speak"], src: "SPEC§10.2; RN§7.2-P0" },
    { id: "car-06", text: "A caption on a picture, with no faces, in a private group chat with friends you know", mode: "online", ideaIds: ["id_chats", "id_memes"], src: "SPEC§10.2; VID-SAFE" },
    { id: "car-07", text: "A meme picture with the word in the caption, and no faces", mode: "either", ideaIds: ["id_memes"], src: "VID-BRAIN" },
    { id: "car-08", text: "Four lines of a song or poem that carry the word", mode: "either", ideaIds: ["id_song", "id_poem"], src: "RN§5-2; SPEC§5.6" },
    { id: "car-09", text: "One way of saying the word that people enjoy copying", mode: "inperson", ideaIds: ["id_speak", "id_song"], src: "RN§7.2-P3" },
    { id: "car-10", text: "A daily routine: the same moment each school day, outside lessons, when you say it", mode: "inperson", ideaIds: ["id_speak"], src: "RN§7.2-P0" },
    { id: "car-11", text: "A template sentence with a gap that friends can fill in their own way", mode: "either", ideaIds: ["id_speak", "id_memes", "id_chats"], src: "RN§7.2-P0; RN§5-2" },
    { id: "car-12", text: "A T-shirt design for yourself with the word on it", mode: "inperson", ideaIds: ["id_tshirt"], src: "SPEC§5.6" },
    { id: "car-13", text: "A hashtag that you use only on your own private project posts", mode: "online", ideaIds: ["id_hashtags", "id_tiktok", "id_instagram"], src: "RN§6-STEPPS; VID-SAFE" },
    { id: "car-14", text: "Your word as your character name in a game you already play. No messages to players you do not know", mode: "online", ideaIds: ["id_gamename"], src: "SPEC§5.6" },
    { id: "car-15", text: "A team or club habit: the word your group says when things go wrong", mode: "inperson", ideaIds: ["id_clubs", "id_speak"], src: "VID-PLAN" }
  ];

  /* triggers: moments that call for the word (>= 12). It is the dry season: no rain triggers. */
  GUIDE.banks.triggers = [
    { id: "trg-01", text: "The moment the bell rings for break", mode: "inperson", src: "SPEC§10.2; RN§7.2-P0" },
    { id: "trg-02", text: "Waiting in the lunch queue", mode: "inperson", src: "RN§7.2-P0" },
    { id: "trg-03", text: "A homework deadline that is very close", mode: "either", src: "RN§7.2-P0" },
    { id: "trg-04", text: "A crowded BTS train on the way home", mode: "inperson", src: "RN§7.2-P0" },
    { id: "trg-05", text: "Talking about exam stress with friends at break", mode: "inperson", src: "RN§7.2-P0" },
    { id: "trg-06", text: "When someone’s plan fails in a funny way", mode: "either", src: "SPEC§10.2; VID-WHAT" },
    { id: "trg-07", text: "When a phone battery dies at the worst moment", mode: "either", src: "VID-WHAT" },
    { id: "trg-08", text: "When friends compare test results after school", mode: "either", src: "RN§7.2-P0; L8-STEPPS" },
    { id: "trg-09", text: "Training or club practice after school", mode: "inperson", src: "VID-PLAN" },
    { id: "trg-10", text: "Arriving at school in the morning, before the first lesson", mode: "inperson", src: "VID-WHY; L8-STEPPS" },
    { id: "trg-11", text: "The walk between classrooms", mode: "inperson", src: "VID-WHY; L8-STEPPS" },
    { id: "trg-12", text: "When the canteen runs out of your favourite food", mode: "inperson", src: "VID-WHY; RN§7.1-R7" },
    { id: "trg-13", text: "When a friend shares news in your private group chat", mode: "online", src: "VID-WHY; L8-STEPPS" },
    { id: "trg-14", text: "When the group chat suddenly goes quiet", mode: "online", src: "VID-WHY; L8-STEPPS" }
  ];

  /* formats: what an action can look like (>= 12); wording of ideas follows the Form list (SPEC §5.6 table B) */
  GUIDE.banks.formats = [
    { id: "fmt-01", text: "Say it in normal talk with friends, and do not explain it", mode: "inperson", ideaIds: ["id_speak"], src: "RN§7.2-P1; VID-PLAN" },
    { id: "fmt-02", text: "A short meme video, with no faces, for friends on a private account", mode: "online", ideaIds: ["id_tiktok", "id_memes"], src: "VID-PLAN; VID-SAFE" },
    { id: "fmt-03", text: "A meme picture shared in a private group chat with friends you know", mode: "online", ideaIds: ["id_memes", "id_chats"], src: "VID-BRAIN; VID-SAFE" },
    { id: "fmt-04", text: "A paper meme that you show friends at break", mode: "inperson", ideaIds: ["id_memes"], src: "VID-BRAIN; RN§6-STEPPS" },
    { id: "fmt-05", text: "A four-line song or chant that you say to two friends at break", mode: "inperson", ideaIds: ["id_song"], src: "SPEC§5.6; RN§5-2" },
    { id: "fmt-06", text: "A short poem that uses the word in three different ways", mode: "either", ideaIds: ["id_poem"], src: "SPEC§5.6; RN§7.1-R6" },
    { id: "fmt-07", text: "One T-shirt for yourself, designed on paper first", mode: "inperson", ideaIds: ["id_tshirt"], src: "SPEC§5.6" },
    { id: "fmt-08", text: "A private Instagram post, with no faces, for friends you know", mode: "online", ideaIds: ["id_instagram"], src: "RN§7.2-P3; VID-SAFE" },
    { id: "fmt-09", text: "A reply under a post by someone you know, where the word fits naturally", mode: "online", ideaIds: ["id_replies"], src: "SPEC§5.6; VID-SAFE" },
    { id: "fmt-10", text: "A hashtag on your own private posts, after you have searched it first", mode: "online", ideaIds: ["id_hashtags"], src: "SPEC§5.6; RN§7.1-R9" },
    { id: "fmt-11", text: "A short documentary video about your project, with no faces, uniform, school name or location", mode: "either", ideaIds: ["id_documentary", "id_youtube"], src: "SPEC§5.6; VID-SAFE" },
    { id: "fmt-12", text: "A character name in a game you already play, with no messages to players you do not know", mode: "online", ideaIds: ["id_gamename"], src: "SPEC§5.6" },
    { id: "fmt-13", text: "The word used naturally in a club or fandom you already belong to, with people you know", mode: "either", ideaIds: ["id_clubs"], src: "SPEC§5.6; RN§7.2-P1" },
    { id: "fmt-14", text: "Ask a friend or family member to try the word. Asking is fine; gifts, swaps and deals are not", mode: "inperson", ideaIds: ["id_askfriends"], src: "SPEC§5.6; VID-SAFE" },
    { id: "fmt-15", text: "A private Facebook post for family and friends you know", mode: "online", ideaIds: ["id_facebook"], src: "RN§7.2-P3; VID-SAFE" },
    { id: "fmt-16", text: "Read Wiktionary’s rules first. It asks for three independent uses over at least a year", mode: "online", ideaIds: ["id_wiktionary"], src: "RDG-09; SPEC§5.6" }
  ];

  /* bridges: ways to reach another group through someone you know (>= 10) */
  GUIDE.banks.bridges = [
    { id: "brg-01", text: "A classmate who is also in a sports team", targetGroupIds: ["tg_school", "tg_5_16"], src: "RN§7.2-P2" },
    { id: "brg-02", text: "A classmate who is also in a music group", targetGroupIds: ["tg_school", "tg_5_16"], src: "RN§7.2-P2" },
    { id: "brg-03", text: "A friend on the student council", targetGroupIds: ["tg_school", "tg_5_16", "tg_17_19"], src: "RN§7.2-P2" },
    { id: "brg-04", text: "A friend with a sister in another year group", targetGroupIds: ["tg_school", "tg_5_16", "tg_17_19"], src: "RN§7.2-P2" },
    { id: "brg-05", text: "A peer that others like to copy", targetGroupIds: ["tg_school", "tg_5_16"], src: "RN§7.2-P2" },
    { id: "brg-06", text: "A friend in another class who eats lunch with your group", targetGroupIds: ["tg_school"], src: "RN§7.2-P2; RN§6-Crowd" },
    { id: "brg-07", text: "A cousin who could carry the word to her own friends", targetGroupIds: ["tg_family", "tg_17_19", "tg_20_30"], src: "VID-WHO; VID-EVID" },
    { id: "brg-08", text: "One family member: teach the word once, do not explain it again, check after seven days", targetGroupIds: ["tg_family", "tg_31_60", "tg_61"], src: "VID-WHO; SPEC§5.6" },
    { id: "brg-09", text: "An older family member who enjoys learning new words", targetGroupIds: ["tg_family", "tg_31_60", "tg_61"], src: "VID-WHO" },
    { id: "brg-10", text: "An online friend you also know in real life", targetGroupIds: ["tg_online"], src: "VID-SAFE; SPEC§5.6" },
    { id: "brg-11", text: "A friend from a club or fandom who also knows your school friends", targetGroupIds: ["tg_online", "tg_school"], src: "RN§7.2-P2; SPEC§5.6" },
    { id: "brg-12", text: "A friend or family member who already speaks English with foreigners", targetGroupIds: ["tg_foreign", "tg_thai"], src: "VID-WHO" },
    { id: "brg-13", text: "Start with one small group, then find one bridge person into the next group",
      targetGroupIds: ["tg_everyone", "tg_thai", "tg_foreign", "tg_female", "tg_male", "tg_20_30", "tg_31_60", "tg_61"], src: "VID-WHO; RN§7.2-P2" }
  ];

  /* ------------------------------------------------------------------ stuck (>= 5 per stage) */
  GUIDE.stuck = [
    { id: "stk-01", stageId: "s1", text: "No idea for a word? Note three things friends talk about that have no good English word.", src: "L3" },
    { id: "stk-02", stageId: "s1", text: "Is your word too long? Try clipping it to one or two syllables.", src: "RN§7.1-R1; RN§7.1-R3" },
    { id: "stk-03", stageId: "s1", text: "Not sure it is new? Search the exact spelling again and record what you find.", src: "RN§7.1-R9; L4" },
    { id: "stk-04", stageId: "s1", text: "Is the meaning hard to explain? Write one example sentence that makes it clear.", src: "RN§7.1-R5" },
    { id: "stk-05", stageId: "s1", text: "Does it only work as a noun? Try it as a verb or an adjective.", src: "RN§7.1-R6" },
    { id: "stk-06", stageId: "s1", text: "Does your word fail some spec sheet tests? That is allowed. Explain why in your Lab Book.", src: "SPEC§2.3; RN§7.1" },
    { id: "stk-07", stageId: "s1", text: "Try an ordinary English word with a new meaning. People can already say it and spell it.", src: "RN§7.1-routes; RN§0-8" },

    { id: "stk-08", stageId: "s2", text: "Too many ideas? Choose one small home group and plan only for them first.", src: "VID-WHO" },
    { id: "stk-09", stageId: "s2", text: "No trigger yet? List what happens every school day, then choose one moment.", src: "RN§7.2-P0" },
    { id: "stk-10", stageId: "s2", text: "No carrier yet? Start with one fixed sentence that people can copy.", src: "RN§7.2-P0" },
    { id: "stk-11", stageId: "s2", text: "Does the plan feel too big? Three actions are enough. Make one of them in person.", src: "VID-PLAN" },
    { id: "stk-12", stageId: "s2", text: "Not sure about going online? You can stay in person only. That is a complete plan.", src: "VID-PLAN" },
    { id: "stk-13", stageId: "s2", text: "Stuck on the Why column? Say why this action fits this group.", src: "VID-PLAN" },
    { id: "stk-14", stageId: "s2", text: "Does an idea mean contacting someone you do not know? Check with T.Chris first.", src: "VID-SUBMIT" },

    { id: "stk-15", stageId: "s3", text: "Nobody used it this week? That is data. Write a zero-result entry and guess one reason.", src: "SPEC§10.2; RN§7.2-P1" },
    { id: "stk-16", stageId: "s3", text: "Try the word in a different sentence shape: as a reaction, not a description.", src: "SPEC§10.2; RN§7.1-R6" },
    { id: "stk-17", stageId: "s3", text: "Feeling shy? Start with one close friend and one moment today.", src: "RN§7.2-P1" },
    { id: "stk-18", stageId: "s3", text: "Are you explaining the word a lot? Stop explaining. Just use it.", src: "RN§7.2-P1; RN§7.4" },
    { id: "stk-19", stageId: "s3", text: "Did friends laugh at it? Note exactly what they said. Reactions are evidence.", src: "VID-EVID" },
    { id: "stk-20", stageId: "s3", text: "Did you forget to log? Write it now: the date, the place and who heard it (“a classmate”, not a name).", src: "VID-EVID" },
    { id: "stk-21", stageId: "s3", text: "Are you the only user so far? That is normal at the start. Keep using it with your home group.", src: "RN§5-9; RN§7.2-P1" },

    { id: "stk-22", stageId: "s4", text: "Is it the same group every time? Find one bridge person into a new group.", src: "RN§7.2-P2" },
    { id: "stk-23", stageId: "s4", text: "Is your word stuck in one topic? Use it about food, exams or friends this week.", src: "RN§7.2-P2; RN§7.1-R7" },
    { id: "stk-24", stageId: "s4", text: "Unsure about going online? Stay in person. Online is your choice, not a requirement.", src: "VID-PLAN" },
    { id: "stk-25", stageId: "s4", text: "Did something go wrong? Tap “I had a problem” and read rule 4. It is not your fault.", src: "VID-SAFE; SPEC§14.2-P13" },
    { id: "stk-26", stageId: "s4", text: "Not sure which Evidence Level fits? Ask yourself who used the word, and whether you asked them to.", src: "L6; SPEC§10.6" },
    { id: "stk-27", stageId: "s4", text: "Do people copy your gesture but not the word? Record that. It is a real result.", src: "RN§7.3" },
    { id: "stk-28", stageId: "s4", text: "Did an action not go as planned? Log it as “Changed” and write why.", src: "SPEC§2.3; VID-SAFE" },

    { id: "stk-29", stageId: "s5", text: "Is your number low? A term that does not catch on, analysed well, can earn full marks.", src: "SPEC§1.1" },
    { id: "stk-30", stageId: "s5", text: "Is corrected recognition zero or below? Then we cannot tell real recognition from guessing. Say so.", src: "SPEC§13.4" },
    { id: "stk-31", stageId: "s5", text: "Not sure what to write? Compare your word with the control words.", src: "RN§7.3; RDG-09§5" },
    { id: "stk-32", stageId: "s5", text: "Is a hypothesis not supported? Say what the data shows and give one possible reason.", src: "L6; RDG-09§3" },
    { id: "stk-33", stageId: "s5", text: "Too early to say? Choose “Too early to say” and write what you need to see next.", src: "SPEC§13.4" },
    { id: "stk-34", stageId: "s5", text: "Does your number look high? Check the foil words before you explain it.", src: "L6; SPEC§13.4" },
    { id: "stk-35", stageId: "s5", text: "Is the sample small? Use careful words such as “suggest” and “might”.", src: "RDG-09§3" },

    { id: "stk-36", stageId: "s6", text: "Did the word not spread? Your talk is about what you learned, not how far it went.", src: "SPEC§1.1" },
    { id: "stk-37", stageId: "s6", text: "Nervous about questions? Prepare five answers and practise them aloud.", src: "SPEC§11.5; L12" },
    { id: "stk-38", stageId: "s6", text: "No strong evidence? Show the level you do have, and say what is missing.", src: "SPEC§11.2" },
    { id: "stk-39", stageId: "s6", text: "Stuck on the abstract? Write four parts: aim, method, main result and what it means.", src: "SPEC§11.4" },
    { id: "stk-40", stageId: "s6", text: "Over seven minutes? Rehearse with the timer and note which part runs long.", src: "SPEC§11.7; L12" },
    { id: "stk-41", stageId: "s6", text: "Asked a question you cannot answer? Say: “I don’t have data on that, but my guess is ...”", src: "RDG-09§7" },

    { id: "stk-42", stageId: "s7", text: "Do you want to change everything? Change one thing only, so you can see its effect.", src: "L15" },
    { id: "stk-43", stageId: "s7", text: "Tired of pushing? The last phase is to stop pushing and measure what stays.", src: "RN§7.2-P4" },
    { id: "stk-44", stageId: "s7", text: "Do people say the word is “cringe” now? That can happen when people hear it too often. Analyse it.", src: "RN§7.2-P4" },
    { id: "stk-45", stageId: "s7", text: "Did recognition fall in Wave 4? Compare it with the control words before you explain it.", src: "RN§7.2-P4; RN§7.3" },
    { id: "stk-46", stageId: "s7", text: "Does the article feel huge? Start with one note for each section.", src: "SPEC§5.8" },
    { id: "stk-47", stageId: "s7", text: "Is a claim too strong? Add a careful word and name one limitation.", src: "L16-L26; RDG-09§3" }
  ];

  /* ------------------------------------------------------------------ Lab Book prompts (>= 30)
     kind = Journal.kind. lab-01 to lab-07 cover the KIT-01 weekly entry
     (date is a form field; actions, sightings logged, numbers, what I noticed, theory link, next step).
     Optional extra field slot: "wentWell" | "toChange" marks prompts suited to the Sunday review boxes. */
  GUIDE.labPrompts = [
    { id: "lab-01", kind: "reflection", weekIds: ALL, text: "Full weekly entry: the date, your actions, sightings logged, numbers, what you noticed, one theory link and your next step.", src: "KIT-01; KIT-01-date" },
    { id: "lab-02", kind: "reflection", weekIds: ALL, text: "What did you do for your word this week? Say where, and with which group.", src: "KIT-01-actions" },
    { id: "lab-03", kind: "reflection", weekIds: SIGHT, text: "Which sightings did you log this week? Say who used the word (“a classmate”, “a cousin”) and whether you asked them to.", src: "KIT-01-sightings; VID-EVID" },
    { id: "lab-04", kind: "reflection", weekIds: ALL, text: "What are your numbers this week: actions, sightings, tallies or survey results? Zero is a number too.", src: "KIT-01-numbers" },
    { id: "lab-05", kind: "reflection", weekIds: ALL, text: "What did you notice this week? What surprised you, and why do you think it happened?", src: "KIT-01-noticed" },
    { id: "lab-06", kind: "theory_link", weekIds: ALL, text: "Which theory idea explains what happened this week? Name it and say why it fits.", src: "KIT-01-theory" },
    { id: "lab-07", kind: "reflection", weekIds: ALL, text: "What is your next step, and why? What do you expect to happen?", src: "KIT-01-next" },

    { id: "lab-08", kind: "reflection", weekIds: ["W01"], text: "Which communities do you belong to? Which one will hear your word first, and why?", src: "L1; VID-WHO" },
    { id: "lab-09", kind: "reflection", weekIds: ["W01", "W02"], text: "How did your launch go? What did you say, how did people react, and why do you think they reacted that way?", src: "L9; RN§7.2-P1" },
    { id: "lab-10", kind: "reflection", weekIds: ["W02"], text: "What does your Wave 1 result tell you? What does it not tell you?", src: "SPEC§13.4" },
    { id: "lab-11", kind: "theory_link", weekIds: ["W02", "W03"], text: "Which part of STEPPS is strongest in your campaign? Which part is missing?", src: "L8" },
    { id: "lab-12", kind: "theory_link", weekIds: ["W03", "W04"], text: "Who are your bridges and weak ties? Describe them (“a cousin”), not by name. How could the word reach a new group?", src: "L10; RN§7.2-P2" },
    { id: "lab-13", kind: "reflection", weekIds: ["W03", "W04", "W08", "W09"], text: "How many different friend groups, topics and parts of speech appear in your sightings?", src: "RN§7.3" },
    { id: "lab-14", kind: "reflection", weekIds: ["W03", "W04", "W05", "W08", "W09", "W10"], text: "Did people copy the word, or the sentence or gesture that carries it? Give an example.", src: "RN§7.3" },
    { id: "lab-15", kind: "theory_link", weekIds: ["W04"], text: "Where do the parts of your word come from? Who should get credit?", src: "L12" },
    { id: "lab-16", kind: "reflection", weekIds: ["W04", "W05"], text: "What changed between Wave 1 and Wave 2? Give one possible reason.", src: "SPEC§5.8; RDG-09§3" },
    { id: "lab-17", kind: "summit_feedback", weekIds: ["W05", "W06"], text: "Which questions were you asked at the Summit? How well did you answer them?", src: "SPEC§5.8" },
    { id: "lab-18", kind: "summit_feedback", weekIds: ["W05", "W06"], text: "What feedback did you get on your talk? What will you change in phase 2 because of it?", src: "SPEC§5.8" },
    { id: "lab-19", kind: "free", weekIds: ["W06", "W07"], text: "This is a light week. If your word turned up anywhere, write one line about it.", src: "SPEC§5.8" },
    { id: "lab-20", kind: "reflection", weekIds: ["W07", "W08"], text: "Pivot: what will you keep, stop and start? Which one thing will you change?", src: "L15; SPEC§5.8" },
    { id: "lab-21", kind: "reflection", weekIds: ["W08", "W09"], text: "How is phase 2 different from phase 1 so far? What is your evidence?", src: "L15; RN§7.3" },
    { id: "lab-22", kind: "reflection", weekIds: ["W09", "W10"], text: "Your campaign is closing. What stays in use without you, and what stops?", src: "SPEC§11.8; RN§7.2-P4" },
    { id: "lab-23", kind: "reflection", weekIds: ["W09", "W10", "W11"], text: "What does your Wave 3 result show, beside the control words? What does it not show?", src: "RN§7.3; SPEC§5.8" },
    { id: "lab-24", kind: "reflection", weekIds: ["W11", "W12"], text: "What did you learn about your own article from reviewing a classmate’s draft?", src: "L24" },
    { id: "lab-25", kind: "reflection", weekIds: ["W12", "W13"], text: "Does Wave 4 show decay, with fewer people knowing your word? Compare it with the control words.", src: "RN§7.2-P4; RN§7.3" },
    { id: "lab-26", kind: "final_reflection", weekIds: ["W12", "W13"], text: "Look back at the whole project. What do you now understand about how words spread?", src: "SPEC§6-A1-REFLECT" },
    { id: "lab-27", kind: "final_reflection", weekIds: ["W13"], text: "What would you do differently if you started again? Which part of your research are you proud of?", src: "SPEC§6-A1-REFLECT; RDG-09§6" },

    { id: "lab-28", kind: "zero_result", weekIds: TO12, text: "Where did you expect to hear your word this week? What happened there instead?", src: "SPEC§10.2" },
    { id: "lab-29", kind: "zero_result", weekIds: TO12, text: "Nobody used the word this week. Give two possible reasons. How could you test one of them?", src: "RN§7.2-P1; RDG-09§3" },
    { id: "lab-30", kind: "zero_result", weekIds: TO12, text: "No action for your word this week? That is worth recording. What stopped you, and what is one small next step?", src: "SPEC§5.7" },
    { id: "lab-31", kind: "zero_result", weekIds: TO12, text: "A zero week is a real result. What does it suggest about your crowd, your trigger or your carrier?", src: "RN§6; RN§7.2-P0" },
    { id: "lab-32", kind: "zero_result", weekIds: ["W04", "W05", "W08", "W09", "W10", "W11", "W12"], text: "Is something slowing your word down: hearing it too often, too much pushing, or a narrow meaning? Explain.", src: "RN§5-10" },

    { id: "lab-33", kind: "failure_analysis", weekIds: TO12, text: "What did you plan, and what happened? Describe it in three or four sentences.", src: "SPEC§5.8" },
    { id: "lab-34", kind: "failure_analysis", weekIds: TO12, text: "Why do you think it failed or changed? Look at the Word, the Need, the Crowd and the Spark.", src: "RN§6" },
    { id: "lab-35", kind: "failure_analysis", weekIds: TO12, text: "Read the list “What sinks a word”. Does any point fit your case? Explain.", src: "RN§7.4" },
    { id: "lab-36", kind: "failure_analysis", weekIds: TO12, text: "What will you do differently next time? Change one thing only, and say why.", src: "L15; SPEC§5.8" },
    { id: "lab-37", kind: "failure_analysis", weekIds: TO12, text: "Did you explain the word, or push people to use it? How did they react?", src: "RN§7.4" },

    { id: "lab-38", kind: "reflection", weekIds: TO12, slot: "wentWell", text: "What went well this week? Give one example.", src: "SPEC§5.5" },
    { id: "lab-39", kind: "reflection", weekIds: TO12, slot: "toChange", text: "What will you change next week, and why?", src: "SPEC§5.5" }
  ];

  /* ------------------------------------------------------------------ theory tags (10-14)
     Diffusion, S-curve, social proof and STEPPS use the RDG-09 glossary definitions (src "RDG-09").
     RDG-09 gives no gloss for Emotion or Stories: Emotion uses RN §6 ("humour"); Stories is a question, not a definition. */
  GUIDE.theory = [
    { id: "th-wncs", name: "Word, Need, Crowd, Spark", oneLine: "Four questions: is the word easy, does it fill a need, who uses it first, and what carries it?", src: "RN§6" },
    { id: "th-fudge", name: "FUDGE", oneLine: "Five tests for a new word: Frequency, Unobtrusiveness, Diversity, Generation and Endurance.", src: "L4; SPEC§2.3" },
    { id: "th-scurve", name: "Diffusion and the S-curve", oneLine: "The spread of a new idea or product through a group (Rogers, 2003). S-curve: slow start, fast rise, then levelling off.", src: "RDG-09" },
    { id: "th-adopters", name: "Adopter categories", oneLine: "Innovators try it first, then early adopters, the early majority, the late majority and laggards.", src: "RN§6; L8" },
    { id: "th-socialproof", name: "Social proof", oneLine: "Copying others because we think what they do must be right (Cialdini, 2021).", src: "RDG-09" },
    { id: "th-stepps-social", name: "STEPPS: Social currency", oneLine: "Sharing it makes you look good.", src: "RDG-09" },
    { id: "th-stepps-triggers", name: "STEPPS: Triggers", oneLine: "Everyday reminders: moments in the day that bring the word to mind.", src: "RDG-09" },
    { id: "th-stepps-emotion", name: "STEPPS: Emotion", oneLine: "The feeling the word brings, such as humour.", src: "RDG-09; RN§6-STEPPS" },
    { id: "th-stepps-public", name: "STEPPS: Public", oneLine: "Others can see it: a gesture, a sound or a hashtag.", src: "RDG-09; RN§6-STEPPS" },
    { id: "th-stepps-practical", name: "STEPPS: Practical value", oneLine: "It is useful, like “OK” or “selfie”.", src: "RDG-09; RN§6-STEPPS" },
    { id: "th-stepps-stories", name: "STEPPS: Stories", oneLine: "The last S in STEPPS. Is your word part of a story that people tell?", src: "RDG-09" },
    { id: "th-dense", name: "Dense home network", oneLine: "In a close group, people hear the word many times from several friends.", src: "RN§6; L10" },
    { id: "th-weakties", name: "Weak ties", oneLine: "Weak ties are the links that carry a word from your group to new groups.", src: "RN§6; L10" },
    { id: "th-contexts", name: "Spread across contexts", oneLine: "A word used by many kinds of people, about many topics, is more likely to grow.", src: "RN§0-6" }
  ];

  /* ------------------------------------------------------------------ part-of-speech reasons (22), SPEC §3.3 verbatim */
  GUIDE.posReasons = {
    P00: "I cannot find your word in the sentence. Check the spelling, or choose below.",
    P01: "\"{w}\" stands alone, like \"Wow!\" or \"Oops!\". Words like that are interjections.",
    P02: "\"{w}\" ends in -ly and describes how something is done, like \"quickly\".",
    P03: "\"{w}\" compares things, like \"bigger\" or \"biggest\". Adjectives do that.",
    P04: "\"{p} {w}\" names a person or thing, like \"a runner\".",
    P05: "\"{w}\" ends in -y and describes something, like \"messy\".",
    P06: "\"{w}\" owns something ('s), so it is a noun.",
    P07: "\"{w}\" is an -ing form after \"{p}\", like \"is running\" or \"stop talking\". That is a verb.",
    P08: "\"{w}\" ends in -ed, like \"walked\". It shows something happened, so it is a verb.",
    P09: "\"{w}\" has an -s ending. After \"the\" or a number that is a plural noun; after \"she\" or \"it\" it is a verb.",
    P10: "\"{p}\" comes before your word, as in \"a cat\" or \"my bag\". If your word is the thing itself, it is a noun; if it describes the next word, it is an adjective.",
    P11: "\"to {w}\" looks like \"to run\": a verb.",
    P12: "\"{p} {w}\" is like \"can run\" or \"don't run\": a verb.",
    P13: "Your word starts the sentence and \"is/are/can\" follows, so it is the thing the sentence is about: a noun.",
    P14: "\"{p}\" makes a describing word stronger, as in \"so cool\": an adjective.",
    P15: "After \"{p}\" your word describes someone or something, like \"is happy\" or \"feels tired\": an adjective.",
    P16: "After \"{p}\" your word is a thing someone has or gets: a noun.",
    P17: "After \"{p}\" your word is a thing, as in \"with style\": a noun.",
    P18: "\"{p} {w}\" is someone doing something, like \"I run\": a verb.",
    P19: "Your word starts the sentence and tells someone to do something, like \"Open it\": a verb.",
    P20: "Your word ends the sentence as a thing: probably a noun.",
    P21: "I cannot tell from this sentence. Please choose."
  };
  GUIDE.posReasonsSrc = "SPEC§3.3";

  /* ------------------------------------------------------------------ what sinks a word (>= 6) */
  GUIDE.sinks = [
    { id: "snk-01", text: "It is too clever, or too hard to spell.", src: "RN§7.4" },
    { id: "snk-02", text: "Only the person who made it uses it.", src: "RN§7.4" },
    { id: "snk-03", text: "Its meaning is tied to one joke or one event.", src: "RN§7.4" },
    { id: "snk-04", text: "It is explained all the time, or pushed with “use my word!”.", src: "RN§7.4" },
    { id: "snk-05", text: "Adults or official accounts start using it early.", src: "RN§7.4" },
    { id: "snk-06", text: "An existing word already does the same job, and the new word adds nothing.", src: "RN§7.4" },
    { id: "snk-07", text: "People hear it too often and start to find it “cringe”.", src: "RN§7.2-P4; RN§5-10" }
  ];

  root.GUIDE = GUIDE;
})();
