```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S328 · 2026-08-24 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    The gate written to stop [skip ci] cascade strands passed on the exact strand it exists    ║
║    to catch — because its universe excluded a whole directory.                                ║
║                                                                                               ║
║  PROJECT IMPACT     ███████░░░   70/100                                                       ║
║  ECOSYSTEM IMPACT   ██████░░░░   60/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#1]  cascade-gate-cache-blind-spot                             PROJ 9  ·  ECOS 8
         ── organization ────────────────────────────────────────────────────────────────────
         check-publish-cascade-coverage builds its universe from config/evidence-graph.json,
         which held 33 nodes and ZERO under .cache/. A gate whose universe excludes a
         directory is not weaker there, it is blind there — and blindness is
         indistinguishable from a pass. Declaring .cache/cta-readiness.json as the graph's
         first .cache/ node makes the strand fail the existing gate unaided. Proven both
         directions in one process: with the staging fix exit 0; without it exit 1 naming
         refresh-live-data.yml and the artifact.
         → config/evidence-graph.json · scripts/check-publish-cascade-coverage.mjs (self-test 20/20)

  [#3]  cta-readiness-honest-denominator                          PROJ 7  ·  ECOS 6
         ── truth ───────────────────────────────────────────────────────────────────────────
         counts.shown is a rolling 30-day count (rollup-rum-ux WINDOW_DAYS = 30; its own
         comment: an epoch 'only TIGHTENS the window'), but the message read 'waiting for 20
         more post-epoch impressions' — a cumulative promise over a windowed number. The row
         now carries basis, windowDays and observedThrough, states the bar as within a single
         30-day window, and reports a distinct no-post-epoch-span verdict instead of a
         countdown over frozen evidence. minShown, WINDOW_DAYS and the epoch are deliberately
         untouched: the fix describes the floor accurately, it never lowers it.
         → scripts/check-cta-readiness.mjs (self-test 11/11)

  [#2]  refresh-live-data-strand                                  PROJ 8  ·  ECOS 5
         ── correctness ─────────────────────────────────────────────────────────────────────
         refresh-live-data.yml ran npm run build (regenerating api/funnel-summary.json AND
         .cache/cta-readiness.json) but staged only api/. The producer was committed every
         cycle and the byte-checked consumer never was. Because the commit carries [skip ci],
         no CI run ever observed it, so build:check went red at step 57/368 on the next clean
         tree — with S327 having closed at 368/368 and nothing hand-edited in between.
         → .github/workflows/refresh-live-data.yml

  [#4]  dead-epoch-suppressor                                     PROJ 4  ·  ECOS 5
         ── correctness ─────────────────────────────────────────────────────────────────────
         generate-genius-list pinned the play-next epoch to '2026-06-18' while the live epoch
         is '2026-07-02' — and check-play-next-impression-contract's own self-test uses
         '2026-06-18' as its WRONG-epoch negative control. One script suppressed on the value
         another script's tests define as the failure case, so it could never fire. Both now
         read scripts/lib/cta-contract-registry.mjs. Latent, not user-visible, and reported
         as such rather than as a live bug fixed.
         → scripts/generate-genius-list.mjs · scripts/lib/cta-contract-registry.mjs

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • [S328][SIL][INFRA/P1] Declare the remaining 17 byte-checked .cache/ artifacts in the evidence graph, or mark each exempt in its own source. cta-readiness is the precedent, not the cure.
    • [S328][SIL][OBS/P2] Surface evidence age on the CTA readiness row so a frozen observedThrough reads as stale rather than merely unstarted.

  BLOCKERS
    • Founder-reserved and unchanged: the real-provider passkey ceremony (CANON-019 hardware-key enrollment), the D-S303 immutable warm-origin decision, and The Dispatch double opt-in.
    • Honesty ledger: the audit's first draft called the readiness threshold 'unreachable by construction' — withdrawn, because funnel.asOf is source-derived rather than wall-clock. And the first verification of item #1 came back green WITHOUT item #2 applied, which would have meant a gate that did not bite; re-run atomically in one node process it failed correctly, so that first green was not trusted.

  ACTION GATE
    4 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
