# Production LCP Regression — Diagnosis Brief (S154)

Source data: `docs/PERF_TRACE_PROD_S153.json` + `data/perf-history.ndjson`.

## What the synthetic trace says

| Route | LCP | FCP | CLS | TTFB | DCL | Load |
|---|--:|--:|--:|--:|--:|--:|
| `/` (S153)        | **5156ms** | **5156ms** | 0.1058 | 272ms | 6815ms | 7420ms |
| `/` (S147 baseline median) | 2620ms | 1900ms | 0.1024 | n/a | n/a | n/a |
| `/membership/` (S153) | **3592ms** | n/a | >0.1 | n/a | n/a | n/a |
| `/membership/` (S147 baseline median) | 1224ms | n/a | <0.1 | n/a | n/a | n/a |

LCP element on `/`: `<span class="forge-letter">A</span>` (size 28372).
TTFB is healthy (272ms) → **not** a server or Cloudflare-edge problem.

## What this rules out

- **TTFB regression** — 272ms, fine.
- **Render-blocking CSS** — async stylesheet (`media=print` activation pattern) intact; critical-shell present at line 60 of `index.html`.
- **Third-party blocker** — gtag is idle-deferred (S147 fix verified in resources list).
- **Asset size bloat** — every script in the resources list is <5KB transfer, <500ms duration.
- **Deploy parity** — green per S153 trace (5/5 shell fingerprints match).

## What this points at

**FCP equals LCP equals 5156ms**, but every asset finishes <500ms. The only interpretation consistent with the resource timing is that **Chrome's LCP detector is not registering the `.forge-letter` SPAN as paintable until ~5.1 seconds** — even though static CSS sets `opacity:1`.

Candidate causes (ranked by likelihood):

1. **CSS animation defers LCP candidate registration.** `index.html:186-194` applies `animation: letterForge 0.72s ... forwards` to `.forge-letter`. The `letterForge` keyframes (line 400) start at `opacity:1` but include `transform: translateY(10px) scale(0.96)` at 0%. Per CWV spec, Chrome may defer the LCP candidate while transforms are active. With 17 letters × 0.065s stagger + 0.72s anim duration = ~1.83s of continuous transform activity. Doesn't explain 5.1s, but worth eliminating.
2. **Largest-Contentful-Paint API quirk with `text-shadow` + `will-change`.** The `.forge-letter` rule has both `will-change: transform, opacity` and a static `text-shadow`. `will-change` on a layer can interact with paint timing. Cheap to test (remove `will-change`).
3. **Hero-chamber `::before` paint stall.** The CLS source at `startTime: 5577ms` is the `.hero-chamber` `::before` (gradient overlay). The `hero::before` rule (line 146) paints three radial gradients with no `content` size — these can require layout recalc when nav/theme-picker mount.
4. **Real layout shift after nav hydrates.** The CLS source at 5577ms lists `NAV#nav-menu.nav-center` with full nav text — the nav menu is shifting after late hydration. Could indicate the entire above-fold is being repainted ~5.5s in.

## Recommended first investigative step (S155)

Open `/` in Chrome with DevTools → Performance tab → Record cold load → look for:
- **LCP candidate timeline** (Performance Insights pane): when did Chrome first register, and what subsequent candidate displaced it?
- **Web Vitals extension log**: which paint event is at 5156ms?
- **Layout & Paint events** between 4500-5800ms — what triggered them?

If the LCP candidate is registered earlier (e.g. 800ms) but later DISPLACED by the 5156ms candidate, the fix is to make the larger candidate paint sooner. If the candidate isn't registered until 5156ms, the fix is to remove the animation/will-change blocker.

## Recommended quick-wins to try in parallel (no risk, ship before live diagnosis)

1. **Remove the `forwards` fill-mode** from `.forge-letter` animation — letters start AND end at `opacity:1`, no transform-at-rest. Animation becomes pure enter motion.
2. **Drop `will-change: transform, opacity`** from `.forge-letter`. The CSS spec recommends `will-change` only during active animation, not as a static declaration. Often counterproductive.
3. **Add `contain: paint`** to `.hero-chamber` to isolate the radial-gradient `::before` from triggering full-page recalc when nav hydrates.

Any of these may shave seconds off LCP without behavior change. Test locally with `npm run verify:perf:local --routes=/` and compare to baseline `1664ms` (S150 local proof).

## Permanent fix gate

Once root cause is known, add a structural assertion to `scripts/check-critical-shell-geometry.mjs`:
- `.forge-letter` animation MUST NOT include `forwards` fill-mode
- OR `.forge-letter` MUST have `opacity:1` outside any animation context
- AND `.forge-letter` MUST NOT declare static `will-change`

This locks the fix at the contract layer so it cannot drift back into prod.

## Carry to S155

- Live RUM beacon (`#4 rum-realuser-vitals-pipeline`) — instrument real users so the next regression is caught in hours, not the next audit cycle.
- Re-run `scripts/measure-page-performance.mjs` against `/` after each candidate fix; compare to `data/perf-history.ndjson` median.
- Wire `--detect-regressions` into the Pages-deploy workflow as a post-deploy step (currently advisory at closeout only).
