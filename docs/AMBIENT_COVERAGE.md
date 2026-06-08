<!-- generated-by: scripts/report-ambient-coverage.mjs -->
<!-- generated-at: 2026-06-08 -->

# Ambient Bundle — Activation Shape Report

> STATIC activation-shape analysis (not a runtime execution trace). Identifies
> which always-shipped ambient modules gate their own work behind a runtime
> condition — the shortlist for a future conditional/lazy split. Runtime
> confirmation via the Playwright harness is the follow-up step.

- Sources: **23**  ·  Total: **90.7 KB** (raw)
- Guarded (conditional): **15** modules · **53.7 KB** — split candidates
- Always-on: **8** modules · **37.0 KB**

## By size (split candidates flagged)

| Source | Size | Shape | Why conditional |
|---|--:|:-:|---|
| `rank-orb.js` | 7.0 KB | always | — |
| `rate-page.js` | 6.6 KB | always | — |
| `intent-flight-director.js` | 5.5 KB | always | — |
| `adaptive-speculation.js` | 5.2 KB | 🔶 guarded | — |
| `ambient-loader.js` | 5.1 KB | 🔶 guarded | query-param gated, viewport gated, session gated |
| `ignis-lens.js` | 5.0 KB | always | — |
| `breadcrumb-render.js` | 4.7 KB | always | — |
| `signed-in-state.js` | 4.7 KB | 🔶 guarded | session gated |
| `vault-rank-bar.js` | 4.6 KB | 🔶 guarded | session gated |
| `ignis-answer-engine.js` | 4.4 KB | always | — |
| `vault-atlas.js` | 4.4 KB | 🔶 guarded | — |
| `page-sigil.js` | 4.4 KB | 🔶 guarded | — |
| `scroll-depth.js` | 4.2 KB | 🔶 guarded | session gated |
| `edge-swipe-nav.js` | 3.8 KB | 🔶 guarded | capability gated |
| `native-feel.js` | 3.3 KB | 🔶 guarded | viewport gated, capability gated |
| `hover-prefetch.js` | 3.3 KB | 🔶 guarded | viewport gated, session gated, capability gated |
| `command-palette-loader.js` | 3.0 KB | always | — |
| `pointerdown-warm.js` | 2.4 KB | 🔶 guarded | — |
| `tt-default-policy.js` | 2.1 KB | 🔶 guarded | — |
| `rum-beacon.js` | 2.1 KB | 🔶 guarded | — |
| `account-chip-loader.js` | 2.0 KB | 🔶 guarded | session gated |
| `founder-presence-handle.js` | 2.0 KB | 🔶 guarded | — |
| `scroll-reveal.js` | 0.8 KB | always | — |

## Read

A 🔶 guarded module ships to every page but only executes under its condition
(a query param, a viewport, a session, an element). The largest guarded modules
are the highest-value candidates to move behind a conditional `import()` so the
cold-bundle parse cost drops for visitors who never trigger them.
