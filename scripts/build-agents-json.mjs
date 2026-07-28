#!/usr/bin/env node
// build-agents-json.mjs — emit /agents.json, the canonical AI-agent discovery manifest.
//
// CANON-011 sitemap standard names /agents.json explicitly, and
// build-llms-full-shards.mjs advertises a pairing with it. This script delivers
// the missing half: one well-known entrypoint that points agents + crawlers at
// every machine-readable surface (sitemap, llms.txt, llms-full shards, entity
// graph), the primary CTA, contact + policy, automation disclosure, and the
// public project list with its citable shard URL. Feed freshness belongs to
// each authoritative feed, not this discovery catalog: copying generatedAt
// here creates a dependency cycle (agents → candidate → release → citation →
// agents) and can make a just-built manifest stale.
//
// Source of truth: committed api/ecosystem-state.json (same as the llms shards),
// so output is public-safe and reproducible in local, CI, and deploy contexts.
//
// Output: agents.json  (repo root → served at https://vaultsparkstudios.com/agents.json)
//
// Usage:
//   node scripts/build-agents-json.mjs           # write agents.json
//   node scripts/build-agents-json.mjs --check   # exit 1 if drift vs disk
//   node scripts/build-agents-json.mjs --self-test

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ECOSYSTEM = join(ROOT, 'api', 'ecosystem-state.json');
const OUT = join(ROOT, 'agents.json');
const SITE = 'https://vaultsparkstudios.com';
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

// Mirror build-llms-full-shards.mjs::routeFor so shard URLs match exactly.
function routeSegmentFor(p, category) {
  const candidates = [p.slug, p.slug.replace(/^vaultspark-/, '')].filter(Boolean);
  for (const slug of candidates) {
    if (existsSync(join(ROOT, category, slug))) return slug;
  }
  return candidates[candidates.length - 1] || p.slug;
}

function existingRouteFor(p) {
  const candidates = [p.slug, p.slug.replace(/^vaultspark-/, '')].filter(Boolean);
  for (const category of ['games', 'projects']) {
    for (const slug of candidates) {
      if (existsSync(join(ROOT, category, slug))) return `/${category}/${slug}/`;
    }
  }
  return null;
}

function routeFor(p) {
  if (p.slug === 'vaultsparkstudios-website') return '/';
  const existing = existingRouteFor(p);
  if (existing) return existing;
  if (p.medium === 'game' || /game|gridiron|football|vaultfront|solara|voidfall/i.test(p.slug)) {
    return `/games/${routeSegmentFor(p, 'games')}/`;
  }
  return `/projects/${routeSegmentFor(p, 'projects')}/`;
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

// Curated catalog of public, agent-useful JSON feeds. Hand-titled (not a blind
// enumeration of all 53 api/*.json — many are internal/volatile) so agents get a
// real, described surface. A missing file is simply omitted; consumers fetch
// the feed itself for current freshness and status.
const FEED_CATALOG = [
  ['api/public-intelligence.json', 'Portfolio intelligence', 'Full project catalog with live VaultStatus (SPARKED/FORGE/VAULTED), mediums, and notes.'],
  ['api/public-status.json', 'Studio status', 'Nervous-system snapshot: repos online, sparked/forge/vaulted counts, last shipped session.'],
  ['api/nervous-system.json', 'Live tiles', 'Aggregated live activity tiles (CI, uptime, motion) that power /nervous-system/.'],
  ['api/velocity-series.json', 'Shipping velocity', '24-week shipping cadence derived from git history (no private data).'],
  ['api/citation.json', 'Cite-ready facts', 'Authoritative, refresh-on-deploy facts about the studio for AI summarization.'],
  ['api/status-proof.json', 'Status provenance', 'Signed/derived provenance for the public status claims (anti-fabrication).'],
  ['api/feed-publishers.json', 'Trust-feed provenance', 'Every public trust feed mapped to its generator script, exact recovery command, scheduled workflow, and freshness ceilings — so an agent can verify (or recover) any stale studio signal.'],
  ['api/evidence-graph.json', 'Evidence dependency graph', 'Resolved relation view of every derived public artifact: which feed is built from which, the builder that produces it, and the exact command that verifies its bytes. Lets an agent reason about how any published number was produced.'],
  ['api/build-check-diagnostics.json', 'Build verification receipt', 'Integrity-bound receipt for the complete current build plan: plan fingerprint, executed/planned coverage, direct exit codes, timings, and zero command output.'],
  ['api/proof-surface-diagnostics.json', 'Proof-surface verification receipt', 'Integrity-bound blocking/advisory substep receipt with planned coverage, direct exit codes, timings, and owner/class failure attribution.'],
  ['api/worker-route-history.json', 'Edge route incident history', 'Append-only semantic route history with source-labelled onset bounds and self-validating recovery transitions. Records status codes and verdicts only — no response bodies or identifiers.'],
  ['api/deploy-currency.json', 'Production deploy parity', 'Probe-frozen production SHA age plus route-local fingerprinted-shell parity. Distinguishes a current artifact from stale or shell-drifted production without retaining response bodies.'],
  ['api/oracle-query-insights.json', 'Top questions', 'What humans + agents most ask the Oracle, with answer coverage.'],
  ['oracle/answers/index.json', 'Oracle prebaked answers', 'Deploy-time, source-backed Oracle answers for common studio, game, rank, and membership questions.'],
  ['api/build-sha.json', 'Deploy pointer', 'The exact commit SHA currently served in production.'],
  ['api/release-proof.json', 'Release proof', 'Source-derived staging parity, deploy pointer, canonical favicon, and automatic rollback readiness.'],
  ['api/identity-migration-receipt.json', 'Identity migration receipt', 'Privacy-safe Obelisk migration evidence: issuer/callback binding, staged Worker, runtime updates, role/revocation proof, rollback, and explicit honest-dark blockers.'],
  ['api/supabase-control-plane.json', 'Supabase authority receipt', 'Read-only, public-safe proof that distinguishes REST data administration from management API, SQL migration, and Edge Function deployment authority.'],
  ['api/membership-tiers.json', 'Membership pricing', 'Canonical tier facts: Free / Vault Sparked ($4.99/mo) / Vault Eternal ($29.99/mo), perks, and themes.'],
];

function buildFeeds() {
  const feeds = [];
  for (const [rel, title, description] of FEED_CATALOG) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) continue;
    const entry = { title, url: `${SITE}/${rel}`, description, format: 'application/json' };
    feeds.push(entry);
  }
  return feeds;
}

export function buildManifest(state) {
  const projects = publicProjects(state).map(projectEntry).filter(Boolean);
  const feeds = buildFeeds();

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
      // S293: how the published evidence is actually produced. An agent that can
      // read the numbers but not their derivation cannot audit them.
      evidenceGraph: `${SITE}/api/evidence-graph.json`,
      buildVerification: `${SITE}/api/build-check-diagnostics.json`,
      proofVerification: `${SITE}/api/proof-surface-diagnostics.json`,
    },
    feeds,
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
    actions: [
      {
        name: 'oracle.answer.lookup',
        method: 'GET',
        url: `${SITE}/oracle/answers/index.json`,
        description: 'Fetch committed, public-safe Oracle answers before scraping pages. Runtime cost is zero; every answer cites public sources.',
      },
    ],
    projects,
  };
}

function render(state) {
  // Stable key order (manifest fields are declared in order); pretty-print for human + diff legibility.
  return JSON.stringify(buildManifest(state), null, 2) + '\n';
}

function selfTest() {
  const manifest = buildManifest({
    projects: [
      { name: 'VaultSpark Studios', slug: 'vaultsparkstudios-website', audience: 'public-live', vaultStatus: 'SPARKED' },
      { name: 'External Proof', slug: '__agents_selftest_external__', audience: 'public-live', vaultStatus: 'FORGE', liveUrl: 'https://example.test/proof' },
      { name: 'Internal Control', slug: '__agents_selftest_internal__', audience: 'internal', liveUrl: 'https://example.test/internal' },
      { name: 'Unresolvable Forge', slug: '__agents_selftest_missing__', audience: 'public-live', vaultStatus: 'FORGE' },
    ],
  });
  const bySlug = new Map(manifest.projects.map((project) => [project.slug, project]));
  const cases = [
    ['manifest is explicitly versioned', manifest.version === '1.0'],
    ['discovery spine points to canonical agent surfaces', manifest.discovery.manifest === `${SITE}/agents.json` && manifest.discovery.evidenceGraph === `${SITE}/api/evidence-graph.json`],
    ['verification receipts are directly discoverable', manifest.discovery.buildVerification === `${SITE}/api/build-check-diagnostics.json` && manifest.discovery.proofVerification === `${SITE}/api/proof-surface-diagnostics.json`],
    ['verification receipts are curated feeds', manifest.feeds.some((feed) => feed.url.endsWith('/api/build-check-diagnostics.json')) && manifest.feeds.some((feed) => feed.url.endsWith('/api/proof-surface-diagnostics.json'))],
    ['brand anchor resolves to the canonical root', bySlug.get('vaultsparkstudios-website')?.url === `${SITE}/`],
    ['external public project remains resolvable', bySlug.get('__agents_selftest_external__')?.url === 'https://example.test/proof'],
    ['internal project is excluded', !bySlug.has('__agents_selftest_internal__')],
    ['unresolvable forge project is not advertised', !bySlug.has('__agents_selftest_missing__')],
    ['all curated feeds are canonical HTTPS URLs', manifest.feeds.every((feed) => feed.url.startsWith(`${SITE}/api/`) || feed.url.startsWith(`${SITE}/oracle/`))],
    ['discovery catalog does not copy volatile feed freshness', manifest.feeds.every((feed) => !('generatedAt' in feed))],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`[agents-json] --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`[agents-json] --self-test: ${cases.length}/${cases.length} passed`);
}

function main() {
  if (SELF_TEST) return selfTest();
  if (!existsSync(ECOSYSTEM)) {
    console.error(`[agents-json] required public source missing: ${ECOSYSTEM.replace(ROOT, '.')}`);
    process.exit(1);
  }
  const state = JSON.parse(readFileSync(ECOSYSTEM, 'utf8'));
  if (state.publicSafe !== true || !Array.isArray(state.projects)) {
    console.error('[agents-json] public source must declare publicSafe:true and contain a projects array');
    process.exit(1);
  }
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
