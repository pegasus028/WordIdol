#!/usr/bin/env node
/* W6: minify bot.js → bundle.min.js, write bundle.sha256 and loader.js (the snippet the lead pastes).
   Needs terser:  NODE_PATH=<dir with terser> node tools/walkthrough/build.js   (npm i terser@5 anywhere) */
'use strict';
var fs = require('fs'), path = require('path'), crypto = require('crypto');
var terser;
try { terser = require('terser'); } catch (e) { console.error('terser not found: npm i terser@5 and set NODE_PATH'); process.exit(2); }
var dir = __dirname;
var src = fs.readFileSync(path.join(dir, 'bot.js'), 'utf8');
new Function(src); // syntax check
terser.minify(src, { ecma: 2017, compress: { passes: 2 }, mangle: true, format: { comments: /^!/, ascii_only: true } }).then(function (out) {
  var code = '/*! WordIdol walkthrough bot (W6), built ' + new Date().toISOString().slice(0, 10) + ' from tools/walkthrough/bot.js */\n' + out.code + '\n';
  new Function(code);
  fs.writeFileSync(path.join(dir, 'bundle.min.js'), code);
  var sha = crypto.createHash('sha256').update(code, 'utf8').digest('hex');
  fs.writeFileSync(path.join(dir, 'bundle.sha256'), sha + '  bundle.min.js\n');
  var loader = fs.readFileSync(path.join(dir, 'loader.template.js'), 'utf8').split('__SHA256__').join(sha);
  new Function(loader);
  fs.writeFileSync(path.join(dir, 'loader.js'), loader);
  console.log('bundle.min.js ' + code.length + ' bytes (bot.js ' + src.length + '), sha256 ' + sha);
});
