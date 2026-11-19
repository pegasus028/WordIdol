// The six rules, verbatim (SPEC §14.1; validator V7 compares byte for byte). Owner: W4.
// No UI string may paraphrase a rule. Rule 1 is never worded with "must".
(function () {
  var root = (typeof window !== 'undefined') ? window : globalThis;

  root.WI_RULES = {
    rules: [
      'Advised to create a new social media account for promotions.',
      'Not to DM strangers.',
      'Block immediately anyone posting negative comments and remove their posts.',
      'Stop activity and report to T.Chris/homeroom teacher any negative experience related to this activity.',
      'Not to enter into any form of payment for promotion.',
      'Not to request or accept favours related to promoting the slang word.'
    ],
    // Shown under rules 5 and 6.
    paidNote: 'Paid or traded use is not real use. It gives you false data.',
    // SPEC §14.2 P5: the tick before any screenshot upload.
    screenshotTick: "I have cropped out other people's names, faces and usernames.",
    // Word card 1 (SPEC §2.3).
    notRudeLabel: 'My word is not negative or rude, and is not related to religion, monarchy, politics, gender or race.',
    // SPEC §1.1, shown on Home and in both Packs.
    analysisOverAdoption: 'Marks are awarded for the quality of analysis and reflection, not for how widely a term spreads. A term that does not catch on, analysed well, can earn full marks.',
    // S-PROBLEM (SPEC §2.3).
    problemIntro: 'Stop the activity now. Tell T.Chris or your homeroom teacher today, in person or by Line. This form only puts a flag on T.Chris’s screen; it does not send a message.',
    // S-BOARD caption (SPEC §2.3).
    boardCaption: 'XP comes from documenting your project honestly. It never comes from how far your word spreads.',
    lockedOnlineText: 'Opens after the L9 safety briefing and the six rules',
    namesReminder: "Use 'a classmate' or 'a cousin'. Never write a full name or username."
  };
})();
