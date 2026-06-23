<!-- generated-by: scripts/build-ambient-ledger.mjs -->
# Ambient Bundle Ledger

> Reason-coded provenance for every ambient JS source. Derived from the live
> CORE/FEATURE bundle arrays + coverage candidate cache — NOT hand-maintained.
> Regenerate: `node scripts/build-ambient-ledger.mjs`.

**17 sources** · 14 core · 3 feature · **2 split-candidate(s)**

| Source | Bundle | Reason code | Size | Gates | Risk |
|---|---|---|--:|---|---|
| `assets/tt-default-policy.js` | core | sitewide-core | — | — | — |
| `assets/native-feel.js` | core | sitewide-core | — | — | — |
| `assets/scroll-reveal.js` | core | sitewide-core | — | — | — |
| `assets/scroll-depth.js` | core | sitewide-core | — | — | — |
| `assets/breadcrumb-render.js` | core | sitewide-core | — | — | — |
| `assets/signed-in-state.js` | core | split-candidate | 4.7kb | session gated | low |
| `assets/account-chip-loader.js` | core | sitewide-core | — | — | — |
| `assets/ambient-loader.js` | core | split-candidate | 17.7kb | query-param gated, viewport gated, session gated | medium |
| `assets/hover-prefetch.js` | core | sitewide-core | — | — | — |
| `assets/edge-swipe-nav.js` | core | sitewide-core | — | — | — |
| `assets/pointerdown-warm.js` | core | sitewide-core | — | — | — |
| `assets/command-palette-loader.js` | core | sitewide-core | — | — | — |
| `assets/adaptive-speculation.js` | core | sitewide-core | 5.2kb | — | low |
| `assets/rum-beacon.js` | core | sitewide-core | — | — | — |
| `assets/page-sigil.js` | feature | feature-bundle | 4.4kb | — | low |
| `assets/vault-atlas.js` | feature | feature-bundle | 4.4kb | — | low |
| `assets/founder-presence-handle.js` | feature | feature-bundle | — | — | — |

**Reason codes** — `sitewide-core`: shell primitive, must parse every page · `feature-bundle`: rotating engagement/intelligence surface · `split-candidate`: coverage flagged it gated → move to predicate loading next wave.
