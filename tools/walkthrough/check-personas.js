#!/usr/bin/env node
/* W6: checks the persona files against the app's own rules (schema limits, containsWord,
   POS guess, report word counts) before a dry run.  node tools/walkthrough/check-personas.js */
'use strict';
var path = require('path'), fs = require('fs');
var c = require(path.join(__dirname, '..', 'load.js'))();
var W = c.WI, F = c.WI_SCHEMA.fields, R = c.WI_REPORTS;
var bad = 0;
function no(m) { bad++; console.log('  FAIL ' + m); }
function len(s) { return String(s || '').trim().length; }
function rule(form, name, v, label, word) {
  var r = (F[form] || {})[name]; if (!r) return;
  var s = String(v == null ? '' : v).trim();
  if (!s) { if (r.req) no(label + ' is required'); return; }
  if (r.type === 'int') return;
  if (r.min && s.length < r.min && r.type !== 'date') no(label + ' needs ' + r.min + ' chars (' + s.length + ')');
  if (r.max && s.length > r.max) no(label + ' over ' + r.max + ' chars (' + s.length + ')');
  if (r.pattern && !(new RegExp(r.pattern)).test(s)) no(label + ' does not match ' + r.pattern);
  if (r.containsWord && word && !W.pos.containsWord(word, s)) no(label + ' does not contain "' + word + '"');
  if (r.maxWords && W.wordCount(s) > r.maxWords) no(label + ' over ' + r.maxWords + ' words');
}
['B1', 'B2', 'C1'].forEach(function (id) {
  var p = JSON.parse(fs.readFileSync(path.join(__dirname, 'personas', id + '.json'), 'utf8'));
  console.log(id + ' (' + p.label + ', "' + p.first.word + '")');
  var w = p.first.word;
  ['word', 'meaning', 'example1'].forEach(function (k) { rule('first', k, p.first[k], 'first.' + k, w); });
  var g = W.pos.guess(w, p.first.example1);
  console.log('  guess: ' + g.pos + ' (' + g.conf + ', ' + g.rule + '); she keeps/chooses ' + p.first.pos + (g.pos === p.first.pos ? ' (confirms)' : ' (changes)'));
  ['usageRules', 'pronunciation', 'sourceWords', 'example2', 'example3', 'doNotUse', 'purpose'].forEach(function (k) { rule('wordCard', k, p.card[k], 'card.' + k, w); });
  if (len(p.card.usageRules) < 20) no('usageRules < 20');
  rule('zb', 'statement', p.zb.statement, 'zb.statement');
  p.zb.places.forEach(function (z) { rule('zbPlace', 'note', z.note, 'zb note ' + z.id); });
  var tot = 0;
  'FUDGE'.split('').forEach(function (L) { var x = p.fudge[L]; tot += x[0]; if (!(x[0] >= 0 && x[0] <= 2)) no('fudge ' + L); rule('fudge', 'reason', x[1], 'fudge why ' + L); });
  console.log('  FUDGE total ' + tot + ' (' + W.fudgeTotal({ F: p.fudge.F[0], U: p.fudge.U[0], D: p.fudge.D[0], G: p.fudge.G[0], E: p.fudge.E[0] }).band + ')');
  rule('hypotheses', 'researchQuestion', p.hyp.researchQuestion, 'researchQuestion');
  p.hyp.hypotheses.forEach(function (h, i) { rule('hypothesis', 'text', h.text, 'hyp ' + i); rule('hypothesis', 'target', h.target, 'hyp target ' + i); });
  for (var i = 1; i <= 10; i++) rule('spec', 'note', p.spec['R' + i][1], 'spec R' + i);
  ['who', 'why', 'what', 'spark', 'projectAccount'].forEach(function (k) { rule('choices', k, p.choices[k], 'choices.' + k); });
  if (!p.choices.ideas.some(function (x) { var m = W.ideaMode(x); return m === 'inperson' || m === 'either'; })) no('no in-person idea');
  p.planActions.forEach(function (a, i) {
    ['what', 'why', 'theoryTag', 'whenDate'].forEach(function (k) { rule('planAction', k, a[k], 'planAction ' + i + '.' + k); });
    if (p.choices.ideas.indexOf(a.ideaId) < 0) no('planAction ' + i + ' idea not in her ideas');
    if (a.targetGroup && p.choices.targetGroups.indexOf(a.targetGroup) < 0) no('planAction ' + i + ' target group not hers');
    if (!!a.online !== W.isOnlineChannel(a.where)) no('planAction ' + i + ' online flag does not match the channel');
    if (a.whenDate < '2026-11-21' || a.whenDate > '2027-01-15') no('planAction ' + i + ' date out of range');
  });
  p.actions.forEach(function (a, i) { ['what', 'outcomeReason', 'reaction', 'learned'].forEach(function (k) { rule('action', k, a[k], 'action ' + i + '.' + k); });
    if (a.outcome !== 'as_planned' && len(a.outcomeReason) < 10) no('action ' + i + ' needs a reason');
    if (W.isOnlineChannel(a.channelId) && a.outcome !== 'not_done') no('action ' + i + ' online and not "not_done" (will be refused while locked)'); });
  if (!p.actions.some(function (a) { return a.outcome !== 'as_planned'; })) no('no Changed / Did not do it action');
  p.journal.forEach(function (j, i) { rule('journal', 'text', j.text, 'journal ' + i); console.log('  journal ' + j.kind + ': ' + W.wordCount(j.text) + ' words'); });
  p.sightings.forEach(function (s, i) { ['quote', 'context', 'derivedForm'].forEach(function (k) { rule('sighting', k, s[k], 'sighting ' + i + '.' + k); });
    if ([0, 1, 4].indexOf(s.level) < 0) no('sighting level ' + s.level); if (s.relation === 'me' && W.isOnlineChannel(s.channelId)) no('own online sighting would be locked'); });
  p.tallies.forEach(function (t, i) { rule('tally', 'note', t.note, 'tally ' + i); });
  rule('ownItem', 'title', p.week.own.title, 'own item');
  if (p.problem) rule('flag', 'note', p.problem.note, 'problem note');
  rule('review', 'wentWell', p.review.wentWell, 'review.wentWell'); rule('review', 'toChange', p.review.toChange, 'review.toChange');
  var cfg = R.types.baseline, total = 0;
  cfg.sections.forEach(function (s) { var n = W.wordCount(p.report[s.id]); total += n; if (n < s.minWords) no('report ' + s.id + ' ' + n + ' < ' + s.minWords); console.log('  report ' + s.id + ': ' + n + ' words'); });
  var ai = W.wordCount(p.report.ai);
  console.log('  report total ' + total + ' words (600–900), AI declaration ' + ai + ' words');
  if (total < cfg.wordMin || total > cfg.wordMax) no('report total ' + total);
  if (ai < (R.ai.minWords || 10)) no('AI declaration too short');
  // the report must agree with her own data
  if (p.report.fudge.indexOf(String(tot) + ' out of 10') < 0) no('report FUDGE total does not say ' + tot + ' out of 10');
  if (p.report.profile.indexOf(w) < 0) no('report profile does not name the word');
  if (['vronk', 'plim', 'zib'].indexOf(w) >= 0 || (c.WI_POSTESTS || []).some(function (r) { return r.word === w; })) no('word is a test or real word already used in the repo: ' + w);
});
console.log(bad ? bad + ' problems' : 'all persona checks passed');
process.exit(bad ? 1 : 0);
