#!/usr/bin/env node
/* W6 dry run: the three personas end to end against the LOCAL mock backend only.
   Needs: node tools/mock-server.js --port 8790   and   python3 -m http.server 8765 (repo root)
   Run:   NODE_PATH=$(npm root -g) node tools/walkthrough/dryrun.js [--only B1,C1] [--out <dir>] [--headed]
   The harness signs each guest in (dry run only), then loads the bot exactly as it will be loaded
   live (loader.js: same-origin fetch + SHA-256 check + eval), waits for it, and checks /__dump.
   C1 stops at every checkpoint so a screenshot of each key screen is saved in <out>/shots.
   --resume B2: reload in the middle of a run, resume, then run a third time (idempotence check). */
'use strict';
var fs = require('fs'), path = require('path');
var pw = require('playwright');
var WEB = process.env.WI_WEB || 'http://127.0.0.1:8765';
var API = process.env.WI_API || 'http://127.0.0.1:8790';
var NOW = process.argv.indexOf('--now') > 0 ? process.argv[process.argv.indexOf('--now') + 1] : '2026-11-21T10:00:00+07:00';
function arg(n, d) { var i = process.argv.indexOf('--' + n); return i < 0 ? d : (process.argv[i + 1] && process.argv[i + 1].indexOf('--') ? process.argv[i + 1] : true); }
var OUT = arg('out', path.join(path.resolve(__dirname, '..', '..', '..'), 'wi-scratch', 'W6'));
var SHOTS = path.join(OUT, 'shots');
var ONLY = String(arg('only', 'B1,B2,C1')).split(',');
fs.mkdirSync(SHOTS, { recursive: true }); fs.mkdirSync(path.join(OUT, 'summaries'), { recursive: true });
var DIR = __dirname;
var PIN = { g1: '1111', g2: '2222', g3: '3333', s01: '0001' }; // fake roster of the mock (Roster.example.gs)
var CONFIG_JS = "window.WI_CONFIG={apiUrl:'" + API + "/exec',release:1,version:'dryrun'};";
var fails = [];
function no(m) { fails.push(m); console.log('  FAIL ' + m); }
function ok(c, m) { if (!c) no(m); else console.log('  ok   ' + m); }
function post(p, b) { return fetch(API + p, { method: 'POST', body: JSON.stringify(b || {}) }).then(function (r) { return r.json(); }); }
function dump(tab) { return fetch(API + '/__dump?tab=' + tab).then(function (r) { return r.json(); }).then(function (d) { return d.rows || []; }); }
function truthy(v) { return v === true || v === 'TRUE' || v === 'true'; }
function J(v) { if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch (e) { return v; } }
function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }

async function signIn(p, sid) {
  await p.goto(WEB + '/index.html#/login');
  await p.waitForSelector('#f_sid', { timeout: 15000 });
  await p.selectOption('#f_sid', sid);
  await p.fill('#f_pin', PIN[sid]);
  await p.click('#lgf button[type=submit]');
  await p.waitForFunction(function () { return !/login/.test(location.hash) && window.WIApp && window.WIApp.data(); }, null, { timeout: 15000 });
  await p.waitForTimeout(600);
}

async function sheetCheck(persona) {
  var sid = persona.studentId, out = {}, bad = [];
  var tabs = ['Words', 'Plans', 'PlanActions', 'Actions', 'Journal', 'Sightings', 'Tallies', 'Files', 'Reports', 'Flags', 'Requests', 'Checklist', 'State', 'XPLog', 'Reviews'];
  for (var t of tabs) {
    var rows = (await dump(t)).filter(function (r) { return r.studentId === sid && !truthy(r.deleted); });
    out[t] = rows;
  }
  var n = {}; Object.keys(out).forEach(function (k) { n[k] = out[k].length; });
  function once(tab, key, list, label) {
    list.forEach(function (x) {
      var hits = out[tab].filter(function (r) { return norm(r[key]) === norm(x); }).length;
      if (hits !== 1) bad.push(tab + ': "' + String(x).slice(0, 40) + '" found ' + hits + ' times' + (label ? ' (' + label + ')' : ''));
    });
  }
  var w = out.Words[0] || {};
  if (out.Words.length !== 1) bad.push('Words rows ' + out.Words.length);
  if (norm(w.word) !== persona.first.word) bad.push('word is "' + w.word + '"');
  if (!truthy(w.posConfirmed)) bad.push('posConfirmed not TRUE');
  if (w.pos !== persona.first.pos) bad.push('pos ' + w.pos + ' (wanted ' + persona.first.pos + ')');
  if (w.regStatus !== 'submitted') bad.push('regStatus ' + w.regStatus);
  if (!truthy(w.notRudeConfirmed)) bad.push('notRudeConfirmed not TRUE');
  var zb = J(w.zb) || {}; if (!zb.places || zb.places.length !== 6) bad.push('zb places ' + (zb.places || []).length);
  var fu = (J(w.fudge) || {}).pred || {}; ['F', 'U', 'D', 'G', 'E'].forEach(function (L) { if (Number(fu[L]) !== persona.fudge[L][0]) bad.push('FUDGE ' + L + ' ' + fu[L]); });
  var hy = J(w.hypotheses) || []; if (hy.length !== persona.hyp.hypotheses.length) bad.push('hypotheses ' + hy.length);
  var sp = J(w.specSheet) || {}; if (Object.keys(sp).length !== 10) bad.push('spec rows ' + Object.keys(sp).length);
  if (out.Plans.length !== 1) bad.push('Plans rows ' + out.Plans.length);
  once('PlanActions', 'what', persona.planActions.map(function (a) { return a.what; }));
  if (out.PlanActions.length !== persona.planActions.length) bad.push('PlanActions ' + out.PlanActions.length);
  once('Actions', 'what', persona.actions.map(function (a) { return a.what; }));
  if (out.Actions.length !== persona.actions.length) bad.push('Actions ' + out.Actions.length);
  once('Journal', 'text', persona.journal.map(function (a) { return a.text; }));
  if (out.Journal.length !== persona.journal.length) bad.push('Journal ' + out.Journal.length);
  once('Sightings', 'quote', persona.sightings.map(function (a) { return a.quote; }));
  if (out.Sightings.length !== persona.sightings.length) bad.push('Sightings ' + out.Sightings.length);
  out.Sightings.forEach(function (s) { var want = persona.sightings.filter(function (x) { return norm(x.quote) === norm(s.quote); })[0]; if (want && Number(s.level) !== want.level) bad.push('sighting level ' + s.level + ' for "' + s.quote + '"'); });
  once('Tallies', 'note', persona.tallies.map(function (a) { return a.note; }));
  if (out.Tallies.length !== persona.tallies.length) bad.push('Tallies ' + out.Tallies.length);
  var wantFiles = (persona.zb.shot ? 1 : 0) + persona.sightings.filter(function (s) { return s.shot; }).length;
  if (out.Files.length !== wantFiles) bad.push('Files ' + out.Files.length + ' (wanted ' + wantFiles + ')');
  out.Files.forEach(function (f) { if (!truthy(f.cropConfirmed)) bad.push('file without cropConfirmed'); });
  var shotSight = out.Sightings.filter(function (s) { return (J(s.fileIds) || []).length; }).length;
  if (shotSight !== persona.sightings.filter(function (s) { return s.shot; }).length) bad.push('sightings with a screenshot: ' + shotSight);
  if (persona.zb.shot && !((zb.fileIds || []).length)) bad.push('zero-baseline record has no screenshot id');
  var rp = out.Reports.filter(function (r) { return r.type === 'baseline'; });
  if (rp.length !== 1) bad.push('baseline report rows ' + rp.length);
  else {
    if (rp[0].status !== 'ready') bad.push('report status ' + rp[0].status);
    var secs = J(rp[0].sections) || {};
    ['profile', 'fudge', 'wave1', 'plan', 'ai'].forEach(function (k) { if (norm(secs[k]) !== norm(persona.report[k])) bad.push('report section ' + k + ' differs'); });
  }
  var fl = out.Flags;
  if (persona.problem) { once('Flags', 'note', [persona.problem.note]); if (fl[0] && fl[0].category !== persona.problem.category) bad.push('flag category ' + fl[0].category); }
  else if (fl.length) bad.push('unexpected flags ' + fl.length);
  if (out.Requests.length) bad.push('unexpected requests ' + out.Requests.length);
  var own = out.Checklist.filter(function (r) { return r.source === 'own'; });
  if (own.length !== 1 || norm(own[0].title) !== norm(persona.week.own.title)) bad.push('own items ' + own.length);
  var manual = out.Checklist.filter(function (r) { return r.status === 'done' && r.doneBy === 'manual'; });
  if (manual.length !== persona.week.tickCount) bad.push('hand ticks ' + manual.length + ' (wanted ' + persona.week.tickCount + ')');
  var stt = out.State[0] || {};
  var rt = J(stt.rulesTicked) || [];
  if (rt.filter(Boolean).length !== 6) bad.push('rulesTicked ' + rt.filter(Boolean).length);
  var xpKeys = {}; out.XPLog.forEach(function (x) { xpKeys[x.eventKey] = (xpKeys[x.eventKey] || 0) + 1; });
  var dupXp = Object.keys(xpKeys).filter(function (k) { return xpKeys[k] > 1; });
  if (dupXp.length) bad.push('XP awarded twice: ' + dupXp.join(','));
  var autoDone = out.Checklist.filter(function (r) { return r.status === 'done' && r.doneBy === 'auto'; }).map(function (r) { return r.itemId; });
  return { counts: n, bad: bad, xp: Number(stt.xp) || 0, stage: stt.stage, autoDone: autoDone, manual: manual.map(function (r) { return r.title; }), checklist: out.Checklist.map(function (r) { return r.itemId + ':' + r.status + (r.doneBy ? '/' + r.doneBy : ''); }) };
}

/* --resume <ID>: start the run, reload the page in the middle (the bot dies with it), paste the loader
   again (it resumes from app state), then sign in once more and run a third time: nothing may be added. */
async function resumeTest(p, id) {
  var persona = JSON.parse(fs.readFileSync(path.join(DIR, 'personas', id + '.json'), 'utf8'));
  var loader = fs.readFileSync(path.join(DIR, 'loader.js'), 'utf8');
  console.log('\n== resume test ' + id);
  await signIn(p, persona.studentId);
  await p.evaluate(function () { window.WIBOT_OPTS = {}; });
  console.log('  ' + await p.evaluate(loader));
  await p.waitForFunction(function () { return window.WIBOT && WIBOT.summary().steps.actions === 'done'; }, null, { timeout: 300000 });
  await p.waitForTimeout(1500);
  console.log('  reload in the middle of: ' + await p.evaluate(function () { return location.hash; }));
  await p.reload(); await p.waitForTimeout(1500);
  console.log('  ' + await p.evaluate(loader));
  await p.waitForFunction(function () { return window.WIBOT && !WIBOT.running; }, null, { timeout: 600000 });
  var s2 = await p.evaluate(function () { return WIBOT.summary(); });
  ok(s2.done && !s2.errors.length, id + ' resumed after a reload and finished ' + JSON.stringify(s2.errors));
  console.log('  steps after resume: ' + JSON.stringify(s2.steps) + ', sim ' + s2.totalSimMinutes + ' min');
  var before = await sheetCheck(persona);
  await signIn(p, persona.studentId);
  console.log('  third run: ' + await p.evaluate(loader));
  await p.waitForFunction(function () { return window.WIBOT && !WIBOT.running; }, null, { timeout: 300000 });
  var s3 = await p.evaluate(function () { return WIBOT.summary(); });
  var after = await sheetCheck(persona);
  var ran = Object.keys(s3.thisRun).filter(function (k) { return s3.thisRun[k] === 'ran' && ['final', 'signout'].indexOf(k) < 0; });
  console.log('  third run: ' + JSON.stringify(s3.thisRun));
  ok(!ran.length, id + ' third run redid no step (' + ran.join(',') + ')');
  ok(JSON.stringify(before.counts) === JSON.stringify(after.counts), id + ' third run added no rows ' + JSON.stringify(after.counts));
  ok(!after.bad.length, id + ' every expected row is still in the Sheet exactly once ' + JSON.stringify(after.bad));
}

async function runPersona(p, id) {
  var persona = JSON.parse(fs.readFileSync(path.join(DIR, 'personas', id + '.json'), 'utf8'));
  console.log('\n== ' + id + ' (' + persona.label + ', "' + persona.first.word + '")');
  var shots = id === 'C1';
  var loader = fs.readFileSync(path.join(DIR, 'loader.js'), 'utf8');
  if (id === 'B2') {
    // arm the loader in wait mode on the sign-in screen, then sign in (the way it can run live)
    await p.goto(WEB + '/index.html#/login'); await p.waitForSelector('#f_sid');
    await p.evaluate(function () { window.WIBOT_OPTS = { wait: true }; });
    var w = await p.evaluate(loader);
    console.log('  loader (armed before sign-in): ' + w);
    ok(/waiting for a guest/.test(w), id + ': loader waits for the sign-in');
    await p.selectOption('#f_sid', persona.studentId); await p.fill('#f_pin', PIN[persona.studentId]); await p.click('#lgf button[type=submit]');
    await p.waitForFunction(function () { return window.WIBOT && WIBOT.running; }, null, { timeout: 30000 });
    console.log('  ' + await p.evaluate(function () { return window.__WIBOT_START; }));
  } else await signIn(p, persona.studentId);
  if (id !== 'B2') {
    if (shots) await p.evaluate(function () { window.WIBOT_OPTS = { pauseAt: '*' }; }); else await p.evaluate(function () { window.WIBOT_OPTS = {}; });
    var started = await p.evaluate(loader);
    console.log('  loader: ' + started);
    ok(/^WIBOT started/.test(started), id + ': loader started the bot');
  }
  var t0 = Date.now(), n = 0, lastPause = null;
  while (Date.now() - t0 < 15 * 60 * 1000) {
    var st = await p.evaluate(function () { return window.WIBOT ? { running: WIBOT.running, paused: WIBOT.paused, done: WIBOT.summary().done } : null; });
    if (!st) break;
    if (st.paused && st.paused !== lastPause) {
      lastPause = st.paused; n++;
      await p.waitForTimeout(250);
      var name = String(n).padStart(2, '0') + '-' + st.paused;
      await p.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: false });
      if (['card-filled', 'choices-filled', 'report-filled', 'week', 'home', 'plan-table', 'audition-done'].indexOf(st.paused) >= 0) await p.screenshot({ path: path.join(SHOTS, name + '-full.png'), fullPage: true });
      await p.evaluate(function () { WIBOT.release(); });
    }
    if (!st.running && !st.paused) break;
    await p.waitForTimeout(150);
  }
  if (shots) { await p.waitForTimeout(500); await p.screenshot({ path: path.join(SHOTS, String(n + 1).padStart(2, '0') + '-signed-out.png') }); }
  var sum = await p.evaluate(function () { return WIBOT.summary(); });
  var log = await p.evaluate(function () { return WIBOT.log.slice(); });
  fs.writeFileSync(path.join(OUT, 'summaries', id + '.json'), JSON.stringify(sum, null, 2));
  fs.writeFileSync(path.join(OUT, 'summaries', id + '.log.txt'), log.join('\n'));
  console.log('  sim ' + sum.totalSimMinutes + ' min (' + sum.totalSimHours + ' h), real ' + sum.realSeconds + ' s, steps ' + JSON.stringify(sum.steps));
  ok(sum.done, id + ': bot finished');
  ok(!sum.errors.length, id + ': no bot errors ' + (sum.errors.length ? JSON.stringify(sum.errors) : ''));
  if (sum.warnings.length) console.log('  warnings: ' + JSON.stringify(sum.warnings));
  var signedOut = await p.evaluate(function () { return !localStorage.getItem('wi.session') && /#\/login/.test(location.hash); });
  ok(signedOut, id + ': signed out at the end');
  var chk = await sheetCheck(persona);
  console.log('  sheet rows: ' + JSON.stringify(chk.counts));
  console.log('  xp ' + chk.xp + ', stage ' + chk.stage + ', hand-ticked: ' + JSON.stringify(chk.manual));
  ok(!chk.bad.length, id + ': every expected row reached the Sheet once ' + (chk.bad.length ? JSON.stringify(chk.bad) : ''));
  sum.sheet = chk;
  fs.writeFileSync(path.join(OUT, 'summaries', id + '.json'), JSON.stringify(sum, null, 2));
  return sum;
}

(async function main() {
  var h = await fetch(API + '/__health').then(function (r) { return r.json(); }).catch(function () { return null; });
  if (!h || !h.ok) { console.error('Start the mock first: node tools/mock-server.js --port 8790'); process.exit(2); }
  await post('/__reset', { iso: NOW, release: 1 });
  await post('/__clock', { iso: NOW });
  var browser = await pw.chromium.launch({ headless: !arg('headed', false) });
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  var google = 0;
  await ctx.route('**/config.js*', function (r) { r.fulfill({ contentType: 'application/javascript', body: CONFIG_JS }); });
  await ctx.route(/script\.google(usercontent)?\.com/, function (r) { google++; r.abort(); });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: WEB });
  var p = await ctx.newPage();
  var pageErrors = [];
  p.on('pageerror', function (e) { pageErrors.push(e.message); });
  p.on('console', function (m) { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) pageErrors.push(m.text()); });
  var all = {};
  try {
    if (arg('refuse', false)) {
      // the loader must start nothing for a real student account
      await signIn(p, 's01');
      var r = await p.evaluate(fs.readFileSync(path.join(DIR, 'loader.js'), 'utf8'));
      console.log('  loader as Student A: ' + r);
      ok(/not a walkthrough guest/.test(r) && !(await p.evaluate(function () { return !!(window.WIBOT && WIBOT.running); })), 'loader refuses a non-guest account');
      var r2 = await p.evaluate(function (src) { (0, eval)(src); try { WIBOT.init({ studentId: 's01', label: 'Student A', first: { word: 'x' } }); return 'started'; } catch (e) { return e.message; } }, fs.readFileSync(path.join(DIR, 'bundle.min.js'), 'utf8'));
      console.log('  init as Student A: ' + r2);
      ok(/not a guest account/.test(r2), 'WIBOT.init refuses a non-guest account');
    } else if (arg('resume', false)) await resumeTest(p, String(arg('resume')));
    else for (var id of ['B1', 'B2', 'C1']) if (ONLY.indexOf(id) >= 0) all[id] = await runPersona(p, id);
  } catch (e) { no('crash: ' + (e && e.stack || e)); }
  ok(google === 0, 'no request went to script.google.com (' + google + ')');
  ok(!pageErrors.length, 'no page errors ' + (pageErrors.length ? JSON.stringify(pageErrors.slice(0, 5)) : ''));
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'summaries', 'all.json'), JSON.stringify(all, null, 2));
  console.log('\n' + (fails.length ? fails.length + ' FAILED' : 'dry run passed') + '. Summaries: ' + path.join(OUT, 'summaries') + ', screenshots: ' + SHOTS);
  process.exit(fails.length ? 1 : 0);
})();
