# S371 implementation plan

Selected depth: L2. Preserve the original checkout and unverified incoming propagation.

1. Bind automated Desk maintenance to exact commit receipts: Reuse routine-session-receipt.mjs; record each art and reseal commit with exact SHA/files before push, idempotently, and keep deployment proof separate.
   Acceptance: tests/s371-release-maintenance.unit.spec.mjs plus existing autopilot/writeback self-tests; independent diff review; staging smoke, candidate checks and production readback.

2. Measure write-back against the actual closeout anchor: Find the latest SIL commit by path and read its complete history through HEAD. Missing anchor or unreadable history stays nonpassing; test automation bursts exceeding sixty commits.
   Acceptance: tests/s371-release-maintenance.unit.spec.mjs plus existing autopilot/writeback self-tests; independent diff review; staging smoke, candidate checks and production readback.

3. Restrict Open Graph publication to writable main: Gate both push and manual dispatch to main and check out main with full history. Preserve generated-image publisher and its existing retry helper.
   Acceptance: tests/s371-release-maintenance.unit.spec.mjs plus existing autopilot/writeback self-tests; independent diff review; staging smoke, candidate checks and production readback.

4. Keep persona generation consistent after shell propagation: narrow line-edge formatting comparison on exact persona routes; substantive changes and other routes remain strict.
   Acceptance: focused regression cases, generated-news current, full build and unchanged runtime binding.

Wave 1: current-remote profile, canon and source audit. Wave 2: four fixes and independent review. Wave 3: staging, exact-candidate checks, production readback, records and closeout.
