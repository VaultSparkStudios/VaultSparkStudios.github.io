#!/usr/bin/env node
/**
 * check-project-status-coherence.mjs (S247)
 *
 * Hero status badge ↔ nav status-group coherence.
 *
 * The nav dropdown (NAV_GAMES / NAV_PROJECTS in propagate-nav.mjs, themselves
 * gated against the catalog) groups every game/project page under SPARKED /
 * FORGE / VAULTED — but each page ALSO hardcodes its own hero badge
 * (`<span class="status status-forge">…`). S247 found four project pages
 * telling visitors "⚒️ Forge" while the nav promoted them as "🔥 Sparked"
 * (velaxis, vorn, promogrind, vault-member) — the S197 playability-coherence
 * class, resurfaced on the status axis. A page contradicting the nav that
 * links to it is a CANON-031 lying-surface defect.
 *
 * This gate parses the NAV arrays (grouping source of truth), reads each
 * linked page's hero badge, and FAILS on any disagreement.
 *
 * Usage:
 *   node scripts/check-project-status-coherence.mjs              # gate (exit 1 on mismatch)
 *   node scripts/check-project-status-coherence.mjs --self-test  # unit checks
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROJECT_ROUTE_OVERRIDES = Object.freeze({
  'football-gm': '/games/franchise-architect/',
  mindframe: '/games/mindframe/',
  promogrind: '/projects/promogrind/',
  velaxis: '/projects/velaxis/',
  vorn: '/projects/vorn/',
});

// Parse `{ status: 'SPARKED', … entries: [ {href: '…', …}, … ] }` sections out
// of the propagate-nav source. Regex-parse (not import) so this gate has zero
// coupling to that script's execution side effects.
export function parseNavSections(src) {
  const sections = [];
  const sectionRe = /\{\s*status:\s*'(\w+)'[\s\S]*?entries:\s*\[([\s\S]*?)\]\s*\}/g;
  let m;
  while ((m = sectionRe.exec(src))) {
    const status = m[1];
    const entries = [];
    const entryRe = /\{\s*href:\s*'([^']+)'([^}]*)\}/g;
    let e;
    while ((e = entryRe.exec(m[2]))) {
      const href = e[1];
      const rest = e[2];
      if (/cssClass/.test(rest)) continue;          // "see all" style links
      if (href === '/games/' || href === '/projects/') continue; // index links
      entries.push(href);
    }
    if (entries.length) sections.push({ status, entries });
  }
  return sections;
}

// First hero badge on a page: `class="status status-<x>"`. Null when absent.
export function badgeOf(html) {
  const m = String(html).match(/class="status status-(sparked|forge|vaulted)"/);
  return m ? m[1] : null;
}

export function deriveNavSections(root) {
  const gameRegistry = JSON.parse(fs.readFileSync(path.join(root, 'data', 'game-registry.json'), 'utf8'));
  const intelligence = JSON.parse(fs.readFileSync(path.join(root, 'api', 'public-intelligence.json'), 'utf8'));
  const gameIds = new Set(Object.keys(gameRegistry.games || {}));
  const groups = new Map(['SPARKED', 'FORGE', 'VAULTED'].map((status) => [status, new Set()]));
  const add = (status, href) => {
    const group = groups.get(String(status || '').toUpperCase());
    if (group && href) group.add(href);
  };

  for (const [slug, game] of Object.entries(gameRegistry.games || {})) {
    const href = `/games/${slug}/`;
    if (fs.existsSync(path.join(root, href.slice(1), 'index.html'))) add(game.status, href);
  }
  for (const project of intelligence.catalog || []) {
    if (project.type === 'game' || gameIds.has(project.id)) continue;
    const local = `/projects/${project.id}/`;
    const href = PROJECT_ROUTE_OVERRIDES[project.id]
      || (fs.existsSync(path.join(root, local.slice(1), 'index.html')) ? local : project.deployedUrl);
    add(project.status, href);
  }
  return [...groups].map(([status, entries]) => ({ status, entries: [...entries] })).filter((section) => section.entries.length);
}

function selfTest() {
  const navSample = `
const NAV_GAMES = [
  { status: 'SPARKED', label: '🔥 Sparked', cssClass: 'x', entries: [
    { href: '/games/a/', label: 'A' },
  ]},
  { status: 'FORGE', label: '⚒️', cssClass: 'y', entries: [
    { href: '/games/b/', label: 'B' },
    { href: '/games/', label: 'See all →', cssClass: 'dropdown-link-seeall' },
  ]},
];`;
  const sections = parseNavSections(navSample);
  const cases = [
    ['parses two sections', sections.length === 2],
    ['sparked section holds /games/a/', sections[0].status === 'SPARKED' && sections[0].entries.includes('/games/a/')],
    ['skips see-all + index links', !sections.flatMap((s) => s.entries).includes('/games/')],
    ['badgeOf finds sparked', badgeOf('<span class="status status-sparked">🔥</span>') === 'sparked'],
    ['badgeOf finds forge', badgeOf('x <span class="status status-forge">⚒️</span>') === 'forge'],
    ['badgeOf null when absent', badgeOf('<div>no badge</div>') === null],
  ];
  let pass = 0;
  for (const [name, ok] of cases) { if (ok) pass += 1; else console.error(`  ✗ ${name}`); }
  console.log(`check-project-status-coherence --self-test: ${pass}/${cases.length} passing`);
  process.exit(pass === cases.length ? 0 : 1);
}

if (process.argv.includes('--self-test')) selfTest();

const sections = deriveNavSections(ROOT);
if (!sections.length) {
  console.error('check-project-status-coherence: registry-derived nav sections are empty — source data missing or malformed.');
  process.exit(1);
}

let checked = 0;
let skipped = 0;
const mismatches = [];
for (const { status, entries } of sections) {
  const want = status.toLowerCase();
  for (const href of entries) {
    const page = path.join(ROOT, href.replace(/^\//, '').replace(/\/$/, ''), 'index.html');
    if (!fs.existsSync(page)) { skipped++; continue; }
    const badge = badgeOf(fs.readFileSync(page, 'utf8'));
    if (badge === null) { skipped++; continue; } // portal-style pages without a hero badge
    checked++;
    if (badge !== want) mismatches.push({ href, nav: want, badge });
  }
}

if (mismatches.length) {
  console.error(`check-project-status-coherence: ${mismatches.length} page(s) contradict the nav status group:`);
  for (const x of mismatches) {
    console.error(`  ✗ ${x.href} — nav says ${x.nav.toUpperCase()}, hero badge says ${x.badge.toUpperCase()}`);
  }
  console.error('  Fix the page badge (or the NAV array if the grouping itself is wrong).');
  process.exit(1);
}
console.log(`check-project-status-coherence: ok (${checked} page badge(s) coherent · ${skipped} skipped)`);
