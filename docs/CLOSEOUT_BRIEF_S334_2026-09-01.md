```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S334 · 2026-09-01 · agent: claude-code · repo: vaultsparkstudios-website             ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    Full-site audit: 12 of 14 items shipped, and 2 retired by measurement rather than built    ║
║                                                                                               ║
║  PROJECT IMPACT     ███████░░░   72/100                                                       ║
║  ECOSYSTEM IMPACT   ███████░░░   73/100                                                       ║
║  SIL DELTA          996 → 988  (→0 · structural win — coherence/honesty, not score)           ║
║  PROOF OF WORK      300 files · +4200/-1500 · suite 215/215 mobile cells · zero P0/P1 · tests +45 · probes +4  ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS SHIPPED                                                          (sorted: eco × proj)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#5]  ai-factsheet-layer-undiscoverable                         Proj 8  ·  Eco 9
         ── ai ──────────────────────────────────────────────────────────────────────────────
         Index-follow, self-describing, cite-this-page sheets appeared in no sitemap entry,
         no agents.json field, carried no structured data and had no inbound link. Root cause
         was one line: a blanket startsWith('.') rule written for .git and .cache swallowed
         .ai as well. Three generator-side joins later they are discoverable, and grounding
         the answer engine in them took its corpus from 41 to 58 documents.
         → 18 sitemap entries, 17 aiFactSheet fields, JSON-LD in every sheet, rel=alternate from every human page; replaying the engine's real ranking, 15/17 project questions now reach the canonical sheet

  [#3]  transparency-surface-sprawl                               Proj 9  ·  Eco 8
         ── ux ──────────────────────────────────────────────────────────────────────────────
         Eight pages answered versions of one question with no entrance. Four lanes now route
         to the deep page that still owns each answer, so nothing moved and no permalink
         broke. Freshness is fetched live rather than baked, because a baked stamp ages into
         a lie — which is precisely the failure this whole surface exists to prevent.
         → generate-evidence-hub self-test 15/15; all four lanes resolved live against real feeds; linked into nav and footer on 124 pages; --check gates page, nav and footer drift

  [#4]  desk-topic-novelty-gate                                   Proj 8  ·  Eco 8
         ── tokenCost ───────────────────────────────────────────────────────────────────────
         Selection remembered which hosts refused it and nothing about its own output, so one
         story held the top queue slot for three mornings. The duplicates were noindexed
         downstream, which is why it went unnoticed — but each still spent an LLM draft, an
         OG render and a publish slot. A repeat carrying a new primary source is allowed and
         logged as a follow-up, because refusing a developing story would be the worse
         failure.
         → replayed the entire published history: 14 legitimate stories allowed, exactly the 2 known duplicates refused, zero false positives; self-test 65/65

  [#11]  unified-grounded-answer-surface                          Proj 7  ·  Eco 9
         ── ai ──────────────────────────────────────────────────────────────────────────────
         The engine had rendered a source link per result from the start — it was
         citation-capable and had nothing canonical to cite. Sheets are enumerated from the
         registry projection rather than globbed, and a zero-sheet build fails loudly instead
         of quietly un-grounding every project answer while reporting success.
         → index 41 -> 58 docs, 0 voice leaks; ranking replay shows 15/17 project questions reaching the canonical sheet, 10 in the top two

  [#6]  ignis-health-ungated                                      Proj 7  ·  Eco 8
         ── security ────────────────────────────────────────────────────────────────────────
         /ignis-health/ published the ask-ignis edge-function contract and appeared in
         robots.txt alone, which is a request to polite crawlers rather than access control.
         It is now gated by the same edge session as every other internal surface, and the
         class is closed rather than the instance patched.
         → worker GATED_PATH_PATTERNS; new robots-vs-gate court asserts every wildcard-Disallowed path is gated or declared public-but-unindexed with a written reason

  [#1]  redirects-splat-301-into-404                              Proj 8  ·  Eco 7
         ── ux ──────────────────────────────────────────────────────────────────────────────
         A splat rule promises every sub-path of the source has a twin under the destination.
         Two of them promised that over prefixes holding three Solara world pages, the legacy
         Franchise Architect build, the Solara SPA bundle and a 30-file app tree — and the
         destinations held one file each. Retired routes are now enumerated one by one, and a
         court fails the build when a wildcard would strand a tracked file.
         → scripts/check-site-integrity.mjs redirects-resolve court, 0 failures over 41 rules; also caught a chained /vaultspark-football-gm redirect pointing at a stub this session deleted

  [#2]  pathways-doorway-pages                                    Proj 8  ·  Eco 6
         ── ux ──────────────────────────────────────────────────────────────────────────────
         Six pages shipped 23KB of chrome around ~530 bytes of headline, and the audit
         proposed deleting them. data/pathways.json had carried a four-step route per pathway
         since S201 and the generator discarded it — the content was in the source of truth
         the whole time. Rendering it also surfaced four step targets pointing at routes
         retired into anchors months ago.
         → main content 534 -> 1880 bytes per page; generate-pathways --check current; rendered-pixel verified 1440px + 390px across dark, light and lava

  [#9]  membership-and-editorial-spine                            Proj 7  ·  Eco 6
         ── ux ──────────────────────────────────────────────────────────────────────────────
         Two clusters overlapped — eight membership surfaces and eight editorial ones, three
         of the latter being the same record at narrative, session and commit granularity.
         Each page earns its URL; the failure was that a visitor who picked the wrong door
         could not tell. One line per page saying what it is, plus links to the sibling
         answering the other thing. Reversible, unlike a merge.
         → apply-surface-spine self-test 14/14; every kin href resolved against the tree before writing; --check wired into build:check

  [#7]  orphan-sitemap-html-duplicate                             Proj 5  ·  Eco 6
         ── organization ────────────────────────────────────────────────────────────────────
         sitemap.html was tracked, deployed, byte-drifted from /sitemap-page/ and had zero
         inbound links — and it was explicitly allowlisted in check-orphan-pages. The gate
         had seen it and been instructed not to care. Deleted with both exemptions, plus two
         orphaned 192KB style shells nothing referenced.
         → 376KB of orphan shells removed; both allowlist entries dropped; edge 301 retained for bookmarks

  [#10]  dual-redirect-implementations                            Proj 5  ·  Eco 6
         ── organization ────────────────────────────────────────────────────────────────────
         Each shipped a meta-refresh page AND an edge 301 for the same path — two
         implementations that can silently disagree, the slower of which paints first.
         _redirects is now the single source of truth, and three routes that had a stub but
         no edge rule got one.
         → no-meta-refresh court, 0 failures across 163 pages; every deleted stub's route verified covered before deletion

  ───────────────────────────────────────────────────────────────────────────────────────────

  🛡 HONESTY LEDGER (what was NOT done, and why — refusals are work)
  ───────────────────────────────────────────────────────────────────────────────────────────

  🛡  The 66KB critical-CSS item was NOT built
         Measurement disproved it. The shared critical shell is 5,363 bytes and correctly
         scoped; the rest is page-unique CSS with only 7% overlap against the shared sheet,
         and measured mobile LCP is ~900ms with it inline. Extracting it would trade a parse
         for a round trip on the site's fastest page.

  🛡  The member-panel pane-deferral item was NOT built
         The dashboard does ship nine panes in one 133KB document, and it measures FCP 860ms
         at 1,414 DOM nodes — comparable to the rest of the site. Deferring eight panes would
         risk deep links and tab accessibility on the authenticated surface for no measured
         gain.

  🛡  A /games/ perf fix that looked like a 23x win was reverted to a zero diff
         It measured FCP 4724 -> 200ms with CLS 0 across six runs. A controlled A/B —
         alternating variants, stylesheet strategy the only difference — put blocking at
         724ms and async at 752ms. The baseline was the first page load in a fresh browser
         process. S275's blocking decision stands on its field data.

  🛡  The startup-brief failure was diagnosed but not patched
         It lives in studio-ops. CANON-018 routes it through Ark cargo rather than a
         sibling-repo edit, so build:check is reported red rather than made green by reaching
         across the boundary.

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS (next session entry points)
    • startup-revenue-agreement and startup-session-coherence stay red: the startup brief renders a stale date, session and revenue age, and on some invocations logs a promotion while writing no file. Studio-ops owned; repo-question cargo shipped (01K1E8OOSRE21313CE89EFE252).
    • Fact extraction accepted syndicated advertising copy as a sourced fact under a real publisher URL — a public truth surface, not a cosmetic issue.
    • The footer still names two retired routes; blocked behind reconciling propagate-nav's stale arrays (the S329 landmine).
    • Run the mobile audit at DEFAULT concurrency — a --workers=4 pass raced on findings.jsonl and persisted 139 of 215 cells, which reads as missing matrix cells rather than lost writes.

  BLOCKERS
    • startup-revenue-agreement / startup-session-coherence: two build:check smoke sub-checks fail on the studio-ops startup-brief renderer, not on site code.

  COMMIT GATE
    10 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
