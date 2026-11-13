# Mobile Experience Audit — 2026-11-13

**Scope:** 5 viewports × 43 pages = 215 page-viewport probes.
**Viewports:** 360 (iPhone SE), 390 (iPhone 14), 430 (Pro Max), 768 (iPad portrait), 1024 (iPad landscape).
**Base URL:** `http://127.0.0.1:4173`

Screenshots live in `docs/mobile-audit/`. Raw findings in `docs/mobile-audit/findings.jsonl`.

## Summary

- **2** distinct issue types across **43** pages
- **P0 (breaks):** 0 types
- **P1 (usability):** 0 types
- **P2 (polish):** 2 types

## Prioritized findings

### [P2] font-too-small

**Affected pages:** 43 — home, games-landing, game-cod, game-gridiron, game-solara, game-vaultfront, game-mindframe, game-the-exodus, game-unknown, game-vs-fb-gm, …
**Viewports:** iphone-se, iphone-14, iphone-pro-max

<details><summary>Sample offenders</summary>

- `home` @ iphone-se — 15 text block(s) under 13px
  - `{"tag":"span","fs":10.4,"text":"AI & SUPER INTELLIGENCE (SI) STUDIO  · GAMES  ·  T"}`
  - `{"tag":"a","fs":12.5,"text":"LATEST FROM THE FORGE\nA clearer studio, from the V"}`
  - `{"tag":"span","fs":10.4,"text":"LATEST FROM THE FORGE"}`
  - `{"tag":"span","fs":12.5,"text":"A clearer studio, from the Vault to the investor r"}`
- `games-landing` @ iphone-se — 28 text block(s) under 13px
  - `{"tag":"span","fs":12,"text":"🔥 SPARKED"}`
  - `{"tag":"span","fs":12,"text":"⚒️ IN THE FORGE"}`
  - `{"tag":"span","fs":12,"text":"🔒 VAULTED"}`
  - `{"tag":"span","fs":12,"text":"NO DOWNLOAD"}`
- `game-cod` @ iphone-se — 13 text block(s) under 13px
  - `{"tag":"span","fs":11.2,"text":"⚒ IN THE FORGE"}`
  - `{"tag":"span","fs":10.4,"text":"RIGHT NOW"}`
  - `{"tag":"span","fs":12.5,"text":"VAULT RATING"}`
  - `{"tag":"span","fs":12.8,"text":"First Climb quest: play two Vault games"}`

</details>

### [P2] img-missing-dimensions

**Affected pages:** 2 — home, press
**Viewports:** iphone-se, iphone-14, iphone-pro-max, ipad-portrait, ipad-landscape

<details><summary>Sample offenders</summary>

- `home` @ iphone-se — 1 image(s) without width/height attrs
  - `{"src":"/assets/covers/doodie.png","w":326,"h":201}`
- `home` @ iphone-14 — 1 image(s) without width/height attrs
  - `{"src":"/assets/covers/doodie.png","w":356,"h":201}`
- `press` @ iphone-14 — 1 image(s) without width/height attrs
  - `{"src":"/assets/brand/logo-cinematic.webp","w":308,"h":308}`

</details>

## Per-page rollup

| Page | URL | Worst | Issues (across all VPs) |
|---|---|---|---|
| `home` | / | P2 | 8 |
| `press` | /press/ | P2 | 7 |
| `games-landing` | /games/ | P2 | 3 |
| `game-cod` | /games/call-of-doodie/ | P2 | 3 |
| `game-gridiron` | /games/gridiron-gm/ | P2 | 3 |
| `game-solara` | /games/solara/ | P2 | 3 |
| `game-vaultfront` | /games/vaultfront/ | P2 | 3 |
| `game-mindframe` | /games/mindframe/ | P2 | 3 |
| `game-the-exodus` | /games/the-exodus/ | P2 | 3 |
| `game-unknown` | /games/project-unknown/ | P2 | 3 |
| `game-vs-fb-gm` | /games/franchise-architect/ | P2 | 3 |
| `projects-landing` | /projects/ | P2 | 3 |
| `project-vorn` | /projects/vorn/ | P2 | 3 |
| `project-velaxis` | /projects/velaxis/ | P2 | 3 |
| `project-promogrind` | /projects/promogrind/ | P2 | 3 |
| `project-statvault` | /projects/statvault/ | P2 | 3 |
| `project-canon` | /projects/canon/ | P2 | 3 |
| `project-ideaforge` | /projects/ideaforge/ | P2 | 3 |
| `project-living` | /projects/the-living-protocol/ | P2 | 3 |
| `universe-landing` | /universe/ | P2 | 3 |
| `universe-voidfall` | /universe/voidfall/ | P2 | 3 |
| `universe-dreadspike` | /universe/dreadspike/ | P2 | 3 |
| `membership` | /membership/ | P2 | 3 |
| `how-we-build` | /how-we-build/ | P2 | 3 |
| `vault-member` | /vault-member/ | P2 | 3 |
| `studio` | /studio/ | P2 | 3 |
| `studio-hub` | /studio-hub/ | P2 | 3 |
| `studio-pulse` | /studio-pulse/ | P2 | 3 |
| `ignis` | /ignis/ | P2 | 3 |
| `leaderboards` | /leaderboards/ | P2 | 3 |
| `journal` | /journal/ | P2 | 3 |
| `journal-post` | /journal/vault-opened/ | P2 | 3 |
| `contact` | /contact/ | P2 | 3 |
| `roadmap` | /roadmap/ | P2 | 3 |
| `changelog` | /changelog/ | P2 | 3 |
| `status` | /status/ | P2 | 3 |
| `notebook` | /notebook/ | P2 | 3 |
| `community` | /community/ | P2 | 3 |
| `project-signal` | /projects/signal-log/ | P2 | 2 |
| `project-vmember` | /projects/vault-member/ | P2 | 2 |
| `project-vpipe` | /projects/vault-pipeline/ | P2 | 2 |
| `faq` | /faq/ | P2 | 2 |
| `pathway-players` | /pathways/players/ | P2 | 2 |

## Recommended fix plan

Tackle in this order:

1. **P0 — layout-breaking issues** (horizontal overflow, bad/missing viewport meta, non-loading pages). Fix first; any one of these visibly breaks the experience.
2. **P1 — usability** (tap targets <40px, fixed-width elements > viewport, zoom-blocking viewport meta).
3. **P2 — polish** (tiny font sizes, images without dimensions causing CLS).

Pair each fix with the relevant entry above to know *where* in the codebase to look.
