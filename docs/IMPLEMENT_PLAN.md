<!-- Session 408 · source: docs/AUDIT_2026-11-02-S408-git.json -->
# S408 complete Git inventory capture

Original2verifier outcomes, privacy capacity and archive-card outcomes remain accepted locally under their S408 sidecars.
Wave1 audit done; Wave2 original implementation done; Wave3 full release/closeout acceptance remains in docs/RELEASE_S408.json.

L2: In existing safe-spawn hardening, supply a16MiB default output buffer only for Git captures when the caller has not supplied maxBuffer. Preserve explicit limits, non-Git defaults, windowsHide and guarded environment behavior. Verify actual full Git inventory against an explicit bounded control, retain fail-closed overflow with a smaller explicit limit, and verify non-Git capacity is unchanged.
Acceptance: Shared captured Git stdout equals an explicit16MiB native control on the complete real inventory. Explicit smaller capacity still fails closed. Non-Git output keeps the native default. Existing safe-spawn/window guard tests, resync self-test and independent review pass.
Rollback: bounded revert of default Git capacity and its regression; no Git arguments, permissions, history or credentials are changed.
