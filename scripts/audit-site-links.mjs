#!/usr/bin/env node
// S134 — full-site link audit.
// Crawls every HTML page on the site, extracts every <a href>, classifies them,
// and cross-references against:
//   - portfolio/PROJECT_REGISTRY.json (canonical runtimeUrl per project)
//   - sibling repo PROJECT_STATUS.json (current truth)
//   - sibling repo README.md (live URL hints)
// Flags:
//   - Links pointing at OLD migrated runtime URLs that no longer match canon
//   - Links to non-VaultSpark domains that look like dead third-party hosts
//   - Internal links to slugs that don't exist anywhere on the site
//   - Project pages missing canonical runtimeUrl callout
//
// Output: docs/LINK_AUDIT_S134.md + .cache/link-audit.json
//
// Usage:
//   node scripts/audit-site-links.mjs           # full audit
//   node scripts/audit-site-links.mjs --json    # JSON to stdout

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const devRoot = process.env.STUDIO_DEV_ROOT || path.resolve(repoRoot, '..');
const opsRoot = path.join(devRoot, 'vaultspark-studio-ops');

const args = new Set(process.argv.slice(2));
const jsonMode = args.has('--json');
const RUN_DIRECT = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('audit-site-links.mjs');
const RUNTIME_ROUTES = new Set(['/login', '/auth/callback']);

// ---------- known dead/migrated URL patterns ----------
// Old hosts we previously linked to but have migrated away from.
const SUSPECT_HOSTS = [
  'vercel.app',
  'netlify.app',
  'github.io',           // EXCEPT vaultsparkstudios.github.io is the legacy redirect
  'onrender.com',
  'railway.app',
  'fly.dev',
  'herokuapp.com',
  'streamlit.app',
  'replit.app',
  'replit.dev',
  'glitch.me',
];

// Whitelist hosts that are always fine.
const SAFE_HOSTS = new Set([
  'vaultsparkstudios.com',
  'www.vaultsparkstudios.com',
  'hub.vaultsparkstudios.com',
  'app-social-dashboard.vaultsparkstudios.com',
  'staging.vaultsparkstudios.com',
  'website.staging.vaultsparkstudios.com',
  'studio-hub.staging.vaultsparkstudios.com',
  'github.com',
  'discord.com',
  'discord.gg',
  'x.com',
  'twitter.com',
  'instagram.com',
  'youtube.com',
  'youtu.be',
  'linkedin.com',
  'reddit.com',
  'open.spotify.com',
  'spotify.com',
  'patreon.com',
  'buymeacoffee.com',
  'web.archive.org',
  'archive.org',
  'stripe.com',
  'supabase.com',
  'cloudflare.com',
  'anthropic.com',
  'claude.com',
  'openai.com',
  'platform.claude.com',
]);

// ---------- load registry ----------
function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

const registry = readJSON(path.join(opsRoot, 'portfolio', 'PROJECT_REGISTRY.json'));
const projectsBySlug = {};
const projectsByName = {};
if (registry?.projects) {
  for (const p of registry.projects) {
    projectsBySlug[p.slug] = p;
    if (p.name) projectsByName[p.name] = p;
  }
}

// page-slug → registry-slug + sibling-repo folder (extends drift detector's map)
const PAGE_TO_PROJECT = {
  'games/call-of-doodie':            { slug: 'call-of-doodie',        folder: 'Call-Of-Doodie' },
  'games/gridiron-gm':               { slug: 'gridiron-gm',           folder: 'Gridiron-GM' },
  'games/gridiron-gm-play':          { slug: 'gridiron-gm-play',      folder: 'gridiron-gm-play' },
  'games/mindframe':                 { slug: 'mindframe',             folder: 'mindframe' },
  'games/solara':                    { slug: 'solara',                folder: 'Solara' },
  'games/the-exodus':                { slug: 'the-exodus',            folder: 'The-Exodus' },
  'games/vaultfront':                { slug: 'vaultfront',            folder: 'VaultFront' },
  'games/franchise-architect':    { slug: 'franchise-architect',folder: 'Franchise Architect' },
  'games/project-unknown':           { slug: null,                    folder: null },
  'projects/canon':                  { slug: 'canon',                 folder: 'Canon' },
  'projects/ideaforge':              { slug: 'ideaforge',             folder: 'IdeaForge' },
  'projects/promogrind':             { slug: 'promogrind',            folder: 'PromoGrind' },
  'projects/statvault':              { slug: 'statvault',             folder: 'StatVault' },
  'projects/the-living-protocol':    { slug: 'living-protocol',       folder: 'The-Living-Protocol' },
  'projects/vaultfront':             { slug: 'vaultfront',            folder: 'VaultFront' },
  'projects/velaxis':                { slug: 'velaxis',               folder: null },
  'projects/vorn':                   { slug: 'vorn',                  folder: 'Vorn' },
  'projects/voidfall':               { slug: 'voidfall',              folder: 'Voidfall' },
  'projects/voidfall-companion':     { slug: 'voidfall-companion',    folder: null },
  'projects/scriptorium':            { slug: 'scriptorium',           folder: 'Scriptorium' },
  'projects/seamline':               { slug: 'seamline',              folder: 'Seamline' },
  'projects/sparkfunnel':            { slug: 'sparkfunnel',           folder: 'SparkFunnel' },
  'projects/studio-ops':             { slug: 'studio-ops',            folder: 'vaultspark-studio-ops' },
  'projects/vaultspark-ignis':       { slug: 'vaultspark-ignis',      folder: 'vaultspark-ignis' },
  'projects/vaultspark-forge':       { slug: 'vaultspark-forge',      folder: 'VaultSpark-Forge' },
  'projects/vaultspark-studio-hub':  { slug: 'vaultspark-studio-hub', folder: 'vaultspark-studio-hub' },
  'projects/vaultspark-studios-social-dashboard': { slug: 'vaultspark-studios-social-dashboard', folder: 'vaultspark-social-dashboard' },
  'projects/vaultsparkstudios-website': { slug: 'vaultsparkstudios-website', folder: 'vaultsparkstudios.github.io' },
};

// Pull live URL truth from sibling repo PROJECT_STATUS.json or README.md.
function siblingTruth(folder) {
  if (!folder) return null;
  const base = path.join(devRoot, folder);
  if (!fs.existsSync(base)) return null;
  const status = readJSON(path.join(base, 'context', 'PROJECT_STATUS.json'));
  const liveUrl = status?.liveUrl || status?.runtimeUrl || status?.url || null;
  const stagingUrl = status?.stagingUrl || null;
  const repoStatus = status?.status || status?.vaultStatus || null;
  const focus = status?.currentFocus || null;
  const nextMilestone = status?.nextMilestone || null;
  const blockers = status?.blockers || null;
  const lastUpdated = status?.lastUpdated || null;
  // README-derived live URL fallback
  let readmeLive = null;
  const readme = (() => { try { return fs.readFileSync(path.join(base, 'README.md'), 'utf8'); } catch { return ''; } })();
  if (readme) {
    const m = readme.match(/(?:Live(?:\s*Site)?|Production|Deployed at)[:\s]*\[?[^\]]*\]?\(?([a-zA-Z][^\s)>"']+)\)?/i);
    if (m) readmeLive = m[1].replace(/[)>"',.]+$/, '');
  }
  return { liveUrl, stagingUrl, repoStatus, focus, nextMilestone, blockers, lastUpdated, readmeLive, base };
}

// ---------- HTML link extraction ----------
export function extractHrefs(html) {
  const out = [];
  const re = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) != null) {
    const href = m[1].trim();
    const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
    // line number (approx)
    const line = html.slice(0, m.index).split(/\r?\n/).length;
    out.push({ href, text, line });
  }
  return out;
}

export function classifyHref(href) {
  if (!href) return 'empty';
  if (href.startsWith('#')) return 'fragment';
  if (href.startsWith('mailto:')) return 'mailto';
  if (href.startsWith('tel:')) return 'tel';
  if (href.startsWith('javascript:')) return 'js';
  if (href.startsWith('/')) return 'absolute-internal';
  if (href.startsWith('./') || href.startsWith('../')) return 'relative';
  if (/^https?:\/\//i.test(href)) return 'external';
  if (/^[a-z0-9][a-z0-9.-]*\./i.test(href)) return 'bare-domain';
  return 'relative';
}

export function hostOf(href) {
  try { return new URL(href, 'https://vaultsparkstudios.com').host; } catch { return null; }
}

export function resolvesInternalHref(clean, internalPaths) {
  if (RUNTIME_ROUTES.has(clean)) return true;
  if (clean.startsWith('/api/') || clean.startsWith('/.well-known/')) return true;
  if (/\.(png|jpg|jpeg|svg|webp|avif|gif|pdf|zip|css|js|json|ndjson|xml|txt|ico|woff|woff2)$/i.test(clean)) return true;
  const asFile = clean.endsWith('.html');
  const candidates = asFile ? [clean] : [clean, `${clean}/index.html`, `${clean}/`];
  return candidates.some((candidate) => internalPaths.has(candidate) || internalPaths.has(candidate.replace(/\/$/, '')));
}

// ---------- walk site ----------
function walkHtml(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.git', 'playwright-report', '.cache', 'dist', 'build', 'logs', 'docs'].includes(e.name)) continue;
      walkHtml(full, out);
    } else if (e.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

export function runAudit() {
const files = walkHtml(repoRoot);

// Collect every internal slug that exists (for dead-internal detection)
const internalPaths = new Set(['/', '/index.html']);
for (const f of files) {
  let rel = path.relative(repoRoot, f).split(path.sep).join('/');
  // root index.html
  if (rel === 'index.html') {
    internalPaths.add('/');
    internalPaths.add('/index.html');
    continue;
  }
  if (rel.endsWith('/index.html')) {
    const dir = rel.slice(0, -'index.html'.length); // e.g. "games/solara/"
    internalPaths.add('/' + dir);                    // "/games/solara/"
    internalPaths.add('/' + dir.replace(/\/$/, '')); // "/games/solara"
    internalPaths.add('/' + rel);                    // "/games/solara/index.html"
  } else {
    internalPaths.add('/' + rel);
  }
}

// ---------- audit ----------
const findings = [];
let scannedLinks = 0;

for (const file of files) {
  const rel = path.relative(repoRoot, file).split(path.sep).join('/');
  const html = fs.readFileSync(file, 'utf8');
  const hrefs = extractHrefs(html, file);
  scannedLinks += hrefs.length;

  for (const { href, text, line } of hrefs) {
    if (href.includes('${')) continue; // build-time template, not a rendered destination
    const kind = classifyHref(href);

    if (kind === 'external' || kind === 'bare-domain') {
      const host = hostOf(href.startsWith('http') ? href : `https://${href}`);
      if (!host) continue;

      // Suspect host check
      const suspect = SUSPECT_HOSTS.some(s => host.endsWith(s)) && !SAFE_HOSTS.has(host);
      if (suspect) {
        findings.push({
          severity: 'HIGH',
          type: 'suspect-host',
          page: rel,
          line,
          href,
          text,
          host,
          note: `Host "${host}" matches deprecated-platform pattern. Verify against PROJECT_REGISTRY runtimeUrl.`,
        });
      }
    }

    if (kind === 'absolute-internal') {
      // strip query/fragment
      const clean = href.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';
      if (!resolvesInternalHref(clean, internalPaths)) {
        findings.push({
          severity: 'MEDIUM',
          type: 'dead-internal',
          page: rel,
          line,
          href,
          text,
          note: `Internal path "${clean}" doesn't resolve to a known page.`,
        });
      }
    }
  }
}

// ---------- project page truth sweep ----------
const truthGaps = [];
for (const [pageId, info] of Object.entries(PAGE_TO_PROJECT)) {
  if (!info.slug) continue;
  const pageFile = path.join(repoRoot, pageId, 'index.html');
  if (!fs.existsSync(pageFile)) continue;
  const html = fs.readFileSync(pageFile, 'utf8');
  const registryEntry = projectsBySlug[info.slug];
  const sibling = siblingTruth(info.folder);

  // Canonical runtime URL: prefer sibling PROJECT_STATUS.json, fall back to registry.
  const canonicalUrl = sibling?.liveUrl || registryEntry?.runtimeUrl || null;
  if (canonicalUrl && !html.includes(canonicalUrl)) {
    truthGaps.push({
      severity: 'HIGH',
      type: 'missing-canonical-url',
      page: pageId,
      canonicalUrl,
      note: `Page does not link to canonical live URL "${canonicalUrl}"`,
    });
  }

  // Status drift
  const registryStatus = registryEntry?.vaultStatus || registryEntry?.status;
  if (registryStatus) {
    const expected = String(registryStatus).toLowerCase();
    if (!html.toLowerCase().includes(expected)) {
      // soft — many pages don't render status as text
    }
  }
}

// ---------- output ----------
const out = {
  scannedFiles: files.length,
  scannedLinks,
  findings: findings.sort((a, b) =>
    ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[a.severity] || 9) -
    ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[b.severity] || 9)
  ),
  truthGaps,
  generatedAt: new Date().toISOString(),
};

fs.mkdirSync(path.join(repoRoot, '.cache'), { recursive: true });
fs.writeFileSync(path.join(repoRoot, '.cache', 'link-audit.json'), JSON.stringify(out, null, 2));

if (jsonMode) {
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

// Markdown report
const md = [];
md.push(`# Link Audit — S134\n`);
md.push(`Generated: ${out.generatedAt}\n`);
md.push(`Scanned: **${out.scannedFiles}** files, **${out.scannedLinks}** links\n`);
md.push(`\n## Summary\n`);
md.push(`- Suspect-host findings: ${findings.filter(f => f.type === 'suspect-host').length}`);
md.push(`- Dead-internal links: ${findings.filter(f => f.type === 'dead-internal').length}`);
md.push(`- Project pages missing canonical URL: ${truthGaps.filter(t => t.type === 'missing-canonical-url').length}`);
md.push(`\n## HIGH — Suspect external hosts (likely migrated URLs)\n`);
for (const f of findings.filter(f => f.type === 'suspect-host')) {
  md.push(`- **${f.page}:${f.line}** → \`${f.href}\``);
  md.push(`  - text: "${f.text}" · host: ${f.host}`);
}
md.push(`\n## HIGH — Project pages missing canonical live URL\n`);
for (const t of truthGaps.filter(t => t.type === 'missing-canonical-url')) {
  md.push(`- **${t.page}** missing \`${t.canonicalUrl}\``);
}
md.push(`\n## MEDIUM — Dead internal links\n`);
const dead = findings.filter(f => f.type === 'dead-internal');
// dedupe by href+page
const seen = new Set();
for (const f of dead) {
  const key = `${f.page}::${f.href}`;
  if (seen.has(key)) continue;
  seen.add(key);
  md.push(`- **${f.page}:${f.line}** → \`${f.href}\` ("${f.text}")`);
}

const reportPath = path.join(repoRoot, 'docs', 'LINK_AUDIT_S134.md');
fs.writeFileSync(reportPath, md.join('\n'));

console.log(`✓ Link audit complete`);
console.log(`  scanned: ${out.scannedFiles} files · ${out.scannedLinks} links`);
console.log(`  suspect-host:      ${findings.filter(f => f.type === 'suspect-host').length}`);
console.log(`  dead-internal:     ${findings.filter(f => f.type === 'dead-internal').length}`);
console.log(`  missing-canonical: ${truthGaps.filter(t => t.type === 'missing-canonical-url').length}`);
console.log(`  → ${reportPath}`);
console.log(`  → .cache/link-audit.json`);
return out;
}

function selfTest() {
  const paths = new Set(['/', '/solara/archive.html']);
  const cases = [
    ['extracts an href', extractHrefs('<a href="/x/">X</a>')[0]?.href === '/x/'],
    ['recognizes Worker login', resolvesInternalHref('/login', paths)],
    ['recognizes Worker callback', resolvesInternalHref('/auth/callback', paths)],
    ['recognizes NDJSON assets', resolvesInternalHref('/data/history.ndjson', paths)],
    ['recognizes real static files', resolvesInternalHref('/solara/archive.html', paths)],
    ['rejects an absent page', !resolvesInternalHref('/missing', paths)],
    ['classifies template href for caller filtering', classifyHref('/pathways/${p.slug}/') === 'absolute-internal'],
  ];
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`);
  if (cases.some(([, ok]) => !ok)) process.exit(1);
  console.log(`audit-site-links --self-test: ${cases.length}/${cases.length} passed`);
}

if (RUN_DIRECT) {
  if (args.has('--self-test')) selfTest();
  else {
    const result = runAudit();
    process.exit(result.findings.length || result.truthGaps.length ? 1 : 0);
  }
}
