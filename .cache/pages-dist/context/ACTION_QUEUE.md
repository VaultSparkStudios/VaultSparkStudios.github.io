<!-- generated-by: scripts/render-action-queue.mjs -->
<!-- generated-at: 2026-04-23 -->

# Action Queue

> Execution-first queue for this repo. Read this after the startup brief when you need the next concrete move.

## Execute Now (0)

- No unblocked local items found.

## Approved Automation (0)

- No founder-approved automation items ready to run.

## Try Before Escalating (4)

- **[WEB3FORMS] Test contact form from browser** — likely true human-only
  - Capability state: none mapped
  - Elevated/admin probe: No specific elevated-access probe known. Verify manually whether the agent has the right service/API/admin path before escalating.
- **[WAF] Confirm Cloudflare WAF JS Challenge rule for CN/RU/HK is active in dashboard** — likely true human-only
  - Capability state: none mapped
  - Elevated/admin probe: No specific elevated-access probe known. Verify manually whether the agent has the right service/API/admin path before escalating.
- **[BEACON] Run `node scripts/configure-beacon.mjs` in studio-ops → copy `.claude/beacon.env` here** — agent should attempt first
  - Capability state: github.org=MISSING
  - Elevated/admin probe: Probe GitHub org access and current repo state before treating this as human-only.
  - Probe commands: node scripts/ops.mjs check-secrets --for github.org  ·  node scripts/ops.mjs phantom-check
- **[WEB3FORMS-KEYS] Create 3 separate keys in Web3Forms dashboard (join/, contact/, data-deletion/) for per-form lead tracking [low priority]** — likely true human-only
  - Capability state: none mapped
  - Elevated/admin probe: No specific elevated-access probe known. Verify manually whether the agent has the right service/API/admin path before escalating.

## Advisory Drift (3)

- **validate** — portfolio-outdated
- **compliance-velocity** — portfolio-outdated
- **sibling-locks** — derived-stale