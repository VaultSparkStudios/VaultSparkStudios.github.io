# S384 implementation plan

Native goal 01a144ed-f74b-74b3-8146-cbf94d804898 binds this arc. Audit docs/AUDIT_2026-10-16-S384.json. Stage S1, SPARKED/public-live, supported-release stabilization.

- Wave1: startup and fresh nine-axis audit complete.
- Wave2: L2 returning-visitor contract and browser diagnostic artifacts. Verify three-browser matrix, negative mutations and independent diff review.
- Wave3: full local acceptance, canonical closeout, exact candidate staging/hosted checks, direct main push, full Pages deployment and production readback.

## 1. Verify returning-visitor momentum without duplicating the homepage signal

Move the positive digest fixture to /games/. Await the real ledger response before silence assertions; verify homepage suppression, previous-baseline handoff, once-per-session behavior, dismissal and failed-feed silence. Load the actual asset through a request instead of inline substitution. Add the deterministic suite to required CI.

Done: All digest cases pass in Chromium, Firefox and WebKit. Mutating homepage suppression, previous-baseline handoff and actual script loading causes the corresponding tests to fail. No runtime or baseline changes.

## 2. Retain machine-readable browser failures and screenshots in CI

Use configured Playwright list/HTML/JSON reporters for the optional full browser job and always upload both playwright-report and test-results. Verify deliberately failing local browser run produces JSON, HTML and screenshot; inspect exact-candidate hosted artifact.

Done: Failing local run yields machine-readable results, HTML and failure screenshot; hosted optional job uploads report and screenshot artifacts. Required candidate workflows pass independently.

Preserve unrelated caches and prior evidence. No runtime, baseline, identity, pricing, lifecycle or membership change selected.

## Observed release prerequisite: sitemap theme readability

Use the existing theme-aware muted-text token for sitemap URL labels, synchronize the existing REX page11 link, then inspect real before/after captures in all seven themes at desktop1366 and mobile390. Run scoped axe color-contrast checks and preserve all runtime JavaScript and screenshot baselines.

Before captures expose the light-theme defect; after captures and scoped contrast checks must pass. Per-page Lighthouse is not newly measured for this color/link-only change; existing required exact-candidate Lighthouse remains a separate check, with no page-specific performance claim.
