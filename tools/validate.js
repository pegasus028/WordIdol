#!/usr/bin/env node
// WordIdol validator (W4): SPEC §15.3 checks V1–V12. Exit code 1 on any error.
//   node tools/validate.js            all checks
//   node tools/validate.js V2 V5      only some
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');
const cp = require('child_process');
const load = require('./load.js');
const buildGs = require('./build-gs.js');

const ROOT = load.ROOT;
const results = {};
let current = null;
function section(id, title) { current = id; results[id] = { title: title, errors: [], warnings: [], notes: [] }; }
function err(m) { results[current].errors.push(m); }
function warn(m) { results[current].warnings.push(m); }
function note(m) { results[current].notes.push(m); }
function readSpec() { const p = path.join(ROOT, 'SPEC.md'); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; }
function arr(x) { return Array.isArray(x) ? x : []; }
function words(t) { return String(t || '').trim().split(/\s+/).filter(function (w) { return /[A-Za-z0-9]/.test(w); }).length; }

// ------------------------------------------------------------------ repo files
function repoFiles() {
  let list = null;
  try {
    const tracked = cp.execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).split('\n');
    const untracked = cp.execSync('git ls-files --others --exclude-standard', { cwd: ROOT, encoding: 'utf8' }).split('\n');
    list = tracked.concat(untracked).filter(Boolean);
  } catch (e) { list = null; }
  if (!list) {
    list = [];
    (function walk(dir) {
      for (const f of fs.readdirSync(dir)) {
        if (f === '.git' || f === 'node_modules') continue;
        const abs = path.join(dir, f);
        if (fs.statSync(abs).isDirectory()) walk(abs); else list.push(path.relative(ROOT, abs));
      }
    })(ROOT);
  }
  return Array.from(new Set(list)).filter(function (f) { return fs.existsSync(path.join(ROOT, f)); }).sort();
}

// ------------------------------------------------------------------ fixture bundles (shared with tests/unit.test.js)
function baseBundle(id, over) {
  const D = {
    student: { id: id || 'g1', label: 'Guest#1', guest: true },
    state: { studentId: id || 'g1', weekId: 'W01', rulesTicked: ['', '', '', '', '', ''], badges: {}, xp: 0, streak: 0, bestStreak: 0 },
    config: { release: 3, onlineOpensAt: '2026-11-26T16:30:00+07:00', boardEnabled: true },
    word: { studentId: id || 'g1', word: '', meaning: '', example1: '', posConfirmed: false, regStatus: 'draft' },
    wordHistory: [], plans: [], planActions: [], checklist: [], reviews: [], actions: [], journal: [], sightings: [],
    tallies: [], files: [], waves: [], waveNotes: [], requests: [], flags: [], feedback: [], reports: [],
    summit: null, article: null, audits: { mine: [], onMe: [] }, xpLog: []
  };
  return Object.assign(D, over || {});
}
const LONG = 'This is a careful sentence about my word and how people used it at school this week with friends. ';
function text(nWords) { const w = LONG.trim().split(/\s+/); const out = []; for (let i = 0; i < nWords; i++) out.push(w[i % w.length]); return out.join(' '); }
function fullWord(id) {
  return {
    studentId: id, word: 'vronk', meaning: 'A sudden problem at the worst possible moment.', example1: 'That was a total vronk.',
    pos: 'noun', posGuess: 'noun', posRule: 'P10', posConfidence: 'high', posConfirmed: true, posAlso: ['verb'],
    usageRules: 'Use it as a noun after a or total; friends say it at school.', forms: { plural: 'vronks' },
    formation: 'coinage', sourceWords: 'Invented sound', example2: 'My phone died, total vronk.', example3: 'The bus left early, what a vronk!',
    purpose: 'It names a sudden problem that comes at the worst moment.', notRudeConfirmed: true,
    fudge: { pred: { F: 1, U: 2, D: 1, G: 1, E: 1, reasons: { F: 'We say it daily.', U: 'It sounds normal.', D: 'Only my class.', G: 'Vronky is possible.', E: 'Problems never end.' } } },
    specSheet: { R1: { result: 'pass' }, R2: { result: 'pass' }, R3: { result: 'pass' }, R4: { result: 'pass' }, R5: { result: 'not_yet' }, R6: { result: 'pass' }, R7: { result: 'pass' }, R8: { result: 'pass' }, R9: { result: 'pass' }, R10: { result: 'pass' } },
    researchQuestion: 'To what extent can a new word spread in one month?',
    hypotheses: [
      { id: 'h1', text: 'Recognition of vronk will reach ten per cent by Wave 2.', metric: 'recognition', target: '10% by Wave 2' },
      { id: 'h2', text: 'Corrected recognition will be above zero by Wave 2.', metric: 'corrected', target: '> 0' }
    ],
    zb: { checkedAt: '2026-11-12', statement: 'I found no results for vronk with my meaning anywhere.', fileIds: ['fl_zb0000000001'],
      places: ['zb_google', 'zb_tiktok', 'zb_instagram', 'zb_x', 'zb_youtube', 'zb_urban'].map(function (p) { return { placeId: p, result: 'none', note: '' }; }) },
    regStatus: 'submitted'
  };
}
function plan1(id, over) {
  return Object.assign({
    id: id + '-p1', studentId: id, phase: 1, targetGroups: ['tg_school'], ideas: ['id_speak'], platforms: ['pf_inperson'],
    platformOther: '', route: 'utility', timeBudget: 'standard',
    who: 'The girls in my class and my club.', why: 'We often have sudden problems at school.', what: 'They will hear the word at lunch every day.'
  }, over || {});
}
function planActions(id, n, whenDates, phase) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ id: 'pa_' + (phase === 2 ? 'b' : 'a') + String(i).padStart(11, '0'), studentId: id, phase: phase || 1, deleted: false,
      where: 'ch_school', ideaId: 'id_speak', what: 'Use the word at lunch with my friends ' + i, why: 'They see each other every day.',
      theoryTag: 'th-wncs', whenDate: whenDates[i % whenDates.length], evidence: 'log', status: 'planned', actionId: '' });
  }
  return out;
}

// ------------------------------------------------------------------ checks
function V1(ctx) {
  section('V1', 'data files parse; ids unique and well formed');
  ctx.__errors.forEach(err);
  load.REQUIRED.forEach(function (f) { if (ctx.__loaded.indexOf(f) < 0) err(f + ' did not load'); });
  function uniq(list, fam, re) {
    const seen = {};
    list.forEach(function (id) {
      if (seen[id]) err(fam + ': duplicate id ' + id);
      seen[id] = true;
      if (re && !re.test(String(id))) err(fam + ': bad id format ' + id);
    });
  }
  const P = ctx.WI_PLAN, C = ctx.WI_CHECKLIST, G = ctx.WI_GAME, CH = ctx.WI_CHOICES;
  uniq(arr(P.weeks).map(function (w) { return w.id; }), 'weeks', /^W\d\d$/);
  uniq(arr(P.lessons).map(function (w) { return w.id; }), 'lessons', /^L\d{1,2}$/);
  uniq(arr(P.stages).map(function (w) { return w.id; }), 'stages', /^s[1-7]$/);
  uniq(arr(P.milestones).map(function (w) { return w.id; }), 'milestones', /^M\d\d$/);
  uniq(arr(C.items).map(function (w) { return w.id; }), 'fixed items', /^F-W\d\d-\d\d$/);
  var EARLY_OK = { 'F-W05-01': 'W04', 'F-W05-04': 'W04', 'F-W05-05': 'W04' }; // shown a week early (lead, 19 Nov)
  arr(C.items).forEach(function (it) { if (it.id.substr(2, 3) !== it.week && EARLY_OK[it.id] !== it.week) err(it.id + ': id week differs from week ' + it.week); });
  uniq(arr(C.habits).map(function (h) { return 'H-Wnn-' + h.n; }), 'habits', /^H-Wnn-[1-5]$/);
  uniq(arr(C.choiceRules).map(function (r) { return r.id; }), 'choice rules', /^C-[A-Z]+$/);
  uniq(arr(ctx.WI_COVERAGE.requirements).map(function (r) { return r.id; }), 'requirements', /^[A-Z0-9]+-[A-Z0-9]+$/);
  uniq(arr(G.xpRules).map(function (r) { return r.id; }), 'xpRules', /^X\d\d$/);
  uniq(arr(G.badges).map(function (r) { return r.id; }), 'badges', /^B\d\d$/);
  uniq(arr(G.ranks).map(function (r) { return r.id; }), 'ranks', /^r\d$/);
  if (arr(G.xpRules).length !== 20) err('xpRules: expected 20 (X01–X20), found ' + arr(G.xpRules).length);
  if (arr(G.badges).length !== 20) err('badges: expected 20, found ' + arr(G.badges).length);
  if (arr(G.ranks).length !== 8) err('ranks: expected 8, found ' + arr(G.ranks).length);
  Object.keys(CH).forEach(function (k) {
    if (!Array.isArray(CH[k]) || !CH[k].length || typeof CH[k][0] !== 'object') return;
    uniq(CH[k].filter(function (x) { return x.id !== undefined; }).map(function (x) { return String(x.id); }), 'choices.' + k, null);
  });
  uniq(arr(ctx.WI_POSTESTS).map(function (t) { return String(t.n); }), 'postests', /^\d+$/);
  if (ctx.WI_POOL) uniq(arr(ctx.WI_POOL).map(function (p) { return p.id; }), 'pool', /^X-\d\d$/);
  else note('WI_POOL (W3) not loaded: pool ids pending');
  if (ctx.GUIDE) {
    const fam = { brainstorm: /^bs-s[1-7]-\d\d$/, stuck: /^stk-\d\d$/, labPrompts: /^lab-\d\d$/, theory: /^th-[a-z0-9-]+$/, sinks: /^snk-\d\d$/ };
    Object.keys(fam).forEach(function (k) { uniq(arr(ctx.GUIDE[k]).map(function (x) { return x.id; }), 'GUIDE.' + k, fam[k]); });
    const bf = { carriers: /^car-\d\d$/, triggers: /^trg-\d\d$/, formats: /^fmt-\d\d$/, bridges: /^brg-\d\d$/ };
    Object.keys(bf).forEach(function (k) { uniq(arr((ctx.GUIDE.banks || {})[k]).map(function (x) { return x.id; }), 'GUIDE.banks.' + k, bf[k]); });
  }
  if (ctx.FRAMES) uniq(arr(ctx.FRAMES).map(function (x) { return x.id; }), 'FRAMES', /^fr-[a-z_]+-\d\d$/);
}

function V2(ctx, spec) {
  section('V2', 'part of speech: 58 tests and word lists');
  const WI = ctx.WI, T = arr(ctx.WI_POSTESTS);
  if (T.length !== 58) err('WI_POSTESTS has ' + T.length + ' rows, expected 58');
  let pass = 0;
  T.forEach(function (t) {
    const g = WI.pos.guess(t.word, t.sentence);
    const ok = g.pos === t.pos && g.conf === t.conf && g.rule === t.rule;
    const altOk = JSON.stringify(g.alt) === JSON.stringify(t.alt);
    if (!ok) err('#' + t.n + ' "' + t.sentence + '": got ' + g.pos + '/' + g.conf + '/' + g.rule + ', want ' + t.pos + '/' + t.conf + '/' + t.rule);
    else if (!altOk) err('#' + t.n + ' alternatives: got [' + g.alt + '], want [' + t.alt + ']');
    else pass++;
  });
  note(pass + ' of ' + T.length + ' pass (pos, conf, rule and alternatives)');
  if (!spec) { warn('SPEC.md not found: word lists not compared'); return; }
  const want = {};
  const re = /^- ([A-Z0-9]+(?: \([^)]*\))?): (.+)$/gm;
  let m;
  const sec = spec.slice(spec.indexOf('**Word lists'), spec.indexOf('**Step 4'));
  while ((m = re.exec(sec))) {
    const parts = m[0].slice(2).split(' · ');
    parts.forEach(function (p) {
      const mm = /^([A-Z0-9]+)(?: \([^)]*\))?: (.+)$/.exec(p.trim());
      if (mm) want[mm[1]] = mm[2].trim().split(/\s+/);
    });
  }
  const fm = /- FUNC = [^{]*\{([^}]*)\}/.exec(sec);
  if (fm) want.FUNC_EXTRA = fm[1].trim().split(/\s+/);
  const have = WI.pos.lists;
  ['DET', 'INT', 'MODAL', 'TOLEAD', 'SUBJ', 'SUBJ3', 'BE', 'LINK', 'HAVE', 'PREP', 'SKIP', 'KEEP', 'PREMOD', 'CAUS', 'OBJP', 'OBJ', 'CVERB', 'FUNC_EXTRA'].forEach(function (k) {
    if (!want[k]) { err('SPEC list ' + k + ' not found'); return; }
    if (JSON.stringify(want[k]) !== JSON.stringify(have[k])) err('word list ' + k + ' differs from SPEC §3.2');
  });
  note('word lists compared with SPEC §3.2: ' + Object.keys(want).length + ' lists');
}

function V3(ctx) {
  section('V3', 'weeks, milestones and due dates');
  const WI = ctx.WI, P = ctx.WI_PLAN, C = ctx.WI_CHECKLIST;
  if (arr(P.weeks).length !== 13) err('expected 13 weeks');
  if (P.weeks[0].start !== '2026-11-16') err('W01 must start 2026-11-16');
  if (P.weeks[12].end !== '2027-02-14') err('W13 must end 2027-02-14');
  P.weeks.forEach(function (w, i) {
    if (w.id !== WI.weekIdAt(i + 1)) err('week ' + i + ' id ' + w.id);
    if (WI.dow(w.start) !== 1) err(w.id + ' does not start on a Monday');
    if (WI.dow(w.end) !== 0) err(w.id + ' does not end on a Sunday');
    if (WI.addDays(w.start, 6) !== w.end) err(w.id + ' is not 7 days');
    if (i > 0 && WI.addDays(P.weeks[i - 1].end, 1) !== w.start) err(w.id + ' is not contiguous');
    const r = WI.weekRange(w.id);
    if (r.start !== w.start || r.end !== w.end) err(w.id + ': weekRange differs from WI_PLAN');
    if (w.light !== (w.id === 'W06' || w.id === 'W07')) err(w.id + ': light flag');
  });
  const lo = '2026-11-16', hi = '2027-02-14';
  arr(P.milestones).forEach(function (m) {
    [m.date, m.endDate].filter(Boolean).forEach(function (d) { if (d < lo || d > hi) err(m.id + ' date ' + d + ' outside the plan'); });
    if (m.weekId !== WI.weekIdOf(m.date)) err(m.id + ' weekId ' + m.weekId + ' but date is in ' + WI.weekIdOf(m.date));
  });
  if (arr(P.milestones).length !== 16) err('expected 16 milestones');
  const m05 = arr(P.milestones).filter(function (m) { return m.id === 'M05'; })[0];
  if (!m05 || m05.date !== '2026-12-08' || m05.endDate !== '2026-12-09') err('M05 (Wave 2) must be Tue 8 – Wed 9 Dec');
  arr(P.lessons).forEach(function (l) {
    if (l.date && l.date >= lo) {
      const w = WI.week(WI.weekIdOf(l.date));
      if (w.lessons.indexOf(l.id) < 0) err(l.id + ' (' + l.date + ') not listed in ' + w.id);
    }
  });
  arr(C.items).forEach(function (it) {
    if (it.due < lo || it.due > hi) err(it.id + ' due ' + it.due + ' outside the plan');
    if (it.due < WI.weekRange(it.week).start) err(it.id + ' due ' + it.due + ' before its week ' + it.week);
    if ((it.week === 'W06' || it.week === 'W07') && it.kind !== 'optional') err(it.id + ' in a light week must be optional');
    if (it.kind === 'required' && it.due === WI.weekRange(it.week).start) warn(it.id + ' first appears on the day it is due (' + WI.fmtDate(it.due) + '): no lead time on the weekly list');
  });
  // workload: required fixed items per week, and per due day (a 15-year-old does these as homework)
  P.weeks.forEach(function (w) {
    const req = arr(C.items).filter(function (it) { return it.week === w.id && it.kind === 'required'; });
    const byDay = {};
    req.forEach(function (it) { byDay[it.due] = (byDay[it.due] || 0) + 1; });
    const worst = Object.keys(byDay).sort(function (a, b) { return byDay[b] - byDay[a]; })[0];
    if (req.length >= 7) warn(w.id + ' has ' + req.length + ' required fixed items (' + byDay[worst] + ' due on ' + WI.fmtDate(worst) + ')');
  });
  // weekIdOf boundaries
  for (let i = 1; i <= 13; i++) {
    const r = WI.weekRange(WI.weekIdAt(i));
    if (WI.weekIdOf(r.start + 'T00:00:00+07:00') !== WI.weekIdAt(i)) err('weekIdOf Monday 00:00 of W' + i);
    if (WI.weekIdOf(r.end + 'T23:59:59+07:00') !== WI.weekIdAt(i)) err('weekIdOf Sunday 23:59 of W' + i);
  }
}

function V4(ctx) {
  section('V4', 'catalogue fields, enums, routes, checks, titles');
  const WI = ctx.WI, C = ctx.WI_CHECKLIST;
  const FIELDS = ['id', 'title', 'why', 'stage', 'week', 'due', 'kind', 'source', 'feeds', 'xp', 'evidence', 'route', 'check', 'online', 'release'];
  const kinds = ['required', 'recommended', 'optional', 'own'], sources = C.sources, ev = C.evidence;
  function item(it, label) {
    FIELDS.forEach(function (f) { if (!(f in it)) err(label + ': missing field ' + f); });
    if (kinds.indexOf(it.kind) < 0) err(label + ': kind ' + it.kind);
    if (sources.indexOf(it.source) < 0) err(label + ': source ' + it.source);
    if (ev.indexOf(it.evidence) < 0) err(label + ': evidence ' + it.evidence);
    if (!WI.knownRoute(it.route)) err(label + ': unknown route ' + it.route);
    if (it.check !== null && it.check !== 'plan.action' && typeof WI.checks[it.check] !== 'function') err(label + ': check ' + it.check + ' is not in WI.checks');
    if (String(it.title).length > 90) err(label + ': title over 90 characters (' + String(it.title).length + ')');
    if (!(it.xp >= 0 && it.xp <= 30)) err(label + ': xp ' + it.xp);
    if (!/^s[1-7]$/.test(String(it.stage))) err(label + ': stage ' + it.stage);
  }
  arr(C.items).forEach(function (it) { item(it, it.id); });
  for (let w = 1; w <= 13; w++) WI.habitItems(WI.weekIdAt(w)).forEach(function (h) { item(h, h.id); });
  arr(C.choiceRules).forEach(function (r) {
    const it = WI.itemDef(r.id);
    if (!it) { err(r.id + ': itemDef is null'); return; }
    ['kind', 'online', 'title', 'feeds', 'route', 'evidence', 'xp', 'firstWeek', 'when'].forEach(function (f) { if (!(f in r)) err(r.id + ': missing ' + f); });
    if (kinds.indexOf(it.kind) < 0) err(r.id + ': kind');
    if (!WI.knownRoute(it.route)) err(r.id + ': route ' + it.route);
    if (ev.indexOf(it.evidence) < 0) err(r.id + ': evidence ' + it.evidence);
    if (r.title.length > 90) note(r.id + ': title is SPEC §5.6 table D wording (' + r.title.length + ' chars; the 90-char limit applies to fixed items)');
  });
  if (ctx.WI_POOL) {
    arr(ctx.WI_POOL).forEach(function (p) { const it = WI.itemDef(p.id); if (!it) err(p.id + ': itemDef null'); else item(it, p.id); });
  }
  const keys = ['word.first', 'word.usage', 'word.card', 'word.zb', 'word.submitted', 'word.fudge', 'word.hypotheses', 'word.spec', 'plan.choices', 'rules.all', 'plan.actions3', 'action.first', 'week.action', 'week.journal', 'week.sightcheck', 'week.review', 'week.audit', 'wave.note.W1', 'wave.note.W2', 'wave.note.W3', 'wave.note.W4', 'sight.levels', 'journal.failure', 'hyp.checked.W2', 'hyp.checked.W3', 'report.baseline.ready', 'report.intermediate.ready', 'report.final.ready', 'summit.outline', 'summit.aoa', 'summit.abstract', 'summit.visuals', 'summit.rehearsed2', 'summit.qa5', 'summit.selfcheck', 'summit.feedback', 'pivot.card', 'plan2.actions3', 'article.outline', 'article.sources6', 'article.visuals3', 'article.ethics', 'article.ai', 'article.abstract', 'article.words', 'article.sections.MR', 'article.sections.ID', 'peer.r1', 'peer.r2', 'peer.plan', 'fin.compare', 'fin.close', 'journal.final', 'request.askFirst'];
  keys.forEach(function (k) { if (typeof WI.checks[k] !== 'function') err('predicate missing: ' + k); });
  Object.keys(WI.checks).forEach(function (k) { if (keys.indexOf(k) < 0) err('predicate not in SPEC §5.2: ' + k); });
  // every predicate must run on an empty bundle without throwing
  const empty = baseBundle('g1');
  keys.forEach(function (k) { try { WI.checks[k](empty, 'W02'); } catch (e) { err('predicate ' + k + ' throws on an empty bundle: ' + e.message); } });
  if (arr(C.items).length !== 59) err('expected 59 fixed items (SPEC §5.8), found ' + arr(C.items).length);
  if (arr(C.choiceRules).length !== 23) err('expected 23 choice rules (SPEC §5.6 D), found ' + arr(C.choiceRules).length);
}

function simulateAllDone(ctx) {
  const WI = ctx.WI, sid = 'g1';
  const D = baseBundle(sid, { word: fullWord(sid), plans: [plan1(sid)], planActions: planActions(sid, 3, ['2026-11-24', '2026-11-27', '2026-12-02']) });
  D.state.rulesTicked = ['2026-11-21T09:00:00+07:00', '2026-11-21T09:00:00+07:00', '2026-11-21T09:00:00+07:00', '2026-11-21T09:00:00+07:00', '2026-11-21T09:00:00+07:00', '2026-11-21T09:00:00+07:00'];
  D.checklist = WI.buildWeek(D, 'W01', '2026-11-21T08:00:00+07:00');
  for (let w = 1; w <= 13; w++) {
    const wid = WI.weekIdAt(w);
    D.checklist.forEach(function (r) {
      if (r.weekId === wid && r.status === 'open' && (r.kind === 'required' || r.kind === 'recommended')) {
        r.status = 'done'; r.doneAt = WI.weekRange(wid).sunday + 'T20:00:00+07:00'; r.doneBy = 'manual';
      }
    });
    if (w < 13) {
      const roll = WI.rollWeek(D, wid, WI.weekRange(WI.weekIdAt(w + 1)).start + 'T00:10:00+07:00');
      const byId = {};
      roll.close.forEach(function (c) { byId[c.id] = c; });
      D.checklist.forEach(function (r) { if (byId[r.id]) r.status = byId[r.id].status; });
      D.checklist = D.checklist.concat(roll.open);
    }
  }
  return D;
}

function V5(ctx) {
  section('V5', 'coverage map');
  const WI = ctx.WI, reqs = arr(ctx.WI_COVERAGE.requirements);
  const reqIds = {};
  reqs.forEach(function (r) { reqIds[r.id] = r; });
  reqs.forEach(function (r) {
    if (!r.items.length) err(r.id + ': no items');
    if (/^(SUM|ART)-/.test(r.id) && r.items.length < 2) err(r.id + ': a deliverable requirement needs at least 2 items');
    r.items.forEach(function (id) {
      const it = WI.itemDef(id);
      if (!it) { err(r.id + ': item ' + id + ' does not exist'); return; }
      if (it.source !== 'fixed-course' && it.source !== 'habit') err(r.id + ': ' + id + ' is ' + it.source + ' (only fixed and habit items count)');
      if (it.kind !== 'required' && it.kind !== 'recommended') err(r.id + ': ' + id + ' is ' + it.kind);
      if (arr(it.feeds).indexOf(r.id) < 0) err(r.id + ': ' + id + ' does not list ' + r.id + ' in its feeds');
      if (it.due > r.due) err(r.id + ': ' + id + ' is due ' + it.due + ', after ' + r.due);
      if (WI.weekRange(it.week).start > r.due) err(r.id + ': ' + id + ' first appears in ' + it.week + ', after the requirement is due (' + r.due + ')');
    });
    // a requirement fed only by recommended items would be easy to miss
    if (!r.items.some(function (id) { const it = WI.itemDef(id); return it && it.kind === 'required'; })) {
      warn(r.id + ': only recommended items feed this requirement');
    }
  });
  // every feeds value is a requirement id
  const all = [].concat(WI.fixedItems());
  for (let w = 1; w <= 13; w++) WI.habitItems(WI.weekIdAt(w)).forEach(function (h) { all.push(h); });
  WI.choiceRules().forEach(function (r) { all.push({ id: r.id, feeds: r.feeds }); });
  WI.poolItems().forEach(function (p) { const it = WI.itemDef(p.id); if (it) all.push(it); });
  all.forEach(function (it) { arr(it.feeds).forEach(function (f) { if (!reqIds[f]) err(it.id + ': feeds unknown requirement ' + f); }); });
  // simulated: complete every required and recommended row W01–W13
  const D = simulateAllDone(ctx);
  const done = {};
  D.checklist.forEach(function (r) { if (r.status === 'done') done[r.itemId] = true; });
  reqs.forEach(function (r) {
    const covered = r.items.some(function (id) { return done[id]; });
    if (!covered) err(r.id + ': not covered after completing all required and recommended items');
    r.items.forEach(function (id) { if (!done[id]) err(r.id + ': listed item ' + id + ' was never generated or never done in the simulation'); });
  });
  const generated = {};
  D.checklist.forEach(function (r) { generated[r.itemId] = true; });
  WI.fixedItems().forEach(function (it) { if (!generated[it.id]) err('simulation: fixed item ' + it.id + ' was never generated'); });
  note('simulation: ' + D.checklist.length + ' rows over 13 weeks; ' + reqs.length + ' requirements checked');
}

function V6(ctx) {
  section('V6', 'Summit timings');
  const S = ctx.WI_SUMMIT;
  if (!S) { note('pending: WI_SUMMIT (W5) not loaded'); return; }
  const secs = arr(S.sections), sum = secs.reduce(function (a, s) { return a + Number(s.timeSec || 0); }, 0);
  if (sum !== 420) err('Summit sections sum to ' + sum + ' s, not 420');
  if (Number(S.talkSec) !== 420) err('talkSec is ' + S.talkSec);
  if (Number(S.qaSec) !== 120) err('qaSec is ' + S.qaSec);
  const ids = secs.map(function (s) { return s.id; }).join(',');
  if (ids !== 'hook,term,approach,evidence,learnings,phase2') err('Summit section ids ' + ids);
  note('sections ' + secs.length + ', ' + sum + ' s + Q&A ' + S.qaSec + ' s');
}

function V7(ctx, spec) {
  section('V7', 'six rules, screenshot tick, Form labels');
  if (!spec) { warn('SPEC.md missing'); return; }
  const a = spec.indexOf('### 14.1'), b = spec.indexOf('No UI string paraphrases');
  const rules = spec.slice(a, b).split('\n').filter(function (l) { return /^\d\. /.test(l); }).map(function (l) { return l.replace(/^\d\. /, ''); });
  if (rules.length !== 6) err('could not read six rules from SPEC §14.1');
  const have = arr(ctx.WI_RULES.rules);
  rules.forEach(function (r, i) {
    if (Buffer.compare(Buffer.from(r, 'utf8'), Buffer.from(String(have[i]), 'utf8')) !== 0) err('rule ' + (i + 1) + ' differs from SPEC §14.1');
  });
  if (/\bmust\b/i.test(String(have[0]))) err('rule 1 contains "must"');
  const p5 = /without the tick "([^"]+)" \(exact wording\)/.exec(spec);
  if (!p5) err('P5 text not found in SPEC');
  else if (ctx.WI_RULES.screenshotTick !== p5[1]) err('screenshot tick differs from P5');
  // Table A
  const ta = /^`tg_5_16`.*$/m.exec(spec);
  if (!ta) err('table A not found');
  else {
    ta[0].split(' · ').forEach(function (p) {
      const m = /^`([a-z0-9_]+)` (.+)$/.exec(p.trim());
      if (!m) return;
      const c = ctx.WI.choice('targetGroups', m[1]);
      if (!c) err('target group ' + m[1] + ' missing');
      else if (c.label !== m[2].trim().replace(/\.$/, '')) err('target group ' + m[1] + ' label "' + c.label + '" differs from "' + m[2].trim() + '"');
    });
  }
  // Table B
  let nb = 0;
  spec.split('\n').filter(function (l) { return /^\| `id_/.test(l); }).forEach(function (l) {
    const cells = l.split('|').map(function (c) { return c.trim(); }).filter(function (c, i, all) { return i > 0 && i < all.length - 1; });
    [[0, 1, 2], [4, 5, 6]].forEach(function (ix) {
      const id = (cells[ix[0]] || '').replace(/`/g, '');
      if (!/^id_/.test(id)) return;
      nb++;
      const label = cells[ix[1]].replace(/\*\*/g, '').trim();
      const c = ctx.WI.choice('ideas', id);
      if (!c) { err('idea ' + id + ' missing'); return; }
      if (c.label !== label) err('idea ' + id + ' label "' + c.label + '" differs from "' + label + '"');
      const mode = cells[ix[2]].split(',')[0].trim();
      if (c.mode !== mode) err('idea ' + id + ' mode ' + c.mode + ' differs from ' + mode);
    });
  });
  if (nb !== 18) err('table B: found ' + nb + ' ideas, expected 18');
  note('rules, tick, ' + arr(ctx.WI_CHOICES.targetGroups).length + ' target groups and ' + nb + ' ideas compared');
}

function guideStrings(ctx) {
  // [where, text, src]
  const out = [];
  function push(where, t, src) { if (t !== undefined && t !== null && String(t).length) out.push([where, String(t), src]); }
  const G = ctx.GUIDE || {};
  arr(G.stages).forEach(function (s) {
    push('stages.' + s.stageId + '.tagline', s.tagline, s.src);
    arr(s.now).forEach(function (n, i) { push('stages.' + s.stageId + '.now' + i, n, s.src); });
    push('stages.' + s.stageId + '.doneWhen', s.doneWhen, s.src);
  });
  arr(G.brainstorm).forEach(function (x) { push(x.id, x.prompt, x.src); });
  Object.keys(G.banks || {}).forEach(function (k) { arr(G.banks[k]).forEach(function (x) { push(x.id, x.text, x.src); }); });
  arr(G.stuck).forEach(function (x) { push(x.id, x.text, x.src); });
  arr(G.labPrompts).forEach(function (x) { push(x.id, x.text, x.src); });
  arr(G.theory).forEach(function (x) { push(x.id, x.oneLine, x.src); });
  arr(G.sinks).forEach(function (x) { push(x.id, x.text, x.src); });
  Object.keys(G.posReasons || {}).forEach(function (k) { push('posReasons.' + k, G.posReasons[k], G.posReasonsSrc || '§3.3'); });
  arr(ctx.FRAMES).forEach(function (x) { push(x.id, x.text, x.src || 'RDG-09'); });
  arr(ctx.LEVELS).forEach(function (x) { push('level' + x.level, x.definition, x.src || 'MB'); push('level' + x.level + '.example', x.example, x.src || 'MB'); });
  Object.keys(ctx.WI_WHY || {}).forEach(function (k) { const v = ctx.WI_WHY[k]; push('why.' + k, typeof v === 'object' ? (v.text || v.why) : v, (v && v.src) || 'why'); });
  arr(ctx.WI_POOL).forEach(function (x) { push(x.id + '.title', x.title, x.src); push(x.id + '.why', x.why, x.src); });
  return out;
}

function V8(ctx) {
  section('V8', 'guide content (W3)');
  const G = ctx.GUIDE;
  if (!G) { note('pending: GUIDE (W3) not loaded'); return; }
  function count(label, n, min, max) {
    if (n < min) err(label + ': ' + n + ', need at least ' + min);
    if (max !== undefined && n > max) err(label + ': ' + n + ', at most ' + max);
  }
  const stages = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'];
  count('GUIDE.stages', arr(G.stages).length, 7, 7);
  arr(G.stages).forEach(function (s) { count('stages.' + s.stageId + '.now', arr(s.now).length, 3, 5); });
  count('GUIDE.brainstorm', arr(G.brainstorm).length, 56);
  stages.forEach(function (s) { count('brainstorm ' + s, arr(G.brainstorm).filter(function (x) { return x.stageId === s; }).length, 8); });
  const b = G.banks || {};
  count('banks.carriers', arr(b.carriers).length, 12);
  count('banks.triggers', arr(b.triggers).length, 12);
  count('banks.formats', arr(b.formats).length, 12);
  count('banks.bridges', arr(b.bridges).length, 10);
  count('GUIDE.stuck', arr(G.stuck).length, 35);
  stages.forEach(function (s) { count('stuck ' + s, arr(G.stuck).filter(function (x) { return x.stageId === s; }).length, 5); });
  count('GUIDE.labPrompts', arr(G.labPrompts).length, 30);
  for (let w = 1; w <= 13; w++) {
    const wid = ctx.WI.weekIdAt(w);
    count('labPrompts usable in ' + wid, arr(G.labPrompts).filter(function (x) { return arr(x.weekIds).indexOf(wid) >= 0; }).length, 2);
  }
  count('labPrompts zero_result', arr(G.labPrompts).filter(function (x) { return x.kind === 'zero_result'; }).length, 4);
  count('labPrompts failure_analysis', arr(G.labPrompts).filter(function (x) { return x.kind === 'failure_analysis'; }).length, 4);
  count('GUIDE.theory', arr(G.theory).length, 10, 14);
  const pr = Object.keys(G.posReasons || {});
  count('posReasons', pr.length, 22, 22);
  for (let i = 0; i <= 21; i++) { const k = 'P' + (i < 10 ? '0' : '') + i; if (pr.indexOf(k) < 0) err('posReasons missing ' + k); }
  count('GUIDE.sinks', arr(G.sinks).length, 6);
  const groups = ['hypothesis', 'describe_data', 'compare', 'hedge', 'reflect', 'failure', 'plan_change', 'qa_answer', 'limitation', 'ethics'];
  if (ctx.FRAMES) {
    count('FRAMES', arr(ctx.FRAMES).length, 60);
    groups.forEach(function (g) { count('FRAMES ' + g, arr(ctx.FRAMES).filter(function (x) { return x.group === g; }).length, 6); });
  } else note('FRAMES pending');
  if (ctx.LEVELS) {
    count('LEVELS', arr(ctx.LEVELS).length, 7, 7);
    const want = { 0: ['Self-report', 'owned', 'sighting'], 1: ['Owned', 'owned', 'sighting'], 2: ['Recognition', null, 'survey'], 3: ['Comprehension', null, 'survey'], 4: ['Earned inside her network', 'earned', 'sighting'], 5: ['Earned outside her network', 'earned', 'sighting'], 6: ['Independent recognition', 'earned', 'sighting'] };
    arr(ctx.LEVELS).forEach(function (l) {
      const w = want[l.level];
      if (!w) { err('LEVELS: unexpected level ' + l.level); return; }
      if (w[2] !== l.source) err('LEVELS ' + l.level + ': source ' + l.source + ', want ' + w[2]);
      if (w[1] && w[1] !== l.ownedOrEarned) err('LEVELS ' + l.level + ': ' + l.ownedOrEarned + ', want ' + w[1]);
    });
  } else note('LEVELS pending');
  if (ctx.BLOCKLIST) count('BLOCKLIST banned + myths', arr(ctx.BLOCKLIST.banned).length + arr(ctx.BLOCKLIST.myths).length, 25);
  else note('BLOCKLIST pending');
  if (ctx.WI_POOL) {
    count('WI_POOL', arr(ctx.WI_POOL).length, 24, 24);
    stages.forEach(function (s) { count('pool ' + s, arr(ctx.WI_POOL).filter(function (x) { return x.stage === s; }).length, 3); });
    arr(ctx.WI_POOL).forEach(function (p) {
      if (String(p.title).length > 90) err(p.id + ': title over 90');
      if (p.online && ['s1', 's2', 's3'].indexOf(p.stage) >= 0) err(p.id + ': online pool item before s4');
    });
  } else note('WI_POOL pending');
  if (ctx.WI_WHY) {
    const need = ctx.WI.fixedItems().map(function (i) { return i.id; });
    for (let w = 1; w <= 13; w++) ctx.WI.habitItems(ctx.WI.weekIdAt(w)).forEach(function (h) { need.push(h.id); });
    ctx.WI.choiceRules().forEach(function (r) { need.push(r.id); });
    need.forEach(function (id) { if (!ctx.WI.itemDef(id).why) err('no why text for ' + id); });
    Object.keys(ctx.WI_WHY).forEach(function (k) {
      const v = ctx.WI_WHY[k], t = typeof v === 'object' ? (v.text || v.why) : v;
      if (String(t).length > 200) err('why ' + k + ' over 200 characters');
    });
  } else note('WI_WHY pending');
  // strings: src, blocklist, sentence length
  const strings = guideStrings(ctx);
  const banned = arr(ctx.BLOCKLIST && ctx.BLOCKLIST.banned).map(function (b) {
    if (b instanceof RegExp) return b;
    const m = /^\/(.*)\/([a-z]*)$/.exec(String(b));
    if (m) { try { return new RegExp(m[1], m[2]); } catch (e) { err('bad blocklist regex ' + b); return null; } }
    return new RegExp(String(b).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }).filter(Boolean);
  let long = 0;
  strings.forEach(function (s) {
    const where = s[0], t = s[1];
    if (!s[2]) err(where + ': no src');
    banned.forEach(function (re) { if (re.test(t)) err(where + ': matches blocklist ' + re); });
    t.split(/(?<=[.!?])\s+/).forEach(function (sent) {
      const n = words(sent);
      if (n > 28) err(where + ': sentence of ' + n + ' words');
      else if (n > 20) long++;
    });
  });
  // checklist titles and choice titles against the blocklist too
  ctx.WI.fixedItems().concat(ctx.WI.choiceRules()).forEach(function (it) {
    banned.forEach(function (re) { if (re.test(it.title)) err(it.id + ': title matches blocklist ' + re); });
  });
  if (long) warn(long + ' sentences between 21 and 28 words');
  note(strings.length + ' guide strings checked');
}

function gameSource() {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  const a = src.indexOf('BEGIN GAME'), b = src.indexOf('END GAME');
  return (a >= 0 && b > a) ? src.slice(a, b) : null;
}

function V9(ctx) {
  section('V9', 'no reward for spread');
  const WI = ctx.WI, G = ctx.WI_GAME, forb = arr(G.forbiddenReads);
  arr(G.xpRules).concat(arr(G.badges)).forEach(function (r) {
    arr(r.reads).forEach(function (rd) {
      const parts = String(rd).replace(/^check:/, '').split('.');
      if (parts.some(function (p) { return forb.indexOf(p) >= 0; })) err(r.id + ' reads ' + rd);
    });
  });
  const src = gameSource();
  if (!src) err('engine.js has no BEGIN GAME / END GAME block');
  else {
    const bad = [/\.level\b/, /finalLevel/, /\.count\b/, /audience/, /recognised/, /comprehended/, /notSure/, /\bsightings\b/, /\btallies\b/, /\bwaves\b/, /\.n\b/];
    bad.forEach(function (re) { if (re.test(src)) err('GAME block of engine.js mentions ' + re); });
  }
  // dynamic 1: two finished bundles that differ only in sightings, tallies and waves
  const sid = 'g2';
  function bundle(rich) {
    const D = simulateAllDone(ctx);
    D.student.id = sid; D.state.studentId = sid;
    D.actions = [
      { id: 'ac_000000000001', date: '2026-11-21', createdAt: '2026-11-21T18:00:00+07:00', weekId: 'W01', channelId: 'ch_school', what: 'Used it at lunch with friends.', outcome: 'as_planned', learned: text(20), audience: 'p2_5' },
      { id: 'ac_000000000002', date: '2026-11-24', createdAt: '2026-11-24T18:00:00+07:00', weekId: 'W02', channelId: 'ch_school', what: 'Tried it in the club.', outcome: 'changed', outcomeReason: 'The club meeting moved.', audience: 'p6_20' }
    ];
    D.journal = [
      { id: 'jn_000000000001', date: '2026-11-22', createdAt: '2026-11-22T19:00:00+07:00', weekId: 'W01', kind: 'reflection', text: text(60) },
      { id: 'jn_000000000002', date: '2026-11-29', createdAt: '2026-11-29T19:00:00+07:00', weekId: 'W02', kind: 'zero_result', text: text(45) }
    ];
    D.reviews = [{ id: sid + '|W01', weekId: 'W01', submittedAt: '2026-11-22T20:00:00+07:00', onTime: true }];
    spread(D, sid, rich);
    return D;
  }
  const A = bundle(false), B = bundle(true), now = '2027-02-14T12:00:00+07:00';
  const d1 = compareGame(WI, A, B, now);
  d1.forEach(function (m) { err('finished bundles: ' + m); });
  const xa = WI.xpTotal(WI.entitlements(A, now));
  note('finished bundles: ' + xa + ' XP, ' + Object.keys(WI.badges(A, now)).length + ' badges, rank ' + WI.rankOf(xa).name);

  // dynamic 2 (indirect routes): the same documentation, with NO spread at all against a lot of spread.
  // Every week is built, self-ticking predicates run, and only then XP, badges, streak and rank are compared.
  const live = spreadDiff(ctx);
  live.diffs.forEach(function (m) { err('live simulation: ' + m); });
  live.zero.checklist.forEach(function (r) {
    if (r.status === 'open' && (r.kind === 'required' || r.kind === 'recommended')) {
      err('live simulation: with zero spread ' + r.itemId + ' (' + r.weekId + ') cannot be completed');
    }
  });
  ['H-W02-3', 'H-W05-3', 'H-W12-3', 'F-W03-02'].forEach(function (id) {
    const r = live.zero.checklist.filter(function (x) { return x.itemId === id && x.status === 'done' && x.doneBy === 'auto'; })[0];
    if (!r) err('live simulation: ' + id + ' did not tick itself for a student with no sightings (zero-result entries must count)');
  });
  note('live simulation: ' + live.zero.checklist.length + ' rows, ' + live.xp + ' XP, ' + live.badges + ' badges with no spread and with heavy spread');

  // predicates that are allowed to look at spread rows at all (each one also accepts a zero-result record)
  const mayRead = { 'week.sightcheck': true, 'sight.levels': true };
  const spreadWord = /sightings|tallies|\.level\b|finalLevel|recognised|comprehended|notSure|audience|\.count\b/;
  Object.keys(WI.checks).forEach(function (k) {
    if (!mayRead[k] && spreadWord.test(String(WI.checks[k]))) err('predicate ' + k + ' reads spread data');
  });
  // the class board shows rank, label, XP and streak only
  const board = WI.boardRows([{ label: 'Guest#1', xp: 10, streak: 1, me: true, sightings: 9, level: 6 }])[0];
  Object.keys(board).forEach(function (k) { if (['label', 'xp', 'streak', 'rank', 'me'].indexOf(k) < 0) err('class board row carries ' + k); });

  // self-test: V9 must fail when a reward starts to depend on spread (three planted regressions)
  const C = WI.checks;
  function planted(name, apply, undo) {
    apply();
    let caught = false;
    try {
      const t = spreadDiff(ctx);
      caught = t.diffs.length > 0 || compareGame(WI, bundle(false), bundle(true), now).length > 0 ||
        t.zero.checklist.some(function (r) { return r.status === 'open' && (r.kind === 'required' || r.kind === 'recommended'); });
    } finally { undo(); }
    if (!caught) err('self-test: a planted regression was not detected (' + name + ')');
  }
  const keep1 = C['week.sightcheck'], keep2 = C['sight.levels'], keep3 = WI.badges;
  planted('weekly sightings check needs a sighting',
    function () { C['week.sightcheck'] = function (D, w) { return arr(D.sightings).some(function (x) { return x.weekId === w; }); }; },
    function () { C['week.sightcheck'] = keep1; });
  planted('Evidence Level item needs at least one sighting',
    function () { C['sight.levels'] = function (D) { return arr(D.sightings).length > 0 && keep2(D); }; },
    function () { C['sight.levels'] = keep2; });
  planted('a badge for ten sightings',
    function () { WI.badges = function (D, n) { const b = keep3(D, n); if (arr(D.sightings).length >= 10) b.B99 = true; return b; }; },
    function () { WI.badges = keep3; });
  note('self-test: 3 planted spread rewards were all detected');
}

// spread data only: sightings, tallies, wave figures, sighting screenshots, audit verdicts on her sightings
function spread(D, sid, rich) {
  D.sightings = []; D.tallies = []; D.audits = D.audits || { mine: [], onMe: [] }; D.audits.onMe = [];
  arr(D.actions).forEach(function (a) { a.audience = rich ? 'p21' : 'p1'; a.reaction = rich ? 'Everyone copied it at once.' : 'Nobody reacted.'; });
  D.files = arr(D.files).filter(function (f) { return f.attachType !== 'sighting'; });
  const figs = rich ? { n: 200, recognised: 190, notSure: 5, comprehended: 180 } : { n: 12, recognised: 0, notSure: 0, comprehended: 0 };
  D.waves = [];
  ['W1', 'W2', 'W3', 'W4'].forEach(function (w) {
    [sid, 'ctrl1', 'ctrl2', 'foil1', 'foil2'].forEach(function (k) {
      const foil = /^foil/.test(k);
      D.waves.push({ id: w + '|' + k, waveId: w, termKey: k, n: figs.n, recognised: foil ? (rich ? 3 : 6) : figs.recognised, notSure: figs.notSure, comprehended: foil ? 0 : figs.comprehended, published: true });
    });
  });
  if (!rich) return;
  for (let w = 1; w <= 13; w++) {
    const wid = 'W' + (w < 10 ? '0' : '') + w, day = ctxDate(w, 2);
    for (let i = 0; i < 8; i++) {
      const id = 'sg_' + wid + String(i).padStart(9, '0');
      D.sightings.push({ id: id, date: day, createdAt: day + 'T10:00:00+07:00', weekId: wid, channelId: i % 2 ? 'ch_tiktok' : 'ch_school', relation: 'friend_class', prompted: 'unasked', marked: 'natural', level: 6, finalLevel: 6, owned: false, quote: 'what a vronk', auditStatus: 'agreed', spotStatus: 'confirmed', fileIds: ['fl_' + id] });
      D.files.push({ id: 'fl_' + id, attachType: 'sighting', attachId: id, createdAt: day + 'T10:00:00+07:00' });
    }
    D.tallies.push({ id: 'tl_' + wid, date: day, weekId: wid, tallyType: 'heard', count: 99 });
    D.audits.onMe.push({ id: 'au_on_' + wid, weekId: wid, status: 'done', verdicts: [{ verdict: 'agree' }] });
  }
}
function ctxDate(weekNo, plusDays) {
  const d = new Date(Date.UTC(2026, 10, 16) + ((weekNo - 1) * 7 + plusDays) * 86400000);
  return d.toISOString().substr(0, 10);
}
function compareGame(WI, A, B, now) {
  const out = [];
  const key = function (D) { return WI.entitlements(D, now).map(function (e) { return e.eventKey + '=' + e.xp; }).sort().join(','); };
  if (key(A) !== key(B)) out.push('XP awards differ between the low-spread and high-spread bundles');
  const xa = WI.xp(A, now), xb = WI.xp(B, now);
  if (xa !== xb) out.push('XP total ' + xa + ' vs ' + xb);
  const ba = JSON.stringify(WI.badges(A, now)), bb = JSON.stringify(WI.badges(B, now));
  if (ba !== bb) out.push('badges differ: ' + ba + ' vs ' + bb);
  if (WI.rankOf(xa).id !== WI.rankOf(xb).id) out.push('rank differs');
  if (JSON.stringify(WI.streak(A, now)) !== JSON.stringify(WI.streak(B, now))) out.push('streak differs');
  if (WI.awards(A, now).length !== WI.awards(B, now).length) out.push('awards differ');
  return out;
}
// A student who documents everything, every week. `rich` only changes the spread data.
function liveBundle(ctx, sid, rich) {
  const WI = ctx.WI;
  const D = baseBundle(sid, { word: fullWord(sid) });
  D.state.rulesTicked = [1, 2, 3, 4, 5, 6].map(function () { return '2026-11-21T09:00:00+07:00'; });
  D.plans = [plan1(sid), plan1(sid, { id: sid + '-p2', phase: 2, variableChanged: 'channel', p2Hypothesis: 'A smaller crowd will copy the word more often.' })];
  D.planActions = planActions(sid, 3, ['2026-11-24', '2026-11-27', '2026-12-02']).concat(planActions(sid, 3, ['2027-01-05', '2027-01-06', '2027-01-12'], 2));
  D.planActions.forEach(function (pa, i) {
    D.actions.push({ id: 'ac_p' + String(i).padStart(11, '0'), date: pa.whenDate, createdAt: pa.whenDate + 'T18:00:00+07:00', weekId: WI.weekIdOf(pa.whenDate), planActionId: pa.id, channelId: 'ch_school', what: 'Did the planned action.', outcome: 'as_planned', learned: text(16) });
  });
  for (let w = 1; w <= 13; w++) {
    const wid = WI.weekIdAt(w), sun = WI.weekRange(wid).sunday;
    D.actions.push({ id: 'ac_w' + wid, date: ctxDate(w, 2), createdAt: ctxDate(w, 2) + 'T18:00:00+07:00', weekId: wid, channelId: 'ch_school', what: 'Used the word at lunch.', outcome: w % 3 ? 'as_planned' : 'not_done', outcomeReason: 'My friends were away that day.', learned: text(16) });
    D.journal.push({ id: 'jn_r' + wid, date: ctxDate(w, 3), createdAt: ctxDate(w, 3) + 'T19:00:00+07:00', weekId: wid, kind: 'reflection', text: text(60) });
    D.journal.push({ id: 'jn_z' + wid, date: ctxDate(w, 4), createdAt: ctxDate(w, 4) + 'T19:00:00+07:00', weekId: wid, kind: 'zero_result', text: text(45) });
    if (w <= 12) D.reviews.push({ id: sid + '|' + wid, weekId: wid, submittedAt: sun + 'T20:00:00+07:00', onTime: true, wentWell: text(10), toChange: text(10) });
  }
  D.journal.push({ id: 'jn_fail', date: '2026-12-03', createdAt: '2026-12-03T19:00:00+07:00', weekId: 'W03', kind: 'failure_analysis', text: text(110) });
  D.journal.push({ id: 'jn_summit', date: '2026-12-18', createdAt: '2026-12-18T19:00:00+07:00', weekId: 'W05', kind: 'summit_feedback', text: text(50) });
  D.journal.push({ id: 'jn_final', date: '2027-02-10', createdAt: '2027-02-10T19:00:00+07:00', weekId: 'W13', kind: 'final_reflection', text: text(160) });
  D.waveNotes = ['W1', 'W2', 'W3', 'W4'].map(function (w) { return { id: sid + '|' + w, waveId: w, note: text(25), hypothesisChecks: { h1: 'not_supported', h2: 'too_early' } }; });
  D.reports = ['baseline', 'intermediate', 'final'].map(function (t) { return { id: sid + '|' + t, type: t, status: 'ready', sections: { compare: text(70), closeout: text(70) } }; });
  const sec = {};
  ['hook', 'term', 'approach', 'evidence', 'learnings', 'phase2'].forEach(function (k) { sec[k] = { notes: text(25) }; });
  D.summit = { sections: sec, aoaStatement: text(30), abstract: text(50), chartIds: ['wave-own'], rehearsals: [{ n: 1 }, { n: 2 }],
    qa: [1, 2, 3, 4, 5].map(function (i) { return { id: 'q' + i, answer: text(20) }; }),
    selfCheck: { SC1: { rating: 'yes' }, SC2: { rating: 'yes' }, SC3: { rating: 'partly' }, SC4: { rating: 'yes' }, SC5: { rating: 'yes' } } };
  const asec = {};
  ['intro', 'methods', 'results', 'discussion'].forEach(function (k) { asec[k] = { notes: text(200) }; });
  D.article = { title: 'A word that did not travel', sections: asec, wordCount: 2500, abstract: text(160), ethics: text(70), aiDeclaration: text(15), revisionPlan: text(50),
    sources: [1, 2, 3, 4, 5, 6].map(function (i) { return { apa: 'Author, A. (202' + i + '). A title about slang. Publisher.', use: 'For my introduction.' }; }),
    visuals: [1, 2, 3].map(function (i) { return { chartId: 'c' + i, caption: 'Figure ' + i + '. Recognition by wave.' }; }),
    peer: { given: [{ n: 1, notes: text(90) }, { n: 2, notes: text(90) }] } };
  D.files = [{ id: 'fl_zb0000000001', attachType: 'zb', createdAt: '2026-11-21T09:30:00+07:00' }];
  spread(D, sid, rich);
  D.checklist = WI.buildWeek(D, 'W01', '2026-11-21T09:00:00+07:00');
  for (let w = 1; w <= 13; w++) {
    const wid = WI.weekIdAt(w), now = WI.weekRange(wid).sunday + 'T20:00:00+07:00';
    D.state.weekId = wid;
    D.checklist = D.checklist.concat(WI.buildWeek(D, wid, now));
    const ticks = {};
    WI.autoTicks(D, null, now).forEach(function (t) { ticks[t.id] = t; });
    D.checklist.forEach(function (r) {
      if (ticks[r.id]) { r.status = 'done'; r.doneAt = now; r.doneBy = 'auto'; r.updatedAt = now; return; }
      const it = WI.itemDef(r.itemId, D);
      // items she ticks by hand: both students tick all of them
      if (r.weekId === wid && r.status === 'open' && (!it || !it.check)) { r.status = 'done'; r.doneAt = now; r.doneBy = 'manual'; r.updatedAt = now; }
    });
    if (w < 13) {
      const roll = WI.rollWeek(D, wid, WI.weekRange(WI.weekIdAt(w + 1)).start + 'T00:10:00+07:00');
      const byId = {};
      roll.close.forEach(function (c) { byId[c.id] = c; });
      D.checklist.forEach(function (r) { if (byId[r.id]) r.status = byId[r.id].status; });
      D.checklist = D.checklist.concat(roll.open);
    }
  }
  return D;
}
function spreadDiff(ctx) {
  const WI = ctx.WI, now = '2027-02-14T12:00:00+07:00';
  const A = liveBundle(ctx, 'g3', false), B = liveBundle(ctx, 'g3', true);
  const diffs = compareGame(WI, A, B, now);
  const rowsOf = function (D) { return D.checklist.map(function (r) { return r.id + '=' + r.status + '/' + r.doneBy; }).sort().join('\n'); };
  if (rowsOf(A) !== rowsOf(B)) {
    const b = {};
    B.checklist.forEach(function (r) { b[r.id] = r.status; });
    const first = A.checklist.filter(function (r) { return b[r.id] !== r.status; })[0];
    diffs.push('checklist differs' + (first ? ': ' + first.itemId + ' in ' + first.weekId + ' is ' + first.status + ' with no spread, ' + b[first.id] + ' with spread' : ' (different rows)'));
  }
  if (WI.stageOf(A, now) !== WI.stageOf(B, now)) diffs.push('stage differs');
  return { diffs: diffs, zero: A, rich: B, xp: WI.xp(A, now), badges: Object.keys(WI.badges(A, now)).length };
}

function V10(ctx, files) {
  section('V10', 'repo hygiene');
  files.forEach(function (f) { if (/(^|\/)Roster\.gs$/.test(f)) err('Roster.gs is in the repo: ' + f); });
  const rosterPath = path.join(ROOT, 'apps-script', 'Roster.gs');
  let labels = [];
  if (fs.existsSync(rosterPath)) {
    const t = fs.readFileSync(rosterPath, 'utf8');
    let m; const re = /label\s*:\s*['"]([^'"]+)['"]/g;
    while ((m = re.exec(t))) labels.push(m[1]);
    note('labels read from the untracked apps-script/Roster.gs (' + labels.length + ')');
  }
  const local = path.join(ROOT, 'labels.local.txt');
  if (fs.existsSync(local)) labels = labels.concat(fs.readFileSync(local, 'utf8').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean));
  labels = labels.filter(function (l) { return !/^(Guest#\d|Student [A-Z])$/.test(l); });
  if (!labels.length) note('no local label list (Roster.gs or labels.local.txt): checked the file name only');
  const textExt = /\.(js|gs|html|css|json|md|txt|csv)$/;
  files.forEach(function (f) {
    if (!textExt.test(f) || /(^|\/)Roster\.gs$/.test(f) || f === 'labels.local.txt') return;
    const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n');
    lines.forEach(function (line, i) {
      labels.forEach(function (l) {
        const re = new RegExp('(^|[^A-Za-z])' + l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Za-z]|$)');
        if (!re.test(line)) return;
        if (/['"]\d{4}['"]/.test(line)) err(f + ':' + (i + 1) + ': a roster label next to a 4-digit literal');
        else if (new RegExp("label\\s*:\\s*['\"]" + l).test(line)) err(f + ':' + (i + 1) + ': a roster label as a label value');
        else if (f !== 'SPEC.md') warn(f + ':' + (i + 1) + ': mentions the roster label "' + l + '"');
      });
    });
  });
  const c = buildGs.check();
  if (!c.ok) err('apps-script/Shared.gs is stale or missing: run node tools/build-gs.js');
  else note('Shared.gs up to date (' + c.want.slice(0, 12) + ')');
  if (fs.existsSync(buildGs.OUT)) {
    const sc = vm.createContext({ console: console });
    try {
      vm.runInContext(fs.readFileSync(buildGs.OUT, 'utf8'), sc, { filename: 'Shared.gs' });
      if (JSON.stringify(sc.WI_GAME.xpRules) !== JSON.stringify(ctx.WI_GAME.xpRules)) err('XP table in Shared.gs differs from data/game.js');
      if (typeof sc.WI.buildWeek !== 'function') err('Shared.gs: WI.buildWeek missing');
    } catch (e) { err('Shared.gs does not run without window: ' + e.message); }
  }
}

// a single-quoted string that contains an escaped apostrophe (built without a literal one in this source)
const APOS = new RegExp('\x27(?:[^\x27\\\\\\n]|\\\\.)*\\\\\x27(?:[^\x27\\\\\\n]|\\\\.)*\x27');
function V11(files) {
  section('V11', 'node --check and apostrophes');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wi-v11-'));
  let n = 0;
  files.filter(function (f) { return /\.(js|gs)$/.test(f) && !/node_modules/.test(f); }).forEach(function (f) {
    let abs = path.join(ROOT, f);
    if (/\.gs$/.test(f)) { const t = path.join(tmp, f.replace(/[\/]/g, '_') + '.js'); fs.copyFileSync(abs, t); abs = t; }
    try { cp.execFileSync(process.execPath, ['--check', abs], { stdio: 'pipe' }); n++; } catch (e) { err(f + ': node --check failed: ' + String(e.stderr || e.message).split('\n').slice(0, 4).join(' ')); }
    const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n');
    lines.forEach(function (line, i) {
      const code = line.replace(/^\s*\/\/.*$/, '');
      if (APOS.test(code)) err(f + ':' + (i + 1) + ": escaped apostrophe inside a single-quoted string (write ’ or use double quotes)");
    });
  });
  note(n + ' files pass node --check');
}

function V12(files) {
  section('V12', 'imagery');
  files.forEach(function (f) { if (/^art\//.test(f)) err('file under art/: ' + f); });
  const deny = /[\u{1F446}-\u{1F450}\u{261D}\u{270A}-\u{270D}\u{1F590}\u{1F595}\u{1F596}\u{1F918}-\u{1F91F}\u{1F932}\u{1F933}\u{1FAF0}-\u{1FAF8}\u{1F466}-\u{1F487}\u{1F574}\u{1F575}\u{1F57A}\u{1F645}-\u{1F64F}\u{1F6B4}-\u{1F6B6}\u{1F3C3}\u{1F3C4}\u{1F3C7}\u{1F3CA}-\u{1F3CC}\u{1F926}\u{1F930}\u{1F931}\u{1F934}-\u{1F93E}\u{1F9CD}-\u{1F9DF}\u{1F385}\u{1F936}\u{1F9B8}\u{1F9B9}\u{1F57B}\u{1F64B}]/u;
  const arrows = /[\u{2B05}-\u{2B07}\u{27A1}\u{1F448}-\u{1F449}]/u;
  // data/blocklist.js defines the deny patterns themselves, so it is not scanned.
  files.filter(function (f) { return /\.(html|js|css|gs)$/.test(f) && !/^tests\//.test(f) && !/^tools\//.test(f) && f !== 'data/blocklist.js' && f !== 'apps-script/Shared.gs'; }).forEach(function (f) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
    t.split('\n').forEach(function (line, i) {
      if (deny.test(line)) err(f + ':' + (i + 1) + ': person or hand emoji');
      if (arrows.test(line)) warn(f + ':' + (i + 1) + ': arrow emoji (direction matters: prefer SVG)');
      const imgs = line.match(/<img[^>]*src\s*=\s*["']([^"']+)["']/gi) || [];
      imgs.forEach(function (tag) {
        const src = /src\s*=\s*["']([^"']+)["']/i.exec(tag)[1];
        if (/^(https?:)?\/\//i.test(src)) err(f + ':' + (i + 1) + ': <img> points outside the repo: ' + src);
      });
      if (/url\(\s*["']?(https?:)?\/\//i.test(line)) err(f + ':' + (i + 1) + ': CSS url() points outside the repo');
    });
  });
}

// ------------------------------------------------------------------ main
function run(only) {
  const ctx = load();
  const spec = readSpec();
  const files = repoFiles();
  const all = { V1: function () { V1(ctx); }, V2: function () { V2(ctx, spec); }, V3: function () { V3(ctx); }, V4: function () { V4(ctx); },
    V5: function () { V5(ctx); }, V6: function () { V6(ctx); }, V7: function () { V7(ctx, spec); }, V8: function () { V8(ctx); },
    V9: function () { V9(ctx); }, V10: function () { V10(ctx, files); }, V11: function () { V11(files); }, V12: function () { V12(files); } };
  Object.keys(all).forEach(function (k) {
    if (only && only.length && only.indexOf(k) < 0) return;
    try { all[k](); } catch (e) { if (!results[k]) section(k, k); results[k].errors.push('crashed: ' + (e && e.stack || e)); }
  });
  return results;
}

module.exports = { run: run, baseBundle: baseBundle, fullWord: fullWord, plan1: plan1, planActions: planActions, text: text, simulateAllDone: simulateAllDone };

if (require.main === module) {
  const only = process.argv.slice(2).filter(function (a) { return /^V\d+$/.test(a); });
  const res = run(only);
  let bad = 0;
  Object.keys(res).forEach(function (k) {
    const r = res[k];
    const status = r.errors.length ? 'FAIL' : (r.notes.some(function (n) { return /^pending/.test(n); }) ? 'PENDING' : 'ok');
    console.log(k.padEnd(4) + ' ' + status.padEnd(7) + ' ' + r.title);
    r.errors.slice(0, 40).forEach(function (e) { console.log('       x ' + e); });
    if (r.errors.length > 40) console.log('       … ' + (r.errors.length - 40) + ' more errors');
    r.warnings.slice(0, 10).forEach(function (w) { console.log('       ! ' + w); });
    if (r.warnings.length > 10) console.log('       … ' + (r.warnings.length - 10) + ' more warnings');
    r.notes.forEach(function (n) { console.log('       - ' + n); });
    bad += r.errors.length;
  });
  console.log(bad ? '\nvalidate: ' + bad + ' error(s)' : '\nvalidate: all checks passed');
  process.exit(bad ? 1 : 0);
}
