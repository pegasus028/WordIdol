// Regression (live walkthrough, 19 Nov 2026): a bootstrap that is already in flight when queued saves
// are confirmed must not hide those saves when its older snapshot arrives.
// Run: node tests/api-race.test.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const store = {};
const localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  key: (i) => Object.keys(store)[i],
  get length() { return Object.keys(store).length; }
};

let pendingBootstrap = null; // resolve function of the slow bootstrap
const stale = {
  student: { id: 'g1', label: 'Guest#1', guest: true },
  state: { studentId: 'g1', xp: 0 },
  word: { studentId: 'g1', word: 'homeworry', meaning: 'old meaning' },
  plans: [], planActions: [], checklist: [], reviews: [], actions: [], journal: [], sightings: [],
  tallies: [], files: [], waves: [], waveNotes: [], requests: [], flags: [], feedback: [], reports: [],
  audits: { mine: [], onMe: [] }, xpLog: []
};

function reply(obj) { return Promise.resolve({ json: () => Promise.resolve(obj) }); }
function fetch(url, opts) {
  const body = JSON.parse(opts.body);
  const now = '2026-11-21T10:00:00+07:00';
  if (body.action === 'bootstrap') {
    return new Promise((resolve) => { pendingBootstrap = () => resolve({ json: () => Promise.resolve({ ok: true, now, weekId: 'W01', data: JSON.parse(JSON.stringify(stale)) }) }); });
  }
  if (body.action === 'sync') {
    const results = body.data.ops.map((o) => ({ opId: o.opId, ok: true, data: { word: Object.assign({}, stale.word, o.data.fields) } }));
    return reply({ ok: true, now, weekId: 'W01', data: { results } });
  }
  return reply({ ok: true, now, weekId: 'W01', data: {} });
}

const ctx = { crypto: require('crypto').webcrypto, addEventListener: () => {}, console, setTimeout, clearTimeout, setInterval: () => 0, Promise, JSON, Date, Math, localStorage, fetch, navigator: { onLine: true }, WI_CONFIG: { apiUrl: 'https://example.test/exec' } };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'api.js'), 'utf8'), ctx);

(async () => {
  const api = ctx.WIApi.student();
  localStorage.setItem('wi.session', JSON.stringify({ token: 't', expiresAt: '2026-12-31T00:00:00+07:00', student: stale.student }));
  api.setData(JSON.parse(JSON.stringify(stale)));
  const boot = api.bootstrap();                      // 1. bootstrap leaves and is slow
  await new Promise((r) => setTimeout(r, 10));
  await api.save('word.save', { fields: { meaning: 'new meaning' } }); // 2. a save is sent and confirmed
  assert.strictEqual(api.queue().length, 0, 'the save left the queue');
  pendingBootstrap();                                 // 3. the old snapshot arrives
  await boot;
  assert.strictEqual(api.data().word.meaning, 'new meaning', 'the confirmed save survives the older bootstrap');
  console.log('api-race: 1 passed, 0 failed');
})().catch((e) => { console.error('api-race: FAIL', e.message); process.exit(1); });
