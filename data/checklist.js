// WordIdol checklist catalogue (SPEC §5): fixed-course items, habit templates, choice-driven rules.
// Owner: W4. "why" texts live in W3's data/why.js (WI_WHY[itemId]); the optional pool X-01…X-24 lives in
// W3's data/pool.js (WI_POOL). The engine merges them at run time (WI.itemDef).
(function () {
  var root = (typeof window !== 'undefined') ? window : globalThis;

  // [id, title, kind R/M/O, due, check, route, evidence, feeds, xp]
  var F = [
    ['F-W01-01', 'Record your word, its meaning and one example sentence', 'R', '2026-11-21', 'word.first', '#/first', 'record', 'A1-ORIGINAL A1-EXAMPLES BAS-PROFILE', 0],
    ['F-W01-02', 'Confirm the part of speech and write your rules for using the word', 'R', '2026-11-22', 'word.usage', '#/audition', 'record', 'A1-USAGE BAS-PROFILE', 10],
    ['F-W01-03', 'Finish your word card: how it was formed, its purpose, two more examples', 'R', '2026-11-22', 'word.card', '#/audition', 'record', 'A1-PURPOSE A1-EXAMPLES A1-NOTRUDE BAS-PROFILE SUM-C1 ART-INTRO', 0],
    ['F-W01-04', 'Record your zero-baseline check and send your word for approval', 'R', '2026-11-22', 'word.submitted', '#/audition', 'screenshot', 'A1-ORIGINAL BAS-PROFILE ART-METH', 0],
    ['F-W01-05', 'Make your choices: target groups, ideas, platforms, route, time', 'R', '2026-11-22', 'plan.choices', '#/debut', 'record', 'BAS-PROFILE BAS-PLAN SUM-C1 ART-METH', 10],
    ['F-W01-06', 'Read and tick the six rules', 'R', '2026-11-21', 'rules.all', '#/debut', 'record', 'BAS-PLAN ART-ETH', 0],
    ['F-W01-07', 'Write your plan: at least three actions (Where, What, Why, When, Evidence)', 'R', '2026-11-22', 'plan.actions3', '#/debut', 'record', 'BAS-PLAN SUM-C1 ART-METH', 0],
    ['F-W01-08', 'Launch in person, then log your first action', 'R', '2026-11-22', 'action.first', '#/log/action/new', 'log', 'LAB-PRE INT-LOG', 10],
    ['F-W02-01', 'Score your word on FUDGE and give a reason for each score', 'R', '2026-11-24', 'word.fudge', '#/audition', 'record', 'BAS-FUDGE SUM-C1 ART-INTRO', 15],
    ['F-W02-02', 'Write your research question and two to four hypotheses you can test', 'R', '2026-11-24', 'word.hypotheses', '#/audition', 'record', 'BAS-FUDGE INT-ANALYSIS ART-INTRO', 15],
    ['F-W02-06', 'Check your word against the spec sheet (R1–R10) and explain any "not yet"', 'M', '2026-11-24', 'word.spec', '#/audition', 'record', 'BAS-PROFILE SUM-C1 ART-DISC', 10],
    ['F-W02-03', 'Read your Wave 1 result and write what it tells you', 'R', '2026-11-25', 'wave.note.W1', '#/charts', 'survey', 'BAS-W1 SUM-C2 ART-RES A1-RESEARCH', 15],
    ['F-W02-04', 'Build your Baseline report (600–900 words) and submit it in Google Classroom', 'R', '2026-11-25', 'report.baseline.ready', '#/report/baseline', 'doc', 'BAS-LEN BAS-PROFILE BAS-FUDGE BAS-W1 BAS-PLAN', 0],
    ['F-W02-05', 'After L9: decide in person only, or online too; update your plan', 'M', '2026-11-29', null, '#/debut', 'record', 'SUM-C1', 10],
    ['F-W03-01', 'Add your network map notes: who are your bridges and weak ties? (ACT-07)', 'M', '2026-12-06', null, '#/log/journal/new?kind=theory_link', 'journal', 'SUM-C1 ART-DISC', 10],
    ['F-W03-02', 'Give every sighting an Evidence Level and check owned or earned', 'R', '2026-12-06', 'sight.levels', '#/log', 'sighting', 'SUM-C2 INT-LOG ART-RES', 10],
    ['F-W03-03', 'Link each planned action to one theory idea (the Why column)', 'M', '2026-12-06', null, '#/debut', 'record', 'SUM-C1 ART-INTRO', 10],
    ['F-W03-04', 'Analyse one action that failed or changed: what happened, why, what next', 'R', '2026-12-06', 'journal.failure', '#/log/journal/new?kind=failure_analysis', 'journal', 'SUM-LEARN INT-ANALYSIS ART-DISC', 0],
    ['F-W04-01', 'Read your Wave 2 result and write what changed since Wave 1', 'R', '2026-12-12', 'wave.note.W2', '#/charts', 'survey', 'INT-W2 SUM-C2 ART-RES', 15],
    ['F-W04-02', 'Check each hypothesis against your data: supported, not supported, or too early', 'R', '2026-12-13', 'hyp.checked.W2', '#/charts', 'record', 'INT-ANALYSIS SUM-C2', 15],
    ['F-W04-03', 'Write the changes you plan to make (planned adjustments)', 'R', '2026-12-13', null, '#/report/intermediate', 'record', 'INT-ADJUST SUM-PH2', 10],
    ['F-W04-04', 'Summit Pack: fill in your talk outline (six parts)', 'R', '2026-12-13', 'summit.outline', '#/summit/outline', 'record', 'SUM-C1 SUM-C2 SUM-LEARN SUM-PH2', 20],
    ['F-W04-05', 'Summit Pack: write your analysis-over-adoption statement', 'R', '2026-12-13', 'summit.aoa', '#/summit/outline', 'record', 'SUM-AOA', 10],
    ['F-W04-06', 'Summit Pack: choose your charts and up to four screenshots', 'R', '2026-12-13', 'summit.visuals', '#/summit/visuals', 'screenshot', 'SUM-C3 SUM-C2', 10],
    ['F-W04-07', 'Who owns slang? Note where your word’s parts come from and who you should credit', 'M', '2026-12-13', null, '#/log/journal/new?kind=theory_link', 'journal', 'ART-DISC ART-ETH', 10],
    ['F-W05-01', 'Build your Intermediate report and submit it in Google Classroom', 'R', '2026-12-14', 'report.intermediate.ready', '#/report/intermediate', 'doc', 'INT-W2 INT-LOG INT-ANALYSIS INT-ADJUST', 0],
    ['F-W05-02', 'Write your 50-word abstract (SUM-03)', 'R', '2026-12-15', 'summit.abstract', '#/summit/abstract', 'record', 'SUM-ABS', 0],
    ['F-W05-03', 'Copy your slide text, finish your slides and submit them', 'R', '2026-12-15', null, '#/summit/export', 'doc', 'SUM-C3 SUM-ABS', 15],
    ['F-W05-04', 'Rehearse twice with the timer: 7:00 talk + 2:00 Q&A', 'R', '2026-12-15', 'summit.rehearsed2', '#/summit/rehearse', 'record', 'SUM-C3', 0],
    ['F-W05-05', 'Prepare answers to five likely questions', 'R', '2026-12-15', 'summit.qa5', '#/summit/qa', 'record', 'SUM-C4', 15],
    ['F-W05-06', 'Check yourself against the Summit rubric (ASM-04)', 'R', '2026-12-15', 'summit.selfcheck', '#/summit/check', 'record', 'SUM-C1 SUM-C2 SUM-C3 SUM-C4 SUM-AOA', 0],
    ['F-W05-07', 'After your talk: note the questions and feedback, and what you will change in phase 2', 'R', '2026-12-20', 'summit.feedback', '#/log/journal/new?kind=summit_feedback', 'journal', 'FIN-COMPARE ART-DISC ART-METH', 15],
    ['F-W05-08', 'Lab Book check: bring every log and reflection up to date', 'R', '2026-12-18', null, '#/log', 'journal', 'LAB-PRE', 10],
    ['F-W06-01', 'Exam week: if your word turns up anywhere, write one line', 'O', '2026-12-27', null, '#/log', 'journal', 'LAB-POST', 5],
    ['F-W07-01', 'Start your Pivot card in L15: what to keep, stop and start', 'O', '2027-01-03', null, '#/encore/pivot', 'record', 'FIN-COMPARE', 5],
    ['F-W08-01', 'Finish your Pivot card: the one thing you will change and your phase 2 hypothesis (ACT-11)', 'R', '2027-01-10', 'pivot.card', '#/encore/pivot', 'record', 'FIN-COMPARE ART-METH ART-DISC', 0],
    ['F-W08-02', 'Look at your choices again and write your phase 2 plan (at least three actions)', 'R', '2027-01-10', 'plan2.actions3', '#/encore/pivot', 'record', 'FIN-COMPARE ART-METH', 0],
    ['F-W08-03', 'Article Pack: working title and one note for each IMRaD section', 'R', '2027-01-10', 'article.outline', '#/encore/article/outline', 'record', 'ART-INTRO ART-METH ART-RES ART-DISC', 15],
    ['F-W09-01', 'Close your campaign: last log entry and a short close-out summary', 'R', '2027-01-15', 'fin.close', '#/report/final', 'log', 'FIN-CLOSE LAB-POST', 15],
    ['F-W09-02', 'Add at least six sources in APA style, each with one sentence on how you will use it', 'R', '2027-01-17', 'article.sources6', '#/encore/article/sources', 'record', 'ART-SRC ART-INTRO', 20],
    ['F-W09-03', 'Write your AI-use declaration', 'R', '2027-01-17', 'article.ai', '#/encore/article/ethics', 'record', 'ART-ETH', 10],
    ['F-W09-04', 'Read your Wave 3 result and write what it tells you', 'R', '2027-01-17', 'wave.note.W3', '#/charts', 'survey', 'FIN-W3 ART-RES', 15],
    ['F-W10-01', 'Compare phase 1 and phase 2: fill in the comparison table and check your hypotheses', 'R', '2027-01-21', 'fin.compare', '#/report/final', 'record', 'FIN-COMPARE ART-RES', 15],
    ['F-W10-02', 'Make at least three data visuals and add them to your Article Pack', 'R', '2027-01-21', 'article.visuals3', '#/encore/article/visuals', 'record', 'ART-VIS ART-RES', 20],
    ['F-W10-03', 'Build your Final assessment report and submit it in Google Classroom', 'R', '2027-01-22', 'report.final.ready', '#/report/final', 'doc', 'FIN-W3 FIN-COMPARE FIN-CLOSE', 0],
    ['F-W10-04', 'Draft your Methods and Results sections', 'R', '2027-01-24', 'article.sections.MR', '#/encore/article/draft', 'record', 'ART-METH ART-RES', 20],
    ['F-W11-01', 'Draft your Introduction and Discussion: hedge your claims and name your limitations', 'R', '2027-01-28', 'article.sections.ID', '#/encore/article/draft', 'record', 'ART-INTRO ART-DISC', 20],
    ['F-W11-02', 'Write your ethics statement', 'R', '2027-01-28', 'article.ethics', '#/encore/article/ethics', 'record', 'ART-ETH', 15],
    ['F-W11-03', 'Submit your full draft for peer review (check the word count)', 'R', '2027-01-29', null, '#/encore/article/check', 'doc', 'ART-WORDS PEER-DISC', 15],
    ['F-W12-01', 'Write reviewer report 1 (KIT-10)', 'R', '2027-02-03', 'peer.r1', '#/encore/peer', 'doc', 'PEER-R1', 0],
    ['F-W12-02', 'Write reviewer report 2 (KIT-10)', 'R', '2027-02-03', 'peer.r2', '#/encore/peer', 'doc', 'PEER-R2', 0],
    ['F-W12-03', 'Note three points to raise at the editorial board discussion', 'M', '2027-02-04', null, '#/encore/peer', 'record', 'PEER-DISC', 10],
    ['F-W12-04', 'Plan your revision from the reviews you received', 'R', '2027-02-07', 'peer.plan', '#/encore/peer', 'record', 'ART-DISC ART-WORDS', 15],
    ['F-W12-05', 'Read your Wave 4 (decay check) result and add it to your Results', 'R', '2027-02-07', 'wave.note.W4', '#/charts', 'survey', 'ART-RES', 15],
    ['F-W13-01', 'Write your abstract (150–200 words)', 'R', '2027-02-10', 'article.abstract', '#/encore/article/abstract', 'record', 'ART-ABS', 15],
    ['F-W13-02', 'Fix your final title and keywords', 'M', '2027-02-10', null, '#/encore/article/outline', 'record', 'ART-ABS', 5],
    ['F-W13-03', 'Final check: 2,000–3,000 words, six sources, three labelled visuals, ethics statement', 'R', '2027-02-11', 'article.words', '#/encore/article/check', 'record', 'ART-WORDS ART-SRC ART-VIS ART-ETH', 15],
    ['F-W13-04', 'Write your final reflection on the whole experience', 'R', '2027-02-11', 'journal.final', '#/log/journal/new?kind=final_reflection', 'journal', 'A1-REFLECT LAB-POST ART-DISC', 20],
    ['F-W13-05', 'Submit your research article in Google Classroom', 'R', '2027-02-12', null, '#/encore/article/check', 'doc', 'ART-WORDS', 20]
  ];

  // SPEC §5.8 stage mapping.
  var STAGE = {
    'F-W01-01': 's1', 'F-W01-02': 's1', 'F-W01-03': 's1', 'F-W01-04': 's1',
    'F-W01-05': 's2', 'F-W01-06': 's2', 'F-W01-07': 's2', 'F-W01-08': 's3',
    'F-W02-01': 's1', 'F-W02-02': 's1', 'F-W02-06': 's1', 'F-W02-03': 's5', 'F-W02-04': 's2', 'F-W02-05': 's2',
    'F-W04-01': 's5', 'F-W04-02': 's5', 'F-W04-03': 's5', 'F-W04-04': 's6', 'F-W04-05': 's6', 'F-W04-06': 's6', 'F-W04-07': 's4',
    'F-W05-01': 's5', 'F-W05-02': 's6', 'F-W05-03': 's6', 'F-W05-04': 's6', 'F-W05-05': 's6', 'F-W05-06': 's6', 'F-W05-07': 's6', 'F-W05-08': 's4'
  };
  var KIND = { R: 'required', M: 'recommended', O: 'optional' };

  // Lead decision 19 Nov (W4 review, workload): these W05 items are shown from W04 with the same due
  // dates, so the Intermediate report and Summit prep do not all land in the week they are due.
  var EARLY = { 'F-W05-01': 'W04', 'F-W05-04': 'W04', 'F-W05-05': 'W04' };

  var items = F.map(function (r) {
    var week = EARLY[r[0]] || r[0].substr(2, 3);
    var wn = parseInt(week.substr(1), 10);
    var stage = STAGE[r[0]] || (wn === 3 ? 's4' : (wn >= 6 ? 's7' : 's1'));
    return {
      id: r[0], title: r[1], why: '', stage: stage, week: week, due: r[3], kind: KIND[r[2]],
      source: 'fixed-course', feeds: r[7].split(' '), xp: r[8], evidence: r[6], route: r[5],
      check: r[4], online: false, release: parseInt(r[0].substr(3, 2), 10) <= 3 ? 1 : (parseInt(r[0].substr(3, 2), 10) <= 5 ? 2 : 3)
    };
  });

  // Habit templates (SPEC §5.7). The engine makes `H-<weekId>-<n>` instances.
  // feedsByWeek: [requirementId, firstWeekNo, lastWeekNo]
  var habits = [
    { n: 1, title: 'Log what you did for your word this week (or say why nothing happened)', weeks: [1, 9],
      kind: 'recommended', check: 'week.action', route: '#/log/action/new', evidence: 'log', xp: 10, stage: 's3', release: 1,
      feedsByWeek: [['LAB-PRE', 1, 5], ['LAB-POST', 6, 13], ['INT-LOG', 1, 4], ['FIN-CLOSE', 8, 9]] },
    { n: 2, title: 'Write one Lab Book reflection', weeks: [1, 13],
      kind: 'recommended', check: 'week.journal', route: '#/log/journal/new', evidence: 'journal', xp: 15, stage: 's3', release: 1,
      feedsByWeek: [['LAB-PRE', 1, 5], ['LAB-POST', 6, 13], ['A1-REFLECT', 1, 13]] },
    { n: 3, title: 'Sightings check: record what you saw or heard, or record a zero-result week', weeks: [2, 12],
      kind: 'recommended', check: 'week.sightcheck', route: '#/log/sighting/new', evidence: 'sighting', xp: 15, stage: 's3', release: 1,
      feedsByWeek: [['LAB-PRE', 1, 5], ['LAB-POST', 6, 13], ['A1-RESEARCH', 2, 12], ['SUM-C2', 2, 4], ['ART-RES', 2, 12]] },
    { n: 4, title: 'Do your weekly review (Sunday)', weeks: [1, 12],
      kind: 'required', check: 'week.review', route: '#/review', evidence: 'record', xp: 0, stage: 's2', release: 1,
      feedsByWeek: [['LAB-PRE', 1, 5], ['LAB-POST', 6, 13]] },
    { n: 5, title: 'Audit a classmate’s sightings', weekList: [3, 4, 5, 8, 9, 10], onlyIfAudit: true,
      kind: 'recommended', check: 'week.audit', route: '#/audits', evidence: 'record', xp: 0, stage: 's4', release: 2,
      feedsByWeek: [['LAB-PRE', 1, 5], ['LAB-POST', 6, 13]] }
  ];

  // Choice-driven rules (SPEC §5.6 table D). `when` is declarative; it is true if ANY listed condition holds:
  //   anyOnline: an online platform chosen · platforms / ideas / targetGroups: any of these chosen ·
  //   route / timeBudget: equals · otherAge: an age group that is not her own · askFirst: an ask_first request exists or id_influencer chosen.
  var PLAN = ['BAS-PLAN', 'LAB-PRE'];
  var LAB = ['LAB-PRE'];
  var choiceRules = [
    { id: 'C-APPS', when: { anyOnline: true }, firstWeek: 'W01', kind: 'recommended', online: false,
      title: 'Ask five people in your target group which apps they open every day; note the answers in your Lab Book',
      feeds: PLAN, route: '#/log/journal/new', evidence: 'journal', xp: 10 },
    { id: 'C-PRIVATE', when: { platforms: ['pf_tiktok', 'pf_instagram', 'pf_facebook', 'pf_youtube'] }, firstWeek: 'W02', kind: 'required', online: true,
      title: 'Check your project account is private before you post. TikTok and Instagram start private if you are 15 or under; if you are 16 or over, set it to private yourself in Settings',
      feeds: PLAN, route: '#/debut', evidence: 'record', xp: 10 },
    { id: 'C-NEWACC', when: { anyOnline: true }, firstWeek: 'W01', kind: 'recommended', online: false,
      title: 'Decide: a new account for the project (advised, rule 1) or not; write your reason in the Lab Book',
      feeds: PLAN, route: '#/log/journal/new', evidence: 'journal', xp: 10 },
    { id: 'C-NOFACE', when: { anyOnline: true, ideas: ['id_documentary', 'id_memes'] }, firstWeek: 'W02', kind: 'required', online: true,
      title: 'Check your first post or picture: no faces, no uniform, no school name, no location',
      feeds: PLAN, route: '#/log/action/new', evidence: 'record', xp: 10 },
    { id: 'C-KNOWN', when: { targetGroups: ['tg_online'], ideas: ['id_chats', 'id_replies', 'id_clubs'] }, firstWeek: 'W01', kind: 'recommended', online: false,
      title: 'List (for yourself, on paper) the online friends you also know in real life; they are your online crowd. No strangers (rule 2)',
      feeds: PLAN, route: '#/debut', evidence: 'none', xp: 10 },
    { id: 'C-FAMILY', when: { targetGroups: ['tg_family'], ideas: ['id_askfriends'] }, firstWeek: 'W01', kind: 'recommended', online: false,
      title: 'Plan a family spread test: teach the word to one family member, do not explain it again, check in seven days',
      feeds: LAB, route: '#/log/action/new', evidence: 'log', xp: 10 },
    { id: 'C-SCHOOL', when: { targetGroups: ['tg_school'], ideas: ['id_speak'] }, firstWeek: 'W01', kind: 'recommended', online: false,
      title: 'Pick three moments in a school day where your word fits (never during lessons) and plan to use it there',
      feeds: PLAN, route: '#/debut', evidence: 'record', xp: 10 },
    { id: 'C-BRIDGE', when: { otherAge: true, targetGroups: ['tg_foreign', 'tg_61'] }, firstWeek: 'W01', kind: 'recommended', online: false,
      title: 'Find one bridge person who belongs to that group and to yours; plan how the word reaches them in person',
      feeds: PLAN, route: '#/debut', evidence: 'record', xp: 10 },
    { id: 'C-NARROW', when: { targetGroups: ['tg_everyone'] }, firstWeek: 'W01', kind: 'required', online: false,
      title: '"Everyone" is too big to test: name the first small crowd you will start with, and why',
      feeds: PLAN, route: '#/debut', evidence: 'record', xp: 10 },
    { id: 'C-MEME', when: { ideas: ['id_memes'] }, firstWeek: 'W01', kind: 'recommended', online: false,
      title: 'Sketch three meme ideas on paper; test them on two classmates before you make one',
      feeds: LAB, route: '#/log/action/new', evidence: 'log', xp: 10 },
    { id: 'C-HASH', when: { ideas: ['id_hashtags'] }, firstWeek: 'W02', kind: 'recommended', online: true,
      title: 'Search your hashtag first: is it already used for something else? Record what you find (screenshot)',
      feeds: PLAN, route: '#/files', evidence: 'screenshot', xp: 10 },
    { id: 'C-SONG', when: { ideas: ['id_song', 'id_poem'] }, firstWeek: 'W01', kind: 'recommended', online: false,
      title: 'Write four lines that carry your word; say them aloud to two people and log their reaction',
      feeds: LAB, route: '#/log/action/new', evidence: 'log', xp: 10 },
    { id: 'C-TSHIRT', when: { ideas: ['id_tshirt'] }, firstWeek: 'W01', kind: 'recommended', online: false,
      title: 'Design it on paper first. One shirt for yourself is fine; no selling, no paying anyone (rule 5)',
      feeds: LAB, route: '#/log/action/new', evidence: 'none', xp: 10 },
    { id: 'C-WIKT', when: { ideas: ['id_wiktionary'] }, firstWeek: 'W01', kind: 'required', online: false,
      title: 'Read Wiktionary’s rules for new words before you write anything there; note in your Lab Book whether your word meets them yet',
      feeds: PLAN, route: '#/log/journal/new', evidence: 'journal', xp: 10 },
    { id: 'C-GAME', when: { ideas: ['id_gamename'] }, firstWeek: 'W02', kind: 'recommended', online: true,
      title: 'Use the word as a character name only in a game you already play; never message players you do not know (rule 2)',
      feeds: LAB, route: '#/log/action/new', evidence: 'log', xp: 10 },
    { id: 'C-DOC', when: { ideas: ['id_documentary'] }, firstWeek: 'W01', kind: 'recommended', online: false,
      title: 'Storyboard your video in six boxes: no faces, uniform, school name or location',
      feeds: LAB, route: '#/log/action/new', evidence: 'none', xp: 10 },
    { id: 'C-CLUB', when: { ideas: ['id_clubs'] }, firstWeek: 'W01', kind: 'recommended', online: false,
      title: 'Choose one club or fandom you already belong to; note two of its in-jokes or habits your word could fit',
      feeds: LAB, route: '#/log/journal/new', evidence: 'journal', xp: 10 },
    { id: 'C-REPLY', when: { ideas: ['id_replies'] }, firstWeek: 'W02', kind: 'recommended', online: true,
      title: 'Reply only under posts by people you know; plan two replies where the word fits naturally',
      feeds: PLAN, route: '#/debut', evidence: 'record', xp: 10 },
    { id: 'C-ASK', when: { askFirst: true }, firstWeek: 'W01', kind: 'required', online: false,
      title: 'Send your "ask T.Chris first" request and wait for his answer',
      feeds: PLAN, route: '#/debut', evidence: 'record', xp: 10, check: 'request.askFirst' },
    { id: 'C-UTIL', when: { route: 'utility' }, firstWeek: 'W01', kind: 'recommended', online: false,
      title: 'Write the "gap" sentence: "There is no short word for … so I say …"',
      feeds: LAB, route: '#/log/journal/new', evidence: 'journal', xp: 10 },
    { id: 'C-PLAY', when: { route: 'play' }, firstWeek: 'W01', kind: 'recommended', online: false,
      title: 'Find the fun: say your word five ways (loud, sing-song, as a question …); note which one people copy',
      feeds: LAB, route: '#/log/action/new', evidence: 'log', xp: 10 },
    { id: 'C-SHIFT', when: { route: 'shift' }, firstWeek: 'W01', kind: 'recommended', online: false,
      title: 'Write one sentence with the old meaning and one with your new meaning; note how a listener can tell them apart',
      feeds: LAB, route: '#/log/journal/new', evidence: 'journal', xp: 10 },
    { id: 'C-LIGHT', when: { timeBudget: 'light' }, firstWeek: 'W01', kind: 'optional', online: false,
      title: 'Pick the one action in your plan that matters most this week and star it',
      feeds: LAB, route: '#/plan', evidence: 'none', xp: 5 }
  ];

  // Defaults for optional pool items from WI_POOL (W3, data/pool.js).
  var poolDefaults = { kind: 'optional', source: 'pool', xp: 5, check: null, evidence: 'journal', route: '#/log', feeds: ['LAB-PRE'], release: 1 };

  // Route patterns the catalogue may use (SPEC §2.2). ":x" = any segment.
  var routes = [
    '#/login', '#/first', '#/review', '#/home', '#/week', '#/week/:x', '#/plan', '#/audition', '#/debut',
    '#/log', '#/log/action/:x', '#/log/journal/:x', '#/log/sighting/:x', '#/log/tally/:x', '#/files',
    '#/report/baseline', '#/report/intermediate', '#/report/final', '#/charts', '#/audits', '#/audits/:x',
    '#/summit', '#/summit/:x', '#/encore', '#/encore/pivot', '#/encore/article/:x', '#/encore/peer',
    '#/guide', '#/guide/:x', '#/board', '#/more', '#/problem', '#/rules'
  ];

  // Light weeks: all newly generated items become optional (SPEC §5.3).
  var lightWeeks = ['W06', 'W07'];
  var ownMax = 5;

  root.WI_CHECKLIST = {
    items: items, habits: habits, choiceRules: choiceRules, poolDefaults: poolDefaults,
    routes: routes, lightWeeks: lightWeeks, ownMax: ownMax,
    sources: ['fixed-course', 'plan-action', 'choice-driven', 'habit', 'carried', 'pool', 'own'],
    kinds: ['required', 'recommended', 'optional', 'own'],
    statuses: ['open', 'done', 'cannot', 'dropped', 'carried', 'expired'],
    evidence: ['log', 'journal', 'sighting', 'screenshot', 'tally', 'survey', 'record', 'doc', 'none']
  };
})();
