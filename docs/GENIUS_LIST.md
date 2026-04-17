# Genius Hit List — Session 89

Generated: 2026-04-17
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **84/100**
- Health: **green**
- Current SIL: **481/500**
- CI health: **all-green ✓**
- Current focus: Session 89 closed: Full CI recovery (Lighthouse, SEO, E2E all green). Gzip added to preview server; letterForge keyframe made compositor-safe; 76KB→4KB nav icon; CI status beacon live; trust-depth extended to join/invite; HTTP smoke tier and contract validation gate added to build:check.

## Strategic Read

## Session Intent: Session 89 Recover Lighthouse CI thresholds from real local-preview scores (homepage performance 0.56 vs 0.85, SEO 0.93 vs 0.95). Practical scope expanded to full CI release-confidence recovery plus trust-layer extensions and DX tooling. ## Where We Left Off (Session 89 — detail) - Lighthouse CI fully recovered: Homepage performance 0.56 → 0.80+; SEO 0.93 → 1.0. Root causes found via LHR JSON artifact analysis: (1) letterForge keyframe animated text-shadow + filter:blur — non-compositable, caused

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [COHESION] Social Dashboard bidirectional mirror
Final score: **89**
[S90][COHESION] Social Dashboard bidirectional mirror — implement the cross-repo normalized activity feed mirror path. Requires cross-repo write confirmation. Social Dashboard repo present locally at ../vaultspark-social-dashboard. [DEFERRED — needs founder confirm before cross-repo write]
Why it matters: Shared bridge work compounds across Website, Studio Hub, and Social Dashboard instead of improving one page in isolation.

First command: `node scripts/generate-public-intelligence.mjs`

#### 2. [VERIFY] Web push test
Final score: **87**
Web push test — subscribe in portal, upload classified file, verify notification received
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 3. [BRAND] Forge Window naming decision
Final score: **86**
Decide whether navigation should say Studio Pulse or Forge Window while preserving /studio-pulse/ for SEO.
Why it matters: The page experience changed; navigation language needs founder sign-off before public vocabulary changes.

#### 4. [SECURITY] Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Workers Scripts: Edit + Zone: Read permissions.
Final score: **84**
[CF-WORKER-TOKEN] Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Workers Scripts: Edit + Zone: Read permissions.
Why it matters: Security cleanup lowers operational risk without changing public promises or membership logic.

First command: `node scripts/lint-repo.mjs`

### NEXT

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

#### 4. [SECURITY] Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Cloudflare API token with Workers Scripts: Edit + Zone: Read permissions (different from CF_API_TOKEN which is cache-purge only). Once set, every cloudflare/ push auto-deploys the Worker.
Final score: **84**
[CF-WORKER-TOKEN] Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Cloudflare API token with Workers Scripts: Edit + Zone: Read permissions (different from CF_API_TOKEN which is cache-purge only). Once set, every cloudflare/ push auto-deploys the Worker.
Why it matters: Security cleanup lowers operational risk without changing public promises or membership logic.

First command: `node scripts/lint-repo.mjs`

#### 5. [SECURITY] Revoke compromised classic PAT at https://github.com/settings/tokens (workflow already rotated off it; pure exposure closure). Requires browser + 2FA
Final score: **82**
[FOUNDER ACTION — SECURITY] Revoke compromised classic PAT at https://github.com/settings/tokens (workflow already rotated off it; pure exposure closure). Requires browser + 2FA — not API-automatable.
Why it matters: Security cleanup lowers operational risk without changing public promises or membership logic.

First command: `node scripts/lint-repo.mjs`

### LATER

#### 1. [AI] "Ask IGNIS" public concierge
Final score: **80**
[S80][AI] "Ask IGNIS" public concierge — Claude-powered chat widget via Supabase edge function answering "which game?" / "what's new?" / "what's Vault?". Rate-limit + prompt cache. Signature AI moment.
Why it matters: AI surfaces should remain grounded in public intelligence and bounded by the Vault Oracle contract.

First command: `node scripts/generate-public-intelligence.mjs`

#### 2. [AI] Ask IGNIS concierge
Final score: **80**
[SIL] Ask IGNIS concierge — Claude-powered public chat widget answering "which game?" / "what's new?" / "what's Vault?". Rate-limited via existing Supabase edge function pattern; uses public-intelligence.json as context. High probability (1-session scope).
Why it matters: AI surfaces should remain grounded in public intelligence and bounded by the Vault Oracle contract.

First command: `node scripts/generate-public-intelligence.mjs`

#### 3. [INTELLIGENCE] Extend proof/depth beyond the three core pages
Final score: **80**
[GENIUS][CONVERSION] Extend proof/depth beyond the three core pages — carry the stronger trust language into join/invite or other high-intent public entry routes if the next session stays conversion-focused.
Why it matters: Keeping the ranked audit fresh prevents the site from sliding back into piecemeal iteration.

First command: `node scripts/generate-genius-list.mjs`

## Recommended Build Order

1. Social Dashboard bidirectional mirror
2. Web push test
3. Forge Window naming decision
4. Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Workers Scripts: Edit + Zone: Read permissions.
5. Cloudflare WAF rule (CN/RU/HK)
6. Add CF_WORKER_API_TOKEN to GitHub Actions secrets so Worker deploys stop depending on local Wrangler auth.
7. Confirm Cloudflare WAF JS Challenge rule for CN/RU/HK is active in dashboard (or provide API token)
8. Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Cloudflare API token with Workers Scripts: Edit + Zone: Read permissions (different from CF_API_TOKEN which is cache-purge only). Once set, every cloudflare/ push auto-deploys the Worker.
9. Revoke compromised classic PAT at https://github.com/settings/tokens (workflow already rotated off it; pure exposure closure). Requires browser + 2FA
10. "Ask IGNIS" public concierge
11. Ask IGNIS concierge
12. Extend proof/depth beyond the three core pages

## Best Immediate Move

CI is all-green. Focus on the top unblocked implementation item above, then rerun this generator after shipping.
