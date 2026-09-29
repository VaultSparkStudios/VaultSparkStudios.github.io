# Implementation plan — S365

Scope: complete the website arc from the current main branch through a verified production release. Audit: `docs/AUDIT_2026-09-28.md`.

1. Extract publisher article prose before fact selection, with a conservative fallback for pages without a recognizable article body. Verify the observed TechCrunch shape and ordinary article shapes in the fetcher self-test.
2. Correct the 2026-09-28 Desk edition's page-chrome facts, regenerate claims and pages, and gate the observed contamination in the editorial quality check. Verify copy quality and claim parity.
3. Prioritize the article hero illustration, the observed Largest Contentful Paint element. Keep the Lighthouse 0.90 floor and verify a new hosted candidate run.
4. Rebuild dependent public proof feeds and run the full build gate. Capture desktop and mobile screenshots in all seven themes for touched article routes, inspect rendered pixels, and bind the final visual and mobile receipts.
5. Commit and push main, deploy the exact candidate to staging, run the release ceremony and hosted gates, then deploy and verify production. Close out the Studio OS write-back.

Acceptance: sourced facts link to supporting article prose; the current edition and derived claims agree; the article passes its unchanged Lighthouse floor; full local and hosted gates pass; staging and production serve the released candidate with current receipts.
