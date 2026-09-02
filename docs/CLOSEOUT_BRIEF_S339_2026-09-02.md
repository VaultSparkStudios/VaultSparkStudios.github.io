```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S339 · 2026-09-02 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    The origin five release workflows verify against had never had a publisher — and the       ║
║    status label the home page showed twice was rasterized into a PNG.                         ║
║                                                                                               ║
║  PROJECT IMPACT     ████████▌░   86/100                                                       ║
║  ECOSYSTEM IMPACT   ████████░░   80/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#1]  staging-had-no-publisher                                  PROJ 10  ·  ECOS 9
         ── correctness ─────────────────────────────────────────────────────────────────────
         S338 asked what deploys the Hetzner staging origin and why it stopped, and the
         answer is that nothing ever did. The origin is named 14 times across the workflows
         and every one of those references reads it, while the only publisher was invoked by
         zero workflows and reachable only through an npm alias nothing called. CANON-007 had
         therefore been running backwards: the release ceremony was clearing a tree five days
         newer than the one it measured, invisible because every check compared surfaces that
         agreed with each other and were all equally stale. The credential was READY 2/2
         throughout, so under CANON-019 this was agent work rather than a founder blocker.
         → deploy-staging-content: 340 overlays, 25 safe removals, exact-byte verified, identity untouched; advertised surface 115 -> 135/135, zero missing

  [#2]  verification-origin-publisher-gate                        PROJ 9  ·  ECOS 10
         ── observability ───────────────────────────────────────────────────────────────────
         Gated the class instead of the instance: every workflow-named origin must declare a
         publisher that exists, actually references the origin, and is reachable by the exact
         route it claims. An automated claim needs a workflow that really invokes it and an
         operator claim needs an npm script that really exists and really runs it, which is
         the half that catches an alias nothing calls being dressed up as a publication path.
         Staging is declared operator because CI holds no Hetzner SSH credential and is
         deliberately not given one, a root key reachable from every workflow run being a
         founder decision rather than an agent one. surfaceParity flipped from reported to
         gating, so the next drift blocks a release instead of passing unnoticed.
         → check-verification-origin-publisher 19/19; live-negative reproduces the real defect and names all five workflows; check-staging-parity 31/31 (was 26)

  [#3]  status-baked-into-the-artwork                             PROJ 9  ·  ECOS 7
         ── craft ───────────────────────────────────────────────────────────────────────────
         S338 photographed a doubled status label and recorded it as client-side rendered and
         absent from the markup, and it was neither. A DOM probe found exactly one status
         node per tile, which ruled out markup and injection together and pointed at the
         asset: the cover generator rasterized the status word into every image, directly
         under the absolutely-positioned badge, clipped to a bare S on narrow tiles. The
         worse half is truth rather than layout, because the word came from a hardcoded array
         duplicating the game registry and a PNG cannot follow a feed. Removed from the
         artwork entirely instead of wired to the feed, since the only reliable way for an
         image not to go stale about a fact is not to assert the fact.
         → build-game-covers 6/6 with a per-spec no-status assertion; 10 covers regenerated; verified on a fresh 84-capture theme matrix

  [#5]  receipt-roundtrip-harness                                 PROJ 7  ·  ECOS 8
         ── organization ────────────────────────────────────────────────────────────────────
         S338 closed the lossy-receipt-reader class for one script with a fixed-point test
         paired with a proof that the guard can fail, and the pairing is the whole value. A
         fixed point over a function that drops the same field on both passes is
         self-consistently green, so half the pair reports success while measuring nothing.
         Extracted the property to a shared harness and made it mandatory for any script
         re-deriving from a receipt it wrote itself. An audit found exactly one such site
         today, so the gate exists for the second one, which is where all three historical
         field losses happened.
         → check-receipt-roundtrip-coverage 15/15; build-deploy-currency holds 87/87 across the refactor

  [#4]  home-page-advertised-live-products-as-unfinished          PROJ 8  ·  ECOS 6
         ── truth ───────────────────────────────────────────────────────────────────────────
         S247 bound each destination page's badge to the nav grouping, and nobody had ever
         bound the home page to anything. PromoGrind sat under the Sparked heading wearing a
         Forge badge while Velaxis and Vorn sat in the Forge tier entirely, although the
         catalog, the nav and all three destination pages said SPARKED. Moved both cards,
         removed the per-card badge from all 11 tier cards, and bound placement and
         badge-absence to the canonical feeds. A stray Sparked meta chip surfaced only on the
         rendered capture, after the badge rule was already passing.
         → check-home-portfolio-status-coherence 20/20; live-negative on a reintroduced badge; 10 cards coherent across 3 tiers, 1 declared stub

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • [S339][BUILD/P2] Answer the postbuild ordering question with an instrumented mtime-snapshot run, in a session with no deploy in it. The grep-based classification tried this session was wrong in both directions.
    • [S339][UX/P3] The cover artwork still duplicates the tile's kicker and title the way it used to duplicate the status. Decide it as a design question with captures at both tile sizes.
    • [S339][OBS/P3] check-build-gate-reachability counts only gates carrying the literal --check, so all three gates added this session sit outside its denominator.

  BLOCKERS
    • Staging publication is operator-only by decision: CI holds no Hetzner SSH credential, and giving it one would put a root key on the staging box reachable from every workflow run. Founder call. surfaceParity gating is the compensating control.
    • Trusted Types enforce remains blocked on load order — 31 sink-bearing assets load before the default policy installer.
    • Founder privacy decision still open on the four public tables that render silent zeros to signed-out visitors.

  ACTION GATE
    5 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
