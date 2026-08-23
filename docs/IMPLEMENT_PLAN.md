# Implementation Plan — S327 Desk release and evidence closure

Session: S327 · Source: `docs/AUDIT_2026-08-22.json`

Efficiency order: build one deterministic release-contract library first, consume it from production and staging, then add public observability and the privacy milestone. Verification runs after each item; rendered-pixel work is reserved for the one public page change.

## Wave 2A — Shared release truth + production gate

- [x] `exact-live-news-claims` — derive the newest feed route, require candidate/live claim-ledger byte parity plus fact/stance rows for that edition, and emit hashes/counts in the durable release result.

## Wave 2B — Staging candidate truth

- [x] `dynamic-staging-news-verifier` — replace the two August 7 fixtures with the same newest-edition/claim contract and prove malformed, stale, and incomplete candidates fail.

## Wave 2C — Public newsroom observability

- [x] `newsroom-run-receipt` — build an abstention-capable public receipt from CI workflow evidence and the Desk corpus, bundle it into status-proof, render it on `/status/`, wire producer cascades, and visually verify every theme at desktop/mobile.

## Wave 2D — Privacy milestone automation

- [x] `privacy-qualification-milestone` — add a threshold-derived first-qualified summary to the public engagement receipt without storing new identifiers or lowering the five-pageload floor.

## Wave 3 — Release

- [ ] Run focused and complete verification, security/sanitization, exact-head Hetzner staging, responsive and rendered-pixel checks, the full app-release gate, and production promotion only if every hard gate is green.

## Mandatory gates

- Any page change must pass Lighthouse Performance ≥90 on mobile and the CANON-011 1.8-second LCP bar, or the release stays blocked.
- Every touched public state gets rendered-pixel inspection at desktop ≥1280px and mobile ≤430px across every theme, with a hash-bound `docs/visual-qa/LATEST.json` receipt.
- Production remains held unless exact staging lineage, required capability evidence, Obelisk dependency acceptance, and the founder-passkey provider journey are independently green. No bypass or force-green is permitted.
