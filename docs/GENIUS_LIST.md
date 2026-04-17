# Genius Hit List — Session 89

Generated: 2026-04-17
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **87/100**
- Health: **green**
- Current SIL: **481/500**
- Current focus: Session 89 closed: Full CI recovery (Lighthouse, SEO, E2E all green). Gzip added to preview server; letterForge keyframe made compositor-safe; 76KB→4KB nav icon; CI status beacon live; trust-depth extended to join/invite; HTTP smoke tier and contract validation gate added to build:check.

## Strategic Read

## Session Intent: Session 89 Recover Lighthouse CI thresholds from real local-preview scores (homepage performance 0.56 vs 0.85, SEO 0.93 vs 0.95). Practical scope expanded to full CI release-confidence recovery plus trust-layer extensions and DX tooling. ## Where We Left Off (Session 89 — detail) - Lighthouse CI fully recovered: Homepage performance 0.56 → 0.80+; SEO 0.93 → 1.0. Root causes found via LHR JSON artifact analysis: (1) letterForge keyframe animated text-shadow + filter:blur — non-compositable, caused

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 2. [COHESION] Social Dashboard bidirectional mirror
Final score: **89**
[S90][COHESION] Social Dashboard bidirectional mirror — implement the cross-repo normalized activity feed mirror path. Requires cross-repo write confirmation. Social Dashboard repo present locally at ../vaultspark-social-dashboard. [DEFERRED — needs founder confirm before cross-repo write]
Why it matters: Shared bridge work compounds across Website, Studio Hub, and Social Dashboard instead of improving one page in isolation.

First command: `node scripts/generate-public-intelligence.mjs`

#### 3. [VERIFY] Watch first post-push Lighthouse + playwright-axe runs
Final score: **87**
[SIL] Watch first post-push Lighthouse + playwright-axe runs — heavier pulse page + animated gradients; verify tightened S82/S83 budgets still hold.
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [VERIFY] Watch first post-push Lighthouse run
Final score: **87**
[SIL] Watch first post-push Lighthouse run — S82+S83+S84 combined pressure on tightened budgets + new local-preview + staging dual-URL gate. Iterate once if red.
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [VERIFY] Watch first post-push playwright-axe run
Final score: **87**
[SIL] Watch first post-push playwright-axe run — local-preview migration path.
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Lighthouse budget tightening in CI
Final score: **87**
[S80][PERF] Lighthouse budget tightening in CI — Performance ≥0.85, A11y ≥0.95, Best Practices ≥0.90, SEO ≥0.95.
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [VERIFY] Web push test
Final score: **87**
Web push test — subscribe in portal, upload classified file, verify notification received
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [BRAND] Forge Window naming decision
Final score: **86**
Decide whether navigation should say Studio Pulse or Forge Window while preserving /studio-pulse/ for SEO.
Why it matters: The page experience changed; navigation language needs founder sign-off before public vocabulary changes.

#### 5. [VERIFY] A11y artifact triage helper
Final score: **85**
[SIL] A11y artifact triage helper — script that parses axe/Lighthouse CI JSON artifacts and maps failures to shared CSS/template owners. S89 brainstorm item.
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### LATER

#### 1. [SECURITY] Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Workers Scripts: Edit + Zone: Read permissions.
Final score: **84**
[CF-WORKER-TOKEN] Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Workers Scripts: Edit + Zone: Read permissions.
Why it matters: Security cleanup lowers operational risk without changing public promises or membership logic.

First command: `node scripts/lint-repo.mjs`

#### 2. [SECURITY] Cloudflare WAF rule (CN/RU/HK)
Final score: **84**
Cloudflare WAF rule (CN/RU/HK) — JS Challenge firewall rule; requires API token with Zone / Firewall Services / Edit + Zone / Zone / Read; or Studio Owner can create in dashboard [human action / provide token]
Why it matters: Security cleanup lowers operational risk without changing public promises or membership logic.

First command: `node scripts/lint-repo.mjs`

#### 3. [SECURITY] Add CF_WORKER_API_TOKEN to GitHub Actions secrets so Worker deploys stop depending on local Wrangler auth.
Final score: **84**
[CF-WORKER-TOKEN] Add CF_WORKER_API_TOKEN to GitHub Actions secrets so Worker deploys stop depending on local Wrangler auth.
Why it matters: Security cleanup lowers operational risk without changing public promises or membership logic.

First command: `node scripts/lint-repo.mjs`

## Recommended Build Order

1. Post-push CI confirmation
2. Social Dashboard bidirectional mirror
3. Watch first post-push Lighthouse + playwright-axe runs
4. Watch first post-push Lighthouse run
5. Watch first post-push playwright-axe run
6. Lighthouse budget tightening in CI
7. Web push test
8. Forge Window naming decision
9. A11y artifact triage helper
10. Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Workers Scripts: Edit + Zone: Read permissions.
11. Cloudflare WAF rule (CN/RU/HK)
12. Add CF_WORKER_API_TOKEN to GitHub Actions secrets so Worker deploys stop depending on local Wrangler auth.

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
