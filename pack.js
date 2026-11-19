/* WordIdol packs (W5): report helpers, the wave card, SVG charts with PNG download,
   and the entry points for the Summit Pack and the Article Pack.
   SPEC §11, §12, §13.4. Contract with the app shell (brief §3.5):
     window.WIPack = { renderReport(el, ctx, type), renderSummit(el, ctx, tab), renderArticle(el, ctx, tab),
                       renderCharts(el, ctx), chartSVG(chartId, D, opts) }
     ctx = { D, save(action, data) -> Promise<response>, go(route), toast(msg), release, now? }
   The pure parts (word counts, facts, report checks, wave figures, chart SVG strings) need no DOM,
   so tests/pack.test.js can run them in Node. Everything that touches the DOM is inside render*. */
(function () {
  var root = (typeof window !== 'undefined') ? window : globalThis;
  var P = {};
  P.version = '2026-11-19a';

  /* ------------------------------------------------------------------ utils */
  function eng() { return root.WI || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function obj(x) { return (x && typeof x === 'object' && !Array.isArray(x)) ? x : {}; }
  function live(rows) { return arr(rows).filter(function (r) { return r && r.deleted !== true; }); }
  function txt(s) { return String(s == null ? '' : s).trim(); }
  function clip(s, n) { s = txt(s).replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; }
  function firstWords(s, n) { var w = txt(s).split(/\s+/).filter(Boolean); return w.length > n ? w.slice(0, n).join(' ') + ' …' : w.join(' '); }
  function sidOf(D) { D = D || {}; return (D.student && D.student.id) || (D.state && D.state.studentId) || ''; }
  function words(s) {
    var W = eng();
    if (W && typeof W.wordCount === 'function') return W.wordCount(s);
    return txt(s).split(/\s+/).filter(function (t) { return /[A-Za-z0-9À-ɏ]/.test(t); }).length;
  }
  P.words = words;
  P.esc = esc;

  function fmtDate(x, long) {
    if (!x) return '';
    var W = eng();
    if (W && typeof W.fmtDate === 'function') { try { return W.fmtDate(x, long ? 'long' : undefined); } catch (e) { /* fall through */ } }
    var m = String(x).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return String(x);
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return days[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + mons[d.getUTCMonth()] + (long ? ' ' + m[1] : '');
  }
  function pctNum(x) { return (x == null || isNaN(x)) ? null : Math.round(x); }
  function pctText(x) {
    var v = pctNum(x);
    if (v == null) return '–';
    return (v < 0 ? '−' + Math.abs(v) : String(v)) + '%';
  }
  P.pctText = pctText;

  function nowIso(ctx) {
    if (ctx && typeof ctx.now === 'string') return ctx.now;
    if (ctx && typeof ctx.now === 'function') { try { var v = ctx.now(); if (v) return typeof v === 'string' ? v : new Date(v).toISOString(); } catch (e) { /* fall through */ } }
    var W = eng(), off = 0;
    try { off = Number(root.localStorage && root.localStorage.getItem('wi.serverOffset')) || 0; } catch (e) { off = 0; }
    if (W && typeof W.now === 'function') return W.now(off);
    return new Date(Date.now() + off).toISOString();
  }

  /* Option labels from WI_CHOICES (W4). Fallbacks keep the packs readable if a list is missing. */
  var FALLBACK = {
    routes: { utility: 'Utility', play: 'Play', shift: 'Semantic shift' },
    timeBudgets: { light: 'Light (about 30 min a week)', standard: 'Standard (about 1 hour)', stretch: 'Stretch (about 2 hours)' },
    formations: { blending: 'Blending', clipping: 'Clipping', compounding: 'Compounding', conversion: 'Conversion', borrowing: 'Borrowing', coinage: 'Coinage', semantic_shift: 'New meaning for an existing word (semantic shift)', other: 'Other' },
    pos: { noun: 'Noun', verb: 'Verb', adjective: 'Adjective', adverb: 'Adverb', interjection: 'Interjection', other: 'Phrase / other' },
    metrics: { recognition: 'Recognition', corrected: 'Corrected recognition', comprehension: 'Comprehension', level: 'Evidence Level reached', other: 'Other' },
    hypStatuses: { supported: 'Supported', not_supported: 'Not supported', too_early: 'Too early to say' },
    outcomes: { as_planned: 'As planned', changed: 'Changed', not_done: 'Did not do it' },
    tallyTypes: { said: 'I said it', heard: 'I heard someone else say it', asked: 'Someone asked what it means', online: 'Someone used it online' },
    evidenceTypes: { log: 'Action log', journal: 'Lab Book', sighting: 'Sighting', screenshot: 'Screenshot', tally: 'Tally', survey: 'Survey', record: 'Record', doc: 'Document', none: 'None' },
    zbResults: { none: 'No results', other_meaning: 'Results, but with a different meaning', my_meaning: 'Results with my meaning', cannot: 'I could not check here' },
    zbPlaces: { zb_google: 'Google', zb_tiktok: 'TikTok', zb_instagram: 'Instagram', zb_x: 'X', zb_youtube: 'YouTube', zb_urban: 'Urban Dictionary' },
    platforms: { pf_inperson: 'In person only', pf_tiktok: 'TikTok', pf_instagram: 'Instagram', pf_facebook: 'Facebook', pf_youtube: 'YouTube', pf_chats: 'Private chats', pf_other: 'Other' }
  };
  function choiceList(name) {
    var C = root.WI_CHOICES || {};
    var l = C[name];
    if (Array.isArray(l)) return l;
    if (l && typeof l === 'object') return Object.keys(l).map(function (k) { return typeof l[k] === 'string' ? { id: k, label: l[k] } : Object.assign({ id: k }, l[k]); });
    var f = FALLBACK[name];
    return f ? Object.keys(f).map(function (k) { return { id: k, label: f[k] }; }) : [];
  }
  function label(name, id) {
    if (id == null || id === '') return '';
    var l = choiceList(name);
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i].label || String(id);
    var f = FALLBACK[name];
    if (f && f[id]) return f[id];
    return String(id).replace(/^[a-z]{2}_/, '').replace(/_/g, ' ');
  }
  function channel(id) {
    var l = choiceList('channels');
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return { id: id, label: id ? String(id).replace(/^ch_/, '').replace(/_/g, ' ') : '', online: !/^ch_(school|home|out)$/.test(String(id)) };
  }
  function isOnlineChannel(id) {
    var W = eng();
    if (W && typeof W.isOnlineChannel === 'function') return !!W.isOnlineChannel(id);
    return !!channel(id).online;
  }
  function theoryName(id) {
    var G = root.GUIDE || {};
    var t = arr(G.theory);
    for (var i = 0; i < t.length; i++) if (t[i].id === id) return t[i].name;
    return id ? String(id).replace(/^th-/, '').replace(/-/g, ' ') : '';
  }
  function principle() {
    var R = root.WI_RULES || {};
    return R.analysisOverAdoption || (root.WI_REPORTS && root.WI_REPORTS.principle) ||
      'Marks are awarded for the quality of analysis and reflection, not for how widely a term spreads. A term that does not catch on, analysed well, can earn full marks.';
  }
  function sixRules() {
    var R = root.WI_RULES || {};
    return arr(R.rules).map(function (r) { return typeof r === 'string' ? r : (r && r.text) || ''; });
  }
  function planOf(D, phase) {
    var ps = arr(D && D.plans);
    for (var i = 0; i < ps.length; i++) if (Number(ps[i].phase) === phase) return ps[i];
    return null;
  }
  function planActions(D, phase) {
    return live(D && D.planActions).filter(function (a) { return !phase || Number(a.phase || 1) === phase; })
      .sort(function (a, b) { return String(a.whenDate || '').localeCompare(String(b.whenDate || '')); });
  }
  function levelOf(s) { return (s.finalLevel !== '' && s.finalLevel != null && !isNaN(s.finalLevel)) ? Number(s.finalLevel) : (s.level === '' || s.level == null ? null : Number(s.level)); }
  function isOwned(s) {
    var W = eng();
    if (typeof s.owned === 'boolean') return s.owned;
    if (W && typeof W.owned === 'function') return !!W.owned(s);
    return s.relation === 'me' || s.prompted === 'asked';
  }
  function weekIdOf(x) {
    var W = eng();
    if (W && typeof W.weekIdOf === 'function') return W.weekIdOf(x);
    var t = Date.parse(String(x).length === 10 ? x + 'T00:00:00+07:00' : x);
    var start = Date.parse('2026-11-16T00:00:00+07:00');
    var n = Math.floor((t - start) / 604800000) + 1;
    n = Math.max(1, Math.min(13, n));
    return 'W' + (n < 10 ? '0' : '') + n;
  }
  function phaseOfRow(r) {
    if (r.phase) return Number(r.phase);
    var W = eng();
    if (W && typeof W.phaseOf === 'function' && r.date) return W.phaseOf(r.date);
    return String(r.date || '') >= '2026-12-18' ? 2 : 1;
  }

  /* ------------------------------------------------------------------ waves */
  var TERM_ORDER = ['me', 'ctrl1', 'ctrl2', 'foil1', 'foil2'];
  var DEFAULT_TERMS = { ctrl1: 'aura farming', ctrl2: 'crash out', foil1: 'drovish', foil2: 'trelky' };

  function myWaveRows(D) {
    var W = eng(), sid = sidOf(D), rows;
    if (W && typeof W.myWaves === 'function') { try { rows = W.myWaves(D, sid); } catch (e) { rows = null; } }
    if (!rows) {
      rows = arr(D && D.waves).filter(function (r) {
        return r && r.published === true && (r.termKey === sid || /^(ctrl|foil)[12]$/.test(r.termKey));
      });
    }
    return rows;
  }
  function correctedLocal(rows) {
    var terms = {}, foils = [];
    rows.forEach(function (r) {
      var n = Number(r.n) || 0;
      var t = {
        termKey: r.termKey, termText: r.termText, n: n,
        recPct: n ? 100 * Number(r.recognised || 0) / n : null,
        notSurePct: n ? 100 * Number(r.notSure || 0) / n : null,
        compPct: n ? 100 * Number(r.comprehended || 0) / n : null,
        isFoil: /^foil/.test(r.termKey), isControl: /^ctrl/.test(r.termKey)
      };
      if (t.isFoil && t.recPct != null) foils.push(t.recPct);
      terms[r.termKey] = t;
    });
    var fr = foils.length ? foils.reduce(function (a, b) { return a + b; }, 0) / foils.length : null;
    Object.keys(terms).forEach(function (k) {
      var t = terms[k];
      t.foilRate = fr;
      t.corrected = (t.isFoil || fr == null || t.recPct == null) ? null : t.recPct - fr;
    });
    return { foilRate: fr, terms: terms };
  }
  /* Published wave ids visible to her, in order W1..W4. */
  function publishedWaves(D) {
    var seen = {};
    myWaveRows(D).forEach(function (r) { seen[r.waveId] = true; });
    return ['W1', 'W2', 'W3', 'W4'].filter(function (w) { return seen[w]; });
  }
  P.publishedWaves = publishedWaves;

  /* All figures for one wave: {waveId, date, classesNote, foilRate, rows:[{termKey, kind, termText, n, rec, notSure, comp, corrected}], me} */
  function waveStats(D, waveId) {
    var sid = sidOf(D);
    var rows = myWaveRows(D).filter(function (r) { return r.waveId === waveId; });
    if (!rows.length) return null;
    var W = eng(), c;
    if (W && typeof W.corrected === 'function') { try { c = W.corrected(rows); } catch (e) { c = null; } }
    if (!c || !c.terms) c = correctedLocal(rows);
    var out = { waveId: waveId, date: '', classesNote: '', foilRate: c.foilRate, rows: [], me: null };
    rows.forEach(function (r) { if (r.date && !out.date) out.date = r.date; if (r.classesNote && !out.classesNote) out.classesNote = r.classesNote; });
    var myWord = txt(D && D.word && D.word.word);
    TERM_ORDER.forEach(function (k) {
      var key = k === 'me' ? sid : k;
      var t = c.terms[key];
      var raw = rows.filter(function (r) { return r.termKey === key; })[0];
      if (!t || !raw) return;
      var row = {
        termKey: key, kind: k === 'me' ? 'me' : (/^ctrl/.test(k) ? 'control' : 'foil'),
        termText: k === 'me' ? (myWord || txt(raw.termText) || 'My word') : (txt(raw.termText) || DEFAULT_TERMS[k]),
        n: Number(raw.n) || 0, recognised: Number(raw.recognised) || 0,
        rec: t.recPct, notSure: t.notSurePct, comp: t.compPct,
        corrected: (k === 'me' || /^ctrl/.test(k)) ? t.corrected : null
      };
      out.rows.push(row);
      if (k === 'me') out.me = row;
    });
    return out;
  }
  P.waveStats = waveStats;

  function waveNote(D, waveId) {
    var id = sidOf(D) + '|' + waveId;
    var l = arr(D && D.waveNotes);
    for (var i = 0; i < l.length; i++) if (l[i].id === id || (l[i].waveId === waveId && (!l[i].studentId || l[i].studentId === sidOf(D)))) return l[i];
    return null;
  }

  /* ------------------------------------------------------------------ facts
     Each fact builder returns {title, rows:[[label, value]], table:{head:[], rows:[[]]}, list:[], empty, route, note}.
     Values are plain text; the renderer escapes them. */
  var F = {};
  function fact(title, o) { o = o || {}; o.title = title; return o; }
  function wordOf(D) { return obj(D && D.word); }

  F['word.basic'] = function (D) {
    var w = wordOf(D);
    if (!txt(w.word)) return fact('Your word', { empty: 'You have not recorded your word yet.', route: '#/first' });
    var pos = label('pos', w.pos);
    var also = arr(w.posAlso).map(function (p) { return label('pos', p); }).join(', ');
    return fact('Your word', { rows: [['Word', w.word], ['Meaning', w.meaning], ['Part of speech', pos + (also ? ' (it can also be: ' + also + ')' : '')], ['Example', w.example1]] });
  };
  F['word.card'] = function (D) {
    var w = wordOf(D);
    var forms = w.forms;
    var formsText = Array.isArray(forms) ? forms.filter(Boolean).join(', ') :
      Object.keys(obj(forms)).map(function (k) { return txt(forms[k]); }).filter(Boolean).join(', ');
    var rows = [
      ['Part of speech', label('pos', w.pos)], ['Rules for using it', w.usageRules], ['Other forms', formsText],
      ['Say it like', w.pronunciation], ['How it was formed', label('formations', w.formation)], ['Where it comes from', w.sourceWords],
      ['Example 2', w.example2], ['Example 3', w.example3], ['What it is for', w.purpose], ['When it would be wrong', w.doNotUse]
    ].filter(function (r) { return txt(r[1]); });
    if (!rows.length) return fact('Word card', { empty: 'Your word card is empty.', route: '#/audition' });
    return fact('Word card', { rows: rows });
  };
  F['word.zb'] = function (D) {
    var zb = obj(wordOf(D).zb);
    var places = arr(zb.places);
    if (!zb.checkedAt && !places.length) return fact('Zero-baseline check', { empty: 'You have not recorded your zero-baseline check yet.', route: '#/audition' });
    var rows = [['Checked on', fmtDate(zb.checkedAt, true)]];
    places.forEach(function (p) { rows.push([label('zbPlaces', p.placeId), label('zbResults', p.result) + (txt(p.note) ? ' (' + txt(p.note) + ')' : '')]); });
    if (txt(zb.statement)) rows.push(['What I found', zb.statement]);
    var shots = arr(zb.fileIds).length;
    if (shots) rows.push(['Screenshots', String(shots)]);
    return fact('Zero-baseline check', { rows: rows });
  };
  F['plan.targetGroups'] = function (D) {
    var p = obj(planOf(D, 1));
    var tg = arr(p.targetGroups).map(function (x) { return label('targetGroups', x); });
    if (!tg.length && !txt(p.who)) return fact('Target community', { empty: 'Choose your target groups on the Debut plan.', route: '#/debut' });
    return fact('Target community', { rows: [['Target groups', tg.join(', ')], ['Who is my crowd?', p.who]].filter(function (r) { return txt(r[1]); }) });
  };
  var FUDGE_NAMES = { F: 'Frequency of use', U: 'Unobtrusiveness', D: 'Diversity of users and situations', G: 'Generation of other forms and meanings', E: 'Endurance of the concept' };
  function fudgeTotal(s) { var t = 0, ok = true; 'FUDGE'.split('').forEach(function (k) { var v = Number(s && s[k]); if (isNaN(v) || s[k] === '' || s[k] == null) ok = false; else t += v; }); return ok ? t : null; }
  function fudgeBand(t) { return t == null ? '' : (t >= 7 ? 'likely to last' : (t >= 5 ? 'fringe' : 'doomed')); }
  P.fudgeBand = fudgeBand;
  F['word.fudge'] = function (D) {
    var f = obj(wordOf(D).fudge), pr = obj(f.pred), reasons = obj(pr.reasons);
    if (fudgeTotal(pr) == null && !Object.keys(reasons).length) return fact('FUDGE prediction', { empty: 'You have not scored your word on FUDGE yet.', route: '#/audition' });
    var head = ['Letter', 'Score', 'Reason'];
    var hasMid = fudgeTotal(f.mid) != null, hasEnd = fudgeTotal(f.end) != null;
    if (hasMid) head.splice(2, 0, 'Summit');
    if (hasEnd) head.splice(hasMid ? 3 : 2, 0, 'January');
    var rows = 'FUDGE'.split('').map(function (k) {
      var r = [k + ' · ' + FUDGE_NAMES[k], (pr[k] == null || pr[k] === '' ? '–' : pr[k]) + ' / 2'];
      if (hasMid) r.push(f.mid[k] + ' / 2');
      if (hasEnd) r.push(f.end[k] + ' / 2');
      r.push(txt(reasons[k]));
      return r;
    });
    var t = fudgeTotal(pr);
    return fact('FUDGE prediction', { table: { head: head, rows: rows },
      rows: [['Total', t == null ? '–' : t + ' / 10 (' + fudgeBand(t) + ')']],
      note: 'This is your prediction, not a mark.' });
  };
  F['word.hypotheses'] = function (D) {
    var w = wordOf(D), hs = arr(w.hypotheses);
    if (!txt(w.researchQuestion) && !hs.length) return fact('Research question and hypotheses', { empty: 'You have not written your research question and hypotheses yet.', route: '#/audition' });
    var rows = [['Research question', w.researchQuestion]];
    hs.forEach(function (h, i) {
      rows.push(['Hypothesis ' + (i + 1), txt(h.text) + (h.metric ? ' — measured by: ' + label('metrics', h.metric) : '') + (txt(h.target) ? ' (target: ' + txt(h.target) + ')' : '')]);
    });
    return fact('Research question and hypotheses', { rows: rows.filter(function (r) { return txt(r[1]); }) });
  };
  function waveFact(waveId) {
    return function (D) {
      var s = waveStats(D, waveId);
      var name = 'Wave ' + waveId.slice(1);
      if (!s) return fact(name + ' results', { empty: name + ' results are not published yet. They appear here when T.Chris publishes them. You can write the other sections now.' });
      var rows = s.rows.map(function (r) {
        return [(r.kind === 'me' ? 'My word: ' : (r.kind === 'control' ? 'Control: ' : 'Foil: ')) + r.termText, String(r.n), pctText(r.rec), pctText(r.notSure), pctText(r.comp)];
      });
      var notes = [];
      if (s.me && s.me.corrected != null) notes.push('Corrected recognition of my word: ' + pctText(s.me.rec) + ' − ' + pctText(s.foilRate) + ' (foil rate) = ' + pctText(s.me.corrected) + '.');
      if (s.me && s.me.corrected != null && pctNum(s.me.corrected) <= 0) notes.push('0 or below means we cannot tell real recognition from guessing.');
      return fact(name + ' results' + (s.date ? ' (' + fmtDate(s.date) + ')' : ''), {
        table: { head: ['Word', 'n', 'Know it', 'Not sure', 'Understand'], rows: rows, num: [1, 2, 3, 4] },
        note: notes.join(' ')
      });
    };
  }
  function waveNoteFact(waveId) {
    return function (D) {
      var n = waveNote(D, waveId), name = 'Wave ' + waveId.slice(1);
      if (!waveStats(D, waveId)) return fact('My ' + name + ' note', { empty: 'You can write your ' + name + ' note on the Charts screen when the results are published.' });
      if (!n || !txt(n.note)) return fact('My ' + name + ' note', { empty: 'You have not written your ' + name + ' note yet.', route: '#/charts', routeLabel: 'Write my ' + name + ' note' });
      var rows = [['What it tells me', n.note]];
      var hc = obj(n.hypothesisChecks);
      arr(wordOf(D).hypotheses).forEach(function (h, i) { if (hc[h.id]) rows.push(['Hypothesis ' + (i + 1), label('hypStatuses', hc[h.id])]); });
      return fact('My ' + name + ' note', { rows: rows });
    };
  }
  ['W1', 'W2', 'W3', 'W4'].forEach(function (w) { F['wave.' + w] = waveFact(w); F['wavenote.' + w] = waveNoteFact(w); });
  F['wave.series'] = function (D) {
    var ws = publishedWaves(D);
    if (!ws.length) return fact('My word in each wave', { empty: 'No wave results are published yet.', route: '#/charts' });
    var rows = ws.map(function (w) {
      var s = waveStats(D, w), me = s && s.me;
      return ['Wave ' + w.slice(1), me ? String(me.n) : '–', me ? pctText(me.rec) : '–', pctText(s && s.foilRate), me ? pctText(me.corrected) : '–', me ? pctText(me.comp) : '–'];
    });
    return fact('My word in each wave', { table: { head: ['Wave', 'n', 'Know it', 'Foil rate', 'Corrected', 'Understand'], rows: rows, num: [1, 2, 3, 4, 5] } });
  };
  F['wave.decay'] = function (D) {
    var a = waveStats(D, 'W3'), b = waveStats(D, 'W4');
    if (!a || !b) return fact('Decay check (Wave 3 to Wave 4)', { empty: 'The decay check needs Waves 3 and 4.' });
    var rows = b.rows.filter(function (r) { return r.kind !== 'foil'; }).map(function (r) {
      var o = a.rows.filter(function (x) { return x.termKey === r.termKey; })[0];
      var d = (o && o.rec != null && r.rec != null) ? r.rec - o.rec : null;
      return [(r.kind === 'me' ? 'My word: ' : 'Control: ') + r.termText, pctText(o && o.rec), pctText(r.rec), d == null ? '–' : (d > 0 ? '+' : '') + pctText(d)];
    });
    return fact('Decay check (Wave 3 to Wave 4)', { table: { head: ['Word', 'Wave 3', 'Wave 4', 'Change'], rows: rows, num: [1, 2, 3] } });
  };
  function choicesRows(p) {
    var plats = arr(p.platforms).map(function (x) { return x === 'pf_other' && txt(p.platformOther) ? 'Other: ' + txt(p.platformOther) : label('platforms', x); });
    return [
      ['Target groups', arr(p.targetGroups).map(function (x) { return label('targetGroups', x); }).join(', ')],
      ['Promotion ideas', arr(p.ideas).map(function (x) { return label('ideas', x); }).join(', ')],
      ['Platforms', plats.join(', ')],
      ['Route', label('routes', p.route)],
      ['Time budget', label('timeBudgets', p.timeBudget)],
      ['Who is my crowd?', p.who], ['Why would they need this word?', p.why], ['What will they hear or see?', p.what], ['What could start it?', p.spark]
    ].filter(function (r) { return txt(r[1]); });
  }
  F['plan.choices'] = function (D) {
    var p = planOf(D, 1);
    if (!p) return fact('My choices', { empty: 'You have not made your choices yet.', route: '#/debut' });
    return fact('My choices', { rows: choicesRows(p) });
  };
  F['plan.route'] = function (D) {
    var p = obj(planOf(D, 1));
    if (!p.route) return fact('My route', { empty: 'Choose your route on the Debut plan.', route: '#/debut' });
    return fact('My route', { rows: [['Route', label('routes', p.route)]] });
  };
  function planTable(rows) {
    return rows.map(function (a, i) {
      return [String(i + 1), fmtDate(a.whenDate), label('channels', a.where) || channel(a.where).label, txt(a.what), txt(a.why),
        label('evidenceTypes', a.evidence), theoryName(a.theoryTag), ({ planned: 'Planned', done: 'Done', changed: 'Changed', skipped: 'Skipped' })[a.status || 'planned'] || a.status];
    });
  }
  F['plan.table'] = function (D) {
    var rows = planActions(D, 1);
    if (!rows.length) return fact('My plan table', { empty: 'Your plan table has no actions yet.', route: '#/debut' });
    return fact('My plan table (phase 1)', { table: { head: ['#', 'When', 'Where', 'What', 'Why', 'Evidence', 'Theory', 'Status'], rows: planTable(rows) } });
  };
  F['plan.theoryTags'] = function (D) {
    var seen = {}, l = [];
    planActions(D).forEach(function (a) { if (a.theoryTag && !seen[a.theoryTag]) { seen[a.theoryTag] = 1; l.push(theoryName(a.theoryTag)); } });
    if (!l.length) return fact('Theory ideas in my plan', { empty: 'No planned action has a theory idea yet.', route: '#/debut' });
    return fact('Theory ideas in my plan', { list: l });
  };
  F['plan.variable'] = function (D) {
    var p = planOf(D, 2);
    if (!p || (!txt(p.variableChanged) && !txt(p.p2Hypothesis))) return fact('The one thing I change in phase 2', { empty: 'Not set yet. You plan this on your Pivot card (from L15, Wed 30 Dec).' });
    return fact('The one thing I change in phase 2', { rows: [['Variable I change', p.variableChanged], ['Phase 2 hypothesis', p.p2Hypothesis]].filter(function (r) { return txt(r[1]); }) });
  };
  F['plan.keepStopStart'] = function (D) {
    var p = planOf(D, 2);
    if (!p || (!txt(p.keep) && !txt(p.stop) && !txt(p.start))) return fact('Keep, stop, start', { empty: 'Not written yet. It is part of your Pivot card.' });
    return fact('Keep, stop, start', { rows: [['Keep', p.keep], ['Stop', p.stop], ['Start', p.start]].filter(function (r) { return txt(r[1]); }) });
  };
  F['rules.six'] = function (D) {
    var t = arr(D && D.state && D.state.rulesTicked);
    var n = t.filter(function (x) { return txt(x); }).length;
    var rules = sixRules();
    var o = { rows: [['Rules ticked', n + ' of 6']] };
    if (rules.length) { o.list = rules.map(function (r, i) { return (txt(t[i]) ? '✓ ' : '☐ ') + (i + 1) + '. ' + r; }); o.plain = true; }
    if (n < 6) o.route = '#/debut';
    return fact('The six rules', o);
  };
  F['online.status'] = function (D, o) {
    var st = obj(D && D.state), W = eng(), s = null;
    if (W && typeof W.onlineStatus === 'function') { try { s = W.onlineStatus(D, (o && o.now) || nowIso()); } catch (e) { s = null; } }
    var unlocked = s ? s.unlocked : st.onlineUnlocked === true;
    var by = s ? s.by : st.onlineUnlockedBy;
    var text = unlocked ? 'Unlocked' + (by === 'teacher' ? ' by T.Chris' : '') : 'Locked';
    var rows = [['Online actions', text]];
    if (!unlocked) {
      var oa = String((s && s.opensAt) || (D && D.config && D.config.onlineOpensAt) || '2026-11-26T16:30:00+07:00');
      var hm = (oa.match(/T(\d{2}:\d{2})/) || [])[1];
      rows.push(['When they can open', 'From ' + fmtDate(oa) + (hm ? ', ' + hm : '') + ' (after the L9 safety briefing), once all six rules are ticked. T.Chris can also unlock them.']);
    }
    return fact('Online status', { rows: rows });
  };
  function actionStats(D, phase) {
    var acts = live(D && D.actions).filter(function (a) { return !phase || phaseOfRow(a) === phase; });
    var s = { planned: planActions(D, phase).length, logged: acts.length, as_planned: 0, changed: 0, not_done: 0, inperson: 0, online: 0 };
    acts.forEach(function (a) {
      if (s[a.outcome] != null) s[a.outcome]++;
      if (a.outcome !== 'not_done') { if (isOnlineChannel(a.channelId)) s.online++; else s.inperson++; }
    });
    return s;
  }
  F['log.plannedDone'] = function (D) {
    var s = actionStats(D);
    if (!s.planned && !s.logged) return fact('Planned and done', { empty: 'No planned or logged actions yet.', route: '#/log' });
    return fact('Planned and done', { rows: [
      ['Planned actions', String(s.planned)], ['Actions logged', String(s.logged)],
      ['As planned / changed / did not do it', s.as_planned + ' / ' + s.changed + ' / ' + s.not_done],
      ['Done in person / online', s.inperson + ' / ' + s.online]] });
  };
  function recentActions(D, n) {
    return live(D && D.actions).sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); }).slice(0, n);
  }
  F['log.recent'] = function (D) {
    var l = recentActions(D, 6);
    if (!l.length) return fact('Recent actions', { empty: 'No actions logged yet.', route: '#/log' });
    return fact('Recent actions', { table: { head: ['Date', 'Where', 'What I did', 'Outcome'], rows: l.map(function (a) {
      return [fmtDate(a.date), channel(a.channelId).label, clip(a.what, 90), label('outcomes', a.outcome)];
    }) } });
  };
  F['log.last'] = function (D) {
    var a = recentActions(D, 1)[0];
    if (!a) return fact('My last action', { empty: 'No actions logged yet.', route: '#/log' });
    return fact('My last action', { rows: [['Date', fmtDate(a.date, true)], ['Where', channel(a.channelId).label], ['What I did', a.what], ['Outcome', label('outcomes', a.outcome)], ['What I learned', a.learned]].filter(function (r) { return txt(r[1]); }) });
  };
  function levelTable(D, phase) {
    var by = {};
    [0, 1, 2, 3, 4, 5, 6].forEach(function (l) { by[l] = { n: 0, owned: 0, earned: 0, agreed: 0, confirmed: 0 }; });
    var unlevelled = 0;
    live(D && D.sightings).forEach(function (s) {
      if (phase && phaseOfRow(s) !== phase) return;
      var l = levelOf(s);
      if (l == null || !by[l]) { unlevelled++; return; }
      by[l].n++;
      if (isOwned(s)) by[l].owned++; else by[l].earned++;
      if (s.auditStatus === 'agreed') by[l].agreed++;
      if (s.spotStatus === 'confirmed' || s.spotStatus === 'changed') by[l].confirmed++;
    });
    return { by: by, unlevelled: unlevelled };
  }
  P.levelTable = levelTable;
  var LEVEL_NAMES = { 0: 'Self-report', 1: 'Owned', 2: 'Recognition', 3: 'Comprehension', 4: 'Earned inside my network', 5: 'Earned outside my network', 6: 'Independent recognition' };
  function levelName(l) {
    var L = arr(root.LEVELS);
    for (var i = 0; i < L.length; i++) if (Number(L[i].level) === l && L[i].name) return L[i].name;
    return LEVEL_NAMES[l];
  }
  F['sightings.byLevel'] = function (D, o) {
    var t = levelTable(D, o && o.phase);
    var total = 0;
    var rows = [0, 1, 2, 3, 4, 5, 6].map(function (l) {
      var b = t.by[l];
      total += b.n;
      if (l === 2 || l === 3) return [l + ' ' + levelName(l), 'from the survey', '', '', ''];
      return [l + ' ' + levelName(l), String(b.n), b.owned + ' / ' + b.earned, String(b.agreed), String(b.confirmed)];
    });
    var o2 = { table: { head: ['Level', 'Sightings', 'Owned / earned', 'Audit agreed', 'Checked by T.Chris'], rows: rows, num: [1, 3, 4] } };
    if (t.unlevelled) o2.note = t.unlevelled + ' sighting(s) have no level yet.';
    if (!total && !t.unlevelled) o2.note = 'No sightings recorded yet. A zero result is data too.';
    return fact('Sightings by Evidence Level', o2);
  };
  F['hyp.checks'] = function (D) {
    var hs = arr(wordOf(D).hypotheses);
    if (!hs.length) return fact('Hypothesis checks', { empty: 'You have no hypotheses yet.', route: '#/audition' });
    var waves = ['W2', 'W3', 'W4'].filter(function (w) { var n = waveNote(D, w); return n && Object.keys(obj(n.hypothesisChecks)).length; });
    if (!waves.length) return fact('Hypothesis checks', { empty: 'You check your hypotheses on the wave card from Wave 2.', route: '#/charts' });
    return fact('Hypothesis checks', { table: { head: ['Hypothesis'].concat(waves.map(function (w) { return 'Wave ' + w.slice(1); })), rows: hs.map(function (h, i) {
      return [(i + 1) + '. ' + clip(h.text, 80)].concat(waves.map(function (w) { return label('hypStatuses', obj(waveNote(D, w).hypothesisChecks)[h.id]) || '–'; }));
    }) } });
  };
  function journalKind(kind, title, emptyText, route) {
    return function (D) {
      var l = live(D && D.journal).filter(function (j) { return j.kind === kind; })
        .sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
      if (!l.length) return fact(title, { empty: emptyText, route: route });
      return fact(title, { list: l.slice(0, 5).map(function (j) { return fmtDate(j.date) + ': ' + firstWords(j.text, 40); }) });
    };
  }
  F['journal.failures'] = journalKind('failure_analysis', 'Failed or changed actions I analysed', 'No failure analysis yet.', '#/log/journal/new?kind=failure_analysis');
  F['journal.zero'] = journalKind('zero_result', 'Zero-result weeks', 'No zero-result entries.', '#/log/journal/new?kind=zero_result');
  F['journal.summit'] = journalKind('summit_feedback', 'Summit questions and feedback', 'No Summit feedback entry yet.', '#/log/journal/new?kind=summit_feedback');
  F['journal.theory'] = journalKind('theory_link', 'Theory links (network map, who owns slang)', 'No theory-link entries yet.', '#/log/journal/new?kind=theory_link');
  F['reviews.toChange'] = function (D) {
    var l = arr(D && D.reviews).filter(function (r) { return txt(r.toChange); })
      .sort(function (a, b) { return String(b.weekId || '').localeCompare(String(a.weekId || '')); }).slice(0, 4);
    if (!l.length) return fact('What I said I would change', { empty: 'Your weekly reviews will appear here.' });
    return fact('What I said I would change (weekly reviews)', { list: l.map(function (r) { return 'Week ' + Number(String(r.weekId).slice(1)) + ': ' + firstWords(r.toChange, 40); }) });
  };
  F['report.adjust'] = function (D) {
    var r = arr(D && D.reports).filter(function (x) { return x.type === 'intermediate'; })[0];
    var t = r && txt(obj(r.sections).adjust);
    if (!t) return fact('My planned adjustments', { empty: 'Write them in the Intermediate report (section 4).', route: '#/report/intermediate' });
    return fact('My planned adjustments (Intermediate report)', { list: [firstWords(t, 80)] });
  };
  F['summit.quote'] = function (D) {
    var s = obj(D && D.summit), hook = obj(obj(s.sections).hook), id = hook.quoteSightingId;
    var sg = id && live(D.sightings).filter(function (x) { return x.id === id; })[0];
    if (sg) return fact('Quote for the hook', { rows: [['Quote', sg.quote], ['Date', fmtDate(sg.date)]] });
    var w = wordOf(D);
    return fact('Quote for the hook', { rows: [['My example', w.example1]], note: 'You can pick a quote from one of your sightings instead.' });
  };
  F['summit.aoa'] = function (D) {
    var a = txt(obj(D && D.summit).aoaStatement);
    if (!a) return fact('My analysis-over-adoption statement', { empty: 'Not written yet (Summit Pack, Check tab).' });
    return fact('My analysis-over-adoption statement', { list: [a] });
  };
  F['compare.phases'] = function (D) {
    var a = actionStats(D, 1), b = actionStats(D, 2), la = levelTable(D, 1), lb = levelTable(D, 2);
    function sums(t) { var o = 0, e = 0, hi = null; [0, 1, 4, 5, 6].forEach(function (l) { o += t.by[l].owned; e += t.by[l].earned; if (t.by[l].n) hi = l; }); return { o: o, e: e, hi: hi }; }
    var sa = sums(la), sb = sums(lb);
    var w2 = waveStats(D, 'W2'), w3 = waveStats(D, 'W3');
    var p2 = obj(planOf(D, 2));
    return fact('Phase 1 and phase 2', { table: { head: ['', 'Phase 1', 'Phase 2'], rows: [
      ['Planned actions', String(a.planned), String(b.planned)],
      ['Actions logged', String(a.logged), String(b.logged)],
      ['Done in person / online', a.inperson + ' / ' + a.online, b.inperson + ' / ' + b.online],
      ['Sightings owned / earned', sa.o + ' / ' + sa.e, sb.o + ' / ' + sb.e],
      ['Highest Evidence Level', sa.hi == null ? '–' : String(sa.hi), sb.hi == null ? '–' : String(sb.hi)],
      ['Corrected recognition', (w2 && w2.me ? pctText(w2.me.corrected) + ' (Wave 2)' : '–'), (w3 && w3.me ? pctText(w3.me.corrected) + ' (Wave 3)' : '–')]
    ] }, rows: txt(p2.variableChanged) ? [['Variable changed', p2.variableChanged]] : [] });
  };
  F['tallies.byWeek'] = function (D) {
    var c = chartData('ch_tallies', D);
    if (c.empty) return fact('Tallies by week', { empty: 'No tallies recorded yet.' });
    return fact('Tallies by week', { table: { head: ['Week'].concat(c.series.map(function (s) { return s.name; })), rows: c.categories.map(function (cat, i) {
      return [cat].concat(c.series.map(function (s) { return String(s.values[i]); }));
    }), num: [1, 2, 3, 4] } });
  };
  F['survey.design'] = function () {
    var A = root.WI_ARTICLE || {}, s = obj(A.survey);
    var rows = arr(s.waves).map(function (w) { return [w.label, w.when + ' — ' + w.purpose]; });
    rows.push(['Control words', arr(s.controls).join(', ')]);
    rows.push(['Foil words', arr(s.foils).join(', ')]);
    return fact('Survey design', { rows: rows, list: [s.runBy].concat(arr(s.measures)).filter(Boolean) });
  };
  F['evidence.process'] = function () {
    return fact('Evidence Levels, audits and spot-checks', { list: arr((root.WI_ARTICLE || {}).evidenceProcess) });
  };
  F['article.sources'] = function (D) {
    var l = arr(obj(D && D.article).sources);
    if (!l.length) return fact('My sources', { empty: 'No sources yet. Start with the course texts in the Sources tab.' });
    return fact('My sources', { list: l.map(function (s) { return txt(s.apa) + (txt(s.use) ? ' — ' + txt(s.use) : ''); }) });
  };
  P.facts = F;

  function buildFact(key, D, o) {
    var fn = F[key];
    if (!fn) return fact(key, { empty: 'No facts for this yet.' });
    try { return fn(D || {}, o || {}); } catch (e) { return fact(key, { empty: 'These facts could not be shown.' }); }
  }
  P.buildFact = buildFact;
  function factText(f) {
    var out = [f.title];
    if (f.empty) { out.push(f.empty); return out.join('\n'); }
    arr(f.rows).forEach(function (r) { out.push(r[0] + ': ' + txt(r[1])); });
    if (f.table) {
      out.push(f.table.head.join(' | '));
      f.table.rows.forEach(function (r) { out.push(r.join(' | ')); });
    }
    arr(f.list).forEach(function (x) { out.push('- ' + x); });
    if (f.note) out.push(f.note);
    return out.join('\n');
  }
  P.factText = factText;
  function factHTML(f, key) {
    var h = '<div class="wp-fact" data-fact="' + esc(key) + '"><h4>' + esc(f.title) + '</h4>';
    if (f.empty) {
      h += '<p class="wp-empty">' + esc(f.empty) + '</p>';
      if (f.route) h += '<button type="button" class="linkbtn" data-go="' + esc(f.route) + '">' + esc(f.routeLabel || 'Go and fill it in') + '</button>';
      return h + '</div>';
    }
    if (arr(f.rows).length) {
      h += '<dl class="wp-dl">';
      f.rows.forEach(function (r) { h += '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; });
      h += '</dl>';
    }
    if (f.table) {
      var num = arr(f.table.num), hd = f.table.head, stack = hd.length >= 6;
      h += '<div class="tablewrap wp-tw' + (stack ? ' wp-stackwrap' : '') + '"><table class="t' + (stack ? ' wp-stack' : '') + '"><thead><tr>' + hd.map(function (x, i) { return '<th' + (num.indexOf(i) >= 0 ? ' class="num"' : '') + ' scope="col">' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>';
      f.table.rows.forEach(function (r) { h += '<tr>' + r.map(function (x, i) { return '<td' + (num.indexOf(i) >= 0 ? ' class="num"' : '') + ' data-label="' + esc(hd[i]) + '">' + esc(x) + '</td>'; }).join('') + '</tr>'; });
      h += '</tbody></table></div>';
    }
    if (arr(f.list).length) h += '<ul class="wp-ul' + (f.plain ? ' wp-plain' : '') + '">' + f.list.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    if (f.note) h += '<p class="wp-fnote">' + esc(f.note) + '</p>';
    if (f.route) h += '<button type="button" class="linkbtn" data-go="' + esc(f.route) + '">Finish this</button>';
    return h + '</div>';
  }

  /* ------------------------------------------------------------------ reports (pure) */
  function reportCfg(type) { var R = root.WI_REPORTS || {}; return obj(R.types)[type] || null; }
  function aiCfg() { return obj((root.WI_REPORTS || {}).ai); }
  function aiOk(text) {
    var c = aiCfg(), t = txt(text);
    if (!t) return false;
    return words(t) >= (c.minWords || 10);
  }
  P.aiOk = aiOk;
  /* Check a report's sections against its config. Returns {total, sections:{id:{words,min,ok}}, totalOk, aiOk, ready, problems[]} */
  function reportCheck(type, sections) {
    var cfg = reportCfg(type);
    sections = obj(sections);
    var out = { total: 0, sections: {}, totalOk: true, aiOk: false, ready: false, problems: [] };
    if (!cfg) { out.problems.push('Unknown report.'); return out; }
    cfg.sections.forEach(function (s) {
      var n = words(sections[s.id]);
      out.total += n;
      out.sections[s.id] = { words: n, min: s.minWords, ok: n >= s.minWords };
      if (n < s.minWords) out.problems.push(s.heading + ': at least ' + s.minWords + ' words (now ' + n + ').');
    });
    if (cfg.wordMin != null && out.total < cfg.wordMin) { out.totalOk = false; out.problems.push('The whole report needs at least ' + cfg.wordMin + ' words (now ' + out.total + ').'); }
    if (cfg.wordMax != null && out.total > cfg.wordMax) { out.totalOk = false; out.problems.push('The whole report must be ' + cfg.wordMax + ' words or fewer (now ' + out.total + ').'); }
    out.aiOk = aiOk(sections[aiCfg().id || 'ai']);
    if (!out.aiOk) out.problems.push('Write your AI-use declaration (at least ' + (aiCfg().minWords || 10) + ' words).');
    out.ready = !out.problems.length;
    return out;
  }
  P.reportCheck = reportCheck;
  function reportText(type, sections, D) {
    var cfg = reportCfg(type); sections = obj(sections);
    if (!cfg) return '';
    var w = txt(D && D.word && D.word.word);
    var out = [cfg.title + (w ? ': ' + w : ''), 'EN30202 Sociolinguistics', ''];
    cfg.sections.forEach(function (s) { out.push(s.heading, txt(sections[s.id]), ''); });
    var ai = aiCfg();
    out.push(ai.heading || 'AI-use declaration', txt(sections[ai.id || 'ai']), '');
    out.push('(' + reportCheck(type, sections).total + ' words, not counting the AI-use declaration)');
    return out.join('\n');
  }
  P.reportText = reportText;

  /* ------------------------------------------------------------------ chart data (pure) */
  var PALETTE = {
    light: { surface: '#ffffff', ink: '#1d1430', ink2: '#4a3f5e', muted: '#6e6382', grid: '#eee3ea', axis: '#c9b8c4',
      series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'], control: '#8f879a', foil: '#c2bac9', ref: '#4a3f5e' },
    dark: { surface: '#221735', ink: '#f6eef7', ink2: '#d5c8de', muted: '#ab9cba', grid: '#33264a', axis: '#55456f',
      series: ['#3987e5', '#d95926', '#199e70', '#c98500'], control: '#8a7fa0', foil: '#5f5375', ref: '#d5c8de' }
  };
  P.PALETTE = PALETTE;
  function weekLabel(w) { return 'Wk ' + Number(String(w).slice(1)); }
  function weekSpan(ids) {
    if (!ids.length) return [];
    ids.sort();
    var a = Number(ids[0].slice(1)), b = Number(ids[ids.length - 1].slice(1)), out = [];
    for (var i = a; i <= b; i++) out.push('W' + (i < 10 ? '0' : '') + i);
    return out;
  }
  /* Returns {kind:'line'|'hbar'|'cols'|'stack', categories[], series:[{id,name,values[],color}], unit, yMin, yMax, empty, ref, notes[]} */
  function chartData(chartId, D, opts) {
    opts = opts || {};
    D = D || {};
    var c = { chartId: chartId, categories: [], series: [], unit: '', empty: false };
    if (chartId === 'ch_waves') {
      var ws = publishedWaves(D);
      c.kind = 'line'; c.unit = '%';
      c.categories = ws.map(function (w) { return 'Wave ' + w.slice(1); });
      var st = ws.map(function (w) { return waveStats(D, w); });
      c.series = [
        { id: 'rec', name: 'Recognition', values: st.map(function (s) { return s && s.me ? pctNum(s.me.rec) : null; }), color: 0 },
        { id: 'corr', name: 'Corrected recognition', values: st.map(function (s) { return s && s.me ? pctNum(s.me.corrected) : null; }), color: 1 },
        { id: 'comp', name: 'Comprehension', values: st.map(function (s) { return s && s.me ? pctNum(s.me.comp) : null; }), color: 2 }
      ];
      c.n = st.map(function (s) { return s && s.me ? s.me.n : null; });
      c.empty = !ws.length || !st.some(function (s) { return s && s.me; });
      c.yMax = 100;
    } else if (chartId === 'ch_compare') {
      var wv = opts.waveId || publishedWaves(D).slice(-1)[0];
      var s = wv ? waveStats(D, wv) : null;
      c.kind = 'hbar'; c.unit = '%'; c.waveId = wv;
      if (!s) { c.empty = true; return c; }
      c.title = 'Recognition in Wave ' + wv.slice(1);
      c.categories = s.rows.map(function (r) { return r.termText; });
      c.groups = s.rows.map(function (r) { return r.kind; });
      c.n = s.rows.map(function (r) { return r.n; });
      c.series = [{ id: 'rec', name: 'Know it (%)', values: s.rows.map(function (r) { return pctNum(r.rec); }), color: 0 }];
      if (s.foilRate != null) c.ref = { value: pctNum(s.foilRate), label: 'Foil rate ' + pctText(s.foilRate) };
      c.yMax = 100;
    } else if (chartId === 'ch_levels') {
      var lt = levelTable(D, opts.phase);
      c.kind = 'stack';
      c.categories = ['0', '1', '2', '3', '4', '5', '6'];
      c.catNotes = { 2: 'survey', 3: 'survey' };
      c.series = [
        { id: 'owned', name: 'Owned', values: c.categories.map(function (l) { return (l === '2' || l === '3') ? null : lt.by[l].owned; }), color: 0 },
        { id: 'earned', name: 'Earned', values: c.categories.map(function (l) { return (l === '2' || l === '3') ? null : lt.by[l].earned; }), color: 1 }
      ];
      c.xTitle = 'Evidence Level';
      c.empty = !live(D.sightings).length;
    } else if (chartId === 'ch_actions') {
      var plans = planActions(D, opts.phase), acts = live(D.actions).filter(function (a) { return !opts.phase || phaseOfRow(a) === opts.phase; });
      var ids = {};
      plans.forEach(function (p) { if (p.whenDate || p.weekId) ids[p.weekId || weekIdOf(p.whenDate)] = 1; });
      acts.forEach(function (a) { if (a.date || a.weekId) ids[a.weekId || weekIdOf(a.date)] = 1; });
      var span = weekSpan(Object.keys(ids));
      c.kind = 'cols';
      c.categories = span.map(weekLabel);
      function cnt(list, wk, test) { return list.filter(function (x) { return (x.weekId || weekIdOf(x.whenDate || x.date)) === wk && test(x); }).length; }
      c.series = [
        { id: 'planned', name: 'Planned', values: span.map(function (w) { return cnt(plans, w, function () { return true; }); }), color: 0 },
        { id: 'inperson', name: 'Done in person', values: span.map(function (w) { return cnt(acts, w, function (a) { return a.outcome !== 'not_done' && !isOnlineChannel(a.channelId); }); }), color: 1 },
        { id: 'online', name: 'Done online', values: span.map(function (w) { return cnt(acts, w, function (a) { return a.outcome !== 'not_done' && isOnlineChannel(a.channelId); }); }), color: 2 }
      ];
      c.empty = !span.length;
    } else if (chartId === 'ch_fudge') {
      var f = obj(wordOf(D).fudge);
      c.kind = 'cols';
      c.categories = ['F', 'U', 'D', 'G', 'E'];
      c.catTitles = FUDGE_NAMES;
      var sets = [['pred', 'My prediction', f.pred], ['mid', 'At the Summit', f.mid], ['end', 'In January', f.end]];
      sets.forEach(function (x, i) {
        if (fudgeTotal(x[2]) == null) return;
        c.series.push({ id: x[0], name: x[1], values: c.categories.map(function (k) { return Number(x[2][k]); }), color: i });
      });
      c.yMax = 2; c.ticks = [0, 1, 2];
      c.empty = !c.series.length;
    } else if (chartId === 'ch_tallies') {
      var tl = live(D.tallies), tids = {};
      tl.forEach(function (t) { if (t.date || t.weekId) tids[t.weekId || weekIdOf(t.date)] = 1; });
      var tspan = weekSpan(Object.keys(tids));
      c.kind = 'stack';
      c.categories = tspan.map(weekLabel);
      c.series = ['said', 'heard', 'asked', 'online'].map(function (k, i) {
        return { id: k, name: label('tallyTypes', k), color: i, values: tspan.map(function (w) {
          return tl.filter(function (t) { return t.tallyType === k && (t.weekId || weekIdOf(t.date)) === w; }).reduce(function (a, t) { return a + (Number(t.count) || 0); }, 0);
        }) };
      });
      c.empty = !tspan.length;
    } else {
      c.empty = true; c.unknown = true;
    }
    return c;
  }
  P.chartData = chartData;
  function chartTable(chartId, D, opts) {
    var c = chartData(chartId, D, opts);
    if (c.empty) return null;
    var head = [c.kind === 'hbar' ? 'Word' : (c.xTitle || '')].concat(c.series.map(function (s) { return s.name; }));
    if (c.n) head.push('n');
    var rows = c.categories.map(function (cat, i) {
      var r = [c.catTitles && c.catTitles[cat] ? cat + ' · ' + c.catTitles[cat] : cat];
      c.series.forEach(function (s) { var v = s.values[i]; r.push(v == null ? (c.catNotes && c.catNotes[cat] ? 'from the survey' : '–') : (c.unit === '%' ? pctText(v) : String(v))); });
      if (c.n) r.push(c.n[i] == null ? '–' : String(c.n[i]));
      return r;
    });
    return { head: head, rows: rows };
  }
  P.chartTable = chartTable;

  /* ------------------------------------------------------------------ chart SVG (pure string) */
  function niceStep(max, target) {
    if (max <= 0) return 1;
    var raw = max / (target || 4), pow = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / pow;
    var step = m <= 1 ? 1 : (m <= 2 ? 2 : (m <= 5 ? 5 : 10));
    return Math.max(1, step * pow);
  }
  function fmtTick(v, unit) { return (v < 0 ? '−' + Math.abs(v) : String(v)) + (unit === '%' ? '%' : ''); }
  function colPath(x, yBase, yTop, w, r) {
    // vertical bar: rounded at the data end (away from the baseline), square at the baseline
    var h = Math.abs(yBase - yTop);
    r = Math.min(r, w / 2, h);
    if (h < 0.5) return '';
    if (yTop < yBase) return 'M' + x + ',' + yBase + 'V' + (yTop + r) + 'Q' + x + ',' + yTop + ' ' + (x + r) + ',' + yTop + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + yTop + ' ' + (x + w) + ',' + (yTop + r) + 'V' + yBase + 'Z';
    return 'M' + x + ',' + yBase + 'V' + (yTop - r) + 'Q' + x + ',' + yTop + ' ' + (x + r) + ',' + yTop + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + yTop + ' ' + (x + w) + ',' + (yTop - r) + 'V' + yBase + 'Z';
  }
  function rectPath(x, y0, y1, w) { return 'M' + x + ',' + y0 + 'V' + y1 + 'H' + (x + w) + 'V' + y0 + 'Z'; }
  function hbarPath(xBase, xEnd, y, h, r) {
    var w = xEnd - xBase;
    r = Math.min(r, h / 2, Math.abs(w));
    if (Math.abs(w) < 0.5) return '';
    if (w > 0) return 'M' + xBase + ',' + y + 'H' + (xEnd - r) + 'Q' + xEnd + ',' + y + ' ' + xEnd + ',' + (y + r) + 'V' + (y + h - r) + 'Q' + xEnd + ',' + (y + h) + ' ' + (xEnd - r) + ',' + (y + h) + 'H' + xBase + 'Z';
    return 'M' + xBase + ',' + y + 'H' + (xEnd + r) + 'Q' + xEnd + ',' + y + ' ' + xEnd + ',' + (y + r) + 'V' + (y + h - r) + 'Q' + xEnd + ',' + (y + h) + ' ' + (xEnd + r) + ',' + (y + h) + 'H' + xBase + 'Z';
  }
  function tx(x, y, s, o) {
    o = o || {};
    return '<text x="' + r1(x) + '" y="' + r1(y) + '"' + (o.anchor ? ' text-anchor="' + o.anchor + '"' : '') + ' font-size="' + (o.size || 13) + '"' +
      (o.weight ? ' font-weight="' + o.weight + '"' : '') + ' fill="' + o.fill + '"' + (o.halo ? ' stroke="' + o.halo + '" stroke-width="4" stroke-linejoin="round" paint-order="stroke"' : '') + (o.base ? ' dominant-baseline="' + o.base + '"' : '') + '>' + esc(s) + '</text>';
  }
  function r1(v) { return Math.round(v * 10) / 10; }
  function legendSVG(series, pal, x, y, width, size, lineKey) {
    var out = '', cx = x, cy = y;
    series.forEach(function (s) {
      var w = 22 + s.name.length * size * 0.56 + 16;
      if (cx + w > x + width && cx > x) { cx = x; cy += size + 10; }
      var col = pal.series[s.color % pal.series.length];
      out += lineKey ? '<line x1="' + r1(cx) + '" y1="' + r1(cy - size * 0.35) + '" x2="' + r1(cx + 16) + '" y2="' + r1(cy - size * 0.35) + '" stroke="' + col + '" stroke-width="3" stroke-linecap="round"/>'
        : '<rect x="' + r1(cx) + '" y="' + r1(cy - size * 0.8) + '" width="12" height="12" rx="3" fill="' + col + '"/>';
      out += tx(cx + (lineKey ? 22 : 18), cy, s.name, { size: size, fill: pal.ink2 });
      cx += w;
    });
    return { svg: out, bottom: cy + 8 };
  }
  /* chartSVG(chartId, D, opts) → SVG markup string.
     opts: {width=800, height=450, theme:'light'|'dark', waveId?, phase?, title?:bool (draw title + caption, for PNG), caption?, word?} */
  function chartSVG(chartId, D, opts) {
    opts = opts || {};
    var W = Math.max(280, Math.round(opts.width || 800)), H = Math.max(200, Math.round(opts.height || 450));
    var pal = PALETTE[opts.theme === 'dark' ? 'dark' : 'light'];
    var c = chartData(chartId, D, opts);
    var fs = opts.fontSize || (W < 480 ? 12 : 14);
    var cfg = arr((root.WI_SUMMIT || {}).charts).filter(function (x) { return x.id === chartId; })[0] || { title: chartId, caption: '' };
    var title = c.title || cfg.title;
    var head = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(title) + '" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif" class="wp-svg">';
    var body = '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + pal.surface + '"/>';
    var top = 10, bottomPad = 8;
    if (opts.title) {
      body += tx(24, 38, title, { size: 24, weight: 700, fill: pal.ink });
      var cap = opts.caption != null ? opts.caption : cfg.caption;
      if (cap) body += tx(24, 64, clip(cap, 110), { size: 15, fill: pal.ink2 });
      body += tx(W - 24, H - 14, 'WordIdol · EN30202' + (opts.word ? ' · ' + opts.word : ''), { size: 12, fill: pal.muted, anchor: 'end' });
      top = cap ? 84 : 58; bottomPad = 30;
    }
    if (c.empty) {
      body += tx(W / 2, (top + H) / 2, c.unknown ? 'Unknown chart' : 'No data yet', { size: fs + 2, fill: pal.muted, anchor: 'middle', weight: 600 });
      return head + body + '</svg>';
    }
    var padL = 14, padR = 16;
    var inner;
    if (c.kind === 'hbar') inner = drawHbar(c, pal, padL, top, W - padL - padR, H - top - bottomPad, fs);
    else if (c.kind === 'line') inner = drawLine(c, pal, padL, top, W - padL - padR, H - top - bottomPad, fs);
    else inner = drawCols(c, pal, padL, top, W - padL - padR, H - top - bottomPad, fs);
    return head + body + inner + '</svg>';
  }
  P.chartSVG = chartSVG;

  function drawHbar(c, pal, x0, y0, w, h, fs) {
    var out = '', vals = '', n = c.categories.length;
    var labelW = Math.min(w * 0.38, 190), valueW = 46;
    var plotX = x0 + labelW, plotW = w - labelW - valueW;
    var axisH = fs + 12, refH = c.ref ? fs + 8 : 0;
    var band = (h - axisH - refH) / n, barH = Math.min(24, band * 0.62);
    var max = c.yMax || 100;
    function X(v) { return plotX + plotW * Math.max(0, Math.min(v, max)) / max; }
    // grid + ticks
    [0, 25, 50, 75, 100].forEach(function (t) {
      out += '<line x1="' + r1(X(t)) + '" y1="' + r1(y0 + refH) + '" x2="' + r1(X(t)) + '" y2="' + r1(y0 + h - axisH) + '" stroke="' + (t === 0 ? pal.axis : pal.grid) + '" stroke-width="1"/>';
      out += tx(X(t), y0 + h - 4, fmtTick(t, '%'), { size: fs - 1, fill: pal.muted, anchor: 'middle' });
    });
    c.categories.forEach(function (cat, i) {
      var v = c.series[0].values[i], kind = c.groups[i];
      var by = y0 + refH + band * i + (band - barH) / 2;
      var col = kind === 'me' ? pal.series[0] : (kind === 'control' ? pal.control : pal.foil);
      var tag = kind === 'me' ? 'My word' : (kind === 'control' ? 'Control' : 'Foil');
      out += '<g><title>' + esc(tag + ': ' + cat + ' · ' + pctText(v) + ' know it (n = ' + c.n[i] + ')') + '</title>';
      out += tx(plotX - 8, by + barH / 2 - fs * 0.15, clip(cat, 22), { size: fs, fill: pal.ink, anchor: 'end', weight: kind === 'me' ? 700 : 400 });
      out += tx(plotX - 8, by + barH / 2 + fs * 0.95, tag, { size: fs - 2, fill: pal.muted, anchor: 'end' });
      if (v != null && v > 0) out += '<path d="' + hbarPath(plotX, X(v), by, barH, 4) + '" fill="' + col + '"/>';
      vals += tx(X(v || 0) + 6, by + barH / 2, pctText(v), { size: fs, fill: pal.ink2, base: 'central', weight: kind === 'me' ? 700 : 400, halo: pal.surface });
      out += '<rect x="' + r1(x0) + '" y="' + r1(y0 + refH + band * i) + '" width="' + r1(w) + '" height="' + r1(band) + '" fill="transparent"/></g>';
    });
    if (c.ref) {
      var rx = X(c.ref.value);
      out += '<line x1="' + r1(rx) + '" y1="' + r1(y0 + refH - 2) + '" x2="' + r1(rx) + '" y2="' + r1(y0 + h - axisH) + '" stroke="' + pal.ref + '" stroke-width="1.5"/>';
      out += tx(Math.min(rx, plotX + plotW - 4), y0 + fs, c.ref.label, { size: fs - 1, fill: pal.ink2, anchor: rx > plotX + plotW * 0.6 ? 'end' : 'start' });
    }
    out += vals;
    return out;
  }
  function drawLine(c, pal, x0, y0, w, h, fs) {
    var out = '';
    var leg = legendSVG(c.series, pal, x0 + 4, y0 + fs + 4, w - 8, fs, true);
    out += leg.svg;
    var top = leg.bottom + 8, axisH = fs + 14, labelW = Math.min(150, w * 0.3);
    var all = [];
    c.series.forEach(function (s) { s.values.forEach(function (v) { if (v != null) all.push(v); }); });
    var lo = Math.min.apply(null, all.concat([0]));
    var yMin = lo < 0 ? -25 * Math.ceil(-lo / 25) : 0, yMax = c.yMax || 100;
    var plotX = x0 + 40, plotW = w - 40 - labelW, plotY = top, plotH = h - (top - y0) - axisH;
    function Y(v) { return plotY + plotH * (yMax - v) / (yMax - yMin); }
    var n = c.categories.length;
    function X(i) { return n === 1 ? plotX + plotW / 2 : plotX + 18 + (plotW - 36) * i / (n - 1); }
    var step = 25, ticks = [];
    for (var t = yMin; t <= yMax; t += step) ticks.push(t);
    ticks.forEach(function (t) {
      out += '<line x1="' + r1(plotX) + '" y1="' + r1(Y(t)) + '" x2="' + r1(plotX + plotW) + '" y2="' + r1(Y(t)) + '" stroke="' + (t === 0 ? pal.axis : pal.grid) + '" stroke-width="1"/>';
      out += tx(plotX - 6, Y(t), fmtTick(t, '%'), { size: fs - 1, fill: pal.muted, anchor: 'end', base: 'central' });
    });
    c.categories.forEach(function (cat, i) {
      out += tx(X(i), plotY + plotH + fs + 6, cat, { size: fs - 1, fill: pal.muted, anchor: 'middle' });
    });
    var ends = [];
    c.series.forEach(function (s) {
      var col = pal.series[s.color], pts = [];
      s.values.forEach(function (v, i) { if (v != null) pts.push([X(i), Y(v), v, i]); });
      if (pts.length > 1) out += '<polyline points="' + pts.map(function (p) { return r1(p[0]) + ',' + r1(p[1]); }).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
      pts.forEach(function (p) {
        out += '<g><title>' + esc(c.categories[p[3]] + ' · ' + s.name + ': ' + pctText(p[2]) + (c.n && c.n[p[3]] != null ? ' (n = ' + c.n[p[3]] + ')' : '')) + '</title>' +
          '<circle cx="' + r1(p[0]) + '" cy="' + r1(p[1]) + '" r="12" fill="transparent"/>' +
          '<circle cx="' + r1(p[0]) + '" cy="' + r1(p[1]) + '" r="4.5" fill="' + col + '" stroke="' + pal.surface + '" stroke-width="2"/></g>';
      });
      if (pts.length) ends.push({ y: pts[pts.length - 1][1], x: pts[pts.length - 1][0], text: s.name.replace('Corrected recognition', 'Corrected') + ' ' + pctText(pts[pts.length - 1][2]) });
    });
    // end labels with leader lines; spread to avoid collisions
    ends.sort(function (a, b) { return a.y - b.y; });
    var gap = fs + 4;
    for (var k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < gap) ends[k].ly = (ends[k - 1].ly || ends[k - 1].y) + gap;
    ends.forEach(function (e) {
      var ly = e.ly || e.y, lx = plotX + plotW + 14;
      out += '<line x1="' + r1(e.x + 6) + '" y1="' + r1(e.y) + '" x2="' + r1(lx - 3) + '" y2="' + r1(ly) + '" stroke="' + pal.axis + '" stroke-width="1"/>';
      out += tx(lx, ly, e.text, { size: fs - 1, fill: pal.ink2, base: 'central' });
    });
    return out;
  }
  function drawCols(c, pal, x0, y0, w, h, fs) {
    var out = '';
    var multi = c.series.length > 1;
    var top = y0 + 4;
    if (multi) { var leg = legendSVG(c.series, pal, x0 + 4, y0 + fs + 4, w - 8, fs, false); out += leg.svg; top = leg.bottom + 8; }
    var axisH = fs + 14 + (c.xTitle ? fs + 6 : 0) + (c.catNotes ? fs : 0);
    var stack = c.kind === 'stack';
    var max = 0;
    c.categories.forEach(function (cat, i) {
      if (stack) { var s = 0; c.series.forEach(function (se) { s += se.values[i] || 0; }); max = Math.max(max, s); }
      else c.series.forEach(function (se) { max = Math.max(max, se.values[i] || 0); });
    });
    var step = c.ticks ? 1 : niceStep(Math.max(max, 1), 4);
    var yMax = c.yMax || Math.max(step, Math.ceil(max / step) * step);
    var ticks = c.ticks || [];
    if (!c.ticks) for (var t = 0; t <= yMax; t += step) ticks.push(t);
    var plotX = x0 + 34, plotW = w - 34, plotY = top + fs, plotH = h - (top - y0) - axisH - fs;
    function Y(v) { return plotY + plotH * (1 - v / yMax); }
    ticks.forEach(function (t) {
      out += '<line x1="' + r1(plotX) + '" y1="' + r1(Y(t)) + '" x2="' + r1(plotX + plotW) + '" y2="' + r1(Y(t)) + '" stroke="' + (t === 0 ? pal.axis : pal.grid) + '" stroke-width="1"/>';
      out += tx(plotX - 6, Y(t), fmtTick(t, c.unit), { size: fs - 1, fill: pal.muted, anchor: 'end', base: 'central' });
    });
    var n = c.categories.length, band = plotW / n;
    var groupN = stack ? 1 : c.series.length;
    var barW = Math.min(24, (band * 0.72 - (groupN - 1) * 2) / groupN);
    var groupW = barW * groupN + (groupN - 1) * 2;
    var showVals = !stack && n * groupN <= 15;
    c.categories.forEach(function (cat, i) {
      var gx = plotX + band * i + (band - groupW) / 2;
      var tip = [cat + (c.catTitles && c.catTitles[cat] ? ' · ' + c.catTitles[cat] : '')];
      if (stack) {
        var base = 0, segs = [];
        c.series.forEach(function (s) { var v = s.values[i] || 0; if (v > 0) segs.push([s, v]); });
        segs.forEach(function (sv, k) {
          var y1 = Y(base + sv[1]), yb = Y(base) - (k > 0 ? 2 : 0);
          var col = pal.series[sv[0].color];
          out += '<path d="' + (k === segs.length - 1 ? colPath(gx, yb, y1, barW, 4) : rectPath(gx, yb, y1, barW)) + '" fill="' + col + '"/>';
          base += sv[1];
        });
        c.series.forEach(function (s) { tip.push(s.name + ': ' + (s.values[i] == null ? 'from the survey' : s.values[i])); });
        if (base > 0) out += tx(gx + barW / 2, Y(base) - 5, String(base), { size: fs - 1, fill: pal.ink2, anchor: 'middle' });
      } else {
        c.series.forEach(function (s, k) {
          var v = s.values[i] || 0, bx = gx + k * (barW + 2);
          if (v > 0) out += '<path d="' + colPath(bx, Y(0), Y(v), barW, 4) + '" fill="' + pal.series[s.color] + '"/>';
          if (showVals) out += tx(bx + barW / 2, Y(v) - 5, String(v), { size: fs - 2, fill: pal.ink2, anchor: 'middle' });
          tip.push(s.name + ': ' + v);
        });
      }
      out += '<g><title>' + esc(tip.join(' · ')) + '</title><rect x="' + r1(plotX + band * i) + '" y="' + r1(plotY - fs) + '" width="' + r1(band) + '" height="' + r1(plotH + fs + 4) + '" fill="transparent"/></g>';
      var lab = n > 9 ? cat.replace('Wk ', '') : cat;
      out += tx(plotX + band * i + band / 2, plotY + plotH + fs + 4, lab, { size: fs - 1, fill: pal.muted, anchor: 'middle' });
      if (c.catNotes && c.catNotes[cat]) out += tx(plotX + band * i + band / 2, plotY + plotH + 2 * fs + 4, c.catNotes[cat], { size: fs - 3, fill: pal.muted, anchor: 'middle' });
    });
    if (c.xTitle) out += tx(plotX + plotW / 2, y0 + h - 2, c.xTitle, { size: fs - 1, fill: pal.muted, anchor: 'middle' });
    else if (n > 9) out += tx(plotX + plotW / 2, y0 + h - 2, 'Week', { size: fs - 1, fill: pal.muted, anchor: 'middle' });
    return out;
  }

  function slug(s) { return txt(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'word'; }
  function pngName(chartId, D) {
    var tpl = ((root.WI_SUMMIT || {}).png || {}).fileName || 'wordidol-{chartId}-{word}.png';
    return tpl.replace('{chartId}', chartId).replace('{word}', slug(D && D.word && D.word.word));
  }
  P.pngName = pngName;

  /* ------------------------------------------------------------------ DOM helpers */
  function isDark() {
    if (typeof document === 'undefined') return false;
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return !!(root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  P.isDark = isDark;
  function toast(ctx, msg) { if (ctx && typeof ctx.toast === 'function') ctx.toast(msg); }
  function relOf(ctx) { var r = ctx && ctx.release; if (r == null) r = (root.WI_CONFIG || {}).release; return Number(r) || 1; }
  function draftGet(key) { try { var v = root.localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function draftSet(key, v) { try { root.localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function draftDel(key) { try { root.localStorage.removeItem(key); } catch (e) { /* ignore */ } }
  function setSaveState(node, kind, msg) {
    if (!node) return;
    node.className = 'savestate' + (kind === 'ok' ? ' ok' : (kind === 'wait' ? ' wait' : ''));
    node.textContent = msg;
  }
  /* Calls ctx.save and shows the result. Resolves with {ok, queued, error}. */
  function doSave(ctx, action, data, stateNode) {
    setSaveState(stateNode, '', 'Saving …');
    var p;
    try { p = ctx && typeof ctx.save === 'function' ? Promise.resolve(ctx.save(action, data)) : Promise.reject(new Error('no save')); } catch (e) { p = Promise.reject(e); }
    return p.then(function (r) {
      if (r && r.ok === false) {
        var m = (r.error && r.error.message) || 'That did not save. Please try again.';
        setSaveState(stateNode, 'wait', m);
        return { ok: false, error: r.error || { message: m } };
      }
      if (r && (r.queued || r.offline)) { setSaveState(stateNode, 'wait', 'Waiting to send (offline)'); return { ok: true, queued: true }; }
      setSaveState(stateNode, 'ok', 'Saved');
      return { ok: true };
    }, function () {
      setSaveState(stateNode, 'wait', 'Waiting to send (offline)');
      return { ok: true, queued: true };
    });
  }
  function copyText(text, ctx, host) {
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px';
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand && document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) { toast(ctx, 'Copied. Paste it into your Google Doc.'); return true; }
      } catch (e) { /* fall through */ }
      // last resort: show the text so she can copy it by hand
      if (host) {
        var box = host.querySelector('.wp-copybox');
        if (!box) { box = document.createElement('div'); box.className = 'wp-copybox field'; host.appendChild(box); }
        box.innerHTML = '<label>Your browser did not copy it. Select all the text below and copy it.</label><textarea class="tall" readonly></textarea>';
        box.querySelector('textarea').value = text;
        box.querySelector('textarea').focus();
        box.querySelector('textarea').select();
      }
      return false;
    }
    if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
      return root.navigator.clipboard.writeText(text).then(function () { toast(ctx, 'Copied. Paste it into your Google Doc.'); return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }
  P.copyText = copyText;
  function wireGo(el, ctx) {
    el.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-go]');
      if (b && el.contains(b)) { ev.preventDefault(); if (ctx && typeof ctx.go === 'function') ctx.go(b.getAttribute('data-go')); else root.location.hash = b.getAttribute('data-go'); }
    });
  }
  function framesFor(groups) {
    var Fr = root.FRAMES, out = [];
    if (!Fr) return out;
    var list = Array.isArray(Fr) ? Fr : (Array.isArray(Fr.frames) ? Fr.frames : [].concat.apply([], Object.keys(Fr).map(function (g) { return arr(Fr[g]).map(function (x) { return typeof x === 'string' ? { group: g, text: x } : Object.assign({ group: g }, x); }); })));
    arr(groups).forEach(function (g) { list.forEach(function (f) { if (f && f.group === g && f.text) out.push(f.text); }); });
    return out;
  }
  function principleHTML() { return '<p class="principle">' + esc(principle()) + '</p>'; }
  function opensHTML(title, when, text) {
    return '<div class="screen-head"><h1>' + esc(title) + '</h1></div>' +
      '<div class="panel opens wp-opens"><p class="muted">This part of WordIdol opens on</p><p class="when">' + esc(when) + '</p>' +
      (text ? '<p>' + esc(text) + '</p>' : '') + '</div>' + principleHTML();
  }
  P.opensHTML = opensHTML;

  /* ------------------------------------------------------------------ chart cards (DOM) */
  var resizeHooked = false, chartNodes = [];
  function drawChartNode(node, D) {
    var id = node.getAttribute('data-chart'), waveId = node.getAttribute('data-wave') || undefined;
    var phase = node.getAttribute('data-phase'); phase = phase ? Number(phase) : undefined;
    var w = node.clientWidth || (node.parentNode && node.parentNode.clientWidth) || 320;
    var h = Math.round(Math.max(220, Math.min(380, w * (id === 'ch_compare' ? 0.72 : 0.64))));
    node.innerHTML = chartSVG(id, D, { width: w, height: h, theme: isDark() ? 'dark' : 'light', waveId: waveId, phase: phase });
    node._wpD = D;
  }
  function hookResize() {
    if (resizeHooked || typeof root.addEventListener !== 'function') return;
    resizeHooked = true;
    var t = null;
    function redraw() {
      chartNodes = chartNodes.filter(function (n) { return n.isConnected; });
      chartNodes.forEach(function (n) { drawChartNode(n, n._wpD); });
    }
    root.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(redraw, 150); });
    if (root.matchMedia) { try { root.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw); } catch (e) { /* old browsers */ } }
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }
  }
  function chartCardHTML(chartId, D, o) {
    o = o || {};
    var cfg = arr((root.WI_SUMMIT || {}).charts).filter(function (x) { return x.id === chartId; })[0] || { title: chartId, caption: '' };
    var t = chartTable(chartId, D, o);
    var h = '<figure class="wp-chart" data-chartcard="' + esc(chartId) + '">';
    if (!o.noTitle) h += '<figcaption class="wp-chart-h"><b>' + esc(o.title || cfg.title) + '</b><span>' + esc(o.caption || cfg.caption) + '</span></figcaption>';
    h += '<div class="wp-chart-svg" data-chart="' + esc(chartId) + '"' + (o.waveId ? ' data-wave="' + esc(o.waveId) + '"' : '') + (o.phase ? ' data-phase="' + o.phase + '"' : '') + '></div>';
    if (t) {
      h += '<details class="wp-numbers"><summary>See the numbers</summary><div class="tablewrap"><table class="t"><thead><tr>' +
        t.head.map(function (x, i) { return '<th scope="col"' + (i ? ' class="num"' : '') + '>' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        t.rows.map(function (r) { return '<tr>' + r.map(function (x, i) { return '<td' + (i ? ' class="num"' : '') + '>' + esc(x) + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div></details>';
      h += '<div class="btnrow"><button type="button" class="btn small ghost" data-png="' + esc(chartId) + '"' + (o.waveId ? ' data-wave="' + esc(o.waveId) + '"' : '') + '>' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Download PNG</button></div>';
    }
    return h + '</figure>';
  }
  function mountCharts(el, D) {
    var nodes = el.querySelectorAll('[data-chart]');
    for (var i = 0; i < nodes.length; i++) { drawChartNode(nodes[i], D); chartNodes.push(nodes[i]); }
    hookResize();
  }
  /* SVG → canvas 1600 × 900 → PNG download. Resolves with the file name. */
  function downloadPNG(chartId, D, opts) {
    opts = opts || {};
    var S = (root.WI_SUMMIT || {}).png || {};
    var PW = S.width || 1600, PH = S.height || 900, scale = 2;
    var cfg = arr((root.WI_SUMMIT || {}).charts).filter(function (x) { return x.id === chartId; })[0] || {};
    var svg = chartSVG(chartId, D, { width: PW / scale, height: PH / scale, theme: 'light', title: true, waveId: opts.waveId, phase: opts.phase,
      caption: opts.caption != null ? opts.caption : cfg.caption, word: txt(D && D.word && D.word.word), fontSize: 14 });
    var name = pngName(chartId, D);
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        try {
          var cv = document.createElement('canvas');
          cv.width = PW; cv.height = PH;
          var g = cv.getContext('2d');
          g.fillStyle = '#ffffff'; g.fillRect(0, 0, PW, PH);
          g.drawImage(img, 0, 0, PW, PH);
          cv.toBlob(function (blob) {
            if (!blob) { reject(new Error('png')); return; }
            var url = URL.createObjectURL(blob), a = document.createElement('a');
            a.href = url; a.download = name; document.body.appendChild(a); a.click();
            setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
            resolve(name);
          }, 'image/png');
        } catch (e) { reject(e); }
      };
      img.onerror = function () { reject(new Error('svg')); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  P.downloadPNG = downloadPNG;
  function wirePNG(el, ctx, D) {
    el.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-png]');
      if (!b || !el.contains(b)) return;
      downloadPNG(b.getAttribute('data-png'), D, { waveId: b.getAttribute('data-wave') || undefined })
        .then(function () { toast(ctx, 'PNG saved to your downloads.'); }, function () { toast(ctx, 'The picture could not be made on this device.'); });
    });
  }

  /* ------------------------------------------------------------------ report helper screen */
  function reportRow(D, type) {
    return arr(D && D.reports).filter(function (r) { return r.type === type && (!r.studentId || r.studentId === sidOf(D)); })[0] || null;
  }
  var STATUS_TEXT = { draft: 'Draft', ready: 'Ready', submitted: 'Submitted' };
  function renderReport(el, ctx, type) {
    ctx = ctx || {};
    var D = ctx.D || {};
    var cfg = reportCfg(type);
    if (!cfg) { el.innerHTML = '<div class="panel"><h1>Report not found</h1><p>Go back to the menu and choose a report.</p></div>'; return; }
    if (relOf(ctx) < cfg.release) {
      el.innerHTML = opensHTML(cfg.title + ' helper', cfg.opensLabel, 'The report is due on ' + cfg.dueLabel + '. Keep logging your actions, sightings and Lab Book entries: the helper builds the facts from them.');
      return;
    }
    var ai = aiCfg(), aiId = ai.id || 'ai';
    var row = reportRow(D, type);
    var sections = Object.assign({}, obj(row && row.sections));
    var status = (row && row.status) || 'draft';
    var dkey = 'wi.draft.report.' + type;
    var draft = draftGet(dkey), fromDraft = false;
    // a draft is removed after every clean save, so one that is still here and not older than the saved row holds newer text
    if (draft && draft.sections && (!row || !row.updatedAt || String(draft.at || '') >= String(row.updatedAt))) {
      var differs = Object.keys(draft.sections).some(function (k) { return txt(draft.sections[k]) !== txt(sections[k]); });
      if (differs) { sections = Object.assign(sections, draft.sections); fromDraft = true; }
    }
    var now = nowIso(ctx);
    var range = cfg.wordMin != null ? cfg.wordMin + '–' + cfg.wordMax + ' words' : 'length set by T.Chris';
    var h = '<div class="wp wp-report" data-report="' + esc(type) + '">';
    h += '<div class="screen-head"><h1>' + esc(cfg.title) + '</h1><span class="chip wp-status" data-status></span></div>';
    h += '<p class="lead">Due ' + esc(cfg.dueLabel) + ' · ' + esc(range) + ' · ' + esc(cfg.kit) + '</p>';
    h += '<p>' + esc(cfg.intro) + '</p>';
    h += '<div class="note">' + esc((root.WI_REPORTS || {}).submitNote || '') + '</div>';
    h += '<div class="panel tint wp-meter" aria-live="polite"><div class="wp-meter-top"><b data-total>0</b><span> words</span><span class="muted" data-range></span></div>' +
      '<div class="wp-bar" aria-hidden="true"><i data-bar></i>' + (cfg.wordMin != null ? '<s data-min></s><s data-max></s>' : '') + '</div>' +
      '<ul class="wp-ticks" data-ticks></ul></div>';
    cfg.sections.forEach(function (s) {
      h += '<section class="panel wp-sec" data-sec="' + esc(s.id) + '"><h2>' + esc(s.heading) + '</h2>';
      h += '<p class="muted wp-prompt">' + esc(s.prompt) + '</p>';
      h += '<details class="wp-facts" open><summary>Your facts from WordIdol</summary><div class="wp-facts-body">';
      s.facts.forEach(function (k) { h += factHTML(buildFact(k, D, { now: now }), k); });
      h += '<button type="button" class="btn small ghost" data-copyfacts="' + esc(s.id) + '">Copy these facts</button></div></details>';
      var fr = arr(s.starters).concat(framesFor(s.frameGroups));
      if (fr.length) h += '<details class="wp-frames"><summary>Sentence starters</summary><ul>' + fr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details>';
      h += '<div class="field"><label for="wp-' + esc(type) + '-' + esc(s.id) + '">Your text' + (s.suggest ? ' <span class="muted">(about ' + esc(s.suggest) + ' words)</span>' : '') + '</label>' +
        '<textarea class="tall" id="wp-' + esc(type) + '-' + esc(s.id) + '" data-text="' + esc(s.id) + '" maxlength="' + ((root.WI_REPORTS || {}).sectionMaxChars || 6000) + '"></textarea>' +
        '<div class="count" data-count="' + esc(s.id) + '"></div></div></section>';
    });
    h += '<section class="panel wp-sec" data-sec="' + esc(aiId) + '"><h2>' + esc(ai.heading || 'AI-use declaration') + '</h2>' +
      '<div class="field"><label for="wp-' + esc(type) + '-ai">' + esc(ai.label || '') + '</label><p class="hint">' + esc(ai.hint || '') + '</p>' +
      '<textarea id="wp-' + esc(type) + '-ai" data-text="' + esc(aiId) + '" maxlength="' + (ai.maxChars || 1500) + '"></textarea><div class="count" data-count="' + esc(aiId) + '"></div></div>' +
      (arr(ai.starters).length ? '<details class="wp-frames"><summary>Examples</summary><ul>' + ai.starters.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details>' : '') + '</section>';
    h += '<div class="note bad hidden" data-problems role="alert"></div>';
    h += '<div class="btnrow wp-actions">' +
      '<button type="button" class="btn ghost" data-act="copy">Copy whole report</button>' +
      '<button type="button" class="btn primary" data-act="ready">Mark as ready</button>' +
      '<button type="button" class="btn gold" data-act="submitted">I have submitted it in Google Classroom</button></div>';
    h += principleHTML();
    h += '<div class="formfoot wp-foot"><span class="wp-foottotal" data-foottotal></span><span class="savestate" data-savestate></span>' +
      '<button type="button" class="btn" data-act="save">Save</button></div>';
    h += '</div>';
    el.innerHTML = h;
    wireGo(el, ctx);

    var stateNode = el.querySelector('[data-savestate]');
    var boxes = el.querySelectorAll('[data-text]');
    for (var i = 0; i < boxes.length; i++) boxes[i].value = sections[boxes[i].getAttribute('data-text')] || '';
    if (fromDraft) setSaveState(stateNode, '', 'Saved on this phone');
    var dirty = fromDraft;

    function collect() {
      var o = {};
      for (var j = 0; j < boxes.length; j++) o[boxes[j].getAttribute('data-text')] = boxes[j].value.trim();
      return o;
    }
    function paintStatus() {
      var chip = el.querySelector('[data-status]');
      chip.textContent = STATUS_TEXT[status] || status;
      chip.className = 'chip wp-status' + (status === 'submitted' ? ' ok' : (status === 'ready' ? ' gold' : ''));
      var sb = el.querySelector('[data-act="submitted"]');
      sb.setAttribute('aria-disabled', status === 'draft' ? 'true' : 'false');
      if (status === 'submitted') sb.textContent = 'Submitted in Google Classroom ✓';
    }
    function paint() {
      var s = collect(), chk = reportCheck(type, s);
      el.querySelector('[data-total]').textContent = String(chk.total);
      el.querySelector('[data-foottotal]').textContent = chk.total + (cfg.wordMin != null ? ' / ' + cfg.wordMin + '–' + cfg.wordMax : '') + ' words';
      el.querySelector('[data-range]').textContent = cfg.wordMin != null ? ' of ' + cfg.wordMin + '–' + cfg.wordMax : ' (each section at least ' + cfg.sections[0].minWords + ')';
      var bar = el.querySelector('[data-bar]');
      var maxScale = (cfg.wordMax || 900) * 1.15;
      bar.style.width = Math.min(100, 100 * chk.total / maxScale) + '%';
      bar.className = cfg.wordMin == null ? '' : (chk.total > cfg.wordMax ? 'over' : (chk.total >= cfg.wordMin ? 'in' : ''));
      var mn = el.querySelector('[data-min]'), mx = el.querySelector('[data-max]');
      if (mn) mn.style.left = (100 * cfg.wordMin / maxScale) + '%';
      if (mx) mx.style.left = (100 * cfg.wordMax / maxScale) + '%';
      var ticks = cfg.sections.map(function (sec) {
        var r = chk.sections[sec.id];
        return '<li class="' + (r.ok ? 'ok' : '') + '">' + (r.ok ? '✓ ' : '') + esc(sec.heading.replace(/^\d+\.\s*/, '')) + ' <span class="muted">' + r.words + '/' + r.min + '</span></li>';
      });
      ticks.push('<li class="' + (chk.aiOk ? 'ok' : '') + '">' + (chk.aiOk ? '✓ ' : '') + 'AI-use declaration</li>');
      el.querySelector('[data-ticks]').innerHTML = ticks.join('');
      cfg.sections.forEach(function (sec) {
        var r = chk.sections[sec.id], c = el.querySelector('[data-count="' + sec.id + '"]');
        c.textContent = r.words + ' words · at least ' + r.min;
        c.className = 'count' + (r.ok ? ' wp-ok' : '');
      });
      var ac = el.querySelector('[data-count="' + aiId + '"]');
      ac.textContent = words(s[aiId]) + ' words' + (chk.aiOk ? ' · ✓' : ' · at least ' + (ai.minWords || 10));
      ac.className = 'count' + (chk.aiOk ? ' wp-ok' : '');
      return chk;
    }
    function showProblems(list) {
      var n = el.querySelector('[data-problems]');
      if (!list || !list.length) { n.classList.add('hidden'); n.innerHTML = ''; return; }
      n.classList.remove('hidden');
      n.innerHTML = '<b>Not ready yet:</b><ul>' + list.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>';
    }
    function save(newStatus) {
      var s = collect(), chk = reportCheck(type, s);
      var st = newStatus || status;
      if (st === 'ready' && !chk.ready) st = 'draft'; // a ready report that no longer meets the counts goes back to draft
      var sent = JSON.stringify(s);
      return doSave(ctx, 'report.save', { type: type, sections: s, status: st }, stateNode).then(function (r) {
        if (r.ok) {
          status = st; paintStatus();
          // she may have typed more while this save was on its way: keep that text as a draft
          if (JSON.stringify(collect()) === sent) { dirty = false; draftDel(dkey); }
          else { dirty = true; draftSet(dkey, { sections: collect(), at: nowIso(ctx) }); setSaveState(stateNode, '', 'Saved on this phone'); }
        }
        return r;
      });
    }
    el.addEventListener('input', function (ev) {
      if (!ev.target.matches || !ev.target.matches('[data-text]')) return;
      dirty = true;
      draftSet(dkey, { sections: collect(), at: nowIso(ctx) });
      setSaveState(stateNode, '', 'Saved on this phone');
      paint();
    });
    el.addEventListener('change', function (ev) {
      if (ev.target.matches && ev.target.matches('[data-text]') && dirty) save();
    });
    el.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-act],[data-copyfacts]');
      if (!b || !el.contains(b)) return;
      if (b.hasAttribute('data-copyfacts')) {
        var sec = cfg.sections.filter(function (x) { return x.id === b.getAttribute('data-copyfacts'); })[0];
        copyText(sec.facts.map(function (k) { return factText(buildFact(k, D, { now: now })); }).join('\n\n'), ctx, b.parentNode);
        return;
      }
      var act = b.getAttribute('data-act');
      if (act === 'save') { showProblems(null); save(); }
      else if (act === 'copy') copyText(reportText(type, collect(), D), ctx, el.querySelector('.wp-actions'));
      else if (act === 'ready') {
        var chk = paint();
        if (!chk.ready) { showProblems(chk.problems); el.querySelector('[data-problems]').scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
        showProblems(null);
        save('ready').then(function (r) { if (r.ok) toast(ctx, 'Marked as ready. Now copy it into your Google Doc and submit it in Google Classroom.'); });
      } else if (act === 'submitted') {
        if (status === 'draft') { showProblems(['Mark the report as ready first. Then submit it in Google Classroom and come back to tap this.']); return; }
        if (status === 'submitted') return;
        showProblems(null);
        save('submitted').then(function (r) { if (r.ok) toast(ctx, 'Well done. Your report is marked as submitted.'); });
      }
    });
    paint();
    paintStatus();
  }

  /* ------------------------------------------------------------------ charts screen (R1: wave cards) */
  function waveCardHTML(D, waveId) {
    var s = waveStats(D, waveId);
    if (!s) return { html: '', note: '' };
    var name = 'Wave ' + waveId.slice(1), me = s.me;
    var note = waveNote(D, waveId);
    var dkey = 'wi.draft.charts.' + waveId;
    var draft = draftGet(dkey);
    var noteText = (draft && draft.note != null && (!note || !note.updatedAt || String(draft.at || '') >= String(note.updatedAt))) ? draft.note : (note ? note.note || '' : '');
    var hc = Object.assign({}, obj(note && note.hypothesisChecks), obj(draft && draft.hypothesisChecks));
    var h = '<section class="panel wp-wave" data-wavecard="' + esc(waveId) + '">';
    h += '<div class="wp-wave-h"><h2>' + esc(name) + ' results</h2><span class="chip">' + esc(fmtDate(s.date) || 'Published') + '</span></div>';
    if (s.classesNote) h += '<p class="muted small">Classes surveyed: ' + esc(s.classesNote) + '</p>';
    h += '<p class="small muted">Control words are real slang words that are already in use. Foil words are invented for the survey. Corrected recognition = the share who say they know your word, minus the share who say they know the foils.</p>';
    if (me) {
      var bad = me.corrected != null && pctNum(me.corrected) <= 0;
      h += '<div class="wp-hero"><span class="wp-hero-k">Corrected recognition of <b>' + esc(me.termText) + '</b></span>' +
        '<span class="wp-hero-v" data-corrected>' + esc(pctText(me.corrected)) + '</span>' +
        '<span class="wp-hero-f">' + esc(pctText(me.rec)) + ' know it − ' + esc(pctText(s.foilRate)) + ' foil rate = ' + esc(pctText(me.corrected)) + ' · <span class="wp-nb">n = ' + me.n + '</span></span>' +
        (bad ? '<span class="wp-hero-w">0 or below means we cannot tell real recognition from guessing.</span>' : '') + '</div>';
    } else {
      h += '<p class="note">Your word is not in this wave. Ask T.Chris why.</p>';
    }
    h += '<div class="tablewrap"><table class="t wp-wtable"><thead><tr><th scope="col">Word</th><th scope="col" class="num">n</th><th scope="col" class="num">Know it</th><th scope="col" class="num">Not sure</th><th scope="col" class="num">Under\u00adstand</th></tr></thead><tbody>';
    s.rows.forEach(function (r) {
      h += '<tr class="' + (r.kind === 'me' ? 'me' : '') + '" data-term="' + esc(r.kind === 'me' ? 'me' : r.termKey) + '"><td><span class="wp-tk">' + (r.kind === 'me' ? 'My word' : (r.kind === 'control' ? 'Control' : 'Foil')) + '</span>' + esc(r.termText) + '</td>' +
        '<td class="num">' + r.n + '</td><td class="num">' + esc(pctText(r.rec)) + '</td><td class="num">' + esc(pctText(r.notSure)) + '</td><td class="num">' + esc(pctText(r.comp)) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    var ctrls = s.rows.filter(function (r) { return r.kind === 'control' && r.corrected != null; });
    h += '<ul class="wp-ul small">';
    if (s.foilRate != null) h += '<li>Foil words are invented, so nobody really knows them. Foil rate = the average of the two foils = <b>' + esc(pctText(s.foilRate)) + '</b>.</li>';
    ctrls.forEach(function (r) { h += '<li>Corrected recognition of the control <i>' + esc(r.termText) + '</i>: ' + esc(pctText(r.rec)) + ' − ' + esc(pctText(s.foilRate)) + ' = ' + esc(pctText(r.corrected)) + '.</li>'; });
    h += '<li>Understand = the share of everyone asked who picked the correct meaning.</li></ul>';
    h += chartCardHTML('ch_compare', D, { waveId: waveId, title: 'Recognition in ' + name, caption: 'Your word beside the controls and foils. The line shows the foil rate.' });
    // her note
    var hyps = arr(wordOf(D).hypotheses);
    h += '<div class="wp-noteform"><div class="field"><label for="wp-note-' + esc(waveId) + '">What does this tell you? What does it not tell you?</label>' +
      '<p class="hint">20–200 words. This note ticks your checklist item for ' + esc(name) + '.</p>' +
      '<textarea id="wp-note-' + esc(waveId) + '" data-wnote="' + esc(waveId) + '"></textarea><div class="count" data-wcount="' + esc(waveId) + '"></div></div>';
    if (Number(waveId.slice(1)) >= 2 && hyps.length) {
      h += '<fieldset class="wp-hyps"><legend>Check each hypothesis against your data</legend>';
      hyps.forEach(function (hp, i) {
        h += '<div class="field"><p class="wp-hyp-t"><b>' + (i + 1) + '.</b> ' + esc(hp.text) + '</p><div class="opts">';
        choiceList('hypStatuses').forEach(function (o) {
          h += '<label class="opt"><input type="radio" name="wp-h-' + esc(waveId) + '-' + esc(hp.id) + '" value="' + esc(o.id) + '" data-hyp="' + esc(hp.id) + '"' + (hc[hp.id] === o.id ? ' checked' : '') + '><span class="lbl">' + esc(o.label) + '</span></label>';
        });
        h += '</div></div>';
      });
      h += '<p class="hint">Any answer is fine, "Not supported" too. An honest check is what counts.</p></fieldset>';
    }
    h += '<div class="btnrow"><button type="button" class="btn primary" data-wsave="' + esc(waveId) + '">Save my note</button><span class="savestate" data-wstate="' + esc(waveId) + '"></span></div></div>';
    h += '</section>';
    return { html: h, note: noteText, fromDraft: !!(draft && draft.note != null && noteText === draft.note && (!note || draft.note !== note.note)) };
  }
  function renderCharts(el, ctx) {
    ctx = ctx || {};
    var D = ctx.D || {};
    var waves = publishedWaves(D).slice().reverse();
    var h = '<div class="wp wp-charts"><div class="screen-head"><h1>Charts</h1></div>';
    h += '<p class="lead">Your survey results: your word, two control words and two foil words. You never see another student’s word.</p>';
    var cards = [];
    if (!waves.length) {
      h += '<div class="panel wp-nowave"><h2>Wave 1 is coming</h2><p>T.Chris runs the Wave 1 survey on Mon 23 – Tue 24 Nov. Your results appear here when he publishes them.</p>' +
        '<p class="muted">While you wait, you can finish your word card and your plan.</p></div>';
    }
    waves.forEach(function (w) { var c = waveCardHTML(D, w); cards.push([w, c]); h += c.html; });
    if (relOf(ctx) >= 2) {
      h += '<h2 class="section">More charts</h2>';
      ['ch_waves', 'ch_levels', 'ch_actions', 'ch_fudge', 'ch_tallies'].forEach(function (id) { h += '<div class="panel">' + chartCardHTML(id, D) + '</div>'; });
    } else {
      h += '<div class="panel tint wp-later"><h2>More charts open on Mon 7 Dec 2026</h2><p>Your waves over time, sightings by Evidence Level, actions by week, your FUDGE dashboard and your tallies.</p></div>';
    }
    h += principleHTML() + '</div>';
    el.innerHTML = h;
    wireGo(el, ctx);
    wirePNG(el, ctx, D);
    mountCharts(el, D);
    cards.forEach(function (pair) {
      var w = pair[0], ta = el.querySelector('[data-wnote="' + w + '"]');
      ta.value = pair[1].note || '';
      if (pair[1].fromDraft) setSaveState(el.querySelector('[data-wstate="' + w + '"]'), '', 'Saved on this phone');
      paintNote(el, w);
    });
    function hypChecks(w) {
      var o = {}, inputs = el.querySelectorAll('[data-wavecard="' + w + '"] input[data-hyp]:checked');
      for (var i = 0; i < inputs.length; i++) o[inputs[i].getAttribute('data-hyp')] = inputs[i].value;
      return o;
    }
    function storeDraft(w) {
      draftSet('wi.draft.charts.' + w, { note: el.querySelector('[data-wnote="' + w + '"]').value, hypothesisChecks: hypChecks(w), at: nowIso(ctx) });
      setSaveState(el.querySelector('[data-wstate="' + w + '"]'), '', 'Saved on this phone');
    }
    el.addEventListener('input', function (ev) {
      var w = ev.target.getAttribute && ev.target.getAttribute('data-wnote');
      if (w) { storeDraft(w); paintNote(el, w); }
    });
    el.addEventListener('change', function (ev) {
      if (ev.target.hasAttribute && ev.target.hasAttribute('data-hyp')) {
        var card = ev.target.closest('[data-wavecard]');
        storeDraft(card.getAttribute('data-wavecard'));
      }
    });
    el.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-wsave]');
      if (!b || !el.contains(b)) return;
      var w = b.getAttribute('data-wsave');
      var text = el.querySelector('[data-wnote="' + w + '"]').value.trim();
      var n = words(text), st = el.querySelector('[data-wstate="' + w + '"]');
      if (!text) { setSaveState(st, 'wait', 'Write your note first.'); return; }
      if (n > 200) { setSaveState(st, 'wait', 'Please keep your note to 200 words or fewer (now ' + n + ').'); return; }
      var old = waveNote(D, w);
      var rec = { id: sidOf(D) + '|' + w, waveId: w, note: text, hypothesisChecks: hypChecks(w), fileIds: arr(old && old.fileIds) };
      doSave(ctx, 'rec.save', { type: 'waveNote', record: rec }, st).then(function (r) {
        if (!r.ok) return;
        draftDel('wi.draft.charts.' + w);
        if (n < 20) toast(ctx, 'Saved. Write at least 20 words to tick your checklist item.');
      });
    });
  }
  function paintNote(el, w) {
    var ta = el.querySelector('[data-wnote="' + w + '"]'), c = el.querySelector('[data-wcount="' + w + '"]');
    var n = words(ta.value);
    c.textContent = n + ' words' + (n < 20 ? ' · at least 20' : (n > 200 ? ' · 200 at most' : ' ✓'));
    c.className = 'count' + (n > 200 ? ' over' : (n >= 20 ? ' wp-ok' : ''));
  }

  /* ------------------------------------------------------------------ Summit and Article entry points (later round) */
  function renderSummit(el, ctx, tab) {
    var S = root.WI_SUMMIT || {};
    if (relOf(ctx) < (S.release || 2)) {
      el.innerHTML = opensHTML('Summit Pack', S.opensLabel || 'Mon 7 Dec 2026', 'Your talk outline, evidence by level, charts, abstract, Q&A practice, self-check and rehearsal timer for the Slang Summit (' + ((S.event || {}).dates || 'Wed 16 – Thu 17 Dec') + ').');
      return;
    }
    el.innerHTML = '<div class="screen-head"><h1>Summit Pack</h1></div><div class="panel opens"><p class="when">Almost ready</p><p>T.Chris is finishing this part. Check back soon.</p></div>' + principleHTML();
  }
  function renderArticle(el, ctx, tab) {
    var A = root.WI_ARTICLE || {};
    if (relOf(ctx) < (A.release || 3)) {
      el.innerHTML = opensHTML('Article Pack', A.opensLabel || 'Mon 4 Jan 2027', 'Plan your research article here: IMRaD notes built from your data, sources, visuals, abstract and ethics statement.');
      return;
    }
    el.innerHTML = '<div class="screen-head"><h1>Article Pack</h1></div><div class="panel opens"><p class="when">Almost ready</p><p>T.Chris is finishing this part. Check back soon.</p></div>' + principleHTML();
  }

  P.renderReport = renderReport;
  P.renderCharts = renderCharts;
  P.renderSummit = renderSummit;
  P.renderArticle = renderArticle;
  root.WIPack = P;
})();
