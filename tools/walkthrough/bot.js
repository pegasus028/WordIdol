/* WordIdol persona walkthrough bot (W6, 19 Nov 2026).
   In-page script: drives the real student app (index.html + app.js) as one simulated student.
   It works only through the UI (clicks, inputs, the app's own buttons). It reads app state
   (WIApp.data(), WI.checks, localStorage queue) to decide what to click, never to write progress.
   It never types a PIN and never signs in: the teacher signs the guest in first.

     WIBOT.init(persona [, opts])   persona = tools/walkthrough/personas/B1.json (parsed)
                                    opts = {fresh: true (forget an earlier partial run),
                                            pauseAt: '*' | ['name', …] (stop at checkpoints for screenshots),
                                            signOut: true (default), delayMin: 150, delayMax: 400}
     WIBOT.run()                    → Promise of summary(); resumable (skips steps already done)
     WIBOT.stopNow()                stops at the next wait
     WIBOT.summary()                {persona, simMinutesByScreen, totalSimMinutes, saved, errors, warnings, uxNotes, …}
     WIBOT.log                      array of log lines
     WIBOT.paused / WIBOT.release() checkpoint hand-shake for the dry-run screenshots

   Guests only: init() refuses unless the signed-in student is the persona's guest (label "Guest#n"). */
(function () {
  'use strict';
  var root = window;
  if (root.WIBOT && root.WIBOT.running) { console.warn('WIBOT is already running.'); return; }
  var VERSION = '2026-11-19-w6';
  var STORE = 'wibot.run.';
  var B = {
    version: VERSION, persona: null, opts: {}, log: [], errors: [], warnings: [], uxNotes: [], stumbles: [],
    sim: {}, seen: {}, steps: {}, at: '', running: false, stopped: false, done: false, paused: null,
    startedAt: null, finishedAt: null, realMs: 0, xpGained: 0, opErrors: 0, windowOpen: 0, toasts: []
  };
  var STEP_ORDER = ['review', 'first', 'card', 'zb', 'submit', 'fudge', 'hyp', 'spec', 'choices', 'rules', 'planActions',
    'actions', 'journal', 'sightings', 'tallies', 'week', 'stuck', 'report', 'problem', 'final', 'signout'];

  /* ---------------------------------------------------------------- basics */
  function Stop() { this.message = 'stopped'; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function jitter() { return sleep(rnd(B.opts.delayMin || 150, B.opts.delayMax || 400)); }
  function P() { return B.persona; }
  function view() { return document.getElementById('view'); }
  function $(sel, el) { return (el || view() || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || view() || document).querySelectorAll(sel)); }
  function sheet() { var s = document.querySelectorAll('.sheet'); return s.length ? s[s.length - 1] : null; }
  function D() { return root.WIApp && root.WIApp.data && root.WIApp.data(); }
  function api() { return root.WIApi && root.WIApi.student(); }
  function E() { return root.WI; }
  function nowIso() { return root.WIApi.nowIso(); }
  function today() { return E().dateOf(nowIso()); }
  function curWeek() { return E().weekIdOf(nowIso()); }
  function live(a) { return (a || []).filter(function (r) { return r && r.deleted !== true; }); }
  function chk(key, wk) { try { return !!E().checks[key](D(), wk || curWeek()); } catch (e) { return false; } }
  function words(t) { try { return E().wordCount(t); } catch (e) { return String(t || '').split(/\s+/).filter(Boolean).length; } }
  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function qlen() { try { return (JSON.parse(localStorage.getItem('wi.queue') || '[]') || []).length; } catch (e) { return 0; } }
  function session() { try { return JSON.parse(localStorage.getItem('wi.session') || 'null'); } catch (e) { return null; } }
  function stamp() { return new Date().toISOString().slice(11, 19); }
  function say(m) { var l = stamp() + ' [' + (B.at || '-') + '] ' + m; B.log.push(l); if (B.log.length > 600) B.log.shift(); if (root.console) console.log('WIBOT ' + l); }
  function err(m) { B.errors.push((B.at ? B.at + ': ' : '') + m); say('ERROR ' + m); persist(); }
  function warn(m) { B.warnings.push((B.at ? B.at + ': ' : '') + m); say('warning ' + m); }
  function ux(screen, note) {
    var k = screen + '|' + note;
    if (B.uxNotes.some(function (u) { return u.key === k; })) return;
    B.uxNotes.push({ key: k, screen: screen, note: note }); say('ux ' + note);
  }
  function addDays(d, n) { return E().addDays(d, n); }
  function dateFromOffset(off, minD) {
    var d = addDays(today(), Number(off) || 0);
    if (minD && d < minD) d = minD;
    if (d > today()) d = today();
    return d;
  }
  async function waitFor(fn, ms, what) {
    var t0 = Date.now();
    while (Date.now() - t0 < (ms || 10000)) {
      if (B.stopped) throw new Stop();
      var v; try { v = fn(); } catch (e) { v = null; }
      if (v) return v;
      await sleep(100);
    }
    throw new Error('timed out waiting for ' + (what || 'the page'));
  }

  /* ---------------------------------------------------------------- simulated time */
  function T() { return (P() && P().timing) || {}; }
  function spend(sec) { if (!(sec > 0)) return; var k = B.at || 'other'; B.sim[k] = (B.sim[k] || 0) + sec; }
  function spendType(text) { var t = T(); var n = String(text || '').length; spend((t.thinkPerField || 20) + n / (t.typeCpm || 100) * 60); }
  function spendChoice() { spend(T().secPerChoice || 5); }
  function visibleText(el) { return (el && (el.innerText || el.textContent)) || ''; }
  function spendRead(el, key) {
    var t = T();
    var w = words(visibleText(el || view()));
    var k = key || B.at;
    var first = !B.seen[k];
    B.seen[k] = (B.seen[k] || 0) + 1;
    if (first) { B.words = B.words || {}; B.words[k] = w; }
    var share = first ? (t.readShare || 0.5) : (t.rereadShare || 0.15);
    spend((first ? (t.orientSec || 15) : 3) + w * share / (t.readWpm || 150) * 60);
    if (first && t.heavyScreenWords && w > t.heavyScreenWords) ux(k, 'This screen shows about ' + w + ' words. At ' + P().level + ' (about ' + t.readWpm + ' words a minute) reading it once takes ' + Math.round(w / t.readWpm) + ' minutes before she can start typing.');
    jargon(el || view(), k);
    return w;
  }
  function jargon(el, k) {
    var list = (P().probes || P().jargon || []);
    if (!list.length) return;
    var txt = visibleText(el);
    B.jargonSeen = B.jargonSeen || {};
    list.forEach(function (j) {
      if (B.jargonSeen[j.term]) return;
      if (j.screen && !(new RegExp(j.screen)).test(k)) return;
      if (new RegExp(j.re || j.term, 'i').test(txt)) { B.jargonSeen[j.term] = k; ux(k, j.note || ('The term "' + j.term + '" appears here without a plain explanation at ' + P().level + '.')); }
    });
  }

  /* ---------------------------------------------------------------- page actions */
  var lastTapEl = null, lastTapAt = 0;
  async function tap(target, label) {
    var el = typeof target === 'string' ? ($(target) || (sheet() && sheet().querySelector(target)) || document.querySelector(target)) : target;
    if (!el) throw new Error('no control ' + (label || target));
    if (el === lastTapEl && Date.now() - lastTapAt < 650) await sleep(650 - (Date.now() - lastTapAt));
    try { el.scrollIntoView({ block: 'center' }); } catch (e) { /* ignore */ }
    el.click();
    lastTapEl = el; lastTapAt = Date.now();
    spendChoice();
    await jitter();
    return el;
  }
  function setNative(el, v) {
    var proto = el.tagName === 'TEXTAREA' ? root.HTMLTextAreaElement.prototype : (el.tagName === 'SELECT' ? root.HTMLSelectElement.prototype : root.HTMLInputElement.prototype);
    var d = Object.getOwnPropertyDescriptor(proto, 'value');
    if (d && d.set) d.set.call(el, v); else el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function field(name, scope) { return (scope || view()).querySelector('[name="' + name + '"]'); }
  async function fill(name, text, scope) {
    if (text == null) return;
    var el = typeof name === 'string' ? field(name, scope) : name;
    if (!el) { warn('no field ' + name); return; }
    if (norm(el.value) === norm(text)) return;
    try { el.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    setNative(el, String(text));
    if (el.type === 'date' || el.type === 'number' || el.type === 'range') spendChoice(); else spendType(text);
    await jitter();
  }
  async function pick(name, value, scope) {
    if (value == null || value === '') return;
    var el = field(name, scope);
    if (!el) { warn('no select ' + name); return; }
    if (el.value === String(value)) return;
    var has = Array.prototype.some.call(el.options, function (o) { return o.value === String(value) && !o.disabled; });
    if (!has) { warn('select ' + name + ' has no option ' + value); return; }
    setNative(el, String(value));
    spendChoice();
    await jitter();
  }
  async function radio(name, value, scope) {
    if (value == null || value === '') return;
    var el = (scope || view()).querySelector('input[name="' + name + '"][value="' + String(value) + '"]');
    if (!el) { warn('no option ' + name + '=' + value); return; }
    if (el.disabled) { warn('option ' + name + '=' + value + ' is disabled'); return; }
    if (!el.checked) await tap(el, name + '=' + value);
  }
  async function tick(name, value, on, scope) {
    var sel = value == null ? 'input[name="' + name + '"]' : 'input[name="' + name + '"][value="' + String(value) + '"]';
    var el = (scope || view()).querySelector(sel);
    if (!el) { warn('no box ' + name + (value != null ? '=' + value : '')); return; }
    if (el.disabled) { warn('box ' + name + '=' + value + ' is disabled'); return; }
    if (!!el.checked !== (on !== false)) await tap(el, name);
  }
  function invalids(scope) {
    return $$('.field.invalid', scope || view()).map(function (f) { var e = f.querySelector('.err'); return f.getAttribute('data-f') + ': ' + (e ? e.textContent : ''); });
  }
  async function settle(ms) { await sleep(ms || 300); }
  async function goTo(h) {
    if (location.hash !== h) location.hash = h; else root.WIApp.rerender();
    await settle(250);
    await waitFor(function () { return view() && !view().querySelector('[aria-busy="true"]') && root.WIApp.data(); }, 20000, 'screen ' + h);
    if (/^#\/review/.test(location.hash) && !/^#\/review/.test(h)) {
      say('the app opened the weekly review first (a review is due)');
      await doReview();
      if (location.hash !== h) location.hash = h;
      await settle(300);
    }
    return location.hash;
  }
  async function saveExpect(btn, re, what, scope) {
    await tap(btn, what + ' save');
    try { await waitFor(function () { return re.test(location.hash) || /^#\/review/.test(location.hash); }, 6000, what + ' to save'); }
    catch (e) { throw new Error(what + ' was not saved. ' + (invalids(scope).join('; ') || 'No error shown on the form.')); }
    await settle(350);
    if (/^#\/review/.test(location.hash) && !re.test(location.hash)) {
      // saved; the app's guard then sent her to a weekly review that is due
      ux(B.at, 'Straight after "' + what + '" the app opened the weekly review (' + (E().reviewDue(D(), nowIso()) || []).join(', ') + ' is due), before she could go on with her work.');
      await doReview();
    }
  }
  async function checkpoint(name) {
    persist();
    var p = B.opts.pauseAt;
    if (!p || !(p === '*' || (Array.isArray(p) && p.indexOf(name) >= 0))) return;
    B.paused = name; say('paused at ' + name);
    var t0 = Date.now();
    while (B.paused && Date.now() - t0 < 120000 && !B.stopped) await sleep(100);
    B.paused = null;
  }
  async function waitQueue(ms) {
    try { await waitFor(function () { return qlen() === 0; }, ms || 90000, 'the save queue to empty'); return true; }
    catch (e) { if (e instanceof Stop) throw e; warn('save queue still has ' + qlen() + ' entries'); return false; }
  }

  /* screenshot: a generated test picture (no people, no names), through the app's own upload sheet */
  function testJpeg(label) {
    return new Promise(function (res) {
      var c = document.createElement('canvas'); c.width = 720; c.height = 450;
      var x = c.getContext('2d');
      var g = x.createLinearGradient(0, 0, 720, 450); g.addColorStop(0, '#2c1d44'); g.addColorStop(1, '#e5337a');
      x.fillStyle = g; x.fillRect(0, 0, 720, 450);
      x.fillStyle = 'rgba(255,255,255,.12)'; for (var i = 0; i < 14; i++) x.fillRect(30 + i * 48, 300 - (i * 37 % 160), 30, 120 + (i * 37 % 160));
      x.fillStyle = '#fff'; x.font = 'bold 34px sans-serif'; x.fillText('WordIdol walkthrough', 40, 80);
      x.font = '24px sans-serif'; x.fillText('Test picture, no people: ' + String(label || '').slice(0, 30), 40, 125);
      x.fillText(P().label + ' · ' + today(), 40, 165);
      c.toBlob(function (b) { res(new File([b], 'walkthrough-test.jpg', { type: 'image/jpeg' })); }, 'image/jpeg', 0.8);
    });
  }
  async function attachShot(box, caption, slipCrop) {
    var prevAt = B.at;
    var btn = box && box.querySelector('[data-act=addfile]');
    if (!btn) { warn('no "Add a screenshot" button'); return false; }
    await tap(btn, 'add a screenshot');
    B.at = 'screenshot';
    var sh = await waitFor(function () { var s = sheet(); return s && s.querySelector('#f_file') ? s : null; }, 5000, 'the upload sheet');
    spendRead(sh, 'screenshot');
    var input = sh.querySelector('#f_file');
    var file = await testJpeg(caption);
    var dt = new DataTransfer(); dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    spend(T().uploadSec || 60);
    await waitFor(function () { return sh.querySelector('.fileview img') || sh.querySelector('#prev .err'); }, 10000, 'the picture preview');
    if (sh.querySelector('#prev .err')) { err('upload preview failed: ' + sh.querySelector('#prev').textContent); B.at = prevAt; return false; }
    var info = (sh.querySelector('#prev') || {}).textContent || '';
    say('preview ' + norm(info));
    if (caption) await fill(sh.querySelector('#f_cap'), caption);
    if (slipCrop) {
      await tap(sh.querySelector('[data-act=up]'), 'upload without the crop tick');
      var m = norm((sh.querySelector('[data-f=crop] .err') || {}).textContent);
      B.stumbles.push('Upload without the crop tick: "' + m + '"');
      say('stumble: upload refused: ' + m);
      if (!m) err('upload went ahead without the crop tick');
    }
    var crop = sh.querySelector('#f_crop');
    if (!crop.checked) await tap(crop, 'crop tick');
    await tap(sh.querySelector('[data-act=up]'), 'upload');
    try { await waitFor(function () { return !sh.isConnected; }, 45000, 'the upload'); }
    catch (e) { err('upload did not finish: ' + norm((sh.querySelector('[data-f=file] .err') || {}).textContent)); B.at = prevAt; return false; }
    B.at = prevAt;
    await settle(300);
    return true;
  }

  /* ---------------------------------------------------------------- steps */
  var S = {};

  S.review = {
    done: function () { var due = []; try { due = E().reviewDue(D(), nowIso()) || []; } catch (e) { /* ignore */ } return !due.length; },
    run: function () { return doReview(); }
  };
  async function doReview() {
    var r = P().review || {};
    var prev = B.at; B.at = 'review';
    if (!/^#\/review/.test(location.hash)) { location.hash = '#/review'; await settle(400); }
    for (var guard = 0; guard < 4 && /^#\/review/.test(location.hash); guard++) {
      spendRead();
      if ($('[data-act=quick]')) { await tap('[data-act=quick]', 'quick review'); continue; }
      if (!$('[data-act=s2]') && !field('wentWell')) break;
      if ($('[data-act=s2]')) await tap('[data-act=s2]', 'review step 2');
      await waitFor(function () { return field('wentWell'); }, 4000, 'review step 2');
      await fill('wentWell', r.wentWell || 'I saved my word and wrote in my Lab Book this week.');
      await fill('toChange', r.toChange || 'Next week I will try my word with a new group of friends.');
      await tap('[data-act=s3]', 'review step 3');
      await waitFor(function () { return $('[data-act=submit]'); }, 4000, 'review step 3');
      spendRead();
      await tap('[data-act=submit]', 'start my new week');
      await settle(800);
    }
    B.at = prev;
  }

  S.first = {
    done: function () { return !!(D().word && D().word.posConfirmed); },
    run: async function () {
      var f = P().first;
      await goTo('#/first');
      await waitFor(function () { return $('#ff'); }, 8000, 'the first-step form');
      spendRead();
      await fill('word', f.word); await fill('meaning', f.meaning); await fill('example1', f.example1);
      await tap('[data-act=next]', 'Next');
      var g = await waitFor(function () { return $('.guess'); }, 4000, 'the part-of-speech guess card');
      if (!g) throw new Error(invalids().join('; '));
      spendRead(g, 'first');
      var pre = ($('input[name=pos]:checked') || {}).value || '';
      B.guess = { text: norm(g.textContent), preselected: pre };
      say('guess card: ' + norm(g.textContent).slice(0, 160) + ' (pre-selected: ' + (pre || 'none') + ')');
      if (!pre) ux('first', 'The guess card said "' + norm(g.querySelector('.big') ? g.querySelector('.big').textContent : g.textContent).slice(0, 90) + '" and nothing was pre-selected, so she had to pick the part of speech herself from six options with no example for each.');
      await checkpoint('first-guess');
      if (pre !== f.pos) { say('changes the part of speech from ' + (pre || 'nothing') + ' to ' + f.pos); await radio('pos', f.pos); }
      (f.posAlso || []).forEach(function () { /* ticked below */ });
      for (var i = 0; i < (f.posAlso || []).length; i++) await tick('posAlso', f.posAlso[i], true);
      await saveExpect('[data-act=savefirst]', /^#\/audition/, 'First step');
    }
  };

  S.card = {
    done: function () { return chk('word.card'); },
    run: async function () {
      var c = P().card;
      await goTo('#/audition/card');
      await waitFor(function () { return field('usageRules'); }, 8000, 'the word card');
      spendRead();
      await fill('usageRules', c.usageRules);
      Object.keys(c.forms || {}).forEach(function () { /* below */ });
      for (var k in (c.forms || {})) if (field('form_' + k)) await fill('form_' + k, c.forms[k]);
      await fill('pronunciation', c.pronunciation);
      await pick('formation', c.formation);
      await fill('sourceWords', c.sourceWords);
      await fill('example2', c.example2); await fill('example3', c.example3);
      await fill('doNotUse', c.doNotUse); await fill('purpose', c.purpose);
      if ((P().slips || []).indexOf('card.notRude') >= 0 && !field('notRudeConfirmed').checked) {
        await tap('[data-act=save]', 'save without the not-rude tick');
        var m = norm(($('[data-f=notRudeConfirmed] .err') || {}).textContent);
        B.stumbles.push('Word card saved without the not-rude tick: "' + m + '"');
        say('stumble: ' + m);
        if (!m) err('the word card saved without the not-rude tick');
        spend(20);
      }
      await tick('notRudeConfirmed', null, true);
      await checkpoint('card-filled');
      await saveExpect('[data-act=save]', /^#\/audition$/, 'Word card');
    }
  };

  S.zb = {
    done: function () { return chk('word.zb'); },
    run: async function () {
      var z = P().zb;
      await goTo('#/audition/zb');
      await waitFor(function () { return field('checkedAt'); }, 8000, 'the zero-baseline form');
      spendRead();
      spend(T().zbSearchSec || 600); // the six searches themselves (done outside the app)
      await fill('checkedAt', z.checkedAt);
      for (var i = 0; i < z.places.length; i++) { await pick('r_' + z.places[i].id, z.places[i].result); if (z.places[i].note) await fill('n_' + z.places[i].id, z.places[i].note); }
      await fill('statement', z.statement);
      if (z.shot && !((D().word || {}).zb || {}).fileIds) await attachShot($('#zbfiles'), z.shotCaption, false);
      await checkpoint('zb-filled');
      await saveExpect('[data-act=save]', /^#\/audition$/, 'Zero-baseline record');
    }
  };

  S.submit = {
    done: function () { return chk('word.submitted'); },
    run: async function () {
      await goTo('#/audition/submit');
      spendRead();
      if (!$('[data-act=send]')) throw new Error('no "Send my word" button: ' + norm(view().textContent).slice(0, 160));
      await saveExpect('[data-act=send]', /^#\/audition$/, 'Send for approval');
    }
  };

  S.fudge = {
    done: function () { return chk('word.fudge'); },
    run: async function () {
      var f = P().fudge;
      await goTo('#/audition/fudge');
      await waitFor(function () { return field('F'); }, 8000, 'the FUDGE form');
      spendRead();
      var L = ['F', 'U', 'D', 'G', 'E'];
      for (var i = 0; i < L.length; i++) {
        var el = field(L[i]);
        if (String(el.value) !== String(f[L[i]][0]) || el.getAttribute('data-unset')) { setNative(el, String(f[L[i]][0])); spendChoice(); await jitter(); }
        await fill('why_' + L[i], f[L[i]][1]);
      }
      var tot = norm(($('#ftotal') || {}).textContent);
      say('FUDGE total shown: ' + tot.slice(0, 60));
      await saveExpect('[data-act=save]', /^#\/audition$/, 'FUDGE prediction');
    }
  };

  S.hyp = {
    done: function () { return chk('word.hypotheses'); },
    run: async function () {
      var h = P().hyp;
      await goTo('#/audition/hyp');
      await waitFor(function () { return field('researchQuestion'); }, 8000, 'the hypotheses form');
      spendRead();
      var guard = 0;
      while (!field('text_' + (h.hypotheses.length - 1)) && $('[data-act=addh]') && guard++ < 3) { await tap('[data-act=addh]', 'add a hypothesis'); await settle(200); }
      await fill('researchQuestion', h.researchQuestion);
      for (var i = 0; i < h.hypotheses.length; i++) {
        await fill('text_' + i, h.hypotheses[i].text); await pick('metric_' + i, h.hypotheses[i].metric); await fill('target_' + i, h.hypotheses[i].target);
      }
      await saveExpect('[data-act=save]', /^#\/audition$/, 'Hypotheses');
    }
  };

  S.spec = {
    done: function () { return chk('word.spec'); },
    run: async function () {
      var s = P().spec;
      await goTo('#/audition/spec');
      await waitFor(function () { return field('r_R1') || $('input[name=r_R1]'); }, 8000, 'the spec sheet');
      spendRead();
      for (var i = 1; i <= 10; i++) { var r = s['R' + i]; await radio('r_R' + i, r[0]); if (r[1]) await fill('n_R' + i, r[1]); }
      say('spec count: ' + norm(($('#scount') || {}).textContent).slice(0, 40));
      await saveExpect('[data-act=save]', /^#\/audition$/, 'Spec sheet');
      await goTo('#/audition'); spendRead(); await checkpoint('audition-done');
    }
  };

  S.choices = {
    done: function () { return chk('plan.choices'); },
    run: async function () {
      var c = P().choices, i;
      await goTo('#/debut/choices');
      await waitFor(function () { return $('input[name=targetGroups]'); }, 8000, 'the choices form');
      spendRead();
      for (i = 0; i < c.targetGroups.length; i++) await tick('targetGroups', c.targetGroups[i], true);
      for (i = 0; i < c.ideas.length; i++) await tick('ideas', c.ideas[i], true);
      for (i = 0; i < c.platforms.length; i++) await tick('platforms', c.platforms[i], true);
      await settle(150);
      var ageBox = $('[data-f=is16]');
      if (ageBox && !ageBox.classList.contains('hidden') && c.is16 != null) await radio('is16', String(c.is16));
      await radio('route', c.route); await radio('timeBudget', c.timeBudget);
      await fill('who', c.who); await fill('why', c.why); await fill('what', c.what);
      await fill('spark', c.spark); await fill('projectAccount', c.projectAccount);
      var note = norm(($('#agenote') || {}).textContent);
      if (note) say('age note: ' + note);
      await checkpoint('choices-filled');
      await saveExpect('[data-act=save]', /^#\/debut$/, 'My choices');
    }
  };

  S.rules = {
    done: function () { return chk('rules.all'); },
    run: async function () {
      await goTo('#/debut/rules');
      await waitFor(function () { return $('input[name=r0]'); }, 8000, 'the six rules');
      spendRead();
      for (var i = 0; i < 6; i++) await tick('r' + i, null, true);
      await saveExpect('[data-act=agree]', /^#\/debut$/, 'The six rules');
    }
  };

  function findPA(pa) { return live(D().planActions).filter(function (x) { return norm(x.what) === norm(pa.what); }); }
  S.planActions = {
    done: function () { return P().planActions.every(function (pa) { return findPA(pa).length; }); },
    run: async function () {
      var list = P().planActions;
      for (var i = 0; i < list.length; i++) {
        var pa = list[i];
        if (findPA(pa).length) continue;
        await goTo('#/debut/table/new');
        await waitFor(function () { return field('where'); }, 8000, 'the planned-action form');
        spendRead();
        await pick('where', pa.where); await pick('ideaId', pa.ideaId);
        await fill('what', pa.what); await fill('why', pa.why);
        await pick('theoryTag', pa.theoryTag);
        await fill('whenDate', pa.whenDate);
        await pick('evidence', pa.evidence); await pick('targetGroup', pa.targetGroup);
        var onl = norm(($('#onl') || {}).textContent);
        if (pa.online) {
          if (/locked/i.test(onl)) say('online action note: ' + onl); else warn('online planned action shows no "locked" note');
          if (onl && !/\d|L9|Thu|briefing/i.test(onl)) ux('debut/table', 'The lock note on the planned-action form ("' + onl.slice(0, 160) + '") does not say when online actions open (after the L9 briefing, Thu 26 Nov).');
        }
        if (pa.online) await checkpoint('plan-online-locked');
        await saveExpect('[data-act=save]', /^#\/debut\/table$/, 'Planned action ' + (i + 1));
      }
      await goTo('#/debut/table');
      spendRead();
      list.filter(function (pa) { return pa.online; }).forEach(function (pa) {
        var row = $$('.list .rowlink').filter(function (a) { return a.textContent.indexOf(pa.what.slice(0, 40)) >= 0; })[0];
        if (!row) warn('online planned action not in the table');
        else if (/locked until unlocked/.test(row.textContent)) { say('table shows the online action as locked'); ux('debut/table', 'In "My plan table" the online action carries the chip "locked until unlocked", which repeats itself and gives no date or reason.'); }
        else err('online planned action is not shown as locked');
      });
      await checkpoint('plan-table');
    }
  };

  function findAction(a) { return live(D().actions).filter(function (x) { return norm(x.what) === norm(a.what); }); }
  S.actions = {
    done: function () { return P().actions.every(function (a) { return findAction(a).length; }); },
    run: async function () {
      var list = P().actions;
      for (var i = 0; i < list.length; i++) {
        var a = list[i];
        if (findAction(a).length) continue;
        await goTo('#/log/action/new');
        await waitFor(function () { return field('channelId'); }, 8000, 'the action form');
        spendRead();
        await fill('date', dateFromOffset(a.dateOffset, '2026-11-16'));
        if (a.planIndex != null) {
          var pa = findPA(P().planActions[a.planIndex])[0];
          if (pa) await pick('planActionId', pa.id); else warn('planned action ' + a.planIndex + ' not found');
        }
        await pick('channelId', a.channelId); await pick('ideaId', a.ideaId);
        await fill('what', a.what);
        await radio('outcome', a.outcome);
        await settle(120);
        if (a.outcomeReason) await fill('outcomeReason', a.outcomeReason);
        await pick('audience', a.audience);
        await fill('reaction', a.reaction); await fill('learned', a.learned);
        var lock = norm(($('#lockmsg') || {}).textContent);
        if (lock) say('lock note: ' + lock);
        await saveExpect('[data-act=save]', /^#\/log\?tab=action$/, 'Action ' + (i + 1));
      }
    }
  };

  function findJournal(j) { var p = norm(j.text).slice(0, 60); return live(D().journal).filter(function (x) { return norm(x.text).slice(0, 60) === p; }); }
  S.journal = {
    done: function () { return P().journal.every(function (j) { return findJournal(j).length; }); },
    run: async function () {
      var list = P().journal;
      for (var i = 0; i < list.length; i++) {
        var j = list[i];
        if (findJournal(j).length) continue;
        if (j.kind === 'zero_result') {
          await goTo('#/log?tab=journal'); spendRead();
          await tap('a[href="#/log/journal/new?kind=zero_result"]', 'Nothing happened this week');
          await settle(300);
        } else await goTo('#/log/journal/new');
        await waitFor(function () { return field('text'); }, 8000, 'the Lab Book form');
        spendRead();
        await fill('date', dateFromOffset(j.dateOffset, '2026-11-16'));
        await pick('kind', j.kind);
        await settle(100);
        var pr = norm(($('#prompt') || {}).textContent).replace(/Another prompt$/, '');
        if (pr) say('prompt: ' + pr.slice(0, 120));
        await fill('text', j.text);
        await saveExpect('[data-act=save]', /^#\/log\?tab=journal$/, 'Lab Book entry ' + (i + 1));
      }
    }
  };

  function findSighting(s) { return live(D().sightings).filter(function (x) { return norm(x.quote) === norm(s.quote); }); }
  S.sightings = {
    done: function () { return P().sightings.every(function (s) { return findSighting(s).length; }); },
    run: async function () {
      var list = P().sightings;
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        if (findSighting(s).length) continue;
        await goTo('#/log/sighting/new');
        await waitFor(function () { return field('relation'); }, 8000, 'the sighting form');
        spendRead();
        await fill('date', dateFromOffset(s.dateOffset, '2026-11-16'));
        await pick('channelId', s.channelId); await pick('relation', s.relation);
        await fill('quote', s.quote); await fill('context', s.context);
        await radio('prompted', s.prompted); await radio('marked', s.marked);
        await pick('topic', s.topic); await pick('posUsed', s.posUsed);
        await fill('derivedForm', s.derivedForm);
        if (s.openLevels && $('[data-act=levels]')) {
          await tap('[data-act=levels]', 'What do the levels mean?');
          var ls = await waitFor(sheet, 3000, 'the levels sheet');
          spendRead(ls, 'log/sighting');
          await tap(ls.querySelector('[data-close]'), 'close');
        }
        await radio('level', String(s.level));
        await radio('verifiable', String(!!s.verifiable));
        var own = norm(($('#owned') || {}).textContent);
        if (own) say('owned/earned: ' + own);
        if (s.shot) {
          var ok = await attachShot($('#files'), s.shotCaption, (P().slips || []).indexOf('upload.crop') >= 0);
          if (ok) say('screenshot attached');
          await checkpoint('sighting-with-shot');
        }
        await saveExpect('[data-act=save]', /^#\/log\?tab=sighting$/, 'Sighting ' + (i + 1));
      }
      spendRead();
      // the list line says "Level n (owned|earned)": compare it with the level's own category
      var LV = {}; (root.LEVELS || []).forEach(function (L) { LV[L.level] = L.ownedOrEarned; });
      $$('.list .rowlink').forEach(function (a) {
        var m = /Level (\d)[^(]*\((owned|earned)\)/.exec(a.textContent);
        if (m && LV[m[1]] && LV[m[1]] !== 'survey' && LV[m[1]] !== m[2]) ux('log/sighting', 'The Log shows "' + norm(a.querySelector('.t') ? a.querySelector('.t').textContent : '').slice(0, 50) + '" as "Level ' + m[1] + ' (' + m[2] + ')", but the levels sheet calls Level ' + m[1] + ' ' + LV[m[1]] + '. Owned/earned comes from "Who used it?" and "Did you ask them?", so the two labels can disagree.');
      });
      await checkpoint('log-sightings');
    }
  };

  function findTally(t) { return live(D().tallies).filter(function (x) { return norm(x.note) === norm(t.note); }); }
  S.tallies = {
    done: function () { return P().tallies.every(function (t) { return findTally(t).length; }); },
    run: async function () {
      var list = P().tallies;
      for (var i = 0; i < list.length; i++) {
        var t = list[i];
        if (findTally(t).length) continue;
        if (i === 0) {
          // the first one through the "+" button, like a student on her phone
          await goTo('#/log?tab=tally'); spendRead();
          var fab = document.getElementById('fab');
          if (fab && !fab.hidden) {
            await tap(fab, '+');
            var qa = await waitFor(sheet, 3000, 'the quick-add sheet');
            await tap(qa.querySelector('a[href="#/log/tally/new"]'), 'Tally');
            await settle(300);
          } else { warn('no "+" button on the Log'); await goTo('#/log/tally/new'); }
        } else await goTo('#/log/tally/new');
        await waitFor(function () { return field('tallyType'); }, 8000, 'the tally form');
        spendRead();
        await fill('date', dateFromOffset(t.dateOffset, '2026-11-16'));
        await pick('tallyType', t.tallyType); await fill('count', String(t.count));
        await pick('context', t.context); await fill('note', t.note);
        await saveExpect('[data-act=save]', /^#\/log\?tab=tally$/, 'Tally ' + (i + 1));
      }
    }
  };

  function weekRows() { return (D().checklist || []).filter(function (r) { return r.weekId === curWeek(); }); }
  function ownRow(title) { return weekRows().filter(function (r) { return r.source === 'own' && norm(r.title) === norm(title); })[0]; }
  S.week = {
    done: function () { var w = P().week; return B.steps.week === 'done' || (!!ownRow(w.own.title) && B.steps.weekTicks === 'done'); },
    run: async function () {
      var w = P().week;
      await goTo('#/week');
      spendRead();
      // read why one item matters
      var ex = $('[data-act=expand]');
      if (ex) { await tap(ex, 'more about this item'); spendRead($('.ck .more:not(.hidden)') || view(), 'week'); }
      if (B.steps.weekTicks !== 'done') {
        var want = w.tickCount || 0, done = 0;
        var pats = (w.tickPrefer || []).map(function (x) { return new RegExp(x, 'i'); });
        for (var guard = 0; done < want && guard < 10; guard++) {
          var btns = $$('button.tick[data-act=tick][aria-checked="false"]').filter(function (b) {
            var r = (D().checklist || []).filter(function (x) { return x.id === b.getAttribute('data-row'); })[0];
            return r && r.source !== 'own';
          });
          if (!btns.length) { if (done < want) warn('only ' + done + ' hand-tick items to tick (wanted ' + want + ')'); break; }
          var b = btns.filter(function (x) { return pats.some(function (p) { return p.test(x.getAttribute('aria-label') || ''); }); })[0] || btns[0];
          say('ticks: ' + b.getAttribute('aria-label'));
          await tap(b, 'tick'); await settle(400);
          done++;
        }
        B.steps.weekTicks = 'done';
      }
      if (!ownRow(w.own.title)) {
        var f = $('#ownf');
        if (!f) warn('no "Add my own item" form');
        else {
          await fill(f.querySelector('[name=title]'), w.own.title);
          if (w.own.dueOffset != null) await fill(f.querySelector('[name=dueDate]'), addDays(today(), w.own.dueOffset));
          await tap('[data-act=addown]', 'Add it');
          await settle(500);
          if (!ownRow(w.own.title)) err('own item not added: ' + invalids(f).join('; '));
        }
      }
      spendRead(); await checkpoint('week');
    }
  };

  S.stuck = {
    done: function () { return B.steps.stuck === 'done'; },
    run: async function () {
      await goTo('#/home');
      spendRead(); await checkpoint('home');
      B.at = 'stuck';
      await tap('[data-act=stuck]', 'Stuck?');
      var sh = await waitFor(sheet, 3000, 'the Stuck sheet');
      spendRead(sh, 'stuck');
      say('stuck ideas: ' + $$('.panel p', sh).map(function (p) { return norm(p.textContent).slice(0, 70); }).join(' | '));
      await checkpoint('stuck');
      await tap(sh.querySelector('[data-close]'), 'close');
    }
  };

  function reportRow() { return (D().reports || []).filter(function (r) { return r.type === 'baseline'; })[0]; }
  S.report = {
    done: function () {
      var r = reportRow(), rp = P().report;
      return !!r && (r.status === 'ready' || r.status === 'submitted') && ['profile', 'fudge', 'wave1', 'plan', 'ai'].every(function (k) { return norm((r.sections || {})[k]) === norm(rp[k]); });
    },
    run: async function () {
      var rp = P().report;
      await goTo('#/report/baseline');
      await waitFor(function () { return $('[data-text=profile]'); }, 8000, 'the report helper');
      spendRead();
      var facts = norm(visibleText($('[data-sec=wave1] .wp-facts')) || ($('[data-sec=wave1] .wp-facts') || {}).textContent);
      say('wave 1 facts: ' + facts.slice(0, 220));
      var wprompt = norm(($('[data-sec=wave1] .wp-prompt') || {}).textContent);
      if (/not published/i.test(facts)) ux('report/baseline', 'Section 3 asks "' + wprompt.slice(0, 80) + '…" but Wave 1 is not published yet (survey Mon 23 – Tue 24 Nov, report due Wed 25 Nov); she has to write at least 80 words about data she cannot see, and the facts box says: "' + ((/Wave 1 results are not published[\s\S]*?\./.exec(facts) || [''])[0] + ' ' + ((/You can write the other sections now\./.exec(facts) || [''])[0])).trim() + '", although "Mark as ready" needs those 80 words too.');
      var keys = ['profile', 'fudge', 'wave1', 'plan', 'ai'];
      for (var i = 0; i < keys.length; i++) {
        var box = $('[data-text="' + keys[i] + '"]');
        if (!box) { err('no report box ' + keys[i]); continue; }
        spend((T().reportPlanSec || 300) * (keys[i] === 'ai' ? 0.2 : 1));
        await fill(box, rp[keys[i]]);
        await settle(200);
      }
      var total = norm(($('[data-total]') || {}).textContent);
      say('report words shown: ' + total);
      await checkpoint('report-filled');
      B.at = 'report/baseline';
      await tap('[data-act=copy]', 'Copy whole report');
      spend(T().copySec || 20);
      var copied = await waitFor(function () {
        var t = $$('#toasts .toast', document).map(function (x) { return x.textContent; }).join(' ');
        return /Copied/.test(t) ? 'clipboard' : ($('.wp-copybox') ? 'copybox' : null);
      }, 5000, 'the copy').catch(function () { return null; });
      if (copied === 'clipboard') say('report copied to the clipboard');
      else if (copied === 'copybox') ux('report/baseline', 'Copy did not reach the clipboard on this device; the app showed the "select all the text below" box instead.');
      else warn('no sign that "Copy whole report" worked');
      await tap('[data-act=ready]', 'Mark as ready');
      await settle(600);
      var probs = norm(($('[data-problems]') || {}).textContent);
      if (probs) throw new Error('report not ready: ' + probs);
      var st = await waitFor(function () { var c = $('[data-status]'); return c && /Ready|Submitted/.test(c.textContent) ? c.textContent : null; }, 60000, 'the Ready status').catch(function () { return null; });
      if (!st) err('report status did not change to Ready'); else say('report status: ' + st);
      await checkpoint('report-ready');
    }
  };

  S.problem = {
    done: function () { var p = P().problem; return !p || live(D().flags).some(function (f) { return norm(f.note) === norm(p.note); }); },
    run: async function () {
      var p = P().problem;
      await goTo('#/problem');
      await waitFor(function () { return field('category'); }, 8000, 'the problem form');
      spendRead();
      await pick('category', p.category);
      await fill('note', p.note);
      await tick('stoppedConfirmed', null, true);
      await tap('[data-act=send]', 'Put a flag on T.Chris’s screen');
      await waitFor(function () { return /Flag sent/.test(($('h1') || {}).textContent || ''); }, 6000, 'the flag to be sent').catch(function () { throw new Error('flag not sent: ' + invalids().join('; ')); });
      spendRead();
    }
  };

  S.final = {
    done: function () { return false; },
    run: async function () {
      B.at = 'sync';
      await waitQueue(120000);
      // read back what the server holds (the app's own bootstrap, as a reload would)
      try {
        var r = await api().bootstrap();
        if (r && r.ok) { B.saved = counts(api().data()); B.savedFrom = 'server bootstrap'; }
        else { B.saved = counts(D()); B.savedFrom = 'app cache (bootstrap failed)'; warn('bootstrap failed: ' + JSON.stringify(r && r.error)); }
      } catch (e) { B.saved = counts(D()); B.savedFrom = 'app cache'; }
      B.xp = Number(((api().data() || D()).state || {}).xp) || 0;
      expectCheck(api().data() || D());
    }
  };

  S.signout = {
    done: function () { return B.opts.signOut === false || !session(); },
    run: async function () {
      await waitQueue(120000);
      if (qlen()) { err('not signing out: ' + qlen() + ' entries still waiting to send'); return; }
      persist();
      await goTo('#/more');
      spendRead();
      await tap('[data-act=signout]', 'Sign out');
      await sleep(1200);
      var y = sheet() && sheet().querySelector('[data-act=no]');
      if (y) { err('sign-out asked to drop unsent entries; stayed signed in'); await tap(y, 'Stay signed in'); return; }
      await waitFor(function () { return /^#\/login/.test(location.hash) && !session(); }, 10000, 'sign-out');
      say('signed out');
    }
  };

  /* ---------------------------------------------------------------- results */
  function counts(d) {
    d = d || {};
    var sid = (d.student && d.student.id) || '';
    var mine = function (a) { return live(a).filter(function (r) { return !r.studentId || r.studentId === sid; }); };
    var w = d.word || {};
    return {
      word: w.posConfirmed ? 1 : 0, wordCard: chkOn(d, 'word.card'), zeroBaseline: chkOn(d, 'word.zb'), regStatus: w.regStatus || '',
      fudge: chkOn(d, 'word.fudge'), hypotheses: (w.hypotheses || []).length, specRows: Object.keys(w.specSheet || {}).length,
      plans: mine(d.plans).length, planActions: mine(d.planActions).length, actions: mine(d.actions).length, journal: mine(d.journal).length,
      sightings: mine(d.sightings).length, tallies: mine(d.tallies).length, files: mine(d.files).length,
      ownItems: (d.checklist || []).filter(function (r) { return r.source === 'own'; }).length,
      handTicks: (d.checklist || []).filter(function (r) { return r.status === 'done' && r.doneBy === 'manual'; }).length,
      autoTicks: (d.checklist || []).filter(function (r) { return r.status === 'done' && r.doneBy === 'auto'; }).length,
      rulesTicked: ((d.state || {}).rulesTicked || []).filter(Boolean).length,
      reports: mine(d.reports).map(function (r) { return r.type + ':' + r.status; }).join(',') || '', flags: mine(d.flags).length,
      requests: mine(d.requests).length, xp: Number((d.state || {}).xp) || 0
    };
  }
  function chkOn(d, key) { try { return E().checks[key](d, E().weekIdOf(nowIso())) ? 1 : 0; } catch (e) { return 0; } }
  function expectCheck(d) {
    var p = P(), c = counts(d);
    var want = { planActions: p.planActions.length, actions: p.actions.length, journal: p.journal.length, sightings: p.sightings.length, tallies: p.tallies.length,
      files: (p.zb.shot ? 1 : 0) + p.sightings.filter(function (s) { return s.shot; }).length, ownItems: 1, flags: p.problem ? 1 : 0, rulesTicked: 6 };
    Object.keys(want).forEach(function (k) { if (c[k] !== want[k]) err('expected ' + want[k] + ' ' + k + ', the server has ' + c[k]); });
    if (c.word !== 1 || !c.wordCard || !c.zeroBaseline || !c.fudge) err('audition incomplete on the server: ' + JSON.stringify(c));
    if (!/baseline:(ready|submitted)/.test(c.reports)) err('baseline report not ready on the server (' + c.reports + ')');
    B.expected = want;
  }
  function round1(x) { return Math.round(x / 6) / 10; }
  function summary() {
    var by = {}, tot = 0;
    Object.keys(B.sim).forEach(function (k) { by[k] = round1(B.sim[k]); tot += B.sim[k]; });
    var p = P() || {};
    return {
      persona: { id: p.id, level: p.level, studentId: p.studentId, label: p.label, word: p.first && p.first.word },
      simMinutesByScreen: by, totalSimMinutes: round1(tot), totalSimHours: Math.round(tot / 360) / 10, screenWords: B.words || {},
      saved: B.saved || (D() ? counts(D()) : null), savedFrom: B.savedFrom || 'app cache', expected: B.expected || null,
      steps: B.steps, thisRun: B.thisRun || {}, errors: B.errors.slice(), warnings: B.warnings.slice(),
      uxNotes: B.uxNotes.map(function (u) { return { screen: u.screen, note: u.note }; }), stumbles: B.stumbles.slice(),
      guess: B.guess || null, xpGained: B.xpGained, opErrors: B.opErrors, windowOpen: B.windowOpen,
      realSeconds: Math.round((B.realMs + (B.running && B.t0 ? Date.now() - B.t0 : 0)) / 1000),
      startedAt: B.startedAt, finishedAt: B.finishedAt, done: B.done, running: B.running, version: VERSION
    };
  }
  function persist() {
    if (!P()) return;
    try {
      localStorage.setItem(STORE + P().studentId, JSON.stringify({ version: VERSION, persona: P().id, sim: B.sim, seen: B.seen, steps: B.steps, errors: B.errors, warnings: B.warnings,
        uxNotes: B.uxNotes, stumbles: B.stumbles, log: B.log.slice(-150), words: B.words, startedAt: B.startedAt, realMs: B.realMs + (B.running && B.t0 ? Date.now() - B.t0 : 0), guess: B.guess, jargonSeen: B.jargonSeen,
        xpGained: B.xpGained, saved: B.saved, savedFrom: B.savedFrom, expected: B.expected, finishedAt: B.finishedAt, done: B.done }));
    } catch (e) { /* storage full: ignore */ }
  }
  function restore(id) {
    try {
      var s = JSON.parse(localStorage.getItem(STORE + id) || 'null');
      if (!s || s.version !== VERSION || s.persona !== P().id) return false;
      ['sim', 'seen', 'steps', 'errors', 'warnings', 'uxNotes', 'stumbles', 'log', 'words', 'startedAt', 'realMs', 'guess', 'jargonSeen', 'xpGained', 'saved', 'savedFrom', 'expected', 'finishedAt', 'done'].forEach(function (k) { if (s[k] != null) B[k] = s[k]; });
      return true;
    } catch (e) { return false; }
  }

  /* ---------------------------------------------------------------- hooks and run */
  var hooked = false;
  function hook() {
    if (hooked) return; hooked = true;
    root.confirm = function () { return true; };
    root.alert = function (m) { say('alert silenced: ' + String(m).slice(0, 80)); };
    root.open = function (u) { B.windowOpen++; say('window.open blocked: ' + u); return null; };
    var a = api();
    if (a && a.on) {
      a.on('gained', function (list) { (list || []).forEach(function (g) { B.xpGained += Number(g.xp) || 0; }); });
      a.on('opError', function (e) { if (!B.running) return; B.opErrors++; err('server refused ' + (e.op && e.op.action) + ': ' + ((e.error && (e.error.code + ' ' + (e.error.message || ''))) || '?')); });
    }
    var box = document.getElementById('toasts');
    if (box && root.MutationObserver) new MutationObserver(function (ms) {
      ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, function (n) {
        if (!n.classList) return;
        var t = norm(n.textContent);
        B.toasts.push(t);
        var nT = box.querySelectorAll('.toast').length;
        if (nT >= 3 && B.running && !B.toastNoted) { B.toastNoted = true; ux(B.at || 'app', 'Three toasts were on screen at once (first seen on this screen: "' + Array.prototype.map.call(box.querySelectorAll('.toast'), function (x) { return norm(x.textContent).slice(0, 30); }).join('" / "') + '"). They cover the lower third of a 390 × 844 phone screen, including form fields and open sheets, for about 4 s (the bot taps faster than a student, so this happens less often in real use).'); }
        if (n.classList.contains('err') && B.running && !/check the boxes marked in red/i.test(t)) err('error toast: ' + t);
      }); });
    }).observe(box, { childList: true });
    root.addEventListener('error', function (ev) { if (B.running) err('page error: ' + (ev.message || ev)); });
    root.addEventListener('unhandledrejection', function (ev) { if (B.running) warn('unhandled promise: ' + String(ev.reason && ev.reason.message || ev.reason).slice(0, 120)); });
  }
  function init(persona, opts) {
    if (B.running) throw new Error('WIBOT is running; call stopNow() first.');
    if (!persona || !persona.studentId || !persona.first) throw new Error('init needs a persona object (personas/B1.json).');
    if (!root.WIApp || !root.WI || !root.WIApi) throw new Error('Open WordIdol (index.html) first.');
    var s = session();
    if (!s || !s.student) throw new Error('No student is signed in. Ask the teacher to sign the guest in first.');
    if (!/^Guest#\d$/.test(s.student.label || '')) throw new Error('Refusing to run: the signed-in student (' + s.student.label + ') is not a guest account.');
    if (s.student.id !== persona.studentId) throw new Error('Signed in as ' + s.student.label + ' (' + s.student.id + '), but this persona is for ' + persona.label + ' (' + persona.studentId + ').');
    B.persona = persona; B.opts = Object.assign({ signOut: true, delayMin: 150, delayMax: 400 }, opts || {});
    ['log', 'errors', 'warnings', 'uxNotes', 'stumbles', 'toasts'].forEach(function (k) { B[k] = []; });
    B.sim = {}; B.seen = {}; B.words = {}; B.steps = {}; B.realMs = 0; B.done = false; B.stopped = false; B.saved = null; B.expected = null; B.xpGained = 0; B.opErrors = 0; B.jargonSeen = {};
    if (!B.opts.fresh && restore(persona.studentId)) say('resuming an earlier run of ' + persona.label);
    else { B.startedAt = new Date().toISOString(); localStorage.removeItem(STORE + persona.studentId); }
    B.done = false; B.finishedAt = null;
    hook();
    say('ready: ' + persona.label + ' (' + persona.level + '), word "' + persona.first.word + '"');
    return summary();
  }
  async function run() {
    if (!P()) throw new Error('call WIBOT.init(persona) first');
    if (B.running) return summary();
    B.running = true; B.stopped = false; B.t0 = Date.now(); B.thisRun = {};
    try {
      var w = D() && D().word;
      if (w && w.word && norm(w.word).toLowerCase() !== norm(P().first.word).toLowerCase()) throw new Error('This guest already has the word "' + w.word + '". Reset the guest (or use a fresh one) before this persona runs.');
      for (var i = 0; i < STEP_ORDER.length; i++) {
        var id = STEP_ORDER[i], st = S[id];
        if (B.stopped) throw new Stop();
        if (id === 'problem' && !P().problem) continue;
        B.at = { first: 'first', card: 'audition/card', zb: 'audition/zb', submit: 'audition/submit', fudge: 'audition/fudge', hyp: 'audition/hyp', spec: 'audition/spec',
          choices: 'debut/choices', rules: 'debut/rules', planActions: 'debut/table', actions: 'log/action', journal: 'log/journal', sightings: 'log/sighting', tallies: 'log/tally',
          week: 'week', stuck: 'home', report: 'report/baseline', problem: 'problem', review: 'review', final: 'sync', signout: 'more' }[id] || id;
        var was = false; try { was = st.done(); } catch (e) { was = false; }
        if (was && id !== 'final') { if (!B.steps[id]) B.steps[id] = 'already done'; B.thisRun[id] = 'skipped'; say('skip ' + id + ' (already done)'); continue; }
        say('step ' + id);
        B.thisRun[id] = 'ran';
        try { await st.run(); B.steps[id] = 'done'; }
        catch (e) {
          if (e instanceof Stop) throw e;
          B.steps[id] = 'failed';
          err(id + ' failed: ' + (e && e.message || e));
          if (['first'].indexOf(id) >= 0) throw new Error('cannot go on without the first step');
        }
        persist();
      }
      B.done = true; B.finishedAt = new Date().toISOString();
      say('finished: ' + summary().totalSimMinutes + ' simulated minutes');
    } catch (e) {
      if (e instanceof Stop) say('stopped by stopNow()');
      else err('run stopped: ' + (e && e.message || e));
    } finally {
      B.realMs += Date.now() - B.t0; B.t0 = 0; B.running = false; persist();
    }
    return summary();
  }

  root.WIBOT = {
    init: init, run: run, summary: summary,
    stopNow: function () { B.stopped = true; B.paused = null; say('stop requested'); },
    release: function () { B.paused = null; },
    get paused() { return B.paused; }, get running() { return B.running; }, get log() { return B.log; },
    version: VERSION
  };
})();
