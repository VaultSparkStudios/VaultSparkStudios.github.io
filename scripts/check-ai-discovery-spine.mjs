#!/usr/bin/env node
// check-ai-discovery-spine.mjs — contract gate for the AI-discovery spine.
//
// The spine is the set of machine-readable surfaces that let LLMs + agents
// discover and cite the studio accurately:
//   /agents.json                  (discovery manifest — build-agents-json.mjs)
//   /.well-known/llms.txt         (index — build-llms-full-shards.mjs)
//   /<route>/llms-full.txt        (per-project shards)
//   /sitemap.xml · /.well-known/entity-graph.json
//
// This gate makes the spine self-consistent so it cannot silently drift as
// projects flip status: agents.json must exist, be valid, list exactly the
// public projects llms.txt lists, and reference no dead internal URLs.
//
// Usage:
//   node scripts/check-ai-discovery-spine.mjs            # validate disk
//   node scripts/check-ai-discovery-spine.mjs --self-test

import { readFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SITE = 'https://vaultsparkstudios.com';

const REQUIRED_KEYS = ['version', 'name', 'url', 'contact', 'policies', 'discovery', 'primaryCta', 'projects'];

// Extract the project shard slugs llms.txt advertises, from its "- [name](url) — ..." lines.
export function llmsProjectShardUrls(llmsTxt) {
  const urls = [];
  const re = /^- \[[^\]]*\]\((https?:\/\/[^)]+llms-full\.txt)\)/gm;
  let m;
  while ((m = re.exec(llmsTxt))) urls.push(m[1]);
  return urls;
}

// Map an on-site URL to a repo-relative disk path. Returns null for external hosts.
export function siteUrlToPath(url) {
  if (!url || !url.startsWith(SITE)) return null;
  let p = url.slice(SITE.length) || '/';
  p = p.replace(/[?#].*$/, '');
  if (p === '' || p === '/') return 'index.html';
  if (p.endsWith('/')) return p.slice(1) + 'index.html';
  if (/\.[a-z0-9]+$/i.test(p)) return p.slice(1); // has a file extension
  return p.slice(1) + '/index.html';
}

// Core validation — pure, so --self-test can inject a fake fileExists + inputs.
export function validateSpine(manifest, llmsTxt, fileExists, dirExists) {
  const errors = [];

  // 1. Required keys
  for (const k of REQUIRED_KEYS) {
    if (!(k in manifest)) errors.push(`agents.json missing required key: ${k}`);
  }
  if (errors.length) return errors; // structural — stop early

  // 2. Shard-set consistency vs llms.txt. agents.json may legitimately list more
  // projects than llms.txt has shards (external/apex projects carry a url but no
  // on-site shard). The invariant that matters: the set of advertised on-site
  // shard URLs must be identical on both surfaces.
  const llmsUrls = llmsProjectShardUrls(llmsTxt);
  const manifestShardUrls = new Set((manifest.projects || []).map(p => p.llmsFull).filter(Boolean));
  if (manifestShardUrls.size !== llmsUrls.length) {
    errors.push(`shard count mismatch: agents.json advertises ${manifestShardUrls.size} shards, llms.txt lists ${llmsUrls.length}`);
  }
  for (const u of llmsUrls) {
    if (!manifestShardUrls.has(u)) errors.push(`llms.txt shard not in agents.json: ${u}`);
  }
  for (const u of manifestShardUrls) {
    if (!llmsUrls.includes(u)) errors.push(`agents.json shard not in llms.txt: ${u}`);
  }

  // 3. No dead internal URLs among the fixed surfaces.
  const fixed = [
    manifest.url,
    manifest.contact && manifest.contact.page,
    manifest.policies && manifest.policies.privacy,
    manifest.policies && manifest.policies.terms,
    manifest.policies && manifest.policies.accessibility,
    manifest.discovery && manifest.discovery.sitemap,
    manifest.discovery && manifest.discovery.manifest,
    manifest.discovery && manifest.discovery.robots,
    manifest.discovery && manifest.discovery.llmsTxt,
    manifest.discovery && manifest.discovery.llmsFull,
    manifest.discovery && manifest.discovery.entityGraph,
    manifest.discovery && manifest.discovery.search,
    manifest.primaryCta && manifest.primaryCta.url,
  ].filter(Boolean);
  for (const url of fixed) {
    const rel = siteUrlToPath(url);
    if (rel && !fileExists(rel)) errors.push(`dead internal URL (no file): ${url} → ${rel}`);
  }

  // 4. Each project: external liveUrl is fine; on-site project must have a real
  // route dir, and any advertised shard URL must resolve to a real file.
  for (const p of manifest.projects || []) {
    if (p.url && p.url.startsWith(SITE)) {
      const rel = siteUrlToPath(p.url);
      const dir = rel ? rel.replace(/\/?index\.html$/, '') : '';
      if (dir && !dirExists(dir) && !fileExists(rel)) {
        errors.push(`project '${p.slug}' on-site url has no route on disk: ${p.url}`);
      }
    }
    if (p.llmsFull) {
      const shardRel = siteUrlToPath(p.llmsFull);
      if (shardRel && !fileExists(shardRel)) {
        errors.push(`project '${p.slug}' advertises a shard with no file: ${p.llmsFull}`);
      }
    }
  }

  return errors;
}

export function validateDiscoveryHeader(headersText) {
  const errors = [];
  if (!/Link:\s*<\s*\/agents\.json\s*>\s*;\s*rel=alternate\s*;\s*type=["']application\/json["']/i.test(headersText || '')) {
    errors.push('_headers missing discoverable /agents.json Link header');
  }
  return errors;
}

function selfTest() {
  let fail = 0;
  const ok = (cond, msg) => { if (!cond) { console.error('  ✗ ' + msg); fail++; } else { console.log('  ✓ ' + msg); } };

  const goodLlms = [
    '# VaultSpark Studios', '',
    '- [Alpha](https://vaultsparkstudios.com/games/alpha/llms-full.txt) — game · forge',
    '- [Beta](https://vaultsparkstudios.com/projects/beta/llms-full.txt) — tool · sparked',
  ].join('\n');
  const goodManifest = {
    version: '1.0', name: 'X', url: `${SITE}/`,
    contact: { page: `${SITE}/contact/` },
    policies: { privacy: `${SITE}/privacy/`, terms: `${SITE}/terms/` },
    discovery: { sitemap: `${SITE}/sitemap.xml`, llmsTxt: `${SITE}/.well-known/llms.txt` },
    primaryCta: { url: `${SITE}/membership/` },
    projects: [
      { slug: 'a', url: `${SITE}/games/alpha/`, llmsFull: `${SITE}/games/alpha/llms-full.txt` },
      { slug: 'b', url: `${SITE}/projects/beta/`, llmsFull: `${SITE}/projects/beta/llms-full.txt` },
    ],
  };
  const allExist = () => true;
  ok(validateSpine(goodManifest, goodLlms, allExist, allExist).length === 0, 'clean spine → no errors');
  ok(validateDiscoveryHeader('Link: </agents.json>; rel=alternate; type="application/json"; title="VaultSpark AI agent discovery manifest"').length === 0, 'agents.json discovery header accepted');
  ok(validateDiscoveryHeader('Link: </x>; rel=preload').some(e => /missing discoverable/.test(e)), 'missing agents.json discovery header flagged');

  // siteUrlToPath mapping
  ok(siteUrlToPath(`${SITE}/`) === 'index.html', 'root maps to index.html');
  ok(siteUrlToPath(`${SITE}/membership/`) === 'membership/index.html', 'dir maps to index.html');
  ok(siteUrlToPath(`${SITE}/sitemap.xml`) === 'sitemap.xml', 'file keeps extension');
  ok(siteUrlToPath(`${SITE}/.well-known/llms.txt`) === '.well-known/llms.txt', 'well-known file maps through');
  ok(siteUrlToPath('https://joinvorn.com/') === null, 'external host → null (skipped)');

  // missing key
  const noProjects = { ...goodManifest }; delete noProjects.projects;
  ok(validateSpine(noProjects, goodLlms, allExist, allExist).some(e => /missing required key: projects/.test(e)), 'missing key flagged');

  // count mismatch
  const extra = JSON.parse(JSON.stringify(goodManifest));
  extra.projects.push({ slug: 'c', url: `${SITE}/games/c/`, llmsFull: `${SITE}/games/c/llms-full.txt` });
  ok(validateSpine(extra, goodLlms, allExist, allExist).some(e => /count mismatch/.test(e)), 'project count mismatch flagged');

  // dead internal URL
  const deadExists = (rel) => rel !== 'privacy/index.html';
  ok(validateSpine(goodManifest, goodLlms, deadExists, () => true).some(e => /dead internal URL/.test(e)), 'dead internal URL flagged');

  // shard set divergence
  const divergent = JSON.parse(JSON.stringify(goodManifest));
  divergent.projects[0].llmsFull = `${SITE}/games/zzz/llms-full.txt`;
  ok(validateSpine(divergent, goodLlms, allExist, allExist).some(e => /not in llms\.txt|not in agents\.json/.test(e)), 'shard-set divergence flagged');

  if (fail) { console.error(`check-ai-discovery-spine --self-test: ${fail} failure(s)`); process.exit(1); }
  console.log('check-ai-discovery-spine --self-test: all passed');
}

function main() {
  if (process.argv.includes('--self-test')) { selfTest(); return; }

  const agentsPath = join(ROOT, 'agents.json');
  const llmsPath = join(ROOT, '.well-known', 'llms.txt');
  if (!existsSync(agentsPath)) {
    console.error('[ai-spine] agents.json missing — run `node scripts/build-agents-json.mjs`');
    process.exit(1);
  }
  if (!existsSync(llmsPath)) {
    console.error('[ai-spine] .well-known/llms.txt missing — run `node scripts/build-llms-full-shards.mjs`');
    process.exit(1);
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(agentsPath, 'utf8'));
  } catch (e) {
    console.error(`[ai-spine] agents.json is not valid JSON: ${e.message}`);
    process.exit(1);
  }
  const llmsTxt = readFileSync(llmsPath, 'utf8');

  const fileExists = (rel) => existsSync(join(ROOT, rel));
  const dirExists = (rel) => existsSync(join(ROOT, rel));
  const errors = validateSpine(manifest, llmsTxt, fileExists, dirExists);
  const headersPath = join(ROOT, '_headers');
  if (existsSync(headersPath)) errors.push(...validateDiscoveryHeader(readFileSync(headersPath, 'utf8')));

  if (errors.length) {
    console.error(`[ai-spine] ${errors.length} spine inconsistency(ies):`);
    for (const e of errors) console.error('  • ' + e);
    process.exit(1);
  }
  console.log(`[ai-spine] spine consistent — agents.json ⨯ llms.txt aligned (${manifest.projects.length} projects), no dead internal URLs`);
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
