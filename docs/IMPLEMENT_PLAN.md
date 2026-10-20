# S391 implementation plan

Source: docs/AUDIT_2026-10-20-S391.json; supported-release stabilization, S1 from registry.

1. Wave 1 completed: native goal bound, startup/canon/radar checked, current premises verified and recorded.
2. Wave 2: strict admission for six outward CLIs; preserve documented caller behavior and read-only --check where it existed. Actual executions under IO tripwires, existing unit/self-tests. Publish explicit inventory.
3. Wave 2: bound REST requests and add weekly/manual read-only canary. Verify offline fixtures, real anon probes and first hosted dispatch.
4. Wave 3: full project checks and doctor; public-safe closeout, staging verification, exact candidate hosted checks, direct main push and production deployment/readback with rollback evidence.

No UI, auth policy, membership logic or database schema change is selected. Existing STRONG identity/terminology gaps remain recorded, with no claim of resolution. No lifecycle transition.
