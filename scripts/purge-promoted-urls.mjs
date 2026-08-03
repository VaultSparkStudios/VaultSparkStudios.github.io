#!/usr/bin/env node
/**
 * purge-promoted-urls.mjs — S304 (plan item 8).
 *
 * THE GAP IT CLOSES: after a content-lane deploy, `purge_everything` cleared
 * the zone cache but a URL-keyed edge layer kept serving a stale negative 404
 * for the newly promoted ledger (clean URL 404, any query-string 200 — the
 * S300 signature) until TTL expiry. Purge-by-URL evicts those entries; this
 * purges every promoted path explicitly and then VERIFIES eviction with
 * clean-URL probes instead of trusting the API's success flag (which has been
 * observed true while stale copies survived, and false while eviction landed).
 *
 * Inputs (env): LANE_PATHS (space-separated repo paths) · CF_PURGE_TOKEN · CF_ZONE_ID
 * Modes: --self-test (pure URL building) · default (purge + verify)
 */
const ORIGIN = 'https://vaultsparkstudios.com';
const SELF_TEST = process.argv.includes('--self-test');

/** Repo path → the URL(s) the edge caches for it. index.html gets its route form. */
export function urlsFor(repoPath) {
  const p = String(repoPath).trim().replace(/^\.?\//, '');
  if (!p) return [];
  const urls = [`${ORIGIN}/${p}`];
  if (p.endsWith('/index.html')) urls.push(`${ORIGIN}/${p.slice(0, -'index.html'.length)}`);
  else if (p === 'index.html') urls.push(`${ORIGIN}/`);
  return urls;
}

export function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function selfTest() {
  let pass = 0, fail = 0;
  const ok = (c, l) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.error(`  ✗ ${l}`); } };
  ok(urlsFor('data/staging-deploy-history.ndjson').length === 1 && urlsFor('data/staging-deploy-history.ndjson')[0].endsWith('/data/staging-deploy-history.ndjson'), 'plain file → one URL');
  ok(urlsFor('proof/index.html').includes(`${ORIGIN}/proof/`), 'index.html also purges its route form');
  ok(urlsFor('index.html').includes(`${ORIGIN}/`), 'root index purges the apex');
  ok(urlsFor('').length === 0, 'empty path yields nothing');
  ok(chunk([1, 2, 3, 4, 5], 2).length === 3 && chunk([1, 2, 3, 4, 5], 2)[2][0] === 5, 'chunking is exact');
  console.log(`purge-promoted-urls --self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

async function main() {
  const paths = String(process.env.LANE_PATHS || '').split(/\s+/).filter(Boolean);
  const token = process.env.CF_PURGE_TOKEN;
  const zone = process.env.CF_ZONE_ID;
  if (!paths.length) { console.log('purge-promoted-urls: no promoted paths — nothing to purge'); return; }
  if (!token || !zone) { console.error('purge-promoted-urls: CF_PURGE_TOKEN / CF_ZONE_ID missing'); process.exit(1); }

  const urls = [...new Set(paths.flatMap(urlsFor))];
  let purged = 0;
  for (const batch of chunk(urls, 30)) {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: batch }),
    });
    const body = await res.json().catch(() => ({}));
    if (body.success !== true) console.error(`  ⚠ purge batch reported success=false (${res.status}) — continuing; the probe below is the real verdict`);
    purged += batch.length;
  }
  console.log(`purge-promoted-urls: requested eviction of ${purged} URL(s) in ${chunk(urls, 30).length} batch(es)`);

  // The real verdict: clean-URL probes on a sample (first, last, and any
  // non-HTML path — the class that stayed stale last time).
  const sample = [...new Set([
    urls[0],
    urls[urls.length - 1],
    urls.find((u) => !u.endsWith('/') && !u.endsWith('.html')),
  ].filter(Boolean))];
  let failed = 0;
  for (const url of sample) {
    let status = 0;
    for (let attempt = 0; attempt < 3 && status !== 200; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 5000));
      status = (await fetch(url, { cache: 'no-store', redirect: 'manual' })).status;
    }
    console.log(`  probe ${url} → ${status}`);
    if (status !== 200) failed++;
  }
  if (failed) { console.error(`purge-promoted-urls: ${failed} sampled URL(s) still not serving 200 after purge`); process.exit(1); }
  console.log('purge-promoted-urls: eviction VERIFIED by clean-URL probes');
}

if (SELF_TEST) selfTest(); else await main();
