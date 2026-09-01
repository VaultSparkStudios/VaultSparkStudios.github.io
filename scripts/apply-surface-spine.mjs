#!/usr/bin/env node
/**
 * apply-surface-spine.mjs — S334 (audit items 9 and 13).
 *
 * Two clusters on this site have the same shape of problem: several surfaces
 * answer overlapping questions, and not one of them says how it differs from
 * its neighbours.
 *
 *   membership — /membership/, /vault-member/, /members/, /member/,
 *                /vault-wall/, /invite/, /community/, /leaderboards/
 *   editorial  — /news/, /journal/, /journal/dispatches/, /journal/archive/,
 *                /changelog/, /notebook/, and two more under /news/
 *
 * Four of the membership surfaces overlap on "who else is here and how do I
 * rank"; three of the editorial ones are the SAME fact stream at three
 * granularities (narrative, session, commit) presented as three destinations.
 * A visitor who picks the wrong door cannot tell they picked the wrong door.
 *
 * This injects one orientation strip per page: a single line saying what THIS
 * page is, plus direct links to the sibling that answers the other thing. It is
 * orientation, not navigation — nothing moves, nothing is merged, no permalink
 * changes. The cheapest possible fix for the actual failure, which is not that
 * the pages exist but that they are unlabelled.
 *
 * Idempotent by marker. Every href is resolved against the tree before writing,
 * because a disambiguation strip that points into a 404 is worse than none.
 *
 * Usage:
 *   node scripts/apply-surface-spine.mjs --apply
 *   node scripts/apply-surface-spine.mjs --check
 *   node scripts/apply-surface-spine.mjs --self-test
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const CHECK = process.argv.includes('--check');

export const MARKER = 'data-vs-spine';
const ANCHOR = '<main id="main-content"';

export function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Styling rides inline with the strip.
 *
 * ~700 bytes on 10 pages is far cheaper than rotating the 192KB shared shell
 * hash for every visitor on the site, and every colour is an existing custom
 * property so all seven themes are correct without seven overrides.
 */
const SPINE_STYLE = '<style data-vs-spine-style>.vs-spine{border-bottom:1px solid rgba(127,127,127,.18);background:rgba(127,127,127,.04)}.vs-spine-in{display:flex;flex-wrap:wrap;align-items:baseline;gap:.6rem 1.25rem;padding:.85rem 0;font-size:.9rem;line-height:1.5}.vs-spine-self{color:var(--text);font-weight:600;margin:0}.vs-spine-kin{display:flex;flex-wrap:wrap;gap:.5rem 1.1rem;list-style:none;margin:0;padding:0}.vs-spine-kin a{color:var(--muted);text-decoration:underline;text-underline-offset:3px}.vs-spine-kin a:hover,.vs-spine-kin a:focus-visible{color:var(--gold)}@media(max-width:640px){.vs-spine-in{flex-direction:column;gap:.5rem;padding:.75rem 0}}</style>';

export function buildStrip(page) {
  const kin = (page.kin || [])
    .map((k) => `<li><a href="${escapeHtml(k.href)}">${escapeHtml(k.label)}</a></li>`)
    .join('');
  return `<aside class="vs-spine" ${MARKER} aria-label="What this page is"><div class="container vs-spine-in"><p class="vs-spine-self">${escapeHtml(page.self)}</p><ul class="vs-spine-kin">${kin}</ul></div></aside>`;
}

/** Resolve a site-absolute href (possibly anchored) against the tree. */
export function resolves(href, exists) {
  const path = String(href).split('#')[0].split('?')[0];
  if (!path.startsWith('/')) return false;
  const rel = path.replace(/^\//, '');
  if (rel === '') return exists('index.html');
  if (rel.endsWith('/')) return exists(`${rel}index.html`);
  return exists(rel) || exists(`${rel}/index.html`) || exists(`${rel}.html`);
}

export function validate(clusters, exists) {
  const problems = [];
  for (const cluster of clusters) {
    for (const page of cluster.pages) {
      if (!exists(page.file)) { problems.push(`${cluster.id}: page "${page.file}" does not exist`); continue; }
      if (!page.self || !page.self.trim()) problems.push(`${cluster.id}/${page.file}: empty self description`);
      for (const k of page.kin || []) {
        if (!resolves(k.href, exists)) problems.push(`${cluster.id}/${page.file}: kin href "${k.href}" does not resolve`);
      }
    }
  }
  return problems;
}

/**
 * Insert after the <main> opening tag, replacing any prior strip in place so a
 * copy edit updates rather than accumulates.
 */
export function injectStrip(html, page) {
  const strip = buildStrip(page);
  const existing = new RegExp(`<aside class="vs-spine"[\\s\\S]*?</aside>`, 'i');
  let next = html;
  if (existing.test(next)) {
    next = next.replace(existing, strip);
  } else {
    const at = next.indexOf(ANCHOR);
    if (at < 0) return null;
    const close = next.indexOf('>', at);
    if (close < 0) return null;
    next = next.slice(0, close + 1) + strip + next.slice(close + 1);
  }
  if (!next.includes('data-vs-spine-style')) {
    next = next.replace(/<\/head>/i, `${SPINE_STYLE}\n</head>`);
  }
  return next === html ? null : next;
}

function selfTest() {
  const results = [];
  const t = (n, ok) => results.push([n, ok]);
  const exists = (p) => ['a/index.html', 'b/index.html', 'c.html'].includes(p);

  t('a kin href that resolves passes', resolves('/a/', exists));
  t('an anchored kin href resolves through its page', resolves('/a/#x', exists));
  t('an extensionless href resolves to a sibling .html', resolves('/c', exists));
  t('a dead kin href is caught', !resolves('/nope/', exists));
  t('a relative href is rejected', !resolves('a/', exists));

  t('a missing page file is reported',
    validate([{ id: 'x', pages: [{ file: 'gone/index.html', self: 's', kin: [] }] }], exists).length === 1);
  t('a dead kin link is reported',
    validate([{ id: 'x', pages: [{ file: 'a/index.html', self: 's', kin: [{ href: '/nope/', label: 'l' }] }] }], exists).length === 1);
  t('an empty self line is reported',
    validate([{ id: 'x', pages: [{ file: 'a/index.html', self: '  ', kin: [] }] }], exists).length === 1);

  const page = { self: 'What this is', kin: [{ label: 'Other', href: '/a/' }] };
  const base = '<html><head></head><body><main id="main-content" class="x"><p>hi</p></main></body></html>';
  const once = injectStrip(base, page);
  // Match the <aside> specifically: the head <style> also contains "vs-spine"
  // and sits before <main>, so a substring search here proves nothing.
  t('the strip lands inside <main>, not before it',
    once.indexOf('<aside class="vs-spine"') > once.indexOf('<main id="main-content"'));
  t('the style is added once', (once.match(/data-vs-spine-style/g) || []).length === 1);
  t('re-running is a no-op', injectStrip(once, page) === null);

  const edited = injectStrip(once, { self: 'Changed', kin: [{ label: 'Other', href: '/a/' }] });
  t('a copy edit replaces rather than appends', (edited.match(/vs-spine"/g) || []).length === 1 && edited.includes('Changed'));
  t('escaping is applied', buildStrip({ self: '<b>x</b>', kin: [] }).includes('&lt;b&gt;x&lt;/b&gt;'));
  t('a page without the anchor is skipped rather than guessed at',
    injectStrip('<html><body><div>no main</div></body></html>', page) === null);

  const failed = results.filter(([, ok]) => !ok);
  for (const [n, ok] of results) console.log(`  ${ok ? '✓' : '⛔'} ${n}`);
  console.log(`[apply-surface-spine] self-test ${results.length - failed.length}/${results.length}`);
  return failed.length === 0;
}

if (process.argv.includes('--self-test')) {
  process.exit(selfTest() ? 0 : 1);
}

const { clusters } = JSON.parse(readFileSync(join(ROOT, 'data/surface-spine.json'), 'utf8'));
const exists = (p) => existsSync(join(ROOT, p));
const problems = validate(clusters, exists);
if (problems.length) {
  console.error('[apply-surface-spine] refusing to write a strip that points into a 404:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

let changed = 0;
const stale = [];
for (const cluster of clusters) {
  for (const page of cluster.pages) {
    const file = join(ROOT, page.file);
    const html = readFileSync(file, 'utf8');
    const next = injectStrip(html, page);
    if (!next) continue;
    if (CHECK) { stale.push(page.file); continue; }
    if (APPLY) { writeFileSync(file, next, 'utf8'); changed += 1; }
  }
}

if (CHECK) {
  if (stale.length) {
    console.error(`[apply-surface-spine] ${stale.length} page(s) missing or stale: ${stale.join(', ')}`);
    process.exit(1);
  }
  console.log('[apply-surface-spine] check passed — every spine strip current');
} else if (APPLY) {
  console.log(`[apply-surface-spine] wrote ${changed} strip(s) across ${clusters.length} cluster(s)`);
} else {
  console.log('[apply-surface-spine] dry-run — pass --apply to write');
}
