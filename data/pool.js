/* WordIdol optional pool (W3). Global: WI_POOL = [X-01 … X-24].
   Shape: {id, title (<= 90 chars), why (<= 200 chars), stage, online, src}.
   Small, safe, in-person-first tasks; at least 3 per stage; none is online.
   The engine supplies the rest (kind optional, xp 5, check null, route #/log; SPEC §5.8, §10.7). */
(function () {
  var root = (typeof window !== "undefined") ? window : globalThis;

  root.WI_POOL = [
    /* s1 Audition */
    { id: "X-01", stage: "s1", online: false, title: "Say your word five times fast to a friend and note how it sounds",
      why: "Short words that are easy to say are easier to copy. This is spec sheet test R1.", src: "RN§7.1-R1" },
    { id: "X-02", stage: "s1", online: false, title: "Ask three classmates to read your word aloud with no help; note how each one says it",
      why: "A word travels better when there is one clear way to say it. This is test R2.", src: "RN§7.1-R2" },
    { id: "X-03", stage: "s1", online: false, title: "Write three sentences with your word as three different parts of speech",
      why: "A word that fits more kinds of sentences has more chances to be used. This is test R6.", src: "RN§7.1-R6; RN§0-6" },
    { id: "X-04", stage: "s1", online: false, title: "List two new forms of your word, for example with -er, -ed or -y",
      why: "New forms are a sign that a word is alive. This is test R8.", src: "RN§7.1-R8; RN§5-7" },

    /* s2 Debut plan */
    { id: "X-05", stage: "s2", online: false, title: "List what happens every school day; circle one moment that fits your word",
      why: "A trigger that comes every school day reminds people to use the word.", src: "RN§7.2-P0" },
    { id: "X-06", stage: "s2", online: false, title: "Write your carrier on paper: one sentence a friend could copy in three seconds",
      why: "People copy a format more easily than a word alone.", src: "RN§7.2-P0; RN§5-2" },
    { id: "X-07", stage: "s2", online: false, title: "Write one sentence that lets a new listener guess the meaning of your word",
      why: "If people can guess the meaning, you do not need to explain the word. This is test R5.", src: "RN§7.1-R5" },

    /* s3 Fan club */
    { id: "X-08", stage: "s3", online: false, title: "Teach your word to one person without using the word “slang”",
      why: "A word feels more natural when it is not presented as a project.", src: "SPEC§10.7; RN§7.2-P1" },
    { id: "X-09", stage: "s3", online: false, title: "Use your word about three different topics this week and note each one",
      why: "Words that work in many topics are more likely to grow. This is test R7.", src: "RN§7.1-R7; RN§0-6" },
    { id: "X-10", stage: "s3", online: false, title: "Count how many times you said your word today and save a tally",
      why: "Your own use is owned evidence. Recording it honestly shows how much effort the campaign took.", src: "RN§7.2-P1" },
    { id: "X-11", stage: "s3", online: false, title: "Note the first question anyone asks about your word, in their exact words",
      why: "A question shows what a new listener understands and what she does not.", src: "RN§7.1-R5; VID-EVID" },

    /* s4 On tour */
    { id: "X-12", stage: "s4", online: false, title: "Choose one bridge person and plan one moment to use the word when she is there",
      why: "One bridge person can do more than ten repeats in the same group.", src: "RN§7.2-P2" },
    { id: "X-13", stage: "s4", online: false, title: "Try your word in a new kind of sentence: a question or a reaction",
      why: "Moving the word into new sentence types on purpose helps it spread across contexts.", src: "RN§7.2-P2" },
    { id: "X-14", stage: "s4", online: false, title: "Listen for new forms of your word (-y, -ed, -er) and log any you hear",
      why: "Forms that other people invent are one of the things worth measuring.", src: "RN§7.3" },
    { id: "X-15", stage: "s4", online: false, title: "Ask one family member to guess the meaning from one sentence; log the guess",
      why: "Family is a planned spread test. The guess shows whether the meaning is clear outside your group.", src: "VID-WHO; RN§7.1-R5" },

    /* s5 Charts */
    { id: "X-16", stage: "s5", online: false, title: "Count the topics and parts of speech in your sightings; note the totals",
      why: "Diversity of contexts is worth measuring beside recognition.", src: "RN§7.3" },
    { id: "X-17", stage: "s5", online: false, title: "Write one sentence that compares your word with one control word",
      why: "The control words give you something to compare your word with in the same survey.", src: "RN§7.3; RDG-09§5" },
    { id: "X-18", stage: "s5", online: false, title: "Sort your sightings into owned and earned; write one line about the balance",
      why: "Earned evidence tells us the most, so it helps to know how much of yours is earned.", src: "VID-EVID; L6" },

    /* s6 Summit stage */
    { id: "X-19", stage: "s6", online: false, title: "Say your 30-second hook aloud to a friend and ask what she remembers",
      why: "The hook opens your talk. What a listener remembers shows whether it works.", src: "SPEC§11.1" },
    { id: "X-20", stage: "s6", online: false, title: "Ask a classmate to ask you one hard question; answer it in 30 seconds",
      why: "Two classmates and T.Chris will question you after your talk. Practice makes answers shorter and clearer.", src: "SPEC§4.3; SPEC§11.5" },
    { id: "X-21", stage: "s6", online: false, title: "Explain one of your charts to a family member in one minute",
      why: "If someone outside the class can follow your chart, your audience will follow it too.", src: "SPEC§11.3" },

    /* s7 Encore */
    { id: "X-22", stage: "s7", online: false, title: "Stop pushing for one week and note where your word still appears",
      why: "The last phase is to let go and measure decay. What stays without you is the real test.", src: "RN§7.2-P4" },
    { id: "X-23", stage: "s7", online: false, title: "Ask two friends, in person, whether they still hear your word; log the answers",
      why: "Their answers add detail to your decay check before Wave 4.", src: "RN§7.2-P4; RN§7.3" },
    { id: "X-24", stage: "s7", online: false, title: "Reread your first Lab Book entry; write two lines on what has changed",
      why: "Looking back helps you write your final reflection and your Discussion.", src: "SPEC§6-A1-REFLECT" }
  ];
})();
