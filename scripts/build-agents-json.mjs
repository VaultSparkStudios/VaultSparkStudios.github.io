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
import { inspectTypedPublicFeed, runPublicFeedContractSelfTest } from './lib/public-feed-contracts.mjs';
import { writeIntentMap } from './build-intent-map.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ECOSYSTEM = join(ROOT, 'api', 'ecosystem-state.json');
const OUT = join(ROOT, 'agents.json');
const SITE = 'https://vaultsparkstudios.com';
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

// Mirror build-llms-full-shards.mjs::routeFor so shard URLs match exactly.
// S329: including its ROUTE_ALIAS (ecosystem slug → page-dir slug) — the two
// resolvers must stay identical or the ai-spine parity gate fires.
const ROUTE_ALIAS = { 'franchise-architect-football': 'franchise-architect' };
function slugCandidates(p) {
  return [ROUTE_ALIAS[p.slug], p.slug, p.slug.replace(/^vaultspark-/, '')].filter(Boolean);
}
function routeSegmentFor(p, category) {
  const candidates = slugCandidates(p);
  for (const slug of candidates) {
    if (existsSync(join(ROOT, category, slug))) return slug;
  }
  return candidates[candidates.length - 1] || p.slug;
}

function existingRouteFor(p) {
  const candidates = slugCandidates(p);
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
  // S334: the .ai/ fact sheets — 17 index-follow, self-describing, "cite this
  // page" canonical sheets — were referenced by nothing. Not agents.json, not
  // sitemap.xml, not one human page. The strongest CANON-048 asset on the site
  // was unreachable by the audience it was written for. Same existence gate as
  // the shard above: advertise it only where the sheet is actually on disk.
  if (onSite && existsSync(join(dir, '.ai', 'index.html'))) {
    entry.aiFactSheet = `${SITE}${route}.ai/`;
  }
  return entry;
}

// Curated catalog of public, agent-useful JSON feeds. Hand-titled (not a blind
// enumeration of all 53 api/*.json — many are internal/volatile) so agents get a
// real, described surface. A missing file is simply omitted; consumers fetch
// the feed itself for current freshness and status.
const FEED_CATALOG = [
  ['stats.json', 'Public Analytica statistics', 'Source-dated portfolio, audience, editorial, proof-freshness, and performance aggregates used by /stats/.'],
  ['api/ecosystem-stats.json', 'Studio ecosystem analytics', 'Production-only audience estimates, edge traffic, project coverage, and measurement states used by /stats/ecosystem/.'],
  ['api/ecosystem-analytics.json', 'Cloudflare analytics receipt', 'Source-window-sampling provenance and per-project aggregates from Cloudflare Web Analytics and zone Traffic Analytics.'],
  ['api/news-desk-engagement.json', 'The Desk engagement receipt', 'Per-article visible-and-focused reading time with privacy floors, plus the live-presence measurement contract.'],
  ['api/news-desk-freshness.json', 'The Desk editorial freshness', 'Latest-edition observed-through date, evidence-backed cadence label, overdue state, and the automatic scheduled-publication policy.'],
  ['api/newsroom-run.json', 'The Desk automation receipt', 'Privacy-safe scheduled-run evidence, latest public edition, next expected UTC slot, and explicit abstention when CI has not observed a run.'],
  ['api/news-desk-reactions.json', 'The Desk reader-signal receipt', 'Per-article reader reactions and per-voice votes, suppressed below five signals, with declared reset semantics for cumulative edge counters.'],
  ['api/public-intelligence.json', 'Portfolio intelligence', 'Full project catalog with live VaultStatus (SPARKED/FORGE/VAULTED), mediums, and notes.'],
  ['api/public-status.json', 'Studio status', 'Nervous-system snapshot: repos online, sparked/forge/vaulted counts, last shipped session.'],
  ['api/nervous-system.json', 'Live signal digest', 'Aggregated live activity tiles (continuous integration, uptime, motion) rendered inside /studio-pulse/#signal-digest.'],
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
  ['api/intent-map.json', 'Outcome-first intent map', 'Maps play, join, verify, invest, press, build, and news goals to resolvable routes, evidence freshness, action capability, fallback, and honest abstention.'],
];

function buildFeeds() {
  const feeds = [];
  const omissions = [];
  for (const [rel, title, description] of FEED_CATALOG) {
    const abs = join(ROOT, rel);
    const url = `${SITE}/${rel}`;
    if (!existsSync(abs)) {
      const inspection = inspectTypedPublicFeed(rel, null, { root: ROOT, scope: 'discovery' });
      if (inspection.expected) omissions.push({ surface: rel, url, reason: 'missing' });
      continue;
    }
    let value = null;
    try {
      value = JSON.parse(readFileSync(abs, 'utf8'));
    } catch (error) {
      const inspection = inspectTypedPublicFeed(rel, null, { root: ROOT, scope: 'discovery' });
      if (inspection.expected) {
        omissions.push({ surface: rel, url, reason: `contract-invalid: invalid JSON (${error.message})` });
        continue;
      }
    }
    const inspection = inspectTypedPublicFeed(rel, value, { root: ROOT, scope: 'discovery' });
    if (!inspection.ok) {
      omissions.push({ surface: rel, url, reason: inspection.reason });
      continue;
    }
    feeds.push({ title, url, description, format: 'application/json' });
  }
  return { feeds, omissions };
}

export function buildManifest(state) {
  const projects = publicProjects(state).map(projectEntry).filter(Boolean);
  const { feeds, omissions } = buildFeeds();
  const advertised = (relative) => feeds.some((feed) => feed.url === `${SITE}/${relative}`) ? `${SITE}/${relative}` : null;

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
      agentAccess: {
        policyVersion: '1.0',
        training: {
          agent: 'GPTBot',
          allowed: false,
          license: 'Proprietary — All Rights Reserved, VaultSpark Studios LLC',
          reason: 'The public corpus may be cited, but is not licensed for model training.',
        },
        search: {
          agent: 'OAI-SearchBot',
          allowed: true,
          scope: 'Public routes and the canonical discovery corpus; private routes remain excluded by robots.txt.',
          citation: 'Link the exact source page or machine-readable claim receipt.',
        },
        userRequestedRetrieval: {
          agent: 'ChatGPT-User',
          allowed: true,
          scope: 'Public routes requested by a user; private routes remain excluded by robots.txt.',
          citation: 'Preserve the source URL and distinguish sourced facts from AI-persona commentary.',
        },
      },
    },
    discovery: {
      manifest: `${SITE}/agents.json`,
      sitemap: `${SITE}/sitemap.xml`,
      robots: `${SITE}/robots.txt`,
      llmsTxt: `${SITE}/.well-known/llms.txt`,
      llmsFull: `${SITE}/.well-known/llms-full.txt`,
      entityGraph: `${SITE}/.well-known/entity-graph.json`,
      search: `${SITE}/search/`,
      news: {
        hub: `${SITE}/news/`,
        jsonFeed: `${SITE}/api/news-desk-feed.json`,
        claims: `${SITE}/api/news-desk-claims.ndjson`,
        freshness: `${SITE}/api/news-desk-freshness.json`,
        engagement: `${SITE}/api/news-desk-engagement.json`,
        readerSignals: `${SITE}/api/news-desk-reactions.json`,
        predictionLedger: `${SITE}/data/news-desk/prediction-ledger.json`,
      },
      statusProof: `${SITE}/api/status-proof.json`,
      citation: `${SITE}/api/citation.json`,
      intentMap: advertised('api/intent-map.json'),
      // S293: how the published evidence is actually produced. An agent that can
      // read the numbers but not their derivation cannot audit them.
      evidenceGraph: `${SITE}/api/evidence-graph.json`,
      buildVerification: advertised('api/build-check-diagnostics.json'),
      proofVerification: advertised('api/proof-surface-diagnostics.json'),
      omissions,
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
        name: 'feedback.submit',
        method: 'POST',
        url: SITE + '/api/agent-actions/v1',
        auth: {
          authority: 'Obelisk',
          scope: 'vaultspark:feedback:write',
        },
        idempotency: {
          header: 'Idempotency-Key',
          required: true,
          retentionSeconds: 86400,
        },
        receipt: {
          format: 'application/json',
          signature: 'HMAC-SHA256',
        },
        description: 'Submit a fixed-vocabulary, anonymous page-usefulness signal. The action is deny-by-default, scope-bound, idempotent, and returns a signed receipt.',
      },
      {
        name: 'oracle.answer.lookup',
        method: 'GET',
        url: `${SITE}/oracle/answers/index.json`,
        description: 'Fetch committed, public-safe Oracle answers before scraping pages. Runtime cost is zero; every answer cites public sources.',
      },
      // S303: machine verification recipe — the same checks /proof runs in a
      // visitor's browser, spelled out so an agent can replicate them directly.
      {
        name: 'evidence.ledger.verify',
        method: 'GET',
        url: `${SITE}/data/staging-deploy-history.ndjson`,
        description: 'Independently verify the deploy ledger: (1) SHA-256 the served NDJSON bytes and compare to bytes.sha256 in /api/staging-deploy-continuity.json; (2) for each row, SHA-256(JSON.stringify(row minus rowId)).slice(0,24) must equal rowId; (3) each row’s previousReceiptId must equal the prior row’s receiptId with strictly increasing generatedAt; (4) final receiptId and row count must match the anchor’s ledger.head/depth. Human-facing walkthrough: ' + `${SITE}/evidence/#verify`,
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
    ['typed verification discovery is feed-backed or honestly omitted', ['api/build-check-diagnostics.json', 'api/proof-surface-diagnostics.json'].every((relative) => { const key = relative.startsWith('api/build-') ? 'buildVerification' : 'proofVerification'; const url = `${SITE}/${relative}`; const inFeeds = manifest.feeds.some((feed) => feed.url === url); const omitted = manifest.discovery.omissions.some((entry) => entry.surface === relative); return inFeeds ? manifest.discovery[key] === url && !omitted : manifest.discovery[key] === null && omitted; })],
    ['brand anchor resolves to the canonical root', bySlug.get('vaultsparkstudios-website')?.url === `${SITE}/`],
    ['external public project remains resolvable', bySlug.get('__agents_selftest_external__')?.url === 'https://example.test/proof'],
    ['internal project is excluded', !bySlug.has('__agents_selftest_internal__')],
    ['unresolvable forge project is not advertised', !bySlug.has('__agents_selftest_missing__')],
    ['all curated feeds are canonical HTTPS URLs', manifest.feeds.every((feed) => feed.url.startsWith(`${SITE}/`))],
    ['discovery catalog does not copy volatile feed freshness', manifest.feeds.every((feed) => !('generatedAt' in feed))],
    ['typed omission ledger is always present and public-safe', Array.isArray(manifest.discovery.omissions) && manifest.discovery.omissions.every((entry) => entry.surface && entry.url.startsWith(SITE) && !/[A-Z]:\\\\|secrets?/i.test(entry.reason))],
    ...runPublicFeedContractSelfTest({ root: ROOT }).map(([name, ok]) => [`typed feed contract · ${name}`, ok]),
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
  try { writeIntentMap({ check: CHECK }); }
  catch (error) { console.error(`[agents-json] intent map invalid: ${error.message}`); process.exit(1); }
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
