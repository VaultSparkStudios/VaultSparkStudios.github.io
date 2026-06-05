```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session 175 · 2026-06-05 · agent: claude-code · repo: vaultsparkstudios.github.io            ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    The founder asked for major-studio speed; by end of day the single-region origin was       ║
║    gone, the cache architecture stopped punishing deploys, and Google left the building.      ║
║                                                                                               ║
║  PROJECT IMPACT     ████████░░   83/100                                                       ║
║  ECOSYSTEM IMPACT   ███████░░░   70/100                                                       ║
║  SIL DELTA          undefined → undefined  (NaN)                                              ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS SHIPPED                                                          (sorted: eco × proj)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [1]  cf-pages-origin-migration                                  Proj 10  ·  Eco 8
         ── Speed/Infra ─────────────────────────────────────────────────────────────────────
         Field data said TTFB was the homepage bottleneck and TTFB is mostly geography — so
         the geography changed. The first flip cost an honest 2-3 minute outage (domain
         validation chicken-and-egg), the rollback worked exactly as documented, and the
         Worker now carries permanent origin-failover so the next cutover anywhere in the
         studio is zero-downtime by construction.
         → origin marker live on prod · parity byte-identical pre-flip · pages-deploy.yml push→prod 27s · rollback verified during incident

  [4]  worker-deploy-env-fix                                      Proj 8  ·  Eco 9
         ── Process/Truth ───────────────────────────────────────────────────────────────────
         Three deploys today printed success while updating a worker nothing routes to —
         including S174's TT intake fix, whose 'live-verified' claim a 204 status could never
         actually prove. The correction is logged, the soak clock restarted honestly, and the
         verification rule changed: check the deployments list, never just an endpoint that
         the old version also answers.
         → wrangler deployments list showed f4c0d0c7 at 100% despite 3 newer uploads · production now 7c805a3f+ · DECISIONS maintenance rule

  [2]  shell-stable-core-split                                    Proj 9  ·  Eco 7
         ── Speed/Architecture ──────────────────────────────────────────────────────────────
         Since S160 every feature session has been silently taxing visitors by rotating one
         big bundle hash and nuking their cache. The 44KB core now survives ordinary sessions
         while the 62KB feature layer rotates freely — the propagator even learned to clean
         up after its own nav template, which had been quietly re-seeding inline-style debt.
         → 12 touchpoints updated · integrity spec 4/4 chromium · gate green 108 pages · live prod serves both bundles

  [3]  edge-analytics-replace-gtag                                Proj 9  ·  Eco 7
         ── Speed/Security/Privacy ──────────────────────────────────────────────────────────
         The RUM beacon was already recording every page view with better fidelity than GA —
         gtag was a third-party origin, a CSP hole, and the last Trusted Types sink, all for
         duplicate data. One founder approval later the site is measurably lighter and the
         analytics answer lives in a public-safe JSON the studio owns.
         → api/analytics-summary.json live (44 views/7d) · live homepage greps 0 for googletagmanager · CSP cleaned · 14 gtag() callers verified guarded

  [6]  regression-alerts-geo-vitals-status                        Proj 7  ·  Eco 6
         ── Observability/Trust ─────────────────────────────────────────────────────────────
         A regressed deploy now emails the founder the same night instead of waiting for a
         session to notice. The multi-geo recipe was corrected by evidence — GitHub runners
         can't pick geos, but real visitors already carry their geography, so the geo rollup
         quotes actual countries (US:106, GB:3) instead of synthetic guesses.
         → send-regression-alert 4/4 self-test, wired into nightly rum-pull · api/geo-vitals.json live · /status/ renders 6 generated tiles

  [5]  edge-html-cache-early-hints                                Proj 7  ·  Eco 5
         ── Speed ───────────────────────────────────────────────────────────────────────────
         Deploy-time purging made the 60s nonce window pointlessly conservative — staleness
         is bounded by deploys now, not by the clock. Early Hints rides a generated _headers
         file that can never drift from the shell manifest because the same build writes
         both.
         → HTML_NONCE_WINDOW_SEC 300 live · zone early_hints=on · _headers drift-gated in build:check

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS (next session entry points)
    • Read the 2026-06-05 field-verdict boundary (S173 critical path + S175 origin move) once ≥5 post-deploy samples/side land — the regression email stays silent if it worked
    • TT soak re-probe ~2026-06-12 (clock restarted at the env-fix)
    • Geo-vitals check: does non-US LCP confirm the origin win globally?
    • Nav-sheet 25% canary watch

  BLOCKERS
    • Founder yes/no: delete assets/vaultsparked-proof.js (evidence-complete, 30 seconds)
    • Founder device verify: membership proof loop + nav-sheet (real mobile device)

  COMMIT GATE
    6 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
