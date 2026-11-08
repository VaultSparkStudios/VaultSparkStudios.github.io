<!-- Session 411 · source: docs/AUDIT_2026-11-08-S411.json -->
# S411 recovery: private packaging and header fit

Existing QA source is pushed and static staging verified; full release and the native invocation's fresh arc remain pending.

## Outcome 4: private-staging-packaging — depth L2

Reuse lib/served-surface.mjs in full staging safeManifest; exclude compiled/operator portfolio data in the positive manifest; preserve public discovery and docs/visual-proof. Keep rollback directories private. Add native regressions that fail before the fix and verify denied operational paths after the next deployment.

User outcome: Operational state stays private while the website and advertised discovery remain available.

Acceptance: Native packaging/pruning regressions fail before and pass after; real advertised routes survive; staged operational URLs deny access and public page/API/discovery return200; no private contents, auth policy, identity provider or membership tier changes.

Rollback: revert the focused source change; preserve privacy containment until replacement deployment verifies exclusions.

## Outcome 5: stable-header-visual-state — depth L2

Tighten desktop-only top-level nav/control spacing and mirror critical-shell producer. Preserve typography, controls and mobile layout. Set an explicit neutral pointer before visual snapshots; retain public genome hover behavior. Verify geometry, inspect real before/after images, capture/review Linux baselines without loosening tolerance.

User outcome: Every header control remains visible and clickable across supported desktop themes; visual comparisons describe the intended neutral entry state.

Acceptance: Reproduce container overflow before repair; pass desktop1280/1366 all7themes and mobile390 parity; inspect actual images; Linux and Windows visual baselines reviewed before acceptance. No control removed and snapshot tolerance remains1.5%.

Rollback: revert the focused source change; preserve privacy containment until replacement deployment verifies exclusions.

Wave1 recovery QA publication and static staging complete. Wave2 selected fixes in progress after admission. Wave3 exact CI/account acceptance and main/production pending. Wave4 full closeout and this native invocation's fresh arc remain pending.

Execution note, November 8: direct before-image inspection and a browser contrast regression confirmed that the anonymous rank cue and hover tooltip are unreadable in light mode. Outcome 5 includes semantic palette overrides in the already selected stylesheet and critical-shell producer, preserving dimensions and identity behavior. The pre-fix contrast regression failed; current acceptance remains pending.
