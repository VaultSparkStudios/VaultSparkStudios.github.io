```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S362 · 2026-09-19 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    Two probes were crying wolf — one said a clean closeout was debt, the other called an      ║
║    on-time cron silent. Both fixed, and the offline path members opt into is now gated in     ║
║    a real browser.                                                                            ║
║                                                                                               ║
║  PROJECT IMPACT     ██████░░░░   60/100                                                       ║
║  ECOSYSTEM IMPACT   █████░░░░░   50/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#1]  cron-comment-blind                                        PROJ 7  ·  ECOS 7
         ── truth ───────────────────────────────────────────────────────────────────────────
         The cron pattern was anchored at end-of-line, so any `- cron: '0 6 * * 1' # Monday`
         matched nothing and the workflow silently became 'daily'. 11 lines in 9 workflows.
         Separate cron lines now combine by rate, so four daily Desk slots are one run every
         6h, not one a day.
         → self-test 28/28 with the verbatim workflow text; live 14 workflows checked, 0 silent (was 1 false silent)

  [#2]  writeback-key-level                                       PROJ 7  ·  ECOS 7
         ── truth ───────────────────────────────────────────────────────────────────────────
         PROJECT_STATUS.json is written by hand and by tools, and the post-closeout resync
         rewrites doctorScore in it, so every resync looked like un-written-back work. Keys
         are surveyed from 40 real commits; an unreadable diff stays debt, so the rule can
         only over-report.
         → self-test 20/20 pinning df79cc6b (churn) and 20e0dd4b2 (still substantive); live: current

  [#3]  sw-install-gate                                           PROJ 8  ·  ECOS 5
         ── reliability ─────────────────────────────────────────────────────────────────────
         No gate had ever run register('/sw.js'), which is how an uninstallable worker
         survived three months in production. The new spec requires `activated` and a
         complete precache, and blocks the E2E compliance job.
         → mutation-tested: a 404 precache entry turns the worker redundant and the spec red; passes on local preview, staging and production

  [#4]  newsletter-holds                                          PROJ 5  ·  ECOS 4
         ── organization ────────────────────────────────────────────────────────────────────
         Six red scheduled runs a year, all from a deliberate non-arming, are
         indistinguishable from a cron that broke. The schedule now emits a held annotation
         and exits 0 unless NEWSLETTER_ARMED=true. Nothing was armed and nothing was sent.
         → .github/workflows/member-newsletter.yml; the staleness probe already reports held publishers by name (S355)

  [#5]  precache-reviewed                                         PROJ 3  ·  ECOS 2
         ── craft ───────────────────────────────────────────────────────────────────────────
         100 entries, 3.2 MB raw / about 779 KB brotli, fetched in the background only for
         members who turn on offline and push. No trim is justified by those numbers.
         → measured per entry from the served files; D-S362.5

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • Bind the staleness verdict to its discovered workflow count — the checked denominator flickered 14 vs 11 under gh budget pressure.
    • Confirm the first held newsletter run on 2026-10-02 concludes success with the held annotation (the 6-failure streak clears only then).
    • Re-probe desk-model-servability: Qwen3.8-27B went unmeasured at the provider during this session.

  BLOCKERS
    • The doctor's IGNIS remedy cannot run from a project repo (it reads a studio-ops-only registry) — Ark repo-question 01K2TR2MCB649E1AD036E22BAD is open with studio-ops.
    • Purging api/founder-presence.json from public git history needs a force-push to main — founder action.

  ACTION GATE
    5 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
