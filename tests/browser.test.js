#!/usr/bin/env node
/* WordIdol browser test (W2): SPEC §15.4 "Browser".
   Needs: the mock API (node tools/mock-server.js --port 8790) and a static server on the repo
   (python3 -m http.server 8765). Run: NODE_PATH=$(npm root -g) node tests/browser.test.js [--shots <dir>]
   Uses only Guest#1–Guest#2 and the fake roster. Exit code 1 on any failure. */
'use strict';
var path = require('path');
var fs = require('fs');
var pw = require('playwright');

var WEB = process.env.WI_WEB || 'http://127.0.0.1:8765';
var API = process.env.WI_API || 'http://127.0.0.1:8790';
var si = process.argv.indexOf('--shots');
var SHOTS = si > 0 ? process.argv[si + 1] : path.join(process.env.HOME || '/tmp', 'wi-scratch', 'W2', 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

var fails = [], passes = 0;
function ok(cond, msg) { if (cond) passes++; else { fails.push(msg); console.log('  FAIL ' + msg); } }
function log(m) { console.log(m); }
function post(p, body) { return fetch(API + p, { method: 'POST', body: JSON.stringify(body || {}) }).then(function (r) { return r.json(); }); }
function clock(iso) { return post('/__clock', { iso: iso }); }
function dump(tab) { return fetch(API + '/__dump?tab=' + tab).then(function (r) { return r.json(); }); }
function rowsOf(d) { return d.rows || d.data || d; }

var CONFIG_JS = "window.WI_CONFIG={apiUrl:'" + API + "/exec',release:1,version:'test'};";
var LONG = 'Today I used my word at lunch with two classmates from my club. One of them laughed and asked what it meant, so I gave an example instead of explaining it. Next week I will try it in a different sentence shape.';

async function newPage(browser, opts) {
  var ctx = await browser.newContext({ viewport: opts.viewport || { width: 375, height: 667 }, colorScheme: opts.scheme || 'light' });
  await ctx.route('**/config.js*', function (r) { r.fulfill({ contentType: 'application/javascript', body: CONFIG_JS }); });
  var p = await ctx.newPage();
  p.__errors = [];
  p.on('pageerror', function (e) { p.__errors.push('pageerror: ' + e.message); });
  p.on('console', function (m) { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) p.__errors.push('console: ' + m.text()); });
  return p;
}
async function settle(p, ms) { await p.waitForTimeout(ms || 350); }
async function go(p, hash) { await p.evaluate(function (h) { location.hash = h; }, hash); await settle(p); }

/* layout checks on the current screen */
async function layout(p, name) {
  var r = await p.evaluate(function () {
    var over = document.documentElement.scrollWidth > window.innerWidth + 1;
    var sel = 'button, a.btn, a.rowlink, a.hubcard, .bottomnav a, select, input[type=text], input[type=date], input[type=number], input[type=url], input[type=password], textarea, label.opt, label.tickline, .seg a';
    var small = [];
    document.querySelectorAll(sel).forEach(function (el) {
      if (el.closest('.toast') || el.closest('[hidden]') || el.closest('.hidden')) return;
      var b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      var st = getComputedStyle(el); if (st.visibility === 'hidden' || st.display === 'none') return;
      if (b.height < 43.5 || b.width < 43.5) small.push((el.tagName + '.' + (el.className || '') + ' "' + (el.textContent || el.name || '').trim().slice(0, 30) + '" ' + Math.round(b.width) + 'x' + Math.round(b.height)));
    });
    return { over: over, small: small.slice(0, 6), sw: document.documentElement.scrollWidth };
  });
  ok(!r.over, name + ': no horizontal overflow (scrollWidth ' + r.sw + ')');
  ok(!r.small.length, name + ': tap targets >= 44 px ' + (r.small.length ? JSON.stringify(r.small) : ''));
}
async function shot(p, name) { await p.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: false }); }
async function pngBuffer(p) {
  var b64 = await p.evaluate(function () {
    var c = document.createElement('canvas'); c.width = 2400; c.height = 1500;
    var x = c.getContext('2d');
    for (var i = 0; i < 400; i++) { x.fillStyle = 'hsl(' + (i * 37 % 360) + ',70%,' + (30 + i % 40) + '%)'; x.fillRect((i * 97) % 2400, (i * 53) % 1500, 120, 90); }
    x.fillStyle = '#000'; x.font = '80px sans-serif'; x.fillText('Test screenshot', 200, 300);
    return c.toDataURL('image/png').split(',')[1];
  });
  return Buffer.from(b64, 'base64');
}
async function upload(p, caption) {
  await p.click('[data-act=addfile]');
  await p.waitForSelector('#f_file');
  await p.setInputFiles('#f_file', { name: 'shot.png', mimeType: 'image/png', buffer: await pngBuffer(p) });
  await p.waitForSelector('.sheet .fileview img');
  var info = await p.textContent('.sheet #prev');
  var kb = Number((/(\d+) KB/.exec(info) || [])[1]);
  ok(kb > 0 && kb <= 400, 'resized screenshot is <= 400 KB (' + kb + ' KB)');
  var dims = /(\d+) × (\d+)/.exec(info);
  ok(dims && Math.max(+dims[1], +dims[2]) <= 1280, 'long side <= 1280 px (' + (dims && dims[0]) + ')');
  if (caption) await p.fill('#f_cap', caption);
  await p.click('.sheet [data-act=up]');
  var err = await p.textContent('.sheet [data-f=crop] .err');
  ok(/tick/i.test(err), 'upload refused without the crop tick (P5)');
  await p.check('#f_crop');
  await p.click('.sheet [data-act=up]');
  await p.waitForSelector('.sheet', { state: 'detached', timeout: 8000 });
}
async function fill(p, sel, v) { await p.fill(sel, v); }

async function studentFlow(browser) {
  log('Student flow (375 x 667, light)');
  var p = await newPage(browser, {});
  await p.goto(WEB + '/index.html');
  await p.waitForSelector('#f_sid');
  await layout(p, 'login');
  await p.selectOption('#f_sid', 'g1');
  await p.fill('#f_pin', '9999');
  await p.click('#lgf button[type=submit]');
  await p.waitForFunction(function () { return /Tries left/.test((document.querySelector('[data-f=pin] .err') || {}).textContent || ''); });
  ok(true, 'wrong PIN shows tries left');
  await p.fill('#f_pin', '1111');
  await p.click('#lgf button[type=submit]');
  await p.waitForSelector('#ff');
  ok(/#\/first/.test(p.url()), 'first sign-in opens #/first');
  await go(p, '#/home');
  ok(/#\/first/.test(p.url()), 'guard keeps her on #/first');
  // first step
  await fill(p, '[name=word]', 'vronk');
  await fill(p, '[name=meaning]', 'A sudden problem at the worst possible moment.');
  await fill(p, '[name=example1]', 'That was a total vronk.');
  await p.click('[data-act=next]');
  await p.waitForSelector('.guess');
  var guess = await p.textContent('.guess');
  ok(/noun/.test(guess), 'guess card proposes noun for "a total vronk" (' + guess.trim().slice(0, 60) + ')');
  var pre = await p.$eval('input[name=pos]:checked', function (e) { return e.value; });
  ok(pre === 'noun', 'guess is pre-selected');
  await p.check('input[name=pos][value=verb]');
  await p.check('input[name=posAlso][value=noun]');
  await layout(p, 'first step');
  await shot(p, 't-first-375-light');
  await p.click('[data-act=savefirst]');
  await p.waitForFunction(function () { return /#\/audition/.test(location.hash); });
  await settle(p, 800);
  // word card
  await go(p, '#/audition/card');
  ok(await p.$eval('input[name=pos]:checked', function (e) { return e.value; }) === 'verb', 'changed part of speech was saved');
  await p.check('input[name=pos][value=noun]');
  await settle(p, 300);
  await fill(p, '[name=usageRules]', 'Use it as a countable noun: a vronk, two vronks. Friends say it after small disasters.');
  await p.selectOption('[name=formation]', 'coinage');
  await fill(p, '[name=sourceWords]', 'Invented sound, like bonk and wonk');
  await fill(p, '[name=example2]', 'Missing the bus was a real vronk.');
  await fill(p, '[name=example3]', 'Another vronk happened at lunch today.');
  await fill(p, '[name=purpose]', 'A short word for a small disaster that my club can share.');
  await p.click('[data-act=save]');
  var err = await p.textContent('[data-f=notRudeConfirmed] .err');
  ok(/tick/i.test(err), 'not-rude tick is required');
  await p.check('[name=notRudeConfirmed]');
  await layout(p, 'word card');
  await p.click('[data-act=save]');
  await p.waitForFunction(function () { return location.hash === '#/audition'; });
  await settle(p, 600);
  ok(await p.$$eval('.hubcard.ok', function (a) { return a.length; }) >= 1, 'word card shows a tick');
  // zero-baseline with a screenshot
  await go(p, '#/audition/zb');
  await fill(p, '[name=checkedAt]', '2026-11-12');
  for (var z of ['zb_google', 'zb_tiktok', 'zb_instagram', 'zb_x', 'zb_youtube', 'zb_urban']) await p.selectOption('[name=r_' + z + ']', 'none');
  await fill(p, '[name=statement]', 'I found no results for vronk with my meaning in any of the six places.');
  await upload(p, 'VRONK_google_20261112');
  ok(await p.$$eval('#zbfiles .thumb', function (a) { return a.length; }) === 1, 'zero-baseline screenshot attached');
  await p.click('[data-act=save]');
  await p.waitForFunction(function () { return location.hash === '#/audition'; });
  await settle(p, 800);
  // send for approval
  await go(p, '#/audition/submit');
  await p.click('[data-act=send]');
  await settle(p, 800);
  // FUDGE + hypotheses
  await go(p, '#/audition/fudge');
  for (var L of ['F', 'U', 'D', 'G', 'E']) { await p.fill('input[name=' + L + ']', '1'); await p.fill('[name=why_' + L + ']', 'Because it is short and easy to say.'); }
  await p.click('[data-act=save]'); await settle(p, 500);
  await go(p, '#/audition/hyp');
  await fill(p, '[name=researchQuestion]', 'To what extent will my club recognise vronk by Wave 2?');
  await fill(p, '[name=text_0]', 'At least 10% of respondents will recognise vronk by Wave 2.');
  await p.selectOption('[name=metric_0]', 'recognition');
  await fill(p, '[name=text_1]', 'Corrected recognition will be higher than zero by Wave 2.');
  await p.selectOption('[name=metric_1]', 'corrected');
  await p.click('[data-act=save]'); await settle(p, 500);
  // choices + ask-first request
  await go(p, '#/debut/choices');
  ok(await p.$eval('input[name=ideas][value=id_influencer]', function (e) { return e.disabled; }), '"ask T.Chris first" is locked before approval (P10)');
  await p.click('[data-act=ask]');
  await fill(p, '.sheet textarea', 'Can I ask a cousin who runs a small study channel to use my word once?');
  await p.click('.sheet [data-act=send]');
  await settle(p, 600);
  await go(p, '#/debut/choices');
  await p.check('input[name=targetGroups][value=tg_school]');
  await p.check('input[name=ideas][value=id_speak]');
  await p.check('input[name=platforms][value=pf_inperson]');
  await p.check('input[name=route][value=utility]');
  await p.check('input[name=timeBudget][value=standard]');
  await fill(p, '[name=who]', 'My badminton club friends in M4.');
  await fill(p, '[name=why]', 'We have no short word for small disasters.');
  await fill(p, '[name=what]', 'They will hear it when something goes wrong at practice.');
  await layout(p, 'choices');
  await shot(p, 't-choices-375-light');
  await p.click('[data-act=save]');
  await p.waitForFunction(function () { return location.hash === '#/debut'; });
  // six rules
  await go(p, '#/debut/rules');
  await p.click('[data-act=agree]');
  ok(/tick/i.test(await p.textContent('[data-f=r0] .err')), 'all six rules must be ticked');
  for (var i = 0; i < 6; i++) await p.check('input[name=r' + i + ']');
  await p.click('[data-act=agree]');
  await settle(p, 600);
  // plan table: 3 actions
  for (var k = 0; k < 3; k++) {
    await go(p, '#/debut/table/new');
    await p.selectOption('[name=where]', 'ch_school');
    await p.selectOption('[name=ideaId]', 'id_speak');
    await fill(p, '[name=what]', 'Use vronk at practice, action ' + (k + 1));
    await fill(p, '[name=why]', 'They meet three times a week.');
    await fill(p, '[name=whenDate]', ['2026-11-21', '2026-11-25', '2026-12-02'][k]);
    await p.selectOption('[name=evidence]', 'journal');
    await p.click('[data-act=save]');
    await p.waitForFunction(function () { return location.hash === '#/debut/table'; });
  }
  await settle(p, 600);
  var nPlan = await p.$$eval('.list .rowlink', function (a) { return a.map(function (x) { return x.textContent; }); }); ok(nPlan.length === 3, 'plan table has 3 actions: ' + JSON.stringify(nPlan));
  await settle(p, 800);
  // home + stage
  await go(p, '#/home');
  await settle(p, 600);
  var stage = await p.textContent('.stagename');
  ok(/Fan club/.test(stage), 'stage path reaches Fan club on Sat 21 Nov (' + stage + ')');
  await layout(p, 'home');
  await shot(p, 't-home-375-light');
  // week: tick + own item
  await go(p, '#/week');
  var hand = await p.$('button.tick[data-act=tick]');
  ok(!!hand, 'a hand-tick item exists');
  if (hand) { await hand.click(); await settle(p, 500); ok((await p.$$('.ck.done')).length >= 2, 'hand tick shows done'); }
  await fill(p, '#ownf [name=title]', 'Practise my word with my sister');
  await p.click('[data-act=addown]');
  await settle(p, 600);
  ok(/Practise my word/.test(await p.textContent('main')), 'own item added');
  await layout(p, 'week');
  await shot(p, 't-week-375-light');
  // log: action, journal, sighting (+screenshot), tally
  await go(p, '#/log/action/new');
  await p.selectOption('[name=planActionId]', { index: 1 });
  await settle(p, 200);
  await p.selectOption('[name=channelId]', 'ch_school');
  await fill(p, '[name=what]', 'Used vronk three times at practice today.');
  await p.check('input[name=outcome][value=as_planned]');
  await fill(p, '[name=learned]', 'People copy a word more easily when it comes with a short reaction sentence they can repeat.');
  await layout(p, 'action form');
  await p.click('[data-act=save]');
  await p.waitForFunction(function () { return /#\/log/.test(location.hash) && !/new/.test(location.hash); });
  // online action refused while locked (P9)
  await go(p, '#/log/action/new');
  await p.selectOption('[name=channelId]', 'ch_tiktok');
  await fill(p, '[name=what]', 'Posted a short video with my word.');
  await p.check('input[name=outcome][value=as_planned]');
  await p.click('[data-act=save]');
  ok(/open after the L9/i.test(await p.textContent('#lockmsg')), 'online action is refused while locked (P9)');
  await p.check('input[name=outcome][value=not_done]');
  await fill(p, '[name=outcomeReason]', 'Online is not open for me yet.');
  await p.click('[data-act=save]');
  await settle(p, 400);
  await go(p, '#/log/journal/new');
  await fill(p, '[name=text]', LONG);
  await p.click('[data-act=save]');
  await settle(p, 400);
  await go(p, '#/log/sighting/new');
  await p.selectOption('[name=channelId]', 'ch_school');
  await p.selectOption('[name=relation]', 'classmate');
  await fill(p, '[name=quote]', 'That quiz was such a vronk.');
  await p.check('input[name=prompted][value=unasked]');
  await p.check('input[name=marked][value=natural]');
  await p.selectOption('[name=topic]', 'exams');
  await p.selectOption('[name=posUsed]', 'noun');
  ok(await p.$eval('input[name=level][value="2"]', function (e) { return e.disabled; }), 'Level 2 is greyed (survey only)');
  await p.check('input[name=level][value="4"]');
  ok(/earned/.test(await p.textContent('#owned')), 'sighting shows earned');
  await p.check('input[name=verifiable][value=true]');
  await upload(p, 'quiz chat');
  await layout(p, 'sighting form');
  await shot(p, 't-sighting-375-light');
  await p.click('[data-act=save]');
  await settle(p, 500);
  await go(p, '#/log/tally/new');
  await p.selectOption('[name=tallyType]', 'heard');
  await fill(p, '[name=count]', '0');
  await p.click('[data-act=save]');
  await settle(p, 400);
  await go(p, '#/log?tab=sighting');
  await layout(p, 'log');
  // problem
  await go(p, '#/problem');
  await p.selectOption('[name=category]', 'uncomfortable');
  await p.click('[data-act=send]');
  ok(/tick/i.test(await p.textContent('[data-f=stoppedConfirmed] .err')), 'problem needs the stopped tick');
  await p.check('[name=stoppedConfirmed]');
  await p.click('[data-act=send]');
  await settle(p, 800);
  ok(/Flag sent/.test(await p.textContent('h1')), 'problem flag sent');
  // wait for the queue to empty
  await p.waitForFunction(function () { return (JSON.parse(localStorage.getItem('wi.queue') || '[]')).length === 0; }, null, { timeout: 15000 });
  var xp = await p.evaluate(function () { return WIApp.data().state.xp; });
  ok(xp > 0, 'XP was awarded (' + xp + ')');
  ok(!p.__errors.length, 'no page or console errors (student part 1): ' + p.__errors.join(' | '));
  return p;
}

async function teacherFlow(browser) {
  log('Teacher flow (1366 x 768)');
  var t = await newPage(browser, { viewport: { width: 1366, height: 768 } });
  await t.goto(WEB + '/teacher.html');
  await t.waitForSelector('#pin');
  await t.fill('#pin', '123456');
  await t.click('#lf button[type=submit]');
  await t.waitForSelector('table.t');
  await t.click('details summary');
  var guestRow = await t.textContent('details');
  ok(/Guest#1/.test(guestRow) && /Problem/.test(guestRow), 'overview shows Guest#1 with the problem flag');
  await layout(t, 'teacher class');
  await shot(t, 't-teacher-class-1366-light');
  await go(t, '#/s/g1');
  await t.waitForSelector('.tl-entry');
  var edits = await t.$$eval('.tl-entry input, .tl-entry textarea, .tl-entry select, .tl-entry [contenteditable]', function (a) { return a.length; });
  ok(edits === 0, 'no edit control on the teacher timeline (P14)');
  var actsOnEntries = await t.$$eval('.tl-entry button', function (a) { return a.map(function (b) { return b.textContent.trim(); }); });
  ok(actsOnEntries.every(function (x) { return /^(Comment|View screenshot)$/.test(x); }), 'timeline entries only offer Comment and View screenshot');
  await shot(t, 't-teacher-student-1366-light');
  // comment on the first entry
  await t.click('.tl-entry [data-act=comment]');
  await t.fill('#ct', 'Good start. Try the word in a question next time.');
  await t.click('.sheet [data-act=ok]');
  await settle(t, 600);
  // approve term and request, handle flag, unlock online
  await t.click('[data-act=approve]'); await settle(t, 900);
  await t.waitForSelector('[data-act=req]');
  await t.click('[data-act=req][data-d=approved]');
  await t.click('.sheet [data-act=ok]'); await settle(t, 900);
  await t.waitForSelector('[data-act=handle]');
  await t.click('[data-act=handle]');
  await t.click('.sheet [data-act=ok]'); await settle(t, 900);
  await t.waitForSelector('[data-act=unlock]');
  await t.click('[data-act=unlock]'); await settle(t, 900);
  ok(/online unlocked/.test(await t.textContent('.t-head')), 'online unlocked by teacher');
  // wave 1
  await go(t, '#/waves/W1');
  await t.waitForSelector('#wdate');
  await t.fill('#wdate', '2026-11-23');
  await t.fill('#wnote', 'M2/3, M3/1');
  var keys = await t.$$eval('tr[data-row]', function (a) { return a.map(function (r) { return r.getAttribute('data-row'); }); });
  for (var key of keys) {
    var foil = /^foil/.test(key);
    await t.fill('input[data-k=n][data-t="' + key + '"]', '60');
    await t.fill('input[data-k=recognised][data-t="' + key + '"]', foil ? '6' : '18');
    await t.fill('input[data-k=notSure][data-t="' + key + '"]', '6');
    if (!foil) await t.fill('input[data-k=comprehended][data-t="' + key + '"]', '12');
  }
  var cor = await t.textContent('[data-cor=g1], [data-cor=s01]');
  ok(/20%/.test(cor || ''), 'corrected recognition shown (30% - 10% = 20%): ' + cor);
  await t.click('[data-act=publish]');
  await t.click('.sheet [data-act=y]');
  await settle(t, 1200);
  ok(/Published/.test(await t.textContent('main')), 'wave 1 published');
  await shot(t, 't-teacher-waves-1366-light');
  // reset PIN of Guest#2 (shown once)
  await go(t, '#/settings');
  await t.waitForSelector('#pinsid');
  await t.selectOption('#pinsid', 'g2');
  await t.click('[data-act=pin]');
  await t.fill('#np', '4444');
  await t.click('.sheet [data-act=ok]');
  await t.waitForFunction(function () { return /shown once/.test(document.querySelector('.sheet').textContent); });
  ok(true, 'PIN reset shows the new PIN once');
  await t.click('.sheet [data-close]');
  // export
  await go(t, '#/export');
  await t.waitForSelector('#tab');
  await t.selectOption('#tab', 'Actions');
  await t.check('#guests');
  var dl = t.waitForEvent('download');
  await t.click('[data-act=go]');
  var d = await dl;
  var csv = fs.readFileSync(await d.path(), 'utf8');
  ok(/^﻿?label,/.test(csv) && /Guest#1/.test(csv), 'CSV export has a label column');
  await layout(t, 'teacher export');
  ok(!t.__errors.length, 'no page or console errors (teacher): ' + t.__errors.join(' | '));
  await t.close();
}

async function studentPart2(browser, p) {
  log('Student flow, part 2');
  await p.reload(); await settle(p, 800); await go(p, '#/home'); await p.waitForSelector('.stage'); await settle(p, 800);
  ok(/Try the word in a question/.test(await p.textContent('main')), 'teacher comment appears on Home');
  await p.click('[data-act=gotit]'); await settle(p, 300);
  await go(p, '#/charts');
  await settle(p, 800);
  var charts = await p.textContent('main');
  ok(/aura farming/i.test(charts) && /drovish/i.test(charts), 'published Wave 1 appears on the student wave card');
  await layout(p, 'charts');
  await shot(p, 't-charts-375-light');
  await go(p, '#/debut/choices');
  ok(!(await p.$eval('input[name=ideas][value=id_influencer]', function (e) { return e.disabled; })), 'ask-first idea selectable after approval');
  // Sunday review
  await clock('2026-11-22T10:00:00+07:00');
  await p.evaluate(function () { localStorage.setItem('wi.serverOffset', '0'); });
  await p.reload(); await settle(p, 1500);
  ok(/#\/review/.test(p.url()), 'Sunday: the app opens on the weekly review (' + p.url() + ')');
  await layout(p, 'review step 1');
  await shot(p, 't-review-375-light');
  var items = await p.$$('[data-item]');
  ok(items.length >= 2, 'review lists not-done items (' + items.length + ')');
  var req = await p.$$eval('[data-item]', function (a) { return a.map(function (x) { return { id: x.getAttribute('data-item'), drop: !!x.querySelector('input[value=dropped]') }; }); });
  ok(req.some(function (x) { return !x.drop; }), 'required items cannot be dropped');
  var cannotId = req[req.length - 1].id;
  await p.check('[data-item="' + cannotId + '"] input[value=cannot]');
  await p.fill('[data-reason="' + cannotId + '"]', 'My club practice was cancelled this week.');
  await p.click('[data-act=s2]');
  await fill(p, '[name=wentWell]', 'I used my word at practice and one friend repeated it.');
  await fill(p, '[name=toChange]', 'I will try it in a new topic, like exams, next week.');
  await p.click('[data-act=s3]');
  await settle(p, 400);
  await layout(p, 'review step 3');
  await p.click('[data-act=submit]');
  await settle(p, 1500);
  ok(/#\/week/.test(p.url()), 'after the review the app shows the week');
  await p.waitForFunction(function () { return (JSON.parse(localStorage.getItem('wi.queue') || '[]')).length === 0; }, null, { timeout: 15000 });
  // Monday: carried
  await clock('2026-11-23T08:00:00+07:00');
  await p.reload(); await settle(p, 1500);
  await go(p, '#/week');
  await settle(p, 600);
  ok(/carried ×1/.test(await p.textContent('main')), 'next week shows "carried"');
  // Baseline report helper
  await go(p, '#/report/baseline');
  await settle(p, 800);
  ok(/Baseline/.test(await p.textContent('main')), 'Baseline report helper opens');
  await p.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  var copy = await p.$('[data-act=copy]');
  ok(!!copy, 'report helper has "Copy whole report"');
  if (copy) await copy.click();
  await layout(p, 'report baseline');
  await shot(p, 't-report-375-light');
  // offline: API unreachable, add an entry, reload, back online, sent once
  await p.context().route(API + '/**', function (r) { r.abort(); });
  await go(p, '#/log/tally/new');
  await p.selectOption('[name=tallyType]', 'said');
  await fill(p, '[name=count]', '7');
  await fill(p, '[name=note]', 'offline-test-note');
  await p.click('[data-act=save]');
  await settle(p, 800);
  var q = await p.evaluate(function () { return JSON.parse(localStorage.getItem('wi.queue') || '[]').length; });
  ok(q === 1, 'offline entry is queued (' + q + ')');
  ok(/waiting to send/.test(await p.textContent('#syncpill')), 'header shows "waiting to send"');
  await p.reload(); await settle(p, 1200);
  await go(p, '#/log?tab=tally');
  ok(/I said it: 7/.test(await p.textContent('main')), 'queued entry survives reload');
  await p.context().unroute(API + '/**');
  await p.evaluate(function () { window.dispatchEvent(new Event('online')); });
  await p.waitForFunction(function () { return (JSON.parse(localStorage.getItem('wi.queue') || '[]')).length === 0; }, null, { timeout: 15000 });
  await p.reload(); await settle(p, 1200);
  var tl = rowsOf(await dump('Tallies'));
  var n = (Array.isArray(tl) ? tl : []).filter(function (r) { return r.note === 'offline-test-note'; }).length;
  ok(n === 1, 'offline entry reached the Sheet exactly once (' + n + ')');
  ok(!p.__errors.length, 'no page or console errors (student part 2): ' + p.__errors.join(' | '));
}


var XSS = '<img src=x onerror="window.__xss=1">';
async function noXss(p, where) {
  var r = await p.evaluate(function () { return { imgs: document.querySelectorAll('img[src="x"]').length, flag: !!window.__xss }; });
  ok(r.imgs === 0 && !r.flag, 'no element created from saved HTML (' + where + ')');
}
async function xssFlow(browser) {
  log('Escaping of saved text (Guest#3)');
  var p = await newPage(browser, {});
  var dialogs = 0; p.on('dialog', function (d) { dialogs++; d.dismiss(); });
  await p.goto(WEB + '/index.html'); await p.waitForSelector('#f_sid');
  await p.selectOption('#f_sid', 'g3'); await p.fill('#f_pin', '3333'); await p.click('#lgf button[type=submit]');
  await p.waitForSelector('#ff');
  await fill(p, '[name=word]', 'zib');
  await fill(p, '[name=meaning]', 'Meaning ' + XSS);
  await fill(p, '[name=example1]', 'It got really zib in the room ' + XSS);
  await p.click('[data-act=next]'); await p.waitForSelector('.guess');
  await noXss(p, 'guess card');
  await p.click('[data-act=savefirst]'); await p.waitForFunction(function () { return /#\/audition/.test(location.hash); });
  await go(p, '#/log/sighting/new');
  await p.selectOption('[name=channelId]', 'ch_school');
  await p.selectOption('[name=relation]', 'classmate');
  await fill(p, '[name=quote]', XSS);
  await fill(p, '[name=context]', XSS);
  await p.check('input[name=prompted][value=unasked]');
  await p.check('input[name=marked][value=natural]');
  await p.selectOption('[name=topic]', 'school');
  await p.selectOption('[name=posUsed]', 'adjective');
  await p.check('input[name=level][value="1"]');
  await p.check('input[name=verifiable][value=false]');
  await p.click('[data-act=save]'); await settle(p, 600);
  await go(p, '#/log/journal/new');
  await fill(p, '[name=text]', LONG + ' ' + XSS);
  await p.click('[data-act=save]'); await settle(p, 600);
  await go(p, '#/week');
  await fill(p, '#ownf [name=title]', 'Own ' + XSS);
  await p.click('[data-act=addown]'); await settle(p, 600);
  await p.waitForFunction(function () { return (JSON.parse(localStorage.getItem('wi.queue') || '[]')).length === 0; }, null, { timeout: 15000 });
  await p.reload(); await settle(p, 1200);
  for (var r of ['#/home', '#/week', '#/log?tab=sighting', '#/log?tab=journal', '#/audition/card']) { await go(p, r); await settle(p, 400); await noXss(p, 'student ' + r); }
  var sg = await p.evaluate(function () { return WIApp.data().sightings.filter(function (s) { return !s.deleted; })[0]; });
  await go(p, '#/log/sighting/' + sg.id); await settle(p, 400); await noXss(p, 'sighting form');
  ok(await p.$eval('[name=quote]', function (e) { return e.value; }) === XSS, 'quote text kept as typed');
  var t = await newPage(browser, { viewport: { width: 1366, height: 768 } });
  t.on('dialog', function (d) { dialogs++; d.dismiss(); });
  await t.goto(WEB + '/teacher.html'); await t.waitForSelector('#pin');
  await t.fill('#pin', '123456'); await t.click('#lf button[type=submit]'); await t.waitForSelector('table.t');
  await noXss(t, 'teacher class');
  await go(t, '#/s/g3'); await t.waitForSelector('.tl-entry'); await noXss(t, 'teacher timeline');
  ok(/onerror/.test(await t.textContent('main')), 'teacher sees the saved text as text');
  await t.click('.tl-entry [data-act=comment]'); await t.fill('#ct', 'Comment ' + XSS); await t.click('.sheet [data-act=ok]'); await settle(t, 800);
  await go(t, '#/s/g3/week'); await settle(t, 800); await noXss(t, 'teacher week');
  await go(t, '#/s/g3/feedback'); await settle(t, 800); await noXss(t, 'teacher feedback');
  await p.reload(); await settle(p, 1200); await go(p, '#/home'); await settle(p, 600); await noXss(p, 'student home with comment');
  ok(dialogs === 0, 'no script ran from saved text');
  ok(!p.__errors.length && !t.__errors.length, 'no page errors (escaping): ' + p.__errors.concat(t.__errors).join(' | '));
  await p.context().close(); await t.context().close();
}

async function lookPass(browser) {
  log('Screens at 375 x 667 and 1366 x 768, light and dark');
  var views = [{ w: 375, h: 667 }, { w: 1366, h: 768 }];
  for (var v of views) for (var scheme of ['light', 'dark']) {
    var p = await newPage(browser, { viewport: { width: v.w, height: v.h }, scheme: scheme });
    await p.goto(WEB + '/index.html');
    await p.waitForSelector('#f_sid');
    await p.selectOption('#f_sid', 'g1'); await p.fill('#f_pin', '1111');
    await p.click('#lgf button[type=submit]');
    await p.waitForSelector('.stage .theword'); await settle(p, 900);
    var tag = v.w + '-' + scheme;
    for (var r of ['#/home', '#/week', '#/plan', '#/audition', '#/debut', '#/log', '#/log/sighting/new', '#/guide', '#/more', '#/files', '#/badges', '#/board', '#/summit', '#/charts', '#/report/baseline']) {
      await go(p, r); await settle(p, 500);
      await layout(p, r + ' ' + tag);
      if (['#/home', '#/week', '#/plan', '#/log/sighting/new', '#/more', '#/summit'].indexOf(r) >= 0) await shot(p, 'look-' + r.replace(/[#\/]+/g, '_').replace(/^_|_$/g, '') + '-' + tag);
    }
    ok(!p.__errors.length, 'no page or console errors (' + tag + '): ' + p.__errors.join(' | '));
    await p.context().close();
    var t = await newPage(browser, { viewport: { width: v.w, height: v.h }, scheme: scheme });
    await t.goto(WEB + '/teacher.html'); await t.waitForSelector('#pin');
    await t.fill('#pin', '123456'); await t.click('#lf button[type=submit]');
    await t.waitForSelector('table.t');
    await layout(t, 'teacher class ' + tag);
    await shot(t, 'look-teacher-class-' + tag);
    await go(t, '#/s/g1'); await t.waitForSelector('.tl-entry');
    await shot(t, 'look-teacher-student-' + tag);
    ok(!t.__errors.length, 'no teacher errors (' + tag + '): ' + t.__errors.join(' | '));
    await t.context().close();
  }
}

(async function main() {
  try { var h = await fetch(API + '/__health').then(function (r) { return r.json(); }); if (!h.ok) throw new Error('mock not healthy'); }
  catch (e) { console.error('Start the mock API first: node tools/mock-server.js --port 8790'); process.exit(2); }
  if (process.argv.indexOf('--no-reset') < 0) await post('/__reset', { iso: '2026-11-21T09:00:00+07:00', release: 1 });
  else await clock('2026-11-21T09:00:00+07:00');
  var browser = await pw.chromium.launch();
  try {
    var p = await studentFlow(browser);
    await teacherFlow(browser);
    await xssFlow(browser);
    await studentPart2(browser, p);
    await p.context().close();
    await lookPass(browser);
  } catch (e) { fails.push('crash: ' + (e && e.stack || e)); console.log(e); }
  await browser.close();
  console.log('\n' + passes + ' passed, ' + fails.length + ' failed. Screenshots: ' + SHOTS);
  if (fails.length) { console.log(fails.map(function (f) { return ' - ' + f; }).join('\n')); process.exit(1); }
})();
