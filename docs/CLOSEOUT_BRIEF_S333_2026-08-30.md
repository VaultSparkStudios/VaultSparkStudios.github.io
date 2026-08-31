```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S333 · 2026-08-30 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    The Desk publishes again after five silent days, the self-test meant to prevent the        ║
║    last outage had never been run by anything, and the public forge ledger was quietly        ║
║    publishing nothing at all.                                                                 ║
║                                                                                               ║
║  PROJECT IMPACT     ████████░░   84/100                                                       ║
║  ECOSYSTEM IMPACT   ███████░░░   72/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#3]  orphaned-gate-wired-and-generalized                       PROJ 9  ·  ECOS 9
         ── verification ────────────────────────────────────────────────────────────────────
         scripts/lib/build-order.mjs --self-test passed 25/25 while appearing in no npm
         script and no workflow. Worse, check-build-gate-reachability reported 246/246 gates
         reachable because its denominator never included scripts/lib self-tests. It is now
         build:check step 371, and its hardcoded single-script assertion is joined by a
         structural detector that derives mode-requirement from each producer's own dispatch
         source.
         → package.json build:check:steps 370→371 · build-order 27/27 · invocation-modes 10/10 · proven to fire on a reintroduced regression and on a typo'd flag

  [#1]  desk-topic-fallback                                       PROJ 10  ·  ECOS 7
         ── reliability ─────────────────────────────────────────────────────────────────────
         Eight consecutive scheduled runs failed and the public newsroom sat five days stale,
         because selection took only draftable[0]. draftableTopics() is a STATIC filter — is
         this URL an aggregator — and reachability is a LIVE property, so a topic passed the
         filter, its lone direct source answered 401, and the whole slot died while six
         readable topics waited in the same queue. Selection now walks the ranked queue until
         one yields real prose.
         → scripts/news-draft-edition.mjs · self-test 58/58 · live run: draft prepared with 3 sourced facts

  [#5]  forge-ledger-scan-window                                  PROJ 8  ·  ECOS 8
         ── observability ───────────────────────────────────────────────────────────────────
         api/commit-map.json published ZERO entries. Its noise filter worked perfectly — it
         simply had nothing but noise to read: the ledger scanned a fixed last-120 commits,
         and 128 consecutive [skip ci] publisher commits since the S332 closeout had buried
         every human commit below the window. A window sized by a raw commit count is outrun
         by any cron that commits faster than humans do. Depth is now sized to the 24 entries
         the ledger displays, with an early exit so a normal run costs the same.
         → scripts/build-commit-map.mjs · restored live 0 -> 24 entries · downstream feedback-provenance and ship-receipts recovered

  [#2]  host-aware-attempt-budget                                 PROJ 8  ·  ECOS 6
         ── reliability ─────────────────────────────────────────────────────────────────────
         Blocking is a property of the HOST, not the story. The queue ranked four consecutive
         openai.com items on top, so a naive retry spent every attempt re-asking one
         publisher that had already answered 403. A refusing host is now remembered for the
         run and further topics resting solely on it are skipped without spending an attempt
         — the budget reaches genuinely different outlets.
         → live run: one 403 cost one attempt, five same-host topics skipped free, huggingface.co reached

  [#4]  destination-evidence-continuity                           PROJ 7  ·  ECOS 6
         ── observability ───────────────────────────────────────────────────────────────────
         Each run was a pure snapshot, so a thirty-second blip and a five-day outage rendered
         identically. Destinations now carry a consecutive-unknown streak and a
         last-known-good age, with validator invariants forbidding a streak on a decided
         verdict, an unknown without a streak, and an age without an anchor. Never-confirmed
         destinations report null rather than an invented past.
         → scripts/probe-canonical-destinations.mjs 23/23 · live receipt: 10 passed, 0 failed, 2 unknown, neverKnownGood 2

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • [S333][SIL][NEWS/P1] Confirm the next scheduled Desk run goes green unattended and publishes a post-2026-08-30 edition.
    • [S333][SIL][GATE/P1] Extend check-build-gate-reachability to every --self-test-bearing module under scripts/ and scripts/lib/, so an orphaned gate cannot hide inside a passing denominator.
    • [S333][SIL][OBS/P2] Audit every other fixed-size scan window against current automation churn, and gate on the zero-entries-with-recent-human-activity signature — today that is indistinguishable from a genuinely quiet repo.

  BLOCKERS
    • Identity/auth remains held on real-provider-e2e-pending: OBELISK_RP_ID, OBELISK_RP_NAME, OBELISK_RP_ORIGIN missing and obelisk-staging-registration absent. Untouched by this session.
    • The founder passkey ceremony is hardware-key enrollment and is founder-reserved under CANON-019.
    • D-S303 warm-origin migration still awaits explicit founder authorization.
    • The Dispatch has zero confirmed subscribers until the founder clicks the double opt-in email.
    • Google News aggregator tokens are deliberately NOT resolved: the modern AU_yqL format embeds no publisher URL and would require Google's undocumented batchexecute RPC.

  ACTION GATE
    5 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
