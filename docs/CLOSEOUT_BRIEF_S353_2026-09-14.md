```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S353 · 2026-09-14 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    Found three scheduled publishers that could not do their job, one of which reported        ║
║    success for 13 days while publishing nothing, fixed each at root, and gated both CI        ║
║    failure classes.                                                                           ║
║                                                                                               ║
║  PROJECT IMPACT     ██████▌░░░   69/100                                                       ║
║  ECOSYSTEM IMPACT   █████▌░░░░   59/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#5]  runtime-dependency-gate                                   PROJ 7  ·  ECOS 7
         ── coverage ────────────────────────────────────────────────────────────────────────
         The existing install gate forbade npm ci but never asked whether an install was
         needed. The new gate follows node invocations, derived-build profiles and npm run
         into local imports per job; try-guarded optional imports are exempt.
         → check-workflow-runtime-dependencies --self-test 10/10; negative control on HEAD names sharp

  [#7]  coverage-universe                                         PROJ 7  ·  ECOS 7
         ── truth ───────────────────────────────────────────────────────────────────────────
         "67/67 modeled" read only build:check:steps. 25 generator checks run inside
         check-proof-surface and 20 were unmodeled. Coverage now parses that list: 72/92,
         baseline 20, may only fall. Closes the S352 SIL row.
         → check-evidence-graph-coverage --self-test 17/17; negative control against the old baseline named all 20

  [#3]  narrative-grounding                                       PROJ 8  ·  ECOS 6
         ── truth ───────────────────────────────────────────────────────────────────────────
         Prompt and validator disagreed on what counts as concrete, so every dispatch from
         2026-08-27 was rejected while the run stayed green. Both now read one anchor list,
         and counts are verified in digits or words. Three real rejected answers are fixtures
         that now pass on merit.
         → generate-vault-narrative --self-test 15/15; live rerun accepted 2 of 3 through the new code

  [#4]  held-publisher-signal                                     PROJ 7  ·  ECOS 6
         ── observability ───────────────────────────────────────────────────────────────────
         Preserving the old dispatch stays the visitor fallback, but a warning annotation
         marks it and a post-commit --check-fresh step fails the run past 48h. Today it fails
         at 446.8h, which is true.
         → generate-vault-narrative --check-fresh exit 1 at 446.8h; vault-narrative.yml final step

  [#6]  pathspec-gate                                             PROJ 6  ·  ECOS 6
         ── coverage ────────────────────────────────────────────────────────────────────────
         Any glob in a workflow git add must match a tracked file unless the command
         tolerates failure.
         → check-workflow-git-add-pathspecs --self-test 8/8; negative control on HEAD names member/*/index.html

  [#1]  narrative-install                                         PROJ 7  ·  ECOS 5
         ── reliability ─────────────────────────────────────────────────────────────────────
         The refresh-live-data profile reaches build-news-desk --rebuild, which imports
         sharp. With no install step the job failed from 2026-09-10 and committed nothing for
         four days. The job now installs first.
         → gh run 34758908862: Cannot find package sharp; .github/workflows/vault-narrative.yml install step

  [#2]  weekly-pathspec                                           PROJ 6  ·  ECOS 4
         ── reliability ─────────────────────────────────────────────────────────────────────
         git add member/*/index.html matched nothing because the anonymous member read
         returns 0 rows, so git exited 128 before staging the Obelisk probe the job
         refreshes. It now stages the directory.
         → gh run 34090005000: pathspec did not match any files; weekly-maintenance.yml git add -A -- member

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • Read the next Vault Narrative run: expect a published dispatch and --check-fresh green.
    • Model the 20 proof-surface generators, starting with build-release-dependencies.
    • Retire or re-mount assets/vault-narrative.js, which no page references.

  BLOCKERS
    • Edge sampler still has no invoker; the studio-ops cron-reuse handoff was drained, not answered.
    • Identity/provider acceptance, newsletter arming, Desk cadence, public-member-data and warm-origin remain founder-gated.

  ACTION GATE
    7 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
