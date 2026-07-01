# Genius Hit List — Session 244

Generated: 2026-07-01
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **80/100**
- Health: **green**
- Current SIL: **999/500**
- CI health: **all-green ✓**
- Current focus: S244 /arc closeout continuation: S243 was already pushed; GitHub Pages deployment for b432904c succeeded; CI beacon is all-green; production Cloudflare Worker redeployed as 77123fa5-6f33-4995-9a9e-c4c9bebd8299; npm run build, build:check, smoke:live, verify:headers all EXIT 0; doctor blockingFailing 0.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Status-proof proof text extension
Final score: **93**
[TRUST/P1] Status-proof proof text extension — consider surfacing the exact oldest feed/recovery hint in an agent-readable detail view without crowding homepage copy.
Why it matters: Status-proof proof text extension is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Closeout brief renderer restore
Final score: **90**
[SIL][OPS/P1] Closeout brief renderer restore — restore or delegate scripts/render-closeout-brief.mjs so future closeouts can render the mandatory impact brief locally.
Why it matters: Closeout brief renderer restore is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Arc profile slug mapping fix
Final score: **87**
[SIL][OPS/P1] Arc profile slug mapping fix — fix arc-profile.mjs registry matching for VaultSparkStudios.github.io / vaultsparkstudios-website so the repo profiles as website/public-live/SPARKED.
Why it matters: Arc profile slug mapping fix is open, local, and unblocked — can ship this session.

#### 4. [VERIFY] Homepage synthetic Lighthouse floor
Final score: **86**
[PERF/P1] Homepage synthetic Lighthouse floor — investigate current local-preview homepage perf floor once field/prod signals justify action; avoid tuning to a single runner sample.
Why it matters: Homepage synthetic Lighthouse floor is a 244-session-old carry-forward; verify or close it so it stops polluting the hit list.

First command: `npm run build:check && node scripts/csp-audit.mjs`

### NEXT

#### 1. [COHESION] Provision verifier capability and bridge design
Final score: **86**
[OBELISK/P0] Provision verifier capability and bridge design — after OBELISK_VERIFY_SECRET/endpoint contract is available via secrets gateway, activate the positive verification path and design the Supabase JWT/RLS bridge.
Why it matters: Provision verifier capability and bridge design is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 2. [PRODUCT] INP root-fix when field data lands
Final score: **84**
[SIL][PERF/P1] INP root-fix when field data lands — implement only after data/inp-breakdown.json has real route/handler evidence.
Why it matters: INP root-fix when field data lands is open, local, and unblocked — can ship this session.

#### 3. [COHESION] Obelisk posture tile
Final score: **80**
[TRUTH/P1] Obelisk posture tile — render phase-0/verifier-route-present/bridge-gated status on a public trust surface without overclaiming.
Why it matters: Obelisk posture tile is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.

First command: `node scripts/generate-public-intelligence.mjs`

#### 4. [PRODUCT] Soak VSIdentity on smallest protected surface
Final score: **78**
[OBELISK/P1] Soak VSIdentity on smallest protected surface — likely investor login before full Vault Member portal migration.
Why it matters: Soak VSIdentity on smallest protected surface is open, local, and unblocked — can ship this session.

#### 5. [PRODUCT] Authoritative heartbeat replacement design
Final score: **72**
[TRUTH/P1] Authoritative heartbeat replacement design — restore a public heartbeat-like homepage surface only if it derives from a self-validating, authoritative feed with visible provenance.
Why it matters: Authoritative heartbeat replacement design is open, local, and unblocked — can ship this session.

### LATER

#### 1. [PRODUCT] Ark signature failure resolution
Final score: **69**
[OPS/P2] Ark signature failure resolution — studio-ops should reconcile ark.hmac.seed / fleet ARK_HMAC_SEED; website repo should keep shipping cargo, not editing sibling trees.
Why it matters: Ark signature failure resolution is open, local, and unblocked — can ship this session.

#### 2. [BRAND] Forge Window naming
Final score: **66**
[BRAND/FOUNDER] Forge Window naming — rename "Studio Pulse"→"Forge Window" across 108 public pages is a founder-gated public-vocabulary change (keep /studio-pulse/ URL for SEO). Needs sign-off on the public name.
Why it matters: Forge Window naming affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 3. [PRODUCT] First real push notification
Final score: **63**
[PUSH/P1·FOUNDER] First real push notification — npm run push:count (0 subs today) → npm run push:notify -- --game cod (founder go-ahead required).
Why it matters: First real push notification is open, local, and unblocked — can ship this session.

## Recommended Build Order

1. Status-proof proof text extension
2. Closeout brief renderer restore
3. Arc profile slug mapping fix
4. Homepage synthetic Lighthouse floor
5. Provision verifier capability and bridge design
6. INP root-fix when field data lands
7. Obelisk posture tile
8. Soak VSIdentity on smallest protected surface
9. Authoritative heartbeat replacement design
10. Ark signature failure resolution
11. Forge Window naming
12. First real push notification

## Best Immediate Move

CI is all-green. Focus on the top unblocked implementation item above, then rerun this generator after shipping.
