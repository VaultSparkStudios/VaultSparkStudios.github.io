#!/usr/bin/env node
/**
 * build-ai-discovery-health.mjs (S181 · ai-spine-public-health)
 *
 * Public-safe status artifact for the AI discovery spine. The hard contract
 * still lives in check-ai-discovery-spine.mjs; this script reuses that logic
 * and publishes a small api/ai-discovery-health.json payload for /status/.
 *
 * Usage:
 *   node scripts/build-ai-discovery-health.mjs
 *   node scripts/build-ai-discovery-health.mjs --check
 *   node scripts/build-ai-discovery-health.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  llmsProjectShardUrls,
  siteUrlToPath,
  validateDiscoveryHeader,
  validateSpine,
} from './check-ai-discovery-spine.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'api', 'ai-discovery-health.json');
const args = new Set(process.argv.slice(2));
const CHECK = args.has('--check');
const SELF_TEST = args.has('--self-test');

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function fileExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function dirExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

export function buildPayload({ manifest, llmsTxt, headersText, fileExistsFn = () => true, dirExistsFn = () => true }) {
  const spineErrors = validateSpine(manifest, llmsTxt, fileExistsFn, dirExistsFn);
  const headerErrors = validateDiscoveryHeader(headersText);
  const errors = [...spineErrors, ...headerErrors];
  const llmsShards = llmsProjectShardUrls(llmsTxt);
  const manifestShards = (manifest?.projects || []).map((p) => p.llmsFull).filter(Boolean);
  const publicProjects = (manifest?.projects || []).filter((p) => p.url).length;
  const fixedSurfaces = [
    manifest?.url,
    manifest?.contact?.page,
    manifest?.policies?.privacy,
    manifest?.policies?.terms,
    manifest?.policies?.accessibility,
    manifest?.discovery?.sitemap,
    manifest?.discovery?.manifest,
    manifest?.discovery?.robots,
    manifest?.discovery?.llmsTxt,
    manifest?.discovery?.llmsFull,
    manifest?.discovery?.entityGraph,
    manifest?.discovery?.search,
    manifest?.primaryCta?.url,
  ].filter(Boolean);

  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'scripts/build-ai-discovery-health.mjs',
    publicSafe: true,
    status: errors.length ? 'attention' : 'healthy',
    checks: {
      manifestValid: !!manifest && typeof manifest === 'object' && !Array.isArray(manifest),
      shardSetsAligned: spineErrors.every((e) => !/shard|llms\.txt/.test(e)),
      discoveryHeader: headerErrors.length === 0,
      noDeadInternalUrls: spineErrors.every((e) => !/dead internal URL|no route on disk|no file/.test(e)),
    },
    counts: {
      publicProjects,
      manifestShards: manifestShards.length,
      llmsShards: llmsShards.length,
      fixedSurfaces: fixedSurfaces.length,
    },
    discovery: {
      manifest: manifest?.discovery?.manifest || null,
      llmsTxt: manifest?.discovery?.llmsTxt || null,
      sitemap: manifest?.discovery?.sitemap || null,
      entityGraph: manifest?.discovery?.entityGraph || null,
    },
    errors: errors.slice(0, 8),
  };
}

function selfTest() {
  const manifest = {
    version: '1.0',
    name: 'VaultSpark Studios',
    url: 'https://vaultsparkstudios.com/',
    contact: { page: 'https://vaultsparkstudios.com/contact/' },
    policies: {
      privacy: 'https://vaultsparkstudios.com/privacy/',
      terms: 'https://vaultsparkstudios.com/terms/',
      accessibility: 'https://vaultsparkstudios.com/accessibility/',
    },
    discovery: {
      sitemap: 'https://vaultsparkstudios.com/sitemap.xml',
      manifest: 'https://vaultsparkstudios.com/agents.json',
      robots: 'https://vaultsparkstudios.com/robots.txt',
      llmsTxt: 'https://vaultsparkstudios.com/.well-known/llms.txt',
      llmsFull: 'https://vaultsparkstudios.com/llms-full.txt',
      entityGraph: 'https://vaultsparkstudios.com/.well-known/entity-graph.json',
      search: 'https://vaultsparkstudios.com/search/',
    },
    primaryCta: { url: 'https://vaultsparkstudios.com/membership/' },
    projects: [
      {
        slug: 'alpha',
        url: 'https://vaultsparkstudios.com/projects/alpha/',
        llmsFull: 'https://vaultsparkstudios.com/projects/alpha/llms-full.txt',
      },
    ],
  };
  const llmsTxt = '- [Alpha](https://vaultsparkstudios.com/projects/alpha/llms-full.txt) - project\n';
  const headersText = 'Link: </agents.json>; rel=alternate; type="application/json"; title="VaultSpark AI agent discovery manifest"';
  const okPayload = buildPayload({ manifest, llmsTxt, headersText });
  assert(okPayload.status === 'healthy', 'healthy fixture passes');
  assert(okPayload.checks.discoveryHeader === true, 'header check is true');
  assert(okPayload.counts.manifestShards === 1 && okPayload.counts.llmsShards === 1, 'shards counted');
  const bad = buildPayload({ manifest, llmsTxt, headersText: 'Link: </x>; rel=preload' });
  assert(bad.status === 'attention', 'missing header changes status');
  assert(bad.checks.discoveryHeader === false, 'missing header check is false');
  console.log('build-ai-discovery-health --self-test: OK (5 checks)');
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`self-test FAIL: ${msg}`);
    process.exit(1);
  }
}

if (SELF_TEST) {
  selfTest();
  process.exit(0);
}

if (CHECK) {
  if (!fs.existsSync(OUT)) {
    console.error('build-ai-discovery-health --check: api/ai-discovery-health.json missing - run npm run build');
    process.exit(1);
  }
  const current = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const expected = buildPayload({
    manifest: JSON.parse(readText('agents.json')),
    llmsTxt: readText(path.join('.well-known', 'llms.txt')),
    headersText: readText('_headers'),
    fileExistsFn: fileExists,
    dirExistsFn: dirExists,
  });
  const scrub = (value) => {
    const copy = JSON.parse(JSON.stringify(value));
    delete copy.generatedAt;
    return copy;
  };
  if (JSON.stringify(scrub(current)) !== JSON.stringify(scrub(expected))) {
    console.error('build-ai-discovery-health --check: api/ai-discovery-health.json is stale - run `node scripts/build-ai-discovery-health.mjs`');
    process.exit(1);
  }
  console.log(`build-ai-discovery-health --check: OK (${current.status}, ${current.counts.publicProjects} project(s))`);
  process.exit(0);
}

const manifest = JSON.parse(readText('agents.json'));
const llmsTxt = readText(path.join('.well-known', 'llms.txt'));
const headersText = readText('_headers');
const payload = buildPayload({ manifest, llmsTxt, headersText, fileExistsFn: fileExists, dirExistsFn: dirExists });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`build-ai-discovery-health -> api/ai-discovery-health.json (${payload.status}, ${payload.counts.publicProjects} project(s))`);
