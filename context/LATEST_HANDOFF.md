# Latest Handoff — Session 295

Last updated: 2026-07-26

**Session Intent (Session 295):** Run the complete agent-neutral `/arc` continuously, exhaust the live-verified Unified Genius List, ship second-order innovation, verify staging, and preserve the production hold. **Outcome: Achieved.** The actionable list is 0/100 pressure; only real-observation, founder, provider, or soak gates remain.
## Where We Left Off (Session 295)

- **Shipped: 7 concrete improvements across incident truth, deploy truth, UX, CI, and ecosystem transport.** Evidence-bounded onset; generic route-local shell parity; scheduled deploy-currency integration; self-proving real-recovery transition; parity anti-regression contract; public production-currency tile; RUM publisher cascade closure + Ark package-name guard proposal.
- **Tests:** `npm run build:check` **241/241 EXIT 0**; Worker history **43/43**; deploy currency **26/26**; route parity **7/7**; structural parity **4/4**; status contract **12/12**; local visual regression **70/70**; staging mobile compliance **18/18**.
- **Deploy:** exact candidate deployed to Hetzner staging — **4,264 files / 92.3 MiB**, rollback `/opt/studio/staging/website/.rollback/20260726223047`; candidate SHA and 24-leaf Merkle root match. Production was not promoted.
- **Production truth:** production is still stale and its Worker routes remain **0/5 matched**. The public feed says `awaiting-real-recovery`; a real close receipt is deliberately not claimed.
- **Ark:** package-name intent-guard pattern shipped to studio-ops as `01JUG8CUM689C5B7373E471A7A`; full session-impact summary broadcast as `01JUG91A457AA87D84A40E8474`.

## Start here next session

1. Re-probe the Supabase authority planes through the secrets gateway.
2. When the held auth/security promotion is explicitly released, promote and let the semantic ledger prove the real mismatch→matched closure exactly once.
3. Verify the production currency tile and recovery receipt against the newly deployed source of truth; do not substitute staging evidence.

## Trust notes

- Staging `status: yellow` means it intentionally differs from stale production; `candidateReady: true`, exact SHA, and exact Merkle root are the candidate gates.
- A direct production browser run reproduced the stale public surface; the same compliance suite passes 18/18 locally and on staging.
- No Lighthouse score was fabricated for `/status/`: that route is not in the pinned Lighthouse tier set. Existing route tiers remain green; the changed surface instead passed visual, mobile, console, structural, and staging browser contracts.
- A mistaken bare `npx lhci` resolved an unrelated transient package. It changed no manifest/lockfile, was not reused, and became an Ark supply-chain guard proposal.

---

# Latest Handoff — Session 294

Last updated: 2026-07-26

**Session Intent (Session 294):** Founder reported the Franchise Architect links broken and `/franchise-architect/` serving as a plain-text page. **Outcome: Root-caused, fixed, gated, and browser-verified — but it cannot reach production while the promotion hold stands.**
## Where We Left Off (Session 294)

- **Root cause:** `franchise-architect/{index,game,404}.html` declared `<base href="/games/franchise-architect/" />`. That directory is the **About** page and ships no app assets, while `styles.css`/`setup.js`/`app.js` live in `/franchise-architect/`. Every relative asset resolved to the 404 HTML page, which the browser refused by MIME type. Introduced by the S284 slug rebrand (`1bf88182e`) and broken since.
- **The site's links were already correct** — `/games/franchise-architect/` is About, `/franchise-architect/` is Play. Only the `<base>` was wrong. These were the only three `<base>` tags on the entire site.
- **Fixed + verified in a real browser** at both `/franchise-architect/` and `/franchise-architect/game.html`: own stylesheet applied, **0 failed requests, 0 console errors**, League Hub renders fully styled.
- **Gated:** `check-base-href-resolution.mjs` (self-test 14/14) resolves each relative ref through its `<base>` and asserts the target exists. Confirmed red on the real regression, green on the fix.
- **S293 correction:** the stale production deploy is the **fail-closed promotion interlock working as designed**, not a broken deploy path (D-S294.2). The S293 false-green finding on the startup brief remains entirely valid.

## Blocked on the founder — the fix is in `main` but not live

Production is **143 commits / 2.3 days** stale. The promotion gate holds on `supabase-migration-pending`, `eternal-function-pending`, `real-provider-e2e-pending`, `supabase-control-plane-partial`, `independent-release-gate-no-go` — all credential-gated. Release with:

```
gh workflow run pages-deploy.yml -f confirm_production=true
```

Not dispatched autonomously: production promotion under an explicit hold is a founder decision (CANON-019).

## Founder directive received and implemented (Play-CTA routing)

**Decision:** Play CTA → the game's `liveUrl`; every other link → the fully built-out landing page, as with all other games.

- `data/game-registry.json` `playUrl` → `https://playfranchisearchitect.com/` (the documented source of truth), and `studio-hub/src/data/studioRegistry.js` `deployedUrl` matched so the **generated** hero and atlas blocks follow rather than being hand-patched.
- **20 Play CTAs** now agree with the registry, across `index.html`, `games/`, `games/franchise-architect/`, `games/gridiron-gm-play/`, `leaderboards/`, `press/`, `roadmap/`, `atlas/`. `data/game-affinity.json` recommendations point at landing pages.
- New gate `check-play-cta-registry-sync.mjs` (16/16) makes the registry's own claim true. **Its first run found 9 CTAs a manual grep had missed** plus a Call of Doodie link pointing at the **404** `/call-of-doodie/` route.
- **A regression I introduced and contained:** fixing that dead Call of Doodie URL flipped it `SPARKED → FORGE` sitewide, because status is partly inferred from being apex-hosted. Stated `vaultStatus: "sparked"` explicitly (matching `data/game-registry.json` and what the site already published) and verified **net-zero public diff** — 6 live / 14 forge before and after.

Still true: `/franchise-architect/` remains as the direct build path (now correctly styled), but is no longer advertised as the Play destination.

## Content-hotfix lane — BUILT (founder chose it over releasing the hold)

**First, a correction I owe the record:** `gh workflow run pages-deploy.yml -f confirm_production=true` is a **no-op** right now, and I offered it as the lever for three messages before verifying. `promotionAllowed()` ANDs seven conditions; `context/PRODUCTION_PROMOTION.json` is hand-maintained (nothing generates it) and reads `hold: true` / `releaseState: "hold"`. Dispatching it evaluates the gate, skips every deploy step, and reports success while changing nothing.

**Then, measurement before design.** The naive lane — promote everything when the diff since the deployed SHA is content-only — is **dead code here**: that diff is **444 files** and genuinely touches `_headers`, `auth/`, `vault-member/`, `investor-portal/`, `sw.js`, `login.html`, `cloudflare/`, `supabase/`.

**What shipped instead:** a second, independent gate in `pages-deploy.yml` that rebuilds the tree **already in production** and overlays only an explicitly listed, allowlisted content set.

- `scripts/check-content-hotfix-gate.mjs` — self-test **25/25**. Deny-by-default: markup outside auth surfaces, inert assets, and `api/*.json` are promotable; `.js`/`.mjs`/`sw.js`, `_headers`/`_redirects`/`robots.txt`, every auth/member/investor surface, `cloudflare/`, `supabase/`, `config/`, `.github/`, path traversal, and **anything unrecognised** are blocked.
- **Verified against the real baseline:** the hotfix tree differs from live in **exactly 3 files**; `sw.js`, `_headers`, `vault-member/index.html` byte-identical.
- Stamps the **baseline** SHA, not HEAD — otherwise `deploy-currency` would report production as current while 400+ files stay unpromoted.
- Dispatch inputs pass through `env`, never spliced into a `run:` line (closes a script-injection surface; the YAML gate caught the first attempt).
- **The identity interlock is untouched and still reports `hold`.** This lane does not release it and cannot promote the backlog.

**SHIPPED.** Dispatched (`run 30220133234`): promotion gate stayed **held**, hotfix gate authorised, stamp-HEAD step correctly skipped, baseline stamped. `/franchise-architect/` is **live and styled** on the apex — browser-verified at 1280px and 390px.

**And the first real hotfix taught the lane something.** It shipped a fresh 404 alongside the fix: the deployed tree carries `assets/nav-sheet.shell-e821c7fa64.js`, HEAD's markup references `shell-d06b2465a0.js`, so overlaying newer HTML onto the older asset tree left that script missing on the three repaired pages (mobile nav degraded; page content fine). **A patch-style hotfix is not safe just because its file list is safe — its transitive references must exist too.** The gate now resolves every asset reference against `git ls-tree <baseline>` plus the hotfix set and refuses a would-be 404; `assets/*.shell-<hash>.(js|css)` became the one narrow executable exception, safe because hash-named and therefore additive. Self-test 25/25 → 36/36 (D-S294.10). A remediation dispatch including the shell asset is the next action.

**Dispatch shape:**

```
gh workflow run pages-deploy.yml \
  -f confirm_hotfix=true \
  -f hotfix_paths="franchise-architect/index.html franchise-architect/game.html franchise-architect/404.html assets/nav-sheet.shell-d06b2465a0.js"
```

Rollback is the same dispatch with no `hotfix_paths` (or re-run the baseline), since the tree is reconstructed from a commit already in production.

## Remaining founder decision

1. **Content-only hotfix lane?** A one-line static fix to a broken public page is currently blocked by unrelated Supabase migration state. Loosening a security interlock is a founder call (D-S294.3).
2. ~~**Play-CTA destination?**~~ **ANSWERED this session and implemented** — see the directive section above.

---

# Latest Handoff — Session 293

Last updated: 2026-07-26

**Session Intent (Session 293):** Run `/start → /audit → /implement → /closeout` as one continuous mission, saturate the genius list, generate and ship second-order innovation. **Outcome: Achieved with the production hold preserved.** Both carried primary items shipped, plus four second-order items generated from them; production was not promoted and was not touched.
