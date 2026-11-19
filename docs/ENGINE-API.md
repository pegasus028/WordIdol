# WordIdol engine API (W4) — `engine.js` and the W4 data files

Status: contract for W1 (server), W2 (client) and W5 (packs). Written first, 19 Nov 2026; the implementation follows it exactly. If you need something that is not here, code against the name you need and list it in your report.

## 0. Loading and globals

- `engine.js` and every `data/*.js` file run unchanged in the browser, in Node (vm context with `window = globalThis`, see `tools/load.js`) and in Apps Script V8. No DOM, no `fetch`, no modules. Each file does `var root = (typeof window !== 'undefined') ? window : globalThis;` and attaches its global.
- The engine reads data globals **lazily, at call time** (`root.WI_PLAN` …), so script order only matters in that everything must be loaded before the first call. In Apps Script, never call `WI.*` from top-level code of `Code.gs`; call it inside functions.
- Browser load order (W2): `config.js`, `schema.js`, `data/plan.js`, `data/choices.js`, `data/rules.js`, `data/game.js`, `data/checklist.js`, `data/coverage.js`, `data/postests.js` (optional), W3's `data/guide.js`, `data/frames.js`, `data/levels.js`, `data/blocklist.js`, `data/why.js`, `data/pool.js`, W5's data files, then `engine.js`, then `api.js`, `pack.js`, `app.js`.
- `apps-script/Shared.gs` is **generated** by `node tools/build-gs.js` from: `schema.js`, `data/plan.js`, `data/choices.js`, `data/rules.js`, `data/game.js`, `data/checklist.js`, `data/coverage.js`, `data/pool.js` (W3; needed so the server can pick optional items), `data/why.js` (W3; optional), `engine.js`. Header line 2 holds `// source-hash: <sha256 of the sources>`; `tools/validate.js` (V10) fails if it is stale. Never edit `Shared.gs` by hand.
- `WI.version` = engine version string (e.g. `'2026-11-19a'`).

Globals defined by W4 files:

| Global | File | Shape (summary) |
|---|---|---|
| `WI` | `engine.js` | functions below |
| `WI_PLAN` | `data/plan.js` | `{start, tz, weeks[], lessons[], stages[], milestones[], phase2Start, onlineOpensAtDefault, holidays[]}` |
| `WI_CHECKLIST` | `data/checklist.js` | `{items[] (fixed), habits[] (templates), choiceRules[], poolDefaults, routes[]}` |
| `WI_COVERAGE` | `data/coverage.js` | `{requirements:[{id, deliverable, text, due, items[]}]}` (SPEC §6 verbatim) |
| `WI_CHOICES` | `data/choices.js` | option lists, every entry `{id, label, …}` (§0.1) |
| `WI_GAME` | `data/game.js` | `{xpRules[], ranks[], badges[]}` |
| `WI_RULES` | `data/rules.js` | `{rules:[6 strings, SPEC §14.1 verbatim], screenshotTick, paidNote, notRudeLabel, analysisOverAdoption}` |
| `WI_POSTESTS` | `data/postests.js` | `[{n, word, sentence, pos, conf, rule, alt[]}]` 58 rows (SPEC §3.5) |

### 0.1 Option ids (`WI_CHOICES`) — the values stored in the Sheet

W1's `WI_SCHEMA.enums` must use these ids (or read them from `WI_CHOICES`). Labels are display text.

| List | ids |
|---|---|
| `targetGroups` | `tg_5_16 tg_17_19 tg_20_30 tg_31_60 tg_61 tg_male tg_female tg_school tg_online tg_family tg_everyone tg_thai tg_foreign` (SPEC §5.6 A; labels verbatim) |
| `ideas` | `{id, label, mode, askFirst?, helper?}`: `id_speak id_tiktok id_instagram id_facebook id_memes id_youtube id_hashtags id_chats id_clubs id_replies id_song id_poem id_tshirt id_wiktionary id_gamename id_documentary id_askfriends id_influencer` |
| `channels` | `{id, label, online}`: `ch_school ch_home ch_out` (online false) · `ch_chat ch_tiktok ch_instagram ch_facebook ch_youtube ch_forum ch_game ch_wiktionary ch_other_online` (online true) |
| `platforms` | `pf_inperson` (In person only, `exclusive:true`) `pf_tiktok pf_instagram pf_facebook pf_youtube pf_chats pf_other` (`online:true` on all but `pf_inperson`) |
| `routes` | `utility play shift` |
| `timeBudgets` | `light standard stretch` (with `optional` = 0/2/4 and `planPerWeek` = 1/2/3) |
| `pos` (word card) | `noun verb adjective adverb interjection other` (`other` = "Phrase / other"). The guesser returns `unknown` instead of `other`; nothing is pre-selected for `unknown`. |
| `formations` | `blending clipping compounding conversion borrowing coinage semantic_shift other` |
| `outcomes` | `as_planned changed not_done` |
| `audiences` | `p1 p2_5 p6_20 p21 unsure` |
| `journalKinds` | `reflection zero_result failure_analysis theory_link summit_feedback final_reflection free` |
| `relations` | `me classmate friend_class friend_out cousin family online_known stranger unsure` |
| `prompted` | `asked unasked unsure` · `marked`: `natural marked unsure` |
| `topics` | `school exams friends food weather phones games family travel other` |
| `posUsed` | `noun verb adjective adverb interjection unsure` |
| `sightingLevels` | `[0,1,4,5,6]` (2 and 3 come from the survey only) |
| `verifiable` | stored as boolean `true` / `false` |
| `tallyTypes` | `said heard asked online` |
| `evidenceTypes` | `log journal sighting screenshot tally survey record doc none` (plan-table select uses `planEvidence`: `log journal sighting screenshot tally survey`) |
| `metrics` | `recognition corrected comprehension level other` |
| `hypStatuses` | `supported not_supported too_early` |
| `zbPlaces` | `zb_google zb_tiktok zb_instagram zb_x zb_youtube zb_urban` · `zbResults`: `none other_meaning my_meaning cannot` |
| `specRows` | `R1`…`R10` `{id, requirement, quickTest}` (research notes §7.1) · `specResults`: `pass not_yet not_fit` |
| `problemCategories` | `negative_comment stranger_contact uncomfortable other` |
| `reviewDecisions` | `carry cannot dropped` |
| `regStatuses` | `draft submitted approved changes` |

Checklist row `source` values: `fixed-course plan-action choice-driven habit carried` (SPEC §5.1) **plus** `pool` (optional X-nn items) and `own` (her own items). Row `kind`: `required recommended optional own`. Row `status`: `open done cannot dropped carried expired`. `doneBy`: `auto manual`.

## 1. Data bundle `D`

Every function takes the `bootstrap` bundle of SPEC §8.3 (brief §3.1): `{student, state, config, word, wordHistory, plans, planActions, checklist, reviews, actions, journal, sightings, tallies, files, waves, waveNotes, requests, flags, feedback, reports, summit, article, audits:{mine,onMe}, xpLog}`. Rows use Sheet column names; json columns already parsed; booleans real booleans; dates ISO strings. Missing arrays/objects are treated as empty. `D.student.id` (or `D.state.studentId`) gives the student id. `D.config` is a plain object `{release, onlineOpensAt, boardEnabled, summitSlots, lastWeeklyJob}`; when absent the engine falls back to `root.WI_CONFIG` (browser) and then defaults (`release:1`, `onlineOpensAt:'2026-11-26T16:30:00+07:00'`).

Rows with `deleted === true` are ignored by every predicate, badge and stage gate (they still keep XP already given, §6).

**Server-side note (W1):** for `WI.awards` pass the student's **full** `XPLog` rows as `D.xpLog`, not the last 50.

## 2. Time and weeks (all Asia/Bangkok, fixed offset +07:00, no DST)

| Function | Returns |
|---|---|
| `WI.now(serverOffsetMs?)` | ISO string `YYYY-MM-DDTHH:mm:ss+07:00` for `Date.now() + (serverOffsetMs‖0)` |
| `WI.isoBkk(dateOrIsoOrMs)` | the same instant as an ISO string with `+07:00` |
| `WI.dateOf(x)` | `'YYYY-MM-DD'`, the Bangkok calendar date of `x` |
| `WI.parse(x)` | epoch ms. Accepts `Date`, ms number, full ISO (any offset), `'YYYY-MM-DD'` (= 00:00 Bangkok that day), or a date-time **without a zone** (`2026-11-22T23:59:00`, read as Bangkok time, never the device or server zone) |
| `WI.addDays('YYYY-MM-DD', n)` | `'YYYY-MM-DD'` |
| `WI.dow(x)` | 0 = Sunday … 6 = Saturday, Bangkok |
| `WI.fmtDate(x, style?)` | `'Mon 23 Nov'` (`style 'long'` → `'Mon 23 Nov 2026'`) |
| `WI.weekIdOf(x)` | `'W01'`…`'W13'` (before W01 → W01; after W13 → W13) |
| `WI.weekIndex(weekId)` | 1…13 · `WI.weekIdAt(n)` → `'Wnn'` (clamped) · `WI.nextWeekId(w)` / `WI.prevWeekId(w)` → id or `null` |
| `WI.weekRange(weekId)` | `{start:'2026-11-23', end:'2026-11-29', startIso:'2026-11-23T00:00:00+07:00', endIso:'2026-11-29T23:59:59+07:00', sunday:'2026-11-29', label:'Week 2 · Mon 23 – Sun 29 Nov'}` |
| `WI.week(weekId)` | the `WI_PLAN.weeks` entry `{id, start, end, lessons[], notes, light, phase}` |
| `WI.isLightWeek(weekId)` | true for W06, W07 |
| `WI.phaseOf(x)` | 1 before Fri 18 Dec 2026 00:00, else 2 |
| `WI.projectFinished(nowIso)` | true after Sun 14 Feb 2027 23:59:59 |
| `WI.reviewOpensAt(weekId)` | ISO, Sunday 00:00 of that week |
| `WI.daysLeft(dateOrIso, nowIso)` | whole Bangkok calendar days from today to that date (0 = today, negative = past) |
| `WI.milestones()` | `WI_PLAN.milestones` · `WI.nextMilestone(nowIso)` → `{milestone, daysLeft}` or `null` · `WI.milestoneStatus(m, nowIso)` → `'done'` (end date passed) / `'next'` (the first not passed) / `'later'` |

## 3. Part of speech (`WI.pos`, SPEC §3.2, exact)

- `WI.pos.guess(word, sentence)` → `{pos, conf, rule, alt:[], reason, w, p, suffix, index}`
  - `pos` ∈ `noun verb adjective adverb interjection unknown`; `conf` ∈ `high medium low none`; `rule` `P00`…`P21`; `alt` alternative pos list (order as SPEC §3.2).
  - `w` = her word as written in the sentence (original case, target tokens), `p` = the word before it (or `''`), `suffix` = `'' s ed ing er est y ly poss`, `index` = target token index or `-1`.
  - `reason` = `GUIDE.posReasons[rule]` with `{w}` and `{p}` filled, if `GUIDE` is loaded; otherwise the rule id. For P09 and P10 the reason is cut to the half that matches the result (`WI.pos.reasonFor`).
- `WI.pos.reasonFor(rule, w, p, pos)` → string (same filling rules).
- `WI.pos.confText(conf)` → `'I am fairly sure.'` / `'I think so, but check.'` / `'I am not sure. Please choose.'` (SPEC §3.1 step 3).
- `WI.pos.lists` → `{DET:[…], INT, MODAL, TOLEAD, SUBJ, SUBJ3, BE, LINK, HAVE, PREP, SKIP, KEEP, PREMOD, CAUS, OBJP, OBJ, CVERB, FUNC_EXTRA}` (arrays, SPEC order; validator V2).
- Tokeniser details beyond SPEC §3.2 step 1 (review, 19 Nov; the 58 tests are unchanged): single quotation marks round the word (`'vronk'`, `‘vronk’`) are stripped, the apostrophe in `don't` / `girls'` stays; punctuation typed with a space before it (`vronk !`, `vronk , honestly`) belongs to the word before it; a chunk in another script (Thai …) counts as a word with `w:''`, so a mixed sentence is never "only the target" (P01) and falls to P21 when nothing else matches; emoji are dropped. A multi-word target is refused only across a boundary mark (`. ! ? ; : ,`).
- `WI.pos.inflections(base)` → `[[form, suffix], …]` · `WI.pos.tokens(sentence)` → `[{w, trail, raw}]` · `WI.pos.containsWord(word, sentence)` → bool (exact or inflected, SPEC §3.2 step 2; used for the "must contain the word" check on `example1`–`example3`).

## 4. Catalogue and checklist

### 4.1 Item definitions

- `WI.itemDef(itemId, D?)` → catalogue-shaped item `{id, title, why, stage, week, due, kind, source, feeds[], xp, evidence, route, check, online, release}` for any id:
  - `F-Wnn-xx` fixed (from `WI_CHECKLIST.items`); `H-Wnn-k` habit instance (k 1–5); `C-<RULE>` or `C-<RULE>-2` (phase-2 instance) choice-driven; `P-<planActionId>` (needs `D.planActions`); `X-nn` optional pool (from W3's `WI_POOL`; kind optional, xp 5, `check:null`, route `#/log`); `O-<8 chars>` own item (title from her row; xp 0, `check:null`).
  - `why` is filled from `WI_WHY[itemId]` (W3) when loaded, else `''`. Unknown id → `null`.
- `WI.fixedItems()` / `WI.habitItems(weekId)` / `WI.choiceRules()` / `WI.poolItems()` → arrays.
- `WI.knownRoute(route)` → bool (route patterns of SPEC §2.2; query strings allowed).

### 4.2 Rows

A checklist **row** is a `Checklist` Sheet row: `{id:'<studentId>|<weekId>|<itemId>', studentId, weekId, itemId, title, kind, source, status, originWeek, carryCount, dueDate, doneAt, doneBy, reason, refId, createdAt, updatedAt}`. New rows from the engine have `status:'open'`, `doneAt:''`, `doneBy:''`, `reason:''`, `createdAt = updatedAt = nowIso`. `refId` = the planActionId for `P-` rows (kept when carried), else `''`. `originWeek` = the week the item first appeared; `carryCount` = 0 for new, `+1` each carry.

Extra non-column fields the engine may add to returned rows (W1 must drop keys that are not Sheet columns before writing): `afterBreak:true` on carried required rows in W06–W07.

### 4.3 Generation

- `WI.buildWeek(D, weekId, nowIso, opts?)` → array of **new** rows for `weekId`, SPEC §5.3 steps 1–7, in display order. **Idempotent:** it never returns an item that already has a row in `weekId`, so the server can call it again at any time to top the current week up (after `plan.save`, a planned-action save, an approved `ask_first` request, or audit assignment) and write only what it returns.
  - Step 1 (carried): every row of the previous week with status `open` and kind ≠ optional (and no row of the same item in `weekId` yet) → new row, `source:'carried'`, same `itemId`, `kind`, `title`, `dueDate`, `refId`, `originWeek` kept, `carryCount + 1`. (Closing the old row is `rollWeek`'s job.)
  - Step 2 (fixed): items with `week == weekId` and `release ≤ release`; **also** any fixed item of an earlier week with `release ≤ release` that she has never had any row for (late release or late start), with its own kind.
  - Step 3 (habit): `H-<weekId>-k` per SPEC §5.7 (H-5 only if release ≥ 2 and `D.audits.mine` has an audit whose `assignedAt` falls in this week; W1: call `buildWeek` again right after assigning audits so the item appears).
  - Step 4 (plan-action): every non-deleted `PlanActions` row with status `planned` and `weekIdOf(whenDate) == weekId` → `P-<id>` (`opts.prefs.moved` overrides `whenDate`).
  - Step 5 (choice-driven): every rule whose `when` is true for her current plan, `weekIndex ≥ firstWeek`, and that she has never had (id `C-<RULE>`). Phase-2 instance `C-<RULE>-2` fires only if the rule is true for her phase-2 plan and was false for phase 1.
  - Step 6 (optional pool): `n` = 0/2/4 for light/standard/stretch (her plan's `timeBudget` for the phase of the week; default standard) minus pool rows already in this week; candidates = `WI_POOL` items with stage ≤ her current stage, never had, not online while online is locked, not in `prefs.skip`; ordered by a stable hash of `studentId + weekId + itemId`.
  - Step 7 (review prefs): `prefs` = `opts.prefs` or the `nextPrefs` of her review of the previous week. `skip` removes those optional ids; `own:[{title, dueDate}]` adds `O-<hash8>` rows (id is a stable hash of studentId, weekId, index, title), max 5.
  - Light weeks (W06, W07): every row created by steps 2–7 has `kind:'optional'`; carried rows keep their kind and get `afterBreak:true`.
  - `opts`: `{release?, prefs?, decisions?, stage?, onlineUnlocked?}`. `decisions` (`{itemId: carry|cannot|dropped}`, for the review preview): items marked `cannot`/`dropped` are not carried. Defaults: release from `D.config.release` → `WI_CONFIG.release` → 1.
  - `dueDate`: fixed → item `due`; habit, choice, pool → the week's Sunday; plan-action → its `whenDate`; own → given date or the Sunday.
- Review round, 19 Nov (behaviour W1/W2 should know):
  - **Late start.** `WI.startWeekId(D, nowIso?)` = the week her oldest checklist row was written in (no rows: the week of `nowIso`). A week before it (W01 for a student who first signs in on Mon 23 Nov) is built with its **fixed items only**: no habit, choice-driven or optional rows, and `reviewDue` / `reviewOffered` never list it. Its fixed items arrive as carried, as SPEC §5.8 says. Weeks she had and then missed are unchanged: all their items carry and their reviews stay due.
  - **Carried habit rows** get the title prefix `Week n: ` (`Week 1: Write one Lab Book reflection`), so two rows with the same habit can be told apart. The `itemId` is unchanged.
  - **Skipped optional proposals** (`nextPrefs.skip`) are left out and are **not replaced** by other pool items, in the preview and at roll-over.
  - **Decisions.** In `opts.decisions`, `dropped` is honoured only for `own` rows (optional rows never carry anyway); a required or recommended row with a forged `dropped` still carries.
  - **Light weeks.** A fixed item that arrives late in W06/W07 (release switched on in the break) keeps its kind and is not overdue, and not in `F_DEADLINE`, until W08, like a carried row. A required or recommended choice-driven item first made in W06/W07 (so optional there) and expired there is made once more, with its own kind, in the first normal week.
- `WI.rollWeek(D, fromWeekId, nowIso)` → `{close:[{id, status, updatedAt}], open:[rows]}`. `close`: every row of `fromWeekId` with status `open` → `carried` (kind ≠ optional) or `expired` (optional). `open` = `buildWeek(D', nextWeekId(fromWeekId), nowIso)` where `D'` has the closes applied. From W13 → `{close:[], open:[]}`. The server's `ensureWeek_` loops `while (State.weekId < weekIdOf(now))`: `rollWeek(D, State.weekId)`, write, set `State.weekId` to the next week, reload `D`. For a brand-new student with no rows, call `buildWeek(D, 'W01', now)` first (so late starters get W01 items carried, SPEC §5.8 last line), then roll.
- `WI.previewWeek(D, weekId, nowIso, reviewDraft)` → `buildWeek(D, nextWeekId(weekId), nowIso, {prefs: reviewDraft.nextPrefs, decisions: reviewDraft.decisions})` with the current week's open rows treated as carried (for the Sunday review step 3).
- `WI.weekRows(D, weekId)` → her rows of that week (any status) · `WI.weekGroups(D, weekId)` → `{must, recommended, plan, choice, carried, optional, own}` arrays of `{row, item}` (SPEC §2.3 S-WEEK order) · `WI.weekCounts(D, weekId)` → `{done, open, carried, cannot, total}` (carried = open rows with source carried).
- `WI.ownItemCount(D, weekId)` → number of own rows that week (LIMIT at 5).
- `WI.isOverdue(row, nowIso)` → bool: open, `dueDate` < today, and not (`afterBreak` / carried required in W06–W07 before W08).

### 4.4 Completion

- `WI.checks` — map `predicateKey → function(D, weekId) → bool` for every key of SPEC §5.2 (`word.first`, `word.usage`, … `journal.final`). Week-scoped keys (`week.*`) use `weekId`; the others ignore it. Exact thresholds are in §7 of this file.
- `WI.itemDone(D, row)` → `true` / `false` when the item has a check (catalogue `check`, or `P-` rows: an action entry with `planActionId` = the plan id), or `null` when she ticks it by hand.
- `WI.evalChecks(D, weekId)` → `{itemId: bool}` for every row of that week whose item has a check (incl. `P-`).
- `WI.autoTicks(D, weekId?, nowIso)` → `[{id, status:'done', doneAt:nowIso, doneBy:'auto', updatedAt}]` for open rows (all weeks if `weekId` omitted) whose check is now true. The server applies these after every write; the client may show them optimistically. A self-ticked row cannot be un-ticked by hand (`WI.canUntick(row)` → false when `doneBy == 'auto'` or the item has a check).
- `WI.canSetStatus(row, status)` → `{ok, code?}`: `dropped` only for kind optional/own (else `FORBIDDEN`); `cannot` needs a reason 10–200 (checked by schema); `open` (undo) only for manual rows.

## 5. Stage, next step, review, online

- `WI.stageOf(D, nowIso)` → `'s1'`…`'s7'`, the highest stage whose gate is met (SPEC §4.2): s2 first step confirmed; s3 date ≥ Sat 21 Nov and six rules ticked and ≥ 3 planned actions (phase 1); s4 s3 and date ≥ Thu 26 Nov and ≥ 3 action entries and ≥ 1 review; s5 s3 and date ≥ Mon 23 Nov and a published Wave 1 row; s6 s3 and date ≥ Mon 7 Dec; s7 date ≥ Fri 18 Dec.
- `WI.stagePath(D, nowIso)` → `[{id, name, met, current, opens}]` for the seven lights.
- `WI.nextStep(D, nowIso)` → `{label, route, why, itemId?, rowId?}` (SPEC §10.3, first match): review due → `'Do your weekly review'` `#/review`; first step missing → `'Record your word'` `#/first`; a required item overdue → its title + route; a required item due within 3 days → same; unread feedback → `'Read T.Chris’s feedback'` `#/home`; an assigned audit → `'Do your audit'` `#/audits/<auditId>`; the open recommended item with the nearest due date; else `'Write in your Lab Book'` `#/log/journal/new`.
- `WI.reviewDue(D, nowIso)` → weekIds (oldest first) whose review is **forced**: now ≥ the week's Sunday 00:00, she has rows in that week, the week is not before `WI.startWeekId(D)`, no `Reviews` row for it, not W06/W07, not W13. `WI.reviewOffered(D, nowIso)` → the same plus due light weeks (Home offers them).
- `WI.reviewOnTime(weekId, submittedAtIso)` → true if submitted on that week's Sunday (Bangkok date).
- `WI.onlineUnlocked(D, nowIso, config?)` → bool. Rules: if `state.onlineUnlockedBy == 'teacher'` the teacher's value `state.onlineUnlocked` wins (true = unlocked early, false = locked again); else true if `state.onlineUnlocked` is already true, or all six rules are ticked and `now ≥ config.onlineOpensAt`. `WI.onlineStatus(D, nowIso, config?)` → `{unlocked, by:'auto'|'teacher'|null, opensAt, shouldSetAuto}` (`shouldSetAuto` = the server should now write `onlineUnlocked TRUE, onlineUnlockedBy 'auto', onlineUnlockedAt now`). `t.online` writes `onlineUnlockedBy:'teacher'` for both unlock and lock.
- `WI.rulesAllTicked(D)` → bool (six non-empty ISO strings in `state.rulesTicked`).
- `WI.isOnlineChannel(channelId)` · `WI.ideaMode(ideaId)` · `WI.isOnlinePlatform(platformId)`.
- `WI.lockedOnline(type, record, D, nowIso, config?)` → bool, true = refuse with `LOCKED_ONLINE`: type `action` on an online channel with `outcome != 'not_done'`, or type `sighting` with `relation == 'me'` on an online channel, while online is locked. Planned actions (`planAction`) are never refused (they show "locked until unlocked").
- `WI.askFirstApproved(D, ideaId?)` → true if a `Requests` row of type `ask_first` (for that idea, default `id_influencer`) is `approved`. `WI.ideaSelectable(D, ideaId)` → false for `askFirst` ideas until approved (SPEC P10).
- `WI.owned(sighting)` → `relation == 'me' || prompted == 'asked'` (server sets the `owned` column from this).
- `WI.wordCount(text)` → number of whitespace-separated tokens that contain a letter or digit.

## 6. Gamification (no reward for spread)

Nothing here reads a sighting count, `level`, `finalLevel`, a tally `count`, an `audience`, or a wave figure (validator V9 proves it on two bundles).

- `WI.xpFor(event, D?)` → xp number for one event `{ruleId, itemId?, onTime?}`: base xp of the rule; X11 = the item's `xp`; X12 = 30 (+10 if `onTime`).
- `WI.entitlements(D, nowIso)` → full list of awards `[{id:'<studentId>|<eventKey>', studentId, at, ruleId, eventKey, xp}]` the data entitle her to, caps applied (SPEC §9.1). Already-awarded keys (`D.xpLog`) are always kept and fill cap slots first; other events fill the remaining slots in date order (entry `date`, then `createdAt`, then `id`). "A day" / "a week" use the entry's `date` / `weekId`. Deleted entries count only if already awarded.
- `WI.awards(D, nowIso)` → the **new** awards = `entitlements` minus keys already in `D.xpLog`, each `{id, studentId, at: nowIso, ruleId, eventKey, xp}` (an `XPLog` row). Server: append these, then `state.xp = WI.xpTotal(allXpLogRows)`; return `gained:[{ruleId, xp}]`. (The 3-argument form `WI.awards(D, before, after)` of the brief is also accepted: it returns awards entitled by `after` whose keys are in neither `before.xpLog` nor `after.xpLog`.)
- `WI.xpTotal(xpLogRows)` → sum of `xp`.
- Event keys: `first`, `card`, `zb`, `plan:<phase>`, `rules`, `ac:<id>`, `acl:<id>`, `jn:<id>`, `zero:<weekId>`, `fail:<weekId>`, `ck:<itemId>`, `rv:<weekId>`, `cant:<itemId>`, `au:<auditId>`, `acr:<id>`, `rp:<type>`, `sm:abs`, `sm:reh:<n>` (n 1–3), `sm:check`, `pivot`, `peer:<n>`.
- `WI.badges(D, nowIso?)` → `{badgeId: true}` for every badge whose trigger is true now (SPEC §9.3; streak badges use the best streak). `WI.newBadges(D, nowIso?)` → ids true now and not yet in `state.badges`. Badges are never taken away (server merges `{badgeId: ISO}`).
- `WI.rankOf(xp)` → `{id, name, min, index, next:{id, name, min} | null, toNext, progress}` (`progress` 0–1 within the band).
- `WI.streak(D, nowIso)` → `{streak, best, onTimeWeeks}` (SPEC §9.4): walk back from the latest week whose review has opened; a week counts if its `Reviews` row was submitted before the next week's Sunday 00:00; a week whose window is still open and has no review is skipped; light weeks never break it; W13 has no review; stop at the first other gap or at a week with no rows.
- `WI.boardRows(rows)` → sorts `[{label, xp, streak}]` by xp (desc), label, and adds `rank` names.

## 7. Predicate thresholds (`WI.checks`)

`words(x)` = `WI.wordCount`; `len(x)` = trimmed length.

| key | true when |
|---|---|
| `word.first` | `word`, `meaning`, `example1` non-empty and `posConfirmed` |
| `word.usage` | `word.first` and `len(usageRules) ≥ 20` |
| `word.card` | `word.usage`, `formation` set, `len(sourceWords) ≥ 3`, `len(example2) ≥ 15`, `len(example3) ≥ 15`, `len(purpose) ≥ 20`, `notRudeConfirmed` |
| `word.zb` | `zb.checkedAt` set, all six `zbPlaces` have a `result`, `len(zb.statement) ≥ 20` |
| `word.submitted` | `regStatus` set and ≠ `draft` |
| `word.fudge` | `fudge.pred` F U D G E integers 0–2 and `len(reasons.X) ≥ 10` for all five |
| `word.hypotheses` | `len(researchQuestion) ≥ 15` and ≥ 2 hypotheses with `len(text) ≥ 20` and a `metric` |
| `word.spec` | `specSheet.R1`…`R10` all have a `result` |
| `plan.choices` | phase-1 plan: ≥ 1 target group, ≥ 1 idea of which ≥ 1 has mode `inperson` or `either`, ≥ 1 platform, `route`, `timeBudget`, `len(who/why/what) ≥ 20` each |
| `rules.all` | `WI.rulesAllTicked(D)` |
| `plan.actions3` / `plan2.actions3` | ≥ 3 non-deleted `PlanActions` of phase 1 / 2 |
| `action.first` | ≥ 1 non-deleted action |
| `week.action` | an action dated in the week, or a `zero_result` journal entry dated in the week |
| `week.journal` | a journal entry dated in the week with ≥ 40 words |
| `week.sightcheck` | a sighting dated in the week, or a `zero_result` journal entry dated in the week |
| `week.review` | a `Reviews` row for the week |
| `week.audit` | no audit of hers with status `assigned` whose `assignedAt` falls in that week |
| `wave.note.Wn` | a published `Waves` row of `Wn` and her `WaveNotes` `note` for `Wn` ≥ 20 words |
| `sight.levels` | every non-deleted sighting has a level (0–6) |
| `journal.failure` | ≥ 1 `failure_analysis` entry |
| `hyp.checked.W2/W3` | ≥ 1 hypothesis and each has a status in that wave's `hypothesisChecks` |
| `report.<type>.ready` | that report's status is `ready` or `submitted` |
| `summit.outline` | the six sections `hook term approach evidence learnings phase2` each have `notes` ≥ 20 words |
| `summit.aoa` | `aoaStatement` ≥ 25 words |
| `summit.abstract` | `abstract` 45–55 words |
| `summit.visuals` | ≥ 1 `chartIds` |
| `summit.rehearsed2` | ≥ 2 `rehearsals` |
| `summit.qa5` | ≥ 5 `qa` answers of ≥ 15 words |
| `summit.selfcheck` | `selfCheck` SC1–SC5 all have a `rating` |
| `summit.feedback` | a `summit_feedback` journal entry |
| `pivot.card` | phase-2 plan has non-empty `variableChanged` and `p2Hypothesis` |
| `article.outline` | `title` and the four section `notes` non-empty |
| `article.sources6` | ≥ 6 sources with `len(apa) ≥ 20` and `len(use) ≥ 10` |
| `article.visuals3` | ≥ 3 visuals with a caption |
| `article.ethics` | `ethics` ≥ 60 words · `article.ai`: `aiDeclaration` ≥ 10 words |
| `article.abstract` | 150–200 words · `article.words`: `wordCount` 2,000–3,000 |
| `article.sections.MR` / `.ID` | methods + results (intro + discussion) notes ≥ 300 words together, each non-empty |
| `peer.r1` / `peer.r2` | `peer.given` entry `n` 1 / 2 with notes ≥ 80 words |
| `peer.plan` | `revisionPlan` ≥ 40 words |
| `fin.compare` / `fin.close` | final report `sections.compare` / `sections.closeout` ≥ 60 words |
| `journal.final` | a `final_reflection` entry ≥ 150 words |

## 8. Waves

- `WI.corrected(waveRows)` → `{foilRate, terms:{termKey:{termKey, termText, n, recPct, notSurePct, compPct, foilRate, corrected, isFoil, isControl}}}` for the rows of **one** wave. Percentages are numbers 0–100, not rounded (`null` when `n` is 0). `foilRate` = mean recognition % of the foils present (`null` if none). `corrected = recPct − foilRate` (may be negative; `null` for foils or with no foil rate).
- `WI.correctedByWave(rows)` → `{W1: <corrected(rows of W1)>, …}`.
- `WI.pct(x)` → whole per cent (`Math.round`), `null` stays `null`.
- `WI.waveCheck(row)` → `{ok, field?, message?}` for one T-WAVES row (n 1–999; 0 ≤ recognised, notSure, comprehended ≤ n; recognised + notSure ≤ n; foils comprehended = 0).
- `WI.myWaves(D, studentId?)` → published rows visible to her: her term, `ctrl1 ctrl2 foil1 foil2`.

## 9. Teacher and coverage helpers

- `WI.flags(D, nowIso)` → flag ids of SPEC §2.4 T-CLASS that apply: `F_PROBLEM` (a flag not `handled`), `F_QUIET` (no Action, Journal, Sighting, Tally `createdAt` or manual tick for 7 days; also uses `state.lastActivityAt`), `F_DEADLINE` (a milestone within 3 days and an open required row feeding one of its requirements; carried rows of W06–W07 do not count before W08), `F_PENDING` (a pending request or `regStatus == 'submitted'`), `F_CANNOT` (a required row with status `cannot`). Sort order (F_PROBLEM first) is the caller's.
- `WI.lastActivityAt(D)` → ISO or `''`.
- `WI.milestoneRequirements(milestoneId)` → requirement ids a milestone stands for (M03 → `BAS-*`, M06 → `INT-*`, M08 → `SUM-*`, M09 → `LAB-PRE`, M13 → `FIN-*`, M15 → `PEER-*`, M16 → `ART-*`, `A1-RESEARCH`, `A1-REFLECT`, `LAB-POST`, …).
- `WI.milestoneNeeds(D, milestoneId)` → `{milestone, requirements:[requirementStatus…]}` (S-PLAN tap-through).
- `WI.requirement(reqId)` → the coverage row · `WI.requirementStatus(D, reqId)` → `{requirement, items:[{itemId, title, due, status}], done, total}` with item status `done` / `cannot` / `open` (a row exists) / `later` (not generated yet) · `WI.itemStatus(D, itemId)` · `WI.deliverableStatus(D, prefix)` → array for e.g. `'SUM-'` or `'ART-'` (T-STUDENT readiness tabs).
- `WI.planOverload(D, weekId)` → `{count, limit, extra:[planActionIds]}` (light 1 / standard 2 / stretch 3; the Sunday review offers to move the extra ones).
- `WI.planActionLocked(D, planAction, nowIso, config?)` → true when its channel is online and online is locked ("locked until unlocked").
- `WI.choice(listName, id)` → the `WI_CHOICES` entry · `WI.label(listName, id)` → its label · `WI.fudgeTotal(pred)` → `{total, band:'likely'|'fringe'|'doomed'}` · `WI.specPassCount(specSheet)` → 0–10 · `WI.config(D, config?)` → merged config with defaults · `WI.xp(D, nowIso)` → total of `entitlements`.
- `WI.ruleTrue(choiceRule, plan, D)` → whether a choice rule's condition holds for a plan.

Notes on data:
- Choice-rule titles are the SPEC §5.6 table D wording and some are longer than 90 characters (C-PRIVATE is 175); show them wrapped.
- In `WI_COVERAGE`, a habit range such as `H-W02..W12-3` expands **without** W06 and W07 (light weeks: their habit items are optional and never count, SPEC §5.7 and §6). `requirements[].itemsRaw` keeps the SPEC text.

## 10. Misc

- `WI.hash(str)` → stable 32-bit FNV-1a as 8 lowercase hex chars (used for own-item ids and pool picks).
- `WI.newId(prefix)` → `<prefix>_<12 base36 chars>` (client ids, SPEC §7).
- `WI.validateData()` → `[messages]` light self-check of the loaded data (the full check is `tools/validate.js`).
