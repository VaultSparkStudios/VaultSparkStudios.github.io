# Implement Plan — S263

1. Ship latest-session closeout boundary gate. DONE.
2. Ship startup live-context-meter freshness gate. DONE.
3. Ship CTA sample-readiness artifact and play-next genius-list suppression. DONE.
4. Ship Football GM INP soak verdict artifact. DONE.
5. Ship Trusted Types readiness artifact. DONE.
6. Add staging parity route reason codes. DONE.

## Execution Log

- Added `scripts/check-closeout-boundary.mjs`; it validates latest-session handoff, work log, closeout brief, and cache artifacts, and writes `.cache/closeout-boundary-ledger.json`.
- Added `scripts/check-startup-meter-freshness.mjs`; it compares `docs/STARTUP_BRIEF.md` against live `scripts/context-meter.mjs --json` output and blocks stale urgent brief state.
- Added `scripts/check-cta-readiness.mjs`; it writes `.cache/cta-readiness.json` and keeps play-next redesign waiting until 20 true-viewport post-2026-07-02 impressions exist.
- Added `scripts/build-inp-soak-verdicts.mjs`; it registers the S262 Football GM mitigation boundary and exposes pending field-soak state in `data/` and `api/`.
- Added `scripts/build-tt-readiness.mjs`; it separates TT AMBER soak from unresolved active local rows and exposes `api/tt-readiness.json`.
- Extended `scripts/check-staging-parity.mjs` with route `reasonCodes` for yellow-state diagnosis.
- Verification: `npm run build` EXIT 0; `npm run build:check` EXIT 0 (181/181).
