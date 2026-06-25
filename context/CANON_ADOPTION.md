# Canon Adoption — VaultSparkStudios.github.io

> ACTIVELY CHECKED against the live `vaultspark-studio-ops/docs/STUDIO_CANON.md` (founder directive S183).
> Refresh: `node ../vaultspark-studio-ops/scripts/check-canon-adoption.mjs --project . --write`.
> Mark each: **adopted** · **pending** · **review** · **exempt (reason)**. This file is maintained, not auto-trusted.
> Walked in full at **S219** (2026-06-23) — first active posture pass (file was previously absent).

Audience: public-live · Type: website (brand anchor) · Archetype: A (Cloudflare Pages + Workers + Supabase) · Live ACTIVE canons: 50

| Canon | Title | Status | Evidence / note |
|---|---|---|---|
| CANON-001 | Rolling Status HTML comment markers | adopted | `SELF_IMPROVEMENT_LOOP.md` uses `<!-- rolling-status-start/end -->`. |
| CANON-002 | Sessions 1–3 Calibration Window | adopted | Past calibration (S219); observed historically. |
| CANON-003 | initiate.md separate from start.md | adopted | Both `prompts/initiate.md` + `prompts/start.md` present. |
| CANON-004 | studioOsApplied requires Layer 1 SIL | adopted | Full SIL format + closeout/start prompts in place. |
| CANON-005 | CDR gap recovery at start/closeout | adopted | Both prompts include CDR recovery; doctor reports no gap. |
| CANON-006 | Public branding link-back | adopted | **Brand anchor** — this site IS the link target; auto-footer + branding on all external pages. Internal pages exempt per CLAUDE.md. |
| CANON-007 | Staging before deploy | adopted | `website.staging.vaultsparkstudios.com` (Hetzner) + `check-staging-parity` gate. |
| CANON-008 | Proprietary by default | adopted | `docs/RIGHTS_PROVENANCE.md` = Proprietary, All Rights Reserved; footer notice. |
| CANON-009 | SIL rubric 10×100=1000 | adopted | Closeout scores v3.0 (1000pt). |
| CANON-010 | Claude+Codex parity | adopted | Skills/hooks/MCP parity; agent-neutral protocol. |
| CANON-011 | Universal sitemap standard | adopted | `sitemap.xml` + `agents.json` + `/.well-known/llms.txt` + strict CSP; `check-sitemap-compliance` clears. |
| CANON-012 | Secrets gateway | adopted | `scripts/lib/secrets.mjs` `getSecret()`; no raw `.env` reads. |
| CANON-013 | 3 low-cost archetypes | adopted | **Archetype A** — Cloudflare Pages + Worker + Supabase edge fns. |
| CANON-015 | Claude Max first; API needs approval | adopted | No paid-API spend; build-time generators only. |
| CANON-016 | Studio OS propagation | adopted | Receives AGENTS universal-sections propagation. |
| CANON-017 | Free/scaleable integrations | adopted | Supabase + Cloudflare free tiers; build-vs-buy bias to build. |
| CANON-018 | Cross-repo via Studio Ark | adopted | `scripts/ark.mjs` ship/drain; never write sibling trees. |
| CANON-019 | Founder-Action Discipline | adopted | `blocker-preflight` + secrets discovery run at start before any block label. |
| CANON-020 | Analytica analytics plane | review | Site uses first-party `/v/rum` beacon + rollups; Analytica plane integration not yet wired — local RUM is source-of-truth today. |
| CANON-021 | Obelisk trust+capability | review | `context/OBELISK_ADOPTION.md` phase-0 declared; `assets/identity.js` provider-agnostic wrapper (Supabase→Obelisk switchable). Migration in flight. |
| CANON-022 | Agent Co-Authoring | adopted | Implementer role; source-of-truth owned here, canon/propagation owned by studio-ops. |
| CANON-023 | Obelisk Package Trust | adopted | `package-trust.mjs` + `scan-npm-supply-chain` gate before installs. |
| CANON-024 | Broad-approval verification | adopted | Founder-twin PreToolUse hook; deny patterns gate at founder. |
| CANON-025 | Trinity VEILOS/IGNIS/Obelisk | exempt | Studio trust/infra plane; not a website concern (consumes derived outputs only). |
| CANON-026 | IGNIS private-by-default | adopted | Public IGNIS surfaces are sanitized/derived (`sanitize-public-oracle-feed`); no private internals exposed. |
| CANON-027 | PQC migration-ready language | exempt | No cryptographic claims/crypto features on public surfaces requiring migration-ready language. Revisit if crypto/auth copy added. |
| CANON-028 | Founder Identity Privacy | adopted | No personal name/email on public surfaces; generic `founder@`/`security@vaultsparkstudios.com`. |
| CANON-029 | Free-Tier Cost Discipline | adopted | Free tier cost-neutral; `cost` notional flat-rate; no variable cost on free plans. |
| CANON-030 | Acronym Expansion | adopted | `check-vocabulary-consistency` + public copy spells acronyms on first use. |
| CANON-031 | Observability Honesty | adopted | Honest-dark publishing; `check-sil-integrity`, dead-CTA, field-win-proof gates; no lying surfaces. |
| CANON-032 | Build-Optimal for Flagships | adopted | Brand-anchor flagship; no premature constraint. |
| CANON-033 | Launch Announcement Discipline | adopted | No silent launches; changelog + journal dispatches. |
| CANON-034 | Browser Experience Excellence | adopted | Browser-first; PWA service worker; never second-class. |
| CANON-035 | Project Brand Identity | adopted | Logo, favicon, brand kit (`/brand/`), bespoke OG cards. |
| CANON-036 | Deploy Currency Discipline | adopted | `api/build-sha.json` beacon + deploy-tip + deploy-gaps probes (prod must not lag main). |
| CANON-037 | Canon Half-Life / consistency | adopted | This file + `check-canon-adoption` re-confirmation cadence. |
| CANON-038 | Shared Self-Host Server | adopted | Staging on shared Hetzner box (isolated). |
| CANON-039 | Build-It-Ourselves | adopted | Own scripts/generators; internal-first; OSS researched before adopt. |
| CANON-040 | Agent-Deployed Migrations | adopted | Supabase migrations applied by agent behind safety gates. |
| CANON-041 | Mobile Parity + Elite Visual | adopted | `check-mobile-contracts` gate; 100dvh sheet drawer; desktop↔mobile parity. |
| CANON-042 | Studio Branding System + auto footer | adopted | Elite auto-updating footer; `update-footer.mjs` 96-page propagation; DBA rule observed. |
| CANON-043 | Baseline repo security hygiene | adopted | Dependabot ✓ (`.github/dependabot.yml`) + **`SECURITY.md` added S219** + GitHub secret scanning + supply-chain gate. |
| CANON-044 | In-session task scaffolding | adopted | TaskCreate Phase/Wave lists, reconciled at closeout. |
| CANON-045 | Obelisk unified identity+auth | review | `assets/identity.js` wrapper ready (one-line rollback); Obelisk signup/auth migration in flight (see CANON-021). |
| CANON-046 | Canon weighting / conflict | adopted | Tier-aware, autonomy-first conflict resolution observed. |
| CANON-047 | Theme system + AI-verified readability | adopted | Theme toggle (dark/light/project) + `check-studio-theme-evolution`. *Open:* card-accent cover-tint AI-image-test deferred — needs non-headless screenshot env (CANON-047 blocking on that one change only). |
| CANON-048 | Dual-audience Humans+AI | adopted | `agents.json` + `/.well-known/llms.txt` + JSON-LD + AI-discovery spine; GEO/AEO + SEO. |
| CANON-049 | Continuous evolution | adopted | Never static; SIL loop + audit/implement each session; menus/themes evolve. |
| CANON-050 | Atlas foundation | adopted | Atlas surface present; self-application principle observed. |
| CANON-051 | Web Hardening (edge-security baseline) | adopted | Strict CSP (`csp-audit`), SRI (`check-sri`), Cloudflare Worker security headers, `security.txt`, supply-chain verify. |

---

**S219 posture summary:** 46 adopted · 3 review (CANON-020 Analytica, CANON-021/045 Obelisk migration — all in-flight, not regressions) · 2 exempt-with-reason (CANON-025 studio-infra, CANON-027 no-crypto-claims) · 0 pending. One self-owned gap found and **closed this session**: CANON-043 `SECURITY.md` was missing → added.
