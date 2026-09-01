#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { checkHash, saveHash } from './lib/build-cache.mjs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'ignis-search-index.json');
const CHECK = process.argv.includes('--check');
const SELFTEST = process.argv.includes('--self-test');
const FORCE = process.argv.includes('--force');

function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; }
}
function readJson(rel) {
  try { return JSON.parse(read(rel)); } catch { return null; }
}

// ── Voice firewall ────────────────────────────────────────────────────────────
// Ask IGNIS renders a document's `summary` verbatim to the public. Internal
// source surfaces (llms-full.txt, project.currentFocus, /studio-pulse/) carry
// Studio-OS session jargon ("S191 goal-chain (/start -> /audit -> /implement ->
// /closeout): 4 shipped / 1 deferred …"). That is the "dev-code-looking" output
// the founder saw. sanitize() is the safety net; the real fix is sourcing every
// summary from a public-voice surface below.  [[feedback_voice_leak_patrol]]
const FORBIDDEN = [
  [/\bS\d{2,3}\b/g, ''],                                   // session tags S191
  [/\bsession\s+\d+\b/gi, ''],
  [/\bgoal[\s-]*chain\b/gi, ''],
  [/\/(start|audit|implement|closeout|go)\b/gi, ''],       // slash-commands
  [/\bbuild:check\b/gi, 'automated checks'],
  [/\bproof surface\b/gi, 'public proof pages'],
  [/\bharden(?:ed|ing)?\s+its\s+honesty\b/gi, ''],
  [/\b\d+\s+shipped\b/gi, ''],
  [/\bdeferred[\s-]*(?:with[\s-]*evidence)?\b/gi, ''],
  [/\bgates?\s+green\b/gi, ''],
  [/\bself[\s-]*tests?\b/gi, ''],
  [/\baudit items?\b/gi, ''],
  [/\b[0-9a-f]{7,40}\b/g, ''],                             // commit SHAs
  [/[#>]+/g, ' '],                                         // markdown headers/quotes
];
function sanitize(s) {
  let out = String(s || '');
  for (const [re, rep] of FORBIDDEN) out = out.replace(re, rep);
  return out
    .replace(/\s+([.,;:])/g, '$1')   // tidy orphaned punctuation
    .replace(/\(\s*\)/g, '')         // empty parens left by stripping
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+->\s*$/g, '')
    .trim();
}
function strip(s, max = 700) {
  return sanitize(String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).slice(0, max).trim();
}
// Pull a page's <meta name="description"> as the cleanest public summary.
function metaDescription(html) {
  const m = String(html || '').match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i);
  return m ? sanitize(m[1]) : '';
}

function build() {
  const docs = [];
  const add = (title, urlPath, body, summary = '', entityMeta = null) => {
    const doc = { title, url: urlPath, summary: strip(summary || body, 240), body: strip(body) };
    if (entityMeta) Object.assign(doc, entityMeta);
    docs.push(doc);
  };

  // S205 #12: entity graph — entityType + relatedEntities[] for knowledge-graph chips
  const gameReg = readJson('data/game-registry.json');
  const ENTITY_RELATIONS = {};
  if (gameReg && gameReg.games) {
    const sparked = Object.entries(gameReg.games)
      .filter(([, g]) => g.status === 'sparked')
      .map(([slug, g]) => ({ slug, label: g.name, type: 'game' }));
    const forging = Object.entries(gameReg.games)
      .filter(([, g]) => g.status === 'forge')
      .map(([slug, g]) => ({ slug, label: g.name, type: 'game' }));
    sparked.forEach(({ slug }) => {
      ENTITY_RELATIONS[slug] = {
        entityType: 'game',
        relatedEntities: [
          ...sparked.filter((g) => g.slug !== slug).slice(0, 2),
          { slug: 'games', label: 'All games', type: 'page' },
        ],
      };
    });
    forging.forEach(({ slug }) => {
      ENTITY_RELATIONS[slug] = {
        entityType: 'game',
        relatedEntities: [
          ...forging.filter((g) => g.slug !== slug).slice(0, 2),
          ...sparked.slice(0, 1),
          { slug: 'games', label: 'Games in the Vault', type: 'page' },
        ],
      };
    });
  }
  const STATIC_ENTITY = {
    games: { entityType: 'hub', relatedEntities: [
      { slug: 'universe', label: 'The Universe', type: 'page' },
      { slug: 'oracle', label: 'Ecosystem Oracle', type: 'tool' },
    ] },
    universe: { entityType: 'universe', relatedEntities: [
      { slug: 'games', label: 'Games', type: 'hub' },
      { slug: 'oracle', label: 'Ecosystem Oracle', type: 'tool' },
    ] },
    oracle: { entityType: 'tool', relatedEntities: [
      { slug: 'studio', label: 'The Studio', type: 'page' },
      { slug: 'membership', label: 'Membership', type: 'hub' },
    ] },
    membership: { entityType: 'hub', relatedEntities: [
      { slug: 'vault-member', label: 'Vault Portal', type: 'page' },
      { slug: 'vaultsparked', label: 'Vault Sparked', type: 'page' },
    ] },
  };

  const intel = readJson('api/public-intelligence.json');

  // Public memory — searchable body kept (sanitized) for retrieval breadth, but
  // the DISPLAYED summary is a clean, curated, public-voice line.
  add(
    'VaultSpark Studios public memory',
    '/llms-full.txt',
    read('llms-full.txt'),
    'A living record of what VaultSpark Studios is building in the open — games, tools, worlds, and the studio intelligence behind them.'
  );

  if (intel) {
    // Current focus — sourced from the PUBLIC consumer changelog / pulse, never
    // from project.currentFocus (raw Studio-OS session text).
    const cl = (intel.consumerChangelog || [])[0];
    const focusSummary = cl
      ? `${cl.title}. ${(cl.highlights || []).slice(0, 2).join(' ')}`
      : (intel.pulse?.now || []).slice(0, 2).join(' ');
    add('Current studio focus', '/studio/', focusSummary || 'The studio ships in public, week over week.');

    (intel.catalog || []).forEach((p) => {
      const entityMeta = ENTITY_RELATIONS[p.id] || (p.type === 'game'
        ? { entityType: 'game', relatedEntities: [{ slug: 'games', label: 'All games', type: 'page' }] }
        : { entityType: 'project', relatedEntities: [{ slug: 'studio', label: 'The Studio', type: 'page' }] });
      add(p.name, p.deployedUrl || `/${p.type === 'game' ? 'games' : 'projects'}/${p.id}/`,
        `${p.name} ${p.status || ''} ${p.note || ''} ${p.summary || ''}`, '', entityMeta);
    });

    (intel.consumerChangelog || []).forEach((c) =>
      add(c.title, '/changelog/', `${c.title} ${(c.highlights || []).join(' ')}`));
  }

  // Feedback — human prose from theme labels, NOT JSON.stringify of the raw rows.
  const feedback = readJson('api/feedback-provenance.json');
  if (feedback && (feedback.themes || []).length) {
    const labels = feedback.themes.map((t) => t.label || t.key).filter(Boolean);
    add('Feedback loop', '/changelog/#requests',
      `Recent visitor feedback clusters around ${labels.join(', ')}. VaultSpark tracks these themes and ships changes against them — every theme links to the work it inspired.`);
  }

  // Security — human prose from the already-clean control.detail / label, NOT JSON.
  const security = readJson('api/security-posture.json');
  if (security && (security.controls || []).length) {
    const active = security.controls.filter((c) => c.status === 'active');
    const labels = (active.length ? active : security.controls).map((c) => c.label).filter(Boolean);
    add('Security posture', '/security/',
      `The site is protected by ${labels.join(', ')}. ${security.controls.map((c) => c.detail).filter(Boolean).slice(0, 2).join(' ')}`);
  }

  ['privacy/index.html', 'terms/index.html', 'rights/index.html', 'membership/index.html', 'games/index.html', 'universe/index.html', 'oracle/index.html'].forEach((rel) => {
    const html = read(rel);
    const pageSlug = rel.replace('/index.html', '');
    if (html) add(pageSlug, '/' + rel.replace('index.html', ''), html, metaDescription(html), STATIC_ENTITY[pageSlug] || null);
  });

  // S334: ground the answer engine in the studio's own canonical record.
  //
  // The .ai/ fact sheets are the one corpus written to BE quoted — each is
  // index-follow, self-describing, and carries an explicit "cite this page"
  // block with its canonical URL. The engine has always rendered a source link
  // per document, so it was already citation-capable; it simply had none of
  // these 16 sheets to cite, and answered about projects from looser prose
  // instead. Adding them means a question about a project resolves to the
  // studio's own canonical answer, with a link the reader can verify.
  //
  // Enumerated from the registry projection rather than by globbing, so a sheet
  // that exists but is not a public project cannot slip into the public corpus.
  const factSheetProjects = readJson('agents.json');
  let factSheets = 0;
  for (const p of (factSheetProjects && factSheetProjects.projects) || []) {
    if (!p.aiFactSheet) continue;
    const rel = p.aiFactSheet.replace('https://vaultsparkstudios.com/', '') + 'index.html';
    const html = read(rel);
    if (!html) continue;
    add(`${p.name} — canonical fact sheet`, p.aiFactSheet.replace('https://vaultsparkstudios.com', ''), html, metaDescription(html));
    factSheets += 1;
  }
  if (!factSheets) {
    // A silent zero here would quietly un-ground every project answer while the
    // build still reported success. Fail loudly instead.
    console.error('build-ignis-search-index: no .ai fact sheets reached the index — agents.json may be stale (run build-agents-json.mjs)');
    process.exitCode = 1;
  }

  return { schemaVersion: '1.0', generatedAt: new Date().toISOString(), generatedBy: 'scripts/build-ignis-search-index.mjs', publicSafe: true, documents: docs };
}

// ── Self-test: no document summary may leak Studio-OS session jargon ──────────
if (SELFTEST) {
  const art = build();
  const LEAK = /\bS\d{2,3}\b|goal[\s-]*chain|\/(start|audit|implement|closeout)\b|\bdeferred\b|\d+\s+shipped|proof surface|build:check/i;
  const offenders = art.documents.filter((d) => LEAK.test(d.summary));
  if (offenders.length) {
    console.error(`build-ignis-search-index --self-test FAILED: ${offenders.length} summary(ies) leak ops jargon:`);
    offenders.forEach((d) => console.error(`  - ${d.title}: ${d.summary.slice(0, 90)}`));
    process.exit(1);
  }
  console.log(`build-ignis-search-index --self-test: ok (${art.documents.length} docs, 0 voice leaks)`);
  process.exit(0);
}

const VOICE_LEAK = /\bS\d{2,3}\b|goal[\s-]*chain|\/(start|audit|implement|closeout)\b|\bdeferred\b|\d+\s+shipped|proof surface|build:check/i;

// Content-hash skip: rebuild only when input data files change.
const IGNIS_INPUTS = [
  path.join(ROOT, 'api', 'public-intelligence.json'),
  path.join(ROOT, 'api', 'feedback-provenance.json'),
  path.join(ROOT, 'api', 'security-posture.json'),
  path.join(ROOT, 'data', 'game-registry.json'),
  path.join(ROOT, 'llms-full.txt'),
  ...['privacy/index.html', 'terms/index.html', 'rights/index.html',
      'membership/index.html', 'games/index.html', 'universe/index.html',
      'oracle/index.html'].map((r) => path.join(ROOT, r)),
];
const ignisCache = (!FORCE) ? checkHash('ignis-index', IGNIS_INPUTS) : { hit: false, hash: '' };
if (ignisCache.hit) {
  console.log('build-ignis-search-index: SKIP (inputs unchanged)');
  process.exit(0);
}

const artifact = build();
const text = JSON.stringify(artifact, null, 2) + '\n';
if (CHECK) {
  // Voice-leak gate folded INTO --check (no new build:check segment — the chain
  // is near the Windows cmd.exe 8191-char limit). [[feedback_buildcheck_cmdexe_length_limit]]
  const leaks = artifact.documents.filter((d) => VOICE_LEAK.test(d.summary));
  if (leaks.length) {
    console.error(`build-ignis-search-index --check: ${leaks.length} summary(ies) leak Studio-OS jargon to Ask IGNIS (voice firewall)`);
    leaks.forEach((d) => console.error(`  - ${d.title}: ${d.summary.slice(0, 80)}`));
    process.exit(1);
  }
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  const normalize = (s) => s.replace(/"generatedAt": ".*?"/, '"generatedAt": "<ts>"');
  if (normalize(current) !== normalize(text)) {
    console.error('build-ignis-search-index --check: data/ignis-search-index.json is stale');
    process.exit(1);
  }
  console.log(`build-ignis-search-index --check: ok (${artifact.documents.length} docs)`);
  process.exit(0);
}
fs.writeFileSync(OUT, text);
saveHash('ignis-index', ignisCache.hash);
console.log(`build-ignis-search-index -> data/ignis-search-index.json (${artifact.documents.length} docs)`);
