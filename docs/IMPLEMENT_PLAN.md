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


S384 verified full release (2026-10-16T16:32:24.488Z): returning-visitor contract6/6 across three engines18/18, three negative mutations detected, mobile215/215,28 sitemap plus84 incoming-art rendered captures and119 sitemap labels/theme measured at minimum5.291:1. Complete current-source validation537/537; stagingcritical65/65; ceremony11/11; exact required hosted checks; full Pages deployment38931769343 at 7a9159690566056665f2cfb1a92f664f4dc8c87c. Immutable readback1089 served text files and primary315 HTML routes verified. Hosted optional diagnostics: 596 expected,36 unexpected,0 flaky,60 skipped; JSON/HTML reports and168 failure screenshots retained. Existing identity holds, field-vitals limitations and axe gradient incompleteness remain separate. Final metadata push, publisher restoration and owned-process cleanup follow before native goal completion. SIL933/1000 unchanged.
All authorized audit outcomes shipped; all three waves complete. Same S384 score, no additional scored session.
