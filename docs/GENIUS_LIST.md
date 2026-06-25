# Genius Hit List — Session 220

Generated: 2026-06-25
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **83/100**
- Health: **green**
- Current SIL: **959/500**
- CI health: **check gh run list**
- Current focus: S220 (arc) — net-new visitor + agent-facing value at the genius bar, all gate-verified green. (1) Removed the obelisk-broker.mjs orphan: the untracked website copy was byte-identical (diff IDENTICAL) to the canonical studio-ops copy (its real home; imports ./secrets.mjs + portfolio/ paths), Ark-shipped S219, zero website consumers → deleted + pruned its check-orphan-libs allowlist entry (3→2). Closes the S183→S219 disposition carry (D-S220.1). (2) FLAGSHIP — enriched the hero-portfolio ItemList JSON-LD (build-hero-portfolio.mjs renderJsonLd): bare 4-prop schema → per-tile description/genre/image + VideoGame fields (applicationCategory/gamePlatform/operatingSystem) + sameAs to the real live destination (external product domains promogrind.bet/veilos.io + distinct playable builds), all derived from the committed feed (deterministic --check) + a </script>-breakout guard. Self-test 6→14. Live JSON-LD verified rich. SEO rich-result + AI-citation + CANON-048 dual-audience depth on the highest-traffic surface (D-S220.2). (3) SECOND-ORDER — IGNIS returning-visitor re-entry chip (ignis-answer-engine.js renderResumeChip): surfaces the otherwise-invisible prefix-cache (S206 #15) as a 'Pick up where you left off' chip for visitors with history (who previously saw no starters); reuses existing starter classes (style-contract safe) + the already-allowlisted oracle:starter_click: emit prefix. Honest rejections/deferrals: agents.json llmsFull for 4 external-domain projects = by-design (thin-content risk); light-mode CTA contrast = premise FALSE (~11:1 passes WCAG); MindFrame FORGE→SPARKED = founder-gated public promise. build:check EXIT 0 (verified directly), doctor blockingFailing 0 (3 advisory = sibling/portfolio), hero self-test 14/14, style-contract --strict + RUM allowlist exit 0.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder-only credential and pricing actions stay visible, but they are not treated as local implementation work until the external dependency clears.

## Ranked Hit List

### NOW

#### 1. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 2. [PRODUCT] CANON_ADOPTION freshness
Final score: **93**
[INFRA/P3·SIL:1] CANON_ADOPTION freshness — local mirror of the studio-ops probe. (was [SIL], S219)
Why it matters: CANON_ADOPTION freshness is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] orphan-lib allowlist-rot gate. Extend check-orphan-libs to flag allow…
Final score: **90**
[INFRA/P3·SIL:1] orphan-lib allowlist-rot gate. Extend check-orphan-libs to flag allowlist entries now (a) imported or (b) missing from disk. (was [SIL], S219)
Why it matters: orphan-lib allowlist-rot gate. Extend check-orphan-libs to flag allowl is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] orphan-lib allowlist-rot gate. Extend check-orphan-libs to flag allow…
Final score: **87**
[INFRA/P3·SIL] orphan-lib allowlist-rot gate. Extend check-orphan-libs to flag allowlist entries that are now (a) imported (allowlist no longer needed) or (b) missing from disk (stale entry) — keeps the allowlist honest.
Why it matters: orphan-lib allowlist-rot gate. Extend check-orphan-libs to flag allowl is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [BRAND] Forge Window naming propagation
Final score: **86**
Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.
Why it matters: The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.

First command: `node scripts/propagate-nav.mjs`

#### 2. [PRODUCT] agents.json on-site/external coherence check. Flag any project whose …
Final score: **84**
[INFRA/P3·SIL] agents.json on-site/external coherence check. Flag any project whose url is external while an on-site canonical page exists (e.g. MindFrame → games/mindframe/ but points to usemindframe.com with no shard); route the fix to build-agents-json.mjs, not a hand-edit.
Why it matters: agents.json on-site/external coherence check. Flag any project whose u is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] First real push notification
Final score: **84**
[PUSH/P1·FOUNDER] First real push notification — npm run push:count (0 subs today) → npm run push:notify -- --game cod (founder go-ahead required).
Why it matters: First real push notification is open, local, and unblocked — can ship this session.

#### 4. [BRAND] Draft one Signal Log post (founder voice) + publish forge devlog (fou…
Final score: **81**
[CONTENT/P1·FOUNDER] Draft one Signal Log post (founder voice) + publish forge devlog (founder voice, never auto-published).
Why it matters: Draft one Signal Log post (founder voice) + publish forge devlog (foun affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 5. [PRODUCT] Provision ark.hmac.seed (fleet ARK_HMAC_SEED)
Final score: **78**
[CRED/P1·FOUNDER] Provision ark.hmac.seed (fleet ARK_HMAC_SEED) — fixes cross-repo Ark signature verification (52 sig-failures on drain). HMAC-seed minting = founder credential action (CANON-019 reserved).
Why it matters: Provision ark.hmac.seed (fleet ARK_HMAC_SEED) is open, local, and unblocked — can ship this session.

### LATER

#### 1. [BRAND] MOBILE-SHEET-DEFAULT-SWAP
Final score: **75**
[UX·FOUNDER] MOBILE-SHEET-DEFAULT-SWAP — founder real-device verification (flag-gated nav sheet).
Why it matters: MOBILE-SHEET-DEFAULT-SWAP affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

#### 2. [PRODUCT] card-accent → cover-image overlay tint
Final score: **72**
[UX/P3·SIL] card-accent → cover-image overlay tint — quality-deferred (CANON-047 AI-image-test needs a non-headless screenshot env).
Why it matters: card-accent is open, local, and unblocked — can ship this session.

#### 3. [BRAND] Draft one Signal Log post from the brainstormed ideas (founder voice)…
Final score: **69**
[CONTENT/P1·FOUNDER] Draft one Signal Log post from the brainstormed ideas (founder voice) + publish forge devlog (founder voice, never auto-published).
Why it matters: Draft one Signal Log post from the brainstormed ideas (founder voice)  affects public vocabulary and navigation; requires founder sign-off before user-visible copy changes.

## Recommended Build Order

1. Post-push CI confirmation
2. CANON_ADOPTION freshness
3. orphan-lib allowlist-rot gate. Extend check-orphan-libs to flag allow…
4. orphan-lib allowlist-rot gate. Extend check-orphan-libs to flag allow…
5. Forge Window naming propagation
6. agents.json on-site/external coherence check. Flag any project whose …
7. First real push notification
8. Draft one Signal Log post (founder voice) + publish forge devlog (fou…
9. Provision ark.hmac.seed (fleet ARK_HMAC_SEED)
10. MOBILE-SHEET-DEFAULT-SWAP
11. card-accent → cover-image overlay tint
12. Draft one Signal Log post from the brainstormed ideas (founder voice)…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
