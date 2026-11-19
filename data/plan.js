// WordIdol master plan: weeks, lessons, stages, milestones (SPEC §4). Owner: W4.
// Pure data. Runs in the browser, in Node (vm) and in Apps Script V8.
(function () {
  var root = (typeof window !== 'undefined') ? window : globalThis;

  var weeks = [
    { id: 'W01', start: '2026-11-16', end: '2026-11-22', lessons: ['L6', 'L7'], light: false, phase: 1,
      notes: 'Fri 20 Sport Day. Sat 21 Nov: launch in person.' },
    { id: 'W02', start: '2026-11-23', end: '2026-11-29', lessons: ['L8', 'L9'], light: false, phase: 1,
      notes: 'Wave 1 Mon–Tue 23–24. Baseline report Wed 25. L9 safety briefing Thu 26.' },
    { id: 'W03', start: '2026-11-30', end: '2026-12-06', lessons: ['L10', 'L11'], light: false, phase: 1,
      notes: 'Sat 5 Dec holiday.' },
    { id: 'W04', start: '2026-12-07', end: '2026-12-13', lessons: ['L12'], light: false, phase: 1,
      notes: 'Mon 7, Thu 10 and Fri 11 Dec holidays. Wave 2 Tue 8 – Wed 9.' },
    { id: 'W05', start: '2026-12-14', end: '2026-12-20', lessons: ['L13', 'L14'], light: false, phase: 1,
      notes: 'Intermediate report Mon 14. Slides and abstract Tue 15. Slang Summit. Lab Book (before midterm) to Fri 18.' },
    { id: 'W06', start: '2026-12-21', end: '2026-12-27', lessons: [], light: true, phase: 2,
      notes: 'Midterm exams. Light week.' },
    { id: 'W07', start: '2026-12-28', end: '2027-01-03', lessons: ['L15'], light: true, phase: 2,
      notes: 'Thu 31 Dec and Fri 1 Jan holidays. Light week. Pivot starts in L15.' },
    { id: 'W08', start: '2027-01-04', end: '2027-01-10', lessons: ['L16', 'L17'], light: false, phase: 2,
      notes: 'Phase 2 relaunch.' },
    { id: 'W09', start: '2027-01-11', end: '2027-01-17', lessons: ['L18', 'L19'], light: false, phase: 2,
      notes: 'Wave 3. Campaigns close Fri 15.' },
    { id: 'W10', start: '2027-01-18', end: '2027-01-24', lessons: ['L20', 'L21'], light: false, phase: 2,
      notes: 'Final assessment report Fri 22.' },
    { id: 'W11', start: '2027-01-25', end: '2027-01-31', lessons: ['L22', 'L23'], light: false, phase: 2,
      notes: 'Article draft for peer review Fri 29.' },
    { id: 'W12', start: '2027-02-01', end: '2027-02-07', lessons: ['L24', 'L25'], light: false, phase: 2,
      notes: 'Peer review. Wave 4 (decay check).' },
    { id: 'W13', start: '2027-02-08', end: '2027-02-14', lessons: ['L26', 'L27'], light: false, phase: 2,
      notes: 'Research article Fri 12 Feb. Plan ends Fri 12 Feb.' }
  ];
  // Note: W05 starts in phase 1; phase 2 begins Fri 18 Dec (inside W05). `phase` above is the phase
  // of the week's Monday except W05, whose Monday is phase 1. Entries take their phase from their date.

  var lessons = [
    { id: 'L1', date: '2026-10-29', topic: 'Course launch, "fetch", Ethics Charter' },
    { id: 'L2', date: '2026-11-04', topic: 'Word formation' },
    { id: 'L3', date: '2026-11-05', topic: 'Word formation' },
    { id: 'L4', date: '2026-11-11', topic: 'Life cycle of a word, FUDGE, register the term' },
    { id: 'L5', date: '2026-11-12', topic: 'Life cycle of a word, FUDGE, register the term' },
    { id: 'L6', date: '2026-11-18', topic: 'Research and survey design, ethics' },
    { id: 'L7', date: '2026-11-19', topic: 'Research and survey design, ethics' },
    { id: 'L8', date: '2026-11-25', topic: 'Why things spread: diffusion, social proof, STEPPS' },
    { id: 'L9', date: '2026-11-26', topic: 'Launch pitch and safe-campaigning briefing' },
    { id: 'L10', date: '2026-12-02', topic: 'Networks and communities (network map)' },
    { id: 'L11', date: '2026-12-03', topic: 'Tracking evidence' },
    { id: 'L12', date: '2026-12-09', topic: 'Who owns slang; Wave 2; presentation workshop' },
    { id: 'L13', date: '2026-12-16', topic: 'Slang Summit' },
    { id: 'L14', date: '2026-12-17', topic: 'Slang Summit' },
    { id: 'L15', date: '2026-12-30', topic: 'Pivot and Relaunch' },
    { id: 'L16', date: '2027-01-06', topic: 'Anatomy of a research article (IMRaD)' },
    { id: 'L17', date: '2027-01-07', topic: 'Anatomy of a research article (IMRaD)' },
    { id: 'L18', date: '2027-01-13', topic: 'Literature review, citation, academic integrity' },
    { id: 'L19', date: '2027-01-14', topic: 'Literature review, citation, academic integrity' },
    { id: 'L20', date: '2027-01-20', topic: 'Data analysis and visualisation' },
    { id: 'L21', date: '2027-01-21', topic: 'Data analysis and visualisation' },
    { id: 'L22', date: '2027-01-27', topic: 'Results and discussion: claims, evidence, hedging' },
    { id: 'L23', date: '2027-01-28', topic: 'Results and discussion: claims, evidence, hedging' },
    { id: 'L24', date: '2027-02-03', topic: 'Peer review: mock editorial board' },
    { id: 'L25', date: '2027-02-04', topic: 'Peer review: mock editorial board' },
    { id: 'L26', date: '2027-02-10', topic: 'Abstracts, titles, final revision' },
    { id: 'L27', date: '2027-02-11', topic: 'Final revision and celebration' }
  ];

  var stages = [
    { id: 's1', name: 'Audition', opens: null,
      what: 'First step, word card, zero-baseline record, send for approval, FUDGE prediction, hypotheses',
      gate: 'none' },
    { id: 's2', name: 'Debut plan', opens: null,
      what: 'Choices, six rules, plan table, Baseline report',
      gate: 'First step confirmed' },
    { id: 's3', name: 'Fan club', opens: '2026-11-21',
      what: 'In-person launch; first actions, sightings, Lab Book',
      gate: 'Six rules ticked and plan saved with at least 3 planned actions' },
    { id: 's4', name: 'On tour', opens: '2026-11-26',
      what: 'Wider channels; online actions if unlocked; network map; audits',
      gate: 'Fan club reached, at least 3 action-log entries and at least 1 weekly review' },
    { id: 's5', name: 'Charts', opens: '2026-11-23',
      what: 'Wave results, FUDGE dashboard, tallies, hypothesis checks, Intermediate report',
      gate: 'Fan club reached and Wave 1 published' },
    { id: 's6', name: 'Summit stage', opens: '2026-12-07',
      what: 'Summit Pack, abstract, rehearsal, the talk, midway review and replan',
      gate: 'Fan club reached and the date is Mon 7 Dec or later' },
    { id: 's7', name: 'Encore', opens: '2026-12-18',
      what: 'Pivot, phase 2, Waves 3–4, Final report, Article Pack, peer review',
      gate: 'The date is Fri 18 Dec or later' }
  ];

  var milestones = [
    { id: 'M01', date: '2026-11-21', title: 'Launch your slang word (in person)', kind: 'launch',
      stageId: 's3', weekId: 'W01', lessons: [], needs: 'Six rules ticked and a plan with at least three actions.' },
    { id: 'M02', date: '2026-11-23', endDate: '2026-11-24', title: 'Wave 1 survey (T.Chris runs it)', kind: 'wave',
      stageId: 's5', weekId: 'W02', lessons: [], needs: 'Nothing from you: T.Chris runs the survey.' },
    { id: 'M03', date: '2026-11-25', title: 'Baseline assessment report due', kind: 'report', points: 5,
      stageId: 's2', weekId: 'W02', lessons: ['L8'],
      needs: '600–900 words: term profile, FUDGE predictions and hypotheses, Wave 1 baseline data, campaign and safety plan.' },
    { id: 'M04', date: '2026-11-26', title: 'L9 safety briefing; online actions can open', kind: 'safety',
      stageId: 's4', weekId: 'W02', lessons: ['L9'], needs: 'All six rules ticked.' },
    { id: 'M05', date: '2026-12-08', endDate: '2026-12-09', title: 'Wave 2 survey', kind: 'wave',
      stageId: 's5', weekId: 'W04', lessons: ['L12'], needs: 'Nothing from you: T.Chris runs the survey.' },
    { id: 'M06', date: '2026-12-14', title: 'Intermediate assessment report due', kind: 'report', points: 5,
      stageId: 's5', weekId: 'W05', lessons: [],
      needs: 'Wave 2 data, campaign log, early analysis against hypotheses, planned adjustments.' },
    { id: 'M07', date: '2026-12-15', title: 'Summit slides and 50-word abstract due', kind: 'summit',
      stageId: 's6', weekId: 'W05', lessons: [], needs: 'Slides and a 50-word abstract.' },
    { id: 'M08', date: '2026-12-16', endDate: '2026-12-17',
      title: 'Slang Summit: 7 min + 2 min Q&A (midterm). Also your midway review and replan.',
      kind: 'deliverable', points: 20, deliverable: true, stageId: 's6', weekId: 'W05', lessons: ['L13', 'L14'],
      needs: 'An individual conference-style talk: approach, theory applied, evidence, learnings and Phase 2 plan. 7:00 talk + 2:00 Q&A; four talks in L13 and four in L14; two classmates and T.Chris ask the questions.' },
    { id: 'M09', date: '2026-12-18', title: 'Lab Book check (before midterm)', kind: 'labbook', points: 15,
      pointsNote: 'with participation', stageId: 's6', weekId: 'W05', lessons: [],
      needs: 'Every log and reflection up to date.' },
    { id: 'M10', date: '2026-12-21', endDate: '2027-01-03', title: 'Exams and New Year: light, optional weeks',
      kind: 'light', stageId: 's7', weekId: 'W06', lessons: [], needs: 'Nothing required.' },
    { id: 'M11', date: '2026-12-30', title: 'Pivot and Relaunch (L15): phase 2 design', kind: 'pivot',
      stageId: 's7', weekId: 'W07', lessons: ['L15'], needs: 'Your Pivot card: keep, stop, start.' },
    { id: 'M12', date: '2027-01-11', endDate: '2027-01-15', title: 'Wave 3 survey; campaigns close', kind: 'wave',
      stageId: 's7', weekId: 'W09', lessons: ['L18', 'L19'], needs: 'A last log entry and a close-out summary by Fri 15 Jan.' },
    { id: 'M13', date: '2027-01-22', title: 'Final assessment report due', kind: 'report', points: 5,
      stageId: 's7', weekId: 'W10', lessons: ['L21'],
      needs: 'Wave 3 data, Phase 1 vs Phase 2 comparison, campaign close-out.' },
    { id: 'M14', date: '2027-01-29', title: 'Article draft due for peer review', kind: 'draft',
      stageId: 's7', weekId: 'W11', lessons: ['L23'], needs: 'A full draft of your article.' },
    { id: 'M15', date: '2027-02-01', endDate: '2027-02-04', title: 'Wave 4 (decay check); peer review: two reviewer reports',
      kind: 'wave + review', points: 5, stageId: 's7', weekId: 'W12', lessons: ['L24', 'L25'],
      needs: 'Two reviewer reports.' },
    { id: 'M16', date: '2027-02-12', title: 'Research article due (final). Lab Book closes.', kind: 'deliverable',
      points: 30, pointsNote: '+15 Lab Book', deliverable: true, stageId: 's7', weekId: 'W13', lessons: ['L26', 'L27'],
      needs: 'Written as if for journal publication: IMRaD; 150–200-word abstract; 2,000–3,000 words; at least 6 sources; at least 3 data visuals; ethics statement; AI use declared.' }
  ];

  var holidays = ['2026-11-20', '2026-12-05', '2026-12-07', '2026-12-10', '2026-12-11', '2026-12-31', '2027-01-01'];

  root.WI_PLAN = {
    start: '2026-11-16',
    end: '2027-02-14',
    planEnds: '2027-02-12',
    tz: '+07:00',
    tzMinutes: 420,
    phase2Start: '2026-12-18',
    onlineOpensAtDefault: '2026-11-26T16:30:00+07:00',
    weeks: weeks,
    lessons: lessons,
    stages: stages,
    milestones: milestones,
    holidays: holidays,
    phases: [
      { phase: 1, name: 'Cycle 1', from: '2026-11-16', to: '2026-12-17' },
      { phase: 2, name: 'Cycle 2', from: '2026-12-18', to: '2027-02-14' }
    ]
  };
})();
