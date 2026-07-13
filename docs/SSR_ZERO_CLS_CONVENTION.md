<!-- owner: build-time SSR + client hydrate convention -->
<!-- established: S277 (CLS root-fix) · documented: S278 -->

# Zero-CLS convention: build-time SSR + client skip/hydrate

> **The rule:** any widget whose content is known at build time must be **present in the
> committed HTML at first paint.** Post-paint injection (`fetch → append/insertBefore`) is
> the single largest layout-shift class this site keeps re-learning — S277 measured one
> such box at ~0.50 of a 0.73 CLS on `/changelog/`. Reserve height *and* render real
> content at build; the client may only **enrich in place**, never grow the box.

This is the standing pattern for every post-paint widget. Follow it and a new widget is
zero-CLS by default. The two S277 reference implementations below are the canonical shapes.

---

## Why post-paint injection is banned for build-known content

A script that runs after paint and inserts a `<section>` pushes everything below it down.
The browser scores that displacement as Cumulative Layout Shift — the worst offender on a
content page because the injected block is usually tall and lands above the fold's tail.
Two failure modes people reach for, and why they're inferior:

- **`min-height` reservation** — brittle. The reserved height is a guess that's wrong on
  some viewport (wrap count, font metrics, dynamic row count), so you either over-reserve
  (dead space) or under-reserve (residual shift). Real SSR content is correct on every
  viewport for free.
- **Opacity/visibility fade-in** — hides the shift from the eye but **not** from the CLS
  metric; the layout still moves. Lighthouse still scores it.

The fix is to render the real markup at build so the height is real at first paint.

---

## Pattern A — skip-when-SSR (static content)

Use when the widget's content is fully determined by a committed feed and the client adds
nothing per-visitor. Example: the "You asked → we shipped" closed-loop box on `/changelog/`.

**Shared renderer** — the ONE source both build and any browser consumer import, so the two
paths can never diverge (the divergence class — see `scripts/lib/decisions-corpus.mjs` and
the shared-reader memory):

- `assets/lib/you-asked-shipped-render.mjs` — pure, no I/O, no `Date.now()`. `ago()` takes
  an explicit `nowMs` (the feed's own `generatedAt`) so build output is deterministic and
  the `--check` drift gate is stable. `renderYasBox(data, nowMs)` returns `''` when no
  themed receipt has a feedback signal (honest-dark).

**Build generator** — `scripts/build-you-asked-shipped.mjs`:
- `--self-test` (unit-level invariants) and `--check` (drift gate) are both build:check steps.
- Emits the section wrapped with a **skip marker**: `<section class="vs-yas" data-yas-ssr>`.

**Client** (`assets/you-asked-shipped.js`) — bails the moment the SSR box exists:
```js
if (root.querySelector('[data-yas-ssr]')) return;   // line ~99 — SSR present, nothing to do
```
The client remains as a fallback for any surface not yet SSR'd; where SSR is present it is
inert. Net: zero fetch, zero injection, zero shift on the SSR'd route.

---

## Pattern B — re-rank-in-place / hydrate (personalized content)

Use when the widget has build-time default content **and** per-visitor client
personalization. Example: the Pathfinder panel (`intent-flight-director`) on `/`, `/games/`,
`/universe/`, `/membership/`, `/studio-pulse/`, `/oracle/`.

The trick that preserves both zero-CLS **and** local-first personalization: the build
renders a **fixed number of real slots**; the client **mutates the existing slots' content
in place** — it never inserts or removes a node, so the box height is stable.

**Shared renderer** — `assets/lib/flight-director-render.mjs` (pure + isomorphic; safe in
Node and browser):
- `FD_ROUTES` — the exact routes the panel renders on (mirror of the client's route list).
- `routeContext(pathname)` — pathname → graph context key (mirrors the client).
- `defaultCards(graph, context)` — deterministic default ordering (graph context order,
  sliced to 3) so the committed HTML is stable and the `--check` gate is real.
- `renderFlightPanel(cards)` — emits `<section class="vs-flight-director" data-fd-ssr>` with
  N card anchors, each `<a class="vs-flight-card" data-fd-key="…">` — the hydration hook.

**Build generator** — `scripts/build-flight-director.mjs` (`--self-test` + `--check` steps).

**Client** (`assets/intent-flight-director.js`) — detects the SSR panel and re-ranks the
same slots rather than rebuilding:
```js
var ssr = document.querySelector('.vs-flight-director[data-fd-ssr]');  // line ~107
// ...re-rank: for each of the (fixed count) .vs-flight-card slots, set data-fd-key + swap
// the eyebrow/title/copy/badge textContent — same slot count → stable height → no shift.
```
Because the slot **count** never changes, personalization cannot move the layout. Local-first
soul preserved, CLS 0.

---

## Checklist for the next post-paint widget

1. Is the content knowable at build time? → **yes:** SSR it. **no** (truly per-request only)
   → reserve exact height with real skeleton geometry, then swap content of equal height.
2. Put the markup builder in **one** `assets/lib/*-render.mjs` — pure, no `Date`/`Date.now()`
   /`Math.random()`, deterministic; import it from both the Node generator and any client.
3. Mark the SSR root with a `data-*-ssr` attribute.
4. Client contract: **skip** when the marker is present (Pattern A) or **mutate existing
   nodes in place** without changing node count (Pattern B). Never `append`/`insertBefore`
   build-known content post-paint.
5. Wire a `build-*.mjs --self-test` and `--check` pair into `build:check:steps` so the
   committed HTML can't drift from the feed.
6. `tests/cls-regression.spec.js` (8 routes @ 0.10 ceiling, e2e job) is the backstop — it
   will catch a regression, but the convention above is how you never trip it.

---

*Reference commit: `c9a3ff4b3` (S277). Libs: `assets/lib/you-asked-shipped-render.mjs`,
`assets/lib/flight-director-render.mjs`. Gate: `tests/cls-regression.spec.js`.*
