#!/usr/bin/env node
/* check-project-links.mjs — D-S208.4: full test coverage for every project hyperlink
 * on the Atlas + homepage hero. The studio site is the live source of truth for the
 * ecosystem, so every project link must resolve to a real destination — never a dead
 * page, never a dev/staging host, never a silent generic fallback.
 *
 * For each catalog project it derives the SAME destination the renderers use:
 *   - SPARKED + real product URL  → the live site (apex pathname or external domain)
 *   - else                        → the on-disk studio page (games/<id>/ or projects/<id>/)
 * and asserts:
 *   1. an on-site link points at a file that EXISTS on disk (no 404s);
 *   2. a live link is well-formed http(s) and NOT a dev/staging host (no railway/pages.dev/…);
 *   3. flags (advisory) any project that falls back to a generic /games/ or /projects/
 *      index because it has neither a page nor a live URL — these need a page or a URL.
 *
 * Usage: node scripts/check-project-links.mjs [--json] [--self-test]
 * Exit: 0 ok (errors=0) · 1 on any hard error (dead page / dev-host live link).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const JSON_MODE = argv.includes('--json');
const SELF_TEST = argv.includes('--self-test');

const DEV_HOST_RE = /(\.up\.railway\.app|\.railway\.app|\.pages\.dev|\.workers\.dev|\.onrender\.com|\.vercel\.app|\.netlify\.app|localhost|127\.0\.0\.1)$/i;

function liveHref(item) {
  if (!item.deployedUrl) return null;
  try {
    const u = new URL(item.deployedUrl);
    if (DEV_HOST_RE.test(u.hostname)) return { dev: true, url: item.deployedUrl };
    return { dev: false, url: u.origin.includes('vaultsparkstudios.com') ? u.pathname : item.deployedUrl };
  } catch { return null; }
}

function pageFor(item, exists) {
  const isGame = item.type === 'game';
  const cands = isGame ? [`games/${item.id}/index.html`, `${item.id}/index.html`]
                       : [`projects/${item.id}/index.html`, `${item.id}/index.html`];
  for (const rel of cands) if (exists(rel)) return '/' + rel.replace(/index\.html$/, '');
  return null; // no dedicated page → generic section fallback
}

// Derive the verdict for one project. Pure (exists injected) so it is unit-testable.
export function auditProject(item, exists) {
  const live = liveHref(item);
  const page = pageFor(item, exists);
  const issues = [];
  if (item.status === 'SPARKED' && live) {
    if (live.dev) issues.push({ level: 'error', msg: `SPARKED links to a dev/staging host: ${live.url}` });
  }
  // The "Details"/studio destination — must exist if used.
  if (!page && !(item.status === 'SPARKED' && live && !live.dev)) {
    issues.push({ level: 'warn', msg: `no on-site page and no live URL → falls back to generic /${item.type === 'game' ? 'games' : 'projects'}/` });
  }
  // If a non-dev live URL exists, it's the primary; ensure it parses.
  if (live && !live.dev && !/^https?:|^\//.test(live.url)) {
    issues.push({ level: 'error', msg: `malformed live URL: ${live.url}` });
  }
  const primary = (item.status === 'SPARKED' && live && !live.dev) ? live.url : (page || `/${item.type === 'game' ? 'games' : 'projects'}/`);
  return { id: item.id, primary, page, live: live && !live.dev ? live.url : null, issues };
}

if (SELF_TEST) {
  const ex = (rel) => rel === 'games/solara/index.html' || rel === 'projects/velaxis/index.html';
  const cases = [
    { name: 'SPARKED external product → live link, no issue',
      item: { id: 'velaxis', type: 'tool', status: 'SPARKED', deployedUrl: 'https://velaxis.markets/' }, wantErr: 0, wantWarn: 0 },
    { name: 'SPARKED on dev host → error (+ no-page warn)',
      item: { id: 'mindframe', type: 'tool', status: 'SPARKED', deployedUrl: 'https://x.up.railway.app' }, wantErr: 1, wantWarn: 1 },
    { name: 'FORGE with page → ok',
      item: { id: 'solara', type: 'game', status: 'FORGE', deployedUrl: null }, wantErr: 0, wantWarn: 0 },
    { name: 'FORGE no page no url → warn',
      item: { id: 'voidfall', type: 'game', status: 'FORGE', deployedUrl: null }, wantErr: 0, wantWarn: 1 },
    { name: 'FORGE on dev host → studio page, dev URL never surfaced (warn: no page)',
      item: { id: 'concurrent', type: 'project', status: 'FORGE', deployedUrl: 'https://x.pages.dev' }, wantErr: 0, wantWarn: 1 },
  ];
  let pass = 0, fail = 0;
  for (const c of cases) {
    const r = auditProject(c.item, ex);
    const errs = r.issues.filter(i => i.level === 'error').length;
    const warns = r.issues.filter(i => i.level === 'warn').length;
    const ok = errs === c.wantErr && warns === c.wantWarn;
    console.log(`  ${ok ? '✓' : '✗'} ${c.name} (err ${errs}/${c.wantErr}, warn ${warns}/${c.wantWarn})`);
    ok ? pass++ : fail++;
  }
  console.log(`\ncheck-project-links self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

const catalog = JSON.parse(readFileSync(join(ROOT, 'api/public-intelligence.json'), 'utf8')).catalog || [];
const exists = (rel) => existsSync(join(ROOT, rel));
const results = catalog.map((it) => auditProject(it, exists));
const errors = results.flatMap(r => r.issues.filter(i => i.level === 'error').map(i => ({ id: r.id, ...i })));
const warns = results.flatMap(r => r.issues.filter(i => i.level === 'warn').map(i => ({ id: r.id, ...i })));

if (JSON_MODE) {
  console.log(JSON.stringify({ ok: errors.length === 0, total: results.length, errors, warns, results }, null, 2));
  process.exit(errors.length ? 1 : 0);
}

console.log('check-project-links');
console.log('──────────────────────────────────────────────');
console.log(`  Projects:   ${results.length}`);
console.log(`  Live links: ${results.filter(r => r.live).length}  ·  On-site pages: ${results.filter(r => r.page).length}`);
for (const r of results) {
  const mark = r.issues.some(i => i.level === 'error') ? '⛔' : r.issues.some(i => i.level === 'warn') ? '⚠ ' : '✓';
  console.log(`  ${mark} ${r.id.padEnd(20)} → ${r.primary}`);
  for (const i of r.issues) console.log(`        ${i.level === 'error' ? '⛔' : '⚠'} ${i.msg}`);
}
if (errors.length) { console.error(`\n✗ ${errors.length} dead/dev-host link(s) — fix before push.`); process.exit(1); }
console.log(`\n✓ all ${results.length} project links resolve${warns.length ? ` (${warns.length} advisory — project needs a page or live URL)` : ''}.`);
process.exit(0);
