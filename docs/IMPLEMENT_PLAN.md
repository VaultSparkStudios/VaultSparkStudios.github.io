# Implementation Plan — S314 public evidence, interaction truth, and release continuity

Session: S314 · Source: `docs/AUDIT_2026-08-12.json`

Efficiency order: small high-confidence interaction fixes first; shared data/release
contracts before the surfaces that consume them; token/process optimization last.

## Wave 1 — Interaction truth

- [x] `mobile-sheet-focus-contract` — focus entry/return, Tab trap, inert background,
  scroll restoration, and close-cause tests.
- [x] `reaction-delivery-honesty` — persist only accepted reactions; expose submitted,
  duplicate, unavailable, and retry states; correct the ORSON claim.
- [x] `visual-review-receipt-integrity` — per-capture inspection truth, risk tiers, and
  no global reviewed claim beyond evidence.

## Wave 2 — Editorial and release evidence

- [x] `story-art-relationship-parity` — subject/action/object contracts, deterministic
  parity dimensions, and hash-bound raster review.
- [x] `lane-aware-news-release-continuity` — structured exact-byte results, hash-chained
  News release history, continuity head, and overlay-aware deploy classification.
- [x] `positive-served-surface-manifest` — generated positive public manifest,
  reference closure, survivor gate, and negative staging probes.

## Wave 3 — Public statistics and choice evidence

- [x] `public-stats-analytica-surface` — Analytica Feed v1, live homepage tile, deep
  /stats page, freshness/definitions/trends, and human+agent discovery.
- [x] `hero-choice-conversion-contract` — viewport-qualified choice denominators,
  typed CTA families, honest-dark rates, and dead-choice coverage.
- [x] `validated-discovery-content-lane` — exact-path discovery partition, manifest,
  staging crawler checks, and release receipt binding.

## Wave 4 — Verification efficiency

- [x] `proof-gate-output-compression` — concise pass output, importable checks,
  in-process orchestration, and receipt-equivalence mutation tests.
  Verified: 84/84 logical commands retained; eight leading checks run in-process;
  wall time fell from 101.8s to 9.7s; successful output is digest-bound and suppressed,
  while failure output remains complete.

## Mandatory gates

- Verify every item against its claimed behavior before setting `shipped`.
- Run the relevant focused tests after each item and the complete existing suite at closeout.
- Any touched page must pass mobile Lighthouse Performance ≥90 or carry an explicit,
  measured exception.
- Every UI change requires rendered-pixel review on desktop, mobile, and every theme
  affected by the change, with a hash-bound `docs/visual-qa/LATEST.json` receipt.
- Staging must be deployed and verified before any production promotion; the unrelated
  Obelisk full-site hold remains intact.
