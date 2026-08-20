```
╔═════════════════════════════════════════════════════════════════════════════════════════════╗
║  STUDIO OPS · CLOSEOUT IMPACT BRIEF                                                           ║
║  Session S324 · 2026-08-20 · agent: claude-code · repo: VaultSparkStudios.github.io           ║
╠═════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  HEADLINE                                                                                     ║
║    The verification suite read 319/319 green while three public feeds sat stale on the        ║
║    live site — twelve build gates existed that no runner in the project ever invoked.         ║
║                                                                                               ║
║  PROJECT IMPACT     ████████░░   82/100                                                       ║
║  ECOSYSTEM IMPACT   ██████▌░░░   68/100                                                       ║
║                                                                                               ║
╚═════════════════════════════════════════════════════════════════════════════════════════════╝

  ITEMS                                                       (sorted: left × right)
  ───────────────────────────────────────────────────────────────────────────────────────────

  [#1]  unreachable-build-check-gates                             PROJ 10  ·  ECOS 8
         ── organization ────────────────────────────────────────────────────────────────────
         Of 82 build-script --check gates, 54 were wired into the suite and 16 were reached
         one hop in through a runner's step table or an argv-inheriting import. Twelve were
         reachable by no runner at all. A gate nothing asks is indistinguishable from a gate
         that passed, so three had been failing silently for an unknown number of sessions.
         Resolving the runner graph mattered: a naive scan of the step list flags all 28
         non-wired gates and is wrong about 16 of them.
         → scripts/check-build-gate-reachability.mjs --self-test 7/7 · 79/79 gates reachable · 3 declared dry-runs

  [#4]  release-handshake-could-not-hold                          PROJ 8  ·  ECOS 8
         ── security ────────────────────────────────────────────────────────────────────────
         The cross-repo release dependency check validated that the receipt was well-formed
         and never that it was satisfied, so a well-formed rejection was a pass and the
         handshake could not hold a release. It now stops on a rejection. It runs in the
         advisory lane on purpose: the standing rejection is an unanswered cargo owned by a
         sibling repo, and a permanently red build would have pressured a future session into
         weakening the gate.
         → scripts/build-release-dependencies.mjs --self-test 11/11 (5 new exit-code cases)

  [#3]  seven-crons-stranding-consumers                           PROJ 9  ·  ECOS 7
         ── organization ────────────────────────────────────────────────────────────────────
         Chasing the stale changelog to its root found the 4-hourly refresh cron regenerating
         the commit map and never regenerating the changelog that reads it. Modeling the
         newly-gated generators in the evidence graph then made the cascade checker able to
         see six more workflows in the same state. All 29 workflows now report closed
         cascades, so the repair does not depend on a human session running a build.
         → scripts/check-publish-cascade-coverage.mjs — 29 workflows, all cascades closed · self-test 19/19

  [#2]  three-stale-public-feeds                                  PROJ 9  ·  ECOS 6
         ── content ─────────────────────────────────────────────────────────────────────────
         The plain-English public changelog was missing the newest shipped work, the
         machine-readable map that tells AI agents which page answers which question had
         drifted, and the public statistics surface had drifted. Each was guarded by one of
         the unreachable gates. All three are current, and the reason they could drift is
         closed.
         → api/changelog-narrative.json · api/intent-map.json · data/stats-surface.json + stats.json

  [#5]  shared-output-evidence-graph                              PROJ 7  ·  ECOS 7
         ── organization ────────────────────────────────────────────────────────────────────
         The homepage carries server-rendered fragments from two different builders. The
         graph could represent only one, and its ordering silently dropped the other —
         modeling the second made the whole projection refuse to build. Shared outputs are
         now declared by every writer, edges resolve through a multimap, and a consumer waits
         for the last writer rather than the first.
         → scripts/check-evidence-graph.mjs --self-test 9/9 · build-evidence-projection --self-test 25/25

  [#6]  tt-summary-compared-nothing                               PROJ 6  ·  ECOS 5
         ── organization ────────────────────────────────────────────────────────────────────
         The Trusted-Types summary check computed the fresh payload and then asserted only
         that the committed file parsed as JSON, so a summary that had drifted from its
         source export was a pass. It now compares the control structure minus the wall-clock
         timestamp, the pattern the security-posture feed already uses.
         → scripts/build-tt-summary.mjs --check — structural compare, live green

  ───────────────────────────────────────────────────────────────────────────────────────────

  FOLLOW-UPS
    • Extend the reachability check beyond build scripts to the check, generate, derive and enrich families — proving a script has a consumer somewhere is weaker than proving the verification suite runs it.
    • Give the velocity feed a window-anchored drift gate: fingerprint only the days already closed inside the 60-day window and ignore the moving edge, so a real regression fails while an honest new commit does not.

  BLOCKERS
    • Real-provider sign-in ceremony — founder passkey, CANON-019 reserved. The only thing holding production promotion.
    • GitHub Pages warm-origin rollback migration — founder decision, D-S303.
    • obelisk-staging-registration is still missing — an Ark cargo a sibling repo has not answered. Now surfaced by name on every build; resolve upstream (CANON-018).
    • IGNIS freshness is studio-ops owned — resolve upstream, never backdate.
    • The Dispatch has zero confirmed subscribers until the founder clicks the double-opt-in confirmation.

  ACTION GATE
    6 items shipped · ready to commit & push? [y/N]

```

---

*Generated by `scripts/render-closeout-brief.mjs` · spec: `docs/CLOSEOUT_BRIEF_SPEC.md`*
