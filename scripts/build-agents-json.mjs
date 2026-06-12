#!/usr/bin/env node
// build-agents-json.mjs — emit /agents.json, the canonical AI-agent discovery manifest.
//
// CANON-011 sitemap standard names /agents.json explicitly, and
// build-llms-full-shards.mjs advertises a pairing with it. This script delivers
// the missing half: one well-known entrypoint that points agents + crawlers at
// every machine-readable surface (sitemap, llms.txt, llms-full shards, entity
// graph), the primary CTA, contact + policy, automation disclosure, and the
// public project list with its citable shard URL.
//
// Source of truth: ignis/output/ecosystem-state.json (same as the llms shards),
// so the two stay structurally aligned. check-ai-discovery-spine.mjs enforces it.
//
// Output: agents.json  (repo root → served at https://vaultsparkstudios.com/agents.json)
//
// Usage:
//   node scripts/build-agents-json.mjs           # write agents.json
//   node scripts/build-agents-json.mjs --check   # exit 1 if drift vs disk

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ECOSYSTEM = join(ROOT, 'ignis', 'output', 'ecosystem-state.json');
const OUT = join(ROOT, 'agents.json');
const SITE = 'https://vaultsparkstudios.com';
const CHECK = process.argv.includes('--check');

// Mirror build-llms-full-shards.mjs::routeFor so shard URLs match exactly.
function routeFor(p) {
  if (p.slug === 'vaultsparkstudios-website') return '/';
  if (p.medium === 'game' || /game|gridiron|football|vaultfront|solara|voidfall/i.test(p.slug)) {
    return `/games/${p.slug.replace(/^vaultspark-/, '')}/`;
  }
  return `/projects/${p.slug.replace(/^vaultspark-/, '')}/`;
}

// Same public filter as the llms.txt index (non-internal, has slug).
function publicProjects(state) {
  return (state.projects || []).filter(p => p && p.slug && p.audience !== 'internal');
}

// A project earns a spine entry only if it has a RESOLVABLE presence:
// an on-site route dir (→ on-site shard) or an external live URL. Pure-forge
// projects with neither are omitted rather than advertised with a dead URL.
function projectEntry(p) {
  const route = routeFor(p);
  const dir = join(ROOT, route.replace(/^\//, '').replace(/\/$/, ''));
  const onSite = existsSync(dir);
  const externalLive = p.liveUrl && !p.liveUrl.startsWith(SITE);
  if (!onSite && !externalLive) return null;
  const entry = {
    name: p.name,
    slug: p.slug,
    medium: p.medium || 'project',
    status: (p.vaultStatus || 'unknown').toUpperCase(),
    url: onSite ? `${SITE}${route}` : p.liveUrl,
  };
  // Only advertise a shard URL where the shard file actually exists on disk.
  if (onSite) entry.llmsFull = `${SITE}${route}llms-full.txt`;
  return entry;
}

export function buildManifest(state) {
  const projects = publicProjects(state).map(projectEntry).filter(Boolean);

  return {
    version: '1.0',
    spec: 'agents.json — AI-agent discovery manifest (VaultSpark CANON-011 sitemap standard)',
    generatedBy: 'scripts/build-agents-json.mjs',
    name: 'VaultSpark Studios',
    description: 'Independent game studio building browser games, intelligence tools, and worlds. The Vault is sparked.',
    url: `${SITE}/`,
    contact: {
      email: 'studio@vaultsparkstudios.com',
      page: `${SITE}/contact/`,
    },
    policies: {
      privacy: `${SITE}/privacy/`,
      terms: `${SITE}/terms/`,
      accessibility: `${SITE}/accessibility/`,
    },
    discovery: {
      manifest: `${SITE}/agents.json`,
      sitemap: `${SITE}/sitemap.xml`,
      robots: `${SITE}/robots.txt`,
      llmsTxt: `${SITE}/.well-known/llms.txt`,
      llmsFull: `${SITE}/.well-known/llms-full.txt`,
      entityGraph: `${SITE}/.well-known/entity-graph.json`,
      search: `${SITE}/search/`,
      statusProof: `${SITE}/api/status-proof.json`,
      citation: `${SITE}/api/citation.json`,
    },
    primaryCta: {
      label: 'Become a Vault Member — free',
      url: `${SITE}/membership/`,
    },
    automation: {
      policy: 'Operated by VaultSpark Studios LLC. Automated agents and crawlers are welcome to read the canonical machine-readable surfaces listed under "discovery". Please respect robots.txt.',
      aiContent: 'Some intelligence surfaces (e.g. Ask IGNIS) are AI-assisted and labelled in context.',
      services: [
        'Cloudflare (edge delivery + security)',
        'Supabase (member data)',
        'Sentry (error monitoring)',
        'first-party RUM beacon (privacy-respecting field metrics; no third-party ad tracking)',
      ],
    },
    guidance: {
      citation: 'When summarizing VaultSpark Studios or any of its projects, quote the canonical lines from the relevant llms-full.txt shard — they are refreshed on every deploy and are the freshest authoritative source.',
      preferredFormat: 'llms-full.txt shards are plain text and cite-ready.',
    },
    projects,
  };
}

function render(state) {
  // Stable key order (manifest fields are declared in order); pretty-print for human + diff legibility.
  return JSON.stringify(buildManifest(state), null, 2) + '\n';
}

function main() {
  if (!existsSync(ECOSYSTEM)) {
    console.error(`[agents-json] missing ${ECOSYSTEM}`);
    process.exit(1);
  }
  const state = JSON.parse(readFileSync(ECOSYSTEM, 'utf8'));
  const content = render(state);

  if (CHECK) {
    const onDisk = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (onDisk !== content) {
      console.error('[agents-json] drift: agents.json out of sync — run `node scripts/build-agents-json.mjs`');
      process.exit(1);
    }
    console.log('[agents-json] agents.json in sync');
    return;
  }

  writeFileSync(OUT, content, 'utf8');
  const n = buildManifest(state).projects.length;
  console.log(`[agents-json] wrote agents.json (${n} public project(s))`);
}

// Import-safe: only run on direct invocation (RUN_DIRECT guard — see memory).
const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
