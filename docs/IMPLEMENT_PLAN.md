# Implementation Plan — S325 verification truth and promotion timing

Session: S325 · Source: docs/AUDIT_2026-08-20.json

Efficiency order: repair the shared verification foundation first; add the deterministic
velocity proof after its reachability contract can enforce it; change the public status
consumer last, then regenerate all dependent proof feeds and perform rendered-pixel QA.

## Wave 3A — Verification foundation

- [x] verification-reachability-ratchet — route 33 raw child-process imports through
  scripts/lib/safe-spawn.mjs, wire the four verified build/release gates, and widen
  reachability to scope-declared check/generate/derive/enrich gates.

## Wave 3B — Stable-history observability

- [x] closed-day-velocity-drift-proof — commit a stable-day SHA-256 receipt, compare
  only overlapping completed days, and prove open-day tolerance plus closed-day failure.

## Wave 3C — Production-promotion truth

- [x] publisher-promotion-cadence-contract — publish the cost-neutral four-hour
  coalescing contract in api/deploy-currency.json, render it on /status/, update
  dependent proof artifacts, and inspect desktop/mobile output in every theme.

## User-reported Desk recovery

- [x] Restore the scheduled publisher's real trend scan, add readable
  publisher-owned sources, and fail the cadence postcondition when no current
  edition is present.
- [x] Preserve full article body and visual metadata through authoring, render
  and pixel-check article-bound art before promotion, and rebuild image
  derivatives before validating the carousel.
- [x] Publish reader views and estimated/measured read time above the fold and
  in the detailed evidence panel, backed by the privacy-thresholded engagement
  feed and coherence checks.

## Wave 4 — Release

- [ ] Run focused and complete verification, sanitize the public repo, deploy the exact
  candidate to Hetzner staging, pass /app-release-gate, then promote and verify
  production without bypassing the standing provider-journey hold.

## Mandatory gates

- Verify behavior before marking any item shipped; partial work remains blocked.
- Any page change must pass mobile Lighthouse Performance ≥90 or carry measured evidence
  for an honest exception.
- Every touched public state gets rendered-pixel inspection at desktop ≥1280px and
  mobile ≤430px across every theme, with a hash-bound docs/visual-qa/LATEST.json.
- Staging must be exact-head and green before production. No local flag may satisfy the
  founder-reserved real-provider passkey ceremony.
