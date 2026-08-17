# Implementation Plan — S318 release-safe truth surfaces

Session: S318 · Source: `docs/AUDIT_2026-08-16.json`

Efficiency order: shared release boundaries before deploy consumers; small public-policy
and status contracts next; data producers before rendered Desk surfaces; runtime mobile
repairs before the source-bound visual receipt; external rollback mutation only after the
new release path is proven locally.

## Wave 1 — Release boundary

- [x] `release-capability-slice-gate` — unify local/CI promotion gates and prevent
  caller/callee split releases.
- [x] `push-subscription-enrollment-hardening` — validate and bound the Worker
  enrollment surface before the next Worker deployment.

## Wave 2 — Public and agent truth

- [x] `agent-crawler-policy-coherence` — retain GPTBot training opt-out while making
  OAI-SearchBot/user retrieval and the public corpus coherent.
- [x] `receipt-bound-status-projection` — remove stale aliases and make unknown/stale
  evidence non-green.
- [x] `desk-freshness-honesty-court` — derive the public cadence from edition evidence
  and generate a review-held recovery packet when overdue.
- [x] `fact-complete-claim-ledger` — emit every sourced fact with a stable receipt and
  exact page/feed parity.

## Wave 3 — Runtime mobile and rendered pixels

- [x] `mobile-runtime-release-contract` — fix current membership overflows/targets,
  make runtime findings blocking, capture desktop/mobile plus every touched theme, and
  bind the visual receipt to S318 source.

## Wave 4 — Immutable recovery and release

- [ ] `immutable-rollback-origin` — publish a dedicated verified rollback generation
  instead of letting legacy GitHub Pages follow every main candidate.
- [ ] Deploy and verify Hetzner staging, pass the complete app-release gate, promote only
  the authorized production lane, then prove remote/main and live currency.

Disposition: 7/8 audit items shipped. The immutable rollback migration remains blocked
behind the prior founder-scoped architecture decision recorded in D-S303; no provider
setting was silently changed. Hetzner staging is fully deployed and verified
(receipt `dd9ef88720ae57d4a4359fa7`, 5,004/5,004 files, browser 6/6), but the independent
app-release gate is NO-GO and the release ceremony is 7/8 because
`real-provider-e2e-pending` keeps production promotion on hold. Production was not
bypassed or mutated.

## Mandatory gates

- Verify every item before setting `shipped`; partial work is blocked, never relabeled.
- Run focused tests after each item and the full 302-step build check before closeout.
- Any touched public page must pass mobile Lighthouse Performance ≥90 or carry a measured
  exception.
- Every UI change requires real rendered-pixel inspection at desktop ≥1280px and mobile
  ≤430px in every touched theme/state, with a hash-bound `docs/visual-qa/LATEST.json`.
- Hetzner staging must be current and green before production. The Obelisk
  `real-provider-e2e-pending` hold remains intact unless its real provider evidence
  independently clears; no flag or local command may bypass it.
