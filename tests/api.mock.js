// WordIdol API test harness: in-memory stubs of the Apps Script services, and a loader that runs
// apps-script/Code.gs (+ Shared.gs, or schema.js + engine.js + data files) and a roster in a Node vm.
// Owner: W1. Used by tests/api.test.js and tools/mock-server.js. No network, no real Google calls.
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var crypto = require('crypto');

var REPO = path.resolve(__dirname, '..');

function signed(buf) { var a = new Array(buf.length); for (var i = 0; i < buf.length; i++) a[i] = buf[i] > 127 ? buf[i] - 256 : buf[i]; return a; }
function unsigned(arr) { return Buffer.from(arr.map(function (b) { return b & 255; })); }

function makeServices(env) {
  // ---------------------------------------------------------- Spreadsheet
  function Range(sheet, r, c, nr, nc) { this.s = sheet; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
  Range.prototype.getValues = function () {
    var out = [];
    for (var i = 0; i < this.nr; i++) {
      var row = this.s._d[this.r - 1 + i] || [];
      var o = [];
      for (var j = 0; j < this.nc; j++) { var v = row[this.c - 1 + j]; o.push(v === undefined || v === null ? '' : v); }
      out.push(o);
    }
    return out;
  };
  Range.prototype.getValue = function () { return this.getValues()[0][0]; };
  Range.prototype.setValues = function (vals) {
    if (vals.length !== this.nr) throw new Error('setValues: row count mismatch');
    for (var i = 0; i < this.nr; i++) {
      if (vals[i].length !== this.nc) throw new Error('setValues: column count mismatch');
      var ri = this.r - 1 + i;
      while (this.s._d.length <= ri) this.s._d.push([]);
      for (var j = 0; j < this.nc; j++) {
        var v = vals[i][j];
        if (typeof v === 'string' && v.length > 50000) throw new Error('Cell over 50000 characters');
        this.s._d[ri][this.c - 1 + j] = v;
      }
    }
    env.writes++;
    return this;
  };
  Range.prototype.setValue = function (v) { return this.setValues([[v]]); };
  Range.prototype.setNumberFormat = function () { return this; };
  Range.prototype.setFontWeight = function () { return this; };
  Range.prototype.clearContent = function () {
    for (var i = 0; i < this.nr; i++) { var row = this.s._d[this.r - 1 + i]; if (row) for (var j = 0; j < this.nc; j++) row[this.c - 1 + j] = ''; }
    return this;
  };

  function Sheet(name) { this._n = name; this._d = []; this._frozen = 0; this._max = 1000; this._maxCols = 26; }
  Sheet.prototype.getName = function () { return this._n; };
  Sheet.prototype.getLastRow = function () {
    for (var i = this._d.length - 1; i >= 0; i--) { var r = this._d[i] || []; if (r.some(function (v) { return v !== '' && v !== undefined && v !== null; })) return i + 1; }
    return 0;
  };
  Sheet.prototype.getLastColumn = function () { var m = 0; this._d.forEach(function (r) { if (r && r.length > m) m = r.length; }); return m; };
  Sheet.prototype.getMaxRows = function () { return Math.max(this._max, this._d.length); };
  Sheet.prototype.getMaxColumns = function () { return this._maxCols; };
  Sheet.prototype.getRange = function (r, c, nr, nc) {
    if (typeof r !== 'number') throw new Error('mock: A1 notation not supported');
    if (r < 1 || c < 1) throw new Error('mock: bad range');
    // Like Google Sheets: a range outside the grid is an error.
    if (r - 1 + (nr || 1) > this.getMaxRows() || c - 1 + (nc || 1) > this._maxCols) throw new Error('The coordinates of the range are outside the dimensions of the sheet.');
    return new Range(this, r, c, nr || 1, nc || 1);
  };
  Sheet.prototype.insertRowsAfter = function (after, n) { this._max = this.getMaxRows() + n; return this; };
  Sheet.prototype.insertColumnsAfter = function (after, n) { this._maxCols += n; return this; };
  Sheet.prototype.getDataRange = function () { return new Range(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); };
  Sheet.prototype.appendRow = function (arr) { var r = this.getLastRow(); while (this._d.length < r) this._d.push([]); this._d.splice(r, 0, arr.slice()); if (r + 1 > this._max) this._max = r + 1; if (arr.length > this._maxCols) this._maxCols = arr.length; env.writes++; return this; };
  Sheet.prototype.setFrozenRows = function (n) { this._frozen = n; return this; };
  Sheet.prototype.getFrozenRows = function () { return this._frozen; };
  Sheet.prototype.deleteRow = function (r) { this._d.splice(r - 1, 1); return this; };
  Sheet.prototype.deleteRows = function (r, n) { this._d.splice(r - 1, n); return this; };
  Sheet.prototype.clear = function () { this._d = []; return this; };
  Sheet.prototype.clearContents = Sheet.prototype.clear;

  function Spreadsheet(id) { this._id = id; this._s = [new Sheet('Sheet1')]; }
  Spreadsheet.prototype.getId = function () { return this._id; };
  Spreadsheet.prototype.getName = function () { return 'WordIdol (mock)'; };
  Spreadsheet.prototype.getSheets = function () { return this._s.slice(); };
  Spreadsheet.prototype.getSheetByName = function (n) { for (var i = 0; i < this._s.length; i++) if (this._s[i]._n === n) return this._s[i]; return null; };
  Spreadsheet.prototype.insertSheet = function (n) { if (this.getSheetByName(n)) throw new Error('Sheet exists: ' + n); var s = new Sheet(n); this._s.push(s); return s; };
  Spreadsheet.prototype.deleteSheet = function (s) { if (this._s.length === 1) throw new Error('Cannot delete the last sheet'); this._s = this._s.filter(function (x) { return x !== s; }); };

  var ss = new Spreadsheet(env.sheetId);
  var SpreadsheetApp = {
    openById: function (id) { env.openedIds.push(id); if (env.sheetId && id !== env.sheetId) throw new Error('mock: unknown spreadsheet ' + id); return ss; },
    getActiveSpreadsheet: function () { throw new Error('mock: getActiveSpreadsheet is not allowed (standalone script)'); },
    flush: function () {}
  };

  // ---------------------------------------------------------------- Drive
  var nextId = 1;
  function mkId(p) { return p + (nextId++).toString(36) + crypto.randomBytes(6).toString('hex'); }
  function Blob(bytes, type, name) { this._b = bytes; this._t = type || 'application/octet-stream'; this._n = name || ''; }
  Blob.prototype.getBytes = function () { return this._b.slice(); };
  Blob.prototype.getContentType = function () { return this._t; };
  Blob.prototype.getName = function () { return this._n; };
  Blob.prototype.setName = function (n) { this._n = n; return this; };
  Blob.prototype.setContentType = function (t) { this._t = t; return this; };
  Blob.prototype.getDataAsString = function () { return unsigned(this._b).toString('utf8'); };
  function Iter(list) { var i = 0; return { hasNext: function () { return i < list.length; }, next: function () { return list[i++]; } }; }
  function DFile(blob, parent) { this._id = mkId('f'); this._blob = blob; this._name = blob.getName(); this._parent = parent; this._trashed = false; this._access = env.defaultAccess; }
  DFile.prototype.getId = function () { return this._id; };
  DFile.prototype.getName = function () { return this._name; };
  DFile.prototype.setName = function (n) { this._name = n; return this; };
  DFile.prototype.getSize = function () { return this._blob._b.length; };
  DFile.prototype.getBlob = function () { return new Blob(this._blob._b.slice(), this._blob._t, this._name); };
  DFile.prototype.getMimeType = function () { return this._blob._t; };
  DFile.prototype.setTrashed = function (t) { this._trashed = !!t; return this; };
  DFile.prototype.isTrashed = function () { return this._trashed; };
  DFile.prototype.getSharingAccess = function () { return this._access; };
  DFile.prototype.setSharing = function (a) { this._access = a; return this; };
  function Folder(name, parent) { this._id = mkId('d'); this._name = name; this._parent = parent; this._trashed = false; drive.folders[this._id] = this; }
  Folder.prototype.getId = function () { return this._id; };
  Folder.prototype.getName = function () { return this._name; };
  Folder.prototype.createFolder = function (n) { return new Folder(n, this); };
  Folder.prototype.getFoldersByName = function (n) { var me = this; return Iter(Object.keys(drive.folders).map(function (k) { return drive.folders[k]; }).filter(function (f) { return f._parent === me && f._name === n && !f._trashed; })); };
  Folder.prototype.getFolders = function () { var me = this; return Iter(Object.keys(drive.folders).map(function (k) { return drive.folders[k]; }).filter(function (f) { return f._parent === me; })); };
  Folder.prototype.createFile = function (blob) { var f = new DFile(blob, this); drive.files[f._id] = f; return f; };
  Folder.prototype.getFiles = function () { var me = this; return Iter(Object.keys(drive.files).map(function (k) { return drive.files[k]; }).filter(function (f) { return f._parent === me; })); };
  Folder.prototype.setTrashed = function (t) { this._trashed = !!t; return this; };
  Folder.prototype.getSharingAccess = function () { return env.defaultAccess; };
  var drive = { folders: {}, files: {} };
  var root = new Folder('My Drive', null);
  var DriveApp = {
    Access: { PRIVATE: 'PRIVATE', ANYONE: 'ANYONE', ANYONE_WITH_LINK: 'ANYONE_WITH_LINK', DOMAIN: 'DOMAIN', DOMAIN_WITH_LINK: 'DOMAIN_WITH_LINK' },
    Permission: { VIEW: 'VIEW', EDIT: 'EDIT', NONE: 'NONE' },
    getRootFolder: function () { return root; },
    createFolder: function (n) { return new Folder(n, root); },
    getFolderById: function (id) { var f = drive.folders[id]; if (!f) throw new Error('No item with the given ID could be found.'); return f; },
    getFileById: function (id) { var f = drive.files[id]; if (!f) throw new Error('No item with the given ID could be found.'); return f; },
    getFoldersByName: function (n) { return root.getFoldersByName(n); }
  };

  // ------------------------------------------------------------ Utilities
  var Utilities = {
    DigestAlgorithm: { SHA_256: 'sha256', MD5: 'md5', SHA_1: 'sha1' },
    Charset: { UTF_8: 'utf8' },
    computeDigest: function (alg, value) {
      var h = crypto.createHash(alg || 'sha256');
      h.update(typeof value === 'string' ? Buffer.from(value, 'utf8') : unsigned(value));
      return signed(h.digest());
    },
    base64Encode: function (v) { return (typeof v === 'string' ? Buffer.from(v, 'utf8') : unsigned(v)).toString('base64'); },
    base64Decode: function (s) {
      if (typeof s !== 'string' || /[^A-Za-z0-9+/=\s]/.test(s)) throw new Error('Could not decode string.');
      return signed(Buffer.from(s, 'base64'));
    },
    newBlob: function (data, type, name) { return new Blob(typeof data === 'string' ? signed(Buffer.from(data, 'utf8')) : data.slice(), type, name); },
    getUuid: function () { return crypto.randomUUID(); },
    sleep: function () {},
    formatDate: function (date, tz, fmt) {
      var off = (tz === 'Asia/Bangkok') ? 7 : 0; // the mock knows only Bangkok and UTC
      var d = new Date(date.getTime() + off * 3600000);
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      var map = { yyyy: String(d.getUTCFullYear()), MM: p(d.getUTCMonth() + 1), dd: p(d.getUTCDate()), HH: p(d.getUTCHours()), mm: p(d.getUTCMinutes()), ss: p(d.getUTCSeconds()), XXX: off ? '+07:00' : 'Z' };
      return fmt.replace(/'T'/g, 'T').replace(/yyyy|MM|dd|HH|mm|ss|XXX/g, function (k) { return map[k]; });
    }
  };

  // ------------------------------------------------- Lock, Properties, Cache
  var LockService = {
    getScriptLock: function () {
      var held = false;
      return {
        waitLock: function (ms) {
          if (env.lockBusy) throw new Error('Lock timeout: another process was holding the lock for too long.');
          // env.onLock = function: one other request that finishes while this one waits for the lock.
          if (typeof env.onLock === 'function') { var f = env.onLock; env.onLock = null; var saved = env.ctx.REQ_; try { f(); } finally { env.ctx.REQ_ = saved; } }
          held = true; env.lockCount++;
        },
        tryLock: function () { if (env.lockBusy) return false; held = true; env.lockCount++; return true; },
        releaseLock: function () { held = false; },
        hasLock: function () { return held; }
      };
    }
  };
  var props = {};
  var scriptProps = {
    getProperty: function (k) { return Object.prototype.hasOwnProperty.call(props, k) ? props[k] : null; },
    setProperty: function (k, v) { props[k] = String(v); return scriptProps; },
    deleteProperty: function (k) { delete props[k]; return scriptProps; },
    getProperties: function () { return Object.assign({}, props); },
    getKeys: function () { return Object.keys(props); },
    setProperties: function (o) { Object.keys(o).forEach(function (k) { props[k] = String(o[k]); }); return scriptProps; }
  };
  var PropertiesService = { getScriptProperties: function () { return scriptProps; } };
  var cache = {};
  var scriptCache = {
    get: function (k) { var e = cache[k]; if (!e) return null; if (e.exp < env.clock()) { delete cache[k]; return null; } return e.v; },
    put: function (k, v, sec) { cache[k] = { v: String(v), exp: env.clock() + 1000 * (sec || 600) }; },
    remove: function (k) { delete cache[k]; },
    getAll: function (ks) { var o = {}; ks.forEach(function (k) { var v = scriptCache.get(k); if (v !== null) o[k] = v; }); return o; },
    putAll: function (o, sec) { Object.keys(o).forEach(function (k) { scriptCache.put(k, o[k], sec); }); }
  };
  var CacheService = { getScriptCache: function () { return scriptCache; } };

  // ------------------------------------------------- Content, Session, Script
  var ContentService = {
    MimeType: { JSON: 'application/json', TEXT: 'text/plain' },
    createTextOutput: function (s) { var o = { _s: String(s), _m: 'text/plain' }; o.setMimeType = function (m) { o._m = m; return o; }; o.getContent = function () { return o._s; }; o.getMimeType = function () { return o._m; }; return o; }
  };
  var Session = { getScriptTimeZone: function () { return 'Etc/UTC'; } }; // deliberately not Bangkok: code must pass the zone itself
  var triggers = [];
  var ScriptApp = {
    WeekDay: { MONDAY: 'MONDAY', TUESDAY: 'TUESDAY', SUNDAY: 'SUNDAY' },
    getProjectTriggers: function () { return triggers.slice(); },
    deleteTrigger: function (t) { triggers = triggers.filter(function (x) { return x !== t; }); },
    newTrigger: function (fn) {
      var t = { fn: fn, getHandlerFunction: function () { return fn; } };
      var b = {
        timeBased: function () { return b; },
        onWeekDay: function (d) { t.day = d; return b; },
        atHour: function (h) { t.hour = h; return b; },
        nearMinute: function (m) { t.minute = m; return b; },
        inTimezone: function (z) { t.tz = z; return b; },
        everyWeeks: function () { return b; },
        create: function () { triggers.push(t); return t; }
      };
      return b;
    }
  };
  var logs = [];
  var Logger = { log: function () { logs.push(Array.prototype.slice.call(arguments).join(' ')); } };

  return {
    SpreadsheetApp: SpreadsheetApp, DriveApp: DriveApp, Utilities: Utilities, LockService: LockService,
    PropertiesService: PropertiesService, CacheService: CacheService, ContentService: ContentService,
    Session: Session, ScriptApp: ScriptApp, Logger: Logger,
    _ss: ss, _drive: drive, _props: props, _cache: cache, _logs: logs, _triggers: function () { return triggers; }
  };
}

// Engine sources: Shared.gs if present and newer than every source, else the individual files.
function engineFiles(opts) {
  var shared = path.join(REPO, 'apps-script', 'Shared.gs');
  var list = ['schema.js', 'data/plan.js', 'data/choices.js', 'data/rules.js', 'data/game.js', 'data/checklist.js', 'data/coverage.js', 'data/pool.js', 'data/why.js', 'engine.js'];
  if (!opts.useSources && fs.existsSync(shared)) {
    var st = fs.statSync(shared).mtimeMs;
    var newer = list.some(function (f) { var p = path.join(REPO, f); return fs.existsSync(p) && fs.statSync(p).mtimeMs > st + 1; });
    if (!newer && !opts.forceSources) return [shared];
  }
  var files = list.map(function (f) { return path.join(REPO, f); }).filter(function (p) { return fs.existsSync(p); });
  if (opts.engineStub && !fs.existsSync(path.join(REPO, 'engine.js'))) files.push(opts.engineStub);
  return files;
}

// createEnv({start:'2026-11-21T09:00:00+07:00', roster:'path', useSources:bool}) → env
function createEnv(opts) {
  opts = opts || {};
  var env = {
    sheetId: '1ILusw6kHxaCcx6kesjjO9tZ3pc9mr0-tSYvpnK8rEGY',
    openedIds: [], writes: 0, lockCount: 0, lockBusy: false, onLock: null,
    defaultAccess: 'PRIVATE',
    t: opts.start ? Date.parse(opts.start) : Date.parse('2026-11-21T09:00:00+07:00')
  };
  env.clock = function () { return env.t; };
  env.setNow = function (x) { env.t = (typeof x === 'number') ? x : Date.parse(x); return env.t; };
  env.advance = function (ms) { env.t += ms; return env.t; };
  var svc = makeServices(env);
  var ctx = {
    console: { log: function () {}, warn: function () {}, error: function () {}, info: function () {} },
    Math: Math, JSON: JSON, Date: Date
  };
  Object.keys(svc).forEach(function (k) { if (k[0] !== '_') ctx[k] = svc[k]; });
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  var files = [];
  files.push(opts.roster || path.join(REPO, 'apps-script', 'Roster.example.gs'));
  files = files.concat(engineFiles(opts));
  files.push(path.join(REPO, 'apps-script', 'Code.gs'));
  files.forEach(function (f) { vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f }); });
  // The server clock: Code.gs reads time only through nowMs_().
  ctx.nowMs_ = function () { return env.t; };
  env.ctx = ctx;
  env.svc = svc;
  env.files = files;

  env.post = function (action, data, token) {
    var body = JSON.stringify({ action: action, token: token, data: data || {} });
    return env.postRaw(body);
  };
  env.postRaw = function (body) {
    var out = ctx.doPost({ postData: { contents: body, type: 'text/plain' }, parameter: {} });
    return JSON.parse(out.getContent());
  };
  env.get = function (action, extra) {
    var p = Object.assign({ action: action }, extra || {});
    var out = ctx.doGet({ parameter: p });
    return JSON.parse(out.getContent());
  };
  // Raw tab rows as objects (strings as stored), for assertions.
  env.rows = function (tab) {
    var sh = svc._ss.getSheetByName(tab);
    if (!sh) return [];
    var d = sh.getDataRange().getValues();
    var h = d[0];
    return d.slice(1).filter(function (r) { return r.some(function (v) { return v !== ''; }); }).map(function (r) { var o = {}; h.forEach(function (c, i) { o[c] = r[i]; }); return o; });
  };
  env.setup = function () { ctx.setup(); return env; };
  return env;
}

// A tiny valid JPEG (SOI + APP0 + EOI) padded to `size` bytes, base64.
function fakeJpeg(size, seed) {
  size = size || 2000;
  var b = Buffer.alloc(size, (seed || 7) & 255);
  b[0] = 0xFF; b[1] = 0xD8; b[2] = 0xFF; b[3] = 0xE0;
  b.writeUInt32BE((seed || 7) >>> 0, 4); // distinct content per seed
  b[size - 2] = 0xFF; b[size - 1] = 0xD9;
  return b.toString('base64');
}

module.exports = { createEnv: createEnv, fakeJpeg: fakeJpeg, REPO: REPO };
