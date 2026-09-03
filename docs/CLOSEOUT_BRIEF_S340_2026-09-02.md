```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S340 · 2026-09-02 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    The E2E suite had been dead for 17 hours because the local preview was never taught the    ║
║    edge's other half.                                                                         ║
║                                                                                               ║
║  PROJECT IMPACT     ████████░░   83/100                                                       ║
║  ECOSYSTEM IMPACT   ███████░░░   72/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#1]  preview-applies-redirects                                 PROJ 10  ·  ECOS 8
         ── observability ───────────────────────────────────────────────────────────────────
         The preview parsed _headers on purpose and never parsed _redirects, so it answered
         every retired route 404 where the edge answers 301. That cost S338 twenty-seven
         hours of Lighthouse verdicts and S340 seventeen hours of the whole E2E suite. Fixing
         consumers one at a time treats a symptom that regenerates on the next route merge;
         making the stand-in faithful resolves every consumer at once and covers every future
         merge.
         → scripts/local-preview-server.mjs; D-S340.1

  [#3]  gate-follows-invocation-edge                              PROJ 9  ·  ECOS 8
         ── observability ───────────────────────────────────────────────────────────────────
         The gate built in S338 for exactly this class stayed green through all seventeen
         hours, because its subject was workflow YAML while the routes lived one hop in,
         inside a script the YAML runs by name. It now follows the edge, and two refinements
         fell out of making it real: a 3xx target asserts a contract rather than auditing a
         page, and a skipped entry asserts nothing.
         → scripts/check-workflow-audit-targets.mjs 29/29; reproduced in both directions; D-S340.3

  [#4]  postbuild-ordering-instrument                             PROJ 8  ·  ECOS 8
         ── process ─────────────────────────────────────────────────────────────────────────
         Two sessions answered this by reading source and were wrong in both directions,
         because page writes go through helpers. A preload observes the real fs calls of all
         22 steps. A step that writes back the page it read is transforming rather than
         observing it, and a write reproducing existing bytes strands nothing -- both
         distinctions were needed before the output meant anything. Measured answer: S338's
         fix holds.
         → scripts/check-postbuild-ordering.mjs 11/11; scripts/lib/postbuild-fs-trace.cjs; D-S340.4

  [#2]  smoke-asserts-derived-301-contract                        PROJ 9  ·  ECOS 7
         ── correctness ─────────────────────────────────────────────────────────────────────
         Two routes were asserted as 200 carrying the body of stub pages S335 deleted -- an
         assertion that outlived what it asserted. Checks now come from
         config/route-consolidation.json and verify status plus Location, so a merge is
         covered the moment it is recorded. Coverage went from 12 hand-written checks to 26
         with zero failures.
         → scripts/smoke-http.mjs; 26 passed, 0 failed; D-S340.2

  [#5]  evidence-link-tug-of-war                                  PROJ 7  ·  ECOS 6
         ── correctness ─────────────────────────────────────────────────────────────────────
         propagate-nav strips the /evidence/ link from 125 pages and generate-evidence-hub
         puts it back, every build. Net-zero in git, so no surface-vs-surface gate could ever
         see it. The root cause is that /evidence/ was never registered in the canonical nav
         config, so a downstream script bolts it back on -- a repair built around a remover
         nobody went looking for. Diagnosed and boarded, not fixed: the config feeds five
         consumers.
         → journal/index.html 2 -> 0 -> 2; D-S340.5

  [#6]  unmasked-tests-asserting-fossils                          PROJ 7  ·  ECOS 6
         ── correctness ─────────────────────────────────────────────────────────────────────
         A pre-gate failure is a blast radius, not a data point. One spec wanted four
         marketing strings that survive nowhere in the tree and had been red since S335;
         another wanted a password form on a page that delegates sign-in to Obelisk. Both now
         assert what exists -- and the Obelisk gate asserts zero password inputs, so a
         CANON-045 regression fails the suite.
         → tests/s103-surfaces.spec.js; tests/pages.spec.js; D-S340.6

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • [S340][VERIFY/P1] Confirm the E2E Test Suite is green on a real GitHub run -- the fix is proven locally only.
    • [S340][BUILD/P1] Register /evidence/ in config/intelligence-suite.json and verify the writer pair disappears from the instrument.
    • [S340][UX/P2] Make the covers art-only and let the tile own all text -- direction decided in D-S340.7, execution remains.
    • [S340][OBS/P3] Decide how check-postbuild-ordering --check gets real evidence in CI instead of always reporting unmeasured.

  BLOCKERS
    (none)

  ACTION GATE
    6 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
