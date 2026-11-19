/* WordIdol: Summit Pack config (W5). SPEC §11 (7:00 talk + 2:00 Q&A, Chris 19 Nov).
   Pure data: runs unchanged in the browser, in Node (vm) and in Apps Script V8.
   Ids are fixed: section ids (§11.1), qa-nn, SC1-SC5, chart ids (§11.3).
   `facts` are keys of WIPack.facts (pack.js). `frameGroups` are FRAMES groups (data/frames.js). */
var root = (typeof window !== 'undefined') ? window : globalThis;

root.WI_SUMMIT = {
  version: '2026-11-19a',
  release: 2,
  opensOn: '2026-12-07',
  opensLabel: 'Mon 7 Dec 2026',
  principle: 'Marks are awarded for the quality of analysis and reflection, not for how widely a term spreads. A term that does not catch on, analysed well, can earn full marks.',
  event: {
    name: 'Slang Summit',
    dates: 'Wed 16 – Thu 17 Dec 2026 (L13 and L14)',
    points: 20,
    format: 'Individual conference-style talk: approach, theory applied, evidence, learnings and Phase 2 plan.',
    slots: 'Four talks in L13 and four in L14. T.Chris sets the order.',
    questioners: 'Each talk has two assigned student questioners plus T.Chris. There are no outside judges.'
  },
  talkSec: 420,
  qaSec: 120,
  amberSec: 360,
  wordsPerMinute: 130,
  tabs: [
    { id: 'outline', label: 'Outline' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'visuals', label: 'Visuals' },
    { id: 'abstract', label: 'Abstract' },
    { id: 'qa', label: 'Q&A' },
    { id: 'check', label: 'Check' },
    { id: 'rehearse', label: 'Rehearse' },
    { id: 'export', label: 'Export' }
  ],
  // §11.1: timings fixed, sum 420 s. runningSec = end time of the part.
  sections: [
    { id: 'hook', part: 'Hook', timeSec: 30, runningSec: 30, slides: 1, wordGuide: 65,
      facts: ['word.basic', 'summit.quote'],
      frameGroups: [],
      prompt: 'Open with your word in a real moment: an example sentence or a quote from a sighting. Then say what it means.',
      slideTitle: '{word}: {meaning}' },
    { id: 'term', part: 'Term and theory', timeSec: 75, runningSec: 105, slides: 2, wordGuide: 160,
      facts: ['word.card', 'plan.route', 'word.fudge', 'word.hypotheses'],
      frameGroups: ['hypothesis'],
      prompt: 'Explain your word: its part of speech, how it was formed and what it is for. Then the theory: your FUDGE prediction and your hypotheses.',
      slideTitle: 'My term and the theory' },
    { id: 'approach', part: 'Campaign approach', timeSec: 75, runningSec: 180, slides: 1, wordGuide: 160,
      facts: ['plan.choices', 'plan.table', 'log.plannedDone', 'rules.six'],
      frameGroups: ['reflect'],
      prompt: 'Who was your crowd? What did you do, where, and why? Link each action to one theory idea. Say how you kept safe.',
      slideTitle: 'My campaign' },
    { id: 'evidence', part: 'Evidence by level', timeSec: 105, runningSec: 285, slides: 2, wordGuide: 225,
      facts: ['wave.series', 'sightings.byLevel', 'hyp.checks'],
      frameGroups: ['describe_data', 'hedge'],
      prompt: 'Show your wave results beside the controls and foils, and your evidence by level. Check each hypothesis. Say what the data do not show.',
      slideTitle: 'My evidence' },
    { id: 'learnings', part: 'Learnings', timeSec: 75, runningSec: 360, slides: 1, wordGuide: 160,
      facts: ['journal.failures', 'journal.zero', 'reviews.toChange', 'summit.aoa'],
      frameGroups: ['failure', 'reflect'],
      prompt: 'What worked, what did not, and why? A careful analysis of what went wrong is as useful as a success.',
      slideTitle: 'What I learned' },
    { id: 'phase2', part: 'Phase 2 plan', timeSec: 60, runningSec: 420, slides: 1, wordGuide: 130,
      facts: ['report.adjust', 'plan.variable'],
      frameGroups: ['plan_change'],
      prompt: 'What one thing will you change in phase 2, and what do you predict will happen?',
      slideTitle: 'Phase 2 plan' }
  ],
  closingSlide: 'Questions?',
  slideCount: 9,
  notesMaxChars: 1500,
  notesMinWords: 20,
  amberRatio: 1.15,
  slideBullets: 4,
  // §11.2
  levels: {
    sightingLevels: [0, 1, 4, 5, 6],
    surveyLevels: [2, 3],
    builder: 'My strongest evidence is Level ___, because ___; what I do not have yet is ___.',
    frameGroups: ['describe_data', 'hedge'],
    note: 'Levels 2 and 3 come from the survey, never from a sighting. Where T.Chris has checked a sighting, his level is used.'
  },
  // §11.3
  charts: [
    { id: 'ch_waves', title: 'Recognition by wave', caption: 'Recognition, corrected recognition and comprehension of my word in each survey wave.' },
    { id: 'ch_compare', title: 'My word beside the controls and foils', caption: 'Recognition in one survey wave: my word, the two control words and the two foil words.' },
    { id: 'ch_levels', title: 'Sightings by Evidence Level', caption: 'My sightings at each Evidence Level, owned and earned.' },
    { id: 'ch_actions', title: 'Actions by week', caption: 'Planned actions and the actions I did each week, in person and online.' },
    { id: 'ch_fudge', title: 'My FUDGE prediction', caption: 'My FUDGE scores (0–2 for each letter). This is my judgement, not a measurement.' },
    { id: 'ch_tallies', title: 'Tallies by week', caption: 'My tally counts each week, by type.' }
  ],
  minCharts: 1,
  maxScreenshots: 4,
  screenshotReminder: 'Check each screenshot: names, faces and usernames must be cropped out.',
  png: { width: 1600, height: 900, fileName: 'wordidol-{chartId}-{word}.png' },
  // §11.4
  abstract: {
    minWords: 45,
    maxWords: 55,
    label: 'About 50 words (45–55).',
    frame: ['Aim: what did you want to find out?', 'Method: what did you do and measure?', 'Main result: what happened?', 'Meaning: what does it tell us about how words spread?']
  },
  // §11.6
  aoa: {
    minWords: 25,
    maxWords: 120,
    frame: 'My word did / did not spread as I predicted. What I can show is ___ . What I learned about how words spread is ___ .'
  },
  ratings: [
    { id: 'not_yet', label: 'Not yet' },
    { id: 'nearly', label: 'Nearly' },
    { id: 'ready', label: 'Ready' }
  ],
  selfCheckNoteMax: 200,
  selfCheckNote: 'This is a self-check. It shows no score.',
  descriptorPending: 'The full ASM-04 wording will appear here when T.Chris adds the rubric.',
  selfCheck: [
    { id: 'SC1', name: 'Content and theory', points: 6, syllabus: 'approach, theory applied and Phase 2 plan', feeds: ['SUM-C1', 'SUM-PH2'], descriptor: null },
    { id: 'SC2', name: 'Evidence and analysis', points: 6, syllabus: 'evidence and learnings', feeds: ['SUM-C2', 'SUM-LEARN'], descriptor: null },
    { id: 'SC3', name: 'Delivery and visuals', points: 4, syllabus: 'a conference-style talk of 7 minutes', feeds: ['SUM-C3'], descriptor: null },
    { id: 'SC4', name: 'Q&A', points: 4, syllabus: 'academic Q&A, 2 minutes', feeds: ['SUM-C4'], descriptor: null },
    { id: 'SC5', name: 'Analysis over adoption', points: null, syllabus: 'Marks are awarded for the quality of analysis and reflection, not for how widely a term spreads.', feeds: ['SUM-AOA'], descriptor: null, usesStatement: true }
  ],
  // §11.5
  qaMinPicks: 5,
  qaAnswerMinWords: 15,
  qaAnswerMaxWords: 120,
  askMeOneSec: 30,
  qaTags: [
    { id: 'theory', label: 'Theory' },
    { id: 'method', label: 'Method' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'ethics', label: 'Ethics and safety' },
    { id: 'failure', label: 'What did not work' },
    { id: 'phase2', label: 'Phase 2' }
  ],
  qa: [
    { id: 'qa-01', tag: 'theory', q: 'Which theory explains best what happened to your word?', frame: 'I think ___ explains it best. For example, ___. This fits the idea that ___.' },
    { id: 'qa-02', tag: 'theory', q: 'How does FUDGE help you predict whether your word will last?', frame: 'FUDGE looks at ___. I gave my word ___ for ___ because ___. It is a prediction, not a measurement.' },
    { id: 'qa-03', tag: 'theory', q: 'Why do a few new words spread while most disappear?', frame: 'Most new words are never heard again. Words that spread usually ___. For example, ___.' },
    { id: 'qa-04', tag: 'theory', q: 'Did weak ties or bridge people help your word reach a new group?', frame: 'A bridge person belongs to two groups. In my campaign, ___. This suggests that ___.' },
    { id: 'qa-05', tag: 'method', q: 'How did you measure whether people know your word?', frame: 'T.Chris ran a survey in four waves. It showed ___. I also recorded sightings at each Evidence Level, for example ___.' },
    { id: 'qa-06', tag: 'method', q: 'Why did the survey include control words and foil words?', frame: 'The control words, aura farming and crash out, show ___. The foils, drovish and trelky, are not real words, so ___.' },
    { id: 'qa-07', tag: 'method', q: 'How did you record sightings without writing anyone’s name?', frame: 'I used relation words like “a classmate” or “a cousin”. For each sighting I recorded ___.' },
    { id: 'qa-08', tag: 'method', q: 'How do you know a sighting was unprompted?', frame: 'For each sighting I noted whether I asked them to use it. This one was ___, because ___.' },
    { id: 'qa-09', tag: 'evidence', q: 'How do you know people really know your word and are not just guessing?', frame: 'I compare it with the foil words. ___% said they knew the foils, so the corrected figure is ___%.' },
    { id: 'qa-10', tag: 'evidence', q: 'What is your strongest piece of evidence, and what Level is it?', frame: 'My strongest evidence is Level ___, because ___. What I do not have yet is ___.' },
    { id: 'qa-11', tag: 'evidence', q: 'What is the difference between your owned and your earned evidence?', frame: 'Owned evidence is ___, for example ___. Earned evidence is ___. Most of my evidence is ___.' },
    { id: 'qa-12', tag: 'evidence', q: 'Your sample is small. How sure can you be about your results?', frame: 'That’s a fair point; it’s one of the limitations of my study. With only ___ respondents, ___.' },
    { id: 'qa-13', tag: 'ethics', q: 'How did you keep yourself safe during the campaign?', frame: 'I followed the six rules. For example, ___. I started in person, with people I know.' },
    { id: 'qa-14', tag: 'ethics', q: 'Why does paid or traded use not count as real use?', frame: 'If someone uses a word because of a payment or a favour, ___. That would give me false data.' },
    { id: 'qa-15', tag: 'ethics', q: 'Who owns slang? Does your word take anything from another group?', frame: 'My word comes from ___. I think giving credit matters because ___.' },
    { id: 'qa-16', tag: 'ethics', q: 'How did you protect other people’s privacy in your data?', frame: 'I never wrote full names or usernames. My screenshots ___. The survey was anonymous and run by T.Chris.' },
    { id: 'qa-17', tag: 'failure', q: 'What did not work, and why do you think it failed?', frame: '___ did not work. One possible explanation is that ___. I learned that ___.' },
    { id: 'qa-18', tag: 'failure', q: 'Did anything you did make people stop using the word?', frame: 'I think ___ may have slowed it down, because ___. For example, ___.' },
    { id: 'qa-19', tag: 'failure', q: 'If you did the project again, what would you change?', frame: 'If I did it again, I would ___, because ___.' },
    { id: 'qa-20', tag: 'failure', q: 'What surprised you most?', frame: 'What surprised me most was ___, which suggests ___.' },
    { id: 'qa-21', tag: 'phase2', q: 'What one thing will you change in phase 2, and why only one?', frame: 'In phase 2, I will change ___ and keep the rest the same, so I can see whether ___.' },
    { id: 'qa-22', tag: 'phase2', q: 'What is your hypothesis for phase 2?', frame: 'I predict that ___ will ___, because ___. I will check it with ___.' },
    { id: 'qa-23', tag: 'phase2', q: 'Which group will you try next, and how will the word reach them?', frame: 'My next group is ___. The word could reach them through ___, for example a friend who is in both groups.' },
    { id: 'qa-24', tag: 'phase2', q: 'How will you know whether phase 2 worked better than phase 1?', frame: 'I will compare ___ in Wave 3 with Wave 2, and my sightings at Level ___.' }
  ],
  // §11.7
  rehearsal: {
    maxSaved: 20,
    storageKey: 'wi.timer.summit',
    xpMax: 3
  },
  readiness: [
    { id: 'sections', label: 'All six parts of the outline filled in' },
    { id: 'abstract', label: 'Abstract of 45–55 words' },
    { id: 'chart', label: 'At least one chart chosen' },
    { id: 'qa5', label: 'At least five Q&A answers' },
    { id: 'selfcheck', label: 'Self-check complete' },
    { id: 'aoa', label: 'Analysis-over-adoption statement written' },
    { id: 'rehearsed2', label: 'Two timed rehearsals' },
    { id: 'slides', label: 'Slides submitted (checklist item F-W05-03)' }
  ]
};
