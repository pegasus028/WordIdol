// WordIdol gamification data: XP rules, ranks, badges (SPEC §9). Owner: W4.
// The rule: XP, badges, ranks and streaks come only from documenting honestly.
// `reads` lists the data each rule or badge looks at; validator V9 refuses spread fields
// (level, finalLevel, count, audience, recognised, comprehended, sighting/tally/wave rows).
(function () {
  var root = (typeof window !== 'undefined') ? window : globalThis;

  var xpRules = [
    { id: 'X01', event: 'First step confirmed', xp: 20, eventKey: 'first', cap: 'once', reads: ['word.posConfirmed'] },
    { id: 'X02', event: 'Word card complete', xp: 30, eventKey: 'card', cap: 'once', reads: ['check:word.card'] },
    { id: 'X03', event: 'Zero-baseline record complete and word sent', xp: 20, eventKey: 'zb', cap: 'once', reads: ['check:word.zb', 'check:word.submitted'] },
    { id: 'X04', event: 'Plan saved with at least 3 planned actions', xp: 30, eventKey: 'plan:<phase>', cap: 'once per phase', reads: ['plans', 'planActions'] },
    { id: 'X05', event: 'Six rules ticked', xp: 10, eventKey: 'rules', cap: 'once', reads: ['state.rulesTicked'] },
    { id: 'X06', event: 'Action-log entry saved', xp: 10, eventKey: 'ac:<id>', cap: 'first 2 a day, 6 a week', perDay: 2, perWeek: 6, reads: ['actions'] },
    { id: 'X07', event: 'That entry has "learned" of 15 words or more', xp: 5, eventKey: 'acl:<id>', cap: 'as X06', perDay: 2, perWeek: 6, reads: ['actions.learned'] },
    { id: 'X08', event: 'Lab Book entry of 40 words or more (not zero_result or failure_analysis)', xp: 15, eventKey: 'jn:<id>', cap: '1 a day, 3 a week', perDay: 1, perWeek: 3, reads: ['journal'] },
    { id: 'X09', event: 'Zero-result week entry of 40 words or more', xp: 20, eventKey: 'zero:<weekId>', cap: '1 a week', perWeek: 1, reads: ['journal'] },
    { id: 'X10', event: 'A failed action analysed, 60 words or more', xp: 25, eventKey: 'fail:<weekId>', cap: '1 a week', perWeek: 1, reads: ['journal'] },
    { id: 'X11', event: 'Checklist item done', xp: null, xpFrom: 'item', eventKey: 'ck:<itemId>', cap: 'once per item', reads: ['checklist.status'] },
    { id: 'X12', event: 'Weekly review submitted', xp: 30, onTimeBonus: 10, eventKey: 'rv:<weekId>', cap: 'once a week', reads: ['reviews'] },
    { id: 'X13', event: '"Could not do" with a reason', xp: 3, eventKey: 'cant:<itemId>', cap: '3 a week', perWeek: 3, reads: ['checklist.status', 'checklist.reason'] },
    { id: 'X14', event: 'Audit completed', xp: 20, eventKey: 'au:<auditId>', cap: 'none', reads: ['audits.mine.status'] },
    { id: 'X15', event: 'Action logged as "Changed" or "Did not do it" with a reason', xp: 5, eventKey: 'acr:<id>', cap: 'as X06', perDay: 2, perWeek: 6, reads: ['actions.outcome', 'actions.outcomeReason'] },
    { id: 'X16', event: '(not used)', xp: 0, eventKey: '', cap: '', unused: true, reads: [] },
    { id: 'X17', event: 'Report helper marked ready', xp: 20, eventKey: 'rp:<type>', cap: '3 in total', total: 3, reads: ['reports.status'] },
    { id: 'X18', event: 'Summit: abstract in range 10; each rehearsal 10 (max 3); self-check complete 15', xp: null,
      parts: [{ eventKey: 'sm:abs', xp: 10 }, { eventKey: 'sm:reh:<n>', xp: 10, max: 3 }, { eventKey: 'sm:check', xp: 15 }],
      eventKey: 'sm:*', cap: 'as listed', reads: ['summit.abstract', 'summit.rehearsals', 'summit.selfCheck'] },
    { id: 'X19', event: 'Pivot card complete', xp: 30, eventKey: 'pivot', cap: 'once', reads: ['check:pivot.card'] },
    { id: 'X20', event: 'Reviewer notes written', xp: 20, eventKey: 'peer:<n>', cap: '2', total: 2, reads: ['article.peer'] }
  ];

  var ranks = [
    { id: 'r1', name: 'Trainee', min: 0 },
    { id: 'r2', name: 'Rookie', min: 100 },
    { id: 'r3', name: 'Backing Vocalist', min: 250 },
    { id: 'r4', name: 'Opening Act', min: 450 },
    { id: 'r5', name: 'Soloist', min: 700 },
    { id: 'r6', name: 'Headliner', min: 1000 },
    { id: 'r7', name: 'Tour Legend', min: 1350 },
    { id: 'r8', name: 'Hall of Famer', min: 1750 }
  ];

  var badges = [
    { id: 'B01', name: 'First Audition', hint: 'Confirm your first step.', trigger: 'first step confirmed', reads: ['word.posConfirmed'] },
    { id: 'B02', name: 'Word Card', hint: 'Finish your word card.', trigger: 'word.card true', reads: ['check:word.card'] },
    { id: 'B03', name: 'Clean Slate', hint: 'Finish your zero-baseline record with at least one screenshot.', trigger: 'zero-baseline record complete with at least 1 screenshot', reads: ['check:word.zb', 'word.zb.fileIds', 'files.attachType'] },
    { id: 'B04', name: 'Rule Keeper', hint: 'Tick the six rules.', trigger: 'six rules ticked', reads: ['state.rulesTicked'] },
    { id: 'B05', name: 'Stage Plan', hint: 'Plan at least three actions.', trigger: 'plan.actions3 true', reads: ['planActions'] },
    { id: 'B06', name: 'First Log', hint: 'Log your first action.', trigger: '1 action-log entry', reads: ['actions'] },
    { id: 'B07', name: 'Honest Zero', hint: 'Write a zero-result week entry of 40 words or more.', trigger: '1 journal entry of kind zero_result, 40 words or more', reads: ['journal'] },
    { id: 'B08', name: 'Most Honest Failure', hint: 'Analyse a failed action in 100 words or more.', trigger: '1 journal entry of kind failure_analysis, 100 words or more', reads: ['journal'] },
    { id: 'B09', name: 'Plot Twist', hint: 'Log three actions that changed or did not happen, each with a reason.', trigger: '3 action entries with outcome changed or not_done, each with a reason', reads: ['actions.outcome', 'actions.outcomeReason'] },
    { id: 'B10', name: 'Reflector', hint: 'Write five Lab Book entries of 40 words or more.', trigger: '5 Lab Book entries of 40 words or more', reads: ['journal'] },
    { id: 'B11', name: 'Deep Thinker', hint: 'Write one Lab Book entry of 200 words or more.', trigger: '1 Lab Book entry of 200 words or more', reads: ['journal'] },
    { id: 'B12', name: 'Three in a Row', hint: 'Do your weekly review three weeks in a row.', trigger: 'review streak 3', reads: ['reviews'] },
    { id: 'B13', name: 'Six in a Row', hint: 'Do your weekly review six weeks in a row.', trigger: 'review streak 6', reads: ['reviews'] },
    { id: 'B14', name: 'Fair Judge', hint: 'Complete two audits.', trigger: '2 audits completed', reads: ['audits.mine.status'] },
    { id: 'B15', name: 'Theory Linker', hint: 'Link five planned actions to a theory idea.', trigger: '5 planned actions with a theoryTag', reads: ['planActions.theoryTag'] },
    { id: 'B16', name: 'Hypothesis Checker', hint: 'Give every hypothesis a status for Wave 2.', trigger: 'every hypothesis has a status for Wave 2 (any status counts)', reads: ['word.hypotheses', 'waveNotes.hypothesisChecks'] },
    { id: 'B17', name: 'Ready for the Stage', hint: 'Finish the Summit self-check and save two rehearsals.', trigger: 'Summit self-check complete and 2 rehearsals saved', reads: ['summit.selfCheck', 'summit.rehearsals'] },
    { id: 'B18', name: 'Second Take', hint: 'Finish your Pivot card.', trigger: 'Pivot card complete', reads: ['check:pivot.card'] },
    { id: 'B19', name: 'Peer Reviewer', hint: 'Write both reviewer notes.', trigger: 'both reviewer notes written', reads: ['article.peer'] },
    { id: 'B20', name: 'Full Record', hint: 'Write Lab Book entries in ten different weeks.', trigger: 'Lab Book entries in 10 different weeks', reads: ['journal.weekId'] }
  ];

  // Fields that must never feed XP, badges or ranks (validator V9).
  var forbiddenReads = ['level', 'finalLevel', 'count', 'audience', 'recognised', 'comprehended', 'notSure', 'n', 'sightings', 'tallies', 'waves'];

  root.WI_GAME = { xpRules: xpRules, ranks: ranks, badges: badges, forbiddenReads: forbiddenReads };
})();
