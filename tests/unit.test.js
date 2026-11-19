#!/usr/bin/env node
// WordIdol unit tests (W4): SPEC §15.4 "Unit". Plain Node, no dependencies.
//   node tests/unit.test.js
'use strict';
const load = require('../tools/load.js');
const V = require('../tools/validate.js');

const ctx = load();
const WI = ctx.WI;
let passed = 0, failed = 0;
const fails = [];
function test(name, fn) {
  try { fn(); passed++; } catch (e) { failed++; fails.push(name + '\n      ' + (e && e.message)); }
}
function eq(a, b, msg) {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error((msg || 'not equal') + ': got ' + A + ', want ' + B);
}
function ok(x, msg) { if (!x) throw new Error(msg || 'expected true'); }

const T6 = function (iso) { return [iso, iso, iso, iso, iso, iso]; };
const TICKED = T6('2026-11-21T09:00:00+07:00');

// ------------------------------------------------------------------ helpers: a tiny server
function applyRoll(D, roll) {
  const byId = {};
  roll.close.forEach(function (c) { byId[c.id] = c; });
  D.checklist.forEach(function (r) { if (byId[r.id]) { r.status = byId[r.id].status; r.updatedAt = byId[r.id].updatedAt; } });
  D.checklist = D.checklist.concat(roll.open);
}
// like ensureWeek_: start the student at W01, then roll one week at a time up to the week of `now`
function ensureWeek(D, now) {
  if (!D.checklist.length) { D.checklist = WI.buildWeek(D, 'W01', now); D.state.weekId = 'W01'; }
  while (WI.weekIndex(D.state.weekId) < WI.weekIndex(WI.weekIdOf(now))) {
    applyRoll(D, WI.rollWeek(D, D.state.weekId, now));
    D.state.weekId = WI.nextWeekId(D.state.weekId);
  }
  const extra = WI.buildWeek(D, D.state.weekId, now);
  D.checklist = D.checklist.concat(extra);
}
function tickAll(D, weekId, kinds) {
  D.checklist.forEach(function (r) {
    if (r.weekId === weekId && r.status === 'open' && kinds.indexOf(r.kind) >= 0) { r.status = 'done'; r.doneBy = 'manual'; r.doneAt = WI.weekRange(weekId).sunday + 'T18:00:00+07:00'; }
  });
}
function rows(D, weekId) { return D.checklist.filter(function (r) { return r.weekId === weekId; }); }
function ids(list) { return list.map(function (r) { return r.itemId; }); }
function monday(w) { return WI.weekRange(w).start + 'T00:10:00+07:00'; }

function student(id, planOver, extra) {
  const D = V.baseBundle(id);
  D.student.id = id; D.state.studentId = id;
  D.word = V.fullWord(id);
  D.plans = [V.plan1(id, planOver)];
  D.state.rulesTicked = TICKED.slice();
  Object.assign(D, extra || {});
  return D;
}
// Fixture 1: in person only + light
const F1 = function () { return student('g1', { targetGroups: ['tg_school'], ideas: ['id_speak'], platforms: ['pf_inperson'], route: 'utility', timeBudget: 'light' },
  { planActions: V.planActions('g1', 3, ['2026-11-21', '2026-11-25', '2026-12-02']) }); };
// Fixture 2: TikTok + family + standard
const F2 = function () { return student('g2', { targetGroups: ['tg_school', 'tg_family'], ideas: ['id_speak', 'id_tiktok', 'id_askfriends'], platforms: ['pf_tiktok'], route: 'play', timeBudget: 'standard' },
  { planActions: V.planActions('g2', 4, ['2026-11-22', '2026-11-26', '2026-12-03', '2026-12-08']) }); };
// Fixture 3: everything + stretch
const ALL_TG = ctx.WI_CHOICES.targetGroups.map(function (t) { return t.id; });
const ALL_IDEAS = ctx.WI_CHOICES.ideas.map(function (t) { return t.id; });
const F3 = function () { return student('g3', { targetGroups: ALL_TG, ideas: ALL_IDEAS, platforms: ['pf_tiktok', 'pf_instagram', 'pf_facebook', 'pf_youtube', 'pf_chats', 'pf_other'], route: 'shift', timeBudget: 'stretch' },
  { planActions: V.planActions('g3', 5, ['2026-11-21', '2026-11-28', '2026-12-05', '2026-12-12', '2027-01-09']),
    requests: [{ id: 'rq_000000000001', type: 'ask_first', ideaId: 'id_influencer', status: 'pending' }] }); };

// ------------------------------------------------------------------ part of speech
test('pos: all 58 SPEC §3.5 rows (pos, conf, rule, alternatives)', function () {
  ctx.WI_POSTESTS.forEach(function (t) {
    const g = WI.pos.guess(t.word, t.sentence);
    eq([g.pos, g.conf, g.rule, g.alt], [t.pos, t.conf, t.rule, t.alt], '#' + t.n + ' ' + t.sentence);
  });
});
test('pos: curly apostrophes', function () {
  eq(WI.pos.guess('nimp', 'I’m not nimp, I’m just tired.').rule, 'P15');
  eq(WI.pos.guess('vronk', 'Please don’t vronk my project.').rule, 'P12');
  eq(WI.pos.guess('vronk', 'The vronk’s tail was long.').rule, 'P06');
});
test('pos: capitals and double quotation marks', function () {
  const g = WI.pos.guess('Vronk', 'THAT WAS A TOTAL VRONK.');
  eq([g.pos, g.rule], ['noun', 'P10']);
  eq(g.w, 'VRONK', 'w keeps the case written in the sentence');
  eq(WI.pos.guess('vronk', 'She said “vronk” again.').rule !== 'P00', true, 'found inside curly quotes');
  eq(WI.pos.guess('vronk', 'I feel "vronk" today.').rule, 'P15');
});
test('pos: hyphenated words', function () {
  const g = WI.pos.guess('glow-up', 'Her glow-up was amazing.');
  eq([g.pos, g.conf, g.rule], ['noun', 'high', 'P10']);
  eq(WI.pos.guess('glow-up', 'Two glow-ups in one week!').suffix, 's');
});
test('pos: multi-word target never crosses punctuation', function () {
  eq(WI.pos.guess('crash out', 'I will crash, out of time.').rule, 'P00');
});
test('pos: inflections (CVC doubling, -ies, -ily)', function () {
  eq(WI.pos.guess('zib', 'We zibbed all night.').suffix, 'ed');
  eq(WI.pos.guess('flumsy', 'She smiled flumsily.').rule, 'P02');
  eq(WI.pos.guess('flumsy', 'All the flumsies are here.').suffix, 's');
  ok(WI.pos.containsWord('snerf', 'Stop snerfing.'));
  ok(!WI.pos.containsWord('snerf', 'Stop it.'));
});
test('pos: reason text fills {w}/{p} and halves P09/P10', function () {
  const r = WI.pos.guess('vronk', 'I had three vronks before lunch.');
  ok(/vronks/.test(r.reason) && /plural noun/.test(r.reason) && !/she/.test(r.reason), r.reason);
  const v = WI.pos.guess('vronk', 'She always vronks before a big test.');
  ok(/verb/.test(v.reason) && !/plural noun/.test(v.reason), v.reason);
  eq(WI.pos.confText('none'), 'I am not sure. Please choose.');
});

// ------------------------------------------------------------------ weeks
test('weekIdOf: Sunday 23:59 and Monday 00:00 boundaries (Bangkok)', function () {
  for (let i = 1; i <= 12; i++) {
    const w = WI.weekIdAt(i), r = WI.weekRange(w);
    eq(WI.weekIdOf(r.end + 'T23:59:59+07:00'), w, 'Sun 23:59 of ' + w);
    eq(WI.weekIdOf(WI.addDays(r.end, 1) + 'T00:00:00+07:00'), WI.weekIdAt(i + 1), 'Mon 00:00 after ' + w);
  }
  eq(WI.weekIdOf('2026-11-22T16:59:59Z'), 'W01', 'UTC input: still Sunday in Bangkok');
  eq(WI.weekIdOf('2026-11-22T17:00:00Z'), 'W02', 'UTC input: Monday 00:00 in Bangkok');
  eq(WI.weekIdOf('2026-11-01'), 'W01', 'before W01');
  eq(WI.weekIdOf('2027-03-01'), 'W13', 'after W13');
  eq(WI.weekRange('W02').label, 'Week 2 · Mon 23 – Sun 29 Nov');
  eq(WI.phaseOf('2026-12-17T23:59:00+07:00'), 1);
  eq(WI.phaseOf('2026-12-18T00:00:00+07:00'), 2);
  ok(WI.isLightWeek('W06') && WI.isLightWeek('W07') && !WI.isLightWeek('W08'));
  eq(WI.now(0).slice(-6), '+07:00');
});
test('milestones: Wave 2 is Tue 8 – Wed 9 Dec; Fri 11 Dec is a holiday', function () {
  const m = WI.milestones().filter(function (x) { return x.id === 'M05'; })[0];
  eq([m.date, m.endDate], ['2026-12-08', '2026-12-09']);
  ok(ctx.WI_PLAN.holidays.indexOf('2026-12-11') >= 0);
  eq(WI.nextMilestone('2026-11-24T10:00:00+07:00').milestone.id, 'M02');
  eq(WI.milestoneStatus(WI.milestones()[0], '2026-11-24T10:00:00+07:00'), 'done');
});

// ------------------------------------------------------------------ buildWeek
test('buildWeek W01: fixed, habit, plan-action, choice and pool items', function () {
  const D = F2();
  const r = WI.buildWeek(D, 'W01', '2026-11-21T08:00:00+07:00');
  const I = ids(r);
  ['F-W01-01', 'F-W01-08', 'H-W01-1', 'H-W01-2', 'H-W01-4', 'P-' + D.planActions[0].id, 'C-APPS', 'C-NEWACC', 'C-FAMILY', 'C-SCHOOL', 'C-PLAY'].forEach(function (x) { ok(I.indexOf(x) >= 0, 'missing ' + x); });
  ok(I.indexOf('H-W01-3') < 0, 'no sightings check in W01');
  ok(I.indexOf('C-PRIVATE') < 0, 'online choice item waits until W02');
  eq(r.filter(function (x) { return x.source === 'pool'; }).length, 2, 'standard budget: 2 optional');
  const row = r[0];
  eq(row.id, 'g2|W01|' + row.itemId);
  eq(Object.keys(row).sort(), ctx.WI_SCHEMA.tabs.Checklist.slice().sort(), 'row keys are exactly the Checklist columns');
  eq(WI.buildWeek(Object.assign({}, D, { checklist: r }), 'W01', '2026-11-21T09:00:00+07:00').length, 0, 'idempotent');
});
test('buildWeek: pool picks are stable (hash of student + week)', function () {
  const a = ids(WI.buildWeek(F2(), 'W01', '2026-11-21T08:00:00+07:00')).filter(function (x) { return /^X-/.test(x); });
  const b = ids(WI.buildWeek(F2(), 'W01', '2026-11-22T20:00:00+07:00')).filter(function (x) { return /^X-/.test(x); });
  eq(a, b);
  const c = ids(WI.buildWeek(F3(), 'W01', '2026-11-21T08:00:00+07:00')).filter(function (x) { return /^X-/.test(x); });
  eq(c.length, 4, 'stretch: 4 optional');
  eq(ids(WI.buildWeek(F1(), 'W01', '2026-11-21T08:00:00+07:00')).filter(function (x) { return /^X-/.test(x); }).length, 0, 'light: no optional');
});
test('buildWeek: three fixtures across W01–W13 (all done each week)', function () {
  [F1, F2, F3].forEach(function (mk) {
    const D = mk();
    for (let w = 1; w <= 13; w++) {
      const wid = WI.weekIdAt(w);
      ensureWeek(D, monday(wid));
      ok(rows(D, wid).length > 0, D.student.id + ' has rows in ' + wid);
      tickAll(D, wid, ['required', 'recommended']);
      D.reviews.push({ id: D.student.id + '|' + wid, weekId: wid, submittedAt: WI.weekRange(wid).sunday + 'T19:00:00+07:00', onTime: true });
    }
    const all = ids(D.checklist);
    WI.fixedItems().forEach(function (it) { ok(all.indexOf(it.id) >= 0, D.student.id + ' never got ' + it.id); });
    ok(rows(D, 'W13').every(function (r) { return r.itemId !== 'H-W13-4'; }), 'no weekly review item in W13');
    ok(rows(D, 'W06').filter(function (r) { return r.source !== 'carried'; }).every(function (r) { return r.kind === 'optional' || r.kind === 'own'; }), 'light week W06 all optional');
    ok(rows(D, 'W07').filter(function (r) { return r.source !== 'carried'; }).every(function (r) { return r.kind === 'optional' || r.kind === 'own'; }), 'light week W07 all optional');
    const dupe = {};
    D.checklist.forEach(function (r) { ok(!dupe[r.id], 'duplicate row ' + r.id); dupe[r.id] = true; });
  });
});
test('choice rules fire once, in their first week, per fixture', function () {
  const D = F3();
  for (let w = 1; w <= 4; w++) { ensureWeek(D, monday(WI.weekIdAt(w))); tickAll(D, WI.weekIdAt(w), ['required', 'recommended', 'optional']); }
  const c = D.checklist.filter(function (r) { return r.source === 'choice-driven'; });
  const n = {};
  c.forEach(function (r) { n[r.itemId] = (n[r.itemId] || 0) + 1; });
  Object.keys(n).forEach(function (k) { eq(n[k], 1, k + ' fired more than once'); });
  eq(Object.keys(n).length, 20, 'F3 (everything, route shift, stretch) gets 20 rules');
  ok(!n['C-LIGHT'] && !n['C-UTIL'] && !n['C-PLAY'] && n['C-ASK'] && n['C-NARROW'] && n['C-BRIDGE'] && n['C-SHIFT']);
  eq(D.checklist.filter(function (r) { return r.itemId === 'C-PRIVATE'; })[0].weekId, 'W02', 'online rule from W02');
  const D1 = F1();
  ensureWeek(D1, monday('W02'));
  const c1 = ids(D1.checklist.filter(function (r) { return r.source === 'choice-driven'; })).sort();
  eq(c1, ['C-LIGHT', 'C-SCHOOL', 'C-UTIL'], 'F1 (in person only, light)');
});
test('phase-2 choice instances fire only for choices new at the Pivot', function () {
  const D = F1();
  ensureWeek(D, monday('W07'));
  D.plans.push(V.plan1('g1', { id: 'g1-p2', phase: 2, targetGroups: ['tg_school', 'tg_family'], ideas: ['id_speak', 'id_memes'], timeBudget: 'light', route: 'utility', variableChanged: 'audience', p2Hypothesis: 'Family will learn it faster.' }));
  ensureWeek(D, monday('W08'));
  const p2 = ids(D.checklist.filter(function (r) { return /^C-[A-Z]+-2$/.test(r.itemId); })).sort();
  eq(p2, ['C-FAMILY-2', 'C-MEME-2', 'C-NOFACE-2'], 'new choices only (school and utility were already there; memes also fires C-NOFACE)');
  eq(WI.itemDef('C-FAMILY-2', D).feeds, ['LAB-POST']);
});
test('carry-over across a three-week absence', function () {
  const D = F2();
  ensureWeek(D, '2026-11-21T08:00:00+07:00');
  tickAll(D, 'W01', ['required']);                       // W01 required done, recommended left open
  const openRec = rows(D, 'W01').filter(function (r) { return r.status === 'open' && r.kind === 'recommended' && !/^H-/.test(r.itemId); });
  ok(openRec.length > 0);
  ensureWeek(D, '2026-12-14T09:00:00+07:00');            // back in W05 after W02–W04 untouched
  eq(D.state.weekId, 'W05');
  const x = openRec[0].itemId;
  const chain = D.checklist.filter(function (r) { return r.itemId === x; }).map(function (r) { return r.weekId + ':' + r.status + ':' + r.carryCount; });
  eq(chain, ['W01:carried:0', 'W02:carried:1', 'W03:carried:2', 'W04:carried:3', 'W05:open:4']);
  const last = D.checklist.filter(function (r) { return r.itemId === x && r.weekId === 'W05'; })[0];
  eq([last.source, last.originWeek, last.dueDate], ['carried', 'W01', openRec[0].dueDate]);
  const opt = rows(D, 'W01').filter(function (r) { return r.kind === 'optional'; });
  ok(opt.length && opt.every(function (r) { return r.status === 'expired'; }), 'optional rows expire at roll-over');
  ok(WI.isOverdue(last, '2026-12-14T09:00:00+07:00'));
});
test('light weeks: carried required items keep their kind, are not overdue until W08', function () {
  const D = F2();
  ensureWeek(D, monday('W05'));
  tickAll(D, 'W01', ['required', 'recommended']); tickAll(D, 'W02', ['required', 'recommended']);
  ensureWeek(D, monday('W06'));
  const car = rows(D, 'W06').filter(function (r) { return r.source === 'carried' && r.kind === 'required'; });
  ok(car.length > 0, 'some required items carried into W06');
  ok(car.every(function (r) { return r.afterBreak === true; }));
  ok(!WI.isOverdue(car[0], '2026-12-23T10:00:00+07:00'), 'not overdue in W06');
  eq(WI.flags(D, '2026-12-23T10:00:00+07:00').indexOf('F_CANNOT'), -1);
  ensureWeek(D, monday('W08'));
  const again = rows(D, 'W08').filter(function (r) { return r.itemId === car[0].itemId; })[0];
  ok(again && again.kind === 'required' && WI.isOverdue(again, '2027-01-05T10:00:00+07:00'), 'overdue again from W08');
  ok(rows(D, 'W06').some(function (r) { return r.itemId === 'H-W06-4' && r.kind === 'optional'; }), 'light-week review is optional');
});
test('"could not do" and dropped optional are not carried', function () {
  const D = F2();
  ensureWeek(D, '2026-11-21T08:00:00+07:00');
  const req = rows(D, 'W01').filter(function (r) { return r.kind === 'required'; })[0];
  const opt = rows(D, 'W01').filter(function (r) { return r.kind === 'optional'; })[0];
  eq(WI.canSetStatus(req, 'dropped').ok, false, 'required cannot be dropped');
  eq(WI.canSetStatus(req, 'dropped').code, 'FORBIDDEN');
  ok(WI.canSetStatus(opt, 'dropped').ok);
  req.status = 'cannot'; req.reason = 'I was ill all weekend.';
  opt.status = 'dropped';
  const prev = WI.previewWeek(D, 'W01', '2026-11-22T10:00:00+07:00', { decisions: {}, nextPrefs: { skip: [], own: [{ title: 'Teach my cousin the word' }] } });
  ok(ids(prev).indexOf(req.itemId) < 0 && ids(prev).indexOf(opt.itemId) < 0);
  ok(prev.some(function (r) { return r.source === 'own' && r.title === 'Teach my cousin the word'; }), 'own item from the review');
  ensureWeek(D, monday('W02'));
  ok(ids(rows(D, 'W02')).indexOf(req.itemId) < 0, 'cannot is not carried');
  ok(WI.flags(D, monday('W02')).indexOf('F_CANNOT') >= 0);
});
test('review prefs: skipped optional ids and own items (max 5) apply to the next week', function () {
  const D = F2();
  ensureWeek(D, '2026-11-21T08:00:00+07:00');
  const preview = WI.previewWeek(D, 'W01', '2026-11-22T10:00:00+07:00', {});
  const pools = ids(preview).filter(function (x) { return /^X-/.test(x); });
  ok(pools.length === 2);
  const own = [];
  for (let i = 0; i < 7; i++) own.push({ title: 'My own item number ' + i });
  D.reviews.push({ id: 'g2|W01', weekId: 'W01', submittedAt: '2026-11-22T10:00:00+07:00', onTime: true, nextPrefs: { skip: [pools[0]], own: own, moved: [] } });
  ensureWeek(D, monday('W02'));
  const w2 = rows(D, 'W02');
  ok(ids(w2).indexOf(pools[0]) < 0, 'skipped optional removed');
  eq(ids(w2).filter(function (x) { return /^X-/.test(x); }), [pools[1]], 'and not replaced');
  eq(w2.filter(function (r) { return r.source === 'own'; }).length, 5, 'own items capped at 5');
  eq(WI.ownItemCount(D, 'W02'), 5);
  ok(/^O-[0-9a-f]{8}$/.test(w2.filter(function (r) { return r.source === 'own'; })[0].itemId));
});
test('plan-action placement by whenDate, moves, and done when an action links to it', function () {
  const D = F2();
  ensureWeek(D, '2026-11-21T08:00:00+07:00');
  const pa = D.planActions;
  ok(ids(rows(D, 'W01')).indexOf('P-' + pa[0].id) >= 0, 'pa0 (22 Nov) in W01');
  ok(ids(rows(D, 'W01')).indexOf('P-' + pa[1].id) < 0, 'pa1 (26 Nov) not in W01');
  D.reviews.push({ id: 'g2|W01', weekId: 'W01', submittedAt: '2026-11-22T10:00:00+07:00', nextPrefs: { moved: [{ planActionId: pa[2].id, whenDate: '2026-11-28' }] } });
  ensureWeek(D, monday('W02'));
  ok(ids(rows(D, 'W02')).indexOf('P-' + pa[1].id) >= 0);
  ok(ids(rows(D, 'W02')).indexOf('P-' + pa[2].id) >= 0, 'moved action placed in W02');
  const row = rows(D, 'W02').filter(function (r) { return r.itemId === 'P-' + pa[1].id; })[0];
  eq([row.refId, row.dueDate, row.kind, row.source], [pa[1].id, '2026-11-26', 'recommended', 'plan-action']);
  eq(WI.itemDone(D, row), false);
  D.actions.push({ id: 'ac_000000000009', date: '2026-11-26', weekId: 'W02', planActionId: pa[1].id, channelId: 'ch_school', what: 'x', outcome: 'as_planned' });
  eq(WI.itemDone(D, row), true);
  ok(WI.autoTicks(D, 'W02', '2026-11-26T20:00:00+07:00').some(function (u) { return u.id === row.id && u.doneBy === 'auto'; }));
  eq(WI.planOverload(F1(), 'W01').limit, 1);
});
test('audit habit item appears only when an audit is assigned (R2)', function () {
  const D = F2();
  ensureWeek(D, monday('W04'));
  ok(ids(rows(D, 'W04')).indexOf('H-W04-5') < 0);
  D.audits.mine.push({ id: 'W03|g2', weekId: 'W03', auditorId: 'g2', authorId: 'g3', assignedAt: '2026-12-07T00:10:00+07:00', status: 'assigned' });
  const top = WI.buildWeek(D, 'W04', '2026-12-07T00:11:00+07:00');
  eq(ids(top), ['H-W04-5']);
  D.checklist = D.checklist.concat(top);
  eq(WI.checks['week.audit'](D, 'W04'), false);
  D.audits.mine[0].status = 'done';
  eq(WI.checks['week.audit'](D, 'W04'), true);
  const R1 = Object.assign(F2(), { config: { release: 1 } });
  R1.audits.mine.push(D.audits.mine[0]);
  eq(ids(WI.buildWeek(R1, 'W04', monday('W04'))).indexOf('H-W04-5'), -1, 'not in release 1');
});
test('release gating: W04+ fixed items need release 2/3, then arrive late', function () {
  const D = Object.assign(F2(), { config: { release: 1 } });
  ensureWeek(D, monday('W04'));
  ok(ids(rows(D, 'W04')).indexOf('F-W04-01') < 0, 'not in release 1');
  D.config.release = 2;
  const top = WI.buildWeek(D, 'W04', '2026-12-08T10:00:00+07:00');
  ok(ids(top).indexOf('F-W04-01') >= 0, 'added on top-up after release 2');
  ok(ids(top).indexOf('F-W08-01') < 0, 'later weeks wait');
});

// ------------------------------------------------------------------ stage, next step, review
test('stage gates (never depend on spread)', function () {
  const D = V.baseBundle('g1');
  eq(WI.stageOf(D, '2026-11-20T10:00:00+07:00'), 's1');
  D.word = V.fullWord('g1');
  eq(WI.stageOf(D, '2026-11-20T10:00:00+07:00'), 's2');
  D.state.rulesTicked = TICKED.slice(); D.planActions = V.planActions('g1', 3, ['2026-11-22']);
  eq(WI.stageOf(D, '2026-11-20T10:00:00+07:00'), 's2', 's3 opens Sat 21 Nov');
  eq(WI.stageOf(D, '2026-11-21T10:00:00+07:00'), 's3');
  D.waves = [{ waveId: 'W1', termKey: 'g1', n: 100, recognised: 0, notSure: 0, comprehended: 0, published: true }];
  eq(WI.stageOf(D, '2026-11-24T10:00:00+07:00'), 's5', 'Wave 1 published');
  D.waves[0].published = false;
  eq(WI.stageOf(D, '2026-11-24T10:00:00+07:00'), 's3');
  D.actions = [1, 2, 3].map(function (i) { return { id: 'ac_' + i, date: '2026-11-2' + i, outcome: 'as_planned' }; });
  D.reviews = [{ id: 'g1|W01', weekId: 'W01', submittedAt: '2026-11-22T10:00:00+07:00' }];
  eq(WI.stageOf(D, '2026-11-25T10:00:00+07:00'), 's3', 's4 opens Thu 26 Nov');
  eq(WI.stageOf(D, '2026-11-26T10:00:00+07:00'), 's4');
  eq(WI.stageOf(D, '2026-12-07T10:00:00+07:00'), 's6');
  eq(WI.stageOf(V.baseBundle('g1'), '2026-12-18T00:00:00+07:00'), 's7');
  eq(WI.stagePath(D, '2026-12-07T10:00:00+07:00').map(function (s) { return s.met ? 1 : 0; }).join(''), '1111010');
});
test('review due from Sunday 00:00; oldest first; light weeks never forced; W13 none', function () {
  const D = F2();
  ensureWeek(D, '2026-11-21T08:00:00+07:00');
  eq(WI.reviewDue(D, '2026-11-21T23:59:59+07:00'), []);
  eq(WI.reviewDue(D, '2026-11-22T00:00:00+07:00'), ['W01']);
  ensureWeek(D, '2026-12-06T09:00:00+07:00');
  eq(WI.reviewDue(D, '2026-12-06T09:00:00+07:00'), ['W01', 'W02', 'W03']);
  eq(WI.nextStep(D, '2026-12-06T09:00:00+07:00').route, '#/review');
  ensureWeek(D, '2026-12-27T09:00:00+07:00');
  ok(WI.reviewDue(D, '2026-12-27T09:00:00+07:00').indexOf('W06') < 0, 'W06 not forced');
  ok(WI.reviewOffered(D, '2026-12-27T09:00:00+07:00').indexOf('W06') >= 0, 'W06 offered');
  ensureWeek(D, '2027-02-14T09:00:00+07:00');
  ok(WI.reviewDue(D, '2027-02-14T09:00:00+07:00').indexOf('W13') < 0);
  ok(WI.reviewOnTime('W01', '2026-11-22T21:00:00+07:00') && !WI.reviewOnTime('W01', '2026-11-23T08:00:00+07:00'));
});
test('next step order', function () {
  const D = V.baseBundle('g1');
  ensureWeek(D, '2026-11-21T08:00:00+07:00');
  eq(WI.nextStep(D, '2026-11-21T08:00:00+07:00').route, '#/first');
  D.word = V.fullWord('g1');
  const s = WI.nextStep(D, '2026-11-21T08:00:00+07:00');
  ok(s.itemId && /^F-W01/.test(s.itemId), 'a required item due soon: ' + JSON.stringify(s));
  ok(s.itemId !== 'F-W01-01', 'items whose check is already true are skipped');
  D.checklist.forEach(function (r) { if (r.kind === 'required') r.status = 'done'; });
  D.feedback = [{ id: 'fb_1', text: 'Nice start', readAt: '' }];
  eq(WI.nextStep(D, '2026-11-21T08:00:00+07:00').label, 'Read T.Chris’s feedback');
  D.feedback[0].readAt = '2026-11-21T09:00:00+07:00';
  const r = WI.nextStep(D, '2026-11-21T08:00:00+07:00');
  ok(r.itemId && D.checklist.filter(function (x) { return x.itemId === r.itemId; })[0].kind === 'recommended');
  D.checklist.forEach(function (x) { x.status = 'done'; });
  eq(WI.nextStep(D, '2026-11-21T08:00:00+07:00').route, '#/log/journal/new');
});

// ------------------------------------------------------------------ predicates
test('predicates: word card, zero baseline, FUDGE, hypotheses, spec sheet', function () {
  const D = V.baseBundle('g1');
  ok(!WI.checks['word.first'](D));
  D.word = V.fullWord('g1');
  ['word.first', 'word.usage', 'word.card', 'word.zb', 'word.submitted', 'word.fudge', 'word.hypotheses', 'word.spec'].forEach(function (k) { ok(WI.checks[k](D), k); });
  D.word.notRudeConfirmed = false; ok(!WI.checks['word.card'](D), 'notRudeConfirmed needed');
  D.word.zb.places.pop(); ok(!WI.checks['word.zb'](D), 'six places needed');
  D.word.fudge.pred.F = 3; ok(!WI.checks['word.fudge'](D), 'FUDGE 0–2');
  D.word.hypotheses.pop(); ok(!WI.checks['word.hypotheses'](D), 'two hypotheses needed');
  D.word.regStatus = 'draft'; ok(!WI.checks['word.submitted'](D));
  eq(WI.fudgeTotal({ F: 2, U: 2, D: 1, G: 1, E: 1 }), { total: 7, band: 'likely' });
  eq(WI.specPassCount(V.fullWord('g1').specSheet), 9);
});
test('predicates: weekly checks and zero-result weeks', function () {
  const D = V.baseBundle('g1');
  ok(!WI.checks['week.action'](D, 'W02') && !WI.checks['week.sightcheck'](D, 'W02'));
  D.journal.push({ id: 'jn_1', date: '2026-11-27', kind: 'zero_result', text: V.text(10) });
  ok(WI.checks['week.action'](D, 'W02') && WI.checks['week.sightcheck'](D, 'W02'), 'a zero-result entry counts');
  ok(!WI.checks['week.journal'](D, 'W02'), 'journal needs 40 words');
  D.journal[0].text = V.text(40);
  ok(WI.checks['week.journal'](D, 'W02'));
  ok(!WI.checks['week.journal'](D, 'W03'));
  D.journal[0].deleted = true;
  ok(!WI.checks['week.journal'](D, 'W02'), 'deleted entries do not count');
});
test('predicates: wave note, hypothesis checks, reports, Summit, article', function () {
  const D = V.baseBundle('g1');
  D.word = V.fullWord('g1');
  D.waveNotes = [{ waveId: 'W1', note: V.text(20) }, { waveId: 'W2', note: '', hypothesisChecks: { h1: 'supported' } }];
  ok(!WI.checks['wave.note.W1'](D), 'wave must be published');
  D.waves = [{ waveId: 'W1', termKey: 'g1', published: true }];
  ok(WI.checks['wave.note.W1'](D));
  ok(!WI.checks['hyp.checked.W2'](D));
  D.waveNotes[1].hypothesisChecks.h2 = 'not_supported';
  ok(WI.checks['hyp.checked.W2'](D), 'not supported counts');
  D.reports = [{ type: 'baseline', status: 'draft' }];
  ok(!WI.checks['report.baseline.ready'](D));
  D.reports[0].status = 'submitted';
  ok(WI.checks['report.baseline.ready'](D));
  D.summit = { abstract: V.text(50), aoaStatement: V.text(25), chartIds: ['ch_waves'], rehearsals: [{}, {}], qa: [1, 2, 3, 4, 5].map(function () { return { answer: V.text(15) }; }),
    selfCheck: { SC1: { rating: 'ready' }, SC2: { rating: 'nearly' }, SC3: { rating: 'ready' }, SC4: { rating: 'ready' }, SC5: { rating: 'not_yet' } },
    sections: { hook: { notes: V.text(20) }, term: { notes: V.text(20) }, approach: { notes: V.text(20) }, evidence: { notes: V.text(20) }, learnings: { notes: V.text(20) }, phase2: { notes: V.text(20) } } };
  ['summit.outline', 'summit.aoa', 'summit.abstract', 'summit.visuals', 'summit.rehearsed2', 'summit.qa5', 'summit.selfcheck'].forEach(function (k) { ok(WI.checks[k](D), k); });
  D.summit.abstract = V.text(56); ok(!WI.checks['summit.abstract'](D), '45–55 words');
  D.article = { title: 'Vronk', wordCount: 2500, abstract: V.text(160), ethics: V.text(60), aiDeclaration: 'I did not use AI tools for this article at all.',
    sections: { intro: { notes: V.text(150) }, methods: { notes: V.text(150) }, results: { notes: V.text(150) }, discussion: { notes: V.text(149) } },
    sources: [1, 2, 3, 4, 5, 6].map(function (i) { return { apa: 'Author, A. (2020). A title of a source.', use: 'For my introduction.' }; }),
    visuals: [1, 2, 3].map(function () { return { caption: 'Figure' }; }),
    peer: { given: [{ n: 1, notes: V.text(80) }, { n: 2, notes: V.text(79) }] }, revisionPlan: V.text(40) };
  ['article.outline', 'article.sources6', 'article.visuals3', 'article.ethics', 'article.ai', 'article.abstract', 'article.words', 'article.sections.MR', 'peer.r1', 'peer.plan'].forEach(function (k) { ok(WI.checks[k](D), k); });
  ok(!WI.checks['article.sections.ID'](D), '299 words is not enough');
  ok(!WI.checks['peer.r2'](D));
});

// ------------------------------------------------------------------ online gate
test('online gate: before/after onlineOpensAt, rules needed, teacher unlock and lock', function () {
  const D = V.baseBundle('g1');
  ok(!WI.onlineUnlocked(D, '2026-11-27T10:00:00+07:00'), 'rules not ticked');
  D.state.rulesTicked = TICKED.slice();
  ok(!WI.onlineUnlocked(D, '2026-11-26T16:29:59+07:00'), 'before 16:30 Thu 26 Nov');
  ok(WI.onlineUnlocked(D, '2026-11-26T16:30:00+07:00'), 'from 16:30');
  eq(WI.onlineStatus(D, '2026-11-26T16:30:00+07:00').shouldSetAuto, true);
  ok(WI.onlineUnlocked(D, '2026-11-26T10:00:00+07:00', { onlineOpensAt: '2026-11-26T09:00:00+07:00' }), 'config changes the time');
  const E = V.baseBundle('g1');
  E.state.onlineUnlocked = true; E.state.onlineUnlockedBy = 'teacher';
  ok(!WI.onlineUnlocked(E, '2026-11-22T10:00:00+07:00'), 'teacher unlock still needs the six rules');
  E.state.onlineUnlocked = false;
  E.state.rulesTicked = TICKED.slice();
  ok(!WI.onlineUnlocked(E, '2026-12-01T10:00:00+07:00'), 'teacher lock wins over auto');
  ok(WI.lockedOnline('action', { channelId: 'ch_tiktok', outcome: 'as_planned' }, D, '2026-11-25T10:00:00+07:00'), 'P9');
  ok(!WI.lockedOnline('action', { channelId: 'ch_school', outcome: 'as_planned' }, D, '2026-11-25T10:00:00+07:00'));
  ok(WI.lockedOnline('sighting', { channelId: 'ch_tiktok', relation: 'me' }, D, '2026-11-25T10:00:00+07:00'));
  ok(!WI.lockedOnline('sighting', { channelId: 'ch_tiktok', relation: 'classmate' }, D, '2026-11-25T10:00:00+07:00'), 'others’ online use can be recorded');
  ok(!WI.lockedOnline('action', { channelId: 'ch_tiktok', outcome: 'as_planned' }, D, '2026-11-27T10:00:00+07:00'));
  ok(!WI.ideaSelectable(D, 'id_influencer'), 'P10');
  D.requests = [{ type: 'ask_first', ideaId: 'id_influencer', status: 'approved' }];
  ok(WI.ideaSelectable(D, 'id_influencer'));
  ok(WI.owned({ relation: 'me' }) && WI.owned({ relation: 'cousin', prompted: 'asked' }) && !WI.owned({ relation: 'cousin', prompted: 'unasked' }));
});

// ------------------------------------------------------------------ XP, badges, streak, ranks
test('XP: one-off awards and awards() returns only new XPLog rows', function () {
  const D = V.baseBundle('g1');
  D.word = V.fullWord('g1'); D.state.rulesTicked = TICKED.slice();
  D.plans = [V.plan1('g1')]; D.planActions = V.planActions('g1', 3, ['2026-11-22']);
  const now = '2026-11-21T10:00:00+07:00';
  const a = WI.awards(D, now);
  eq(a.map(function (x) { return x.eventKey; }).sort(), ['card', 'first', 'plan:1', 'rules', 'zb']);
  eq(WI.xpTotal(a), 20 + 30 + 30 + 10 + 20);
  eq(a[0].id, 'g1|' + a[0].eventKey);
  eq(Object.keys(a[0]).sort(), ctx.WI_SCHEMA.tabs.XPLog.slice().sort(), 'award rows are XPLog rows');
  D.xpLog = a;
  eq(WI.awards(D, now), [], 'idempotent');
  eq(WI.awards(V.baseBundle('g1'), D, D).length, 0, 'three-argument form');
});
test('XP caps: actions 2 a day / 6 a week; journal 1 a day / 3 a week; zero and fail once a week', function () {
  const D = V.baseBundle('g1');
  for (let i = 0; i < 10; i++) {
    const day = '2026-11-2' + (3 + Math.floor(i / 3));
    D.actions.push({ id: 'ac_' + String(i).padStart(12, '0'), date: day, createdAt: day + 'T1' + i % 10 + ':00:00+07:00', weekId: 'W02', channelId: 'ch_school', what: 'x', outcome: i % 2 ? 'changed' : 'as_planned', outcomeReason: i % 2 ? 'The plan moved to another day.' : '', learned: V.text(15) });
  }
  const e = WI.entitlements(D, '2026-11-29T10:00:00+07:00');
  const k = function (p) { return e.filter(function (x) { return x.eventKey.indexOf(p) === 0; }).length; };
  eq(k('ac:'), 6, 'X06 6 a week');
  eq(k('acl:'), 6, 'X07 as X06');
  ok(k('acr:') <= 6 && k('acr:') >= 1, 'X15 as X06');
  const days = {};
  e.filter(function (x) { return x.eventKey.indexOf('ac:') === 0; }).forEach(function (x) {
    const a = D.actions.filter(function (y) { return 'ac:' + y.id === x.eventKey; })[0]; days[a.date] = (days[a.date] || 0) + 1;
  });
  Object.keys(days).forEach(function (d) { ok(days[d] <= 2, 'X06 2 a day on ' + d); });
  const J = V.baseBundle('g1');
  for (let i = 0; i < 6; i++) J.journal.push({ id: 'jn_' + i, date: '2026-11-2' + (3 + Math.floor(i / 2)), weekId: 'W02', kind: 'reflection', text: V.text(45) });
  J.journal.push({ id: 'jn_z1', date: '2026-11-24', weekId: 'W02', kind: 'zero_result', text: V.text(45) });
  J.journal.push({ id: 'jn_z2', date: '2026-11-25', weekId: 'W02', kind: 'zero_result', text: V.text(45) });
  J.journal.push({ id: 'jn_f1', date: '2026-11-25', weekId: 'W02', kind: 'failure_analysis', text: V.text(59) });
  J.journal.push({ id: 'jn_f2', date: '2026-11-26', weekId: 'W02', kind: 'failure_analysis', text: V.text(60) });
  const ej = WI.entitlements(J, '2026-11-29T10:00:00+07:00').map(function (x) { return x.eventKey; });
  eq(ej.filter(function (x) { return /^jn:/.test(x); }).length, 3, 'X08 3 a week');
  eq(ej.filter(function (x) { return x === 'zero:W02'; }).length, 1, 'X09 once a week');
  eq(ej.filter(function (x) { return x === 'fail:W02'; }).length, 1, 'X10 once a week (60 words)');
});
test('XP: already-awarded keys stay, deleting does not remove XP or earn twice', function () {
  const D = V.baseBundle('g1');
  D.actions = [{ id: 'ac_a', date: '2026-11-23', weekId: 'W02', deleted: true }];
  D.xpLog = [{ id: 'g1|ac:ac_a', eventKey: 'ac:ac_a', ruleId: 'X06', xp: 10, at: '2026-11-23T10:00:00+07:00' }];
  const e = WI.entitlements(D, '2026-11-24T10:00:00+07:00');
  eq(e.map(function (x) { return x.eventKey; }), ['ac:ac_a'], 'kept although deleted');
  eq(WI.awards(D, '2026-11-24T10:00:00+07:00'), []);
});
test('XP: checklist items, reviews (+10 on Sunday), could-not-do (3 a week), reports, Summit', function () {
  const D = V.baseBundle('g1');
  D.checklist = [
    { id: 'g1|W02|F-W02-01', weekId: 'W02', itemId: 'F-W02-01', status: 'done', kind: 'required' },
    { id: 'g1|W02|F-W02-04', weekId: 'W02', itemId: 'F-W02-04', status: 'done', kind: 'required' },
    { id: 'g1|W02|H-W02-3', weekId: 'W02', itemId: 'H-W02-3', status: 'done', kind: 'recommended' }
  ];
  ['a', 'b', 'c', 'd'].forEach(function (x) { D.checklist.push({ id: 'g1|W02|O-0000000' + x, weekId: 'W02', itemId: 'O-0000000' + x, status: 'cannot', reason: 'No time this week at all.', kind: 'own' }); });
  D.reviews = [{ weekId: 'W01', submittedAt: '2026-11-22T20:00:00+07:00', wentWell: 'I used my word at lunch twice.' }, { weekId: 'W02', submittedAt: '2026-11-30T08:00:00+07:00', wentWell: 'I logged every action this week.' }, { weekId: 'W03', submittedAt: '2026-11-30T09:00:00+07:00', wentWell: '' }];
  D.reports = [{ type: 'baseline', status: 'ready' }];
  D.summit = { rehearsals: [{}, {}, {}, {}, {}] };
  const e = WI.entitlements(D, '2026-11-30T10:00:00+07:00');
  const by = {};
  e.forEach(function (x) { by[x.eventKey] = x.xp; });
  eq(by['ck:F-W02-01'], 15); eq(by['ck:H-W02-3'], 15);
  ok(!('ck:F-W02-04' in by), 'xp 0 item gives nothing');
  eq([by['rv:W01'], by['rv:W02']], [40, 30]);
  eq(Object.keys(by).filter(function (k) { return /^cant:/.test(k); }).length, 3);
  eq(by['rp:baseline'], 20);
  eq(Object.keys(by).filter(function (k) { return /^sm:reh:/.test(k); }).length, 3, 'max 3 rehearsals');
});
test('XP (P12): sightings, levels, tallies and wave figures change nothing', function () {
  const res = V.run(['V9']).V9;
  eq(res.errors, []);
});
test('badges', function () {
  const D = V.baseBundle('g1');
  eq(WI.badges(D, '2026-11-21T10:00:00+07:00'), {});
  D.word = V.fullWord('g1'); D.state.rulesTicked = TICKED.slice(); D.planActions = V.planActions('g1', 5, ['2026-11-22']);
  D.actions = [1, 2, 3].map(function (i) { return { id: 'ac_' + i, date: '2026-11-2' + i, outcome: 'not_done', outcomeReason: 'It rained and the club stopped.' }; });
  D.journal = [{ id: 'jn_1', date: '2026-11-22', kind: 'failure_analysis', text: V.text(100) }, { id: 'jn_2', date: '2026-11-23', kind: 'zero_result', text: V.text(210) }];
  const b = Object.keys(WI.badges(D, '2026-11-24T10:00:00+07:00')).sort();
  eq(b, ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B09', 'B11', 'B15']);
  D.state.badges = { B01: '2026-11-21T10:00:00+07:00' };
  ok(WI.newBadges(D, '2026-11-24T10:00:00+07:00').indexOf('B01') < 0);
  D.word.zb.fileIds = [];
  ok(!WI.badges(D, '2026-11-24T10:00:00+07:00').B03, 'Clean Slate needs a screenshot');
  D.files = [{ id: 'fl_1', attachType: 'zb' }];
  ok(WI.badges(D, '2026-11-24T10:00:00+07:00').B03);
});
test('streak: consecutive reviews, light weeks never break it, late review breaks it', function () {
  const D = F2();
  ensureWeek(D, monday('W10'));
  function rv(w, at) { D.reviews.push({ id: 'g2|' + w, weekId: w, submittedAt: at || WI.weekRange(w).sunday + 'T19:00:00+07:00' }); }
  ['W01', 'W02', 'W03', 'W04', 'W05'].forEach(function (w) { rv(w); });
  // W06, W07 light: no reviews
  rv('W08'); rv('W09');
  let s = WI.streak(D, '2027-01-18T10:00:00+07:00');
  eq([s.streak, s.best], [7, 7], 'light weeks skipped');
  eq(WI.streak(D, '2027-01-24T10:00:00+07:00').streak, 7, 'W10 window still open');
  rv('W06');
  eq(WI.streak(D, '2027-01-18T10:00:00+07:00').streak, 8, 'a light-week review counts');
  D.reviews = D.reviews.filter(function (r) { return r.weekId !== 'W03'; });
  rv('W03', '2026-12-13T08:00:00+07:00');   // after the W04 review opened
  s = WI.streak(D, '2027-01-18T10:00:00+07:00');
  eq([s.streak, s.best], [5, 5], 'late W03 breaks: W04, W05, W06, W08, W09');
  ok(WI.badges(D, '2027-01-18T10:00:00+07:00').B12 && !WI.badges(D, '2027-01-18T10:00:00+07:00').B13);
});
test('ranks', function () {
  eq(WI.rankOf(0).name, 'Trainee');
  eq(WI.rankOf(99).name, 'Trainee');
  eq(WI.rankOf(100).name, 'Rookie');
  eq(WI.rankOf(1749).name, 'Tour Legend');
  eq(WI.rankOf(1750).name, 'Hall of Famer');
  eq(WI.rankOf(1750).next, null);
  eq(WI.rankOf(175).progress, 0.5);
  eq(WI.boardRows([{ label: 'B', xp: 10 }, { label: 'A', xp: 300 }]).map(function (r) { return r.rank; }), ['Backing Vocalist', 'Trainee']);
});

// ------------------------------------------------------------------ waves
test('corrected recognition = recognition − mean foil rate, may be negative', function () {
  const rows = [
    { waveId: 'W1', termKey: 'g1', n: 100, recognised: 40, notSure: 10, comprehended: 30 },
    { waveId: 'W1', termKey: 'ctrl1', n: 100, recognised: 90, notSure: 5, comprehended: 85 },
    { waveId: 'W1', termKey: 'foil1', n: 100, recognised: 10, notSure: 20, comprehended: 0 },
    { waveId: 'W1', termKey: 'foil2', n: 100, recognised: 20, notSure: 20, comprehended: 0 }
  ];
  const c = WI.corrected(rows);
  eq(c.foilRate, 15);
  eq(c.terms.g1.corrected, 25, 'L6 worked example 40 − 15 = 25');
  eq([c.terms.g1.recPct, c.terms.g1.notSurePct, c.terms.g1.compPct], [40, 10, 30]);
  eq(c.terms.foil1.corrected, null);
  rows[0].recognised = 5;
  eq(WI.corrected(rows).terms.g1.corrected, -10, 'negative is shown as it is');
  eq(WI.pct(33.4), 33);
  eq(WI.corrected([{ termKey: 'g1', n: 0, recognised: 0 }]).terms.g1.recPct, null);
  eq(Object.keys(WI.correctedByWave(rows.concat([{ waveId: 'W2', termKey: 'g1', n: 50, recognised: 5 }]))), ['W1', 'W2']);
  ok(WI.waveCheck({ termKey: 'g1', n: 10, recognised: 5, notSure: 5, comprehended: 10 }).ok);
  eq(WI.waveCheck({ termKey: 'g1', n: 10, recognised: 6, notSure: 5, comprehended: 1 }).field, 'notSure');
  eq(WI.waveCheck({ termKey: 'foil1', n: 10, recognised: 1, notSure: 1, comprehended: 1 }).field, 'comprehended');
  eq(WI.waveCheck({ termKey: 'g1', n: 0, recognised: 0, notSure: 0, comprehended: 0 }).field, 'n');
  const D = V.baseBundle('g1');
  D.waves = rows.map(function (r) { return Object.assign({ published: true }, r); }).concat([{ waveId: 'W1', termKey: 'g2', published: true }, { waveId: 'W2', termKey: 'g1', published: false }]);
  eq(WI.myWaves(D).map(function (r) { return r.termKey; }), ['g1', 'ctrl1', 'foil1', 'foil2']);
});

// ------------------------------------------------------------------ coverage and flags
test('coverage: requirement status and milestone needs', function () {
  const D = F2();
  ensureWeek(D, monday('W02'));
  const s = WI.requirementStatus(D, 'BAS-W1');
  eq(s.items.map(function (x) { return x.itemId; }), ['F-W02-03', 'F-W02-04']);
  eq(s.items[0].status, 'open');
  eq(WI.requirementStatus(D, 'ART-ABS').items[0].status, 'later');
  const m = WI.milestoneNeeds(D, 'M03');
  eq(m.requirements.map(function (r) { return r.requirement.id; }), ['BAS-PROFILE', 'BAS-FUDGE', 'BAS-W1', 'BAS-PLAN', 'BAS-LEN']);
  ok(WI.requirement('A1-RESEARCH').items.indexOf('H-W06-3') < 0, 'light weeks not in coverage');
  ok(WI.flags(D, '2026-11-23T10:00:00+07:00').indexOf('F_DEADLINE') >= 0, 'Baseline report due in 2 days');
  D.flags = [{ id: 'fg_1', status: 'open' }];
  ok(WI.flags(D, '2026-11-23T10:00:00+07:00').indexOf('F_PROBLEM') >= 0);
  D.actions = [{ id: 'ac_x', createdAt: '2026-11-23T09:00:00+07:00', date: '2026-11-23' }];
  ok(WI.flags(D, '2026-11-29T10:00:00+07:00').indexOf('F_QUIET') < 0);
  ok(WI.flags(D, '2026-11-30T09:00:00+07:00').indexOf('F_QUIET') >= 0);
});
// ------------------------------------------------------------------ review round (19 Nov): regressions
test('pos: single quotation marks, punctuation standing alone, words in another script', function () {
  eq(WI.pos.guess('vronk', "I said 'vronk' to her.").rule, 'P21', 'quoted word is found (not P00)');
  eq(WI.pos.guess('vronk', 'I said ‘vronk’ to her.').w, 'vronk');
  eq(WI.pos.guess('crash out', "Don't 'crash out' now.").rule, 'P12');
  eq(WI.pos.guess('vronk', "Please don't vronk my project.").rule, 'P12', 'the apostrophe in don’t stays');
  const a = WI.pos.guess('vronk', 'It was a vronk , honestly.');
  eq([a.pos, a.conf, a.rule], ['noun', 'high', 'P10'], 'a comma standing alone still ends the clause');
  eq(WI.pos.guess('vronk', 'That is so vronk !').rule, 'P14');
  eq(WI.pos.guess('vronk', 'Vronk !').rule, 'P01');
  const t = WI.pos.guess('vronk', 'ฉัน vronk ทุกวัน');
  eq([t.pos, t.rule], ['unknown', 'P21'], 'Thai words round it: not "the sentence is only the target"');
  eq(WI.pos.guess('vronk', 'Vronk 😂').rule, 'P01', 'an emoji is not a word');
});
test('time: a date-time without a zone is Bangkok time, whatever the machine zone', function () {
  eq(WI.weekIdOf('2026-11-22T23:59:00'), 'W01');
  eq(WI.weekIdOf('2026-11-23T00:00:00'), 'W02');
  eq(WI.weekIdOf('2026-11-22 23:59'), 'W01');
  eq(WI.dateOf('2026-11-22T23:59:59'), '2026-11-22');
  eq(WI.weekIdOf('2026-11-22T16:59:59.999Z'), 'W01');
  eq(WI.weekIdOf('2026-11-22T17:00:00.000Z'), 'W02');
});
test('online gate: the exact opening second', function () {
  const D = student('g1', {});
  ok(!WI.onlineUnlocked(D, '2026-11-26T16:29:59+07:00'));
  ok(WI.onlineUnlocked(D, '2026-11-26T16:30:00+07:00'));
  ok(WI.onlineUnlocked(D, '2026-11-26T09:30:00Z'), 'same instant in UTC');
  D.state.rulesTicked = ['x', 'x', 'x', 'x', 'x', ''];
  ok(!WI.onlineUnlocked(D, '2026-12-01T10:00:00+07:00'), 'five ticks are not enough');
  ok(WI.lockedOnline('action', { channelId: 'ch_tiktok', outcome: 'as_planned' }, D, '2026-12-01T10:00:00+07:00'));
  ok(!WI.lockedOnline('sighting', { channelId: 'ch_tiktok', relation: 'friend_class' }, D, '2026-12-01T10:00:00+07:00'), 'someone else online can always be recorded');
});
test('late start (first sign-in in W02): W01 hands on its fixed items only, and has no review', function () {
  const D = student('g1', {});
  D.word = { studentId: 'g1' }; D.plans = []; D.state.rulesTicked = ['', '', '', '', '', ''];
  const now = '2026-11-23T08:00:00+07:00';
  ensureWeek(D, now);
  eq(ids(rows(D, 'W01')).filter(function (x) { return !/^F-W01-/.test(x); }), [], 'W01 has fixed items only');
  eq(rows(D, 'W01').length, 8);
  ok(rows(D, 'W01').every(function (r) { return r.status === 'carried'; }));
  const w2 = rows(D, 'W02');
  eq(w2.filter(function (r) { return r.source === 'carried'; }).length, 8, 'the eight W01 items arrive as carried');
  ok(ids(w2).indexOf('H-W02-4') >= 0 && ids(w2).indexOf('H-W01-4') < 0);
  eq(WI.startWeekId(D), 'W02');
  eq(WI.reviewDue(D, now), [], 'no review of a week she never had');
  eq(WI.reviewDue(D, '2026-11-29T00:00:00+07:00'), ['W02']);
  // a student who was there in W01 and then away still owes her reviews (SPEC §5.5)
  const E = F1();
  ensureWeek(E, '2026-11-21T08:00:00+07:00');
  ensureWeek(E, '2026-12-08T08:00:00+07:00');
  eq(WI.reviewDue(E, '2026-12-08T08:00:00+07:00'), ['W01', 'W02', 'W03']);
});
test('an unticked optional proposal is left out, not replaced by another one', function () {
  const D = F2();
  ensureWeek(D, '2026-11-21T08:00:00+07:00');
  const pools = ids(WI.previewWeek(D, 'W01', '2026-11-22T10:00:00+07:00', {})).filter(function (x) { return /^X-/.test(x); });
  const after = ids(WI.previewWeek(D, 'W01', '2026-11-22T10:00:00+07:00', { nextPrefs: { skip: [pools[0]] } })).filter(function (x) { return /^X-/.test(x); });
  eq(after, [pools[1]]);
  D.reviews.push({ id: 'g2|W01', weekId: 'W01', submittedAt: '2026-11-22T10:00:00+07:00', onTime: true, nextPrefs: { skip: pools, own: [], moved: [] } });
  ensureWeek(D, monday('W02'));
  ensureWeek(D, '2026-11-25T10:00:00+07:00');
  eq(ids(rows(D, 'W02')).filter(function (x) { return /^X-/.test(x); }), [], 'top-ups in the week do not bring others back');
});
test('required and recommended items can never be dropped', function () {
  const D = F1();
  ensureWeek(D, '2026-11-21T08:00:00+07:00');
  const req = rows(D, 'W01').filter(function (r) { return r.kind === 'required' && !/^H-/.test(r.itemId); })[0];
  const rec = rows(D, 'W01').filter(function (r) { return r.kind === 'recommended' && !/^H-/.test(r.itemId); })[0];
  eq(WI.canSetStatus(req, 'dropped', D).ok, false);
  eq(WI.canSetStatus(rec, 'dropped', D).ok, false);
  eq(WI.canSetStatus(req, 'cannot', D).ok, true);
  const dec = {};
  dec[req.itemId] = 'dropped'; dec[rec.itemId] = 'dropped';
  const prev = ids(WI.previewWeek(D, 'W01', '2026-11-22T10:00:00+07:00', { decisions: dec }));
  ok(prev.indexOf(req.itemId) >= 0 && prev.indexOf(rec.itemId) >= 0, 'a forged "dropped" decision still carries the item');
  // every catalogue item of kind required stays required on every row the engine makes outside the light weeks
  const E = F3();
  ensureWeek(E, '2026-11-21T08:00:00+07:00');
  for (let w = 2; w <= 13; w++) ensureWeek(E, monday(WI.weekIdAt(w)));
  E.checklist.forEach(function (r) {
    const it = WI.itemDef(r.itemId, E);
    if (it && it.kind === 'required' && r.source !== 'choice-driven' && !WI.isLightWeek(r.weekId)) eq(r.kind, 'required', r.id);
    if (r.kind === 'required') eq(WI.canSetStatus(r, 'dropped', E).ok, false, r.id);
  });
});
test('weekly habits expire at roll-over instead of carrying (lead decision 19 Nov)', function () {
  const D = F1();
  ensureWeek(D, '2026-11-21T08:00:00+07:00');
  ensureWeek(D, monday('W03'));
  ok(!rows(D, 'W03').some(function (x) { return /^H-W0[12]-/.test(x.itemId); }), 'no old habit rows in W03');
  ok(rows(D, 'W01').filter(function (x) { return /^H-W01-/.test(x.itemId); }).every(function (x) { return x.status !== 'open' && x.status !== 'carried'; }), 'W01 habits closed as expired');
  ok(rows(D, 'W03').every(function (x) { return x.title.length <= 90 || /^C-/.test(x.itemId); }));
});
test('light weeks: a safety item made optional there comes back after the break; late fixed items wait too', function () {
  const D = F1();
  ensureWeek(D, '2026-11-21T08:00:00+07:00');
  for (let w = 1; w <= 6; w++) { tickAll(D, WI.weekIdAt(w), ['required', 'recommended']); ensureWeek(D, monday(WI.weekIdAt(w + 1))); tickAll(D, WI.weekIdAt(w), ['required', 'recommended']); }
  // she adds TikTok at the Pivot, in the light week W07
  D.plans.push(V.plan1('g1', { id: 'g1-p2', phase: 2, platforms: ['pf_tiktok'], ideas: ['id_speak', 'id_tiktok'] }));
  ensureWeek(D, '2026-12-30T17:00:00+07:00');
  const made = rows(D, 'W07').filter(function (r) { return r.itemId === 'C-PRIVATE-2'; })[0];
  ok(made && made.kind === 'optional', 'optional while the light week lasts');
  ensureWeek(D, monday('W08'));
  eq(made.status, 'expired');
  const back = rows(D, 'W08').filter(function (r) { return r.itemId === 'C-PRIVATE-2'; });
  eq(back.length, 1);
  eq(back[0].kind, 'required');
  ensureWeek(D, monday('W09'));
  eq(D.checklist.filter(function (r) { return r.itemId === 'C-PRIVATE-2' && r.weekId === 'W09'; }).length, 1, 'then it carries like any required item');
  eq(D.checklist.filter(function (r) { return r.itemId === 'C-LIGHT'; }).length, 1, 'an optional choice item is not made twice');
  // release 2 switched on in the exam week: the W04–W05 items arrive, but are not overdue until W08
  const E = F1();
  E.config.release = 1;
  ensureWeek(E, '2026-11-21T08:00:00+07:00');
  for (let w = 2; w <= 6; w++) ensureWeek(E, monday(WI.weekIdAt(w)));
  E.config.release = 2;
  ensureWeek(E, '2026-12-22T10:00:00+07:00');
  const late = rows(E, 'W06').filter(function (r) { return r.itemId === 'F-W05-01'; })[0];
  ok(late && late.kind === 'required');
  ok(!WI.isOverdue(late, '2026-12-23T10:00:00+07:00'));
  delete late.afterBreak;
  ok(!WI.isOverdue(late, '2026-12-23T10:00:00+07:00'), 'also after a round trip through the Sheet');
});
test('week boundaries: review opens at Sunday 00:00, the week turns at Monday 00:00 (every week)', function () {
  for (let w = 1; w <= 12; w++) {
    const wid = WI.weekIdAt(w), r = WI.weekRange(wid);
    eq(WI.reviewOpensAt(wid), r.end + 'T00:00:00+07:00');
    eq(WI.dow(r.end), 0);
    eq(WI.weekIdOf(WI.parse(r.end + 'T23:59:59+07:00') + 999), wid, 'Sunday 23:59:59.999');
    eq(WI.weekIdOf(WI.parse(r.end + 'T23:59:59+07:00') + 1000), WI.weekIdAt(w + 1), 'Monday 00:00:00.000');
    ok(WI.reviewOnTime(wid, r.end + 'T00:00:00+07:00') && WI.reviewOnTime(wid, r.end + 'T23:59:59+07:00'));
    ok(!WI.reviewOnTime(wid, WI.addDays(r.end, 1) + 'T00:00:00+07:00') && !WI.reviewOnTime(wid, WI.addDays(r.end, -1) + 'T23:59:59+07:00'));
  }
});
test('validator: all W4 checks pass', function () {
  const res = V.run(['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V9', 'V12']);
  Object.keys(res).forEach(function (k) { eq(res[k].errors, [], k); });
});
test('engine runs in a plain vm without window (Apps Script style)', function () {
  const vm = require('vm'), fs = require('fs'), path = require('path');
  const c = vm.createContext({});
  ['schema.js', 'data/plan.js', 'data/choices.js', 'data/rules.js', 'data/game.js', 'data/checklist.js', 'data/coverage.js', 'engine.js'].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(load.ROOT, f), 'utf8'), c, { filename: f });
  });
  eq(c.WI.pos.guess('vronk', 'Vronk!').rule, 'P01');
  ok(c.WI.buildWeek({ student: { id: 'g1' } }, 'W01', '2026-11-21T08:00:00+07:00').length > 5);
});

console.log('unit: ' + passed + ' passed, ' + failed + ' failed');
fails.forEach(function (f) { console.log('  FAIL ' + f); });
process.exit(failed ? 1 : 0);
