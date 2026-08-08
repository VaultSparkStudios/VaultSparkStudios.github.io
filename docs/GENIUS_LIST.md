# Genius Hit List — Session 307

Generated: 2026-08-08
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **92/100**
- Health: **yellow**
- Current SIL: **997/1000**
- CI health: **check gh run list**
- Current focus: S307 graduated The Desk from a simulated dark-run to a source-bound News release candidate: one real 2026-08-07 edition, two primary-source stories, deterministic human and agent feeds, header/footer navigation, sitemap discovery, accessibility 23/23, and 42 reviewed theme/viewport captures. Full build authority is 283/283 from step one. News is independent of Obelisk. Deployment remains deliberately held because the production callback is registered but the exact stable-staging callback is not; production still serves the older 4a72961d build.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Register the exact stable-staging callback and rerun the release cere…
Final score: **96**
[S308][IDENTITY/RELEASE/P0] Register the exact stable-staging callback and rerun the release ceremony. Retain https://vaultsparkstudios.com/auth/callback; add https://website.staging.vaultsparkstudios.com/auth/callback for client vaultsparkstudios-website; preserve altered-host and foreign-client denial; deploy staging, complete one founder journey, then promote News and the current shell.
Why it matters: Register the exact stable-staging callback and rerun the release cerem is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Register the canonical staging callback in Obelisk. Exact staging bro…
Final score: **93**
[S305][XREPO/RELEASE/P0] Register the canonical staging callback in Obelisk. Exact staging browser proof reaches /auth/authorize, which currently returns tenant-boundary-redirect-origin-not-registered-to-client for https://website.staging.vaultsparkstudios.com/auth/callback. Signed Ark request 01JV7U1UQ309B28328DCEF5A95 is with the active Obelisk owner: retain production callback, add the exact staging callback, prove cross-client redirect denial, deploy, live-probe. This is a real release-gate blocker; never bypass the tenant boundary.
Why it matters: Register the canonical staging callback in Obelisk. Exact staging brow is open, local, and unblocked — can ship this session.

#### 3. [VERIFY] Promote production
Final score: **87**
[S305][RELEASE/P0] Promote production — when the receipt reads verified/blockers=[]: flip context/PRODUCTION_PROMOTION.json to ready, gate self-test, commit, dispatch pages-deploy with confirm_production=true, live-verify /vault-member/ serves the Obelisk UI.
Why it matters: Promote production was flagged 2 sessions ago; each session it stays unverified it risks hiding a regression.

First command: `npm run build:check`



### DEFERRED / GATED

#### 1. [BRAND] Establish the ongoing editorial cadence after the first live edition.…
Final score: **96**
[S308][NEWS/P1][EXTERNAL][WAITING: LIVE EVIDENCE] Establish the ongoing editorial cadence after the first live edition. Revisit only when the first deployed real edition creates source-of-truth evidence for a correction/change cycle; then add a source-change/correction receipt and require a reviewed real day before each navigation-visible refresh. Do not fabricate a correction event or let simulation enter the public corpus.
Why it matters: Instrumentation is complete; closure requires a future source-of-truth observation and must not be fabricated locally.

#### 2. [VERIFY] Open Obelisk public registration when the provider owner confirms its…
Final score: **90**
[S305][FOUNDER/P0] Open Obelisk public registration when the provider owner confirms its gate. Unset OBELISK_SIGNUP_TOKEN on CPX51 per D-S242.1/D-2026-06-09; verify live before changing website create-account copy.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [VERIFY] One founder sign-in through the verifier
Final score: **87**
[S305][FOUNDER/P0] One founder sign-in through the verifier — once Obelisk W242 is live: node scripts/verify-provider-journey.mjs --live, complete the Obelisk ceremony in the opened browser; the verifier records all five legs and rebuilds the receipt.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 4. [VERIFY] Create-account copy tracks the enrollment gate. vault-member/index.ht…
Final score: **84**
[S305][UX/P1] Create-account copy tracks the enrollment gate. vault-member/index.html explains "Enrollment is currently invite-led inside Obelisk" <!-- evidence-open: the deliverable is the COPY SWAP after a live probe proves enrollment is open — the named file is context --> — once the Obelisk deploy opens enrollment (verify live, never assume), replace with plain create-account language before or with the promotion dispatch. Never ship open-enrollment copy while the provider still gates registration.
Why it matters: Requires missing credential, provider dashboard data, or an external access path.

#### 5. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **84**
[HUMAN][CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 6. [SECURITY] TT-ENFORCE-REPROBE
Final score: **84**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

#### 7. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **81**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 8. [BRAND] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed …
Final score: **60**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed via /api/public-intelligence.json, but the richer layer (per-project IGNIS voices, ecosystem-velocity chart, cognition aggregate score) still sources from the gitignored local-only /ignis/output/*. Deploying it needs a public-safe decision (what cross-project/sealed intelligence is exposable) + a sanitized deploy path + a refresh mechanism (generation is local-only — reads all sibling repos). Founder call.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Register the exact stable-staging callback and rerun the release cere…
2. Register the canonical staging callback in Obelisk. Exact staging bro…
3. Promote production

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
