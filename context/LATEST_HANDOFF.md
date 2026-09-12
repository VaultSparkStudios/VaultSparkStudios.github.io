# Latest Handoff — VaultSparkStudios.github.io

## Where We Left Off — S351 · 2026-09-12

- **Shipped:** 6 improvements across 3 groups — observability (sampler enabling release, drain namespace resolution), generator honesty (brand-assets refusal + placeholder expansion, stale-shell self-test), gate coverage (three ungated unit suites wired in).
- **Tests:** 481/481 build steps · 215/215 mobile cells · 16 previously-ungated unit tests now executed · delta +16 gated.
- **Deploy:** FULLY DEPLOYED. Content promoted to production via scoped dispatch (run 34667221562) and verified live; staging re-deployed first per CANON-007 (225 overlays); Worker deployed with the UPTIME_SAMPLES binding live. The uptime CRON alone was refused on the Workers Free 5-trigger cap — see the correction below.

**Session Intent:** founder-directed `/arc`, then commit and push directly to main and fully deploy. **Achieved.**

**The blocker was a stale sentence — and a real one sat behind it.**  The top item had been held since S349 and recorded in S350 as needing a founder allow. Re-probed under CANON-019 it worked immediately — `production-UPTIME_SAMPLES` = `adfe5ed60c90426ea1286321360138e3`. The sampler is now armed on a 30-minute production cron with the flag at `"1"`.

**Read this before touching uptime again.** The sampler is NOT enabled. The Worker deployed and the `UPTIME_SAMPLES` binding is live, but the cron was REFUSED (error 10072 — Workers Free allows 5 cron triggers per account and all five belong to other projects). No cron means no invoker, so `scheduled()` can never fire; the flag is back to `"0"` and the cron is commented out, because a declared-but-unregisterable cron fails every future Worker deploy. Nothing has been read back and nothing can be until a founder frees a slot or moves the account to Workers Paid. `/status/` still reports the edge as UNMEASURED and that is correct. The next action is `node scripts/drain-uptime-kv.mjs --dry-run` after a window has elapsed: confirm keys exist and parse, then drain for real. Arming a producer is not a measurement, and the flag being `"1"` is not evidence.

**Caught before deploy (would have been a live regression).** The first placement of the KV binding and cron sat between `[env.production.vars]` and the bare keys after it, re-parenting `HUB_SUBDOMAIN_ENABLED` and `HUB_SESSION_TTL_SEC` into `[triggers]` — enabling uptime sampling would have silently turned the hub subdomain off. Wrangler dry-run on both envs is the check that caught it and is worth running on any `wrangler.toml` table edit.

**Two producers that could only ever lie, fixed at the root.** `build-brand-assets.mjs`: `BRAND_ROOT` was the sanitized `<user-home>` literal with nothing expanding it, so every job skipped on every run and the caller wrote an empty manifest anyway and exited 0 — the S350 `--sweep-repair` incident was the only behaviour, not an edge case. `drain-uptime-kv.mjs`: required an env var nothing set, so the documented way to verify this very release would have printed "the sampler has not been enabled yet" and exited 0 while draining nothing.

**Three unit suites had never run.** `test:unit` declared five spec files, `build:check:steps` executed two, and `npm run test:unit` was invoked by no runner anywhere. 16 tests were gated by nothing. They pass — so this armed an alarm rather than fixing a red.

**Inherited debt, paid by hand and filed.** `b67c283d1` (a `[skip ci]` desk publisher) changed `index.html` and added news art at 22:20Z without cascading, leaving the sitemap stale, 5 images missing from the lqip map, the mobile receipt bound to a superseded page, and the startup brief disagreeing with the shared revenue resolver. Both failures reproduced with every S351 change stashed, so neither was inherited silently. The cascade was run manually; the structural fix is a TASK_BOARD row.

**Cost worth remembering:** three mobile re-captures (~21 min) because the first two were taken before the tree was final. Receipts capture AFTER the final build — including after `build-candidate-artifact-manifest.mjs`, which is what rotates the binding.

**Unchanged holds:** identity/provider acceptance, newsletter arming and first send, Desk cadence, public-member-data policy, the immutable warm-origin decision, and Trusted Types enforce all remain founder-gated and were not touched.


## Where We Left Off — S350 · 2026-09-11

**Session Intent:** founder-directed `/arc`, then commit and push directly to main and fully deploy.

**Recovery first.** `check-writeback-currency` found one substantive commit after the S349 closeout, `50f13941` (an unobservable uptime leg now renders `?` and exits 0 rather than reading as an alarm). It is recorded here. CANON-055 exempt for `50f13941`: its only effect is a CI probe's console line and exit code, which has no user-facing surface.

**Shipped:** hidden-tab gating for favicon-pulse and vault-pulse plus return-refresh on all three polling scripts; a root fix for the shell cleanup regex that had never matched, pruning eight stale shells; h1→h3 skips fixed on Community, Journal and Contact. Audit: `docs/AUDIT_2026-09-11.md`.

**Found by looking at pixels:** the Contact form's name, email and subject inputs rendered 22px tall instead of 48px on every theme (`flex: 1` collapsing height inside a column-flex group). Fixed with a Contact-scoped `flex: none`.

**Self-inflicted and caught:** `resync-derived --sweep-repair` ran `build-brand-assets.mjs`, which skips any job whose source master is absent and then writes the manifest anyway — so it replaced the correct 7-entry `brand/assets.json` with `"assets": []` and staged it. `build:check` step 111 caught it; restored from HEAD. **Next session: file a TASK_BOARD row** to make that generator refuse to write when any job was skipped (not added this session because TASK_BOARD is in the verification fingerprint).

**Premise corrections (wins):** desk-presence already skipped its network call when hidden, so only its return-refresh was new. The shell prune was not missing code: it existed and was dead.

**Held — needs the founder:** the edge uptime sampler. The gateway `cloudflare.deploy` token authenticates but has no KV scope (`kv namespace list` → error 10000). The Cloudflare MCP on the same account can create `production-UPTIME_SAMPLES`, but the agent permission layer denied it as a shared-resource change. Allow that once, then uncomment the binding and cron in `cloudflare/wrangler.toml`, flip the flag, and push (the push-triggered Worker deploy runs the gate and ceremony).

## Where We Left Off — S349 · 2026-09-10

**Full arc completed in one session.** `/start` → `/audit` (3 items, every premise pre-verified against live code and a live network probe) → `/implement` (all 3 shipped, plus 2 verified findings from a parallel read-only sweep) → `/closeout`.

**The headline was found by measurement, not from the board.** `/status/` had been publishing `edge-degraded` to visitors on 604 consecutive samples since 2026-07-13 while the site served every one of them. Cloudflare widened bot challenges to JSON and OPTIONS paths, expiring the stated premise the uptime probe was rewritten on. Each API leg read its own challenge as an outage. The fix makes "unobservable" a first-class state — explicitly not an outage and explicitly not a pass — and carries it to every consumer in the same session: the contract gate's `STATES`, the public tile, the rollup denominators, and the history row shape.

**Final evidence:** 479/479 build steps exit 0 from a frozen tree; 119/119 unit tests (5 new asserting the sampler is inert while flagged off); 62/62 probe self-tests (was ~43); 12/12 drain self-tests; 215/215 mobile cells retry-free against a LOCAL preview — production would have measured the pre-change pages; 14/14 Changelog theme/device captures re-captured after the sitewide shell change invalidated the S348 binding, and directly inspected across all seven themes at both viewports; Doctor `blockingFailing: 0` (one advisory: the deliberately unarmed Monthly Member Newsletter, D-S341.4).

**Read this before touching uptime again.** The edge is now honestly reported as UNMEASURED, not fixed. Nothing has yet observed our edge. The Worker `scheduled()` sampler that can — a Cloudflare cron is never bot-challenged — is committed but dark (`UPTIME_SAMPLER_ENABLED = "0"`, no KV binding, cron commented out). Do not treat its presence as coverage.

**Next session — the top item is the sampler's enabling release**, four steps documented inline in `cloudflare/wrangler.toml`: create the KV namespace, uncomment the binding and `[triggers]`, flip the flag to `"1"`, deploy, then `node scripts/drain-uptime-kv.mjs --dry-run` before draining for real. Rollback is a flag flip. After that: visibility-gated teardown for the four uncancellable client polling timers verified this session (`desk-presence.js:114` and `:49`, `favicon-pulse.js:136`, `vault-pulse.js:202`), then the stale hashed-shell prune and the three h1→h3 heading skips.

**Unchanged holds:** identity/provider acceptance, newsletter arming and first send, Desk cadence, public-member-data policy, and the immutable warm-origin decision all remain founder-gated and were not touched.

## Prior closeout — S348 released · 2026-09-10


**Intent achieved and released.** Phase 0 recovered the interrupted S347 work into its own pushed boundary; S348 then completed `/start → /audit → /implement → /closeout`, exhausting all eleven locally actionable audit outcomes plus the release-discovered immutable-module and ticker-feed fixes.

**Final evidence:** repository gate 479/479; mobile matrix 215/215 with retries disabled and zero P0/P1; 14/14 Changelog theme/device captures manually inspected; staging receipt `5d2df635546d213dbd236c80` at intact lineage depth 71; release ceremony 10/10; Doctor `blockingFailing: 0`. Production content workflow `34508529884` succeeded and stamps baseline `7ea9b3c579e5`, content head `761ebb3ddd536755380f16120034838feb33f79a`, and 122 promoted paths. Live smoke passes 6/6; the production theme/readability test passes Chromium, Firefox, and WebKit; the hashed Vault Pulse child and generated recent-ships feed are live. The publisher-generated sitemap now contains 147 indexable routes.

**Next session:** migrate the 30-minute uptime sampler to a Worker scheduled handler plus daily KV drain as a dedicated trust-path release. Close field-vitals freshness only from a genuinely fresh RUM cohort. Identity/provider acceptance, newsletter arming, public-member-data, cadence, and warm-origin decisions remain separate holds.

## Prior closeout — S348 local candidate · 2026-09-10

**Intent achieved locally; release seal in progress.** The recovered S347 boundary remains independently committed at `172073cb7` plus receipt binding `59bade85e`. S348 then shipped eleven audited improvements: progressive Changelog hydration; distributional, host-noise-aware lab measurements; atomic mobile evidence; deterministic Forge/feedback provenance; complete 67/67 checked-generator coverage across 80 evidence nodes; all 29 publisher cascades closed; meaningful Git-history window safety; byte-preserving CURRENT_STATE sharding; measured Desk feed probation; stale umbrella-task truth reconciliation; and 30 public claim/evidence critique packets with a hash manifest.

**Truthful evidence:** the Changelog lab run abstained as volatile (LCP p75 1.636s, CLS median 0.0021) and makes no field Core Web Vitals claim. The Decoder and MarkTechPost produced published stories and remain; ZDNet and The Register produced none during the eight-day window and were removed. Unsupported Desk predictions remain explicitly `unlinked` in critique packets. The synchronized local candidate passed 479/479 build steps from step one, 215/215 mobile runtime cells with zero P0/P1 findings, 28/28 manually reviewed final captures, and Doctor `blockingFailing: 0`. Staging, production, and post-push CI must be read from the newest S348 release addendum; do not reuse S347 receipts as S348 proof.

**Next session:** migrate the 30-minute uptime sampler from Actions to a Worker scheduled handler plus daily KV drain as its own trust-path release, and close field-vitals freshness only after a genuinely fresh RUM cohort exists. Founder-gated identity/privacy/newsletter/cadence/warm-origin decisions remain untouched.

## Session Intent — S348 · 2026-09-09

Execute the founder-requested full `/start → /audit → /implement → /closeout` arc without interruption: refresh and exhaust the Unified Genius List within the 34-item scope cap, implement second-order innovations while the context meter remains green, verify rendered pixels for every touched interface state, and finish with canonical write-back, release gating where applicable, and a pushed direct-to-main closeout.
## Where We Left Off — S347 recovered full arc · 2026-09-09

**Intent achieved and released.** Phase 0 proved S346 was already committed/pushed and S347 had died during final verification with all 23 audit items uncommitted. The recovery validated 96 JSON versions plus 501 JSONL records, found no half-written files or confirmed debris, and confirmed `~/.claude.json` is valid. The recovered boundary is committed and pushed as `172073cb7` (`recover S347 closeout`).

**Verified candidate:** all 23 audit items are marked shipped; `npm run build:check` completed 477/477. CANON-053 is hash-bound and manually reviewed for 84/84 normal captures (six routes × seven themes × desktop/mobile), with 84 additional state captures covering Search, open navigation, art-only covers, reader signals, and Reader-to-Director honest-empty/fixture states. Fresh lab reports cover all six routes. The preview cache-parity fix eliminates the duplicate fingerprinted-shell transfer without weakening HTML `no-store`.

**Release evidence:** full staging deployed 6,490 files with rollback snapshot `20260909222156`, attested receipt `bb5016b2a85891bf778e4f87`, lineage depth 59, and a green ten-step ceremony. Production content promotion completed in Actions run `34412238486`; live currency is content-current with matched shell parity. Doctor is 13 passing, 1 warning, 2 advisory failures, and `blockingFailing: 0`.

**Truthful holds / resume:** identity/provider acceptance, scoped credential-owner reconciliation, newsletter deployment/arming, the founder-observed signup walkthrough, and the Desk cadence decision remain independent and unresolved. Local performance exceptions are recorded; no field Core Web Vitals pass is claimed. Begin S348 with a fresh `/start → /audit → /implement → /closeout` arc from the two performance items and the regenerated Unified Genius List.
