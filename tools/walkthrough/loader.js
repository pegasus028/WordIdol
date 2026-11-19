/* WordIdol walkthrough loader (W6). Paste into the WordIdol student page AFTER the teacher has
   signed a guest in. It fetches the bot from this site (same origin), checks its SHA-256, picks the
   persona for the signed-in guest (g1 → B1, g2 → B2, g3 → C1) and starts the run. It never signs in.
   Optional, set before pasting:
     window.WIBOT_OPTS = { fresh: true }   forget an earlier partial run of this guest
     window.WIBOT_OPTS = { wait: true }    nobody signed in yet: wait (up to 15 min) for a guest sign-in, then start
   Read the result:  JSON.stringify(WIBOT.summary())   (after a reload: localStorage['wibot.run.g1'] …)      */
(async function () {
  var SHA = '84a10019818ae8a4e2ff1c5fb1f24397005bea56ff46ad748086effd8fe44f0c';
  var MAP = { g1: 'B1', g2: 'B2', g3: 'C1' };
  var OPTS = window.WIBOT_OPTS || {};
  var base = new URL('tools/walkthrough/', location.href.split('#')[0]);
  function who() { try { var s = JSON.parse(localStorage.getItem('wi.session') || 'null'); return s && s.student; } catch (e) { return null; } }
  async function start(st) {
    if (!/^Guest#\d$/.test(st.label || '') || !MAP[st.id]) return 'WIBOT: signed in as ' + st.label + ', not a walkthrough guest. Nothing started.';
    if (window.WIBOT && window.WIBOT.running) return 'WIBOT: already running for ' + st.label + '.';
    var res = await fetch(new URL('bundle.min.js?t=' + Date.now(), base), { cache: 'no-store' });
    if (!res.ok) return 'WIBOT: could not fetch the bundle (' + res.status + ').';
    var src = await res.text();
    var dig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(src));
    var hex = Array.prototype.map.call(new Uint8Array(dig), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    if (hex !== SHA) return 'WIBOT: bundle hash mismatch (got ' + hex + '). Nothing started.';
    (0, eval)(src);
    var pr = await fetch(new URL('personas/' + MAP[st.id] + '.json?t=' + Date.now(), base), { cache: 'no-store' });
    if (!pr.ok) return 'WIBOT: could not fetch persona ' + MAP[st.id] + ' (' + pr.status + ').';
    var persona = await pr.json();
    window.WIBOT.init(persona, OPTS);
    window.__WIBOT_DONE = window.WIBOT.run();
    return 'WIBOT started: ' + persona.label + ' (' + persona.level + '), word "' + persona.first.word + '", bundle ' + hex.slice(0, 12);
  }
  function ready() { var st = who(); return st && window.WIApp && window.WIApp.data && window.WIApp.data() && !/^#\/login/.test(location.hash) ? st : null; }
  var now = ready();
  if (now) return start(now);
  if (!OPTS.wait) return 'WIBOT: nobody is signed in. Sign the guest in first (or set window.WIBOT_OPTS = {wait: true}).';
  if (window.__WIBOT_WATCH) clearInterval(window.__WIBOT_WATCH);
  var t0 = Date.now();
  window.__WIBOT_WATCH = setInterval(function () {
    var st = ready();
    if (Date.now() - t0 > 15 * 60 * 1000) { clearInterval(window.__WIBOT_WATCH); console.log('WIBOT: stopped waiting after 15 minutes.'); return; }
    if (!st) return;
    clearInterval(window.__WIBOT_WATCH);
    setTimeout(function () { start(st).then(function (m) { window.__WIBOT_START = m; console.log(m); }); }, 1500);
  }, 1000);
  return 'WIBOT: waiting for a guest to sign in (re-paste after any page reload).';
})();
