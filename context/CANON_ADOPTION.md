# Canon Adoption — vaultsparkstudios.github.io

> ACTIVELY CHECKED against the live `vaultspark-studio-ops/docs/STUDIO_CANON.md` (founder directive S183).
> Refresh: `node ../vaultspark-studio-ops/scripts/check-canon-adoption.mjs --project . --write`.
> Suggest: `node ../vaultspark-studio-ops/scripts/check-canon-adoption.mjs --project . --suggest` uses conformance evidence to pre-fill safe suggestions.
> Mark each: **adopted** · **pending** · **review** · **exempt (reason)**. This file is maintained, not auto-trusted.

Audience: public-live · Live ACTIVE canons: 54 · Pending review: 4

| Canon | Title | Status | Evidence / note |
|---|---|---|---|
| CANON-001 | Rolling Status headers use HTML comment markers for programm | adopted | `SELF_IMPROVEMENT_LOOP.md` uses `<!-- rolling-status-start/end -->`. |
| CANON-002 | Sessions 1–3 are a Calibration Window, excluded from studio- | adopted | Past calibration (S219); observed historically. |
| CANON-003 | prompts/initiate.md is separate from prompts/start.md for to | adopted | Both `prompts/initiate.md` + `prompts/start.md` present. |
| CANON-004 | studioOsApplied: true requires Layer 1 SIL format, not just  | adopted | Full SIL format + closeout/start prompts in place. |
| CANON-005 | CDR gap recovery check is mandatory at startup and closeout  | adopted | Both prompts include CDR recovery; doctor reports no gap. |
| CANON-006 | Every public-facing product must display VaultSpark Studios  | adopted | **Brand anchor** — this site IS the link target; auto-footer + branding on all external pages. Internal pages exempt per CLAUDE.md. |
| CANON-007 | Every project must have a staging environment before deployi | adopted | `website.staging.vaultsparkstudios.com` (Hetzner) + `check-staging-parity` gate. |
| CANON-008 | All VaultSpark IP is proprietary by default; open-source lic | adopted | `docs/RIGHTS_PROVENANCE.md` = Proprietary, All Rights Reserved; footer notice. |
| CANON-009 | SIL rubric is 10 × 100 = 1000 (v3.0) | adopted | Closeout scores v3.0 (1000pt). |
| CANON-010 | Claude Code and Codex must have strict skills + hooks + MCP  | adopted | Skills/hooks/MCP parity; agent-neutral protocol. |
| CANON-011 | Every public-facing project must follow the universal sitema | adopted | `sitemap.xml` + `agents.json` + `/.well-known/llms.txt` + strict CSP; `check-sitemap-compliance` clears. |
| CANON-012 | Every studio agent resolves credentials via the secrets gate | adopted | `scripts/lib/secrets.mjs` `getSecret()`; no raw `.env` reads. |
| CANON-013 | Every project picks one of 3 canonical low-cost archetypes a | adopted | **Archetype A** — Cloudflare Pages + Worker + Supabase edge fns. |
| CANON-015 | Claude Max Plan first; API requires founder approval + cost  | adopted | No paid-API spend; build-time generators only. |
| CANON-016 | Studio OS protocol/process/enforcement propagates ecosystem- | adopted | Receives AGENTS universal-sections propagation. |
| CANON-017 | Free, long-term, scaleable integrations preferred; build-vs- | adopted | Supabase + Cloudflare free tiers; build-vs-buy bias to build. |
| CANON-018 | All cross-repo agent communication MUST flow through Studio  | adopted | `scripts/ark.mjs` ship/drain; never write sibling trees. |
| CANON-019 | Founder-Action Discipline (try first, label blocked only wit | adopted | `blocker-preflight` + secrets discovery run at start before any block label. |
| CANON-020 | Analytica is the canonical Studio analytics + insight plane | review | Site uses first-party `/v/rum` beacon + rollups; Analytica plane integration not yet wired — local RUM is source-of-truth today. |
| CANON-021 | Obelisk is the Studio-wide trust + capability protocol | review | `context/OBELISK_ADOPTION.md` phase-0 declared; `assets/identity.js` provider-agnostic wrapper (Supabase→Obelisk switchable). Migration in flight. |
| CANON-022 | Agent Co-Authoring Protocol | adopted | Implementer role; source-of-truth owned here, canon/propagation owned by studio-ops. |
| CANON-023 | Obelisk Package Trust gates every agent install/download | adopted | `package-trust.mjs` + `scan-npm-supply-chain` gate before installs. |
| CANON-024 | Broad approvals require non-malicious action verification | adopted | Founder-twin PreToolUse hook; deny patterns gate at founder. |
| CANON-025 | Trinity role separation: VEILOS · IGNIS · Obelisk | exempt | Studio trust/infra plane; not a website concern (consumes derived outputs only). |
| CANON-026 | IGNIS visibility scope (private-by-default) | adopted | Public IGNIS surfaces are sanitized/derived (`sanitize-public-oracle-feed`); no private internals exposed. |
| CANON-027 | PQC migration-ready language discipline | exempt | No cryptographic claims/crypto features on public surfaces requiring migration-ready language. Revisit if crypto/auth copy added. |
| CANON-028 | Founder Identity Privacy (no personal name, no personal emai | adopted | No personal name/email on public surfaces; generic `founder@`/`security@vaultsparkstudios.com`. |
| CANON-029 | Free-Tier Cost Discipline (no variable cost on free plans) | adopted | Free tier cost-neutral; `cost` notional flat-rate; no variable cost on free plans. |
| CANON-030 | Acronym Expansion in Public Content (spell it out, acronym i | adopted | `check-vocabulary-consistency` + public copy spells acronyms on first use. |
| CANON-031 | Observability Honesty (no lying surfaces) | adopted | Honest-dark publishing; `check-sil-integrity`, dead-CTA, field-win-proof gates; no lying surfaces. |
| CANON-032 | Build-Optimal for Flagships (no premature constraint) | adopted | Brand-anchor flagship; no premature constraint. |
| CANON-033 | Launch Announcement Discipline (no silent launches) | adopted | No silent launches; changelog + journal dispatches. |
| CANON-034 | Browser Experience Excellence (browser is never second-class | adopted | Browser-first; PWA service worker; never second-class. |
| CANON-035 | Project Brand Identity (every project designs its own profes | adopted | Logo, favicon, brand kit (`/brand/`), bespoke OG cards. |
| CANON-036 | Deploy Currency Discipline (production must not silently lag | adopted | `api/build-sha.json` beacon + deploy-tip + deploy-gaps probes (prod must not lag main). |
| CANON-037 | Canon Half-Life and Automated Consistency (re-confirmation c | adopted | This file + `check-canon-adoption` re-confirmation cadence. |
| CANON-038 | Shared Studio Self-Host Server (one Hetzner box · isolated p | adopted | Staging on shared Hetzner box (isolated). |
| CANON-039 | Build-It-Ourselves, Internal-First, OSS-Research Discipline  | adopted | Own scripts/generators; internal-first; OSS researched before adopt. |
| CANON-040 | Agent-Deployed Migrations (AI agents apply database/infra mi | adopted | Supabase migrations applied by agent behind safety gates. |
| CANON-041 | Website Mobile Parity + Elite Visual Craft (full desktop↔mob | adopted | `check-mobile-contracts` gate; 100dvh sheet drawer; desktop↔mobile parity. |
| CANON-042 | Studio Branding System: approved usages, DBA rule, and the e | adopted | Elite auto-updating footer; `update-footer.mjs` 96-page propagation; DBA rule observed. |
| CANON-043 | Baseline repository security hygiene (free-tier: Dependabot  | adopted | Dependabot ✓ (`.github/dependabot.yml`) + **`SECURITY.md` added S219** + GitHub secret scanning + supply-chain gate. |
| CANON-044 | In-session task scaffolding (Phase/Wave lists), reconciled a | adopted | TaskCreate Phase/Wave lists, reconciled at closeout. |
| CANON-045 | Obelisk is the unified studio identity + auth plane (one stu | review | `assets/identity.js` wrapper ready (one-line rollback); Obelisk signup/auth migration in flight (see CANON-021). |
| CANON-046 | Canon weighting: tiers + autonomy-first conflict resolution  | adopted | Tier-aware, autonomy-first conflict resolution observed. |
| CANON-047 | Theme system + AI-verified human readability (no unreadable  | adopted | Theme toggle (dark/light/project) + `check-studio-theme-evolution`. *Open:* card-accent cover-tint AI-image-test deferred — needs non-headless screenshot env (CANON-047 blocking on that one change only). |
| CANON-048 | Dual-audience ecosystem: every surface built for Humans AND  | adopted | `agents.json` + `/.well-known/llms.txt` + JSON-LD + AI-discovery spine; GEO/AEO + SEO. |
| CANON-049 | Continuous evolution: the studio + every project is never st | adopted | Never static; SIL loop + audit/implement each session; menus/themes evolve. |
| CANON-050 | Atlas: the foundation that carries the ecosystem — and the s | adopted | Atlas surface present; self-application principle observed. |
| CANON-051 | Web Hardening: every public surface meets the edge-security  | adopted | Strict CSP (`csp-audit`), SRI (`check-sri`), Cloudflare Worker security headers, `security.txt`, supply-chain verify. |
| CANON-052 | Project Lifecycle Ladder: FORGE/SPARKED/VAULTED with sub-sta | review | Project uses FORGE/SPARKED/VAULTED vocab (`vaultStatus: SPARKED`) with `PROJECT_STATUS.json` as the single write path via closeout; sub-stage/gated-transition machinery not yet audited against the new canon — walk pending. |
| CANON-053 | Rendered-Pixel UI Discipline: look at the real interface whi | adopted | S304: docs/visual-qa/LATEST.json emitted by capture-theme-matrix.mjs --receipt (16 hash-bound captures, 7 themes, home+proof, desktop+mobile) — verified PASS by check-visual-qa.mjs. The S303 matrix review caught and fixed the sitewide theme-boot defect; regression-gated by check-theme-boot-contract.mjs. Re-run the harness with --receipt after any UI change. |
| CANON-054 | Public Stats Surface: every website reports and analyzes its | adopted (suggested) | Conformance checker passed: } |
| CANON-055 | Surface Follow-Through: every project change reaches the thi | adopted (suggested) | Conformance checker passed: } |

