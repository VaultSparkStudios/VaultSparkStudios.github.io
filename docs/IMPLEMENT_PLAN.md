<!-- Session 410 · source: docs/AUDIT_2026-11-04.json -->
# Make release verification deterministic and current

Fresh S410 selection: three L2 repairs. Prior S409 recovery does not satisfy this arc. Root owns all edits; independent reviewer is read-only.

## 1. reaction-fixture-order — L2
Replace the response sleep with a held promise. Assert the early click precedes handler installation, then release it; prove the live second click is delivered once before and after the late script completes.

User outcome: Readers receive predictable reactions; deterministic verification protects the existing click handoff without changing public behavior.
Acceptance: Run the actual after-paint browser file: queued A is superseded by live B, completion does not replay B, and a later normal click is handled once. Preserve the preceding two-bar latest-tap case.

## 2. browser-fixture-cleanup — L2
Use the existing Node recursive-removal retry options on this exact guarded fixture root. Retain origin/decoy assertions, process close waits, root guards and server cleanup. Keep terminal cleanup failures visible.

User outcome: Release checks continue to detect broken candidate destinations while tolerating short Windows file-handle release delays.
Acceptance: Run the real browser-collection unit file including broken-candidate and decoy mutation controls; require native exit0 and no fixture child remaining. No test retry or assertion removal.

## 3. startup-source-evidence — L2
Reuse build-check-evidence validation to resolve the latest native command receipt before rendering test claims. Preserve partial, failed, stale, malformed and missing evidence as nonpassing; use one reading in summary and signals. Qualify deployment from the active release record without treating local checks as promotion.

User outcome: The next operator can find the actual release state and remaining acceptance without being directed by a historical green badge.
Acceptance: Exercise complete green, partial failure, stale fingerprints, malformed/missing receipts and pending release against historical green fields. Render the actual brief and confirm every current-source/deployment claim agrees; keep historical records unchanged.

Wave1 startup/audit complete after admission; Wave2 selected implementation pending. Wave3 combined final-source/staging/account/hosted checks and Wave4 authorized main/production/readback/closeout pending. Preserve existing auth policy, failed receipts, publisher states and deployment authorization. No new UI styling or membership terms selected.

Rollback: revert only these scoped verification/reporting changes with a normal commit; previous full Pages/Worker versions remain available. No production claim before applicable gates pass.


### S410 hosted acceptance feedback

QA42ffd had three successful workflow conclusions but its allowed-failure E2E command failed34 public tests (625passed,56skipped). The release remains nonpassing. Required repairs harden executed-failure propagation, remove local dotenv loading, update the already-authorized member/investor test contracts, and capture actual theme/readiness before separately reviewed Linux baselines. Focused18unit,20navigation/pages and3unchanged Desk cases pass; eight visual-readiness combinations are stable. No public runtime change or pixel-tolerance increase. See docs/S410_hosted-attempt1.json and docs/S410_release-repair-progress.json. The original three audit outcomes and premise record are preserved; this is release feedback, not a new arc.
