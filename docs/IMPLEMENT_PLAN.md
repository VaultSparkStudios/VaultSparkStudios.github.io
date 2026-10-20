# S392 implementation plan

Native goal 01a159cf-3925-7480-959e-0dd6caa69447. Fresh audit: AUDIT_2026-10-20-S392.json. Both selected outcomes use L2. Strict premise checkpoint precedes source edits.

Wave 1: startup and nine-axis audit. Preserve S391 recovery and current publications. Record current provider health and request the gated recovery action.

Wave 2: validate moderation command-specific options, then reuse strict argument admission for the REST checker. Run actual CLI IO-tripwire checks, valid-input request tests, existing unit tests and independent review. Neither item changes browser UI, auth policy or membership rules.

Wave 3: rebuild generated outputs, run the complete local suite, staging payload and runtime checks, exact-candidate hosted checks, secrets/public sanitization, canonical closeout, direct main push and full production promotion/readback. Current provider outage is a real release dependency; a passing historical release cannot satisfy it.

Rollback: revert the bounded source changes and rebuild; use the prior accepted production deployment if promotion needs rollback. Preserve all unpushed prior-session work.
