```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S335 · 2026-09-01 · agent: claude-code · repo: vaultsparkstudios-website             ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    A member could forge points and the paid AI tier from the browser, and every public        ║
║    member surface had been blank for months — both closed with one probe-proven migration;    ║
║    12 of 16 audit items shipped                                                               ║
║                                                                                               ║
║  PROJECT IMPACT     ████████░░   81/100                                                       ║
║  ECOSYSTEM IMPACT   ██████░░░░   63/100                                                       ║
║  SIL DELTA          988 → 989  (+1)                                                           ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#1]  member-write-lockdown                                     PROJ 10  ·  ECOS 8
         ── security ────────────────────────────────────────────────────────────────────────
         The base policy granted UPDATE on every column with no WITH CHECK and the live
         database still carried Supabase's default table grants, so any member could set
         points, plan_key and is_sparked — the columns ask-ignis reads for the paid tier. The
         gift flow proved the browser held that write every day by half-failing.
         Column-scoped grants and security-definer RPCs close it; the migration was applied
         through a new agent path that pre-images the touched objects and proves the
         behaviour by impersonating a member.
         → apply-supabase-migration.mjs --probe member-write-lockdown 9/9 (points update → 42501, prefs update → 1 row, self-gift/unknown/out-of-range rejected, anon cannot execute gift_points, anon has no DELETE); pre-image .cache/supabase-preimage-20260901T195643.sql

  [#2]  public-leaderboard-projection                             PROJ 9  ·  ECOS 7
         ── security ────────────────────────────────────────────────────────────────────────
         The probe surfaced that the members table has no anonymous read policy at all — only
         read-own-row — so counts, recently-joined, leaderboards, the directory, public
         profiles and the investor KPI tile had been rendering empty, and the public_profile
         opt-out was a client filter on data nobody could read. A definer view filtered on
         the opt-out is now the only thing anonymous surfaces read.
         → probe: base table visible to anon 0 rows, view 7 of 7 opted-in; ten anonymous readers repointed at the source (community, leaderboards + six generated subpages, members directory, member profile, live-proof, membership-stats, home-intelligence, vault-pulse, investor KPI)

  [#6]  how-we-build-and-vocabulary-gate                          PROJ 7  ·  ECOS 7
         ── ux ──────────────────────────────────────────────────────────────────────────────
         SIL score, CANON-NNN, closeout and handoff were leaking onto public pages
         unexplained. Rather than delete them, one page explains sessions, SIL, canon,
         receipts, handoff and the agent surfaces in visitor voice, and
         check-vocabulary-consistency now fails any public page that uses an operator term
         without linking to it. Eight offenders were fixed by linking, none by exclusion.
         → check-vocabulary-consistency --self-test + live clean; meta, schema, OG, touch-target, hero-jsonld, navigation-scent gates green for the new page

  [#3]  route-consolidation-court                                 PROJ 8  ·  ECOS 6
         ── organization ────────────────────────────────────────────────────────────────────
         S334 deleted the meta-refresh stubs twice and recorded it as shipped;
         build-route-consolidation.mjs ran in prebuild and postbuild and re-rendered eleven
         of them on every build. The script keeps its name and loses its write: it asserts
         every analysed route has an edge rule, no retired route ships index.html, and no
         tracked HTML carries a meta refresh. Thirteen stubs are gone, and the footer's four
         retired links point at live anchors.
         → build-route-consolidation --self-test 7/7; --check: 16 retired routes owned by _redirects, zero stubs, zero meta-refresh pages; footer manifest 62 header · 70 footer

  [#4]  build-chain-dedupe                                        PROJ 7  ·  ECOS 6
         ── organization ────────────────────────────────────────────────────────────────────
         The seal chain ran in build and was recomputed in postbuild; three shell rotations
         ran where one is needed; agents/shards ran twice. DERIVED_BUILD_PROFILES.full was a
         strict subset of what closeout needs and now carries build-public-status. Two page
         writers (evidence hub, surface spine) and early-hints ran after the seal and
         rotation — the first drift the gate found this session was exactly that ordering,
         now fixed in package.json.
         → build-order --self-test 29/29 (+2 assertions); postbuild 23 → 21 steps with writers before build-candidate-artifact-manifest; three consecutive builds green

  [#5]  four-route-merges                                         PROJ 8  ·  ECOS 5
         ── ux ──────────────────────────────────────────────────────────────────────────────
         The in-browser verifier moved into the evidence hub generator; the feedback loop and
         insights moved into the changelog as #requests; the wall's season countdown, rival,
         rank distribution and podium moved into the community page — its leaderboard had
         been querying two columns that do not exist. Each merge has a written analysis in
         DECISIONS per the S329 directive, and the founder confirmed both clusters S334 had
         left as orientation strips.
         → route court 16 rules; nav-orphans, orphan-assets --strict, page-script-relevance, intelligence-style-contract --strict, evidence-hub self-test 21/21 all green; rendered-pixel receipt 98 captures across 7 themes, 6 manually reviewed

  [#7]  season-1-and-member-loops                                 PROJ 8  ·  ECOS 5
         ── featureDepth ────────────────────────────────────────────────────────────────────
         Every consumer of a season existed; data/seasons.json was the single blocker. Season
         1 — Ignition runs 2026-09-02 to 2026-10-14 with rewards in Vault Points only. Three
         expired event cards were replaced and a freshness rule now fails on a past month or
         quarter label. The dashboard gained a quota meter with limits read from the edge
         function, a single upsell instead of two stacked paywalls, and a chronicle strip
         that shows which flagged pages later shipped.
         → check-content-freshness --self-test 16/16 (+7); validate-supabase-queries 0 errors; lint-tt-policies, check-active-tt-sinks, check-mobile-contracts green; mobile runtime contract 215/215 zero P0/P1 against a local preview

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • Trusted Types enforcement is wired as TT_ENFORCE_ENABLED (default 0) and approved, but api/tt-readiness.json says enforceEligible:false on rows dated 2026-07-03 — fix the readiness ageing first, then flip.
    • Two identical builds minutes apart still churn 47 files from commit-derived feeds (forge ledger, feedback provenance, ship receipts); bisect with a pinned clock.
    • Audit the other public tables for the same silent-zero anonymous read the members table had.
    • Confirm the four merged routes 301 at the apex from a real browser; scripted probes get 429 from the Worker's scanner block.
    • Move the 30-minute uptime probe (48 [skip ci] commits a day) to a Worker cron; design on the board.

  BLOCKERS
    • Full-site production promotion remains held on the real-provider passkey ceremony (founder-reserved); the content lane and Worker deploy on push as before.

  ACTION GATE
    7 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
