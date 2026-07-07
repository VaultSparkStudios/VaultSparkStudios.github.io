# Implement Plan — Session 267

## Efficiency Order

1. Ship the RUM beacon visibility/navigation context at the source.
2. Preserve that context through Worker ingest with bounded, public-safe sanitization.
3. Filter unusable field-vitals rows in `rollup-rum` and regenerate derived RUM artifacts.
4. Record the homepage LCP intervention as honestly deferred until valid post-deploy field samples accrue.

## Verification

- `node --check assets/rum-beacon.js`
- `node --check cloudflare/security-headers-worker.js`
- `node --check scripts/rollup-rum.mjs`
- `node scripts/rollup-rum.mjs --self-test`
- `node scripts/rollup-rum.mjs`
- `node scripts/pull-rum-summary.mjs --force`
- `node scripts/check-perf-budget.mjs --source=rum`
- `npm run build`
- `npm run build:check`
