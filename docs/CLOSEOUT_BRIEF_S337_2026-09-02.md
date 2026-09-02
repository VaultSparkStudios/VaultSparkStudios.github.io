```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S337 · 2026-09-02 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    The full production deploy was never identity-blocked; what actually blocked it was a      ║
║    Chromium-shaped assertion that misread every Firefox report-only notice as a hard          ║
║    error.                                                                                     ║
║                                                                                               ║
║  PROJECT IMPACT     ███████▌░░   78/100                                                       ║
║  ECOSYSTEM IMPACT   ██████▌░░░   67/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#2]  tt-report-only-classifier-engine-agnostic                 PROJ 10  ·  ECOS 8
         ── correctness ─────────────────────────────────────────────────────────────────────
         The release ceremony rejected 9/10 on staging-browser-receipt with reason flaky-1.
         tests/staging-release.spec.js classifies Trusted Types Report-Only notices as
         observations by design, but matched only Chromium's wording; Firefox phrases the
         same notice completely differently, so its notices became hard console errors. The
         sinks render asynchronously, so it fired intermittently, which Playwright calls
         flaky, and a flaky result rejects the ceremony. Matching is now conjunctive so an
         ENFORCED violation still fails loudly.
         → tests/lib/tt-report-only.js; tests/tt-report-only.unit.spec.js; staging-release 6/6 live on chromium+firefox+webkit, zero flake

  [#3]  tt-enforce-blocker-measured                               PROJ 9  ·  ECOS 7
         ── security ────────────────────────────────────────────────────────────────────────
         ambient-core.bundle.js installs the TT default policy the site's ~167 legacy sinks
         depend on and says it MUST load before any sink usage, but it is not the first
         script on the page. Across 137 built pages, 31 sink-bearing assets load before it,
         led by pwa-nav.js on 81 pages and pwa-install.js on 72. Report-Only hides this;
         enforcement throws. Measured and recorded rather than half-fixed.
         → context/TASK_BOARD.md [S337][SEC/P1]; D-S337.3

  [#1]  promotion-authority-reprobed                              PROJ 9  ·  ECOS 7
         ── truth ───────────────────────────────────────────────────────────────────────────
         Three surfaces recorded the confirm_production deploy as gated on the Obelisk
         identity hold. The gate disagreed and had for eighteen sessions:
         check-promotion-scope returns promotable=true scoped-disjoint and the gate returns
         allowed=true mode=scoped. A blocker sentence is a claim with an expiry; the gate is
         the authority and the prose is a cache.
         → scripts/check-promotion-scope.mjs --check; scripts/check-production-promotion-gate.mjs --emit-github-output

  [#4]  desk-truth-defects                                        PROJ 7  ·  ECOS 6
         ── truth ───────────────────────────────────────────────────────────────────────────
         factCandidates scored register and never subject, so a syndicated vacuum-cleaner
         promo block ran as the 2026-08-31 edition's first sourced fact under a real
         publisher URL. And authorDraft discarded the model and fellBackFrom that chat() sets
         specifically for disclosure. Stories now carry an authoredBy receipt separating what
         was requested from what answered.
         → news-draft-edition 69/69; author-news-edition 26/26

  [#6]  release-contract-covers-its-predicate                     PROJ 6  ·  ECOS 6
         ── security ────────────────────────────────────────────────────────────────────────
         Extracting the classifier out of the spec moved the browser gate's most
         consequential predicate outside contractSha256, where it could have changed without
         changing the contract. Both evidenceHash lists now include it.
         → scripts/run-release-ceremony.mjs

  [#5]  publisher-crash-visibility                                PROJ 6  ·  ECOS 6
         ── observability ───────────────────────────────────────────────────────────────────
         news-publish.yml ran the radar as --scan || echo, making a crash and an empty queue
         the same green step. The scan now emits its own verdict and counts to GITHUB_OUTPUT
         and a non-zero exit raises an explicit warning. Tolerance kept; silence removed.
         → news-trends 71/71; .github/workflows/news-publish.yml

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • Hoist the Trusted Types default-policy installer ahead of all 31 sink-bearing assets, re-measure, then decide the founder-approved enforce flip on real evidence.
    • Record the distinct violating files in the release-ceremony receipt as a structured array; its 500-character message truncation disclosed one of six violations.
    • Diagnose why staging serves /how-we-build/ as 404 while production serves 200, and add a parity probe.

  BLOCKERS
    • uptime-probe cron is red on two consecutive scheduled runs: it rebinds api/deploy-currency.json, runs the seal chain, then byte-checks the artifact it already moved.
    • Four public tables still render a silent zero to anonymous visitors, awaiting a founder privacy decision.
    • Trusted Types enforcement remains held, now on a named defect rather than only on stale soak evidence.

  ACTION GATE
    6 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
