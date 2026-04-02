<!-- truth-audit-version: 1.0 -->
# Truth Audit

Last reviewed: 2026-04-02
Overall status: green
Next action: Supabase auth hardening (CAPTCHA + session timeout + email enumeration prevention) + newsletter secrets setup (see docs/NEWSLETTER_SETUP.md). Then restore local service-role path and rerun authenticated entitlement browser lane.

---

## Source Hierarchy

1. `context/PROJECT_STATUS.json`
2. `context/LATEST_HANDOFF.md`
3. `context/CURRENT_STATE.md`
4. Founder-facing derived Markdown

---

## Protocol Genome (/25)

| Dimension | Score | Notes |
|---|---|---|
| Schema alignment | 5 | Rank thresholds, plan labels, and membership surfaces now align more tightly around the generated entitlement config |
| Prompt/template alignment | 4 | Closeout/start prompts are locally modified in the worktree, but project truth files are now current |
| Derived-view freshness | 5 | `PROJECT_STATUS`, `CURRENT_STATE`, `LATEST_HANDOFF`, and SIL are refreshed through Session 29 |
| Handoff continuity | 5 | Current handoff reflects the preload session and remaining human-action blockers |
| Contradiction density | 4 | No active red contradictions; CURRENT_STATE VAPID key reference stale (BDf9 vs actual BPqk), minor |
| **Total** | **23 / 25** | Strong truth alignment; remaining risk is authenticated verification and human-action external setup |

---

## Drift Heatmap

| Area | Canonical source | Derived surfaces | Status | Last checked | Action |
|---|---|---|---|---|---|
| Project identity | `context/PROJECT_STATUS.json` | `context/PORTFOLIO_CARD.md` | green | 2026-03-31 | Keep Portfolio Card synced at next milestone change |
| Session continuity | `context/LATEST_HANDOFF.md` | startup brief | green | 2026-04-01 | Session 26 handoff reflects the delivered theme/rank/public-boundary work and the remaining auth blocker |
| Live state | `context/CURRENT_STATE.md` | founder summaries | green | 2026-04-01 | Theme persistence verification, rank-source cleanup, and public-safe handoff stubs are reflected |
| Protocol assets | `prompts/` | `docs/templates/project-system/` | yellow | 2026-03-31 | Local prompt files are modified; re-sync from studio-ops when intentionally updating protocol |
| Legal/public statements | `privacy/index.html`, `terms/index.html`, `vaultsparked/index.html` | footer notice, founder summaries | green | 2026-04-01 | Published privacy/IP language, VaultSparked pricing, and public root handoff stubs now match current repo boundaries |

---

## Contradictions

- None recorded.

---

## Freshness

- `context/PROJECT_STATUS.json`: 2026-04-01 review of 2026-03-31 session data
- `context/LATEST_HANDOFF.md`: 2026-04-01
- `context/CURRENT_STATE.md`: 2026-04-01
- Derived founder-facing views: 2026-04-01

---

## Recommended Actions

1. Restore the local service-role-backed auth path and rerun the targeted authenticated entitlement browser lane for free vs VaultSparked vs PromoGrind Pro.
2. Verify real production response headers after Cloudflare proxy enablement and record the result.
3. Refresh prompts/templates only if the local prompt edits are intentional and meant to become canon.
4. Keep reducing remaining portal inline surface drift when those screens are touched again.
