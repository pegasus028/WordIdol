/* WordIdol checklist "why" lines (W3). Globals: WI_WHY = {itemId: why text}, WI_WHY_SRC = {itemId: src}.
   Covers every fixed item (F-Wnn-xx), every habit instance (H-W01-1 … H-W13-5) and every
   choice-driven item (C-<RULE> and its phase 2 instance C-<RULE>-2).
   Each line: <= 200 characters, one or two sentences, B1. Plain data; safe in Apps Script (Shared.gs). */
(function () {
  var root = (typeof window !== "undefined") ? window : globalThis;

  /* [itemId, why, src] */
  var FIXED = [
    ["F-W01-01", "Everything in WordIdol starts from your word. One example sentence shows how it works.", "SPEC§3.1; SPEC§6-A1"],
    ["F-W01-02", "Assignment 1 asks for rules for usage. The part of speech decides how people can use your word.", "SPEC§6-A1-USAGE"],
    ["F-W01-03", "Assignment 1 asks for a clear purpose and example sentences. Your Baseline report and your talk use this card.", "SPEC§6-A1"],
    ["F-W01-04", "This record shows that your word was new when you started. You need that starting point to study its spread.", "RN§7.1-R9; SPEC§13.1"],
    ["F-W01-05", "Your choices shape your plan and your weekly checklist. One small home group is the best place to start.", "VID-WHO; SPEC§5.6"],
    ["F-W01-06", "No word is worth more than you are. All six ticks are needed before any online action can open.", "VID-SAFE; SPEC§5.6"],
    ["F-W01-07", "A plan lets you compare what you planned with what happened. That comparison is the start of your analysis.", "VID-PLAN; SPEC§2.3"],
    ["F-W01-08", "The launch is in person, with people you know. Log it the same day, even if nothing happened.", "SPEC§4.3; RN§7.2-P1"],

    ["F-W02-01", "FUDGE is your prediction, not a mark. Later you can compare it with your real data.", "SPEC§2.3; L4"],
    ["F-W02-02", "Hypotheses tell you what to look for in your data. A hypothesis that is not supported is still a useful result.", "L6; SPEC§9.3"],
    ["F-W02-03", "Wave 1 is your starting line. Later waves only mean something beside this one.", "SPEC§4.3; RN§7.3"],
    ["F-W02-04", "The Baseline report is due on Wed 25 Nov and is worth 5 points. WordIdol shows your facts; you write the analysis.", "SPEC§4.3; SPEC§11.8"],
    ["F-W02-05", "In person comes first. Online is your choice, and it opens only after the L9 safety briefing and the six rules.", "VID-PLAN; SPEC§5.6"],
    ["F-W02-06", "The ten tests show the strong and weak points of your word. A word can fail some of them and still be a good project.", "RN§7.1; SPEC§2.3"],

    ["F-W03-01", "Bridges and weak ties carry a word to new groups. These notes help your talk and the Discussion of your article.", "L10; RN§7.2-P2"],
    ["F-W03-02", "Levels show how strong each piece of evidence is. Earned evidence tells us the most.", "VID-EVID; L6"],
    ["F-W03-03", "A theory link explains why an action should work. Your talk must show the theory you applied.", "SPEC§4.3; L8; L10"],
    ["F-W03-04", "A failed action, analysed well, is strong material for your talk and your article. Marks are for analysis, not for spread.", "SPEC§1.1; RN§7.4"],

    ["F-W04-01", "Two waves let you see change. Compare your word with the control words and the foil words.", "RN§7.3; SPEC§13.4"],
    ["F-W04-02", "Checking hypotheses against data is the centre of your analysis. “Not supported” and “too early to say” are honest answers.", "L6; SPEC§13.4"],
    ["F-W04-03", "The Intermediate report asks for planned adjustments, and your talk ends with a phase 2 plan.", "SPEC§4.3; SPEC§11.1"],
    ["F-W04-04", "The six parts of the outline add up to seven minutes. WordIdol shows your facts; you decide what to say.", "SPEC§11.1"],
    ["F-W04-05", "Your talk analyses what happened, including what did not work. This statement makes that clear.", "SPEC§6-SUM-AOA; SPEC§1.1"],
    ["F-W04-06", "A chart or a screenshot lets the audience see your evidence. Crop out names, faces and usernames.", "SPEC§11.3"],
    ["F-W04-07", "Words come from communities. Giving credit is part of honest research and belongs in your ethics statement.", "L12; SPEC§6-ART-ETH"],

    ["F-W05-01", "The Intermediate report is due on Mon 14 Dec and is worth 5 points. It joins Wave 2, your log, your analysis and your adjustments.", "SPEC§4.3; SPEC§11.8"],
    ["F-W05-02", "In about 50 words, the abstract gives your aim, your method, your main result and what it means.", "SPEC§11.4"],
    ["F-W05-03", "Slides and abstract are due on Tue 15 Dec. The Pack gives you the text for each slide to copy.", "SPEC§4.3; SPEC§11.8"],
    ["F-W05-04", "Seven minutes goes fast. Two timed rehearsals show you which part runs long.", "SPEC§11.7; L12"],
    ["F-W05-05", "Two classmates and T.Chris will ask you questions after your talk. Prepared answers help you stay calm.", "SPEC§4.3; SPEC§11.5"],
    ["F-W05-06", "The self-check shows what is ready and what is not, while you still have time to fix it.", "SPEC§11.6"],
    ["F-W05-07", "Questions and feedback show you what to change. You will use these notes in phase 2 and in your article.", "SPEC§5.8; SPEC§12"],
    ["F-W05-08", "T.Chris checks the Lab Book on Fri 18 Dec. Regular entries and thoughtful reflection count, not how far your word spread.", "KIT-01; SPEC§4.3"],

    ["F-W06-01", "This is a light week. One line is enough, and only if something happened.", "SPEC§4.1; SPEC§5.8"],
    ["F-W07-01", "Lesson 15 starts phase 2. Keep, stop and start is a quick way to review phase 1.", "SPEC§5.8; L15"],

    ["F-W08-01", "If you change one thing only, you can see its effect. Your phase 2 hypothesis says what you expect.", "L15; SPEC§5.8"],
    ["F-W08-02", "Phase 2 needs its own plan, so that you can compare it with phase 1 in your Final report.", "SPEC§4.3; L15"],
    ["F-W08-03", "Your article follows IMRaD: Introduction, Methods, Results and Discussion. A title and four notes give it a shape before you write.", "SPEC§4.3; L16"],

    ["F-W09-01", "Campaigns close on Fri 15 Jan. A close-out summary records what stays in use and what stops.", "SPEC§4.3; SPEC§11.8"],
    ["F-W09-02", "The article needs at least six sources. A note on how you will use each one makes the writing easier.", "SPEC§4.3; SPEC§12"],
    ["F-W09-03", "AI use must be declared in your article. Write at least 10 words, even if you used no AI.", "SPEC§4.3; SPEC§12"],
    ["F-W09-04", "Wave 3 shows what happened in phase 2. Read it beside Waves 1 and 2 and the control words.", "SPEC§4.3; RN§7.3"],

    ["F-W10-01", "The Final report compares phase 1 with phase 2. The table puts your facts side by side.", "SPEC§4.3; SPEC§11.8"],
    ["F-W10-02", "The article needs at least three data visuals. Each one should show a result from your own data.", "SPEC§4.3; SPEC§12"],
    ["F-W10-03", "The Final report is due on Fri 22 Jan and is worth 5 points. It covers Wave 3, the phase comparison and your close-out.", "SPEC§4.3; SPEC§11.8"],
    ["F-W10-04", "Methods and Results are built from facts you have already saved. WordIdol offers them to you section by section.", "SPEC§12"],

    ["F-W11-01", "Small numbers need careful words. Hedged claims and clear limitations make your Discussion honest.", "L22; RDG-09§3"],
    ["F-W11-02", "The ethics statement shows how you protected people: no names, the six rules and an anonymous survey.", "SPEC§12"],
    ["F-W11-03", "The full draft is due on Fri 29 Jan. Your reviewers need a complete draft to give useful feedback.", "SPEC§4.3; L23"],

    ["F-W12-01", "Reviewing a classmate’s draft helps her, and it shows you what a reader needs. The two reports are your peer review work.", "SPEC§4.3; L24"],
    ["F-W12-02", "A second review lets you compare two drafts. You will see more clearly what makes an article easy to follow.", "SPEC§4.3; L24"],
    ["F-W12-03", "The editorial board discussion goes better when you arrive with clear points.", "SPEC§4.1; SPEC§6-PEER-DISC"],
    ["F-W12-04", "A revision plan helps you decide which comments to act on first.", "L25; SPEC§12"],
    ["F-W12-05", "Wave 4 is the decay check. It shows whether your word lasts after you stop pushing.", "RN§7.2-P4; SPEC§4.3"],

    ["F-W13-01", "The article needs an abstract of 150 to 200 words. It sums up your whole study for the reader.", "SPEC§4.3; L26"],
    ["F-W13-02", "A clear title and keywords tell a reader what your study is about.", "L26; SPEC§12"],
    ["F-W13-03", "This check matches the article requirements: length, sources, visuals and the ethics statement.", "SPEC§4.3"],
    ["F-W13-04", "Assignment 1 asks you to reflect on the whole experience. This entry closes your Lab Book.", "SPEC§6-A1-REFLECT; SPEC§5.7"],
    ["F-W13-05", "The research article is your final. It is due on Fri 12 Feb and is worth 30 points.", "SPEC§4.3"]
  ];

  /* habit templates: key = k of H-Wnn-k */
  var HABIT = [
    ["1", "A regular log lets you compare your plan with what happened. A week with no action is worth recording too.", "KIT-01; SPEC§5.7"],
    ["2", "The Lab Book is marked for regular entries and for depth of reflection. One honest reflection each week is enough.", "KIT-01; SPEC§5.7"],
    ["3", "Record what you saw or heard, or record a zero-result week. Both are honest data, and both earn the same XP.", "SPEC§9.1; RN§7.2-P1"],
    ["4", "The review closes your week and builds the next one. Unfinished items carry over, so nothing is lost.", "SPEC§5.5"],
    ["5", "Checking a classmate’s Evidence Levels keeps the class data honest. You see no screenshots, and no level changes because of you.", "SPEC§13.3"]
  ];

  var CHOICE = [
    ["C-APPS", "Match your format to the apps your crowd already opens every day. Ask them; do not guess.", "VID-ONLINE"],
    ["C-PRIVATE", "On a private account, only people you accept can see your posts. Check this before your first post.", "VID-SAFE; SPEC§5.6"],
    ["C-NEWACC", "A new account keeps the project apart from your personal account. You can delete it after the project.", "VID-SAFE"],
    ["C-NOFACE", "Faces, uniforms, the school name and locations show who you are and where you are. Keep them out of every post.", "VID-SAFE; SPEC§5.6"],
    ["C-KNOWN", "Your online crowd is the people you also know in real life. Accept only people you know.", "VID-SAFE; SPEC§5.6"],
    ["C-FAMILY", "Family is a planned spread test. After seven days you can see whether the word stayed without your help.", "VID-WHO; SPEC§5.6"],
    ["C-SCHOOL", "A word needs a moment that comes every school day. Breaks, lunch and after school are good; lessons are not.", "RN§7.2-P0; VID-PLAN"],
    ["C-BRIDGE", "One bridge person can carry your word into a group that you cannot reach yourself.", "RN§7.2-P2"],
    ["C-NARROW", "Words start in a small, close group, where people hear them many times. Start there, then look for bridges.", "RN§7.2-P1; VID-WHO"],
    ["C-MEME", "A meme gives people a format to copy, not just a word. Testing ideas on paper first shows which one people enjoy.", "RN§5-2; SPEC§5.6"],
    ["C-HASH", "A hashtag only helps if it is not already used for something else. Your search result is evidence too.", "RN§7.1-R9; SPEC§5.6"],
    ["C-SONG", "A few lines that people can repeat make the word easy to copy. Reactions are evidence, so log them.", "RN§5-2; VID-EVID"],
    ["C-TSHIRT", "A shirt lets people see the word. One shirt for yourself is fine; no selling and no paying anyone (rule 5).", "RN§6-STEPPS; SPEC§5.6"],
    ["C-WIKT", "Wiktionary asks for three independent uses over at least a year. Check whether your word meets its rules yet.", "RDG-09; SPEC§5.6"],
    ["C-GAME", "A name in a game you already play lets other players see the word. Never message players you do not know (rule 2).", "SPEC§5.6; VID-SAFE"],
    ["C-DOC", "A storyboard lets you check every scene for faces, uniform, the school name and locations before you film.", "VID-SAFE; SPEC§5.6"],
    ["C-CLUB", "A group you already belong to is a ready home crowd, with its own jokes and habits.", "RN§7.2-P1; SPEC§5.6"],
    ["C-REPLY", "A reply to someone you know puts the word in a natural place. Use it; do not explain it.", "RN§7.2-P1; VID-SAFE"],
    ["C-ASK", "Any idea that means contacting someone you do not know needs a check with T.Chris first.", "VID-SUBMIT"],
    ["C-UTIL", "Useful words name a lasting need. The gap sentence shows what your word is for.", "RN§7.1-routes; RN§7.1-R4"],
    ["C-PLAY", "Play words spread through sound and fun. They can be recognised fast and fade fast, so note what people copy.", "RN§7.1-routes"],
    ["C-SHIFT", "An ordinary word with a new meaning is easy to say and spell. Your survey must test the new meaning.", "RN§7.1-routes"],
    ["C-LIGHT", "With about 30 minutes a week, one action that you finish and log is better than several that you rush.", "SPEC§2.3; SPEC§5.6"]
  ];

  var WHY = {};
  var SRC = {};
  var i, w, k, id;
  for (i = 0; i < FIXED.length; i++) { WHY[FIXED[i][0]] = FIXED[i][1]; SRC[FIXED[i][0]] = FIXED[i][2]; }
  for (w = 1; w <= 13; w++) {
    for (k = 0; k < HABIT.length; k++) {
      id = "H-W" + (w < 10 ? "0" : "") + w + "-" + HABIT[k][0];
      WHY[id] = HABIT[k][1]; SRC[id] = HABIT[k][2];
    }
  }
  for (i = 0; i < CHOICE.length; i++) {
    WHY[CHOICE[i][0]] = CHOICE[i][1]; SRC[CHOICE[i][0]] = CHOICE[i][2];
    WHY[CHOICE[i][0] + "-2"] = CHOICE[i][1]; SRC[CHOICE[i][0] + "-2"] = CHOICE[i][2];
  }

  root.WI_WHY = WHY;
  root.WI_WHY_SRC = SRC;
})();
