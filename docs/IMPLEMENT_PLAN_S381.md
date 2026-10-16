# S381 implementation plan

Source: `docs/AUDIT_2026-10-15-S381.json`, selected L2. Public released website, supported-release stabilization.

1. Bind navigation probes and visual snapshot navigation to the selected candidate. Preserve explicit manual visual origin overrides and skip external navigation destinations.
2. Make pull-request visual workflow start the checked-out candidate preview. Preserve existing baseline thresholds and explicit manual capture.
3. Prove behavior with isolated actual-spec fixtures: healthy candidate passes, broken candidate fails despite healthy decoy, configured visual origin and explicit override are both honored, and old-expression mutations are detected. Run focused tests, actual relevant browser checks and full required build.
4. Independent review; fix findings. Stage exact release source and verify current staging. Complete canonical S381 write-back and security/public-safe checks; push main, verify required exact-candidate hosted checks, production deployment and readback.

Wave 1 startup/audit complete. Wave 2 implementation and full checks verified. Wave 3 staging, canonical closeout, exact hosted checks, confirmed full production, readback and publisher restoration complete. Acceptance: docs/RELEASE_S381.json.
