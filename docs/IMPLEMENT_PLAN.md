# S387 implementation plan

Selected audit: `docs/AUDIT_2026-10-18.json`, item 1, L2. Lifecycle: SPARKED / S1, supported release.

1. Preserve the existing normalized Trusted Types reports and sampling while replacing their shared-KV writes with private R2 batches. Reuse existing signing code; add no dependency.
2. Migrate both evidence readers through one complete, paginated reader covering legacy KV plus current R2. Failed reads remain nonpassing. Configure isolated staging storage and 30-day lifecycle retention before enabling production writes.
3. Verify with outage/failure and reader tests, independent review, full project checks, staging, required exact-candidate checks and production readback. Close out and push the evidence.

Done means the acceptance contract in the audit is proven. Until release evidence exists, implementation remains partial. Other KV writers and existing identity/readiness holds remain visible.

Wave 1: startup and audit complete. Wave 2: implementation in progress. Wave 3: closeout and release pending.
