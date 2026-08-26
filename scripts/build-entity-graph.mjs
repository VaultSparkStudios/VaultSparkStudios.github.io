#!/usr/bin/env node
/**
 * build-entity-graph.mjs — schema.org @id graph for vaultsparkstudios.com.
 *
 * Emits `.well-known/entity-graph.json` so AI crawlers and Google KG can
 * read one canonical record of the studio's entities + their relationships:
 *   - Organization (VaultSpark Studios LLC)
 *   - Person (founder)
 *   - WebSite (vaultsparkstudios.com)
 *   - CreativeWork[] (one per project from PROJECT_REGISTRY)
 *   - MemberProgram (/vault/)
 *
 * Why a static file: AI crawlers (Perplexity, ChatGPT, Claude) and Google KG
 * prefer schema graphs they can ingest at known URLs. Runtime-injected JSON-LD
 * still works for visit-time crawlers but is fragile under headless rendering.
 *
 * Usage:
 *   node scripts/build-entity-graph.mjs           # write
 *   node scripts/build-entity-graph.mjs --check   # fail if stale
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { checkHash, saveHash } from './lib/build-cache.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, '.well-known', 'entity-graph.json');
const REGISTRY = path.resolve(ROOT, '..', 'vaultspark-studio-ops', 'portfolio', 'PROJECT_REGISTRY.json');

const CHECK = process.argv.includes('--check');
const FORCE = process.argv.includes('--force');

const ORIGIN = 'https://vaultsparkstudios.com';
const ID = (slug) => `${ORIGIN}/#${slug}`;

// S231: the registry is in the studio-ops SIBLING repo — present in local sessions,
// ABSENT in CI (CI checks out only this repo). Signal availability so --check and write
// can degrade gracefully instead of regenerating an empty graph (which made --check fail
// in CI forever — the committed 22-entity graph vs a 6-entity sibling-less regen — and
// would clobber the good committed file on write). Same class as check-registry-freshness
// SKIPping when the sibling is unreachable.
function loadRegistry() {
  try { return { available: true, registry: JSON.parse(fs.readFileSync(REGISTRY, 'utf8')) }; }
  catch { return { available: false, registry: { projects: [] } }; }
}

function audienceUrl(p) {
  if (p.publicUrl) return p.publicUrl;
  if (p.medium === 'website' && p.name?.includes('vaultsparkstudios.com')) return ORIGIN + '/';
  return null;
}

function projectCreativeWork(p) {
  const slug = p.slug;
  const wt = p.medium === 'game' ? 'VideoGame'
           : p.medium === 'novel' ? 'Book'
           : 'CreativeWork';
  const node = {
    '@type': wt,
    '@id': ID(`project-${slug}`),
    name: p.name,
    description: p.summary || undefined,
    creator: { '@id': ID('organization') },
    publisher: { '@id': ID('organization') },
    isPartOf: { '@id': ID('website') },
  };
  const u = audienceUrl(p);
  if (u) node.url = u;
  if (p.vaultStatus) node.additionalProperty = [{ '@type': 'PropertyValue', name: 'Vault Status', value: p.vaultStatus.toUpperCase() }];
  return node;
}

function buildGraph(registry) {
  const founderName = registry.founder?.name || 'VaultSpark Founder';

  const org = {
    '@type': 'Organization',
    '@id': ID('organization'),
    name: registry.dba || 'VaultSpark Studios',
    legalName: registry.legalEntity || 'VaultSpark Studios LLC',
    url: ORIGIN + '/',
    logo: ORIGIN + '/assets/brand/logo-signature.png',
    sameAs: [
      'https://github.com/VaultSparkStudios',
      'https://www.youtube.com/@VaultSparkStudios',
      'https://x.com/VaultSpark',
      'https://www.instagram.com/vaultsparkstudios/',
      'https://www.reddit.com/r/VaultSparkStudios/',
      'https://bsky.app/profile/vaultsparkstudios.bsky.social',
      'https://www.facebook.com/VaultSparkStudios/',
      'https://www.tiktok.com/@vaultsparkstudios',
    ],
    founder: { '@id': ID('founder') },
  };

  const founder = {
    '@type': 'Person',
    '@id': ID('founder'),
    name: founderName,
    affiliation: { '@id': ID('organization') },
    worksFor: { '@id': ID('organization') },
  };

  const site = {
    '@type': 'WebSite',
    '@id': ID('website'),
    url: ORIGIN + '/',
    name: 'VaultSpark Studios',
    publisher: { '@id': ID('organization') },
    potentialAction: {
      '@type': 'SearchAction',
      target: ORIGIN + '/search/?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  const memberProgram = {
    '@type': 'ProgramMembership',
    '@id': ID('vault-member-program'),
    name: 'Vault Membership',
    description: 'Tiered membership across VaultSpark Studios — Bronze, Silver, Gold, Platinum, plus Sparked rank progression.',
    hostingOrganization: { '@id': ID('organization') },
    url: ORIGIN + '/membership/',
  };

  const projects = (registry.projects || [])
    .filter((p) => p.audience && p.audience.startsWith('public') && p.vaultStatus !== 'vaulted')
    .map(projectCreativeWork);

  const pathwayList = {
    '@type': 'ItemList',
    '@id': ID('pathways'),
    name: 'VaultSpark Pathways',
    url: ORIGIN + '/pathways/',
    itemListElement: [
      '/pathways/players/',
      '/pathways/supporters/',
      '/pathways/lore/',
      '/pathways/builders/',
      '/pathways/press/',
      '/pathways/investors/',
    ].map((u, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: ORIGIN + u,
    })),
  };

  const nervousSystem = {
    '@type': 'WebPage',
    '@id': ID('nervous-system'),
    name: 'Studio Pulse Signal Digest',
    url: ORIGIN + '/studio-pulse/#signal-digest',
    isPartOf: { '@id': ID('website') },
    about: [{ '@id': ID('organization') }, { '@id': ID('website') }],
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [org, founder, site, memberProgram, pathwayList, nervousSystem, ...projects],
  };
}

function main() {
  const ENTITY_INPUTS = [REGISTRY];
  const entityCache = (!FORCE) ? checkHash('entity-graph', ENTITY_INPUTS) : { hit: false, hash: '' };
  if (!CHECK && entityCache.hit) {
    console.log('build-entity-graph: SKIP (inputs unchanged)');
    return;
  }

  const { available, registry } = loadRegistry();

  // Registry absent (CI / no studio-ops sibling): the committed graph is authoritative —
  // it was generated where the registry exists. Never fail --check and never clobber the
  // file with a project-less graph here. Degrade to a clean skip (exit 0).
  if (!available) {
    console.log('build-entity-graph: SKIP — PROJECT_REGISTRY (studio-ops sibling) unavailable; committed graph is authoritative.');
    return;
  }

  const graph = buildGraph(registry);
  const json = JSON.stringify(graph, null, 2);

  if (CHECK) {
    let existing = '';
    try { existing = fs.readFileSync(OUT, 'utf8'); } catch {}
    const norm = (s) => s.replace(/\s+$/, '');
    if (norm(existing) === norm(json)) {
      console.log(`build-entity-graph --check: in sync (${graph['@graph'].length} entities)`);
      return;
    }
    console.error('build-entity-graph --check: .well-known/entity-graph.json is stale.');
    console.error('  Run: node scripts/build-entity-graph.mjs');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json + '\n');
  saveHash('entity-graph', entityCache.hash);
  console.log(`build-entity-graph: wrote ${graph['@graph'].length} entities → .well-known/entity-graph.json`);
}

main();
