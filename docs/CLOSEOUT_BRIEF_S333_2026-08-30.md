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
║  ECOSYSTEM IMPACT   ███████▌░░   76/100                                                       ║
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

  [#6]  escalated-decisions-resolved                              PROJ 9  ·  ECOS 8
         ── verification ────────────────────────────────────────────────────────────────────
         Proof receipts bound values that churn with cron data and the manifest's own
         timestamp, so regenerations with ZERO changed leaves invalidated them and cost two
         needless 12-minute audits. They now bind the promotion candidate, and tamper
         detection was proven intact by editing a tested file and watching it fail.
         Separately the Desk starved on a structural split: 2 readable-and-corroborated
         topics against 119 corroborated-but-unreadable and 87 readable-but-single. Loosening
         clustering was rejected because merging distinct stories manufactures corroboration
         that does not exist, so corroboration is earned across outlets at a
         stricter-than-merge bar instead.
         → D-S333.18/19 · 3 new receipt-binding cases · news-trends 68/68 · tuned live: 0.55 changed nothing, 0.45 took the publishable pool 2 -> 4

  [#7]  review-cycles-found-five-more                             PROJ 8  ·  ECOS 9
         ── process ─────────────────────────────────────────────────────────────────────────
         A model-failover loop shipped with its predicate tested and the loop itself
         uncovered, which is the same defect shape the session existed to fix. A second live
         fixed-window burial hid 84% of real activity in the studio ledger. A zero-day window
         bug could only surface on a day the Desk had published, did so that same day, and
         went unnoticed because its self-test was the third orphaned test found this session
         and the only one failing. The receipt diagnosis was confidently wrong twice in
         opposite directions before counting 24 commit tips settled it.
         → desk-inference 21 -> 27 cases · build:check 371 -> 372 steps · news-trend-radar 68/68 · 24 commit tips measured

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
    • [S333][NEWS/P2] Readable-source breadth is now the binding constraint: 119 topics are corroborated but carry no readable body, which corroboration cannot fix.

  BLOCKERS
    • Identity/auth remains held on real-provider-e2e-pending: OBELISK_RP_ID, OBELISK_RP_NAME, OBELISK_RP_ORIGIN missing and obelisk-staging-registration absent. Untouched by this session.
    • The founder passkey ceremony is hardware-key enrollment and is founder-reserved under CANON-019.
    • D-S303 warm-origin migration still awaits explicit founder authorization.
    • The Dispatch has zero confirmed subscribers until the founder clicks the double opt-in email.
    • Google News aggregator tokens are deliberately NOT resolved: the modern AU_yqL format embeds no publisher URL and would require Google's undocumented batchexecute RPC.

  ACTION GATE
    7 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
