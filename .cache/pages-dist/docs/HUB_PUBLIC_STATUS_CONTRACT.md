# Hub Worker — `/public-status` Contract

Status: draft · website side ready (S160 #11). Awaits Studio Hub Worker deploy.

## Why

`vaultsparkstudios.com/status/` and the future `/oracle/` "Studio nervous system" tile need a live counts-only feed from the Studio Hub. CANON-018 forbids direct cross-repo file writes, so the data flows through an HTTP endpoint that the website Worker proxies + caches.

## Endpoint

`GET https://hub.vaultsparkstudios.com/public-status`

- Response: JSON, public — no auth.
- Counts only — no PII, no member-IDs, no project-internal status.
- Cache headers: `Cache-Control: public, max-age=300` (5 min edge cache).

## Response shape

```json
{
  "generatedAt": "<ISO-8601>",
  "studio": {
    "reposOnline": <int>,
    "activeSessions": <int>,
    "lastArkBroadcastAt": "<ISO-8601 | null>",
    "ignisHeartbeatAt": "<ISO-8601 | null>",
    "lastShippedSession": "<string e.g. 'S160' | null>"
  },
  "nervousSystem": [
    { "label": "<string>", "value": "<number | string>" }
  ]
}
```

The website ships a frozen seed at `/api/public-status.json` matching this exact shape. The Worker proxy will replace it once Hub side is live.

## Worker proxy plan (vaultsparkstudios.com)

Add Layer 0d to `cloudflare/security-headers-worker.js`:

```js
// Layer 0d: proxy /api/public-status.json from hub.vaultsparkstudios.com, KV-cached 5min.
if (url.pathname === '/api/public-status.json' && request.method === 'GET') {
  const cacheKey = 'pubstatus:v1';
  const cached = await env.RATE_LIMIT.get(cacheKey, { type: 'json' });
  if (cached && (Date.now() - cached._fetchedAt) < 300_000) {
    return new Response(JSON.stringify(cached.body), { headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' } });
  }
  try {
    const upstream = await fetch('https://hub.vaultsparkstudios.com/public-status', { cf: { cacheTtl: 60 } });
    if (!upstream.ok) throw new Error(String(upstream.status));
    const body = await upstream.json();
    await env.RATE_LIMIT.put(cacheKey, JSON.stringify({ body, _fetchedAt: Date.now() }), { expirationTtl: 600 });
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' } });
  } catch (_) {
    // Fall through to the static seed.
  }
}
```

## Coordination

Hub Worker is owned by the `vaultspark-studio-hub` repo. CANON-018 requires the website repo to ship cargo, not edit the hub directly:

```bash
node ../vaultspark-studio-ops/scripts/ark.mjs ship --type repo-question --to studio-hub \
  --payload '{"question":"deploy /public-status endpoint per docs/HUB_PUBLIC_STATUS_CONTRACT.md","context":"S160 #11 — website Worker proxy + /status/ tile ready, awaits upstream","replyTo":"vaultsparkstudios-website"}'
```

When the hub replies with deployment confirmation, this repo:
1. Lands Layer 0d in `security-headers-worker.js`
2. Replaces `/api/public-status.json` seed with `// proxied via Worker — see HUB_PUBLIC_STATUS_CONTRACT.md`
3. Adds the same tile to `/oracle/` as a "Studio nervous system" card.

## Why not embed inside the website repo?

Hub holds the source of truth for `reposOnline`, `activeSessions`, `lastArkBroadcastAt`. Synthesizing those server-side at vaultsparkstudios.com would duplicate state and drift. One source, one endpoint, edge-cached.
