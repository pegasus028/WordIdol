/* WordIdol teacher portal (W2). SPEC §2.4. There is no control here that edits a student entry:
   the teacher can comment, approve, decide requests, lock or unlock online, handle flags,
   reset a PIN, enter waves, export and change settings. */
(function () {
  'use strict';
  var root = window;
  var api = root.WIApi.teacher();
  var LS = root.WIApi.LS;
  var view, cur = { acts: {} };
  var roster = null, overview = null, cache = {};

  function E() { return root.WI || {}; }
  function now() { return api.nowIso(); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function try_(fn, d) { try { var v = fn(); return v === undefined ? d : v; } catch (e) { if (root.console) console.warn(e); return d; } }
  function fmt(d, s) { if (!d) return ''; return try_(function () { return E().fmtDate(d, s); }, String(d).slice(0, 10)); }
  function fmtTime(iso) { if (!iso) return ''; var t = String(iso); return fmt(t) + (t.length > 15 ? ' ' + t.slice(11, 16) : ''); }
  function CH(l) { return (root.WI_CHOICES && root.WI_CHOICES[l]) || []; }
  function lab(l, id) { var o = CH(l).filter(function (x) { return String(x.id) === String(id); })[0]; return o ? (o.shownAs || o.label) : (id == null ? '' : String(id)); }
  /* the student sees this idea as "ask T.Chris first"; the teacher needs its real name */
  function ideaName(id) { var o = CH('ideas').filter(function (x) { return String(x.id) === String(id); })[0]; return o ? o.label : (id || ''); }
  function qs(s, el) { return (el || document).querySelector(s); }
  function qsa(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function live(l) { return (l || []).filter(function (r) { return r && r.deleted !== true; }); }
  function stageName(id) { var s = ((root.WI_PLAN && root.WI_PLAN.stages) || []).filter(function (x) { return x.id === id; })[0]; return s ? s.name : (id || ''); }
  function wc(t) { return try_(function () { return E().wordCount(t); }, String(t || '').trim() ? String(t).trim().split(/\s+/).length : 0); }
  function release() { return Number((root.WI_CONFIG && root.WI_CONFIG.release) || 1); }
  function labelOf(id) { var r = (roster || []).filter(function (x) { return x.id === id; })[0]; return r ? r.label : id; }

  /* ---------- UI bits ---------- */
  function toast(msg, kind) {
    var box = qs('#toasts'); if (!box) return;
    var t = document.createElement('div'); t.className = 'toast' + (kind ? ' ' + kind : ''); t.setAttribute('role', 'status'); t.textContent = msg;
    box.appendChild(t); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4200);
  }
  function errMsg(r) { return (r && r.error && r.error.message) || 'That did not work. Try again.'; }
  function sheet(title, html, onAct) {
    var s = document.createElement('div'); s.className = 'scrim';
    s.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="grab"></div><div class="sheet-h"><h2>' + esc(title) + '</h2><button class="iconbtn" data-close aria-label="Close">×</button></div><div class="sheet-b">' + html + '</div></div>';
    document.body.appendChild(s);
    var o = { el: qs('.sheet-b', s), close: function () { if (s.parentNode) s.parentNode.removeChild(s); } };
    s.addEventListener('click', function (ev) {
      if (ev.target === s || ev.target.closest('[data-close]')) { o.close(); return; }
      var a = ev.target.closest('[data-act]'); if (a && onAct) onAct(a.getAttribute('data-act'), a, o);
    });
    var f = qs('textarea,input,select', s); if (f) setTimeout(function () { f.focus(); }, 30);
    return o;
  }
  function confirmBox(title, text, yes) {
    return new Promise(function (res) {
      sheet(title, '<p>' + text + '</p><div class="btnrow"><button class="btn primary" data-act="y">' + esc(yes) + '</button><button class="btn ghost" data-act="n">Cancel</button></div>', function (a, b, s) { s.close(); res(a === 'y'); });
    });
  }
  function field(id, label, input, hint) { return '<div class="field" data-f="' + id + '"><label for="' + id + '">' + esc(label) + '</label>' + (hint ? '<p class="hint">' + esc(hint) + '</p>' : '') + input + '<div class="err" role="alert"></div></div>'; }
  function setErr(el, id, msg) { var f = qs('[data-f="' + id + '"]', el); if (!f) { toast(msg, 'err'); return; } f.classList.toggle('invalid', !!msg); qs('.err', f).textContent = msg || ''; if (msg) { var i = qs('input,textarea,select', f); if (i) i.focus(); } }
  function rel(iso) {
    if (!iso) return { t: 'never', old: true };
    var d = Math.floor((api.nowMs() - Date.parse(iso)) / 86400000);
    return { t: d <= 0 ? 'today' : (d === 1 ? 'yesterday' : d + ' days ago'), old: d >= 7 };
  }
  var FLAG_TEXT = { F_PROBLEM: 'Problem', F_QUIET: 'Quiet 7+ days', F_DEADLINE: 'Deadline soon', F_PENDING: 'Pending', F_CANNOT: 'Could not do' };
  function flagChips(fl) { return (fl || []).map(function (f) { return '<span class="flagchip ' + esc(f) + '">' + esc(FLAG_TEXT[f] || f) + '</span>'; }).join(' '); }

  /* ---------- router ---------- */
  var SCREENS = {};
  var TABS = [['class', 'Class'], ['approvals', 'Approvals'], ['waves', 'Waves'], ['spot', 'Spot checks'], ['export', 'Export'], ['settings', 'Settings']];
  function parse() { var h = (location.hash || '').replace(/^#\/?/, '').replace(/\?.*$/, ''); return (h || 'class').split('/'); }
  function go(r) { if (location.hash === r) route(); else location.hash = r; }
  function render(h) { view.innerHTML = h; }
  function acts(m) { cur.acts = m; }
  document.addEventListener('click', function (ev) { var a = ev.target.closest('[data-act]'); if (a && view && view.contains(a) && cur.acts[a.getAttribute('data-act')]) { ev.preventDefault(); cur.acts[a.getAttribute('data-act')](a, ev); } });
  function route() {
    var p = parse();
    if (!api.session() && p[0] !== 'login') { location.replace('#/login'); return; }
    if (api.session() && p[0] === 'login') { location.replace('#/class'); return; }
    cur = { acts: {} };
    qsa('.tnav a').forEach(function (a) { if (a.getAttribute('data-t') === p[0] || (p[0] === 's' && a.getAttribute('data-t') === 'class')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    qs('.tnav').hidden = p[0] === 'login';
    var fn = SCREENS[p[0]];
    if (!fn) { render('<div class="empty"><strong>This page does not exist.</strong></div>'); return; }
    try { fn(p.slice(1)); } catch (e) { if (root.console) console.error(e); render('<div class="note bad">This screen could not open.</div>'); }
    root.scrollTo(0, 0);
  }
  api.on('auth', function () { toast('Please sign in again.', 'err'); go('#/login'); });
  function loading(t) { render('<p class="muted" aria-busy="true">' + esc(t || 'Loading…') + '</p>'); }
  function call(action, data) { return api.call(action, data); }
  function getRoster() { if (roster) return Promise.resolve(roster); return api.roster().then(function (r) { roster = r.ok ? r.data.students : []; return roster; }); }

  /* ---------- T-LOGIN ---------- */
  SCREENS.login = function () {
    render('<div class="login"><h1>WordIdol teacher portal</h1><form id="lf" class="form" novalidate>' +
      field('pin', 'Teacher PIN', '<input id="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" style="font-size:1.3rem;letter-spacing:.4em;text-align:center">', '6 to 8 digits') +
      '<button class="btn primary block" type="submit">Sign in</button></form><p><a class="linkbtn" href="index.html">Student app</a></p></div>');
    qs('#lf').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var pin = qs('#pin').value.trim();
      if (!/^\d{6,8}$/.test(pin)) { setErr(view, 'pin', 'The teacher PIN has 6 to 8 digits.'); return; }
      api.login(pin).then(function (r) {
        if (!r.ok) {
          var c = r.error && r.error.code, d = r.data || (r.error && r.error.data) || r.error || {};
          setErr(view, 'pin', c === 'AUTH_BAD_PIN' ? 'That PIN is not right. Tries left: ' + (d.triesLeft != null ? d.triesLeft : '?') + '.' : (c === 'AUTH_LOCKED' ? ((r.error && r.error.message) || 'Too many tries. Wait and try again later.') : errMsg(r)));
          qs('#pin').value = ''; return;
        }
        go('#/class');
      });
    });
  };

  /* ---------- T-CLASS ---------- */
  function loadOverview() { return call('t.overview', {}).then(function (r) { if (r.ok) overview = r.data; return r; }); }
  function onlineText(o) { return { locked: 'locked', auto: 'unlocked auto', teacher: 'unlocked by teacher' }[o] || String(o || ''); }
  SCREENS['class'] = function () {
    loading('Loading the class…');
    loadOverview().then(function (r) {
      if (!r.ok) { render('<div class="note bad">' + esc(errMsg(r)) + '</div>'); return; }
      var rows = r.data.rows || [];
      var pend = r.data.pending || {};
      var real = rows.filter(function (x) { return !x.guest; }), guests = rows.filter(function (x) { return x.guest; });
      function table(list) {
        return '<div class="tablewrap"><table class="t"><thead><tr><th>Student</th><th>Stage</th><th class="num">Week done / open / carried</th><th>Last activity</th><th class="num">XP</th><th class="num">Streak</th><th class="num">Rules</th><th>Online</th><th class="num">Sightings week / total (owned / earned)</th><th>Flags</th></tr></thead><tbody>' +
          list.map(function (x) {
            var a = rel(x.lastActivityAt), s = x.sightings || {};
            var wk = x.week || {};
            return '<tr><td><a href="#/s/' + esc(x.studentId) + '"><b>' + esc(x.label) + '</b></a><br><span class="muted small">' + esc(x.word || '(no word yet)') + (x.regStatus === 'submitted' ? ' <span class="chip warn">to approve</span>' : '') + '</span></td>' +
              '<td>' + esc(stageName(x.stage)) + '</td><td class="num">' + esc(wk.done || 0) + ' / ' + esc(wk.open || 0) + ' / ' + esc(wk.carried || 0) + (wk.cannot ? '<br><span class="small">' + esc(wk.cannot) + ' could not do</span>' : '') + '</td>' +
              '<td class="' + (a.old ? 'red' : '') + '">' + esc(a.t) + '</td><td class="num">' + esc(x.xp || 0) + '</td><td class="num">' + esc(x.streak || 0) + '</td><td class="num">' + esc(Array.isArray(x.rulesTicked) ? x.rulesTicked.filter(Boolean).length : (x.rulesTicked || 0)) + '/6</td>' +
              '<td>' + esc(onlineText(x.online)) + '</td><td class="num">' + esc(s.week || 0) + ' / ' + esc(s.total || 0) + ' (' + esc(s.owned || 0) + ' / ' + esc(s.earned || 0) + ')</td><td>' + flagChips(x.flags) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      var h = '<div class="screen-head"><h1>Class overview</h1><button class="btn small" data-act="reload">Refresh</button></div>';
      var pc = (pend.terms || 0) + (pend.requests || 0) + (pend.flags || 0);
      if (pend.flags) h += '<div class="note bad"><b>' + pend.flags + ' open problem flag' + (pend.flags === 1 ? '' : 's') + '.</b> <a href="#/approvals">Open approvals</a></div>';
      else if (pc) h += '<div class="note">' + pc + ' waiting for you: ' + (pend.terms || 0) + ' words, ' + (pend.requests || 0) + ' requests. <a href="#/approvals">Open approvals</a></div>';
      h += table(real);
      if (guests.length) h += '<details class="panel flat" style="margin-top:1rem"><summary><b>Guests</b> (' + guests.length + ')</summary>' + table(guests) + '</details>';
      h += '<p class="muted small">Sighting figures are for you only. Students never see a comparison of spread.</p>';
      render(h);
      acts({ reload: function () { route(); } });
    });
  };

  /* ---------- T-STUDENT ---------- */
  var FILTERS = [['word', 'Word card'], ['plan', 'Plan'], ['action', 'Actions'], ['journal', 'Lab Book'], ['sighting', 'Sightings'], ['checklist', 'Checklist'], ['file', 'Screenshots'], ['tally', 'Tallies'], ['wave', 'Waves'], ['review', 'Reviews']];
  var activeFilters = {};
  function loadStudent(sid) { return call('t.student', { studentId: sid }).then(function (r) { if (r.ok) cache[sid] = r.data; return r; }); }
  function timeline(B) {
    var out = [];
    var w = B.word || {};
    if (w.word) out.push({ f: 'word', at: w.updatedAt || w.createdAt, tt: 'word', tid: '', title: 'Word card', body: kv([['Word', w.word], ['Meaning', w.meaning], ['Part of speech', lab('pos', w.pos) + (w.posGuess ? ' (guess: ' + w.posGuess + ', ' + w.posRule + ', ' + w.posConfidence + ')' : '')], ['Also', (w.posAlso || []).map(function (x) { return lab('pos', x); }).join(', ')], ['Usage rules', w.usageRules], ['Formation', lab('formations', w.formation)], ['Source words', w.sourceWords], ['Examples', [w.example1, w.example2, w.example3].filter(Boolean).join('\n')], ['Do not use', w.doNotUse], ['Purpose', w.purpose], ['Not rude confirmed', w.notRudeConfirmed ? 'yes' : 'no'],
      ['FUDGE', w.fudge && w.fudge.pred ? ['F', 'U', 'D', 'G', 'E'].map(function (k) { return k + ' ' + w.fudge.pred[k] + ': ' + ((w.fudge.pred.reasons || {})[k] || ''); }).join('\n') : ''],
      ['Research question', w.researchQuestion], ['Hypotheses', (w.hypotheses || []).map(function (h, i) { return (i + 1) + '. ' + h.text + ' [' + lab('metrics', h.metric) + (h.target ? ', ' + h.target : '') + ']'; }).join('\n')],
      ['Zero baseline', w.zb ? (w.zb.checkedAt + ': ' + (w.zb.places || []).map(function (p) { return lab('zbPlaces', p.placeId) + ' – ' + lab('zbResults', p.result); }).join('; ') + '\n' + (w.zb.statement || '')) : ''],
      ['Spec sheet', w.specSheet ? Object.keys(w.specSheet).map(function (k) { return k + ' ' + lab('specResults', w.specSheet[k].result) + (w.specSheet[k].note ? ' (' + w.specSheet[k].note + ')' : ''); }).join(', ') : ''],
      ['Registration', lab('regStatuses', w.regStatus) + (w.regComment ? ': ' + w.regComment : '')]]) });
    (B.wordHistory || []).forEach(function (h) { out.push({ f: 'word', at: h.at, tt: 'word', tid: h.id, title: 'Word change: ' + h.field, body: kv([['Before', h.oldValue], ['After', h.newValue]]) }); });
    (B.plans || []).forEach(function (p) { out.push({ f: 'plan', at: p.updatedAt, tt: 'plan', tid: p.id, title: 'Choices (phase ' + p.phase + ')', body: kv([['Target groups', (p.targetGroups || []).map(function (x) { return lab('targetGroups', x); }).join(', ')], ['Ideas', (p.ideas || []).map(function (x) { return lab('ideas', x); }).join(', ')], ['Platforms', (p.platforms || []).map(function (x) { return lab('platforms', x); }).join(', ') + (p.platformOther ? ' (' + p.platformOther + ')' : '')], ['Route', lab('routes', p.route)], ['Time', lab('timeBudgets', p.timeBudget)], ['Who', p.who], ['Why', p.why], ['What', p.what], ['Spark', p.spark], ['Project account', p.projectAccount]]) }); });
    live(B.planActions).forEach(function (a) { out.push({ f: 'plan', at: a.updatedAt || a.createdAt, tt: 'plan', tid: a.id, title: 'Planned action for ' + fmt(a.whenDate) + ' (' + (a.status || 'planned') + ')', body: kv([['Where', lab('channels', a.where)], ['Idea', lab('ideas', a.ideaId)], ['What', a.what], ['Why', a.why], ['Theory', a.theoryTag], ['Evidence', lab('evidenceTypes', a.evidence)], ['Target group', lab('targetGroups', a.targetGroup)]]) }); });
    live(B.actions).forEach(function (a) {
      var pa = (B.planActions || []).filter(function (p) { return p.id === a.planActionId; })[0];
      var done = kv([['Where', lab('channels', a.channelId)], ['Idea', lab('ideas', a.ideaId)], ['What I did', a.what], ['Outcome', lab('outcomes', a.outcome) + (a.outcomeReason ? ': ' + a.outcomeReason : '')], ['Audience', lab('audiences', a.audience)], ['Reaction', a.reaction], ['Learned', a.learned], ['Problem', a.problem ? 'yes' : '']]);
      var body = pa ? '<div class="side2"><div class="panel tint"><b>Planned</b>' + kv([['When', fmt(pa.whenDate)], ['Where', lab('channels', pa.where)], ['What', pa.what], ['Why', pa.why]]) + '</div><div class="panel tint"><b>Done</b>' + done + '</div></div>' : done;
      out.push({ f: 'action', at: a.date, tt: 'action', tid: a.id, title: 'Action', body: body, files: a.fileIds });
    });
    live(B.journal).forEach(function (j) { out.push({ f: 'journal', at: j.date, tt: 'journal', tid: j.id, title: 'Lab Book: ' + lab('journalKinds', j.kind) + ' (' + (j.wordCount || wc(j.text)) + ' words)', body: '<div class="tl-body">' + esc(j.text) + '</div>', files: j.fileIds }); });
    live(B.sightings).forEach(function (s) {
      out.push({ f: 'sighting', at: s.date, tt: 'sighting', tid: s.id, title: 'Sighting: Level ' + s.level + (s.finalLevel != null && s.finalLevel !== '' && s.finalLevel !== s.level ? ' (final ' + s.finalLevel + ')' : '') + ', ' + (s.owned ? 'owned' : 'earned') + ', audit ' + (s.auditStatus || 'none') + (s.spotStatus && s.spotStatus !== 'none' ? ', spot ' + s.spotStatus : ''),
        body: kv([['Quote', s.quote], ['Where', lab('channels', s.channelId)], ['Who', lab('relations', s.relation)], ['Context', s.context], ['Prompted', lab('prompted', s.prompted)], ['Marked', lab('marked', s.marked)], ['Topic', lab('topics', s.topic)], ['Part of speech', lab('posUsed', s.posUsed)], ['New form', s.derivedForm], ['Link', s.link], ['Checkable', s.verifiable ? 'yes' : 'no']]), files: s.fileIds });
    });
    live(B.tallies).forEach(function (t) { out.push({ f: 'tally', at: t.date, tt: 'general', tid: t.id, title: 'Tally: ' + lab('tallyTypes', t.tallyType) + ' ' + t.count, body: kv([['Where', lab('channels', t.context)], ['Note', t.note]]) }); });
    live(B.files).forEach(function (f) { out.push({ f: 'file', at: f.createdAt, tt: 'general', tid: f.id, title: 'Screenshot: ' + (f.caption || ''), body: '<p class="small muted">Attached to ' + esc(f.attachType || 'none') + ', ' + esc(f.width) + ' × ' + esc(f.height) + '</p>', files: [f.id] }); });
    (B.checklist || []).filter(function (r) { return r.status === 'done' || r.status === 'cannot'; }).forEach(function (r) { out.push({ f: 'checklist', at: r.doneAt || r.updatedAt, tt: 'checklist', tid: r.id, title: (r.status === 'done' ? 'Ticked: ' : 'Could not do: ') + r.title, body: r.reason ? '<p>' + esc(r.reason) + '</p>' : '<p class="small muted">' + esc(r.weekId) + ', ' + (r.doneBy === 'auto' ? 'ticked itself' : 'ticked by hand') + '</p>' }); });
    (B.waveNotes || []).forEach(function (n) { out.push({ f: 'wave', at: n.updatedAt, tt: 'general', tid: n.id, title: 'Wave note ' + n.waveId, body: '<div class="tl-body">' + esc(n.note) + '</div>' + (n.hypothesisChecks ? kv(Object.keys(n.hypothesisChecks).map(function (k) { return [k, lab('hypStatuses', n.hypothesisChecks[k])]; })) : '') }); });
    (B.reviews || []).forEach(function (v) { var c = v.counts || {}; out.push({ f: 'review', at: v.submittedAt, tt: 'review', tid: v.id, title: 'Weekly review ' + v.weekId + (v.onTime ? ' (on time)' : ''), body: kv([['Went well', v.wentWell], ['To change', v.toChange], ['Counts', 'done ' + (c.done || 0) + ', open ' + (c.open || 0) + ', carried ' + (c.carried || 0) + ', could not do ' + (c.cannot || 0)]]) }); });
    (B.reports || []).forEach(function (p) { out.push({ f: 'journal', at: p.updatedAt, tt: 'report', tid: p.id, title: 'Report: ' + p.type + ' (' + p.status + ', ' + (p.wordCount || 0) + ' words)', body: '' }); });
    out.sort(function (a, b) { return String(b.at || '').localeCompare(String(a.at || '')); });
    return out;
  }
  function kv(pairs) { var p = pairs.filter(function (x) { return x[1] != null && x[1] !== ''; }); return p.length ? '<dl class="kv">' + p.map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd style="white-space:pre-wrap">' + esc(x[1]) + '</dd>'; }).join('') + '</dl>' : ''; }
  SCREENS.s = function (p) {
    var sid = p[0], tab = p[1] || 'timeline';
    loading('Loading…');
    getRoster().then(function () { return loadStudent(sid); }).then(function (r) {
      if (!r.ok) { render('<div class="note bad">' + esc(errMsg(r)) + '</div>'); return; }
      var B = r.data, w = B.word || {}, st = B.state || {};
      var on = try_(function () { return E().onlineStatus(B, now(), B.config); }, { unlocked: !!st.onlineUnlocked });
      var h = '<a class="linkbtn" href="#/class">Class</a><div class="screen-head"><h1>' + esc(labelOf(sid)) + '</h1></div>' +
        '<div class="t-head"><span class="chip">' + esc(w.word || 'no word yet') + '</span>' + (w.pos ? '<span class="chip">' + esc(lab('pos', w.pos)) + '</span>' : '') + '<span class="chip ' + ({ submitted: 'warn', approved: 'ok', changes: 'bad' }[w.regStatus] || '') + '">' + esc(lab('regStatuses', w.regStatus || 'draft')) + '</span><span class="chip gold">' + esc(stageName(try_(function () { return E().stageOf(B, now()); }, st.stage))) + '</span><span class="chip">' + esc(st.xp || 0) + ' XP</span><span class="chip">' + (on.unlocked ? 'online unlocked' + (on.by ? ' (' + on.by + ')' : '') : 'online locked') + '</span></div>';
      h += '<div class="btnrow">' + (w.regStatus === 'submitted' ? '<button class="btn primary small" data-act="approve">Approve term</button><button class="btn small" data-act="changes">Ask for changes</button>' : '') +
        (on.unlocked ? '<button class="btn small ghost" data-act="lock">Lock online again</button>' : '<button class="btn small ghost" data-act="unlock">Unlock online early</button>') +
        '<button class="btn small ghost" data-act="pin">Reset PIN</button></div>';
      var openFlags = (B.flags || []).filter(function (f) { return f.status === 'open'; });
      openFlags.forEach(function (f) { h += '<div class="note bad"><b>Problem flag:</b> ' + esc(lab('problemCategories', f.category)) + ' (' + esc(fmtTime(f.createdAt)) + ')' + (f.note ? '<br>' + esc(f.note) : '') + '<br><button class="btn small" data-act="handle" data-id="' + esc(f.id) + '">Mark as handled</button></div>'; });
      (B.requests || []).filter(function (q) { return q.status === 'pending'; }).forEach(function (q) { h += '<div class="note"><b>Request (' + esc(q.type === 'ask_first' ? 'ask T.Chris first: ' + ideaName(q.ideaId) : 'word change') + '):</b> ' + esc(q.text) + '<div class="btnrow"><button class="btn small primary" data-act="req" data-d="approved" data-id="' + esc(q.id) + '">Approve</button><button class="btn small" data-act="req" data-d="declined" data-id="' + esc(q.id) + '">Decline</button></div></div>'; });
      h += '<div class="seg" role="tablist" style="margin:1rem 0">' + [['timeline', 'Timeline'], ['week', 'Week'], ['summit', 'Summit readiness'], ['article', 'Article readiness'], ['feedback', 'Feedback']].map(function (t) { return '<a role="tab" href="#/s/' + esc(sid) + '/' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + '</a>'; }).join('') + '</div>';
      h += '<div id="tabbody"></div>';
      render(h);
      var body = qs('#tabbody');
      if (tab === 'timeline') drawTimeline(body, B, sid);
      else if (tab === 'week') drawWeek(body, B, null);
      else if (tab === 'summit') drawReadiness(body, B, /^SUM-/);
      else if (tab === 'article') drawReadiness(body, B, /^ART-/);
      else drawFeedback(body, B, sid);
      acts({
        approve: function () { call('t.term', { studentId: sid, decision: 'approved' }).then(function (x) { if (x.ok) { toast('Term approved.'); route(); } else toast(errMsg(x), 'err'); }); },
        changes: function () {
          sheet('Ask for changes', '<form class="form" novalidate>' + field('cm', 'What should she change?', '<textarea id="cm" maxlength="400" rows="4"></textarea>') + '<button class="btn primary" type="button" data-act="ok">Send</button></form>', function (a, b, s) {
            if (a !== 'ok') return;
            var t = qs('#cm', s.el).value.trim();
            if (!t) { setErr(s.el, 'cm', 'Please write what she should change.'); return; }
            if (t.length > 400) { setErr(s.el, 'cm', 'Use 400 characters or fewer.'); return; }
            call('t.term', { studentId: sid, decision: 'changes', comment: t }).then(function (x) { if (x.ok) { s.close(); toast('Sent.'); route(); } else setErr(s.el, 'cm', errMsg(x)); });
          });
        },
        unlock: function () { call('t.online', { studentId: sid, unlocked: true }).then(function (x) { if (x.ok) { toast('Online unlocked for ' + labelOf(sid) + '.'); route(); } else toast(errMsg(x), 'err'); }); },
        lock: function () { call('t.online', { studentId: sid, unlocked: false }).then(function (x) { if (x.ok) { toast('Online locked again.'); route(); } else toast(errMsg(x), 'err'); }); },
        handle: function (b) { handleFlag(b.getAttribute('data-id'), route); },
        req: function (b) { decideRequest(b.getAttribute('data-id'), b.getAttribute('data-d'), route); },
        pin: function () { resetPin(sid); },
        comment: function (b) { commentSheet(sid, b.getAttribute('data-tt'), b.getAttribute('data-tid')); },
        file: function (b) { showFile(b.getAttribute('data-id')); },
        filter: function (b) { var f = b.getAttribute('data-f'); activeFilters[f] = !activeFilters[f]; drawTimeline(body, B, sid); },
        wk: function (b) { drawWeek(body, B, b.getAttribute('data-w')); },
        newfb: function () { commentSheet(sid, 'general', ''); }
      });
    });
  };
  function drawTimeline(el, B, sid) {
    var all = timeline(B);
    var on = Object.keys(activeFilters).filter(function (k) { return activeFilters[k]; });
    var list = on.length ? all.filter(function (e) { return on.indexOf(e.f) >= 0; }) : all;
    el.innerHTML = '<div class="chips" role="group" aria-label="Filter">' + FILTERS.map(function (f) { return '<button class="btn small ' + (activeFilters[f[0]] ? 'primary' : 'ghost') + '" data-act="filter" data-f="' + f[0] + '" aria-pressed="' + !!activeFilters[f[0]] + '">' + f[1] + '</button>'; }).join('') + '</div>' +
      (list.length ? list.map(function (e) {
        return '<div class="tl-entry"><div class="tl-h"><b>' + esc(e.title) + '</b><span class="muted small">' + esc(fmtTime(e.at)) + '</span></div>' + e.body +
          ((e.files || []).length ? '<div class="chips">' + e.files.map(function (id) { return '<button class="btn small ghost" data-act="file" data-id="' + esc(id) + '">View screenshot</button>'; }).join('') + '</div>' : '') +
          '<button class="linkbtn" data-act="comment" data-tt="' + esc(e.tt) + '" data-tid="' + esc(e.tid) + '">Comment</button></div>';
      }).join('') : '<div class="empty"><strong>Nothing here yet.</strong></div>');
  }
  function drawWeek(el, B, wk) {
    var cw = try_(function () { return E().weekIdOf(now()); }, 'W01');
    wk = wk || cw;
    var weeks = ((root.WI_PLAN && root.WI_PLAN.weeks) || []).map(function (w) { return w.id; }).filter(function (w) { return w <= cw; });
    var rows = (B.checklist || []).filter(function (r) { return r.weekId === wk; });
    el.innerHTML = '<div class="chips">' + weeks.map(function (w) { return '<button class="btn small ' + (w === wk ? 'primary' : 'ghost') + '" data-act="wk" data-w="' + w + '">' + w + '</button>'; }).join('') + '</div>' +
      '<div class="tablewrap" style="margin-top:.8rem"><table class="t"><thead><tr><th>Item</th><th>Kind</th><th>Status</th><th>Due</th><th>Done</th><th class="num">Carried</th><th>Reason</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td>' + esc(r.title) + '<br><span class="muted small">' + esc(r.itemId) + ', ' + esc(r.source) + '</span></td><td>' + esc(r.kind) + '</td><td>' + esc(r.status) + '</td><td>' + esc(fmt(r.dueDate)) + '</td><td>' + esc(fmtTime(r.doneAt)) + (r.doneBy ? ' (' + esc(r.doneBy) + ')' : '') + '</td><td class="num">' + esc(r.carryCount || 0) + '</td><td>' + esc(r.reason || '') + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
  }
  function drawReadiness(el, B, re) {
    var reqs = ((root.WI_COVERAGE && root.WI_COVERAGE.requirements) || []).filter(function (r) { return re.test(r.id); });
    var exp = function (ids) { var c = root.WI_COVERAGE; return c && c.expand ? ids.reduce(function (a, i) { return a.concat(c.expand(i)); }, []) : ids; };
    el.innerHTML = '<p class="muted">Each requirement with the checklist items that feed it.</p>' + reqs.map(function (r) {
      var items = exp(r.items || []);
      return '<div class="panel flat"><h3>' + esc(r.id) + ': ' + esc(r.text) + '</h3><ul class="list">' + items.map(function (it) {
        var rows = (B.checklist || []).filter(function (x) { return x.itemId === it; });
        var done = rows.some(function (x) { return x.status === 'done'; });
        var def = try_(function () { return E().itemDef(it, B); }, null);
        return '<li style="padding:.3rem 0"><span class="chip ' + (done ? 'ok' : (rows.length ? 'warn' : '')) + '">' + (done ? 'done' : (rows.length ? 'open' : 'later')) + '</span> ' + esc(def ? def.title : it) + '</li>';
      }).join('') + '</ul></div>';
    }).join('');
  }
  function drawFeedback(el, B) {
    var fb = (B.feedback || []).slice().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    el.innerHTML = '<button class="btn primary" data-act="newfb">New feedback</button>' + (fb.length ? '<ul class="list">' + fb.map(function (f) { return '<li style="padding:.6rem 0"><div style="white-space:pre-wrap">' + esc(f.text) + '</div><span class="muted small">' + esc(fmtTime(f.createdAt)) + ', about ' + esc(f.targetType) + (f.readAt ? ', read ' + esc(fmt(f.readAt)) : ', not read yet') + '</span></li>'; }).join('') + '</ul>' : '<p class="muted">No feedback yet.</p>');
  }
  function commentSheet(sid, tt, tid) {
    sheet('Comment', '<form class="form" novalidate>' + field('ct', 'Your comment (she sees it on her Home screen)', '<textarea id="ct" rows="5" maxlength="600"></textarea>') + '<button class="btn primary" type="button" data-act="ok">Send comment</button></form>', function (a, b, s) {
      if (a !== 'ok') return;
      var t = qs('#ct', s.el).value.trim();
      if (t.length < 2) { setErr(s.el, 'ct', 'Write at least 2 characters.'); return; }
      if (t.length > 600) { setErr(s.el, 'ct', 'Use 600 characters or fewer.'); return; }
      b.disabled = true;
      call('t.feedback', { studentId: sid, targetType: tt || 'general', targetId: tid || '', text: t }).then(function (x) { b.disabled = false; if (x.ok) { s.close(); toast('Comment sent.'); } else setErr(s.el, 'ct', errMsg(x)); });
    });
  }
  function handleFlag(id, after) {
    sheet('Mark flag as handled', '<form class="form" novalidate>' + field('tn', 'Note (optional)', '<textarea id="tn" rows="3" maxlength="300"></textarea>') + '<button class="btn primary" type="button" data-act="ok">Mark as handled</button></form>', function (a, b, s) {
      if (a !== 'ok') return;
      var t = qs('#tn', s.el).value.trim();
      if (t.length > 300) { setErr(s.el, 'tn', 'Use 300 characters or fewer.'); return; }
      call('t.flag', { id: id, teacherNote: t }).then(function (x) { if (x.ok) { s.close(); toast('Flag handled.'); after(); } else setErr(s.el, 'tn', errMsg(x)); });
    });
  }
  function decideRequest(id, d, after) {
    sheet(d === 'approved' ? 'Approve request' : 'Decline request', '<form class="form" novalidate>' + field('rc', 'Comment for her (optional)', '<textarea id="rc" rows="3" maxlength="300"></textarea>') + '<button class="btn primary" type="button" data-act="ok">' + (d === 'approved' ? 'Approve' : 'Decline') + '</button></form>', function (a, b, s) {
      if (a !== 'ok') return;
      call('t.request', { id: id, decision: d, comment: qs('#rc', s.el).value.trim() }).then(function (x) { if (x.ok) { s.close(); toast(d === 'approved' ? 'Approved.' : 'Declined.'); after(); } else setErr(s.el, 'rc', errMsg(x)); });
    });
  }
  function resetPin(sid) {
    sheet('Reset PIN for ' + labelOf(sid), '<form class="form" novalidate>' + field('np', 'New 4-digit PIN', '<input id="np" type="text" inputmode="numeric" maxlength="4" autocomplete="off">', 'Her other sessions will be signed out.') + '<button class="btn primary" type="button" data-act="ok">Set new PIN</button></form>', function (a, b, s) {
      if (a !== 'ok') return;
      var p = qs('#np', s.el).value.trim();
      if (!/^\d{4}$/.test(p)) { setErr(s.el, 'np', 'The PIN has exactly 4 digits.'); return; }
      call('t.pin', { studentId: sid, newPin: p }).then(function (x) {
        if (!x.ok) { setErr(s.el, 'np', errMsg(x)); return; }
        s.el.innerHTML = '<p>The new PIN for <b>' + esc(labelOf(sid)) + '</b> is</p><p style="font-size:2rem;font-weight:800;letter-spacing:.3em">' + esc(p) + '</p><p class="muted">This is shown once. Tell her in person.</p><button class="btn" data-close>Done</button>';
      });
    });
  }
  var fileCache = {};
  function showFile(id) {
    var s = sheet('Screenshot', '<div class="fileview" id="fv"><p class="muted">Loading…</p></div>');
    function show(u) { if (!/^data:image\/(jpeg|png);base64,/.test(String(u))) { qs('#fv', s.el).textContent = 'The picture could not be loaded.'; return; } qs('#fv', s.el).innerHTML = '<img alt="Student screenshot" src="' + esc(u) + '">'; }
    if (fileCache[id]) { show(fileCache[id]); return; }
    call('t.file', { id: id }).then(function (x) { if (x.ok) { fileCache[id] = x.data.dataUrl; show(x.data.dataUrl); } else qs('#fv', s.el).innerHTML = '<p class="err">' + esc(errMsg(x)) + '</p>'; });
  }

  /* ---------- T-APPROVALS ---------- */
  SCREENS.approvals = function () {
    loading('Loading approvals…');
    loadOverview().then(function (r) {
      if (!r.ok) { render('<div class="note bad">' + esc(errMsg(r)) + '</div>'); return; }
      var need = r.data.rows.filter(function (x) { return x.regStatus === 'submitted' || (x.flags || []).some(function (f) { return f === 'F_PENDING' || f === 'F_PROBLEM'; }); });
      if (!need.length) { render('<div class="screen-head"><h1>Approvals</h1></div><div class="empty"><strong>Nothing is waiting for you.</strong></div>'); return; }
      return Promise.all(need.map(function (x) { return loadStudent(x.studentId).then(function (s) { return { row: x, B: s.ok ? s.data : null }; }); })).then(function (list) {
        var flags = [], terms = [], reqs = [];
        list.forEach(function (it) {
          if (!it.B) return;
          (it.B.flags || []).filter(function (f) { return f.status === 'open'; }).forEach(function (f) { flags.push({ sid: it.row.studentId, f: f }); });
          if (it.B.word && it.B.word.regStatus === 'submitted') terms.push({ sid: it.row.studentId, w: it.B.word, hist: it.B.wordHistory || [] });
          (it.B.requests || []).filter(function (q) { return q.status === 'pending'; }).forEach(function (q) { reqs.push({ sid: it.row.studentId, q: q }); });
        });
        var h = '<div class="screen-head"><h1>Approvals</h1></div>';
        h += '<section class="section"><h2>Open problem flags (' + flags.length + ')</h2>' + (flags.length ? flags.map(function (x) { return '<div class="note bad"><b>' + esc(labelOf(x.sid)) + ':</b> ' + esc(lab('problemCategories', x.f.category)) + ', ' + esc(fmtTime(x.f.createdAt)) + (x.f.note ? '<br>' + esc(x.f.note) : '') + '<br>Stopped the activity: ' + (x.f.stoppedConfirmed ? 'yes' : 'no') + '<div class="btnrow"><button class="btn small" data-act="handle" data-id="' + esc(x.f.id) + '">Mark as handled</button><a class="btn small ghost" href="#/s/' + esc(x.sid) + '">Open student</a></div></div>'; }).join('') : '<p class="muted">None.</p>') + '</section>';
        h += '<section class="section"><h2>Terms to approve (' + terms.length + ')</h2>' + (terms.length ? terms.map(function (x) {
          var changed = x.hist.filter(function (hh) { return x.w.regDecidedAt && hh.at > x.w.regDecidedAt; });
          return '<div class="panel flat"><h3>' + esc(labelOf(x.sid)) + ': ' + esc(x.w.word) + (changed.length ? ' <span class="chip warn">word change</span>' : '') + '</h3>' + kv([['Meaning', x.w.meaning], ['Part of speech', lab('pos', x.w.pos)], ['Formation', lab('formations', x.w.formation)], ['Purpose', x.w.purpose], ['Examples', [x.w.example1, x.w.example2, x.w.example3].filter(Boolean).join('\n')], ['Zero baseline', x.w.zb ? (x.w.zb.places || []).map(function (p) { return lab('zbPlaces', p.placeId) + ': ' + lab('zbResults', p.result); }).join('; ') : '']]) +
            (changed.length ? kv(changed.map(function (c) { return ['Changed ' + c.field, c.oldValue + ' changed to ' + c.newValue]; })) : '') +
            '<div class="btnrow"><button class="btn small primary" data-act="approve" data-sid="' + esc(x.sid) + '">Approve term</button><a class="btn small ghost" href="#/s/' + esc(x.sid) + '">Ask for changes on her page</a></div></div>';
        }).join('') : '<p class="muted">None.</p>') + '</section>';
        h += '<section class="section"><h2>Requests (' + reqs.length + ')</h2>' + (reqs.length ? reqs.map(function (x) { return '<div class="panel flat"><b>' + esc(labelOf(x.sid)) + '</b> (' + esc(x.q.type === 'ask_first' ? 'ask T.Chris first: ' + ideaName(x.q.ideaId) : 'word change') + ')<p>' + esc(x.q.text) + '</p><div class="btnrow"><button class="btn small primary" data-act="req" data-d="approved" data-id="' + esc(x.q.id) + '">Approve</button><button class="btn small" data-act="req" data-d="declined" data-id="' + esc(x.q.id) + '">Decline</button></div></div>'; }).join('') : '<p class="muted">None.</p>') + '</section>';
        render(h);
        acts({
          handle: function (b) { handleFlag(b.getAttribute('data-id'), route); },
          req: function (b) { decideRequest(b.getAttribute('data-id'), b.getAttribute('data-d'), route); },
          approve: function (b) { call('t.term', { studentId: b.getAttribute('data-sid'), decision: 'approved' }).then(function (x) { if (x.ok) { toast('Term approved.'); route(); } else toast(errMsg(x), 'err'); }); }
        });
      });
    });
  };

  /* ---------- T-WAVES ---------- */
  var WAVES = ['W1', 'W2', 'W3', 'W4'];
  SCREENS.waves = function (p) {
    var waveId = p[0];
    if (!waveId) {
      render('<div class="screen-head"><h1>Wave results</h1></div><p class="lead">Enter the class totals from each survey wave. Students see nothing until you publish.</p><div class="cardlist">' +
        WAVES.map(function (w, i) { var open = i < 1 || release() >= (i < 2 ? 2 : 3); return '<a class="hubcard" href="#/waves/' + w + '"><span class="stat">' + (i + 1) + '</span><span class="grow"><span class="t">Wave ' + (i + 1) + '</span><span class="s">' + (open ? 'Enter or edit' : 'Students see this wave in a later release') + '</span></span></a>'; }).join('') + '</div>');
      return;
    }
    if (WAVES.indexOf(waveId) < 0) { go('#/waves'); return; }
    loading('Loading ' + waveId + '…');
    call('t.wave.get', { waveId: waveId }).then(function (r) {
      if (!r.ok) { render('<div class="note bad">' + esc(errMsg(r)) + '</div>'); return; }
      var rows = r.data.rows || [];
      var head = rows.filter(function (x) { return x.date; })[0] || {};
      var published = rows.some(function (x) { return x.published; });
      var h = '<a class="linkbtn" href="#/waves">Waves</a><div class="screen-head"><h1>Wave ' + esc(waveId.slice(1)) + '</h1>' + (published ? '<span class="chip ok">Published</span>' : '<span class="chip">Draft</span>') + '</div>' +
        '<form id="wvf" class="form" novalidate><div class="side2">' + field('wdate', 'Date of the survey', '<input id="wdate" type="date" value="' + esc(head.date || '') + '">') +
        field('wnote', 'Classes (no student names)', '<input id="wnote" type="text" maxlength="100" value="' + esc(head.classesNote || '') + '" placeholder="For example: M2/3, M3/1">') + '</div>' +
        '<div class="tablewrap wavegrid"><table class="t"><thead><tr><th>Term</th><th class="num">n</th><th class="num">Recognised</th><th class="num">Not sure</th><th class="num">Comprehended</th><th class="num">Rec. %</th><th class="num">Corrected</th></tr></thead><tbody>' +
        rows.map(function (x) {
          var foil = /^foil/.test(x.termKey);
          var name = /^(ctrl|foil)/.test(x.termKey) ? (x.label + ': ' + x.termText) : (x.label + (x.termText ? ': ' + x.termText : ' (no word yet)'));
          function inp(k, dis) { return '<td class="num"><input type="number" inputmode="numeric" min="0" max="999" data-k="' + k + '" data-t="' + esc(x.termKey) + '" value="' + esc(x[k] == null ? (dis ? 0 : '') : x[k]) + '"' + (dis ? ' readonly aria-readonly="true"' : '') + ' aria-label="' + esc(name + ' ' + k) + '"></td>'; }
          return '<tr data-row="' + esc(x.termKey) + '"><td>' + esc(name) + '<div class="err small" data-err="' + esc(x.termKey) + '"></div></td>' + inp('n') + inp('recognised') + inp('notSure') + inp('comprehended', foil) + '<td class="num" data-pct="' + esc(x.termKey) + '"></td><td class="num" data-cor="' + esc(x.termKey) + '"></td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="muted small">Corrected recognition = recognition % minus the mean recognition % of the two foils. 0 or below means we cannot tell real recognition from guessing.</p>' +
        '<div class="btnrow"><button class="btn" type="button" data-act="save">Save draft</button><button class="btn primary" type="button" data-act="publish">Publish to students</button>' + (published ? '<button class="btn ghost" type="button" data-act="unpublish">Unpublish</button>' : '') + '</div></form>';
      render(h);
      var form = qs('#wvf');
      function collect() {
        return rows.map(function (x) {
          var o = { termKey: x.termKey };
          ['n', 'recognised', 'notSure', 'comprehended'].forEach(function (k) { var i = qs('input[data-k="' + k + '"][data-t="' + x.termKey + '"]', form); o[k] = i.value === '' ? null : Number(i.value); });
          return o;
        });
      }
      function calc() {
        var c = collect().map(function (o) { return Object.assign({ waveId: waveId }, o, { n: o.n || 0, recognised: o.recognised || 0, notSure: o.notSure || 0, comprehended: o.comprehended || 0 }); });
        var res = try_(function () { return E().corrected(c); }, null);
        rows.forEach(function (x) {
          var t = res && res.terms && res.terms[x.termKey];
          qs('[data-pct="' + x.termKey + '"]', form).textContent = t && t.recPct != null ? Math.round(t.recPct) + '%' : '';
          qs('[data-cor="' + x.termKey + '"]', form).textContent = t && t.corrected != null ? Math.round(t.corrected) + '%' : '';
        });
      }
      /* A row left completely empty is not part of this save (a student with no word yet, or a
         wave typed in two sittings). Controls and foils are needed before publishing. */
      function blank(o) { var foil = /^foil/.test(o.termKey); return o.n == null && o.recognised == null && o.notSure == null && (foil || o.comprehended == null); }
      var checked = false, lastPublish = false;
      function check(publish) {
        var ok = true; checked = true; lastPublish = !!publish;
        var all = collect();
        all.forEach(function (o) {
          var m = '';
          var fixed = /^(ctrl|foil)/.test(o.termKey);
          if (blank(o)) m = publish && fixed ? 'Controls and foils are needed before you publish.' : '';
          else if (o.n == null || o.recognised == null || o.notSure == null || o.comprehended == null) m = 'Fill in every box of this row, or leave the whole row empty.';
          else {
            var chk = try_(function () { return E().waveCheck(o); }, null);
            if (chk && !chk.ok) m = chk.message || 'Please check this row.';
            else if (o.n < 1 || o.n > 999) m = 'n is from 1 to 999.';
            else if (o.recognised + o.notSure > o.n) m = 'Recognised plus not sure cannot be more than n.';
            else if (o.comprehended > o.n) m = 'Comprehended cannot be more than n.';
          }
          var e = qs('[data-err="' + o.termKey + '"]', form); e.textContent = m;
          qs('[data-row="' + o.termKey + '"]', form).classList.toggle('invalid', !!m);
          if (m) ok = false;
        });
        var d = qs('#wdate', form).value;
        setErrQuiet('wdate', d ? '' : 'Please choose the date.');
        if (ok && !all.some(function (o) { return !blank(o); })) { ok = false; toast('Enter at least one row first.', 'err'); }
        return ok && !!d;
      }
      function setErrQuiet(id, msg) { var f = qs('[data-f="' + id + '"]', form); if (!f) return; f.classList.toggle('invalid', !!msg); qs('.err', f).textContent = msg || ''; }
      form.addEventListener('input', function () { calc(); if (checked) check(lastPublish); });
      form.addEventListener('change', function () { if (checked) check(lastPublish); });
      calc();
      function send(publish) {
        if (!check(publish)) { toast('Please check the rows marked in red.', 'err'); return; }
        var filled = collect().filter(function (o) { return !blank(o); }).map(function (o) { if (/^foil/.test(o.termKey)) o.comprehended = 0; return o; });
        call('t.wave.save', { waveId: waveId, date: qs('#wdate', form).value, classesNote: qs('#wnote', form).value.trim(), rows: filled, publish: publish }).then(function (x) {
          if (x.ok) { toast(publish ? 'Published. Students can see it now.' : 'Saved as a draft.'); route(); }
          else { var f = x.error && x.error.field; var m = f && /^rows\.([^.]+)\./.exec(f); if (m) { var e = qs('[data-err="' + m[1] + '"]', form); if (e) e.textContent = errMsg(x); } toast(errMsg(x), 'err'); }
        });
      }
      function emptyStudents() { return collect().filter(function (o) { return blank(o) && !/^(ctrl|foil)/.test(o.termKey); }).length; }
      acts({
        save: function () { send(false); },
        publish: function () {
          if (!check(true)) { toast('Please check the rows marked in red.', 'err'); return; }
          var n = emptyStudents();
          confirmBox('Publish Wave ' + waveId.slice(1) + '?', 'Each student will see the results for her own term, the controls and the foils.' + (n ? ' ' + n + (n === 1 ? ' student row is' : ' student rows are') + ' empty: ' + (n === 1 ? 'that student' : 'those students') + ' will see the controls and foils only.' : ''), 'Publish').then(function (y) { if (y) send(true); });
        },
        unpublish: function () { send(false); }
      });
    });
  };

  /* ---------- T-SPOT (R2) ---------- */
  SCREENS.spot = function () {
    if (release() < 2) { render('<div class="screen-head"><h1>Spot checks</h1></div><div class="panel opens"><p>The spot-check queue opens with the audits.</p><p class="when">Opens on ' + esc(fmt('2026-12-02', 'long')) + '</p></div>'); return; }
    render('<div class="screen-head"><h1>Spot checks</h1></div><div class="note">The spot-check screen comes in the next update.</div>');
  };

  /* ---------- T-EXPORT ---------- */
  function parseCsv(text) {
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  function csvCell(v) { v = String(v == null ? '' : v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  SCREENS['export'] = function () {
    getRoster().then(function () {
      var tabs = Object.keys((root.WI_SCHEMA && root.WI_SCHEMA.tabs) || {}).filter(function (t) { return t !== 'Sessions' && t !== 'Log'; });
      render('<div class="screen-head"><h1>CSV export</h1></div><form id="ef" class="form" novalidate>' +
        field('tab', 'Tab', '<select id="tab">' + tabs.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('') + '</select>') +
        field('sid', 'Student', '<select id="sid"><option value="all">All students</option>' + (roster || []).map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.label) + '</option>'; }).join('') + '</select>') +
        '<label class="tickline"><input type="checkbox" id="guests"><span>Include guests</span></label>' +
        '<div class="btnrow"><button class="btn primary" type="button" data-act="go">Download CSV</button></div></form><p class="muted small">The file has a label column added on this computer. Keep the file private.</p>');
      acts({
        go: function () {
          var tab = qs('#tab').value, sid = qs('#sid').value, g = qs('#guests').checked;
          call('t.export', { tab: tab, studentId: sid, includeGuests: g }).then(function (x) {
            if (!x.ok) { toast(errMsg(x), 'err'); return; }
            var rows = parseCsv(x.data.csv || '');
            if (rows.length) {
              var head = rows[0];
              var key = ['studentId', 'authorId', 'termKey', 'auditorId'].map(function (k) { return head.indexOf(k); }).filter(function (i) { return i >= 0; })[0];
              rows = rows.map(function (r, i) { return [i === 0 ? 'label' : (key != null ? labelOf(r[key]) : '')].concat(r); });
              if (key == null) rows = rows.map(function (r) { return r.slice(1); });
            }
            var csv = '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
            var a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
            a.download = 'wordidol-' + tab + '-' + (sid === 'all' ? 'all' : sid) + '-' + now().slice(0, 10) + '.csv';
            document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
            toast((x.data.rows != null ? x.data.rows : rows.length - 1) + ' rows exported.');
          });
        }
      });
    });
  };

  /* ---------- T-SETTINGS ---------- */
  var SLOTS = ['L13-1', 'L13-2', 'L13-3', 'L13-4', 'L14-1', 'L14-2', 'L14-3', 'L14-4'];
  function localInput(iso) { if (!iso) return ''; var t = Date.parse(iso); if (isNaN(t)) return ''; var b = root.WIApi.bkkIso(t); return b.slice(0, 16); }
  SCREENS.settings = function () {
    loading('Loading settings…');
    Promise.all([getRoster(), overview ? Promise.resolve({ ok: true, data: overview }) : loadOverview()]).then(function (res) {
      var cfg = (res[1].ok && res[1].data.config) || {};
      var slots = cfg.summitSlots || {};
      var real = (roster || []).filter(function (s) { return !s.guest; });
      var h = '<div class="screen-head"><h1>Settings</h1></div>';
      h += '<section class="section"><h2>Online unlock time</h2><p class="muted">Students who have ticked all six rules unlock automatically at this time (Bangkok).</p><div class="btnrow"><input id="ooa" type="datetime-local" value="' + esc(localInput(cfg.onlineOpensAt)) + '" style="max-width:280px"><button class="btn" data-act="ooa">Save</button></div></section>';
      h += '<section class="section"><h2>Class board</h2><label class="tickline"><input type="checkbox" id="board"' + (cfg.boardEnabled !== false ? ' checked' : '') + '><span>Show the class XP board to students</span></label><div class="btnrow"><button class="btn" data-act="board">Save</button></div></section>';
      h += '<section class="section"><h2>Summit slots</h2><div class="tablewrap"><table class="t"><tbody>' + real.map(function (s) { return '<tr><td>' + esc(s.label) + '</td><td><select data-slot="' + esc(s.id) + '"><option value="">Not set</option>' + SLOTS.map(function (x) { return '<option' + (slots[s.id] === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></td></tr>'; }).join('') + '</tbody></table></div><div class="btnrow"><button class="btn" data-act="slots">Save slots</button></div></section>';
      h += '<section class="section"><h2>Reset a PIN</h2><div class="btnrow"><select id="pinsid" style="max-width:260px">' + (roster || []).map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.label) + '</option>'; }).join('') + '</select><button class="btn" data-act="pin">Reset PIN</button></div></section>';
      h += '<section class="section"><h2>Weekly job</h2><p class="muted">Runs the Monday job now (roll-over and audits). Last run: ' + esc(fmtTime(cfg.lastWeeklyJob) || 'never') + '.</p><button class="btn" data-act="job">Run weekly job now</button></section>';
      h += '<section class="section"><h2>Remove guest data</h2><p class="muted">Deletes every row and screenshot of Guest#1–Guest#3 and resets them.</p><button class="btn danger" data-act="purge">Purge guests</button></section>';
      h += '<p class="muted small">Release on this site: ' + release() + '. <button class="linkbtn" data-act="logout">Sign out</button></p>';
      render(h);
      function saveCfg(key, value) { return call('t.config.save', { key: key, value: value }).then(function (x) { if (x.ok) { if (overview) overview.config = x.data.config; toast('Saved.'); } else toast(errMsg(x), 'err'); return x; }); }
      acts({
        ooa: function () { var v = qs('#ooa').value; if (!v) { toast('Please choose a date and time.', 'err'); return; } saveCfg('onlineOpensAt', v + ':00+07:00'); },
        board: function () { saveCfg('boardEnabled', qs('#board').checked); },
        slots: function () { var o = {}, used = {}, dup = false; qsa('[data-slot]').forEach(function (s) { if (s.value) { if (used[s.value]) dup = true; used[s.value] = 1; o[s.getAttribute('data-slot')] = s.value; } }); if (dup) { toast('Each slot can hold one talk.', 'err'); return; } saveCfg('summitSlots', o); },
        pin: function () { resetPin(qs('#pinsid').value); },
        job: function (b) { b.disabled = true; call('t.job.run', {}).then(function (x) { b.disabled = false; toast(x.ok ? 'Weekly job done.' : errMsg(x), x.ok ? '' : 'err'); }); },
        purge: function () {
          sheet('Purge guests', '<p>This deletes all guest data and cannot be undone. Type PURGE to confirm.</p>' + field('pc', 'Type PURGE', '<input id="pc" type="text" autocomplete="off">') + '<button class="btn danger" data-act="ok">Purge guests</button>', function (a, b, s) {
            if (a !== 'ok') return;
            if (qs('#pc', s.el).value !== 'PURGE') { setErr(s.el, 'pc', 'Type PURGE in capital letters.'); return; }
            call('t.purgeGuests', { confirm: 'PURGE' }).then(function (x) { if (x.ok) { s.close(); toast('Guest data removed (' + (x.data.deleted || 0) + ' rows).'); } else setErr(s.el, 'pc', errMsg(x)); });
          });
        },
        logout: function () { api.logout().then(function () { go('#/login'); }); }
      });
    });
  };

  /* ---------- boot ---------- */
  function boot() {
    var t = LS.get(root.WIApi.KEYS.theme); if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    document.body.className = 'teacher';
    document.body.innerHTML = '<header class="topbar"><a class="brand" href="#/class">Word<b>Idol</b>&nbsp;<span class="muted small">teacher</span></a><span class="spacer"></span><button class="btn small ghost" id="tout">Sign out</button></header>' +
      '<nav class="tnav" aria-label="Portal">' + TABS.map(function (x) { return '<a href="#/' + x[0] + '" data-t="' + x[0] + '">' + x[1] + '</a>'; }).join('') + '</nav><main id="view" tabindex="-1"></main><div id="toasts" aria-live="polite"></div>';
    view = qs('#view');
    qs('#tout').addEventListener('click', function () { api.logout().then(function () { go('#/login'); }); });
    root.addEventListener('hashchange', route);
    getRoster();
    route();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
