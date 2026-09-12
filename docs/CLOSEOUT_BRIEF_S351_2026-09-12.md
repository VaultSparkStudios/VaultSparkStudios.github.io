```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S351 · 2026-09-12 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    Fully deployed content, staging and the Worker — and turned the uptime sampler from a      ║
║    permission nobody had re-tested into one named, quoted provider limit.                     ║
║                                                                                               ║
║  PROJECT IMPACT     ███████░░░   74/100                                                       ║
║  ECOSYSTEM IMPACT   ██████░░░░   63/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#7]  green-run-deployed-nothing                                PROJ 9  ·  ECOS 8
         ── truth ───────────────────────────────────────────────────────────────────────────
         Both production workflows evaluate the promotion interlock on push, take a Promotion
         held branch that skips every deploy step, and still conclude success. The live apex
         was serving the previous content after a green run. Promotion was then done on the
         SCOPED path by explicit dispatch, staging first, and verified against served bytes
         rather than the run conclusion.
         → pages-deploy 34667065915 all deploy steps skipped; dispatch 34667221562 green; live days-since-launch 191 to 192

  [#1]  uptime-sampler-enabled                                    PROJ 7  ·  ECOS 7
         ── observability ───────────────────────────────────────────────────────────────────
         S350 held this on a founder allow that had already lapsed, and the KV namespace
         created on the first re-probe. The Worker deployed with UPTIME_SAMPLES bound live in
         production, then Cloudflare refused the cron with error 10072 because all five
         Workers Free account slots belong to other projects. No cron means no invoker, so
         the flag is back to 0 and the cron is commented out rather than left declared and
         failing every future deploy.
         → deployed script bindings via CF API; run 34667777146; error 10072

  [#3]  ungated-unit-suites                                       PROJ 7  ·  ECOS 7
         ── coverage ────────────────────────────────────────────────────────────────────────
         test:unit declared five spec files, build:check ran two, and npm run test:unit was
         invoked by nothing anywhere. 16 tests were gated by no runner. They pass, so this
         armed an alarm rather than fixing a red.
         → package.json build:check:steps; 16/16 pass

  [#2]  brand-assets-refusal                                      PROJ 8  ·  ECOS 6
         ── truth ───────────────────────────────────────────────────────────────────────────
         BRAND_ROOT was the sanitized <user-home> literal with nothing expanding it, so every
         job skipped on every run and the caller wrote an empty manifest anyway at exit 0.
         The S350 sweep-repair incident was the only behaviour, not an edge case. Placeholder
         now expands at runtime; the writer refuses when any job was skipped.
         → scripts/build-brand-assets.mjs; 7/7 jobs build, every committed .png byte-identical; bad root exits 1 manifest-preserved

  [#6]  hub-subdomain-near-miss                                   PROJ 8  ·  ECOS 5
         ── security ────────────────────────────────────────────────────────────────────────
         The first placement of the KV binding and cron sat between [env.production.vars] and
         the bare keys after it, re-parenting HUB_SUBDOMAIN_ENABLED and HUB_SESSION_TTL_SEC
         into [triggers]. Parsing the config caught what reading the edit did not.
         → wrangler dry-run: HUB_SUBDOMAIN_ENABLED=1, HUB_SESSION_TTL_SEC=2592000 in env.production.vars

  [#5]  stale-shell-selftest                                      PROJ 6  ·  ECOS 6
         ── automation ──────────────────────────────────────────────────────────────────────
         S350 root-fixed a regex here that had never matched. The predicate is now exported,
         the live path routes through it, and a known-stale fixture must classify as stale —
         the only thing separating a working cleaner from a dead pattern, since both print no
         stale shell files found.
         → scripts/clean-stale-shells.mjs --self-test 8/8, wired into build:check

  [#4]  drain-namespace-resolution                                PROJ 7  ·  ECOS 5
         ── truth ───────────────────────────────────────────────────────────────────────────
         drain-uptime-kv.mjs read its namespace only from an env var nothing sets, so the
         documented way to verify this very release would have printed the sampler is not
         enabled yet and exited 0. It now resolves the namespace from the deployed binding.
         → scripts/drain-uptime-kv.mjs; resolves adfe5ed60c90426ea1286321360138e3 from wrangler.toml

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • Founder decision: free one of the five account cron slots, or move to Workers Paid — everything downstream of it is built, deployed and verified.
    • Add a divergence gate for the declared vs executed unit-suite lists.
    • Make [skip ci] publishers cascade their own derived artifacts instead of taxing the next session.
    • Treat a green Actions run as necessary but never sufficient evidence of a deploy; assert served bytes.

  BLOCKERS
    • Uptime sampler has no invoker: Workers Free 5-cron account cap, all five held by other projects (Cloudflare 10072). Founder frees a slot or moves to Workers Paid (billing, CANON-019).
    • 604 pre-S349 uptime rows remain unresolvable and age out naturally; never re-scored.
    • Identity/provider acceptance, newsletter arming, Desk cadence, public-member-data and warm-origin remain founder-gated.

  ACTION GATE
    7 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
