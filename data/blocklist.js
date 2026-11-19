/* WordIdol guide blocklist (W3). Global: BLOCKLIST = {banned:[RegExp], myths:[strings], notes}.
   banned: patterns that must never match a guide string (GUIDE, FRAMES, LEVELS, WI_WHY, WI_POOL).
           All are case-insensitive regular expressions; test with re.test(text).
   myths:  the wrong statements of research notes §8, as plain sentences for reviewers (lower case match).
   Sources: research notes §8 (myths), SPEC §10.1 and §14 (safety and topic limits).
   Wording convention that keeps the safety patterns exact: guide text says "during lessons" (plural)
   only in "never during lessons" reminders. */
(function () {
  var root = (typeof window !== "undefined") ? window : globalThis;

  root.BLOCKLIST = {
    banned: [
      /* --- myths and names to keep out (RN §8) --- */
      /old kinderhook/i,
      /choctaw/i,
      /\bokeh\b/i,
      /nathan hope/i,
      /\b(invented|coined|created) (the word )?.?selfie/i,
      /\b(is|was|as) short for charisma\b/i,
      /little big/i,
      /lamelo/i,
      /67th street/i,
      /\b(67|six-seven|sixty-seven) kid\b/i,
      /word (spoken |said )?on the moon/i,
      /first said by/i,
      /popularised in 2022/i,
      /\b(word of the year|woty)\b[^.]*\bwill last\b/i,
      /\b\w*maxxing\b/i,
      /\bmogg(ing|ed|s)?\b/i,

      /* --- safety: strangers, money, favours (the six rules) --- */
      /\bmust (create|make|open|use|have) a new (social media )?account\b/i,
      /\b(dm|message|email|contact|tag|follow) (a |an |any |some |the )?(stranger|celebrit|influencer|famous|brand)/i,
      /\bbuy(ing)? (followers|likes|views|ads?)\b/i,
      /\bboost(ed|ing)? (your|the|a) (post|video|account)\b/i,
      /\b(paid|sponsored) (ad|ads|advert|post|posts|promotion)\b/i,
      /\bpay (a |your |some )?(friend|friends|classmate|classmates|someone|people|them|her)\b/i,
      /\bin (return|exchange) for\b/i,
      /\b(prize|prizes|reward|rewards|giveaway|giveaways)\b/i,

      /* --- safety: identity and place --- */
      /\b(show|post|film|include|share) your (face|uniform|school name|school|location|address|phone number|timetable)\b/i,
      /\btag (your|the) (school|location)\b/i,
      /\b(wear|wearing|in) your uniform\b/i,

      /* --- safety: lessons --- */
      /\b(say|use|shout|try|test) (it|your word|the word) (in|during) (a |the |your )?(lesson|class)\b/i,

      /* --- honesty and spread --- */
      /\bgo(es|ing)? viral\b/i,
      /\bguarantee[ds]?\b/i,
      /\bfake (a |some |your )?(sighting|sightings|screenshot|screenshots|result|results)\b/i,
      /\b(xp|points|marks) for (each|every) sighting\b/i,

      /* --- topics the course keeps out of student words and guide text --- */
      /\b(religio\w*|monarch\w*|royal\w*|politic\w*|election\w*)\b/i,
      /\b(gender|race|racial|racis\w*|ethnic\w*)\b/i,
      /\b(ugly|stupid|idiot|loser)\b/i,
      /\b(sexy|sexual\w*|kiss\w*|nude\w*|flirt\w*)\b/i,
      /\b(body|bodies|skinny|fat|weight|looks?maxx\w*)\b/i,

      /* --- safety: meeting people known only online; rewarding spread --- */
      /\bmeet (up )?(with )?(someone|people|anyone|a person|players?) (you )?(only )?(met|know|knew) online\b/i,
      /\b(gain|get|grow|win|earn|chase) (more |lots of |many |your )?(followers|likes|views|fans)\b/i,
      /\b(well done|great job|amazing|congratulations)\b[^.]*\b(spread|sightings?|users|recogni[sz]\w*)\b/i,

      /* --- no male figures in guide text --- */
      /\b(boy|boys|boyfriend|brother|brothers|father|dad|uncle|grandfather|grandad)\b/i,

      /* --- people and hand emoji (direction and figures) --- */
      /[☝✊-✍]|\uD83D[\uDC40-\uDC4F\uDC66-\uDC78\uDC7C\uDC81-\uDC87\uDD90\uDD95\uDD96\uDE45-\uDE4F\uDEB6]|\uD83E[\uDD0C-\uDD1F\uDD26\uDD30-\uDD39\uDDD1-\uDDDF]/
    ],
    myths: [
      "ok comes from old kinderhook",
      "ok comes from choctaw okeh",
      "nathan hope invented selfie",
      "rizz is short for charisma",
      "rizz was popularised in 2022",
      "skibidi comes from the little big song",
      "67 means the height of lamelo ball",
      "67 means 67th street",
      "the word of the year will last",
      "cool was first said by lester young",
      "ok was the first word on the moon"
    ],
    notes: "RN§8; SPEC§10.1; SPEC§14"
  };
})();
