# WordIdol

Each EN30202 Sociolinguistics student's project home for promoting her own slang word: guide, record, self-record results, and build the Slang Summit talk (midterm) and the research article (final). Satriwittaya School English Program · T.Chris.

- Student app: https://pegasus028.github.io/WordIdol/
- Teacher portal: https://pegasus028.github.io/WordIdol/teacher.html
- Build contract: `SPEC.md` (§17 Chris's decisions, §19 build decisions)

## How it fits together

| Part | Files |
|---|---|
| Student app | `index.html`, `app.js`, `app.css`, `api.js` (transport, offline queue, cache) |
| Teacher portal | `teacher.html`, `teacher.js` |
| Report helpers, charts, Summit/Article packs | `pack.js`, `pack.css`, `data/reports.js`, `data/summit.js`, `data/article.js` |
| Engine (no DOM; runs in browser, Node and Apps Script) | `engine.js`, `schema.js` |
| Content | `data/*.js` (plan, checklist, coverage, choices, game, rules, guide, frames, levels, blocklist, why, pool, postests) |
| Backend | `apps-script/Code.gs`, `apps-script/Shared.gs` (generated), private `Roster.gs` (only in the Apps Script project) |
| Config | `config.js` (`apiUrl`, `release` 1–3) |

Releases are switched with `release` in `config.js` (R1 now; R2 from 2 Dec for audits and 7 Dec for Charts and the Summit Pack; R3 in January).

## Editing content

Content lives in `data/*.js`; the engine holds none. After any edit:

```
node tools/build-gs.js        # regenerate apps-script/Shared.gs (engine + data for the server)
node tools/validate.js        # V1–V12, incl. the coverage map and "no reward for spread"
node tests/unit.test.js && node tests/api.test.js
```

Bump `?v=` in `index.html` and `teacher.html`. If `Shared.gs` or `Code.gs` changed, paste them into the "WordIdol backend" Apps Script project, save, and deploy a **new version of the existing deployment** (never a new deployment).

## Tests

```
node tools/mock-server.js --port 8790 &   # Code.gs + Shared.gs in Node with a fake Sheet and Drive
python3 -m http.server 8765 &
NODE_PATH=$(npm root -g) node tests/browser.test.js
NODE_PATH=$(npm root -g) node tests/pack.test.js
```

## Privacy

No student label, PIN or token is in this repo. The roster lives only in `Roster.gs` inside the Apps Script project (`apps-script/Roster.example.gs` shows its shape). Sightings record a relation ("a classmate"), never a name. Screenshots are kept in a private Drive folder and served only to their owner and the teacher.

## Credits

Built for T.Chris by Claude (Fable and Opus models) from the EN30202 course kit and research notes. No AI-generated images; all visuals are CSS and inline SVG.
