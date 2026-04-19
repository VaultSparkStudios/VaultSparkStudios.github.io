# Genius Hit List — Session 92

Generated: 2026-04-18
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **81/100**
- Health: **green**
- Current SIL: **486/500**
- CI health: **all-green ✓**
- Current focus: Session 92 /go pass complete: local website improvements shipped across Genius List quality, contract verification, cross-surface cohesion, push intelligence, and changelog UX. Remaining top items are browser, founder, canon, credential, or cross-repo gated.

## Strategic Read

## Session Intent: Session 92 User asked for a full website audit/plan, then /go, then closeout. Outcome: Achieved for all local, non-gated implementation work. Remaining top items are browser, founder, canon, credential, or cross-repo gated. ## What Changed - Genius List made useful again: scripts/generate-genius-list.mjs now emits valid --json, suppresses stale resolved carry-forwards, and canonicali

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Verify annual checkout end-to-end
Final score: **93**
[FOLLOWUP] Verify annual checkout end-to-end — test the annual billing toggle → checkout → Stripe → portal flow against staging. Annual prices are live but the path hasn't been browser-tested yet. S92 local guard: npm run verify:annual-checkout now verifies annual UI plan keys, edge price IDs, success URLs, and public copy; browser Stripe redirect remains open.
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 2. [COHESION] Social Dashboard bidirectional mirror
Final score: **89**
[S90][COHESION] Social Dashboard bidirectional mirror — implement the cross-repo normalized activity feed mirror path. Requires cross-repo write confirmation. Social Dashboard repo present locally at ../vaultspark-social-dashboard. [DEFERRED — awaiting founder confirm before cross-repo write] — S92 website-side partial: website-public, hub, and social-dashboard contracts now expose normalizedActivity schema/empty payload; producer-side Social Dashboard write remains gated.
Why it matters: Shared bridge work compounds across Website, Studio Hub, and Social Dashboard instead of improving one page in isolation.

First command: `node scripts/generate-public-intelligence.mjs`

#### 3. [VERIFY] Web push test
Final score: **87**
Web push test — subscribe in portal, upload classified file, verify notification received. S92 local guard: npm run verify:push-contract now verifies portal opt-in, service worker receipt, send-push edge route, stale subscription cleanup, and public prompt wiring; real browser notification receipt remains open.
Why it matters: Release confidence is the highest leverage surface because red gates turn every later improvement into uncertain work.

First command: `npm run build:check && node scripts/csp-audit.mjs`

#### 4. [BRAND] Forge Window naming decision
Final score: **86**
Decide whether navigation should say Studio Pulse or Forge Window while preserving /studio-pulse/ for SEO.
Why it matters: The page experience changed; navigation language needs founder sign-off before public vocabulary changes.

### NEXT

#### 1. [SECURITY] Cloudflare WAF rule (CN/RU/HK)
Final score: **84**
Cloudflare WAF rule (CN/RU/HK) — JS Challenge firewall rule; requires API token with Zone / Firewall Services / Edit + Zone / Zone / Read; or Studio Owner can create in dashboard [human action / provide token]
Why it matters: Security cleanup lowers operational risk without changing public promises or membership logic.

First command: `node scripts/lint-repo.mjs`

#### 2. [BRAND] Forge Window nav rename
Final score: **81**
[FOLLOWUP] Forge Window nav rename — rename "Studio Pulse" nav label to "Forge Window" sitewide via propagate-nav.mjs. URL stays /studio-pulse/ for SEO. [PENDING brand sign-off]
Why it matters: Naming and voice polish should keep user-facing surfaces player-readable while preserving the public URL contract.

#### 3. [SECURITY] Revoke compromised classic PAT at https://github.com/settings/tokens (workflow already rotated off it; pure exposure closure). Requires browser + 2FA
Final score: **80**
[FOUNDER ACTION — SECURITY] Revoke compromised classic PAT at https://github.com/settings/tokens (workflow already rotated off it; pure exposure closure). Requires browser + 2FA — not API-automatable.
Why it matters: Security cleanup lowers operational risk without changing public promises or membership logic.

First command: `node scripts/lint-repo.mjs`

#### 4. [PRODUCT] Names for sealed initiatives (12 remaining)
Final score: **77**
[FOLLOWUP] Names for sealed initiatives (12 remaining) — when a sealed project gets a public name + vault status, it auto-promotes from the sealed count to a named catalog tile.
Why it matters: This task is open, local, and connected to the current project state.

#### 5. [PRODUCT] Resolve ETERNAL tier vocabulary
Final score: **75**
[S80][BRAND] Resolve ETERNAL tier vocabulary — either fold into SPARKED or document as 4th canonical state (CANON decision).
Why it matters: This task is open, local, and connected to the current project state.

### LATER

#### 1. [PRODUCT] Investor AI Q&A
Final score: **74**
[S80][AI] Investor AI Q&A — Claude + retrieval over approved investor docs. Replaces half the "Ask the Founders" queue.
Why it matters: This task is open, local, and connected to the current project state.

#### 2. [PRODUCT] Per-form Web3Forms keys
Final score: **74**
Per-form Web3Forms keys — create 3 separate keys in Web3Forms dashboard (join/, contact/, data-deletion/) for per-form lead tracking; update access_key values in each HTML [low priority]
Why it matters: This task is open, local, and connected to the current project state.

#### 3. [PRODUCT] Web3Forms browser test
Final score: **74**
Web3Forms browser test — manually submit /join/ and /contact/ to confirm email delivery to inbox [human action]
Why it matters: This task is open, local, and connected to the current project state.

## Recommended Build Order

1. Verify annual checkout end-to-end
2. Social Dashboard bidirectional mirror
3. Web push test
4. Forge Window naming decision
5. Cloudflare WAF rule (CN/RU/HK)
6. Forge Window nav rename
7. Revoke compromised classic PAT at https://github.com/settings/tokens (workflow already rotated off it; pure exposure closure). Requires browser + 2FA
8. Names for sealed initiatives (12 remaining)
9. Resolve ETERNAL tier vocabulary
10. Investor AI Q&A
11. Per-form Web3Forms keys
12. Web3Forms browser test

## Best Immediate Move

CI is all-green. Focus on the top unblocked implementation item above, then rerun this generator after shipping.
