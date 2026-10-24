<!-- Session 401 · source: docs/AUDIT_2026-10-24-S401.json -->
# S401 staging archive integrity

Session Intent: /arc then authorized direct main commit/push and full deploy.

Wave 1: Startup, S400 observation recovery and fresh nine-axis audit.
Wave 2: pre-upload-archive-membership at L2. Done: Actual archives accept exact names including spaces and long paths; reject missing, unexpected, duplicate and malformed members, unsafe source links/directories/traversal, corrupt or truncated archives. A real full staging deploy records matching inventory before upload; full required checks and production readback pass.
Wave 3: Full build and suite, staging, exact candidate checks, normal main push and production readback.
Wave 4: Canonical closeout, independent review, Ark, remote and native goal completion.

Rollback: revert the bounded implementation commit and redeploy the prior accepted release. CANON-045 existing identity gap remains separately justified; this operational release does not alter identity or trust policy.
