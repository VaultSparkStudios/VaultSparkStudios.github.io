```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S345 · 2026-09-07 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    The tool that repairs the tree after a rebase was reporting clean over a subset it         ║
║    could not see — for two sessions and two hand-fixes.                                       ║
║                                                                                               ║
║  PROJECT IMPACT     ██████░░░░   60/100                                                       ║
║  ECOSYSTEM IMPACT   ██████░░░░   63/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#1]  resync-derived-declares-its-own-scope                     PROJ 9  ·  ECOS 7
         ── organization ────────────────────────────────────────────────────────────────────
         The evidence graph models 29 of 67 byte-checked generators, so 'N artifacts rebuilt
         + staged' read as completeness while CI failed ten minutes later on an artifact
         outside it — build-intelligence-budget (S340, run 33702593208 step 185) and
         build-nervous-system (S341), both hand-fixed, both still unmodeled. Widening the
         graph was refused on the ratchet's own reasoning: guessing a node's sources makes
         the repairer rebuild in a wrong topological order, and a confidently wrong graph is
         the exact failure this tool family exists to prevent. So the fix runs the unmodeled
         generators' own --check — a measurement, not a prediction, needing none of the
         information the ratchet withholds. Default fails named; --sweep-repair is opt-in and
         guarded by the same world-acting-builder test.
         → scripts/resync-derived.mjs (16/16 self-test incl. structural no-bare-exit assertion) · negative control reproduced the S340 incident: old path exit 0 '5 artifact(s) rebuilt + staged', new path exit 1 naming the drifter, --sweep-repair exit 0 after rebuild · ratchet lowered 39 → 38

  [#2]  cron-staleness-declares-live-corroboration                PROJ 6  ·  ECOS 7
         ── observability ───────────────────────────────────────────────────────────────────
         check-scheduled-workflow-staleness carries a 'silent' verdict — a cron not failing
         because it is not running — proven by fixtures alone. Live: broken 1, silent 0,
         unmeasured 0. 'silent: 0' read identically whether the detector worked or was
         quietly broken, and manufacturing an instance by disabling a live workflow would be
         fabricating evidence to pass a test. The run now computes liveCorroboration per
         verdict class and prints fixtureOnlyVerdicts on the pass path, the fail path and in
         --json, so an untested-in-production path is declared rather than assumed good.
         → scripts/check-scheduled-workflow-staleness.mjs (18/18) · live run prints 'fixture-proven only this run (no live instance): silent, unmeasured' · CANON-031

  [#4]  desk-blocker-sentence-expired                             PROJ 5  ·  ECOS 6
         ── truth ───────────────────────────────────────────────────────────────────────────
         The [DESK/P1] escalation read 'nothing has published since 2026-09-04' and 'degraded
         to periodic'. Freshness now reports daily, latest 2026-09-07, age 0d, with 2
         editions published. The text was corrected in place and the escalation kept OPEN: 2
         editions against a 4-slot/day promise is a partial recovery, and the queue-width
         cause is unmeasured locally because the radar cache is CI-only.
         → node scripts/build-news-freshness.mjs --check --require-daily · data/news-desk/days/2026-09-07.json

  [#3]  coverage-checker-import-safety                            PROJ 4  ·  ECOS 5
         ── devHealth ───────────────────────────────────────────────────────────────────────
         'else run()' at module scope meant importing checkedGenerators()/coverage() would
         execute the gate and hit its process.exit. Nothing had ever imported it, so nothing
         had noticed — the defect was found by needing the import, not by a gate. Fixed with
         the repo's established isDirect idiom.
         → scripts/check-evidence-graph-coverage.mjs (7/7) · direct run and --self-test unchanged, import now silent

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • [S345][BUILD/P3] Model the 38 unmodeled generators a few at a time, at the moment someone knows their inputs, lowering the ratchet each time. The sweep makes the gap safe, not closed — there is still no topological ordering across those nodes.
    • [VERIFY] Confirm the sweep against a real publisher-race rebase in CI, which is the situation it was built for and the one place it has not yet run.

  BLOCKERS
    • [ENG/P0] The member newsletter deploy was denied by the Claude Code sandbox permission classifier for the second session running. Both faults re-probed and live (function NOT DEPLOYED against a project-scoped 200 listing 29 functions; NEWSLETTER_SECRET absent from Actions), credential path open, tooling 5/5. Founder: node scripts/deploy-member-newsletter.mjs --deploy, then --secret, then --verify. Sole remaining doctor red.
    • [DESK/P1] The Desk cadence lever is still the founder's pick: widen radar yield, shorten novelty, or reduce slots.
    • [QA/P0] The Phase 0 human signup walkthrough has still not been run.
    • [SEC/P0] The gateway Supabase service-role slot remains scoped to a different project while check-secrets reports READY 2/2; the fix is studio-ops' via the S344 Ark cargo.
    • [AUTH/P0] The Obelisk provider journey remains unobserved. Use --watch, not --live.

  ACTION GATE
    4 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
