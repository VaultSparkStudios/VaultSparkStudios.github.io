# Implementation Plan — The Desk article-bound visual system

Session: S313 · Source: `docs/AUDIT_2026-08-12.json`

## Wave 1 — Contract before pixels

- [x] `source-bound-editorial-art-contract` — require a unique asset, scene, three article anchors, scene alt, satire target/setup/payoff, and institutional targeting.
- [x] `zero-runtime-art-cost` — document and enforce committed authoring-time art with no public model/API call.
- [x] `news-brand-icon-contract` — add canonical VaultSpark favicon/icon declarations to every generated Desk page.

## Wave 2 — Article-specific art pipeline

- [x] `article-art-compositor` — integrate seven generated editorial scenes, exact deterministic captions, persona/date treatments, and social-card output.
- [x] `editorial-art-performance-budget` — emit bounded PNG/WebP/AVIF derivatives and keep source art off referenced public surfaces.
- [x] `visual-story-fingerprint` — expose public-safe visual intent, anchors, alt, and generated-art disclosure in the JSON Feed.

## Wave 3 — Reader-facing Desk

- [x] `news-index-visual-hierarchy-and-copy` — replace the hero/meta copy and add responsive art-led story cards.
- [x] `satire-target-and-comedy-gate` — enforce source-to-joke and institutional target constraints.
- [x] `art-accessibility-and-responsive-formats` — prove alt, dimensions, uniqueness, themes, and mobile/desktop pixels.

## Wave 4 — Release truth

- [ ] `production-content-freshness-proof` — stage, promote, purge canonical URLs, and verify exact live description/art bytes.
- [ ] Run focused News gates, full build, security/sanitization, Lighthouse mobile ≥90 or record measured exception, staging smoke, app release gate, direct-to-main push, live/CI verification.
