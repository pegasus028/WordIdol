/* WordIdol sentence frames (W3). Global: FRAMES.
   Shape: {id:'fr-<group>-nn', group, text, level, src}. level = B1 (start here), B2 (stretch), C1 (challenge).
   Groups: hypothesis, describe_data, compare, hedge, reflect, failure, plan_change, qa_answer, limitation, ethics.
   src "RDG-09§n" = taken from RDG-09 Part 2, group n (wording kept; only apostrophes are curly).
   src "W3" = written for WordIdol; "SPEC§n" = sample wording from SPEC.md. ___ marks a gap to fill. */
(function () {
  var root = (typeof window !== "undefined") ? window : globalThis;

  root.FRAMES = [
    /* hypothesis */
    { id: "fr-hypothesis-01", group: "hypothesis", level: "B1", text: "I predict that ___ because ___.", src: "W3; L6" },
    { id: "fr-hypothesis-02", group: "hypothesis", level: "B1", text: "If I ___, then ___ will ___.", src: "W3; L6" },
    { id: "fr-hypothesis-03", group: "hypothesis", level: "B1", text: "By Wave ___, at least ___% of respondents will recognise ___.", src: "W3; L6" },
    { id: "fr-hypothesis-04", group: "hypothesis", level: "B2", text: "To what extent will ___ be recognised by ___ by Wave ___?", src: "SPEC§2.3; L6" },
    { id: "fr-hypothesis-05", group: "hypothesis", level: "B2", text: "Corrected recognition of ___ will be higher / lower than ___ by Wave ___.", src: "W3; L6" },
    { id: "fr-hypothesis-06", group: "hypothesis", level: "B2", text: "I expect my evidence to reach Level ___ by ___, because ___.", src: "W3; L6" },
    { id: "fr-hypothesis-07", group: "hypothesis", level: "B2", text: "More respondents will recognise ___ than understand it, because ___.", src: "W3; L6" },
    { id: "fr-hypothesis-08", group: "hypothesis", level: "C1", text: "It is hypothesised that ___ will ___, since ___.", src: "W3; L6" },

    /* describe_data */
    { id: "fr-describe_data-01", group: "describe_data", level: "B1", text: "Recognition rose / fell from ___% to ___%.", src: "RDG-09§5" },
    { id: "fr-describe_data-02", group: "describe_data", level: "B1", text: "Corrected recognition was ___% (___% minus ___% for the foils).", src: "RDG-09§5" },
    { id: "fr-describe_data-03", group: "describe_data", level: "B1", text: "The data shows that ___.", src: "RDG-09§2" },
    { id: "fr-describe_data-04", group: "describe_data", level: "B1", text: "This is Level ___ evidence because ___.", src: "RDG-09§2" },
    { id: "fr-describe_data-05", group: "describe_data", level: "B2", text: "For example, in Wave 2, ___% of respondents ___.", src: "RDG-09§2" },
    { id: "fr-describe_data-06", group: "describe_data", level: "B2", text: "Recognition rose sharply between Wave 1 and Wave 2, then levelled off.", src: "RDG-09§5" },
    { id: "fr-describe_data-07", group: "describe_data", level: "B2", text: "There was a slight / steady / dramatic increase in ___.", src: "RDG-09§5" },
    { id: "fr-describe_data-08", group: "describe_data", level: "B2", text: "___ peaked at ___% in Wave ___ before declining to ___%.", src: "RDG-09§5" },
    { id: "fr-describe_data-09", group: "describe_data", level: "B2", text: "My strongest evidence is Level ___, because ___; what I do not have yet is ___.", src: "SPEC§11.2" },
    { id: "fr-describe_data-10", group: "describe_data", level: "C1", text: "While recognition increased, comprehension remained relatively stable at around ___%.", src: "RDG-09§5" },

    /* compare */
    { id: "fr-compare-01", group: "compare", level: "B1", text: "___ is higher / lower than the control word ___.", src: "RDG-09§5" },
    { id: "fr-compare-02", group: "compare", level: "B1", text: "In phase 1, ___. In phase 2, ___.", src: "W3" },
    { id: "fr-compare-03", group: "compare", level: "B1", text: "The biggest difference between Wave ___ and Wave ___ was ___.", src: "W3" },
    { id: "fr-compare-04", group: "compare", level: "B2", text: "Both ___ and ___ showed ___, but only ___ showed ___.", src: "W3" },
    { id: "fr-compare-05", group: "compare", level: "B2", text: "Unlike the foil words, my term ___.", src: "W3" },
    { id: "fr-compare-06", group: "compare", level: "C1", text: "Compared with the control words, my term performed ___.", src: "RDG-09§5" },
    { id: "fr-compare-07", group: "compare", level: "C1", text: "Whereas ___ suggests ___, ___ shows ___.", src: "RDG-09§2" },
    { id: "fr-compare-08", group: "compare", level: "C1", text: "Both ___ (year) and ___ (year) argue that ___.", src: "RDG-09§2" },

    /* hedge */
    { id: "fr-hedge-01", group: "hedge", level: "B1", text: "Maybe / Perhaps ___ because ___.", src: "RDG-09§3" },
    { id: "fr-hedge-02", group: "hedge", level: "B1", text: "It seems that ___.", src: "RDG-09§3" },
    { id: "fr-hedge-03", group: "hedge", level: "B1", text: "This might / may / could mean that ___.", src: "RDG-09§3" },
    { id: "fr-hedge-04", group: "hedge", level: "B2", text: "These results suggest that ___, although ___.", src: "RDG-09§3" },
    { id: "fr-hedge-05", group: "hedge", level: "B2", text: "It is possible that ___, but more data is needed.", src: "RDG-09§3" },
    { id: "fr-hedge-06", group: "hedge", level: "B2", text: "One possible explanation is that ___.", src: "RDG-09§3" },
    { id: "fr-hedge-07", group: "hedge", level: "B2", text: "The data suggest that ___, but the sample is small.", src: "SPEC§10.2" },
    { id: "fr-hedge-08", group: "hedge", level: "C1", text: "This does not necessarily mean that ___; it could also be that ___.", src: "RDG-09§3" },

    /* reflect */
    { id: "fr-reflect-01", group: "reflect", level: "B1", text: "This week I ___. I noticed that ___.", src: "W3; KIT-01" },
    { id: "fr-reflect-02", group: "reflect", level: "B1", text: "I was surprised that ___ because ___.", src: "W3; KIT-01" },
    { id: "fr-reflect-03", group: "reflect", level: "B1", text: "What went well was ___. What I would change is ___.", src: "W3; SPEC§5.5" },
    { id: "fr-reflect-04", group: "reflect", level: "B1", text: "At first I thought ___, but now I think ___.", src: "W3" },
    { id: "fr-reflect-05", group: "reflect", level: "B1", text: "My next step is to ___, and I expect ___.", src: "W3; KIT-01" },
    { id: "fr-reflect-06", group: "reflect", level: "B2", text: "This links to ___ (theory) because ___.", src: "W3; KIT-01" },
    { id: "fr-reflect-07", group: "reflect", level: "B2", text: "Looking back, the most important thing I learned was ___.", src: "W3" },
    { id: "fr-reflect-08", group: "reflect", level: "C1", text: "What surprised me most was ___, which suggests ___.", src: "RDG-09§8" },

    /* failure */
    { id: "fr-failure-01", group: "failure", level: "B1", text: "I planned to ___, but ___.", src: "W3" },
    { id: "fr-failure-02", group: "failure", level: "B1", text: "It did not work because ___.", src: "W3" },
    { id: "fr-failure-03", group: "failure", level: "B1", text: "Nobody used the word this week. One possible reason is ___.", src: "W3; RDG-09§3" },
    { id: "fr-failure-04", group: "failure", level: "B1", text: "What I expected was ___. What happened was ___.", src: "W3" },
    { id: "fr-failure-05", group: "failure", level: "B1", text: "Next time I will change ___ and keep ___.", src: "W3" },
    { id: "fr-failure-06", group: "failure", level: "B2", text: "This fits one of the things that sink a word: ___.", src: "W3; RN§7.4" },
    { id: "fr-failure-07", group: "failure", level: "B2", text: "Although the action failed, it showed that ___.", src: "W3" },
    { id: "fr-failure-08", group: "failure", level: "C1", text: "The failure may be explained by ___ rather than by ___.", src: "W3" },

    /* plan_change */
    { id: "fr-plan_change-01", group: "plan_change", level: "B1", text: "I will keep ___ because ___.", src: "W3; L15" },
    { id: "fr-plan_change-02", group: "plan_change", level: "B1", text: "I will stop ___ because ___.", src: "W3; L15" },
    { id: "fr-plan_change-03", group: "plan_change", level: "B1", text: "I will start ___ because ___.", src: "W3; L15" },
    { id: "fr-plan_change-04", group: "plan_change", level: "B1", text: "In phase 2, the one thing I will change is ___.", src: "W3; L15" },
    { id: "fr-plan_change-05", group: "plan_change", level: "B2", text: "Instead of ___, I will ___, because my data shows ___.", src: "W3" },
    { id: "fr-plan_change-06", group: "plan_change", level: "B2", text: "If this change works, I expect to see ___.", src: "W3; L15" },
    { id: "fr-plan_change-07", group: "plan_change", level: "B2", text: "To sum up, ___. In Phase 2, I plan to ___.", src: "RDG-09§8" },
    { id: "fr-plan_change-08", group: "plan_change", level: "C1", text: "Given that ___, the most useful adjustment would be ___.", src: "W3" },

    /* qa_answer */
    { id: "fr-qa_answer-01", group: "qa_answer", level: "B1", text: "Thank you for your question. ___", src: "RDG-09§7" },
    { id: "fr-qa_answer-02", group: "qa_answer", level: "B1", text: "That’s a good question. I think ___.", src: "RDG-09§7" },
    { id: "fr-qa_answer-03", group: "qa_answer", level: "B1", text: "I see your point, but ___.", src: "RDG-09§4" },
    { id: "fr-qa_answer-04", group: "qa_answer", level: "B2", text: "Let me check I understand: are you asking about ___?", src: "RDG-09§7" },
    { id: "fr-qa_answer-05", group: "qa_answer", level: "B2", text: "I don’t have data on that, but my guess is ___.", src: "RDG-09§7" },
    { id: "fr-qa_answer-06", group: "qa_answer", level: "B2", text: "That’s a fair point; it’s one of the limitations of my study.", src: "RDG-09§7" },
    { id: "fr-qa_answer-07", group: "qa_answer", level: "B2", text: "That is a fair question. My evidence shows ___; it does not show ___.", src: "SPEC§10.2" },
    { id: "fr-qa_answer-08", group: "qa_answer", level: "B2", text: "That’s a good point. However, ___.", src: "RDG-09§4" },
    { id: "fr-qa_answer-09", group: "qa_answer", level: "C1", text: "I’d like to look into that in Phase 2.", src: "RDG-09§7" },

    /* limitation */
    { id: "fr-limitation-01", group: "limitation", level: "B1", text: "One limitation of my study is ___.", src: "W3; L22" },
    { id: "fr-limitation-02", group: "limitation", level: "B1", text: "My study was small: ___ respondents in ___ classes.", src: "W3; L22" },
    { id: "fr-limitation-03", group: "limitation", level: "B1", text: "I only have evidence up to Level ___, so I cannot say that ___.", src: "W3; L6" },
    { id: "fr-limitation-04", group: "limitation", level: "B2", text: "Most of my evidence is owned, so I cannot claim that ___.", src: "W3; L6" },
    { id: "fr-limitation-05", group: "limitation", level: "B2", text: "These results may not apply beyond ___.", src: "W3; RDG-09§6" },
    { id: "fr-limitation-06", group: "limitation", level: "B2", text: "A longer study would be needed to show whether ___.", src: "W3; L22" },
    { id: "fr-limitation-07", group: "limitation", level: "C1", text: "With only ___ respondents, we cannot be sure that ___.", src: "RDG-09§3" },
    { id: "fr-limitation-08", group: "limitation", level: "C1", text: "The findings should be read with caution because ___.", src: "W3; L22" },

    /* ethics (plan wording first, then report wording) */
    { id: "fr-ethics-01", group: "ethics", level: "B1", text: "I will follow the six rules of the project. For example, ___.", src: "W3; VID-SAFE" },
    { id: "fr-ethics-02", group: "ethics", level: "B1", text: "I will not record names. I will write “a classmate” or “a cousin”.", src: "W3; VID-EVID" },
    { id: "fr-ethics-03", group: "ethics", level: "B1", text: "I will start in person, with people I know, because ___.", src: "W3; VID-PLAN" },
    { id: "fr-ethics-04", group: "ethics", level: "B1", text: "I did not record anyone’s name. I wrote “a classmate” or “a cousin”.", src: "W3; SPEC§12" },
    { id: "fr-ethics-05", group: "ethics", level: "B1", text: "The survey was anonymous and was run by my teacher.", src: "W3; SPEC§12" },
    { id: "fr-ethics-06", group: "ethics", level: "B1", text: "I followed the six rules of the project.", src: "W3; SPEC§12" },
    { id: "fr-ethics-07", group: "ethics", level: "B1", text: "Nobody was given money, gifts or favours to use the word.", src: "W3; SPEC§12" },
    { id: "fr-ethics-08", group: "ethics", level: "B1", text: "I cropped names, faces and usernames out of every screenshot.", src: "W3; SPEC§14.2" },
    { id: "fr-ethics-09", group: "ethics", level: "B1", text: "I had no problems to report. / I reported one problem: ___.", src: "W3; SPEC§12" },
    { id: "fr-ethics-10", group: "ethics", level: "B1", text: "I did not use AI tools for any part of this work. / I used AI tools for ___, and I checked ___.", src: "W3; SPEC§12" },
    { id: "fr-ethics-11", group: "ethics", level: "B2", text: "The parts of my word come from ___, and I give credit to ___.", src: "W3; L12" }
  ];
})();
