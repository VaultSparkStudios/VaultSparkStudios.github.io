# Genius Hit List — Session 90

Generated: 2026-04-17
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **85/100**
- Health: **green**
- Current SIL: **466/500**
- CI health: **all-green ✓**
- Current focus: Session 90 closed: DX sprint + founder-action sweep. A11y triage helper, HTTP smoke pre-gate in CI, CI-aware Genius List filtering. CF_WORKER_API_TOKEN set (Worker auto-deploy now enabled). Cloudflare vaultspark-deploy token expanded with KV Storage Write. Annual Stripe prices created and checkout activated — annual billing live on /vaultsparked/.

## Strategic Read

## Session Intent: Session 90 User ran /go → DX sprint; then directed "do all founder items with elevated access." Executed all automatable founder items: CF_WORKER_API_TOKEN to GitHub Actions, Cloudflare vaultspark-deploy token expanded (KV Storage Write added), annual Stripe prices created and wired into checkout edge function. Annual billing is now live on /vaultsparked/. PAT revocation left open — user decision. ## Where We Left Off (Session 90 — detail) - A11y artifact triage helper shipped: scripts/triage-a11

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Verify annual checkout end-to-end
Final score: **93**
[FOLLOWUP] Verify annual checkout end-to-end — test the annual billing toggle → checkout → Stripe → portal flow against staging. Annual prices are live but the path hasn't been browser-tested yet.
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [COHESION] Social Dashboard bidirectional mirror
Final score: **89**
[S90][COHESION] Social Dashboard bidirectional mirror — implement the cross-repo normalized activity feed mirror path. Requires cross-repo write confirmation. Social Dashboard repo present locally at ../vaultspark-social-dashboard. [DEFERRED — awaiting founder confirm before cross-repo write]
Why it matters: Shared bridge work compounds across Website, Studio Hub, and Social Dashboard instead of improving one page in isolation.

First command: `node scripts/generate-public-intelligence.mjs`

#### 3. [VERIFY] Web push test
Final score: **87**
Web push test — subscribe in portal, upload classified file, verify notification received
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [BRAND] Forge Window naming decision
Final score: **86**
Decide whether navigation should say Studio Pulse or Forge Window while preserving /studio-pulse/ for SEO.
Why it matters: The page experience changed; navigation language needs founder sign-off before public vocabulary changes.

### NEXT

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

#### 4. [SECURITY] Confirm Cloudflare WAF JS Challenge rule for CN/RU/HK is active in dashboard (or provide API token)
Final score: **84**
[WAF] Confirm Cloudflare WAF JS Challenge rule for CN/RU/HK is active in dashboard (or provide API token)
Why it matters: Security cleanup lowers operational risk without changing public promises or membership logic.

First command: `node scripts/lint-repo.mjs`

#### 5. [SECURITY] Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Cloudflare API token with Workers Scripts: Edit + Zone: Read permissions (different from CF_API_TOKEN which is cache-purge only). Once set, every cloudflare/ push auto-deploys the Worker.
Final score: **84**
[CF-WORKER-TOKEN] Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Cloudflare API token with Workers Scripts: Edit + Zone: Read permissions (different from CF_API_TOKEN which is cache-purge only). Once set, every cloudflare/ push auto-deploys the Worker.
Why it matters: Security cleanup lowers operational risk without changing public promises or membership logic.

First command: `node scripts/lint-repo.mjs`

### LATER

#### 1. [BRAND] Forge Window nav rename
Final score: **81**
[FOLLOWUP] Forge Window nav rename — rename "Studio Pulse" nav label to "Forge Window" sitewide via propagate-nav.mjs. URL stays /studio-pulse/ for SEO. [PENDING brand sign-off]
Why it matters: Naming and voice polish should keep user-facing surfaces player-readable while preserving the public URL contract.

#### 2. [SECURITY] Revoke compromised classic PAT at https://github.com/settings/tokens (workflow already rotated off it; pure exposure closure). Requires browser + 2FA
Final score: **80**
[FOUNDER ACTION — SECURITY] Revoke compromised classic PAT at https://github.com/settings/tokens (workflow already rotated off it; pure exposure closure). Requires browser + 2FA — not API-automatable.
Why it matters: Security cleanup lowers operational risk without changing public promises or membership logic.

First command: `node scripts/lint-repo.mjs`

#### 3. [AI] "Ask IGNIS" public concierge
Final score: **80**
[S80][AI] "Ask IGNIS" public concierge — Claude-powered chat widget via Supabase edge function answering "which game?" / "what's new?" / "what's Vault?". Rate-limit + prompt cache. Signature AI moment.
Why it matters: AI surfaces should remain grounded in public intelligence and bounded by the Vault Oracle contract.

First command: `node scripts/generate-public-intelligence.mjs`

## Recommended Build Order

1. Verify annual checkout end-to-end
2. Social Dashboard bidirectional mirror
3. Web push test
4. Forge Window naming decision
5. Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Workers Scripts: Edit + Zone: Read permissions.
6. Cloudflare WAF rule (CN/RU/HK)
7. Add CF_WORKER_API_TOKEN to GitHub Actions secrets so Worker deploys stop depending on local Wrangler auth.
8. Confirm Cloudflare WAF JS Challenge rule for CN/RU/HK is active in dashboard (or provide API token)
9. Add CF_WORKER_API_TOKEN secret to GitHub repo → Settings → Secrets → Actions. Needs Cloudflare API token with Workers Scripts: Edit + Zone: Read permissions (different from CF_API_TOKEN which is cache-purge only). Once set, every cloudflare/ push auto-deploys the Worker.
10. Forge Window nav rename
11. Revoke compromised classic PAT at https://github.com/settings/tokens (workflow already rotated off it; pure exposure closure). Requires browser + 2FA
12. "Ask IGNIS" public concierge

## Best Immediate Move

CI is all-green. Focus on the top unblocked implementation item above, then rerun this generator after shipping.
