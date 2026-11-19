#!/usr/bin/env node
// WordIdol mock API: runs apps-script/Code.gs (+ Shared.gs, or schema.js + engine.js + data files) with
// in-memory Sheet / Drive / Lock / Properties / Cache stubs (tests/api.mock.js) and the fake roster
// apps-script/Roster.example.gs (Guest#1–3 PIN 1111/2222/3333, Student A–H PIN 0001–0008, teacher 123456).
// Owner: W1. For local tests only; nothing leaves this machine.
//
//   node tools/mock-server.js [--port 8790] [--now 2026-11-21T09:00:00+07:00] [--sources] [--release 1]
//
// Endpoints (CORS open):
//   GET  /exec?action=ping|roster       like the Apps Script web app
//   POST /exec  body {"action","token","data"} (Content-Type text/plain)
//   POST /__clock {"iso":"…"} or {"advanceMs":n}   fake the server time; GET /__clock reads it
//   POST /__reset {"iso"?, "release"?}             fresh empty Sheet (setup() run again)
//   POST /__lock {"busy":true|false}               make every write answer BUSY (lock timeout)
//   POST /__job                                     run weeklyJob() now
//   POST /__config {"key","value"}                  write a Config row directly (e.g. release)
//   POST /__delay {"ms":n}                          add latency to /exec answers
//   GET  /__dump?tab=Actions                        raw rows of one tab (strings as stored)
//   GET  /__health                                  {"ok":true}
'use strict';
var http = require('http');
var path = require('path');
var M = require(path.join(__dirname, '..', 'tests', 'api.mock.js'));

function arg(name, dflt) {
  var i = process.argv.indexOf('--' + name);
  if (i < 0) return dflt;
  var v = process.argv[i + 1];
  return (v === undefined || v.indexOf('--') === 0) ? true : v;
}
var PORT = Number(process.env.MOCK_PORT || arg('port', 8790));
var START = arg('now', process.env.MOCK_NOW || '2026-11-21T09:00:00+07:00');
var USE_SOURCES = !!arg('sources', false) || process.env.MOCK_SOURCES === '1';
var RELEASE = arg('release', process.env.MOCK_RELEASE || '');
var delayMs = 0;
var env = null;

function boot(iso, release) {
  var keepClock = env ? env.t : null;
  env = M.createEnv({ start: iso || START, useSources: USE_SOURCES });
  if (!iso && keepClock !== null) env.setNow(keepClock);
  env.setup();
  if (release) setConfig('release', String(release));
  return env;
}
function setConfig(key, value) {
  // Through the real code path, inside a fresh request context.
  var ctx = env.ctx;
  ctx.REQ_ = { now: env.t, nowIso: ctx.iso_(env.t), tables: {}, config: null, locked: false, ss: null };
  ctx.withLock_(function () { ctx.setConfig_(key, value); });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
}
function send(res, code, obj) {
  cors(res);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(typeof obj === 'string' ? obj : JSON.stringify(obj));
}
function readBody(req, cb) {
  var chunks = [], size = 0;
  req.on('data', function (c) { size += c.length; if (size > 5 * 1024 * 1024) { req.destroy(); return; } chunks.push(c); });
  req.on('end', function () { cb(Buffer.concat(chunks).toString('utf8')); });
}
function parse(s) { try { return JSON.parse(s || '{}'); } catch (e) { return {}; } }

boot(START, RELEASE);

var server = http.createServer(function (req, res) {
  var u = new URL(req.url, 'http://127.0.0.1');
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end(); }
  var p = u.pathname.replace(/\/+$/, '') || '/';
  try {
    if (p === '/exec' || p === '/macros/exec') {
      if (req.method === 'GET') {
        var params = {}; u.searchParams.forEach(function (v, k) { params[k] = v; });
        var out = env.ctx.doGet({ parameter: params, queryString: u.search.slice(1) });
        return setTimeout(function () { send(res, 200, out.getContent()); }, delayMs);
      }
      if (req.method === 'POST') {
        return readBody(req, function (body) {
          var out2 = env.ctx.doPost({ postData: { contents: body, type: req.headers['content-type'] || 'text/plain', length: body.length }, parameter: {} });
          setTimeout(function () { send(res, 200, out2.getContent()); }, delayMs);
        });
      }
      return send(res, 405, { ok: false });
    }
    if (p === '/__health') return send(res, 200, { ok: true, now: env.ctx.iso_(env.t), files: env.files.map(function (f) { return path.basename(f); }) });
    if (p === '/__clock' && req.method === 'GET') return send(res, 200, { ok: true, now: env.ctx.iso_(env.t), ms: env.t });
    if (p === '/__dump') {
      var tab = u.searchParams.get('tab') || 'State';
      return send(res, 200, { ok: true, tab: tab, rows: env.rows(tab) });
    }
    if (req.method !== 'POST') return send(res, 404, { ok: false, error: 'not found' });
    return readBody(req, function (body) {
      var b = parse(body);
      if (p === '/__clock') {
        if (b.iso) env.setNow(b.iso);
        else if (typeof b.advanceMs === 'number') env.advance(b.advanceMs);
        if (!isFinite(env.t)) return send(res, 400, { ok: false, error: 'bad iso' });
        return send(res, 200, { ok: true, now: env.ctx.iso_(env.t) });
      }
      if (p === '/__reset') { boot(b.iso || START, b.release || RELEASE); return send(res, 200, { ok: true, now: env.ctx.iso_(env.t) }); }
      if (p === '/__lock') { env.lockBusy = !!b.busy; return send(res, 200, { ok: true, busy: env.lockBusy }); }
      if (p === '/__job') { env.ctx.weeklyJob(); return send(res, 200, { ok: true }); }
      if (p === '/__config') { setConfig(String(b.key), typeof b.value === 'string' ? b.value : JSON.stringify(b.value)); return send(res, 200, { ok: true }); }
      if (p === '/__delay') { delayMs = Math.max(0, Number(b.ms) || 0); return send(res, 200, { ok: true, ms: delayMs }); }
      return send(res, 404, { ok: false, error: 'not found' });
    });
  } catch (e) {
    return send(res, 500, { ok: false, error: String(e && e.message || e) });
  }
});

server.listen(PORT, '127.0.0.1', function () {
  process.stdout.write('WordIdol mock API on http://127.0.0.1:' + PORT + '/exec (now ' + env.ctx.iso_(env.t) + '; ' + env.files.map(function (f) { return path.basename(f); }).join(', ') + ')\n');
});
