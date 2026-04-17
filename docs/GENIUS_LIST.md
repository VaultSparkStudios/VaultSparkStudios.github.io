# Genius Hit List — Session 89

Generated: 2026-04-17
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **88/100**
- Health: **yellow**
- Current SIL: **478/500**
- Current focus: Session 88 closed: Genius/verification wave implemented against the S87 CI failures. E2E browser gates now run against local preview (scripts/local-preview-server.mjs at 127.0.0.1:4173) instead of Cloudflare-fronted production, removing the GitHub Actions managed-challenge failure class. Shared footer contrast, footer selector isolation, labeled-container ARIA roles, ranks list semantics, homepage skip target, leaderboard a11y test strict-mode, and the /vault-treasury/ route were hardened. Scheduled Genius refresh now exists via scripts/generate-genius-list.mjs and npm run genius:list; docs/GENIUS_LIST.md has been regenerated from current repo truth. Post-push GitHub Actions: E2E, Accessibility, Pages, Secret Lint, Sentry, Cache Purge, Minify, and Sitemap are green; Lighthouse is the only red gate.

## Strategic Read

## Session Intent: Session 88 Implement all Genius Hit List items at the highest/optimal quality. Practical scope for this session focused on the highest-impact unblocked item from current repo truth: recover the S87 release gates by fixing CI route selection and shared accessibility regressions. ## Where We Left Off (Session 88 — Genius/CI recovery) - Implemented CI recovery wave: .github/workflows/e2e.yml now runs required browser gates against scripts/local-preview-server.mjs on 127.0.0.1:4173 instead of Cloudfl

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 2. [VERIFY] Playwright sandbox fallback tier
Final score: **93**
[SIL] Playwright sandbox fallback tier — document and script an HTTP/DOM-only smoke tier for environments where browser process spawn/hangs make Playwright unusable. S89 brainstorm item.
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [COHESION] Social Dashboard bidirectional mirror
Final score: **89**
[S90][COHESION] Social Dashboard bidirectional mirror — implement the cross-repo normalized activity feed mirror path. Requires cross-repo write confirmation. Social Dashboard repo present locally at ../vaultspark-social-dashboard.
Why it matters: Shared bridge work compounds across Website, Studio Hub, and Social Dashboard instead of improving one page in isolation.

First command: `node scripts/generate-public-intelligence.mjs`

#### 4. [INTELLIGENCE] Extend proof/depth beyond the three core pages
Final score: **87**
[GENIUS][CONVERSION] Extend proof/depth beyond the three core pages — carry the stronger trust language and objection-handling from homepage/membership/VaultSparked into join/invite high-intent routes.
Why it matters: Keeping the ranked audit fresh prevents the site from sliding back into piecemeal iteration.

First command: `node scripts/generate-genius-list.mjs`

### NEXT

#### 1. [VERIFY] Watch first post-push Lighthouse + playwright-axe runs
Final score: **87**
[SIL] Watch first post-push Lighthouse + playwright-axe runs — heavier pulse page + animated gradients; verify tightened S82/S83 budgets still hold.
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [VERIFY] Watch first post-push Lighthouse run
Final score: **87**
[SIL] Watch first post-push Lighthouse run — S82+S83+S84 combined pressure on tightened budgets + new local-preview + staging dual-URL gate. Iterate once if red.
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [VERIFY] Watch first post-push playwright-axe run
Final score: **87**
[SIL] Watch first post-push playwright-axe run — local-preview migration path.
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [VERIFY] Lighthouse budget tightening in CI
Final score: **87**
[S80][PERF] Lighthouse budget tightening in CI — Performance ≥0.85, A11y ≥0.95, Best Practices ≥0.90, SEO ≥0.95.
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 5. [VERIFY] Web push test
Final score: **87**
Web push test — subscribe in portal, upload classified file, verify notification received
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### LATER

#### 1. [BRAND] Forge Window naming decision
Final score: **86**
Decide whether navigation should say Studio Pulse or Forge Window while preserving /studio-pulse/ for SEO.
Why it matters: The page experience changed; navigation language needs founder sign-off before public vocabulary changes.

#### 2. [SECURITY] Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Workers Scripts: Edit + Zone: Read permissions.
Final score: **84**
[CF-WORKER-TOKEN] Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Workers Scripts: Edit + Zone: Read permissions.
Why it matters: Security cleanup lowers operational risk without changing public promises or membership logic.

First command: `node scripts/lint-repo.mjs`

#### 3. [SECURITY] Cloudflare WAF rule (CN/RU/HK)
Final score: **84**
Cloudflare WAF rule (CN/RU/HK) — JS Challenge firewall rule; requires API token with Zone / Firewall Services / Edit + Zone / Zone / Read; or Studio Owner can create in dashboard [human action / provide token]
Why it matters: Security cleanup lowers operational risk without changing public promises or membership logic.

First command: `node scripts/lint-repo.mjs`

## Recommended Build Order

1. Post-push CI confirmation
2. Playwright sandbox fallback tier
3. Social Dashboard bidirectional mirror
4. Extend proof/depth beyond the three core pages
5. Watch first post-push Lighthouse + playwright-axe runs
6. Watch first post-push Lighthouse run
7. Watch first post-push playwright-axe run
8. Lighthouse budget tightening in CI
9. Web push test
10. Forge Window naming decision
11. Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Workers Scripts: Edit + Zone: Read permissions.
12. Cloudflare WAF rule (CN/RU/HK)

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
