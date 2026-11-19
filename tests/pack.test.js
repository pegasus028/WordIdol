/* WordIdol packs (W5) tests.
   Node part: data files (timings, Q&A bank, report sections), facts, word counts, report checks,
   wave figures and chart SVG strings, run in a vm context like tools/load.js.
   Browser part (Playwright, Chromium): renders the Baseline report helper and the wave card from
   fixture bundles on a local static server (port 8766), at 375 x 667 and 1366 x 768, light and dark.
   Run:  NODE_PATH=$(npm root -g) node tests/pack.test.js        (add --node to skip the browser part)
   Screenshots go to $WI_SHOTS or /home/claude/wi-scratch/W5/shots. */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var http = require('http');

var ROOT = path.resolve(__dirname, '..');
var PORT = Number(process.env.WI_PACK_PORT || 8766);
var SHOTS = process.env.WI_SHOTS || '/home/claude/wi-scratch/W5/shots';
var NODE_ONLY = process.argv.indexOf('--node') >= 0;

var failures = 0, passes = 0;
function ok(cond, msg) { if (cond) { passes++; } else { failures++; console.log('  FAIL ' + msg); } }
function eq(a, b, msg) { ok(a === b, msg + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }
function section(t) { console.log('\n# ' + t); }

/* load order as docs/ENGINE-API.md §0 (files that are not there yet are skipped) */
var FILES = ['config.js', 'schema.js', 'data/plan.js', 'data/choices.js', 'data/rules.js', 'data/game.js', 'data/checklist.js',
  'data/coverage.js', 'data/guide.js', 'data/frames.js', 'data/levels.js', 'data/blocklist.js', 'data/why.js', 'data/pool.js',
  'data/reports.js', 'data/summit.js', 'data/article.js', 'engine.js', 'pack.js'];
var present = FILES.filter(function (f) { return fs.existsSync(path.join(ROOT, f)); });

function loadCtx() {
  var ctx = { console: console };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  present.forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); });
  return ctx;
}

/* ------------------------------------------------------------------ fixtures */
function wordsN(n, w) { var a = []; for (var i = 0; i < n; i++) a.push(w || 'data'); return a.join(' '); }
function fixture(o) {
  o = o || {};
  var T = '2026-11-21T10:00:00+07:00';
  var D = {
    student: { id: 'g1', label: 'Guest#1', guest: true },
    state: { studentId: 'g1', weekId: 'W02', stage: 's3', xp: 120, streak: 1, rulesTicked: [T, T, T, T, T, T], onlineUnlocked: false, onlineUnlockedBy: '', badges: {} },
    config: { release: o.release || 1, onlineOpensAt: '2026-11-26T16:30:00+07:00', boardEnabled: true },
    word: {
      studentId: 'g1', word: 'flumsy', meaning: 'tired and slow after a big lunch', example1: 'I feel flumsy after lunch.',
      pos: 'adjective', posAlso: ['noun'], posConfirmed: true, posGuess: 'adjective', posRule: 'P15', posConfidence: 'high',
      usageRules: 'An adjective. Use it after feel, be or look. Friends say it in the afternoon, never in lessons.',
      forms: { comparative: 'flumsier', superlative: 'flumsiest' }, pronunciation: 'FLUM-zee', formation: 'blending',
      sourceWords: 'flop + clumsy', example2: 'Everyone was flumsy in the last period.', example3: 'That lunch made me so flumsy.',
      doNotUse: 'Do not use it about someone who is ill.', purpose: 'A short word for the slow feeling after lunch that we all share.',
      notRudeConfirmed: true,
      fudge: { pred: { F: 1, U: 2, D: 1, G: 1, E: 1, reasons: { F: 'People eat lunch every day.', U: 'It sounds like a normal English word.', D: 'Only my class at first.', G: 'Flumsier and flumsiness are easy.', E: 'The feeling will not go away.' }, at: T } },
      researchQuestion: 'To what extent can a blended adjective spread beyond one class in twelve weeks?',
      hypotheses: [
        { id: 'h1', text: 'Corrected recognition of flumsy will reach 10% by Wave 2.', metric: 'corrected', target: '10% by Wave 2' },
        { id: 'h2', text: 'Friends in my class will use it without being asked within three weeks.', metric: 'level', target: 'Level 4' }
      ],
      zb: { checkedAt: '2026-11-12', statement: 'I found no results with my meaning on any of the six places.', fileIds: [],
        places: ['zb_google', 'zb_tiktok', 'zb_instagram', 'zb_x', 'zb_youtube', 'zb_urban'].map(function (p) { return { placeId: p, result: 'none', note: '' }; }) },
      regStatus: 'submitted'
    },
    wordHistory: [],
    plans: [{ id: 'g1-p1', studentId: 'g1', phase: 1, targetGroups: ['tg_school', 'tg_family'], ideas: ['id_speak', 'id_memes'], platforms: ['pf_inperson'],
      platformOther: '', route: 'utility', timeBudget: 'standard', who: 'My lunch group in M4 and my younger cousin at home.',
      why: 'Everyone feels slow after lunch and we have no short word for it.', what: 'They will hear me say it after lunch, in a normal sentence.', spark: '' }],
    planActions: [
      { id: 'pa_000000000001', studentId: 'g1', phase: 1, where: 'ch_school', ideaId: 'id_speak', what: 'Use flumsy at lunch with my group', why: 'We meet every day', theoryTag: 'th-wncs', whenDate: '2026-11-23', weekId: 'W02', evidence: 'log', status: 'planned', deleted: false },
      { id: 'pa_000000000002', studentId: 'g1', phase: 1, where: 'ch_home', ideaId: 'id_speak', what: 'Teach it to my cousin once', why: 'Family spread test', theoryTag: '', whenDate: '2026-11-28', weekId: 'W02', evidence: 'journal', status: 'planned', deleted: false },
      { id: 'pa_000000000003', studentId: 'g1', phase: 1, where: 'ch_school', ideaId: 'id_memes', what: 'Draw a paper meme for two classmates', why: 'A format to copy', theoryTag: '', whenDate: '2026-12-01', weekId: 'W03', evidence: 'sighting', status: 'planned', deleted: false },
      { id: 'pa_000000000009', studentId: 'g1', phase: 1, where: 'ch_school', ideaId: 'id_speak', what: 'Deleted row', why: 'x', whenDate: '2026-12-01', weekId: 'W03', evidence: 'log', status: 'planned', deleted: true }
    ],
    checklist: [], reviews: [],
    actions: [
      { id: 'ac_000000000001', studentId: 'g1', date: '2026-11-21', weekId: 'W01', phase: 1, channelId: 'ch_school', ideaId: 'id_speak', what: 'Launched flumsy at lunch', outcome: 'as_planned', learned: 'Two friends laughed and one asked what it meant.', deleted: false },
      { id: 'ac_000000000002', studentId: 'g1', date: '2026-11-23', weekId: 'W02', phase: 1, channelId: 'ch_home', ideaId: 'id_speak', what: 'Tried it with my cousin', outcome: 'changed', outcomeReason: 'She was busy, so I only said it once.', deleted: false }
    ],
    journal: [{ id: 'jn_000000000001', studentId: 'g1', date: '2026-11-23', weekId: 'W02', phase: 1, kind: 'failure_analysis', text: wordsN(70, 'because'), wordCount: 70, deleted: false }],
    sightings: [
      { id: 'sg_000000000001', studentId: 'g1', date: '2026-11-21', weekId: 'W01', phase: 1, channelId: 'ch_school', relation: 'me', quote: 'I am so flumsy', prompted: 'unsure', level: 1, owned: true, auditStatus: 'none', spotStatus: 'none', finalLevel: '', deleted: false },
      { id: 'sg_000000000002', studentId: 'g1', date: '2026-11-23', weekId: 'W02', phase: 1, channelId: 'ch_school', relation: 'classmate', quote: 'flumsy again', prompted: 'unasked', level: 4, owned: false, auditStatus: 'agreed', spotStatus: 'none', finalLevel: '', deleted: false },
      { id: 'sg_000000000003', studentId: 'g1', date: '2026-11-24', weekId: 'W02', phase: 1, channelId: 'ch_home', relation: 'cousin', quote: 'so flumsy', prompted: 'asked', level: 0, owned: true, auditStatus: 'none', spotStatus: 'none', finalLevel: '', deleted: false }
    ],
    tallies: [
      { id: 'tl_000000000001', studentId: 'g1', date: '2026-11-21', weekId: 'W01', tallyType: 'said', count: 3, deleted: false },
      { id: 'tl_000000000002', studentId: 'g1', date: '2026-11-24', weekId: 'W02', tallyType: 'heard', count: 1, deleted: false }
    ],
    files: [], waves: [], waveNotes: [], requests: [], flags: [], feedback: [], reports: [], summit: null, article: null, audits: { mine: [], onMe: [] }, xpLog: []
  };
  function wave(waveId, rows, date, pub) {
    rows.forEach(function (r) {
      D.waves.push({ id: waveId + '|' + r[0], waveId: waveId, termKey: r[0], termText: r[1], n: r[2], recognised: r[3], notSure: r[4], comprehended: r[5], date: date, classesNote: 'M2/3, M3/1', published: pub !== false, updatedAt: date + 'T12:00:00+07:00' });
    });
  }
  if (o.w1 !== false) wave('W1', [['g1', 'flumsy', 100, 40, 10, 30], ['ctrl1', 'aura farming', 100, 70, 5, 60], ['ctrl2', 'crash out', 100, 55, 8, 50], ['foil1', 'drovish', 100, 20, 9, 0], ['foil2', 'trelky', 100, 10, 6, 0]], '2026-11-24');
  if (o.w2) wave('W2', [['g1', 'flumsy', 80, 8, 4, 6], ['ctrl1', 'aura farming', 80, 60, 2, 50], ['ctrl2', 'crash out', 80, 44, 4, 40], ['foil1', 'drovish', 80, 16, 3, 0], ['foil2', 'trelky', 80, 24, 5, 0]], '2026-12-09');
  if (o.w3draft) wave('W3', [['g1', 'flumsy', 50, 30, 1, 20]], '2027-01-12', false);
  return D;
}

/* ------------------------------------------------------------------ Node tests */
function nodeTests() {
  var C = loadCtx(), P = C.WIPack, S = C.WI_SUMMIT, R = C.WI_REPORTS, A = C.WI_ARTICLE;
  section('load (' + present.length + ' files: ' + FILES.filter(function (f) { return present.indexOf(f) < 0; }).join(', ') + (present.length === FILES.length ? 'all present' : ' missing') + ')');
  ok(!!P && typeof P.renderReport === 'function' && typeof P.renderCharts === 'function' && typeof P.renderSummit === 'function' && typeof P.renderArticle === 'function' && typeof P.chartSVG === 'function', 'WIPack has the five contract functions');
  ok(!!S && !!R && !!A, 'WI_SUMMIT, WI_REPORTS and WI_ARTICLE are defined');

  section('Summit data (SPEC §11, V6)');
  var ids = S.sections.map(function (s) { return s.id; }).join(',');
  eq(ids, 'hook,term,approach,evidence,learnings,phase2', 'section ids and order');
  eq(S.sections.reduce(function (a, s) { return a + s.timeSec; }, 0), 420, 'timings sum to 420 s');
  eq(S.talkSec, 420, 'talkSec'); eq(S.qaSec, 120, 'qaSec');
  var run = 0; S.sections.forEach(function (s) { run += s.timeSec; eq(s.runningSec, run, 'runningSec of ' + s.id); });
  eq(S.sections.map(function (s) { return s.wordGuide; }).join(','), '65,160,160,225,160,130', 'word guides');
  eq(S.sections.reduce(function (a, s) { return a + s.slides; }, 0) + 1, S.slideCount, '8 content slides + closing = slideCount');
  eq(S.slideCount, 9, 'slide count 9');
  eq(S.tabs.map(function (t) { return t.id; }).join(','), 'outline,evidence,visuals,abstract,qa,check,rehearse,export', 'Summit tabs');
  ok(S.qa.length >= 24, 'Q&A bank has at least 24 questions (' + S.qa.length + ')');
  var tags = {}; var qids = {};
  S.qa.forEach(function (q) {
    tags[q.tag] = (tags[q.tag] || 0) + 1;
    ok(/^qa-\d\d$/.test(q.id) && !qids[q.id], 'qa id ' + q.id + ' format and unique'); qids[q.id] = 1;
    ok(q.q && q.q.length <= 120 && q.frame && q.frame.length >= 10, 'qa ' + q.id + ' has q and frame');
    ok(q.q.split(/\s+/).length <= 20, 'qa ' + q.id + ' question is 20 words or fewer');
  });
  ['theory', 'method', 'evidence', 'ethics', 'failure', 'phase2'].forEach(function (t) { ok((tags[t] || 0) >= 3, 'at least 3 questions tagged ' + t); });
  eq(Object.keys(tags).sort().join(','), 'ethics,evidence,failure,method,phase2,theory', 'only the six tags are used');
  eq(S.selfCheck.map(function (r) { return r.id; }).join(','), 'SC1,SC2,SC3,SC4,SC5', 'self-check rows');
  eq(S.selfCheck.slice(0, 4).map(function (r) { return r.points; }).join(','), '6,6,4,4', 'self-check points');
  eq(S.charts.map(function (c) { return c.id; }).join(','), 'ch_waves,ch_compare,ch_levels,ch_actions,ch_fudge,ch_tallies', 'chart ids');
  eq(S.abstract.minWords + '-' + S.abstract.maxWords, '45-55', 'abstract range');
  eq(S.aoa.minWords + '-' + S.aoa.maxWords, '25-120', 'AOA statement range');
  eq(S.readiness.length, 8, 'Summit readiness has 8 ticks');
  eq(S.png.width + 'x' + S.png.height, '1600x900', 'PNG size');
  eq(S.principle, C.WI_RULES ? C.WI_RULES.analysisOverAdoption : S.principle, 'principle wording matches WI_RULES');

  section('Report data (SPEC §11.8)');
  eq(Object.keys(R.types).join(','), 'baseline,intermediate,final', 'three report types');
  eq(R.types.baseline.sections.map(function (s) { return s.id; }).join(','), 'profile,fudge,wave1,plan', 'baseline section ids');
  eq(R.types.intermediate.sections.map(function (s) { return s.id; }).join(','), 'wave2,log,analysis,adjust', 'intermediate section ids');
  eq(R.types.final.sections.map(function (s) { return s.id; }).join(','), 'wave3,compare,closeout', 'final section ids');
  eq(R.types.baseline.wordMin + '-' + R.types.baseline.wordMax, '600-900', 'baseline 600-900');
  eq(R.types.intermediate.wordMin + '-' + R.types.intermediate.wordMax, '600-900', 'intermediate 600-900');
  ok(R.types.final.wordMin == null && R.types.final.wordMax == null, 'final total not set (KIT-08 pending)');
  R.types.baseline.sections.concat(R.types.intermediate.sections).forEach(function (s) { eq(s.minWords, 80, s.id + ' min 80'); });
  R.types.final.sections.forEach(function (s) { eq(s.minWords, 60, s.id + ' min 60'); });
  eq(R.types.baseline.due + '|' + R.types.intermediate.due + '|' + R.types.final.due, '2026-11-25|2026-12-14|2027-01-22', 'due dates');
  eq(R.types.baseline.release + '|' + R.types.intermediate.release + '|' + R.types.final.release, '1|2|3', 'releases');

  section('Article data (SPEC §12)');
  eq(A.sections.map(function (s) { return s.id; }).join(','), 'intro,methods,results,discussion', 'IMRaD ids');
  eq(A.survey.controls.join(',') + '|' + A.survey.foils.join(','), 'aura farming,crash out|drovish,trelky', 'controls and foils');
  eq(A.survey.waves.length, 4, 'four waves');
  ok(A.starterSources.length >= 5, 'starter sources from the syllabus (' + A.starterSources.length + ')');
  ok(A.starterSources.every(function (s) { return s.apa.length >= 20; }), 'every starter APA entry has at least 20 characters');
  eq(A.limits.abstractMin + '-' + A.limits.abstractMax + '|' + A.limits.wordsMin + '-' + A.limits.wordsMax, '150-200|2000-3000', 'article limits');
  eq(A.statuses.map(function (s) { return s.id; }).join(','), 'planning,drafting,in_review,revising,submitted', 'article statuses');

  section('facts registry');
  var keys = {};
  function addKeys(list) { list.forEach(function (k) { keys[k] = 1; }); }
  Object.keys(R.types).forEach(function (t) { R.types[t].sections.forEach(function (s) { addKeys(s.facts); }); });
  S.sections.forEach(function (s) { addKeys(s.facts); });
  A.sections.forEach(function (s) { addKeys(s.facts); });
  var D = fixture({ w2: true }), E = {};
  Object.keys(keys).forEach(function (k) {
    ok(typeof P.facts[k] === 'function', 'fact builder exists: ' + k);
    var f1 = P.buildFact(k, D), f2 = P.buildFact(k, E);
    ok(f1 && f1.title && (f1.empty || (f1.rows || []).length || f1.table || (f1.list || []).length), k + ' builds on the fixture');
    ok(f2 && f2.title, k + ' builds on an empty bundle');
    ok(P.factText(f1).length > 0, k + ' has a text form');
  });
  var prof = P.buildFact('word.basic', D);
  ok(JSON.stringify(prof.rows).indexOf('flumsy') >= 0, 'word.basic shows the word');
  var fu = P.buildFact('word.fudge', D);
  ok(JSON.stringify(fu.rows).indexOf('6 / 10 (fringe)') >= 0, 'FUDGE total 6 / 10 (fringe)');
  var pt = P.buildFact('plan.table', D);
  eq(pt.table.rows.length, 3, 'plan table skips deleted rows');
  var rs = P.buildFact('rules.six', D);
  eq(rs.rows[0][1], '6 of 6', 'six rules ticked');
  var lv = P.buildFact('sightings.byLevel', D);
  eq(lv.table.rows[4][1], '1', 'one sighting at Level 4');
  eq(lv.table.rows[2][1], 'from the survey', 'Level 2 comes from the survey');

  section('word counts');
  eq(P.words(''), 0, 'empty'); eq(P.words('  a  b\nc '), 3, 'white space'); eq(P.words('— – ...'), 0, 'punctuation only');
  eq(P.words('60% of 100 people, really!'), 5, 'numbers count');
  if (C.WI && C.WI.wordCount) {
    ['Hello there, T.Chris — it is 40% here.', 'a\tb\nc', '  '].forEach(function (s) { eq(P.words(s), C.WI.wordCount(s), 'same as WI.wordCount: ' + JSON.stringify(s)); });
  }

  section('report checks');
  var NOAI = 'I did not use AI tools for any part of this report.';
  function secs(n, ai) { return { profile: wordsN(n[0]), fudge: wordsN(n[1]), wave1: wordsN(n[2]), plan: wordsN(n[3]), ai: ai }; }
  var c1 = P.reportCheck('baseline', secs([150, 150, 150, 150], NOAI));
  ok(c1.ready && c1.total === 600, '600 words + a 10-word AI declaration is ready');
  ok(!P.reportCheck('baseline', secs([150, 150, 150, 149], NOAI)).ready, '599 words is not ready');
  ok(P.reportCheck('baseline', secs([225, 225, 225, 225], NOAI)).ready, '900 words is ready');
  ok(!P.reportCheck('baseline', secs([226, 225, 225, 225], NOAI)).ready, '901 words is not ready');
  var c79 = P.reportCheck('baseline', secs([79, 300, 150, 150], NOAI));
  ok(!c79.ready && !c79.sections.profile.ok, 'a section under 80 words is not ready');
  ok(!P.reportCheck('baseline', secs([150, 150, 150, 150], 'No.')).ready, 'a two-word AI declaration is not enough');
  ok(!P.reportCheck('baseline', secs([150, 150, 150, 150], '')).ready, 'the AI declaration is required');
  ok(P.aiOk('I used a spell checker for section two and wrote every idea myself.'), 'a 10+ word declaration is fine');
  ok(!P.aiOk('I did not use AI tools.'), 'a 6-word declaration is too short (server rule: 10 words)');
  ok(!P.aiOk('I used AI.'), '"I used AI." is not a declaration');
  ok(P.reportCheck('final', { wave3: wordsN(60), compare: wordsN(60), closeout: wordsN(60), ai: NOAI }).ready, 'final: 60 words each is ready (no total range yet)');
  var txt = P.reportText('baseline', secs([3, 3, 3, 3], NOAI), D);
  ok(txt.indexOf('Baseline assessment report: flumsy') === 0, 'copy text starts with the title and word');
  ['1. Term profile', '2. FUDGE predictions and hypotheses', '3. Wave 1 baseline data', '4. Campaign and safety plan', 'AI-use declaration', 'I did not use AI tools for any part'].forEach(function (h) { ok(txt.indexOf(h) >= 0, 'copy text has ' + h); });

  section('waves and corrected recognition (SPEC §13.4)');
  var w1 = P.waveStats(D, 'W1');
  eq(w1.rows.map(function (r) { return r.kind; }).join(','), 'me,control,control,foil,foil', 'row order');
  eq(Math.round(w1.foilRate), 15, 'foil rate 15%');
  eq(Math.round(w1.me.corrected), 25, 'corrected 40% - 15% = 25%');
  eq(Math.round(w1.rows[1].corrected), 55, 'control corrected 70 - 15 = 55');
  ok(w1.rows[3].corrected == null, 'no corrected figure for a foil');
  var w2 = P.waveStats(D, 'W2');
  eq(Math.round(w2.me.corrected), -15, 'negative corrected 10% - 25% = -15%');
  eq(P.pctText(w2.me.corrected), '−15%', 'negative shown with a minus sign');
  eq(P.publishedWaves(fixture({ w2: true, w3draft: true })).join(','), 'W1,W2', 'unpublished wave rows are not shown');
  ok(P.waveStats(fixture({ w1: false }), 'W1') === null, 'no wave rows → null');
  var other = fixture(); other.waves.push({ id: 'W1|g2', waveId: 'W1', termKey: 'g2', termText: 'secret', n: 10, recognised: 1, notSure: 0, comprehended: 0, published: true });
  ok(JSON.stringify(P.waveStats(other, 'W1')).indexOf('secret') < 0, 'another student’s term is never shown');

  section('chart SVG strings');
  var big = fixture({ w2: true, release: 2 });
  ['ch_waves', 'ch_compare', 'ch_levels', 'ch_actions', 'ch_fudge', 'ch_tallies'].forEach(function (id) {
    [[big, 'fixture'], [{}, 'empty']].forEach(function (pair) {
      ['light', 'dark'].forEach(function (th) {
        [320, 800].forEach(function (w) {
          var s = P.chartSVG(id, pair[0], { width: w, height: Math.round(w * 0.6), theme: th });
          ok(/^<svg [^>]*viewBox="0 0 \d+ \d+"/.test(s) && /<\/svg>$/.test(s), id + ' ' + pair[1] + ' ' + th + ' ' + w + ': svg string');
          ok(s.indexOf('NaN') < 0 && s.indexOf('undefined') < 0, id + ' ' + pair[1] + ' ' + th + ' ' + w + ': no NaN/undefined');
        });
      });
    });
    var t = P.chartTable(id, big);
    ok(t && t.rows.length > 0, id + ' has a table view');
  });
  ok(P.chartSVG('ch_compare', big, {}).indexOf('No data yet') < 0, 'compare chart has data');
  ok(P.chartSVG('ch_waves', {}, {}).indexOf('No data yet') > 0, 'empty bundle → "No data yet"');
  eq(P.pngName('ch_compare', { word: { word: 'Glow Up!' } }), 'wordidol-ch_compare-glow-up.png', 'PNG file name');
  var lt = P.chartTable('ch_levels', big);
  eq(lt.rows[2][1], 'from the survey', 'levels table marks Level 2 as survey');

  section('privacy: no names, PINs or tokens in W5 files');
  // Real labels are read only from the private, git-ignored Roster.gs when it exists on this machine.
  var labels = [];
  var rosterPath = path.join(ROOT, 'apps-script', 'Roster.gs');
  if (fs.existsSync(rosterPath)) {
    var rs2 = fs.readFileSync(rosterPath, 'utf8'), m, re = /label\s*:\s*['"]([^'"]+)['"]/g;
    while ((m = re.exec(rs2))) if (!/^(Guest#\d|Student [A-Z])$/.test(m[1])) labels.push(m[1]);
  }
  ['pack.js', 'pack.css', 'data/reports.js', 'data/summit.js', 'data/article.js', 'tests/pack.test.js'].forEach(function (f) {
    var s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    // Whole words only, and labels that are also everyday words ("Sun" as in Sunday) are checked only
    // in a person-like context (the label followed by "says" or an apostrophe-s, or after "as"/"by"/"from"/"with"/"and").
    var common = { Sun: 1, Pin: 1, Proud: 1, Mint: 1, Donut: 1 };
    labels.forEach(function (l) {
      var re = common[l] ? new RegExp('\\b(as|by|from|with|and) ' + l + '\\b|\\b' + l + '[\u2019\\x27]s\\b') : new RegExp('\\b' + l + '\\b');
      ok(!re.test(s), f + ' has no student label');
    });
    if (f.indexOf('tests/') === 0) return;
    ok(!/\bpin\s*[:=]\s*['"]\d{4}/i.test(s), f + ' has no PIN literal');
    ok(!/<img\b/i.test(s), f + ' has no <img');
  });
}

/* ------------------------------------------------------------------ static server */
var MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
function startServer() {
  return new Promise(function (resolve, reject) {
    var srv = http.createServer(function (req, res) {
      var u = decodeURIComponent(req.url.split('?')[0]);
      if (u === '/__pack__/harness.html') { res.writeHead(200, { 'Content-Type': MIME['.html'] }); res.end(harness()); return; }
      var p = path.join(ROOT, path.normalize(u).replace(/^(\.\.[\/\\])+/, ''));
      if (p.indexOf(ROOT) !== 0 || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    });
    srv.on('error', reject);
    srv.listen(PORT, '127.0.0.1', function () {
      http.get('http://127.0.0.1:' + PORT + '/pack.js', function (r) { r.resume(); if (r.statusCode === 200) resolve(srv); else reject(new Error('server ' + r.statusCode)); }).on('error', reject);
    });
  });
}
function harness() {
  var css = ['app.css', 'pack.css'].filter(function (f) { return fs.existsSync(path.join(ROOT, f)); }).map(function (f) { return '<link rel="stylesheet" href="/' + f + '">'; }).join('');
  var js = present.map(function (f) { return '<script src="/' + f + '"></script>'; }).join('');
  return '<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' + css +
    '<title>pack harness</title></head><body><main id="view"></main>' + js +
    '<script>window.__saves=[];window.__toasts=[];window.__go=[];window.__mode="ok";' +
    'window.__ctx=function(D,release){return{D:D,release:release,now:"2026-11-24T20:00:00+07:00",' +
    'save:function(a,d){window.__saves.push({action:a,data:JSON.parse(JSON.stringify(d))});return new Promise(function(r){setTimeout(function(){r(window.__mode==="queued"?{ok:true,queued:true}:{ok:true,data:{}});},20);});},' +
    'go:function(r){window.__go.push(r);},toast:function(m){window.__toasts.push(m);}};};</script></body></html>';
}

/* ------------------------------------------------------------------ browser tests */
async function browserTests() {
  var pw;
  try { pw = require('playwright'); } catch (e) { console.log('\n# browser: playwright not found (set NODE_PATH=$(npm root -g)); skipped'); return false; }
  fs.mkdirSync(SHOTS, { recursive: true });
  var srv = await startServer();
  var browser;
  try {
    try { browser = await pw.chromium.launch(); } catch (e) {
      var dirs = fs.readdirSync('/opt/pw-browsers').filter(function (d) { return /^chromium-\d+/.test(d); });
      browser = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/' + dirs[0] + '/chrome-linux/chrome' });
    }
    var base = 'http://127.0.0.1:' + PORT;
    var errors = [];
    async function newPage(w, h, theme) {
      var context = await browser.newContext({ viewport: { width: w, height: h }, acceptDownloads: true, colorScheme: theme === 'dark' ? 'dark' : 'light' });
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
      var page = await context.newPage();
      page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); console.log('  pageerror: ' + e.message); });
      page.on('console', function (m) { if (m.type() === 'error') errors.push('console: ' + m.text()); });
      await page.goto(base + '/__pack__/harness.html');
      await page.evaluate(function (th) { document.documentElement.setAttribute('data-theme', th); localStorage.clear(); }, theme);
      return page;
    }
    async function render(page, kind, D, release, arg) {
      await page.evaluate(function (a) {
        window.__saves = []; window.__toasts = []; window.__lastD = a.D;
        var el = document.getElementById('view'); var fresh = el.cloneNode(false); el.parentNode.replaceChild(fresh, el);
        var ctx = window.__ctx(a.D, a.release);
        if (a.kind === 'report') WIPack.renderReport(fresh, ctx, a.arg);
        else if (a.kind === 'charts') WIPack.renderCharts(fresh, ctx);
        else if (a.kind === 'summit') WIPack.renderSummit(fresh, ctx, a.arg);
        else if (a.kind === 'article') WIPack.renderArticle(fresh, ctx, a.arg);
      }, { kind: kind, D: D, release: release, arg: arg });
    }
    async function layoutChecks(page, label) {
      var r = await page.evaluate(function () {
        var de = document.documentElement, small = [];
        var sel = '#view button, #view input:not([type=radio]):not([type=checkbox]), #view select, #view textarea, #view summary, #view label.opt, #view a';
        document.querySelectorAll(sel).forEach(function (n) {
          var b = n.getBoundingClientRect();
          if (b.width === 0 && b.height === 0) return;
          if (b.height < 44 - 0.5) small.push((n.tagName + '.' + n.className + ' "' + (n.textContent || '').trim().slice(0, 30) + '" ' + Math.round(b.height)));
        });
        var wide = [];
        document.querySelectorAll('#view *').forEach(function (n) {
          var b = n.getBoundingClientRect();
          if (b.right > de.clientWidth + 1 && !n.closest('.tablewrap')) wide.push(n.tagName + '.' + n.className);
        });
        return { sw: de.scrollWidth, cw: de.clientWidth, small: small, wide: wide.slice(0, 5) };
      });
      ok(r.sw <= r.cw, label + ': no horizontal overflow (' + r.sw + ' > ' + r.cw + ')');
      ok(!r.wide.length, label + ': nothing sticks out of the page ' + r.wide.join(' '));
      ok(!r.small.length, label + ': tap targets at least 44 px ' + r.small.slice(0, 4).join(' | '));
    }

    /* ---- Baseline helper, 375 x 667 light ---- */
    section('browser: Baseline report helper');
    var page = await newPage(375, 667, 'light');
    var D = fixture();
    await render(page, 'report', D, 1, 'baseline');
    var t = await page.textContent('#view');
    ['Baseline assessment report', 'Due Wed 25 Nov 2026', 'flumsy', 'tired and slow after a big lunch', '6 / 10 (fringe)', 'Wave 1 results', 'aura farming', 'drovish',
      'Corrected recognition of my word: 40% − 15% (foil rate) = 25%.', 'Use flumsy at lunch with my group', '6 of 6', 'Online actions', 'AI-use declaration', 'Marks are awarded for the quality of analysis'].forEach(function (s) {
      ok(t.indexOf(s) >= 0, 'baseline shows "' + s + '"');
    });
    ok(t.indexOf('Deleted row') < 0, 'deleted plan rows are not shown');
    eq(await page.locator('[data-sec="plan"] [data-fact="plan.table"] tbody tr').count(), 3, 'plan table has 3 rows');
    await layoutChecks(page, 'baseline 375 empty');
    await page.screenshot({ path: path.join(SHOTS, 'report-375-light-top.png') });
    // too short: Mark as ready refuses
    await page.fill('[data-text="profile"]', wordsN(79, 'word'));
    ok((await page.textContent('[data-savestate]')).indexOf('Saved on this phone') >= 0, 'draft state shown while typing');
    ok(await page.evaluate(function () { return !!localStorage.getItem('wi.draft.report.baseline'); }), 'draft kept in localStorage while typing');
    await page.click('[data-act="ready"]');
    ok(await page.isVisible('[data-problems]'), 'problems shown when not ready');
    ok((await page.textContent('[data-problems]')).indexOf('1. Term profile: at least 80 words (now 79).') >= 0, 'problem names the short section');
    ok(!(await page.evaluate(function () { return window.__saves.some(function (s) { return s.data.status === 'ready'; }); })), 'no ready save while not ready');
    // fill properly
    for (var sid of ['profile', 'fudge', 'wave1', 'plan']) await page.fill('[data-text="' + sid + '"]', wordsN(150, sid));
    await page.fill('[data-text="ai"]', 'I did not use AI tools for any part of this report.');
    eq((await page.textContent('[data-total]')).trim(), '600', 'live total 600');
    ok((await page.textContent('[data-foottotal]')).indexOf('600 / 600–900 words') >= 0, 'footer total');
    await page.click('[data-act="ready"]');
    await page.waitForFunction(function () { return window.__saves.some(function (s) { return s.data.status === 'ready'; }); });
    var sv = await page.evaluate(function () { return window.__saves.filter(function (s) { return s.data.status === 'ready'; })[0]; });
    eq(sv.action, 'report.save', 'ready uses report.save');
    eq(sv.data.type, 'baseline', 'type baseline');
    eq(Object.keys(sv.data.sections).sort().join(','), 'ai,fudge,plan,profile,wave1', 'all sections sent');
    await page.waitForFunction(function () { return document.querySelector('[data-status]').textContent === 'Ready'; });
    ok(true, 'status chip shows Ready');
    ok(!(await page.evaluate(function () { return !!localStorage.getItem('wi.draft.report.baseline'); })), 'draft cleared after a server save');
    // copy
    await page.click('[data-act="copy"]');
    var clip = await page.evaluate(function () { return navigator.clipboard.readText(); });
    ok(clip.indexOf('Baseline assessment report: flumsy') === 0 && clip.indexOf('4. Campaign and safety plan') > 0 && clip.indexOf('I did not use AI tools for any part') > 0, 'whole report copied with headings');
    await page.click('[data-sec="wave1"] [data-copyfacts]');
    clip = await page.evaluate(function () { return navigator.clipboard.readText(); });
    ok(clip.indexOf('Wave 1 results') === 0 && clip.indexOf('drovish') > 0, 'facts copied as text');
    // submitted
    await page.click('[data-act="submitted"]');
    await page.waitForFunction(function () { return window.__saves.some(function (s) { return s.data.status === 'submitted'; }); });
    await page.waitForFunction(function () { return document.querySelector('[data-status]').textContent === 'Submitted'; });
    ok(true, 'status chip shows Submitted');
    // fact links go to the right screen
    var D2 = fixture({ w1: false }); D2.word.fudge = null;
    await render(page, 'report', D2, 1, 'baseline');
    ok((await page.textContent('[data-sec="wave1"]')).indexOf('not published yet') >= 0, 'unpublished Wave 1 explained');
    ok(!(await page.$('[data-sec="wave1"] [data-go]')), 'no "go and fill it in" button for an unpublished wave (nothing for her to fill)');
    await page.click('[data-sec="fudge"] [data-fact="word.fudge"] [data-go]');
    eq(await page.evaluate(function () { return window.__go[window.__go.length - 1]; }), '#/audition', 'empty FUDGE fact links to #/audition');
    // submitted needs ready first (aria-disabled, but a tap explains why)
    await page.click('[data-act="submitted"]', { force: true });
    ok((await page.textContent('[data-problems]')).indexOf('Mark the report as ready first') >= 0, 'cannot mark submitted from draft');
    // draft restore after reload
    await page.fill('[data-text="profile"]', 'My draft text that is only on this phone');
    await render(page, 'report', D2, 1, 'baseline');
    eq(await page.inputValue('[data-text="profile"]'), 'My draft text that is only on this phone', 'draft restored on re-render');
    ok((await page.textContent('[data-savestate]')).indexOf('Saved on this phone') >= 0, 'restored draft says "Saved on this phone"');
    // blur saves; queued shows waiting
    await page.evaluate(function () { window.__mode = 'queued'; });
    await page.fill('[data-text="fudge"]', 'Some words here');
    await page.click('h1');
    await page.waitForFunction(function () { return document.querySelector('[data-savestate]').textContent.indexOf('Waiting to send') >= 0; });
    ok(true, 'blur saves, offline result shows "Waiting to send (offline)"');
    await page.evaluate(function () { window.__mode = 'ok'; });
    // filled report, screenshots
    var D3 = fixture();
    D3.reports = [{ id: 'g1|baseline', studentId: 'g1', type: 'baseline', status: 'draft', updatedAt: '2026-11-24T10:00:00+07:00', sections: { profile: 'Flumsy is a blend of flop and clumsy. ' + wordsN(120, 'text'), fudge: wordsN(140, 'text'), wave1: wordsN(60, 'text'), plan: '', ai: '' } }];
    await render(page, 'report', D3, 1, 'baseline');
    await layoutChecks(page, 'baseline 375 filled');
    await page.screenshot({ path: path.join(SHOTS, 'report-375-light-full.png'), fullPage: true });
    await page.context().close();

    /* ---- release gating ---- */
    section('browser: Opens-on cards');
    page = await newPage(375, 667, 'light');
    await render(page, 'report', D, 1, 'intermediate');
    ok((await page.textContent('#view')).indexOf('Wed 2 Dec 2026') >= 0, 'intermediate opens Wed 2 Dec 2026 in R1');
    await render(page, 'report', D, 1, 'final');
    ok((await page.textContent('#view')).indexOf('Mon 4 Jan 2027') >= 0, 'final opens Mon 4 Jan 2027 in R1');
    await render(page, 'report', D, 2, 'intermediate');
    ok((await page.textContent('#view')).indexOf('1. Wave 2 data') >= 0, 'intermediate helper renders in R2');
    await render(page, 'summit', D, 1, 'outline');
    ok((await page.textContent('#view')).indexOf('Mon 7 Dec 2026') >= 0, 'Summit opens Mon 7 Dec 2026');
    await render(page, 'article', D, 1, 'outline');
    ok((await page.textContent('#view')).indexOf('Mon 4 Jan 2027') >= 0, 'Article opens Mon 4 Jan 2027');
    await layoutChecks(page, 'opens card');
    await page.screenshot({ path: path.join(SHOTS, 'opens-375-light.png') });
    await page.context().close();

    /* ---- wave card ---- */
    section('browser: wave card (#/charts)');
    page = await newPage(375, 667, 'light');
    await render(page, 'charts', fixture({ w1: false }), 1);
    ok((await page.textContent('#view')).indexOf('Wave 1 is coming') >= 0, 'no published wave → waiting card');
    await render(page, 'charts', fixture({ w3draft: true }), 1);
    eq(await page.locator('[data-wavecard]').count(), 1, 'one wave card (unpublished W3 hidden)');
    eq((await page.textContent('[data-corrected]')).trim(), '25%', 'hero shows corrected 25%');
    eq(await page.locator('[data-wavecard="W1"] .wp-wtable tbody tr').count(), 5, 'five rows: word, 2 controls, 2 foils');
    var meRow = await page.textContent('[data-wavecard="W1"] tr.me');
    ok(meRow.indexOf('flumsy') >= 0 && meRow.indexOf('100') >= 0 && meRow.indexOf('40%') >= 0 && meRow.indexOf('10%') >= 0 && meRow.indexOf('30%') >= 0, 'her row: n, know, not sure, understand');
    var wt = await page.textContent('[data-wavecard="W1"]');
    ok(wt.indexOf('Foil rate = the average of the two foils = 15%') >= 0, 'foil rate explained');
    ok(wt.indexOf('aura farming: 70% − 15% = 55%') >= 0, 'control corrected shown');
    ok(wt.indexOf('Classes surveyed: M2/3, M3/1') >= 0, 'classes note shown');
    eq(await page.locator('[data-wavecard="W1"] input[data-hyp]').count(), 0, 'no hypothesis checks on Wave 1');
    ok((await page.textContent('#view')).indexOf('More charts open on Mon 7 Dec 2026') >= 0, 'R1 says more charts open later');
    ok(await page.evaluate(function () { var s = document.querySelector('[data-wavecard="W1"] .wp-chart-svg svg'); return !!s && s.getBoundingClientRect().width > 200; }), 'compare chart drawn in the card');
    await layoutChecks(page, 'wave card 375');
    ok(await page.evaluate(function () { var w = document.querySelector('[data-wavecard="W1"] .wp-wtable').parentNode; return w.scrollWidth <= w.clientWidth; }), 'wave table fits at 375 px without scrolling');
    await page.screenshot({ path: path.join(SHOTS, 'charts-375-light.png'), fullPage: true });
    await page.fill('[data-wnote="W1"]', 'Short note');
    await page.click('[data-wsave="W1"]');
    await page.waitForFunction(function () { return window.__saves.length === 1 && window.__toasts.length > 0; });
    ok((await page.evaluate(function () { return window.__toasts.join('|'); })).indexOf('at least 20 words') >= 0, 'short note saves with a reminder');
    await page.fill('[data-wnote="W1"]', wordsN(201, 'note'));
    await page.click('[data-wsave="W1"]');
    ok((await page.textContent('[data-wstate="W1"]')).indexOf('200 words or fewer') >= 0, 'over 200 words refused');
    await page.fill('[data-wnote="W1"]', wordsN(25, 'note'));
    ok((await page.textContent('[data-wcount="W1"]')).indexOf('25 words') >= 0, 'note word counter');
    await page.click('[data-wsave="W1"]');
    await page.waitForFunction(function () { return window.__saves.length === 2; });
    var ws = await page.evaluate(function () { return window.__saves[1]; });
    eq(ws.action, 'rec.save', 'note saved with rec.save');
    eq(ws.data.type, 'waveNote', 'type waveNote');
    eq(ws.data.record.id, 'g1|W1', 'WaveNotes id <studentId>|<waveId>');
    eq(ws.data.record.waveId, 'W1', 'waveId W1');
    await page.waitForFunction(function () { return document.querySelector('[data-wstate="W1"]').textContent === 'Saved'; });
    ok(true, 'save state "Saved"');
    // PNG download
    var dl = await Promise.all([page.waitForEvent('download'), page.click('[data-wavecard="W1"] [data-png="ch_compare"]')]);
    eq(dl[0].suggestedFilename(), 'wordidol-ch_compare-flumsy.png', 'PNG file name');
    var pngPath = path.join(SHOTS, 'download-ch_compare.png');
    await dl[0].saveAs(pngPath);
    var buf = fs.readFileSync(pngPath);
    ok(buf.slice(1, 4).toString() === 'PNG' && buf.readUInt32BE(16) === 1600 && buf.readUInt32BE(20) === 900, 'PNG is 1600 x 900');
    // Wave 2 with hypothesis checks and a negative corrected figure
    await render(page, 'charts', fixture({ w2: true }), 1);
    eq(await page.locator('[data-wavecard]').count(), 2, 'two wave cards');
    eq(await page.getAttribute('[data-wavecard]', 'data-wavecard'), 'W2', 'newest wave first');
    eq((await page.textContent('[data-wavecard="W2"] [data-corrected]')).trim(), '−15%', 'negative corrected shown');
    ok((await page.textContent('[data-wavecard="W2"]')).indexOf('0 or below means we cannot tell real recognition from guessing.') >= 0, 'negative note shown');
    eq(await page.locator('[data-wavecard="W2"] input[data-hyp]').count(), 6, 'hypothesis radios: 2 hypotheses x 3 statuses');
    await page.check('[data-wavecard="W2"] input[data-hyp="h1"][value="not_supported"]');
    await page.check('[data-wavecard="W2"] input[data-hyp="h2"][value="too_early"]');
    await page.fill('[data-wnote="W2"]', wordsN(30, 'honest'));
    await page.click('[data-wsave="W2"]');
    await page.waitForFunction(function () { return window.__saves.length === 1; });
    var hs = await page.evaluate(function () { return window.__saves[0].data.record.hypothesisChecks; });
    eq(JSON.stringify(hs), '{"h1":"not_supported","h2":"too_early"}', 'hypothesis checks saved');
    await layoutChecks(page, 'two wave cards 375');
    await page.context().close();

    /* ---- dark mode and desktop ---- */
    section('browser: dark mode and 1366 x 768');
    page = await newPage(375, 667, 'dark');
    await render(page, 'charts', fixture({ w2: true }), 1);
    var fill = await page.evaluate(function () { return document.querySelector('.wp-chart-svg svg rect').getAttribute('fill'); });
    eq(fill, WIPackPalette().dark.surface, 'dark chart surface');
    await layoutChecks(page, 'charts 375 dark');
    await page.screenshot({ path: path.join(SHOTS, 'charts-375-dark.png'), fullPage: true });
    await render(page, 'report', fixture(), 1, 'baseline');
    await page.screenshot({ path: path.join(SHOTS, 'report-375-dark.png'), fullPage: false });
    await page.evaluate(function () { document.documentElement.setAttribute('data-theme', 'light'); });
    await render(page, 'charts', fixture({ w2: true }), 1);
    eq(await page.evaluate(function () { return document.querySelector('.wp-chart-svg svg rect').getAttribute('fill'); }), WIPackPalette().light.surface, 'theme switch redraws in light');
    await page.context().close();
    page = await newPage(1366, 768, 'light');
    await render(page, 'charts', fixture({ w2: true, release: 2 }), 2);
    eq(await page.locator('.wp-chart-svg svg').count(), 7, 'R2: two wave charts + five more charts');
    var parse = await page.evaluate(function () {
      var D = window.__lastD, out = [];
      ['ch_waves', 'ch_compare', 'ch_levels', 'ch_actions', 'ch_fudge', 'ch_tallies'].forEach(function (id) {
        [true, false].forEach(function (t) {
          var s = WIPack.chartSVG(id, D || {}, { width: 600, height: 340, title: t });
          var doc = new DOMParser().parseFromString(s, 'image/svg+xml');
          if (doc.getElementsByTagName('parsererror').length) out.push(id);
        });
      });
      return out;
    });
    ok(!parse.length, 'every chart SVG is well-formed XML ' + parse.join(','));
    await layoutChecks(page, 'charts 1366');
    await page.screenshot({ path: path.join(SHOTS, 'charts-1366-light.png'), fullPage: true });
    await render(page, 'report', fixture(), 1, 'baseline');
    await layoutChecks(page, 'report 1366');
    await page.screenshot({ path: path.join(SHOTS, 'report-1366-light.png') });
    await page.context().close();
    page = await newPage(1366, 768, 'dark');
    await render(page, 'charts', fixture({ w2: true, release: 2 }), 2);
    await page.screenshot({ path: path.join(SHOTS, 'charts-1366-dark.png'), fullPage: true });
    // PNG of every chart (for a visual check)
    for (var cid of ['ch_waves', 'ch_levels', 'ch_actions', 'ch_fudge', 'ch_tallies']) {
      var d2 = await Promise.all([page.waitForEvent('download'), page.click('[data-png="' + cid + '"]')]);
      await d2[0].saveAs(path.join(SHOTS, 'download-' + cid + '.png'));
    }
    ok(true, 'PNG downloads for all chart cards');
    await page.context().close();

    section('browser: errors');
    ok(!errors.length, 'no page errors or console errors ' + errors.slice(0, 5).join(' | '));
    return true;
  } finally {
    if (browser) await browser.close();
    srv.close();
  }
}
function WIPackPalette() { return loadCtx().WIPack.PALETTE; }

(async function main() {
  try { nodeTests(); } catch (e) { failures++; console.log('  FAIL node tests threw: ' + (e.stack || e)); }
  if (!NODE_ONLY) {
    try { await browserTests(); } catch (e) { failures++; console.log('  FAIL browser tests threw: ' + (e.stack || e)); }
  }
  console.log('\npack.test.js: ' + passes + ' passed, ' + failures + ' failed');
  process.exit(failures ? 1 : 0);
})();
