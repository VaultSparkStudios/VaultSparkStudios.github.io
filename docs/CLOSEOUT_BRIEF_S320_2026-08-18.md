```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S320 · 2026-08-18 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    Production is serving current content again after 13.8 days, and the instruments that      ║
║    missed the last outage now watch the paths that actually broke.                            ║
║                                                                                               ║
║  PROJECT IMPACT     ████████░░   82/100                                                       ║
║  ECOSYSTEM IMPACT   ███████░░░   74/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#2]  writeback-currency-false-green                            PROJ 9  ·  ECOS 9
         ── observability ───────────────────────────────────────────────────────────────────
         check-writeback-currency scanned a fixed 60 commits and returned 'cannot measure' as
         ok:true, exit 0. The more [skip ci] cron churn the repo accumulated, the blinder it
         became — and no surface-vs-surface probe can see it, because the surfaces agree with
         each other. Reproduced live in both directions inside one session.
         → scripts/check-writeback-currency.mjs · self-test 11/11 · 68 false positives to 6

  [#1]  content-lane-promoted                                     PROJ 10  ·  ECOS 7
         ── release ─────────────────────────────────────────────────────────────────────────
         839 commits of content, including the homepage Desk module, had been built,
         committed, pushed and invisible since 2026-08-04. The lane promoted 259 content-pure
         paths and withheld 733 repo-internal ones at baseline, so deploy-currency moved FAIL
         to content-current and doctor blocking failures went 1 to 0 — without waiving the
         identity hold.
         → run 32192776059 · contentLaneHead 60ed3748c · served build-sha.json deployedBy=pages-deploy-content-lane

  [#3]  real-method-probes                                        PROJ 9  ·  ECOS 6
         ── observability ───────────────────────────────────────────────────────────────────
         /v/rum was probed with OPTIONS, which corsRumResponse answers 204 unconditionally,
         so it stayed green through an outage in which POST returned 500 — long enough that
         the engagement history file never existed at all. /login was not probed at all. A
         named 503 is now honest degradation; a 500 is judged down.
         → probe-uptime self-test 40/40, mutation-tested · live: POST /v/rum 202, GET /login 503 classified degraded

  [#4]  synthetic-no-write-contract                               PROJ 7  ·  ECOS 7
         ── correctness ─────────────────────────────────────────────────────────────────────
         A real POST writes a RUM row, so an hourly probe would inject synthetic rows into
         the reader-engagement data the Desk floors depend on. The Worker now validates
         fully, answers 202 and skips only the store write, echoing the flag back so an older
         build cannot forge the receipt.
         → live POST /v/rum returns {"ok":true,"synthetic":true} · Worker run 32193258963

  [#5]  split-release-guard-diagnosed                             PROJ 6  ·  ECOS 8
         ── release ─────────────────────────────────────────────────────────────────────────
         The content lane blocked because nine promoted callers referenced three Worker
         routes with no live provenance. The routes were live all along; only the evidence
         was missing — precisely the distinction the S317 guard exists to draw. It was left
         intact and the residual recorded as a blocker.
         → worker-route-provenance 7/7 matched after probing from an unchallenged vantage

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • Give route-provenance a vantage CI can use (corroborate at the unchallenged pages.dev origin) so content promotion stops depending on a locally run probe.
    • Promote contractLive to a hard assertion now that the synthetic no-write contract is deployed and verified.
    • Confirm sign-in recovers at the 00:00 UTC KV reset, and watch the first engagement history rows accrue.

  BLOCKERS
    • Content promotion depends on a route-provenance probe from an unchallenged vantage; CI is bot-challenged at the production origin.
    • Production promotion stays held on real-provider-e2e-pending — obeliskgate.com serves HTML for its OpenID discovery document (sibling-owned, Ark cargo filed).
    • Sign-in returns 503 auth_store_unavailable until the 00:00 UTC Cloudflare KV write-quota reset.

  ACTION GATE
    5 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
