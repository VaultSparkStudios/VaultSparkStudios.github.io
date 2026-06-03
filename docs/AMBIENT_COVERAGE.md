<!-- generated-by: scripts/report-ambient-coverage.mjs -->
<!-- generated-at: 2026-06-03 -->

# Ambient Bundle — Activation Shape Report

> STATIC activation-shape analysis (not a runtime execution trace). Identifies
> which always-shipped ambient modules gate their own work behind a runtime
> condition — the shortlist for a future conditional/lazy split. Runtime
> confirmation via the Playwright harness is the follow-up step.

- Sources: **31**  ·  Total: **134.3 KB** (raw)
- Guarded (conditional): **22** modules · **94.3 KB** — split candidates
- Always-on: **9** modules · **40.1 KB**

## By size (split candidates flagged)

| Source | Size | Shape | Why conditional |
|---|--:|:-:|---|
| `nav-sheet.js` | 9.7 KB | 🔶 guarded | query-param gated |
| `exit-intent.js` | 8.4 KB | 🔶 guarded | session gated, capability gated |
| `visit-depth.js` | 7.6 KB | 🔶 guarded | session gated, capability gated |
| `rank-orb.js` | 7.0 KB | always | — |
| `rate-page.js` | 6.6 KB | always | — |
| `presence-badge.js` | 6.1 KB | 🔶 guarded | session gated, capability gated |
| `vault-genome-strip.js` | 5.8 KB | 🔶 guarded | capability gated |
| `intent-flight-director.js` | 5.5 KB | always | — |
| `favicon-pulse.js` | 5.2 KB | 🔶 guarded | session gated |
| `ignis-lens.js` | 5.0 KB | always | — |
| `breadcrumb-render.js` | 4.7 KB | always | — |
| `signed-in-state.js` | 4.7 KB | 🔶 guarded | session gated |
| `adaptive-speculation.js` | 4.6 KB | 🔶 guarded | — |
| `vault-rank-bar.js` | 4.6 KB | 🔶 guarded | session gated |
| `ignis-answer-engine.js` | 4.4 KB | always | — |
| `vault-atlas.js` | 4.4 KB | 🔶 guarded | — |
| `scroll-depth.js` | 4.2 KB | 🔶 guarded | session gated |
| `page-sigil.js` | 3.9 KB | 🔶 guarded | — |
| `edge-swipe-nav.js` | 3.8 KB | 🔶 guarded | capability gated |
| `native-feel.js` | 3.3 KB | 🔶 guarded | viewport gated, capability gated |
| `hover-prefetch.js` | 3.3 KB | 🔶 guarded | viewport gated, session gated, capability gated |
| `rank-economy-simulator.js` | 3.2 KB | always | — |
| `feedback-decision-board.js` | 3.2 KB | 🔶 guarded | viewport gated |
| `command-palette-loader.js` | 2.8 KB | always | — |
| `pointerdown-warm.js` | 2.4 KB | 🔶 guarded | — |
| `rum-beacon.js` | 2.1 KB | 🔶 guarded | — |
| `account-chip-loader.js` | 2.0 KB | 🔶 guarded | session gated |
| `founder-presence-handle.js` | 2.0 KB | 🔶 guarded | — |
| `social-dashboard-public.js` | 1.6 KB | 🔶 guarded | element-presence gated |
| `security-posture.js` | 1.3 KB | 🔶 guarded | element-presence gated |
| `scroll-reveal.js` | 0.8 KB | always | — |

## Read

A 🔶 guarded module ships to every page but only executes under its condition
(a query param, a viewport, a session, an element). The largest guarded modules
are the highest-value candidates to move behind a conditional `import()` so the
cold-bundle parse cost drops for visitors who never trigger them.
