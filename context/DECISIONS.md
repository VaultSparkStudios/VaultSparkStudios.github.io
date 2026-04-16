# Decisions

Public-safe decisions retained in this repo:

### 2026-04-15 — Visitor-intelligence should route intent with lightweight local memory, not a chat UI (Session 74)

- Status: active
- Decision: the first public AI/pathways layer is implemented as a constrained pathway router (`player`, `member`, `supporter`, `investor`, `lore`) plus adaptive CTA copy and related-content rails, all backed by local pathway memory rather than a freeform chatbot.
- Why: this repo needed guidance and cohesion, not a generic chat widget. A constrained pathway layer improves navigation and conversion while staying brand-safe, static-site-friendly, and CSP-clean.
- Maintenance rule: new public entry pages should either render the shared pathway rail or explicitly justify why they do not.

### 2026-04-15 — Annual pricing may be displayed before checkout is live only if the route fails honestly (Session 74)

- Status: active
- Decision: `/vaultsparked/` may continue showing annual pricing preview, but annual checkout must not silently route through monthly logic. Until real annual Stripe plan keys exist, the UI must clearly state that annual checkout is not yet live.
- Why: the previous state implied annual was functionally available when it was still blocked by missing Stripe setup. Honest degradation is better than a misleading “working” toggle.
- Maintenance rule: once annual plan keys exist, replace the null placeholders in the billing/checkout config and remove the honesty warning path.

### 2026-04-15 — Startup protocol sync should preserve local targeted-read hardening while staying on the current studio-ops template line (S73)

- Status: active
- Decision: `prompts/start.md` is now resynced to template v3.2, but it keeps the S71 local rule that startup reads only the newest `LATEST_HANDOFF` block plus the SIL header/latest entry instead of reverting to full-history append-only reads.
- Why: the template-drift flag was real, but blindly replacing the local prompt would have reintroduced the clipped-startup problem that S71 fixed.
- Maintenance rule: when pulling future studio-ops prompt changes, merge them into the repo-local targeted-read discipline instead of overwriting it.

### 2026-04-15 — Closeout protocol sync should preserve repo-specific public-intelligence gates while staying on the current template line (S73)

- Status: active
- Decision: `prompts/closeout.md` is now resynced to template v3.2, but it retains the repo-local S72 rule that generated public-intelligence/contract files must be refreshed after truth changes.
- Why: the prompt-version drift needed to be cleared, but the website repo has a real generated-truth surface that generic closeout text does not fully capture on its own.
- Maintenance rule: future studio-ops closeout prompt updates should be merged into the repo-local public-intelligence gate rather than replacing it.

### 2026-04-15 — Public intelligence is now a contract-backed bridge across website, Studio Hub, and Social Dashboard (S72)

- Status: active
- Decision: `scripts/generate-public-intelligence.mjs` now emits both the public website payload (`api/public-intelligence.json`) and generated bridge contracts in `context/contracts/website-public.json`, `hub.json`, and `social-dashboard.json`.
- Why: S70 created the public intelligence payload, but it was still repo-local in schema. The missing leverage point was a shared public-safe contract that downstream surfaces could trust without scraping ad hoc fields.
- Maintenance rule: when listing metadata, runtime-pack integration data, Studio Hub registry metadata, or public pulse/social fields change, regenerate all contract/intelligence outputs together via `node scripts/generate-public-intelligence.mjs`.

### 2026-04-15 — Local-first browser verification is the default path for unshipped code (S72)

- Status: active
- Decision: unshipped browser verification should run against a local static preview via `scripts/local-preview-server.mjs` and `scripts/run-local-browser-verify.mjs`, not against production by default.
- Why: live-first Playwright checks only validate the last deployed site, which leaves working-tree regressions invisible during implementation. The new local preview path closes that gap for static-site work.
- Maintenance rule: use `npm run verify:local` or `node scripts/run-local-browser-verify.mjs <tests...>` for local smoke on changed public surfaces before relying on live-site checks.

### 2026-04-15 — Startup context loading should be section-scoped for append-only files (S71)

- Status: active
- Decision: `prompts/start.md` now treats `context/LATEST_HANDOFF.md` and `context/SELF_IMPROVEMENT_LOOP.md` as section-scoped startup sources rather than full-history reads. Startup should read only the newest handoff block, the SIL rolling header, and the latest SIL entry when needed.
- Why: the append-only files have grown large enough that full reads create clipped startup briefs, noisy context loading, and unstable optional checks even though only the newest sections matter for normal startup.
- Maintenance rule: during startup, probe optional files first and prefer targeted section/pattern reads over full-file reads for historical logs unless the user explicitly asks for history.

### 2026-04-15 — CSP policy generation now comes from one structured source shared by meta propagation, audit, and Worker headers (S70)

- Status: active
- Decision: page meta CSP, redirect-page CSP, and Cloudflare Worker CSP are now generated from `config/csp-policy.mjs` instead of being hand-maintained as separate long strings in multiple files.
- Why: S69 closed the repo-wide CSP debt, but the remaining maintenance risk was policy drift between propagation, audit, and live headers. One structured source cuts that drift surface materially.
- Maintenance rule: if a new inline script hash or allowlist domain is needed, update `config/csp-policy.mjs`, rerun `node scripts/propagate-csp.mjs`, and verify with `node scripts/csp-audit.mjs`.

### 2026-04-15 — Public operating surfaces should be generated from Studio OS truth, not hand-maintained HTML snapshots (S70)

- Status: active
- Decision: public-facing transparency/operating surfaces should consume a generated public-safe payload derived from repo truth files (`PROJECT_STATUS.json`, `TASK_BOARD.md`, `LATEST_HANDOFF.md`) instead of relying on hardcoded session-era copy in page HTML.
- Why: the audit found that the site’s “Studio OS” / transparency story was strategically strong but operationally stale. Generated truth keeps the public site synchronized with real studio state without exposing private operator detail.
- Maintenance rule: whenever public-facing operating status changes, rerun `node scripts/generate-public-intelligence.mjs` and keep `api/public-intelligence.json` aligned until this generation step is automated in closeout/build.

### 2026-04-15 — Manual Wrangler deploy is the approved fallback when Worker CSP must ship before GitHub automation exists (S69)

- Status: active
- Decision: until `CF_WORKER_API_TOKEN` exists in GitHub Actions, local Wrangler OAuth auth is the approved fallback for deploying `cloudflare/security-headers-worker.js`. After any such deploy, verify production headers with a browser-like request, not only a plain `curl -I`, because Cloudflare may challenge bot-like probes.
- Why: S69 completed the repo-wide CSP cleanup, but the live Worker header layer still required a production deploy. GitHub automation was still blocked by the missing secret; local Wrangler deploy + live header verification closed the gap safely in the same session.
- Maintenance rule: treat `scripts/propagate-csp.mjs`, `scripts/csp-hash-registry.json`, and `cloudflare/security-headers-worker.js` as a single CSP change surface. If one changes, audit locally, deploy the Worker, and verify live headers before closeout.

### 2026-04-15 — Browser render + CSP integrity are now first-class delivery gates (S68)

- Status: active
- Decision: this repo now treats real browser styling integrity and CSP hash integrity as deployment-grade checks, not optional diagnostics. `tests/computed-styles.spec.js` is the minimum browser smoke for homepage render correctness, and `scripts/csp-audit.mjs` is the source of truth for inline-script/CSP drift across page/meta/canonical/Worker layers.
- Why: S67 proved that HTTP 200 and DOM-level smoke checks were insufficient; the site can be "up" while visually broken. S68 also proved the inline-script/CSP debt is repo-wide rather than localized.
- Maintenance rule: when HTML inline scripts, CSP tags, or Worker CSP change, run `node scripts/csp-audit.mjs`. When top-level render structure changes on `/`, keep the computed-style smoke aligned with the new visual contract rather than removing the guard.

### 2026-04-13 — 404/offline CSP hardening: SHA-256 hashes replace unsafe-inline (S66)

- Status: active
- Decision: 404.html and offline.html now use computed SHA-256 hashes in `script-src` instead of `'unsafe-inline'`. Hashes stored in `scripts/csp-hash-registry.json` with a note per file. The `propagate-csp.mjs --check-skipped` flag detects drift if inline scripts change without a registry update.
- Hashes: GA4 init script shared between both pages (`sha256-09uD3fDDD02G8jqNYt/Z45AQPDzZopvEX50h3r6Gbrs=`). Each page has its own page-specific hash.
- Maintenance rule: if any inline script in 404.html or offline.html is modified, re-run `node -e "crypto.createHash('sha256').update(scriptContent).digest('base64')"` and update both the CSP meta tag and the registry.
- Why: removes the last `unsafe-inline` in script-src across all owned pages; closes the final CSP hardening gap opened in S53 when the main pages were hardened.

### 2026-04-13 — Genius Hit List audit framework established (S66)

- Status: active
- Decision: at session start, if the user requests a site audit, produce fresh external scores across six dimensions (Feature Depth, UI/UX, Feedback Loop, Security, Performance/Speed, Code Quality) and generate a ranked Genius Hit List for the session. Scores and hit list are saved to memory (`project_genius_hitlist.md`) and the hit list items are added to TASK_BOARD as Now items.
- Why: the SIL score tracks process and session quality; the external audit tracks the actual product quality from a user/visitor perspective. Both are needed for a complete picture. The gap between the two (SIL: 448/500 = 89.6% vs external: 81/100) reveals where process excellence isn't yet translating to product excellence.

### 2026-04-12 — Genesis Vault Member: badge naming and slot ownership (S56)

- Status: active
- Decision: The first-100 achievement badge is named "Genesis Vault Member" (slug: `genesis_vault_member`). "Founding Vault Member" was rejected to avoid legal ambiguity with the term "founder" (corporate/ownership connotations). "Pioneer" was scored and rejected as generic and potentially dated. "Genesis" won on distinctiveness, brand fit, longevity, and community flex factor.
- Slot ownership: Studio owner accounts (DreadSpike, OneKingdom, VaultSpark, Voidfall) hold the badge permanently but do not consume any of the 100 public slots. The `maybe_award_genesis_badge()` function excludes those UUIDs from the rank count, ensuring all 100 slots are reserved for public members.
- Why it matters: Protects the studio legally; makes the badge more memorable and community-meaningful; ensures public members feel the full weight of the limited slot count.

### 2026-04-06 — Light mode remains token-driven in the shared design system

- Status: active
- Decision: light-mode fixes should be applied in `assets/style.css` and theme metadata rather than page-by-page HTML patches whenever the issue is shared across public pages
- Why: the unreadable text problem was systemic (`--steel` and translucent dark-mode carryovers), so a token-and-surface pass is lower risk, easier to maintain, and keeps light mode a first-class global experience
- Preservation: page-specific CSS can still layer on top, but shared readability issues should be solved at the design-system level first

### 2026-03-31 — Public website repo keeps only public-safe operational material

- Status: active
- Decision: detailed handoffs, work logs, audits, local settings, and operator-only notes should not live in the public website repository in full detail

### 2026-04-03 — Public repo sanitization expanded to Studio OS tracked files

- Status: active
- Decision: tracked Studio OS context, log, audit, handoff, and local-tooling files in this repo were reduced to public-safe summaries or pointers
- Why: the website can stay deployable without exposing internal execution history, operator workflows, or sensitive planning detail
- Preservation: a local private backup of the pre-sanitization material was created outside the repo before the tracked copies were sanitized

### 2026-04-06 — IGNIS scoring wired to closeout protocol

- Status: active
- Decision: run `npx tsx cli.ts score` from `vaultspark-studio-ops/ignis/src/` at every closeout; update `ignisScore`/`ignisGrade`/`ignisLastComputed` in `context/PROJECT_STATUS.json`
- Why: Meta-Reasoning Self-Score Awareness was 20.7/100 due to only 3 sessions of history; compounding score history each closeout is the primary lever to push COGNITION and FORESIGHT pillars from D → C

### 2026-04-03 — Local Playwright credentials moved behind a private ignored file

- Status: active
- Decision: `.env.playwright.local.private` is now the preferred local credential source for Playwright, while `.env.playwright.local` stays safe as a template-style local file
- Why: local tests still need credentials, but the repo-facing local file should not hold real values

## 2026-04-06 — CANON-008: All VaultSpark IP is proprietary by default

**Decision:** All code, content, assets, and designs created by VaultSpark Studios are proprietary and all rights are reserved by VaultSpark Studios LLC unless an open-source license is explicitly declared and approved by the Studio Owner. No agent may apply or imply an open-source license without Studio Owner direction.

**Applies to this project:** Yes — `docs/RIGHTS_PROVENANCE.md` reflects this project's specific license status.

**Rationale:** VaultSpark Studios LLC is a commercial entity building owned IP. Open-sourcing any project without deliberate strategy gives away commercial advantage and creates ownership ambiguity.

**Studio canon:** `vaultspark-studio-ops/docs/STUDIO_CANON.md` → CANON-008

---
