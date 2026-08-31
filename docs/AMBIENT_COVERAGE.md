<!-- generated-by: scripts/report-ambient-coverage.mjs -->
<!-- generated-at: 2026-08-31 -->

# Ambient Bundle — Activation Shape Report

> STATIC activation-shape analysis (not a runtime execution trace). Identifies
> which always-shipped ambient modules gate their own work behind a runtime
> condition — the shortlist for a future conditional/lazy split. Runtime
> confirmation via the Playwright harness is the follow-up step.

- Sources: **17**  ·  Total: **77.0 KB** (raw)
- Guarded (conditional): **14** modules · **66.5 KB** — split candidates
- Always-on: **3** modules · **10.5 KB**

## By size (split candidates flagged)

| Source | Size | Shape | Why conditional |
|---|--:|:-:|---|
| `ambient-loader.js` | 21.3 KB | 🔶 guarded | session gated |
| `signed-in-state.js` | 6.6 KB | 🔶 guarded | session gated |
| `adaptive-speculation.js` | 5.5 KB | 🔶 guarded | — |
| `breadcrumb-render.js` | 5.5 KB | always | — |
| `vault-atlas.js` | 4.6 KB | 🔶 guarded | — |
| `native-feel.js` | 4.6 KB | 🔶 guarded | viewport gated, capability gated |
| `page-sigil.js` | 4.5 KB | 🔶 guarded | — |
| `edge-swipe-nav.js` | 3.8 KB | 🔶 guarded | capability gated |
| `hover-prefetch.js` | 3.3 KB | 🔶 guarded | viewport gated, session gated, capability gated |
| `command-palette-loader.js` | 3.0 KB | always | — |
| `rum-beacon.js` | 3.0 KB | 🔶 guarded | — |
| `pointerdown-warm.js` | 2.4 KB | 🔶 guarded | — |
| `founder-presence-handle.js` | 2.1 KB | 🔶 guarded | — |
| `scroll-depth.js` | 2.0 KB | always | — |
| `tt-default-policy.js` | 2.0 KB | 🔶 guarded | — |
| `account-chip-loader.js` | 1.5 KB | 🔶 guarded | session gated |
| `scroll-reveal.js` | 1.2 KB | 🔶 guarded | viewport gated |

## Read

A 🔶 guarded module ships to every page but only executes under its condition
(a query param, a viewport, a session, an element). The largest guarded modules
are the highest-value candidates to move behind a conditional `import()` so the
cold-bundle parse cost drops for visitors who never trigger them.
