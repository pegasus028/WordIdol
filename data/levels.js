/* WordIdol Evidence Levels (W3). Global: LEVELS.
   Shape: {level, name, definition, ownedOrEarned, source, example, spec, src}.
   spec = the fixed wording of SPEC §10.6 (MATERIALS_BRIEF, RES-06), kept word for word.
   definition = the same meaning addressed to the student ("you" instead of "she"); W3 added the example.
   ownedOrEarned: "owned" (Levels 0-1), "earned" (Levels 4-6), "survey" (Levels 2-3, which never come from a sighting).
   The app never suggests a level from her text and never praises a higher level. */
(function () {
  var root = (typeof window !== "undefined") ? window : globalThis;

  root.LEVELS = [
    { level: 0, name: "Self-report",
      definition: "You say the word is used, but there is nothing to check.",
      ownedOrEarned: "owned", source: "sighting",
      example: "You remember that a friend said it last week, but you have no note and no screenshot.",
      spec: "she says it is used; nothing to check", src: "SPEC§10.6" },
    { level: 1, name: "Owned",
      definition: "Your own posts, entries or views.",
      ownedOrEarned: "owned", source: "sighting",
      example: "You used the word yourself, out loud or in a private group chat with friends you know.",
      spec: "her own posts, entries or views", src: "SPEC§10.6; SPEC§2.3" },
    { level: 2, name: "Recognition",
      definition: "In the survey, people say “I know it”. The figure is corrected with the foil words. Survey only.",
      ownedOrEarned: "survey", source: "survey",
      example: "40% say they know your word and 15% say they know the foil words. Corrected recognition is 25%.",
      spec: "survey \"I know it\", foil-corrected; survey only", src: "SPEC§10.6; L6" },
    { level: 3, name: "Comprehension",
      definition: "In the survey, people pick the correct meaning of your word. Survey only.",
      ownedOrEarned: "survey", source: "survey",
      example: "A respondent chooses the correct meaning of your word in the survey.",
      spec: "survey: picks the correct meaning; survey only", src: "SPEC§10.6" },
    { level: 4, name: "Earned inside your network",
      definition: "Friends use the word.",
      ownedOrEarned: "earned", source: "sighting",
      example: "A friend from your lunch group uses the word at break, and you did not ask her to.",
      spec: "friends use it", src: "SPEC§10.6" },
    { level: 5, name: "Earned outside your network",
      definition: "People in other groups, other year groups or teachers use the word unprompted. This is the headline evidence.",
      ownedOrEarned: "earned", source: "sighting",
      example: "A student in another year group, who you have never talked to about the word, says it in the canteen.",
      spec: "people in other groups, other year groups or teachers use it unprompted; the headline evidence", src: "SPEC§10.6" },
    { level: 6, name: "Independent recognition",
      definition: "Someone else records the word: for example, writes a definition, or the SWEP Word of the Year panel records it.",
      ownedOrEarned: "earned", source: "sighting",
      example: "Someone you did not ask writes a definition of your word.",
      spec: "someone else records it, e.g. writes a definition, or the SWEP Word of the Year panel", src: "SPEC§10.6" }
  ];
})();
