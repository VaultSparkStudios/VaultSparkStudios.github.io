# Mobile Experience Audit — 2026-04-21

**Scope:** 5 viewports × 49 pages = 245 page-viewport probes.
**Viewports:** 360 (iPhone SE), 390 (iPhone 14), 430 (Pro Max), 768 (iPad portrait), 1024 (iPad landscape).
**Base URL:** `https://vaultsparkstudios.com`

Screenshots live in `docs/mobile-audit/`. Raw findings in `docs/mobile-audit/findings.jsonl`.

## Summary

- **3** distinct issue types across **49** pages
- **P0 (breaks):** 0 types
- **P1 (usability):** 1 types
- **P2 (polish):** 2 types

## Prioritized findings

### [P1] tap-target-too-small

**Affected pages:** 14 — universe-voidfall, universe-dreadspike, vaultsparked, studio-hub, studio-pulse, leaderboards, journal-post, contact, notebook, vault-wall, …
**Viewports:** iphone-se, iphone-14, iphone-pro-max

<details><summary>Sample offenders</summary>

- `universe-voidfall` @ iphone-se — 1 interactive element(s) under 40px min-dim
  - `{"tag":"a","text":"← UNIVERSE","w":118,"h":37}`
- `universe-dreadspike` @ iphone-se — 1 interactive element(s) under 40px min-dim
  - `{"tag":"a","text":"← UNIVERSE","w":118,"h":37}`
- `vaultsparked` @ iphone-se — 1 interactive element(s) under 40px min-dim
  - `{"tag":"button","text":"✕","w":24,"h":44}`

</details>

### [P2] font-too-small

**Affected pages:** 49 — home, games-landing, game-cod, game-gridiron, game-solara, game-vaultfront, game-mindframe, game-the-exodus, game-unknown, game-vs-fb-gm, …
**Viewports:** iphone-se, iphone-14, iphone-pro-max

<details><summary>Sample offenders</summary>

- `home` @ iphone-se — 129 text block(s) under 13px
  - `{"tag":"span","fs":11.5,"text":"🔥 MOST-PLAYED RIGHT NOW"}`
  - `{"tag":"span","fs":12.8,"text":"Sports Simulation"}`
  - `{"tag":"span","fs":12.8,"text":"Fantasy Worlds"}`
  - `{"tag":"span","fs":12.8,"text":"Comedy Chaos"}`
- `games-landing` @ iphone-se — 48 text block(s) under 13px
  - `{"tag":"span","fs":12,"text":"🔥 SPARKED"}`
  - `{"tag":"span","fs":12,"text":"⚒️ IN THE FORGE"}`
  - `{"tag":"span","fs":12,"text":"🔒 VAULTED"}`
  - `{"tag":"span","fs":12,"text":"NO DOWNLOAD"}`
- `game-cod` @ iphone-se — 11 text block(s) under 13px
  - `{"tag":"span","fs":11.7,"text":"🔥 SPARKED"}`
  - `{"tag":"span","fs":12.5,"text":"VAULT RATING"}`
  - `{"tag":"span","fs":12,"text":"Previous"}`
  - `{"tag":"a","fs":12.8,"text":"Subscribe on YouTube →"}`

</details>

### [P2] img-missing-dimensions

**Affected pages:** 4 — universe-landing, universe-dreadspike, journal-post, press
**Viewports:** iphone-se, iphone-14, iphone-pro-max, ipad-portrait, ipad-landscape

<details><summary>Sample offenders</summary>

- `universe-landing` @ iphone-se — 3 image(s) without width/height attrs
  - `{"src":"../assets/dreadspike-still-1.jpg","w":79,"h":158}`
  - `{"src":"../assets/dreadspike-still-2.jpg","w":79,"h":158}`
  - `{"src":"../assets/dreadspike-still-3.jpg","w":79,"h":158}`
- `universe-dreadspike` @ iphone-se — 3 image(s) without width/height attrs
  - `{"src":"../../assets/dreadspike-still-1.jpg","w":328,"h":185}`
  - `{"src":"../../assets/dreadspike-still-2.jpg","w":328,"h":185}`
  - `{"src":"../../assets/dreadspike-still-3.jpg","w":328,"h":185}`
- `journal-post` @ iphone-se — 1 image(s) without width/height attrs
  - `{"src":"/assets/vaultspark-icon.webp","w":42,"h":42}`

</details>

## Per-page rollup

| Page | URL | Worst | Issues (across all VPs) |
|---|---|---|---|
| `universe-dreadspike` | /universe/dreadspike/ | P1 | 11 |
| `journal-post` | /journal/vault-opened/ | P1 | 11 |
| `universe-voidfall` | /universe/voidfall/ | P1 | 6 |
| `vaultsparked` | /vaultsparked/ | P1 | 6 |
| `studio-hub` | /studio-hub/ | P1 | 6 |
| `studio-pulse` | /studio-pulse/ | P1 | 6 |
| `leaderboards` | /leaderboards/ | P1 | 6 |
| `contact` | /contact/ | P1 | 6 |
| `vault-wall` | /vault-wall/ | P1 | 5 |
| `leaderboard-global` | /leaderboards/global/ | P1 | 5 |
| `journal` | /journal/ | P1 | 5 |
| `notebook` | /notebook/ | P1 | 5 |
| `roadmap` | /roadmap/ | P1 | 4 |
| `community` | /community/ | P1 | 4 |
| `universe-landing` | /universe/ | P2 | 8 |
| `press` | /press/ | P2 | 8 |
| `home` | / | P2 | 3 |
| `games-landing` | /games/ | P2 | 3 |
| `game-cod` | /games/call-of-doodie/ | P2 | 3 |
| `game-gridiron` | /games/gridiron-gm/ | P2 | 3 |
| `game-solara` | /games/solara/ | P2 | 3 |
| `game-vaultfront` | /games/vaultfront/ | P2 | 3 |
| `game-mindframe` | /games/mindframe/ | P2 | 3 |
| `game-the-exodus` | /games/the-exodus/ | P2 | 3 |
| `game-unknown` | /games/project-unknown/ | P2 | 3 |
| `game-vs-fb-gm` | /games/vaultspark-football-gm/ | P2 | 3 |
| `projects-landing` | /projects/ | P2 | 3 |
| `project-vorn` | /projects/vorn/ | P2 | 3 |
| `project-velaxis` | /projects/velaxis/ | P2 | 3 |
| `project-promogrind` | /projects/promogrind/ | P2 | 3 |
| `project-statvault` | /projects/statvault/ | P2 | 3 |
| `project-canon` | /projects/canon/ | P2 | 3 |
| `project-ideaforge` | /projects/ideaforge/ | P2 | 3 |
| `project-living` | /projects/the-living-protocol/ | P2 | 3 |
| `project-signal` | /projects/signal-log/ | P2 | 3 |
| `project-vmember` | /projects/vault-member/ | P2 | 3 |
| `project-vfront` | /projects/vaultfront/ | P2 | 3 |
| `project-vpipe` | /projects/vault-pipeline/ | P2 | 3 |
| `membership` | /membership/ | P2 | 3 |
| `membership-value` | /membership-value/ | P2 | 3 |
| `vault-member` | /vault-member/ | P2 | 3 |
| `studio` | /studio/ | P2 | 3 |
| `ignis` | /ignis/ | P2 | 3 |
| `signal-log` | /signal-log/ | P2 | 3 |
| `join` | /join/ | P2 | 3 |
| `faq` | /faq/ | P2 | 3 |
| `ranks` | /ranks/ | P2 | 3 |
| `changelog` | /changelog/ | P2 | 3 |
| `status` | /status/ | P2 | 3 |

## Recommended fix plan

Tackle in this order:

1. **P0 — layout-breaking issues** (horizontal overflow, bad/missing viewport meta, non-loading pages). Fix first; any one of these visibly breaks the experience.
2. **P1 — usability** (tap targets <40px, fixed-width elements > viewport, zoom-blocking viewport meta).
3. **P2 — polish** (tiny font sizes, images without dimensions causing CLS).

Pair each fix with the relevant entry above to know *where* in the codebase to look.
