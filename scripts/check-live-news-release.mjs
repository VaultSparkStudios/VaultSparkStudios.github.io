#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import fs from 'node:fs';
import path, { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const EDGE_ORIGIN = (process.env.NEWS_RELEASE_ORIGIN || 'https://vaultsparkstudios.com').replace(/\/$/, '');
const CONTENT_ORIGIN = (process.env.NEWS_RELEASE_CONTENT_ORIGIN || EDGE_ORIGIN).replace(/\/$/, '');
const BROWSER_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
};
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function decodeHtml(value) {
  return value.replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
}

export function extractReleaseContract(html) {
  const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1];
  if (!description) throw new Error('candidate News page has no meta description');
  const artPaths = [...html.matchAll(/(?:src|srcset)="([^"]+)"/gi)]
    .flatMap((match) => match[1].split(',').map((part) => part.trim().split(/\s+/)[0]))
    .map((value) => value.replace(/^(?:\.\.\/)+/, '').replace(/^\//, ''))
    .filter((value) => /^assets\/og\/news\/.+\.(?:png|webp|avif)$/i.test(value));
  return { description: decodeHtml(description), artPaths: [...new Set(artPaths)].sort() };
}

function candidateStoryPaths() {
  const root = path.join(ROOT, 'news');
  const out = ['news/index.html'];
  for (const date of fs.readdirSync(root).filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name)).sort()) {
    const dateRoot = path.join(root, date);
    for (const slug of fs.readdirSync(dateRoot).sort()) {
      const rel = `news/${date}/${slug}/index.html`;
      if (fs.existsSync(path.join(ROOT, rel))) out.push(rel);
    }
  }
  return out;
}

async function fetchBytes(url, allowedStatuses = [200]) {
  const response = await fetch(url, { cache: 'no-store', headers: BROWSER_HEADERS, redirect: 'follow', signal: AbortSignal.timeout(15_000) });
  if (!allowedStatuses.includes(response.status)) throw new Error(`${url} returned HTTP ${response.status}`);
  return { status: response.status, bytes: Buffer.from(await response.arrayBuffer()) };
}

export async function verifyNewsRelease({ contentOrigin = CONTENT_ORIGIN, edgeOrigin = EDGE_ORIGIN } = {}) {
  const pages = [];
  const art = new Map();
  for (const rel of candidateStoryPaths()) {
    const candidateBytes = await readFile(path.join(ROOT, rel));
    const candidateHtml = candidateBytes.toString('utf8');
    const contract = extractReleaseContract(candidateHtml);
    const live = await fetchBytes(`${contentOrigin}/${rel.replace(/index\.html$/, '')}`);
    const liveHtml = live.bytes.toString('utf8');
    const liveContract = extractReleaseContract(liveHtml);
    if (liveContract.description !== contract.description) throw new Error(`${rel}: live description is stale`);
    for (const artPath of contract.artPaths) {
      if (!liveHtml.includes(artPath)) throw new Error(`${rel}: live page is missing candidate art ${artPath}`);
      art.set(artPath, null);
    }
    pages.push({ path: rel, url: `${contentOrigin}/${rel.replace(/index\.html$/, '')}`, descriptionSha256: sha256(contract.description), candidateSha256: sha256(candidateBytes), liveSha256: sha256(live.bytes), exact: sha256(candidateBytes) === sha256(live.bytes) });
  }

  const icons = ['assets/icon-32.png', 'assets/icon-256.png', 'manifest.json'];
  const assets = [];
  for (const rel of [...icons, ...art.keys()].sort()) {
    const candidate = await readFile(path.join(ROOT, rel));
    const live = (await fetchBytes(`${contentOrigin}/${rel}`)).bytes;
    const candidateHash = sha256(candidate);
    const liveHash = sha256(live);
    if (candidateHash !== liveHash) throw new Error(`${rel}: live bytes are stale`);
    assets.push({ path: rel, sha256: liveHash, bytes: live.length });
  }

  let edgeVerdict = contentOrigin === edgeOrigin ? 'exact-content-origin' : 'not-checked';
  if (contentOrigin !== edgeOrigin) {
    const edge = await fetchBytes(`${edgeOrigin}/news/`, [200, 403]);
    edgeVerdict = edge.status === 403 ? 'documented-fast-challenge' : 'reachable';
    if (edge.status === 200) {
      const expected = extractReleaseContract((await readFile(path.join(ROOT, 'news/index.html'))).toString('utf8'));
      if (extractReleaseContract(edge.bytes.toString('utf8')).description !== expected.description) throw new Error('canonical edge returned 200 with stale News bytes');
    }
  }

  return {
    schemaVersion: '1.0',
    verifiedAt: new Date().toISOString(),
    contentOrigin,
    edgeOrigin,
    contentVerdict: 'exact',
    edgeVerdict,
    pages,
    assets,
    summary: { pages: pages.length, assets: assets.length, descriptions: pages.length, allExact: true },
  };
}

async function main() {
  const result = await verifyNewsRelease();
  const outAt = process.argv.indexOf('--json-out');
  if (outAt >= 0 && process.argv[outAt + 1]) await writeFile(resolve(ROOT, process.argv[outAt + 1]), `${JSON.stringify(result, null, 2)}\n`);
  console.log(`live News release verified: ${result.summary.pages} pages · ${result.summary.assets} exact assets · edge ${result.edgeVerdict} · content ${result.contentOrigin}`);
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename);
if (isDirect) main().catch((error) => { console.error(`live News release check failed: ${error.message}`); process.exitCode = 1; });
