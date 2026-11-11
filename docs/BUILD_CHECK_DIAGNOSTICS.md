# Build Check Diagnostics

Generated: 2026-11-11T01:19:42.182Z
Receipt: `0f90d8faf20ea9ed643523cf` · coverage 47/552 from step 1

Latest: **46/47** passed · failed 1 · total 1208.5s
Concentration: **35.0%** in step 3 · ratchet BREACHED (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 3 | 423.4s | 0 | `node --test --test-concurrency=1 tests/og-template-fit.unit.spec.mjs tests/contact-share-draft.unit.spec.mjs tests/member-registration-completion.unit.spec.mjs tests/open-member-enrollment.unit.spec.mjs tests/investor-access.unit.spec.mjs tests/member-access-experience.unit.spec.mjs tests/audience-auth-recovery.unit.spec.mjs tests/session-lock-rotation.unit.spec.mjs` |
| 2 | 400.9s | 0 | `node --test tests/served-binary-parity.unit.spec.mjs tests/operational-admission.unit.spec.mjs tests/moderation-admission.unit.spec.mjs tests/public-rest-canary.unit.spec.mjs tests/metadata-backfill.unit.spec.mjs tests/heartbeat-snapshot.unit.spec.mjs tests/rollback-archive.unit.spec.mjs tests/diagnostic-help.unit.spec.mjs tests/writeback-history.unit.spec.mjs tests/git-capture-capacity.unit.spec.mjs` |
| 4 | 155.7s | 0 | `node --test tests/deployment-admission.unit.spec.mjs` |
| 1 | 150.5s | 0 | `node --test tests/ledger-rotation.unit.spec.mjs tests/staging-archive.unit.spec.mjs tests/offline-recovery.unit.spec.mjs tests/offline-navigation.unit.spec.mjs tests/deploy-parity.unit.spec.mjs tests/news-article-css.unit.spec.mjs tests/news-kicker-clearance.unit.spec.mjs tests/page-sigil-scroll.unit.spec.mjs tests/served-parity.unit.spec.mjs` |
| 11 | 14.1s | 0 | `node --test tests/s371-release-maintenance.unit.spec.mjs tests/s372-redirect-chains.unit.spec.mjs tests/s373-guards.unit.spec.mjs tests/s373-pages-redirects.unit.spec.mjs` |
| 47 | 12.9s | 1 | `node scripts/check-generated-drift-preflight.mjs` |
| 7 | 5.1s | 0 | `node scripts/check-public-rest-contract.mjs` |
| 41 | 4.2s | 0 | `node scripts/check-capability-discovery-contract.mjs` |
| 8 | 2.6s | 0 | `node --test tests/csp-reports.unit.spec.mjs` |
| 13 | 2.4s | 0 | `node scripts/check-served-parity.mjs --self-test` |

## Failures

- Step 47: `node scripts/check-generated-drift-preflight.mjs` exited 1
