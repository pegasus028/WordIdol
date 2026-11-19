// WordIdol coverage map (SPEC §6): every deliverable requirement and the catalogue items that produce its evidence.
// Owner: W4. `H-W02..W12-3` means the habit instances H-W02-3 … H-W12-3, without the light weeks W06–W07
// (their habit items are optional, SPEC §5.7). Checked by tools/validate.js (V5).
(function () {
  var root = (typeof window !== 'undefined') ? window : globalThis;

  // [id, deliverable, text, due, items]
  var R = [
    ['A1-NOTRUDE', 'Assignment 1', 'Not negative or rude; not related to religion, monarchy, politics, gender, race', '2026-11-22', 'F-W01-03'],
    ['A1-ORIGINAL', 'Assignment 1', 'Original: a new word or usage', '2026-11-22', 'F-W01-01 F-W01-04'],
    ['A1-PURPOSE', 'Assignment 1', 'A clear purpose or meaning', '2026-11-22', 'F-W01-03'],
    ['A1-USAGE', 'Assignment 1', 'Rules for usage documented (part of speech, grammar rules)', '2026-11-22', 'F-W01-02'],
    ['A1-EXAMPLES', 'Assignment 1', 'Example sentences documented', '2026-11-22', 'F-W01-01 F-W01-03'],
    ['A1-RESEARCH', 'Assignment 1', 'Research how widely it is known / understood / used', '2027-02-12', 'F-W02-03 H-W02..W12-3'],
    ['A1-REFLECT', 'Assignment 1', 'Document and reflect on the whole experience', '2027-02-12', 'H-W01..W12-2 F-W13-04'],
    ['BAS-PROFILE', 'Baseline report', 'Term profile: formation process, meaning, target community', '2026-11-25', 'F-W01-01 F-W01-02 F-W01-03 F-W01-04 F-W01-05 F-W02-04'],
    ['BAS-FUDGE', 'Baseline report', 'FUDGE predictions and hypotheses', '2026-11-25', 'F-W02-01 F-W02-02 F-W02-04'],
    ['BAS-W1', 'Baseline report', 'Wave 1 baseline data', '2026-11-25', 'F-W02-03 F-W02-04'],
    ['BAS-PLAN', 'Baseline report', 'Campaign and safety plan', '2026-11-25', 'F-W01-05 F-W01-06 F-W01-07 F-W02-04'],
    ['BAS-LEN', 'Baseline report', '600–900 words, on the template (KIT-03)', '2026-11-25', 'F-W02-04'],
    ['INT-W2', 'Intermediate report', 'Wave 2 data', '2026-12-14', 'F-W04-01 F-W05-01'],
    ['INT-LOG', 'Intermediate report', 'Campaign log', '2026-12-14', 'F-W01-08 H-W01..W04-1 F-W03-02 F-W05-01'],
    ['INT-ANALYSIS', 'Intermediate report', 'Early analysis against hypotheses', '2026-12-14', 'F-W02-02 F-W03-04 F-W04-02 F-W05-01'],
    ['INT-ADJUST', 'Intermediate report', 'Planned adjustments', '2026-12-14', 'F-W04-03 F-W05-01'],
    ['SUM-C1', 'Summit (ASM-04)', 'Content and theory (6)', '2026-12-15', 'F-W01-03 F-W01-05 F-W01-07 F-W02-01 F-W02-05 F-W02-06 F-W03-01 F-W03-03 F-W04-04 F-W05-06'],
    ['SUM-C2', 'Summit (ASM-04)', 'Evidence and analysis (6)', '2026-12-15', 'F-W02-03 H-W02..W04-3 F-W03-02 F-W04-01 F-W04-02 F-W04-04 F-W04-06 F-W05-06'],
    ['SUM-C3', 'Summit (ASM-04)', 'Delivery and visuals (4)', '2026-12-15', 'F-W04-06 F-W05-03 F-W05-04 F-W05-06'],
    ['SUM-C4', 'Summit (ASM-04)', 'Q&A (4)', '2026-12-15', 'F-W05-05 F-W05-06'],
    ['SUM-AOA', 'Summit (ASM-04)', 'Analysis over adoption: the talk analyses what happened, including what did not work', '2026-12-15', 'F-W04-05 F-W05-06'],
    ['SUM-LEARN', 'Summit', 'Learnings', '2026-12-15', 'F-W03-04 F-W04-04'],
    ['SUM-PH2', 'Summit', 'Phase 2 plan (midway review and replan)', '2026-12-15', 'F-W04-03 F-W04-04'],
    ['SUM-ABS', 'Summit', '50-word abstract (SUM-03) and slides, Tue 15 Dec', '2026-12-15', 'F-W05-02 F-W05-03'],
    ['LAB-PRE', 'Lab Book 1.1', 'Weekly entries to 18 Dec: campaign log, sightings, reflections', '2026-12-18', 'F-W01-08 H-W01..W04-1 H-W01..W04-2 H-W02..W04-3 H-W01..W04-4 F-W05-08'],
    ['LAB-POST', 'Lab Book 3.1', 'Weekly entries to 12 Feb', '2027-02-12', 'H-W08..W09-1 H-W08..W12-2 H-W08..W12-3 H-W08..W12-4 F-W09-01 F-W13-04'],
    ['FIN-W3', 'Final report', 'Wave 3 data', '2027-01-22', 'F-W09-04 F-W10-03'],
    ['FIN-COMPARE', 'Final report', 'Phase 1 vs Phase 2 comparison', '2027-01-22', 'F-W05-07 F-W08-01 F-W08-02 F-W10-01 F-W10-03'],
    ['FIN-CLOSE', 'Final report', 'Campaign close-out', '2027-01-22', 'H-W08..W09-1 F-W09-01 F-W10-03'],
    ['PEER-R1', 'Peer review', 'Written reviewer report 1', '2027-02-03', 'F-W12-01'],
    ['PEER-R2', 'Peer review', 'Written reviewer report 2', '2027-02-03', 'F-W12-02'],
    ['PEER-DISC', 'Peer review', 'Contribution to the mock editorial-board discussion', '2027-02-04', 'F-W11-03 F-W12-03'],
    ['ART-INTRO', 'Article', 'Introduction (with literature)', '2027-02-12', 'F-W01-03 F-W02-01 F-W02-02 F-W03-03 F-W08-03 F-W09-02 F-W11-01'],
    ['ART-METH', 'Article', 'Methods', '2027-02-12', 'F-W01-04 F-W01-05 F-W01-07 F-W05-07 F-W08-01 F-W08-02 F-W08-03 F-W10-04'],
    ['ART-RES', 'Article', 'Results', '2027-02-12', 'F-W02-03 F-W03-02 F-W04-01 H-W02..W12-3 F-W08-03 F-W09-04 F-W10-01 F-W10-02 F-W10-04 F-W12-05'],
    ['ART-DISC', 'Article', 'Discussion (claims, hedging, limitations)', '2027-02-12', 'F-W03-01 F-W03-04 F-W04-07 F-W05-07 F-W08-01 F-W08-03 F-W11-01 F-W12-04 F-W13-04'],
    ['ART-ABS', 'Article', 'Abstract, 150–200 words', '2027-02-12', 'F-W13-01 F-W13-02'],
    ['ART-WORDS', 'Article', '2,000–3,000 words', '2027-02-12', 'F-W11-03 F-W12-04 F-W13-03 F-W13-05'],
    ['ART-SRC', 'Article', 'At least 6 sources', '2027-02-12', 'F-W09-02 F-W13-03'],
    ['ART-VIS', 'Article', 'At least 3 data visuals', '2027-02-12', 'F-W10-02 F-W13-03'],
    ['ART-ETH', 'Article', 'Ethics statement (and AI use declared)', '2027-02-12', 'F-W01-06 F-W04-07 F-W09-03 F-W11-02 F-W13-03']
  ];

  function expand(token) {
    var m = /^H-W(\d\d)\.\.W(\d\d)-(\d)$/.exec(token);
    if (!m) return [token];
    var out = [];
    for (var w = parseInt(m[1], 10); w <= parseInt(m[2], 10); w++) {
      if (w === 6 || w === 7) continue; // light weeks: habit items are optional and never count (SPEC §5.7, §6)
      out.push('H-W' + (w < 10 ? '0' : '') + w + '-' + m[3]);
    }
    return out;
  }

  var requirements = R.map(function (r) {
    var raw = r[4].split(' ');
    var items = [];
    raw.forEach(function (t) { expand(t).forEach(function (x) { items.push(x); }); });
    return { id: r[0], deliverable: r[1], text: r[2], due: r[3], itemsRaw: raw, items: items };
  });

  root.WI_COVERAGE = { requirements: requirements, expand: expand };
})();
