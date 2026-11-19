/* WordIdol: Article Pack config (W5). SPEC §12; survey facts SPEC §4, §13.4; sources: the syllabus texts.
   Pure data: runs unchanged in the browser, in Node (vm) and in Apps Script V8.
   `facts` are keys of WIPack.facts (pack.js). */
var root = (typeof window !== 'undefined') ? window : globalThis;

root.WI_ARTICLE = {
  version: '2026-11-19a',
  release: 3,
  opensOn: '2027-01-04',
  opensLabel: 'Mon 4 Jan 2027',
  principle: 'Marks are awarded for the quality of analysis and reflection, not for how widely a term spreads. A term that does not catch on, analysed well, can earn full marks.',
  deliverable: {
    name: 'Research article',
    due: '2027-02-12',
    dueLabel: 'Fri 12 Feb 2027',
    points: 30,
    format: 'An individual article written as if for journal publication: IMRaD structure, a 150–200-word abstract, 2,000–3,000 words, at least 6 sources and 3 data visuals, an ethics statement, and AI use declared.',
    draftDue: 'Fri 29 Jan 2027 (full draft for peer review)',
    note: 'Write the article itself in Google Docs (version history is kept) and submit it in Google Classroom. The Article Pack is for planning and for collecting your evidence.'
  },
  tabs: [
    { id: 'outline', label: 'Outline' },
    { id: 'sources', label: 'Sources' },
    { id: 'visuals', label: 'Visuals' },
    { id: 'draft', label: 'Sections' },
    { id: 'abstract', label: 'Abstract' },
    { id: 'ethics', label: 'Ethics' },
    { id: 'check', label: 'Check' }
  ],
  limits: {
    titleMax: 150,
    keywordsMax: 100,
    notesMax: 6000,
    abstractMin: 150,
    abstractMax: 200,
    wordsMin: 2000,
    wordsMax: 3000,
    sourcesMin: 6,
    apaMin: 20,
    useMin: 10,
    visualsMin: 3,
    ethicsMinWords: 60,
    aiMinWords: 10,
    peerNotesMinWords: 80,
    revisionPlanMinWords: 40,
    sectionPairMinWords: 300
  },
  statuses: [
    { id: 'planning', label: 'Planning' },
    { id: 'drafting', label: 'Drafting' },
    { id: 'in_review', label: 'In peer review' },
    { id: 'revising', label: 'Revising' },
    { id: 'submitted', label: 'Submitted' }
  ],
  // §12 IMRaD sections and the stored data offered as facts
  sections: [
    { id: 'intro', heading: 'Introduction', facts: ['word.card', 'plan.route', 'plan.theoryTags', 'word.fudge', 'word.hypotheses', 'article.sources'],
      prompt: 'What is your word, and why study it? What does the literature say about how words spread? What is your research question?',
      frameGroups: ['hypothesis', 'hedge'] },
    { id: 'methods', heading: 'Methods', facts: ['word.zb', 'plan.choices', 'plan.table', 'plan.variable', 'survey.design', 'evidence.process', 'rules.six'],
      prompt: 'What did you do in phase 1 and phase 2? How was the survey run? How did you record and check evidence?',
      frameGroups: ['describe_data'] },
    { id: 'results', heading: 'Results', facts: ['wave.series', 'sightings.byLevel', 'compare.phases', 'log.plannedDone', 'tallies.byWeek', 'hyp.checks', 'wave.decay'],
      prompt: 'What did the waves show, beside the controls and foils? What did your sightings and logs show in each phase? Report the numbers; save the meaning for the Discussion.',
      frameGroups: ['describe_data', 'compare'] },
    { id: 'discussion', heading: 'Discussion', facts: ['journal.failures', 'journal.zero', 'reviews.toChange', 'journal.summit', 'plan.keepStopStart', 'journal.theory'],
      prompt: 'What do your results mean? Which hypotheses were supported? What else could explain them? What are the limitations of your study?',
      frameGroups: ['hedge', 'limitation', 'reflect'] }
  ],
  sectionPairs: { MR: ['methods', 'results'], ID: ['intro', 'discussion'] },
  // Survey design facts (SPEC §4.1, §4.3, §13.4, §17 Q7)
  survey: {
    runBy: 'T.Chris ran the survey. It was anonymous, and the app shows class totals only.',
    waves: [
      { id: 'W1', label: 'Wave 1', when: 'Mon 23 – Tue 24 Nov 2026', purpose: 'baseline, before the campaigns launched in school' },
      { id: 'W2', label: 'Wave 2', when: 'Tue 8 – Wed 9 Dec 2026', purpose: 'after phase 1, before the Slang Summit' },
      { id: 'W3', label: 'Wave 3', when: 'week of 11 Jan 2027 (campaigns closed Fri 15 Jan)', purpose: 'after phase 2' },
      { id: 'W4', label: 'Wave 4', when: 'week of 1 Feb 2027', purpose: 'decay check, after the campaigns stopped' }
    ],
    controls: ['aura farming', 'crash out'],
    controlsNote: 'Control words are real slang words, used to compare with each new word.',
    foils: ['drovish', 'trelky'],
    foilsNote: 'Foil words are invented words that nobody uses. People who say they know a foil are guessing or overclaiming.',
    measures: [
      'Recognition = the share of respondents who said they knew the word.',
      'Comprehension = the share of all respondents who picked the correct meaning (every respondent answered it).',
      'Foil rate = the mean recognition of the two foil words.',
      'Corrected recognition = recognition minus the foil rate. For example, 40% minus 15% gives 25%. A result of 0 or below means we cannot tell real recognition from guessing.'
    ],
    formula: 'corrected recognition = recognition % − mean foil recognition %'
  },
  evidenceProcess: [
    'Each sighting has an Evidence Level from 0 to 6. Levels 0–1 are owned evidence; Levels 4–6 are earned evidence. Levels 2 and 3 come only from the survey.',
    'People are recorded by relation only (for example “a classmate”), never by name.',
    'From Thu 3 Dec, a classmate audited each student’s sightings: she agreed with the level, suggested a different level, or could not check it.',
    'T.Chris spot-checked a sample of sightings, and every disputed or unverifiable one. Where he set a level, that level is used.'
  ],
  // Ethics statement helper (§12): each tick adds one sentence to a draft she then edits.
  ethicsTicks: [
    { id: 'eth_names', label: 'No names recorded', sentence: 'No names were recorded; people were described only by their relation to me (for example, “a classmate”).' },
    { id: 'eth_survey', label: 'Survey anonymous and run by the teacher', sentence: 'The survey was anonymous and was run by the teacher, and only class totals were shared with me.' },
    { id: 'eth_rules', label: 'Six rules followed', sentence: 'I followed the six safe-campaigning rules of the course throughout the project.' },
    { id: 'eth_paid', label: 'No paid or traded use', sentence: 'No one was paid, given gifts or offered favours to use the word.' },
    { id: 'eth_problems', label: 'Problems reported', choice: true, options: [
      { id: 'none', sentence: 'No problems were reported during the campaign.' },
      { id: 'yes', sentence: 'When a problem happened, I stopped the activity and reported it to my teacher.' } ] },
    { id: 'eth_screens', label: 'Screenshots cropped', sentence: 'All screenshots were cropped to remove names, faces and usernames.' },
    { id: 'eth_ai', label: 'AI use declared', sentence: 'My use of AI tools is declared below, following the course AI-use policy.' }
  ],
  aiHint: 'At least 10 words. If you used no AI, you can write: “I did not use AI tools for any part of this article.”',
  sourceTypes: [
    { id: 'book', label: 'Book' },
    { id: 'article', label: 'Journal article' },
    { id: 'web', label: 'Website' },
    { id: 'dictionary', label: 'Dictionary' },
    { id: 'course', label: 'Course material' }
  ],
  apaNote: 'Use APA 7 style. Check each reference against the copy you read: the year, the edition and the page numbers.',
  // Starter list: the texts named in the course syllabus. Where the syllabus gives no year or page
  // numbers, the entry says so; she completes it from the copy she uses.
  starterSources: [
    { id: 'src-metcalf', type: 'book', apa: 'Metcalf, A. (2002). Predicting new words: The secrets of their success. Houghton Mifflin.', complete: true,
      useHint: 'The FUDGE scale for predicting whether a new word will last.' },
    { id: 'src-yule', type: 'book', apa: 'Yule, G. (n.d.). The study of language. Cambridge University Press.', complete: false,
      check: 'Add the year and edition of the copy you use.',
      useHint: 'Word-formation processes: blending, clipping, compounding, conversion, borrowing, coinage.' },
    { id: 'src-eble', type: 'book', apa: 'Eble, C. (1996). Slang and sociability. University of North Carolina Press.', complete: true,
      useHint: 'Student slang and belonging; student slang tends to be short.' },
    { id: 'src-mattiello', type: 'book', apa: 'Mattiello, E. (2008). An introduction to English slang. Polimetrica.', complete: true,
      useHint: 'A general introduction to English slang (look at its contents to choose the chapters you need).' },
    { id: 'src-eckert', type: 'article', apa: 'Eckert, P. (2012). Three waves of variation study. Annual Review of Anthropology, 41.', complete: false,
      check: 'Add the page numbers (and the DOI if you find it).',
      useHint: 'Communities of practice and variation, taught in L10.' }
  ],
  // Studies named in the course research notes. Not full references: she must find each one first.
  furtherLeads: [
    { id: 'lead-altmann', type: 'article', who: 'Altmann, Pierrehumbert and Motter (2011)', finding: 'The range of people and topics a word is used with predicts whether it grows.' },
    { id: 'lead-stewart', type: 'article', who: 'Stewart and Eisenstein (2018), “Making ‘fetch’ happen”', finding: 'Words used in more linguistic contexts grow faster and survive longer.' },
    { id: 'lead-eisenstein', type: 'article', who: 'Eisenstein et al. (2014)', finding: 'New words spread along demographic links between people.' }
  ],
  tools: [
    { id: 'tool-trends', type: 'web', name: 'Google Trends' },
    { id: 'tool-ngram', type: 'web', name: 'Google Books Ngram Viewer' },
    { id: 'tool-urban', type: 'dictionary', name: 'Urban Dictionary' },
    { id: 'tool-woty', type: 'dictionary', name: 'Oxford, Collins and Cambridge Words of the Year' }
  ],
  visualKinds: [
    { id: 'chart', label: 'Chart' },
    { id: 'table', label: 'Table' },
    { id: 'screenshot', label: 'Screenshot' }
  ],
  // §12 readiness: 9 ticks
  readiness: [
    { id: 'intro', label: 'Introduction notes' },
    { id: 'methods', label: 'Methods notes' },
    { id: 'results', label: 'Results notes' },
    { id: 'discussion', label: 'Discussion notes' },
    { id: 'abstract', label: 'Abstract of 150–200 words' },
    { id: 'sources', label: 'At least six sources' },
    { id: 'visuals', label: 'At least three labelled visuals' },
    { id: 'ethics', label: 'Ethics statement (at least 60 words)' },
    { id: 'ai', label: 'AI-use declaration' },
    { id: 'words', label: 'Word count 2,000–3,000' }
  ]
};
