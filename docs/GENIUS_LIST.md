# Genius Hit List — Session 310

Generated: 2026-08-11
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **88/100**
- Health: **yellow**
- Current SIL: **989/1000**
- CI health: **check gh run list**
- Current focus: S310 rebuilt The Desk's public numbers and added reader signal. Every published figure is now derived by lib/news-stats.mjs into a byte-checked api/news-desk-stats.json that the renderer reads, so page and feed cannot disagree; accuracy renders 'Not yet — a record needs 4' rather than a flattering percentage off a thin sample, and sources count unique publishers. The founder flagged the canned 'The desk disagrees' line: it was TRUE on the two stories where it appeared but meaningless on the other three, which have a single voice, so it is replaced by a stance axis plotting each voice where it actually stands. Reader reactions ship as editorial signal — Changed my mind / Already knew this / Show more receipts / Made me laugh plus a per-voice vote feeding ORSON's Director's Report — identity-free, with counts rendered only when the server returns them. Each persona's prose now uses the visual register it already owns in its panel. A founder-reported crude cartoon (torso running past the leg join) was fixed and re-rendered. THE ENDPOINT IS NOT LIVE: it ships in the Worker, whose promotion gate holds on real-provider-e2e-pending, and the Ark inbox revealed why that can never clear as-is — this site is on v1/hand-rolled auth with no Obelisk sign-in control at all, and 0/43 relying parties are live on Passport v2. Migration deferred to its own session by the founder; a repo-question is with Obelisk about a live-rejected staging callback they report as registered.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Prove the light formats are funny. Roast and Signature Bit exist in t…
Final score: **96**
[S309→S310][NEWS/P1] Prove the light formats are funny. Roast and Signature Bit exist in the format table but have shipped once between them.
Why it matters: Prove the light formats are funny. Roast and Signature Bit exist in th is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Fix the deploy-currency baseline at the source. The content lane shou…
Final score: **93**
[S308→S309][RELEASE/P1] Fix the deploy-currency baseline at the source. The content lane should not need a hand-passed baseline. build-deploy-currency records unobserved honestly when Cloudflare challenges the probe, but the lane then has no input at all. Give it a challenge-resistant read (pages.dev origin or the served /api/build-sha.json path) so an honest unobserved state does not block promotion.
Why it matters: Fix the deploy-currency baseline at the source. The content lane shoul is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Get the rest of the desk actually writing. ECHO, MARA, REX and DOT ha…
Final score: **90**
[S308→S309][NEWS/P1] Get the rest of the desk actually writing. ECHO, MARA, REX and DOT have filed; VERA, JUNO and NIB have barely or not at all. ORSON has already called this out in public, which makes it a commitment. The cast is proven as a system, not as writers.
Why it matters: Get the rest of the desk actually writing. ECHO, MARA, REX and DOT hav is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Resolve publisher URLs from aggregator entries. 23 of 24 queued topic…
Final score: **78**
[S308→S309][NEWS/P1] Resolve publisher URLs from aggregator entries. 23 of 24 queued topics are currently undraftable: the radar corroborates ACROSS outlets via Google News (which is what makes corroboration strong), but those links cannot be read for facts — so corroboration and draftability pull against each other. Decoding Google's CBMi… encoding is deliberately hostile and fragile; prefer resolving via the publisher domain from <source> plus a site search, or lean on primary-source feeds. Not guessed at this session.
Why it matters: Resolve publisher URLs from aggregator entries. 23 of 24 queued topics is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Schedule the radar. A cron that runs --scan per edition slot and surf…
Final score: **75**
[S308→S309][NEWS/P2] Schedule the radar. A cron that runs --scan per edition slot and surfaces the queue at /start, so cadence is prompted rather than remembered.
Why it matters: Schedule the radar. A cron that runs --scan per edition slot and surfa is open, local, and unblocked — can ship this session.


### DEFERRED / GATED

#### 1. [PRODUCT] Schedule the authoring routine (Max Plan, not API). A cron-invoked Cl…
Final score: **90**
[S308→S309][NEWS/P1] Schedule the authoring routine (Max Plan, not API). A cron-invoked Claude Code routine that runs --scan → --prepare → authors the judgment fields → --promote → rebuild → deploy. Founder-approved surface is the Max Plan; metered API generation stays unbuilt and unpriced-in. Keep human sign-off on each edition until the pipeline has a track record.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [PRODUCT] Decide the naming triple. The product is "The Desk", the newsletter "…
Final score: **87**
[S308→S309][NEWS/P2] Decide the naming triple. The product is "The Desk", the newsletter "The Dispatch", the URL /news/, the address news@. Three names for one thing. /news/ carries the SEO value; "The Desk" carries the brand. Founder call — email domains carry no SEO weight either way. The radar now produces a ranked, edition-assigned queue, but turning a queued topic into a validated day is still manual. Next: a drafting path that emits a validateDay()-clean day from a queued topic, with the persona cast and standing directives applied.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **84**
[HUMAN][CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 4. [SECURITY] TT-ENFORCE-REPROBE
Final score: **84**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

#### 5. [PRODUCT] Click the Dispatch confirmation to close the last untested hop. Deliv…
Final score: **81**
[S308→S309][GROWTH/P1][FOUNDER ACTION] Click the Dispatch confirmation to close the last untested hop. Delivery is proven; list 3 still reports totalSubscribers: 0 and founder@ sits on listIds: [2]. Brevo attaches only on click, so form → function → Brevo → inbox → confirm → list is verified except the final step. Clicking also lands on /news/subscribed/ and makes the list's first real subscriber. Not agent-closable.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 6. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **81**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [VERIFY] Activate the reactions endpoint. The Worker deploy is HELD: productio…
Final score: **74**
[S310→S311][BLOCKED/P0] Activate the reactions endpoint. The Worker deploy is HELD: production-promotion-gate allowed=false, reasons=real-provider-e2e-pending. The run reports SUCCESS because holding is a successful outcome. Needs either the Obelisk staging callback + one founder sign-in to release the hold, or explicit founder authorisation to use the confirm_identity_deploy lane — which is scoped to identity evidence, so using it for reactions is a founder call, not mine (D-S310.4). Then live-POST against real KV: dedupe is currently proven against a fake Map only.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 8. [BRAND] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed …
Final score: **60**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed via /api/public-intelligence.json, but the richer layer (per-project IGNIS voices, ecosystem-velocity chart, cognition aggregate score) still sources from the gitignored local-only /ignis/output/*. Deploying it needs a public-safe decision (what cross-project/sealed intelligence is exposable) + a sanitized deploy path + a refresh mechanism (generation is local-only — reads all sibling repos). Founder call.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Prove the light formats are funny. Roast and Signature Bit exist in t…
2. Post-push CI confirmation
3. Fix the deploy-currency baseline at the source. The content lane shou…
4. Get the rest of the desk actually writing. ECHO, MARA, REX and DOT ha…
5. Resolve publisher URLs from aggregator entries. 23 of 24 queued topic…
6. Schedule the radar. A cron that runs --scan per edition slot and surf…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
