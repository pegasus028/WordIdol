/* WordIdol: report helpers config (W5). SPEC §11.8, §6 (KIT-03, KIT-05, KIT-08).
   Pure data: runs unchanged in the browser, in Node (vm) and in Apps Script V8.
   Section ids are fixed by SPEC §11.8. If T.Chris's template files use other
   headings, change `heading` only; never change an `id`.
   `facts` are keys of WIPack.facts (pack.js). `frameGroups` are FRAMES groups (data/frames.js). */
var root = (typeof window !== 'undefined') ? window : globalThis;

root.WI_REPORTS = {
  version: '2026-11-19a',
  principle: 'Marks are awarded for the quality of analysis and reflection, not for how widely a term spreads. A term that does not catch on, analysed well, can earn full marks.',
  submitNote: 'Submit the report in Google Classroom (Google Docs keeps your version history). WordIdol helps you build it and copy it out. It is not the place to submit it.',
  // GOV-05: every report ends with an AI-use declaration of at least 10 words (SPEC §11.8). SPEC also calls
  // "I did not use AI tools" valid; it has 6 words, so the hint offers a 10+ word way to say the same thing,
  // which keeps the client, the server (W1) and the engine (article.ai) on one rule: >= 10 words.
  ai: {
    id: 'ai',
    heading: 'AI-use declaration',
    label: 'Did you use AI tools for this report? Say which tool, what you used it for, and what you wrote yourself.',
    hint: 'At least 10 words. If you used no AI, you can write: "I did not use AI tools for any part of this report."',
    minWords: 10,
    maxChars: 1500,
    starters: [
      'I did not use AI tools for any part of this report.',
      'I used ___ to check my grammar in section ___. I wrote all the ideas and sentences myself.',
      'I used ___ to ___. I checked everything it gave me and changed ___.'
    ]
  },
  sectionMaxChars: 6000,
  types: {
    baseline: {
      type: 'baseline',
      kit: 'KIT-03',
      title: 'Baseline assessment report',
      due: '2026-11-25',
      dueLabel: 'Wed 25 Nov 2026',
      points: 5,
      release: 1,
      opensOn: '2026-11-21',
      opensLabel: 'Sat 21 Nov 2026',
      wordMin: 600,
      wordMax: 900,
      wordNote: '600–900 words in total (the AI-use declaration does not count).',
      checklistItem: 'F-W02-04',
      intro: 'Write your Baseline report here, one section at a time. Each box shows your facts from WordIdol first. Use them, but explain them in your own words.',
      sections: [
        { id: 'profile', heading: '1. Term profile', minWords: 80, suggest: '150–250',
          facts: ['word.basic', 'word.card', 'word.zb', 'plan.targetGroups'],
          frameGroups: [],
          prompt: 'How was your word formed, and from which words? What does it mean, and what is it for? Who is your target community, and why would they need this word?',
          starters: ['My term is ___. It means ___. People would say it when ___.', 'It was formed by ___ from ___.', 'My target community is ___ because ___.'],
          feeds: ['BAS-PROFILE'] },
        { id: 'fudge', heading: '2. FUDGE predictions and hypotheses', minWords: 80, suggest: '150–250',
          facts: ['word.fudge', 'word.hypotheses'],
          frameGroups: ['hypothesis', 'hedge'],
          prompt: 'Give your FUDGE score for each letter and one reason for each. Then write your research question and your hypotheses. How will you test each one?',
          starters: ['I gave my word ___ out of 2 for Frequency because ___.', 'In my opinion, ___ will / won’t catch on because ___.'],
          feeds: ['BAS-FUDGE'] },
        { id: 'wave1', heading: '3. Wave 1 baseline data', minWords: 80, suggest: '120–200',
          facts: ['wave.W1', 'wavenote.W1'],
          frameGroups: ['describe_data', 'hedge', 'limitation'],
          prompt: 'What did Wave 1 show for your word, the two control words and the two foil words? What is your corrected recognition? What does Wave 1 not tell you yet?',
          starters: ['Corrected recognition was ___% (___% minus ___% for the foils).', '___ is higher / lower than the control word ___.', 'With only ___ respondents, we cannot be sure that ___.'],
          feeds: ['BAS-W1'] },
        { id: 'plan', heading: '4. Campaign and safety plan', minWords: 80, suggest: '150–250',
          facts: ['plan.choices', 'plan.table', 'rules.six', 'online.status'],
          frameGroups: ['ethics'],
          prompt: 'Who will you start with, and who could be a bridge to another group? Which actions will you do, where and when? How will you record the evidence? How will you keep yourself and others safe?',
          starters: ['First, ___. Next, ___. Finally, ___.', 'I will start in person with ___ because ___.', 'To stay safe, I will follow the six rules. For example, ___.'],
          feeds: ['BAS-PLAN'] }
      ]
    },
    intermediate: {
      type: 'intermediate',
      kit: 'KIT-05',
      title: 'Intermediate assessment report',
      due: '2026-12-14',
      dueLabel: 'Mon 14 Dec 2026',
      points: 5,
      release: 2,
      opensOn: '2026-12-02',
      opensLabel: 'Wed 2 Dec 2026',
      wordMin: 600,
      wordMax: 900,
      wordNote: 'Suggested length: 600–900 words in total (the AI-use declaration does not count).',
      checklistItem: 'F-W05-01',
      intro: 'Write your Intermediate report here. Compare Wave 2 with Wave 1, look back at your log, and check your hypotheses honestly. Results that go against your prediction are useful data.',
      sections: [
        { id: 'wave2', heading: '1. Wave 2 data', minWords: 80, suggest: '120–200',
          facts: ['wave.series', 'wave.W2', 'wavenote.W2'],
          frameGroups: ['describe_data', 'compare', 'hedge'],
          prompt: 'What changed between Wave 1 and Wave 2 for your word, the controls and the foils? What is your corrected recognition now?',
          starters: ['Recognition rose / fell from ___% to ___%.', 'Compared with the control words, my term performed ___.'],
          feeds: ['INT-W2'] },
        { id: 'log', heading: '2. Campaign log', minWords: 80, suggest: '150–250',
          facts: ['log.plannedDone', 'log.recent', 'sightings.byLevel'],
          frameGroups: ['describe_data', 'reflect'],
          prompt: 'What did you plan, and what did you really do? Which sightings do you have, at which Evidence Level, owned or earned?',
          starters: ['I planned ___ actions and did ___.', 'This is Level ___ evidence because ___.'],
          feeds: ['INT-LOG'] },
        { id: 'analysis', heading: '3. Early analysis against hypotheses', minWords: 80, suggest: '150–250',
          facts: ['word.hypotheses', 'hyp.checks', 'journal.failures'],
          frameGroups: ['hedge', 'failure', 'limitation'],
          prompt: 'Is each hypothesis supported, not supported, or is it too early to say? Why? What did an action that failed or changed teach you?',
          starters: ['These results suggest that ___, although ___.', 'One possible explanation is that ___.'],
          feeds: ['INT-ANALYSIS'] },
        { id: 'adjust', heading: '4. Planned adjustments', minWords: 80, suggest: '100–200',
          facts: ['reviews.toChange', 'plan.choices'],
          frameGroups: ['plan_change'],
          prompt: 'What will you change next, and why? Change one thing at a time, so you can see what made the difference.',
          starters: ['Next, I will change ___ because ___.', 'I will keep ___ the same, so that ___.'],
          feeds: ['INT-ADJUST'] }
      ]
    },
    final: {
      type: 'final',
      kit: 'KIT-08',
      title: 'Final assessment report',
      due: '2027-01-22',
      dueLabel: 'Fri 22 Jan 2027',
      points: 5,
      release: 3,
      opensOn: '2027-01-04',
      opensLabel: 'Mon 4 Jan 2027',
      // KIT-08 is not written yet (SPEC §11.8): no total word range until T.Chris sets it.
      wordMin: null,
      wordMax: null,
      wordNote: 'T.Chris will set the total length when the KIT-08 template is ready. Each section needs at least 60 words.',
      checklistItem: 'F-W10-03',
      intro: 'Write your Final report here. Show Wave 3, compare phase 1 with phase 2, and close your campaign.',
      sections: [
        { id: 'wave3', heading: '1. Wave 3 data', minWords: 60, suggest: '100–200',
          facts: ['wave.series', 'wave.W3', 'wavenote.W3'],
          frameGroups: ['describe_data', 'compare', 'hedge'],
          prompt: 'What does Wave 3 show, compared with Waves 1 and 2, the controls and the foils?',
          starters: ['___ peaked at ___% in Wave ___ before declining to ___%.'],
          feeds: ['FIN-W3'] },
        { id: 'compare', heading: '2. Phase 1 and phase 2 compared', minWords: 60, suggest: '150–250',
          facts: ['compare.phases', 'plan.variable'],
          frameGroups: ['compare', 'hedge', 'limitation'],
          prompt: 'What one thing did you change at the Pivot? What happened in phase 2 compared with phase 1: actions, sightings by level, wave figures?',
          starters: ['In phase 1, ___. In phase 2, after I changed ___, ___.', 'This does not necessarily mean that ___; it could also be that ___.'],
          feeds: ['FIN-COMPARE'] },
        { id: 'closeout', heading: '3. Campaign close-out', minWords: 60, suggest: '100–200',
          facts: ['log.last', 'plan.keepStopStart'],
          frameGroups: ['reflect'],
          prompt: 'How did your campaign end? What stays, what stops, and what would you do differently next time?',
          starters: ['To sum up, ___.', 'What surprised me most was ___, which suggests ___.'],
          feeds: ['FIN-CLOSE'] }
      ]
    }
  }
};
