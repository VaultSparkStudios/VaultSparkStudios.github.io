# Genius Hit List — Session 309

Generated: 2026-08-10
Project: `VaultSparkStudios.github.io`
Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md

## Score Summary

- Overall opportunity pressure: **84/100**
- Health: **yellow**
- Current SIL: **990/1000**
- CI health: **check gh run list**
- Current focus: S309 shipped the Director's Report and the repairer for a failure class the repo could detect but never cure. /news/directors-report/ has ORSON ranking all seven writers in public, explaining his assignments and taking the blame where it is his; deriveDeskPerformance() computes assignments/words/panels/leads/graded-calls FROM the corpus so only the judgement is authored. It shipped live with the GENERIC share card — the generator hardcoded it, the build-og-cards auto-promoter skips news pages because the Desk emits no og:title, and the live probe checked status and HTML rather than the card; now fixed at the generator and verified 200 on production with a bespoke card. resync-derived.mjs rebuilds the transitive closure of the evidence graph in topological order after a rebase, because a conflict list shows COLLISIONS not DEPENDENTS: regenerating the two feeds named in this rebase's conflict list got the push rejected twice more by artifacts that never conflicted, and a replay flags 10 of 17 dirty. Its first run invoked deploy-staging.mjs attempting a real deploy to repair a rebase, stopped only by an unrelated failing check — sideEffecting is now declared in the graph with a mutation-tested structural guard.

## Strategic Read

No current session intent found.

The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.

## Ranked Hit List

### NOW

#### 1. [PRODUCT] Reconcile the evidence graph against every --checked artifact. The gr…
Final score: **96**
[S309→S310][INFRA/P1] Reconcile the evidence graph against every --checked artifact. The graph models 17 nodes; the repo byte-checks more. proof-aware-projects and cta-readiness both drifted this session where resync-derived could not help, because they are unmodeled — invisible to the repairer AND the cascade checker. "9 artifacts rebuilt + staged" therefore reads like a completeness it does not have. Build a structural gate that the two sets agree, rather than adding nodes one at a time as they happen to break. Deferred deliberately: expanding the graph changes what check-publish-cascade-coverage demands of every cron, which needs its own verified pass.
Why it matters: Reconcile the evidence graph against every --checked artifact. The gra is open, local, and unblocked — can ship this session.

#### 2. [VERIFY] Post-push CI confirmation
Final score: **96**
Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.
Why it matters: The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.

First command: `gh run list --limit 10`

#### 3. [PRODUCT] Get VERA, JUNO and NIB actually writing. ORSON has now committed to t…
Final score: **93**
[S309→S310][NEWS/P0] Get VERA, JUNO and NIB actually writing. ORSON has now committed to this on a live public page ("Next week I want two things. A story that is not about a model release… And VERA on something operational"). Three of seven writers have filed nothing; the Director's Report is honest about it, which converts it from a gap into a promise.
Why it matters: Get VERA, JUNO and NIB actually writing. ORSON has now committed to th is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Prove the light formats are funny. Roast and Signature Bit exist in t…
Final score: **90**
[S309→S310][NEWS/P1] Prove the light formats are funny. Roast and Signature Bit exist in the format table but have shipped once between them.
Why it matters: Prove the light formats are funny. Roast and Signature Bit exist in th is open, local, and unblocked — can ship this session.

### NEXT

#### 1. [PRODUCT] Fix the deploy-currency baseline at the source. The content lane shou…
Final score: **87**
[S308→S309][RELEASE/P1] Fix the deploy-currency baseline at the source. The content lane should not need a hand-passed baseline. build-deploy-currency records unobserved honestly when Cloudflare challenges the probe, but the lane then has no input at all. Give it a challenge-resistant read (pages.dev origin or the served /api/build-sha.json path) so an honest unobserved state does not block promotion.
Why it matters: Fix the deploy-currency baseline at the source. The content lane shoul is open, local, and unblocked — can ship this session.

#### 2. [PRODUCT] Get the rest of the desk actually writing. ECHO, MARA, REX and DOT ha…
Final score: **84**
[S308→S309][NEWS/P1] Get the rest of the desk actually writing. ECHO, MARA, REX and DOT have filed; VERA, JUNO and NIB have barely or not at all. ORSON has already called this out in public, which makes it a commitment. The cast is proven as a system, not as writers.
Why it matters: Get the rest of the desk actually writing. ECHO, MARA, REX and DOT hav is open, local, and unblocked — can ship this session.

#### 3. [PRODUCT] Resolve publisher URLs from aggregator entries. 23 of 24 queued topic…
Final score: **72**
[S308→S309][NEWS/P1] Resolve publisher URLs from aggregator entries. 23 of 24 queued topics are currently undraftable: the radar corroborates ACROSS outlets via Google News (which is what makes corroboration strong), but those links cannot be read for facts — so corroboration and draftability pull against each other. Decoding Google's CBMi… encoding is deliberately hostile and fragile; prefer resolving via the publisher domain from <source> plus a site search, or lean on primary-source feeds. Not guessed at this session.
Why it matters: Resolve publisher URLs from aggregator entries. 23 of 24 queued topics is open, local, and unblocked — can ship this session.

#### 4. [PRODUCT] Schedule the radar. A cron that runs --scan per edition slot and surf…
Final score: **69**
[S308→S309][NEWS/P2] Schedule the radar. A cron that runs --scan per edition slot and surfaces the queue at /start, so cadence is prompted rather than remembered.
Why it matters: Schedule the radar. A cron that runs --scan per edition slot and surfa is open, local, and unblocked — can ship this session.

#### 5. [PRODUCT] Register the exact stable-staging callback and rerun the full account…
Final score: **66**
[S308][IDENTITY/RELEASE/P0] Register the exact stable-staging callback and rerun the full account-shell ceremony. Retain https://vaultsparkstudios.com/auth/callback; add https://website.staging.vaultsparkstudios.com/auth/callback for client vaultsparkstudios-website; preserve altered-host and foreign-client denial; deploy staging, complete one founder journey, then promote the current Obelisk account shell. News is already live and is not part of this blocker.
Why it matters: Register the exact stable-staging callback and rerun the full account- is open, local, and unblocked — can ship this session.


### DEFERRED / GATED

#### 1. [PRODUCT] Schedule the authoring routine (Max Plan, not API). A cron-invoked Cl…
Final score: **93**
[S308→S309][NEWS/P1] Schedule the authoring routine (Max Plan, not API). A cron-invoked Claude Code routine that runs --scan → --prepare → authors the judgment fields → --promote → rebuild → deploy. Founder-approved surface is the Max Plan; metered API generation stays unbuilt and unpriced-in. Keep human sign-off on each edition until the pipeline has a track record.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 2. [PRODUCT] Decide the naming triple. The product is "The Desk", the newsletter "…
Final score: **90**
[S308→S309][NEWS/P2] Decide the naming triple. The product is "The Desk", the newsletter "The Dispatch", the URL /news/, the address news@. Three names for one thing. /news/ carries the SEO value; "The Desk" carries the brand. Founder call — email domains carry no SEO weight either way. The radar now produces a ranked, edition-assigned queue, but turning a queued topic into a validated day is still manual. Next: a drafting path that emits a validateDay()-clean day from a queued topic, with the persona cast and standing directives applied.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 3. [BRAND] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md)
Final score: **87**
[HUMAN][CONTENT/P1·FOUNDER] Publish the forge devlog (journal/_drafts/forge-week-2026-06-18.md) — clears the changelog stale warn. Founder-voice essay; never auto-published.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 4. [SECURITY] TT-ENFORCE-REPROBE
Final score: **87**
[S186→S281][SECURITY/P1] TT-ENFORCE-REPROBE — CANONICAL ENTRY (S177/S180/S184/S185 records consolidated here S281, D-S281.4). One job, previously logged as five open entries; all evidence preserved below.
Why it matters: Trusted Types status is amber-soak; Wait for warm rows to age out or refresh R2 reports before enforcement.

#### 5. [PRODUCT] Click the Dispatch confirmation to close the last untested hop. Deliv…
Final score: **84**
[S308→S309][GROWTH/P1][FOUNDER ACTION] Click the Dispatch confirmation to close the last untested hop. Delivery is proven; list 3 still reports totalSubscribers: 0 and founder@ sits on listIds: [2]. Brevo attaches only on click, so form → function → Brevo → inbox → confirm → list is verified except the final step. Clicking also lands on /news/subscribed/ and makes the list's first real subscriber. Not agent-closable.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 6. [BRAND] Review + publish the forge devlog draft. journal/_drafts/forge-week-2…
Final score: **84**
[S187][CONTENT/P1·FOUNDER] Review + publish the forge devlog draft. journal/_drafts/forge-week-2026-06-11.md is generated; founder reviews SOUL voice, then publish to journal/ to clear the 81d-stale journal gate (build:check warns until then). Re-verified S251: still unpublished, still correctly founder-gated (never auto-publish per AGENTS.md).
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 7. [BRAND] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed …
Final score: **63**
[S183][ORACLE/FOUNDER] RICHER-IGNIS-LAYER-PUBLIC-SAFE-DECISION. Oracle's core feed is fixed via /api/public-intelligence.json, but the richer layer (per-project IGNIS voices, ecosystem-velocity chart, cognition aggregate score) still sources from the gitignored local-only /ignis/output/*. Deploying it needs a public-safe decision (what cross-project/sealed intelligence is exposable) + a sanitized deploy path + a refresh mechanism (generation is local-only — reads all sibling repos). Founder call.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

#### 8. [VERIFY] NAV-SHEET DEVICE VERIFY. assets/vaultsparked-proof.js was already del…
Final score: **62**
[S180][FOUNDER/DEVICE] NAV-SHEET DEVICE VERIFY. assets/vaultsparked-proof.js was already deleted and verified in S186; the only remaining action is the real founder-device nav-sheet behavior check required by SOUL #3. No deletion work remains.
Why it matters: Requires explicit founder authorization or an approved auth/security decision before implementation.

## Recommended Build Order

1. Reconcile the evidence graph against every --checked artifact. The gr…
2. Post-push CI confirmation
3. Get VERA, JUNO and NIB actually writing. ORSON has now committed to t…
4. Prove the light formats are funny. Roast and Signature Bit exist in t…
5. Fix the deploy-currency baseline at the source. The content lane shou…
6. Get the rest of the desk actually writing. ECHO, MARA, REX and DOT ha…
7. Resolve publisher URLs from aggregator entries. 23 of 24 queued topic…
8. Schedule the radar. A cron that runs --scan per edition slot and surf…
9. Register the exact stable-staging callback and rerun the full account…

## Best Immediate Move

Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.
