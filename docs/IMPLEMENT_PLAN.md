<!-- generated-by: /implement skill v1.0 -->
<!-- generated-at: 2026-06-07 · audit: docs/AUDIT_2026-06-07.json -->

# Implement Plan — Session 176

Sequenced for optimal efficiency (Priority/hour), not raw priority.

| Wave | Items | Rationale |
|---|---|---|
| 1 | now-playing-orphan-kill → placeholder-sentinel-gate | Founder-visible bug first; the structural gate ships while the bug class is in context (fix + prevention in one batch) |
| 2 | field-verdict-refresh-readout | 30m data readout; informs whether Wave 3 edge work has a regression to chase |
| 3 | worker-stale-on-5xx → preload-prune | Same edge surface, single `wrangler deploy --env production` + one `_headers` regen batch |
| 4 | tt-sink-burndown-wave2 | Biggest single item (2h); six named sinks, one shell-bundle rebuild |
| 5 | uptime-probe-firstparty → rum-pull-conflict-guard → sil-integrity-clamp | Process/observability tail; Ark reply closes the studio-ops loop |

Skipped (evidence/founder-gated): tt-enforce-flip (soak to 06-12) · nav-sheet-default-swap (founder device verify) · vaultsparked-proof-delete (founder yes/no pending).
