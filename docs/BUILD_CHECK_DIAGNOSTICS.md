# Build Check Diagnostics

Generated: 2026-11-11T18:52:55.416Z
Receipt: `52b3b6e12ffa2ae1f33fd700` · coverage 3/552 from step 1

Latest: **2/3** passed · failed 1 · total 574.3s
Concentration: **79.0%** in step 3 · ratchet BREACHED (>30% and ≥45s)

## Slowest Steps

| Step | Duration | Status | Command |
|---:|---:|---:|---|
| 3 | 453.7s | 1 | `node --test --test-concurrency=1 tests/og-template-fit.unit.spec.mjs tests/contact-share-draft.unit.spec.mjs tests/member-registration-completion.unit.spec.mjs tests/open-member-enrollment.unit.spec.mjs tests/investor-access.unit.spec.mjs tests/member-access-experience.unit.spec.mjs tests/audience-auth-recovery.unit.spec.mjs tests/session-lock-rotation.unit.spec.mjs` |
| 1 | 72.2s | 0 | `node --test tests/ledger-rotation.unit.spec.mjs tests/staging-archive.unit.spec.mjs tests/offline-recovery.unit.spec.mjs tests/offline-navigation.unit.spec.mjs tests/deploy-parity.unit.spec.mjs tests/news-article-css.unit.spec.mjs tests/news-kicker-clearance.unit.spec.mjs tests/page-sigil-scroll.unit.spec.mjs tests/served-parity.unit.spec.mjs` |
| 2 | 48.4s | 0 | `node --test tests/served-binary-parity.unit.spec.mjs tests/operational-admission.unit.spec.mjs tests/moderation-admission.unit.spec.mjs tests/public-rest-canary.unit.spec.mjs tests/metadata-backfill.unit.spec.mjs tests/heartbeat-snapshot.unit.spec.mjs tests/rollback-archive.unit.spec.mjs tests/diagnostic-help.unit.spec.mjs tests/writeback-history.unit.spec.mjs tests/git-capture-capacity.unit.spec.mjs` |

## Failures

- Step 3: `node --test --test-concurrency=1 tests/og-template-fit.unit.spec.mjs tests/contact-share-draft.unit.spec.mjs tests/member-registration-completion.unit.spec.mjs tests/open-member-enrollment.unit.spec.mjs tests/investor-access.unit.spec.mjs tests/member-access-experience.unit.spec.mjs tests/audience-auth-recovery.unit.spec.mjs tests/session-lock-rotation.unit.spec.mjs` exited 1
