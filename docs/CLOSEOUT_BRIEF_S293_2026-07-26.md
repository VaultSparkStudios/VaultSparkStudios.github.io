```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S293 · 2026-07-26 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    The edge incident became a measured 13.3-day duration published on /status/ — and          ║
║    verifying that in production exposed a second incident: content deploys 134 commits        ║
║    stale behind a signal no script ever wrote.                                                ║
║                                                                                               ║
║  PROJECT IMPACT     █████████░   91/100                                                       ║
║  ECOSYSTEM IMPACT   ████████▌░   85/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#8]  deploy-currency-false-green                               PROJ 10  ·  ECOS 10
         ── truth ───────────────────────────────────────────────────────────────────────────
         The startup brief read portfolio/DEPLOY_GAPS.json, a file nothing in this repo
         writes, defaulted an absent file to healthy, and cited a command that does not
         exist. Meanwhile live build-sha served 4a72961d from 2026-07-24 and
         verify:deploy-parity was red with no caller. Absent now means UNVERIFIED, and the
         missing producer exists and runs every 30 minutes.
         → build-deploy-currency self-test 13/13 · live probe: stale, 134 commits behind, 2.3d

  [#1]  route-incident-duration                                   PROJ 10  ·  ECOS 9
         ── truth ───────────────────────────────────────────────────────────────────────────
         An append-only ledger records only semantic route changes and measures incidents
         against the last observation, so the long-standing 0/5 mismatch finally carries a
         duration. A verdict that reads identically on day 1 and day 23 generates no
         pressure; 13.3 days does.
         → build-worker-route-history self-test 32/32 · live probe 0/5 · data/worker-route-history.ndjson

  [#4]  unexecuted-check-gate                                     PROJ 10  ·  ECOS 9
         ── process ─────────────────────────────────────────────────────────────────────────
         The evidence graph declared build-status-proof --check --check-content while the
         only caller passed --check alone, so the embedded-content half had never executed. A
         declared check that nothing runs is indistinguishable from a passing one.
         → check-evidence-check-reachability self-test 13/13 · flag-exact, line-scoped, no allowlist

  [#5]  ledger-pairing-and-unmodelled-node                        PROJ 9  ·  ECOS 9
         ── organization ────────────────────────────────────────────────────────────────────
         An alsoStage contract stops a derived feed shipping without the ledger it was
         computed from, and modelling api/public-status.json exposed a pre-existing
         vault-narrative.yml strand that had been invisible precisely because the node was
         unmodelled.
         → cascade gate self-test 17/17 · live 27/27 workflows

  [#2]  observation-bounded-onset                                 PROJ 9  ·  ECOS 8
         ── truth ───────────────────────────────────────────────────────────────────────────
         onsetNotLaterThan is tightened by the independent uptime ledger's single up to
         edge-degraded transition and carries that source's coarser resolution as a label.
         The true start may precede all observation, and the feed says so rather than
         inventing a timestamp.
         → corroborated against data/uptime-history.ndjson at 2026-07-12T23:52:39Z

  [#6]  evidence-graph-projection                                 PROJ 8  ·  ECOS 9
         ── ecosystem ───────────────────────────────────────────────────────────────────────
         The single artifact driving build order, pre-push closure, and 27 publishers was
         legible to neither audience. It now emits a mermaid diagram and a resolved relation
         view, both advertised in agents.json so an agent can audit how any published number
         was produced.
         → build-evidence-projection self-test 23/23 · docs/EVIDENCE_GRAPH.md · api/evidence-graph.json

  [#3]  status-incident-panel                                     PROJ 9  ·  ECOS 7
         ── engagement ──────────────────────────────────────────────────────────────────────
         Incident History showed an empty state while five route contracts were failing. It
         now renders the open incident, its duration, per-route expected-versus-observed, and
         its source feed, built with safe DOM construction rather than an innerHTML sink.
         → browser-verified at 1280px and 390px against the real committed feed

  [#7]  renderer-field-contract                                   PROJ 8  ·  ECOS 7
         ── process ─────────────────────────────────────────────────────────────────────────
         A wrong field name made the public panel render a plausible fallback while every
         generator self-test stayed green, because those tests cover the feed and never the
         reader. The gate now parses the renderer's actual property reads and validates them
         against the feed.
         → check-status-feed-field-contract self-test 11/11 · encodes the real bug as a case

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • Diagnose why Cloudflare Pages Deploy reports success without changing the origin — the deploy-path equivalent of the unexecuted check fixed this session.
    • Wire verify:deploy-parity into a gate; it detected the drift correctly and nothing ever ran it.
    • Verify the incident-close path against a real production recovery; it is self-tested but has never been observed closing on live data.
    • Narrow onsetNotLaterThan using the other committed ledgers (RUM ingest silence, CI/deploy history), each kept labelled by its own resolution.

  BLOCKERS
    • TOP P0: production content deploys are 134 commits / 2.3 days stale. Cloudflare Pages Deploy and Cache Purge report success on every push while the origin does not change. Measured now, but not diagnosed or repaired.
    • Supabase management, SQL migration, and Edge Function authority are still absent from the secrets gateway for fjnpzjjyhnpmunfoycrp.
    • Production Worker restoration remains founder-gated behind the fail-closed promotion hold. The cost of that hold is now measured and public: 13.3 days at 0/5 route contracts.

  ACTION GATE
    8 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
