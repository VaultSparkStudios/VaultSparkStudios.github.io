# Genius Hit List — Session 88

Generated: 2026-04-17
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **87/100**
- Health: **green**
- Current SIL: **476/500**
- Current focus: Session 88 in progress: Genius/verification wave implemented against the S87 CI failures. E2E browser gates now run against local preview (scripts/local-preview-server.mjs at 127.0.0.1:4173) instead of Cloudflare-fronted production, removing the GitHub Actions managed-challenge failure class. Shared footer contrast and labeled-container ARIA roles were hardened; canonical footer template propagated; shell regenerated to assets/style.shell-93fad06736.css with sw.js/cache manifest updated. Scheduled Genius refresh now exists via scripts/generate-genius-list.mjs and npm run genius:list; docs/GENIUS_LIST.md has been regenerated from current repo truth. Non-browser verification is green: build:check, csp-audit, propagate-nav syntax, and local preview HTTP smoke.

## Strategic Read

## Session Intent: Session 88 Implement all Genius Hit List items at the highest/optimal quality. Practical scope for this session focused on the highest-impact unblocked item from current repo truth: recover the S87 release gates by fixing CI route selection and shared accessibility regressions. ## Where We Are (Session 88 — in progress) - Implemented CI recovery wave: .github/workflows/e2e.yml now runs required browser gates against scripts/local-preview-server.mjs on 127.0.0.1:4173 instead of Cloudflare-fronted

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 2. [VERIFY] Watch first post-push Lighthouse + playwright-axe runs
Final score: **88**
[SIL] Watch first post-push Lighthouse + playwright-axe runs — heavier pulse page + animated gradients; verify tightened S82/S83 budgets still hold.
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [VERIFY] Watch first post-push Lighthouse run
Final score: **87**
[SIL] Watch first post-push Lighthouse run — S82+S83+S84 combined pressure on tightened budgets + new local-preview + staging dual-URL gate. Iterate once if red.
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [VERIFY] Watch first post-push playwright-axe run
Final score: **87**
[SIL] Watch first post-push playwright-axe run — local-preview migration path.
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [VERIFY] Lighthouse budget tightening in CI
Final score: **87**
[S80][PERF] Lighthouse budget tightening in CI — Performance ≥0.85, A11y ≥0.95, Best Practices ≥0.90, SEO ≥0.95.
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Web push test
Final score: **87**
Web push test — subscribe in portal, upload classified file, verify notification received
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [BRAND] Forge Window naming decision
Final score: **86**
Decide whether navigation should say Studio Pulse or Forge Window while preserving /studio-pulse/ for SEO.
Why it matters: The page experience changed; navigation language needs founder sign-off before public vocabulary changes.

#### 4. [COHESION] Social Dashboard bidirectional mirror
Final score: **85**
[FOLLOWUP] Social Dashboard bidirectional mirror — needs cross-repo work (normalized activity feed exposure on Social Dashboard side + pull here).
Why it matters: Shared bridge work compounds across Website, Studio Hub, and Social Dashboard instead of improving one page in isolation.

First command: `node scripts/generate-public-intelligence.mjs`

#### 5. [SECURITY] Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Workers Scripts: Edit + Zone: Read permissions.
Final score: **84**
[CF-WORKER-TOKEN] Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Workers Scripts: Edit + Zone: Read permissions.
Why it matters: Security cleanup lowers operational risk without changing public promises or membership logic.

First command: `node scripts/lint-repo.mjs`

### LATER

#### 1. [SECURITY] Cloudflare WAF rule (CN/RU/HK)
Final score: **84**
Cloudflare WAF rule (CN/RU/HK) — JS Challenge firewall rule; requires API token with Zone / Firewall Services / Edit + Zone / Zone / Read; or Studio Owner can create in dashboard [human action / provide token]
Why it matters: Security cleanup lowers operational risk without changing public promises or membership logic.

First command: `node scripts/lint-repo.mjs`

#### 2. [SECURITY] Add CF_WORKER_API_TOKEN to GitHub Actions secrets so Worker deploys stop depending on local Wrangler auth.
Final score: **84**
[CF-WORKER-TOKEN] Add CF_WORKER_API_TOKEN to GitHub Actions secrets so Worker deploys stop depending on local Wrangler auth.
Why it matters: Security cleanup lowers operational risk without changing public promises or membership logic.

First command: `node scripts/lint-repo.mjs`

#### 3. [SECURITY] Confirm Cloudflare WAF JS Challenge rule for CN/RU/HK is active in dashboard (or provide API token)
Final score: **84**
[WAF] Confirm Cloudflare WAF JS Challenge rule for CN/RU/HK is active in dashboard (or provide API token)
Why it matters: Security cleanup lowers operational risk without changing public promises or membership logic.

First command: `node scripts/lint-repo.mjs`

## Recommended Build Order

1. Post-push CI confirmation
2. Watch first post-push Lighthouse + playwright-axe runs
3. Watch first post-push Lighthouse run
4. Watch first post-push playwright-axe run
5. Lighthouse budget tightening in CI
6. Web push test
7. Forge Window naming decision
8. Social Dashboard bidirectional mirror
9. Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Workers Scripts: Edit + Zone: Read permissions.
10. Cloudflare WAF rule (CN/RU/HK)
11. Add CF_WORKER_API_TOKEN to GitHub Actions secrets so Worker deploys stop depending on local Wrangler auth.
12. Confirm Cloudflare WAF JS Challenge rule for CN/RU/HK is active in dashboard (or provide API token)

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
