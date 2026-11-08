<!-- S411-recovery-records -->
## S411 recovery checkpoint — 2026-11-06

Last completed Session410 remains historical. Session411 release and full closeout remain unfinished.

S411 recovery preserves the session-boundary repair, drawer visibility fix and explicit discussion initialization. Focused recovery regressions passed19/19 with no skips. Canonical integration and release acceptance remain in progress; historical source549/mobile215/visual742 evidence does not prove the integrated candidate. See docs/S411_recovery-2026-11-06.json and docs/S411_recovery-focused-tests.json.

Owner: website release implementer. Requested outcome: finish the integrated release, then perform the new founder invocation’s full arc. Dependency: exact candidate checks, current staging and affected authenticated journeys. Acceptance: actual passing results, deployment identity and served readback. Existing founder authorization permits direct main publication and deployment; it is not functional acceptance.

Fresh invocation association: native goal created1793988988, thread suffix611b5d9cbc66. Binding returned start-new-arc; no new session has been acquired or bound while recovery is underway. Run full startup after recovery and apply the native binding. Continuations resume this recovery first.

Where We Left Off: local tests19/19; deploy pending; integrated canonical build in progress. No new production deployment occurred during this checkpoint.

<!-- S411-active-arc -->
# Session 411 — in progress

Session 410 is the last completed closeout. Its record is historical; the current Session 411 arc and deployment remain unfinished.

Owner: Website release implementer. Requested outcome: publish the verified current candidate. Dependency: current-candidate checks and isolated account journeys. Acceptance: recorded hosted checks, staging/readback and production/readback.

The current full arc includes a fresh audit and the selected session-lock continuity fix. The audit is recorded in [AUDIT_2026-11-04-S411.json](../docs/AUDIT_2026-11-04-S411.json); implementation and its verification limits are recorded in [S411_implementation.json](../docs/S411_implementation.json). Earlier recovered work remains historical evidence and does not complete this invocation.

The selected lock fix keeps the session ID, start timestamp and starting commit consistent when retaining an existing lock; when a new start timestamp creates a new session, all three rotate together. It has focused regression coverage. The combined candidate also includes inherited account, navigation and interface changes whose release verification remains in scope.

Completed local evidence includes the native 26-step postbuild lifecycle and its ordering guards, 215 mobile runtime cases, 70 Windows visual-regression comparisons without updating expectations, and 644 manually inspected visual captures with scoped source continuity. The current visual composition is recorded in [visual-qa/LATEST.json](../docs/visual-qa/LATEST.json). The current Windows comparison is recorded in [visual-journal-final-compare.json](../docs/visual-qa/S411-companions/visual-journal-final-compare.json), with the changed Journal expectations inspected in [windows-journal-refresh-image-review.json](../docs/visual-qa/S411-companions/windows-journal-refresh-image-review.json). The canonical build refreshed generated data and the fallback day count. Its current 215-case mobile audit and70-case Windows comparison passed; hosted and release checks remain pending. These results describe their recorded source and platform; they do not establish hosted CI, Linux screenshot parity, real authenticated journeys or production acceptance.

The complete native549-step source pipeline passed fromstep1 with549passed andzero failures. The complete local549-step pass predates the manifest-only Wrangler4.90.0 pin and its decision record. The installed CLI and runtime artifact are unchanged. Exact final-commit hosted verification remains pending; the recorded source fingerprint is historical. Earlier receipt, brief, hashed-loader and handoff-reference failures remain documented in the release report. HostedCI, current staging, real authenticated journeys and production acceptance remain pending.

The last verified staging readback describes the earlier artifact root beginning `0fb8416931fc`, documented in [S411_staging-v2-readback.json](../docs/S411_staging-v2-readback.json). The current local candidate root begins `6c8bd23a262b` and has not been published as the current staging or production candidate. Historical staging evidence must not be treated as current-candidate acceptance.

Next, seal and verify the exact QA commit through required hosted checks, deploy and verify the current staging candidate, and complete real new-member/profile and approved-investor private-data journeys. Main publication and production promotion remain pending release requirements despite existing authorization. Production access policy remains unchanged.

No full closeout or completed release is claimed. [RELEASE_S411.json](../docs/RELEASE_S411.json) records the public technical release state.


Local release followup repairs the delayed membership bar covering an open mobile drawer and illustration discussions not initializing after explicit opening. Seven focused browser cases and26 comment unit cases passed. The742-primary-capture visual receipt preserves the earlier644 objects and retains147 new before plus147 new after originals. This development delivery candidate requires canonical integration/build, current hosted checks, isolated authenticated journeys, staging and production acceptance.
