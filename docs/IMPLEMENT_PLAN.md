# Implementation Plan — S331

Source of truth: `docs/AUDIT_2026-08-27.json`

## Selected depth

All four verified items will ship at **L2**. This is the smallest depth that closes each defect with a regression gate and evidence rather than a one-off patch. The production identity hold, public auth/security flows, route consolidation, and pricing remain outside this implementation.

## Execution order

1. **attention-release-gate** — add the 15-case public-safe runner, receipt, release-ceremony integration, Doctor evidence, contract/evidence hashes, and reachability coverage.
2. **link-truth-court** — repair real destinations, add canonical live calls to action, make the auditor runtime-aware and import-safe, then regenerate a zero-finding report.
3. **rum-emission-dataflow** — teach the allowlist gate bounded helper-argument flow and prove the warning disappears without changing the emitted event.
4. **status-projection-reconciliation** — repair the derived project status from authoritative receipts and verify Session 330 is the projected summary.

## Verification ladder

- Focused self-tests and checks for every changed script.
- Canonical build-gate reachability and `npm run build:check`.
- Exact staging attention suite across Chromium, Firefox, and WebKit.
- Desktop (≥1280 px) and mobile (≤430 px) rendered inspection for every touched public page and affected theme.
- CSP, supply-chain, secret, link, navigation, sitemap, and status-projection checks.
- Release ceremony in check mode; no production promotion while the Obelisk identity hold remains.

## Rollback boundary

Each item is independently reversible. Generated `.cache` diagnostics are excluded from commits. Public receipts retain aggregates only and never raw browser output or response bodies.
