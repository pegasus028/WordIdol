// WordIdol schema: Sheet tabs, column types, form field limits, enums and API action list.
// Owner: W1. Read by the client (W2) and, through apps-script/Shared.gs, by the server.
// Runs unchanged in the browser, in Node (vm, window = globalThis) and in Apps Script V8.
// SPEC.md v0.2 §2, §5, §7, §8. Ids and column names here are fixed: do not rename.
(function () {
  var root = (typeof window !== 'undefined') ? window : globalThis;

  // ---------------------------------------------------------------- tabs (§7)
  var tabs = {
    State: ['studentId', 'weekId', 'stage', 'xp', 'streak', 'bestStreak', 'lastReviewWeek', 'reviewsDue', 'rulesTicked', 'onlineUnlocked', 'onlineUnlockedBy', 'onlineUnlockedAt', 'badges', 'lastActivityAt', 'fileCount', 'updatedAt'],
    Words: ['studentId', 'createdAt', 'updatedAt', 'word', 'meaning', 'example1', 'pos', 'posGuess', 'posRule', 'posConfidence', 'posConfirmed', 'posAlso', 'usageRules', 'forms', 'pronunciation', 'formation', 'sourceWords', 'example2', 'example3', 'doNotUse', 'purpose', 'notRudeConfirmed', 'fudge', 'specSheet', 'researchQuestion', 'hypotheses', 'zb', 'regStatus', 'regSubmittedAt', 'regDecidedAt', 'regComment'],
    WordHistory: ['id', 'studentId', 'at', 'field', 'oldValue', 'newValue'],
    Plans: ['id', 'studentId', 'phase', 'createdAt', 'updatedAt', 'targetGroups', 'ideas', 'platforms', 'platformOther', 'route', 'timeBudget', 'who', 'why', 'what', 'spark', 'projectAccount', 'keep', 'stop', 'start', 'variableChanged', 'p2Hypothesis'],
    PlanActions: ['id', 'studentId', 'createdAt', 'updatedAt', 'deleted', 'phase', 'where', 'ideaId', 'what', 'why', 'theoryTag', 'whenDate', 'weekId', 'evidence', 'targetGroup', 'status', 'actionId'],
    Checklist: ['id', 'studentId', 'weekId', 'itemId', 'title', 'kind', 'source', 'status', 'originWeek', 'carryCount', 'dueDate', 'doneAt', 'doneBy', 'reason', 'refId', 'createdAt', 'updatedAt'],
    Reviews: ['id', 'studentId', 'weekId', 'submittedAt', 'onTime', 'wentWell', 'toChange', 'decisions', 'nextPrefs', 'counts'],
    Actions: ['id', 'studentId', 'createdAt', 'updatedAt', 'deleted', 'date', 'weekId', 'phase', 'planActionId', 'channelId', 'ideaId', 'what', 'outcome', 'outcomeReason', 'audience', 'reaction', 'learned', 'problem', 'fileIds'],
    Journal: ['id', 'studentId', 'createdAt', 'updatedAt', 'deleted', 'date', 'weekId', 'phase', 'kind', 'promptId', 'text', 'wordCount', 'fileIds'],
    Sightings: ['id', 'studentId', 'createdAt', 'updatedAt', 'deleted', 'date', 'weekId', 'phase', 'channelId', 'relation', 'quote', 'context', 'prompted', 'marked', 'topic', 'posUsed', 'derivedForm', 'level', 'owned', 'link', 'verifiable', 'fileIds', 'auditId', 'auditStatus', 'spotStatus', 'finalLevel'],
    Tallies: ['id', 'studentId', 'createdAt', 'updatedAt', 'deleted', 'date', 'weekId', 'tallyType', 'count', 'context', 'note'],
    Files: ['id', 'studentId', 'createdAt', 'deleted', 'driveFileId', 'bytes', 'width', 'height', 'attachType', 'attachId', 'caption', 'cropConfirmed', 'inSummit', 'inArticle'],
    Waves: ['id', 'waveId', 'termKey', 'termText', 'n', 'recognised', 'notSure', 'comprehended', 'date', 'classesNote', 'published', 'updatedAt'],
    WaveNotes: ['id', 'studentId', 'waveId', 'note', 'hypothesisChecks', 'fileIds', 'updatedAt'],
    Requests: ['id', 'studentId', 'createdAt', 'type', 'ideaId', 'text', 'status', 'decidedAt', 'teacherComment'],
    Flags: ['id', 'studentId', 'createdAt', 'category', 'note', 'stoppedConfirmed', 'status', 'handledAt', 'teacherNote'],
    Feedback: ['id', 'studentId', 'createdAt', 'targetType', 'targetId', 'text', 'readAt'],
    Reports: ['id', 'studentId', 'type', 'sections', 'wordCount', 'status', 'updatedAt'],
    Summit: ['studentId', 'updatedAt', 'sections', 'abstract', 'aoaStatement', 'chartIds', 'fileIds', 'levelPicks', 'qa', 'selfCheck', 'rehearsals', 'feedbackNotes'],
    Article: ['studentId', 'updatedAt', 'title', 'keywords', 'abstract', 'sections', 'sources', 'visuals', 'ethics', 'aiDeclaration', 'wordCount', 'peer', 'revisionPlan', 'status'],
    Audits: ['id', 'weekId', 'auditorId', 'authorId', 'sightingIds', 'assignedAt', 'dueDate', 'status', 'verdicts', 'doneAt'],
    Spot: ['id', 'sightingId', 'authorId', 'weekId', 'reason', 'queuedAt', 'status', 'verdict', 'level', 'comment', 'doneAt'],
    XPLog: ['id', 'studentId', 'at', 'ruleId', 'eventKey', 'xp'],
    Sessions: ['tokenHash', 'who', 'role', 'createdAt', 'expiresAt', 'lastSeenAt', 'revoked'],
    Log: ['at', 'who', 'role', 'action', 'ok', 'errorCode', 'ms'],
    Config: ['key', 'value']
  };

  // Key column of each tab (the column an upsert matches on). Log has none (append only).
  var keys = {
    State: 'studentId', Words: 'studentId', Summit: 'studentId', Article: 'studentId',
    Sessions: 'tokenHash', Config: 'key', Log: null
  };
  Object.keys(tabs).forEach(function (t) { if (!(t in keys)) keys[t] = 'id'; });

  // Column types. Not listed = 'str'. 'json[]' / 'json{}' decode '' to [] / {}; 'json' to null.
  // 'num' decodes '' to 0; 'num?' decodes '' to null. 'bool' is stored as TRUE / FALSE.
  var types = {
    State: { xp: 'num', streak: 'num', bestStreak: 'num', reviewsDue: 'json[]', rulesTicked: 'json[]', onlineUnlocked: 'bool', badges: 'json{}', fileCount: 'num' },
    Words: { posConfirmed: 'bool', posAlso: 'json[]', forms: 'json{}', notRudeConfirmed: 'bool', fudge: 'json', specSheet: 'json{}', hypotheses: 'json[]', zb: 'json' },
    Plans: { phase: 'num', targetGroups: 'json[]', ideas: 'json[]', platforms: 'json[]' },
    PlanActions: { deleted: 'bool', phase: 'num' },
    Checklist: { carryCount: 'num' },
    Reviews: { onTime: 'bool', decisions: 'json{}', nextPrefs: 'json{}', counts: 'json{}' },
    Actions: { deleted: 'bool', phase: 'num', problem: 'bool', fileIds: 'json[]' },
    Journal: { deleted: 'bool', phase: 'num', wordCount: 'num', fileIds: 'json[]' },
    Sightings: { deleted: 'bool', phase: 'num', level: 'num', owned: 'bool', verifiable: 'bool', fileIds: 'json[]', finalLevel: 'num?' },
    Tallies: { deleted: 'bool', count: 'num' },
    Files: { deleted: 'bool', bytes: 'num', width: 'num', height: 'num', cropConfirmed: 'bool', inSummit: 'bool', inArticle: 'bool' },
    Waves: { n: 'num', recognised: 'num', notSure: 'num', comprehended: 'num', published: 'bool' },
    WaveNotes: { hypothesisChecks: 'json{}', fileIds: 'json[]' },
    Requests: {},
    Flags: { stoppedConfirmed: 'bool' },
    Feedback: {},
    Reports: { sections: 'json{}', wordCount: 'num' },
    Summit: { sections: 'json{}', chartIds: 'json[]', fileIds: 'json[]', levelPicks: 'json{}', qa: 'json[]', selfCheck: 'json{}', rehearsals: 'json[]' },
    Article: { sections: 'json{}', sources: 'json[]', visuals: 'json[]', wordCount: 'num', peer: 'json{}' },
    Audits: { sightingIds: 'json[]', verdicts: 'json{}' },
    Spot: { level: 'num?' },
    XPLog: { xp: 'num' },
    Sessions: { revoked: 'bool' },
    Log: { ok: 'bool', ms: 'num' },
    Config: {}
  };

  // Tabs whose rows belong to one student through this column (scope, export, purge).
  var ownerCol = {
    State: 'studentId', Words: 'studentId', WordHistory: 'studentId', Plans: 'studentId', PlanActions: 'studentId',
    Checklist: 'studentId', Reviews: 'studentId', Actions: 'studentId', Journal: 'studentId', Sightings: 'studentId',
    Tallies: 'studentId', Files: 'studentId', WaveNotes: 'studentId', Requests: 'studentId', Flags: 'studentId',
    Feedback: 'studentId', Reports: 'studentId', Summit: 'studentId', Article: 'studentId', XPLog: 'studentId',
    Waves: 'termKey', Audits: 'authorId', Spot: 'authorId', Sessions: 'who', Log: 'who'
  };

  // Id prefixes of client-made ids: <prefix>_<12 base36 chars> (§7).
  var idPrefix = { action: 'ac', journal: 'jn', sighting: 'sg', tally: 'tl', planAction: 'pa', file: 'fl', request: 'rq', flag: 'fg', feedback: 'fb', wordHistory: 'wh', spot: 'sp' };
  var idPattern = '^(ac|jn|sg|tl|pa|fl|rq|fg|fb|wh|sp)_[0-9a-z]{12}$';

  // ------------------------------------------------------------- enums (§2–§7)
  var enums = {
    pos: ['noun', 'verb', 'adjective', 'adverb', 'interjection', 'other'],
    posGuess: ['noun', 'verb', 'adjective', 'adverb', 'interjection', 'unknown'],
    posConfidence: ['high', 'medium', 'low', 'none'],
    formation: ['blending', 'clipping', 'compounding', 'conversion', 'borrowing', 'coinage', 'semantic_shift', 'other'],
    formsKey: ['plural', 's', 'ed', 'ing', 'comparative', 'superlative'],
    fudgeKey: ['F', 'U', 'D', 'G', 'E'],
    metric: ['recognition', 'corrected', 'comprehension', 'level', 'other'],
    specRow: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10'],
    specResult: ['pass', 'not_yet', 'not_fit'],
    zbPlace: ['zb_google', 'zb_tiktok', 'zb_instagram', 'zb_x', 'zb_youtube', 'zb_urban'],
    zbResult: ['none', 'other_meaning', 'my_meaning', 'cannot'],
    regStatus: ['draft', 'submitted', 'approved', 'changes'],
    targetGroup: ['tg_5_16', 'tg_17_19', 'tg_20_30', 'tg_31_60', 'tg_61', 'tg_male', 'tg_female', 'tg_school', 'tg_online', 'tg_family', 'tg_everyone', 'tg_thai', 'tg_foreign'],
    idea: ['id_speak', 'id_tiktok', 'id_instagram', 'id_facebook', 'id_memes', 'id_youtube', 'id_hashtags', 'id_chats', 'id_clubs', 'id_replies', 'id_song', 'id_poem', 'id_tshirt', 'id_wiktionary', 'id_gamename', 'id_documentary', 'id_askfriends', 'id_influencer'],
    platform: ['pf_inperson', 'pf_tiktok', 'pf_instagram', 'pf_facebook', 'pf_youtube', 'pf_chats', 'pf_other'],
    route: ['utility', 'play', 'shift'],
    timeBudget: ['light', 'standard', 'stretch'],
    channel: ['ch_school', 'ch_home', 'ch_out', 'ch_chat', 'ch_tiktok', 'ch_instagram', 'ch_facebook', 'ch_youtube', 'ch_forum', 'ch_game', 'ch_wiktionary', 'ch_other_online'],
    evidence: ['log', 'journal', 'sighting', 'screenshot', 'tally', 'survey', 'record', 'doc', 'none'],
    planActionStatus: ['planned', 'done', 'changed', 'skipped'],
    outcome: ['as_planned', 'changed', 'not_done'],
    audience: ['p1', 'p2_5', 'p6_20', 'p21', 'unsure'],
    journalKind: ['reflection', 'zero_result', 'failure_analysis', 'theory_link', 'summit_feedback', 'final_reflection', 'free'],
    relation: ['me', 'classmate', 'friend_class', 'friend_out', 'cousin', 'family', 'online_known', 'stranger', 'unsure'],
    prompted: ['asked', 'unasked', 'unsure'],
    marked: ['natural', 'marked', 'unsure'],
    topic: ['school', 'exams', 'friends', 'food', 'weather', 'phones', 'games', 'family', 'travel', 'other'],
    posUsed: ['noun', 'verb', 'adjective', 'adverb', 'interjection', 'unsure'],
    sightLevel: [0, 1, 4, 5, 6],
    level: [0, 1, 2, 3, 4, 5, 6],
    tallyType: ['said', 'heard', 'asked', 'online'],
    fileAttach: ['sighting', 'action', 'zb', 'wave', 'journal', 'none'],
    waveId: ['W1', 'W2', 'W3', 'W4'],
    termKeyFixed: ['ctrl1', 'ctrl2', 'foil1', 'foil2'],
    hypCheck: ['supported', 'not_supported', 'too_early'],
    requestType: ['ask_first', 'word_change'],
    requestStatus: ['pending', 'approved', 'declined'],
    flagCategory: ['negative_comment', 'stranger_contact', 'uncomfortable', 'other'],
    flagStatus: ['open', 'handled'],
    feedbackTarget: ['general', 'word', 'plan', 'action', 'journal', 'sighting', 'review', 'report', 'summit', 'article', 'checklist'],
    reportType: ['baseline', 'intermediate', 'final'],
    reportStatus: ['draft', 'ready', 'submitted'],
    summitSection: ['hook', 'term', 'approach', 'evidence', 'learnings', 'phase2'],
    chartId: ['ch_waves', 'ch_compare', 'ch_levels', 'ch_actions', 'ch_fudge', 'ch_tallies'],
    selfCheckRow: ['SC1', 'SC2', 'SC3', 'SC4', 'SC5'],
    selfCheckRating: ['not_yet', 'nearly', 'ready'],
    articleSection: ['intro', 'methods', 'results', 'discussion'],
    articleStatus: ['planning', 'drafting', 'in_review', 'revising', 'submitted'],
    sourceType: ['book', 'article', 'web', 'dictionary', 'course'],
    visualKind: ['chart', 'table', 'screenshot'],
    auditStatus: ['none', 'assigned', 'agreed', 'disputed', 'unverifiable'],
    spotStatus: ['none', 'queued', 'confirmed', 'changed', 'rejected'],
    auditTaskStatus: ['assigned', 'done', 'expired'],
    auditVerdict: ['agree', 'different', 'cannot'],
    spotReason: ['random', 'disputed', 'unverifiable', 'screenshot_only'],
    spotVerdict: ['confirm', 'change', 'reject'],
    checkKind: ['required', 'recommended', 'optional', 'own'],
    checkSource: ['fixed-course', 'plan-action', 'choice-driven', 'habit', 'carried', 'pool', 'own'],
    checkStatus: ['open', 'done', 'cannot', 'dropped', 'carried', 'expired'],
    setStatus: ['cannot', 'dropped', 'open'],
    reviewDecision: ['carry', 'cannot', 'dropped'],
    doneBy: ['auto', 'manual'],
    onlineBy: ['', 'auto', 'teacher'],
    termDecision: ['approved', 'changes'],
    requestDecision: ['approved', 'declined'],
    configKey: ['release', 'onlineOpensAt', 'boardEnabled', 'summitSlots', 'lastWeeklyJob'],
    summitSlot: ['L13-1', 'L13-2', 'L13-3', 'L13-4', 'L14-1', 'L14-2', 'L14-3', 'L14-4']
  };

  // UI labels (exact wording of SPEC §2–§5 where the spec gives it). Option ids match W4's WI_CHOICES
  // (docs/ENGINE-API.md §0.1); when WI_CHOICES is loaded its labels win in the UI.
  var labels = {
    pos: { noun: 'Noun', verb: 'Verb', adjective: 'Adjective', adverb: 'Adverb', interjection: 'Interjection', other: 'Phrase / other' },
    formation: { blending: 'Blending', clipping: 'Clipping', compounding: 'Compounding', conversion: 'Conversion', borrowing: 'Borrowing', coinage: 'Coinage', semantic_shift: 'New meaning for an existing word (semantic shift)', other: 'Other' },
    fudgeKey: { F: 'Frequency of use', U: 'Unobtrusiveness', D: 'Diversity of users and situations', G: 'Generation of other forms and meanings', E: 'Endurance of the concept' },
    metric: { recognition: 'Recognition', corrected: 'Corrected recognition', comprehension: 'Comprehension', level: 'Evidence Level reached', other: 'Other' },
    specResult: { pass: 'Passes', not_yet: 'Not yet', not_fit: 'Does not fit my route' },
    zbPlace: { zb_google: 'Google (the word in quotation marks)', zb_tiktok: 'TikTok', zb_instagram: 'Instagram', zb_x: 'X', zb_youtube: 'YouTube', zb_urban: 'Urban Dictionary' },
    zbResult: { none: 'No results', other_meaning: 'Results, but with a different meaning', my_meaning: 'Results with my meaning', cannot: 'I could not check here' },
    targetGroup: { tg_5_16: '5–16', tg_17_19: '17–19', tg_20_30: '20–30', tg_31_60: '31–60', tg_61: '61+', tg_male: 'male', tg_female: 'female', tg_school: 'school friends', tg_online: 'online friends', tg_family: 'family', tg_everyone: 'everyone', tg_thai: 'Thai people', tg_foreign: 'foreigners' },
    idea: { id_speak: 'speaking with friends', id_tiktok: 'TikTok posts', id_instagram: 'Instagram posts', id_facebook: 'Facebook posts', id_memes: 'memes', id_youtube: 'YouTube', id_hashtags: 'hashtags', id_chats: 'private chats', id_clubs: 'clubs, gaming forums or fandoms', id_replies: "replies to others' posts", id_song: 'song', id_poem: 'poem', id_tshirt: 'T-shirt', id_wiktionary: 'Wiktionary', id_gamename: 'gaming character name', id_documentary: 'documentary video', id_askfriends: 'ask friends/family to promote', id_influencer: 'ask influencers to help promote (ask T.Chris first)' },
    platform: { pf_inperson: 'In person only', pf_tiktok: 'TikTok', pf_instagram: 'Instagram', pf_facebook: 'Facebook', pf_youtube: 'YouTube', pf_chats: 'Private chats', pf_other: 'Other' },
    route: { utility: 'Utility (it names something people need a word for)', play: 'Play (it is fun to say or share)', shift: 'Semantic shift (an old word with a new meaning)' },
    timeBudget: { light: 'Light (about 30 min a week)', standard: 'Standard (about 1 hour)', stretch: 'Stretch (about 2 hours)' },
    channel: { ch_school: 'At school, face to face', ch_home: 'At home, face to face', ch_out: 'Somewhere else, face to face', ch_chat: 'Private chat (online)', ch_tiktok: 'TikTok (online)', ch_instagram: 'Instagram (online)', ch_facebook: 'Facebook (online)', ch_youtube: 'YouTube (online)', ch_forum: 'Online club, forum or fandom (online)', ch_game: 'In a game (online)', ch_wiktionary: 'Wiktionary (online)', ch_other_online: 'Other online (online)' },
    outcome: { as_planned: 'As planned', changed: 'Changed', not_done: 'Did not do it' },
    audience: { p1: '1 person', p2_5: '2–5', p6_20: '6–20', p21: '21+', unsure: 'Not sure' },
    journalKind: { reflection: 'Reflection', zero_result: 'Zero-result week', failure_analysis: 'A failed action analysed', theory_link: 'Theory link', summit_feedback: 'Summit feedback', final_reflection: 'Final reflection', free: 'Free note' },
    relation: { me: 'Me', classmate: 'A classmate', friend_class: 'A friend in another class', friend_out: 'A friend outside school', cousin: 'A cousin', family: 'A family member', online_known: 'An online friend I know in real life', stranger: 'Someone I do not know', unsure: 'Not sure' },
    prompted: { asked: 'I asked them to', unasked: 'They used it without being asked', unsure: 'Not sure' },
    marked: { natural: 'Used it naturally', marked: 'Used it with a comment about the word (for example “as my friend says”, quotation marks, a laugh)', unsure: 'Not sure' },
    topic: { school: 'School work', exams: 'Exams', friends: 'Friends', food: 'Food', weather: 'Weather', phones: 'Phones and apps', games: 'Games', family: 'Family', travel: 'Travel', other: 'Other' },
    posUsed: { noun: 'Noun', verb: 'Verb', adjective: 'Adjective', adverb: 'Adverb', interjection: 'Interjection', unsure: 'Not sure' },
    tallyType: { said: 'I said it', heard: 'I heard someone else say it', asked: 'Someone asked what it means', online: 'Someone used it online' },
    flagCategory: { negative_comment: 'Negative comment', stranger_contact: 'Someone I do not know contacted me', uncomfortable: 'I feel uncomfortable', other: 'Something else' },
    hypCheck: { supported: 'Supported', not_supported: 'Not supported', too_early: 'Too early to say' },
    selfCheckRating: { not_yet: 'Not yet', nearly: 'Nearly', ready: 'Ready' },
    auditVerdict: { agree: 'I agree with the level', different: 'I would give a different level', cannot: 'I cannot check this' },
    spotVerdict: { confirm: 'Confirm', change: 'Change level', reject: 'Reject as evidence' },
    verifiable: { 'true': 'Yes', 'false': 'No' }
  };

  // Which ideas are in person / online / either (§5.6 table B); which need "ask T.Chris first".
  var ideaMode = { id_speak: 'inperson', id_tiktok: 'online', id_instagram: 'online', id_facebook: 'online', id_memes: 'either', id_youtube: 'online', id_hashtags: 'online', id_chats: 'online', id_clubs: 'either', id_replies: 'online', id_song: 'either', id_poem: 'either', id_tshirt: 'inperson', id_wiktionary: 'online', id_gamename: 'online', id_documentary: 'either', id_askfriends: 'inperson', id_influencer: 'online' };
  var askFirst = ['id_influencer'];
  var onlineChannels = ['ch_chat', 'ch_tiktok', 'ch_instagram', 'ch_facebook', 'ch_youtube', 'ch_forum', 'ch_game', 'ch_wiktionary', 'ch_other_online'];

  // Fixed wave terms (§2.4, §12).
  var waveTerms = { ctrl1: 'aura farming', ctrl2: 'crash out', foil1: 'drovish', foil2: 'trelky' };

  // Exact strings that tests compare (§14.2 P5).
  var strings = {
    cropTick: "I have cropped out other people's names, faces and usernames.", // = WI_RULES.screenshotTick (W4 data/rules.js wins)
    notRude: 'My word is not negative or rude, and is not related to religion, monarchy, politics, gender or race.'
  };

  // ----------------------------------------------------------- limits (§8.2)
  var limits = {
    bodyBytes: 900 * 1024,
    ratePerMinute: 60,
    syncOps: 25,
    fileBytes: 600 * 1024,
    filesTotal: 80,
    filesPerEntry: 3,
    filesZb: 6,
    filesJournal: 2,
    filesInSummit: 4,
    imageLongSide: 1280,
    ownPerWeek: 5,
    hypothesesMin: 2,
    hypothesesMax: 4,
    planActionsMin: 3,
    planActionsMax: 40,
    jsonCell: 40000,
    lockMs: 20000,
    studentSessionDays: 30,
    teacherSessionHours: 12,
    lockoutTries: 5,
    lockoutWindowMin: 15,
    lockoutStudentMin: 5,
    lockoutStudentMaxMin: 360, // repeated lockouts double the wait (5, 10, 20 … minutes) up to this
    lockoutEscalateHours: 24,  // … until this long has passed without a new lockout
    lockoutTeacherMin: 15,
    uploadsPerDay: 100,        // uploads a student may make in one day, deleted ones included
    firstLogDate: '2026-11-16',
    zbFirstDate: '2026-11-01',
    planFirstDate: '2026-11-21',
    planLastDate: '2027-01-15',
    phase2From: '2026-12-18'
  };

  // Word-count targets used by checks and "Mark as ready" (§5.2, §11, §12). Save limits are in `fields`.
  var targets = {
    journalWords: 40,
    waveNoteWords: [20, 200],
    summitAbstractWords: [45, 55],
    aoaWords: [25, 120],
    qaAnswerWords: [15, 120],
    articleAbstractWords: [150, 200],
    articleWords: [2000, 3000],
    ethicsWords: 60,
    aiWords: 10,
    reports: {
      baseline: { release: 1, sections: ['profile', 'fudge', 'wave1', 'plan'], minWords: 80, total: [600, 900] },
      intermediate: { release: 2, sections: ['wave2', 'log', 'analysis', 'adjust'], minWords: 80, total: [600, 900] },
      final: { release: 3, sections: ['wave3', 'compare', 'closeout'], minWords: 60, total: null }
    },
    aiSectionId: 'ai'
  };

  // ------------------------------------------------------------ fields (§2.3)
  // type: text | textarea | int | date | bool | enum | multi | url | pin
  // req: required on a full save. min / max: characters, or words when words:true.
  // maxWords: an extra word cap on a character-limited field. enum: an `enums` name.
  // containsWord: the text must use the word (checked with WI.pos.guess: rule P00 means not found).
  // mustBeTrue: a tick that must be ticked. reqIf: {otherField: [values]} makes it required.
  // minDate / maxDate: ISO dates or 'today' (server date, Bangkok).
  var T = 'text', TA = 'textarea';
  var fields = {
    login: { pin: { type: 'pin', req: true, pattern: '^[0-9]{4}$' } },
    tLogin: { pin: { type: 'pin', req: true, pattern: '^[0-9]{6,8}$' } },
    first: {
      word: { type: T, req: true, min: 2, max: 30, maxWords: 3, pattern: "^[A-Za-z][A-Za-z '’-]*$" },
      meaning: { type: TA, req: true, min: 10, max: 200 },
      example1: { type: TA, req: true, min: 15, max: 200, containsWord: true },
      pos: { type: 'enum', enum: 'pos', req: true },
      posAlso: { type: 'multi', enum: 'pos' }
    },
    wordCard: {
      usageRules: { type: TA, req: true, min: 20, max: 400 },
      forms: { type: 'forms' },
      pronunciation: { type: T, max: 60 },
      formation: { type: 'enum', enum: 'formation', req: true },
      sourceWords: { type: T, req: true, min: 3, max: 150 },
      example2: { type: TA, req: true, min: 15, max: 200, containsWord: true },
      example3: { type: TA, req: true, min: 15, max: 200, containsWord: true },
      doNotUse: { type: TA, max: 200 },
      purpose: { type: TA, req: true, min: 20, max: 300 },
      notRudeConfirmed: { type: 'bool', req: true, mustBeTrue: true }
    },
    formsItem: { value: { type: T, max: 30 } },
    fudge: {
      score: { type: 'int', req: true, min: 0, max: 2 },
      reason: { type: T, req: true, min: 10, max: 200 }
    },
    hypotheses: {
      researchQuestion: { type: TA, req: true, min: 15, max: 250 }
    },
    hypothesis: {
      text: { type: TA, req: true, min: 20, max: 250 },
      metric: { type: 'enum', enum: 'metric', req: true },
      target: { type: T, max: 40 }
    },
    spec: {
      result: { type: 'enum', enum: 'specResult', req: true },
      note: { type: T, max: 150 }
    },
    zb: {
      checkedAt: { type: 'date', req: true, minDate: '2026-11-01', maxDate: 'today' },
      statement: { type: TA, req: true, min: 20, max: 300 }
    },
    zbPlace: {
      placeId: { type: 'enum', enum: 'zbPlace', req: true },
      result: { type: 'enum', enum: 'zbResult', req: true },
      note: { type: T, max: 150 }
    },
    choices: {
      targetGroups: { type: 'multi', enum: 'targetGroup', req: true, min: 1 },
      ideas: { type: 'multi', enum: 'idea', req: true, min: 1 },
      platforms: { type: 'multi', enum: 'platform', req: true, min: 1 },
      platformOther: { type: T, max: 30, reqIf: { platforms: ['pf_other'] } },
      route: { type: 'enum', enum: 'route', req: true },
      timeBudget: { type: 'enum', enum: 'timeBudget', req: true },
      who: { type: TA, req: true, min: 20, max: 300 },
      why: { type: TA, req: true, min: 20, max: 300 },
      what: { type: TA, req: true, min: 20, max: 300 },
      spark: { type: TA, max: 300 },
      projectAccount: { type: T, max: 40 }
    },
    pivot: {
      keep: { type: TA, max: 300 },
      stop: { type: TA, max: 300 },
      start: { type: TA, max: 300 },
      variableChanged: { type: TA, max: 200 },
      p2Hypothesis: { type: TA, max: 250 }
    },
    request: {
      type: { type: 'enum', enum: 'requestType', req: true },
      ideaId: { type: 'enum', enum: 'idea' },
      text: { type: TA, req: true, min: 20, max: 300 }
    },
    planAction: {
      where: { type: 'enum', enum: 'channel', req: true },
      ideaId: { type: 'enum', enum: 'idea', req: true },
      what: { type: T, req: true, min: 10, max: 200 },
      why: { type: T, req: true, min: 10, max: 200 },
      theoryTag: { type: T, max: 40, pattern: '^[a-z0-9_-]*$' },
      whenDate: { type: 'date', req: true, minDate: '2026-11-21', maxDate: '2027-01-15' },
      evidence: { type: 'enum', enum: 'evidence', req: true },
      targetGroup: { type: 'enum', enum: 'targetGroup' }
    },
    action: {
      date: { type: 'date', req: true, minDate: '2026-11-16', maxDate: 'today' },
      planActionId: { type: T, max: 20 },
      channelId: { type: 'enum', enum: 'channel', req: true },
      ideaId: { type: 'enum', enum: 'idea' },
      what: { type: TA, req: true, min: 10, max: 400 },
      outcome: { type: 'enum', enum: 'outcome', req: true },
      outcomeReason: { type: T, min: 10, max: 300, reqIf: { outcome: ['changed', 'not_done'] } },
      audience: { type: 'enum', enum: 'audience' },
      reaction: { type: TA, max: 400 },
      learned: { type: TA, max: 400 },
      problem: { type: 'bool' }
    },
    journal: {
      date: { type: 'date', req: true, minDate: '2026-11-16', maxDate: 'today' },
      kind: { type: 'enum', enum: 'journalKind', req: true },
      promptId: { type: T, max: 40 },
      text: { type: TA, req: true, min: 40, max: 3000 }
    },
    sighting: {
      date: { type: 'date', req: true, minDate: '2026-11-16', maxDate: 'today' },
      channelId: { type: 'enum', enum: 'channel', req: true },
      relation: { type: 'enum', enum: 'relation', req: true },
      quote: { type: TA, req: true, min: 2, max: 200 },
      context: { type: T, max: 200 },
      prompted: { type: 'enum', enum: 'prompted', req: true },
      marked: { type: 'enum', enum: 'marked', req: true },
      topic: { type: 'enum', enum: 'topic', req: true },
      posUsed: { type: 'enum', enum: 'posUsed', req: true },
      derivedForm: { type: T, max: 30 },
      level: { type: 'enum', enum: 'sightLevel', req: true },
      link: { type: 'url', max: 300 },
      verifiable: { type: 'bool', req: true }
    },
    tally: {
      date: { type: 'date', req: true, minDate: '2026-11-16', maxDate: 'today' },
      tallyType: { type: 'enum', enum: 'tallyType', req: true },
      count: { type: 'int', req: true, min: 0, max: 99 },
      context: { type: 'enum', enum: 'channel' },
      note: { type: T, max: 200 }
    },
    waveNote: {
      waveId: { type: 'enum', enum: 'waveId', req: true },
      note: { type: TA, max: 200, words: true }
    },
    ownItem: {
      title: { type: T, req: true, min: 5, max: 80 },
      dueDate: { type: 'date' }
    },
    cannot: { reason: { type: T, req: true, min: 10, max: 200 } },
    review: {
      wentWell: { type: TA, req: true, min: 20, max: 600 },
      toChange: { type: TA, req: true, min: 20, max: 600 }
    },
    flag: {
      category: { type: 'enum', enum: 'flagCategory', req: true },
      note: { type: TA, max: 300 },
      stoppedConfirmed: { type: 'bool', req: true, mustBeTrue: true }
    },
    file: {
      attachType: { type: 'enum', enum: 'fileAttach', req: true },
      attachId: { type: T, max: 40 },
      caption: { type: T, max: 120 },
      cropConfirmed: { type: 'bool', req: true, mustBeTrue: true },
      width: { type: 'int', req: true, min: 1, max: 1280 },
      height: { type: 'int', req: true, min: 1, max: 1280 }
    },
    reportSection: { text: { type: TA, max: 8000 } },
    summitSection: { notes: { type: TA, max: 1500 } },
    summit: {
      abstract: { type: TA, max: 1000 },
      aoaStatement: { type: TA, max: 1200 },
      feedbackNotes: { type: TA, max: 3000 }
    },
    qaItem: { qId: { type: T, req: true, max: 20 }, answer: { type: TA, max: 1200 } },
    selfCheck: { rating: { type: 'enum', enum: 'selfCheckRating', req: true }, note: { type: T, max: 200 } },
    article: {
      title: { type: T, max: 150 },
      keywords: { type: T, max: 100 },
      abstract: { type: TA, max: 2000 },
      ethics: { type: TA, max: 4000 },
      aiDeclaration: { type: TA, max: 1500 },
      wordCount: { type: 'int', min: 0, max: 20000 },
      revisionPlan: { type: TA, max: 4000 },
      status: { type: 'enum', enum: 'articleStatus' }
    },
    articleSection: { notes: { type: TA, max: 6000 } },
    source: {
      apa: { type: T, req: true, min: 20, max: 400 },
      type: { type: 'enum', enum: 'sourceType', req: true },
      use: { type: T, req: true, min: 10, max: 300 }
    },
    visual: {
      kind: { type: 'enum', enum: 'visualKind', req: true },
      caption: { type: T, req: true, min: 3, max: 200 },
      figureNo: { type: 'int', min: 1, max: 30 }
    },
    peerNote: { notes: { type: TA, max: 4000 } },
    auditVerdict: {
      verdict: { type: 'enum', enum: 'auditVerdict', req: true },
      level: { type: 'int', min: 0, max: 6, reqIf: { verdict: ['different'] } },
      comment: { type: T, max: 200 }
    },
    // Teacher forms (§2.4)
    tFeedback: { text: { type: TA, req: true, min: 2, max: 600 }, targetType: { type: 'enum', enum: 'feedbackTarget', req: true }, targetId: { type: T, max: 80 } },
    tTerm: { decision: { type: 'enum', enum: 'termDecision', req: true }, comment: { type: TA, max: 400, reqIf: { decision: ['changes'] } } },
    tRequest: { decision: { type: 'enum', enum: 'requestDecision', req: true }, comment: { type: TA, max: 400 } },
    tFlag: { teacherNote: { type: TA, max: 300 } },
    tSpot: { verdict: { type: 'enum', enum: 'spotVerdict', req: true }, level: { type: 'int', min: 0, max: 6, reqIf: { verdict: ['change'] } }, comment: { type: TA, max: 300 } },
    tWave: { date: { type: 'date', req: true, minDate: '2026-11-01', maxDate: '2027-03-31' }, classesNote: { type: T, max: 100 } },
    tWaveRow: {
      n: { type: 'int', req: true, min: 1, max: 999 },
      recognised: { type: 'int', req: true, min: 0, max: 999 },
      notSure: { type: 'int', req: true, min: 0, max: 999 },
      comprehended: { type: 'int', req: true, min: 0, max: 999 }
    },
    tPin: { newPin: { type: 'pin', req: true, pattern: '^[0-9]{4}$' } }
  };

  // --------------------------------------------------------- API actions (§8.3)
  // auth: P public, S student, T teacher. write: runs in the script lock. sync: allowed inside `sync`.
  // release: the first release in which the action is open (RELEASE before). Some depend on data (see notes).
  var actions = {
    'ping': { auth: 'P', method: 'GET' },
    'roster': { auth: 'P', method: 'GET' },
    'login': { auth: 'P', write: true },
    't.login': { auth: 'P', write: true },
    'logout': { auth: 'ST', write: true },
    'bootstrap': { auth: 'S', write: true },
    'sync': { auth: 'S', write: true },
    'word.save': { auth: 'S', write: true, sync: true },
    'word.zb': { auth: 'S', write: true, sync: true },
    'word.submit': { auth: 'S', write: true, sync: true },
    'plan.save': { auth: 'S', write: true, sync: true, note: 'phase 2 needs release 3' },
    'rules.tick': { auth: 'S', write: true, sync: true },
    'rec.save': { auth: 'S', write: true, sync: true },
    'rec.delete': { auth: 'S', write: true, sync: true },
    'checklist.tick': { auth: 'S', write: true, sync: true },
    'checklist.addOwn': { auth: 'S', write: true, sync: true },
    'checklist.setStatus': { auth: 'S', write: true, sync: true },
    'review.submit': { auth: 'S', write: true, sync: true },
    'file.upload': { auth: 'S', write: true },
    'file.get': { auth: 'S' },
    'file.update': { auth: 'S', write: true, sync: true },
    'file.delete': { auth: 'S', write: true, sync: true },
    'request.create': { auth: 'S', write: true, sync: true },
    'flag.raise': { auth: 'S', write: true, sync: true },
    'feedback.read': { auth: 'S', write: true, sync: true },
    'report.save': { auth: 'S', write: true, sync: true, note: 'baseline 1, intermediate 2, final 3' },
    'summit.save': { auth: 'S', write: true, sync: true, release: 2 },
    'article.save': { auth: 'S', write: true, sync: true, release: 3 },
    'audit.submit': { auth: 'S', write: true, sync: true, release: 2 },
    'board.get': { auth: 'S' },
    't.overview': { auth: 'T', write: true },
    't.student': { auth: 'T', write: true },
    't.feedback': { auth: 'T', write: true },
    't.term': { auth: 'T', write: true },
    't.request': { auth: 'T', write: true },
    't.online': { auth: 'T', write: true },
    't.flag': { auth: 'T', write: true },
    't.spot.list': { auth: 'T', release: 2 },
    't.spot.submit': { auth: 'T', write: true, release: 2 },
    't.wave.get': { auth: 'T' },
    't.wave.save': { auth: 'T', write: true },
    't.pin': { auth: 'T', write: true },
    't.file': { auth: 'T' },
    't.export': { auth: 'T' },
    't.config.save': { auth: 'T', write: true },
    't.job.run': { auth: 'T', write: true },
    't.purgeGuests': { auth: 'T', write: true }
  };

  var errorCodes = ['AUTH_REQUIRED', 'AUTH_BAD_PIN', 'AUTH_LOCKED', 'FORBIDDEN', 'NOT_FOUND', 'VALIDATION', 'LOCKED_ONLINE', 'LIMIT', 'RATE', 'BUSY', 'RELEASE', 'SERVER'];

  // ------------------------------------------------------------- helpers
  function countWords(text) {
    if (text === null || text === undefined) return 0;
    var parts = String(text).trim().split(/\s+/);
    var n = 0;
    for (var i = 0; i < parts.length; i++) { if (/[A-Za-z0-9À-ɏ฀-๿]/.test(parts[i])) n++; }
    return n;
  }

  function isEmpty(v) {
    return v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
  }

  function enumHas(name, v) {
    // Only a plain string or number can be an enum value. An array such as ['ch_tiktok'] has the same
    // String() form as 'ch_tiktok' and would pass here but miss every indexOf() rule check on the server.
    if (typeof v !== 'string' && typeof v !== 'number') return false;
    var list = Object.prototype.hasOwnProperty.call(enums, name) ? enums[name] : [];
    for (var i = 0; i < list.length; i++) { if (list[i] === v || String(list[i]) === String(v)) return true; }
    return false;
  }

  function msg(kind, a) {
    switch (kind) {
      case 'req': return 'Please fill in this part.';
      case 'tick': return 'Please tick this box.';
      case 'min': return 'Please write at least ' + a + ' characters.';
      case 'max': return 'Please write no more than ' + a + ' characters.';
      case 'minW': return 'Please write at least ' + a + ' words.';
      case 'maxW': return 'Please write no more than ' + a + ' words.';
      case 'enum': return 'Please choose one of the options.';
      case 'multiMin': return 'Please choose at least ' + a + '.';
      case 'int': return 'Please use a whole number from ' + a[0] + ' to ' + a[1] + '.';
      case 'date': return 'Please choose a date.';
      case 'dateMin': return 'Please choose a date on or after ' + a + '.';
      case 'dateMax': return a === 'today' ? 'Please choose a date that is not in the future.' : 'Please choose a date on or before ' + a + '.';
      case 'url': return 'Please paste a link that starts with https://';
      case 'pattern': return 'Please check what you typed.';
      case 'pin': return 'Please type the PIN with numbers only.';
      case 'bool': return 'Please answer yes or no.';
      case 'word': return 'Your sentence must use your word.';
      case 'words3': return 'Your word can have one, two or three words.';
      default: return 'Please check this part.';
    }
  }

  // Check one value against one field spec. opts: {today:'YYYY-MM-DD', partial:bool, data:{…}, word:'…', containsWord:function(word, text)→bool}
  // Returns null when fine, or a B1 message.
  function checkField(spec, value, opts) {
    opts = opts || {};
    var data = opts.data || {};
    var required = !!spec.req;
    if (spec.reqIf) {
      Object.keys(spec.reqIf).forEach(function (k) {
        var dv = data[k];
        var want = spec.reqIf[k];
        var hit = Array.isArray(dv) ? dv.some(function (x) { return want.indexOf(x) >= 0; }) : want.indexOf(dv) >= 0;
        if (hit) required = true;
      });
    }
    if (typeof value === 'string') value = value.trim();
    if (isEmpty(value)) {
      if (spec.mustBeTrue && required) return msg('tick');
      if (required && !opts.partial) return msg('req');
      if (required && opts.partial && value !== undefined) return msg('req');
      return null;
    }
    var t = spec.type;
    if (t === 'text' || t === 'textarea' || t === 'url') {
      if (typeof value !== 'string') return msg('pattern');
      if (spec.words) {
        var w = countWords(value);
        if (spec.min && w < spec.min) return msg('minW', spec.min);
        if (spec.max && w > spec.max) return msg('maxW', spec.max);
        if (value.length > 4000) return msg('max', 4000);
      } else {
        if (spec.min && value.length < spec.min) return msg('min', spec.min);
        if (spec.max && value.length > spec.max) return msg('max', spec.max);
      }
      if (spec.maxWords && value.split(/\s+/).length > spec.maxWords) return msg('words3');
      if (spec.pattern && !(new RegExp(spec.pattern)).test(value)) return msg('pattern');
      if (t === 'url' && !/^https:\/\/[^\s]+$/.test(value)) return msg('url');
      if (spec.containsWord && opts.word && typeof opts.containsWord === 'function' && !opts.containsWord(opts.word, value)) return msg('word');
      return null;
    }
    if (t === 'pin') {
      if (typeof value !== 'string' || !(new RegExp(spec.pattern)).test(value)) return msg('pin');
      return null;
    }
    if (t === 'int') {
      var n = (typeof value === 'number') ? value : (/^-?[0-9]+$/.test(String(value)) ? Number(value) : NaN);
      if (!isFinite(n) || Math.floor(n) !== n) return msg('int', [spec.min, spec.max]);
      if (spec.min !== undefined && n < spec.min) return msg('int', [spec.min, spec.max]);
      if (spec.max !== undefined && n > spec.max) return msg('int', [spec.min, spec.max]);
      return null;
    }
    if (t === 'bool') {
      if (value !== true && value !== false) return msg('bool');
      if (spec.mustBeTrue && value !== true) return msg('tick');
      return null;
    }
    if (t === 'enum') {
      if (!enumHas(spec.enum, value)) return msg('enum');
      return null;
    }
    if (t === 'multi') {
      if (!Array.isArray(value)) return msg('enum');
      for (var i = 0; i < value.length; i++) { if (!enumHas(spec.enum, value[i])) return msg('enum'); }
      for (var j = 0; j < value.length; j++) { if (value.indexOf(value[j]) !== j) return msg('enum'); }
      if (spec.min && value.length < spec.min) return msg('multiMin', spec.min);
      return null;
    }
    if (t === 'date') {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return msg('date');
      var d = new Date(value + 'T00:00:00Z');
      if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return msg('date');
      var mn = spec.minDate === 'today' ? opts.today : spec.minDate;
      var mx = spec.maxDate === 'today' ? opts.today : spec.maxDate;
      if (mn && value < mn) return msg('dateMin', mn);
      if (mx && value > mx) return msg('dateMax', spec.maxDate === 'today' ? 'today' : mx);
      return null;
    }
    if (t === 'forms') {
      if (typeof value !== 'object' || Array.isArray(value)) return msg('pattern');
      var ks = Object.keys(value);
      for (var k = 0; k < ks.length; k++) {
        if (!enumHas('formsKey', ks[k])) return msg('pattern');
        var fv = value[ks[k]];
        if (fv !== '' && fv !== null && (typeof fv !== 'string' || fv.length > 30)) return msg('max', 30);
      }
      return null;
    }
    return null;
  }

  // Check a whole form. Returns null or {field, message}. With opts.partial only the given keys are checked
  // (a required field may not be set to empty). Unknown keys are ignored here (the server drops them).
  function validate(formKey, data, opts) {
    opts = opts || {};
    var form = fields[formKey];
    if (!form) return { field: '', message: 'Unknown form.' };
    data = data || {};
    var o = {};
    for (var p in opts) { if (Object.prototype.hasOwnProperty.call(opts, p)) o[p] = opts[p]; }
    o.data = data;
    var names = Object.keys(form);
    for (var i = 0; i < names.length; i++) {
      var f = names[i];
      if (opts.partial && !Object.prototype.hasOwnProperty.call(data, f)) continue;
      var m = checkField(form[f], data[f], o);
      if (m) return { field: f, message: m };
    }
    return null;
  }

  // Trim every string in a flat object (server and client both do this before checking).
  function trimAll(obj) {
    var out = {};
    Object.keys(obj || {}).forEach(function (k) {
      var v = obj[k];
      out[k] = (typeof v === 'string') ? v.trim() : v;
    });
    return out;
  }

  root.WI_SCHEMA = {
    version: '2026-11-19a',
    tabs: tabs,
    keys: keys,
    types: types,
    ownerCol: ownerCol,
    idPrefix: idPrefix,
    idPattern: idPattern,
    enums: enums,
    labels: labels,
    ideaMode: ideaMode,
    askFirst: askFirst,
    onlineChannels: onlineChannels,
    waveTerms: waveTerms,
    strings: strings,
    limits: limits,
    targets: targets,
    fields: fields,
    actions: actions,
    errorCodes: errorCodes,
    countWords: countWords,
    isEmpty: isEmpty,
    enumHas: enumHas,
    checkField: checkField,
    validate: validate,
    trimAll: trimAll
  };
})();
