# Implementation Plan — S332

Source of truth: `docs/AUDIT_2026-08-28.json`

## Selected depth

All three verified items ship at **L2**. Each result must carry a regression test and a machine-readable receipt; no new dependency, model call, lowered privacy floor, or auth/security bypass is permitted.

## Execution order

1. **cta-evidence-age** — add the smallest source-derived truth field and four-state tests first, so later release surfaces can consume a trustworthy age signal.
2. **attention-pressure-rollup** — reuse the existing RUM transport/history to emit one bounded claim event, aggregate only coarse surface/depth cohorts, enforce the privacy floor, and publish the receipt.
3. **external-destination-reachability** — extend the now-zero-finding link court with offline-tested three-state classification, bounded live sampling, and a freshness-checked public receipt that never treats network uncertainty as health.

## Verification ladder

- Focused self-tests and check modes after every item.
- Existing RUM allowlist/privacy courts, link court, generated-artifact checks, and build-gate reachability.
- Canonical `npm run build:check` with its direct exit code.
- Lighthouse mobile Performance ≥90 for any public page whose rendered output changes; otherwise record the measured exception.
- Exact Hetzner staging release ceremony and rendered-pixel inspection before any push to remote `main`.

## Rollback boundary

Each item is independently reversible. Raw RUM rows, probe response bodies, identifiers, and session histories remain uncommitted. A failed or unavailable destination probe is represented as `failed` or `unknown`, never rewritten to green.

## Completion — S332

All three L2 items are implemented and focused checks are green. The live destination receipt is intentionally mixed (10 passed, 0 failed, 2 unknown); the two unknowns are a 401 and repeated 503, neither of which satisfies the two-404/410 dead-target rule. Canonical build, rendered-pixel, staging, release, and production verification remain the next arc waves.
