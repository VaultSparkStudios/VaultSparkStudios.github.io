```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S363 · 2026-09-20 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    A dropdown could have sent the unarmed newsletter to every member; that is closed, and     ║
║    eight guards this session's own /start had quietly removed are back.                       ║
║                                                                                               ║
║  PROJECT IMPACT     ████████░░   80/100                                                       ║
║  ECOSYSTEM IMPACT   ███████░░░   73/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#2]  propagation-clobber-merged-back                           PROJ 9  ·  ECOS 9
         ── organization ────────────────────────────────────────────────────────────────────
         The drain was mostly a real improvement (44 files, net +2,162) but removed the
         capability gateway's UNKNOWN-vs-MISSING separation and probe-health fields,
         check-secrets' caller-error render and exit 3, the SIL invariant helpers in a pure
         23-line deletion, the task-board inventory parser and the brief row using it, the
         PROJECT_STATUS alias guard, and probe-capability's whole self-test. All merged back
         beside the propagated improvements, never reverted. Seven failed loudly as named
         imports; the eighth did not, and only a contract test caught it.
         → Ark pattern-share 01K3052GLJ1D81D97FA5043903 · D-S363.4

  [#1]  newsletter-send-gate-keys-on-mode                         PROJ 10  ·  ECOS 7
         ── security ────────────────────────────────────────────────────────────────────────
         The unarmed send was held behind EVENT_NAME = schedule, so a manual dispatch with
         mode=send skipped the hold entirely and would have mailed every opted-in member with
         NEWSLETTER_ARMED unset. The same choice made the hold branch unreachable by any
         manual run, so it would first have executed unobserved on 2026-10-02. Gating on the
         effective mode closes the bypass and makes the branch testable by the same dispatch
         it protects. Nothing armed, nothing sent.
         → .github/workflows/member-newsletter.yml · D-S363.1

  [#4]  repaired-untested-verdict                                 PROJ 8  ·  ECOS 8
         ── observability ───────────────────────────────────────────────────────────────────
         Judging only run history, the newsletter's six pre-fix failures would have read as a
         dead cron until 2026-10-02 — and a genuinely newly-broken monthly cron would have
         been indistinguishable. Reading the workflow source's commit time gives a bounded,
         self-expiring repaired-untested verdict with streak, commit and expiry all named.
         This is not the mute D-S362.8 refused: it asserts only what git can prove.
         → scripts/check-scheduled-workflow-staleness.mjs · 9 guards · D-S363.2

  [#5]  writeback-authorship-filter                               PROJ 7  ·  ECOS 8
         ── observability ───────────────────────────────────────────────────────────────────
         57 commits authored by github-actions[bot] counted as substantive session debt; the
         session lock written afterwards tripped the cut-off heuristic and the probe reported
         an abandoned session with 57 unrecorded commits. Authorship is the structural filter
         — a commit no session produced is not a session's debt. The file also gained a real
         --self-test: it had none, so build:check had been running the live git probe while
         reporting itself as a logic test.
         → scripts/check-writeback-currency.mjs · self-test 8/8

  [#3]  supabase-overall-aggregates-all-planes                    PROJ 8  ·  ECOS 6
         ── truth ───────────────────────────────────────────────────────────────────────────
         overall pivoted on the service-role plane alone, so /status/, agents.json and
         release-proof served 'blocked' while managementApi, sqlMigration and edgeFunctions
         were all ready — with readyPlanes: 3, totalPlanes: 4 published beside that same
         word. Deploy authority was live throughout; this session used it to enumerate 30
         edge functions. A false red manufactures the phantom blocker CANON-019 exists to
         prevent.
         → api/supabase-control-plane.json · D-S363.3

  [#6]  gate-hygiene-and-scope                                    PROJ 6  ·  ECOS 6
         ── organization ────────────────────────────────────────────────────────────────────
         Two gates wired into build:check and four given their real lifecycle scope, but only
         after confirming that lane actually invokes them. Two allowlist entries removed —
         one claimed a script was 'invoked by /start' when nothing invoked it. Five spawn
         sites brought back under the window-storm guard, and the propagated gate's scan
         roots made repo-aware: owned roots still hard-fail, portable ones are named when a
         project does not carry them.
         → build:check 503/503, up from 502

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • [SIL] Make build:check idempotent over ignis/output/ecosystem-state.json — a completed run leaves the next one failing at step 81, which trains a reader to re-run rather than read.
    • [SIL] Refuse an inbound propagation that removes an exported symbol this repo's own code imports. S316 proves upstream cargo alone does not hold.
    • Compact the agent memory index by hand; an automated truncation pass inverted meanings and was reverted.

  BLOCKERS
    • Purging api/founder-presence.json from public git history still needs a force-push — CANON-019 founder action.
    • The Supabase service-role gateway slot points at the sibling project; row-data admin stays degraded. Management, SQL and edge-function deploy authority are live.
    • One stale ATLAS session lock and four compliance failures are sibling-owned and were not touched (CANON-018).

  ACTION GATE
    6 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
