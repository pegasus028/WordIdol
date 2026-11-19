# WordIdol — build specification (SPEC.md)
Version 0.2 · written Thu 19 Nov 2026 (Bangkok) by Fable, reviewed by Opus · status: **approved by Chris, Thu 19 Nov 2026, 09:34**, with the defaults of §17.
Course: EN30202 Sociolinguistics, "Make Fetch Happen", Satriwittaya School English Program, T.Chris.

**How to read this.** This is the build contract for five parallel build agents: **W1** backend (`apps-script/`), **W2** front end (`index.html`, `teacher.html`, `app.css`, `app.js`, `teacher.js`), **W3** guide content (`data/guide.js`, `data/frames.js`, `data/levels.js`, `data/blocklist.js`), **W4** gamification and checklist engine (`engine.js`, `data/checklist.js`, `data/coverage.js`, `data/game.js`, `tools/validate.js`), **W5** Summit Pack and report helpers (`pack.js`, `data/summit.js`, `data/reports.js`, `data/article.js`). Ids, Sheet columns, API actions and data shapes in this file are **fixed**: do not rename them. Where a build agent finds a gap, it asks the lead; it does not invent a new id.

**Sources.** Written by Fable from Chris's decisions of 19 Nov, the syllabus, his lesson-plan slides and the course skills; reviewed by Opus against the Project docs (`WordIdol/HANDOVER.md`, `RESEARCH-NOTES_Mainstream_Slang_Case_Studies.md`, `VIDEO-DELIVERY_Plan-Your-Slang-Promotion.md`, `MATERIALS_BRIEF.md`, `content_lessons.py`, `pre_post.py`, the "EN30202 Slang Promotion Plan Template" doc). Review changes are listed in §18. Two items are still waiting for files Chris holds (ASM-04 descriptors, KIT-03/05 template wording): see §17 Q8.

## 1. Purpose, users and scope
### 1.1 Purpose
WordIdol is each student's project home for the slang-coinage project. It (1) guides her and gives brainstorming ideas, (2) records her thoughts and actions, (3) lets her record results herself, and (4) stores everything she needs for the two deliverables: the **Slang Summit** talk (midterm, 16–17 Dec 2026, 7 min + 2 min Q&A) and the **research article** (final, Fri 12 Feb 2027). It replaces the undeployed Slang Observatory (APP-01 Registry, APP-02 Sightings Ledger, APP-03 Survey & FUDGE dashboard) and the Google Form "Slang promotion plan".

Course principle, shown on Home and in both Packs, exact wording: **"Marks are awarded for the quality of analysis and reflection, not for how widely a term spreads. A term that does not catch on, analysed well, can earn full marks."** (syllabus). Short name in this spec: *analysis over adoption*.

### 1.2 Users

| User | Count | Device | Sign-in |
|---|---|---|---|
| Student | 8 (M4, aged 15–16, B1–C1, all girls; labels only in the private `Roster.gs`) | phone first (375 px), also iPad/laptop | pick name, then 4-digit PIN |
| Demo | `Guest#1`, `Guest#2`, `Guest#3` (labels exactly so) | any | same |
| Teacher | T.Chris | laptop (1366 px), phone works | `teacher.html`, teacher PIN |

Student ids are fixed and contain no name: `s01`–`s08` for the eight students in the order above, `g1`–`g3` for the guests. The id→label→PIN mapping exists **only** in the private `Roster.gs`. Sheet rows hold ids, never labels.

### 1.3 Releases

| Release | Live by | Contents |
|---|---|---|
| **R1** | Sat 21 Nov 2026 if possible; Mon 23 Nov at the latest | Login; first step + part-of-speech guess; Audition (word card, zero-baseline record, registration request, FUDGE prediction, hypotheses); Debut plan (choices, six rules, plan table); master plan view; weekly checklist + Sunday review; action log; journal (Lab Book); sightings + screenshots; "I had a problem"; guide layer ("what to do now", "Stuck?"); XP, ranks, badges, streak, class XP board; **Baseline report helper** (due Wed 25 Nov, so it must be in R1); **Wave 1 entry (teacher) and the student's read-only wave card** (the Baseline report needs Wave 1 data); teacher portal: class overview, student page, feedback, approvals (term, "ask T.Chris first", early online unlock, problem flags), PIN reset, CSV export. |
| **R2** | **Wed 2 Dec 2026** for auditors (L11 on Thu 3 Dec assigns auditors and introduces the Intermediate report); **Mon 7 Dec** for the rest | Wed 2 Dec: auditor assignment, audit screen, teacher spot-check queue, Intermediate report helper. Mon 7 Dec: Charts (wave charts, FUDGE dashboard, tallies); Summit Pack (all of §11). |
| **R3** | Mon 4 Jan 2027 (Pivot card usable in L15, Wed 30 Dec, if ready) | Encore: Pivot card and phase 2 plan, Waves 3–4, Final report helper, Article Pack (§12), peer-review notes. |

Release gating: `config.js` holds `window.WI_CONFIG.release` (1, 2 or 3). Screens of a later release show a "Opens on <date>" card, never a broken screen. **All Sheet tabs, columns and API actions for R1–R3 are created in R1** so later releases add no schema change.

### 1.4 Out of scope
In-app messaging or posting; AI calls of any kind; email; anything that posts to or reads from a social platform; marks or grades; the Observatory class games (APP-04 Contagion simulator, APP-05 Slang Stock Exchange): see §17 Q1, nothing is designed for them here.

## 2. Screens and navigation
### 2.1 Conventions (all screens)
- Hash routes. Student app `index.html#/…`; teacher portal `teacher.html#/…`.
- Phone first: designed at 375 × 667, no horizontal scroll; tap targets ≥ 44 px; one column. At ≥ 900 px a two-column layout (nav rail left).
- Student bottom nav, five tabs: **Home** `#/home` · **Week** `#/week` · **Log** `#/log` · **Plan** `#/plan` · **More** `#/more`. A floating "+" on Home, Week and Log opens the quick-add sheet: Action · Lab Book entry · Sighting · Tally · Screenshot.
- Every form saves a draft to `localStorage` on each change (key `wi.draft.<route>.<id>`) and shows "Saved on this phone" / "Saved" (server) / "Waiting to send (offline)".
- Field notation: `name` · type · R (required) or O (optional) · limits. Text limits are characters unless "words" is written. All text is trimmed; empty after trim counts as missing.
- Validation messages are B1 English, one sentence, placed under the field.
- UI English only, B1–B2, British spelling. No emoji where direction matters; no figures of people except original SVG of girls (idol trainee mascot is optional; if drawn, a girl in SW-style blouse and navy skirt).
- Visual identity (W2, with `frontend-design`): stage/idol theme (the placeholder page already uses ink `#1d1430`, paper `#fff7fb`, pop pink `#e5337a`, gold `#f2b632`); light and dark; signature element: a seven-light "stage path" showing the seven stages. CSS, inline SVG and emoji only. No Gemini art, no photos.

### 2.2 Student app: route list

| Route | Screen | Release |
|---|---|---|
| `#/login` | Sign in | R1 |
| `#/first` | First step (word, meaning, example, part of speech) | R1 |
| `#/review` | Weekly review (forced screen when due, §5.5) | R1 |
| `#/home` | Home | R1 |
| `#/week` , `#/week/<weekId>` | Weekly checklist | R1 |
| `#/plan` | Master promotion plan (timeline) | R1 |
| `#/audition` | Stage 1 hub: word card, zero-baseline record, registration, FUDGE, hypotheses | R1 |
| `#/debut` | Stage 2 hub: choices, six rules, plan table | R1 |
| `#/log` , `#/log/action/<id>` , `#/log/journal/<id>` , `#/log/sighting/<id>` , `#/log/tally/<id>` | The Log: four tabs (Actions, Lab Book, Sightings, Tallies) and their forms | R1 |
| `#/files` | My screenshots | R1 |
| `#/report/baseline` , `#/report/intermediate` , `#/report/final` | Report helpers | R1 / R2 / R3 |
| `#/charts` | Charts: waves, FUDGE dashboard, tallies | R1 (wave card only), R2 full |
| `#/audits` , `#/audits/<auditId>` | My audit task | R2 |
| `#/summit` , `#/summit/<tab>` | Summit Pack | R2 |
| `#/encore` , `#/encore/pivot` , `#/encore/article/<tab>` , `#/encore/peer` | Pivot card, Article Pack, peer review | R3 |
| `#/guide` , `#/guide/<stageId>` | Guide: what to do now, idea banks, prompts, sentence frames | R1 |
| `#/board` | Class XP board | R1 |
| `#/more` | Menu: Audition, Debut plan, Charts, Summit, Encore, Reports, Guide, Screenshots, Board, Badges, the six rules, "I had a problem", Sign out | R1 |
| `#/problem` | "I had a problem" | R1 |
| `#/rules` | The six rules (read-only after ticking) | R1 |

**Routing guard, in this order:** (1) no valid session → `#/login`; (2) no confirmed first step (`Words.posConfirmed` false) → `#/first`; (3) a weekly review is due (§5.5) → `#/review`; (4) otherwise the requested route, default `#/home`.

### 2.3 Student screens: fields
**S-LOGIN `#/login`.** `studentId` · select from roster labels (from `roster` action) · R. `pin` · numeric keypad, exactly 4 digits · R. Button "Sign in". Errors: "That PIN is not right. Tries left: n." / "Too many tries. Wait 5 minutes." If the roster call fails: "Cannot reach WordIdol. Check your internet and try again." (no free-text name fallback; this app is per-student). Link "I am the teacher" → `teacher.html`.

**S-FIRST `#/first`** (see §3). Fields: `word` · text · R · 2–30 chars, letters, spaces, hyphens and apostrophes only, 1–3 words. `meaning` · textarea · R · 10–200. `example1` · textarea · R · 15–200, must contain the word or an inflected form (§3.2 step 2). Then the guess card: `pos` · radio (Noun, Verb, Adjective, Adverb, Interjection, Phrase / other) · R, pre-set to the guess; `posAlso` · checkboxes, same list · O ("My word can also be a …"). Button "This is right — save".

**S-HOME `#/home`.** Read-only cards, top to bottom: (1) word chip: word, part of speech, registration status; (2) stage path (7 lights) with the current stage name; (3) teacher feedback, newest unread first, each with "Got it" (marks read); (4) **Next step**: one button computed by `WI.nextStep(state)` (§10.2); (5) This week: n done / n open / n carried, next due date, button "Open my week"; (6) rank, XP bar, review streak; (7) next milestone and days left (from §4.2); (8) the analysis-over-adoption line (§1.1); (9) "Stuck?" button (§10.5).

**S-WEEK `#/week`.** Header: week label ("Week 2 · Mon 23 – Sun 29 Nov"), previous/next arrows (past weeks read-only). Groups in order: **Must do** (required), **Recommended**, **Your plan** (plan-action items), **Because you chose …** (choice-driven), **Carried** (badge "carried ×n"), **Optional**, **My own**. Each row: tick box, title, due date, tag for the deliverable it feeds, chevron to open "why" text and the "Do it" button (goes to the linked screen). Items with a `check` (§5.2) show an arrow instead of a tick box and tick themselves. Locked online items show a padlock and "Opens after the L9 safety briefing and the six rules". Add own item: `title` · text · R · 5–80; `dueDate` · date within this week or next · O; max 5 own items a week.

**S-PLAN `#/plan`.** Read-only vertical timeline from §4: seven stages, milestones M01–M16 with date, days left, status (done / next / later), the two deliverables highlighted, phases ("Cycle 1", "Cycle 2"), the light weeks shaded. Tap a milestone → what it needs and the checklist items that feed it (from `data/coverage.js`), each with done/open. Below: "My choices" summary with "Change my choices" (→ `#/debut`).

**S-AUDITION `#/audition`.** Six cards, each opens a form; a card shows ✓ when its check passes.

1. *Word card.* The first-step fields (editable, §3.4) plus: `usageRules` · textarea · R · 20–400 (label "Rules for using it: grammar, who says it, when"). `forms` · auto-suggested from `pos` (noun: plural; verb: -s, -ed, -ing; adjective: comparative, superlative), each text · O · ≤30. `pronunciation` · text · O · ≤60 ("Say it like …"). `formation` · select · R: Blending, Clipping, Compounding, Conversion, Borrowing, Coinage, New meaning for an existing word (semantic shift), Other. `sourceWords` · text · R · 3–150 ("Where it comes from"). `example2`, `example3` · textarea · R · 15–200 each, must contain the word. `doNotUse` · textarea · O · ≤200 ("When it would be wrong to use it"). `purpose` · textarea · R · 20–300 ("What is it for? The purpose can be membership of an 'in' group."). `notRudeConfirmed` · tick · R, label exactly: "My word is not negative or rude, and is not related to religion, monarchy, politics, gender or race."
2. *Zero-baseline record* (RES-05) — §13.1.
3. *Send for approval* — §13.2.
4. *FUDGE prediction.* Five sliders `F`, `U`, `D`, `G`, `E` · integer 0–2 · R, labels: Frequency of use, Unobtrusiveness, Diversity of users and situations, Generation of other forms and meanings, Endurance of the concept. `reasons.F` … `reasons.E` · text · R · 10–200 each. Shows total /10 and band (7+ likely, 5–6 fringe, 4 or less doomed) with the note "This is your prediction, not a mark."
5. *Research question and hypotheses* (RES-07; L6 homework). `researchQuestion` · textarea · R · 15–250 (frames: "To what extent …?"). Then 2–4 hypotheses: `text` · R · 20–250; `metric` · select · R: Recognition, Corrected recognition, Comprehension, Evidence Level reached, Other; `target` · text · O · ≤40 (e.g. "10% by Wave 2"). Sentence frames from `data/frames.js` group `hypothesis`.
6. *Spec sheet R1–R10* (research notes §7.1). One row per requirement R1–R10 with its quick test shown: `result` · radio · R: Passes / Not yet / Does not fit my route; `note` · text · O · ≤150. Shows "n of 10 pass" with the line "A word can still be a good project if it fails some of these. Explain why in your Lab Book." Stored as `Words.specSheet` (json `{R1:{result,note},…}`).

**S-DEBUT `#/debut`.** Three cards.

1. *My choices.* `targetGroups` · multi-select · R, ≥1, options §5.6 table A. `ideas` · multi-select · R, ≥1 and at least one in-person idea, options table B ("ask influencers to help promote" shows as "ask T.Chris first" and opens the request form: `text` · R · 20–300 "What do you want to ask, and who?"; it stays locked until approved). `platforms` · multi-select · R: In person only, TikTok, Instagram, Facebook, YouTube, Private chats, Other (with `platformOther` · text · ≤30); "In person only" cannot be combined with others. `route` · radio · R: Utility (it names something people need a word for) / Play (it is fun to say or share) / Semantic shift (an old word with a new meaning). `timeBudget` · radio · R: Light (about 30 min a week) / Standard (about 1 hour) / Stretch (about 2 hours). `who`, `why`, `what` · textarea · R · 20–300 each (labels "Who is my crowd?", "Why would they need this word?", "What exactly will they hear or see?"). `spark` · textarea · O · ≤300 ("What could start it?"). `projectAccount` · text · O · ≤40 (account name only; never a password). `is16` · radio "I am 15 or under / I am 16 or over" · R if any online platform is chosen; **kept on the device only** (`localStorage`), used to choose age-exact safety wording, never sent to the server.
2. *The six rules.* The six rules verbatim (§14.1), one tick box each; all six needed. Under rule 5 and 6 a plain note: "Paid or traded use is not real use. It gives you false data." Button "I agree to follow these rules" → `rules.tick`.
3. *My plan table.* Rows (planned actions), ≥3 to pass: `where` · select channel (§5.6 table C) · R. `ideaId` · select from her chosen ideas · R. `what` · text · R · 10–200. `why` · text · R · 10–200. `theoryTag` · select · O (`data/guide.js` `theory[]`). `whenDate` · date · R, Sat 21 Nov 2026 – Fri 15 Jan 2027. `evidence` · select · R: evidence type (§5.1). `targetGroup` · select from her target groups · O. Online channels can be planned before unlock but are marked "locked until unlocked" and cannot be logged as done.

**S-LOG-ACTION.** `date` · date · R · not in the future, not before 16 Nov 2026. `planActionId` · select "Which planned action was this?" · O (prefills the rest). `channelId` · select · R. `ideaId` · select · O. `what` · textarea · R · 10–400 ("What I did"). `outcome` · radio · R: As planned / Changed / Did not do it. `outcomeReason` · text · R if not "As planned" · 10–300. `audience` · select · O: 1 person, 2–5, 6–20, 21+, Not sure. `reaction` · textarea · O · ≤400 (hint: "Write 'a classmate', 'a cousin'. Never a full name."). `learned` · textarea · O · ≤400. `problem` · tick "I had a problem" · O → opens `#/problem` after save. Screenshots · up to 3 (§7.3). Logging an online channel while locked is refused (`LOCKED_ONLINE`).

**S-LOG-JOURNAL (Lab Book).** `date` · R. `kind` · select · R: Reflection, Zero-result week, A failed action analysed, Theory link, Summit feedback, Final reflection, Free note. `promptId` · the prompt shown (she can swap, `data/guide.js` `labPrompts[]`) · O. `text` · textarea · R · 40–3000 chars; live word count. Screenshots · up to 2.

**S-LOG-SIGHTING.** `date` · R. `channelId` · select · R. `relation` · select · R: Me, A classmate, A friend in another class, A friend outside school, A cousin, A family member, An online friend I know in real life, Someone I do not know, Not sure. (No free-text "who" field exists.) `quote` · textarea · R · 2–200 ("What was said or written"). `context` · text · O · ≤200. `prompted` · radio · R: I asked them to / They used it without being asked / Not sure. `marked` · radio · R: Used it naturally / Used it with a comment about the word (for example "as my friend says", quotation marks, a laugh) / Not sure. `topic` · select · R: School work, Exams, Friends, Food, Weather, Phones and apps, Games, Family, Travel, Other (feeds "diversity of contexts", research notes §7.3). `posUsed` · select · R: Noun, Verb, Adjective, Adverb, Interjection, Not sure. `derivedForm` · text · O · ≤30 ("Did they make a new form of it? For example -y, -ed, -er"). `level` · select · R, only levels **0, 1, 4, 5 and 6** (Levels 2 and 3 come from the survey, never from a sighting; they are shown greyed with "comes from the survey"); labels and help from `data/levels.js` (§10.6). `owned` · set by the engine: true when `relation` is "Me" or `prompted` is "I asked them to"; shown as "owned" / "earned". `link` · URL · O · https only, ≤300. `verifiable` · radio "Could T.Chris check this?" · R. Screenshots · up to 3. Reminder above Save: "Use 'a classmate' or 'a cousin'. Never write a full name or username."

**S-LOG-TALLY.** `date` · R. `tallyType` · select · R: I said it, I heard someone else say it, Someone asked what it means, Someone used it online. `count` · integer 0–99 · R (0 is a valid, useful result). `context` · select channel · O. `note` · text · O · ≤200.

**S-FILES `#/files`.** List of her screenshots: caption, date, what it is attached to, toggles "Use in Summit Pack" / "Use in Article Pack", Delete. Counter "n of 80". Images load only when tapped (§7.3).

**S-PROBLEM `#/problem`.** Shows rule 4 verbatim and "Stop the activity now. Tell T.Chris or your homeroom teacher today, in person or by Line. This form only puts a flag on T.Chris's screen; it does not send a message." `category` · select · R: Negative comment, Someone I do not know contacted me, I feel uncomfortable, Something else. `note` · textarea · O · ≤300 ("No names."). `stoppedConfirmed` · tick "I have stopped this activity" · R. No XP, no penalty.

**S-CHARTS, S-AUDITS, S-SUMMIT, S-ENCORE, S-REPORT:** fields in §13.3–13.4, §11, §12 and §11.8.

**S-BOARD `#/board`.** Table: rank name, label, XP, review streak. Guests never shown. Caption: "XP comes from documenting your project honestly. It never comes from how far your word spreads."

### 2.4 Teacher portal: routes and fields

| Route | Screen | Release |
|---|---|---|
| `#/login` | `pin` · numeric, 6–8 digits · R | R1 |
| `#/class` | Class overview | R1 |
| `#/s/<studentId>` , `#/s/<studentId>/<tab>` | Student page | R1 |
| `#/approvals` | Pending: term registrations, "ask T.Chris first" requests, word-change requests, open problem flags | R1 |
| `#/waves` , `#/waves/<waveId>` | Wave results entry | R1 |
| `#/spot` | Spot-check queue | R2 |
| `#/export` | CSV export | R1 |
| `#/settings` | Online-unlock time, board on/off, Summit slots, PIN reset, purge guests, run weekly job now | R1 |

**T-CLASS.** One row per student (guests in a separate collapsed group). Columns: label · stage · this week done/open/carried · last activity (relative; red if ≥ 7 days) · XP · review streak · six rules (0–6) · online (locked / unlocked auto / unlocked by teacher) · sightings this week and total, owned / earned (teacher view only; never shown to students as a comparison) · flags. Flag chips, fixed ids: `F_PROBLEM` (open "I had a problem"), `F_QUIET` (no entry for 7+ days; entry = any Action, Journal, Sighting, Tally or checklist tick), `F_DEADLINE` (a milestone within 3 days with required items feeding it still open), `F_PENDING` (pending approvals for her), `F_CANNOT` (a required item marked "could not do"). Sort: `F_PROBLEM` first, then number of flags.

**T-STUDENT.** Header: label, word, part of speech, registration status, stage. Tabs: **Timeline** (everything in date order, newest first, filter chips: Word card, Plan, Actions, Lab Book, Sightings, Checklist, Screenshots, Tallies, Waves, Reviews; actions show planned vs done side by side; sightings show Evidence Level and audit state; screenshots load on tap) · **Week** (her checklist, any week) · **Summit readiness** (ASM-04 rows from `data/coverage.js`: each requirement with its feeding items done/open, plus Pack completeness §11.7) · **Article readiness** (same for `ART-*`) · **Feedback** (list + new). Every entry in the timeline has "Comment": `text` · textarea · R · 2–600 → `t.feedback` with `targetType`/`targetId`. **There is no edit control on any student entry.**
Teacher actions on this page: Approve term / Ask for changes (`comment` · R for changes · ≤400); Unlock online early / Lock again; Mark flag handled (`teacherNote` · O · ≤300); Reset PIN (`newPin` · 4 digits · R; shown once).

**T-WAVES.** For `waveId` W1–W4: `date` · R; `classesNote` · text · O · ≤100 (e.g. "M2/3, M3/1"; no student names). Grid of 12 rows: 8 terms (row label = student label + her word), 2 controls (aura farming, crash out), 2 foils (drovish, trelky). Columns per row: `n` · integer 1–999 · R; `recognised` · 0–n · R; `notSure` · 0–n · R; `comprehended` · 0–`n` · R (0 for foils). Rule `recognised + notSure ≤ n`. Shows computed % and corrected recognition (§13.4). "Save draft" / "Publish to students" (students see nothing until published).

**T-SPOT.** Queue rows: student, date, channel, relation, quote, claimed level, auditor verdict, reason queued, screenshot (tap). `verdict` · radio · R: Confirm / Change level / Reject as evidence. `level` · 0–6 · R if Change. `comment` · O · ≤300.

**T-EXPORT.** `tab` · select: any data tab of §7 except `Sessions`, `Log` · R; `studentId` · select or All · R; "Include guests" · tick, default off. Downloads CSV (labels added as a column on the client from the roster; the CSV on Chris's laptop is his to protect).

## 3. First step and the part-of-speech guesser
### 3.1 Flow
1. After her first sign-in the app opens `#/first`: "Before anything else, tell us about your word." Three fields on one screen: `word`, `meaning`, `example1`.
2. On "Next", the app runs `WI.pos.guess(word, example1)` in the browser (no network, no AI).
3. Guess card: "In your sentence, **vronk** looks like a **noun**." + the reason (one plain sentence, §3.3) + confidence wording: high → "I am fairly sure."; medium → "I think so, but check."; low or none → "I am not sure. Please choose." + radio list of the six choices, the guess pre-selected (nothing pre-selected for `unknown`), the alternatives marked "also possible".
4. She confirms or changes, may tick `posAlso`, and saves. Saved: `pos`, `posGuess`, `posRule`, `posConfidence`, `posConfirmed = true`. XP rule X01.
5. The app goes to `#/audition`; the rest of the word card unlocks. Until step 4 is saved, every other route redirects to `#/first`.

### 3.2 Algorithm (exact; W4 implements in `engine.js` as `WI.pos`)
**Step 1, normalise.** Lower-case both strings; change curly apostrophes to `'`; delete double quotation marks. Split the sentence on white space. For each chunk, strip leading and trailing characters that are not `a–z`, `0–9` or `'`; keep the stripped trailing characters as that token's `trail`. A boundary is a `trail` containing any of `. ! ? ; : ,`.

**Step 2, find the target.** Split the word into 1–3 tokens. Pass 1: the first position where the sentence tokens equal the word tokens exactly. Pass 2 (only if pass 1 fails): the first position where they are equal except that the **first or the last** word token (one of them only) appears in an inflected form. Inflected forms of a base `b` and their `suffix` label:

| suffix | forms tried |
|---|---|
| `s` | b+s, b+es, consonant+y → ies |
| `ed` | b+ed, b ending in e → +d, consonant+y → ied, CVC → double last letter +ed |
| `ing` | b+ing, drop final e +ing, CVC → double +ing |
| `er` | b+er, e → +r, CVC → double +er, consonant+y → ier |
| `est` | b+est, e → +st, CVC → double +est, consonant+y → iest |
| `y` | b+y, CVC → double +y, drop final e +y |
| `ly` | b+ly, consonant+y → ily |
| `poss` | b+'s |

CVC = the base ends consonant + vowel + consonant other than w, x, y. No token inside a multi-word target may have a boundary `trail`. Not found → rule P00.

**Step 3, context.** `prev` = the token before the target, or none if the target starts the sentence or the token before has a boundary. `ps` = the nearest token before the target that is not in SKIP, or none if a boundary is crossed. `prev2` = the token before `prev` (none if `prev` is none or that token's trail has `. ! ? ; :`). `next` = the token after the target, or none if the target's last token has a boundary or the sentence ends (`endClause`). `sentStart` = the target is the first token. `ownIng` = no suffix and the target's last token ends in `ing`. `detLike` = `prev` is in DET, **or** `prev` ends in `'s` and is not in BE or MODAL, **or** `prev` is in PREMOD and `prev2` is in DET.

**Word lists (fixed; in `engine.js`, tested by the validator):**

- DET: a an the this that these those my your her his our their its some any no every each another such what which whose one two three four five many few several much all both
- INT (intensifiers): so very really too super kinda pretty quite totally extra hella mad lowkey highkey
- MODAL (modals, do-support, let's): can could will would should must might may shall cannot can't couldn't won't wouldn't shouldn't mustn't don't doesn't didn't do does did let's gonna wanna gotta i'll you'll she'll he'll it'll we'll they'll that'll
- TOLEAD: want wants wanted need needs needed going try tries tried trying like likes love loves have has had used about got began started ready time hate hates learn decided
- SUBJ: i you we they people everyone everybody girls friends students · SUBJ3: she he it who nobody someone somebody
- BE: am is are was were be been being i'm you're she's he's it's that's we're they're what's who's isn't aren't wasn't weren't ain't
- LINK: feel feels felt feeling look looks looked looking seem seems seemed sound sounds sounded get gets got getting become becomes became stay stays stayed
- HAVE: have has had need needs want wants give gives gave bring brings brought
- PREP: of with for about in on at from by like without into than as
- SKIP: always never often sometimes usually just already still even also actually literally basically probably definitely not
- KEEP: stop stops stopped keep keeps kept start starts started
- PREMOD: total real complete classic big little proper absolute whole new
- CAUS: let lets make makes made watch watched help helps see saw · OBJP: her me them us him it you
- OBJ: it me that the your this them us her him my a an
- CVERB: went came made happened hit began started ended works worked goes comes makes means meant saved ruined got
- FUNC = DET ∪ MODAL ∪ BE ∪ LINK ∪ HAVE ∪ PREP ∪ SUBJ ∪ SUBJ3 ∪ {and but or because when if while so then now today again here there to me us them him}

**Step 4, rules. The first rule that matches wins.** Result = `{pos, conf, rule, alt[]}`; `pos` ∈ noun, verb, adjective, adverb, interjection, unknown; `conf` ∈ high, medium, low, none.

| # | Rule id | Condition | Result (conf; alternatives) |
|---|---|---|---|
| 1 | P00 | target not found | unknown (none) |
| 2 | P01 | the sentence is only the target | interjection (high) |
| 3 | P01 | `sentStart`, no suffix, and the target's trail has `!` or `,` | interjection (high) |
| 4 | P01 | `prev` none and `endClause`, no suffix, trail has `!` | interjection (medium; noun) |
| 5 | P02 | suffix `ly` | adverb (high; adjective) |
| 6 | P03 | suffix `est` | adjective (high) |
| 7 | P03 | suffix `er` and `next` = than | adjective (high) |
| 8 | P04 | suffix `er` and `prev` in DET | noun (medium; adjective) |
| 9 | P03 | suffix `er` (other) | adjective (medium; noun) |
| 10 | P05 | suffix `y` | adjective (medium; noun) |
| 11 | P06 | suffix `poss` | noun (high) |
| 12 | P07 | (suffix `ing` or `ownIng`) and `ps` in BE or KEEP | verb (high if suffix `ing`, medium if `ownIng`; noun) |
| 13 | P13 | `ownIng`, `sentStart`, `next` in BE or MODAL | noun (high; verb) |
| 14 | P10 | `ownIng` and `prev` in DET or PREP | noun (medium; verb) |
| 15 | P07 | suffix `ing` (other) | verb (medium; noun, adjective) |
| 16 | P08 | suffix `ed` and `ps` in SUBJ, SUBJ3 or {have has had i've we've they've you've} | verb (high; adjective) |
| 17 | P08 | suffix `ed` (other) | verb (medium; adjective) |
| 18 | P09 | suffix `s` and `prev` in DET | noun (high) |
| 19 | P09 | suffix `s`, `sentStart`, `next` in BE or MODAL | noun (high; verb) |
| 20 | P09 | suffix `s` and `ps` in SUBJ3 or DET | verb (medium; noun) |
| 21 | P09 | suffix `s` and `ps` in PREP | noun (medium; verb) |
| 22 | P09 | suffix `s` (other) | verb (low; noun) |
| 23 | P11 | `prev` = to | verb (high if `prev2` in TOLEAD, else medium; noun) |
| 24 | P12 | `ps` in MODAL | verb (high) |
| 25 | P12 | `prev2` in CAUS and `prev` in OBJP | verb (high) |
| 26 | P13 | `sentStart` and `next` in BE or MODAL | noun (high; adjective) |
| 27 | P14 | `prev` in INT, `prev2` in SUBJ or SUBJ3, and `next` exists | verb (medium; adjective) |
| 28 | P14 | `prev` in INT (other) | adjective (high; adverb) |
| 29 | P10 | `detLike` and (`endClause`, or `next` in FUNC or CVERB, or `next` ends in `ed`) | noun (high; adjective) |
| 30 | P10 | `detLike` (other: a content word follows) | adjective (medium; noun) |
| 31 | P15 | `ps` in BE or LINK | adjective (high if `ps` in LINK and not get/gets/got/getting, else medium; noun) |
| 32 | P16 | `ps` in HAVE and `endClause` | noun (medium; adjective) |
| 33 | P17 | `prev` in PREP | noun (medium; adjective) |
| 34 | P18 | `ps` in SUBJ | verb (high if `next` exists, else medium; noun) |
| 35 | P18 | `ps` in SUBJ3 | verb (low; adjective) |
| 36 | P19 | `sentStart` and `next` in OBJ | verb (medium; interjection) |
| 37 | P20 | `endClause` and `prev` exists and is not in FUNC | noun (low; adjective, adverb) |
| 38 | P21 | anything else | unknown (low; noun, verb, adjective) |

Rows 13–14 apply only when `ownIng`; if `ownIng` and none of rows 12–14 matches, continue from row 23 (the word is treated as a base form).

### 3.3 Reasons shown (`data/guide.js` `posReasons`, keyed by rule id; W3 may polish wording, keep meaning; `{w}` = her word as written in the sentence, `{p}` = the word before it)

| Rule | Reason text |
|---|---|
| P00 | I cannot find your word in the sentence. Check the spelling, or choose below. |
| P01 | "{w}" stands alone, like "Wow!" or "Oops!". Words like that are interjections. |
| P02 | "{w}" ends in -ly and describes how something is done, like "quickly". |
| P03 | "{w}" compares things, like "bigger" or "biggest". Adjectives do that. |
| P04 | "{p} {w}" names a person or thing, like "a runner". |
| P05 | "{w}" ends in -y and describes something, like "messy". |
| P06 | "{w}" owns something ('s), so it is a noun. |
| P07 | "{w}" is an -ing form after "{p}", like "is running" or "stop talking". That is a verb. |
| P08 | "{w}" ends in -ed, like "walked". It shows something happened, so it is a verb. |
| P09 | "{w}" has an -s ending. After "the" or a number that is a plural noun; after "she" or "it" it is a verb. |
| P10 | "{p}" comes before your word, as in "a cat" or "my bag". If your word is the thing itself, it is a noun; if it describes the next word, it is an adjective. |
| P11 | "to {w}" looks like "to run": a verb. |
| P12 | "{p} {w}" is like "can run" or "don't run": a verb. |
| P13 | Your word starts the sentence and "is/are/can" follows, so it is the thing the sentence is about: a noun. |
| P14 | "{p}" makes a describing word stronger, as in "so cool": an adjective. |
| P15 | After "{p}" your word describes someone or something, like "is happy" or "feels tired": an adjective. |
| P16 | After "{p}" your word is a thing someone has or gets: a noun. |
| P17 | After "{p}" your word is a thing, as in "with style": a noun. |
| P18 | "{p} {w}" is someone doing something, like "I run": a verb. |
| P19 | Your word starts the sentence and tells someone to do something, like "Open it": a verb. |
| P20 | Your word ends the sentence as a thing: probably a noun. |
| P21 | I cannot tell from this sentence. Please choose. |

For P09 and P10 the engine shows only the half of the sentence that matches the result.

### 3.4 Editing later
Changing `word`, `meaning` or `pos` after `regStatus` is `approved` writes a `WordHistory` row for each changed field and sets `regStatus` back to `submitted` (teacher sees it under approvals as a word change). Changing `example1` re-runs the guess and shows it, but never overwrites a confirmed `pos` without her tap.

### 3.5 Test set (`data/postests.js`, run by `tools/validate.js`; all 58 must match on `pos`, `conf` and `rule`)
These results were produced by a scratch prototype of the rules above (58 of 58 pass), so the table and the rules agree.

| # | Word | Sentence | pos | conf | rule | alternatives |
|---|---|---|---|---|---|---|
| 1 | vronk | That was a total vronk. | noun | high | P10 | adjective |
| 2 | vronk | What a vronk! | noun | high | P10 | adjective |
| 3 | vronk | I had three vronks before lunch. | noun | high | P09 | – |
| 4 | vronk | My vronk happened right before the exam. | noun | high | P10 | adjective |
| 5 | vronk | Vronk is my word for a sudden problem. | noun | high | P13 | adjective |
| 6 | vronk | The printer died, a classic vronk moment. | adjective | medium | P10 | noun |
| 7 | vronk | That test was so vronk. | adjective | high | P14 | adverb |
| 8 | vronk | I feel vronk today. | adjective | high | P15 | noun |
| 9 | vronk | It looks really vronk in that light. | adjective | high | P14 | adverb |
| 10 | vronk | This is the vronkest day of my life. | adjective | high | P03 | – |
| 11 | vronk | My morning was vronker than yours. | adjective | high | P03 | – |
| 12 | vronk | Everything went a bit vronky after that. | adjective | medium | P05 | noun |
| 13 | vronk | Please don't vronk my project. | verb | high | P12 | – |
| 14 | vronk | I want to vronk the whole plan. | verb | high | P11 | noun |
| 15 | vronk | The wifi vronked me again. | verb | medium | P08 | adjective |
| 16 | vronk | She always vronks before a big test. | verb | medium | P09 | noun |
| 17 | vronk | We are vronking right now. | verb | high | P07 | noun |
| 18 | vronk | I vronk every Monday morning. | verb | high | P18 | noun |
| 19 | vronk | You can vronk anything if you try. | verb | high | P12 | – |
| 20 | vronk | She walked vronkly into the room. | adverb | high | P02 | adjective |
| 21 | vronk | Vronk! I left my homework at home. | interjection | high | P01 | – |
| 22 | vronk | Vronk, the bus has gone. | interjection | high | P01 | – |
| 23 | vronk | Vronk! | interjection | high | P01 | – |
| 24 | vronk | I love my new shoes. | unknown | none | P00 | – |
| 25 | drip | That outfit is so drip. | adjective | high | P14 | adverb |
| 26 | drip | She has drip. | noun | medium | P16 | adjective |
| 27 | drip | Her drip is amazing today. | noun | high | P10 | adjective |
| 28 | drip | Check out the drip on that jacket. | noun | high | P10 | adjective |
| 29 | cook | Let her cook. | verb | high | P12 | – |
| 30 | cook | She cooked in that debate. | verb | high | P08 | adjective |
| 31 | cook | They are cooking today. | verb | high | P07 | noun |
| 32 | mid | The film was kinda mid. | adjective | high | P14 | adverb |
| 33 | mid | That is a mid answer. | adjective | medium | P10 | noun |
| 34 | ghost | Don't ghost me this weekend. | verb | high | P12 | – |
| 35 | ghost | My friend ghosted the group chat. | verb | medium | P08 | adjective |
| 36 | salty | Why are you so salty? | adjective | high | P14 | adverb |
| 37 | flumsy | I feel flumsy after lunch. | adjective | high | P15 | noun |
| 38 | snerf | Stop snerfing and help me. | verb | high | P07 | noun |
| 39 | snerf | Can I have a snerf of your drink? | noun | high | P10 | adjective |
| 40 | blorp | Blorp it before the teacher sees. | verb | medium | P19 | interjection |
| 41 | zib | It got really zib in the room. | adjective | high | P14 | adverb |
| 42 | zib | We totally zib our homework every week. | verb | medium | P14 | adjective |
| 43 | quazzle | There was a lot of quazzle in the hall. | noun | medium | P17 | adjective |
| 44 | quazzle | The quazzles are back. | noun | high | P09 | – |
| 45 | aura farming | She is aura farming again. | verb | medium | P07 | noun |
| 46 | aura farming | Aura farming is tiring. | noun | high | P13 | verb |
| 47 | crash out | Don't crash out over one bad mark. | verb | high | P12 | – |
| 48 | crash out | I crashed out after the test. | verb | high | P08 | adjective |
| 49 | glow up | Her glow up was amazing. | noun | high | P10 | adjective |
| 50 | tea | Spill the tea! | noun | high | P10 | adjective |
| 51 | yeet | Yeet it into the bin. | verb | medium | P19 | interjection |
| 52 | fomo | I get fomo when I stay home. | adjective | medium | P15 | noun |
| 53 | bet | Bet. | interjection | high | P01 | – |
| 54 | slay | You slay every time. | verb | high | P18 | noun |
| 55 | nimp | That joke was nimp, but I laughed. | adjective | medium | P15 | noun |
| 56 | nimp | I'm not nimp, I'm just tired. | adjective | medium | P15 | noun |
| 57 | grell | She spoke with grell. | noun | medium | P17 | adjective |
| 58 | grell | It's giving grell. | noun | low | P20 | adjective, adverb |

Notes for the builder: #24 checks P00; #29 needs the CAUS rule ("Let her cook"); #45–#49 are multi-word terms; #52 is an honest limit ("fomo" is a noun, but after "get" the rules say adjective): the noun alternative must be offered, which is why the tests also check alternatives. Invented words: vronk, flumsy, snerf, blorp, zib, quazzle, nimp, grell. Semantic-shift words: drip, cook, mid, ghost, salty, tea, bet, slay.

## 4. The master promotion plan
### 4.1 Weeks (Mon–Sun, Asia/Bangkok). Fixed ids.

| weekId | Dates | Lessons (Wed, Thu) | Notes |
|---|---|---|---|
| W01 | Mon 16 – Sun 22 Nov 2026 | L6 Wed 18, L7 Thu 19 | Fri 20 Sport Day. **Sat 21 Nov: launch in person.** |
| W02 | 23 – 29 Nov | L8 Wed 25, L9 Thu 26 | Wave 1 Mon–Tue 23–24. Baseline report Wed 25. L9 safety briefing Thu 26. |
| W03 | 30 Nov – 6 Dec | L10 Wed 2, L11 Thu 3 | Sat 5 Dec holiday. |
| W04 | 7 – 13 Dec | L12 Wed 9 | Mon 7, Thu 10 and Fri 11 Dec holidays. Wave 2 Tue 8 – Wed 9. |
| W05 | 14 – 20 Dec | L13 Wed 16, L14 Thu 17 | Intermediate report Mon 14. Slides + abstract Tue 15. **Slang Summit.** Lab Book (before midterm) to Fri 18. |
| W06 | 21 – 27 Dec | none | Midterm exams. **Light week.** |
| W07 | 28 Dec – 3 Jan 2027 | L15 Wed 30 | Thu 31 Dec, Fri 1 Jan holidays. **Light week.** Pivot starts in L15. |
| W08 | 4 – 10 Jan | L16 Wed 6, L17 Thu 7 | Phase 2 relaunch. |
| W09 | 11 – 17 Jan | L18 Wed 13, L19 Thu 14 | Wave 3. Campaigns close Fri 15. |
| W10 | 18 – 24 Jan | L20 Wed 20, L21 Thu 21 | Final assessment report Fri 22. |
| W11 | 25 – 31 Jan | L22 Wed 27, L23 Thu 28 | Article draft for peer review Fri 29. |
| W12 | 1 – 7 Feb | L24 Wed 3, L25 Thu 4 | Peer review. Wave 4 (decay check). |
| W13 | 8 – 14 Feb | L26 Wed 10, L27 Thu 11 | **Research article Fri 12 Feb.** Plan ends Fri 12 Feb. |

`weekIdOf(date)` = `W` + two digits of `floor((date − Mon 16 Nov 2026 00:00 +07:00) / 7 days) + 1`; before W01 → W01, after W13 → W13 (the app then shows "The project has finished").
Lesson dates L1–L27 checked against `content_lessons.py` (Opus review): all agree. Homework from that file that the plan uses: L6 research question + 2–3 hypotheses; L8 Baseline report due that night; L9 launch, log sightings within 48 hours, weekly campaign log; L10 network map, 3 bridge targets; **L11 (Thu 3 Dec) audit your assigned classmate; Intermediate report template introduced**; L12 talk planner, Q&A practice, timed rehearsal; L15 run Phase 2; L19 campaigns close 15 Jan; L23 full draft due 29 Jan, reviewers assigned; L25 Wave 4 and revision with a response-to-reviewers note.

Lesson map (syllabus topics): L1 course launch, "fetch", Ethics Charter · L2–L3 word formation · L4–L5 lifecycle, FUDGE, register the term · L6–L7 research and survey design, ethics · L8 why things spread: diffusion, social proof, STEPPS · L9 launch pitch and safe-campaigning briefing · L10 networks and communities (ACT-07 network map) · L11 tracking evidence · L12 who owns slang; Wave 2; presentation workshop · L13–L14 Slang Summit · L15 Pivot and Relaunch (ACT-11) · L16–L17 anatomy of a research article (IMRaD) · L18–L19 literature review, citation, academic integrity · L20–L21 data analysis and visualisation · L22–L23 results and discussion: claims, evidence, hedging · L24–L25 peer review: mock editorial board · L26–L27 abstracts, titles, final revision, celebration.

### 4.2 Stages (idol theme). Fixed ids.

| stageId | Name | Opens | What happens | Gate to enter (never depends on spread) |
|---|---|---|---|---|
| `s1` | Audition | first sign-in | First step, word card, zero-baseline record, send for approval, FUDGE prediction, hypotheses | none |
| `s2` | Debut plan | with s1 | Choices, six rules, plan table, Baseline report | first step confirmed |
| `s3` | Fan club | Sat 21 Nov | In-person launch; first actions, sightings, Lab Book | six rules ticked **and** plan saved with ≥ 3 planned actions |
| `s4` | On tour | Thu 26 Nov (after L9) | Wider channels; online actions if unlocked; network map; audits | s3 entered **and** ≥ 3 action-log entries **and** ≥ 1 weekly review |
| `s5` | Charts | Mon 23 Nov | Wave results, FUDGE dashboard, tallies, hypothesis checks, Intermediate report | s3 entered **and** Wave 1 published |
| `s6` | Summit stage | Mon 7 Dec | Summit Pack, abstract, rehearsal, the talk, midway review and replan | s3 entered **and** date ≥ Mon 7 Dec |
| `s7` | Encore | Fri 18 Dec | Pivot, phase 2, Waves 3–4, Final report, Article Pack, peer review | date ≥ Fri 18 Dec |

`State.stage` = the highest stage whose gate is met (computed by `WI.stageOf(state, now)`, stored by the server on each write). A stage's screens are reachable from More as soon as its release is live, even before its gate; the gate only moves the stage path and the "what to do now" card. Registration approval by the teacher is **not** a gate (launch must not wait on it); an unapproved term shows an amber "Waiting for T.Chris" chip.

Phases: **Cycle 1** = W01–W05 (`phase` 1). **Cycle 2** = from Fri 18 Dec (`phase` 2). Entries get `phase` from their date.

### 4.3 Milestones (`data/plan.js` `milestones[]`: `{id, date, endDate?, title, kind, points?, stageId, weekId, lessons[], needs}`)

| id | Date | Title (as shown) | kind | Points |
|---|---|---|---|---|
| M01 | Sat 21 Nov | Launch your slang word (in person) | launch | – |
| M02 | Mon 23 – Tue 24 Nov | Wave 1 survey (T.Chris runs it) | wave | – |
| M03 | Wed 25 Nov | Baseline assessment report due | report | 5 |
| M04 | Thu 26 Nov | L9 safety briefing; online actions can open | safety | – |
| M05 | Tue 8 – Wed 9 Dec | Wave 2 survey | wave | – |
| M06 | Mon 14 Dec | Intermediate assessment report due | report | 5 |
| M07 | Tue 15 Dec | Summit slides and 50-word abstract due | summit | – |
| M08 | Wed 16 – Thu 17 Dec | **Slang Summit: 7 min + 2 min Q&A (midterm). Also your midway review and replan.** | deliverable | 20 |
| M09 | Fri 18 Dec | Lab Book check (before midterm) | labbook | 15 (with participation) |
| M10 | 21 Dec – 3 Jan | Exams and New Year: light, optional weeks | light | – |
| M11 | Wed 30 Dec | Pivot and Relaunch (L15): phase 2 design | pivot | – |
| M12 | week of 11 Jan; Fri 15 Jan | Wave 3 survey; campaigns close | wave | – |
| M13 | Fri 22 Jan | Final assessment report due | report | 5 |
| M14 | Fri 29 Jan | Article draft due for peer review | draft | – |
| M15 | week of 1 Feb; Wed 3 – Thu 4 Feb | Wave 4 (decay check); peer review: two reviewer reports | wave + review | 5 |
| M16 | Fri 12 Feb | **Research article due (final). Lab Book closes.** | deliverable | 30 (+15 Lab Book) |

Deliverable facts shown with M08: individual conference-style talk; approach, theory applied, evidence, learnings and Phase 2 plan; 7:00 + 2:00 (Chris, 19 Nov; the printed syllabus still says 3 min Q&A, §17 Q2); 4 talks in L13 and 4 in L14 (slots in `Config.summitSlots`); no outside judges; each talk has two assigned student questioners plus T.Chris.
With M16: article written as if for journal publication; IMRaD; 150–200-word abstract; 2,000–3,000 words; at least 6 sources; at least 3 data visuals; ethics statement; AI use declared.
With M03: 600–900 words; term profile (formation process, meaning, target community), FUDGE predictions and hypotheses, Wave 1 baseline data, campaign and safety plan. With M06: Wave 2 data, campaign log, early analysis against hypotheses, planned adjustments. With M13: Wave 3 data, Phase 1 vs Phase 2 comparison, campaign close-out.
All reports are **submitted in Google Classroom / Google Docs** (syllabus: version history is kept). WordIdol helps her build them and copy them out; it is not the submission channel.

## 5. The checklist engine
### 5.1 Item schema (catalogue entry, `data/checklist.js`)
```js
{ id:'F-W02-04',            // fixed id, formats below
  title:'Build your Baseline report and submit it in Google Classroom',   // ≤ 90 chars, B1
  why:'…',                  // ≤ 200 chars, one or two sentences (W3 writes, W4 owns the file)
  stage:'s2', week:'W02',   // week it first appears
  due:'2026-11-25',         // ISO date, Bangkok; ≤ the deliverable it feeds
  kind:'required',          // required | recommended | optional | own
  source:'fixed-course',    // fixed-course | plan-action | choice-driven | habit | carried
  feeds:['BAS-LEN'],        // requirement ids from §6
  xp:20,                    // 0–30
  evidence:'doc',           // log | journal | sighting | screenshot | tally | survey | record | doc | none
  route:'#/report/baseline',// screen that completes it
  check:'report.baseline.ready', // predicate key (§5.2) or null = she ticks it herself
  online:false,             // true = locked until online is unlocked
  release:1 }
```

Id formats: fixed-course `F-Wnn-xx`; habit `H-Wnn-x`; choice-driven `C-<RULE>` (instance once per student); plan-action `P-<planActionId>`; optional pool `X-nn`; own `O-<uuid8>`. Checklist **row** id in the Sheet: `<studentId>|<weekId>|<itemId>`.

Row status: `open` → `done` | `cannot` (could not do + reason) | `dropped` (optional/own only) | `carried` (closed by roll-over; a new open row exists in the next week) | `expired` (optional, unfinished at roll-over).

### 5.2 Completion and predicates
"She can check items off at any time": an item with `check: null` is ticked by hand, in any week, including past weeks. An item with a `check` ticks itself when the predicate becomes true (evaluated by `WI.checks[key](data)` in `engine.js`, on the client after every save and again on the server in `checklist.tick`); tapping it opens its `route`. A self-ticked item can not be un-ticked by hand; a hand-ticked one can.

Predicate keys (fixed): `word.first` (word, meaning, example1, posConfirmed) · `word.usage` (usageRules ≥ 20 chars) · `word.card` (all R fields of word card 1 incl. notRudeConfirmed) · `word.zb` (zero-baseline record complete §13.1) · `word.submitted` (regStatus ≠ draft) · `word.fudge` · `word.hypotheses` (researchQuestion ≥ 15 chars and ≥ 2 hypotheses) · `word.spec` (all ten spec-sheet rows answered) · `plan.choices` (phase 1 choices complete) · `rules.all` (six ticks) · `plan.actions3` (≥ 3 planned actions, phase 1) · `action.first` (≥ 1 action entry) · `week.action` (≥ 1 action entry dated in the week, or a journal entry of kind zero_result in the week) · `week.journal` (≥ 1 journal entry ≥ 40 words dated in the week) · `week.sightcheck` (≥ 1 sighting dated in the week, or a zero_result journal entry in the week) · `week.review` (review row for the week) · `week.audit` (no audit with status assigned for the week) · `wave.note.W1` … `wave.note.W4` (wave published and her note ≥ 20 words) · `sight.levels` (every sighting has a level) · `journal.failure` (≥ 1 failure_analysis entry) · `hyp.checked.W2`, `hyp.checked.W3` (every hypothesis has a status for that wave) · `report.baseline.ready`, `report.intermediate.ready`, `report.final.ready` (status ready or submitted) · `summit.outline` (all six sections ≥ 20 words) · `summit.aoa` (statement ≥ 25 words) · `summit.abstract` (45–55 words) · `summit.visuals` (≥ 1 chart chosen) · `summit.rehearsed2` (≥ 2 rehearsals) · `summit.qa5` (≥ 5 answers ≥ 15 words) · `summit.selfcheck` (all rows rated) · `summit.feedback` (journal kind summit_feedback) · `pivot.card` (phase 2 plan with variableChanged and p2Hypothesis) · `plan2.actions3` · `article.outline` (title + four section notes) · `article.sources6` · `article.visuals3` · `article.ethics` (≥ 60 words) · `article.ai` (aiDeclaration ≥ 10 words) · `article.abstract` (150–200 words) · `article.words` (2,000–3,000) · `article.sections.MR`, `article.sections.ID` (the two section pairs ≥ 300 words each) · `peer.r1`, `peer.r2` (reviewer notes ≥ 80 words) · `peer.plan` (revisionPlan ≥ 40 words) · `fin.compare` (Final report section `compare` ≥ 60 words) · `fin.close` (section `closeout` ≥ 60 words) · `journal.final` (final_reflection ≥ 150 words).

### 5.3 Generation (`WI.buildWeek(studentData, weekId)`; same code on client, in Node tests and in Apps Script through the generated `Shared.gs`, §15.1)
Backwards planning is done once, at authoring time: every deliverable requirement (§6) is traced back to fixed-course items placed in the latest sensible week before its due date; the validator proves the trace (§15.3). At run time the engine builds week *W* for a student in this order, skipping any item id she already has in a row with status `done`, `cannot`, `dropped` or `open`:

1. **Carried:** every row of week *W−1* with status `open` and kind ≠ optional → that row becomes `carried`; a new row in *W* with the same `itemId`, `source:'carried'`, `originWeek` kept, `carryCount + 1`, same `due`. Optional open rows become `expired`.
2. **Fixed-course:** all catalogue items with `week == W` and `release ≤ config.release`.
3. **Habit:** `H-W-*` items of §5.7.
4. **Plan-action:** each `PlanActions` row with status `planned` and `weekIdOf(whenDate) == W` → item `P-<id>`, title "Do: <what, first 70 chars>", kind recommended, `route:'#/log/action/new?plan=<id>'`, `evidence` from the plan row, `online` from its channel, `feeds:['LAB-PRE']` (W01–W05) or `['LAB-POST']`, xp 10, done when an action entry links to it. If a week holds more plan-actions than the time budget suggests (light 1, standard 2, stretch 3) the Sunday review says so and offers to move the extra ones; it never deletes them.
5. **Choice-driven:** each rule of §5.6 table D whose condition is true and whose item she has never had, if `W ≥` the rule's first week.
6. **Optional:** `n` items from the pool `X-nn` (light 0, standard 2, stretch 4), filtered by `stage`, not seen before, picked by a hash of `studentId + weekId` (stable, testable; not random per call).
7. **Review preferences** from her last review (`nextPrefs`): remove skipped optional ids, add her own items.

In light weeks (W06, W07) every newly generated item, the weekly review included, is forced to kind optional; carried required items keep their kind but show "after the break" and are not counted as overdue (or in flag `F_DEADLINE`) until W08.

### 5.4 Roll-over on the server
All week logic uses the **server clock in Asia/Bangkok**. Every API response carries `now` (ISO) and `weekId`; the client keeps `serverOffset` and never uses the device date for week or due logic. `ensureWeek_(studentId)` runs inside the lock at the start of `bootstrap`, `sync`, `t.overview`, `t.student` and in the Monday job: while `State.weekId < weekIdOf(now)` it closes the old week (step 1) and writes the rows for the next (steps 2–7), one week at a time, so a student who is away three weeks still gets correct carried counts. The Monday job (`weeklyJob`, time trigger, Mondays 00:10 Bangkok) runs it for everyone, then assigns audits (§13.3).

### 5.5 Sunday review
- **Due:** the review for week *W* opens at Sunday 00:00 Bangkok of week *W*. From then, the app opens on `#/review` until she submits it. If she misses Sunday, it is the first screen at her next sign-in (routing guard, §2.2). If two or more are due, she does the oldest in full and the others collapse to one tap ("Nothing to add for that week"). Light-week reviews (W06, W07) are offered on Home but never forced.
- **Screen, three steps.** (1) *This week:* every item, grouped done / not done. For each not-done item: **Carry it** (default) · **Could not do** (`reason` · text · R · 10–200) · **Drop it** (optional and own items only). Required items can only be carried or marked "could not do". (2) *Look back:* `wentWell` · textarea · R · 20–600; `toChange` · textarea · R · 20–600 (prompts from `labPrompts`). (3) *Next week:* the proposed checklist from `WI.buildWeek` for *W+1* (preview), with: untick optional proposals; add up to 5 own items; move a planned action to another date (`whenDate`). Button "Start my new week".
- **Submit** → `review.submit`. Server: writes the `Reviews` row; applies `cannot` / `dropped` now; leaves "carry" items open (they carry at roll-over and are marked "carried"); stores `nextPrefs`; awards XP (X12); updates the streak (§9.4). After submit on Sunday she sees next week's list as "Next week (starts Monday)".
- **Teacher sees:** done / open / carried counts for the current week on T-CLASS; on T-STUDENT › Week every row with status, dates, carry count and "could not do" reasons; the two review texts in the timeline; flag `F_CANNOT`.

### 5.6 Choice lists and choice-driven rules
**Table A — target groups** (`data/choices.js` `targetGroups[]`; wording kept from the Form):

`tg_5_16` 5–16 · `tg_17_19` 17–19 · `tg_20_30` 20–30 · `tg_31_60` 31–60 · `tg_61` 61+ · `tg_male` male · `tg_female` female · `tg_school` school friends · `tg_online` online friends · `tg_family` family · `tg_everyone` everyone · `tg_thai` Thai people · `tg_foreign` foreigners.

**Table B — promotion ideas** (`ideas[]`: `{id, label, mode}`; mode `inperson` | `online` | `either`; an `either` idea is in person or online according to the channel of each action):

| id | Label | mode | | id | Label | mode |
|---|---|---|---|---|---|---|
| `id_speak` | speaking with friends | inperson | | `id_replies` | replies to others' posts | online |
| `id_tiktok` | TikTok posts | online | | `id_song` | song | either |
| `id_instagram` | Instagram posts | online | | `id_poem` | poem | either |
| `id_facebook` | Facebook posts | online | | `id_tshirt` | T-shirt | inperson |
| `id_memes` | memes | either | | `id_wiktionary` | Wiktionary | online |
| `id_youtube` | YouTube | online | | `id_gamename` | gaming character name | online |
| `id_hashtags` | hashtags | online | | `id_documentary` | documentary video | either |
| `id_chats` | private chats | online | | `id_askfriends` | ask friends/family to promote | inperson |
| `id_clubs` | clubs, gaming forums or fandoms | either | | `id_influencer` | ask influencers to help promote **(ask T.Chris first)** | online, `askFirst:true` |

`id_askfriends` is allowed: helper text "Asking is fine. Gifts, swaps and deals are not (rule 6)." `id_influencer` cannot be selected until a `Requests` row of type `ask_first` for it is `approved`.

**Table C — channels** (`channels[]`, used by `where` / `channelId`): `ch_school` At school, face to face · `ch_home` At home, face to face · `ch_out` Somewhere else, face to face · `ch_chat` Private chat (online) · `ch_tiktok` TikTok (online) · `ch_instagram` Instagram (online) · `ch_facebook` Facebook (online) · `ch_youtube` YouTube (online) · `ch_forum` Online club, forum or fandom (online) · `ch_game` In a game (online) · `ch_wiktionary` Wiktionary (online) · `ch_other_online` Other online (online). The first three have `online:false`; all others `online:true`.

**Online gate.** `State.onlineUnlocked` becomes true (by `auto`) at the first server call where all six rules are ticked **and** `now ≥ Config.onlineOpensAt` (default `2026-11-26T16:30:00+07:00`, the end of the school day of L9; Chris can change it in Settings), or (by `teacher`) when the teacher unlocks her early. The teacher can lock again. While locked: online items show a padlock; an action or a sighting she *made herself* on an online channel cannot be saved as done (a sighting of someone else's online use can always be recorded).

**Table D — choice-driven items** (`data/checklist.js` `choiceRules[]`: `{id, when, firstWeek, kind, online, title, feeds, route, evidence, xp}`; `when` is a predicate over her current choices; each fires once; all `check:null` unless noted; all feed `BAS-PLAN` or `LAB-*` as listed):

| id | When she chose… | Title | kind | online |
|---|---|---|---|---|
| C-APPS | any online platform | Ask five people in your target group which apps they open every day; note the answers in your Lab Book | recommended | no |
| C-PRIVATE | TikTok, Instagram, Facebook or YouTube | Check your project account is private before you post. TikTok and Instagram start private if you are 15 or under; if you are 16 or over, set it to private yourself in Settings | required | yes |
| C-NEWACC | any online platform | Decide: a new account for the project (advised, rule 1) or not; write your reason in the Lab Book | recommended | no |
| C-NOFACE | any online platform, `id_documentary`, `id_memes` | Check your first post or picture: no faces, no uniform, no school name, no location | required | yes |
| C-KNOWN | `tg_online`, `id_chats`, `id_replies`, `id_clubs` | List (for yourself, on paper) the online friends you also know in real life; they are your online crowd. No strangers (rule 2) | recommended | no |
| C-FAMILY | `tg_family` or `id_askfriends` | Plan a family spread test: teach the word to one family member, do not explain it again, check in seven days | recommended | no |
| C-SCHOOL | `tg_school` or `id_speak` | Pick three moments in a school day where your word fits (never during lessons) and plan to use it there | recommended | no |
| C-BRIDGE | an age group that is not her own, `tg_foreign`, or `tg_61` | Find one bridge person who belongs to that group and to yours; plan how the word reaches them in person | recommended | no |
| C-NARROW | `tg_everyone` | "Everyone" is too big to test: name the first small crowd you will start with, and why | required | no |
| C-MEME | `id_memes` | Sketch three meme ideas on paper; test them on two classmates before you make one | recommended | no |
| C-HASH | `id_hashtags` | Search your hashtag first: is it already used for something else? Record what you find (screenshot) | recommended | yes |
| C-SONG | `id_song` or `id_poem` | Write four lines that carry your word; say them aloud to two people and log their reaction | recommended | no |
| C-TSHIRT | `id_tshirt` | Design it on paper first. One shirt for yourself is fine; no selling, no paying anyone (rule 5) | recommended | no |
| C-WIKT | `id_wiktionary` | Read Wiktionary's rules for new words before you write anything there; note in your Lab Book whether your word meets them yet | required | no |
| C-GAME | `id_gamename` | Use the word as a character name only in a game you already play; never message players you do not know (rule 2) | recommended | yes |
| C-DOC | `id_documentary` | Storyboard your video in six boxes: no faces, uniform, school name or location | recommended | no |
| C-CLUB | `id_clubs` | Choose one club or fandom you already belong to; note two of its in-jokes or habits your word could fit | recommended | no |
| C-REPLY | `id_replies` | Reply only under posts by people you know; plan two replies where the word fits naturally | recommended | yes |
| C-ASK | `id_influencer` wanted | Send your "ask T.Chris first" request and wait for his answer | required | no |
| C-UTIL | route utility | Write the "gap" sentence: "There is no short word for … so I say …" | recommended | no |
| C-PLAY | route play | Find the fun: say your word five ways (loud, sing-song, as a question …); note which one people copy | recommended | no |
| C-SHIFT | route semantic shift | Write one sentence with the old meaning and one with your new meaning; note how a listener can tell them apart | recommended | no |
| C-LIGHT | time budget light | Pick the one action in your plan that matters most this week and star it | optional | no |

Rules fire again for phase 2 only if the choice is **new** at the Pivot.

### 5.7 Catalogue: habit items (every week, ids `H-Wnn-x`)

| id | Title | Weeks | kind | check | feeds | xp |
|---|---|---|---|---|---|---|
| H-Wnn-1 | Log what you did for your word this week (or say why nothing happened) | W01–W09 | recommended | `week.action` | LAB-PRE (W01–W05), LAB-POST (W06–W09), INT-LOG (W01–W04), FIN-CLOSE (W08–W09) | 10 |
| H-Wnn-2 | Write one Lab Book reflection | W01–W13 | recommended | `week.journal` | LAB-PRE / LAB-POST, A1-REFLECT | 15 |
| H-Wnn-3 | Sightings check: record what you saw or heard, or record a zero-result week | W02–W12 | recommended | `week.sightcheck` | LAB-PRE / LAB-POST, A1-RESEARCH, SUM-C2 (W02–W04), ART-RES (W02–W12) | 15 |
| H-Wnn-4 | Do your weekly review (Sunday) | W01–W12 | required | `week.review` | LAB-PRE / LAB-POST | 0 (XP comes from X12) |
| H-Wnn-5 | Audit a classmate's sightings | W03, W04, W05, W08, W09, W10 (only if she has an audit assigned; R2) | recommended | `week.audit` | LAB-PRE / LAB-POST | 0 (XP from X14) |

In W06 and W07 all habit items are optional. LAB-PRE applies to W01–W05, LAB-POST to W06–W13. A habit item's `due` is the Sunday of its week. W13 has no weekly review: the final reflection (F-W13-04) closes the project. The W05 and W13 habit instances fall after the Lab Book dates (18 Dec, 12 Feb), so the coverage map counts habit weeks W01–W04 and W08–W12 only.

### 5.8 Catalogue: fixed-course items (R = required, M = recommended, O = optional)

| id | Title | kind | Due | check | route | evidence | feeds | xp |
|---|---|---|---|---|---|---|---|---|
| F-W01-01 | Record your word, its meaning and one example sentence | R | Sat 21 Nov | `word.first` | `#/first` | record | A1-ORIGINAL, A1-EXAMPLES, BAS-PROFILE | 0 (X01) |
| F-W01-02 | Confirm the part of speech and write your rules for using the word | R | Sun 22 Nov | `word.usage` | `#/audition` | record | A1-USAGE, BAS-PROFILE | 10 |
| F-W01-03 | Finish your word card: how it was formed, its purpose, two more examples | R | Sun 22 Nov | `word.card` | `#/audition` | record | A1-PURPOSE, A1-EXAMPLES, A1-NOTRUDE, BAS-PROFILE, SUM-C1, ART-INTRO | 0 (X02) |
| F-W01-04 | Record your zero-baseline check and send your word for approval | R | Sun 22 Nov | `word.submitted` | `#/audition` | screenshot | A1-ORIGINAL, BAS-PROFILE, ART-METH | 0 (X03) |
| F-W01-05 | Make your choices: target groups, ideas, platforms, route, time | R | Sun 22 Nov | `plan.choices` | `#/debut` | record | BAS-PROFILE, BAS-PLAN, SUM-C1, ART-METH | 10 |
| F-W01-06 | Read and tick the six rules | R | Sat 21 Nov | `rules.all` | `#/debut` | record | BAS-PLAN, ART-ETH | 0 (X05) |
| F-W01-07 | Write your plan: at least three actions (Where, What, Why, When, Evidence) | R | Sun 22 Nov | `plan.actions3` | `#/debut` | record | BAS-PLAN, SUM-C1, ART-METH | 0 (X04) |
| F-W01-08 | Launch in person, then log your first action | R | Sun 22 Nov | `action.first` | `#/log/action/new` | log | LAB-PRE, INT-LOG | 10 |
| F-W02-01 | Score your word on FUDGE and give a reason for each score | R | Tue 24 Nov | `word.fudge` | `#/audition` | record | BAS-FUDGE, SUM-C1, ART-INTRO | 15 |
| F-W02-02 | Write your research question and two to four hypotheses you can test | R | Tue 24 Nov | `word.hypotheses` | `#/audition` | record | BAS-FUDGE, INT-ANALYSIS, ART-INTRO | 15 |
| F-W02-06 | Check your word against the spec sheet (R1–R10) and explain any "not yet" | M | Tue 24 Nov | `word.spec` | `#/audition` | record | BAS-PROFILE, SUM-C1, ART-DISC | 10 |
| F-W02-03 | Read your Wave 1 result and write what it tells you | R | Wed 25 Nov | `wave.note.W1` | `#/charts` | survey | BAS-W1, SUM-C2, ART-RES, A1-RESEARCH | 15 |
| F-W02-04 | Build your Baseline report (600–900 words) and submit it in Google Classroom | R | Wed 25 Nov | `report.baseline.ready` | `#/report/baseline` | doc | BAS-LEN, BAS-PROFILE, BAS-FUDGE, BAS-W1, BAS-PLAN | 0 (X17) |
| F-W02-05 | After L9: decide in person only, or online too; update your plan | M | Sun 29 Nov | null | `#/debut` | record | SUM-C1 | 10 |
| F-W03-01 | Add your network map notes: who are your bridges and weak ties? (ACT-07) | M | Sun 6 Dec | null | `#/log/journal/new?kind=theory_link` | journal | SUM-C1, ART-DISC | 10 |
| F-W03-02 | Give every sighting an Evidence Level and check owned or earned | R | Sun 6 Dec | `sight.levels` | `#/log` | sighting | SUM-C2, INT-LOG, ART-RES | 10 |
| F-W03-03 | Link each planned action to one theory idea (the Why column) | M | Sun 6 Dec | null | `#/debut` | record | SUM-C1, ART-INTRO | 10 |
| F-W03-04 | Analyse one action that failed or changed: what happened, why, what next | R | Sun 6 Dec | `journal.failure` | `#/log/journal/new?kind=failure_analysis` | journal | SUM-LEARN, INT-ANALYSIS, ART-DISC | 0 (X10) |
| F-W04-01 | Read your Wave 2 result and write what changed since Wave 1 | R | Sat 12 Dec | `wave.note.W2` | `#/charts` | survey | INT-W2, SUM-C2, ART-RES | 15 |
| F-W04-02 | Check each hypothesis against your data: supported, not supported, or too early | R | Sun 13 Dec | `hyp.checked.W2` | `#/charts` | record | INT-ANALYSIS, SUM-C2 | 15 |
| F-W04-03 | Write the changes you plan to make (planned adjustments) | R | Sun 13 Dec | null | `#/report/intermediate` | record | INT-ADJUST, SUM-PH2 | 10 |
| F-W04-04 | Summit Pack: fill in your talk outline (six parts) | R | Sun 13 Dec | `summit.outline` | `#/summit/outline` | record | SUM-C1, SUM-C2, SUM-LEARN, SUM-PH2 | 20 |
| F-W04-05 | Summit Pack: write your analysis-over-adoption statement | R | Sun 13 Dec | `summit.aoa` | `#/summit/outline` | record | SUM-AOA | 10 |
| F-W04-06 | Summit Pack: choose your charts and up to four screenshots | R | Sun 13 Dec | `summit.visuals` | `#/summit/visuals` | screenshot | SUM-C3, SUM-C2 | 10 |
| F-W04-07 | Who owns slang? Note where your word's parts come from and who you should credit | M | Sun 13 Dec | null | `#/log/journal/new?kind=theory_link` | journal | ART-DISC, ART-ETH | 10 |
| F-W05-01 | Build your Intermediate report and submit it in Google Classroom | R | Mon 14 Dec | `report.intermediate.ready` | `#/report/intermediate` | doc | INT-W2, INT-LOG, INT-ANALYSIS, INT-ADJUST | 0 (X17) |
| F-W05-02 | Write your 50-word abstract (SUM-03) | R | Tue 15 Dec | `summit.abstract` | `#/summit/abstract` | record | SUM-ABS | 0 (X18) |
| F-W05-03 | Copy your slide text, finish your slides and submit them | R | Tue 15 Dec | null | `#/summit/export` | doc | SUM-C3, SUM-ABS | 15 |
| F-W05-04 | Rehearse twice with the timer: 7:00 talk + 2:00 Q&A | R | Tue 15 Dec | `summit.rehearsed2` | `#/summit/rehearse` | record | SUM-C3 | 0 (X18) |
| F-W05-05 | Prepare answers to five likely questions | R | Tue 15 Dec | `summit.qa5` | `#/summit/qa` | record | SUM-C4 | 15 |
| F-W05-06 | Check yourself against the Summit rubric (ASM-04) | R | Tue 15 Dec | `summit.selfcheck` | `#/summit/check` | record | SUM-C1, SUM-C2, SUM-C3, SUM-C4, SUM-AOA | 0 (X18) |
| F-W05-07 | After your talk: note the questions and feedback, and what you will change in phase 2 | R | Sun 20 Dec | `summit.feedback` | `#/log/journal/new?kind=summit_feedback` | journal | FIN-COMPARE, ART-DISC, ART-METH | 15 |
| F-W05-08 | Lab Book check: bring every log and reflection up to date | R | Fri 18 Dec | null | `#/log` | journal | LAB-PRE | 10 |
| F-W06-01 | Exam week: if your word turns up anywhere, write one line | O | Sun 27 Dec | null | `#/log` | journal | LAB-POST | 5 |
| F-W07-01 | Start your Pivot card in L15: what to keep, stop and start | O | Sun 3 Jan | null | `#/encore/pivot` | record | FIN-COMPARE | 5 |
| F-W08-01 | Finish your Pivot card: the one thing you will change and your phase 2 hypothesis (ACT-11) | R | Sun 10 Jan | `pivot.card` | `#/encore/pivot` | record | FIN-COMPARE, ART-METH, ART-DISC | 0 (X19) |
| F-W08-02 | Look at your choices again and write your phase 2 plan (at least three actions) | R | Sun 10 Jan | `plan2.actions3` | `#/encore/pivot` | record | FIN-COMPARE, ART-METH | 0 (X04) |
| F-W08-03 | Article Pack: working title and one note for each IMRaD section | R | Sun 10 Jan | `article.outline` | `#/encore/article/outline` | record | ART-INTRO, ART-METH, ART-RES, ART-DISC | 15 |
| F-W09-01 | Close your campaign: last log entry and a short close-out summary | R | Fri 15 Jan | `fin.close` | `#/report/final` | log | FIN-CLOSE, LAB-POST | 15 |
| F-W09-02 | Add at least six sources in APA style, each with one sentence on how you will use it | R | Sun 17 Jan | `article.sources6` | `#/encore/article/sources` | record | ART-SRC, ART-INTRO | 20 |
| F-W09-03 | Write your AI-use declaration | R | Sun 17 Jan | `article.ai` | `#/encore/article/ethics` | record | ART-ETH | 10 |
| F-W09-04 | Read your Wave 3 result and write what it tells you | R | Sun 17 Jan | `wave.note.W3` | `#/charts` | survey | FIN-W3, ART-RES | 15 |
| F-W10-01 | Compare phase 1 and phase 2: fill in the comparison table and check your hypotheses | R | Thu 21 Jan | `fin.compare` | `#/report/final` | record | FIN-COMPARE, ART-RES | 15 |
| F-W10-02 | Make at least three data visuals and add them to your Article Pack | R | Thu 21 Jan | `article.visuals3` | `#/encore/article/visuals` | record | ART-VIS, ART-RES | 20 |
| F-W10-03 | Build your Final assessment report and submit it in Google Classroom | R | Fri 22 Jan | `report.final.ready` | `#/report/final` | doc | FIN-W3, FIN-COMPARE, FIN-CLOSE | 0 (X17) |
| F-W10-04 | Draft your Methods and Results sections | R | Sun 24 Jan | `article.sections.MR` | `#/encore/article/draft` | record | ART-METH, ART-RES | 20 |
| F-W11-01 | Draft your Introduction and Discussion: hedge your claims and name your limitations | R | Thu 28 Jan | `article.sections.ID` | `#/encore/article/draft` | record | ART-INTRO, ART-DISC | 20 |
| F-W11-02 | Write your ethics statement | R | Thu 28 Jan | `article.ethics` | `#/encore/article/ethics` | record | ART-ETH | 15 |
| F-W11-03 | Submit your full draft for peer review (check the word count) | R | Fri 29 Jan | null | `#/encore/article/check` | doc | ART-WORDS, PEER-DISC | 15 |
| F-W12-01 | Write reviewer report 1 (KIT-10) | R | Wed 3 Feb | `peer.r1` | `#/encore/peer` | doc | PEER-R1 | 0 (X20) |
| F-W12-02 | Write reviewer report 2 (KIT-10) | R | Wed 3 Feb | `peer.r2` | `#/encore/peer` | doc | PEER-R2 | 0 (X20) |
| F-W12-03 | Note three points to raise at the editorial board discussion | M | Thu 4 Feb | null | `#/encore/peer` | record | PEER-DISC | 10 |
| F-W12-04 | Plan your revision from the reviews you received | R | Sun 7 Feb | `peer.plan` | `#/encore/peer` | record | ART-DISC, ART-WORDS | 15 |
| F-W12-05 | Read your Wave 4 (decay check) result and add it to your Results | R | Sun 7 Feb | `wave.note.W4` | `#/charts` | survey | ART-RES | 15 |
| F-W13-01 | Write your abstract (150–200 words) | R | Wed 10 Feb | `article.abstract` | `#/encore/article/abstract` | record | ART-ABS | 15 |
| F-W13-02 | Fix your final title and keywords | M | Wed 10 Feb | null | `#/encore/article/outline` | record | ART-ABS | 5 |
| F-W13-03 | Final check: 2,000–3,000 words, six sources, three labelled visuals, ethics statement | R | Thu 11 Feb | `article.words` | `#/encore/article/check` | record | ART-WORDS, ART-SRC, ART-VIS, ART-ETH | 15 |
| F-W13-04 | Write your final reflection on the whole experience | R | Thu 11 Feb | `journal.final` | `#/log/journal/new?kind=final_reflection` | journal | A1-REFLECT, LAB-POST, ART-DISC | 20 |
| F-W13-05 | Submit your research article in Google Classroom | R | Fri 12 Feb | null | `#/encore/article/check` | doc | ART-WORDS | 20 |

`stage` per item: W01 `F-W01-01`–`04` → s1; `05`–`07` → s2; `08` → s3; W02 `01`–`02` → s1, `03` → s5, `04`–`05` → s2; W03 → s4; W04 `01`–`03` → s5, `04`–`06` → s6, `07` → s4; W05 `01` → s5, `02`–`07` → s6, `08` → s4; W06–W13 → s7. `release`: W01–W03 → 1 (F-W02-03 uses the R1 wave card); W04–W05 → 2; W06–W13 → 3. `online:false` for all fixed items. Optional pool `X-01`–`X-24` (W3 writes; ≥ 3 per stage; all `check:null`, xp 5, `feeds` any `LAB-*`): see §10.7.

If the app goes live on Mon 23 Nov instead of Sat 21 Nov, nothing changes: the W01 items arrive as "carried" in W02, and their due dates show as passed without a penalty.

## 6. Coverage map
`data/coverage.js`: `window.WI_COVERAGE = { requirements:[{id, deliverable, text, due, items:[…]}] }`. The table below **is** that data. Rule (checked by `tools/validate.js`, §15.3): every requirement has ≥ 1 item; every listed item exists in the catalogue (fixed or habit) with kind required or recommended; every listed item has that requirement in its `feeds`; every listed item's `due` ≤ the requirement's `due`; every `feeds` value in the catalogue is a requirement id; a habit id written `H-W01..W05-2` means the instances of those weeks. Choice-driven, plan-action and optional items never count towards coverage.

| Requirement id | Deliverable | Requirement | Due | Items that produce the evidence |
|---|---|---|---|---|
| A1-NOTRUDE | Assignment 1 | Not negative or rude; not related to religion, monarchy, politics, gender, race | 22 Nov | F-W01-03 |
| A1-ORIGINAL | Assignment 1 | Original: a new word or usage | 22 Nov | F-W01-01, F-W01-04 |
| A1-PURPOSE | Assignment 1 | A clear purpose or meaning | 22 Nov | F-W01-03 |
| A1-USAGE | Assignment 1 | Rules for usage documented (part of speech, grammar rules) | 22 Nov | F-W01-02 |
| A1-EXAMPLES | Assignment 1 | Example sentences documented | 22 Nov | F-W01-01, F-W01-03 |
| A1-RESEARCH | Assignment 1 | Research how widely it is known / understood / used | 12 Feb | F-W02-03, H-W02..W12-3 |
| A1-REFLECT | Assignment 1 | Document and reflect on the whole experience | 12 Feb | H-W01..W12-2, F-W13-04 |
| BAS-PROFILE | Baseline report | Term profile: formation process, meaning, target community | 25 Nov | F-W01-01, F-W01-02, F-W01-03, F-W01-04, F-W01-05, F-W02-04 |
| BAS-FUDGE | Baseline report | FUDGE predictions and hypotheses | 25 Nov | F-W02-01, F-W02-02, F-W02-04 |
| BAS-W1 | Baseline report | Wave 1 baseline data | 25 Nov | F-W02-03, F-W02-04 |
| BAS-PLAN | Baseline report | Campaign and safety plan | 25 Nov | F-W01-05, F-W01-06, F-W01-07, F-W02-04 |
| BAS-LEN | Baseline report | 600–900 words, on the template (KIT-03) | 25 Nov | F-W02-04 |
| INT-W2 | Intermediate report | Wave 2 data | 14 Dec | F-W04-01, F-W05-01 |
| INT-LOG | Intermediate report | Campaign log | 14 Dec | F-W01-08, H-W01..W04-1, F-W03-02, F-W05-01 |
| INT-ANALYSIS | Intermediate report | Early analysis against hypotheses | 14 Dec | F-W02-02, F-W03-04, F-W04-02, F-W05-01 |
| INT-ADJUST | Intermediate report | Planned adjustments | 14 Dec | F-W04-03, F-W05-01 |
| SUM-C1 | Summit (ASM-04) | Content and theory (6) | 15 Dec | F-W01-03, F-W01-05, F-W01-07, F-W02-01, F-W02-05, F-W02-06, F-W03-01, F-W03-03, F-W04-04, F-W05-06 |
| SUM-C2 | Summit (ASM-04) | Evidence and analysis (6) | 15 Dec | F-W02-03, H-W02..W04-3, F-W03-02, F-W04-01, F-W04-02, F-W04-04, F-W04-06, F-W05-06 |
| SUM-C3 | Summit (ASM-04) | Delivery and visuals (4) | 15 Dec | F-W04-06, F-W05-03, F-W05-04, F-W05-06 |
| SUM-C4 | Summit (ASM-04) | Q&A (4) | 15 Dec | F-W05-05, F-W05-06 |
| SUM-AOA | Summit (ASM-04) | Analysis over adoption: the talk analyses what happened, including what did not work (ASM-04 carries this as a statement; the student's own statement shows she has done it) | 15 Dec | F-W04-05, F-W05-06 |
| SUM-LEARN | Summit | Learnings | 15 Dec | F-W03-04, F-W04-04 |
| SUM-PH2 | Summit | Phase 2 plan (midway review and replan) | 15 Dec | F-W04-03, F-W04-04 |
| SUM-ABS | Summit | 50-word abstract (SUM-03) and slides, Tue 15 Dec | 15 Dec | F-W05-02, F-W05-03 |
| LAB-PRE | Lab Book 1.1 | Weekly entries to 18 Dec: campaign log, sightings, reflections | 18 Dec | F-W01-08, H-W01..W04-1, H-W01..W04-2, H-W02..W04-3, H-W01..W04-4, F-W05-08 |
| LAB-POST | Lab Book 3.1 | Weekly entries to 12 Feb | 12 Feb | H-W08..W09-1, H-W08..W12-2, H-W08..W12-3, H-W08..W12-4, F-W09-01, F-W13-04 |
| FIN-W3 | Final report | Wave 3 data | 22 Jan | F-W09-04, F-W10-03 |
| FIN-COMPARE | Final report | Phase 1 vs Phase 2 comparison | 22 Jan | F-W05-07, F-W08-01, F-W08-02, F-W10-01, F-W10-03 |
| FIN-CLOSE | Final report | Campaign close-out | 22 Jan | H-W08..W09-1, F-W09-01, F-W10-03 |
| PEER-R1 | Peer review | Written reviewer report 1 | 3 Feb | F-W12-01 |
| PEER-R2 | Peer review | Written reviewer report 2 | 3 Feb | F-W12-02 |
| PEER-DISC | Peer review | Contribution to the mock editorial-board discussion | 4 Feb | F-W11-03, F-W12-03 |
| ART-INTRO | Article | Introduction (with literature) | 12 Feb | F-W01-03, F-W02-01, F-W02-02, F-W03-03, F-W08-03, F-W09-02, F-W11-01 |
| ART-METH | Article | Methods | 12 Feb | F-W01-04, F-W01-05, F-W01-07, F-W05-07, F-W08-01, F-W08-02, F-W08-03, F-W10-04 |
| ART-RES | Article | Results | 12 Feb | F-W02-03, F-W03-02, F-W04-01, H-W02..W12-3, F-W08-03, F-W09-04, F-W10-01, F-W10-02, F-W10-04, F-W12-05 |
| ART-DISC | Article | Discussion (claims, hedging, limitations) | 12 Feb | F-W03-01, F-W03-04, F-W04-07, F-W05-07, F-W08-01, F-W08-03, F-W11-01, F-W12-04, F-W13-04 |
| ART-ABS | Article | Abstract, 150–200 words | 12 Feb | F-W13-01, F-W13-02 |
| ART-WORDS | Article | 2,000–3,000 words | 12 Feb | F-W11-03, F-W12-04, F-W13-03, F-W13-05 |
| ART-SRC | Article | At least 6 sources | 12 Feb | F-W09-02, F-W13-03 |
| ART-VIS | Article | At least 3 data visuals | 12 Feb | F-W10-02, F-W13-03 |
| ART-ETH | Article | Ethics statement (and AI use declared) | 12 Feb | F-W01-06, F-W04-07, F-W09-03, F-W11-02, F-W13-03 |

Light weeks W06–W07 are deliberately absent from LAB-POST coverage (optional weeks). Report sections follow `pre_post.py`: KIT-03 Baseline = term profile, predictions and hypotheses, Wave 1 baseline, campaign and safety plan, AI declaration; KIT-05 Intermediate = Wave 2 data, campaign log summary, early analysis against hypotheses, planned adjustments (suggested 600–900 words); KIT-08 Final = Wave 3 data, Phase 1 vs Phase 2, close-out (template not yet written; due 23 Dec in the course backlog). If Chris's template files use different headings, W5 copies them into `data/reports.js`; section ids stay.

## 7. Sheet schema and Drive layout
Spreadsheet: `1ILusw6kHxaCcx6kesjjO9tZ3pc9mr0-tSYvpnK8rEGY` (one empty tab now). `setup()` in `Code.gs` creates every tab below with the header row exactly as listed (column order fixed), freezes row 1, and deletes the empty default tab. Only the Apps Script web app writes to the Sheet; Chris reads it and never edits data tabs by hand (he may edit `Config`). All times are ISO 8601 with `+07:00`. `json` = a JSON string in one cell (≤ 40,000 chars). Booleans are `TRUE`/`FALSE`. Ids made on the client are `<prefix>_<12 base36 chars>` (prefixes below), so a retried save is the same row.

| # | Tab | Columns (in order) | Written by |
|---|---|---|---|
| 1 | `State` | studentId, weekId, stage, xp, streak, bestStreak, lastReviewWeek, reviewsDue (json), rulesTicked (json, six ISO times or ""), onlineUnlocked, onlineUnlockedBy, onlineUnlockedAt, badges (json `{badgeId: ISO}`), lastActivityAt, fileCount, updatedAt | server on every write |
| 2 | `Words` | studentId, createdAt, updatedAt, word, meaning, example1, pos, posGuess, posRule, posConfidence, posConfirmed, posAlso (json), usageRules, forms (json), pronunciation, formation, sourceWords, example2, example3, doNotUse, purpose, notRudeConfirmed, fudge (json `{pred:{F,U,D,G,E,reasons:{},at}, mid?, end?}`), specSheet (json), researchQuestion, hypotheses (json `[{id:'h1',text,metric,target}]`), zb (json §13.1), regStatus, regSubmittedAt, regDecidedAt, regComment | student (`word.*`), teacher (`t.term`: reg columns only) |
| 3 | `WordHistory` | id (`wh_`), studentId, at, field, oldValue, newValue | server |
| 4 | `Plans` | id (`<studentId>-p1` / `-p2`), studentId, phase, createdAt, updatedAt, targetGroups (json), ideas (json), platforms (json), platformOther, route, timeBudget, who, why, what, spark, projectAccount, keep, stop, start, variableChanged, p2Hypothesis | student (`plan.save`) |
| 5 | `PlanActions` | id (`pa_`), studentId, createdAt, updatedAt, deleted, phase, where, ideaId, what, why, theoryTag, whenDate, weekId, evidence, targetGroup, status (planned / done / changed / skipped), actionId | student (`rec.save`) |
| 6 | `Checklist` | id (`<studentId>\|<weekId>\|<itemId>`), studentId, weekId, itemId, title, kind, source, status, originWeek, carryCount, dueDate, doneAt, doneBy (auto / manual), reason, refId, createdAt, updatedAt | server (`ensureWeek_`), student ticks |
| 7 | `Reviews` | id (`<studentId>\|<weekId>`), studentId, weekId, submittedAt, onTime, wentWell, toChange, decisions (json `{itemId: carry\|cannot\|dropped}`), nextPrefs (json `{skip:[], own:[{title,dueDate}], moved:[{planActionId,whenDate}]}`), counts (json `{done,open,carried,cannot}`) | student |
| 8 | `Actions` | id (`ac_`), studentId, createdAt, updatedAt, deleted, date, weekId, phase, planActionId, channelId, ideaId, what, outcome (as_planned / changed / not_done), outcomeReason, audience, reaction, learned, problem, fileIds (json) | student |
| 9 | `Journal` | id (`jn_`), studentId, createdAt, updatedAt, deleted, date, weekId, phase, kind (reflection / zero_result / failure_analysis / theory_link / summit_feedback / final_reflection / free), promptId, text, wordCount, fileIds (json) | student |
| 10 | `Sightings` | id (`sg_`), studentId, createdAt, updatedAt, deleted, date, weekId, phase, channelId, relation, quote, context, prompted (asked / unasked / unsure), marked (natural / marked / unsure), topic, posUsed, derivedForm, level, owned, link, verifiable, fileIds (json), auditId, auditStatus (none / assigned / agreed / disputed / unverifiable), spotStatus (none / queued / confirmed / changed / rejected), finalLevel | student; server and teacher for the last four |
| 11 | `Tallies` | id (`tl_`), studentId, createdAt, updatedAt, deleted, date, weekId, tallyType (said / heard / asked / online), count, context, note | student |
| 12 | `Files` | id (`fl_`), studentId, createdAt, deleted, driveFileId, bytes, width, height, attachType (sighting / action / zb / wave / journal / none), attachId, caption, cropConfirmed, inSummit, inArticle | student |
| 13 | `Waves` | id (`<waveId>\|<termKey>`), waveId (W1–W4), termKey (studentId, `ctrl1`, `ctrl2`, `foil1`, `foil2`), termText, n, recognised, notSure, comprehended, date, classesNote, published, updatedAt | teacher |
| 14 | `WaveNotes` | id (`<studentId>\|<waveId>`), studentId, waveId, note, hypothesisChecks (json `{h1: supported\|not_supported\|too_early}`), fileIds (json), updatedAt | student |
| 15 | `Requests` | id (`rq_`), studentId, createdAt, type (ask_first / word_change), ideaId, text, status (pending / approved / declined), decidedAt, teacherComment | student; teacher decides |
| 16 | `Flags` | id (`fg_`), studentId, createdAt, category, note, stoppedConfirmed, status (open / handled), handledAt, teacherNote | student; teacher handles |
| 17 | `Feedback` | id (`fb_`), studentId, createdAt, targetType (general / word / plan / action / journal / sighting / review / report / summit / article / checklist), targetId, text, readAt | teacher; student sets readAt |
| 18 | `Reports` | id (`<studentId>\|<type>`), studentId, type (baseline / intermediate / final), sections (json `{sectionId: text}`), wordCount, status (draft / ready / submitted), updatedAt | student |
| 19 | `Summit` | studentId, updatedAt, sections (json), abstract, aoaStatement, chartIds (json), fileIds (json), levelPicks (json `{level: sightingId}`), qa (json `[{qId, answer}]`), selfCheck (json `{rowId:{rating,note}}`), rehearsals (json `[{at,talkSec,qaSec}]`), feedbackNotes | student |
| 20 | `Article` | studentId, updatedAt, title, keywords, abstract, sections (json), sources (json), visuals (json), ethics, aiDeclaration, wordCount, peer (json), revisionPlan, status | student |
| 21 | `Audits` | id (`<weekId>\|<auditorId>`), weekId, auditorId, authorId, sightingIds (json), assignedAt, dueDate, status (assigned / done / expired), verdicts (json `{sightingId:{verdict, level, comment}}`), doneAt | server; auditor submits |
| 22 | `Spot` | id (`sp_`), sightingId, authorId, weekId, reason (random / disputed / unverifiable / screenshot_only), queuedAt, status (queued / done), verdict (confirm / change / reject), level, comment, doneAt | server; teacher |
| 23 | `XPLog` | id (`<studentId>\|<eventKey>`), studentId, at, ruleId, eventKey, xp | server only |
| 24 | `Sessions` | tokenHash, who (studentId or `teacher`), role, createdAt, expiresAt, lastSeenAt, revoked | server only |
| 25 | `Log` | at, who, role, action, ok, errorCode, ms | server only (no payloads, no PINs, no tokens) |
| 26 | `Config` | key, value. Keys: `release`, `onlineOpensAt`, `boardEnabled`, `summitSlots` (json `{studentId: 'L13-1'…'L14-4'}`), `lastWeeklyJob` | teacher (`t.config.save`), Chris by hand |

No tab holds a student's label, PIN, token, age, or any third person's name.

**Drive.** Folder `WordIdol Evidence` (id in `Roster.gs` as `EVIDENCE_FOLDER_ID`; `setup()` creates it if empty and logs the id). One sub-folder per student named by her label, exactly as in the roster (e.g. `WordIdol Evidence/Guest#1/`), created on first upload. File name `<fileId>.jpg`. Files and folders are never shared: after `createFile` the server asserts `getSharingAccess() === DriveApp.Access.PRIVATE` and otherwise deletes the file and returns `SERVER`. `file.delete` and `t.purgeGuests` move files to the bin. **Deploy note:** Drive access adds a permission scope, so Chris must click through the Google authorisation screen once when the script is first deployed with this code. He does that himself; no agent does it for him.

## 8. API
### 8.1 Transport
One Apps Script web app (`/exec`, execute as owner, access "Anyone"). `GET ?action=ping` and `GET ?action=roster` only. Everything else is `POST` with header `Content-Type: text/plain;charset=utf-8` (avoids a CORS preflight) and body `{"action":"…","token":"…","data":{…}}`. Reply: `{"ok":true,"now":"<ISO>","weekId":"W02","data":{…}}` or `{"ok":false,"now":"<ISO>","error":{"code":"…","message":"<B1 sentence>","field":"<name>"}}`. HTTP status is always 200 (Apps Script).

Error codes (fixed): `AUTH_REQUIRED` (no or expired token) · `AUTH_BAD_PIN` (`data.triesLeft`) · `AUTH_LOCKED` (`data.retryAt`) · `FORBIDDEN` (wrong owner or role) · `NOT_FOUND` · `VALIDATION` (`field`) · `LOCKED_ONLINE` · `LIMIT` (file cap, own-item cap, size) · `RATE` · `BUSY` (lock timeout; client retries after 2, 4, 8 s, then queues) · `RELEASE` (action not open yet) · `SERVER`.

### 8.2 Auth and limits
- **Roster.** `Roster.gs` (private, never in the repo): `var ROSTER = [{id:'s01', label:'…', pin:'0000', guest:false}, … 11 rows]; var TEACHER_PIN = '000000'; var PIN_SALT = '…'; var EVIDENCE_FOLDER_ID = '';`. The repo has `apps-script/Roster.example.gs` with the same shape and fake labels (`Student A` …) and PINs; `.gitignore` lists `apps-script/Roster.gs`; the validator fails if a file named `Roster.gs` or any real label appears in the repo (it reads the labels from an untracked local file if present, otherwise checks only for the file name).
- **PIN check.** PIN = the roster PIN unless Script Property `pin.<id>` exists (a salted SHA-256 written by `t.pin`), which then wins. Compare in constant time.
- **Lockout.** 5 wrong PINs for one id within 15 minutes → `AUTH_LOCKED` for 5 minutes (teacher: 15 minutes). Stored in Script Property `lock.<id>`. A correct PIN clears the count.
- **Token.** On login the server makes 64 random hex characters, stores only their SHA-256 in `Sessions`, and returns the token once. Student sessions last 30 days from last use; teacher sessions 12 hours. `logout`, `t.pin` and a lock set `revoked`. The client keeps the token in `localStorage` key `wi.session` (`wi.tsession` for the teacher).
- **Scope.** Every student action derives `studentId` from the token and ignores any `studentId` in the body. A student can read: her own rows; published `Waves` rows for her own term, the controls and the foils; the class board; and, for an audit assigned to her, the listed sightings of that one classmate with only these fields: date, channelId, relation, quote, context, prompted, marked, topic, posUsed, derivedForm, level, link, verifiable, hasScreenshot. Never files of others.
- **Limits.** Request body ≤ 900 KB. Per token ≤ 60 calls a minute (`RATE`). `sync` ≤ 25 ops. Files: JPEG only (magic bytes checked), decoded ≤ 600 KB, ≤ 80 files a student (`State.fileCount`; deleting frees a place), ≤ 3 per entry (6 for the zero-baseline record). Every text field is trimmed and checked against the limits of §2 on the server too; limits live in one shared file `schema.js` (`WI_SCHEMA`), used by the client and, through `Shared.gs`, by the server.
- **Locking.** Every action that writes, and `ensureWeek_`, runs inside `LockService.getScriptLock()` with `waitLock(20000)`; on timeout → `BUSY`. Reads take no lock.
- **Idempotency.** Saves are upserts by id; XP is awarded at most once per `XPLog` id; so a retried or replayed op changes nothing.

### 8.3 Actions
Auth column: P = public, S = student token, T = teacher token. All S and T responses also return the fresh `state` (S) so the client can update XP, badges and stage; new XP events come back as `gained:[{ruleId, xp, badgeId?}]`.

| Action | Auth | data (params) | Response data | Notes / errors |
|---|---|---|---|---|
| `ping` (GET) | P | – | `{version}` | |
| `roster` (GET) | P | – | `{students:[{id,label,guest}]}` | labels only |
| `login` | P | `{studentId, pin}` | `{token, expiresAt, student:{id,label,guest}}` | AUTH_BAD_PIN, AUTH_LOCKED |
| `logout` | S/T | – | `{}` | |
| `bootstrap` | S | – | `{student, state, config, word, wordHistory[], plans[], planActions[], checklist[], reviews[], actions[], journal[], sightings[], tallies[], files[], waves[], waveNotes[], requests[], flags[], feedback[], reports[], summit, article, audits:{mine[], onMe[]}, xpLog[]}` | runs `ensureWeek_`; `checklist` = all rows; `files` = metadata only; `xpLog` = last 50 |
| `sync` | S | `{ops:[{opId, action, data}]}` | `{results:[{opId, ok, data \| error}], state}` | offline queue; ops run in order in one lock; any S write action except `file.upload` |
| `word.save` | S | `{fields:{…}}` (any Words fields of §2.3 S-FIRST and word card 1, 4, 5) | `{word}` | writes `WordHistory`; §3.4 |
| `word.zb` | S | `{zb}` | `{word}` | §13.1 |
| `word.submit` | S | – | `{word}` | needs `word.card` and `word.zb` → else VALIDATION |
| `plan.save` | S | `{phase, fields}` | `{plan}` | phase 2 → RELEASE before R3 |
| `rules.tick` | S | `{ticks:[true,true,true,true,true,true]}` | `{state}` | all six or VALIDATION; may set onlineUnlocked |
| `rec.save` | S | `{type, record}`; type ∈ action, journal, sighting, tally, planAction, waveNote | `{record}` | LOCKED_ONLINE; server sets weekId, phase, owned, wordCount |
| `rec.delete` | S | `{type, id}` | `{}` | soft delete; a sighting with `auditStatus` ≠ none → FORBIDDEN |
| `checklist.tick` | S | `{rowId, done}` | `{row}` | items with a `check` are re-checked on the server; false check → VALIDATION |
| `checklist.addOwn` | S | `{weekId, title, dueDate?}` | `{row}` | LIMIT at 5 a week |
| `checklist.setStatus` | S | `{rowId, status, reason?}`; status ∈ cannot, dropped, open | `{row}` | required + dropped → FORBIDDEN |
| `review.submit` | S | `{weekId, wentWell, toChange, decisions, nextPrefs}` | `{review, checklist[]}` | before the week's Sunday → VALIDATION |
| `file.upload` | S | `{dataBase64, width, height, attachType, attachId, caption, cropConfirmed}` | `{file}` | `cropConfirmed` must be true; LIMIT |
| `file.get` | S | `{id}` | `{id, dataUrl}` | owner only; teacher uses `t.file` |
| `file.update` | S | `{id, caption?, inSummit?, inArticle?, attachType?, attachId?}` | `{file}` | |
| `file.delete` | S | `{id}` | `{}` | |
| `request.create` | S | `{type, ideaId?, text}` | `{request}` | |
| `flag.raise` | S | `{category, note?, stoppedConfirmed}` | `{flag}` | |
| `feedback.read` | S | `{id}` | `{feedback}` | |
| `report.save` | S | `{type, sections, status}` | `{report}` | RELEASE |
| `summit.save` | S | `{patch}` (any Summit columns) | `{summit}` | RELEASE |
| `article.save` | S | `{patch}` | `{article}` | RELEASE |
| `audit.submit` | S | `{auditId, verdicts}` | `{audit}` | auditor only |
| `board.get` | S | – | `{rows:[{label, rank, xp, streak}]}` | `Config.boardEnabled`; no guests |
| `t.login` | P | `{pin}` | `{token, expiresAt}` | |
| `t.overview` | T | – | `{rows:[{studentId,label,guest,word,regStatus,stage,week:{done,open,carried,cannot},lastActivityAt,xp,streak,rulesTicked,online,flags[]}], pending:{terms,requests,flags,spot}}` | runs `ensureWeek_` for all |
| `t.student` | T | `{studentId}` | the `bootstrap` bundle for her + all `Audits` and `Spot` rows about her | |
| `t.feedback` | T | `{studentId, targetType, targetId?, text}` | `{feedback}` | |
| `t.term` | T | `{studentId, decision: approved \| changes, comment?}` | `{word}` | |
| `t.request` | T | `{id, decision: approved \| declined, comment?}` | `{request}` | |
| `t.online` | T | `{studentId, unlocked}` | `{state}` | |
| `t.flag` | T | `{id, teacherNote?}` | `{flag}` | |
| `t.spot.list` | T | – | `{rows[]}` (Spot + the sighting) | |
| `t.spot.submit` | T | `{id, verdict, level?, comment?}` | `{spot, sighting}` | sets `finalLevel` |
| `t.wave.get` | T | `{waveId}` | `{rows[]}` | |
| `t.wave.save` | T | `{waveId, date, classesNote, rows:[{termKey,n,recognised,notSure,comprehended}], publish}` | `{rows[]}` | VALIDATION per §2.4 |
| `t.pin` | T | `{studentId, newPin}` | `{}` | revokes her sessions |
| `t.file` | T | `{id}` | `{id, dataUrl}` | |
| `t.export` | T | `{tab, studentId \| 'all', includeGuests}` | `{csv}` | not `Sessions`, `Log` |
| `t.config.save` | T | `{key, value}` | `{config}` | |
| `t.job.run` | T | – | `{audits, spot}` | runs `weeklyJob` now |
| `t.purgeGuests` | T | `{confirm:'PURGE'}` | `{deleted}` | deletes every row and Drive file of g1–g3; resets their State |

There is **no** teacher action that changes a student's entry. `t.term`, `t.spot.submit` and `t.online` change only status columns that belong to the teacher.

### 8.4 Client storage and offline
`localStorage` keys: `wi.session`, `wi.cache` (last bootstrap bundle), `wi.queue` (pending ops), `wi.draft.*`, `wi.is16`, `wi.theme`, `wi.serverOffset`. Every student write is applied to the cache at once (optimistic), put on the queue with a new `opId`, and sent; on failure or offline it stays queued and the header shows "n waiting to send". The queue is flushed on `online`, on app open and every 60 s. Images are not queued: offline, the screenshot button says "Add the screenshot when you are back online". Sign-out with a non-empty queue warns first. The shared-device rule: sign-out clears `wi.cache`, `wi.queue` (after sending), `wi.draft.*`.

## 9. Gamification
**The rule:** XP, badges, ranks and streaks come only from documenting honestly. Nothing in this section reads a sighting count, an Evidence Level, a tally count, an audience size or a survey number. The validator enforces it (§15.3 V9). The server is the only place XP is awarded (`XPLog`); the client only shows it.

### 9.1 XP table (`data/game.js` `xpRules[]`; `eventKey` makes each award unique)

| ruleId | Event | XP | eventKey | Cap |
|---|---|---|---|---|
| X01 | First step confirmed | 20 | `first` | once |
| X02 | Word card complete (`word.card`) | 30 | `card` | once |
| X03 | Zero-baseline record complete and word sent | 20 | `zb` | once |
| X04 | Plan saved with ≥ 3 planned actions | 30 | `plan:<phase>` | once per phase |
| X05 | Six rules ticked | 10 | `rules` | once |
| X06 | Action-log entry saved | 10 | `ac:<id>` | first 2 a day, 6 a week |
| X07 | That entry has `learned` ≥ 15 words | 5 | `acl:<id>` | as X06 |
| X08 | Lab Book entry ≥ 40 words (not zero_result / failure_analysis) | 15 | `jn:<id>` | 1 a day, 3 a week |
| X09 | Zero-result week entry ≥ 40 words | 20 | `zero:<weekId>` | 1 a week |
| X10 | A failed action analysed, ≥ 60 words | 25 | `fail:<weekId>` | 1 a week |
| X11 | Checklist item done | the item's `xp` | `ck:<itemId>` | once per item |
| X12 | Weekly review submitted | 30, +10 if on its Sunday | `rv:<weekId>` | once a week |
| X13 | "Could not do" with a reason | 3 | `cant:<itemId>` | 3 a week |
| X14 | Audit completed | 20 | `au:<auditId>` | – |
| X15 | Action logged as "Changed" or "Did not do it" with a reason | 5 | `acr:<id>` | as X06 |
| X16 | (not used) | – | – | – |
| X17 | Report helper marked ready | 20 | `rp:<type>` | 3 in total |
| X18 | Summit: abstract in range 10; each rehearsal 10 (max 3); self-check complete 15 | – | `sm:abs`, `sm:reh:<n>`, `sm:check` | as listed |
| X19 | Pivot card complete | 30 | `pivot` | once |
| X20 | Reviewer notes written | 20 | `peer:<n>` | 2 |

Sightings, tallies and screenshots earn **0 XP**. The weekly sightings check (H-Wnn-3) earns the same 15 XP whether she records ten sightings or a zero-result week. Raising "I had a problem" earns nothing and costs nothing. Deleting an entry does not remove XP already given (and cannot earn it twice).

### 9.2 Ranks (`ranks[]`, by total XP)
Trainee 0 · Rookie 100 · Backing Vocalist 250 · Opening Act 450 · Soloist 700 · Headliner 1,000 · Tour Legend 1,350 · Hall of Famer 1,750. Rank-up shows one toast and confetti (off under `prefers-reduced-motion`).

### 9.3 Badges (`badges[]`: `{id, name, hint, trigger}`; triggers evaluated on the server by `WI.badges(data)`)

| id | Name | Exact trigger |
|---|---|---|
| B01 | First Audition | first step confirmed |
| B02 | Word Card | `word.card` true |
| B03 | Clean Slate | zero-baseline record complete with ≥ 1 screenshot |
| B04 | Rule Keeper | six rules ticked |
| B05 | Stage Plan | `plan.actions3` true |
| B06 | First Log | 1 action-log entry |
| B07 | Honest Zero | 1 journal entry of kind zero_result, ≥ 40 words |
| B08 | Most Honest Failure | 1 journal entry of kind failure_analysis, ≥ 100 words |
| B09 | Plot Twist | 3 action entries with outcome changed or not_done, each with a reason |
| B10 | Reflector | 5 Lab Book entries ≥ 40 words |
| B11 | Deep Thinker | 1 Lab Book entry ≥ 200 words |
| B12 | Three in a Row | review streak 3 |
| B13 | Six in a Row | review streak 6 |
| B14 | Fair Judge | 2 audits completed |
| B15 | Theory Linker | 5 planned actions with a `theoryTag` |
| B16 | Hypothesis Checker | every hypothesis has a status for Wave 2 (any status counts, "not supported" included) |
| B17 | Ready for the Stage | Summit self-check complete and 2 rehearsals saved |
| B18 | Second Take | Pivot card complete |
| B19 | Peer Reviewer | both reviewer notes written |
| B20 | Full Record | Lab Book entries in 10 different weeks |

### 9.4 Streak
`streak` = the number of consecutive weeks, counting back from the last closed week, that have a `Reviews` row submitted before the next week's review opened (Sunday 00:00 of the following week). Light weeks W06–W07 never break a streak and count if she does them. `onTime` = submitted on that week's Sunday. There is no daily streak.

### 9.5 Class XP board
`#/board`, on when `Config.boardEnabled` is TRUE. Columns: rank name, label, XP, review streak; sorted by XP; her own row highlighted; guests never listed. No sighting, level, tally or survey figure appears on it or anywhere else that compares students.

## 10. Guide layer: content contract (W3 fills; examples here are samples, not the bank)
### 10.1 Rules for every guide string
Fact source: **only** `RESEARCH-NOTES_Mainstream_Slang_Case_Studies.md` (§6 Word / Need / Crowd / Spark; §7.1 R1–R10; §7.2 launch playbook phases 0–4; §7.3 what to measure; §7.4 what sinks a word; §8 myths to keep out), `VIDEO-DELIVERY_Plan-Your-Slang-Promotion.md` (Who / Why / What, the six rules, in person first) and `MATERIALS_BRIEF.md` (local copies in the build folder). Use only facts tagged [V]; FUDGE scores from the notes are shown as "an estimate"; nothing from §8 appears. English B1–B2, British spelling, sentences ≤ 20 words. Nothing about religion, monarchy, politics, gender or race. No idea suggests contacting strangers, paying, swapping favours, posting faces, uniforms, the school name or locations, or using the word during lessons. In person comes first; online is "if you want to, later". Age wording is exact ("if you are 15 or under … / if you are 16 or over …"). Every string carries `src` (e.g. `RN§7.2-P1`, `VID-WHO`) so a reviewer can trace it.

### 10.2 Files, shapes and counts

| Global (file) | Shape | Count | Fact source |
|---|---|---|---|
| `GUIDE.stages` (`data/guide.js`) | `{stageId, name, tagline, now:[3–5 steps], doneWhen, src}` | 7 | this spec §4.2; RN §7.2 (phases 0–4 map to s1–s4, s7) |
| `GUIDE.brainstorm` | `{id:'bs-<stage>-nn', stageId, prompt, src}` | ≥ 8 per stage (≥ 56) | RN §6, §7.1 |
| `GUIDE.banks.carriers` | `{id:'car-nn', text, mode: inperson\|online\|either, ideaIds[], src}` (things that carry a word: a joke, a game, a routine …) | ≥ 12 | RN §6, §7.2 |
| `GUIDE.banks.triggers` | `{id:'trg-nn', text, mode, src}` (moments that call for the word) | ≥ 12 | RN §6 (Need), STEPPS "Triggers" from L8 |
| `GUIDE.banks.formats` | `{id:'fmt-nn', text, mode, ideaIds[], src}` | ≥ 12 | RN §7.2; Form idea list |
| `GUIDE.banks.bridges` | `{id:'brg-nn', text, targetGroupIds[], src}` (ways to reach another group through someone you know) | ≥ 10 | RN §6 (Crowd); L10 |
| `GUIDE.stuck` | `{id:'stk-nn', stageId, text, src}` | ≥ 35 (≥ 5 per stage) | RN §7.2, §7.4 |
| `GUIDE.labPrompts` | `{id:'lab-nn', kind, weekIds[], text, src}` | ≥ 30 (≥ 2 usable each week; ≥ 4 for zero_result, ≥ 4 for failure_analysis) | KIT-01; RN §7.3 |
| `GUIDE.theory` | `{id:'th-…', name, oneLine, src}` | 10–14 (STEPPS elements, diffusion S-curve, weak ties, social proof, FUDGE, Word/Need/Crowd/Spark) | course lessons L4–L10; RN §6 |
| `GUIDE.posReasons` | `{P00: '…', …}` | 22 | §3.3 |
| `GUIDE.sinks` | `{id:'snk-nn', text, src}` ("what sinks a word", used in failure analysis) | ≥ 6 | RN §7.4 |
| `FRAMES` (`data/frames.js`) | `{id:'fr-<group>-nn', group, text}`; groups: hypothesis, describe_data, compare, hedge, reflect, failure, plan_change, qa_answer, limitation, ethics | ≥ 6 per group (≥ 60) | RDG-09 Glossary and Sentence Frames (Project doc `RDG-09_Glossary_and_Sentence_Frames.docx`); else original |
| `LEVELS` (`data/levels.js`) | `{level:0–6, name, definition, ownedOrEarned, source: sighting\|survey, example}` | 7 | MATERIALS_BRIEF (RES-06), definitions fixed below |
| `BLOCKLIST` (`data/blocklist.js`) | `{banned:[strings or /regex/], myths:[strings]}` | ≥ 25 | RN §8; §14 of this spec |
| optional pool `X-01`–`X-24` (`data/checklist.js`, text by W3) | catalogue item shape | 24 | RN §7.2 |

Samples of the expected voice (W3 replaces or keeps them after checking against the notes):

- `stages.s3.now`: "Use your word out loud at school, with people you know." / "Do not explain it unless someone asks." / "Log what happened tonight, even if nothing happened."
- `brainstorm`: "When did you last need a word for this and not have one?" · "Who in your class would enjoy saying this word? Why her?"
- `carriers`: "A running joke at lunch" (inperson) · "A caption on a picture in a private group chat" (online)
- `triggers`: "The moment the bell rings" · "When someone's plan fails in a funny way"
- `stuck`: "Nobody used it this week? That is data. Write a zero-result entry and guess one reason." · "Try the word in a different sentence shape: as a reaction, not a description."
- `labPrompts` (zero_result): "Where did you expect to hear your word this week? What happened there instead?"
- `FRAMES.hedge`: "The data suggest that …, but the sample is small." · `FRAMES.qa_answer`: "That is a fair question. My evidence shows …; it does not show …"

### 10.3 "What to do now" and Next step
Home shows `GUIDE.stages[current].now` and one **Next step** button from `WI.nextStep(state)`, first match: review due → "Do your weekly review"; first step missing → "Record your word"; a required item overdue → that item; a required item due within 3 days → that item; unread teacher feedback → "Read T.Chris's feedback"; an audit assigned → "Do your audit"; an open recommended item → the one with the nearest due date; otherwise "Write in your Lab Book".

### 10.4 Idea banks in use
On `#/debut` (plan table) and `#/guide`, a "Give me ideas" drawer shows carriers, triggers, formats and bridges filtered by her choices (`ideaIds`, `targetGroupIds`, `mode`; online entries hidden while online is locked). "Add to my plan" copies the text into a new plan row's `what`.

### 10.5 "Stuck?"
Shows three prompts picked at random from `GUIDE.stuck` for her current stage (no repeats until the stage's set is used up), with "Three more" and "Write about this" (opens a Lab Book entry with the prompt). Opening it earns no XP.

### 10.6 Evidence Level help
Level definitions (MATERIALS_BRIEF, fixed; W3 may add the example only): **0 Self-report** (she says it is used; nothing to check) · **1 Owned** (her own posts, entries or views) · **2 Recognition** (survey "I know it", foil-corrected; survey only) · **3 Comprehension** (survey: picks the correct meaning; survey only) · **4 Earned inside her network** (friends use it) · **5 Earned outside her network** (people in other groups, other year groups or teachers use it unprompted; the headline evidence) · **6 Independent recognition** (someone else records it, e.g. writes a definition, or the SWEP Word of the Year panel). Levels 0–1 are owned; 4–6 are earned.
The sighting form shows `LEVELS` as a tap-through list: name, one-line definition, "owned" or "earned", one example. The app never suggests a level from her text, and never praises a higher level.

### 10.7 Optional pool
24 small, safe, in-person-first tasks (`X-01`–`X-24`), ≥ 3 per stage, each `{id, title ≤ 90, why, stage, online, src}`, e.g. "Teach your word to one person without using the word 'slang'" (s3). No pool item is online-only before s4.

## 11. Summit Pack (R2) — 7:00 talk + 2:00 Q&A
`#/summit` tabs: Outline · Evidence · Visuals · Abstract · Q&A · Check · Rehearse · Export. Content config in `data/summit.js` (W5).

### 11.1 Talk outline (L12 structure; timings fixed, sum 7:00)

| sectionId | Part | Time | Running | Slides | Word guide (~130 words a minute) | Filled from stored data (shown as a read-only "Your facts" box above her notes) |
|---|---|---|---|---|---|---|
| `hook` | Hook | 0:30 | 0:30 | 1 (title) | 65 | word, meaning, example1; a `quote` she picks from sightings or her own example |
| `term` | Term and theory | 1:15 | 1:45 | 2 | 160 | pos, usageRules, formation, sourceWords, purpose, route; FUDGE prediction with reasons; hypotheses |
| `approach` | Campaign approach | 1:15 | 3:00 | 1 | 160 | targetGroups, ideas, platforms, who / why / what; plan table with theoryTags; planned vs done counts; the six rules ticked (safety line) |
| `evidence` | Evidence by level | 1:45 | 4:45 | 2 | 225 | Waves 1–2 (recognition, corrected recognition, comprehension, n; controls and foils); evidence-by-level table (§11.2); hypothesis checks |
| `learnings` | Learnings | 1:15 | 6:00 | 1 | 160 | failure_analysis and zero_result entries; review `toChange` texts; the analysis-over-adoption statement |
| `phase2` | Phase 2 plan | 1:00 | 7:00 | 1 | 130 | planned adjustments (Intermediate report `adjust`); the one variable she may change |

`Summit.sections` = `{hook:{notes, quoteSightingId?}, term:{notes}, …}`; `notes` · textarea · R · ≤ 1,500 chars, live word count against the guide (amber above 115%). 8 content slides + a closing "Questions?" slide = 9.

### 11.2 Evidence by level
Table, one row per Evidence Level 0–6. Rows 0, 1, 4, 5, 6: number of sightings (phase 1), owned / earned split, how many audited "agreed", how many confirmed by T.Chris, and one example she picks (`Summit.levelPicks`). Rows 2 and 3 come from the survey: corrected recognition and comprehension for Waves 1–2. Uses `finalLevel` where set, else `level`. A sentence builder under it: "My strongest evidence is Level _, because …; what I do not have yet is …" (frames `describe_data`, `hedge`). No wording ranks her against classmates.

### 11.3 Visuals
Charts, drawn as inline SVG by `pack.js` (no chart library; follow the `dataviz` skill for form and colour; readable in light and dark; not colour alone): `ch_waves` (lines: recognition, corrected recognition, comprehension by wave) · `ch_compare` (bars: her term, two controls, two foils, latest wave) · `ch_levels` (bars: sightings by level, owned vs earned) · `ch_actions` (bars: actions per week, in person vs online, planned vs done) · `ch_fudge` (bars: FUDGE prediction) · `ch_tallies` (bars per week by tally type). Each has "Download PNG" (SVG → canvas 1600 × 900 → `wordidol-<chartId>-<word>.png`) and a one-line caption she edits. `Summit.chartIds` = the ones she chose (≥ 1). Screenshots: her files with `inSummit` (≤ 4), shown with captions; reminder that names, faces and usernames must be cropped out.

### 11.4 Abstract (SUM-03)
`abstract` · textarea · R · counter in words; valid at 45–55 ("about 50 words"); frame: aim → method → main result → what it means.

### 11.5 Q&A bank
`data/summit.js` `qa[]`: `{id:'qa-nn', tag: theory | method | evidence | ethics | failure | phase2, q, frame}`, ≥ 24 (≥ 3 per tag). She picks ≥ 5 and writes `answer` · 15–120 words each. "Ask me one" shows a random question with a 30-second timer. Sample: `{tag:'evidence', q:'How do you know people really know your word and are not just guessing?', frame:'I compare it with the foil words. … so the corrected figure is …'}`.

### 11.6 ASM-04 self-check
Rows: `SC1` Content and theory (6) · `SC2` Evidence and analysis (6) · `SC3` Delivery and visuals (4) · `SC4` Q&A (4) · `SC5` Analysis over adoption (the statement). Each: descriptor text (ASM-04 rubric file, copied when Chris attaches it, §17 Q8; until then the row shows the criterion name, its points and the matching part of the syllabus description: "approach, theory applied, evidence, learnings and Phase 2 plan"), `rating` · radio · R: Not yet / Nearly / Ready; `note` · O · ≤ 200. It shows the checklist items that feed each row (from `data/coverage.js`) with done/open. `aoaStatement` · textarea · R · 25–120 words; frame: "My word did / did not spread as I predicted. What I can show is … . What I learned about how words spread is …". It is a self-check; it shows no score.

### 11.7 Rehearsal timer and readiness
Timer: Start → counts up to 7:00 with the six section marks, amber at 6:00, red at 7:00, then "Start Q&A" 2:00. Runs from a start time kept in `localStorage` (survives reload; no server calls). On finish saves `{at, talkSec, qaSec}`. Pack readiness (student and teacher view) = 8 ticks: six sections filled, abstract in range, ≥ 1 chart, ≥ 5 answers, self-check complete, AOA statement, 2 rehearsals, slides submitted (F-W05-03).

### 11.8 Export, and the report helpers
- **Print / PDF:** `#/summit/export` has a print stylesheet: one section per page with facts, notes, chosen charts and screenshots; then abstract, Q&A answers, self-check.
- **Copy slide text:** plain text, slide by slide (`SLIDE 1 — <word>: <meaning>` … `SLIDE 9 — Questions?`), title + ≤ 4 bullets taken from the first lines of her notes, for pasting into her slides.
- **Report helpers** (`#/report/<type>`, config `data/reports.js`: `{type, title, due, wordMin, wordMax, sections:[{id, heading, facts:[dataKeys], frameGroups[], minWords}]}`): each section shows a read-only facts box built from stored data and a textarea (her prose). Buttons: "Copy whole report" (plain text with headings, for Google Docs), "Mark as ready" (needs every section ≥ `minWords` and the total in range), "I have submitted it in Google Classroom" (status submitted).

| type | Sections (ids) → facts | Words |
|---|---|---|
| baseline (R1, KIT-03) | `profile` → word card, formation, target groups · `fudge` → FUDGE prediction, hypotheses · `wave1` → Wave 1 row, controls, foils, her note · `plan` → choices, plan table, six rules, online status | total 600–900; each ≥ 80 |
| intermediate (R2, KIT-05) | `wave2` → Waves 1–2 · `log` → action log planned vs done, sightings by level · `analysis` → hypothesis checks, failure analysis · `adjust` → her planned adjustments | each ≥ 80; total 600–900 (KIT-05 suggestion) |
| final (R3, KIT-08) | `wave3` → Waves 1–3 · `compare` → phase 1 vs phase 2 table (actions, sightings by level, wave figures, variable changed) · `closeout` → last log, what stays, what stops | each ≥ 60; total set when KIT-08 is written |

Every report helper ends with an **AI-use declaration** box (GOV-05: declared on every report) · R · ≥ 10 words ("I did not use AI tools" is valid); "Mark as ready" needs it.

## 12. Article Pack (R3; data model fixed now)
`Article` columns hold: `title` (≤ 150), `keywords` (≤ 100), `abstract` (150–200 words, counter), `sections` json, `sources` json, `visuals` json, `ethics` (≥ 60 words), `aiDeclaration` (≥ 10 words; "I did not use AI tools" is valid), `wordCount` (she types the count from her Google Doc; the target band 2,000–3,000 is checked), `peer` json, `revisionPlan`, `status` (planning / drafting / in_review / revising / submitted).

`sections` = `{intro:{notes}, methods:{notes}, results:{notes}, discussion:{notes}}`; notes ≤ 6,000 chars each. The Pack is a planning and evidence tool; the article itself is written in Google Docs (version history).

| IMRaD section | Stored data offered as facts |
|---|---|
| Introduction | word card (formation, purpose, route); theory tags used in the plan; FUDGE prediction; hypotheses; her sources with their one-line use |
| Methods | zero-baseline record; choices and plan tables for phase 1 and phase 2; the variable changed at the Pivot; survey design facts from `data/article.js` (four waves, dates, controls *aura farming* and *crash out*, foils *drovish* and *trelky*, corrected recognition formula, who ran it); Evidence Levels and the audit / spot-check process; the six rules |
| Results | all published waves (her term, controls, foils); sightings by level, owned vs earned, phase 1 vs phase 2; actions planned vs done by channel; tallies by week; hypothesis statuses; Wave 4 decay figure |
| Discussion | failure_analysis and zero_result entries; review texts; Summit feedback entry; Pivot card; network-map and "who owns slang" notes; limitation frames |

`sources` = `[{id, apa, type: book | article | web | dictionary | course, use}]`, ≥ 6 with `apa` ≥ 20 chars and `use` ≥ 10 chars; the syllabus texts are offered as a starting list in `data/article.js`. `visuals` = `[{id, kind: chart | table | screenshot, chartId? , fileId?, caption, figureNo}]`, ≥ 3 with captions; charts are the §11.3 set drawn over all waves and both phases. `peer` = `{given:[{n:1|2, authorLabelInitial, notes}], received:[{n, summary}]}` (reviewer notes are her own notes; the reviewer reports themselves are KIT-10 documents). Ethics statement helper: tick list feeding a draft (no names recorded; relation words only; survey anonymous and run by the teacher; six rules followed; no paid or traded use; problems reported: yes / none; AI use declared). Readiness = 9 ticks: four section notes, abstract in range, ≥ 6 sources, ≥ 3 visuals, ethics, AI declaration, word count in range.

## 13. Registry, zero-baseline record, audits, spot-checks, waves
### 13.1 Zero-baseline record (RES-05)
`zb` = `{checkedAt, places:[{placeId, result, note}], statement, fileIds[]}`. `checkedAt` · date · R. Places (`data/choices.js` `zbPlaces[]`, from RES-05: exact spelling and variants): `zb_google` Google (the word in quotation marks) · `zb_tiktok` TikTok · `zb_instagram` Instagram · `zb_x` X · `zb_youtube` YouTube · `zb_urban` Urban Dictionary. `result` · select · R per place: No results / Results, but with a different meaning / Results with my meaning / I could not check here. Complete when all six places have a result and `statement` · textarea · 20–300 is filled. Most students did this check in L5 (12 Nov): `checkedAt` may be any date from 1 Nov. Screenshots · up to 6 (asked for, not required); suggested caption `TERM_platform_YYYYMMDD` (RES-05 naming). If any place has "Results with my meaning", the card says: "Your word may already exist with this meaning. Tell T.Chris and note it here." (no block). 

### 13.2 Registration
`regStatus`: `draft` → (`word.submit`) `submitted` → (`t.term`) `approved` | `changes` (with `regComment`; she edits and submits again). The Registry is the `Words` tab; the teacher sees all eight terms on T-CLASS. Students never see each other's word cards in the app.

### 13.3 Auditors and the spot-check queue (R2)
- **When:** the first round is started by the teacher in L11 (Thu 3 Dec) with the portal button "Assign audits now" (`t.job.run`), covering sightings from W01–W03 to date. After that, `weeklyJob`, Mondays 00:10 Bangkok, for the week that just closed (*W*): sightings of W03–W04 and W07–W09 (tasks appear in W04, W05, W08, W09, W10). No audits are assigned in W06–W07.
- **Who:** only the eight real students. The job builds a random derangement of the students who are active (signed in within 14 days): each gets exactly one classmate as author, **never herself**; where possible not the same pair as the week before. Guests audit only each other.
- **What:** up to **5** of the author's sightings dated in week *W* (all if ≤ 5; otherwise 5 at random). Authors with no sightings that week give no task; the auditor's `H-Wnn-5` item is then not created.
- **Auditor sees** only the fields in §8.2 Scope: no screenshots, no word card, no plan. For each sighting: `verdict` · radio · R: I agree with the level / I would give a different level (`level` · R) / I cannot check this; `comment` · O · ≤ 200. Due the following Sunday; then `expired`.
- **Result:** agree → `auditStatus: agreed`; different level → `disputed`; cannot check → `unverifiable`. The author sees the verdict and comment, not a changed level: an auditor never changes `level`.
- **Spot-check queue:** the same job queues (a) a random 10% of the week's sightings, rounded up, at least 1 per author who has any; (b) every `disputed` and `unverifiable` sighting, as audits come in; (c) every sampled sighting whose only evidence is a screenshot the auditor could not see (`screenshot_only`). The teacher's verdict sets `spotStatus` and `finalLevel`; "reject" sets `finalLevel` to 0. `finalLevel`, where set, is the level used in charts and Packs, and the student sees "Checked by T.Chris".
- Audit and spot-check results never give or remove XP for the author.

### 13.4 Waves, corrected recognition, Charts
Teacher entry: §2.4 T-WAVES. For each row: recognition % = `recognised / n`; not sure % = `notSure / n`; comprehension % = `comprehended / n`. Foil rate for a wave = the mean of the two foils' recognition %. **Corrected recognition = recognition % − foil rate** (MATERIALS_BRIEF: % claiming to know the word − % claiming to know the foils; L6 worked example 40% − 15% = 25%; with two foils the app uses their mean). May be negative; shown as it is, with the note "0 or below means we cannot tell real recognition from guessing". Whole per cent on screen; `n` always shown. Comprehension is answered by every respondent (Chris, §17 Q7).

Student `#/charts`: (R1) a wave card per published wave: her term, the two controls, the two foils, with n, the three percentages and corrected recognition; `note` · textarea · R for the checklist · 20–200 words ("What does this tell you? What does it not tell you?"); from Wave 2, `hypothesisChecks` · per hypothesis: Supported / Not supported / Too early to say. (R2) the §11.3 charts; the **FUDGE dashboard** (her prediction with reasons; optional re-scores `mid` at the Summit and `end` in January, side by side; label "your judgement, not a measurement"); the tally charts. She never sees another student's term.

## 14. Privacy, safety and PDPA: testable statements
### 14.1 The six rules (verbatim; `data/rules.js`; the validator compares these strings byte for byte)
1. Advised to create a new social media account for promotions.
2. Not to DM strangers.
3. Block immediately anyone posting negative comments and remove their posts.
4. Stop activity and report to T.Chris/homeroom teacher any negative experience related to this activity.
5. Not to enter into any form of payment for promotion.
6. Not to request or accept favours related to promoting the slang word.

No UI string paraphrases a rule; rule 1 is never worded with "must".

### 14.2 Statements (each is a test in §15.4 or a validator check)
- P1. The public repo and the Pages site contain no student label, no PIN, no token and no `Roster.gs`.
- P2. Without a valid token the API returns only `ping` and `roster` (ids, labels, guest flag).
- P3. With student A's token, no action returns or changes student B's rows, except the audit view of §8.2.
- P4. No form has a free-text field for a person's name; "who" is always the relation list. Reminders about names appear on the action, sighting and screenshot forms.
- P5. A screenshot cannot be uploaded without the tick "I have cropped out other people's names, faces and usernames." (exact wording).
- P6. Uploaded files are private in Drive; a file is served only to its owner or the teacher; an auditor never gets a file.
- P7. Images are resized in the browser to JPEG, long side ≤ 1280 px, quality stepped down (0.8 → 0.5) until ≤ 400 KB; EXIF is dropped by the canvas re-encode.
- P8. The 81st upload is refused.
- P9. An online action cannot be logged before all six rules are ticked and online is unlocked.
- P10. "ask T.Chris first" cannot be selected or planned before the teacher approves the request.
- P11. The app has no messaging, posting, sharing or comment-between-students feature, and no link out to a social platform's posting page.
- P12. XP, badges, ranks, streak and the board do not change when sightings, levels, tallies or wave figures change.
- P13. "I had a problem" shows rule 4, records a flag the teacher sees first on T-CLASS, and gives no XP.
- P14. The teacher portal has no control that edits a student entry.
- P15. Guide content passes the blocklist (§10.1) and contains no male figure, no emoji used for direction, no Gemini art.
- P16. Age (`is16`) stays on the device. The Sheet holds no age, no real name, no contact detail.
- P17. Guests are excluded from the board, audits with real students, exports (by default) and wave rows; `t.purgeGuests` removes all their data.
- P18. `Log` stores action names and error codes only.
- P19. Survey data shown to a student are class totals for her own term, the controls and the foils; no respondent-level data exist in the app.

PDPA note for Chris (not an app feature): the Sheet and Drive folder are his private Google files; data are pseudonymous in the Sheet (ids), labels live in the private script; delete the Sheet tabs' data and the Drive folder after grades are final, or keep them under the school's rule.

## 15. File map, validator, tests
### 15.1 Files (repo `pegasus028/WordIdol`, GitHub Pages at https://pegasus028.github.io/WordIdol/)
```
index.html            student shell (W2)        teacher.html     teacher portal shell (W2)
app.css               tokens light + dark (W2)  app.js           student engine: router, renderers, queue, upload; NO content (W2)
teacher.js            portal engine (W2)        pack.js          Summit / Article / report helpers, SVG charts, PNG, print (W5)
engine.js             pure logic, no DOM: WI.pos, WI.weekIdOf, WI.buildWeek, WI.checks, WI.stageOf, WI.nextStep, WI.badges, WI.xp (W4)
schema.js             WI_SCHEMA field limits and enums (W1 owns; W2 reads)
config.js             window.WI_CONFIG = {apiUrl:'<…/exec>', release:1, version:'2026-11-21a'}
data/plan.js          weeks, lessons, stages, milestones (W4)      data/checklist.js  catalogue, habit templates, choiceRules, optional pool (W4; text by W3)
data/coverage.js      §6 (W4)                    data/choices.js  targetGroups, ideas, channels, platforms, zbPlaces, relations, tallyTypes (W4)
data/game.js          xpRules, ranks, badges (W4) data/rules.js    the six rules (W4)
data/guide.js, data/frames.js, data/levels.js, data/blocklist.js (W3)
data/summit.js, data/reports.js, data/article.js (W5)              data/postests.js  §3.5 (W4)
apps-script/Code.gs   API, auth, Sheet, Drive, jobs (W1)           apps-script/Shared.gs  GENERATED by tools/build-gs.js from engine.js + schema.js + data/{plan,checklist,choices,game,rules,coverage}.js
apps-script/Roster.example.gs (fake data)                          apps-script/Roster.gs  PRIVATE, git-ignored, only in the Apps Script project
tools/validate.js  tools/load.js  tools/build-gs.js                tests/unit.test.js  tests/api.mock.js  tests/browser.test.js
SPEC.md  README.md  .nojekyll  .gitignore
```

Data files are browser globals (`window.WI_PLAN`, `WI_CHECKLIST`, `WI_COVERAGE`, `WI_CHOICES`, `WI_GAME`, `WI_RULES`, `GUIDE`, `FRAMES`, `LEVELS`, `BLOCKLIST`, `WI_SUMMIT`, `WI_REPORTS`, `WI_ARTICLE`, `WI_POSTESTS`). `engine.js` and data files must run unchanged in the browser, in Node (`tools/load.js`, vm context with `window = global`) and in Apps Script V8 (no DOM, no `fetch`, no modules). Script tags carry `?v=YYYY-MM-DDx`. `Code.gs` and `Shared.gs` are never edited by hand after generation of `Shared.gs`; deployment follows the `apps-script-deploy` skill (paste, save, Deploy → Manage deployments → New version).

### 15.2 Ownership of ids
W4 owns all ids in §4–§6 and §9; W1 owns tab and action names; W3 and W5 own only the ids inside their own files. A change to any fixed id needs the lead and a SPEC.md edit first.

### 15.3 `tools/validate.js` (exit code 1 on any failure)
- V1. Every data file parses; every id is unique within its family and matches its format.
- V2. Part of speech: all 58 rows of `data/postests.js` match on pos, conf and rule; the word lists equal §3.2.
- V3. Weeks: 13 weeks, contiguous, Mon–Sun, W01 starts 2026-11-16, W13 ends 2027-02-14; each milestone and item due date falls inside the plan; each item's `due` is in its `week` or later; no required or recommended fixed item has `week` W06 or W07.
- V4. Catalogue: every item has all schema fields; `kind`, `source`, `evidence` in their enums; `route` is a known route; `check` is a key of `WI.checks`; `title` ≤ 90 chars.
- V5. **Coverage:** the rules stated at the top of §6, plus: every requirement of the two deliverables (`SUM-*`, `ART-*`) has ≥ 2 feeding items; completing all required and recommended fixed and habit items leaves no requirement uncovered (simulated).
- V6. Timings: Summit sections sum to exactly 420 s; Q&A 120 s.
- V7. The six rules equal §14.1 byte for byte; the screenshot tick text equals P5; the Form option labels equal §5.6 tables A and B.
- V8. Guide content: counts of §10.2 met; every string has `src`; no `BLOCKLIST.banned` match; no string over the length limits; sentences ≤ 20 words (warning above, error above 28).
- V9. **No reward for spread:** no `xpRules`, badge trigger or rank reads any of `level`, `finalLevel`, `count`, `audience`, `recognised`, `comprehended`, sighting row counts; `engine.js` functions `WI.xp` and `WI.badges` are run on two data sets that differ only in sightings, tallies and waves and must give equal results.
- V10. Repo hygiene: no `Roster.gs`; no 4-digit PIN-like literal next to a roster label; `Shared.gs` is up to date with its sources (hash); `XP` table in `Shared.gs` equals `data/game.js`.
- V11. `node --check` on every `.js`; no "T.Chris's"-style apostrophe inside a single-quoted string.
- V12. Imagery: no `<img` pointing outside the repo; no file under `art/`; emoji list checked against a deny-list of people and hand emoji.

### 15.4 Tests
- **Unit (Node, `tests/unit.test.js`):** `WI.pos` (58 + edge cases: curly apostrophes, capitals, hyphenated words); `weekIdOf` at each Sunday 23:59 / Monday 00:00 Bangkok boundary; `buildWeek` for three fixture students (in-person only + light; TikTok + family + standard; everything + stretch) across W01–W13, incl. carry-over over a three-week absence, light weeks, "could not do", dropped optional, plan-action placement, choice rules firing once; stage gates; streak incl. light weeks; XP caps; badges; corrected recognition incl. negative; online gate before/after `onlineOpensAt` and by teacher.
- **API (Node with `tests/api.mock.js`, a Sheet and Drive stub around `Code.gs` + `Shared.gs`):** every action's happy path and each listed error; P2, P3, P6, P8, P9, P10; lockout and expiry; idempotent replays; two interleaved writers.
- **Browser (Playwright, mock API, `python3 -m http.server` started first):** at **375 × 667** and **1366 × 768**, light and dark: sign in as `Guest#1` → first step (guess shown, changed, saved) → word card → zero-baseline with a screenshot → choices → six rules → plan table → Home → Week (tick, add own) → log an action, a Lab Book entry, a sighting with a screenshot, a tally → "I had a problem" → Sunday review with one carry, one "could not do" → next week shows "carried" → Baseline report helper copy → offline: add an entry, reload, go online, entry sent once. Teacher: overview flags, student timeline, comment (appears on student Home), approve term, approve request, unlock online, enter and publish Wave 1 (appears on student Charts), reset PIN, export. Checks: no `pageerror`, no console error, no horizontal overflow at 375 px, every tap target ≥ 44 px, no edit control on teacher timeline.
- **Live walkthrough (`student-walkthrough` skill, live Sheet):** three simulated students at B1, B2 and C1 as `Guest#1`–`Guest#3` complete R1 end to end, including one zero-result week and one failed action; Chris views them in the portal; then **clean-up:** `t.purgeGuests`, confirm the three Drive folders are empty and no `g1`–`g3` rows remain, leave the board empty. Real students' rows are never used for tests.
- Before each push: validator, `node --check`, unit, API, browser. After each `Code.gs` change: rebuild `Shared.gs`, redeploy as a new version, `ping` shows the new version.

## 16. Acceptance checks
Handover §8 checks are merged below (Opus review).

R1 (before students use it):

1. Sign-in works for 8 students and 3 guests by name + 4-digit PIN; the 6th wrong PIN is refused for 5 minutes; `Roster.gs` is not in the repo.
2. The first screen after first sign-in asks for word, meaning and example sentence; the part of speech is proposed with a plain reason and can be changed; nothing else opens before it is saved.
3. The 58 part-of-speech tests pass.
4. The word card records usage rules and three example sentences; the zero-baseline record and "send for approval" work; the teacher can approve or ask for changes.
5. Debut plan collects everything the Google Form collected (target groups, promotion ideas, same wording) plus platforms, route, time budget and the plan table; "ask T.Chris first" is locked until approved.
6. The six rules appear verbatim and all six must be ticked; online actions stay locked until then **and** `onlineOpensAt`, or the teacher's early unlock.
7. `#/plan` shows the seven stages and M01–M16 with correct dates, the two deliverables, and the light weeks.
8. A weekly checklist exists for every week W01–W13 for each fixture student; completing every required and recommended item covers every row of §6 (validator V5 green).
9. From Sunday 00:00 Bangkok the app opens on Weekly review; unfinished items appear next week marked "carried"; required items cannot be dropped; a missed review is the first screen at the next sign-in.
10. Actions (planned vs done), Lab Book entries, sightings (relation, Evidence Level) and tallies save, survive reload and offline, and reach the Sheet once.
11. A screenshot can be attached after the crop tick, is ≤ 400 KB, lands in `WordIdol Evidence/<label>/`, is private, and opens only for its owner and the teacher.
12. XP, rank, badges and streak change only on documentation events (V9 green); the board shows no spread data.
13. The Baseline report helper builds the four sections from stored data with a 600–900 word counter and copies out; Wave 1 entered and published by the teacher appears on her wave card.
14. Teacher portal: one row per student with stage, checklist counts, last activity, XP, streak, rules, online state and the five flags; the student page shows the full timeline; comments reach her Home; no student entry is editable.
15. English only, B1–B2; no male figures; no Gemini art; works at 375 px with no horizontal scroll; light and dark readable.
16. Browser and API tests pass; the live walkthrough at B1 / B2 / C1 is done and cleaned up.
17a. Try to read another student's data with her name and a wrong PIN, and with a valid token of a third student: both refused (handover §8).
17b. https://pegasus028.github.io/WordIdol/ is live; Apps Script is deployed as a new version and `ping` shows it; `QA-REPORT.md` is in the repo.

R2: 17. Audits assign a random classmate, never herself, ≤ 5 sightings; auditors see no screenshots. 18. The spot-check queue holds 10% plus disputed items; the teacher's verdict sets the final level. 19. Charts draw from published waves; corrected recognition = recognition − mean foil rate; PNG download works. 20. Summit Pack: six parts sum to 7:00; evidence by level; 50-word abstract counter; Q&A bank; ASM-04 self-check with the analysis-over-adoption statement; timer 7:00 + 2:00; print/PDF and slide-by-slide text. 21. Intermediate report helper.

R3: 22. Pivot card and phase 2 plan; choices revisited; new choice rules fire. 23. Waves 3–4; Final report helper with the phase comparison. 24. Article Pack: IMRaD notes fed by stored data, abstract 150–200 counter, 2,000–3,000 check, ≥ 6 sources, ≥ 3 visuals, ethics statement and AI declaration. 25. The plan and checklists run to Fri 12 Feb 2027.

## 17. Decisions on the open questions (Chris, 19 Nov, "default for all")
1. **Class games:** the Contagion simulator and Slang Stock Exchange become small separate apps, built after WordIdol R1. Nothing in WordIdol for them.
2. **Syllabus:** the PDF is corrected to 7 min + 2 min Q&A.
3. **Fri 11 Dec is a holiday.** Wave 2 = **Tue 8 – Wed 9 Dec** (M05 and all Wave 2 text).
4. **Project account name:** optional.
5. **Lab Book:** the WordIdol journal **replaces** the KIT-01 Google Doc Lab Book (15 + 15 points). The app's Lab Book must therefore cover KIT-01's weekly entry: date, actions, sightings logged, numbers, what I noticed, theory link, next step (prompts in `labPrompts`).
6. **Problem flags:** portal flag only; no email.
7. **Survey comprehension:** answered by every respondent; comprehension % = `comprehended / n` (and `comprehended ≤ n`, not ≤ `recognised`).
8. **ASM-04 and KIT-03/05 files:** not attached yet; the app uses the wording in §6, §11.6 and §11.8 and swaps in Chris's exact wording when he sends the files.
9. **Wiktionary:** kept, with "read its rules first" required.
10. **Online opening:** automatic at 16:30 on Thu 26 Nov for students who have ticked the six rules; teacher can unlock or lock any student by hand.
11. **Class XP board:** on.
12. **Summit order:** set later in the portal's Settings.
13. **Teacher PIN:** 6–8 digits.

## 18. Review log (Opus, 19 Nov)
Checked against the Project docs; changes made to the Fable draft:
- Lesson dates confirmed; L11 (Thu 3 Dec) assigns auditors, so auditors and the Intermediate report helper move forward to **Wed 2 Dec**; the first audit round is started by the teacher in L11; H-Wnn-5 now includes W03.
- Added the **research question** (L6 homework, RES-07) to the hypotheses card, and the **R1–R10 spec sheet** card (handover §4; research notes §7.1) with item F-W02-06.
- Sightings gained **marked / unmarked, topic, part of speech used and derived form** (handover §4; research notes §7.3: diversity of contexts and generation are what predict survival). Sightings can be Levels 0, 1, 4, 5, 6 only; Levels 2–3 come from the survey.
- Evidence Level definitions, corrected-recognition formula, zero-baseline places (RES-05: Google, TikTok, Instagram, X, YouTube, Urban Dictionary) and report sections (KIT-03, KIT-05, KIT-08) filled from MATERIALS_BRIEF and `pre_post.py`; Intermediate report now 600–900 words; every report helper has the AI-use declaration (GOV-05).
- "Ask influencers to help promote" keeps the Form wording with "(ask T.Chris first)".
- Age wording in C-PRIVATE made exact (under-16 accounts start private; 16-year-olds set it themselves).
- Teacher overview shows sightings (owned / earned) to the teacher only.
- Handover §8 acceptance checks merged (wrong-PIN data read, `QA-REPORT.md`, new Apps Script version).
- Dropped the question about launching before Wave 1: Chris chose in-person launch from Sat 21 Nov.
