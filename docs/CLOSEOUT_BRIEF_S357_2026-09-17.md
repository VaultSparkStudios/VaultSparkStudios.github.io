```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S357 · 2026-09-17 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    Recovered a cut-off session, then found the studio's own deploy-truth surface              ║
║    publishing a false green over three-day-old production — and the release ceremony          ║
║    caught a deleted fetch still running in served bytes before it could reach production.     ║
║                                                                                               ║
║  PROJECT IMPACT     ███████▌░░   76/100                                                       ║
║  ECOSYSTEM IMPACT   ██████░░░░   60/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#2]  content-lane-unhashed-js                                  PROJ 9  ·  ECOS 9
         ── truth ───────────────────────────────────────────────────────────────────────────
         check-content-lane-purity holds unhashed .js as executable, so a deleted fetch kept
         running in served bytes. Production looked clean only because it still serves the
         pre-removal deploy; promoting would have moved the 404 rather than fixing it.
         → 27 of 171 unhashed client scripts serving pre-S356 bytes; caller found by fetch stack trace; two content-addressed, staging now 0 failed responses

  [#1]  deploy-truth-binding                                      PROJ 10  ·  ECOS 8
         ── truth ───────────────────────────────────────────────────────────────────────────
         Shell parity compares two operands and recorded only production as evidence, so a CI
         reading was rebased into a tree that added a shell asset and kept asserting matched.
         Bound to its tree, given a clock, and honestly scoped to what the pages.dev vantage
         can certify.
         → self-test 91 to 93 with the real receipt replayed byte-for-byte from c629dd66c; 4 negative controls on the aged-parity path; artifact now reads stale/drift

  [#4]  gates-that-never-ran                                      PROJ 8  ·  ECOS 7
         ── rigor ───────────────────────────────────────────────────────────────────────────
         Two scripts nothing invoked, two self-tests no path reached; plus a sink guard
         pinned to a deleted call, a bus check pinned to a moved path, and a preflight
         claiming whole-tree freshness from 6 of 94 generators.
         → reachability 252/252 and 320/320; preflight now states its own denominator and its sample's evidence strength

  [#5]  public-voice-firewall                                     PROJ 7  ·  ECOS 6
         ── voice ───────────────────────────────────────────────────────────────────────────
         You asked then we shipped was about to render internal receipt operations, one
         carrying a candidate hash, as things readers had asked for. A word denylist was
         out-vocabularied twice, so the filter went structural.
         → filters on touched files and commit type, both already available and unread; self-test 6 to 20; box renders empty, which is the honest reading

  [#3]  contrast-repairs                                          PROJ 8  ·  ECOS 5
         ── craft ───────────────────────────────────────────────────────────────────────────
         The worst failures were not on the board: /ignis/ light theme at 1.40:1 and 1.64:1,
         reproducing a bug class /oracle/ had already diagnosed and repaired for its own
         panels and never extended.
         → ratios computed per theme, not eyeballed; pixel receipt in docs/visual-qa/s357-contrast/; changelog title 1.63 to 5.83 measured on the deployed page

  [#7]  gate-performance                                          PROJ 6  ·  ECOS 6
         ── efficiency ──────────────────────────────────────────────────────────────────────
         The concentration ratchet fired for the first time only because no run had ever
         reached step 475. Three pure functions were recomputing identical work across the
         dry-run and real ingest passes.
         → 95.9s to 16.5s; content-hash keys; no threshold moved, no assertion relaxed; self-tests 32/32 and 33/33

  [#6]  generator-tug-of-war                                      PROJ 7  ·  ECOS 5
         ── craft ───────────────────────────────────────────────────────────────────────────
         generate-pathways stripped the site-wide Desk wire from six pages every run, and
         generate-evidence-hub hand-wrote a header that shipped /evidence/ without the GitHub
         link every other page carries.
         → both now harvest shared chrome and refuse on a failed harvest; byte-identical output, negative controls proven

  [#9]  recovery                                                  PROJ 7  ·  ECOS 4
         ── rigor ───────────────────────────────────────────────────────────────────────────
         A prior session died with a staging Worker deployed and a real CSP repair
         uncommitted in a 395-file tree. Its claims were verified real before anything was
         trusted.
         → 19 commits over two rebases spanning 128 publisher commits; 106 JSON files parsed; 3 stale worktrees and 9 duplicate captures removed; no force-push

  [#8]  changelog-entry                                           PROJ 6  ·  ECOS 4
         ── reach ───────────────────────────────────────────────────────────────────────────
         The public changelog was 63 days old against a 60-day trust ceiling because the
         studio had shipped for two months and published none of it.
         → seven highlights, each verified on staging before publication; content-freshness gate now green

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • PROMOTE TO PRODUCTION (founder): deploy-worker --env production --confirm-production, then pages-deploy with confirm_content, then verify from served bytes. Both refused by the agent session's permission policy, not by any gate.
    • Fingerprint the remaining 25 unhashed client scripts — the content lane can never update them.
    • Add a served-vs-repo drift gate for every path the content lane holds; run the measurement that found the 404 every release.
    • Source the You asked then we shipped lines from data/consumer-changelog.json so no filter has to guess at reader prose.
    • vault_feedback returns 404 on production /changelog/ on every visit; pre-existing, absent on staging.

  BLOCKERS
    • Production still serves e65eca737 from 2026-09-14. Everything in this session and all of S356 is verified on staging and unreleased.

  ACTION GATE
    9 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
