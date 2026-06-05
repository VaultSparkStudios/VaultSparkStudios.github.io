# Ambient Placement Matrix

Status: canonical · enforced by `scripts/check-ambient-placement.mjs` (wired into `npm run build:check`).

Seven ambient surfaces compete for the same top-right + top-edge real estate. S130 root-caused IGNIS-tour pill being misread as a "dot." This matrix prevents the next regression by documenting which surface owns which slot and why.

## Slot ownership

| Surface | Anchor | DOM rule | Z-index | Why |
|---|---|---|---|---|
| **Vault Genome Strip** | `position: fixed; top: 0; left: 0; right: 0; height: 3px;` | Always present sitewide. Drawn before any other ambient element. | `2147483646` (max-1) | The studio's pulse line — must never be obscured. Above sticky header. |
| **Rank Orb** | `nav-right` anchor in `.site-header` | Single owner of the nav-right anchor. Theme picker may co-exist via flex order. | inherits header (`100`) | The personalised identity surface — must sit beside the theme picker, never below. |
| **Page Sigil** | Inline at top of `<main>`, never fixed | Optional per-page; styling via `.page-sigil`. | flow | Per-page decoration. Never competes with nav. |
| **Hero Ticker** | `min-height: 42px; below hero CTA cluster` | Only below-hero element. Never in header. | flow | Sits in the hero's natural reading flow, not in chrome. |
| **Forge-Live tile** | Homepage spine, inline within `.studio-spine` | Homepage only. Not loaded on inner pages. | flow | Belongs to the home spine narrative; do not inject elsewhere. |
| **Edge-Swipe** | `position: fixed; left/right: 0; top: 25%; height: 50%; width: 8px` | Mobile-only. Pointer-events: none until swipe begins. | `1000` | Gesture affordance; visual presence is intentionally minimal. |
| **IGNIS Tour pill** | `position: fixed; bottom: 1.25rem; right: 1.25rem` — **opens on explicit gesture only** | Never persistent. Never visible without intent. Closes on first dismissal forever. | `2000` | S130 regression: a persistent corner pill reads as a stuck UI dot. Tour must be gesture-triggered (link from `/ignis/tour-button/` or explicit toggle). |
| **Founder Presence Underline** | CSS on `.brand-wordmark` when `body[data-founder-active]` | Not a DOM node — a 1px gold underline that flips on shared BroadcastChannel state. | n/a | S159 #13 — ambient sitewide cue without adding chrome. |

## Forbidden patterns

- Fixed elements anchored to `top: 0; right: 0` (collides with rank-orb anchor on mobile).
- Persistent corner pills that re-render every visit (the S130 "dot on scroll" class).
- Adding new sitewide ambient surfaces without amending this matrix and the structural gate.
- Z-index above `2147483646` (reserved for the genome strip).
- Hero ticker variants outside the hero region.

## Adding a new ambient surface

1. Propose the slot in `docs/AMBIENT_PLACEMENT_MATRIX.md` PR.
2. Add a structural rule to `scripts/check-ambient-placement.mjs` (each surface = one regex / DOM assertion).
3. Build:check must pass before merge.
4. If the surface needs the same slot as an existing surface, the older surface either moves or is retired.

## Related canon

- S130 mobile drawer overhaul (`feedback_mobile_navbrand_icon_only`).
- S132 stacking-context trap (`feedback_theme_selector_specificity`).
- S156 BroadcastChannel cross-tab presence mirror (`project_s156_contract7_perf_budget_edge_swr`).
- CANON-006 brand-anchor (the genome strip + rank-orb are part of brand surface compliance).
