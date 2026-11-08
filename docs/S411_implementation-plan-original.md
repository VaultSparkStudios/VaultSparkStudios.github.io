<!-- Session 411 · source: docs/AUDIT_2026-11-04-S411.json -->
# Preserve session identity when rotating a lock

One selected L2 outcome: Use one retained-lock decision for timestamp, start head and ID; forced, stale or invalid timestamps discard the old ID. Preserve ordinary repeat starts and explicit declaration validation. Verify actual CLI behavior in isolated fixtures.

User outcome: Operators find the correct current release record rather than attaching new work to an old session.

Acceptance: Isolated CLI regression: fresh repeat preserves ID/time/head; forced/stale/invalid rotation allocates above closed and spent history; explicit declaration remains valid; invalid declaration leaves bytes unchanged.

Rollback: normal revert of the scoped writer/test commit. No identity provider, membership, pricing or public UI change selected.

Wave1 startup/audit complete after admission. Wave2 selected repair pending. Wave3 combined source, rendered pixels, staging, exact hosted and authenticated acceptance pending. Wave4 authorized main/production/readback and full closeout pending.
