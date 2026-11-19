# WordIdol QA report: release 1 (19 Nov 2026)

## Automated suites (all green on the pushed build)
| Suite | Result |
|---|---|
| `tools/validate.js` (V1–V12: ids, part-of-speech tests, weeks, catalogue, coverage map, Summit timings, six rules verbatim, guide content, no reward for spread, repo hygiene, syntax, imagery) | all checks passed |
| `tests/unit.test.js` (engine) | 49 / 49 |
| `tests/api.test.js` (Code.gs + Shared.gs in Node, incl. security regressions) | 42 / 42 |
| `tests/browser.test.js` (student app + teacher portal at 375 and 1366 px, light/dark, escaping) | 276 / 276 |
| `tests/pack.test.js` (report helpers, wave card, charts) | 597 / 597 |
| `tests/api-race.test.js` (bootstrap vs confirmed saves) | 1 / 1 |

## Independent reviews (nothing reviewed by the model that wrote it)
- Guide content (Fable → Opus review): 39 strings fixed (lesson-time triggers, rule 4 paraphrase, RDG-09 definitions).
- Engine (Opus → Fable review): 12 defects fixed; V9 now simulates 13 weeks with and without spread and plants three regressions.
- Backend (Opus → Fable security review): 1 high (online lock bypass with an array id) + 9 smaller defects fixed, each with a test.
- Front end and report helpers (Opus → Fable review): 20 defects fixed (lost work after a server-ended session, cross-student cache on a shared device, report draft race, wave grid, tap targets).

## Live walkthrough (19 Nov 2026, real backend, guests only)
| Persona | Guest | Word | Simulated time (this week's work) | Result |
|---|---|---|---|---|
| B1 | Guest#1 | homeworry | 4.9 h (Baseline report 1.8 h) | all rows saved once; report ready; test problem flag |
| B2 | Guest#2 | phonesty | 3.3 h | all rows saved once; guess "cannot tell" → chose noun |
| C1 | Guest#3 | brainstash | 2.5 h | all rows saved once except "send for approval" (see bug 1) |

The guest data is kept as examples for the class (Chris, 19 Nov).

Bugs found live and fixed:
1. A bootstrap already in flight could hide saves confirmed meanwhile (seen as "Send for approval" not offered right after the zero-baseline record). Fixed in `api.js`; `tests/api-race.test.js`.
2. Teacher overview flagged students who had not started as "Quiet 7+ days". Now counted from launch day (Sat 21 Nov). Apps Script redeployed as Version 2.

Open UX notes from the personas (not changed yet):
- Baseline report section 3 needs 80 words about Wave 1, which is published only on 23–24 Nov (report due 25 Nov).
- B1: no plain help for "semantic shift", "baseline", FUDGE letter names, "corrected recognition"; hypothesis frames are folded away.
- A Level 0 sighting can show "(earned)" in the Log while the levels sheet calls Level 0 owned (owned/earned comes from who used it and whether she asked).
- "Copy whole report" falls back to a select-all box when the clipboard is blocked (expected in some browsers).
- Up to three toasts can stack on a phone screen.

## Deployment
- Apps Script "WordIdol backend" (standalone), web app Version 2 (19 Nov 2026, 13:38), same `/exec` as Version 1. `setup()` and the Monday 00:10 trigger installed.
- GitHub Pages: https://pegasus028.github.io/WordIdol/ and `teacher.html`.
