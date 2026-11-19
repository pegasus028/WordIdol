// WordIdol option lists (SPEC §2.3, §5.6, §13.1). Owner: W4. Ids are stored in the Sheet; labels are shown.
// Table A and B labels are kept exactly as in the Google Form "Slang promotion plan" (validator V7).
(function () {
  var root = (typeof window !== 'undefined') ? window : globalThis;

  root.WI_CHOICES = {
    targetGroups: [
      { id: 'tg_5_16', label: '5–16', age: true },
      { id: 'tg_17_19', label: '17–19', age: true },
      { id: 'tg_20_30', label: '20–30', age: true },
      { id: 'tg_31_60', label: '31–60', age: true },
      { id: 'tg_61', label: '61+', age: true },
      { id: 'tg_male', label: 'male' },
      { id: 'tg_female', label: 'female' },
      { id: 'tg_school', label: 'school friends' },
      { id: 'tg_online', label: 'online friends' },
      { id: 'tg_family', label: 'family' },
      { id: 'tg_everyone', label: 'everyone' },
      { id: 'tg_thai', label: 'Thai people' },
      { id: 'tg_foreign', label: 'foreigners' }
    ],
    // The student's own age group (M4, 15–16) is tg_5_16.
    ownAgeGroup: 'tg_5_16',

    ideas: [
      { id: 'id_speak', label: 'speaking with friends', mode: 'inperson' },
      { id: 'id_tiktok', label: 'TikTok posts', mode: 'online' },
      { id: 'id_instagram', label: 'Instagram posts', mode: 'online' },
      { id: 'id_facebook', label: 'Facebook posts', mode: 'online' },
      { id: 'id_memes', label: 'memes', mode: 'either' },
      { id: 'id_youtube', label: 'YouTube', mode: 'online' },
      { id: 'id_hashtags', label: 'hashtags', mode: 'online' },
      { id: 'id_chats', label: 'private chats', mode: 'online' },
      { id: 'id_clubs', label: 'clubs, gaming forums or fandoms', mode: 'either' },
      { id: 'id_replies', label: "replies to others' posts", mode: 'online' },
      { id: 'id_song', label: 'song', mode: 'either' },
      { id: 'id_poem', label: 'poem', mode: 'either' },
      { id: 'id_tshirt', label: 'T-shirt', mode: 'inperson' },
      { id: 'id_wiktionary', label: 'Wiktionary', mode: 'online' },
      { id: 'id_gamename', label: 'gaming character name', mode: 'online' },
      { id: 'id_documentary', label: 'documentary video', mode: 'either' },
      { id: 'id_askfriends', label: 'ask friends/family to promote', mode: 'inperson',
        helper: 'Asking is fine. Gifts, swaps and deals are not (rule 6).' },
      { id: 'id_influencer', label: 'ask influencers to help promote (ask T.Chris first)', mode: 'online', askFirst: true,
        shownAs: 'ask T.Chris first' }
    ],

    channels: [
      { id: 'ch_school', label: 'At school, face to face', online: false },
      { id: 'ch_home', label: 'At home, face to face', online: false },
      { id: 'ch_out', label: 'Somewhere else, face to face', online: false },
      { id: 'ch_chat', label: 'Private chat (online)', online: true },
      { id: 'ch_tiktok', label: 'TikTok (online)', online: true },
      { id: 'ch_instagram', label: 'Instagram (online)', online: true },
      { id: 'ch_facebook', label: 'Facebook (online)', online: true },
      { id: 'ch_youtube', label: 'YouTube (online)', online: true },
      { id: 'ch_forum', label: 'Online club, forum or fandom (online)', online: true },
      { id: 'ch_game', label: 'In a game (online)', online: true },
      { id: 'ch_wiktionary', label: 'Wiktionary (online)', online: true },
      { id: 'ch_other_online', label: 'Other online (online)', online: true }
    ],

    platforms: [
      { id: 'pf_inperson', label: 'In person only', online: false, exclusive: true },
      { id: 'pf_tiktok', label: 'TikTok', online: true, social: true },
      { id: 'pf_instagram', label: 'Instagram', online: true, social: true },
      { id: 'pf_facebook', label: 'Facebook', online: true, social: true },
      { id: 'pf_youtube', label: 'YouTube', online: true, social: true },
      { id: 'pf_chats', label: 'Private chats', online: true },
      { id: 'pf_other', label: 'Other', online: true, hasText: 'platformOther' }
    ],

    routes: [
      { id: 'utility', label: 'Utility (it names something people need a word for)' },
      { id: 'play', label: 'Play (it is fun to say or share)' },
      { id: 'shift', label: 'Semantic shift (an old word with a new meaning)' }
    ],

    timeBudgets: [
      { id: 'light', label: 'Light (about 30 min a week)', optional: 0, planPerWeek: 1 },
      { id: 'standard', label: 'Standard (about 1 hour)', optional: 2, planPerWeek: 2 },
      { id: 'stretch', label: 'Stretch (about 2 hours)', optional: 4, planPerWeek: 3 }
    ],

    pos: [
      { id: 'noun', label: 'Noun' },
      { id: 'verb', label: 'Verb' },
      { id: 'adjective', label: 'Adjective' },
      { id: 'adverb', label: 'Adverb' },
      { id: 'interjection', label: 'Interjection' },
      { id: 'other', label: 'Phrase / other' }
    ],

    // Suggested forms per part of speech (word card, `forms`).
    formsByPos: {
      noun: [{ id: 'plural', label: 'Plural' }],
      verb: [{ id: 's', label: '-s form' }, { id: 'ed', label: '-ed form' }, { id: 'ing', label: '-ing form' }],
      adjective: [{ id: 'comparative', label: 'Comparative' }, { id: 'superlative', label: 'Superlative' }],
      adverb: [], interjection: [], other: []
    },

    formations: [
      { id: 'blending', label: 'Blending' },
      { id: 'clipping', label: 'Clipping' },
      { id: 'compounding', label: 'Compounding' },
      { id: 'conversion', label: 'Conversion' },
      { id: 'borrowing', label: 'Borrowing' },
      { id: 'coinage', label: 'Coinage' },
      { id: 'semantic_shift', label: 'New meaning for an existing word (semantic shift)' },
      { id: 'other', label: 'Other' }
    ],

    outcomes: [
      { id: 'as_planned', label: 'As planned' },
      { id: 'changed', label: 'Changed' },
      { id: 'not_done', label: 'Did not do it' }
    ],

    audiences: [
      { id: 'p1', label: '1 person' },
      { id: 'p2_5', label: '2–5' },
      { id: 'p6_20', label: '6–20' },
      { id: 'p21', label: '21+' },
      { id: 'unsure', label: 'Not sure' }
    ],

    journalKinds: [
      { id: 'reflection', label: 'Reflection' },
      { id: 'zero_result', label: 'Zero-result week' },
      { id: 'failure_analysis', label: 'A failed action analysed' },
      { id: 'theory_link', label: 'Theory link' },
      { id: 'summit_feedback', label: 'Summit feedback' },
      { id: 'final_reflection', label: 'Final reflection' },
      { id: 'free', label: 'Free note' }
    ],

    relations: [
      { id: 'me', label: 'Me' },
      { id: 'classmate', label: 'A classmate' },
      { id: 'friend_class', label: 'A friend in another class' },
      { id: 'friend_out', label: 'A friend outside school' },
      { id: 'cousin', label: 'A cousin' },
      { id: 'family', label: 'A family member' },
      { id: 'online_known', label: 'An online friend I know in real life' },
      { id: 'stranger', label: 'Someone I do not know' },
      { id: 'unsure', label: 'Not sure' }
    ],

    prompted: [
      { id: 'asked', label: 'I asked them to' },
      { id: 'unasked', label: 'They used it without being asked' },
      { id: 'unsure', label: 'Not sure' }
    ],

    marked: [
      { id: 'natural', label: 'Used it naturally' },
      { id: 'marked', label: 'Used it with a comment about the word (for example “as my friend says”, quotation marks, a laugh)' },
      { id: 'unsure', label: 'Not sure' }
    ],

    topics: [
      { id: 'school', label: 'School work' },
      { id: 'exams', label: 'Exams' },
      { id: 'friends', label: 'Friends' },
      { id: 'food', label: 'Food' },
      { id: 'weather', label: 'Weather' },
      { id: 'phones', label: 'Phones and apps' },
      { id: 'games', label: 'Games' },
      { id: 'family', label: 'Family' },
      { id: 'travel', label: 'Travel' },
      { id: 'other', label: 'Other' }
    ],

    posUsed: [
      { id: 'noun', label: 'Noun' },
      { id: 'verb', label: 'Verb' },
      { id: 'adjective', label: 'Adjective' },
      { id: 'adverb', label: 'Adverb' },
      { id: 'interjection', label: 'Interjection' },
      { id: 'unsure', label: 'Not sure' }
    ],

    sightingLevels: [0, 1, 4, 5, 6],
    surveyLevels: [2, 3],

    verifiable: [
      { id: true, label: 'Yes' },
      { id: false, label: 'No' }
    ],

    tallyTypes: [
      { id: 'said', label: 'I said it' },
      { id: 'heard', label: 'I heard someone else say it' },
      { id: 'asked', label: 'Someone asked what it means' },
      { id: 'online', label: 'Someone used it online' }
    ],

    evidenceTypes: [
      { id: 'log', label: 'Action log entry' },
      { id: 'journal', label: 'Lab Book entry' },
      { id: 'sighting', label: 'Sightings I record' },
      { id: 'screenshot', label: 'Screenshot' },
      { id: 'tally', label: 'Tally count' },
      { id: 'survey', label: 'Survey wave' },
      { id: 'record', label: 'A record in WordIdol' },
      { id: 'doc', label: 'A document (Google Classroom)' },
      { id: 'none', label: 'None' }
    ],
    planEvidence: ['log', 'journal', 'sighting', 'screenshot', 'tally', 'survey'],

    metrics: [
      { id: 'recognition', label: 'Recognition' },
      { id: 'corrected', label: 'Corrected recognition' },
      { id: 'comprehension', label: 'Comprehension' },
      { id: 'level', label: 'Evidence Level reached' },
      { id: 'other', label: 'Other' }
    ],

    hypStatuses: [
      { id: 'supported', label: 'Supported' },
      { id: 'not_supported', label: 'Not supported' },
      { id: 'too_early', label: 'Too early to say' }
    ],

    zbPlaces: [
      { id: 'zb_google', label: 'Google (the word in quotation marks)' },
      { id: 'zb_tiktok', label: 'TikTok' },
      { id: 'zb_instagram', label: 'Instagram' },
      { id: 'zb_x', label: 'X' },
      { id: 'zb_youtube', label: 'YouTube' },
      { id: 'zb_urban', label: 'Urban Dictionary' }
    ],
    zbResults: [
      { id: 'none', label: 'No results' },
      { id: 'other_meaning', label: 'Results, but with a different meaning' },
      { id: 'my_meaning', label: 'Results with my meaning' },
      { id: 'cannot', label: 'I could not check here' }
    ],
    zbCaption: 'TERM_platform_YYYYMMDD',

    // Spec sheet R1–R10 (research notes §7.1).
    specRows: [
      { id: 'R1', requirement: '1–2 syllables, or a short fixed phrase', quickTest: 'Say it 5 times fast' },
      { id: 'R2', requirement: 'Sayable for Thai and English speakers, one obvious pronunciation', quickTest: 'Ask 3 classmates to read it aloud cold' },
      { id: 'R3', requirement: 'Built by a familiar process: semantic shift, clipping, blend, derivation, or a combining form', quickTest: 'Name the process (L3 glossary)' },
      { id: 'R4', requirement: 'Fills a real gap in M4 life', quickTest: '“We need a word for when...” in one sentence' },
      { id: 'R5', requirement: 'Meaning guessable from one example sentence', quickTest: 'Someone guesses the meaning from one sentence' },
      { id: 'R6', requirement: 'Works in at least 3 grammatical slots (noun, verb, adjective or interjection)', quickTest: 'Write 3 sentences, 3 parts of speech' },
      { id: 'R7', requirement: 'Works in at least 3 topics (school, food, friends, weather, exams...)', quickTest: 'Use it about 3 unrelated topics' },
      { id: 'R8', requirement: 'Has a generation path (-er, -ed, -ing, compounds)', quickTest: 'List 2 derived forms' },
      { id: 'R9', requirement: 'Zero baseline and searchable spelling (if coined), or a clearly new sense (if semantic shift)', quickTest: 'Exact-spelling search returns nothing relevant' },
      { id: 'R10', requirement: 'Passes the red lines (no insults about groups or bodies, no sexual meanings, no targeting people, no Thai double meanings, English only)', quickTest: 'Tribunal checklist and a native Thai check' }
    ],
    specResults: [
      { id: 'pass', label: 'Passes' },
      { id: 'not_yet', label: 'Not yet' },
      { id: 'not_fit', label: 'Does not fit my route' }
    ],

    problemCategories: [
      { id: 'negative_comment', label: 'Negative comment' },
      { id: 'stranger_contact', label: 'Someone I do not know contacted me' },
      { id: 'uncomfortable', label: 'I feel uncomfortable' },
      { id: 'other', label: 'Something else' }
    ],

    reviewDecisions: [
      { id: 'carry', label: 'Carry it' },
      { id: 'cannot', label: 'Could not do' },
      { id: 'dropped', label: 'Drop it' }
    ],

    regStatuses: [
      { id: 'draft', label: 'Not sent yet' },
      { id: 'submitted', label: 'Waiting for T.Chris' },
      { id: 'approved', label: 'Approved' },
      { id: 'changes', label: 'T.Chris asked for changes' }
    ],

    fudgeLetters: [
      { id: 'F', label: 'Frequency of use' },
      { id: 'U', label: 'Unobtrusiveness' },
      { id: 'D', label: 'Diversity of users and situations' },
      { id: 'G', label: 'Generation of other forms and meanings' },
      { id: 'E', label: 'Endurance of the concept' }
    ],
    fudgeBands: [
      { min: 7, label: 'likely' },
      { min: 5, label: 'fringe' },
      { min: 0, label: 'doomed' }
    ],
    fudgeNote: 'This is your prediction, not a mark.',

    // Survey terms (SPEC §2.4 T-WAVES, §12).
    controls: [
      { termKey: 'ctrl1', termText: 'aura farming' },
      { termKey: 'ctrl2', termText: 'crash out' }
    ],
    foils: [
      { termKey: 'foil1', termText: 'drovish' },
      { termKey: 'foil2', termText: 'trelky' }
    ],
    waveIds: ['W1', 'W2', 'W3', 'W4']
  };
})();
