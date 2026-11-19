/* WordIdol client transport: POST/GET to the Apps Script web app, session,
   server clock offset, optimistic cache and offline queue (SPEC §8.1, §8.4).
   Owner: W2. No content and no business rules live here. */
(function () {
  'use strict';
  var root = window;

  var KEYS = {
    session: 'wi.session', tsession: 'wi.tsession', cache: 'wi.cache',
    queue: 'wi.queue', offset: 'wi.serverOffset', is16: 'wi.is16', theme: 'wi.theme'
  };
  var NET_MSG = 'Cannot reach WordIdol. Check your internet and try again.';
  var KEEP_CODES = { NETWORK: 1, BUSY: 1, RATE: 1, SERVER: 1 };

  /* ---------- storage ---------- */
  var LS = {
    get: function (k) { try { var v = localStorage.getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
    keys: function (prefix) {
      var out = [];
      try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(prefix) === 0) out.push(k); } } catch (e) { /* ignore */ }
      return out;
    }
  };

  /* ---------- ids ---------- */
  function rand36(n) {
    var s = '', a = new Uint8Array(n);
    (root.crypto || root.msCrypto).getRandomValues(a);
    for (var i = 0; i < n; i++) s += (a[i] % 36).toString(36);
    return s;
  }
  function newId(prefix) { return prefix + '_' + rand36(12); }

  /* ---------- clock ---------- */
  var offset = Number(LS.get(KEYS.offset)) || 0;
  function noteNow(iso) {
    var t = Date.parse(iso || '');
    if (!isNaN(t)) { offset = t - Date.now(); LS.set(KEYS.offset, offset); }
  }
  function nowMs() { return Date.now() + offset; }
  /* ISO with +07:00 (Bangkok), matching the Sheet format */
  function nowIso() { return bkkIso(nowMs()); }
  function bkkIso(ms) {
    var d = new Date(ms + 7 * 3600000);
    function p(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }
    return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + 'T' +
      p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds()) + '+07:00';
  }

  /* ---------- transport ---------- */
  function apiUrl() { return (root.WI_CONFIG && root.WI_CONFIG.apiUrl) || ''; }
  function netError(msg) { return { ok: false, error: { code: 'NETWORK', message: msg || NET_MSG } }; }

  function handle(res) {
    if (!res || typeof res !== 'object') return { ok: false, error: { code: 'SERVER', message: 'Something went wrong. Try again.' } };
    if (res.now) noteNow(res.now);
    if (!res.ok && !res.error) res.error = { code: 'SERVER', message: 'Something went wrong. Try again.' };
    return res;
  }

  function withTimeout(p, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error('timeout')); }, ms);
      p.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }

  function rawPost(body) {
    var url = apiUrl();
    if (!url) return Promise.resolve(netError());
    if (root.navigator && root.navigator.onLine === false) return Promise.resolve(netError());
    return withTimeout(fetch(url, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }), 45000).then(function (r) { return r.json(); }).then(handle, function () { return netError(); });
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* POST with the BUSY back-off of §8.1 (2, 4, 8 s) */
  function post(action, data, token) {
    var body = { action: action, data: data || {} };
    if (token) body.token = token;
    var waits = [2000, 4000, 8000];
    function attempt(i) {
      return rawPost(body).then(function (res) {
        if (!res.ok && res.error && res.error.code === 'BUSY' && i < waits.length) {
          return sleep(waits[i]).then(function () { return attempt(i + 1); });
        }
        return res;
      });
    }
    return attempt(0);
  }

  function get(action) {
    var url = apiUrl();
    if (!url) return Promise.resolve(netError());
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    return withTimeout(fetch(url + sep + 'action=' + encodeURIComponent(action), { method: 'GET', redirect: 'follow' }), 30000)
      .then(function (r) { return r.json(); }).then(handle, function () { return netError(); });
  }

  /* ---------- tiny event hub ---------- */
  function hub() {
    var map = {};
    return {
      on: function (ev, fn) { (map[ev] = map[ev] || []).push(fn); },
      emit: function (ev, arg) { (map[ev] || []).forEach(function (fn) { try { fn(arg); } catch (e) { if (root.console) console.error(e); } }); }
    };
  }

  /* ---------- optimistic cache: apply an op to the bundle D ---------- */
  var REC_LIST = { action: 'actions', journal: 'journal', sighting: 'sightings', tally: 'tallies', planAction: 'planActions', waveNote: 'waveNotes' };

  function upsert(list, row, key) {
    key = key || 'id';
    if (!row) return row;
    for (var i = 0; i < list.length; i++) {
      if (list[i][key] === row[key]) { list[i] = Object.assign({}, list[i], row); return list[i]; }
    }
    list.push(row);
    return row;
  }
  function findBy(list, key, val) {
    for (var i = 0; i < (list || []).length; i++) if (list[i][key] === val) return list[i];
    return null;
  }
  function ensureLists(D) {
    ['wordHistory', 'plans', 'planActions', 'checklist', 'reviews', 'actions', 'journal', 'sightings', 'tallies',
      'files', 'waves', 'waveNotes', 'requests', 'flags', 'feedback', 'reports', 'xpLog'].forEach(function (k) {
      if (!Array.isArray(D[k])) D[k] = [];
    });
    if (!D.state) D.state = {};
    if (!D.word) D.word = {};
    if (!D.config) D.config = {};
    if (!D.audits) D.audits = { mine: [], onMe: [] };
    return D;
  }
  function countWords(t) { t = String(t || '').trim(); return t ? t.split(/\s+/).length : 0; }

  function applyOp(D, op) {
    if (!D) return;
    ensureLists(D);
    var a = op.action, d = op.data || {}, sid = (D.student && D.student.id) || '', now = op.at || nowIso();
    if (a === 'word.save') {
      D.word = Object.assign({ studentId: sid }, D.word, d.fields || {}, { updatedAt: now });
    } else if (a === 'word.zb') {
      D.word.zb = d.zb; D.word.updatedAt = now;
    } else if (a === 'word.submit') {
      D.word.regStatus = 'submitted'; D.word.regSubmittedAt = now;
    } else if (a === 'plan.save') {
      var pid = sid + '-p' + (d.phase || 1);
      upsert(D.plans, Object.assign({ id: pid, studentId: sid, phase: d.phase || 1, createdAt: now }, d.fields || {}, { id: pid, updatedAt: now }));
    } else if (a === 'rules.tick') {
      var prev = D.state.rulesTicked || [];
      D.state.rulesTicked = (d.ticks || []).map(function (t, i) { return t ? (prev[i] || now) : ''; });
    } else if (a === 'rec.save') {
      var listName = REC_LIST[d.type];
      if (listName && d.record) {
        var rec = Object.assign({}, d.record);
        if (!rec.studentId) rec.studentId = sid;
        if (!rec.createdAt) rec.createdAt = now;
        rec.updatedAt = now;
        if (d.type === 'journal') rec.wordCount = countWords(rec.text);
        if (d.type === 'waveNote' && !rec.id) rec.id = sid + '|' + rec.waveId;
        if (root.WI && root.WI.weekIdOf && rec.date && d.type !== 'waveNote') { try { rec.weekId = root.WI.weekIdOf(rec.date); } catch (e) { /* ignore */ } }
        if (d.type === 'planAction' && root.WI && root.WI.weekIdOf && rec.whenDate) { try { rec.weekId = root.WI.weekIdOf(rec.whenDate); } catch (e) { /* ignore */ } }
        if (d.type === 'sighting') rec.owned = rec.relation === 'me' || rec.relation === 'Me' || rec.prompted === 'asked';
        upsert(D[listName], rec);
        if (d.type === 'action' && rec.planActionId) {
          var pa = findBy(D.planActions, 'id', rec.planActionId);
          if (pa) { pa.actionId = rec.id; pa.status = rec.outcome === 'as_planned' ? 'done' : (rec.outcome === 'changed' ? 'changed' : 'skipped'); }
        }
      }
    } else if (a === 'rec.delete') {
      var ln = REC_LIST[d.type], r = ln && findBy(D[ln], 'id', d.id);
      if (r) { r.deleted = true; r.updatedAt = now; }
    } else if (a === 'checklist.tick') {
      var row = findBy(D.checklist, 'id', d.rowId);
      if (row) {
        row.status = d.done ? 'done' : 'open';
        row.doneAt = d.done ? now : '';
        row.doneBy = d.done ? (d.auto ? 'auto' : 'manual') : '';
        row.updatedAt = now;
      }
    } else if (a === 'checklist.addOwn') {
      var itemId = d.itemId || ('O-' + rand36(8));
      upsert(D.checklist, {
        id: sid + '|' + d.weekId + '|' + itemId, studentId: sid, weekId: d.weekId, itemId: itemId,
        title: d.title, kind: 'own', source: 'own', status: 'open', originWeek: d.weekId, carryCount: 0,
        dueDate: d.dueDate || '', doneAt: '', doneBy: '', reason: '', refId: '', createdAt: now, updatedAt: now
      });
    } else if (a === 'checklist.setStatus') {
      var r2 = findBy(D.checklist, 'id', d.rowId);
      if (r2) { r2.status = d.status; r2.reason = d.reason || ''; r2.updatedAt = now; }
    } else if (a === 'review.submit') {
      var counts = { done: 0, open: 0, carried: 0, cannot: 0 };
      D.checklist.forEach(function (rw) {
        if (rw.weekId !== d.weekId) return;
        var dec = d.decisions && d.decisions[rw.itemId];
        if (rw.status === 'open' && dec === 'cannot') { rw.status = 'cannot'; rw.reason = (d.reasons && d.reasons[rw.itemId]) || rw.reason || ''; }
        else if (rw.status === 'open' && dec === 'dropped') rw.status = 'dropped';
        if (rw.status === 'done') counts.done++; else if (rw.status === 'open') counts.open++; else if (rw.status === 'cannot') counts.cannot++;
      });
      upsert(D.reviews, {
        id: sid + '|' + d.weekId, studentId: sid, weekId: d.weekId, submittedAt: now, onTime: '',
        wentWell: d.wentWell, toChange: d.toChange, decisions: d.decisions, nextPrefs: d.nextPrefs, counts: counts
      });
      (d.nextPrefs && d.nextPrefs.moved || []).forEach(function (m) {
        var p = findBy(D.planActions, 'id', m.planActionId);
        if (p) { p.whenDate = m.whenDate; if (root.WI && root.WI.weekIdOf) { try { p.weekId = root.WI.weekIdOf(m.whenDate); } catch (e) { /* ignore */ } } }
      });
      if (Array.isArray(D.state.reviewsDue)) D.state.reviewsDue = D.state.reviewsDue.filter(function (w) { return w !== d.weekId; });
    } else if (a === 'request.create') {
      upsert(D.requests, { id: d.id || newId('rq'), studentId: sid, createdAt: now, type: d.type, ideaId: d.ideaId || '', text: d.text, status: 'pending', decidedAt: '', teacherComment: '' });
    } else if (a === 'flag.raise') {
      upsert(D.flags, { id: d.id || newId('fg'), studentId: sid, createdAt: now, category: d.category, note: d.note || '', stoppedConfirmed: !!d.stoppedConfirmed, status: 'open', handledAt: '', teacherNote: '' });
    } else if (a === 'feedback.read') {
      var fb = findBy(D.feedback, 'id', d.id);
      if (fb) fb.readAt = now;
    } else if (a === 'report.save') {
      upsert(D.reports, { id: sid + '|' + d.type, studentId: sid, type: d.type, sections: d.sections, status: d.status || 'draft', updatedAt: now });
    } else if (a === 'summit.save') {
      D.summit = Object.assign({ studentId: sid }, D.summit || {}, d.patch || {}, { updatedAt: now });
    } else if (a === 'article.save') {
      D.article = Object.assign({ studentId: sid }, D.article || {}, d.patch || {}, { updatedAt: now });
    } else if (a === 'file.update') {
      var f = findBy(D.files, 'id', d.id);
      if (f) { ['caption', 'inSummit', 'inArticle', 'attachType', 'attachId'].forEach(function (k) { if (d[k] !== undefined) f[k] = d[k]; }); }
    } else if (a === 'file.delete') {
      var f2 = findBy(D.files, 'id', d.id);
      if (f2) f2.deleted = true;
    } else if (a === 'audit.submit') {
      var au = findBy(D.audits.mine || [], 'id', d.auditId);
      if (au) { au.status = 'done'; au.verdicts = d.verdicts; au.doneAt = now; }
    }
  }

  /* merge a server result for an op into D */
  function mergeResult(D, op, data) {
    if (!D || !data) return;
    ensureLists(D);
    var d = op.data || {};
    if (data.word) D.word = data.word;
    if (data.plan) upsert(D.plans, data.plan);
    if (data.record && REC_LIST[d.type]) upsert(D[REC_LIST[d.type]], data.record);
    if (data.row) {
      if (op.action === 'checklist.addOwn') {
        // replace the optimistic row (temporary id) with the server row
        D.checklist = D.checklist.filter(function (r) { return !(r.source === 'own' && r.weekId === data.row.weekId && r.title === data.row.title && r.id !== data.row.id); });
      }
      upsert(D.checklist, data.row);
    }
    if (Array.isArray(data.checklist)) data.checklist.forEach(function (r) { upsert(D.checklist, r); });
    if (data.review) upsert(D.reviews, data.review);
    if (data.request) {
      D.requests = D.requests.filter(function (r) { return !(r.id !== data.request.id && r.id === d.id); });
      upsert(D.requests, data.request);
    }
    if (data.flag) upsert(D.flags, data.flag);
    if (data.feedback) upsert(D.feedback, data.feedback);
    if (data.report) upsert(D.reports, data.report);
    if (data.summit) D.summit = data.summit;
    if (data.article) D.article = data.article;
    if (data.file) upsert(D.files, data.file);
    if (data.audit) upsert(D.audits.mine, data.audit);
    if (data.state) D.state = data.state;
  }

  /* ---------- student client ---------- */
  function Student() {
    var ev = hub();
    var self = this;
    var flushing = null;
    var waiters = {};
    var D = null;

    this.on = ev.on;
    this.newId = newId;
    this.nowIso = nowIso;
    this.nowMs = nowMs;
    this.offset = function () { return offset; };

    this.session = function () {
      var s = LS.get(KEYS.session);
      if (!s || !s.token) return null;
      if (s.expiresAt && Date.parse(s.expiresAt) < Date.now()) return null;
      return s;
    };
    function token() { var s = self.session(); return s && s.token; }

    this.queue = function () { return LS.get(KEYS.queue) || []; };
    function setQueue(q) { LS.set(KEYS.queue, q); ev.emit('queue', q.length); }

    this.data = function () { return D; };
    this.setData = function (bundle) { D = bundle ? ensureLists(bundle) : null; persist(); };
    function persist() { if (D) LS.set(KEYS.cache, D); }

    this.loadCache = function () {
      var c = LS.get(KEYS.cache);
      var s = self.session();
      if (c && s && c.student && s.student && c.student.id !== s.student.id) c = null; // another student's cache
      D = c ? ensureLists(c) : null;
      return D;
    };

    this.roster = function () { return get('roster'); };
    this.ping = function () { return get('ping'); };

    this.login = function (studentId, pin) {
      return post('login', { studentId: studentId, pin: pin }).then(function (res) {
        if (res.ok) {
          // Unsent work on this device belongs to whoever used it last (the old session, or the cache
          // left behind when a session was ended by the server). Keep it only for the same student.
          var old = LS.get(KEYS.session), cached = LS.get(KEYS.cache);
          var owner = (old && old.student && old.student.id) || (cached && cached.student && cached.student.id) || null;
          if (owner !== studentId) { LS.del(KEYS.cache); LS.del(KEYS.queue); LS.del(KEYS.is16); LS.keys('wi.draft.').forEach(LS.del); D = null; }
          LS.set(KEYS.session, { token: res.data.token, expiresAt: res.data.expiresAt, student: res.data.student });
        }
        return res;
      });
    };

    /* direct call with the token (not queued) */
    this.call = function (action, data) {
      return post(action, data, token()).then(function (res) {
        if (!res.ok && res.error && res.error.code === 'AUTH_REQUIRED') ev.emit('auth', res.error);
        if (res.ok && res.data) {
          if (res.data.state && D) { D.state = res.data.state; persist(); }
          emitGained(res.data);
        }
        return res;
      });
    };

    function emitGained(data) {
      var g = (data && data.gained) || [];
      if (g.length) ev.emit('gained', g);
      if (data && data.state) ev.emit('state', data.state);
    }

    this.bootstrap = function () {
      return self.call('bootstrap', {}).then(function (res) {
        if (res.ok) {
          D = ensureLists(res.data);
          self.queue().forEach(function (op) { applyOp(D, op); }); // keep unsent work visible
          persist();
        }
        return res;
      });
    };

    /* optimistic save: apply, queue, send. Resolves with the op result,
       or {ok:true, queued:true} when it is waiting to send. */
    this.save = function (action, data) {
      var op = { opId: newId('op'), action: action, data: data || {}, at: nowIso() };
      if (D) { applyOp(D, op); persist(); }
      var q = self.queue(); q.push(op); setQueue(q);
      var p = new Promise(function (resolve) { waiters[op.opId] = resolve; });
      self.flush();
      return p;
    };

    function settle(opId, val) { var w = waiters[opId]; if (w) { delete waiters[opId]; w(val); } }

    this.flush = function () {
      if (flushing) return flushing;
      if (!token()) return Promise.resolve();
      flushing = (function loop() {
        var q = self.queue();
        if (!q.length) return Promise.resolve();
        var batch = q.slice(0, 25);
        return post('sync', { ops: batch.map(function (o) { return { opId: o.opId, action: o.action, data: o.data }; }) }, token()).then(function (res) {
          if (!res.ok) {
            var code = res.error && res.error.code;
            if (code === 'AUTH_REQUIRED') ev.emit('auth', res.error);
            batch.forEach(function (o) { settle(o.opId, { ok: true, queued: true }); });
            ev.emit('offline', res.error);
            return; // keep the queue
          }
          var results = (res.data && res.data.results) || [];
          var done = {}, stop = false;
          results.forEach(function (r) {
            var op = null;
            for (var i = 0; i < batch.length; i++) if (batch[i].opId === r.opId) op = batch[i];
            if (!op) return;
            if (r.ok) {
              done[r.opId] = 1;
              mergeResult(D, op, r.data);
              emitGained(r.data);
              settle(r.opId, { ok: true, data: r.data });
            } else {
              var c = r.error && r.error.code;
              if (KEEP_CODES[c] || c === 'AUTH_REQUIRED') { stop = true; return; }
              done[r.opId] = 1; // refused for good: drop it and tell the app
              ev.emit('opError', { op: op, error: r.error });
              settle(r.opId, { ok: false, error: r.error });
            }
          });
          if (res.data && res.data.state && D) D.state = res.data.state;
          emitGained(res.data);
          var rest = self.queue().filter(function (o) { return !done[o.opId]; });
          setQueue(rest);
          persist();
          ev.emit('synced', rest.length);
          if (stop) { batch.forEach(function (o) { if (!done[o.opId]) settle(o.opId, { ok: true, queued: true }); }); return; }
          if (rest.length && Object.keys(done).length) return loop();
        });
      })().then(function () { flushing = null; }, function () { flushing = null; });
      return flushing;
    };

    this.logout = function () {
      var t = token();
      var p = t ? post('logout', {}, t) : Promise.resolve({ ok: true });
      return p.then(function () { self.clearDevice(); return { ok: true }; });
    };
    /* the server ended this session (PIN reset, expiry): forget the token only, so that the
       same student can sign in again and her unsent work and drafts are still there */
    this.dropSession = function () { LS.del(KEYS.session); };
    /* shared-device rule (§8.4) */
    this.clearDevice = function () {
      LS.del(KEYS.session); LS.del(KEYS.cache); LS.del(KEYS.queue); LS.del(KEYS.is16);
      LS.keys('wi.draft.').forEach(LS.del);
      D = null;
    };

    setInterval(function () { if (self.queue().length) self.flush(); }, 60000);
    root.addEventListener('online', function () { self.flush(); });
  }

  /* ---------- teacher client (no queue: teacher writes are direct) ---------- */
  function Teacher() {
    var ev = hub();
    var self = this;
    this.on = ev.on;
    this.nowIso = nowIso;
    this.nowMs = nowMs;
    this.session = function () {
      var s = LS.get(KEYS.tsession);
      if (!s || !s.token) return null;
      if (s.expiresAt && Date.parse(s.expiresAt) < Date.now()) return null;
      return s;
    };
    this.roster = function () { return get('roster'); };
    this.login = function (pin) {
      return post('t.login', { pin: pin }).then(function (res) {
        if (res.ok) LS.set(KEYS.tsession, { token: res.data.token, expiresAt: res.data.expiresAt });
        return res;
      });
    };
    this.call = function (action, data) {
      var s = self.session();
      return post(action, data, s && s.token).then(function (res) {
        if (!res.ok && res.error && res.error.code === 'AUTH_REQUIRED') ev.emit('auth', res.error);
        return res;
      });
    };
    this.logout = function () {
      var s = self.session();
      var p = s ? post('logout', {}, s.token) : Promise.resolve({ ok: true });
      return p.then(function () { LS.del(KEYS.tsession); return { ok: true }; });
    };
  }

  root.WIApi = {
    KEYS: KEYS, LS: LS, newId: newId, rand36: rand36, nowIso: nowIso, nowMs: nowMs, bkkIso: bkkIso,
    applyOp: applyOp, mergeResult: mergeResult, countWords: countWords, NET_MSG: NET_MSG,
    student: function () { return root.__wiStudent || (root.__wiStudent = new Student()); },
    teacher: function () { return root.__wiTeacher || (root.__wiTeacher = new Teacher()); }
  };
})();
