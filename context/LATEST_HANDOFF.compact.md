<!-- generated-by: scripts/compact-handoff.mjs v3.1 -->
<!-- source-hash: d3b1c2fc1d63 -->
<!-- generated-at: 2026-08-23T03:09:57.307Z -->

# LATEST_HANDOFF (compact)

SESSION
- Latest: S326 (2026-08-22). Next: S327.

SHIPPED (S326)
- Founder Desk complaint resolved in production; three editions newer than Aug 11 (two Aug 21, one Aug 22) live.
- All live articles render estimated read time + privacy-thresholded Reader views; honest state Collecting until 5 real pageloads qualify.
- Fixed release-partition defect: content lane withheld api/news-desk-claims.ndjson while serving stale Aug 11 copy. check-content-hotfix-gate.mjs now allowlists only canonical Desk claim ledger by exact path; all other NDJSON blocked.
- Production deploy run 32605433768 promoted 137 content-pure paths; content head ef703658c814d913c5ed4b553fcd787c64ee3777.

VERIFICATION
- build:check 368/368; commit 0b5e2bd88 passed E2E, compliance, 235/235 mobile, a11y, local + staging Lighthouse. Self-tests 43/43, 63/63. Staging served five Aug 22 rows.

CURRENT INTENT (S327)
- Preserve five-pageload privacy floor; prove first qualified Desk measurement.
- Add exact live claim-ledger verification to production and staging content lanes.

NOW BUCKET (top 3)
- Add claims ledger to workflow's exact live verifier.
- Make staging probes derive newest edition instead of pinning Aug 7 fixtures.
- Add bounded newsroom-run receipt carried from S325.

BLOCKERS / GAPS (top 3)
- Desk measurement waits on real traffic crossing reader privacy floor (evidence-driven, not release blocker).
- api/ecosystem-velocity.json has no drift gate; needs window-anchored fingerprint (TASK_BOARD design task).
- Reachability question unasked of check-/generate-/derive-/enrich-*.mjs (TASK_BOARD).

HUMAN-BLOCKED (founder-gated)
- Real-provider sign-in ceremony (founder passkey, CANON-019) — sole hold on production promotion; open since ~S321.
- GitHub Pages warm-origin rollback migration (D-S303) — founder decision.
- Dispatch double-opt-in confirmation — zero confirmed subscribers until founder clicks.
- IGNIS freshness / obelisk-staging-registration — resolve upstream (CANON-018), never from here.

NEXT SESSION
- Wire claims-ledger into live verifiers and wait for traffic to qualify first Desk measurement.
