/* WordIdol student app (W2): router, guard, screens, forms, drafts, upload, toasts.
   All business logic comes from engine.js (window.WI); all content from data/*.js.
   This file holds UI wording only. */
(function () {
  'use strict';
  var root = window;
  var api = root.WIApi.student();
  var LS = root.WIApi.LS;
  var view, D = null, cur = { acts: {}, onInput: null, onChange: null, cleanup: null, path: '' };

  /* ======================= small helpers ======================= */
  function E() { return root.WI || {}; }
  function now() { return api.nowIso(); }
  function today() { var e = E(); return e.dateOf ? e.dateOf(now()) : now().slice(0, 10); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function try_(fn, dflt) { try { var v = fn(); return v === undefined ? dflt : v; } catch (e) { if (root.console) console.warn(e); return dflt; } }
  function fmt(d, style) { if (!d) return ''; return try_(function () { return E().fmtDate(d, style); }, String(d).slice(0, 10)); }
  function CH(list) { return (root.WI_CHOICES && root.WI_CHOICES[list]) || []; }
  function opt(list, id) { var a = CH(list); for (var i = 0; i < a.length; i++) if (String(a[i].id) === String(id)) return a[i]; return null; }
  function lab(list, id) { var o = opt(list, id); return o ? (o.shownAs || o.label) : (id == null ? '' : String(id)); }
  function G() { return root.GUIDE || {}; }
  function RULES() { return (root.WI_RULES && root.WI_RULES.rules) || []; }
  function rulesData() { return root.WI_RULES || {}; }
  function release() { return Number((root.WI_CONFIG && root.WI_CONFIG.release) || 1); }
  function wc(t) { return try_(function () { return E().wordCount(t); }, root.WIApi.countWords(t)); }
  function live(list) { return (list || []).filter(function (r) { return r && r.deleted !== true; }); }
  function byDateDesc(a, b) { return String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')); }
  function sid() { return D && D.student ? D.student.id : ''; }
  function curWeek() { return try_(function () { return E().weekIdOf(now()); }, (D && D.state && D.state.weekId) || 'W01'); }
  function stageId() { return try_(function () { return E().stageOf(D, now()); }, (D && D.state && D.state.stage) || 's1'); }
  function check(key, weekId) { return !!try_(function () { return E().checks[key](D, weekId || curWeek()); }, false); }
  function onlineOpen() { return !!try_(function () { return E().onlineUnlocked(D, now(), D.config); }, false); }
  function plan1() { return (D.plans || []).filter(function (p) { return Number(p.phase) === 1; })[0] || null; }
  function words(n) { return n === 1 ? '1 word' : n + ' words'; }
  function an(w) { return /^[aeiou]/i.test(w) ? 'an' : 'a'; }
  function fileById(id) { return (D.files || []).filter(function (f) { return f.id === id; })[0]; }
  function qs(s, el) { return (el || document).querySelector(s); }
  function qsa(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function uniq(a) { var o = []; a.forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); return o; }
  function addDays(d, n) { return try_(function () { return E().addDays(d, n); }, d); }

  /* ======================= icons (inline SVG) ======================= */
  var P = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
    week: '<rect x="4" y="4" width="16" height="17" rx="3"/><path d="M8 2.5v3M16 2.5v3M8 11l2 2 4-4M8 17h8"/>',
    log: '<path d="M6 3.5h10.5L19 6v14.5H6z"/><path d="M9 9h7M9 13h7M9 17h4"/>',
    plan: '<path d="M4 6.5 9 4l6 2.5L20 4v13.5L15 20l-6-2.5L4 20z"/><path d="M9 4v13.5M15 6.5V20"/>',
    more: '<circle cx="5.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.5" cy="12" r="1.6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    right: '<path d="m9 5 7 7-7 7"/>',
    left: '<path d="m15 5-7 7 7 7"/>',
    down: '<path d="m5 9 7 7 7-7"/>',
    go: '<path d="M5 12h12"/><path d="m12 6 6 6-6 6"/>',
    tick: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/>',
    camera: '<path d="M4 8h3.5L9 5.5h6L16.5 8H20v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    tally: '<path d="M6 5v14M10 5v14M14 5v14M18 5v14M3.5 15.5l17-7"/>',
    book: '<path d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5v14c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5z"/><path d="M12 6v14"/>',
    flag: '<path d="M5 21V4M5 4.5h11l-2 4 2 4H5"/>',
    star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6"/><circle cx="12" cy="17.3" r=".9"/>',
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8.5 20.5h7"/>',
    exit: '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    rules: '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    image: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/>'
  };
  function ic(name, cls) {
    return '<svg class="' + (cls || '') + '" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }

  /* ======================= toasts and confetti ======================= */
  function toast(msg, kind, ms) {
    var box = document.getElementById('toasts');
    if (!box) return;
    var t = document.createElement('div');
    t.className = 'toast' + (kind ? ' ' + kind : '');
    t.setAttribute('role', 'status');
    t.innerHTML = msg;
    box.appendChild(t);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, ms || 3800);
  }
  function confetti() {
    if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var c = document.createElement('canvas');
    c.id = 'confetti'; c.width = innerWidth; c.height = innerHeight;
    document.body.appendChild(c);
    var x = c.getContext('2d'), cols = ['#e5337a', '#f2b632', '#ff86b3', '#ffffff', '#7a2a6e'], ps = [];
    for (var i = 0; i < 120; i++) ps.push({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.4, vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 3, r: 3 + Math.random() * 4, c: cols[i % cols.length], a: Math.random() * 6 });
    var t0 = Date.now();
    (function frame() {
      x.clearRect(0, 0, c.width, c.height);
      ps.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.a += .1; x.fillStyle = p.c; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); x.restore(); });
      if (Date.now() - t0 < 2600) requestAnimationFrame(frame); else c.parentNode && c.parentNode.removeChild(c);
    })();
  }
  function ruleName(ruleId) { return (XP_FOR && XP_FOR[ruleId]) || ''; }
  function badgeDef(id) { return ((root.WI_GAME && root.WI_GAME.badges) || []).filter(function (b) { return b.id === id; })[0] || { id: id, name: id }; }
  var lastXp = null, lastRank = null;
  function noteState(st) {
    if (!st) return;
    var xp = Number(st.xp) || 0;
    var rk = try_(function () { return E().rankOf(xp); }, null);
    if (lastRank && rk && rk.id !== lastRank.id && xp > lastXp) {
      toast('You are now a <b>' + esc(rk.name) + '</b>!', 'xp', 5000);
      confetti();
    }
    lastXp = xp; lastRank = rk;
    renderChrome();
  }
  /* XP arrives in bursts (a save plus its auto-ticks): show one XP toast per burst and one per badge */
  var xpBurst = { xp: 0, rules: [], t: null };
  api.on('gained', function (list) {
    list.forEach(function (g) {
      if (g.badgeId) toast('New badge: <b>' + esc(badgeDef(g.badgeId).name) + '</b>', 'xp', 4500);
      if (g.xp) { xpBurst.xp += Number(g.xp) || 0; if (xpBurst.rules.indexOf(g.ruleId) < 0) xpBurst.rules.push(g.ruleId); }
    });
    if (!xpBurst.xp) return;
    clearTimeout(xpBurst.t);
    xpBurst.t = setTimeout(function () {
      var why = xpBurst.rules.length === 1 ? ruleName(xpBurst.rules[0]) : 'for documenting your work';
      toast('<span class="xpn">+' + esc(xpBurst.xp) + ' XP</span>' + esc(why), 'xp');
      xpBurst = { xp: 0, rules: [], t: null };
    }, 700);
  });
  api.on('state', noteState);
  api.on('opError', function (e) {
    var m = (e.error && e.error.message) || 'WordIdol could not save that.';
    toast(esc(m), 'err', 6000);
    // undo the optimistic change by reloading the server copy
    api.bootstrap().then(function (r) { if (r.ok) { D = api.data(); rerender(); } });
  });
  api.on('auth', function () {
    // the server no longer accepts this session (PIN reset or expiry): forget the token, keep unsent work
    var had = !!api.session();
    api.dropSession();
    if (cur.path !== 'login') { if (had) toast('Please sign in again. Your unsent work is safe on this phone.', 'err', 6000); closeSheets(); location.hash = '#/login'; }
  });
  api.on('queue', function () { renderChrome(); });
  api.on('synced', function () { D = api.data() || D; renderChrome(); refreshSaveStates(); });
  api.on('offline', function () { renderChrome(); refreshSaveStates(); });

  /* ======================= sheets (modal) ======================= */
  var sheetStack = [];
  function openSheet(title, html, onAct) {
    var scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="grab"></div>' +
      '<div class="sheet-h"><h2>' + esc(title) + '</h2><button class="iconbtn" data-close aria-label="Close">' + ic('x') + '</button></div>' +
      '<div class="sheet-b">' + html + '</div></div>';
    document.body.appendChild(scrim);
    var api_ = {
      el: scrim.querySelector('.sheet-b'),
      close: function () { if (scrim.parentNode) scrim.parentNode.removeChild(scrim); sheetStack = sheetStack.filter(function (s) { return s !== api_; }); }
    };
    scrim.addEventListener('click', function (ev) {
      if (ev.target === scrim || ev.target.closest('[data-close]')) { api_.close(); return; }
      var a = ev.target.closest('[data-act]');
      if (a && onAct && !doubleTap(a)) onAct(a.getAttribute('data-act'), a, api_, ev);
    });
    sheetStack.push(api_);
    var f = scrim.querySelector('input,select,textarea,button:not([data-close])');
    if (f && f.focus) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 50);
    return api_;
  }
  function closeSheets() { sheetStack.slice().forEach(function (s) { s.close(); }); }
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && sheetStack.length) sheetStack[sheetStack.length - 1].close(); });
  function confirmSheet(title, text, yes, no) {
    return new Promise(function (resolve) {
      var s = openSheet(title, '<p>' + text + '</p><div class="btnrow"><button class="btn primary" data-act="yes">' + esc(yes) + '</button><button class="btn ghost" data-act="no">' + esc(no || 'Cancel') + '</button></div>',
        function (a, el, sh) { sh.close(); resolve(a === 'yes'); });
      void s;
    });
  }

  /* ======================= forms: render, read, validate, drafts ======================= */
  // def: {n, t, l, h, form, opts:[{id,label,sub,disabled,also}], show(vals), num, bool, rows, ph, cls, R, min, max, words}
  function schemaRule(formKey, name) {
    var f = root.WI_SCHEMA && root.WI_SCHEMA.fields && root.WI_SCHEMA.fields[formKey];
    return (f && f[name]) || null;
  }
  function ruleOf(def) {
    var r = Object.assign({}, schemaRule(def.form, def.n) || {});
    ['R', 'min', 'max', 'words', 'maxWords', 'minDate', 'maxDate', 'containsWord', 'mustBeTrue', 'reqIf', 'minN', 'pattern'].forEach(function (k) {
      if (def[k] !== undefined) { if (k === 'R') r.req = def.R; else r[k] = def[k]; }
    });
    if (def.t === 'checks' && def.minN) r.min = def.minN;
    return r;
  }
  function isEmpty(v) { return v == null || v === '' || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length); }
  function dateLimit(x) { return x === 'today' ? today() : x; }
  function checkField(def, v, vals, ctx) {
    var r = ruleOf(def);
    var req = !!r.req;
    if (r.reqIf) Object.keys(r.reqIf).forEach(function (k) {
      var ov = vals[k]; var want = r.reqIf[k];
      if (Array.isArray(ov) ? ov.some(function (x) { return want.indexOf(x) >= 0; }) : want.indexOf(ov) >= 0) req = true;
    });
    if (def.t === 'tick') {
      if ((req || r.mustBeTrue) && v !== true) return 'Please tick this box.';
      return '';
    }
    if (isEmpty(v)) {
      if (!req) return '';
      if (def.t === 'checks') return 'Please choose at least one.';
      if (def.t === 'select' || def.t === 'radio' || def.t === 'slider') return 'Please choose one.';
      if (def.t === 'date') return 'Please choose a date.';
      return 'Please fill this in.';
    }
    if (def.t === 'checks') {
      if (r.min && v.length < r.min) return 'Please choose at least ' + r.min + '.';
      return '';
    }
    if (def.t === 'number' || r.type === 'int') {
      var n = Number(v);
      if (!/^-?\d+$/.test(String(v)) || (r.min != null && n < r.min) || (r.max != null && n > r.max)) return 'Enter a whole number from ' + (r.min || 0) + ' to ' + r.max + '.';
      return '';
    }
    if (def.t === 'date') {
      var lo = dateLimit(r.minDate), hi = dateLimit(r.maxDate);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Please choose a date.';
      if (hi === today() && v > hi) return 'This date cannot be in the future.';
      if ((lo && v < lo) || (hi && v > hi)) return 'Choose a date from ' + fmt(lo || v, 'long') + ' to ' + (hi === today() ? 'today' : fmt(hi || v, 'long')) + '.';
      return '';
    }
    if (def.t === 'select' || def.t === 'radio' || def.t === 'slider') return '';
    var s = String(v).trim();
    if (def.t === 'url') {
      if (!/^https:\/\/\S+$/i.test(s)) return 'The link must start with https://';
    }
    if (r.words) {
      var w = wc(s);
      if (r.min && w < r.min) return 'Write at least ' + r.min + ' words.';
      if (r.max && w > r.max) return 'Use ' + r.max + ' words or fewer.';
    } else {
      if (r.min && s.length < r.min) return 'Write at least ' + r.min + ' characters.';
      if (r.max && s.length > r.max) return 'Use ' + r.max + ' characters or fewer.';
    }
    if (r.maxWords && wc(s) > r.maxWords) return 'Use ' + r.maxWords + ' words or fewer.';
    if (r.pattern && !(new RegExp(r.pattern)).test(s)) return def.patternMsg || 'Please check what you wrote here.';
    if (r.containsWord && ctx && ctx.word) {
      var ok = try_(function () { return E().pos.containsWord(ctx.word, s); }, true);
      if (!ok) return 'Use your word "' + ctx.word + '" in this sentence.';
    }
    if (def.check) { var m = def.check(v, vals); if (m) return m; }
    return '';
  }
  function validate(defs, vals, ctx) {
    var errs = {};
    defs.forEach(function (d) {
      if (d.t === 'html' || d.t === 'info') return;
      if (d.show && !d.show(vals)) return;
      var m = checkField(d, vals[d.n], vals, ctx);
      if (m) errs[d.n] = m;
    });
    return errs;
  }
  function showErrs(el, errs) {
    qsa('.field', el).forEach(function (f) { f.classList.remove('invalid'); var e = qs('.err', f); if (e) e.textContent = ''; });
    var first = null;
    Object.keys(errs).forEach(function (k) {
      var f = qs('[data-f="' + k + '"]', el);
      if (!f) return;
      f.classList.add('invalid');
      var e = qs('.err', f); if (e) e.textContent = errs[k];
      if (!first) first = f;
    });
    if (first) {
      first.scrollIntoView({ block: 'center', behavior: 'smooth' });
      var inp = qs('input,select,textarea', first); if (inp) try { inp.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    return !first;
  }

  function counterText(def, v) {
    var r = ruleOf(def), s = String(v || '');
    if (r.words || def.showWords) {
      var w = wc(s);
      return { t: words(w) + (r.max && r.words ? ' of ' + r.max : '') + (def.wordGoal ? ' (aim for ' + def.wordGoal + ')' : ''), over: r.words && r.max && w > r.max };
    }
    if (def.t === 'number' || def.t === 'date' || r.type === 'int') return null;
    if (r.max) return { t: s.trim().length + ' / ' + r.max, over: s.trim().length > r.max };
    return null;
  }
  function optsOf(def) { return typeof def.opts === 'function' ? def.opts() : (def.opts || []); }
  function fieldHTML(def, vals) {
    var v = vals[def.n];
    if (def.t === 'html') return def.html(vals);
    var id = 'f_' + def.n.replace(/\W/g, '_');
    var r = ruleOf(def);
    var hidden = def.show && !def.show(vals) ? ' hidden' : '';
    var h = '<div class="field ' + (def.cls || '') + hidden + '" data-f="' + esc(def.n) + '">';
    var lbl = esc(def.l) + (r.req || def.t === 'tick' || def.noOpt ? '' : ' <span class="muted small">(optional)</span>');
    var hint = def.h ? '<p class="hint" id="' + id + '_h">' + def.h + '</p>' : '';
    var desc = def.h ? ' aria-describedby="' + id + '_h"' : '';
    if (def.t === 'radio' || def.t === 'checks') {
      var type = def.t === 'radio' ? 'radio' : 'checkbox';
      h += '<fieldset><legend>' + lbl + '</legend>' + hint + '<div class="opts' + (def.two ? ' two' : '') + '">';
      optsOf(def).forEach(function (o) {
        var val = String(o.id);
        var on = def.t === 'radio' ? (v != null && String(v) === val) : (Array.isArray(v) && v.map(String).indexOf(val) >= 0);
        h += '<label class="opt' + (o.disabled ? ' disabled' : '') + '"><input type="' + type + '" name="' + esc(def.n) + '" value="' + esc(val) + '"' + (on ? ' checked' : '') + (o.disabled ? ' disabled' : '') + '>' +
          '<span class="lbl">' + esc(o.label) + (o.also ? '<span class="also">also possible</span>' : '') + (o.sub ? '<span class="sub">' + o.sub + '</span>' : '') + '</span></label>';
      });
      h += '</div></fieldset>';
    } else if (def.t === 'tick') {
      h += '<label class="tickline"><input type="checkbox" name="' + esc(def.n) + '"' + (v === true ? ' checked' : '') + '><span>' + esc(def.l) + '</span></label>' + hint;
    } else if (def.t === 'select') {
      h += '<label for="' + id + '">' + lbl + '</label>' + hint + '<select id="' + id + '" name="' + esc(def.n) + '"' + desc + '><option value="">' + esc(def.ph || 'Choose…') + '</option>';
      optsOf(def).forEach(function (o) { h += '<option value="' + esc(o.id) + '"' + (v != null && String(v) === String(o.id) ? ' selected' : '') + (o.disabled ? ' disabled' : '') + '>' + esc(o.label) + '</option>'; });
      h += '</select>';
    } else if (def.t === 'slider') {
      h += '<label for="' + id + '">' + lbl + '</label>' + hint + '<div class="slider"><input type="range" id="' + id + '" name="' + esc(def.n) + '" min="0" max="2" step="1" value="' + esc(v == null || v === '' ? 1 : v) + '"' + (v == null || v === '' ? ' data-unset="1"' : '') + '><output>' + esc(v == null || v === '' ? '–' : v) + '</output></div>';
    } else {
      var c = counterText(def, v);
      h += '<label for="' + id + '">' + lbl + '</label>' + hint;
      if (def.t === 'textarea') h += '<textarea id="' + id + '" name="' + esc(def.n) + '"' + desc + (def.rows ? ' rows="' + def.rows + '"' : '') + (def.tall ? ' class="tall"' : '') + (def.ph ? ' placeholder="' + esc(def.ph) + '"' : '') + '>' + esc(v || '') + '</textarea>';
      else {
        var it = def.t === 'number' ? 'number" inputmode="numeric' : (def.t === 'date' ? 'date' : (def.t === 'url' ? 'url' : 'text'));
        var extra = '';
        if (def.t === 'date') { if (r.minDate) extra += ' min="' + dateLimit(r.minDate) + '"'; if (r.maxDate) extra += ' max="' + dateLimit(r.maxDate) + '"'; }
        if (def.t === 'number') { if (r.min != null) extra += ' min="' + r.min + '"'; if (r.max != null) extra += ' max="' + r.max + '"'; }
        h += '<input type="' + it + '" id="' + id + '" name="' + esc(def.n) + '" value="' + esc(v == null ? '' : v) + '"' + desc + extra + (def.ph ? ' placeholder="' + esc(def.ph) + '"' : '') + ' autocomplete="off">';
      }
      if (c) h += '<div class="count' + (c.over ? ' over' : '') + '" aria-live="polite">' + esc(c.t) + '</div>';
    }
    if (def.after) h += def.after(vals);
    h += '<div class="err" role="alert"></div></div>';
    return h;
  }
  function fieldsHTML(defs, vals) { return defs.map(function (d) { return fieldHTML(d, vals); }).join(''); }
  function readVals(el, defs, base) {
    var vals = Object.assign({}, base || {});
    defs.forEach(function (d) {
      if (d.t === 'html' || d.t === 'info') return;
      var name = d.n;
      if (d.t === 'radio') {
        var c = qs('input[name="' + cssq(name) + '"]:checked', el);
        var v = c ? c.value : '';
        if (v !== '' && d.num) v = Number(v);
        if (v !== '' && d.bool) v = v === 'true';
        vals[name] = v;
      } else if (d.t === 'checks') {
        vals[name] = qsa('input[name="' + cssq(name) + '"]:checked', el).map(function (x) { return x.value; });
      } else if (d.t === 'tick') {
        var t = qs('input[name="' + cssq(name) + '"]', el); vals[name] = !!(t && t.checked);
      } else if (d.t === 'slider') {
        var s = qs('input[name="' + cssq(name) + '"]', el);
        vals[name] = s ? (s.getAttribute('data-unset') ? '' : Number(s.value)) : '';
      } else {
        var i = qs('[name="' + cssq(name) + '"]', el);
        if (!i) return;
        var val = i.value;
        if (d.t === 'number') val = val === '' ? '' : Number(val);
        else if (typeof val === 'string' && d.t !== 'textarea') val = val.trim();
        vals[name] = val;
      }
    });
    return vals;
  }
  function cssq(s) { return String(s).replace(/(["\\])/g, '\\$1'); }
  function trimVals(vals) { var o = {}; Object.keys(vals).forEach(function (k) { o[k] = typeof vals[k] === 'string' ? vals[k].trim() : vals[k]; }); return o; }

  /* drafts in localStorage: wi.draft.<route>.<id> */
  function draftKey(route, id) { return 'wi.draft.' + route + '.' + (id || 'main'); }
  function getDraft(k) { return LS.get(k); }
  function putDraft(k, vals) { LS.set(k, vals); }
  function dropDraft(k) { LS.del(k); }

  /* live behaviour for a form element: counters, conditional fields, drafts, slider outputs */
  function liveForm(el, defs, opts) {
    opts = opts || {};
    function update(ev) {
      var vals = readVals(el, defs, opts.base);
      defs.forEach(function (d) {
        var box = qs('[data-f="' + cssq(d.n) + '"]', el);
        if (!box) return;
        if (d.show) box.classList.toggle('hidden', !d.show(vals));
        var cnt = qs('.count', box);
        if (cnt) { var c = counterText(d, vals[d.n]); if (c) { cnt.textContent = c.t; cnt.classList.toggle('over', !!c.over); } }
      });
      if (ev && ev.target && ev.target.type === 'range') {
        ev.target.removeAttribute('data-unset');
        var o = ev.target.parentNode.querySelector('output'); if (o) o.textContent = ev.target.value;
      }
      if (opts.draft) { putDraft(opts.draft, vals); setSaveState(el, 'local'); }
      if (opts.onChange) opts.onChange(vals, ev);
    }
    el.addEventListener('input', update);
    el.addEventListener('change', update);
    return { vals: function () { return readVals(el, defs, opts.base); }, update: update };
  }
  function saveStateHTML() { return '<span class="savestate" aria-live="polite"></span>'; }
  function setSaveState(el, st) {
    var s = qs('.savestate', el.closest('main') || el) || qs('.savestate', el);
    if (!s) return;
    s.setAttribute('data-st', st);
    if (st === 'local') { s.textContent = 'Saved on this phone'; s.className = 'savestate'; }
    else if (st === 'server') { s.textContent = 'Saved'; s.className = 'savestate ok'; }
    else if (st === 'queued') { s.textContent = 'Waiting to send (offline)'; s.className = 'savestate wait'; }
    else { s.textContent = ''; s.className = 'savestate'; }
  }
  function refreshSaveStates() {
    var q = api.queue().length;
    qsa('.savestate').forEach(function (s) {
      var st = s.getAttribute('data-st');
      if (st === 'queued' && !q) { s.textContent = 'Saved'; s.className = 'savestate ok'; s.setAttribute('data-st', 'server'); }
    });
  }
  /* save through the queue; updates the status line; returns the op result */
  function save(action, data, el) {
    var p = api.save(action, data);
    D = api.data() || D;
    afterLocalChange();
    return p.then(function (res) {
      D = api.data() || D;
      if (el) setSaveState(el, res && res.queued ? 'queued' : (res && res.ok ? 'server' : 'local'));
      return res;
    });
  }
  /* client-side auto ticks after a change (the server re-checks; SPEC §5.2) */
  var ticking = false;
  function afterLocalChange() {
    if (ticking || !D) return;
    ticking = true;
    try {
      var ticks = try_(function () { return E().autoTicks(D, null, now()); }, []) || [];
      ticks.forEach(function (t) { api.save('checklist.tick', { rowId: t.id, done: true, auto: true }); });
      D = api.data() || D;
    } finally { ticking = false; }
    renderChrome();
  }

  /* ======================= stage path (signature) ======================= */
  function stagePath() {
    var p = try_(function () { return E().stagePath(D, now()); }, null);
    if (p && p.length) return p;
    var st = (root.WI_PLAN && root.WI_PLAN.stages) || [];
    var c = stageId();
    var ci = st.map(function (s) { return s.id; }).indexOf(c);
    return st.map(function (s, i) { return { id: s.id, name: s.name, met: i <= ci, current: s.id === c }; });
  }
  function stageName(id) {
    var s = ((root.WI_PLAN && root.WI_PLAN.stages) || []).filter(function (x) { return x.id === id; })[0];
    return s ? s.name : id;
  }
  function trussSVG(path) {
    var w = 350, h = 74, s = '';
    s += '<svg class="truss" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Stage path: ' +
      esc(path.map(function (p) { return p.name + (p.current ? ' (now)' : (p.met ? ' (reached)' : '')); }).join(', ')) + '">';
    s += '<rect x="6" y="8" width="338" height="9" rx="4.5" fill="#120a1c" stroke="#5b4580" stroke-width="1.5"/>';
    for (var k = 0; k < 22; k++) s += '<path d="M' + (12 + k * 15) + ' 9.5l7.5 6" stroke="#5b4580" stroke-width="1.2"/>';
    path.forEach(function (p, i) {
      var x = 25 + i * 50;
      var lens = p.current ? 'lamp-now' : (p.met ? 'lamp-on' : 'lamp-off');
      s += '<g' + (p.current ? ' data-now="1"' : '') + '>';
      s += '<path d="M' + x + ' 17v7" stroke="#8a74ad" stroke-width="2"/>';
      s += '<path d="M' + (x - 11) + ' 24h22l-4 20h-14z" fill="#2c1d44" stroke="#8a74ad" stroke-width="1.5" stroke-linejoin="round"/>';
      if (p.met || p.current) s += '<ellipse cx="' + x + '" cy="47" rx="13" ry="5" class="' + lens + '" opacity=".35"/>';
      s += '<ellipse cx="' + x + '" cy="45" rx="8" ry="3.4" class="' + lens + '"' + (p.current ? ' data-lens="1"' : '') + '/>';
      s += '<text x="' + x + '" y="66" text-anchor="middle" font-size="10" font-weight="700" fill="' + (p.current ? '#ff86b3' : (p.met ? '#f5c04d' : '#8a74ad')) + '">' + (i + 1) + '</text>';
      s += '</g>';
    });
    s += '</svg>';
    return s;
  }
  function stageHTML(opts) {
    opts = opts || {};
    var path = opts.path || stagePath();
    var curS = path.filter(function (p) { return p.current; })[0] || path[0] || { name: '' };
    var idx = path.indexOf(curS) + 1;
    return '<section class="stage' + (opts.mini ? ' mini' : '') + '" aria-label="Your stage"><div class="beam" aria-hidden="true"></div>' + trussSVG(path) +
      '<div class="floor">' + (opts.top || ('<div class="stagename">Stage ' + idx + ' of ' + path.length + ': ' + esc(curS.name) + '</div>')) +
      (opts.word != null ? '<div class="theword">' + esc(opts.word) + '</div>' : '') +
      (opts.meta ? '<div class="meta">' + opts.meta + '</div>' : '') + '</div></section>';
  }
  function placeBeams() {
    qsa('.stage').forEach(function (st) {
      var beam = qs('.beam', st), lens = qs('[data-lens]', st);
      if (!beam || !lens) { if (beam) beam.style.display = 'none'; return; }
      var a = st.getBoundingClientRect(), b = lens.getBoundingClientRect();
      if (!a.width) return;
      var lx = b.left + b.width / 2 - a.left, ly = b.top + b.height / 2 - a.top;
      var word = qs('.theword', st) || qs('.floor', st);
      var wr = word.getBoundingClientRect();
      var cx = wr.left + wr.width / 2 - a.left, half = Math.min(a.width * 0.42, Math.max(90, wr.width * 0.65));
      beam.style.display = '';
      beam.style.clipPath = 'polygon(' + (lx - 5) + 'px ' + ly + 'px,' + (lx + 5) + 'px ' + ly + 'px,' + (cx + half) + 'px 100%,' + (cx - half) + 'px 100%)';
    });
  }
  root.addEventListener('resize', function () { placeBeams(); });

  /* ======================= chrome: top bar, nav, quick add ======================= */
  function renderChrome() {
    var pill = document.getElementById('syncpill');
    if (!pill) return;
    var q = api.queue().filter(function (o) { return !(o.action === 'checklist.tick' && o.data && o.data.auto); }).length || (api.queue().length ? 1 : 0);
    var off = root.navigator && root.navigator.onLine === false;
    if (q) { pill.textContent = q + ' waiting to send'; pill.className = 'syncpill wait'; pill.hidden = false; }
    else if (off) { pill.textContent = 'Offline'; pill.className = 'syncpill wait'; pill.hidden = false; }
    else { pill.hidden = true; }
  }
  root.addEventListener('offline', renderChrome);
  root.addEventListener('online', renderChrome);
  var NAV = [['home', 'Home', 'home'], ['week', 'Week', 'week'], ['log', 'Log', 'log'], ['plan', 'Plan', 'plan'], ['more', 'More', 'more']];
  function navHTML() {
    return NAV.map(function (n) { return '<a href="#/' + n[0] + '" data-nav="' + n[0] + '">' + ic(n[2]) + '<span>' + n[1] + '</span></a>'; }).join('');
  }
  var NAV_OF = { home: 'home', week: 'week', log: 'log', plan: 'plan', more: 'more', audition: 'more', debut: 'more', files: 'more', report: 'more', charts: 'more', audits: 'more', summit: 'more', encore: 'more', guide: 'more', board: 'more', problem: 'more', rules: 'more', badges: 'more' };
  function setChrome(first, depth) {
    var noNav = { login: 1, first: 1, review: 1 }[first];
    document.body.classList.toggle('no-nav', !!noNav);
    document.body.classList.toggle('has-nav', !noNav);
    var tab = NAV_OF[first] || '';
    qsa('.bottomnav a').forEach(function (a) { if (a.getAttribute('data-nav') === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var fab = document.getElementById('fab');
    // the "+" belongs to the Home, Week and Log lists, not to the forms inside them (it would cover Save)
    if (fab) fab.hidden = !((first === 'home' || first === 'week' || first === 'log') && !(first === 'log' && depth > 2));
  }
  function quickAdd() {
    var off = root.navigator && root.navigator.onLine === false;
    var html = '<div class="quickgrid">' +
      '<a class="btn" href="#/log/action/new" data-close>' + ic('mic') + 'Action</a>' +
      '<a class="btn" href="#/log/journal/new" data-close>' + ic('book') + 'Lab Book entry</a>' +
      '<a class="btn" href="#/log/sighting/new" data-close>' + ic('eye') + 'Sighting</a>' +
      '<a class="btn" href="#/log/tally/new" data-close>' + ic('tally') + 'Tally</a>' +
      '<button class="btn" data-act="shot"' + (off ? ' disabled' : '') + ' style="grid-column:1/-1">' + ic('camera') + (off ? 'Add the screenshot when you are back online' : 'Screenshot') + '</button></div>';
    openSheet('Add to my log', html, function (a, el, sh) {
      if (a === 'shot') { sh.close(); uploadSheet({ attachType: 'none', attachId: '' }, function () { if (cur.path === 'files') rerender(); }); }
    });
  }

  /* ======================= router and guard ======================= */
  var SCREENS = {};
  var FREE = { login: 1, problem: 1, rules: 1 }; // reachable whatever the guard says (safety first)
  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var q = {}, i = h.indexOf('?');
    if (i >= 0) {
      h.slice(i + 1).split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); });
      h = h.slice(0, i);
    }
    h = h.replace(/\/+$/, '');
    return { path: h || 'home', parts: (h || 'home').split('/'), q: q };
  }
  function go(route) {
    var r = String(route || '#/home');
    if (r.charAt(0) !== '#') r = '#/' + r.replace(/^\//, '');
    if (location.hash === r) rerender(); else location.hash = r;
  }
  function reviewDue() { return try_(function () { return E().reviewDue(D, now()) || []; }, []); }
  function guard(first) {
    if (!api.session()) return first === 'login' ? null : 'login';
    if (first === 'login') return D ? 'home' : null;
    if (FREE[first]) return null;
    if (!D) return null;
    if (!(D.word && D.word.posConfirmed)) return first === 'first' ? null : 'first';
    if (reviewDue().length) return first === 'review' ? null : 'review';
    if (first === 'first') return 'audition/card';
    return null;
  }
  function rerender() { route(true); }
  function route(same) {
    var h = parseHash();
    var g = guard(h.parts[0]);
    if (g) { location.replace('#/' + g); return; }
    closeSheets();
    if (cur.cleanup) { try { cur.cleanup(); } catch (e) { /* ignore */ } }
    cur = { acts: {}, path: h.parts[0], full: h.path, q: h.q, cleanup: null, isForm: false };
    setChrome(h.parts[0], h.parts.length);
    var fn = SCREENS[h.parts[0]];
    if (h.parts[0] !== 'login' && !D) { view.innerHTML = loadingHTML(); return; }
    if (!fn) { view.innerHTML = '<div class="empty"><strong>This page does not exist.</strong><a class="btn" href="#/home">Go home</a></div>'; return; }
    try { fn(h.parts.slice(1), h.q); }
    catch (e) {
      if (root.console) console.error(e);
      view.innerHTML = '<div class="note bad"><b>This screen could not open.</b> Go back and try again. If it happens again, tell T.Chris.</div><a class="btn" href="#/home">Go home</a>';
    }
    setTimeout(placeBeams, 0);
    if (!same) { try { root.scrollTo(0, 0); } catch (e) { /* ignore */ } }
    var hd = qs('h1', view); if (hd && !same) { hd.setAttribute('tabindex', '-1'); try { hd.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  function loadingHTML() { return '<div class="empty" aria-busy="true"><strong>Opening WordIdol…</strong></div>'; }
  function render(html) { view.innerHTML = html; }
  function acts(map) { cur.acts = map; }
  /* one action per tap: a second tap on the same control within half a second is ignored (double taps) */
  var lastTap = { el: null, act: '', t: 0 };
  function doubleTap(a) {
    var key = a.getAttribute('data-row') || a.getAttribute('data-id') || '';
    var t = Date.now(), act = key ? a.getAttribute('data-act') + '|' + key : '';
    var dbl = (lastTap.el === a || (act && lastTap.act === act)) && t - lastTap.t < 500;
    lastTap = { el: a, act: act, t: t };
    return dbl;
  }
  /* typing or choosing something between two taps means the second tap is a new action */
  document.addEventListener('input', function () { lastTap.t = 0; }, true);
  document.addEventListener('change', function () { lastTap.t = 0; }, true);
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest('[data-act]');
    if (a && view.contains(a) && cur.acts[a.getAttribute('data-act')]) {
      ev.preventDefault();
      if (doubleTap(a)) return;
      cur.acts[a.getAttribute('data-act')](a, ev);
    }
  });

  /* "Opens on <date>" card for later releases */
  var OPENS = { audits: ['2026-12-02', 2, 'Audits'], summit: ['2026-12-07', 2, 'Summit Pack'], charts2: ['2026-12-07', 2, 'Charts'], intermediate: ['2026-12-02', 2, 'Intermediate report helper'], final: ['2027-01-04', 3, 'Final report helper'], encore: ['2027-01-04', 3, 'Encore'] };
  function opensCard(key, title) {
    var o = OPENS[key];
    return '<div class="screen-head"><h1>' + esc(title || o[2]) + '</h1></div><div class="panel opens"><p>This part of WordIdol is not open yet.</p><p class="when">Opens on ' + esc(fmt(o[0], 'long')) + '</p><p class="muted">Keep logging your work. Everything you save now will be ready here.</p><a class="btn" href="#/home">Back to Home</a></div>';
  }
  function released(key) { return release() >= OPENS[key][1]; }

  var XP_FOR = { X01: 'for confirming your word', X02: 'for your word card', X03: 'for your zero-baseline record', X04: 'for your plan', X05: 'for the six rules', X06: 'for logging an action', X07: 'for writing what you learned', X08: 'for your Lab Book entry', X09: 'for an honest zero-result week', X10: 'for analysing a failed action', X11: 'for a checklist item', X12: 'for your weekly review', X13: 'for saying why you could not do it', X14: 'for your audit', X15: 'for explaining what changed', X17: 'for getting a report ready', X18: 'for Summit work', X19: 'for your Pivot card', X20: 'for reviewer notes' };

  /* ======================= S-LOGIN ======================= */
  function lockMsg(err, d) {
    if (err && err.message) return err.message;
    var at = d && d.retryAt ? Date.parse(d.retryAt) : NaN;
    if (!isNaN(at)) { var m = Math.max(1, Math.ceil((at - api.nowMs()) / 60000)); return 'Too many tries. Wait ' + m + (m === 1 ? ' minute.' : ' minutes.'); }
    return 'Too many tries. Wait a few minutes.';
  }
  SCREENS.login = function () {
    var lit = ((root.WI_PLAN && root.WI_PLAN.stages) || []).map(function (s, i) { return { id: s.id, name: s.name, met: true, current: i === 0 }; });
    render('<div class="login">' + stageHTML({ path: lit, mini: true, top: '<div class="stagename">EN30202 Sociolinguistics</div>', word: 'WordIdol', meta: '<span class="chip">Your slang word’s journey to the Slang Summit</span>' }) +
      '<h1>Sign in</h1><div id="lg"><p class="muted">Loading names…</p></div>' +
      '<p><a href="teacher.html" class="linkbtn">I am the teacher</a></p></div>');
    var box = qs('#lg');
    api.roster().then(function (res) {
      if (!res.ok) {
        box.innerHTML = '<div class="note bad">' + esc(WIApi.NET_MSG) + '</div><button class="btn" data-act="retry">Try again</button>';
        acts({ retry: function () { rerender(); } });
        return;
      }
      var studs = (res.data && res.data.students) || [];
      var lastId = LS.get('wi.lastStudent') || '';
      box.innerHTML = '<form id="lgf" class="form" novalidate>' +
        '<div class="field" data-f="studentId"><label for="f_sid">Your name</label><select id="f_sid" name="studentId"><option value="">Choose your name…</option>' +
        studs.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === lastId ? ' selected' : '') + '>' + esc(s.label) + '</option>'; }).join('') +
        '</select><div class="err" role="alert"></div></div>' +
        '<div class="field" data-f="pin"><label for="f_pin">Your 4-digit PIN</label><input id="f_pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" style="font-size:1.4rem;letter-spacing:.5em;text-align:center"><div class="err" role="alert"></div></div>' +
        '<button class="btn primary block" type="submit">Sign in</button></form>';
      qs('#lgf').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var s = qs('#f_sid').value, pin = qs('#f_pin').value.trim();
        var errs = {};
        if (!s) errs.studentId = 'Please choose your name.';
        if (!/^\d{4}$/.test(pin)) errs.pin = 'Your PIN has exactly 4 digits.';
        if (!showErrs(box, errs)) return;
        var btn = qs('button[type=submit]', box); btn.disabled = true; btn.textContent = 'Signing in…';
        api.login(s, pin).then(function (r) {
          btn.disabled = false; btn.textContent = 'Sign in';
          if (!r.ok) {
            var c = r.error && r.error.code, d = (r.data || r.error.data || r.error || {});
            if (c === 'AUTH_BAD_PIN') errs.pin = 'That PIN is not right. Tries left: ' + (d.triesLeft != null ? d.triesLeft : '?') + '.';
            else if (c === 'AUTH_LOCKED') errs.pin = lockMsg(r.error, d);
            else if (c === 'NETWORK') errs.pin = WIApi.NET_MSG;
            else errs.pin = (r.error && r.error.message) || 'Sign-in did not work. Try again.';
            showErrs(box, errs);
            qs('#f_pin').value = '';
            return;
          }
          LS.set('wi.lastStudent', s);
          box.innerHTML = '<p class="muted">Opening your project…</p>';
          api.flush().then(function () { return api.bootstrap(); }).then(function (b) {
            if (!b.ok) { box.innerHTML = '<div class="note bad">' + esc((b.error && b.error.message) || WIApi.NET_MSG) + '</div><button class="btn" data-act="retry">Try again</button>'; acts({ retry: function () { boot(); } }); return; }
            D = api.data(); lastXp = null; noteState(D.state);
            go('#/home');
          });
        });
      });
    });
  };

  /* ======================= S-FIRST ======================= */
  function posOpts(guess) {
    return CH('pos').map(function (o) { return { id: o.id, label: o.label, also: guess && (guess.alt || []).indexOf(o.id) >= 0 }; });
  }
  var WORD_PATTERN_MSG = 'Use letters, spaces, hyphens and apostrophes only.';
  function firstDefs() {
    return [
      { n: 'word', t: 'text', form: 'first', l: 'My word', h: 'One to three words. Letters, spaces, hyphens and apostrophes only.', patternMsg: WORD_PATTERN_MSG },
      { n: 'meaning', t: 'textarea', form: 'first', l: 'What it means', rows: 3 },
      { n: 'example1', t: 'textarea', form: 'first', l: 'One example sentence', h: 'Write a real sentence that uses your word.', rows: 3, containsWord: true }
    ];
  }
  SCREENS.first = function () {
    cur.isForm = true;
    var dk = draftKey('first');
    var w = D.word || {};
    var vals = Object.assign({ word: w.word || '', meaning: w.meaning || '', example1: w.example1 || '' }, getDraft(dk) || {});
    var defs = firstDefs();
    render('<div class="screen-head"><h1>Before anything else, tell us about your word.</h1></div>' +
      '<p class="lead">This is the first step of your Audition. It takes about five minutes.</p>' +
      '<form id="ff" class="form" novalidate>' + fieldsHTML(defs, vals) + '<div id="guessbox"></div>' +
      '<div class="formfoot"><button class="btn primary" type="button" data-act="next">Next</button>' + saveStateHTML() + '</div></form>');
    var el = qs('#ff');
    var lf = liveForm(el, defs, { draft: dk, onChange: function (v, ev) { var nm = ev && ev.target && ev.target.name; if ((nm === 'word' || nm === 'meaning' || nm === 'example1') && qs('#guessbox').innerHTML) { qs('#guessbox').innerHTML = ''; qs('[data-act=next]').classList.remove('hidden'); } } });
    var guess = null;
    acts({
      next: function () {
        var v = lf.vals();
        var errs = validate(defs, v, { word: v.word });
        if (!showErrs(el, errs)) return;
        guess = try_(function () { return E().pos.guess(v.word, v.example1); }, { pos: 'unknown', conf: 'none', rule: 'P21', alt: [], reason: '' });
        var pre = guess.pos === 'unknown' ? '' : guess.pos;
        var gdefs = [{ n: 'pos', t: 'radio', form: 'first', l: 'Part of speech', opts: posOpts(guess) },
          { n: 'posAlso', t: 'checks', form: 'first', l: 'My word can also be a …', two: true, opts: CH('pos') }];
        var confText = try_(function () { return E().pos.confText(guess.conf); }, '');
        var shown = guess.w || v.word;
        qs('#guessbox').innerHTML = '<div class="guess" aria-live="polite"><p class="big">' +
          (guess.pos === 'unknown' ? 'I cannot tell the part of speech of <b>' + esc(shown) + '</b> from this sentence.' :
            'In your sentence, <b>' + esc(shown) + '</b> looks like ' + an(lab('pos', guess.pos)) + ' <b>' + esc(lab('pos', guess.pos).toLowerCase()) + '</b>.') + '</p>' +
          (guess.reason && guess.reason !== guess.rule ? '<p>' + esc(guess.reason) + '</p>' : '') +
          '<p class="conf">' + esc(confText) + '</p></div>' +
          '<div id="posf">' + fieldsHTML(gdefs, { pos: pre, posAlso: (D.word && D.word.posAlso) || [] }) + '</div>' +
          '<button class="btn primary block" type="button" data-act="savefirst">This is right — save</button>';
        qs('[data-act=next]').classList.add('hidden');
        qs('#guessbox').scrollIntoView({ behavior: 'smooth', block: 'start' });
        cur.gdefs = gdefs;
      },
      savefirst: function () {
        var v = lf.vals();
        var pv = readVals(qs('#posf'), cur.gdefs);
        var errs = validate(cur.gdefs, pv);
        if (!showErrs(el, errs)) return;
        var fields = { word: v.word.trim(), meaning: v.meaning.trim(), example1: v.example1.trim(), pos: pv.pos, posAlso: (pv.posAlso || []).filter(function (x) { return x !== pv.pos; }),
          posGuess: guess.pos, posRule: guess.rule, posConfidence: guess.conf, posConfirmed: true };
        if (!D.word || !D.word.regStatus) fields.regStatus = 'draft';
        save('word.save', { fields: fields }, el).then(function (r) { if (r && r.ok === false) return; });
        dropDraft(dk);
        toast('Your word is saved. Now finish your Audition.');
        go('#/audition');
      }
    });
  };

  /* ======================= S-HOME ======================= */
  function regChip() {
    var s = (D.word && D.word.regStatus) || 'draft';
    var cls = { draft: '', submitted: 'warn', approved: 'ok', changes: 'bad' }[s] || '';
    return '<span class="chip ' + cls + '">' + esc(lab('regStatuses', s)) + '</span>';
  }
  function homeFeedback() {
    var fb = (D.feedback || []).slice().sort(function (a, b) {
      var ua = a.readAt ? 1 : 0, ub = b.readAt ? 1 : 0;
      return ua - ub || String(b.createdAt).localeCompare(String(a.createdAt));
    });
    if (!fb.length) return '';
    var unread = fb.filter(function (f) { return !f.readAt; }).length;
    var show = fb.slice(0, Math.max(3, unread));
    return '<section class="section" aria-labelledby="h-fb"><h2 id="h-fb">Feedback from T.Chris' + (unread ? ' <span class="chip pop">' + unread + ' new</span>' : '') + '</h2><div class="panel flat">' +
      show.map(function (f) {
        return '<div class="feedback-item' + (f.readAt ? '' : ' unread') + '"><div class="ftext">' + esc(f.text) + '</div><div class="fmeta">' + esc(fmt(f.createdAt)) + (f.targetType && f.targetType !== 'general' ? ' – about your ' + esc(targetName(f.targetType)) : '') + '</div>' +
          (f.readAt ? '' : '<button class="btn small" data-act="gotit" data-id="' + esc(f.id) + '">Got it</button>') + '</div>';
      }).join('') + '</div></section>';
  }
  function targetName(t) { return { word: 'word card', plan: 'plan', action: 'action log', journal: 'Lab Book', sighting: 'sighting', review: 'weekly review', report: 'report', summit: 'Summit Pack', article: 'Article Pack', checklist: 'checklist' }[t] || 'work'; }
  SCREENS.home = function () {
    var w = D.word || {};
    var st = D.state || {};
    var next = try_(function () { return E().nextStep(D, now()); }, null) || { label: 'Write in your Lab Book', route: '#/log/journal/new' };
    var wk = curWeek();
    var counts = try_(function () { return E().weekCounts(D, wk); }, { done: 0, open: 0, carried: 0 });
    var openRows = try_(function () { return E().weekRows(D, wk); }, []).filter(function (r) { return r.status === 'open' && r.dueDate; }).sort(function (a, b) { return a.dueDate.localeCompare(b.dueDate); });
    var nextDue = openRows[0] && openRows[0].dueDate;
    var rk = try_(function () { return E().rankOf(Number(st.xp) || 0); }, null);
    var streak = try_(function () { return E().streak(D, now()); }, { streak: st.streak || 0, best: st.bestStreak || 0 });
    var ms = try_(function () { return E().nextMilestone(now()); }, null);
    var gst = (G().stages || []).filter(function (s) { return s.stageId === stageId(); })[0];
    var offered = try_(function () { return E().reviewOffered(D, now()); }, []).filter(function (x) { return reviewDue().indexOf(x) < 0; });
    var finished = try_(function () { return E().projectFinished(now()); }, false);
    var h = '';
    h += stageHTML({ word: w.word || '', meta: (w.pos ? '<span class="chip">' + esc(lab('pos', w.pos)) + '</span>' : '') + regChip() });
    if (finished) h += '<div class="note ok"><b>The project has finished.</b> Thank you for your work. Your records stay here.</div>';
    if (w.regStatus === 'changes' && w.regComment) h += '<div class="note bad"><b>T.Chris asked for changes:</b> ' + esc(w.regComment) + ' <a href="#/audition">Open your Audition</a></div>';
    h += homeFeedback();
    h += '<a class="nextstep" href="' + esc(next.route || '#/home') + '"><span class="k">Next step</span><span class="v">' + esc(next.label) + ic('go') + '</span>' + (next.why ? '<span class="k">' + esc(next.why) + '</span>' : '') + '</a>';
    if (offered.length) h += '<div class="note"><b>A weekly review is open for ' + esc(offered.map(function (x) { return 'Week ' + Number(x.slice(1)); }).join(', ')) + '.</b> It is optional in the break weeks. <a href="#/review?week=' + esc(offered[0]) + '">Do it now</a></div>';
    if (gst && gst.now && gst.now.length) {
      h += '<section class="section"><h2>What to do now</h2><ul class="list">' + gst.now.map(function (t) { return '<li style="padding:.5rem 0">' + esc(t) + '</li>'; }).join('') + '</ul></section>';
    }
    h += '<section class="section"><h2>This week</h2><div class="statgrid"><div class="stat"><b>' + (counts.done || 0) + '</b><span>done</span></div><div class="stat"><b>' + (counts.open || 0) + '</b><span>open</span></div><div class="stat"><b>' + (counts.carried || 0) + '</b><span>carried</span></div></div>' +
      (nextDue ? '<p>Next due: <b>' + esc(fmt(nextDue)) + '</b></p>' : '') + '<a class="btn block" href="#/week">Open my week</a></section>';
    h += '<section class="section"><h2>' + esc(rk ? rk.name : 'Trainee') + '</h2>';
    if (rk) {
      h += '<div class="xpbar" role="img" aria-label="' + esc(Math.round((rk.progress || 0) * 100)) + '% of the way to the next rank"><i style="width:' + Math.round((rk.next ? rk.progress : 1) * 100) + '%"></i></div>' +
        '<p class="small"><b>' + esc(st.xp || 0) + ' XP</b>' + (rk.next ? '. ' + esc(rk.toNext) + ' XP to ' + esc(rk.next.name) + '.' : '. Top rank!') + '</p>';
    }
    h += '<p class="small">Review streak: <b>' + esc(streak.streak || 0) + ' ' + ((streak.streak || 0) === 1 ? 'week' : 'weeks') + '</b> (best ' + esc(streak.best || 0) + ')</p><a class="linkbtn" href="#/badges">My badges</a> <a class="linkbtn" href="#/board">Class board</a></section>';
    if (ms && ms.milestone) {
      var dl = ms.daysLeft;
      h += '<section class="section"><h2>Next milestone</h2><div class="panel tint"><b>' + esc(ms.milestone.title) + '</b><br><span class="muted">' + esc(fmt(ms.milestone.date, 'long')) + (ms.milestone.endDate ? ' – ' + esc(fmt(ms.milestone.endDate)) : '') + '</span>' +
        '<p style="margin:.4rem 0 0">' + (dl === 0 ? '<b>Today</b>' : (dl > 0 ? '<b>' + dl + (dl === 1 ? ' day' : ' days') + '</b> left' : 'Started')) + '</p></div><a class="linkbtn" href="#/plan">See the whole plan</a></section>';
    }
    h += '<p class="principle">' + esc(rulesData().analysisOverAdoption || '') + '</p>';
    h += '<button class="btn block ghost" data-act="stuck">' + ic('help') + 'Stuck?</button>';
    render(h);
    acts({
      gotit: function (b) { save('feedback.read', { id: b.getAttribute('data-id') }); rerender(); },
      stuck: function () { stuckSheet(); }
    });
  };

  /* ======================= checklist helpers ======================= */
  function itemOf(row) { return try_(function () { return E().itemDef(row.itemId, D); }, null) || { id: row.itemId, title: row.title, kind: row.kind, check: null, route: '', feeds: [] }; }
  function whyOf(itemId, item) {
    var base = String(itemId || '').replace(/^(C-[A-Z]+)-2$/, '$1');
    return (item && item.why) || (root.WI_WHY && (root.WI_WHY[itemId] || root.WI_WHY[base])) || '';
  }
  function reqDef(id) { return ((root.WI_COVERAGE && root.WI_COVERAGE.requirements) || []).filter(function (r) { return r.id === id; })[0]; }
  var DELIV_SHORT = { 'Assignment 1': 'Assignment 1', 'Baseline report': 'Baseline report', 'Intermediate report': 'Intermediate report', 'Final report': 'Final report', 'Summit (ASM-04)': 'Summit', 'Summit': 'Summit', 'Lab Book 1.1': 'Lab Book', 'Lab Book 3.1': 'Lab Book', 'Peer review': 'Peer review', 'Article': 'Article' };
  function feedsTag(item) {
    var f = (item && item.feeds) || [];
    var names = uniq(f.map(function (id) { var r = reqDef(id); return r ? (DELIV_SHORT[r.deliverable] || r.deliverable) : null; }).filter(Boolean));
    return names.slice(0, 2).map(function (n) { return '<span class="chip gold">' + esc(n) + '</span>'; }).join('');
  }
  function hasCheck(row, item) { return item && (item.check || /^P-/.test(row.itemId)); }
  function rowHTML(row, item, opts) {
    opts = opts || {};
    var done = row.status === 'done';
    var closed = { cannot: 1, dropped: 1, carried: 1, expired: 1 }[row.status];
    var auto = hasCheck(row, item);
    var locked = item && item.online && !onlineOpen() && row.status === 'open';
    var overdue = try_(function () { return E().isOverdue(row, now()); }, false);
    var title = row.title || (item && item.title) || row.itemId;
    var why = whyOf(row.itemId, item);
    var routeTo = (item && item.route) || '';
    var meta = [];
    if (row.dueDate) meta.push('<span class="' + (overdue ? 'overdue' : '') + '">Due ' + esc(fmt(row.dueDate)) + (overdue ? ' (passed)' : '') + '</span>');
    if (Number(row.carryCount) > 0) meta.push('<span class="chip warn">carried ×' + esc(row.carryCount) + '</span>');
    if (row.afterBreak) meta.push('<span class="chip">after the break</span>');
    if (row.status === 'cannot') meta.push('<span class="chip bad">Could not do</span>');
    if (row.status === 'dropped') meta.push('<span class="chip">Dropped</span>');
    if (row.status === 'carried') meta.push('<span class="chip">Moved to next week</span>');
    if (row.status === 'expired') meta.push('<span class="chip">Not done (optional)</span>');
    if (row.kind === 'required' && opts.showKind) meta.push('<span class="chip pop">Must do</span>');
    var tag = feedsTag(item); if (tag) meta.push(tag);
    var tickBtn;
    if (closed) tickBtn = '<span class="tick" aria-hidden="true"><span class="box" style="opacity:.35"></span></span>';
    else if (locked) tickBtn = '<span class="tick" title="Locked">' + ic('lock') + '</span>';
    else if (auto) tickBtn = '<button class="tick auto" data-act="open" data-route="' + esc(routeTo) + '" aria-label="' + (done ? 'Done. Open: ' : 'Do it: ') + esc(title) + '">' + ic('go', 'go') + '<span class="box done-mark">' + ic('tick') + '</span></button>';
    else tickBtn = '<button class="tick" data-act="tick" data-row="' + esc(row.id) + '" role="checkbox" aria-checked="' + done + '" aria-label="' + esc(title) + '"><span class="box">' + ic('tick') + '</span></button>';
    var more = '<div class="more hidden" id="m_' + esc(cssId(row.id)) + '">' + (why ? '<p class="why">' + esc(why) + '</p>' : '') +
      (locked ? '<p class="lockline">' + ic('lock') + esc(rulesData().lockedOnlineText || 'Opens after the L9 safety briefing and the six rules') + '</p>' : '') +
      (row.reason ? '<p class="small"><b>Reason:</b> ' + esc(row.reason) + '</p>' : '') +
      '<div class="btnrow" style="margin:.4rem 0">' +
      (routeTo && !locked ? '<a class="btn small primary" href="' + esc(routeTo) + '">Do it</a>' : '') +
      (opts.editable && row.status === 'open' && !locked ? '<button class="btn small ghost" data-act="cannot" data-row="' + esc(row.id) + '">Could not do</button>' : '') +
      (opts.editable && row.status === 'open' && (row.kind === 'optional' || row.kind === 'own') ? '<button class="btn small ghost" data-act="drop" data-row="' + esc(row.id) + '">Drop it</button>' : '') +
      (opts.editable && (row.status === 'cannot' || row.status === 'dropped') ? '<button class="btn small ghost" data-act="reopen" data-row="' + esc(row.id) + '">Open it again</button>' : '') +
      '</div></div>';
    return '<div class="ck' + (done ? ' done' : '') + (closed ? ' closed' : '') + '">' + tickBtn +
      '<div class="body"><div class="title">' + esc(title) + '</div><div class="meta">' + meta.join('') + '</div>' + (locked ? '<div class="lockline">' + ic('lock') + 'Locked</div>' : '') + '</div>' +
      '<button class="expand" data-act="expand" data-row="' + esc(row.id) + '" aria-expanded="false" aria-controls="m_' + esc(cssId(row.id)) + '" aria-label="More about this item">' + ic('down') + '</button>' + more + '</div>';
  }
  function cssId(s) { return String(s).replace(/[^A-Za-z0-9_-]/g, '_'); }
  var GROUPS = [['must', 'Must do'], ['recommended', 'Recommended'], ['plan', 'Your plan'], ['choice', 'Because of what you chose'], ['carried', 'Carried'], ['optional', 'Optional'], ['own', 'My own']];
  function weekGroupsHTML(weekId, opts) {
    var g = try_(function () { return E().weekGroups(D, weekId); }, null);
    if (!g) {
      var rows = (D.checklist || []).filter(function (r) { return r.weekId === weekId; });
      g = { must: [], recommended: [], plan: [], choice: [], carried: [], optional: [], own: [] };
      rows.forEach(function (r) { g[r.kind === 'required' ? 'must' : (r.kind === 'own' ? 'own' : (r.kind === 'optional' ? 'optional' : 'recommended'))].push({ row: r, item: itemOf(r) }); });
    }
    var h = '', any = false;
    GROUPS.forEach(function (gr) {
      var list = g[gr[0]] || [];
      if (!list.length) return;
      any = true;
      var dn = list.filter(function (x) { return x.row.status === 'done'; }).length;
      h += '<div class="group-h"><h2>' + esc(gr[1]) + '</h2><span class="count">' + dn + ' of ' + list.length + ' done</span></div><div>' +
        list.map(function (x) { return rowHTML(x.row, x.item || itemOf(x.row), opts); }).join('') + '</div>';
    });
    return any ? h : '<div class="empty"><strong>No items for this week yet.</strong>They appear when the week starts.</div>';
  }
  function checklistActs(after) {
    return {
      expand: function (b) {
        var m = qs('#m_' + cssId(b.getAttribute('data-row')));
        var open = b.getAttribute('aria-expanded') === 'true';
        b.setAttribute('aria-expanded', String(!open)); if (m) m.classList.toggle('hidden', open);
      },
      open: function (b) { var r = b.getAttribute('data-route'); if (r) go(r); },
      tick: function (b) {
        var id = b.getAttribute('data-row');
        var row = (D.checklist || []).filter(function (r) { return r.id === id; })[0];
        if (!row) return;
        if (row.status === 'done') {
          if (!try_(function () { return E().canUntick(row); }, row.doneBy !== 'auto')) { toast('This item ticked itself. It stays done.'); return; }
          save('checklist.tick', { rowId: id, done: false });
        } else save('checklist.tick', { rowId: id, done: true });
        (after || rerender)();
      },
      cannot: function (b) {
        var id = b.getAttribute('data-row');
        var defs = [{ n: 'reason', t: 'text', form: 'cannot', l: 'Why could you not do it?', R: true, min: 10, max: 200 }];
        var sh = openSheet('Could not do', '<form class="form" novalidate>' + fieldsHTML(defs, {}) + '<button class="btn primary block" data-act="ok" type="button">Save</button></form>', function (a, el, s) {
          if (a !== 'ok') return;
          var v = readVals(s.el, defs); var e = validate(defs, v);
          if (!showErrs(s.el, e)) return;
          save('checklist.setStatus', { rowId: id, status: 'cannot', reason: v.reason.trim() });
          s.close(); (after || rerender)();
        });
        void sh;
      },
      drop: function (b) { save('checklist.setStatus', { rowId: b.getAttribute('data-row'), status: 'dropped' }); (after || rerender)(); },
      reopen: function (b) { save('checklist.setStatus', { rowId: b.getAttribute('data-row'), status: 'open' }); (after || rerender)(); }
    };
  }

  /* ======================= S-WEEK ======================= */
  SCREENS.week = function (parts) {
    var cw = curWeek();
    var wk = parts[0] && /^W\d\d$/.test(parts[0]) ? parts[0] : cw;
    var rng = try_(function () { return E().weekRange(wk); }, { label: wk });
    var prev = try_(function () { return E().prevWeekId(wk); }, null), nextW = try_(function () { return E().nextWeekId(wk); }, null);
    var past = wk < cw;
    var canNext = nextW && nextW <= cw;
    var h = '<div class="screen-head"><button class="iconbtn" data-act="prev"' + (prev ? '' : ' disabled') + ' aria-label="Previous week">' + ic('left') + '</button>' +
      '<h1 class="weekh">' + esc(rng.label || wk) + '</h1><button class="iconbtn" data-act="nextw"' + (canNext ? '' : ' disabled') + ' aria-label="Next week">' + ic('right') + '</button></div>';
    if (past) h += '<div class="note">This week has finished. You can still tick off what you did.</div>';
    if (try_(function () { return E().isLightWeek(wk); }, false)) h += '<div class="note">Exams and the New Year break: everything this week is optional.</div>';
    var due = reviewDue();
    h += weekGroupsHTML(wk, { editable: !past, showKind: false });
    if (!past) {
      var own = try_(function () { return E().ownItemCount(D, wk); }, 0);
      h += '<section class="section"><h2>Add my own item</h2>' + (own >= 5 ? '<p class="muted">You have 5 own items this week. That is the most for one week.</p>' :
        '<form id="ownf" class="form" novalidate>' + fieldsHTML(ownDefs(wk), {}) + '<button class="btn" type="button" data-act="addown">Add it</button></form>') + '</section>';
    }
    // after the Sunday review, show next week as a preview
    var rv = (D.reviews || []).filter(function (r) { return r.weekId === wk; })[0];
    if (!past && rv && nextW) {
      var pv = try_(function () { return E().previewWeek(D, wk, now(), { nextPrefs: rv.nextPrefs || {}, decisions: rv.decisions || {} }); }, []);
      if (pv && pv.length) {
        h += '<section class="section"><h2>Next week (starts Monday)</h2><div class="panel flat">' + pv.map(function (r) { return '<div class="rowlink" style="min-height:0"><span class="grow"><span class="t">' + esc(r.title) + '</span><span class="s">' + esc({ required: 'Must do', own: 'My own', recommended: 'Recommended', optional: 'Optional' }[r.kind] || r.kind) + (r.dueDate ? ', due ' + esc(fmt(r.dueDate)) : '') + '</span></span></div>'; }).join('') + '</div></section>';
      }
    }
    void due;
    render(h);
    acts(Object.assign(checklistActs(), {
      prev: function () { if (prev) go('#/week/' + prev); },
      nextw: function () { if (canNext) go(nextW === cw ? '#/week' : '#/week/' + nextW); },
      addown: function () {
        var el = qs('#ownf'), defs = ownDefs(wk);
        var v = readVals(el, defs), e = validate(defs, v);
        if (!showErrs(el, e)) return;
        save('checklist.addOwn', { weekId: wk, title: v.title, dueDate: v.dueDate || '', itemId: 'O-' + WIApi.rand36(8) });
        toast('Added to your week.');
        rerender();
      }
    }));
  };
  function ownDefs(wk) {
    var r = try_(function () { return E().weekRange(wk); }, {});
    var nx = try_(function () { return E().weekRange(E().nextWeekId(wk)); }, null);
    return [
      { n: 'title', t: 'text', form: 'ownItem', l: 'What will you do?', R: true, min: 5, max: 80 },
      { n: 'dueDate', t: 'date', form: 'ownItem', l: 'Due date', minDate: r.start, maxDate: (nx && nx.end) || r.end }
    ];
  }

  /* ======================= S-PLAN (timeline) ======================= */
  function expandItems(ids) {
    var cov = root.WI_COVERAGE;
    if (cov && typeof cov.expand === 'function') return try_(function () { var out = []; ids.forEach(function (i) { out = out.concat(cov.expand(i)); }); return out; }, ids);
    return ids;
  }
  function itemStatus(itemId) {
    var rows = (D.checklist || []).filter(function (r) { return r.itemId === itemId; });
    if (rows.some(function (r) { return r.status === 'done'; })) return 'done';
    if (rows.some(function (r) { return r.status === 'cannot'; })) return 'cannot';
    // an item of a later week whose work she has already done (its check passes) counts as done
    var def = try_(function () { return E().itemDef(itemId, D); }, null);
    if (def && def.check && !/^week\./.test(def.check) && check(def.check)) return 'done';
    return rows.length ? 'open' : 'later';
  }
  function reqsForMilestone(m) {
    var reqs = (root.WI_COVERAGE && root.WI_COVERAGE.requirements) || [];
    var end = m.endDate || m.date;
    var byKind = { report: function (r) { return r.due === m.date && /report/i.test(r.deliverable); }, deliverable: function (r) { return r.due >= m.date && r.due <= end || (m.id === 'M16' && r.due === m.date); }, summit: function (r) { return r.id === 'SUM-ABS'; }, labbook: function (r) { return r.id === 'LAB-PRE'; } };
    var f = byKind[m.kind];
    if (m.id === 'M16') f = function (r) { return /^ART-|^A1-|^LAB-POST/.test(r.id); };
    if (m.id === 'M08') f = function (r) { return /^SUM-/.test(r.id) && r.id !== 'SUM-ABS'; };
    if (m.id === 'M01') f = function (r) { return r.id === 'BAS-PLAN'; };
    if (m.id === 'M15') f = function (r) { return /^PEER-R/.test(r.id); };
    return f ? reqs.filter(f) : [];
  }
  SCREENS.plan = function () {
    var plan = root.WI_PLAN || {};
    var ms = try_(function () { return E().milestones(); }, plan.milestones || []);
    var stages = plan.stages || [];
    var curS = stageId();
    var h = '<div class="screen-head"><h1>My promotion plan</h1></div><p class="lead">Seven stages, sixteen milestones, from launch to the research article.</p>';
    h += stageHTML({ mini: true });
    h += '<ol class="stagelist" aria-label="The seven stages">' + stages.map(function (s, i) { return '<li class="' + (s.id === curS ? 'now' : '') + '"><b>' + (i + 1) + '</b> ' + esc(s.name) + (s.id === curS ? ' <span class="chip pop">you are here</span>' : '') + '</li>'; }).join('') + '</ol>';
    h += '<h2>Milestones</h2><ol class="timeline">';
    var phase = 0;
    ms.forEach(function (m) {
      var ph = m.date >= '2026-12-18' ? 2 : 1;
      if (ph !== phase) { phase = ph; h += '<li class="phase" aria-hidden="false">' + (ph === 1 ? 'Cycle 1: 16 Nov to 20 Dec 2026' : 'Cycle 2: from 18 Dec 2026') + '</li>'; }
      var msStage = stages.filter(function (x) { return x.id === m.stageId; })[0];
      var status = try_(function () { return E().milestoneStatus(m, now()); }, 'later');
      var dl = try_(function () { return E().daysLeft(m.date, now()); }, null);
      var big = m.deliverable || m.kind === 'deliverable';
      h += '<li class="' + status + (big ? ' big' : '') + (m.kind === 'light' ? ' light' : '') + '"><span class="dot"></span><button class="rowlink ms' + (big ? ' deliverable' : '') + '" data-act="ms" data-id="' + esc(m.id) + '" style="padding:.6rem .5rem"><span class="grow"><span class="when">' + esc(fmt(m.date)) + (m.endDate ? ' – ' + esc(fmt(m.endDate)) : '') +
        (status === 'done' ? ', done' : (dl != null && dl >= 0 ? (dl === 0 ? ', today' : ', ' + dl + (dl === 1 ? ' day' : ' days') + ' left') : '')) + '</span><span class="t ms-title">' + esc(m.title) + '</span>' +
        (m.points ? '<span class="s">' + esc(m.points) + ' points' + (m.pointsNote ? ' (' + esc(m.pointsNote) + ')' : '') + '</span>' : '') +
        (msStage ? '<span class="s stagetag">Stage ' + (stages.indexOf(msStage) + 1) + ': ' + esc(msStage.name) + '</span>' : '') + '</span>' + ic('right', 'chev') + '</button></li>';
    });
    h += '</ol>';
    var p = plan1();
    h += '<section class="section"><h2>My choices</h2>';
    if (p) {
      h += '<dl class="kv"><dt>Target groups</dt><dd>' + esc((p.targetGroups || []).map(function (x) { return lab('targetGroups', x); }).join(', ')) + '</dd>' +
        '<dt>Ideas</dt><dd>' + esc((p.ideas || []).map(function (x) { return lab('ideas', x); }).join(', ')) + '</dd>' +
        '<dt>Platforms</dt><dd>' + esc((p.platforms || []).map(function (x) { return lab('platforms', x); }).join(', ')) + '</dd>' +
        '<dt>Route</dt><dd>' + esc(lab('routes', p.route)) + '</dd><dt>Time</dt><dd>' + esc(lab('timeBudgets', p.timeBudget)) + '</dd></dl>';
    } else h += '<p class="muted">You have not made your choices yet.</p>';
    h += '<a class="btn" href="#/debut/choices">Change my choices</a></section>';
    render(h);
    acts({
      ms: function (b) {
        var m = ms.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0];
        if (!m) return;
        var reqs = reqsForMilestone(m);
        var body = '<p class="muted">' + esc(fmt(m.date, 'long')) + (m.endDate ? ' – ' + esc(fmt(m.endDate, 'long')) : '') + '</p>' + (m.needs ? '<p>' + esc(m.needs) + '</p>' : '');
        reqs.forEach(function (r) {
          var items = uniq(expandItems(r.items || []));
          body += '<h3 style="margin-top:1rem">' + esc(r.text) + '</h3><ul class="list">' + items.map(function (it) {
            var def = try_(function () { return E().itemDef(it, D); }, null);
            var st = itemStatus(it);
            return '<li class="rowlink" style="min-height:44px"><span class="chip ' + (st === 'done' ? 'ok' : (st === 'open' ? 'warn' : '')) + '">' + (st === 'done' ? 'done' : (st === 'open' ? 'open' : (st === 'cannot' ? 'could not do' : 'later'))) + '</span><span class="grow">' + esc(def ? def.title : it) + '</span></li>';
          }).join('') + '</ul>';
        });
        openSheet(m.title, body);
      }
    });
  };

  /* ======================= S-AUDITION ======================= */
  function hub(cards) {
    return '<div class="cardlist">' + cards.map(function (c, i) {
      return '<a class="hubcard' + (c.ok ? ' ok' : '') + '" href="' + esc(c.href) + '"><span class="stat">' + (c.ok ? ic('tick') : (c.lock ? ic('lock') : (i + 1))) + '</span><span class="grow"><span class="t">' + esc(c.t) + '</span><span class="s">' + esc(c.s || '') + '</span></span>' + ic('right', 'chev') + '</a>';
    }).join('') + '</div>';
  }
  function backLink(href, label) { return '<a class="linkbtn" href="' + href + '">' + ic('left') + ' ' + esc(label) + '</a>'; }
  function formFoot(btn) { return '<div class="formfoot"><button class="btn primary" type="button" data-act="save">' + esc(btn || 'Save') + '</button>' + saveStateHTML() + '</div>'; }

  SCREENS.audition = function (parts) {
    var sub = parts[0];
    if (sub && AUD[sub]) { cur.isForm = true; return AUD[sub](); }
    var w = D.word || {};
    var cards = [
      { t: 'Word card', s: 'Meaning, usage rules, formation, three examples, purpose', href: '#/audition/card', ok: check('word.card') },
      { t: 'Zero-baseline record', s: 'Search six places for your word before you launch it', href: '#/audition/zb', ok: check('word.zb') },
      { t: 'Send for approval', s: lab('regStatuses', w.regStatus || 'draft'), href: '#/audition/submit', ok: check('word.submitted') },
      { t: 'FUDGE prediction', s: 'Score your word 0–2 on five things', href: '#/audition/fudge', ok: check('word.fudge') },
      { t: 'Research question and hypotheses', s: 'What will you test?', href: '#/audition/hyp', ok: check('word.hypotheses') },
      { t: 'Spec sheet R1–R10', s: 'Ten quick tests for a strong word', href: '#/audition/spec', ok: check('word.spec') }
    ];
    render('<div class="screen-head"><h1>Audition</h1></div><p class="lead">Stage 1: show us your word. Each card ticks when it is complete.</p>' + hub(cards) +
      '<p class="principle">' + esc(rulesData().analysisOverAdoption || '') + '</p>');
  };

  function wordFormPage(o) {
    // o: {title, intro, defs, vals, dk, onSave(vals, el), btn}
    render(backLink('#/audition', 'Audition') + '<div class="screen-head"><h1>' + esc(o.title) + '</h1></div>' + (o.intro || '') +
      '<form id="wf" class="form" novalidate>' + fieldsHTML(o.defs, o.vals) + (o.extra || '') + formFoot(o.btn) + '</form>');
    var el = qs('#wf');
    var lf = liveForm(el, o.defs, { draft: o.dk, onChange: o.onChange });
    acts(Object.assign({
      save: function () {
        var v = trimVals(lf.vals());
        var errs = validate(o.defs, v, { word: (D.word && D.word.word) || v.word });
        if (o.check) Object.assign(errs, o.check(v, el) || {});
        if (!showErrs(el, errs)) { toast('Please check the boxes marked in red.', 'err'); return; }
        o.onSave(v, el);
        dropDraft(o.dk);
      }
    }, o.acts || {}));
    return { el: el, lf: lf };
  }

  var AUD = {};
  AUD.card = function () {
    var w = D.word || {};
    var dk = draftKey('audition/card');
    var pos0 = w.pos;
    var formsList = function (pos) { return ((root.WI_CHOICES && root.WI_CHOICES.formsByPos) || {})[pos] || []; };
    var vals = Object.assign({}, w, { posAlso: w.posAlso || [] });
    Object.keys(w.forms || {}).forEach(function (k) { vals['form_' + k] = w.forms[k]; });
    vals = Object.assign(vals, getDraft(dk) || {});
    var infl = function (pos) {
      var base = (vals.word || '').trim();
      var forms = try_(function () { return E().pos.inflections(base); }, []) || [];
      var map = { plural: 's', s: 's', ed: 'ed', ing: 'ing', comparative: 'er', superlative: 'est' };
      var out = {};
      formsList(pos).forEach(function (f) { var m = forms.filter(function (x) { return x[1] === map[f.id]; })[0]; out[f.id] = m ? m[0] : ''; });
      return out;
    };
    function defs(pos) {
      var sug = infl(pos);
      var d = [
        { n: 'word', t: 'text', form: 'first', l: 'My word', patternMsg: WORD_PATTERN_MSG },
        { n: 'meaning', t: 'textarea', form: 'first', l: 'What it means', rows: 3 },
        { n: 'example1', t: 'textarea', form: 'first', l: 'Example sentence 1', rows: 2, containsWord: true },
        { n: 'pos', t: 'radio', form: 'first', l: 'Part of speech', opts: posOpts(null) },
        { n: 'posAlso', t: 'checks', form: 'first', l: 'My word can also be a …', two: true, opts: CH('pos') },
        { n: 'usageRules', t: 'textarea', form: 'wordCard', l: 'Rules for using it: grammar, who says it, when', rows: 4 }
      ];
      formsList(pos).forEach(function (f) { d.push({ n: 'form_' + f.id, t: 'text', form: 'formsItem', l: f.label, max: 30, ph: sug[f.id] ? 'For example: ' + sug[f.id] : '' }); });
      return d.concat([
        { n: 'pronunciation', t: 'text', form: 'wordCard', l: 'Say it like …', h: 'For example: rhymes with "honk".' },
        { n: 'formation', t: 'select', form: 'wordCard', l: 'How was it formed?', opts: CH('formations') },
        { n: 'sourceWords', t: 'text', form: 'wordCard', l: 'Where it comes from', h: 'The words or ideas it was built from.' },
        { n: 'example2', t: 'textarea', form: 'wordCard', l: 'Example sentence 2', rows: 2, containsWord: true },
        { n: 'example3', t: 'textarea', form: 'wordCard', l: 'Example sentence 3', rows: 2, containsWord: true },
        { n: 'doNotUse', t: 'textarea', form: 'wordCard', l: 'When it would be wrong to use it', rows: 2 },
        { n: 'purpose', t: 'textarea', form: 'wordCard', l: 'What is it for?', h: 'The purpose can be membership of an "in" group.', rows: 3 },
        { n: 'notRudeConfirmed', t: 'tick', form: 'wordCard', l: rulesData().notRudeLabel || '' }
      ]);
    }
    var d0 = defs(vals.pos || pos0);
    var approved = w.regStatus === 'approved';
    var intro = approved ? '<div class="note">T.Chris has approved your word. If you change the word, its meaning or its part of speech, it goes back to him for approval.</div>' : '';
    var pg = wordFormPage({
      title: 'Word card', intro: intro, defs: d0, vals: vals, dk: dk,
      extra: '<div id="reguess"></div>',
      onChange: function (v, ev) {
        if (ev && ev.target && ev.target.name === 'pos' && v.pos !== vals.pos) { vals = Object.assign(vals, v); putDraft(dk, vals); rerender(); return; }
        if (ev && ev.target && ev.target.name === 'example1' && ev.type === 'change') {
          var g = try_(function () { return E().pos.guess(v.word, v.example1); }, null);
          var box = qs('#reguess');
          if (g && box) {
            box.innerHTML = g.pos !== 'unknown' && g.pos !== v.pos ? '<div class="guess"><p>In this sentence your word looks like ' + an(lab('pos', g.pos)) + ' <b>' + esc(lab('pos', g.pos).toLowerCase()) + '</b>. ' + esc(g.reason || '') + '</p><button class="btn small" type="button" data-act="usepos" data-pos="' + esc(g.pos) + '">Use ' + esc(lab('pos', g.pos).toLowerCase()) + '</button></div>' : '';
          }
        }
      },
      acts: { usepos: function (b) { var r = qs('input[name=pos][value="' + b.getAttribute('data-pos') + '"]'); if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); } } },
      onSave: function (v, el) {
        var fields = {}, forms = {};
        ['word', 'meaning', 'example1', 'pos', 'posAlso', 'usageRules', 'pronunciation', 'formation', 'sourceWords', 'example2', 'example3', 'doNotUse', 'purpose', 'notRudeConfirmed'].forEach(function (k) { fields[k] = v[k]; });
        formsList(v.pos).forEach(function (f) { forms[f.id] = v['form_' + f.id] || ''; });
        fields.forms = forms;
        fields.posAlso = (v.posAlso || []).filter(function (x) { return x !== v.pos; });
        if (v.example1 !== w.example1) {
          var g = try_(function () { return E().pos.guess(v.word, v.example1); }, null);
          if (g) { fields.posGuess = g.pos; fields.posRule = g.rule; fields.posConfidence = g.conf; }
        }
        save('word.save', { fields: fields }, el);
        toast('Word card saved.');
        go('#/audition');
      }
    });
    void pg;
  };

  AUD.zb = function () {
    var w = D.word || {};
    var zb = w.zb || {};
    var dk = draftKey('audition/zb');
    var places = CH('zbPlaces');
    var vals = { checkedAt: zb.checkedAt || '', statement: zb.statement || '' };
    (zb.places || []).forEach(function (p) { vals['r_' + p.placeId] = p.result; vals['n_' + p.placeId] = p.note || ''; });
    vals = Object.assign(vals, getDraft(dk) || {});
    var defs = [{ n: 'checkedAt', t: 'date', form: 'zb', l: 'When did you check?', h: 'Most of you did this check in L5 (Thu 12 Nov). Any date from 1 Nov is fine.' }];
    places.forEach(function (p) {
      defs.push({ n: 'r_' + p.id, t: 'select', form: 'zbPlace', l: p.label, R: true, opts: CH('zbResults') });
      defs.push({ n: 'n_' + p.id, t: 'text', form: 'zbPlace', l: 'Note for ' + p.label, max: 150 });
    });
    defs.push({ n: 'statement', t: 'textarea', form: 'zb', l: 'What did you find? Write one or two sentences.', rows: 3 });
    var fileIds = (zb.fileIds || []).slice();
    var pg = wordFormPage({
      title: 'Zero-baseline record', defs: defs, vals: vals, dk: dk,
      intro: '<p class="lead">Search each place for your word, with your exact spelling and other ways to spell it. Record what you find before you launch your word. This shows that your word was new when you started.</p><div id="zbwarn"></div>',
      extra: '<h2>Screenshots</h2><p class="hint">Up to 6. Asked for, not required. Suggested caption: ' + esc((root.WI_CHOICES && root.WI_CHOICES.zbCaption) || 'TERM_platform_YYYYMMDD') + '</p><div id="zbfiles"></div>',
      onChange: function (v) { warn(v); },
      onSave: function (v, el) {
        var z = { checkedAt: v.checkedAt, statement: v.statement, fileIds: fileIds, places: places.map(function (p) { return { placeId: p.id, result: v['r_' + p.id], note: v['n_' + p.id] || '' }; }) };
        save('word.zb', { zb: z }, el);
        toast('Zero-baseline record saved.');
        go('#/audition');
      }
    });
    function warn(v) {
      var mine = places.some(function (p) { return v['r_' + p.id] === 'my_meaning'; });
      qs('#zbwarn').innerHTML = mine ? '<div class="note pop">Your word may already exist with this meaning. Tell T.Chris and note it here.</div>' : '';
    }
    warn(vals);
    mountFiles(qs('#zbfiles'), { attachType: 'zb', attachId: sid(), max: 6, ids: fileIds, caption: ((w.word || 'TERM').replace(/\s+/g, '') + '_platform_' + today().replace(/-/g, '')) });
    void pg;
  };

  AUD.submit = function () {
    var w = D.word || {};
    var ready = check('word.card') && check('word.zb');
    var s = w.regStatus || 'draft';
    var h = backLink('#/audition', 'Audition') + '<div class="screen-head"><h1>Send for approval</h1></div>';
    h += '<p>Status: ' + regChip() + '</p>';
    if (s === 'changes') h += '<div class="note bad"><b>T.Chris asked for changes.</b> ' + esc(w.regComment || '') + '</div>';
    if (s === 'approved') h += '<div class="note ok">T.Chris has approved your word. You can launch it.</div>';
    if (s === 'submitted') h += '<div class="note">Your word is with T.Chris. You do not have to wait: your launch can go ahead.</div>';
    if (!ready) h += '<div class="note">Finish your word card and your zero-baseline record first.</div><div class="btnrow">' + (check('word.card') ? '' : '<a class="btn" href="#/audition/card">Word card</a>') + (check('word.zb') ? '' : '<a class="btn" href="#/audition/zb">Zero-baseline record</a>') + '</div>';
    if (ready && (s === 'draft' || s === 'changes')) h += '<div class="panel tint"><dl class="kv"><dt>Word</dt><dd>' + esc(w.word) + '</dd><dt>Meaning</dt><dd>' + esc(w.meaning) + '</dd><dt>Part of speech</dt><dd>' + esc(lab('pos', w.pos)) + '</dd></dl></div><button class="btn primary block" data-act="send">Send my word to T.Chris</button>';
    render(h);
    acts({ send: function () { save('word.submit', {}); toast('Sent. T.Chris will look at it soon.'); go('#/audition'); } });
  };

  var FUDGE_HELP = {
    F: 'Will people have many chances to use it? 0 = almost never, 2 = every day.',
    U: 'Does it sound like a normal word, so people do not stop and stare? 0 = it sounds strange, 2 = it fits in easily.',
    D: 'Can many kinds of people use it, in many situations? 0 = only my group, 2 = almost anyone.',
    G: 'Can it make new forms or meanings, for example with -y, -ed or -er? 0 = no, 2 = easily.',
    E: 'Will the thing it names still matter next year? 0 = it will be gone soon, 2 = it will last.'
  };
  AUD.fudge = function () {
    var w = D.word || {};
    var pred = (w.fudge && w.fudge.pred) || {};
    var dk = draftKey('audition/fudge');
    var letters = CH('fudgeLetters');
    var vals = {};
    letters.forEach(function (L) { vals[L.id] = pred[L.id] != null ? pred[L.id] : ''; vals['why_' + L.id] = (pred.reasons || {})[L.id] || ''; });
    vals = Object.assign(vals, getDraft(dk) || {});
    var defs = [];
    letters.forEach(function (L) {
      defs.push({ n: L.id, t: 'slider', form: 'fudge', l: L.id + ': ' + L.label, h: FUDGE_HELP[L.id] || '', R: true });
      defs.push({ n: 'why_' + L.id, t: 'text', form: 'fudge', l: 'Why ' + L.id + '?', R: true, min: 10, max: 200 });
    });
    function total(v) { var t = 0, all = true; letters.forEach(function (L) { if (v[L.id] === '' || v[L.id] == null) all = false; else t += Number(v[L.id]); }); return { t: t, all: all }; }
    function band(t) { var b = CH('fudgeBands').filter(function (x) { return t >= x.min; })[0]; return b ? b.label : ''; }
    function showTotal(v) {
      var T = total(v);
      qs('#ftotal').innerHTML = '<b style="font-family:var(--f-display);font-size:1.6rem">' + T.t + ' / 10</b> ' + (T.all ? '<span class="chip gold">' + esc(band(T.t)) + '</span>' : '<span class="muted">Move every slider to score each letter.</span>') + '<p class="small">' + esc((root.WI_CHOICES && root.WI_CHOICES.fudgeNote) || 'This is your prediction, not a mark.') + '</p>';
    }
    wordFormPage({
      title: 'FUDGE prediction', defs: defs, vals: vals, dk: dk,
      intro: '<p class="lead">FUDGE is five tests for a new word. Score each letter 0 (weak), 1 (in the middle) or 2 (strong) and give one reason. Total 7 or more: likely to last. 5–6: fringe (it may stay in a small group). 4 or less: doomed (it will probably disappear).</p><div id="ftotal" class="panel gold" aria-live="polite"></div>',
      onChange: function (v) { showTotal(v); },
      onSave: function (v, el) {
        var p = { reasons: {}, at: now() };
        letters.forEach(function (L) { p[L.id] = Number(v[L.id]); p.reasons[L.id] = v['why_' + L.id]; });
        save('word.save', { fields: { fudge: Object.assign({}, w.fudge || {}, { pred: p }) } }, el);
        toast('FUDGE prediction saved.');
        go('#/audition');
      }
    });
    showTotal(vals);
  };

  AUD.hyp = function () {
    var w = D.word || {};
    var dk = draftKey('audition/hyp');
    var st = getDraft(dk) || { researchQuestion: w.researchQuestion || '', hyps: (w.hypotheses && w.hypotheses.length ? w.hypotheses : [{ id: 'h1' }, { id: 'h2' }]).map(function (x) { return Object.assign({}, x); }) };
    function defs() {
      var d = [{ n: 'researchQuestion', t: 'textarea', form: 'hypotheses', l: 'My research question', h: 'Try: "To what extent …?"', rows: 3 }];
      st.hyps.forEach(function (hy, i) {
        d.push({ n: 'html', t: 'html', html: function () { return '<h2 style="margin-top:1.2rem">Hypothesis ' + (i + 1) + (st.hyps.length > 2 ? ' <button class="linkbtn" type="button" data-act="delh" data-i="' + i + '">Remove</button>' : '') + '</h2>'; } });
        d.push({ n: 'text_' + i, t: 'textarea', form: 'hypothesis', l: 'What do you expect?', rows: 3, R: true, min: 20, max: 250 });
        d.push({ n: 'metric_' + i, t: 'select', form: 'hypothesis', l: 'How will you measure it?', R: true, opts: CH('metrics') });
        d.push({ n: 'target_' + i, t: 'text', form: 'hypothesis', l: 'Target', h: 'For example: "10% by Wave 2"', max: 40 });
      });
      return d;
    }
    function vals() { var v = { researchQuestion: st.researchQuestion }; st.hyps.forEach(function (hy, i) { v['text_' + i] = hy.text || ''; v['metric_' + i] = hy.metric || ''; v['target_' + i] = hy.target || ''; }); return v; }
    function pull(v) { st.researchQuestion = v.researchQuestion; st.hyps.forEach(function (hy, i) { hy.text = v['text_' + i]; hy.metric = v['metric_' + i]; hy.target = v['target_' + i]; }); }
    var frames = ((root.FRAMES || []).filter ? root.FRAMES : []).filter(function (f) { return f.group === 'hypothesis'; });
    var framesHTML = frames.length ? '<details class="panel tint"><summary><b>Sentence frames</b></summary><ul>' + frames.map(function (f) { return '<li>' + esc(f.text) + '</li>'; }).join('') + '</ul></details>' : '';
    function draw() {
      var pg = wordFormPage({
        title: 'Research question and hypotheses', defs: defs(), vals: vals(), dk: null,
        intro: '<p class="lead">Two to four hypotheses you can test with your data.</p>' + framesHTML,
        extra: st.hyps.length < 4 ? '<button class="btn ghost" type="button" data-act="addh">Add a hypothesis</button>' : '',
        onChange: function (v) { pull(v); putDraft(dk, st); },
        acts: {
          addh: function () { pull(pg.lf.vals()); st.hyps.push({ id: 'h' + (Math.max.apply(null, st.hyps.map(function (x) { return Number(String(x.id).slice(1)) || 0; })) + 1) }); putDraft(dk, st); draw(); },
          delh: function (b) { pull(pg.lf.vals()); st.hyps.splice(Number(b.getAttribute('data-i')), 1); putDraft(dk, st); draw(); }
        },
        onSave: function (v, el) {
          pull(v);
          save('word.save', { fields: { researchQuestion: st.researchQuestion.trim(), hypotheses: st.hyps.map(function (hy) { return { id: hy.id, text: (hy.text || '').trim(), metric: hy.metric, target: (hy.target || '').trim() }; }) } }, el);
          dropDraft(dk);
          toast('Research question and hypotheses saved.');
          go('#/audition');
        }
      });
    }
    draw();
  };

  AUD.spec = function () {
    var w = D.word || {};
    var ss = w.specSheet || {};
    var dk = draftKey('audition/spec');
    var rows = CH('specRows');
    var vals = {};
    rows.forEach(function (r) { vals['r_' + r.id] = (ss[r.id] || {}).result || ''; vals['n_' + r.id] = (ss[r.id] || {}).note || ''; });
    vals = Object.assign(vals, getDraft(dk) || {});
    var defs = [];
    rows.forEach(function (r) {
      defs.push({ n: 'html', t: 'html', html: function () { return '<h2 style="margin-top:1.2rem">' + esc(r.id) + '. ' + esc(r.requirement) + '</h2><p class="muted">Quick test: ' + esc(r.quickTest) + '</p>'; } });
      defs.push({ n: 'r_' + r.id, t: 'radio', form: 'spec', l: 'Result', R: true, opts: CH('specResults') });
      defs.push({ n: 'n_' + r.id, t: 'text', form: 'spec', l: 'Note', max: 150 });
    });
    function count(v) { var n = 0; rows.forEach(function (r) { if (v['r_' + r.id] === 'pass') n++; }); qs('#scount').innerHTML = '<b>' + n + ' of ' + rows.length + ' pass</b><p class="small">A word can still be a good project if it fails some of these. Explain why in your Lab Book.</p>'; }
    wordFormPage({
      title: 'Spec sheet R1–R10', defs: defs, vals: vals, dk: dk,
      intro: '<div id="scount" class="panel gold" aria-live="polite"></div>',
      onChange: count,
      onSave: function (v, el) {
        var o = {};
        rows.forEach(function (r) { o[r.id] = { result: v['r_' + r.id], note: v['n_' + r.id] || '' }; });
        save('word.save', { fields: { specSheet: o } }, el);
        toast('Spec sheet saved.');
        go('#/audition');
      }
    });
    count(vals);
  };

  /* ======================= S-DEBUT ======================= */
  function askReq(ideaId) { return (D.requests || []).filter(function (r) { return r.type === 'ask_first' && (!ideaId || r.ideaId === ideaId); }).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); })[0] || null; }
  function ideaSelectable(id) { return !!try_(function () { return E().ideaSelectable(D, id); }, !(opt('ideas', id) || {}).askFirst); }
  function is16() { return LS.get(root.WIApi.KEYS.is16); }
  SCREENS.debut = function (parts) {
    var sub = parts[0];
    if (sub && DEB[sub]) { cur.isForm = sub !== 'table'; return DEB[sub](parts.slice(1)); }
    var pas = live(D.planActions).filter(function (p) { return Number(p.phase || 1) === 1; });
    render('<div class="screen-head"><h1>Debut plan</h1></div><p class="lead">Stage 2: plan before you perform. In person comes first.</p>' + hub([
      { t: 'My choices', s: 'Target groups, ideas, platforms, route, time', href: '#/debut/choices', ok: check('plan.choices') },
      { t: 'The six rules', s: check('rules.all') ? 'All six ticked' : 'Read and tick all six', href: '#/debut/rules', ok: check('rules.all') },
      { t: 'My plan table', s: pas.length + (pas.length === 1 ? ' action' : ' actions') + ' planned (at least 3)', href: '#/debut/table', ok: check('plan.actions3') }
    ]) + '<div class="btnrow"><a class="btn ghost" href="#/report/baseline">Baseline report helper</a></div>');
  };
  var DEB = {};
  DEB.choices = function () {
    var p = plan1() || {};
    var dk = draftKey('debut/choices');
    var vals = Object.assign({ targetGroups: p.targetGroups || [], ideas: p.ideas || [], platforms: p.platforms || [], platformOther: p.platformOther || '', route: p.route || '', timeBudget: p.timeBudget || '', who: p.who || '', why: p.why || '', what: p.what || '', spark: p.spark || '', projectAccount: p.projectAccount || '', is16: is16() == null ? '' : String(is16()) }, getDraft(dk) || {});
    var ideaOpts = function () {
      return CH('ideas').map(function (o) {
        var sel = ideaSelectable(o.id);
        var sub = o.helper || '';
        if (o.askFirst) {
          var rq = askReq(o.id);
          sub = 'For any idea that needs help from someone you do not know, such as an influencer. ' + (sel ? 'T.Chris said yes.' : (rq && rq.status === 'pending' ? 'Waiting for T.Chris.' : (rq && rq.status === 'declined' ? 'T.Chris said no. ' + esc(rq.teacherComment || '') : 'Locked until T.Chris says yes.')));
        }
        return { id: o.id, label: o.shownAs || o.label, sub: sub, disabled: !sel };
      });
    };
    var anyOnline = function (v) { return (v.platforms || []).some(function (x) { return (opt('platforms', x) || {}).online; }); };
    var defs = [
      { n: 'targetGroups', t: 'checks', form: 'choices', l: 'Target groups', h: 'Who do you want to reach with your word? The numbers are ages. Choose one or more.', two: true, opts: CH('targetGroups') },
      { n: 'ideas', t: 'checks', form: 'choices', l: 'Promotion ideas', h: 'Choose at least one in-person idea.', opts: ideaOpts,
        check: function (v) { var ok = v.some(function (x) { var m = (opt('ideas', x) || {}).mode; return m === 'inperson' || m === 'either'; }); return ok ? '' : 'Choose at least one idea you can do in person.'; },
        after: function () { var rq = askReq('id_influencer'); return ideaSelectable('id_influencer') || (rq && rq.status === 'pending') ? '' : '<button class="btn small" type="button" data-act="ask">Ask T.Chris first</button>'; } },
      { n: 'platforms', t: 'checks', form: 'choices', l: 'Platforms', two: true, opts: CH('platforms'),
        check: function (v) { return v.indexOf('pf_inperson') >= 0 && v.length > 1 ? '"In person only" cannot go with other platforms.' : ''; } },
      { n: 'platformOther', t: 'text', form: 'choices', l: 'Which other platform?', max: 30, noOpt: true, show: function (v) { return (v.platforms || []).indexOf('pf_other') >= 0; }, R: false,
        check: function (x, v) { return (v.platforms || []).indexOf('pf_other') >= 0 && !String(x || '').trim() ? 'Please fill this in.' : ''; } },
      { n: 'is16', t: 'radio', noOpt: true, l: 'How old are you?', h: 'This stays on this phone. It is never sent to WordIdol. It helps us show the right safety advice.', opts: [{ id: 'false', label: 'I am 15 or under' }, { id: 'true', label: 'I am 16 or over' }], show: anyOnline, R: false,
        check: function (x, v) { return anyOnline(v) && x === '' ? 'Please choose one.' : ''; } },
      { n: 'route', t: 'radio', form: 'choices', l: 'My route', opts: CH('routes') },
      { n: 'timeBudget', t: 'radio', form: 'choices', l: 'My time each week', opts: CH('timeBudgets') },
      { n: 'who', t: 'textarea', form: 'choices', l: 'Who is my crowd?', rows: 3 },
      { n: 'why', t: 'textarea', form: 'choices', l: 'Why would they need this word?', rows: 3 },
      { n: 'what', t: 'textarea', form: 'choices', l: 'What exactly will they hear or see?', rows: 3 },
      { n: 'spark', t: 'textarea', form: 'choices', l: 'What could start it?', rows: 2 },
      { n: 'projectAccount', t: 'text', form: 'choices', l: 'Project account name', h: 'Only the account name. Never write a password here.' }
    ];
    var ageNote = function (v) {
      if (!anyOnline(v)) return '';
      var social = (v.platforms || []).some(function (x) { return (opt('platforms', x) || {}).social; });
      if (!social) return '';
      if (v.is16 === 'false') return '<div class="note">If you are 15 or under, TikTok and Instagram accounts start private. Check that yours is still private before you post.</div>';
      if (v.is16 === 'true') return '<div class="note">If you are 16 or over, set your project account to private yourself in Settings before you post.</div>';
      return '';
    };
    render(backLink('#/debut', 'Debut plan') + '<div class="screen-head"><h1>My choices</h1></div><p class="lead">In person comes first. Online is your choice, later.</p>' +
      '<form id="wf" class="form" novalidate>' + fieldsHTML(defs, vals) + '<div id="agenote">' + ageNote(vals) + '</div>' + formFoot('Save my choices') + '</form>');
    var el = qs('#wf');
    var lf = liveForm(el, defs, { draft: dk, onChange: function (v, ev) {
      if (ev && ev.target && ev.target.name === 'platforms' && ev.target.value === 'pf_inperson' && ev.target.checked) {
        qsa('input[name=platforms]', el).forEach(function (x) { if (x.value !== 'pf_inperson') x.checked = false; });
      } else if (ev && ev.target && ev.target.name === 'platforms' && ev.target.checked) {
        var ip = qs('input[name=platforms][value=pf_inperson]', el); if (ip) ip.checked = false;
      }
      qs('#agenote').innerHTML = ageNote(lf ? lf.vals() : v);
    } });
    acts({
      ask: function () { requestSheet('id_influencer'); },
      save: function () {
        var v = trimVals(lf.vals());
        var errs = validate(defs, v);
        if (!showErrs(el, errs)) { toast('Please check the boxes marked in red.', 'err'); return; }
        if (v.is16 !== '') LS.set(root.WIApi.KEYS.is16, v.is16 === 'true');
        var fields = {};
        ['targetGroups', 'ideas', 'platforms', 'platformOther', 'route', 'timeBudget', 'who', 'why', 'what', 'spark', 'projectAccount'].forEach(function (k) { fields[k] = v[k]; });
        if ((v.platforms || []).indexOf('pf_other') < 0) fields.platformOther = '';
        save('plan.save', { phase: 1, fields: fields }, el);
        dropDraft(dk);
        toast('Choices saved.');
        go('#/debut');
      }
    });
  };
  function requestSheet(ideaId) {
    var defs = [{ n: 'text', t: 'textarea', form: 'request', l: 'What do you want to ask, and who?', rows: 4, R: true, min: 20, max: 300 }];
    openSheet('Ask T.Chris first', '<p>Anything that means contacting someone you do not know must be checked with T.Chris first. It stays locked until he says yes.</p><form class="form" novalidate>' + fieldsHTML(defs, {}) + '<button class="btn primary block" type="button" data-act="send">Send my request</button></form>', function (a, b, s) {
      if (a !== 'send') return;
      var v = readVals(s.el, defs), e = validate(defs, v);
      if (!showErrs(s.el, e)) return;
      save('request.create', { id: api.newId('rq'), type: 'ask_first', ideaId: ideaId, text: v.text.trim() });
      s.close(); toast('Request sent. You will see his answer here.'); rerender();
    });
  }
  DEB.rules = function () {
    var ticked = (D.state && D.state.rulesTicked) || [];
    var all = check('rules.all');
    var rules = RULES();
    var h = backLink('#/debut', 'Debut plan') + '<div class="screen-head"><h1>The six rules</h1></div><p class="lead">No word is worth more than you are.</p><form id="rf" class="form" novalidate>';
    rules.forEach(function (r, i) {
      h += '<div class="field" data-f="r' + i + '"><label class="tickline"><input type="checkbox" name="r' + i + '"' + (ticked[i] || all ? ' checked' : '') + (all ? ' disabled' : '') + '><span><b>' + (i + 1) + '.</b> ' + esc(r) + '</span></label>' +
        (i === 4 || i === 5 ? '<p class="hint" style="margin:.4rem 0 0 .8rem">' + esc(rulesData().paidNote || '') + '</p>' : '') + '<div class="err" role="alert"></div></div>';
    });
    h += all ? '<div class="note ok">You agreed to follow these rules on ' + esc(fmt(ticked[5] || ticked[0], 'long')) + '.</div>' : '<button class="btn primary block" type="button" data-act="agree">I agree to follow these rules</button>';
    h += '</form>';
    render(h);
    acts({
      agree: function () {
        var el = qs('#rf'), errs = {};
        rules.forEach(function (r, i) { if (!qs('input[name=r' + i + ']', el).checked) errs['r' + i] = 'Please tick this rule.'; });
        if (!showErrs(el, errs)) return;
        save('rules.tick', { ticks: rules.map(function () { return true; }) });
        toast('Thank you. Stay safe.');
        go('#/debut');
      }
    });
  };
  SCREENS.rules = function () {
    var ticked = (D && D.state && D.state.rulesTicked) || [];
    render('<div class="screen-head"><h1>The six rules</h1></div><ol>' + RULES().map(function (r, i) { return '<li style="margin:.6rem 0">' + esc(r) + (i === 5 ? '<p class="hint">' + esc(rulesData().paidNote || '') + '</p>' : '') + '</li>'; }).join('') + '</ol>' +
      (D && check('rules.all') ? '<div class="note ok">You agreed to these rules.</div>' : '<a class="btn primary" href="#/debut/rules">Read and tick the rules</a>') +
      (ticked.length ? '' : ''));
  };

  /* plan table */
  function planActionDefs(p) {
    var myIdeas = (p && p.ideas) || [];
    var myGroups = (p && p.targetGroups) || [];
    var theory = (G().theory || []).map(function (t) { return { id: t.id, label: t.name }; });
    var evid = ((root.WI_CHOICES && root.WI_CHOICES.planEvidence) || []).map(function (id) { return { id: id, label: lab('evidenceTypes', id) }; });
    return [
      { n: 'where', t: 'select', form: 'planAction', l: 'Where?', opts: CH('channels') },
      { n: 'ideaId', t: 'select', form: 'planAction', l: 'Which of my ideas?', opts: function () { return myIdeas.map(function (id) { return { id: id, label: lab('ideas', id), disabled: !ideaSelectable(id) }; }); } },
      { n: 'what', t: 'text', form: 'planAction', l: 'What will I do?' },
      { n: 'why', t: 'text', form: 'planAction', l: 'Why does it fit my target group?' },
      { n: 'theoryTag', t: 'select', form: 'planAction', l: 'Theory idea behind it', opts: theory },
      { n: 'whenDate', t: 'date', form: 'planAction', l: 'When?', h: 'From Sat 21 Nov 2026 to Fri 15 Jan 2027.' },
      { n: 'evidence', t: 'select', form: 'planAction', l: 'Evidence: how will I record it?', opts: evid },
      { n: 'targetGroup', t: 'select', form: 'planAction', l: 'For which target group?', opts: function () { return myGroups.map(function (id) { return { id: id, label: lab('targetGroups', id) }; }); } }
    ];
  }
  DEB.table = function (rest) {
    var p = plan1();
    if (rest[0]) return planActionForm(rest[0]);
    var pas = live(D.planActions).filter(function (x) { return Number(x.phase || 1) === 1; }).sort(function (a, b) { return String(a.whenDate).localeCompare(String(b.whenDate)); });
    var h = backLink('#/debut', 'Debut plan') + '<div class="screen-head"><h1>My plan table</h1></div><p class="lead">One row is one action. Plan 3 to 5 actions; at least one in person.</p>';
    if (!p) h += '<div class="note">Make your choices first, so you can pick from your ideas and target groups. <a href="#/debut/choices">My choices</a></div>';
    h += pas.length ? '<ul class="list">' + pas.map(function (a) {
      var ch = opt('channels', a.where) || {};
      var lockedTxt = ch.online && !onlineOpen() ? ' <span class="chip warn">' + ic('lock') + 'online: opens Thu 26 Nov</span>' : '';
      return '<li><a class="rowlink" href="#/debut/table/' + esc(a.id) + '"><span class="grow"><span class="t">' + esc(a.what) + '</span><span class="s">' + esc(fmt(a.whenDate)) + ', ' + esc(ch.label || a.where) + (a.status && a.status !== 'planned' ? ', ' + esc(a.status) : '') + '</span>' + lockedTxt + '</span>' + ic('right', 'chev') + '</a></li>';
    }).join('') + '</ul>' : '<div class="empty"><strong>No actions yet.</strong>Add your first planned action.</div>';
    h += '<div class="btnrow"><a class="btn primary" href="#/debut/table/new">Add an action</a><button class="btn ghost" data-act="ideas">' + ic('bulb') + 'Give me ideas</button></div>';
    render(h);
    acts({ ideas: function () { ideasSheet(function (text) { LS.set(draftKey('debut/table', 'new'), { what: text.slice(0, 200) }); go('#/debut/table/new'); }); } });
  };
  function planActionForm(id) {
    cur.isForm = true;
    var p = plan1();
    var isNew = id === 'new';
    var rec = isNew ? null : live(D.planActions).filter(function (x) { return x.id === id; })[0];
    if (!isNew && !rec) { render('<div class="empty"><strong>This action was not found.</strong><a class="btn" href="#/debut/table">Back</a></div>'); return; }
    var newId = cur.q.id || api.newId('pa');
    var dk = draftKey('debut/table', isNew ? 'new' : id);
    var vals = Object.assign({}, rec || { whenDate: today() < '2026-11-21' ? '2026-11-21' : today() }, getDraft(dk) || {});
    var defs = planActionDefs(p);
    render(backLink('#/debut/table', 'My plan table') + '<div class="screen-head"><h1>' + (isNew ? 'New planned action' : 'Planned action') + '</h1></div>' +
      '<form id="wf" class="form" novalidate>' + fieldsHTML(defs, vals) + '<div id="onl"></div>' +
      '<div class="formfoot"><button class="btn primary" type="button" data-act="save">Save</button>' + (isNew ? '<button class="btn ghost" type="button" data-act="ideas">' + ic('bulb') + 'Give me ideas</button>' : '<button class="btn danger" type="button" data-act="del">Delete</button>') + saveStateHTML() + '</div></form>');
    var el = qs('#wf');
    function onl(v) { var ch = opt('channels', v.where) || {}; qs('#onl').innerHTML = ch.online && !onlineOpen() ? '<div class="note">' + ic('lock') + ' You can plan this now. Online actions open after the L9 safety briefing (Thu 26 Nov, 16:30) once you have ticked all six rules. You cannot log it as done before then.</div>' : ''; }
    var lf = liveForm(el, defs, { draft: dk, onChange: onl });
    onl(vals);
    acts({
      ideas: function () { ideasSheet(function (text) { var w = qs('[name=what]', el); w.value = text.slice(0, 200); lf.update(); }); },
      del: function () {
        confirmSheet('Delete this action?', 'It will be removed from your plan.', 'Delete', 'Keep it').then(function (y) {
          if (!y) return; save('rec.delete', { type: 'planAction', id: id }); dropDraft(dk); go('#/debut/table');
        });
      },
      save: function () {
        var v = trimVals(lf.vals());
        var errs = validate(defs, v);
        if (!showErrs(el, errs)) return;
        var r = Object.assign({}, rec || {}, { id: isNew ? newId : id, phase: 1, where: v.where, ideaId: v.ideaId, what: v.what, why: v.why, theoryTag: v.theoryTag || '', whenDate: v.whenDate, evidence: v.evidence, targetGroup: v.targetGroup || '', status: (rec && rec.status) || 'planned', deleted: false });
        save('rec.save', { type: 'planAction', record: r }, el);
        dropDraft(dk);
        toast('Planned action saved.');
        go('#/debut/table');
      }
    });
  }

  /* "Give me ideas" drawer (SPEC §10.4) */
  function ideasSheet(onAdd) {
    var p = plan1() || {};
    var myIdeas = p.ideas || [], myGroups = p.targetGroups || [];
    var unlocked = onlineOpen();
    var b = (G().banks) || {};
    function fit(e) {
      if (e.mode === 'online' && !unlocked) return false;
      if (e.ideaIds && e.ideaIds.length && myIdeas.length && !e.ideaIds.some(function (x) { return myIdeas.indexOf(x) >= 0; })) return false;
      if (e.targetGroupIds && e.targetGroupIds.length && myGroups.length && !e.targetGroupIds.some(function (x) { return myGroups.indexOf(x) >= 0; })) return false;
      return true;
    }
    var sets = [['carriers', 'Things that carry a word'], ['triggers', 'Moments that call for the word'], ['formats', 'Formats'], ['bridges', 'Bridges to another group']];
    var h = '<p class="muted">Picked for your choices.' + (unlocked ? '' : ' Online ideas appear after online actions open for you.') + '</p>';
    sets.forEach(function (s) {
      var list = (b[s[0]] || []).filter(fit);
      if (!list.length) list = (b[s[0]] || []).filter(function (e) { return !(e.mode === 'online' && !unlocked); });
      if (!list.length) return;
      h += '<h3 style="margin-top:1rem">' + esc(s[1]) + '</h3><ul class="list">' + list.map(function (e) {
        return '<li style="padding:.5rem 0"><div>' + esc(e.text) + '</div>' + (onAdd ? '<button class="btn small ghost" data-act="add" data-t="' + esc(e.text) + '">Add to my plan</button>' : '') + '</li>';
      }).join('') + '</ul>';
    });
    openSheet('Give me ideas', h, function (a, el, sh) { if (a === 'add') { sh.close(); onAdd(el.getAttribute('data-t')); } });
  }

  /* ======================= S-LOG ======================= */
  var LOG_TABS = [['action', 'Actions', 'actions'], ['journal', 'Lab Book', 'journal'], ['sighting', 'Sightings', 'sightings'], ['tally', 'Tallies', 'tallies']];
  SCREENS.log = function (parts, q) {
    if (parts[0] && parts[1]) { cur.isForm = true; return logForm(parts[0], parts[1], q); }
    var tab = q.tab || parts[0] || LS.get('wi.logTab') || 'action';
    if (!LOG_TABS.some(function (t) { return t[0] === tab; })) tab = 'action';
    LS.set('wi.logTab', tab);
    var t = LOG_TABS.filter(function (x) { return x[0] === tab; })[0];
    var list = live(D[t[2]]).slice().sort(byDateDesc);
    var h = '<div class="screen-head"><h1>The Log</h1></div><div class="seg" role="tablist" aria-label="Log sections">' +
      LOG_TABS.map(function (x) { return '<a role="tab" href="#/log?tab=' + x[0] + '" aria-selected="' + (x[0] === tab) + '">' + x[1] + '</a>'; }).join('') + '</div>';
    h += '<div class="btnrow"><a class="btn primary" href="#/log/' + tab + '/new">' + ic('plus') + 'New ' + { action: 'action', journal: 'Lab Book entry', sighting: 'sighting', tally: 'tally' }[tab] + '</a>' + (tab === 'journal' ? '<a class="btn ghost" href="#/log/journal/new?kind=zero_result">Nothing happened this week</a>' : '') + '</div>';
    if (!list.length) h += '<div class="empty"><strong>' + { action: 'No actions logged yet.', journal: 'Your Lab Book is empty.', sighting: 'No sightings yet.', tally: 'No tallies yet.' }[tab] + '</strong>' + { action: 'Log what you did for your word, even if it did not work.', journal: 'Write what you did, what you noticed and what you will try next.', sighting: 'When you see or hear your word, record it here. A zero-result week is useful data too.', tally: 'Count how often you said or heard your word. 0 is a useful result.' }[tab] + '</div>';
    else h += '<ul class="list">' + list.map(function (r) { return '<li><a class="rowlink" href="#/log/' + tab + '/' + esc(r.id) + '"><span class="grow">' + logLine(tab, r) + '</span>' + ic('right', 'chev') + '</a></li>'; }).join('') + '</ul>';
    render(h);
  };
  function logLine(tab, r) {
    var d = '<span class="s">' + esc(fmt(r.date)) + '</span>';
    if (tab === 'action') return '<span class="t">' + esc(clip(r.what, 80)) + '</span><span class="s">' + esc(fmt(r.date)) + ', ' + esc(lab('channels', r.channelId)) + ', ' + esc(lab('outcomes', r.outcome)) + '</span>';
    if (tab === 'journal') return '<span class="t">' + esc(lab('journalKinds', r.kind)) + '</span><span class="s">' + esc(fmt(r.date)) + ', ' + words(r.wordCount || wc(r.text)) + ': ' + esc(clip(r.text, 60)) + '</span>';
    if (tab === 'sighting') return '<span class="t">“' + esc(clip(r.quote, 70)) + '”</span><span class="s">' + esc(fmt(r.date)) + ', ' + esc(lab('relations', r.relation)) + ', Level ' + esc(r.finalLevel != null && r.finalLevel !== '' ? r.finalLevel : r.level) + (r.owned ? ' (owned)' : ' (earned)') + (r.spotStatus && r.spotStatus !== 'none' && r.spotStatus !== 'queued' ? ', checked by T.Chris' : '') + '</span>';
    if (tab === 'tally') return '<span class="t">' + esc(lab('tallyTypes', r.tallyType)) + ': ' + esc(r.count) + '</span>' + d;
    return d;
  }
  function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  function promptFor(kind, wk, skip) {
    var all = (G().labPrompts || []).filter(function (p) { return (!kind || p.kind === kind) && (!p.weekIds || p.weekIds.indexOf(wk) >= 0); });
    if (!all.length) all = (G().labPrompts || []).filter(function (p) { return !kind || p.kind === kind; });
    if (!all.length) return null;
    var i = Math.abs(Number(WIApi.rand36(2).charCodeAt(0)) + (skip || 0)) % all.length;
    return all[i];
  }
  function logDefs(type, ctx) {
    var myIdeas = ((plan1() || {}).ideas) || [];
    var ideaO = function () { return myIdeas.map(function (id) { return { id: id, label: lab('ideas', id) }; }); };
    if (type === 'action') {
      var pas = live(D.planActions).filter(function (x) { return x.status === 'planned' || x.id === ctx.vals.planActionId; });
      return [
        { n: 'date', t: 'date', form: 'action', l: 'Date' },
        { n: 'planActionId', t: 'select', form: 'action', l: 'Which planned action was this?', ph: 'Not a planned action', opts: pas.map(function (p) { return { id: p.id, label: fmt(p.whenDate) + ': ' + clip(p.what, 50) }; }) },
        { n: 'channelId', t: 'select', form: 'action', l: 'Where?', opts: CH('channels') },
        { n: 'ideaId', t: 'select', form: 'action', l: 'Which idea?', opts: ideaO },
        { n: 'what', t: 'textarea', form: 'action', l: 'What I did', rows: 3 },
        { n: 'outcome', t: 'radio', form: 'action', l: 'How did it go?', opts: CH('outcomes') },
        { n: 'outcomeReason', t: 'text', form: 'action', l: 'What changed, or why did it not happen?', show: function (v) { return v.outcome && v.outcome !== 'as_planned'; } },
        { n: 'audience', t: 'select', form: 'action', l: 'How many people heard or saw it?', opts: CH('audiences') },
        { n: 'reaction', t: 'textarea', form: 'action', l: 'How did people react?', h: 'Write "a classmate", "a cousin". Never a full name.', rows: 3 },
        { n: 'learned', t: 'textarea', form: 'action', l: 'What did I learn?', rows: 3, showWords: true },
        { n: 'problem', t: 'tick', form: 'action', l: 'I had a problem' }
      ];
    }
    if (type === 'journal') {
      return [
        { n: 'date', t: 'date', form: 'journal', l: 'Date' },
        { n: 'kind', t: 'select', form: 'journal', l: 'Kind of entry', opts: CH('journalKinds') },
        { n: 'html', t: 'html', html: function () { return '<div id="prompt"></div>'; } },
        { n: 'text', t: 'textarea', form: 'journal', l: 'My entry', tall: true, showWords: true, wordGoal: '40 words or more' }
      ];
    }
    if (type === 'sighting') {
      var lv = (root.LEVELS || []);
      var allowed = (root.WI_CHOICES && root.WI_CHOICES.sightingLevels) || [0, 1, 4, 5, 6];
      return [
        { n: 'date', t: 'date', form: 'sighting', l: 'Date' },
        { n: 'channelId', t: 'select', form: 'sighting', l: 'Where?', opts: CH('channels') },
        { n: 'relation', t: 'select', form: 'sighting', l: 'Who used it?', opts: CH('relations') },
        { n: 'quote', t: 'textarea', form: 'sighting', l: 'What was said or written', rows: 2 },
        { n: 'context', t: 'text', form: 'sighting', l: 'What was happening?' },
        { n: 'prompted', t: 'radio', form: 'sighting', l: 'Did you ask them to use it?', opts: CH('prompted') },
        { n: 'marked', t: 'radio', form: 'sighting', l: 'How did they use it?', opts: CH('marked') },
        { n: 'topic', t: 'select', form: 'sighting', l: 'Topic', opts: CH('topics') },
        { n: 'posUsed', t: 'select', form: 'sighting', l: 'Part of speech used', opts: CH('posUsed') },
        { n: 'derivedForm', t: 'text', form: 'sighting', l: 'Did they make a new form of it?', h: 'For example -y, -ed, -er' },
        { n: 'level', t: 'radio', form: 'sighting', l: 'Evidence Level', num: true, h: '<button type="button" class="linkbtn" data-act="levels">What do the levels mean?</button>',
          opts: lv.map(function (L) { var ok = allowed.indexOf(L.level) >= 0; return { id: L.level, label: L.level + ' ' + L.name, sub: ok ? esc(L.definition) : 'Comes from the survey', disabled: !ok }; }) },
        { n: 'html', t: 'html', html: function () { return '<p id="owned" class="note hidden" aria-live="polite"></p>'; } },
        { n: 'link', t: 'url', form: 'sighting', l: 'Link', h: 'If there is a public link, paste it here. It must start with https://' },
        { n: 'verifiable', t: 'radio', form: 'sighting', l: 'Could T.Chris check this?', bool: true, opts: CH('verifiable').map(function (o) { return { id: String(o.id), label: o.label }; }) }
      ];
    }
    return [
      { n: 'date', t: 'date', form: 'tally', l: 'Date' },
      { n: 'tallyType', t: 'select', form: 'tally', l: 'What did you count?', opts: CH('tallyTypes') },
      { n: 'count', t: 'number', form: 'tally', l: 'How many times?', h: '0 is a valid and useful result.' },
      { n: 'context', t: 'select', form: 'tally', l: 'Where?', opts: CH('channels') },
      { n: 'note', t: 'text', form: 'tally', l: 'Note' }
    ];
  }
  var LIST_OF = { action: 'actions', journal: 'journal', sighting: 'sightings', tally: 'tallies' };
  var PREFIX = { action: 'ac', journal: 'jn', sighting: 'sg', tally: 'tl' };
  var MAXF = { action: 3, journal: 2, sighting: 3, tally: 0 };
  function logForm(type, id, q) {
    if (!LIST_OF[type]) { go('#/log'); return; }
    var isNew = id === 'new';
    var rec = isNew ? null : (D[LIST_OF[type]] || []).filter(function (r) { return r.id === id; })[0];
    if (!isNew && (!rec || rec.deleted)) { render('<div class="empty"><strong>This entry was not found.</strong><a class="btn" href="#/log">Back to the Log</a></div>'); return; }
    // a new entry keeps its id in the draft, so screenshots and retries attach to the same row
    var dk = draftKey('log/' + type, isNew ? 'new' + (q.plan ? '_' + q.plan : '') + (q.kind ? '_' + q.kind : '') : id);
    var draft = getDraft(dk) || {};
    var recId = isNew ? (draft.__id || api.newId(PREFIX[type])) : id;
    var vals = Object.assign({ date: today() }, rec || {}, draft);
    vals.__id = recId;
    if (isNew && q.kind && !draft.kind) vals.kind = q.kind;
    if (isNew && type === 'journal' && !vals.kind) vals.kind = 'reflection';
    if (isNew && q.plan && !draft.planActionId) {
      var pa = live(D.planActions).filter(function (x) { return x.id === q.plan; })[0];
      if (pa) Object.assign(vals, { planActionId: pa.id, channelId: pa.where, ideaId: pa.ideaId, what: pa.what });
    }
    if (type === 'sighting' && vals.verifiable != null && vals.verifiable !== '') vals.verifiable = String(vals.verifiable);
    if (isNew) putDraft(dk, vals);
    var defs = logDefs(type, { vals: vals });
    var fileIds = (vals.fileIds || []).slice();
    var title = { action: 'Action', journal: 'Lab Book entry', sighting: 'Sighting', tally: 'Tally' }[type];
    var canDel = !isNew && !(type === 'sighting' && rec.auditStatus && rec.auditStatus !== 'none');
    var h = backLink('#/log?tab=' + type, 'The Log') + '<div class="screen-head"><h1>' + (isNew ? 'New ' + (type === 'journal' ? title : title.toLowerCase()) : title) + '</h1></div>';
    if (type === 'sighting' && rec && rec.auditStatus && rec.auditStatus !== 'none') h += '<div class="note">An auditor looked at this sighting: <b>' + esc({ assigned: 'waiting for the auditor', agreed: 'agreed with your level', disputed: 'would give a different level', unverifiable: 'could not check it' }[rec.auditStatus] || rec.auditStatus) + '</b>.' + (rec.spotStatus && rec.spotStatus !== 'none' && rec.spotStatus !== 'queued' ? ' Checked by T.Chris: Level ' + esc(rec.finalLevel) + '.' : '') + '</div>';
    if (type === 'journal' && q.stuck) {
      var sp = (G().stuck || []).filter(function (s) { return s.id === q.stuck; })[0];
      if (sp) h += '<div class="note pop"><b>Write about this:</b> ' + esc(sp.text) + '</div>';
    }
    h += '<form id="wf" class="form" novalidate>' + fieldsHTML(defs, vals);
    if (MAXF[type]) h += '<h2>Screenshots</h2><div id="files"></div>';
    if (type === 'sighting' || type === 'action') h += '<p class="note">' + esc(rulesData().namesReminder || "Use 'a classmate' or 'a cousin'. Never write a full name or username.") + '</p>';
    h += '<div id="lockmsg"></div><div class="formfoot"><button class="btn primary" type="button" data-act="save">Save</button>' + (canDel ? '<button class="btn danger" type="button" data-act="del">Delete</button>' : '') + saveStateHTML() + '</div></form>';
    render(h);
    var el = qs('#wf');
    var promptSkip = 0, promptObj = null;
    function showPrompt(v) {
      if (type !== 'journal') return;
      var wk = try_(function () { return E().weekIdOf(v.date || today()); }, curWeek());
      var keep = (G().labPrompts || []).filter(function (p) { return p.id === v.promptId && (!v.kind || p.kind === v.kind); })[0];
      promptObj = keep || promptFor(v.kind || 'reflection', wk, promptSkip);
      var box = qs('#prompt');
      if (box) box.innerHTML = promptObj ? '<div class="panel gold flat"><p style="margin:0 0 .4rem"><b>Prompt:</b> ' + esc(promptObj.text) + '</p><button type="button" class="linkbtn" data-act="swap">Another prompt</button></div>' : '';
    }
    function owned(v) {
      var o = qs('#owned'); if (!o) return;
      if (!v.relation && !v.prompted) { o.textContent = ''; o.className = 'note hidden'; return; }
      var isOwned = try_(function () { return E().owned(v); }, v.relation === 'me' || v.prompted === 'asked');
      o.className = 'note' + (isOwned ? '' : ' ok');
      o.textContent = isOwned ? 'This sighting is owned evidence: you used the word, or you asked for it.' : 'This sighting is earned evidence: someone used the word without being asked.';
    }
    function lock(v) {
      var box = qs('#lockmsg'); if (!box) return false;
      var r = recordOf(v);
      var locked = (type === 'action' || type === 'sighting') && try_(function () { return E().lockedOnline(type, r, D, now(), D.config); }, false);
      box.innerHTML = locked ? '<div class="note bad">' + ic('lock') + ' ' + (type === 'action' ? 'Online actions open after the L9 safety briefing and the six rules. You can log this when they open, or choose "Did not do it".' : 'Your own online use can be recorded after the L9 safety briefing and the six rules. Someone else’s online use can always be recorded.') + '</div>' : '';
      return locked;
    }
    function recordOf(v) {
      var r = Object.assign({}, rec || {}, { id: recId, deleted: false });
      defs.forEach(function (d) { if (d.t !== 'html') r[d.n] = v[d.n]; });
      if (type === 'action' && r.outcome === 'as_planned') r.outcomeReason = '';
      if (type === 'journal') r.promptId = promptObj ? promptObj.id : '';
      if (type === 'tally') r.count = Number(r.count);
      if (MAXF[type]) r.fileIds = fileIds.slice();
      delete r.__id;
      return r;
    }
    var lf = liveForm(el, defs, { draft: dk, base: { __id: recId, fileIds: fileIds }, onChange: function (v, ev) {
      if (ev && ev.target && (ev.target.name === 'kind' || ev.target.name === 'date')) { promptSkip = 0; v.promptId = ''; }
      if (ev && ev.target && ev.target.name === 'planActionId' && ev.target.value) {
        var pa2 = live(D.planActions).filter(function (x) { return x.id === ev.target.value; })[0];
        if (pa2) { ['channelId', 'ideaId', 'what'].forEach(function (k, i) { var f = qs('[name=' + k + ']', el); var src = [pa2.where, pa2.ideaId, pa2.what][i]; if (f && !f.value) f.value = src || ''; }); }
      }
      showPrompt(v); owned(v); lock(v);
    } });
    showPrompt(vals); owned(vals); lock(vals);
    if (MAXF[type]) mountFiles(qs('#files'), { attachType: type, attachId: recId, max: MAXF[type], ids: fileIds, onChange: function () { putDraft(dk, Object.assign(lf.vals(), { fileIds: fileIds })); } });
    acts({
      levels: function () { levelsSheet(); },
      swap: function () { promptSkip++; var v = lf.vals(); v.promptId = ''; var all = (G().labPrompts || []).filter(function (p) { return p.kind === (v.kind || 'reflection'); }); if (all.length > 1) { var i = all.indexOf(promptObj); promptObj = all[(i + 1) % all.length]; var box = qs('#prompt'); if (box) box.innerHTML = '<div class="panel gold flat"><p style="margin:0 0 .4rem"><b>Prompt:</b> ' + esc(promptObj.text) + '</p><button type="button" class="linkbtn" data-act="swap">Another prompt</button></div>'; } },
      del: function () {
        confirmSheet('Delete this entry?', 'It will be removed from your Log. XP you already got stays.', 'Delete', 'Keep it').then(function (y) {
          if (!y) return; save('rec.delete', { type: type, id: id }); dropDraft(dk); toast('Deleted.'); go('#/log?tab=' + type);
        });
      },
      save: function () {
        var v = lf.vals();
        var errs = validate(defs, trimVals(v));
        if (!showErrs(el, errs)) { toast('Please check the boxes marked in red.', 'err'); return; }
        if (lock(v)) { qs('#lockmsg').scrollIntoView({ block: 'center' }); return; }
        var r = trimRecord(recordOf(v));
        save('rec.save', { type: type, record: r }, el).then(function (res) {
          if (res && res.ok === false && res.error && res.error.code === 'LOCKED_ONLINE') toast('Online use is locked for you at the moment.', 'err');
        });
        dropDraft(dk);
        toast('Saved to your Log.');
        if (type === 'action' && r.problem) go('#/problem');
        else go('#/log?tab=' + type);
      }
    });
  }
  function trimRecord(r) { Object.keys(r).forEach(function (k) { if (typeof r[k] === 'string') r[k] = r[k].trim(); }); return r; }
  function levelsSheet() {
    var allowed = (root.WI_CHOICES && root.WI_CHOICES.sightingLevels) || [0, 1, 4, 5, 6];
    openSheet('Evidence Levels', (root.LEVELS || []).map(function (L) {
      return '<div class="panel flat' + (allowed.indexOf(L.level) < 0 ? ' tint' : '') + '"><h3>Level ' + esc(L.level) + ': ' + esc(L.name) + ' <span class="chip">' + esc(L.ownedOrEarned === 'survey' ? 'from the survey' : L.ownedOrEarned) + '</span></h3><p>' + esc(L.definition) + '</p>' + (L.example ? '<p class="muted small">Example: ' + esc(L.example) + '</p>' : '') + '</div>';
    }).join(''));
  }

  /* ======================= screenshots ======================= */
  function filesFor(attachType, attachId) { return live(D.files).filter(function (f) { return f.attachType === attachType && f.attachId === attachId; }); }
  function mountFiles(box, o) {
    if (!box) return;
    function draw() {
      var ids = o.ids;
      var list = ids.map(fileById).filter(function (f) { return f && !f.deleted; });
      var off = root.navigator && root.navigator.onLine === false;
      box.innerHTML = '<div class="thumbs">' + list.map(function (f) { return '<button type="button" class="thumb" data-act="viewfile" data-id="' + esc(f.id) + '" aria-label="View screenshot ' + esc(f.caption || '') + '">' + ic('image') + '<span>' + esc(clip(f.caption || 'Screenshot', 24)) + '</span></button>'; }).join('') + '</div>' +
        (list.length < o.max ? '<button type="button" class="btn small ghost" data-act="addfile"' + (off ? ' disabled' : '') + '>' + ic('camera') + (off ? 'Add the screenshot when you are back online' : 'Add a screenshot') + '</button>' : '<p class="muted small">That is the most screenshots for this entry (' + o.max + ').</p>') +
        '<p class="hint">Crop out other people’s names, faces and usernames first.</p>';
    }
    draw();
    box.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]'); if (!b) return;
      var a = b.getAttribute('data-act');
      if (a === 'addfile') { ev.preventDefault(); ev.stopPropagation(); uploadSheet({ attachType: o.attachType, attachId: o.attachId, caption: o.caption }, function (f) { o.ids.push(f.id); if (o.onChange) o.onChange(); draw(); }); }
      if (a === 'viewfile') { ev.preventDefault(); ev.stopPropagation(); viewFile(b.getAttribute('data-id')); }
    });
    root.addEventListener('online', draw); root.addEventListener('offline', draw);
    var prev = cur.cleanup; cur.cleanup = function () { root.removeEventListener('online', draw); root.removeEventListener('offline', draw); if (prev) prev(); };
  }
  /* resize in the browser (SPEC §14.2 P7): JPEG, long side <= 1280, quality 0.8 -> 0.5 until <= 400 KB */
  function toJpeg(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
        var LIMIT = 400 * 1024;
        for (var pass = 0; pass < 6; pass++) {
          var w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
          var c = document.createElement('canvas'); c.width = w; c.height = h;
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
          for (var q = 0.8; q >= 0.5 - 1e-9; q -= 0.1) {
            var data = c.toDataURL('image/jpeg', Math.round(q * 10) / 10);
            var b64 = data.slice(data.indexOf(',') + 1);
            var bytes = Math.floor(b64.length * 3 / 4) - (b64.slice(-2) === '==' ? 2 : (b64.slice(-1) === '=' ? 1 : 0));
            if (bytes <= LIMIT) { resolve({ dataBase64: b64, dataUrl: data, width: w, height: h, bytes: bytes }); return; }
          }
          scale *= 0.8;
        }
        reject(new Error('too big'));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('not an image')); };
      img.src = url;
    });
  }
  function uploadSheet(o, done) {
    var count = live(D.files).length;
    if (count >= 80) { toast('You have 80 screenshots, the most WordIdol can keep. Delete one to make space.', 'err', 6000); return; }
    var tick = rulesData().screenshotTick || "I have cropped out other people's names, faces and usernames.";
    var html = '<form class="form" novalidate><div class="field" data-f="file"><label for="f_file">Choose a screenshot</label><input id="f_file" type="file" accept="image/*"><div class="err" role="alert"></div></div>' +
      '<div id="prev"></div><div class="field" data-f="caption"><label for="f_cap">Caption</label><input id="f_cap" type="text" maxlength="100" value="' + esc(o.caption || '') + '"><div class="err" role="alert"></div></div>' +
      '<div class="field" data-f="crop"><label class="tickline"><input type="checkbox" id="f_crop"><span>' + esc(tick) + '</span></label><div class="err" role="alert"></div></div>' +
      '<p class="muted small">' + count + ' of 80 screenshots used.</p><button class="btn primary block" type="button" data-act="up">Upload</button></form>';
    var img = null;
    var sh = openSheet('Add a screenshot', html, function (a, b, s) {
      if (a !== 'up') return;
      var errs = {};
      if (!img) errs.file = 'Please choose a picture first.';
      if (!qs('#f_crop', s.el).checked) errs.crop = 'Please tick this box.';
      if (!showErrs(s.el, errs)) return;
      if (root.navigator && root.navigator.onLine === false) { toast('Add the screenshot when you are back online.', 'err'); return; }
      b.disabled = true; b.textContent = 'Uploading…';
      api.call('file.upload', { dataBase64: img.dataBase64, width: img.width, height: img.height, attachType: o.attachType || 'none', attachId: o.attachId || '', caption: qs('#f_cap', s.el).value.trim(), cropConfirmed: true }).then(function (r) {
        if (!r.ok) {
          b.disabled = false; b.textContent = 'Upload';
          var m = r.error && r.error.code === 'LIMIT' ? (r.error.message || 'You cannot add more screenshots here.') : (r.error && r.error.code === 'NETWORK' ? 'Add the screenshot when you are back online.' : ((r.error && r.error.message) || 'The upload did not work. Try again.'));
          errs.file = m; showErrs(s.el, errs); return;
        }
        D = api.data();
        var f = r.data.file;
        root.WIApi.mergeResult(D, { action: 'file.upload', data: {} }, { file: f });
        api.setData(D); D = api.data();
        fileCache[f.id] = img.dataUrl;
        s.close(); toast('Screenshot added.');
        if (done) done(f);
      });
    });
    qs('#f_file', sh.el).addEventListener('change', function (ev) {
      var f = ev.target.files && ev.target.files[0];
      img = null; qs('#prev', sh.el).innerHTML = '<p class="muted">Getting it ready…</p>';
      if (!f) { qs('#prev', sh.el).innerHTML = ''; return; }
      toJpeg(f).then(function (j) {
        img = j;
        qs('#prev', sh.el).innerHTML = '<div class="fileview"><img alt="Preview of your screenshot" src="' + j.dataUrl + '" style="max-height:240px"></div><p class="muted small">' + j.width + ' × ' + j.height + ', ' + Math.round(j.bytes / 1024) + ' KB</p>';
      }, function () { qs('#prev', sh.el).innerHTML = '<p class="err">This file could not be opened as a picture. Try a screenshot in JPEG or PNG.</p>'; });
    });
  }
  var fileCache = {};
  function viewFile(id) {
    var f = fileById(id) || {};
    var sh = openSheet(f.caption || 'Screenshot', '<div class="fileview" id="fv"><p class="muted">Loading…</p></div>');
    function show(u) { var b = qs('#fv', sh.el); if (!/^data:image\/(jpeg|png);base64,/.test(String(u))) { if (b) b.textContent = 'The picture could not be loaded.'; return; } if (b) b.innerHTML = '<img alt="' + esc(f.caption || 'Screenshot') + '" src="' + esc(u) + '">'; }
    if (fileCache[id]) { show(fileCache[id]); return; }
    api.call('file.get', { id: id }).then(function (r) {
      if (r.ok && r.data && r.data.dataUrl) { fileCache[id] = r.data.dataUrl; show(r.data.dataUrl); }
      else { var b = qs('#fv', sh.el); if (b) b.innerHTML = '<p class="err">' + esc((r.error && r.error.message) || 'The picture could not be loaded.') + '</p>'; }
    });
  }
  function attachName(f) {
    if (!f.attachType || f.attachType === 'none') return 'Not attached';
    if (f.attachType === 'zb') return 'Zero-baseline record';
    var list = D[LIST_OF[f.attachType]] || [];
    var r = list.filter(function (x) { return x.id === f.attachId; })[0];
    var n = { action: 'Action', journal: 'Lab Book entry', sighting: 'Sighting', wave: 'Wave note' }[f.attachType] || f.attachType;
    return n + (r && r.date ? ' of ' + fmt(r.date) : '');
  }
  SCREENS.files = function () {
    var list = live(D.files).slice().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    var off = root.navigator && root.navigator.onLine === false;
    var h = '<div class="screen-head"><h1>My screenshots</h1></div><p><b>' + list.length + ' of 80</b> used. Pictures load only when you tap them.</p>' +
      '<button class="btn primary" data-act="add"' + (off ? ' disabled' : '') + '>' + ic('camera') + (off ? 'Add the screenshot when you are back online' : 'Add a screenshot') + '</button>';
    h += list.length ? '<ul class="list">' + list.map(function (f) {
      return '<li style="padding:.7rem 0"><button class="rowlink" data-act="view" data-id="' + esc(f.id) + '" style="padding:0">' + ic('image') + '<span class="grow"><span class="t">' + esc(f.caption || 'Screenshot') + '</span><span class="s">' + esc(fmt(f.createdAt)) + ', ' + esc(attachName(f)) + '</span></span></button>' +
        '<div class="chips" style="margin-top:.4rem"><label class="tickline" style="padding:.3rem .6rem"><input type="checkbox" data-tog="inSummit" data-id="' + esc(f.id) + '"' + (f.inSummit ? ' checked' : '') + '><span>Use in Summit Pack</span></label>' +
        '<label class="tickline" style="padding:.3rem .6rem"><input type="checkbox" data-tog="inArticle" data-id="' + esc(f.id) + '"' + (f.inArticle ? ' checked' : '') + '><span>Use in Article Pack</span></label>' +
        '<button class="btn small danger" data-act="del" data-id="' + esc(f.id) + '">' + ic('trash') + 'Delete</button></div></li>';
    }).join('') + '</ul>' : '<div class="empty"><strong>No screenshots yet.</strong>Add one from an action, a sighting or here.</div>';
    render(h);
    qsa('[data-tog]', view).forEach(function (c) { c.addEventListener('change', function () { var p = { id: c.getAttribute('data-id') }; p[c.getAttribute('data-tog')] = c.checked; save('file.update', p); }); });
    acts({
      add: function () { uploadSheet({ attachType: 'none', attachId: '' }, function () { rerender(); }); },
      view: function (b) { viewFile(b.getAttribute('data-id')); },
      del: function (b) { confirmSheet('Delete this screenshot?', 'It moves to the bin and frees one place.', 'Delete', 'Keep it').then(function (y) { if (y) { save('file.delete', { id: b.getAttribute('data-id') }); rerender(); } }); }
    });
  };

  /* ======================= S-REVIEW (Sunday review, SPEC §5.5) ======================= */
  SCREENS.review = function (parts, q) {
    cur.isForm = true;
    var due = reviewDue();
    var offered = try_(function () { return E().reviewOffered(D, now()); }, []);
    var wk = (q.week && offered.indexOf(q.week) >= 0) ? q.week : due[0];
    if (!wk) { render('<div class="empty"><strong>No weekly review is due.</strong>The next one opens on Sunday.</div><a class="btn" href="#/home">Go home</a>'); return; }
    var rest = due.filter(function (w) { return w !== wk; });
    var dk = draftKey('review', wk);
    var st = getDraft(dk) || { step: 1, decisions: {}, reasons: {}, wentWell: '', toChange: '', skip: [], own: [], moved: {} };
    // the review item ticks itself when she submits, so it is not something to carry or drop
    var rows = try_(function () { return E().weekRows(D, wk); }, []).filter(function (r) { return r.status !== 'carried' && r.status !== 'expired' && (itemOf(r) || {}).check !== 'week.review'; });
    var rng = try_(function () { return E().weekRange(wk); }, { label: wk });
    function persist() { putDraft(dk, st); }
    function stepsBar() { return '<div class="steps" aria-label="Step ' + st.step + ' of 3"><i class="on"></i><i class="' + (st.step >= 2 ? 'on' : '') + '"></i><i class="' + (st.step >= 3 ? 'on' : '') + '"></i></div>'; }
    function draw() {
      var h = '<div class="screen-head"><h1>Weekly review</h1></div><p class="lead">' + esc(rng.label || wk) + '</p>' + stepsBar();
      if (rest.length && st.step === 1) h += '<div class="note">You have ' + (rest.length + 1) + ' reviews to do. Do this one in full; the others take one tap.</div>';
      if (st.step === 1) {
        var done = rows.filter(function (r) { return r.status === 'done'; }), notDone = rows.filter(function (r) { return r.status === 'open'; }), closed = rows.filter(function (r) { return r.status === 'cannot' || r.status === 'dropped'; });
        h += '<h2>1. This week</h2>';
        h += '<h3>Done (' + done.length + ')</h3>' + (done.length ? '<ul class="list">' + done.map(function (r) { return '<li class="rowlink" style="min-height:44px">' + ic('tick') + '<span class="grow">' + esc(r.title) + '</span></li>'; }).join('') + '</ul>' : '<p class="muted">Nothing ticked yet. That is fine; be honest below.</p>');
        h += '<h3>Not done (' + notDone.length + ')</h3>';
        notDone.forEach(function (r) {
          var dec = st.decisions[r.itemId] || 'carry';
          var canDrop = r.kind === 'optional' || r.kind === 'own';
          var nm = 'dec_' + cssId(r.itemId);
          h += '<div class="panel flat" data-item="' + esc(r.itemId) + '"><b>' + esc(r.title) + '</b>' + (r.kind === 'required' ? ' <span class="chip pop">Must do</span>' : '') +
            '<div class="opts two" style="margin-top:.5rem">' +
            '<label class="opt"><input type="radio" name="' + nm + '" value="carry"' + (dec === 'carry' ? ' checked' : '') + '><span>Carry it</span></label>' +
            '<label class="opt"><input type="radio" name="' + nm + '" value="cannot"' + (dec === 'cannot' ? ' checked' : '') + '><span>Could not do</span></label>' +
            (canDrop ? '<label class="opt"><input type="radio" name="' + nm + '" value="dropped"' + (dec === 'dropped' ? ' checked' : '') + '><span>Drop it</span></label>' : '') + '</div>' +
            '<div class="field' + (dec === 'cannot' ? '' : ' hidden') + '" data-f="reason_' + esc(cssId(r.itemId)) + '"><label for="rs_' + esc(cssId(r.itemId)) + '">Why could you not do it?</label><input type="text" id="rs_' + esc(cssId(r.itemId)) + '" data-reason="' + esc(r.itemId) + '" value="' + esc(st.reasons[r.itemId] || '') + '" maxlength="200"><div class="err" role="alert"></div></div></div>';
        });
        if (closed.length) h += '<p class="muted small">' + closed.length + ' already marked "could not do" or dropped.</p>';
        h += '<div class="formfoot"><button class="btn primary" data-act="s2">Next</button></div>';
      } else if (st.step === 2) {
        var defs = revDefs();
        var lp = (G().labPrompts || []).filter(function (p) { return p.kind === 'reflection' && (!p.weekIds || p.weekIds.indexOf(wk) >= 0); }).slice(0, 2);
        h += '<h2>2. Look back</h2>' + (lp.length ? '<div class="panel gold flat"><p style="margin:.2rem 0"><b>Ideas to help you think:</b></p>' + lp.map(function (p) { return '<p style="margin:.2rem 0">' + esc(p.text) + '</p>'; }).join('') + '</div>' : '') +
          '<form id="rvf" class="form" novalidate>' + fieldsHTML(defs, st) + '</form><div class="formfoot"><button class="btn ghost" data-act="s1">Back</button><button class="btn primary" data-act="s3">Next</button></div>';
      } else {
        var preview = try_(function () { return E().previewWeek(D, wk, now(), { decisions: st.decisions, nextPrefs: prefs() }); }, []) || [];
        var nextW = try_(function () { return E().nextWeekId(wk); }, null);
        var nr = nextW ? try_(function () { return E().weekRange(nextW); }, { label: nextW }) : null;
        h += '<h2>3. Next week</h2>' + (nr ? '<p class="muted">' + esc(nr.label) + '</p>' : '');
        h += '<div>' + preview.filter(function (r) { return r.source !== 'own'; }).map(function (r) {
          var optional = r.kind === 'optional';
          return '<div class="ck"><span class="tick">' + (optional ? '<label class="skipbox"><input type="checkbox" data-skip="' + esc(r.itemId) + '"' + (st.skip.indexOf(r.itemId) >= 0 ? '' : ' checked') + ' aria-label="Keep ' + esc(r.title) + '"></label>' : ic('tick')) + '</span><div class="body"><div class="title">' + esc(r.title) + '</div><div class="meta">' + (r.source === 'carried' ? '<span class="chip warn">carried</span>' : '') + (r.kind === 'required' ? '<span class="chip pop">Must do</span>' : '') + (optional ? '<span class="chip">optional: untick to skip</span>' : '') + (r.dueDate ? '<span>Due ' + esc(fmt(r.dueDate)) + '</span>' : '') + '</div></div><span></span></div>';
        }).join('') + '</div>';
        var pas = live(D.planActions).filter(function (p) { return p.status === 'planned' && nextW && try_(function () { return E().weekIdOf(st.moved[p.id] || p.whenDate); }, '') === nextW; });
        var pasAll = live(D.planActions).filter(function (p) { return p.status === 'planned' && p.whenDate >= today(); });
        var bud = (opt('timeBudgets', (plan1() || {}).timeBudget) || {}).planPerWeek || 2;
        if (pas.length > bud) h += '<div class="note">You planned ' + pas.length + ' actions for next week. Your time budget suggests ' + bud + '. You can move some to another date.</div>';
        if (pasAll.length) {
          h += '<h3>Move a planned action</h3><p class="hint">Change the date if you cannot do an action on the day you planned.</p>' + pasAll.map(function (p) { return '<div class="field"><label for="mv_' + esc(cssId(p.id)) + '">' + esc(clip(p.what, 60)) + '</label><input type="date" id="mv_' + esc(cssId(p.id)) + '" data-move="' + esc(p.id) + '" min="2026-11-21" max="2027-01-15" value="' + esc(st.moved[p.id] || p.whenDate) + '"></div>'; }).join('');
        }
        h += '<h3>My own items (' + st.own.length + ' of 5)</h3>' + st.own.map(function (o, i) { return '<div class="rowlink" style="min-height:44px"><span class="grow">' + esc(o.title) + '</span><button class="linkbtn" data-act="delown" data-i="' + i + '">Remove</button></div>'; }).join('');
        if (st.own.length < 5) h += '<div class="field" data-f="owntitle"><label for="f_owntitle">Add my own item</label><input id="f_owntitle" type="text" maxlength="80"><div class="err" role="alert"></div></div><button class="btn small ghost" data-act="addown">Add</button>';
        h += '<div class="formfoot"><button class="btn ghost" data-act="s2b">Back</button><button class="btn primary" data-act="submit">Start my new week</button></div>';
      }
      render(h);
      bind();
    }
    function revDefs() { return [{ n: 'wentWell', t: 'textarea', form: 'review', l: 'What went well this week?', rows: 4 }, { n: 'toChange', t: 'textarea', form: 'review', l: 'What will you change next week?', rows: 4 }]; }
    function prefs() {
      return { skip: st.skip.slice(), own: st.own.map(function (o) { return { title: o.title, dueDate: o.dueDate || '' }; }), moved: Object.keys(st.moved).map(function (k) { return { planActionId: k, whenDate: st.moved[k] }; }) };
    }
    function bind() {
      qsa('input[type=radio][name^=dec_]', view).forEach(function (r) { r.addEventListener('change', function () { var it = r.closest('[data-item]').getAttribute('data-item'); st.decisions[it] = r.value; persist(); var f = qs('[data-f="reason_' + cssId(it) + '"]', view); if (f) f.classList.toggle('hidden', r.value !== 'cannot'); }); });
      qsa('[data-reason]', view).forEach(function (i) { i.addEventListener('input', function () { st.reasons[i.getAttribute('data-reason')] = i.value; persist(); }); });
      qsa('[data-skip]', view).forEach(function (c) { c.addEventListener('change', function () { var id = c.getAttribute('data-skip'); st.skip = st.skip.filter(function (x) { return x !== id; }); if (!c.checked) st.skip.push(id); persist(); }); });
      qsa('[data-move]', view).forEach(function (i) { i.addEventListener('change', function () { var pa = live(D.planActions).filter(function (p) { return p.id === i.getAttribute('data-move'); })[0]; if (i.value && pa && i.value !== pa.whenDate) st.moved[pa.id] = i.value; else delete st.moved[i.getAttribute('data-move')]; persist(); }); });
      var f = qs('#rvf', view);
      if (f) liveForm(f, revDefs(), { onChange: function (v) { st.wentWell = v.wentWell; st.toChange = v.toChange; persist(); } });
    }
    function check1() {
      var errs = {}, ok = true;
      rows.filter(function (r) { return r.status === 'open' && st.decisions[r.itemId] === 'cannot'; }).forEach(function (r) {
        var t = String(st.reasons[r.itemId] || '').trim();
        if (t.length < 10) { errs['reason_' + cssId(r.itemId)] = 'Write at least 10 characters.'; ok = false; }
      });
      showErrs(view, errs);
      return ok;
    }
    acts({
      s1: function () { st.step = 1; persist(); draw(); },
      s2: function () { if (!check1()) return; st.step = 2; persist(); draw(); },
      s2b: function () { st.step = 2; persist(); draw(); },
      s3: function () { var defs = revDefs(), v = { wentWell: st.wentWell, toChange: st.toChange }; var e = validate(defs, trimVals(v)); if (!showErrs(view, e)) return; st.step = 3; persist(); draw(); },
      addown: function () { var i = qs('#f_owntitle', view); var t = i.value.trim(); if (t.length < 5 || t.length > 80) { showErrs(view, { owntitle: t.length < 5 ? 'Write at least 5 characters.' : 'Use 80 characters or fewer.' }); return; } st.own.push({ title: t }); persist(); draw(); },
      delown: function (b) { st.own.splice(Number(b.getAttribute('data-i')), 1); persist(); draw(); },
      submit: function () {
        var decisions = {};
        rows.filter(function (r) { return r.status === 'open'; }).forEach(function (r) { decisions[r.itemId] = st.decisions[r.itemId] || 'carry'; });
        var reasons = {}; Object.keys(decisions).forEach(function (k) { if (decisions[k] === 'cannot') reasons[k] = String(st.reasons[k] || '').trim(); });
        // "could not do" reasons go to the rows first, then the review (SPEC §5.5)
        rows.filter(function (r) { return decisions[r.itemId] === 'cannot'; }).forEach(function (r) { save('checklist.setStatus', { rowId: r.id, status: 'cannot', reason: reasons[r.itemId] }); });
        save('review.submit', { weekId: wk, wentWell: st.wentWell.trim(), toChange: st.toChange.trim(), decisions: decisions, reasons: reasons, nextPrefs: prefs() });
        dropDraft(dk);
        // older reviews collapse to one tap
        var left = reviewDue();
        if (left.length) { quickReviews(left); return; }
        toast('Review saved. Your new week is ready.');
        go('#/week');
      }
    });
    draw();
  };
  function quickReviews(list) {
    var h = '<div class="screen-head"><h1>Weekly review</h1></div><p class="lead">These weeks are still open. One tap each: unfinished items are carried.</p>' +
      list.map(function (w) { var r = try_(function () { return E().weekRange(w); }, { label: w }); return '<div class="panel flat"><b>' + esc(r.label) + '</b><div class="btnrow"><button class="btn" data-act="quick" data-w="' + esc(w) + '">Nothing to add for that week</button><a class="btn ghost" href="#/review?week=' + esc(w) + '">Do it in full</a></div></div>'; }).join('');
    render(h);
    acts({
      quick: function (b) {
        var w = b.getAttribute('data-w');
        var decisions = {};
        try_(function () { return E().weekRows(D, w); }, []).filter(function (r) { return r.status === 'open'; }).forEach(function (r) { decisions[r.itemId] = 'carry'; });
        save('review.submit', { weekId: w, wentWell: 'Nothing to add for that week.', toChange: 'Nothing to add for that week.', decisions: decisions, nextPrefs: { skip: [], own: [], moved: [] } });
        var left = reviewDue();
        if (left.length) quickReviews(left); else { toast('Reviews saved.'); go('#/week'); }
      }
    });
  }

  /* ======================= S-PROBLEM ======================= */
  SCREENS.problem = function () {
    if (!D) { render(loadingHTML()); return; }
    cur.isForm = true;
    var defs = [
      { n: 'category', t: 'select', form: 'flag', l: 'What happened?', R: true, opts: CH('problemCategories') },
      { n: 'note', t: 'textarea', form: 'flag', l: 'Anything else T.Chris should know?', h: 'No names.', max: 300, rows: 3 },
      { n: 'stoppedConfirmed', t: 'tick', form: 'flag', l: 'I have stopped this activity', R: true }
    ];
    render('<div class="screen-head"><h1>I had a problem</h1></div><div class="note bad"><b>Rule 4.</b> ' + esc(RULES()[3] || '') + '</div><p>' + esc(rulesData().problemIntro || '') + '</p>' +
      '<form id="wf" class="form" novalidate>' + fieldsHTML(defs, {}) + '<button class="btn primary block" type="button" data-act="send">Put a flag on T.Chris’s screen</button></form>');
    var el = qs('#wf');
    acts({
      send: function () {
        var v = trimVals(readVals(el, defs)), e = validate(defs, v);
        if (!showErrs(el, e)) return;
        save('flag.raise', { id: api.newId('fg'), category: v.category, note: v.note || '', stoppedConfirmed: true });
        render('<div class="screen-head"><h1>Flag sent</h1></div><div class="note ok">T.Chris will see a flag at the top of his screen.</div><p><b>Please also tell T.Chris or your homeroom teacher today, in person or by Line.</b> This form does not send a message.</p><p>It is not your fault. Analysing what went wrong is still research.</p><a class="btn" href="#/home">Go home</a>');
      }
    });
  };

  /* ======================= Guide, Stuck ======================= */
  SCREENS.guide = function (parts) {
    var gs = G().stages || [];
    var cs = stageId();
    if (!parts[0]) {
      render('<div class="screen-head"><h1>Guide</h1></div><p class="lead">What to do at each stage, idea banks, prompts and sentence frames.</p><div class="cardlist">' +
        gs.map(function (s, i) { return '<a class="hubcard' + (s.stageId === cs ? ' ok' : '') + '" href="#/guide/' + esc(s.stageId) + '"><span class="stat">' + (i + 1) + '</span><span class="grow"><span class="t">' + esc(s.name) + (s.stageId === cs ? ' (now)' : '') + '</span><span class="s">' + esc(s.tagline) + '</span></span>' + ic('right', 'chev') + '</a>'; }).join('') +
        '</div><div class="btnrow"><button class="btn" data-act="ideas">' + ic('bulb') + 'Give me ideas</button><button class="btn ghost" data-act="stuck">' + ic('help') + 'Stuck?</button><button class="btn ghost" data-act="levels">Evidence Levels</button></div>' + framesSection() + theorySection());
      acts({ ideas: function () { ideasSheet(null); }, stuck: function () { stuckSheet(); }, levels: function () { levelsSheet(); } });
      return;
    }
    var s = gs.filter(function (x) { return x.stageId === parts[0]; })[0];
    if (!s) { go('#/guide'); return; }
    var bs = (G().brainstorm || []).filter(function (b) { return b.stageId === s.stageId; });
    var h = backLink('#/guide', 'Guide') + '<div class="screen-head"><h1>' + esc(s.name) + '</h1></div><p class="lead">' + esc(s.tagline) + '</p>' +
      '<section class="section"><h2>What to do now</h2><ol>' + (s.now || []).map(function (t) { return '<li style="margin:.4rem 0">' + esc(t) + '</li>'; }).join('') + '</ol>' + (s.doneWhen ? '<p class="note ok"><b>Done when:</b> ' + esc(s.doneWhen) + '</p>' : '') + '</section>';
    if (bs.length) h += '<section class="section"><h2>Questions to think about</h2><ul class="list">' + bs.map(function (b) { return '<li style="padding:.5rem 0">' + esc(b.prompt) + '</li>'; }).join('') + '</ul></section>';
    if (s.stageId === 's4' || s.stageId === 's7') {
      var sinks = G().sinks || [];
      if (sinks.length) h += '<section class="section"><h2>What can sink a word</h2><ul>' + sinks.map(function (k) { return '<li>' + esc(k.text) + '</li>'; }).join('') + '</ul></section>';
    }
    h += '<div class="btnrow"><button class="btn" data-act="ideas">' + ic('bulb') + 'Give me ideas</button><button class="btn ghost" data-act="stuck">' + ic('help') + 'Stuck?</button></div>';
    render(h);
    acts({ ideas: function () { ideasSheet(null); }, stuck: function () { stuckSheet(s.stageId); } });
  };
  var FRAME_GROUPS = { hypothesis: 'Hypotheses', describe_data: 'Describing data', compare: 'Comparing', hedge: 'Hedging (being careful)', reflect: 'Reflecting', failure: 'When something failed', plan_change: 'Changing the plan', qa_answer: 'Answering questions', limitation: 'Limitations', ethics: 'Ethics' };
  function framesSection() {
    var fr = root.FRAMES || [];
    if (!fr.length) return '';
    return '<section class="section"><h2>Sentence frames</h2>' + Object.keys(FRAME_GROUPS).map(function (g) {
      var list = fr.filter(function (f) { return f.group === g; });
      if (!list.length) return '';
      return '<details class="panel flat"><summary><b>' + esc(FRAME_GROUPS[g]) + '</b> <span class="muted small">(' + list.length + ')</span></summary><ul>' + list.map(function (f) { return '<li style="margin:.3rem 0">' + esc(f.text) + (f.level ? ' <span class="chip">' + esc(f.level) + '</span>' : '') + '</li>'; }).join('') + '</ul></details>';
    }).join('') + '</section>';
  }
  function theorySection() {
    var t = G().theory || [];
    if (!t.length) return '';
    return '<section class="section"><h2>Theory ideas</h2><dl class="kv" style="grid-template-columns:1fr">' + t.map(function (x) { return '<dt><b>' + esc(x.name) + '</b></dt><dd style="margin-bottom:.6rem">' + esc(x.oneLine) + '</dd>'; }).join('') + '</dl></section>';
  }
  function stuckSheet(stage) {
    stage = stage || stageId();
    var key = 'wi.stuckSeen.' + stage;
    var pool = (G().stuck || []).filter(function (s) { return s.stageId === stage; });
    if (!pool.length) pool = G().stuck || [];
    function pick() {
      var seen = LS.get(key) || [];
      var left = pool.filter(function (p) { return seen.indexOf(p.id) < 0; });
      if (left.length < 3) { seen = []; left = pool.slice(); }
      var out = [];
      while (out.length < 3 && left.length) { var i = Math.floor(Math.random() * left.length); out.push(left.splice(i, 1)[0]); }
      LS.set(key, seen.concat(out.map(function (p) { return p.id; })));
      return out;
    }
    function body(list) {
      return list.map(function (p) { return '<div class="panel flat"><p style="margin-top:0">' + esc(p.text) + '</p><a class="btn small ghost" data-close href="#/log/journal/new?stuck=' + esc(p.id) + '">Write about this</a></div>'; }).join('') +
        '<button class="btn block" data-act="more">Three more</button>';
    }
    var sh = openSheet('Stuck?', body(pick()), function (a, el, s) { if (a === 'more') s.el.innerHTML = body(pick()); });
    void sh;
  }

  /* ======================= Board, badges, more ======================= */
  SCREENS.board = function () {
    render('<div class="screen-head"><h1>Class board</h1></div><p class="muted">' + esc(rulesData().boardCaption || '') + '</p><div id="bd"><p class="muted">Loading…</p></div>');
    api.call('board.get', {}).then(function (r) {
      var box = qs('#bd'); if (!box) return;
      if (!r.ok) { box.innerHTML = '<div class="note">' + esc(r.error && r.error.code === 'NETWORK' ? 'The board needs the internet. Try again when you are online.' : ((r.error && r.error.message) || 'The board is switched off at the moment.')) + '</div>'; return; }
      var rows = (r.data && r.data.rows) || [];
      if (r.data && r.data.enabled === false) { box.innerHTML = '<div class="note">T.Chris has switched the board off.</div>'; return; }
      var me = D.student && D.student.label;
      box.innerHTML = rows.length ? '<div class="tablewrap"><table class="t"><thead><tr><th>Rank</th><th>Name</th><th class="num">XP</th><th class="num">Review streak</th></tr></thead><tbody>' +
        rows.map(function (x) { return '<tr class="' + (x.label === me ? 'me' : '') + '"><td>' + esc(x.rank) + '</td><td>' + esc(x.label) + (x.label === me ? ' (you)' : '') + '</td><td class="num">' + esc(x.xp) + '</td><td class="num">' + esc(x.streak) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty"><strong>Nobody is on the board yet.</strong></div>';
    });
  };
  function medal(got) {
    return '<svg class="medal" viewBox="0 0 54 54" aria-hidden="true"><path d="M17 3h8l4 12h-8zM37 3h-8l-4 12h8z" fill="' + (got ? '#e5337a' : '#b9aec6') + '"/><circle cx="27" cy="33" r="17" fill="' + (got ? '#f2b632' : '#d9d1e0') + '" stroke="' + (got ? '#8a5a00' : '#a497b2') + '" stroke-width="2"/><path d="m27 22 3.3 6.8 7.5 1-5.4 5.2 1.3 7.4L27 38.9l-6.7 3.5 1.3-7.4-5.4-5.2 7.5-1z" fill="' + (got ? '#fff7fb' : '#efe9f3') + '"/></svg>';
  }
  SCREENS.badges = function () {
    var got = (D.state && D.state.badges) || {};
    var bs = (root.WI_GAME && root.WI_GAME.badges) || [];
    var n = bs.filter(function (b) { return got[b.id]; }).length;
    render('<div class="screen-head"><h1>My badges</h1></div><p><b>' + n + ' of ' + bs.length + '</b>. Badges come from documenting your project honestly.</p><div class="badges">' +
      bs.map(function (b) { return '<div class="badge' + (got[b.id] ? ' got' : '') + '">' + medal(!!got[b.id]) + '<span class="n">' + esc(b.name) + '</span><span class="h">' + esc(got[b.id] ? 'Won ' + fmt(got[b.id]) : (b.hint || '')) + '</span></div>'; }).join('') + '</div>');
  };
  function themeName() { var t = LS.get(root.WIApi.KEYS.theme); return t === 'light' || t === 'dark' ? t : 'auto'; }
  function applyTheme() { var t = themeName(); if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }
  SCREENS.more = function () {
    var items = [
      ['#/audition', 'Audition', 'Word card, zero baseline, FUDGE, hypotheses', 'mic'],
      ['#/debut', 'Debut plan', 'Choices, six rules, plan table', 'plan'],
      ['#/charts', 'Charts', 'Your wave results', 'chart'],
      ['#/summit', 'Summit Pack', released('summit') ? 'Your 7-minute talk' : 'Opens on ' + fmt(OPENS.summit[0]), 'star'],
      ['#/encore', 'Encore', released('encore') ? 'Pivot, Article Pack, peer review' : 'Opens on ' + fmt(OPENS.encore[0]), 'star'],
      ['#/report/baseline', 'Reports', 'Baseline report helper', 'book'],
      ['#/audits', 'My audit task', released('audits') ? 'Check a classmate’s sightings' : 'Opens on ' + fmt(OPENS.audits[0]), 'eye'],
      ['#/guide', 'Guide', 'What to do now, ideas, sentence frames', 'help'],
      ['#/files', 'Screenshots', live(D.files).length + ' of 80', 'camera'],
      ['#/board', 'Class board', 'Rank, XP and review streak', 'trophy'],
      ['#/badges', 'Badges', 'What you have won', 'star'],
      ['#/rules', 'The six rules', '', 'rules'],
      ['#/problem', 'I had a problem', 'Puts a flag on T.Chris’s screen', 'flag']
    ];
    var h = '<div class="screen-head"><h1>More</h1></div><p class="muted">Signed in as <b>' + esc((D.student && D.student.label) || '') + '</b></p><ul class="list">' +
      items.map(function (i) { return '<li><a class="rowlink" href="' + i[0] + '">' + ic(i[3]) + '<span class="grow"><span class="t">' + esc(i[1]) + '</span>' + (i[2] ? '<span class="s">' + esc(i[2]) + '</span>' : '') + '</span>' + ic('right', 'chev') + '</a></li>'; }).join('') + '</ul>' +
      '<section class="section"><h2>Look</h2><div class="seg" role="radiogroup" aria-label="Colour theme">' + ['auto', 'light', 'dark'].map(function (t) { return '<button role="radio" data-act="theme" data-t="' + t + '" aria-selected="' + (themeName() === t) + '" aria-checked="' + (themeName() === t) + '">' + { auto: 'Like my phone', light: 'Light', dark: 'Dark' }[t] + '</button>'; }).join('') + '</div></section>' +
      '<div class="btnrow"><button class="btn danger" data-act="signout">' + ic('exit') + 'Sign out</button></div><p class="muted small">WordIdol ' + esc((root.WI_CONFIG && root.WI_CONFIG.version) || '') + '</p>';
    render(h);
    acts({
      theme: function (b) { LS.set(root.WIApi.KEYS.theme, b.getAttribute('data-t')); applyTheme(); rerender(); },
      signout: function () { signOut(); }
    });
  };
  function signOut() {
    api.flush().then(function () {
      var q = api.queue().length;
      var p = q ? confirmSheet('Sign out?', q + (q === 1 ? ' entry is' : ' entries are') + ' still waiting to send. If you sign out now, ' + (q === 1 ? 'it' : 'they') + ' will be lost.', 'Sign out anyway', 'Stay signed in') : Promise.resolve(true);
      p.then(function (y) { if (!y) return; api.logout().then(function () { D = null; lastXp = null; lastRank = null; go('#/login'); }); });
    });
  }

  /* ======================= Packs (W5) and later releases ======================= */
  function packCtx() {
    return {
      D: D, release: release(), now: now(), nowFn: now, toast: function (m, k) { toast(esc(m), k); }, go: go,
      save: function (action, data) { return save(action, data).then(function (r) { D = api.data(); return r; }); },
      upload: function (o, cb) { uploadSheet(o, cb); }, viewFile: viewFile, api: api
    };
  }
  function packOr(fnName, args, fallback) {
    var P = root.WIPack;
    if (P && typeof P[fnName] === 'function') {
      render('<div id="pack"></div>');
      try { P[fnName].apply(P, [qs('#pack'), packCtx()].concat(args)); } catch (e) { if (root.console) console.error(e); render('<div class="note bad">This part could not open. Tell T.Chris.</div>'); }
      return;
    }
    render(fallback);
  }
  SCREENS.report = function (parts) {
    var type = parts[0] || 'baseline';
    cur.isForm = true;
    if (type === 'intermediate' && !released('intermediate')) { render(opensCard('intermediate')); return; }
    if (type === 'final' && !released('final')) { render(opensCard('final')); return; }
    if (['baseline', 'intermediate', 'final'].indexOf(type) < 0) { go('#/report/baseline'); return; }
    packOr('renderReport', [type], '<div class="note">The report helper is loading. Try again in a moment.</div>');
  };
  SCREENS.charts = function () {
    cur.isForm = true;
    packOr('renderCharts', [], '<div class="screen-head"><h1>Charts</h1></div><div class="note">Your wave card is loading. Try again in a moment.</div>');
  };
  SCREENS.summit = function (parts) {
    if (!released('summit')) { render(opensCard('summit')); return; }
    cur.isForm = true;
    packOr('renderSummit', [parts[0] || 'outline'], '<div class="note">The Summit Pack is loading.</div>');
  };
  SCREENS.encore = function (parts) {
    if (!released('encore')) { render(opensCard('encore')); return; }
    cur.isForm = true;
    if (parts[0] === 'article') { packOr('renderArticle', [parts[1] || 'outline'], '<div class="note">The Article Pack is loading.</div>'); return; }
    render(opensCard('encore'));
  };
  SCREENS.audits = function () {
    if (!released('audits')) { render(opensCard('audits')); return; }
    render('<div class="screen-head"><h1>My audit task</h1></div><div class="note">The audit screen comes in the next update.</div>');
  };

  /* ======================= boot ======================= */
  function shell() {
    document.body.innerHTML =
      '<a class="sr" href="#view">Skip to content</a>' +
      '<header class="topbar"><a class="brand" href="#/home" aria-label="WordIdol home"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 14.6 8l6 .8-4.4 4.2 1.1 6L12 16.1 6.7 19l1.1-6L3.4 8.8l6-.8z" fill="#f2b632" stroke="#8a5a00" stroke-width="1.2" stroke-linejoin="round"/></svg>Word<b>Idol</b></a><span class="spacer"></span><span id="syncpill" class="syncpill" hidden aria-live="polite"></span></header>' +
      '<main id="view" tabindex="-1"></main>' +
      '<nav class="bottomnav" aria-label="Main">' + navHTML() + '</nav>' +
      '<button id="fab" class="fab" aria-label="Add to my log" hidden>' + ic('plus') + '</button>' +
      '<div id="toasts" aria-live="polite"></div>';
    view = document.getElementById('view');
    document.getElementById('fab').addEventListener('click', quickAdd);
  }
  function boot() {
    applyTheme();
    if (!view) shell();
    if (!api.session()) { D = null; route(); return; }
    D = api.loadCache();
    if (D) { lastXp = Number((D.state || {}).xp) || 0; lastRank = try_(function () { return E().rankOf(lastXp); }, null); route(); }
    else view.innerHTML = loadingHTML();
    api.flush().then(function () {
      return api.bootstrap();
    }).then(function (r) {
      if (r && r.ok) {
        var first = !D;
        D = api.data();
        noteState(D.state);
        afterFresh(first);
      } else if (!D) {
        var code = r && r.error && r.error.code;
        if (code === 'AUTH_REQUIRED') { api.dropSession(); go('#/login'); return; }
        view.innerHTML = '<div class="note bad">' + esc(WIApi.NET_MSG) + '</div><button class="btn" id="retry">Try again</button>';
        document.getElementById('retry').addEventListener('click', boot);
      }
    });
  }
  /* fresh server data: apply the guard (a review may now be due), re-draw unless she is typing */
  function afterFresh(first) {
    var g = guard(cur.path);
    if (g) { closeSheets(); location.replace('#/' + g); return; }
    if (first || !cur.isForm) route(true);
  }
  root.addEventListener('hashchange', function () { route(); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || !api.session()) return;
    api.flush().then(function () { return api.bootstrap(); }).then(function (r) { if (r && r.ok) { D = api.data(); afterFresh(false); } });
  });
  /* test and debug hook (no data beyond what this device already holds) */
  root.WIApp = { go: go, data: function () { return D; }, rerender: rerender, toJpeg: toJpeg };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
