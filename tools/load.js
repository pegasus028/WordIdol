#!/usr/bin/env node
// WordIdol loader (W4): runs schema.js, the data files and engine.js in one Node vm context
// with `window = globalThis`, exactly as the browser and Apps Script see them.
//   const ctx = require('./tools/load.js')();            // everything that exists
//   const ctx = require('./tools/load.js')({ only: ['data/plan.js', 'engine.js'] });
//   node tools/load.js                                    // prints what loaded
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

// Browser load order (docs/ENGINE-API.md §0). Missing optional files are skipped.
const ORDER = [
  'config.js',
  'schema.js',
  'data/plan.js',
  'data/choices.js',
  'data/rules.js',
  'data/game.js',
  'data/checklist.js',
  'data/coverage.js',
  'data/postests.js',
  'data/guide.js',
  'data/frames.js',
  'data/levels.js',
  'data/blocklist.js',
  'data/why.js',
  'data/pool.js',
  'data/summit.js',
  'data/reports.js',
  'data/article.js',
  'engine.js'
];
const REQUIRED = ['data/plan.js', 'data/choices.js', 'data/rules.js', 'data/game.js', 'data/checklist.js', 'data/coverage.js', 'engine.js'];

function makeContext() {
  const sandbox = { console: console, Date: Date, Math: Math, JSON: JSON };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  return vm.createContext(sandbox);
}

function load(opts) {
  opts = opts || {};
  const ctx = opts.context || makeContext();
  const files = opts.only || ORDER;
  const loaded = [];
  const errors = [];
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      if (REQUIRED.indexOf(rel) >= 0 && !opts.only) errors.push(rel + ': missing');
      continue;
    }
    try {
      vm.runInContext(fs.readFileSync(abs, 'utf8'), ctx, { filename: rel });
      loaded.push(rel);
    } catch (e) {
      errors.push(rel + ': ' + (e && e.message));
    }
  }
  Object.defineProperty(ctx, '__loaded', { value: loaded, enumerable: false });
  Object.defineProperty(ctx, '__errors', { value: errors, enumerable: false });
  if (errors.length && opts.strict) throw new Error('load errors:\n' + errors.join('\n'));
  return ctx;
}

load.ORDER = ORDER;
load.REQUIRED = REQUIRED;
load.ROOT = ROOT;
load.makeContext = makeContext;
module.exports = load;

if (require.main === module) {
  const ctx = load();
  console.log('loaded: ' + ctx.__loaded.join(', '));
  if (ctx.__errors.length) {
    console.log('errors:\n  ' + ctx.__errors.join('\n  '));
    process.exit(1);
  }
  console.log('WI.version ' + (ctx.WI && ctx.WI.version));
}
