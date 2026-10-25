<!-- Session 403 · source: docs/AUDIT_2026-10-25-S403.json -->
# S403 preservation-safe ledger rotation

Session Intent: /arc then authorized direct main commit/push and full deploy.

Wave 1: Startup and fresh nine-axis audit.
Wave 2: session-ledger-rotation at L2. Done: Session-first and date-first dated entries rotate oldest-first; undated sections and complete recent entries stay hot; Unicode sizes use UTF-8 bytes; real CLI fixtures preserve the exact preimage, archive every removed complete block, refuse conflicting archives, and rerun idempotently. Full source checks and authorized staging/production acceptance remain required.
Wave 3: Full source checks, current staging, exact-candidate checks and normal full production readback.
Wave 4: Canonical closeout, independent review, Ark, remote/native completion.

Rollback: revert bounded rotator changes; immutable full preimages preserve historical source bytes. Deploy prior accepted production candidate if runtime release regresses. No identity or public policy changes.
