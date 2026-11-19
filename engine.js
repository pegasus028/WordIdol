// WordIdol engine (W4): pure logic, no DOM, no network. Contract: docs/ENGINE-API.md.
// Runs unchanged in the browser, in Node (vm, window = globalThis) and in Apps Script V8.
(function () {
  var root = (typeof window !== 'undefined') ? window : globalThis;
  var WI = root.WI || {};
  root.WI = WI;
  WI.version = '2026-11-19b';

  // ------------------------------------------------------------------ helpers
  function G(name) { return root[name]; }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function obj(x) { return (x && typeof x === 'object' && !Array.isArray(x)) ? x : {}; }
  function str(x) { return (x === null || x === undefined) ? '' : String(x); }
  function trim(x) { return str(x).replace(/^\s+|\s+$/g, ''); }
  function len(x) { return trim(x).length; }
  function has(x) { return len(x) > 0; }
  function live(list) { return arr(list).filter(function (r) { return r && r.deleted !== true && r.deleted !== 'TRUE'; }); }
  function truthy(x) { return x === true || x === 'TRUE' || x === 'true'; }
  function num(x, d) { var n = Number(x); return (x === '' || x === null || x === undefined || isNaN(n)) ? d : n; }
  function inList(list, x) { return list.indexOf(x) >= 0; }
  function words(text) {
    var t = trim(text);
    if (!t) return 0;
    return t.split(/\s+/).filter(function (w) { return /[A-Za-z0-9\u00C0-\u024F]/.test(w); }).length;
  }
  WI.wordCount = words;
  function jWords(j) { return has(j.text) ? words(j.text) : num(j.wordCount, 0); }
  function sid(D) { D = obj(D); return str(obj(D.student).id || obj(D.state).studentId || ''); }

  function hash(s) {
    var h = 0x811c9dc5;
    s = str(s);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    var hex = h.toString(16);
    while (hex.length < 8) hex = '0' + hex;
    return hex;
  }
  WI.hash = hash;
  WI.newId = function (prefix) {
    var a = 'abcdefghijklmnopqrstuvwxyz0123456789', s = '';
    for (var i = 0; i < 12; i++) s += a.charAt(Math.floor(Math.random() * 36));
    return prefix + '_' + s;
  };

  // ------------------------------------------------------------------ time (Asia/Bangkok, +07:00)
  var TZ_MS = 7 * 3600 * 1000, DAY = 86400000;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parse(x) {
    if (x instanceof Date) return x.getTime();
    if (typeof x === 'number') return x;
    var s = str(x);
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]) - TZ_MS;
    // a date-time without a zone is a Bangkok wall-clock time (never the device or server zone)
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) s = s.replace(' ', 'T') + '+07:00';
    var t = Date.parse(s);
    return isNaN(t) ? NaN : t;
  }
  function isoBkk(x) {
    var t = parse(x);
    if (isNaN(t)) return '';
    var d = new Date(t + TZ_MS);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + '+07:00';
  }
  function dateOf(x) { var s = isoBkk(x); return s ? s.substr(0, 10) : ''; }
  function addDays(date, n) { return dateOf(parse(date) + n * DAY + 12 * 3600 * 1000); }
  function dow(x) { return new Date(parse(dateOf(x)) + TZ_MS).getUTCDay(); }
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(x, style) {
    var d = dateOf(x);
    if (!d) return '';
    var s = DOW[dow(d)] + ' ' + parseInt(d.substr(8, 2), 10) + ' ' + MON[parseInt(d.substr(5, 2), 10) - 1];
    return style === 'long' ? s + ' ' + d.substr(0, 4) : s;
  }
  WI.parse = parse; WI.isoBkk = isoBkk; WI.dateOf = dateOf; WI.addDays = addDays; WI.dow = dow; WI.fmtDate = fmtDate;
  WI.now = function (serverOffsetMs) { return isoBkk(Date.now() + (num(serverOffsetMs, 0))); };

  function planStart() { return obj(G('WI_PLAN')).start || '2026-11-16'; }
  function weekNoOf(x) {
    var t = parse(x);
    if (isNaN(t)) return 1;
    var n = Math.floor((t - parse(planStart())) / (7 * DAY)) + 1;
    return n < 1 ? 1 : (n > 13 ? 13 : n);
  }
  function weekIdAt(n) { n = Math.max(1, Math.min(13, Math.floor(num(n, 1)))); return 'W' + pad(n); }
  function weekIndex(w) { var m = /^W(\d\d)$/.exec(str(w)); return m ? parseInt(m[1], 10) : 0; }
  WI.weekIdOf = function (x) { return weekIdAt(weekNoOf(x)); };
  WI.weekIndex = weekIndex;
  WI.weekIdAt = weekIdAt;
  WI.nextWeekId = function (w) { var i = weekIndex(w); return (i >= 1 && i < 13) ? weekIdAt(i + 1) : null; };
  WI.prevWeekId = function (w) { var i = weekIndex(w); return (i > 1 && i <= 13) ? weekIdAt(i - 1) : null; };
  WI.weekRange = function (w) {
    var i = weekIndex(w) || 1;
    var start = addDays(planStart(), (i - 1) * 7), end = addDays(start, 6);
    return {
      start: start, end: end, sunday: end,
      startIso: start + 'T00:00:00+07:00', endIso: end + 'T23:59:59+07:00',
      label: 'Week ' + i + ' \u00b7 ' + (start.substr(5, 2) === end.substr(5, 2) ? DOW[dow(start)] + ' ' + parseInt(start.substr(8, 2), 10) : fmtDate(start)) + ' \u2013 ' + fmtDate(end)
    };
  };
  WI.week = function (w) {
    var ws = arr(obj(G('WI_PLAN')).weeks);
    for (var i = 0; i < ws.length; i++) if (ws[i].id === w) return ws[i];
    return null;
  };
  function isLight(w) {
    var lw = arr(obj(G('WI_CHECKLIST')).lightWeeks);
    return inList(lw.length ? lw : ['W06', 'W07'], w);
  }
  WI.isLightWeek = isLight;
  WI.phaseOf = function (x) { return parse(x) >= parse(obj(G('WI_PLAN')).phase2Start || '2026-12-18') ? 2 : 1; };
  WI.projectFinished = function (nowIso) { return parse(nowIso) > parse('2027-02-14T23:59:59+07:00'); };
  WI.reviewOpensAt = function (w) { return WI.weekRange(w).sunday + 'T00:00:00+07:00'; };
  WI.daysLeft = function (x, nowIso) { return Math.round((parse(dateOf(x)) - parse(dateOf(nowIso || WI.now()))) / DAY); };
  WI.milestones = function () { return arr(obj(G('WI_PLAN')).milestones); };
  function msEnd(m) { return m.endDate || m.date; }
  WI.nextMilestone = function (nowIso) {
    var today = dateOf(nowIso || WI.now()), ms = WI.milestones();
    for (var i = 0; i < ms.length; i++) {
      if (msEnd(ms[i]) >= today) return { milestone: ms[i], daysLeft: WI.daysLeft(ms[i].date, nowIso) };
    }
    return null;
  };
  WI.milestoneStatus = function (m, nowIso) {
    var today = dateOf(nowIso || WI.now());
    if (msEnd(m) < today) return 'done';
    var nx = WI.nextMilestone(nowIso);
    return (nx && nx.milestone.id === m.id) ? 'next' : 'later';
  };

  // ------------------------------------------------------------------ config
  function cfg(D, config) {
    var out = { release: 1, onlineOpensAt: obj(G('WI_PLAN')).onlineOpensAtDefault || '2026-11-26T16:30:00+07:00', boardEnabled: true };
    var srcs = [obj(G('WI_CONFIG')), obj(obj(D).config), obj(config)];
    srcs.forEach(function (s) {
      for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k) && s[k] !== '' && s[k] !== null && s[k] !== undefined) out[k] = s[k];
    });
    out.release = num(out.release, 1);
    return out;
  }
  WI.config = cfg;

  // ------------------------------------------------------------------ choices
  function choiceList(name) { return arr(obj(G('WI_CHOICES'))[name]); }
  WI.choice = function (listName, id) {
    var l = choiceList(listName);
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  };
  WI.label = function (listName, id) { var c = WI.choice(listName, id); return c ? c.label : str(id); };
  WI.isOnlineChannel = function (channelId) { var c = WI.choice('channels', channelId); return !!(c && c.online); };
  WI.isOnlinePlatform = function (pid) { var c = WI.choice('platforms', pid); return !!(c && c.online); };
  WI.ideaMode = function (ideaId) { var c = WI.choice('ideas', ideaId); return c ? c.mode : ''; };
  WI.owned = function (s) { s = obj(s); return s.relation === 'me' || s.prompted === 'asked'; };
  WI.fudgeTotal = function (pred) {
    pred = obj(pred);
    var t = 0;
    ['F', 'U', 'D', 'G', 'E'].forEach(function (k) { t += num(pred[k], 0); });
    return { total: t, band: t >= 7 ? 'likely' : (t >= 5 ? 'fringe' : 'doomed') };
  };
  WI.specPassCount = function (spec) {
    spec = obj(spec);
    var n = 0;
    for (var i = 1; i <= 10; i++) if (obj(spec['R' + i]).result === 'pass') n++;
    return n;
  };

  // ------------------------------------------------------------------ part of speech (SPEC §3.2)
  var L = {
    DET: 'a an the this that these those my your her his our their its some any no every each another such what which whose one two three four five many few several much all both',
    INT: 'so very really too super kinda pretty quite totally extra hella mad lowkey highkey',
    MODAL: "can could will would should must might may shall cannot can't couldn't won't wouldn't shouldn't mustn't don't doesn't didn't do does did let's gonna wanna gotta i'll you'll she'll he'll it'll we'll they'll that'll",
    TOLEAD: 'want wants wanted need needs needed going try tries tried trying like likes love loves have has had used about got began started ready time hate hates learn decided',
    SUBJ: 'i you we they people everyone everybody girls friends students',
    SUBJ3: 'she he it who nobody someone somebody',
    BE: "am is are was were be been being i'm you're she's he's it's that's we're they're what's who's isn't aren't wasn't weren't ain't",
    LINK: 'feel feels felt feeling look looks looked looking seem seems seemed sound sounds sounded get gets got getting become becomes became stay stays stayed',
    HAVE: 'have has had need needs want wants give gives gave bring brings brought',
    PREP: 'of with for about in on at from by like without into than as',
    SKIP: 'always never often sometimes usually just already still even also actually literally basically probably definitely not',
    KEEP: 'stop stops stopped keep keeps kept start starts started',
    PREMOD: 'total real complete classic big little proper absolute whole new',
    CAUS: 'let lets make makes made watch watched help helps see saw',
    OBJP: 'her me them us him it you',
    OBJ: 'it me that the your this them us her him my a an',
    CVERB: 'went came made happened hit began started ended works worked goes comes makes means meant saved ruined got',
    FUNC_EXTRA: 'and but or because when if while so then now today again here there to me us them him'
  };
  var S = {}, LISTS = {};
  Object.keys(L).forEach(function (k) {
    LISTS[k] = L[k].split(' ');
    S[k] = {};
    LISTS[k].forEach(function (w) { S[k][w] = true; });
  });
  S.FUNC = {};
  ['DET', 'MODAL', 'BE', 'LINK', 'HAVE', 'PREP', 'SUBJ', 'SUBJ3', 'FUNC_EXTRA'].forEach(function (k) {
    LISTS[k].forEach(function (w) { S.FUNC[w] = true; });
  });
  var HAVEPERF = { have: 1, has: 1, had: 1, "i've": 1, "we've": 1, "they've": 1, "you've": 1 };
  function inS(set, w) { return w !== null && w !== undefined && Object.prototype.hasOwnProperty.call(S[set], w); }
  var BOUND = /[.!?;:,]/, BOUND2 = /[.!?;:]/;
  var OTHER_SCRIPT = /[\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u0E00-\u0E7F\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/;

  function prepText(s) { return str(s).replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D"]/g, ''); }
  function tokens(sentence) {
    var orig = prepText(sentence);
    var lower = orig.toLowerCase();
    var lc = lower.split(/\s+/), oc = orig.split(/\s+/);
    var out = [], quoteOpen = false;
    for (var i = 0; i < lc.length; i++) {
      if (!lc[i]) continue;
      var m = /^([^a-z0-9']*)(.*?)([^a-z0-9']*)$/.exec(lc[i]);
      var w = m[2], trail = m[3], lead = m[1].length;
      // single quotation marks round a word ('vronk') are not part of it; "don't" and "girls'" keep theirs
      if (w.length > 1 && w.charAt(0) === "'") { w = w.slice(1); lead++; quoteOpen = true; }
      if (quoteOpen && w.length > 1 && w.charAt(w.length - 1) === "'") { w = w.slice(0, -1); quoteOpen = false; }
      if (!w.length) {
        // a chunk with no English letters: another script (Thai …) still counts as a word of the sentence;
        // punctuation standing alone ("vronk !") belongs to the word before it; anything else (emoji) is dropped
        if (OTHER_SCRIPT.test(lc[i])) out.push({ w: '', trail: '', raw: str(oc[i]) });
        else if (out.length && BOUND.test(lc[i])) out[out.length - 1].trail += lc[i];
        continue;
      }
      var raw = str(oc[i]).substr(lead, w.length);
      out.push({ w: w, trail: trail, raw: raw });
    }
    return out;
  }
  function inflections(b) {
    var f = [[b, '']];
    function add(x, s) { f.push([x, s]); }
    var e = /e$/.test(b), y = /[^aeiou]y$/.test(b), cvc = /[^aeiou][aeiou][^aeiouwxy]$/.test(b);
    var last = b.slice(-1), stem = b.slice(0, -1);
    add(b + 's', 's'); add(b + 'es', 's'); if (y) add(stem + 'ies', 's');
    add(b + 'ed', 'ed'); if (e) add(b + 'd', 'ed'); if (y) add(stem + 'ied', 'ed'); if (cvc) add(b + last + 'ed', 'ed');
    add(b + 'ing', 'ing'); if (e) add(stem + 'ing', 'ing'); if (cvc) add(b + last + 'ing', 'ing');
    add(b + 'er', 'er'); if (e) add(b + 'r', 'er'); if (cvc) add(b + last + 'er', 'er'); if (y) add(stem + 'ier', 'er');
    add(b + 'est', 'est'); if (e) add(b + 'st', 'est'); if (cvc) add(b + last + 'est', 'est'); if (y) add(stem + 'iest', 'est');
    add(b + 'y', 'y'); if (cvc) add(b + last + 'y', 'y'); if (e) add(stem + 'y', 'y');
    add(b + 'ly', 'ly'); if (y) add(stem + 'ily', 'ly');
    add(b + "'s", 'poss');
    return f;
  }
  function findTarget(word, T) {
    var W = prepText(word).toLowerCase().replace(/^\s+|\s+$/g, '').split(/\s+/).filter(Boolean);
    var n = W.length;
    if (!n) return null;
    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i + n <= T.length; i++) {
        var ok = true, suf = '';
        for (var k = 0; k < n && ok; k++) {
          var t = T[i + k].w;
          if (t === W[k]) continue;
          if (pass === 1 && (k === 0 || k === n - 1) && !suf) {
            var fs = inflections(W[k]), hit = null;
            for (var q = 1; q < fs.length; q++) if (fs[q][0] === t) { hit = fs[q]; break; }
            if (hit) { suf = hit[1]; continue; }
          }
          ok = false;
        }
        if (ok && (pass === 1 ? !!suf : true)) {
          for (var k2 = 0; k2 < n - 1; k2++) if (BOUND.test(T[i + k2].trail)) ok = false;
          if (ok) return { i: i, n: n, suf: suf };
        }
      }
    }
    return null;
  }
  function R(pos, conf, rule, alt) { return { pos: pos, conf: conf, rule: rule, alt: alt || [] }; }
  function rules(T, m) {
    var i = m.i, n = m.n, suf = m.suf;
    var last = T[i + n - 1], prevT = i > 0 ? T[i - 1] : null;
    var startClause = !prevT || BOUND.test(prevT.trail);
    var prev = startClause ? null : prevT.w;
    var j = i - 1;
    while (j >= 0 && !BOUND.test(T[j].trail) && inS('SKIP', T[j].w)) j--;
    var ps = (j >= 0 && !BOUND.test(T[j].trail)) ? T[j].w : null;
    var prev2 = (i > 1 && !BOUND2.test(T[i - 2].trail) && prev) ? T[i - 2].w : null;
    var endClause = i + n >= T.length || BOUND.test(last.trail);
    var next = endClause ? null : T[i + n].w;
    var sentStart = i === 0, bang = /!/.test(last.trail), comma = /,/.test(last.trail);
    var ownIng = !suf && /ing$/.test(last.w);

    if (T.length === n) return R('interjection', 'high', 'P01');
    if (sentStart && !suf && (bang || comma)) return R('interjection', 'high', 'P01');
    if (startClause && endClause && !suf && bang) return R('interjection', 'medium', 'P01', ['noun']);
    if (suf === 'ly') return R('adverb', 'high', 'P02', ['adjective']);
    if (suf === 'est') return R('adjective', 'high', 'P03');
    if (suf === 'er' && next === 'than') return R('adjective', 'high', 'P03');
    if (suf === 'er' && inS('DET', prev)) return R('noun', 'medium', 'P04', ['adjective']);
    if (suf === 'er') return R('adjective', 'medium', 'P03', ['noun']);
    if (suf === 'y') return R('adjective', 'medium', 'P05', ['noun']);
    if (suf === 'poss') return R('noun', 'high', 'P06');
    if (suf === 'ing' || ownIng) {
      if (inS('BE', ps) || inS('KEEP', ps)) return R('verb', suf ? 'high' : 'medium', 'P07', ['noun']);
      if (ownIng) {
        if (sentStart && next && (inS('BE', next) || inS('MODAL', next))) return R('noun', 'high', 'P13', ['verb']);
        if (inS('DET', prev) || inS('PREP', prev)) return R('noun', 'medium', 'P10', ['verb']);
      } else {
        return R('verb', 'medium', 'P07', ['noun', 'adjective']);
      }
    }
    if (suf === 'ed') {
      if (inS('SUBJ', ps) || inS('SUBJ3', ps) || (ps && HAVEPERF[ps])) return R('verb', 'high', 'P08', ['adjective']);
      return R('verb', 'medium', 'P08', ['adjective']);
    }
    if (suf === 's') {
      if (inS('DET', prev)) return R('noun', 'high', 'P09', []);
      if (sentStart && next && (inS('BE', next) || inS('MODAL', next))) return R('noun', 'high', 'P09', ['verb']);
      if (inS('SUBJ3', ps) || inS('DET', ps)) return R('verb', 'medium', 'P09', ['noun']);
      if (inS('PREP', ps)) return R('noun', 'medium', 'P09', ['verb']);
      return R('verb', 'low', 'P09', ['noun']);
    }
    if (prev === 'to') return R('verb', inS('TOLEAD', prev2) ? 'high' : 'medium', 'P11', ['noun']);
    if (inS('MODAL', ps)) return R('verb', 'high', 'P12', []);
    if (prev && prev2 && inS('CAUS', prev2) && inS('OBJP', prev)) return R('verb', 'high', 'P12', []);
    if (sentStart && next && (inS('BE', next) || inS('MODAL', next))) return R('noun', 'high', 'P13', ['adjective']);
    if (inS('INT', prev)) {
      if ((inS('SUBJ', prev2) || inS('SUBJ3', prev2)) && next) return R('verb', 'medium', 'P14', ['adjective']);
      return R('adjective', 'high', 'P14', ['adverb']);
    }
    var detLike = !!prev && (inS('DET', prev) || (/'s$/.test(prev) && !inS('BE', prev) && !inS('MODAL', prev)) ||
      (inS('PREMOD', prev) && inS('DET', prev2)));
    if (detLike) {
      if (endClause || inS('FUNC', next) || inS('CVERB', next) || /ed$/.test(str(next))) return R('noun', 'high', 'P10', ['adjective']);
      return R('adjective', 'medium', 'P10', ['noun']);
    }
    if (inS('BE', ps) || inS('LINK', ps)) {
      var strong = inS('LINK', ps) && !inList(['get', 'gets', 'got', 'getting'], ps);
      return R('adjective', strong ? 'high' : 'medium', 'P15', ['noun']);
    }
    if (inS('HAVE', ps) && endClause) return R('noun', 'medium', 'P16', ['adjective']);
    if (inS('PREP', prev)) return R('noun', 'medium', 'P17', ['adjective']);
    if (inS('SUBJ', ps)) return R('verb', next ? 'high' : 'medium', 'P18', ['noun']);
    if (inS('SUBJ3', ps)) return R('verb', 'low', 'P18', ['adjective']);
    if (sentStart && next && inS('OBJ', next)) return R('verb', 'medium', 'P19', ['interjection']);
    if (endClause && prev && !inS('FUNC', prev)) return R('noun', 'low', 'P20', ['adjective', 'adverb']);
    return R('unknown', 'low', 'P21', ['noun', 'verb', 'adjective']);
  }
  function reasonFor(rule, w, p, pos) {
    var g = obj(G('GUIDE')), pr = obj(g.posReasons), t = pr[rule];
    if (t && typeof t === 'object') t = t.text;
    if (!t) return rule;
    t = String(t).split('{w}').join(w || '').split('{p}').join(p || '');
    if ((rule === 'P09' || rule === 'P10') && t.indexOf(';') > 0) {
      var idx = t.indexOf(';'), head = t.slice(0, idx), tail = trim(t.slice(idx + 1));
      var dot = head.lastIndexOf('. ');
      var prefix = dot >= 0 ? head.slice(0, dot + 2) : '', first = dot >= 0 ? head.slice(dot + 2) : head;
      if (pos === 'noun') return prefix + first + '.';
      return prefix + tail.charAt(0).toUpperCase() + tail.slice(1);
    }
    return t;
  }
  WI.pos = {
    lists: LISTS,
    tokens: tokens,
    inflections: inflections,
    reasonFor: reasonFor,
    confText: function (conf) {
      return conf === 'high' ? 'I am fairly sure.' : (conf === 'medium' ? 'I think so, but check.' : 'I am not sure. Please choose.');
    },
    containsWord: function (word, sentence) { return !!findTarget(word, tokens(sentence)); },
    guess: function (word, sentence) {
      var T = tokens(sentence), m = findTarget(word, T), res;
      if (!m) {
        res = R('unknown', 'none', 'P00', []);
        res.w = trim(word); res.p = ''; res.suffix = ''; res.index = -1;
      } else {
        res = rules(T, m);
        var ws = [];
        for (var k = 0; k < m.n; k++) ws.push(T[m.i + k].raw || T[m.i + k].w);
        res.w = ws.join(' ');
        res.p = m.i > 0 ? (T[m.i - 1].raw || T[m.i - 1].w) : '';
        res.suffix = m.suf; res.index = m.i;
      }
      res.reason = reasonFor(res.rule, res.w, res.p, res.pos);
      return res;
    }
  };

  // ------------------------------------------------------------------ catalogue
  var CACHE = { src: null, fixed: null, rules: null, pool: null, poolSrc: null };
  function cat() {
    var CL = obj(G('WI_CHECKLIST'));
    if (CACHE.src !== CL) {
      CACHE.src = CL; CACHE.fixed = {}; CACHE.rules = {};
      arr(CL.items).forEach(function (it) { CACHE.fixed[it.id] = it; });
      arr(CL.choiceRules).forEach(function (r) { CACHE.rules[r.id] = r; });
    }
    var P = G('WI_POOL');
    if (CACHE.poolSrc !== P) {
      CACHE.poolSrc = P; CACHE.pool = {};
      poolArray().forEach(function (p) { CACHE.pool[p.id] = p; });
    }
    return CL;
  }
  function poolArray() {
    var P = G('WI_POOL');
    if (Array.isArray(P)) return P;
    if (P && Array.isArray(P.items)) return P.items;
    return [];
  }
  function whyOf(id) {
    var W = obj(G('WI_WHY')), w = W[id];
    if (w && typeof w === 'object') w = w.text || w.why;
    return str(w);
  }
  function stageNo(s) { var m = /^s(\d)$/.exec(str(s)); return m ? parseInt(m[1], 10) : 1; }
  function labFeed(feeds, weekId) {
    if (weekIndex(weekId) < 6) return feeds.slice();
    return feeds.map(function (f) { return f === 'LAB-PRE' ? 'LAB-POST' : f; });
  }
  function habitDef(weekId, n) {
    var CC = cat(), t = null;
    arr(CC.habits).forEach(function (h) { if (h.n === n) t = h; });
    if (!t) return null;
    var wn = weekIndex(weekId);
    var inRange = t.weekList ? inList(t.weekList, wn) : (wn >= t.weeks[0] && wn <= t.weeks[1]);
    if (!inRange) return null;
    var feeds = [];
    arr(t.feedsByWeek).forEach(function (f) { if (wn >= f[1] && wn <= f[2]) feeds.push(f[0]); });
    var id = 'H-' + weekId + '-' + n;
    return {
      id: id, title: t.title, why: whyOf(id) || whyOf('H-Wnn-' + n), stage: t.stage, week: weekId,
      due: WI.weekRange(weekId).sunday, kind: isLight(weekId) ? 'optional' : t.kind, source: 'habit',
      feeds: feeds, xp: t.xp, evidence: t.evidence, route: t.route, check: t.check, online: false,
      release: t.release, onlyIfAudit: !!t.onlyIfAudit
    };
  }
  function rowsOf(D) { return arr(obj(D).checklist); }
  WI.itemDef = function (itemId, D) {
    var CC = cat(), id = str(itemId), m, x;
    if (CACHE.fixed[id]) {
      x = CACHE.fixed[id];
      var o = {};
      for (var k in x) if (Object.prototype.hasOwnProperty.call(x, k)) o[k] = x[k];
      o.why = whyOf(id) || x.why || '';
      return o;
    }
    m = /^H-(W\d\d)-(\d)$/.exec(id);
    if (m) return habitDef(m[1], parseInt(m[2], 10));
    m = /^(C-[A-Z]+)(-2)?$/.exec(id);
    if (m && CACHE.rules[m[1]]) {
      x = CACHE.rules[m[1]];
      var two = !!m[2];
      return {
        id: id, title: x.title, why: whyOf(id) || whyOf(m[1]), stage: 's2',
        week: x.firstWeek, due: null, kind: x.kind, source: 'choice-driven',
        feeds: two ? labFeed(x.feeds, 'W08') : x.feeds.slice(), xp: x.xp, evidence: x.evidence, route: x.route,
        check: x.check || null, online: !!x.online, release: 1, phase: two ? 2 : 1
      };
    }
    m = /^P-(.+)$/.exec(id);
    if (m) {
      var pa = null;
      arr(obj(D).planActions).forEach(function (r) { if (r.id === m[1]) pa = r; });
      var wk = pa && pa.whenDate ? WI.weekIdOf(pa.whenDate) : null;
      return {
        id: id, title: pa ? 'Do: ' + trim(pa.what).substr(0, 70) : 'Do a planned action', why: pa ? trim(pa.why) : '',
        stage: 's3', week: wk, due: pa ? dateOf(pa.whenDate) : null, kind: 'recommended', source: 'plan-action',
        feeds: (wk && weekIndex(wk) >= 6) ? ['LAB-POST'] : ['LAB-PRE'], xp: 10,
        evidence: (pa && pa.evidence) || 'log', route: '#/log/action/new?plan=' + m[1], check: 'plan.action',
        online: pa ? WI.isOnlineChannel(pa.where) : false, release: 1, planActionId: m[1]
      };
    }
    if (/^X-\d\d$/.test(id)) {
      var p = CACHE.pool[id], d = obj(CC.poolDefaults);
      if (!p) return null;
      return {
        id: id, title: p.title, why: p.why || whyOf(id), stage: p.stage || 's3', week: null, due: null,
        kind: 'optional', source: 'pool', feeds: arr(p.feeds).length ? p.feeds : (d.feeds || ['LAB-PRE']),
        xp: num(p.xp, num(d.xp, 5)), evidence: p.evidence || d.evidence || 'journal', route: p.route || d.route || '#/log',
        check: null, online: !!p.online, release: 1, src: p.src
      };
    }
    if (/^O-[0-9a-z]{8}$/.test(id)) {
      var row = null;
      rowsOf(D).forEach(function (r) { if (r.itemId === id) row = r; });
      return {
        id: id, title: row ? row.title : 'My own item', why: '', stage: null, week: row ? row.weekId : null,
        due: row ? row.dueDate : null, kind: 'own', source: 'own', feeds: [], xp: 0, evidence: 'none',
        route: null, check: null, online: false, release: 1
      };
    }
    return null;
  };
  WI.fixedItems = function () { return arr(cat().items); };
  WI.habitItems = function (weekId) {
    var out = [];
    for (var n = 1; n <= 5; n++) { var h = habitDef(weekId, n); if (h) out.push(h); }
    return out;
  };
  WI.choiceRules = function () { return arr(cat().choiceRules); };
  WI.poolItems = function () { return poolArray(); };
  WI.knownRoute = function (route) {
    if (route === null) return true;
    var r = str(route).split('?')[0];
    var pats = arr(cat().routes);
    for (var i = 0; i < pats.length; i++) {
      var re = new RegExp('^' + pats[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:x/g, '[^/]+') + '$');
      if (re.test(r)) return true;
    }
    return false;
  };

  // ------------------------------------------------------------------ data accessors
  function word(D) { return obj(obj(D).word); }
  function plan(D, phase) {
    var p = null;
    arr(obj(D).plans).forEach(function (r) { if (num(r.phase, 1) === phase) p = r; });
    return p;
  }
  function planActs(D, phase) {
    return live(obj(D).planActions).filter(function (r) { return num(r.phase, 1) === phase; });
  }
  function weekOfRow(r) { return r.weekId ? r.weekId : WI.weekIdOf(r.date || r.createdAt); }
  function inWeek(list, weekId) { return live(list).filter(function (r) { return weekOfRow(r) === weekId; }); }
  function journals(D, kind) { return live(obj(D).journal).filter(function (j) { return !kind || j.kind === kind; }); }
  function reviewFor(D, weekId) {
    var out = null;
    arr(obj(D).reviews).forEach(function (r) { if (r.weekId === weekId && (r.submittedAt || r.id)) out = r; });
    return out;
  }
  function report(D, type) {
    var out = null;
    arr(obj(D).reports).forEach(function (r) { if (r.type === type) out = r; });
    return out;
  }
  function waveNote(D, waveId) {
    var out = null;
    arr(obj(D).waveNotes).forEach(function (r) { if (r.waveId === waveId) out = r; });
    return out;
  }
  function wavePublished(D, waveId) {
    return arr(obj(D).waves).some(function (r) { return r.waveId === waveId && truthy(r.published); });
  }
  function hypotheses(D) { return arr(word(D).hypotheses).filter(function (h) { return h && has(h.text); }); }
  function auditsMine(D) { return arr(obj(obj(D).audits).mine); }
  function auditWeek(a) { return a.assignedAt ? WI.weekIdOf(a.assignedAt) : a.weekId; }
  WI.rulesAllTicked = function (D) {
    var t = arr(obj(obj(D).state).rulesTicked);
    return t.length >= 6 && t.slice(0, 6).every(function (x) { return has(x) && x !== false; });
  };
  function zbComplete(D) {
    var zb = obj(word(D).zb), places = arr(zb.places), need = choiceList('zbPlaces');
    if (!has(zb.checkedAt) || len(zb.statement) < 20) return false;
    var ids = need.length ? need.map(function (p) { return p.id; }) : ['zb_google', 'zb_tiktok', 'zb_instagram', 'zb_x', 'zb_youtube', 'zb_urban'];
    return ids.every(function (id) { return places.some(function (p) { return p && p.placeId === id && has(p.result); }); });
  }

  // ------------------------------------------------------------------ predicates (SPEC §5.2)
  var C = {};
  C['word.first'] = function (D) { var w = word(D); return has(w.word) && has(w.meaning) && has(w.example1) && truthy(w.posConfirmed); };
  C['word.usage'] = function (D) { return C['word.first'](D) && len(word(D).usageRules) >= 20; };
  C['word.card'] = function (D) {
    var w = word(D);
    return C['word.usage'](D) && has(w.formation) && len(w.sourceWords) >= 3 && len(w.example2) >= 15 &&
      len(w.example3) >= 15 && len(w.purpose) >= 20 && truthy(w.notRudeConfirmed);
  };
  C['word.zb'] = function (D) { return zbComplete(D); };
  // C-ASK is done once T.Chris has answered her "ask T.Chris first" request (lead, 19 Nov)
  C['request.askFirst'] = function (D) { return arr(obj(D).requests).some(function (r) { return r.type === 'ask_first' && (r.status === 'approved' || r.status === 'declined'); }); };
  C['word.submitted'] = function (D) { var s = word(D).regStatus; return has(s) && s !== 'draft'; };
  C['word.fudge'] = function (D) {
    var p = obj(obj(word(D).fudge).pred), rs = obj(p.reasons);
    return ['F', 'U', 'D', 'G', 'E'].every(function (k) {
      var v = p[k];
      return v !== '' && v !== null && v !== undefined && Math.floor(Number(v)) === Number(v) && Number(v) >= 0 && Number(v) <= 2 && len(rs[k]) >= 10;
    });
  };
  C['word.hypotheses'] = function (D) {
    return len(word(D).researchQuestion) >= 15 &&
      hypotheses(D).filter(function (h) { return len(h.text) >= 20 && has(h.metric); }).length >= 2;
  };
  C['word.spec'] = function (D) {
    var s = obj(word(D).specSheet);
    for (var i = 1; i <= 10; i++) if (!has(obj(s['R' + i]).result)) return false;
    return true;
  };
  C['plan.choices'] = function (D) {
    var p = plan(D, 1);
    if (!p) return false;
    var ideas = arr(p.ideas);
    return arr(p.targetGroups).length >= 1 && ideas.length >= 1 &&
      ideas.some(function (i) { var m = WI.ideaMode(i); return m === 'inperson' || m === 'either'; }) &&
      arr(p.platforms).length >= 1 && has(p.route) && has(p.timeBudget) &&
      len(p.who) >= 20 && len(p.why) >= 20 && len(p.what) >= 20;
  };
  C['rules.all'] = function (D) { return WI.rulesAllTicked(D); };
  C['plan.actions3'] = function (D) { return planActs(D, 1).length >= 3; };
  C['plan2.actions3'] = function (D) { return planActs(D, 2).length >= 3; };
  C['action.first'] = function (D) { return live(obj(D).actions).length >= 1; };
  C['week.action'] = function (D, w) {
    return inWeek(obj(D).actions, w).length >= 1 || inWeek(journals(D, 'zero_result'), w).length >= 1;
  };
  C['week.journal'] = function (D, w) { return inWeek(journals(D), w).some(function (j) { return jWords(j) >= 40; }); };
  C['week.sightcheck'] = function (D, w) {
    return inWeek(obj(D).sightings, w).length >= 1 || inWeek(journals(D, 'zero_result'), w).length >= 1;
  };
  C['week.review'] = function (D, w) { return !!reviewFor(D, w); };
  C['week.audit'] = function (D, w) {
    return !auditsMine(D).some(function (a) { return a.status === 'assigned' && auditWeek(a) === w; });
  };
  ['W1', 'W2', 'W3', 'W4'].forEach(function (wv) {
    C['wave.note.' + wv] = function (D) { var n = waveNote(D, wv); return wavePublished(D, wv) && !!n && words(n.note) >= 20; };
  });
  C['sight.levels'] = function (D) {
    return live(obj(D).sightings).every(function (s) { return s.level !== '' && s.level !== null && s.level !== undefined && !isNaN(Number(s.level)); });
  };
  C['journal.failure'] = function (D) { return journals(D, 'failure_analysis').length >= 1; };
  ['W2', 'W3'].forEach(function (wv) {
    C['hyp.checked.' + wv] = function (D) {
      var hs = hypotheses(D), n = waveNote(D, wv), chk = obj(n && n.hypothesisChecks);
      return hs.length >= 1 && hs.every(function (h) { return has(chk[h.id]); });
    };
  });
  ['baseline', 'intermediate', 'final'].forEach(function (t) {
    C['report.' + t + '.ready'] = function (D) { var r = report(D, t); return !!r && (r.status === 'ready' || r.status === 'submitted'); };
  });
  function summit(D) { return obj(obj(D).summit); }
  function article(D) { return obj(obj(D).article); }
  C['summit.outline'] = function (D) {
    var s = obj(summit(D).sections);
    return ['hook', 'term', 'approach', 'evidence', 'learnings', 'phase2'].every(function (k) { return words(obj(s[k]).notes) >= 20; });
  };
  C['summit.aoa'] = function (D) { return words(summit(D).aoaStatement) >= 25; };
  C['summit.abstract'] = function (D) { var n = words(summit(D).abstract); return n >= 45 && n <= 55; };
  C['summit.visuals'] = function (D) { return arr(summit(D).chartIds).length >= 1; };
  C['summit.rehearsed2'] = function (D) { return arr(summit(D).rehearsals).length >= 2; };
  C['summit.qa5'] = function (D) { return arr(summit(D).qa).filter(function (q) { return q && words(q.answer) >= 15; }).length >= 5; };
  C['summit.selfcheck'] = function (D) {
    var sc = obj(summit(D).selfCheck);
    return ['SC1', 'SC2', 'SC3', 'SC4', 'SC5'].every(function (k) { return has(obj(sc[k]).rating); });
  };
  C['summit.feedback'] = function (D) { return journals(D, 'summit_feedback').length >= 1; };
  C['pivot.card'] = function (D) { var p = plan(D, 2); return !!p && has(p.variableChanged) && has(p.p2Hypothesis); };
  C['article.outline'] = function (D) {
    var a = article(D), s = obj(a.sections);
    return has(a.title) && ['intro', 'methods', 'results', 'discussion'].every(function (k) { return has(obj(s[k]).notes); });
  };
  C['article.sources6'] = function (D) {
    return arr(article(D).sources).filter(function (s) { return s && len(s.apa) >= 20 && len(s.use) >= 10; }).length >= 6;
  };
  C['article.visuals3'] = function (D) { return arr(article(D).visuals).filter(function (v) { return v && has(v.caption); }).length >= 3; };
  C['article.ethics'] = function (D) { return words(article(D).ethics) >= 60; };
  C['article.ai'] = function (D) { return words(article(D).aiDeclaration) >= 10; };
  C['article.abstract'] = function (D) { var n = words(article(D).abstract); return n >= 150 && n <= 200; };
  C['article.words'] = function (D) { var n = num(article(D).wordCount, 0); return n >= 2000 && n <= 3000; };
  function pair(D, a, b) {
    var s = obj(article(D).sections), x = obj(s[a]).notes, y = obj(s[b]).notes;
    return has(x) && has(y) && words(x) + words(y) >= 300;
  }
  C['article.sections.MR'] = function (D) { return pair(D, 'methods', 'results'); };
  C['article.sections.ID'] = function (D) { return pair(D, 'intro', 'discussion'); };
  function peerGiven(D, n) {
    return arr(obj(article(D).peer).given).some(function (g) { return g && num(g.n, 0) === n && words(g.notes) >= 80; });
  }
  C['peer.r1'] = function (D) { return peerGiven(D, 1); };
  C['peer.r2'] = function (D) { return peerGiven(D, 2); };
  C['peer.plan'] = function (D) { return words(article(D).revisionPlan) >= 40; };
  function finSection(D, k) { var r = report(D, 'final'); return words(obj(r && r.sections)[k]); }
  C['fin.compare'] = function (D) { return finSection(D, 'compare') >= 60; };
  C['fin.close'] = function (D) { return finSection(D, 'closeout') >= 60; };
  C['journal.final'] = function (D) { return journals(D, 'final_reflection').some(function (j) { return jWords(j) >= 150; }); };
  WI.checks = C;

  function planActionDone(D, paId) {
    return live(obj(D).actions).some(function (a) { return a.planActionId === paId; });
  }
  WI.itemDone = function (D, row) {
    var it = WI.itemDef(row.itemId, D);
    if (!it || !it.check) return null;
    if (it.check === 'plan.action') return planActionDone(D, it.planActionId);
    var f = C[it.check];
    if (!f) return null;
    return !!f(D, it.week || row.weekId);
  };
  WI.evalChecks = function (D, weekId) {
    var out = {};
    rowsOf(D).forEach(function (r) {
      if (r.weekId !== weekId) return;
      var v = WI.itemDone(D, r);
      if (v !== null) out[r.itemId] = v;
    });
    return out;
  };
  WI.autoTicks = function (D, weekId, nowIso) {
    nowIso = nowIso || WI.now();
    var out = [];
    rowsOf(D).forEach(function (r) {
      if (r.status !== 'open') return;
      if (weekId && r.weekId !== weekId) return;
      if (WI.itemDone(D, r) === true) out.push({ id: r.id, status: 'done', doneAt: nowIso, doneBy: 'auto', updatedAt: nowIso });
    });
    return out;
  };
  WI.canUntick = function (row, D) {
    if (!row || row.status !== 'done') return false;
    if (row.doneBy === 'auto') return false;
    var it = WI.itemDef(row.itemId, D);
    return !(it && it.check);
  };
  WI.canSetStatus = function (row, status, D) {
    if (!row) return { ok: false, code: 'NOT_FOUND' };
    if (status === 'dropped') {
      return (row.kind === 'optional' || row.kind === 'own') ? { ok: true } : { ok: false, code: 'FORBIDDEN' };
    }
    if (status === 'cannot') return row.status === 'open' ? { ok: true } : { ok: false, code: 'VALIDATION' };
    if (status === 'open') {
      if (row.status === 'done' && !WI.canUntick(row, D)) return { ok: false, code: 'FORBIDDEN' };
      return (row.status === 'done' || row.status === 'cannot' || row.status === 'dropped') ? { ok: true } : { ok: false, code: 'VALIDATION' };
    }
    return { ok: false, code: 'VALIDATION' };
  };

  // ------------------------------------------------------------------ online gate
  WI.onlineStatus = function (D, nowIso, config) {
    var st = obj(obj(D).state), c = cfg(D, config), now = parse(nowIso || WI.now());
    var opensAt = c.onlineOpensAt;
    if (st.onlineUnlockedBy === 'teacher') {
      // Lead decision 19 Nov (SPEC P9): even a teacher unlock needs all six rules ticked.
      return { unlocked: truthy(st.onlineUnlocked) && WI.rulesAllTicked(D), by: 'teacher', opensAt: opensAt, shouldSetAuto: false };
    }
    if (truthy(st.onlineUnlocked)) return { unlocked: true, by: st.onlineUnlockedBy || 'auto', opensAt: opensAt, shouldSetAuto: false };
    var auto = WI.rulesAllTicked(D) && now >= parse(opensAt);
    return { unlocked: auto, by: auto ? 'auto' : null, opensAt: opensAt, shouldSetAuto: auto };
  };
  WI.onlineUnlocked = function (D, nowIso, config) { return WI.onlineStatus(D, nowIso, config).unlocked; };
  WI.lockedOnline = function (type, rec, D, nowIso, config) {
    rec = obj(rec);
    if (WI.onlineUnlocked(D, nowIso, config)) return false;
    if (type === 'action') return WI.isOnlineChannel(rec.channelId) && rec.outcome !== 'not_done';
    if (type === 'sighting') return rec.relation === 'me' && WI.isOnlineChannel(rec.channelId);
    return false;
  };
  WI.planActionLocked = function (D, pa, nowIso, config) {
    return WI.isOnlineChannel(obj(pa).where) && !WI.onlineUnlocked(D, nowIso, config);
  };
  WI.askFirstApproved = function (D, ideaId) {
    ideaId = ideaId || 'id_influencer';
    return arr(obj(D).requests).some(function (r) {
      return r.type === 'ask_first' && r.status === 'approved' && (!r.ideaId || r.ideaId === ideaId);
    });
  };
  WI.ideaSelectable = function (D, ideaId) {
    var c = WI.choice('ideas', ideaId);
    if (!c) return false;
    return c.askFirst ? WI.askFirstApproved(D, ideaId) : true;
  };

  // ------------------------------------------------------------------ stage
  function stageMet(D, nowIso) {
    var now = parse(nowIso || WI.now());
    var m = { s1: true };
    m.s2 = C['word.first'](D);
    m.s3 = now >= parse('2026-11-21') && WI.rulesAllTicked(D) && planActs(D, 1).length >= 3;
    m.s4 = m.s3 && now >= parse('2026-11-26') && live(obj(D).actions).length >= 3 && arr(obj(D).reviews).length >= 1;
    m.s5 = m.s3 && now >= parse('2026-11-23') && wavePublished(D, 'W1');
    m.s6 = m.s3 && now >= parse('2026-12-07');
    m.s7 = now >= parse('2026-12-18');
    return m;
  }
  WI.stageOf = function (D, nowIso) {
    var m = stageMet(D, nowIso), best = 's1';
    ['s1', 's2', 's3', 's4', 's5', 's6', 's7'].forEach(function (s) { if (m[s]) best = s; });
    return best;
  };
  WI.stagePath = function (D, nowIso) {
    var m = stageMet(D, nowIso), cur = WI.stageOf(D, nowIso);
    return arr(obj(G('WI_PLAN')).stages).map(function (s) {
      return { id: s.id, name: s.name, met: !!m[s.id], current: s.id === cur, opens: s.opens };
    });
  };

  // ------------------------------------------------------------------ generation (SPEC §5.3)
  function planForWeek(D, weekId) {
    var ph = parse(WI.weekRange(weekId).start) >= parse(obj(G('WI_PLAN')).phase2Start || '2026-12-18') ? 2 : 1;
    return (ph === 2 && plan(D, 2)) ? plan(D, 2) : plan(D, 1);
  }
  function budget(D, weekId) {
    var p = planForWeek(D, weekId), id = (p && p.timeBudget) || 'standard';
    var b = WI.choice('timeBudgets', id) || { optional: 2, planPerWeek: 2 };
    return b;
  }
  function ruleTrue(rule, p, D) {
    if (!p && !(rule.when && rule.when.askFirst)) return false;
    var w = obj(rule.when), pf = arr(p && p.platforms), ideas = arr(p && p.ideas), tg = arr(p && p.targetGroups);
    if (w.anyOnline && pf.some(function (x) { return WI.isOnlinePlatform(x); })) return true;
    if (w.platforms && w.platforms.some(function (x) { return inList(pf, x); })) return true;
    if (w.ideas && w.ideas.some(function (x) { return inList(ideas, x); })) return true;
    if (w.targetGroups && w.targetGroups.some(function (x) { return inList(tg, x); })) return true;
    if (w.route && p && p.route === w.route) return true;
    if (w.timeBudget && p && p.timeBudget === w.timeBudget) return true;
    if (w.otherAge) {
      var own = obj(G('WI_CHOICES')).ownAgeGroup || 'tg_5_16';
      if (tg.some(function (x) { var c = WI.choice('targetGroups', x); return c && c.age && x !== own; })) return true;
    }
    if (w.askFirst) {
      if (inList(ideas, 'id_influencer')) return true;
      if (arr(obj(D).requests).some(function (r) { return r.type === 'ask_first'; })) return true;
    }
    return false;
  }
  WI.ruleTrue = ruleTrue;

  // The first week she really had the app: the week her oldest checklist row was written in.
  // Weeks before it are built only to hand their fixed items on (SPEC §5.8, late start): they get no
  // habit, choice or optional items and no weekly review, so a late starter is not asked to review
  // a week she never had.
  function startWeekNo(D, nowIso) {
    var best = NaN, any = false;
    rowsOf(D).forEach(function (r) {
      any = true;
      var t = parse(r.createdAt);
      if (!isNaN(t) && (isNaN(best) || t < best)) best = t;
    });
    if (!any) return nowIso ? weekNoOf(nowIso) : 1;
    return isNaN(best) ? 1 : weekNoOf(best);
  }
  WI.startWeekId = function (D, nowIso) { return weekIdAt(startWeekNo(D, nowIso)); };

  WI.buildWeek = function (D, weekId, nowIso, opts) {
    D = obj(D); opts = obj(opts); nowIso = nowIso || WI.now();
    var C0 = cat(), s = sid(D), release = num(opts.release, cfg(D).release);
    var rows = rowsOf(D).filter(function (r) { return !s || !r.studentId || r.studentId === s; });
    var preStart = weekIndex(weekId) < startWeekNo(D, nowIso);
    var inW = {}, ever = {}, block = {};
    rows.forEach(function (r) {
      ever[r.itemId] = true;
      if (r.weekId === weekId) inW[r.itemId] = true;
      if (inList(['done', 'cannot', 'dropped', 'open'], r.status)) block[r.itemId] = true;
    });
    var light = isLight(weekId), sunday = WI.weekRange(weekId).sunday, wn = weekIndex(weekId);
    var out = [];
    function add(itemId, f) {
      var row = {
        id: s + '|' + weekId + '|' + itemId, studentId: s, weekId: weekId, itemId: itemId,
        title: f.title, kind: f.kind, source: f.source, status: 'open', originWeek: f.originWeek || weekId,
        carryCount: f.carryCount || 0, dueDate: f.dueDate || sunday, doneAt: '', doneBy: '', reason: '',
        refId: f.refId || '', createdAt: nowIso, updatedAt: nowIso
      };
      if (f.afterBreak) row.afterBreak = true;
      out.push(row);
      inW[itemId] = true; ever[itemId] = true;
    }
    function free(id) { return !inW[id] && !block[id]; }
    function kindFor(k) { return light ? 'optional' : k; }

    // 1. carried
    var pw = WI.prevWeekId(weekId), dec = obj(opts.decisions);
    if (pw) {
      rows.forEach(function (r) {
        if (r.weekId !== pw || r.status !== 'open' || r.kind === 'optional') return;
        // Lead decision 19 Nov: weekly habits belong to their week; they expire instead of carrying
        // (a missed review is still asked for by reviewDue).
        if (/^H-W\d\d-\d$/.test(str(r.itemId))) return;
        // "could not do" closes any item; only her own items can be dropped (required and recommended never)
        if (dec[r.itemId] === 'cannot' || (dec[r.itemId] === 'dropped' && r.kind === 'own')) return;
        if (inW[r.itemId]) return;
        // a carried weekly habit says which week it belongs to, so two "Write one Lab Book reflection" rows can be told apart
        var hm = /^H-W(\d\d)-\d$/.exec(str(r.itemId)), ttl = str(r.title);
        if (hm && !/^Week \d+: /.test(ttl)) ttl = 'Week ' + parseInt(hm[1], 10) + ': ' + ttl;
        add(r.itemId, {
          title: ttl, kind: r.kind, source: 'carried', originWeek: r.originWeek || pw,
          carryCount: num(r.carryCount, 0) + 1, dueDate: dateOf(r.dueDate) || r.dueDate, refId: r.refId,
          afterBreak: light && r.kind !== 'optional'
        });
      });
    }
    // 2. fixed-course
    arr(C0.items).forEach(function (it) {
      if (num(it.release, 1) > release) return;
      var iw = weekIndex(it.week);
      if (iw === wn) {
        if (free(it.id)) add(it.id, { title: it.title, kind: kindFor(it.kind), source: 'fixed-course', dueDate: it.due });
      } else if (iw < wn && !ever[it.id]) {
        add(it.id, { title: it.title, kind: it.kind, source: 'fixed-course', dueDate: it.due, originWeek: it.week, afterBreak: light && it.kind !== 'optional' });
      }
    });
    // 3. habit
    for (var n = 1; n <= 5 && !preStart; n++) {
      var h = habitDef(weekId, n);
      if (!h || num(h.release, 1) > release || !free(h.id)) continue;
      if (h.onlyIfAudit && !auditsMine(D).some(function (a) { return auditWeek(a) === weekId; })) continue;
      add(h.id, { title: h.title, kind: kindFor(h.kind), source: 'habit', dueDate: sunday });
    }
    // review preferences (step 7) are read first: `moved` also changes where plan-actions land (step 4)
    var prefs = opts.prefs;
    if (!prefs && pw) { var rv = reviewFor(D, pw); prefs = rv ? obj(rv.nextPrefs) : {}; }
    prefs = obj(prefs);
    // 4. plan-action
    var moved = {};
    arr(prefs.moved).forEach(function (m) { if (m && m.planActionId) moved[m.planActionId] = m.whenDate; });
    live(D.planActions).forEach(function (pa) {
      var st = pa.status || 'planned';
      if (st !== 'planned') return;
      var when = moved[pa.id] || pa.whenDate;
      if (!when || WI.weekIdOf(when) !== weekId) return;
      var id = 'P-' + pa.id;
      if (!free(id)) return;
      add(id, { title: 'Do: ' + trim(pa.what).substr(0, 70), kind: kindFor('recommended'), source: 'plan-action', dueDate: dateOf(when), refId: pa.id });
    });
    // 5. choice-driven
    // A required or recommended choice item that was made in a light week (so forced to optional) and
    // expired there comes back once after the break: a safety check must not be lost in the holidays.
    var expiredInBreak = {}, otherRow = {};
    rows.forEach(function (r) {
      if (!/^C-/.test(str(r.itemId))) return;
      if (r.status === 'expired' && isLight(r.weekId)) expiredInBreak[r.itemId] = true;
      else otherRow[r.itemId] = true;
    });
    function seen(id, r) { return ever[id] && !(expiredInBreak[id] && !otherRow[id] && !light && r.kind !== 'optional' && !inW[id]); }
    var p1 = plan(D, 1), p2 = plan(D, 2);
    arr(C0.choiceRules).forEach(function (r) {
      if (preStart || wn < weekIndex(r.firstWeek)) return;
      var t1 = ruleTrue(r, p1, D);
      if (t1 && !seen(r.id, r)) add(r.id, { title: r.title, kind: kindFor(r.kind), source: 'choice-driven', dueDate: sunday });
      if (p2 && !t1 && ruleTrue(r, p2, D) && !seen(r.id + '-2', r)) {
        add(r.id + '-2', { title: r.title, kind: kindFor(r.kind), source: 'choice-driven', dueDate: sunday });
      }
    });
    // 6. optional pool
    var skip = arr(prefs.skip);
    var want = preStart ? 0 : num(budget(D, weekId).optional, 2);
    var have = rows.filter(function (r) { return r.weekId === weekId && /^X-/.test(r.itemId); }).length;
    if (want > have) {
      var stg = stageNo(opts.stage || WI.stageOf(D, nowIso));
      var online = (opts.onlineUnlocked !== undefined) ? !!opts.onlineUnlocked : WI.onlineUnlocked(D, nowIso);
      var cands = poolArray().filter(function (p) {
        return p && /^X-\d\d$/.test(p.id) && !ever[p.id] && stageNo(p.stage) <= stg && (!p.online || online);
      });
      cands.sort(function (a, b) {
        var ha = hash(s + weekId + a.id), hb = hash(s + weekId + b.id);
        return ha < hb ? -1 : (ha > hb ? 1 : (a.id < b.id ? -1 : 1));
      });
      // a proposal she unticked in her review is left out and NOT replaced by another one
      cands.slice(0, want - have).forEach(function (p) {
        if (!inList(skip, p.id)) add(p.id, { title: p.title, kind: 'optional', source: 'pool', dueDate: sunday });
      });
    }
    // 7. review preferences
    if (skip.length) out = out.filter(function (r) { return !(r.kind === 'optional' && r.source !== 'carried' && inList(skip, r.itemId)); });
    var ownMax = num(C0.ownMax, 5);
    var ownHave = rows.filter(function (r) { return r.weekId === weekId && r.source === 'own'; }).length;
    arr(prefs.own).forEach(function (o, i) {
      if (!o || !has(o.title) || ownHave >= ownMax) return;
      var id = 'O-' + hash(s + '|' + weekId + '|' + i + '|' + trim(o.title));
      if (inW[id]) return;
      add(id, { title: trim(o.title), kind: 'own', source: 'own', dueDate: o.dueDate ? dateOf(o.dueDate) : sunday });
      ownHave++;
    });
    return out;
  };

  WI.rollWeek = function (D, fromWeekId, nowIso) {
    nowIso = nowIso || WI.now();
    var next = WI.nextWeekId(fromWeekId);
    if (!next) return { close: [], open: [] };
    var open = WI.buildWeek(D, next, nowIso);
    var close = [];
    rowsOf(D).forEach(function (r) {
      if (r.weekId === fromWeekId && r.status === 'open') {
        var habit = /^H-W\d\d-\d$/.test(str(r.itemId));
        close.push({ id: r.id, status: (r.kind === 'optional' || habit) ? 'expired' : 'carried', updatedAt: nowIso });
      }
    });
    return { close: close, open: open };
  };
  WI.previewWeek = function (D, weekId, nowIso, draft) {
    draft = obj(draft);
    var next = WI.nextWeekId(weekId);
    if (!next) return [];
    return WI.buildWeek(D, next, nowIso, { prefs: obj(draft.nextPrefs), decisions: obj(draft.decisions) });
  };
  WI.planOverload = function (D, weekId) {
    var limit = num(budget(D, weekId).planPerWeek, 2);
    var ids = live(obj(D).planActions).filter(function (pa) {
      return (pa.status || 'planned') === 'planned' && pa.whenDate && WI.weekIdOf(pa.whenDate) === weekId;
    }).map(function (pa) { return pa.id; });
    return { count: ids.length, limit: limit, extra: ids.slice(limit) };
  };
  WI.weekRows = function (D, weekId) { return rowsOf(D).filter(function (r) { return r.weekId === weekId; }); };
  WI.weekGroups = function (D, weekId) {
    var g = { must: [], recommended: [], plan: [], choice: [], carried: [], optional: [], own: [] };
    WI.weekRows(D, weekId).forEach(function (r) {
      var item = WI.itemDef(r.itemId, D), k;
      if (r.source === 'carried') k = 'carried';
      else if (r.source === 'own' || r.kind === 'own') k = 'own';
      else if (r.source === 'plan-action') k = 'plan';
      else if (r.source === 'choice-driven') k = 'choice';
      else if (r.kind === 'optional') k = 'optional';
      else if (r.kind === 'required') k = 'must';
      else k = 'recommended';
      g[k].push({ row: r, item: item });
    });
    Object.keys(g).forEach(function (k) {
      g[k].sort(function (a, b) { return str(a.row.dueDate) < str(b.row.dueDate) ? -1 : (str(a.row.dueDate) > str(b.row.dueDate) ? 1 : 0); });
    });
    return g;
  };
  WI.weekCounts = function (D, weekId) {
    var c = { done: 0, open: 0, carried: 0, cannot: 0, dropped: 0, total: 0 };
    WI.weekRows(D, weekId).forEach(function (r) {
      c.total++;
      if (r.status === 'done') c.done++;
      else if (r.status === 'open') { c.open++; if (r.source === 'carried') c.carried++; }
      else if (r.status === 'cannot') c.cannot++;
      else if (r.status === 'dropped') c.dropped++;
    });
    return c;
  };
  WI.ownItemCount = function (D, weekId) {
    return WI.weekRows(D, weekId).filter(function (r) { return r.source === 'own' || r.kind === 'own'; }).length;
  };
  function afterBreak(row, nowIso) {
    var rw = weekIndex(row.weekId);
    var late = row.source === 'carried' || (weekIndex(row.originWeek) > 0 && weekIndex(row.originWeek) < rw);
    return (rw === 6 || rw === 7) && late && row.kind !== 'optional' && weekIndex(WI.weekIdOf(nowIso)) < 8;
  }
  WI.isOverdue = function (row, nowIso) {
    nowIso = nowIso || WI.now();
    if (!row || row.status !== 'open' || !row.dueDate) return false;
    if (row.afterBreak || afterBreak(row, nowIso)) return false;
    return dateOf(row.dueDate) < dateOf(nowIso);
  };

  // ------------------------------------------------------------------ review, next step, flags
  function hasRowsIn(D, weekId) { return rowsOf(D).some(function (r) { return r.weekId === weekId; }); }
  function reviewWeeks(D, nowIso, includeLight) {
    var now = parse(nowIso || WI.now()), cur = weekIndex(WI.weekIdOf(nowIso || WI.now())), out = [];
    for (var i = startWeekNo(D, null); i <= Math.min(cur, 12); i++) {
      var w = weekIdAt(i);
      if (now < parse(WI.reviewOpensAt(w))) continue;
      if (!hasRowsIn(D, w) || reviewFor(D, w)) continue;
      if (isLight(w) && !includeLight) continue;
      out.push(w);
    }
    return out;
  }
  WI.reviewDue = function (D, nowIso) { return reviewWeeks(D, nowIso, false); };
  WI.reviewOffered = function (D, nowIso) { return reviewWeeks(D, nowIso, true); };
  WI.reviewOnTime = function (weekId, submittedAt) { return !!submittedAt && dateOf(submittedAt) === WI.weekRange(weekId).sunday; };

  WI.nextStep = function (D, nowIso) {
    nowIso = nowIso || WI.now();
    var due = WI.reviewDue(D, nowIso);
    if (due.length) return { label: 'Do your weekly review', route: '#/review', why: 'Your review for ' + WI.weekRange(due[0]).label + ' is waiting.', weekId: due[0] };
    if (!C['word.first'](D)) return { label: 'Record your word', route: '#/first', why: 'Everything starts with your word.' };
    var online = WI.onlineUnlocked(D, nowIso);
    var open = rowsOf(D).filter(function (r) {
      if (r.status !== 'open') return false;
      var it = WI.itemDef(r.itemId, D);
      if (it && it.online && !online) return false;
      return WI.itemDone(D, r) !== true;
    }).sort(function (a, b) { return str(a.dueDate) < str(b.dueDate) ? -1 : (str(a.dueDate) > str(b.dueDate) ? 1 : 0); });
    function stepFor(r, why) {
      var it = WI.itemDef(r.itemId, D);
      return { label: r.title, route: (it && it.route) || '#/week', why: why, itemId: r.itemId, rowId: r.id };
    }
    var req = open.filter(function (r) { return r.kind === 'required'; });
    for (var i = 0; i < req.length; i++) if (WI.isOverdue(req[i], nowIso)) return stepFor(req[i], 'This was due on ' + fmtDate(req[i].dueDate) + '.');
    for (var j = 0; j < req.length; j++) {
      if (afterBreak(req[j], nowIso)) continue;
      var dl = WI.daysLeft(req[j].dueDate, nowIso);
      if (dl >= 0 && dl <= 3) return stepFor(req[j], dl === 0 ? 'This is due today.' : 'This is due on ' + fmtDate(req[j].dueDate) + '.');
    }
    if (arr(obj(D).feedback).some(function (f) { return !has(f.readAt); })) {
      return { label: 'Read T.Chris\u2019s feedback', route: '#/home', why: 'You have new feedback.' };
    }
    var au = null;
    auditsMine(D).forEach(function (a) { if (!au && a.status === 'assigned') au = a; });
    if (au && cfg(D).release >= 2) return { label: 'Do your audit', route: '#/audits/' + au.id, why: 'A classmate is waiting for your audit.', auditId: au.id };
    var rec = open.filter(function (r) { return r.kind === 'recommended'; });
    if (rec.length) return stepFor(rec[0], 'This is the next thing on your list.');
    return { label: 'Write in your Lab Book', route: '#/log/journal/new', why: 'A short note about your word always helps.' };
  };

  function lastActivity(D) {
    var t = parse(obj(obj(D).state).lastActivityAt);
    var best = isNaN(t) ? 0 : t;
    ['actions', 'journal', 'sightings', 'tallies'].forEach(function (k) {
      arr(obj(D)[k]).forEach(function (r) { var x = parse(r.createdAt); if (!isNaN(x) && x > best) best = x; });
    });
    rowsOf(D).forEach(function (r) { if (r.doneBy === 'manual') { var x = parse(r.doneAt); if (!isNaN(x) && x > best) best = x; } });
    return best;
  }
  WI.lastActivityAt = function (D) { var t = lastActivity(D); return t ? isoBkk(t) : ''; };
  WI.flags = function (D, nowIso) {
    nowIso = nowIso || WI.now();
    var out = [];
    if (arr(obj(D).flags).some(function (f) { return f.status !== 'handled'; })) out.push('F_PROBLEM');
    var la = lastActivity(D);
    // a student who has not started yet counts from launch day (Sat 21 Nov), not from never (lead, 19 Nov)
    var since = la || parse('2026-11-21T00:00:00+07:00');
    if (parse(nowIso) - since >= 7 * DAY) out.push('F_QUIET');
    var soon = WI.milestones().filter(function (m) { var d = WI.daysLeft(m.date, nowIso); return d >= 0 && d <= 3; });
    var deadline = soon.some(function (m) {
      var reqs = WI.milestoneRequirements(m.id);
      return rowsOf(D).some(function (r) {
        if (r.status !== 'open' || r.kind !== 'required' || afterBreak(r, nowIso)) return false;
        var it = WI.itemDef(r.itemId, D);
        return it && arr(it.feeds).some(function (f) { return inList(reqs, f); });
      });
    });
    if (deadline) out.push('F_DEADLINE');
    var pend = arr(obj(D).requests).some(function (r) { return r.status === 'pending'; }) || word(D).regStatus === 'submitted';
    if (pend) out.push('F_PENDING');
    if (rowsOf(D).some(function (r) { return r.status === 'cannot' && r.kind === 'required'; })) out.push('F_CANNOT');
    return out;
  };

  // ------------------------------------------------------------------ coverage helpers
  var MS_REQ = {
    M01: ['A1-NOTRUDE', 'A1-ORIGINAL', 'A1-PURPOSE', 'A1-USAGE', 'A1-EXAMPLES'],
    M03: ['BAS-PROFILE', 'BAS-FUDGE', 'BAS-W1', 'BAS-PLAN', 'BAS-LEN'],
    M06: ['INT-W2', 'INT-LOG', 'INT-ANALYSIS', 'INT-ADJUST'],
    M07: ['SUM-ABS', 'SUM-C3'],
    M08: ['SUM-C1', 'SUM-C2', 'SUM-C3', 'SUM-C4', 'SUM-AOA', 'SUM-LEARN', 'SUM-PH2', 'SUM-ABS'],
    M09: ['LAB-PRE'],
    M11: ['FIN-COMPARE'],
    M12: ['FIN-CLOSE'],
    M13: ['FIN-W3', 'FIN-COMPARE', 'FIN-CLOSE'],
    M14: ['PEER-DISC'],
    M15: ['PEER-R1', 'PEER-R2', 'PEER-DISC'],
    M16: ['ART-INTRO', 'ART-METH', 'ART-RES', 'ART-DISC', 'ART-ABS', 'ART-WORDS', 'ART-SRC', 'ART-VIS', 'ART-ETH', 'A1-RESEARCH', 'A1-REFLECT', 'LAB-POST']
  };
  WI.milestoneRequirements = function (mid) { return (MS_REQ[mid] || []).slice(); };
  WI.requirement = function (reqId) {
    var rs = arr(obj(G('WI_COVERAGE')).requirements);
    for (var i = 0; i < rs.length; i++) if (rs[i].id === reqId) return rs[i];
    return null;
  };
  WI.itemStatus = function (D, itemId) {
    var st = 'later';
    rowsOf(D).forEach(function (r) {
      if (r.itemId !== itemId) return;
      if (r.status === 'done') st = 'done';
      else if (st !== 'done' && r.status === 'cannot') st = 'cannot';
      else if (st === 'later' && (r.status === 'open' || r.status === 'carried')) st = 'open';
    });
    return st;
  };
  WI.requirementStatus = function (D, reqId) {
    var req = WI.requirement(reqId);
    if (!req) return null;
    var items = arr(req.items).map(function (id) {
      var it = WI.itemDef(id, D);
      return { itemId: id, title: it ? it.title : id, due: it ? it.due : null, status: WI.itemStatus(D, id) };
    });
    return { requirement: req, items: items, done: items.filter(function (x) { return x.status === 'done'; }).length, total: items.length };
  };
  WI.milestoneNeeds = function (D, mid) {
    var m = null;
    WI.milestones().forEach(function (x) { if (x.id === mid) m = x; });
    return { milestone: m, requirements: WI.milestoneRequirements(mid).map(function (r) { return WI.requirementStatus(D, r); }).filter(Boolean) };
  };
  WI.deliverableStatus = function (D, prefix) {
    var rs = arr(obj(G('WI_COVERAGE')).requirements).filter(function (r) { return r.id.indexOf(prefix) === 0; });
    return rs.map(function (r) { return WI.requirementStatus(D, r.id); });
  };

  // ================================================================== BEGIN GAME
  // XP, badges, ranks and streak. This block must never read spread data (validator V9 scans it).
  function rulesById() {
    var o = {};
    arr(obj(G('WI_GAME')).xpRules).forEach(function (r) { o[r.id] = r; });
    return o;
  }
  WI.xpFor = function (event, D) {
    event = obj(event);
    var r = rulesById()[event.ruleId];
    if (!r) return 0;
    if (r.id === 'X11') { var it = WI.itemDef(event.itemId, D); return it ? num(it.xp, 0) : 0; }
    if (r.id === 'X12') return num(r.xp, 30) + (event.onTime ? num(r.onTimeBonus, 10) : 0);
    if (r.id === 'X18') {
      var k = str(event.eventKey);
      if (k === 'sm:check') return 15;
      return 10;
    }
    return num(r.xp, 0);
  };
  function entryOrder(a, b) {
    var ka = str(a.date) + '|' + str(a.createdAt) + '|' + str(a.id), kb = str(b.date) + '|' + str(b.createdAt) + '|' + str(b.id);
    return ka < kb ? -1 : (ka > kb ? 1 : 0);
  }
  function dayOf(e) { return e.date ? dateOf(e.date) : dateOf(e.createdAt); }
  WI.entitlements = function (D, nowIso) {
    D = obj(D); nowIso = nowIso || WI.now();
    var s = sid(D), R0 = rulesById(), out = [], given = {};
    var awarded = {};
    arr(D.xpLog).forEach(function (x) { if (x && x.eventKey) awarded[x.eventKey] = x; });
    function give(ruleId, key, xp) {
      if (given[key]) return;
      var prev = awarded[key];
      var row = prev ? { id: prev.id || (s + '|' + key), studentId: prev.studentId || s, at: prev.at, ruleId: prev.ruleId || ruleId, eventKey: key, xp: num(prev.xp, xp) }
        : { id: s + '|' + key, studentId: s, at: nowIso, ruleId: ruleId, eventKey: key, xp: xp };
      if (!prev && !(xp > 0)) return;
      given[key] = true;
      out.push(row);
    }
    function xpOf(id) { return R0[id] ? num(R0[id].xp, 0) : 0; }
    // keep every key already awarded (deleting an entry never removes XP)
    Object.keys(awarded).forEach(function (k) { give(awarded[k].ruleId, k, num(awarded[k].xp, 0)); });

    if (C['word.first'](D)) give('X01', 'first', xpOf('X01'));
    if (C['word.card'](D)) give('X02', 'card', xpOf('X02'));
    if (C['word.zb'](D) && C['word.submitted'](D)) give('X03', 'zb', xpOf('X03'));
    [1, 2].forEach(function (ph) { if (plan(D, ph) && planActs(D, ph).length >= 3) give('X04', 'plan:' + ph, xpOf('X04')); });
    if (WI.rulesAllTicked(D)) give('X05', 'rules', xpOf('X05'));

    // capped entry awards: already-awarded keys fill the slots first
    function capped(list, keyFn, perDay, perWeek, eligible, ruleId, xp, onGive) {
      var dayN = {}, weekN = {};
      function slot(e) {
        var d = dayOf(e), w = weekOfRow(e);
        return { d: d, w: w, ok: (!perDay || num(dayN[d], 0) < perDay) && (!perWeek || num(weekN[w], 0) < perWeek) };
      }
      function take(sl) { dayN[sl.d] = num(dayN[sl.d], 0) + 1; weekN[sl.w] = num(weekN[sl.w], 0) + 1; }
      var sorted = arr(list).slice().sort(entryOrder);
      sorted.forEach(function (e) { if (awarded[keyFn(e)]) { take(slot(e)); if (onGive) onGive(e); } });
      sorted.forEach(function (e) {
        var k = keyFn(e);
        if (awarded[k] || given[k]) return;
        if (e.deleted === true || e.deleted === 'TRUE' || !eligible(e)) return;
        var sl = slot(e);
        if (!sl.ok) return;
        take(sl); give(ruleId, k, xp);
        if (onGive) onGive(e);
      });
    }
    // X06 + X07 + X15
    var acts = arr(D.actions);
    capped(acts, function (a) { return 'ac:' + a.id; }, num(obj(R0.X06).perDay, 2), num(obj(R0.X06).perWeek, 6),
      function () { return true; }, 'X06', xpOf('X06'), function (a) {
        if (a.deleted === true || a.deleted === 'TRUE') return;
        if (words(a.learned) >= 15) give('X07', 'acl:' + a.id, xpOf('X07'));
        if ((a.outcome === 'changed' || a.outcome === 'not_done') && len(a.outcomeReason) >= 10) give('X15', 'acr:' + a.id, xpOf('X15'));
      });
    // X08 Lab Book entries
    var js = arr(D.journal);
    capped(js.filter(function (j) { return j.kind !== 'zero_result' && j.kind !== 'failure_analysis'; }),
      function (j) { return 'jn:' + j.id; }, num(obj(R0.X08).perDay, 1), num(obj(R0.X08).perWeek, 3),
      function (j) { return jWords(j) >= 40; }, 'X08', xpOf('X08'));
    // X09, X10 once a week
    js.slice().sort(entryOrder).forEach(function (j) {
      if (j.deleted === true || j.deleted === 'TRUE') return;
      var w = weekOfRow(j);
      if (j.kind === 'zero_result' && jWords(j) >= 40) give('X09', 'zero:' + w, xpOf('X09'));
      if (j.kind === 'failure_analysis' && jWords(j) >= 60) give('X10', 'fail:' + w, xpOf('X10'));
    });
    // X11 checklist items, X13 could-not-do (3 a week)
    var cant = {};
    Object.keys(awarded).forEach(function (k) {
      if (k.indexOf('cant:') === 0) {
        rowsOf(D).forEach(function (r) { if ('cant:' + r.itemId === k) cant[r.weekId] = num(cant[r.weekId], 0) + 1; });
      }
    });
    rowsOf(D).slice().sort(function (a, b) { return str(a.updatedAt) < str(b.updatedAt) ? -1 : 1; }).forEach(function (r) {
      if (r.status === 'done') {
        var it = WI.itemDef(r.itemId, D);
        if (it && num(it.xp, 0) > 0) give('X11', 'ck:' + r.itemId, num(it.xp, 0));
      }
      if (r.status === 'cannot' && len(r.reason) >= 10 && !awarded['cant:' + r.itemId] && !given['cant:' + r.itemId]) {
        if (num(cant[r.weekId], 0) < num(obj(R0.X13).perWeek, 3)) {
          cant[r.weekId] = num(cant[r.weekId], 0) + 1;
          give('X13', 'cant:' + r.itemId, xpOf('X13'));
        }
      }
    });
    // X12 reviews
    arr(D.reviews).forEach(function (rv) {
      if (!rv.weekId) return;
      var on = truthy(rv.onTime) || WI.reviewOnTime(rv.weekId, rv.submittedAt);
      // a one-tap "Nothing to add" review of a missed week earns nothing (lead decision 19 Nov)
      if (str(rv.wentWell).length < 20) return;
      give('X12', 'rv:' + rv.weekId, WI.xpFor({ ruleId: 'X12', onTime: on }));
    });
    // X14 audits
    auditsMine(D).forEach(function (a) { if (a.status === 'done') give('X14', 'au:' + a.id, xpOf('X14')); });
    // X17 reports (3 in total = one per type)
    ['baseline', 'intermediate', 'final'].forEach(function (t) { if (C['report.' + t + '.ready'](D)) give('X17', 'rp:' + t, xpOf('X17')); });
    // X18 Summit
    if (C['summit.abstract'](D)) give('X18', 'sm:abs', 10);
    var reh = Math.min(3, arr(summit(D).rehearsals).length);
    for (var i = 1; i <= reh; i++) give('X18', 'sm:reh:' + i, 10);
    if (C['summit.selfcheck'](D)) give('X18', 'sm:check', 15);
    // X19, X20
    if (C['pivot.card'](D)) give('X19', 'pivot', xpOf('X19'));
    if (C['peer.r1'](D)) give('X20', 'peer:1', xpOf('X20'));
    if (C['peer.r2'](D)) give('X20', 'peer:2', xpOf('X20'));
    return out;
  };
  WI.awards = function (D, a2, a3) {
    var bundle = D, nowIso = (typeof a2 === 'string') ? a2 : null, extra = {};
    if (a2 && typeof a2 === 'object') {
      bundle = (a3 && typeof a3 === 'object') ? a3 : D;
      arr(obj(a2).xpLog).forEach(function (x) { extra[x.eventKey] = true; });
    }
    var have = {};
    arr(obj(bundle).xpLog).forEach(function (x) { have[x.eventKey] = true; });
    return WI.entitlements(bundle, nowIso || WI.now()).filter(function (e) { return !have[e.eventKey] && !extra[e.eventKey]; });
  };
  WI.xpTotal = function (rows) { var t = 0; arr(rows).forEach(function (r) { t += num(r && r.xp, 0); }); return t; };
  WI.xp = function (D, nowIso) { return WI.xpTotal(WI.entitlements(D, nowIso)); };

  WI.rankOf = function (xp) {
    var rs = arr(obj(G('WI_GAME')).ranks), x = num(xp, 0), idx = 0;
    for (var i = 0; i < rs.length; i++) if (x >= rs[i].min) idx = i;
    var r = rs[idx] || { id: 'r1', name: 'Trainee', min: 0 }, nx = rs[idx + 1] || null;
    return {
      id: r.id, name: r.name, min: r.min, index: idx, next: nx ? { id: nx.id, name: nx.name, min: nx.min } : null,
      toNext: nx ? nx.min - x : 0, progress: nx ? (x - r.min) / (nx.min - r.min) : 1
    };
  };

  function reviewValid(D, w) {
    var rv = reviewFor(D, w);
    if (!rv) return false;
    var nx = WI.nextWeekId(w);
    var limit = nx ? parse(WI.reviewOpensAt(nx)) : parse('2027-02-15');
    var at = parse(rv.submittedAt);
    return isNaN(at) ? true : at < limit;
  }
  WI.streak = function (D, nowIso) {
    nowIso = nowIso || WI.now();
    var now = parse(nowIso), cur = weekIndex(WI.weekIdOf(nowIso));
    var start = now >= parse(WI.reviewOpensAt(weekIdAt(cur))) ? cur : cur - 1;
    if (start > 12) start = 12;
    var streak = 0, onTime = 0;
    for (var i = start; i >= 1; i--) {
      var w = weekIdAt(i);
      if (!hasRowsIn(D, w)) break;
      if (reviewValid(D, w)) {
        streak++;
        var rv = reviewFor(D, w);
        if (truthy(rv.onTime) || WI.reviewOnTime(w, rv.submittedAt)) onTime++;
        continue;
      }
      var nx = WI.nextWeekId(w);
      var windowOpen = nx ? now < parse(WI.reviewOpensAt(nx)) : false;
      if (!reviewFor(D, w) && windowOpen) continue;
      if (isLight(w)) continue;
      break;
    }
    var best = 0, run = 0;
    for (var k = 1; k <= Math.min(start, 12); k++) {
      var wk = weekIdAt(k);
      if (!hasRowsIn(D, wk)) { run = 0; continue; }
      if (reviewValid(D, wk)) { run++; if (run > best) best = run; continue; }
      var nk = WI.nextWeekId(wk);
      if (nk && now < parse(WI.reviewOpensAt(nk)) && !reviewFor(D, wk)) continue;
      if (isLight(wk)) continue;
      run = 0;
    }
    if (streak > best) best = streak;
    var stored = num(obj(obj(D).state).bestStreak, 0);
    return { streak: streak, best: Math.max(best, stored), onTimeWeeks: onTime };
  };

  WI.badges = function (D, nowIso) {
    D = obj(D);
    var b = {}, js = journals(D), acts = live(D.actions);
    var labWeeks = {};
    js.forEach(function (j) { labWeeks[weekOfRow(j)] = true; });
    var zbFiles = arr(obj(word(D).zb).fileIds).length > 0 ||
      live(D.files).some(function (f) { return f.attachType === 'zb'; });
    var best = WI.streak(D, nowIso || obj(D.state).updatedAt || WI.now()).best;
    var sum = summit(D);
    var set = function (id, v) { if (v) b[id] = true; };
    set('B01', C['word.first'](D));
    set('B02', C['word.card'](D));
    set('B03', C['word.zb'](D) && zbFiles);
    set('B04', WI.rulesAllTicked(D));
    set('B05', C['plan.actions3'](D));
    set('B06', acts.length >= 1);
    set('B07', js.some(function (j) { return j.kind === 'zero_result' && jWords(j) >= 40; }));
    set('B08', js.some(function (j) { return j.kind === 'failure_analysis' && jWords(j) >= 100; }));
    set('B09', acts.filter(function (a) { return (a.outcome === 'changed' || a.outcome === 'not_done') && len(a.outcomeReason) >= 10; }).length >= 3);
    set('B10', js.filter(function (j) { return jWords(j) >= 40; }).length >= 5);
    set('B11', js.some(function (j) { return jWords(j) >= 200; }));
    set('B12', best >= 3);
    set('B13', best >= 6);
    set('B14', auditsMine(D).filter(function (a) { return a.status === 'done'; }).length >= 2);
    set('B15', live(D.planActions).filter(function (p) { return has(p.theoryTag); }).length >= 5);
    set('B16', C['hyp.checked.W2'](D));
    set('B17', C['summit.selfcheck'](D) && arr(sum.rehearsals).length >= 2);
    set('B18', C['pivot.card'](D));
    set('B19', C['peer.r1'](D) && C['peer.r2'](D));
    set('B20', Object.keys(labWeeks).length >= 10);
    return b;
  };
  WI.newBadges = function (D, nowIso) {
    var now = WI.badges(D, nowIso), had = obj(obj(obj(D).state).badges);
    return Object.keys(now).filter(function (k) { return !had[k]; }).sort();
  };
  WI.boardRows = function (rows) {
    return arr(rows).slice().sort(function (a, b) {
      return num(b.xp, 0) - num(a.xp, 0) || (str(a.label) < str(b.label) ? -1 : 1);
    }).map(function (r) {
      return { label: r.label, xp: num(r.xp, 0), streak: num(r.streak, 0), rank: WI.rankOf(r.xp).name, me: !!r.me };
    });
  };
  // ================================================================== END GAME

  // ------------------------------------------------------------------ waves (SPEC §13.4)
  function pctOf(a, n) { n = num(n, 0); return n > 0 ? 100 * num(a, 0) / n : null; }
  WI.corrected = function (rows) {
    var terms = {}, foils = [];
    arr(rows).forEach(function (r) {
      var k = r.termKey, isFoil = /^foil/.test(k), isCtrl = /^ctrl/.test(k);
      var t = {
        termKey: k, termText: r.termText || '', waveId: r.waveId, n: num(r.n, 0),
        recPct: pctOf(r.recognised, r.n), notSurePct: pctOf(r.notSure, r.n), compPct: pctOf(r.comprehended, r.n),
        foilRate: null, corrected: null, isFoil: isFoil, isControl: isCtrl
      };
      terms[k] = t;
      if (isFoil && t.recPct !== null) foils.push(t.recPct);
    });
    var fr = foils.length ? foils.reduce(function (a, b) { return a + b; }, 0) / foils.length : null;
    Object.keys(terms).forEach(function (k) {
      var t = terms[k];
      t.foilRate = fr;
      t.corrected = (!t.isFoil && fr !== null && t.recPct !== null) ? t.recPct - fr : null;
    });
    return { foilRate: fr, terms: terms };
  };
  WI.correctedByWave = function (rows) {
    var by = {};
    arr(rows).forEach(function (r) { (by[r.waveId] = by[r.waveId] || []).push(r); });
    var out = {};
    Object.keys(by).forEach(function (w) { out[w] = WI.corrected(by[w]); });
    return out;
  };
  WI.pct = function (x) { return (x === null || x === undefined || isNaN(x)) ? null : Math.round(x); };
  WI.waveCheck = function (r) {
    r = obj(r);
    var n = num(r.n, NaN), rec = num(r.recognised, NaN), ns = num(r.notSure, NaN), cp = num(r.comprehended, NaN);
    function bad(field, message) { return { ok: false, field: field, message: message }; }
    function int(x) { return !isNaN(x) && Math.floor(x) === x; }
    if (!int(n) || n < 1 || n > 999) return bad('n', 'The number of people must be between 1 and 999.');
    if (!int(rec) || rec < 0 || rec > n) return bad('recognised', 'Recognised must be between 0 and n.');
    if (!int(ns) || ns < 0 || ns > n) return bad('notSure', 'Not sure must be between 0 and n.');
    if (rec + ns > n) return bad('notSure', 'Recognised and not sure together cannot be more than n.');
    if (!int(cp) || cp < 0 || cp > n) return bad('comprehended', 'Comprehended must be between 0 and n.');
    if (/^foil/.test(str(r.termKey)) && cp !== 0) return bad('comprehended', 'Foil words have no meaning, so comprehended must be 0.');
    return { ok: true };
  };
  WI.myWaves = function (D, studentId) {
    var me = studentId || sid(D);
    return arr(obj(D).waves).filter(function (r) {
      return truthy(r.published) && (r.termKey === me || /^(ctrl|foil)\d$/.test(str(r.termKey)));
    });
  };

  // ------------------------------------------------------------------ self-check
  WI.validateData = function () {
    var msg = [];
    ['WI_PLAN', 'WI_CHECKLIST', 'WI_COVERAGE', 'WI_CHOICES', 'WI_GAME', 'WI_RULES'].forEach(function (g) {
      if (!G(g)) msg.push(g + ' is not loaded');
    });
    WI.fixedItems().forEach(function (it) {
      if (it.check && !C[it.check]) msg.push(it.id + ': unknown check ' + it.check);
      if (!WI.knownRoute(it.route)) msg.push(it.id + ': unknown route ' + it.route);
    });
    return msg;
  };
})();
