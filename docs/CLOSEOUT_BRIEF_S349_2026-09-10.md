```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S349 · 2026-09-10 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    The public status page had reported our edge as degraded on 604 consecutive samples        ║
║    while the site served every visitor — a Cloudflare bot challenge read as an outage.        ║
║                                                                                               ║
║  PROJECT IMPACT     ███████▌░░   78/100                                                       ║
║  ECOSYSTEM IMPACT   ██████░░░░   63/100                                                       ║
║  SIL DELTA          993 → 991  (-2)                                                           ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#3]  worker-scheduled-uptime-sampler                           PROJ 9  ·  ECOS 8
         ── infrastructure ──────────────────────────────────────────────────────────────────
         A Cloudflare cron is never bot-challenged, so it is the only vantage that can ever
         observe our edge. Ships behind a flag that is off, with no KV binding and no cron
         trigger, so the deploy is provably inert; enabling it is its own release with a
         flag-flip rollback.
         → 5 unit tests assert zero KV writes and zero subrequests while off; bounded one-key-per-window KV with TTL; no subrequest to any hostname on our own routes

  [#1]  uptime-challenge-aware-api-legs                           PROJ 10  ·  ECOS 7
         ── security ────────────────────────────────────────────────────────────────────────
         Cloudflare widened bot challenges to JSON and OPTIONS paths, falsifying the premise
         the probe was rewritten on. Each API leg read its own challenge as an outage. A
         challenged leg is now neither an outage nor a pass — promoting it to ok would be the
         same lie with the opposite sign and would blind the probe to the real outage it
         exists to catch.
         → Live probe: 200 residential vs 403/127ms from CI; 62/62 probe self-tests (was ~43) incl. a negative control; new state carried to the contract gate, the public tile, rollup denominators and history rows in the same session

  [#6]  check-secrets-consults-probe-status                       PROJ 7  ·  ECOS 8
         ── security ────────────────────────────────────────────────────────────────────────
         check-secrets printed READY for supabase.admin while the same map entry recorded
         lastProbeStatus auth-error — on the surface an agent checks before declaring itself
         blocked. Surfaced a second unknown failure nobody had seen: openai.api unreachable.
         → Honest ready count 44/72 rather than 46/72; exit codes unchanged so a failing probe cannot become a phantom blocker

  [#2]  edge-html-broken-guard                                    PROJ 8  ·  ECOS 6
         ── security ────────────────────────────────────────────────────────────────────────
         edgeHtmlBroken guarded on !liveness.ok, which was permanently true while challenged.
         The one apex-HTML failure shape the probe exists to page on could not have fired
         once in the entire 59-day window. Found only while repairing the liveness leg.
         → Guard re-expressed as observably-down; self-tests pin both directions

  [#4]  sw-page-cache-separation                                  PROJ 7  ·  ECOS 5
         ── performance ─────────────────────────────────────────────────────────────────────
         Navigations shared a cache with the install precache, and the LRU deletes keys[0] —
         the first entry ever written, which is '/'. Past 60 entries every navigation deleted
         a precached shell asset in order. activate() also destroyed the API cache on every
         single activation.
         → Separate PAGE_CACHE; version-prefixed keep-set in activate; 119/119 unit tests

  [#5]  skip-link-focus-reveal                                    PROJ 6  ·  ECOS 4
         ── accessibility ───────────────────────────────────────────────────────────────────
         The :focus reveal lived only in the async-loaded stylesheet, so a keyboard user
         tabbing before the swap focused a link parked at top:-100%. A WCAG 2.4.7 failure on
         every shell page for the whole pre-swap window.
         → Fixed in the critical-shell generator; 108/108 pages carry it, 0 unpatched

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • Enable the edge sampler as its own release: create the KV namespace, uncomment the binding and cron, flip the flag, verify with drain-uptime-kv --dry-run.
    • Visibility-gated teardown for four uncancellable client polling timers verified this session (desk-presence, favicon-pulse, vault-pulse).
    • Prune six superseded hashed shell assets that are tracked and publicly servable.
    • Three public pages skip a heading level (h1 to h3).

  BLOCKERS
    • Edge liveness is honestly UNMEASURED, not fixed — the sampler that can observe it ships dark and has never run. Its presence is not coverage.
    • 604 pre-S349 uptime rows are unresolvable; they are labelled, never re-scored, and age out naturally.

  ACTION GATE
    6 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
