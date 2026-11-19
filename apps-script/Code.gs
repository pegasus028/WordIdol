// WordIdol Apps Script backend — Code.gs
// Owner: W1. SPEC.md v0.2 §7 (Sheet), §8 (API), §5.4 (roll-over), §13.3 (audits), §2.4 (teacher).
// Standalone script: pasted into the editor with Shared.gs (generated, engine + schema + data) and the
// private Roster.gs (ROSTER, TEACHER_PIN, PIN_SALT, EVIDENCE_FOLDER_ID). All time logic is Asia/Bangkok
// with a fixed +07:00 offset; nothing here reads the project's default time zone.
// Never logs a PIN, a token or a payload.

var SHEET_ID = '1ILusw6kHxaCcx6kesjjO9tZ3pc9mr0-tSYvpnK8rEGY';
var WI_SERVER_VERSION = '2026-11-21a';
var TZ_ = 'Asia/Bangkok';
var DAY_MS_ = 86400000;
var REQ_ = null; // per-request context (one execution handles one request)

// ======================================================================= time
function nowMs_() { return Date.now(); } // the only clock read (tests replace this function)
function iso_(ms) { return new Date(ms + 7 * 3600000).toISOString().slice(0, 19) + '+07:00'; }
function nowIso_() { return REQ_ && REQ_.nowIso ? REQ_.nowIso : iso_(nowMs_()); }
function now_() { return REQ_ && REQ_.now ? REQ_.now : nowMs_(); }
function today_() { return nowIso_().slice(0, 10); }
function ms_(x) {
  if (x === null || x === undefined || x === '') return NaN;
  if (typeof x === 'number') return x;
  if (x instanceof Date) return x.getTime();
  var s = String(x);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return Date.parse(s + 'T00:00:00+07:00');
  // A date-time with no zone (a Config cell typed by hand) is Bangkok time, never the project default.
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) return Date.parse(s.replace(' ', 'T') + '+07:00');
  return Date.parse(s);
}
function addDays_(ymd, n) { return iso_(ms_(ymd) + n * DAY_MS_).slice(0, 10); }

// ===================================================================== errors
var MESSAGES_ = {
  AUTH_REQUIRED: 'Please sign in again.',
  AUTH_BAD_PIN: 'That PIN is not right.',
  AUTH_LOCKED: 'Too many tries. Wait 5 minutes.',
  FORBIDDEN: 'You cannot do this.',
  NOT_FOUND: 'We cannot find this.',
  VALIDATION: 'Please check what you typed.',
  LOCKED_ONLINE: 'Online actions open after the L9 safety briefing and the six rules.',
  LIMIT: 'You have reached the limit for this.',
  RATE: 'Too many requests. Wait a minute and try again.',
  BUSY: 'WordIdol is busy. It will try again soon.',
  RELEASE: 'This part of WordIdol opens later.',
  SERVER: 'Something went wrong. Please try again.'
};
function err_(code, message, field, data) {
  var e = new Error(code);
  e.wi = { code: code, message: message || MESSAGES_[code] || MESSAGES_.SERVER };
  if (field) e.wi.field = field;
  if (data) e.wi.data = data;
  return e;
}
function vfail_(field, message) { return err_('VALIDATION', message, field); }

// ==================================================================== helpers
function S_() { return WI_SCHEMA; }
function clone_(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
function has_(o, k) { return o !== null && o !== undefined && Object.prototype.hasOwnProperty.call(o, k); }
function str_(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }
function bool_(v) { return v === true || v === 'TRUE' || v === 'true'; }
function isObj_(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function words_(t) { return S_().countWords(t); }
function hex_(bytes) { var s = ''; for (var i = 0; i < bytes.length; i++) { var b = bytes[i] & 255; s += (b < 16 ? '0' : '') + b.toString(16); } return s; }
function sha256_(s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8); }
function sha256hex_(s) { return hex_(sha256_(s)); }
function b36id_(prefix, seed) {
  var b = sha256_(seed), a = '0123456789abcdefghijklmnopqrstuvwxyz', out = '';
  for (var i = 0; i < 12; i++) out += a.charAt((b[i] & 255) % 36);
  return prefix + '_' + out;
}
function randId_(prefix) { return b36id_(prefix, Utilities.getUuid() + '|' + now_() + '|' + Math.random()); }
// Constant-time string compare (both sides are fixed-length hashes).
function ctEq_(a, b) {
  a = String(a); b = String(b);
  var diff = a.length ^ b.length, n = Math.max(a.length, b.length);
  for (var i = 0; i < n; i++) diff |= (a.charCodeAt(i % (a.length || 1)) || 0) ^ (b.charCodeAt(i % (b.length || 1)) || 0);
  return diff === 0;
}
function shuffle_(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function props_() { return PropertiesService.getScriptProperties(); }

// ===================================================================== roster
function roster_() { return (typeof ROSTER !== 'undefined' && ROSTER) ? ROSTER : []; }
function rosterEntry_(id) { var r = roster_(); for (var i = 0; i < r.length; i++) if (r[i].id === id) return r[i]; return null; }
function isGuest_(id) { var e = rosterEntry_(id); return !!(e && e.guest); }
function labelOf_(id) { var e = rosterEntry_(id); return e ? e.label : ''; }
function studentIds_(withGuests) { return roster_().filter(function (e) { return withGuests || !e.guest; }).map(function (e) { return e.id; }); }

// ================================================================ Sheet layer
function ss_() { if (!REQ_.ss) REQ_.ss = SpreadsheetApp.openById(SHEET_ID); return REQ_.ss; }
function sheet_(tab) {
  var sh = ss_().getSheetByName(tab);
  if (!sh) { sh = createTab_(tab); }
  return sh;
}
function createTab_(tab) {
  var cols = S_().tabs[tab];
  if (!cols) throw err_('SERVER');
  var sh = ss_().insertSheet(tab);
  fitGrid_(sh, 1, cols.length);
  sh.getRange(1, 1, 1, cols.length).setNumberFormat('@').setValues([cols]);
  sh.getRange(1, 1, 1, cols.length).setFontWeight('bold');
  sh.setFrozenRows(1);
  try { sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@'); } catch (e) { /* formatting is a help, not a need */ }
  return sh;
}
// A new sheet is 1000 rows x 26 columns; ranges outside the grid throw, so grow it first.
function fitGrid_(sh, rowNum, ncols) {
  var mc = sh.getMaxColumns();
  if (ncols > mc) sh.insertColumnsAfter(mc, ncols - mc);
  var mr = sh.getMaxRows();
  if (rowNum > mr) sh.insertRowsAfter(mr, Math.max(500, rowNum - mr));
}
function jsonDefault_(t) { return t === 'json[]' ? [] : (t === 'json{}' ? {} : null); }
function colType_(tab, col) { var t = S_().types[tab]; return (t && t[col]) || 'str'; }
function decode_(tab, col, v) {
  var t = colType_(tab, col);
  if (v instanceof Date) v = iso_(v.getTime());
  if (t === 'str') return (v === null || v === undefined) ? '' : String(v);
  if (t === 'bool') return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
  if (t === 'num' || t === 'num?') {
    if (v === '' || v === null || v === undefined) return t === 'num?' ? null : 0;
    var n = Number(v); return isFinite(n) ? n : (t === 'num?' ? null : 0);
  }
  if (t.indexOf('json') === 0) {
    if (v === '' || v === null || v === undefined) return jsonDefault_(t);
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch (e) { return jsonDefault_(t); }
  }
  return v;
}
function encode_(tab, col, v) {
  var t = colType_(tab, col);
  if (t === 'bool') return bool_(v) ? 'TRUE' : 'FALSE';
  if (t === 'num' || t === 'num?') return (v === null || v === undefined || v === '') ? '' : String(Number(v));
  if (t.indexOf('json') === 0) {
    var s = JSON.stringify((v === undefined || v === null) ? jsonDefault_(t) : v);
    if (s === 'null') s = '';
    if (s.length > S_().limits.jsonCell) throw err_('LIMIT', 'This is too long to save.', col);
    return s;
  }
  var out = (v === null || v === undefined) ? '' : String(v);
  if (out.length > 45000) throw err_('LIMIT', 'This is too long to save.', col);
  return out;
}
function table_(tab) {
  if (REQ_.tables[tab]) return REQ_.tables[tab];
  var sh = sheet_(tab);
  var cols = S_().tabs[tab];
  var vals = sh.getDataRange().getValues();
  var header = (vals[0] || []).map(function (h) { return String(h); });
  var pos = cols.map(function (c) { var i = header.indexOf(c); return i; });
  var key = S_().keys[tab];
  var t = { sh: sh, cols: cols, pos: pos, rows: [], rowNum: [], index: {}, next: Math.max(2, vals.length + 1) };
  for (var r = 1; r < vals.length; r++) {
    var raw = vals[r];
    if (!raw.some(function (v) { return v !== '' && v !== null && v !== undefined; })) continue;
    var o = {};
    for (var c = 0; c < cols.length; c++) o[cols[c]] = decode_(tab, cols[c], pos[c] >= 0 ? raw[pos[c]] : '');
    t.rows.push(o); t.rowNum.push(r + 1);
    if (key) t.index[String(o[key])] = t.rows.length - 1;
  }
  t.next = Math.max(t.next, sh.getLastRow() + 1);
  REQ_.tables[tab] = t;
  return t;
}
function blank_(tab, col) {
  var t = colType_(tab, col);
  if (t === 'bool') return false;
  if (t === 'num') return 0;
  if (t === 'num?') return null;
  if (t.indexOf('json') === 0) return jsonDefault_(t);
  return '';
}
function get_(tab, id) { var t = table_(tab); var i = t.index[String(id)]; return i === undefined ? null : clone_(t.rows[i]); }
function all_(tab) { return clone_(table_(tab).rows); }
function where_(tab, col, val) { return table_(tab).rows.filter(function (r) { return r[col] === val; }).map(clone_); }
// Upsert by key column. `obj` may be partial; missing columns keep their stored value (or a blank).
function put_(tab, obj) {
  var t = table_(tab), key = S_().keys[tab], id = String(obj[key]);
  if (!id) throw err_('SERVER');
  var i = t.index[id];
  var old = (i === undefined) ? null : t.rows[i];
  var merged = {};
  t.cols.forEach(function (c) { merged[c] = has_(obj, c) ? obj[c] : (old ? old[c] : blank_(tab, c)); });
  var width = t.cols.length;
  var row = new Array(width);
  // Write in header order (header may have extra / moved columns if edited by hand).
  var enc = t.cols.map(function (c) { return encode_(tab, c, merged[c]); });
  var useHeaderOrder = t.pos.every(function (p, k) { return p === k; });
  var rowNum = (i === undefined) ? t.next : t.rowNum[i];
  var isNew = (i === undefined);
  if (isNew) fitGrid_(t.sh, rowNum, width);
  if (useHeaderOrder) {
    var rg = t.sh.getRange(rowNum, 1, 1, width);
    if (isNew) rg.setNumberFormat('@'); // plain text: no date or formula guessing
    rg.setValues([enc]);
  } else {
    t.cols.forEach(function (c, k) { if (t.pos[k] >= 0) { var r1 = t.sh.getRange(rowNum, t.pos[k] + 1, 1, 1); if (isNew) r1.setNumberFormat('@'); r1.setValues([[enc[k]]]); } });
  }
  var dec = {};
  t.cols.forEach(function (c, k) { dec[c] = decode_(tab, c, enc[k]); });
  if (i === undefined) { t.rows.push(dec); t.rowNum.push(rowNum); t.index[id] = t.rows.length - 1; t.next = rowNum + 1; }
  else t.rows[i] = dec;
  return clone_(dec);
}
// Physically delete rows matching a predicate (purge only). Invalidates the cache of that tab.
function deleteWhere_(tab, pred) {
  var t = table_(tab), nums = [];
  t.rows.forEach(function (r, k) { if (pred(r)) nums.push(t.rowNum[k]); });
  nums.sort(function (a, b) { return b - a; }).forEach(function (n) { t.sh.deleteRow(n); });
  delete REQ_.tables[tab];
  return nums.length;
}
function onlyCols_(tab, o) { var out = {}; S_().tabs[tab].forEach(function (c) { if (has_(o, c)) out[c] = o[c]; }); return out; }

// ===================================================================== config
var CONFIG_DEFAULTS_ = { release: 1, onlineOpensAt: '2026-11-26T16:30:00+07:00', boardEnabled: true, summitSlots: {}, lastWeeklyJob: '' };
function config_() {
  if (REQ_.config) return REQ_.config;
  var c = clone_(CONFIG_DEFAULTS_);
  table_('Config').rows.forEach(function (r) {
    var k = r.key, v = r.value;
    if (k === 'release') { var n = parseInt(v, 10); if (n >= 1 && n <= 3) c.release = n; }
    else if (k === 'boardEnabled') c.boardEnabled = !(v === 'FALSE' || v === 'false' || v === false || v === '0');
    else if (k === 'summitSlots') { try { c.summitSlots = v ? JSON.parse(v) : {}; } catch (e) { c.summitSlots = {}; } }
    else if (k === 'onlineOpensAt') { if (v && isFinite(ms_(v))) c.onlineOpensAt = iso_(ms_(v)); }
    else if (k === 'lastWeeklyJob') c.lastWeeklyJob = String(v || '');
  });
  REQ_.config = c;
  return c;
}
function setConfig_(key, value) {
  var v = (typeof value === 'string') ? value : (typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : JSON.stringify(value));
  put_('Config', { key: key, value: v });
  REQ_.config = null;
}
function studentConfig_(sid) {
  var c = config_();
  var slots = {};
  if (c.summitSlots && c.summitSlots[sid]) slots[sid] = c.summitSlots[sid];
  return { release: c.release, onlineOpensAt: c.onlineOpensAt, boardEnabled: c.boardEnabled, summitSlots: slots };
}

// ======================================================================= lock
function withLock_(fn) {
  if (REQ_.locked) return fn();
  var lock = LockService.getScriptLock();
  try { lock.waitLock(S_().limits.lockMs); } catch (e) { throw err_('BUSY'); }
  REQ_.locked = true;
  try { return fn(); } finally { REQ_.locked = false; try { lock.releaseLock(); } catch (e2) { /* ignore */ } }
}

// =================================================================== sessions
function pinHash_(id, pin) { return sha256hex_(String(PIN_SALT) + '|' + id + '|' + String(pin)); }
function pinOk_(id, pin) {
  var custom = props_().getProperty('pin.' + id);
  var expected;
  if (custom) expected = custom;
  else if (id === 'teacher') expected = pinHash_(id, String(TEACHER_PIN));
  else { var e = rosterEntry_(id); expected = pinHash_(id, e ? String(e.pin) : Utilities.getUuid()); }
  return ctEq_(pinHash_(id, pin), expected);
}
function lockInfo_(id) {
  var raw = props_().getProperty('lock.' + id);
  try { var o = raw ? JSON.parse(raw) : null; if (o && Array.isArray(o.fails)) return o; } catch (e) { /* reset */ }
  return { fails: [], until: 0, locks: 0 };
}
// Lockouts in a row (no quiet day between them). A correct PIN does not reset this: the owner signing
// in must not hand a guesser a fresh set of short lockouts.
function lockStreak_(li, t) {
  var quiet = S_().limits.lockoutEscalateHours * 3600000;
  return (li.locks && li.until && t - li.until < quiet) ? Number(li.locks) || 0 : 0;
}
function clearFails_(id) {
  var li = lockInfo_(id), streak = lockStreak_(li, now_());
  if (!streak) { props_().deleteProperty('lock.' + id); return; }
  props_().setProperty('lock.' + id, JSON.stringify({ fails: [], until: li.until, locks: streak }));
}
function checkLockout_(id) {
  var li = lockInfo_(id);
  if (li.until && li.until > now_()) {
    var mins = Math.ceil((li.until - now_()) / 60000);
    throw err_('AUTH_LOCKED', 'Too many tries. Wait ' + mins + ' minute' + (mins === 1 ? '' : 's') + '.', 'pin', { retryAt: iso_(li.until) });
  }
}
function failPin_(id, isTeacher) {
  var L = S_().limits, li = lockInfo_(id), t = now_();
  li.fails = li.fails.filter(function (x) { return x > t - L.lockoutWindowMin * 60000; });
  li.fails.push(t);
  if (li.fails.length >= L.lockoutTries) {
    // A 4-digit PIN has 10,000 values: with a flat 5-minute lockout a script could try them all in a
    // week. So a student's lockouts double while they keep coming (5, 10, 20 … up to lockoutStudentMaxMin).
    var streak = lockStreak_(li, t);
    var mins = isTeacher ? L.lockoutTeacherMin : Math.min(L.lockoutStudentMaxMin, L.lockoutStudentMin * Math.pow(2, Math.min(streak, 12)));
    li.until = t + mins * 60000; li.fails = []; li.locks = streak + 1;
    props_().setProperty('lock.' + id, JSON.stringify(li));
    // Lead decision 19 Nov: a lockout blocks new sign-ins only. Revoking existing sessions would let
    // anyone with the URL sign a student (or the teacher) out with five wrong PINs.
    throw err_('AUTH_LOCKED', 'Too many tries. Wait ' + mins + ' minutes.', 'pin', { retryAt: iso_(li.until) });
  }
  props_().setProperty('lock.' + id, JSON.stringify(li));
  var left = L.lockoutTries - li.fails.length;
  throw err_('AUTH_BAD_PIN', 'That PIN is not right. Tries left: ' + left + '.', 'pin', { triesLeft: left });
}
function newToken_() { return sha256hex_(Utilities.getUuid() + '|' + Utilities.getUuid() + '|' + now_() + '|' + Math.random()); }
function createSession_(who, role) {
  var token = newToken_();
  var L = S_().limits;
  var exp = role === 'teacher' ? now_() + L.teacherSessionHours * 3600000 : now_() + L.studentSessionDays * DAY_MS_;
  put_('Sessions', { tokenHash: sha256hex_(token), who: who, role: role, createdAt: nowIso_(), expiresAt: iso_(exp), lastSeenAt: nowIso_(), revoked: false });
  return { token: token, expiresAt: iso_(exp) };
}
function revokeSessions_(who) {
  table_('Sessions').rows.filter(function (r) { return r.who === who && !r.revoked; }).forEach(function (r) {
    put_('Sessions', { tokenHash: r.tokenHash, revoked: true });
  });
}
// Resolve a token. Returns {who, role, sid, tokenHash} or throws AUTH_REQUIRED.
function session_(token) {
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) throw err_('AUTH_REQUIRED');
  var h = sha256hex_(token);
  var s = get_('Sessions', h);
  if (!s || s.revoked || !(ms_(s.expiresAt) > now_())) throw err_('AUTH_REQUIRED');
  if (s.role === 'student' && !rosterEntry_(s.who)) throw err_('AUTH_REQUIRED');
  return { who: s.who, role: s.role, sid: s.role === 'student' ? s.who : null, tokenHash: h, session: s };
}
function touchSession_(c) {
  // Sliding expiry for students (30 days from last use); writes at most once an hour, inside the lock.
  if (!c || !c.session || !REQ_.locked) return;
  if (now_() - ms_(c.session.lastSeenAt) < 3600000) return;
  var o = { tokenHash: c.tokenHash, lastSeenAt: nowIso_() };
  if (c.role === 'student') o.expiresAt = iso_(now_() + S_().limits.studentSessionDays * DAY_MS_);
  put_('Sessions', o);
}
function rate_(c) {
  try {
    var cache = CacheService.getScriptCache();
    var k = 'rt.' + c.tokenHash.slice(0, 20) + '.' + Math.floor(now_() / 60000);
    var n = parseInt(cache.get(k) || '0', 10) + 1;
    cache.put(k, String(n), 120);
    if (n > S_().limits.ratePerMinute) throw err_('RATE');
  } catch (e) { if (e.wi) throw e; }
}

// =================================================================== the bundle
var BUNDLE_TABS_ = ['wordHistory:WordHistory', 'plans:Plans', 'planActions:PlanActions', 'checklist:Checklist', 'reviews:Reviews', 'actions:Actions', 'journal:Journal', 'sightings:Sightings', 'tallies:Tallies', 'files:Files', 'waveNotes:WaveNotes', 'requests:Requests', 'flags:Flags', 'feedback:Feedback', 'reports:Reports', 'xpLog:XPLog'];
var AUDIT_VIEW_FIELDS_ = ['id', 'date', 'channelId', 'relation', 'quote', 'context', 'prompted', 'marked', 'topic', 'posUsed', 'derivedForm', 'level', 'link', 'verifiable'];

function defaultState_(sid) {
  return { studentId: sid, weekId: 'W01', stage: 's1', xp: 0, streak: 0, bestStreak: 0, lastReviewWeek: '', reviewsDue: [], rulesTicked: ['', '', '', '', '', ''], onlineUnlocked: false, onlineUnlockedBy: '', onlineUnlockedAt: '', badges: {}, lastActivityAt: '', fileCount: 0, updatedAt: nowIso_() };
}
function visibleWaves_(sid, includeDrafts) {
  return table_('Waves').rows.filter(function (r) {
    if (!includeDrafts && !r.published) return false;
    return r.termKey === sid || S_().enums.termKeyFixed.indexOf(r.termKey) >= 0;
  }).map(clone_);
}
function auditView_(audit) {
  var a = clone_(audit);
  // An expired audit is no longer assigned to her: she keeps the row, not the classmate's sightings.
  var ids = a.status === 'expired' ? [] : (a.sightingIds || []);
  a.sightings = ids.map(function (id) {
    var s = get_('Sightings', id);
    if (!s || s.studentId !== audit.authorId || s.deleted) return null;
    var o = {};
    AUDIT_VIEW_FIELDS_.forEach(function (f) { o[f] = s[f]; });
    o.hasScreenshot = (s.fileIds || []).length > 0;
    return o;
  }).filter(function (x) { return x; });
  return a;
}
// Full data bundle D for one student (server view: full XPLog, internal fields kept).
function loadD_(sid, opts) {
  opts = opts || {};
  var e = rosterEntry_(sid);
  var D = { student: { id: sid, label: e ? e.label : '', guest: !!(e && e.guest) } };
  D.state = get_('State', sid) || defaultState_(sid);
  D.config = opts.teacher ? clone_(config_()) : studentConfig_(sid);
  D.word = get_('Words', sid);
  BUNDLE_TABS_.forEach(function (pair) { var p = pair.split(':'); D[p[0]] = where_(p[1], 'studentId', sid); });
  D.waves = visibleWaves_(sid, !!opts.teacher);
  D.summit = get_('Summit', sid);
  D.article = get_('Article', sid);
  D.audits = {
    mine: table_('Audits').rows.filter(function (a) { return a.auditorId === sid; }).map(auditView_),
    onMe: table_('Audits').rows.filter(function (a) { return a.authorId === sid; }).map(function (a) {
      var o = clone_(a); delete o.auditorId; return o;
    })
  };
  return D;
}
// What a student's client receives: no Drive ids, XPLog last 50.
function publicBundle_(D) {
  var B = clone_(D);
  B.files = (B.files || []).map(function (f) { delete f.driveFileId; return f; });
  B.xpLog = (B.xpLog || []).slice().sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }).slice(0, 50);
  return B;
}

// ================================================================ week roll-over
function writeRows_(rows) {
  (rows || []).forEach(function (r) { put_('Checklist', onlyCols_('Checklist', r)); });
}
// SPEC §5.4. Runs inside the lock. Creates State on first use; rolls week by week to the server's week;
// tops the current week up (buildWeek is idempotent).
function ensureWeek_(sid) {
  if (!REQ_.locked) throw err_('SERVER');
  var now = nowIso_();
  var target = WI.weekIdOf(now);
  var st = get_('State', sid);
  if (!st) {
    st = put_('State', defaultState_(sid));
    var D0 = loadD_(sid);
    writeRows_(WI.buildWeek(D0, 'W01', now));
  }
  var guard = 0;
  while (WI.weekIndex(st.weekId) < WI.weekIndex(target) && guard++ < 14) {
    var D = loadD_(sid);
    var r = WI.rollWeek(D, st.weekId, now) || { close: [], open: [] };
    (r.close || []).forEach(function (c) { put_('Checklist', onlyCols_('Checklist', c)); });
    writeRows_(r.open);
    st = put_('State', { studentId: sid, weekId: WI.nextWeekId(st.weekId) || target, updatedAt: now });
  }
  writeRows_(WI.buildWeek(loadD_(sid), st.weekId, now));
  return st;
}
// After every student write: auto-ticks, XP, badges, streak, stage, reviews due, online gate, State.
// Returns {state, gained}.
function finish_(sid, opts) {
  opts = opts || {};
  var now = nowIso_();
  var st = get_('State', sid);
  if (!st || WI.weekIndex(st.weekId) < WI.weekIndex(WI.weekIdOf(now))) st = ensureWeek_(sid);
  var D = loadD_(sid);
  var patch = { studentId: sid };
  var on = WI.onlineStatus(D, now, config_());
  if (on && on.shouldSetAuto) {
    patch.onlineUnlocked = true; patch.onlineUnlockedBy = 'auto'; patch.onlineUnlockedAt = now;
    D.state.onlineUnlocked = true; D.state.onlineUnlockedBy = 'auto'; D.state.onlineUnlockedAt = now;
  }
  // Top up the current week (choices, plan actions, approvals may add items).
  var extra = WI.buildWeek(D, st.weekId, now) || [];
  if (extra.length) { writeRows_(extra); D = loadD_(sid); applyPatch_(D.state, patch); }
  var ticks = WI.autoTicks(D, undefined, now) || [];
  ticks.forEach(function (t) { put_('Checklist', onlyCols_('Checklist', t)); });
  if (ticks.length) { D = loadD_(sid); applyPatch_(D.state, patch); }
  var gained = [];
  var awards = WI.awards(D, now) || [];
  awards.forEach(function (a) {
    if (get_('XPLog', a.id)) return;
    put_('XPLog', { id: a.id, studentId: sid, at: now, ruleId: a.ruleId, eventKey: a.eventKey, xp: a.xp });
    D.xpLog.push({ id: a.id, studentId: sid, at: now, ruleId: a.ruleId, eventKey: a.eventKey, xp: a.xp });
    gained.push({ ruleId: a.ruleId, xp: a.xp });
  });
  var badges = clone_(D.state.badges || {});
  (WI.newBadges(D, now) || []).forEach(function (b) { if (!badges[b]) { badges[b] = now; gained.push({ ruleId: '', xp: 0, badgeId: b }); } });
  D.state.badges = badges;
  var sk = WI.streak(D, now) || { streak: 0, best: 0 };
  var lastRev = '';
  D.reviews.forEach(function (r) { if (r.weekId > lastRev) lastRev = r.weekId; });
  patch.xp = WI.xpTotal(D.xpLog);
  patch.badges = badges;
  patch.streak = sk.streak || 0;
  patch.bestStreak = Math.max(Number(st.bestStreak) || 0, sk.best || 0, sk.streak || 0);
  patch.lastReviewWeek = lastRev;
  patch.stage = WI.stageOf(D, now);
  patch.reviewsDue = WI.reviewDue(D, now) || [];
  patch.fileCount = D.files.filter(function (f) { return !f.deleted; }).length;
  if (opts.activity) patch.lastActivityAt = now;
  var changed = Object.keys(patch).some(function (k) { return k !== 'studentId' && JSON.stringify(patch[k]) !== JSON.stringify(st[k]); });
  if (!changed) return { state: st, gained: gained };
  patch.updatedAt = now;
  var state = put_('State', patch);
  return { state: state, gained: gained };
}
function applyPatch_(o, p) { Object.keys(p).forEach(function (k) { o[k] = p[k]; }); }

// =================================================================== dispatch
function doGet(e) { return out_(handle_('GET', e)); }
function doPost(e) { return out_(handle_('POST', e)); }
function out_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function handle_(method, e) {
  var t0 = nowMs_();
  REQ_ = { now: t0, nowIso: iso_(t0), tables: {}, config: null, locked: false, ss: null };
  var action = '', who = '', role = '', res, known = true;
  try {
    var body = {};
    if (method === 'GET') {
      action = String((e && e.parameter && e.parameter.action) || '');
    } else {
      var raw = (e && e.postData && typeof e.postData.contents === 'string') ? e.postData.contents : '';
      if (raw.length > S_().limits.bodyBytes) throw err_('LIMIT', 'This is too big to send.');
      try { body = JSON.parse(raw || '{}'); } catch (pe) { throw err_('VALIDATION', 'The request could not be read.'); }
      if (!isObj_(body)) throw err_('VALIDATION', 'The request could not be read.');
      action = String(body.action || '');
    }
    // Own properties only: 'constructor', 'toString' … are not actions.
    var def = has_(S_().actions, action) ? S_().actions[action] : null;
    if (!def || !has_(HANDLERS_, action) || typeof HANDLERS_[action] !== 'function') { known = false; throw err_('NOT_FOUND', 'Unknown action.'); }
    if ((def.method === 'GET') !== (method === 'GET')) throw err_('VALIDATION', method === 'GET' ? 'Use POST for this action.' : 'Use GET for this action.');
    var data = isObj_(body.data) ? body.data : {};
    var c = { role: 'public' };
    if (def.auth !== 'P') {
      c = session_(body.token);
      who = c.who; role = c.role;
      if (def.auth === 'S' && c.role !== 'student') throw err_('FORBIDDEN');
      if (def.auth === 'T' && c.role !== 'teacher') throw err_('FORBIDDEN');
      rate_(c);
    }
    if (def.release && config_().release < def.release) throw err_('RELEASE');
    var result;
    if (def.write) result = withLock_(function () {
      // Everything read before the lock may be stale (another request may have written while this one
      // waited): read again inside the lock, and check the token again (it may have been revoked).
      REQ_.tables = {}; REQ_.config = null;
      if (def.auth !== 'P') {
        c = session_(body.token);
        if ((def.auth === 'S' && c.role !== 'student') || (def.auth === 'T' && c.role !== 'teacher')) throw err_('FORBIDDEN');
      }
      touchSession_(c); return HANDLERS_[action](c, data);
    });
    else result = HANDLERS_[action](c, data);
    if (action === 'login' || action === 't.login') { who = result && result.student ? result.student.id : (action === 't.login' ? 'teacher' : who); role = action === 'login' ? 'student' : 'teacher'; }
    res = { ok: true, now: REQ_.nowIso, weekId: WI.weekIdOf(REQ_.nowIso), data: result || {} };
  } catch (err) {
    var w = err && err.wi ? err.wi : { code: 'SERVER', message: MESSAGES_.SERVER };
    if (!(err && err.wi)) { try { console.error('WordIdol SERVER error in ' + action + ': ' + (err && err.message ? String(err.message).slice(0, 200) : '')); } catch (ce) { /* ignore */ } }
    var errOut = { code: w.code, message: w.message };
    if (w.field) errOut.field = w.field;
    if (w.data) errOut.data = w.data;
    res = { ok: false, now: REQ_.nowIso, error: errOut };
  }
  // Log holds action names only: text from the request never reaches a cell (it could be a formula).
  if (action !== 'ping') logCall_(who, role, known ? action : '(unknown)', res.ok, res.ok ? '' : res.error.code, nowMs_() - t0);
  return res;
}
function logCall_(who, role, action, ok, code, ms) {
  try {
    var sh = sheet_('Log');
    var safe = function (v) { v = String(v || '').slice(0, 40); return /^[A-Za-z0-9_.()#-]*$/.test(v) ? v : '(bad)'; };
    sh.appendRow([iso_(nowMs_()), safe(who), safe(role), safe(action), ok ? 'TRUE' : 'FALSE', safe(code), String(Number(ms) || 0)]);
  } catch (e) { /* logging never breaks a call */ }
}

// ============================================================ validation glue
function vopts_(word) {
  return { today: today_(), word: word, containsWord: function (w, s) { return WI.pos.containsWord(w, s); } };
}
function check_(formKey, data, partial, word) {
  var o = vopts_(word); o.partial = !!partial;
  var r = S_().validate(formKey, data, o);
  if (r) throw vfail_(r.field, r.message);
}
function checkOne_(formKey, field, value, data, word) {
  var spec = S_().fields[formKey][field];
  var o = vopts_(word); o.data = data || {};
  var m = S_().checkField(spec, value, o);
  if (m) throw vfail_(field, m);
}
function trimmed_(obj, allowed) {
  var out = {};
  Object.keys(obj || {}).forEach(function (k) {
    if (allowed && allowed.indexOf(k) < 0) return;
    out[k] = (typeof obj[k] === 'string') ? obj[k].trim() : obj[k];
  });
  return out;
}
function checkFileIds_(sid, ids, max, field) {
  if (ids === undefined) return undefined;
  if (!Array.isArray(ids)) throw vfail_(field || 'fileIds', 'Please check your screenshots.');
  if (ids.length > max) throw err_('LIMIT', 'You can add up to ' + max + ' screenshots here.', field || 'fileIds');
  ids.forEach(function (id) {
    var f = get_('Files', id);
    if (!f || f.studentId !== sid || f.deleted) throw vfail_(field || 'fileIds', 'One of the screenshots cannot be found.');
  });
  return ids.slice();
}
function checkId_(type, id) {
  var p = S_().idPrefix[type];
  if (typeof id !== 'string' || !(new RegExp('^' + p + '_[0-9a-z]{12}$')).test(id)) throw vfail_('id', 'This entry has no valid id.');
}
function phaseOf_(date) { return WI.phaseOf(date); }
function requireRelease_(n) { if (config_().release < n) throw err_('RELEASE'); }
function onlineNow_(D) { return WI.onlineUnlocked(D, nowIso_(), config_()); }
function plan_(D, phase) { for (var i = 0; i < D.plans.length; i++) if (Number(D.plans[i].phase) === Number(phase)) return D.plans[i]; return null; }
function askFirstOk_(D, ideaId) {
  if (S_().askFirst.indexOf(ideaId) < 0) return true;
  return WI.askFirstApproved(D, ideaId);
}

// =================================================================== handlers
var HANDLERS_ = {};

HANDLERS_['ping'] = function () { return { version: WI_SERVER_VERSION }; };

HANDLERS_['roster'] = function () {
  return { students: roster_().map(function (e) { return { id: e.id, label: e.label, guest: !!e.guest }; }) };
};

HANDLERS_['login'] = function (c, d) {
  var id = str_(d.studentId), pin = typeof d.pin === 'string' ? d.pin : String(d.pin === undefined ? '' : d.pin);
  var e = rosterEntry_(id);
  if (!e) throw vfail_('studentId', 'Please choose your name.');
  checkLockout_(id);
  if (!/^[0-9]{4}$/.test(pin) || !pinOk_(id, pin)) failPin_(id, false);
  clearFails_(id);
  var s = createSession_(id, 'student');
  return { token: s.token, expiresAt: s.expiresAt, student: { id: e.id, label: e.label, guest: !!e.guest } };
};

HANDLERS_['t.login'] = function (c, d) {
  var pin = typeof d.pin === 'string' ? d.pin : String(d.pin === undefined ? '' : d.pin);
  checkLockout_('teacher');
  if (!/^[0-9]{6,8}$/.test(pin) || !pinOk_('teacher', pin)) failPin_('teacher', true);
  clearFails_('teacher');
  var s = createSession_('teacher', 'teacher');
  return { token: s.token, expiresAt: s.expiresAt };
};

HANDLERS_['logout'] = function (c) {
  put_('Sessions', { tokenHash: c.tokenHash, revoked: true });
  return {};
};

HANDLERS_['bootstrap'] = function (c) {
  ensureWeek_(c.sid);
  var f = finish_(c.sid);
  var B = publicBundle_(loadD_(c.sid));
  B.state = f.state;
  B.gained = f.gained;
  return B;
};

// ---- sync (offline queue): ops run in order inside one lock; replays return the stored result.
HANDLERS_['sync'] = function (c, d) {
  var ops = d.ops;
  if (!Array.isArray(ops)) throw vfail_('ops', 'Nothing to send.');
  if (ops.length > S_().limits.syncOps) throw err_('LIMIT', 'Too many changes at once.');
  var cache = null; try { cache = CacheService.getScriptCache(); } catch (e) { cache = null; }
  var results = [], gained = [];
  ensureWeek_(c.sid);
  REQ_.inSync = true; REQ_.syncActivity = false;
  try {
  ops.forEach(function (op) {
    var opId = str_(op && op.opId).slice(0, 64);
    var act = String(op && op.action || '');
    var key = opId ? 'op.' + c.sid + '.' + sha256hex_(opId).slice(0, 24) : '';
    var prev = (cache && key) ? cache.get(key) : null;
    if (prev) { try { results.push(JSON.parse(prev)); return; } catch (e) { /* run again */ } }
    var r;
    try {
      var def = has_(S_().actions, act) ? S_().actions[act] : null;
      if (!def || !def.sync || !has_(HANDLERS_, act)) throw err_('VALIDATION', 'This change cannot be sent from the queue.');
      if (def.release && config_().release < def.release) throw err_('RELEASE');
      var out = HANDLERS_[act](c, isObj_(op.data) ? op.data : {});
      if (out && out.gained) gained = gained.concat(out.gained);
      if (out) { delete out.state; delete out.gained; }
      r = { opId: opId, ok: true, data: out || {} };
    } catch (err) {
      if (err && err.wi && (err.wi.code === 'BUSY' || err.wi.code === 'SERVER')) throw err;
      var w = err && err.wi ? err.wi : { code: 'SERVER', message: MESSAGES_.SERVER };
      r = { opId: opId, ok: false, error: { code: w.code, message: w.message } };
      if (w.field) r.error.field = w.field;
      if (w.data) r.error.data = w.data;
    }
    // Only a finished op is remembered. A refusal is not: the client keeps SERVER / RATE ops and sends
    // them again with the same opId, and a remembered failure would block its queue for six hours.
    if (cache && key && r.ok) { try { var s = JSON.stringify(r); if (s.length < 90000) cache.put(key, s, 21600); } catch (e) { /* ignore */ } }
    results.push(r);
  });
  } finally { REQ_.inSync = false; }
  var f = finish_(c.sid, { activity: REQ_.syncActivity });
  return { results: results, state: f.state, gained: gained.concat(f.gained) };
};

// Wrap a student write: run fn, then finish_ (state + gained) unless already inside sync.
function sw_(fn, activity) {
  return function (c, d) {
    var out = fn(c, d) || {};
    if (REQ_.inSync) { if (activity) REQ_.syncActivity = true; return out; } // sync runs finish_ once at the end
    var f = finish_(c.sid, { activity: !!activity });
    out.state = f.state; out.gained = f.gained;
    return out;
  };
}
// Read-only student actions return the current state too.
function sr_(fn) {
  return function (c, d) { var out = fn(c, d) || {}; out.state = get_('State', c.sid) || defaultState_(c.sid); return out; };
}

// ---- word
var WORD_FIRST_ = ['word', 'meaning', 'example1', 'pos', 'posAlso', 'posConfirmed'];
var WORD_CARD_ = ['usageRules', 'forms', 'pronunciation', 'formation', 'sourceWords', 'example2', 'example3', 'doNotUse', 'purpose', 'notRudeConfirmed'];
var WORD_OTHER_ = ['fudge', 'specSheet', 'researchQuestion', 'hypotheses'];

function checkFudgePart_(p, name) {
  if (!isObj_(p)) throw vfail_('fudge', 'Please give a score for each letter.');
  var out = { reasons: {} };
  S_().enums.fudgeKey.forEach(function (k) {
    checkOne_('fudge', 'score', p[k], {}, null);
    out[k] = Number(p[k]);
    var r = str_(p.reasons && p.reasons[k]);
    var m = S_().checkField(S_().fields.fudge.reason, r, { today: today_() });
    if (m) throw vfail_('reasons.' + k, m);
    out.reasons[k] = r;
  });
  out.at = nowIso_();
  return out;
}

HANDLERS_['word.save'] = sw_(function (c, d) {
  var sid = c.sid, f = isObj_(d.fields) ? d.fields : {};
  var allowed = WORD_FIRST_.concat(WORD_CARD_, WORD_OTHER_);
  var inF = trimmed_(f, allowed);
  var old = get_('Words', sid);
  var isNew = !old;
  var w = old || { studentId: sid, createdAt: nowIso_(), regStatus: 'draft' };
  var merged = clone_(w);
  Object.keys(inF).forEach(function (k) { merged[k] = inF[k]; });
  var patch = { studentId: sid, updatedAt: nowIso_() };
  if (isNew) { patch.createdAt = w.createdAt; patch.regStatus = 'draft'; }

  // First-step and word-card fields: limits, required fields not blanked.
  var firstIn = {}, cardIn = {};
  WORD_FIRST_.forEach(function (k) { if (has_(inF, k)) firstIn[k] = inF[k]; });
  WORD_CARD_.forEach(function (k) { if (has_(inF, k)) cardIn[k] = inF[k]; });
  var wordForCheck = has_(inF, 'word') ? inF.word : str_(w.word);
  var firstPartial = {};
  Object.keys(firstIn).forEach(function (k) { if (k !== 'posConfirmed') firstPartial[k] = firstIn[k]; });
  check_('first', firstPartial, true, wordForCheck);
  check_('wordCard', cardIn, true, wordForCheck);
  if (has_(inF, 'posConfirmed') && typeof inF.posConfirmed !== 'boolean') throw vfail_('posConfirmed', 'Please confirm the part of speech.');
  // A new word must still fit the stored first example.
  if (has_(inF, 'word') && !has_(inF, 'example1') && str_(w.example1) && !WI.pos.containsWord(inF.word, w.example1)) throw vfail_('example1', 'Your sentence must use your word.');
  if (merged.posConfirmed === true) {
    check_('first', { word: merged.word, meaning: merged.meaning, example1: merged.example1, pos: merged.pos }, false, merged.word);
  }
  Object.keys(firstIn).forEach(function (k) { patch[k] = firstIn[k]; });
  Object.keys(cardIn).forEach(function (k) { patch[k] = cardIn[k]; });
  if (has_(cardIn, 'forms')) {
    var forms = {};
    Object.keys(cardIn.forms || {}).forEach(function (k) { forms[k] = str_(cardIn.forms[k]); });
    patch.forms = forms;
  }
  // The guess is the server's own (SPEC §3.1); it never overwrites a confirmed pos.
  if (has_(inF, 'word') || has_(inF, 'example1') || (!w.posGuess && merged.word && merged.example1)) {
    if (merged.word && merged.example1) {
      var g = WI.pos.guess(merged.word, merged.example1);
      patch.posGuess = g.pos; patch.posRule = g.rule; patch.posConfidence = g.conf;
    }
  }
  // FUDGE: {pred, mid?, end?}
  if (has_(inF, 'fudge')) {
    if (!isObj_(inF.fudge)) throw vfail_('fudge', 'Please give a score for each letter.');
    var fu = clone_(w.fudge || {}) || {};
    ['pred', 'mid', 'end'].forEach(function (part) { if (has_(inF.fudge, part) && inF.fudge[part] !== null) fu[part] = checkFudgePart_(inF.fudge[part], part); });
    patch.fudge = fu;
  }
  if (has_(inF, 'specSheet')) {
    if (!isObj_(inF.specSheet)) throw vfail_('specSheet', 'Please answer each row.');
    var sp = clone_(w.specSheet || {}) || {};
    Object.keys(inF.specSheet).forEach(function (k) {
      if (!S_().enumHas('specRow', k)) throw vfail_('specSheet', 'Please answer each row.');
      var row = inF.specSheet[k] || {};
      var rr = { result: str_(row.result), note: str_(row.note) };
      var e1 = S_().validate('spec', rr, { today: today_() });
      if (e1) throw vfail_('specSheet.' + k, e1.message);
      sp[k] = rr;
    });
    patch.specSheet = sp;
  }
  if (has_(inF, 'researchQuestion')) { checkOne_('hypotheses', 'researchQuestion', inF.researchQuestion, {}, null); patch.researchQuestion = inF.researchQuestion; }
  if (has_(inF, 'hypotheses')) {
    var hs = inF.hypotheses;
    if (!Array.isArray(hs) || hs.length > S_().limits.hypothesesMax) throw vfail_('hypotheses', 'Write two to four hypotheses.');
    var seen = {};
    patch.hypotheses = hs.map(function (h, i) {
      h = h || {};
      var id = (typeof h.id === 'string' && /^h[1-9]$/.test(h.id)) ? h.id : 'h' + (i + 1);
      if (seen[id]) id = 'h' + (i + 1);
      if (seen[id]) throw vfail_('hypotheses', 'Each hypothesis needs its own number.');
      seen[id] = true;
      var o = { id: id, text: str_(h.text), metric: str_(h.metric), target: str_(h.target) };
      var e2 = S_().validate('hypothesis', o, { today: today_() });
      if (e2) throw vfail_('hypotheses.' + i + '.' + e2.field, e2.message);
      return o;
    });
  }
  // History and re-approval (SPEC §3.4).
  var changed = [];
  ['word', 'meaning', 'pos'].forEach(function (k) {
    if (has_(patch, k) && str_(w[k]) && str_(w[k]) !== str_(patch[k])) changed.push(k);
  });
  if (changed.length && w.regStatus && w.regStatus !== 'draft') {
    changed.forEach(function (k) {
      put_('WordHistory', { id: b36id_('wh', sid + '|' + k + '|' + nowIso_() + '|' + str_(patch[k])), studentId: sid, at: nowIso_(), field: k, oldValue: str_(w[k]), newValue: str_(patch[k]) });
    });
    if (w.regStatus === 'approved') {
      patch.regStatus = 'submitted'; patch.regSubmittedAt = nowIso_();
      var text = 'I changed my ' + changed.join(', ') + '. Please check it again.';
      put_('Requests', { id: b36id_('rq', sid + '|word_change|' + nowIso_()), studentId: sid, createdAt: nowIso_(), type: 'word_change', ideaId: '', text: text, status: 'pending', decidedAt: '', teacherComment: '' });
    }
  }
  return { word: put_('Words', patch) };
});

HANDLERS_['word.zb'] = sw_(function (c, d) {
  var sid = c.sid, z = d.zb;
  if (!isObj_(z)) throw vfail_('zb', 'Please fill in the zero-baseline record.');
  var w = get_('Words', sid);
  var old = (w && w.zb) || {};
  var out = clone_(old) || {};
  if (has_(z, 'checkedAt')) { checkOne_('zb', 'checkedAt', str_(z.checkedAt), {}, null); out.checkedAt = str_(z.checkedAt); }
  if (has_(z, 'statement')) { checkOne_('zb', 'statement', str_(z.statement), {}, null); out.statement = str_(z.statement); }
  if (has_(z, 'places')) {
    if (!Array.isArray(z.places) || z.places.length > 6) throw vfail_('places', 'Please check each place.');
    var seen = {};
    out.places = z.places.map(function (p) {
      var o = { placeId: str_(p && p.placeId), result: str_(p && p.result), note: str_(p && p.note) };
      var e = S_().validate('zbPlace', o, { today: today_() });
      if (e) throw vfail_('places.' + o.placeId + '.' + e.field, e.message);
      if (seen[o.placeId]) throw vfail_('places', 'Each place only once, please.');
      seen[o.placeId] = true;
      return o;
    });
  }
  if (has_(z, 'fileIds')) out.fileIds = checkFileIds_(sid, z.fileIds, S_().limits.filesZb, 'fileIds');
  if (!out.fileIds) out.fileIds = [];
  var patch = { studentId: sid, zb: out, updatedAt: nowIso_() };
  if (!w) { patch.createdAt = nowIso_(); patch.regStatus = 'draft'; }
  return { word: put_('Words', patch) };
});

HANDLERS_['word.submit'] = sw_(function (c) {
  var sid = c.sid, D = loadD_(sid);
  if (!D.word) throw vfail_('card', 'Finish your word card first.');
  if (!WI.checks['word.card'](D)) throw vfail_('card', 'Finish your word card first.');
  if (!WI.checks['word.zb'](D)) throw vfail_('zb', 'Finish your zero-baseline record first.');
  if (D.word.regStatus === 'submitted' || D.word.regStatus === 'approved') return { word: D.word };
  return { word: put_('Words', { studentId: sid, regStatus: 'submitted', regSubmittedAt: nowIso_(), updatedAt: nowIso_() }) };
});

// ---- plan
var PLAN_P1_ = ['targetGroups', 'ideas', 'platforms', 'platformOther', 'route', 'timeBudget', 'who', 'why', 'what', 'spark', 'projectAccount'];
var PLAN_P2_ = ['keep', 'stop', 'start', 'variableChanged', 'p2Hypothesis'];

HANDLERS_['plan.save'] = sw_(function (c, d) {
  var sid = c.sid, phase = Number(d.phase || 1);
  if (phase !== 1 && phase !== 2) throw vfail_('phase', 'Unknown plan.');
  if (phase === 2) requireRelease_(3);
  var f = trimmed_(isObj_(d.fields) ? d.fields : {}, phase === 2 ? PLAN_P1_.concat(PLAN_P2_) : PLAN_P1_);
  var D = loadD_(sid);
  var old = plan_(D, phase);
  var id = sid + '-p' + phase;
  var p1 = {}, p2 = {};
  PLAN_P1_.forEach(function (k) { if (has_(f, k)) p1[k] = f[k]; });
  PLAN_P2_.forEach(function (k) { if (has_(f, k)) p2[k] = f[k]; });
  var merged = clone_(old || {});
  Object.keys(f).forEach(function (k) { merged[k] = f[k]; });
  check_('choices', p1, true, null);
  check_('pivot', p2, true, null);
  if (has_(p1, 'platforms') && p1.platforms.indexOf('pf_inperson') >= 0 && p1.platforms.length > 1) throw vfail_('platforms', '"In person only" cannot go with other platforms.');
  if ((merged.platforms || []).indexOf('pf_other') >= 0 && !str_(merged.platformOther)) throw vfail_('platformOther', 'Please name the other platform.');
  if (has_(p1, 'ideas')) {
    var anyInPerson = p1.ideas.some(function (i) { var m = S_().ideaMode[i]; return m === 'inperson' || m === 'either'; });
    if (!anyInPerson) throw vfail_('ideas', 'Choose at least one in-person idea.');
    p1.ideas.forEach(function (i) { if (!askFirstOk_(D, i)) throw vfail_('ideas', 'Ask T.Chris first. This idea opens when he says yes.'); });
  }
  var row = { id: id, studentId: sid, phase: phase, updatedAt: nowIso_() };
  if (!old) row.createdAt = nowIso_();
  Object.keys(p1).forEach(function (k) { row[k] = p1[k]; });
  Object.keys(p2).forEach(function (k) { row[k] = p2[k]; });
  return { plan: put_('Plans', row) };
});

HANDLERS_['rules.tick'] = sw_(function (c, d) {
  var t = d.ticks;
  if (!Array.isArray(t) || t.length !== 6 || !t.every(function (x) { return x === true; })) throw vfail_('ticks', 'Please tick all six rules.');
  var st = get_('State', c.sid) || defaultState_(c.sid);
  var cur = Array.isArray(st.rulesTicked) ? st.rulesTicked.slice() : [];
  for (var i = 0; i < 6; i++) if (!cur[i]) cur[i] = nowIso_();
  if (!get_('State', c.sid)) put_('State', defaultState_(c.sid));
  put_('State', { studentId: c.sid, rulesTicked: cur.slice(0, 6), updatedAt: nowIso_() });
  return {};
});

// ---- records: action, journal, sighting, tally, planAction, waveNote
var REC_TAB_ = { action: 'Actions', journal: 'Journal', sighting: 'Sightings', tally: 'Tallies', planAction: 'PlanActions', waveNote: 'WaveNotes' };
var REC_FIELDS_ = {
  action: ['date', 'planActionId', 'channelId', 'ideaId', 'what', 'outcome', 'outcomeReason', 'audience', 'reaction', 'learned', 'problem', 'fileIds'],
  journal: ['date', 'kind', 'promptId', 'text', 'fileIds'],
  sighting: ['date', 'channelId', 'relation', 'quote', 'context', 'prompted', 'marked', 'topic', 'posUsed', 'derivedForm', 'level', 'link', 'verifiable', 'fileIds'],
  tally: ['date', 'tallyType', 'count', 'context', 'note'],
  planAction: ['phase', 'where', 'ideaId', 'what', 'why', 'theoryTag', 'whenDate', 'evidence', 'targetGroup'],
  waveNote: ['waveId', 'note', 'hypothesisChecks', 'fileIds']
};

HANDLERS_['rec.save'] = sw_(function (c, d) {
  var sid = c.sid, type = String(d.type || '');
  var tab = has_(REC_TAB_, type) ? REC_TAB_[type] : null;
  if (!tab) throw vfail_('type', 'Unknown entry type.');
  var rec = isObj_(d.record) ? d.record : null;
  if (!rec) throw vfail_('record', 'Nothing to save.');
  var D = loadD_(sid);
  var r = trimmed_(rec, REC_FIELDS_[type]);
  var now = nowIso_();
  var id, old;
  if (type === 'waveNote') {
    if (!S_().enumHas('waveId', r.waveId)) throw vfail_('waveId', 'Unknown wave.');
    id = sid + '|' + r.waveId;
  } else {
    id = rec.id; checkId_(type, id);
  }
  old = get_(tab, id);
  if (old && old.studentId !== sid) throw err_('FORBIDDEN');
  if (old && old.deleted) throw err_('NOT_FOUND', 'This entry was deleted.');
  var row = { id: id, studentId: sid, updatedAt: now };
  if (!old && type !== 'waveNote') { row.createdAt = now; row.deleted = false; }

  if (type === 'action') {
    check_('action', r, false, null);
    if (r.problem !== undefined && typeof r.problem !== 'boolean') throw vfail_('problem', 'Please answer yes or no.');
    if (r.planActionId) {
      var pa = get_('PlanActions', r.planActionId);
      if (!pa || pa.studentId !== sid || pa.deleted) throw vfail_('planActionId', 'That planned action cannot be found.');
    }
    if (r.ideaId && !askFirstOk_(D, r.ideaId)) throw vfail_('ideaId', 'Ask T.Chris first. This idea opens when he says yes.');
    if (WI.lockedOnline('action', r, D, now, config_())) throw err_('LOCKED_ONLINE', 'Online actions open after the L9 safety briefing and the six rules.', 'channelId');
    r.fileIds = checkFileIds_(sid, r.fileIds || [], S_().limits.filesPerEntry, 'fileIds');
    REC_FIELDS_.action.forEach(function (k) { row[k] = has_(r, k) ? r[k] : blank_('Actions', k); });
    if (r.outcome === 'as_planned') row.outcomeReason = '';
    row.problem = r.problem === true;
    row.weekId = WI.weekIdOf(r.date); row.phase = phaseOf_(r.date);
    // Link the planned action (and release an old link if it changed).
    if (old && old.planActionId && old.planActionId !== r.planActionId) {
      var opa = get_('PlanActions', old.planActionId);
      if (opa && opa.studentId === sid && opa.actionId === id) put_('PlanActions', { id: opa.id, status: 'planned', actionId: '', updatedAt: now });
    }
    if (r.planActionId) {
      var st = r.outcome === 'as_planned' ? 'done' : (r.outcome === 'changed' ? 'changed' : 'skipped');
      put_('PlanActions', { id: r.planActionId, status: st, actionId: id, updatedAt: now });
    }
  } else if (type === 'journal') {
    check_('journal', r, false, null);
    r.fileIds = checkFileIds_(sid, r.fileIds || [], S_().limits.filesJournal, 'fileIds');
    REC_FIELDS_.journal.forEach(function (k) { row[k] = has_(r, k) ? r[k] : blank_('Journal', k); });
    row.wordCount = words_(r.text);
    row.weekId = WI.weekIdOf(r.date); row.phase = phaseOf_(r.date);
  } else if (type === 'sighting') {
    if (typeof r.level === 'string' && /^[0-9]$/.test(r.level)) r.level = Number(r.level);
    check_('sighting', r, false, null);
    if (old && ((old.auditStatus && old.auditStatus !== 'none') || (old.spotStatus && old.spotStatus !== 'none'))) throw err_('FORBIDDEN', 'This sighting is being checked, so it cannot be changed now.');
    if (WI.lockedOnline('sighting', r, D, now, config_())) throw err_('LOCKED_ONLINE', 'Your own online use opens after the L9 safety briefing and the six rules.', 'channelId');
    r.fileIds = checkFileIds_(sid, r.fileIds || [], S_().limits.filesPerEntry, 'fileIds');
    REC_FIELDS_.sighting.forEach(function (k) { row[k] = has_(r, k) ? r[k] : blank_('Sightings', k); });
    row.owned = !!WI.owned(r);
    row.weekId = WI.weekIdOf(r.date); row.phase = phaseOf_(r.date);
    if (!old) { row.auditId = ''; row.auditStatus = 'none'; row.spotStatus = 'none'; row.finalLevel = null; }
  } else if (type === 'tally') {
    if (typeof r.count === 'string' && /^[0-9]+$/.test(r.count)) r.count = Number(r.count);
    check_('tally', r, false, null);
    REC_FIELDS_.tally.forEach(function (k) { row[k] = has_(r, k) ? r[k] : blank_('Tallies', k); });
    row.weekId = WI.weekIdOf(r.date);
  } else if (type === 'planAction') {
    var phase = Number(r.phase || (old && old.phase) || 1);
    if (phase !== 1 && phase !== 2) throw vfail_('phase', 'Unknown plan.');
    if (phase === 2) requireRelease_(3);
    check_('planAction', r, false, null);
    var plan = plan_(D, phase);
    if (!plan || !(plan.ideas || []).length) throw vfail_('ideaId', 'Make your choices first.');
    if ((plan.ideas || []).indexOf(r.ideaId) < 0) throw vfail_('ideaId', 'Choose one of your ideas.');
    if (!askFirstOk_(D, r.ideaId)) throw vfail_('ideaId', 'Ask T.Chris first. This idea opens when he says yes.');
    if (r.targetGroup && (plan.targetGroups || []).indexOf(r.targetGroup) < 0) throw vfail_('targetGroup', 'Choose one of your target groups.');
    if (!old) {
      var count = D.planActions.filter(function (p) { return !p.deleted && Number(p.phase) === phase; }).length;
      if (count >= S_().limits.planActionsMax) throw err_('LIMIT', 'Your plan has enough rows.');
    }
    REC_FIELDS_.planAction.forEach(function (k) { row[k] = has_(r, k) ? r[k] : blank_('PlanActions', k); });
    row.phase = phase;
    row.weekId = WI.weekIdOf(r.whenDate);
    if (!old) { row.status = 'planned'; row.actionId = ''; }
  } else if (type === 'waveNote') {
    var published = D.waves.some(function (wv) { return wv.waveId === r.waveId && wv.published; });
    if (!published) throw err_('NOT_FOUND', 'This wave is not published yet.');
    if (has_(r, 'note')) checkOne_('waveNote', 'note', r.note, {}, null);
    var hc = {};
    if (has_(r, 'hypothesisChecks') && r.hypothesisChecks !== null) {
      if (!isObj_(r.hypothesisChecks)) throw vfail_('hypothesisChecks', 'Please check each hypothesis.');
      var hyp = ((D.word && D.word.hypotheses) || []).map(function (h) { return h.id; });
      Object.keys(r.hypothesisChecks).forEach(function (k) {
        var v = r.hypothesisChecks[k];
        if (r.waveId === 'W1') throw vfail_('hypothesisChecks', 'Hypothesis checks start from Wave 2.');
        if (hyp.indexOf(k) < 0 || !S_().enumHas('hypCheck', v)) throw vfail_('hypothesisChecks', 'Please check each hypothesis.');
        hc[k] = v;
      });
      row.hypothesisChecks = hc;
    }
    row.waveId = r.waveId;
    if (has_(r, 'note')) row.note = str_(r.note);
    if (has_(r, 'fileIds')) row.fileIds = checkFileIds_(sid, r.fileIds, S_().limits.filesPerEntry, 'fileIds');
  }
  return { record: put_(tab, row) };
}, true);

HANDLERS_['rec.delete'] = sw_(function (c, d) {
  var type = String(d.type || ''), tab = has_(REC_TAB_, type) ? REC_TAB_[type] : null;
  if (!tab || type === 'waveNote') throw vfail_('type', 'This entry cannot be deleted.');
  var row = get_(tab, d.id);
  if (!row) throw err_('NOT_FOUND');
  if (row.studentId !== c.sid) throw err_('FORBIDDEN');
  if (type === 'sighting' && row.auditStatus && row.auditStatus !== 'none') throw err_('FORBIDDEN', 'This sighting has been audited, so it cannot be deleted.');
  if (row.deleted) return {};
  put_(tab, { id: row.id, deleted: true, updatedAt: nowIso_() });
  if (type === 'action' && row.planActionId) {
    var pa = get_('PlanActions', row.planActionId);
    if (pa && pa.studentId === c.sid && pa.actionId === row.id) put_('PlanActions', { id: pa.id, status: 'planned', actionId: '', updatedAt: nowIso_() });
  }
  return {};
});

// ---- checklist
function ownRow_(c, rowId) {
  if (typeof rowId !== 'string' || rowId.indexOf(c.sid + '|') !== 0) throw err_('FORBIDDEN');
  var row = get_('Checklist', rowId);
  if (!row) throw err_('NOT_FOUND');
  if (row.studentId !== c.sid) throw err_('FORBIDDEN');
  return row;
}

HANDLERS_['checklist.tick'] = sw_(function (c, d) {
  var row = ownRow_(c, d.rowId), now = nowIso_();
  var D = loadD_(c.sid);
  if (d.done === false) {
    if (row.status !== 'done') return { row: row };
    if (!WI.canUntick(row)) throw err_('FORBIDDEN', 'This item ticked itself, so it stays ticked.');
    return { row: put_('Checklist', { id: row.id, status: 'open', doneAt: '', doneBy: '', updatedAt: now }) };
  }
  if (row.status === 'done') return { row: row };
  if (row.status !== 'open' && row.status !== 'cannot') throw vfail_('rowId', 'This item is closed. Look for it in this week.');
  var item = WI.itemDef(row.itemId, D);
  if (item && item.online && !onlineNow_(D)) throw err_('LOCKED_ONLINE', 'Opens after the L9 safety briefing and the six rules.');
  var auto = WI.itemDone(D, row);
  if (auto === false) throw vfail_('rowId', 'This item ticks itself when the work is saved.');
  return { row: put_('Checklist', { id: row.id, status: 'done', doneAt: now, doneBy: auto === true ? 'auto' : 'manual', reason: '', updatedAt: now }) };
}, true);

HANDLERS_['checklist.addOwn'] = sw_(function (c, d) {
  var sid = c.sid, now = nowIso_();
  var cur = WI.weekIdOf(now), nxt = WI.nextWeekId(cur);
  var weekId = String(d.weekId || cur);
  if (weekId !== cur && weekId !== nxt) throw vfail_('weekId', 'You can add items to this week or next week.');
  var title = str_(d.title), dueDate = str_(d.dueDate);
  check_('ownItem', { title: title, dueDate: dueDate }, false, null);
  var lastSunday = WI.weekRange(nxt || cur).sunday, firstDay = WI.weekRange(cur).start;
  if (dueDate && (dueDate < firstDay || dueDate > lastSunday)) throw vfail_('dueDate', 'Choose a date in this week or next week.');
  var itemId = (typeof d.itemId === 'string' && /^O-[0-9a-z]{8}$/.test(d.itemId)) ? d.itemId : 'O-' + WI.hash(sid + '|' + weekId + '|' + title.toLowerCase());
  var rowId = sid + '|' + weekId + '|' + itemId;
  var ex = get_('Checklist', rowId);
  if (ex) return { row: ex };
  var D = loadD_(sid);
  if (WI.ownItemCount(D, weekId) >= S_().limits.ownPerWeek) throw err_('LIMIT', 'You can add up to 5 of your own items a week.');
  return { row: put_('Checklist', { id: rowId, studentId: sid, weekId: weekId, itemId: itemId, title: title, kind: 'own', source: 'own', status: 'open', originWeek: weekId, carryCount: 0, dueDate: dueDate || WI.weekRange(weekId).sunday, doneAt: '', doneBy: '', reason: '', refId: '', createdAt: now, updatedAt: now }) };
}, true);

HANDLERS_['checklist.setStatus'] = sw_(function (c, d) {
  var row = ownRow_(c, d.rowId), status = String(d.status || ''), now = nowIso_();
  if (!S_().enumHas('setStatus', status)) throw vfail_('status', 'Unknown choice.');
  if (row.status === 'carried' || row.status === 'expired') throw vfail_('rowId', 'This item is closed. Look for it in this week.');
  if (row.status === status) return { row: row };
  var ok = WI.canSetStatus(row, status);
  if (ok && ok.ok === false) throw err_(ok.code || 'FORBIDDEN', status === 'dropped' ? 'Required items cannot be dropped. You can carry them or mark them "could not do".' : null);
  if (status === 'cannot') {
    var reason = str_(d.reason);
    checkOne_('cannot', 'reason', reason, {}, null);
    if (row.status === 'done') throw vfail_('status', 'This item is already done.');
    return { row: put_('Checklist', { id: row.id, status: 'cannot', reason: reason, updatedAt: now }) };
  }
  if (status === 'dropped') {
    if (row.kind !== 'optional' && row.kind !== 'own') throw err_('FORBIDDEN', 'Required items cannot be dropped. You can carry them or mark them "could not do".');
    if (row.status === 'done') throw vfail_('status', 'This item is already done.');
    return { row: put_('Checklist', { id: row.id, status: 'dropped', updatedAt: now }) };
  }
  // open (undo "could not do" / "drop")
  if (row.status !== 'cannot' && row.status !== 'dropped') throw vfail_('status', 'This item is already open.');
  return { row: put_('Checklist', { id: row.id, status: 'open', reason: '', updatedAt: now }) };
}, true);

// ---- weekly review (SPEC §5.5)
HANDLERS_['review.submit'] = sw_(function (c, d) {
  var sid = c.sid, now = nowIso_(), weekId = String(d.weekId || '');
  if (!/^W(0[1-9]|1[0-3])$/.test(weekId)) throw vfail_('weekId', 'Unknown week.');
  if (weekId === 'W13') throw vfail_('weekId', 'Week 13 has no weekly review. Write your final reflection instead.');
  if (ms_(WI.reviewOpensAt(weekId)) > now_()) throw vfail_('weekId', 'This review opens on Sunday.');
  var rid = sid + '|' + weekId;
  var D = loadD_(sid);
  var ex = get_('Reviews', rid);
  if (ex) return { review: ex, checklist: D.checklist };
  var due = WI.reviewDue(D, now) || [];
  var quick = d.quick === true && due.length >= 2 && due[0] !== weekId;
  var wentWell = str_(d.wentWell), toChange = str_(d.toChange);
  if (!quick) check_('review', { wentWell: wentWell, toChange: toChange }, false, null);
  else { wentWell = ''; toChange = ''; }
  var decisions = isObj_(d.decisions) ? d.decisions : {};
  var reasons = isObj_(d.reasons) ? d.reasons : {};
  var rows = D.checklist.filter(function (r) { return r.weekId === weekId; });
  var stored = {};
  var apply = [];
  rows.forEach(function (r) {
    if (r.status !== 'open') return;
    var v = quick ? 'carry' : (decisions[r.itemId] || 'carry');
    if (isObj_(v)) { if (v.reason) reasons[r.itemId] = v.reason; v = v.status || v.decision || 'carry'; }
    if (!S_().enumHas('reviewDecision', v)) throw vfail_('decisions', 'Please choose what to do with each item.');
    if (v === 'dropped' && r.kind !== 'optional' && r.kind !== 'own') throw err_('FORBIDDEN', 'Required items cannot be dropped. You can carry them or mark them "could not do".', 'decisions');
    if (v === 'cannot') {
      var reason = str_(reasons[r.itemId]);
      var m = S_().checkField(S_().fields.cannot.reason, reason, { today: today_() });
      if (m) throw vfail_('reasons.' + r.itemId, m);
      apply.push({ id: r.id, status: 'cannot', reason: reason, updatedAt: now });
    } else if (v === 'dropped') apply.push({ id: r.id, status: 'dropped', updatedAt: now });
    stored[r.itemId] = v;
  });
  // nextPrefs {skip:[], own:[{title,dueDate}], moved:[{planActionId,whenDate}]}
  var np = isObj_(d.nextPrefs) ? d.nextPrefs : {};
  var prefs = { skip: [], own: [], moved: [] };
  if (Array.isArray(np.skip)) prefs.skip = np.skip.filter(function (x) { return typeof x === 'string' && x.length <= 40; }).slice(0, 30);
  if (Array.isArray(np.own)) {
    if (np.own.length > S_().limits.ownPerWeek) throw err_('LIMIT', 'You can add up to 5 of your own items a week.', 'nextPrefs.own');
    prefs.own = np.own.map(function (o, i) {
      var it = { title: str_(o && o.title), dueDate: str_(o && o.dueDate) };
      var e = S_().validate('ownItem', it, { today: today_() });
      if (e) throw vfail_('nextPrefs.own.' + i + '.' + e.field, e.message);
      return it;
    });
  }
  if (Array.isArray(np.moved)) {
    prefs.moved = np.moved.slice(0, 40).map(function (m, i) {
      var pa = get_('PlanActions', m && m.planActionId);
      if (!pa || pa.studentId !== sid || pa.deleted) throw vfail_('nextPrefs.moved.' + i, 'That planned action cannot be found.');
      var wd = str_(m.whenDate);
      checkOne_('planAction', 'whenDate', wd, {}, null);
      return { planActionId: pa.id, whenDate: wd };
    });
  }
  apply.forEach(function (a) { put_('Checklist', a); });
  prefs.moved.forEach(function (m) { put_('PlanActions', { id: m.planActionId, whenDate: m.whenDate, weekId: WI.weekIdOf(m.whenDate), updatedAt: now }); });
  // A late review: next week already exists, so apply the skips there now (own items arrive by top-up).
  var nxt = WI.nextWeekId(weekId);
  if (nxt) {
    D.checklist.forEach(function (r) {
      if (r.weekId === nxt && r.status === 'open' && r.kind === 'optional' && prefs.skip.indexOf(r.itemId) >= 0) put_('Checklist', { id: r.id, status: 'dropped', updatedAt: now });
    });
  }
  var D2 = loadD_(sid);
  var cnt = WI.weekCounts(D2, weekId) || {};
  var review = put_('Reviews', { id: rid, studentId: sid, weekId: weekId, submittedAt: now, onTime: !!WI.reviewOnTime(weekId, now), wentWell: wentWell, toChange: toChange, decisions: stored, nextPrefs: prefs, counts: { done: cnt.done || 0, open: cnt.open || 0, carried: cnt.carried || 0, cannot: cnt.cannot || 0 } });
  // Late review: let the next week pick up her own items now.
  if (nxt && WI.weekIndex(nxt) <= WI.weekIndex(WI.weekIdOf(now))) writeRows_(WI.buildWeek(loadD_(sid), nxt, now));
  return { review: review, checklist: where_('Checklist', 'studentId', sid) };
}, true);

// ---- files (SPEC §7 Drive, §8.2 limits)
function folderId_() {
  var id = (typeof EVIDENCE_FOLDER_ID !== 'undefined' && EVIDENCE_FOLDER_ID) ? EVIDENCE_FOLDER_ID : props_().getProperty('evidenceFolderId');
  if (id) return id;
  var f = DriveApp.createFolder('WordIdol Evidence');
  props_().setProperty('evidenceFolderId', f.getId());
  return f.getId();
}
function studentFolder_(sid) {
  var parent = DriveApp.getFolderById(folderId_());
  var label = labelOf_(sid) || sid;
  var it = parent.getFoldersByName(label);
  return it.hasNext() ? it.next() : parent.createFolder(label);
}
function dataUrl_(fileRow) {
  var blob = DriveApp.getFileById(fileRow.driveFileId).getBlob();
  return 'data:image/jpeg;base64,' + Utilities.base64Encode(blob.getBytes());
}

HANDLERS_['file.upload'] = sw_(function (c, d) {
  var sid = c.sid, L = S_().limits, now = nowIso_();
  var meta = { attachType: str_(d.attachType || 'none'), attachId: str_(d.attachId), caption: str_(d.caption), cropConfirmed: d.cropConfirmed === true, width: Number(d.width), height: Number(d.height) };
  if (meta.cropConfirmed !== true) throw vfail_('cropConfirmed', 'Please tick the box: ' + S_().strings.cropTick);
  check_('file', meta, false, null);
  if (meta.attachType === 'none') meta.attachId = '';
  else if (meta.attachType === 'zb') meta.attachId = sid;
  else if (meta.attachType === 'wave') { if (!S_().enumHas('waveId', meta.attachId)) throw vfail_('attachId', 'Unknown wave.'); }
  else {
    var pref = { sighting: 'sg', action: 'ac', journal: 'jn' }[meta.attachType];
    if (!(new RegExp('^' + pref + '_[0-9a-z]{12}$')).test(meta.attachId)) throw vfail_('attachId', 'This screenshot has no entry to belong to.');
    var tab = { sighting: 'Sightings', action: 'Actions', journal: 'Journal' }[meta.attachType];
    var owner = get_(tab, meta.attachId);
    if (owner && owner.studentId !== sid) throw err_('FORBIDDEN');
  }
  var b64 = String(d.dataBase64 || '').replace(/^data:image\/jpeg;base64,/, '').replace(/\s+/g, '');
  if (!b64) throw vfail_('dataBase64', 'Please choose a picture.');
  var bytes;
  try { bytes = Utilities.base64Decode(b64); } catch (e) { throw vfail_('dataBase64', 'This picture could not be read.'); }
  if (bytes.length < 4 || (bytes[0] & 255) !== 0xFF || (bytes[1] & 255) !== 0xD8 || (bytes[2] & 255) !== 0xFF) throw vfail_('dataBase64', 'Please use a JPEG picture.');
  if (bytes.length > L.fileBytes) throw err_('LIMIT', 'This picture is too big. The app makes it smaller; please try again.', 'dataBase64');
  var id = (typeof d.id === 'string' && /^fl_[0-9a-z]{12}$/.test(d.id)) ? d.id : b36id_('fl', sid + '|' + meta.attachType + '|' + meta.attachId + '|' + sha256hex_(b64));
  var ex = get_('Files', id);
  if (ex) { if (ex.studentId !== sid) throw err_('FORBIDDEN'); if (!ex.deleted) { var e1 = clone_(ex); delete e1.driveFileId; return { file: e1 }; } throw err_('NOT_FOUND', 'This screenshot was deleted.'); }
  var mine = where_('Files', 'studentId', sid).filter(function (f) { return !f.deleted; });
  if (mine.length >= L.filesTotal) throw err_('LIMIT', 'You have 80 screenshots. Delete one to add another.');
  // Deleting frees a place, so upload-and-delete in a loop could fill the Drive bin: cap a day's uploads.
  var day = now.slice(0, 10);
  if (where_('Files', 'studentId', sid).filter(function (f) { return String(f.createdAt).slice(0, 10) === day; }).length >= L.uploadsPerDay) throw err_('LIMIT', 'You have added a lot of screenshots today. Please add more tomorrow.');
  var per = meta.attachType === 'zb' ? L.filesZb : (meta.attachType === 'journal' ? L.filesJournal : L.filesPerEntry);
  if (meta.attachType !== 'none' && mine.filter(function (f) { return f.attachType === meta.attachType && f.attachId === meta.attachId; }).length >= per) throw err_('LIMIT', 'You can add up to ' + per + ' screenshots here.');
  var file = studentFolder_(sid).createFile(Utilities.newBlob(bytes, 'image/jpeg', id + '.jpg'));
  if (file.getSharingAccess() !== DriveApp.Access.PRIVATE) {
    try { file.setTrashed(true); } catch (e2) { /* ignore */ }
    throw err_('SERVER');
  }
  var row = put_('Files', { id: id, studentId: sid, createdAt: now, deleted: false, driveFileId: file.getId(), bytes: bytes.length, width: meta.width, height: meta.height, attachType: meta.attachType, attachId: meta.attachId, caption: meta.caption, cropConfirmed: true, inSummit: false, inArticle: false });
  delete row.driveFileId;
  return { file: row };
});

HANDLERS_['file.get'] = sr_(function (c, d) {
  var f = get_('Files', d.id);
  if (!f || f.deleted) throw err_('NOT_FOUND');
  if (f.studentId !== c.sid) throw err_('FORBIDDEN');
  return { id: f.id, dataUrl: dataUrl_(f) };
});

HANDLERS_['file.update'] = sw_(function (c, d) {
  var f = get_('Files', d.id);
  if (!f || f.deleted) throw err_('NOT_FOUND');
  if (f.studentId !== c.sid) throw err_('FORBIDDEN');
  var p = { id: f.id };
  if (has_(d, 'caption')) { checkOne_('file', 'caption', str_(d.caption), {}, null); p.caption = str_(d.caption); }
  if (has_(d, 'inSummit')) {
    if (typeof d.inSummit !== 'boolean') throw vfail_('inSummit', 'Please answer yes or no.');
    if (d.inSummit && !f.inSummit && where_('Files', 'studentId', c.sid).filter(function (x) { return !x.deleted && x.inSummit; }).length >= S_().limits.filesInSummit) throw err_('LIMIT', 'You can use up to 4 screenshots in the Summit Pack.');
    p.inSummit = d.inSummit;
  }
  if (has_(d, 'inArticle')) { if (typeof d.inArticle !== 'boolean') throw vfail_('inArticle', 'Please answer yes or no.'); p.inArticle = d.inArticle; }
  if (has_(d, 'attachType')) {
    var at = str_(d.attachType), aid = str_(d.attachId);
    if (!S_().enumHas('fileAttach', at)) throw vfail_('attachType', 'Unknown entry type.');
    if (at === 'zb') aid = c.sid;
    if (at === 'none') aid = '';
    if (at === 'sighting' || at === 'action' || at === 'journal') {
      var tab = { sighting: 'Sightings', action: 'Actions', journal: 'Journal' }[at];
      var o = get_(tab, aid);
      if (o && o.studentId !== c.sid) throw err_('FORBIDDEN');
      if (!(new RegExp('^' + { sighting: 'sg', action: 'ac', journal: 'jn' }[at] + '_[0-9a-z]{12}$')).test(aid)) throw vfail_('attachId', 'Unknown entry.');
    }
    if (at === 'wave' && !S_().enumHas('waveId', aid)) throw vfail_('attachId', 'Unknown wave.');
    p.attachType = at; p.attachId = aid;
  }
  var row = put_('Files', p); delete row.driveFileId;
  return { file: row };
});

HANDLERS_['file.delete'] = sw_(function (c, d) {
  var f = get_('Files', d.id);
  if (!f) throw err_('NOT_FOUND');
  if (f.studentId !== c.sid) throw err_('FORBIDDEN');
  if (f.deleted) return {};
  put_('Files', { id: f.id, deleted: true, inSummit: false, inArticle: false });
  try { DriveApp.getFileById(f.driveFileId).setTrashed(true); } catch (e) { /* already gone */ }
  return {};
});

// ---- requests, flags, feedback
HANDLERS_['request.create'] = sw_(function (c, d) {
  var sid = c.sid, r = { type: str_(d.type), ideaId: str_(d.ideaId), text: str_(d.text) };
  check_('request', r, false, null);
  if (r.type === 'ask_first' && S_().askFirst.indexOf(r.ideaId) < 0) throw vfail_('ideaId', 'This idea does not need a request.');
  if (r.type === 'word_change') r.ideaId = '';
  var id = (typeof d.id === 'string' && /^rq_[0-9a-z]{12}$/.test(d.id)) ? d.id : b36id_('rq', sid + '|' + r.type + '|' + r.ideaId + '|' + r.text);
  var ex = get_('Requests', id);
  if (ex) { if (ex.studentId !== sid) throw err_('FORBIDDEN'); return { request: ex }; }
  return { request: put_('Requests', { id: id, studentId: sid, createdAt: nowIso_(), type: r.type, ideaId: r.ideaId, text: r.text, status: 'pending', decidedAt: '', teacherComment: '' }) };
});

HANDLERS_['flag.raise'] = sw_(function (c, d) {
  var sid = c.sid, f = { category: str_(d.category), note: str_(d.note), stoppedConfirmed: d.stoppedConfirmed === true ? true : d.stoppedConfirmed };
  check_('flag', f, false, null);
  var id = (typeof d.id === 'string' && /^fg_[0-9a-z]{12}$/.test(d.id)) ? d.id : b36id_('fg', sid + '|' + f.category + '|' + f.note + '|' + today_());
  var ex = get_('Flags', id);
  if (ex) { if (ex.studentId !== sid) throw err_('FORBIDDEN'); return { flag: ex }; }
  return { flag: put_('Flags', { id: id, studentId: sid, createdAt: nowIso_(), category: f.category, note: f.note, stoppedConfirmed: true, status: 'open', handledAt: '', teacherNote: '' }) };
});

HANDLERS_['feedback.read'] = sw_(function (c, d) {
  var f = get_('Feedback', d.id);
  if (!f) throw err_('NOT_FOUND');
  if (f.studentId !== c.sid) throw err_('FORBIDDEN');
  if (f.readAt) return { feedback: f };
  return { feedback: put_('Feedback', { id: f.id, readAt: nowIso_() }) };
});

// ---- report helpers (SPEC §11.8)
HANDLERS_['report.save'] = sw_(function (c, d) {
  var sid = c.sid, type = str_(d.type);
  var T = has_(S_().targets.reports, type) ? S_().targets.reports[type] : null;
  if (!T) throw vfail_('type', 'Unknown report.');
  requireRelease_(T.release);
  var id = sid + '|' + type;
  var old = get_('Reports', id);
  var sections = clone_((old && old.sections) || {}) || {};
  var aiId = S_().targets.aiSectionId;
  if (has_(d, 'sections')) {
    if (!isObj_(d.sections)) throw vfail_('sections', 'Please check your report.');
    Object.keys(d.sections).forEach(function (k) {
      if (T.sections.indexOf(k) < 0 && k !== aiId) throw vfail_('sections', 'Unknown report section.');
      var v = str_(d.sections[k]);
      var m = S_().checkField(S_().fields.reportSection.text, v, { today: today_() });
      if (m) throw vfail_(k, m);
      sections[k] = v;
    });
  }
  var status = has_(d, 'status') ? str_(d.status) : ((old && old.status) || 'draft');
  if (!S_().enumHas('reportStatus', status)) throw vfail_('status', 'Unknown status.');
  var total = 0;
  T.sections.forEach(function (k) { total += words_(sections[k]); });
  if (status === 'ready' || status === 'submitted') {
    T.sections.forEach(function (k) { if (words_(sections[k]) < T.minWords) throw vfail_(k, 'Each part needs at least ' + T.minWords + ' words.'); });
    if (T.total && (total < T.total[0] || total > T.total[1])) throw vfail_('sections', 'Your report needs ' + T.total[0] + '–' + T.total[1] + ' words. Now: ' + total + '.');
    if (words_(sections[aiId]) < S_().targets.aiWords) throw vfail_(aiId, 'Please write your AI-use declaration (at least ' + S_().targets.aiWords + ' words).');
  }
  return { report: put_('Reports', { id: id, studentId: sid, type: type, sections: sections, wordCount: total, status: status, updatedAt: nowIso_() }) };
});

// ---- Summit (R2) and Article (R3) packs: limits only; readiness is the engine's checks.
function checkTextMax_(form, field, v) { var m = S_().checkField(S_().fields[form][field], v, { today: today_() }); if (m) throw vfail_(field, m); }
HANDLERS_['summit.save'] = sw_(function (c, d) {
  var sid = c.sid, p = isObj_(d.patch) ? d.patch : null;
  if (!p) throw vfail_('patch', 'Nothing to save.');
  var old = get_('Summit', sid) || {};
  var row = { studentId: sid, updatedAt: nowIso_() };
  if (has_(p, 'sections')) {
    if (!isObj_(p.sections)) throw vfail_('sections', 'Please check your outline.');
    var secs = clone_(old.sections || {}) || {};
    Object.keys(p.sections).forEach(function (k) {
      if (!S_().enumHas('summitSection', k)) throw vfail_('sections', 'Unknown part of the talk.');
      var s = p.sections[k] || {};
      var o = { notes: str_(s.notes) };
      checkTextMax_('summitSection', 'notes', o.notes);
      if (s.quoteSightingId) { var sg = get_('Sightings', s.quoteSightingId); if (!sg || sg.studentId !== sid) throw vfail_('quoteSightingId', 'That sighting cannot be found.'); o.quoteSightingId = sg.id; }
      secs[k] = o;
    });
    row.sections = secs;
  }
  ['abstract', 'aoaStatement', 'feedbackNotes'].forEach(function (k) { if (has_(p, k)) { checkTextMax_('summit', k, str_(p[k])); row[k] = str_(p[k]); } });
  if (has_(p, 'chartIds')) { if (!Array.isArray(p.chartIds) || !p.chartIds.every(function (x) { return S_().enumHas('chartId', x); })) throw vfail_('chartIds', 'Unknown chart.'); row.chartIds = p.chartIds.filter(function (x, i) { return p.chartIds.indexOf(x) === i; }); }
  if (has_(p, 'fileIds')) row.fileIds = checkFileIds_(sid, p.fileIds, S_().limits.filesInSummit, 'fileIds');
  if (has_(p, 'levelPicks')) {
    if (!isObj_(p.levelPicks)) throw vfail_('levelPicks', 'Please check your examples.');
    var lp = {};
    Object.keys(p.levelPicks).forEach(function (lv) {
      if (!/^[0-6]$/.test(lv)) throw vfail_('levelPicks', 'Unknown level.');
      var sg = get_('Sightings', p.levelPicks[lv]);
      if (!sg || sg.studentId !== sid) throw vfail_('levelPicks', 'That sighting cannot be found.');
      lp[lv] = sg.id;
    });
    row.levelPicks = lp;
  }
  if (has_(p, 'qa')) {
    if (!Array.isArray(p.qa) || p.qa.length > 40) throw vfail_('qa', 'Please check your answers.');
    row.qa = p.qa.map(function (q) { var o = { qId: str_(q && q.qId), answer: str_(q && q.answer) }; var e = S_().validate('qaItem', o, { today: today_() }); if (e) throw vfail_('qa.' + e.field, e.message); return o; });
  }
  if (has_(p, 'selfCheck')) {
    if (!isObj_(p.selfCheck)) throw vfail_('selfCheck', 'Please rate each row.');
    var sc = clone_(old.selfCheck || {}) || {};
    Object.keys(p.selfCheck).forEach(function (k) {
      if (!S_().enumHas('selfCheckRow', k)) throw vfail_('selfCheck', 'Unknown row.');
      var o = { rating: str_(p.selfCheck[k] && p.selfCheck[k].rating), note: str_(p.selfCheck[k] && p.selfCheck[k].note) };
      var e = S_().validate('selfCheck', o, { today: today_() }); if (e) throw vfail_('selfCheck.' + k, e.message);
      sc[k] = o;
    });
    row.selfCheck = sc;
  }
  if (has_(p, 'rehearsals')) {
    if (!Array.isArray(p.rehearsals) || p.rehearsals.length > 30) throw vfail_('rehearsals', 'Please check your rehearsals.');
    row.rehearsals = p.rehearsals.map(function (r) {
      var at = str_(r && r.at);
      if (at && (at.length > 30 || !isFinite(ms_(at)))) throw vfail_('rehearsals', 'Please check your rehearsals.');
      var o = { at: at || nowIso_(), talkSec: Math.round(Number(r && r.talkSec)), qaSec: Math.round(Number(r && r.qaSec) || 0) };
      if (!isFinite(o.talkSec) || o.talkSec < 0 || o.talkSec > 3600 || o.qaSec < 0 || o.qaSec > 3600) throw vfail_('rehearsals', 'Please check your rehearsals.');
      return o;
    });
  }
  return { summit: put_('Summit', row) };
});

HANDLERS_['article.save'] = sw_(function (c, d) {
  var sid = c.sid, p = isObj_(d.patch) ? d.patch : null;
  if (!p) throw vfail_('patch', 'Nothing to save.');
  var old = get_('Article', sid) || {};
  var row = { studentId: sid, updatedAt: nowIso_() };
  ['title', 'keywords', 'abstract', 'ethics', 'aiDeclaration', 'revisionPlan', 'status'].forEach(function (k) { if (has_(p, k)) { checkTextMax_('article', k, str_(p[k])); row[k] = str_(p[k]); } });
  if (has_(p, 'wordCount')) { checkTextMax_('article', 'wordCount', p.wordCount); row.wordCount = Number(p.wordCount) || 0; }
  if (has_(p, 'sections')) {
    if (!isObj_(p.sections)) throw vfail_('sections', 'Please check your notes.');
    var secs = clone_(old.sections || {}) || {};
    Object.keys(p.sections).forEach(function (k) {
      if (!S_().enumHas('articleSection', k)) throw vfail_('sections', 'Unknown section.');
      var o = { notes: str_(p.sections[k] && p.sections[k].notes) };
      checkTextMax_('articleSection', 'notes', o.notes);
      secs[k] = o;
    });
    row.sections = secs;
  }
  if (has_(p, 'sources')) {
    if (!Array.isArray(p.sources) || p.sources.length > 40) throw vfail_('sources', 'Please check your sources.');
    row.sources = p.sources.map(function (s, i) {
      var o = { id: str_(s && s.id).slice(0, 20) || ('src' + (i + 1)), apa: str_(s && s.apa), type: str_(s && s.type), use: str_(s && s.use) };
      var e = S_().validate('source', o, { today: today_() }); if (e) throw vfail_('sources.' + i + '.' + e.field, e.message);
      return o;
    });
  }
  if (has_(p, 'visuals')) {
    if (!Array.isArray(p.visuals) || p.visuals.length > 20) throw vfail_('visuals', 'Please check your visuals.');
    row.visuals = p.visuals.map(function (v, i) {
      var o = { id: str_(v && v.id).slice(0, 20) || ('vis' + (i + 1)), kind: str_(v && v.kind), chartId: str_(v && v.chartId), fileId: str_(v && v.fileId), caption: str_(v && v.caption), figureNo: Number(v && v.figureNo) || (i + 1) };
      var e = S_().validate('visual', o, { today: today_() }); if (e) throw vfail_('visuals.' + i + '.' + e.field, e.message);
      if (o.chartId && !S_().enumHas('chartId', o.chartId)) throw vfail_('visuals.' + i, 'Unknown chart.');
      if (o.fileId) checkFileIds_(sid, [o.fileId], 1, 'visuals.' + i);
      return o;
    });
  }
  if (has_(p, 'peer')) {
    if (!isObj_(p.peer)) throw vfail_('peer', 'Please check your reviewer notes.');
    var pe = { given: [], received: [] };
    (Array.isArray(p.peer.given) ? p.peer.given : []).slice(0, 2).forEach(function (g) {
      var o = { n: Number(g && g.n), authorLabelInitial: str_(g && g.authorLabelInitial).slice(0, 2), notes: str_(g && g.notes) };
      if (o.n !== 1 && o.n !== 2) throw vfail_('peer', 'Reviewer notes are number 1 or 2.');
      checkTextMax_('peerNote', 'notes', o.notes);
      pe.given.push(o);
    });
    (Array.isArray(p.peer.received) ? p.peer.received : []).slice(0, 4).forEach(function (g) {
      var o = { n: Number(g && g.n) || 1, summary: str_(g && g.summary) };
      checkTextMax_('peerNote', 'notes', o.summary);
      pe.received.push(o);
    });
    row.peer = pe;
  }
  return { article: put_('Article', row) };
});

// ---- audits (R2, SPEC §13.3)
HANDLERS_['audit.submit'] = sw_(function (c, d) {
  var sid = c.sid, now = nowIso_();
  var a = get_('Audits', d.auditId);
  if (!a) throw err_('NOT_FOUND');
  if (a.auditorId !== sid) throw err_('FORBIDDEN');
  if (a.status === 'done') return { audit: auditView_(a) };
  if (a.status !== 'assigned' || (a.dueDate && a.dueDate < today_())) throw vfail_('auditId', 'This audit has closed.');
  var v = isObj_(d.verdicts) ? d.verdicts : {};
  var out = {};
  (a.sightingIds || []).forEach(function (sgId) {
    var x = v[sgId];
    if (!isObj_(x)) throw vfail_('verdicts.' + sgId, 'Please give a verdict for each sighting.');
    var o = { verdict: str_(x.verdict), level: (x.level === '' || x.level === undefined || x.level === null) ? '' : Number(x.level), comment: str_(x.comment) };
    var e = S_().validate('auditVerdict', o, { today: today_() });
    if (e) throw vfail_('verdicts.' + sgId + '.' + e.field, e.message);
    if (o.verdict !== 'different') o.level = '';
    out[sgId] = o;
  });
  Object.keys(out).forEach(function (sgId) {
    var sg = get_('Sightings', sgId);
    if (!sg || sg.studentId !== a.authorId) return;
    var st = out[sgId].verdict === 'agree' ? 'agreed' : (out[sgId].verdict === 'different' ? 'disputed' : 'unverifiable');
    put_('Sightings', { id: sgId, auditStatus: st, auditId: a.id, updatedAt: now });
    if (st !== 'agreed') queueSpot_(sg, st, a.weekId);
  });
  var done = put_('Audits', { id: a.id, verdicts: out, status: 'done', doneAt: now });
  return { audit: auditView_(done) };
}, true);

HANDLERS_['board.get'] = sr_(function (c) {
  var cfg = config_();
  if (!cfg.boardEnabled) return { enabled: false, rows: [] };
  var rows = studentIds_(false).map(function (id) {
    var st = get_('State', id);
    return { id: id, label: labelOf_(id), xp: st ? Number(st.xp) || 0 : 0, streak: st ? Number(st.streak) || 0 : 0 };
  });
  var sorted = WI.boardRows(rows.map(function (r) { return { label: r.label, xp: r.xp, streak: r.streak }; })) || rows;
  var myLabel = isGuest_(c.sid) ? null : labelOf_(c.sid);
  return { enabled: true, rows: sorted.map(function (r) { return { label: r.label, rank: typeof r.rank === 'string' ? r.rank : ((r.rank && r.rank.name) || (WI.rankOf(r.xp) || {}).name), xp: r.xp, streak: r.streak, me: r.label === myLabel }; }) };
});

// =============================================================== teacher actions
function teacherSid_(id) {
  var e = rosterEntry_(id);
  if (!e) throw vfail_('studentId', 'Unknown student.');
  return e.id;
}
// Fallback for WI.flags (engine); same rules, SPEC §2.4 T-CLASS.
function weekFlags_(D, now) {
  var flags = [], today = now.slice(0, 10), w = WI.weekIdOf(now);
  if (D.flags.some(function (f) { return f.status === 'open'; })) flags.push('F_PROBLEM');
  var last = D.state.lastActivityAt || '';
  ['actions', 'journal', 'sightings', 'tallies'].forEach(function (k) { D[k].forEach(function (r) { if (r.createdAt > last) last = r.createdAt; }); });
  D.checklist.forEach(function (r) { if (r.status === 'done' && r.doneBy === 'manual' && r.doneAt > last) last = r.doneAt; });
  var base = last || '2026-11-21T00:00:00+07:00';
  if (ms_(now) - ms_(base) >= 7 * DAY_MS_) flags.push('F_QUIET');
  var soon = addDays_(today, 3);
  var lightNow = WI.isLightWeek(w);
  if (D.checklist.some(function (r) { return r.status === 'open' && r.kind === 'required' && r.dueDate >= today && r.dueDate <= soon && !(lightNow && r.source === 'carried'); })) flags.push('F_DEADLINE');
  if ((D.word && D.word.regStatus === 'submitted') || D.requests.some(function (r) { return r.status === 'pending'; })) flags.push('F_PENDING');
  var prev = WI.prevWeekId(w);
  if (D.checklist.some(function (r) { return r.status === 'cannot' && r.kind === 'required' && (r.weekId === w || r.weekId === prev); })) flags.push('F_CANNOT');
  return { flags: flags, lastActivityAt: last };
}

HANDLERS_['t.overview'] = function () {
  var now = nowIso_(), w = WI.weekIdOf(now);
  var rows = roster_().map(function (e) {
    ensureWeek_(e.id);
    var f = finish_(e.id);
    var D = loadD_(e.id, { teacher: true });
    var cnt = WI.weekCounts(D, w) || {};
    var fl = (typeof WI.flags === 'function')
      ? { flags: WI.flags(D, now) || [], lastActivityAt: (typeof WI.lastActivityAt === 'function' ? WI.lastActivityAt(D) : '') || weekFlags_(D, now).lastActivityAt }
      : weekFlags_(D, now);
    var on = WI.onlineStatus(D, now, config_()) || {};
    var sg = D.sightings.filter(function (s) { return !s.deleted; });
    return {
      studentId: e.id, label: e.label, guest: !!e.guest,
      word: D.word ? D.word.word : '', regStatus: D.word ? D.word.regStatus : 'draft',
      stage: f.state.stage, week: { done: cnt.done || 0, open: cnt.open || 0, carried: cnt.carried || 0, cannot: cnt.cannot || 0 },
      lastActivityAt: fl.lastActivityAt, xp: f.state.xp, streak: f.state.streak,
      rulesTicked: (f.state.rulesTicked || []).filter(function (x) { return !!x; }).length,
      online: on.unlocked ? (f.state.onlineUnlockedBy === 'teacher' ? 'teacher' : 'auto') : 'locked',
      sightings: { week: sg.filter(function (s) { return s.weekId === w; }).length, total: sg.length, owned: sg.filter(function (s) { return s.owned; }).length, earned: sg.filter(function (s) { return !s.owned; }).length },
      flags: fl.flags
    };
  });
  rows.sort(function (a, b) {
    var pa = a.flags.indexOf('F_PROBLEM') >= 0 ? 1 : 0, pb = b.flags.indexOf('F_PROBLEM') >= 0 ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return b.flags.length - a.flags.length;
  });
  return {
    rows: rows,
    pending: {
      terms: table_('Words').rows.filter(function (r) { return r.regStatus === 'submitted'; }).length,
      requests: table_('Requests').rows.filter(function (r) { return r.status === 'pending'; }).length,
      flags: table_('Flags').rows.filter(function (r) { return r.status === 'open'; }).length,
      spot: table_('Spot').rows.filter(function (r) { return r.status === 'queued'; }).length
    },
    config: config_()
  };
};

HANDLERS_['t.student'] = function (c, d) {
  var sid = teacherSid_(d.studentId);
  ensureWeek_(sid);
  var f = finish_(sid);
  var D = loadD_(sid, { teacher: true });
  D.state = f.state;
  D.files = D.files.map(function (x) { delete x.driveFileId; return x; });
  D.audits.all = table_('Audits').rows.filter(function (a) { return a.auditorId === sid || a.authorId === sid; }).map(clone_);
  D.spot = table_('Spot').rows.filter(function (s) { return s.authorId === sid; }).map(clone_);
  return D;
};

HANDLERS_['t.feedback'] = function (c, d) {
  var sid = teacherSid_(d.studentId);
  var f = { targetType: str_(d.targetType || 'general'), targetId: str_(d.targetId), text: str_(d.text) };
  check_('tFeedback', f, false, null);
  var id = (typeof d.id === 'string' && /^fb_[0-9a-z]{12}$/.test(d.id)) ? d.id : b36id_('fb', sid + '|' + f.targetType + '|' + f.targetId + '|' + f.text);
  var ex = get_('Feedback', id);
  if (ex) return { feedback: ex };
  return { feedback: put_('Feedback', { id: id, studentId: sid, createdAt: nowIso_(), targetType: f.targetType, targetId: f.targetId, text: f.text, readAt: '' }) };
};

HANDLERS_['t.term'] = function (c, d) {
  var sid = teacherSid_(d.studentId), now = nowIso_();
  var f = { decision: str_(d.decision), comment: str_(d.comment) };
  check_('tTerm', f, false, null);
  var w = get_('Words', sid);
  if (!w || w.regStatus === 'draft') throw vfail_('studentId', 'This word has not been sent for approval.');
  var out = put_('Words', { studentId: sid, regStatus: f.decision, regDecidedAt: now, regComment: f.comment });
  table_('Requests').rows.filter(function (r) { return r.studentId === sid && r.type === 'word_change' && r.status === 'pending'; }).forEach(function (r) {
    put_('Requests', { id: r.id, status: f.decision === 'approved' ? 'approved' : 'declined', decidedAt: now, teacherComment: f.comment });
  });
  finish_(sid);
  return { word: out };
};

HANDLERS_['t.request'] = function (c, d) {
  var r = get_('Requests', d.id);
  if (!r) throw err_('NOT_FOUND');
  var f = { decision: str_(d.decision), comment: str_(d.comment) };
  check_('tRequest', f, false, null);
  var out = put_('Requests', { id: r.id, status: f.decision, decidedAt: nowIso_(), teacherComment: f.comment });
  ensureWeek_(r.studentId);
  finish_(r.studentId);
  return { request: out };
};

HANDLERS_['t.online'] = function (c, d) {
  var sid = teacherSid_(d.studentId);
  if (typeof d.unlocked !== 'boolean') throw vfail_('unlocked', 'Please choose lock or unlock.');
  if (!get_('State', sid)) put_('State', defaultState_(sid));
  put_('State', { studentId: sid, onlineUnlocked: d.unlocked, onlineUnlockedBy: 'teacher', onlineUnlockedAt: nowIso_(), updatedAt: nowIso_() });
  var f = finish_(sid);
  return { state: f.state };
};

HANDLERS_['t.flag'] = function (c, d) {
  var f = get_('Flags', d.id);
  if (!f) throw err_('NOT_FOUND');
  var note = str_(d.teacherNote);
  check_('tFlag', { teacherNote: note }, false, null);
  return { flag: put_('Flags', { id: f.id, status: 'handled', handledAt: nowIso_(), teacherNote: note }) };
};

HANDLERS_['t.spot.list'] = function () {
  var rows = table_('Spot').rows.map(function (s) {
    var o = clone_(s);
    var sg = get_('Sightings', s.sightingId);
    o.authorLabel = labelOf_(s.authorId);
    o.sighting = sg;
    if (sg && sg.auditId) { var a = get_('Audits', sg.auditId); o.auditVerdict = a && a.verdicts ? a.verdicts[sg.id] || null : null; }
    return o;
  });
  rows.sort(function (a, b) { return (a.status === 'queued' ? 0 : 1) - (b.status === 'queued' ? 0 : 1) || String(a.queuedAt).localeCompare(String(b.queuedAt)); });
  return { rows: rows };
};

HANDLERS_['t.spot.submit'] = function (c, d) {
  var sp = get_('Spot', d.id);
  if (!sp) throw err_('NOT_FOUND');
  var f = { verdict: str_(d.verdict), level: (d.level === undefined || d.level === null || d.level === '') ? '' : Number(d.level), comment: str_(d.comment) };
  check_('tSpot', f, false, null);
  var sg = get_('Sightings', sp.sightingId);
  if (!sg) throw err_('NOT_FOUND');
  var fl = f.verdict === 'confirm' ? Number(sg.level) : (f.verdict === 'change' ? f.level : 0);
  var st = f.verdict === 'confirm' ? 'confirmed' : (f.verdict === 'change' ? 'changed' : 'rejected');
  var now = nowIso_();
  var sighting = put_('Sightings', { id: sg.id, spotStatus: st, finalLevel: fl, updatedAt: now });
  var spot = put_('Spot', { id: sp.id, status: 'done', verdict: f.verdict, level: f.verdict === 'change' ? f.level : null, comment: f.comment, doneAt: now });
  return { spot: spot, sighting: sighting };
};

function waveTemplate_(waveId) {
  var rows = [];
  studentIds_(false).forEach(function (id) { var w = get_('Words', id); rows.push({ termKey: id, termText: w ? w.word : '', label: labelOf_(id) }); });
  S_().enums.termKeyFixed.forEach(function (k) { rows.push({ termKey: k, termText: S_().waveTerms[k], label: k.indexOf('ctrl') === 0 ? 'Control' : 'Foil' }); });
  return rows.map(function (r) {
    var ex = get_('Waves', waveId + '|' + r.termKey);
    var o = ex || { id: waveId + '|' + r.termKey, waveId: waveId, termKey: r.termKey, termText: r.termText, n: null, recognised: null, notSure: null, comprehended: null, date: '', classesNote: '', published: false, updatedAt: '' };
    o.label = r.label;
    if (!ex) o.saved = false;
    return o;
  });
}
HANDLERS_['t.wave.get'] = function (c, d) {
  var waveId = str_(d.waveId);
  if (!S_().enumHas('waveId', waveId)) throw vfail_('waveId', 'Unknown wave.');
  return { rows: waveTemplate_(waveId) };
};

HANDLERS_['t.wave.save'] = function (c, d) {
  var waveId = str_(d.waveId), now = nowIso_();
  if (!S_().enumHas('waveId', waveId)) throw vfail_('waveId', 'Unknown wave.');
  var head = { date: str_(d.date), classesNote: str_(d.classesNote) };
  check_('tWave', head, false, null);
  if (!Array.isArray(d.rows) || !d.rows.length) throw vfail_('rows', 'Please enter the results.');
  var allowedKeys = studentIds_(false).concat(S_().enums.termKeyFixed);
  var clean = d.rows.map(function (r, i) {
    var o = { termKey: str_(r && r.termKey), n: num_(r && r.n), recognised: num_(r && r.recognised), notSure: num_(r && r.notSure), comprehended: num_(r && r.comprehended) };
    if (allowedKeys.indexOf(o.termKey) < 0) throw vfail_('rows.' + i + '.termKey', 'This row is not part of the survey.');
    var e = S_().validate('tWaveRow', o, { today: today_() });
    if (e) throw vfail_('rows.' + o.termKey + '.' + e.field, e.message);
    if (o.recognised > o.n) throw vfail_('rows.' + o.termKey + '.recognised', 'This cannot be more than n.');
    if (o.notSure > o.n) throw vfail_('rows.' + o.termKey + '.notSure', 'This cannot be more than n.');
    if (o.recognised + o.notSure > o.n) throw vfail_('rows.' + o.termKey + '.notSure', '"Recognised" plus "not sure" cannot be more than n.');
    if (o.comprehended > o.n) throw vfail_('rows.' + o.termKey + '.comprehended', 'This cannot be more than n.');
    if (o.termKey.indexOf('foil') === 0 && o.comprehended !== 0) throw vfail_('rows.' + o.termKey + '.comprehended', 'Foils have no meaning, so this is 0.');
    return o;
  });
  var publish = d.publish === true;
  clean.forEach(function (o) {
    var termText = S_().waveTerms[o.termKey] || ((get_('Words', o.termKey) || {}).word || '');
    put_('Waves', { id: waveId + '|' + o.termKey, waveId: waveId, termKey: o.termKey, termText: termText, n: o.n, recognised: o.recognised, notSure: o.notSure, comprehended: o.comprehended, date: head.date, classesNote: head.classesNote, published: publish, updatedAt: now });
  });
  // Publishing (or not) applies to every saved row of the wave.
  table_('Waves').rows.filter(function (r) { return r.waveId === waveId && r.published !== publish; }).forEach(function (r) { put_('Waves', { id: r.id, published: publish, updatedAt: now }); });
  return { rows: waveTemplate_(waveId) };
};
function num_(v) { if (typeof v === 'number') return v; if (typeof v === 'string' && /^-?[0-9]+$/.test(v.trim())) return Number(v.trim()); return v; }

HANDLERS_['t.pin'] = function (c, d) {
  var sid = teacherSid_(d.studentId), pin = typeof d.newPin === 'string' ? d.newPin : '';
  check_('tPin', { newPin: pin }, false, null);
  props_().setProperty('pin.' + sid, pinHash_(sid, pin));
  props_().deleteProperty('lock.' + sid);
  revokeSessions_(sid);
  return {};
};

HANDLERS_['t.file'] = function (c, d) {
  var f = get_('Files', d.id);
  if (!f || f.deleted) throw err_('NOT_FOUND');
  return { id: f.id, dataUrl: dataUrl_(f) };
};

function csvCell_(v) {
  var s = (v === null || v === undefined) ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?[0-9.]+$/.test(s)) s = "'" + s; // stop spreadsheet formula injection on open
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}
HANDLERS_['t.export'] = function (c, d) {
  var tab = str_(d.tab);
  if (!S_().tabs[tab]) throw vfail_('tab', 'Unknown tab.');
  if (tab === 'Sessions' || tab === 'Log') throw err_('FORBIDDEN', 'This tab cannot be exported.');
  var who = str_(d.studentId || 'all');
  if (who !== 'all') teacherSid_(who);
  var withGuests = d.includeGuests === true;
  var t = table_(tab), cols = t.cols;
  var own = S_().ownerCol[tab];
  var rows = t.rows.filter(function (r) {
    var ids = [];
    if (tab === 'Audits') ids = [r.auditorId, r.authorId];
    else if (own) ids = [r[own]];
    if (!withGuests && ids.some(function (x) { return isGuest_(x); })) return false;
    if (who !== 'all' && own && ids.indexOf(who) < 0) return false;
    return true;
  });
  var lines = [cols.map(csvCell_).join(',')];
  rows.forEach(function (r) { lines.push(cols.map(function (col) { return csvCell_(encode_(tab, col, r[col])); }).join(',')); });
  return { csv: lines.join('\r\n'), rows: rows.length, tab: tab };
};

HANDLERS_['t.config.save'] = function (c, d) {
  var key = str_(d.key), v = d.value;
  if (key === 'release') { var n = Number(v); if ([1, 2, 3].indexOf(n) < 0) throw vfail_('value', 'Release is 1, 2 or 3.'); setConfig_('release', String(n)); }
  else if (key === 'onlineOpensAt') { if (typeof v !== 'string' || !isFinite(ms_(v))) throw vfail_('value', 'Please give a date and time.'); setConfig_('onlineOpensAt', iso_(ms_(v))); }
  else if (key === 'boardEnabled') { if (typeof v !== 'boolean') throw vfail_('value', 'Please choose on or off.'); setConfig_('boardEnabled', v ? 'TRUE' : 'FALSE'); }
  else if (key === 'summitSlots') {
    if (!isObj_(v)) throw vfail_('value', 'Please check the slots.');
    var used = {};
    Object.keys(v).forEach(function (k) {
      if (!rosterEntry_(k) || !S_().enumHas('summitSlot', v[k])) throw vfail_('value', 'Please check the slots.');
      if (used[v[k]]) throw vfail_('value', 'Each slot can hold one talk.');
      used[v[k]] = true;
    });
    setConfig_('summitSlots', JSON.stringify(v));
  } else throw vfail_('key', 'This setting cannot be changed here.');
  return { config: config_() };
};

HANDLERS_['t.job.run'] = function () { return runWeeklyJob_({ manual: true }); };

HANDLERS_['t.purgeGuests'] = function (c, d) {
  if (d.confirm !== 'PURGE') throw vfail_('confirm', 'Type PURGE to confirm.');
  var guests = studentIds_(true).filter(isGuest_);
  var isG = function (x) { return guests.indexOf(x) >= 0; };
  var deleted = 0;
  // Drive files first (moved to the bin).
  table_('Files').rows.filter(function (f) { return isG(f.studentId); }).forEach(function (f) {
    try { DriveApp.getFileById(f.driveFileId).setTrashed(true); } catch (e) { /* gone */ }
  });
  Object.keys(S_().tabs).forEach(function (tab) {
    if (tab === 'Config') return;
    var own = S_().ownerCol[tab];
    if (tab === 'Audits') deleted += deleteWhere_(tab, function (r) { return isG(r.auditorId) || isG(r.authorId); });
    else if (tab === 'Waves') deleted += deleteWhere_(tab, function (r) { return isG(r.termKey); });
    else if (own) deleted += deleteWhere_(tab, function (r) { return isG(r[own]); });
  });
  guests.forEach(function (g) { props_().deleteProperty('pin.' + g); props_().deleteProperty('lock.' + g); });
  return { deleted: deleted };
};

// ========================================================= weekly job and audits
// Trigger entry point (installTriggers): Mondays 00:10 Asia/Bangkok.
function weeklyJob() {
  var t0 = nowMs_();
  REQ_ = { now: t0, nowIso: iso_(t0), tables: {}, config: null, locked: false, ss: null };
  var ok = true, code = '';
  try { withLock_(function () { runWeeklyJob_({ manual: false }); }); }
  catch (e) { ok = false; code = e && e.wi ? e.wi.code : 'SERVER'; }
  logCall_('job', 'system', 'weeklyJob', ok, code, nowMs_() - t0);
}

function queueSpot_(sg, reason, weekId) {
  var id = b36id_('sp', 'spot|' + sg.id);
  var ex = get_('Spot', id);
  if (ex) return 0;
  put_('Spot', { id: id, sightingId: sg.id, authorId: sg.studentId, weekId: weekId || sg.weekId, reason: reason, queuedAt: nowIso_(), status: 'queued', verdict: '', level: null, comment: '', doneAt: '' });
  put_('Sightings', { id: sg.id, spotStatus: 'queued', updatedAt: nowIso_() });
  return 1;
}

function activeIds_(ids) {
  var cut = now_() - 14 * DAY_MS_;
  return ids.filter(function (id) {
    return table_('Sessions').rows.some(function (s) { return s.who === id && ms_(s.lastSeenAt || s.createdAt) >= cut; });
  });
}
// A random derangement (nobody gets herself), avoiding last round's pairs where possible.
function derange_(ids, avoid) {
  if (ids.length < 2) return null;
  var best = null;
  for (var tries = 0; tries < 60; tries++) {
    var p = shuffle_(ids), ok = true, repeats = 0;
    for (var i = 0; i < ids.length; i++) { if (p[i] === ids[i]) { ok = false; break; } if (avoid[ids[i]] === p[i]) repeats++; }
    if (!ok) continue;
    if (repeats === 0) return p;
    if (!best || repeats < best.r) best = { p: p, r: repeats };
  }
  if (best) return best.p;
  // Deterministic fallback: rotate by one.
  return ids.slice(1).concat(ids[0]);
}

function runWeeklyJob_(opts) {
  opts = opts || {};
  var now = nowIso_(), today = today_();
  var res = { audits: 0, spot: 0, students: 0 };
  roster_().forEach(function (e) { ensureWeek_(e.id); finish_(e.id); res.students++; });
  // Expire audits past their due date; free their sightings.
  table_('Audits').rows.filter(function (a) { return a.status === 'assigned' && a.dueDate && a.dueDate < today; }).forEach(function (a) {
    put_('Audits', { id: a.id, status: 'expired' });
    (a.sightingIds || []).forEach(function (sgId) {
      var sg = get_('Sightings', sgId);
      if (sg && sg.auditId === a.id && sg.auditStatus === 'assigned') put_('Sightings', { id: sg.id, auditStatus: 'none', auditId: '', updatedAt: now });
    });
  });
  if (config_().release >= 2) {
    var r = assignAudits_(opts.manual);
    res.audits = r.audits; res.spot = r.spot;
  }
  setConfig_('lastWeeklyJob', now);
  return res;
}

function assignAudits_(manual) {
  var now = nowIso_(), cur = WI.weekIdOf(now), curIdx = WI.weekIndex(cur);
  var out = { audits: 0, spot: 0 };
  if (table_('Audits').rows.some(function (a) { return a.weekId === cur; })) return out; // this week's round exists
  var sourceWeeks;
  if (manual) {
    sourceWeeks = [];
    for (var i = 1; i <= curIdx; i++) sourceWeeks.push(WI.weekIdAt(i));
  } else {
    var prev = WI.prevWeekId(cur);
    if (['W03', 'W04', 'W07', 'W08', 'W09'].indexOf(prev) < 0) return out;
    sourceWeeks = [prev];
  }
  var due = WI.weekRange(cur).sunday;
  var prevRound = {};
  table_('Audits').rows.forEach(function (a) { if (a.weekId === WI.prevWeekId(cur)) prevRound[a.auditorId] = a.authorId; });
  var groups = [activeIds_(studentIds_(false)), activeIds_(studentIds_(true).filter(isGuest_))];
  var sampled = {};
  groups.forEach(function (ids) {
    var pairs = derange_(ids, prevRound);
    if (!pairs) return;
    ids.forEach(function (auditor, k) {
      var author = pairs[k];
      if (author === auditor) return;
      var cand = table_('Sightings').rows.filter(function (s) { return s.studentId === author && !s.deleted && !s.auditId && sourceWeeks.indexOf(s.weekId) >= 0; });
      if (!cand.length) return;
      var pick = shuffle_(cand).slice(0, 5);
      var id = cur + '|' + auditor;
      put_('Audits', { id: id, weekId: cur, auditorId: auditor, authorId: author, sightingIds: pick.map(function (s) { return s.id; }), assignedAt: now, dueDate: due, status: 'assigned', verdicts: {}, doneAt: '' });
      pick.forEach(function (s) {
        put_('Sightings', { id: s.id, auditId: id, auditStatus: 'assigned', updatedAt: now });
        sampled[s.id] = true;
        // Screenshot-only evidence: the auditor cannot see screenshots (SPEC §13.3 c).
        if ((s.fileIds || []).length && !s.link) out.spot += queueSpot_(s, 'screenshot_only', cur);
      });
      out.audits++;
    });
  });
  // Random 10 % of each author's sightings in the source weeks, rounded up (at least 1 per author with any).
  var byAuthor = {};
  table_('Sightings').rows.forEach(function (s) { if (!s.deleted && sourceWeeks.indexOf(s.weekId) >= 0) (byAuthor[s.studentId] = byAuthor[s.studentId] || []).push(s); });
  Object.keys(byAuthor).forEach(function (a) {
    var list = byAuthor[a];
    var n = Math.ceil(list.length * 0.1);
    shuffle_(list).slice(0, n).forEach(function (s) { out.spot += queueSpot_(get_('Sightings', s.id), 'random', cur); });
  });
  // Auditors get their H-Wnn-5 item now.
  roster_().forEach(function (e) { if (table_('Audits').rows.some(function (a) { return a.auditorId === e.id && a.weekId === cur; })) { writeRows_(WI.buildWeek(loadD_(e.id), cur, now)); } });
  return out;
}

// ================================================================= setup & tools
// Run once by hand in the editor: creates every tab with its header, Config defaults, the Drive folder.
function setup() {
  REQ_ = { now: nowMs_(), nowIso: iso_(nowMs_()), tables: {}, config: null, locked: false, ss: null };
  var ss = ss_();
  var report = { created: [], kept: [], mismatch: [], deleted: [] };
  Object.keys(S_().tabs).forEach(function (tab) {
    var sh = ss.getSheetByName(tab);
    var cols = S_().tabs[tab];
    if (!sh) { createTab_(tab); report.created.push(tab); return; }
    var head = sh.getLastRow() >= 1 ? sh.getRange(1, 1, 1, Math.min(sh.getMaxColumns(), Math.max(cols.length, sh.getLastColumn()))).getValues()[0].map(String) : [];
    if (!head.length || head.every(function (h) { return h === ''; })) {
      fitGrid_(sh, 1, cols.length);
      sh.getRange(1, 1, 1, cols.length).setNumberFormat('@').setValues([cols]);
      sh.setFrozenRows(1);
      try { sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@'); } catch (e) { /* ignore */ }
      report.created.push(tab);
    } else if (cols.some(function (c2, i) { return head[i] !== c2; })) report.mismatch.push(tab);
    else report.kept.push(tab);
  });
  ss.getSheets().forEach(function (sh) {
    if (!S_().tabs[sh.getName()] && sh.getLastRow() === 0 && ss.getSheets().length > 1) { report.deleted.push(sh.getName()); ss.deleteSheet(sh); }
  });
  REQ_.tables = {};
  var have = {};
  table_('Config').rows.forEach(function (r) { have[r.key] = true; });
  if (!have.release) setConfig_('release', '1');
  if (!have.onlineOpensAt) setConfig_('onlineOpensAt', CONFIG_DEFAULTS_.onlineOpensAt);
  if (!have.boardEnabled) setConfig_('boardEnabled', 'TRUE');
  if (!have.summitSlots) setConfig_('summitSlots', '{}');
  if (!have.lastWeeklyJob) setConfig_('lastWeeklyJob', '');
  report.folderId = folderId_();
  Logger.log('WordIdol setup: ' + JSON.stringify(report));
  return report;
}

// Run once by hand: the weekly job, Mondays 00:10 Asia/Bangkok.
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'weeklyJob') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('weeklyJob').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(0).nearMinute(10).inTimezone(TZ_).create();
  Logger.log('WordIdol trigger: weeklyJob, Mondays 00:10 ' + TZ_);
}

// Run once by hand before the first deployment: touches the Sheet and the Drive folder so Google asks
// for the Sheets and Drive permissions. Changes no data. Logs one line of JSON.
function wiSelfTest() {
  REQ_ = { now: nowMs_(), nowIso: iso_(nowMs_()), tables: {}, config: null, locked: false, ss: null };
  var out = { ok: false, version: WI_SERVER_VERSION, at: nowIso_(), bangkokDate: Utilities.formatDate(new Date(nowMs_()), TZ_, 'yyyy-MM-dd') };
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    out.sheet = ss.getName();
    out.tabs = ss.getSheets().length;
    out.folderId = folderId_();
    out.folder = DriveApp.getFolderById(out.folderId).getName();
    out.engine = (typeof WI !== 'undefined' && WI.version) ? WI.version : 'missing';
    out.schema = (typeof WI_SCHEMA !== 'undefined') ? WI_SCHEMA.version : 'missing';
    out.roster = roster_().length;
    out.weekId = (typeof WI !== 'undefined') ? WI.weekIdOf(nowIso_()) : '';
    out.ok = out.engine !== 'missing' && out.schema !== 'missing' && out.roster > 0;
  } catch (e) { out.error = String(e && e.message ? e.message : e).slice(0, 200); }
  Logger.log(JSON.stringify(out));
  return out;
}
