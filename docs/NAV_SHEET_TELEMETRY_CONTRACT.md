# Nav-Sheet Graduation Telemetry — Contract (S163 · audit #8)

**Purpose.** Replace the stuck "founder verifies `?nav=sheet` on one iPhone" gate
(open since S160) with a *data* decision. The mobile bottom-sheet stays behind its
flag; this instrumentation measures how it actually performs in the field so the
default-swap is evidence-led.

## What's wired now

- **Client emission** — `assets/nav-sheet.js` fires a privacy-minimized beacon on
  each interaction via `navigator.sendBeacon('/v/rum', …)`:
  - `nav-sheet:open` · `nav-sheet:close` · `nav-sheet:drag-close` · `nav-sheet:backdrop-close`
  - Payload is `{ route, ux }` only. No IDs, no free text, fire-and-forget.
- **Worker ingest** — `cloudflare/security-headers-worker.js` stores an additive,
  **allowlisted** `ux` field on the RUM row (`RUM_UX_EVENTS`). Vitals-only beacons
  store `ux: null` and behave exactly as before — strictly additive, no validation
  weakening.

## What activates the decision (follow-up)

The events land in the same R2 bucket as vitals (`rum/raw/dt=…`). To turn them
into a swap decision:

1. Extend `scripts/rollup-rum.mjs` to also count `ux` events per day (it currently
   rolls vitals only).
2. Add `/api/nav-sheet-stats.json` from the rollup: `{ opens, closeByCause:{close,
   drag-close, backdrop-close}, days }`.
3. **Read the signal.** Healthy adoption looks like: a non-trivial open rate and a
   *low* backdrop-close share (backdrop-close often = accidental open / dismiss).
   Drag-close is intentional, healthy use.

## The swap

When the stats support it, flip the default in `assets/nav-sheet.js::shouldActivate()`
for `(max-width: 768px)` and log the decision + the numbers in `context/DECISIONS.md`.
Until then the drawer remains default — zero regression risk.

> Mirrors the RUM field-LCP gate pattern (audit #1): wire the loop now, let it
> activate when real data flows, rather than block on a single device.
