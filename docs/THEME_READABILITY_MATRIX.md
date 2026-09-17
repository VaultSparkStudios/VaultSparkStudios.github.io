# Theme Readability Matrix — CANON-047 AI image-test

Session 303 · 2026-08-02 · Harness: `scripts/capture-theme-matrix.mjs` (84 shots: 7 themes × 6 routes × 2 viewports, local static serve, theme applied pre-paint via `vs_theme`).

## Verdict

**PASS after two defects found and fixed.** All 7 themes (dark · light · ambient · warm · cool · lava · high-contrast) reviewed across `/`, `/games/`, `/membership/`, `/status/`, `/proof/`, `/atlas/` at 1366×900 and 390×844. No black-on-black, no light-on-white, no sub-WCAG-AA pairs observed in the reviewed set.

## Defects the image-test caught

1. **Sitewide pre-paint theme boot was silently broken (fixed).**
   `classList.remove.apply(document.documentElement, r)` invoked `remove` with the
   *element* as `this` → `TypeError: Illegal invocation`, swallowed by the boot's
   `try/catch` on **every page**. Themes only applied because `theme-toggle.js`
   re-applied them after paint — a per-load theme flash for every non-dark user.
   Pages without `theme-toggle.js` never themed at all.
   Fix in `scripts/build-shell-assets.mjs` `normalizeThemeBootstrap` (+ the copy in
   `scripts/generate-pathways.mjs`): `this` is now the `classList`. Propagated to
   all 113 pages.

2. **/atlas/ was un-themeable (fixed).**
   It was the one audited page missing `theme-toggle.shell.js`, so defect #1 left
   it permanently dark and picker-less. Verified light-mode render after fix:
   nav/text/theme-picker correct; the constellation panel keeps its deliberate
   night-sky treatment (a map of stars is dark by design, with a light-mode
   variant gradient).

## Review notes per theme (desktop unless noted)

| Theme | Verdict | Notes |
|---|---|---|
| dark | ✓ | Baseline; all six routes correct |
| light | ✓ | First-class: warm paper gradients, dark serif headings, gold CTAs keep contrast; /proof + /games verified in detail |
| ambient | ✓ | Subtle; text remains var-driven |
| warm | ✓ | — |
| cool | ✓ | — |
| lava | ✓ | Atmospheric red-black; status tiles + service rows readable |
| high-contrast | ✓ | Strong white/gold on black; membership hero verified |

## How to re-run

```
node scripts/capture-theme-matrix.mjs                    # all 84 shots → .cache/theme-matrix
node scripts/capture-theme-matrix.mjs --themes light --routes /atlas/   # targeted
```

Review the PNGs (an agent reads them directly; a human opens the folder). Record changes here.

## S356 recovery visual review — 2026-09-15

Re-captured and directly inspected 168 page-state images: the same 12 routes, seven themes, desktop 1366x900 and mobile 390x844. Review used 24 route/viewport contact sheets; the light status mobile capture was also inspected at native size. LATEST.json binds the captures to the recovered source. This is viewport coverage, not whole-page or interaction coverage.

Open contrast repairs: light-theme status operational labels, Studio Pulse orange eyebrow, and Oracle input placeholder. Studio Pulse hero CTAs and metadata also align flush to the viewport rather than the heading container. Complete inspection does not mean a clean release; LATEST records three blocking contrast findings pending repair. Oracle black-on-orange prompt button text is readable in these captures; the prior board selector description should not be treated as proven.

The root agent separately owns and inspected the newsletter unsubscribe before/after evidence in docs/visual-qa/unsubscribe/; that supplementary review is not counted in this 168-image matrix.
