#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { DISCOVERY_PATHS, isDiscoveryPath, validateDiscoveryBundle } from './lib/discovery-content.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const arg = (name, fallback = '') => { const at = args.indexOf(name); return at >= 0 && args[at + 1] ? args[at + 1] : fallback; };
const selected = arg('--paths').split(/[\s,]+/).filter(isDiscoveryPath).sort();

export async function verifyServed(origin, paths) {
  const expected = { '.well-known/llms.txt': /text\/plain/i, 'agents.json': /(?:application|text)\/json/i, 'robots.txt': /text\/plain/i, 'sitemap.xml': /xml/i };
  const results = [];
  for (const rel of paths) {
    const url = new URL(`/${rel}`, origin);
    url.searchParams.set('discovery-lane-verify', Date.now());
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20_000) });
    const body = await response.text();
    const contentType = response.headers.get('content-type') || '';
    const ok = response.ok && expected[rel].test(contentType) && body.length > 20;
    results.push({ path: rel, status: response.status, contentType, bytes: Buffer.byteLength(body), ok });
  }
  return { ok: results.every((entry) => entry.ok), results };
}

async function main() {
  if (args.includes('--self-test')) {
    const fixture = {
      '.well-known/llms.txt': '# Studio\nhttps://vaultsparkstudios.com/api/citation.json',
      'agents.json': JSON.stringify({ discovery: { sitemap: 'https://vaultsparkstudios.com/sitemap.xml', llmsTxt: 'https://vaultsparkstudios.com/.well-known/llms.txt' } }),
      'robots.txt': 'Allow: /.well-known/llms.txt\nSitemap: https://vaultsparkstudios.com/sitemap.xml',
      'sitemap.xml': '<?xml version="1.0"?><urlset><url><loc>https://vaultsparkstudios.com/</loc></url></urlset>',
    };
    const good = validateDiscoveryBundle((rel) => fixture[rel]);
    const bad = validateDiscoveryBundle((rel) => rel === 'agents.json' ? '{' : fixture[rel]);
    if (!good.ok || bad.ok || !/^[a-f0-9]{64}$/.test(good.manifestRoot)) throw new Error('discovery mutation self-test failed');
    console.log('check-discovery-content-lane: self-test passed (valid + malformed mutation)');
    return;
  }
  const local = validateDiscoveryBundle((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  let served = null;
  const origin = arg('--origin');
  if (origin && selected.length) served = await verifyServed(origin, selected);
  const result = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    selected,
    discoverySelected: selected.length > 0,
    bundle: { manifestRoot: local.manifestRoot, leaves: local.leaves, urlCount: local.urlCount },
    localVerdict: local.ok ? 'coherent' : 'failed',
    servedVerdict: served ? (served.ok ? 'verified' : 'failed') : 'not-requested',
    served,
    publicSafe: true,
  };
  const output = arg('--json-out');
  if (output) { fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true }); fs.writeFileSync(path.resolve(output), `${JSON.stringify(result, null, 2)}\n`); }
  if (!local.ok || served && !served.ok) {
    for (const finding of local.findings) console.error(`  ✗ ${finding}`);
    for (const entry of served?.results || []) if (!entry.ok) console.error(`  ✗ ${entry.path}: HTTP ${entry.status}, content-type ${entry.contentType || '(missing)'}`);
    process.exit(1);
  }
  console.log(`check-discovery-content-lane: ${selected.length ? `${selected.length} selected` : 'no-op'} · bundle ${local.manifestRoot.slice(0, 12)} · ${local.urlCount} sitemap URLs${served ? ' · served verified' : ''}`);
}

main().catch((error) => { console.error(`check-discovery-content-lane: ${error.message}`); process.exit(1); });
