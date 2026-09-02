#!/usr/bin/env node
/**
 * CI audit targets must name routes that still exist.
 *
 * THE LIVE S338 CASE. `/ranks/` was consolidated into `/leaderboards/#ranks` and
 * its page deleted; a `_redirects` rule 301s it at the edge. Three CI audit
 * target lists were never updated with it — and one of them audits the LOCAL
 * PREVIEW server, which serves the built tree and does not apply `_redirects`.
 * So Lighthouse asked for a page that cannot exist there, got 404, and
 * `ERRORED_DOCUMENT_REQUEST` failed the whole job: 15 consecutive red runs over
 * ~27 hours, during which the site's performance gate produced no verdict at all
 * and nothing said so. The route merge was correct; its consumers were stranded.
 *
 * Two structural rules, neither of which names a route:
 *
 *   1. NO CONSOLIDATED ROUTE IS AN AUDIT TARGET. `config/route-consolidation.json`
 *      already records every `from -> to` merge. A target matching a `from` is
 *      auditing a redirect, not a page — pointless against production, fatal
 *      against the local preview. Derived from that config, so the next merge
 *      protects itself the moment it is recorded.
 *
 *   2. EVERY LOCAL-PREVIEW TARGET MUST EXIST AS A PAGE. The preview serves the
 *      built tree with no edge layer: `_redirects`, Worker routes and Pages
 *      rules are all absent. A target with no `index.html` behind it is a
 *      guaranteed 404 regardless of how production answers, and the failure
 *      lands on CI rather than in review.
 *
 * Deliberately NOT rule 3 ("every production target must return 200"): that is a
 * network assertion, and this gate must stay offline and deterministic so it can
 * run inside `build:check`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WORKFLOW_DIR = path.join(ROOT, '.github', 'workflows');
const CONSOLIDATION = path.join(ROOT, 'config', 'route-consolidation.json');
const TIERS = path.join(ROOT, 'config', 'lighthouse-route-tiers.json');

const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');

/** Any absolute URL to a site origin, plus the local preview. */
const URL_RE = /https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(\/[^\s"'`)]*)|https:\/\/(?:website\.staging\.)?vaultsparkstudios\.com(\/[^\s"'`)]*)/g;

export function normalizeRoute(route) {
  if (!route) return null;
  // A shell warmup loop ends `.../chaperone/; do`, so the last token arrives
  // with the command separator attached. Left on, it turns a real audited page
  // into a phantom missing one — a gate against stranded routes must not invent
  // its own.
  const r = String(route).split('#')[0].split('?')[0].trim().replace(/[;,]+$/, '');
  if (!r.startsWith('/')) return null;
  return r;
}

/** Extract every audited route from one workflow's text, with local-preview provenance. */
export function extractTargets(text, file) {
  const found = [];
  for (const match of String(text).matchAll(URL_RE)) {
    const local = match[1] !== undefined;
    const route = normalizeRoute(match[1] ?? match[2]);
    if (route) found.push({ route, local, file });
  }
  // The warmup loops are bare paths in a shell `for u in ...` list, not URLs —
  // the same stranded route lived there too, and a gate that only reads URLs
  // would have left half the defect in place.
  for (const loop of String(text).matchAll(/for\s+\w+\s+in\s+((?:\/\S*\s+)+)/g)) {
    for (const raw of loop[1].split(/\s+/)) {
      const route = normalizeRoute(raw);
      if (route) found.push({ route, local: true, file });
    }
  }
  return found;
}

export function consolidatedRoutes(config) {
  const map = new Map();
  for (const entry of config?.redirects || []) {
    const from = normalizeRoute(entry.from);
    if (from) map.set(from, entry.to || '(unrecorded)');
  }
  return map;
}

/**
 * A route resolves when the built tree has a page for it. Tracked files are the
 * authority (a generated page absent from git is not deployable), but an
 * on-disk build output counts too so a fresh generator does not read as missing.
 */
export function routeResolves(route, { tracked, exists }) {
  const rel = route === '/' ? 'index.html' : `${route.replace(/^\//, '').replace(/\/$/, '')}/index.html`;
  const direct = route.replace(/^\//, '');
  return tracked.has(rel) || tracked.has(direct) || exists(rel) || exists(direct);
}

export function evaluate(targets, consolidated, resolver) {
  const problems = [];
  const seen = new Set();
  for (const { route, local, file } of targets) {
    const key = `${file}|${route}|${local}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (consolidated.has(route)) {
      problems.push({
        kind: 'consolidated',
        route,
        file,
        detail: `${file} audits ${route}, which config/route-consolidation.json merged into ${consolidated.get(route)}. Audit the target, not the redirect.`,
      });
      continue;
    }
    if (local && !routeResolves(route, resolver)) {
      problems.push({
        kind: 'missing-page',
        route,
        file,
        detail: `${file} audits ${route} on the LOCAL PREVIEW, which has no page behind it. The preview serves the built tree only — _redirects and Worker routes do not apply there, so this is a guaranteed 404.`,
      });
    }
  }
  return problems;
}

function trackedFiles() {
  try {
    return new Set(
      // Routed through lib/safe-spawn.mjs, which forces windowsHide on every
      // call — a direct child_process import pops a console window per spawn on
      // Windows and is refused by check-windows-hide.
      execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
        .split('\n').filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

function selfTest() {
  const consolidated = consolidatedRoutes({ redirects: [{ from: '/ranks/', to: '/leaderboards/#ranks' }] });
  const resolver = { tracked: new Set(['index.html', 'games/index.html']), exists: () => false };
  const cases = [
    ['a URL audit target is extracted',
      extractTargets('urls:\n  http://127.0.0.1:4173/games/\n', 'w.yml')[0].route === '/games/'],
    ['a local-preview target is marked local',
      extractTargets('http://127.0.0.1:4173/games/', 'w.yml')[0].local === true],
    ['a production target is not marked local',
      extractTargets('https://vaultsparkstudios.com/games/', 'w.yml')[0].local === false],
    ['a staging target is recognised as a site origin',
      extractTargets('https://website.staging.vaultsparkstudios.com/membership/', 'w.yml')[0].route === '/membership/'],
    // The warmup loop carried the same stranded route as the URL list. Reading
    // only URLs would have half-fixed the live defect and called it done.
    ['a bare shell warmup loop is read too',
      extractTargets('for u in / /games/ /ranks/ /contact/\n', 'w.yml').some((t) => t.route === '/ranks/')],
    ['a fragment is not part of the route',
      normalizeRoute('/leaderboards/#ranks') === '/leaderboards/'],
    ['a non-route string is ignored', normalizeRoute('leaderboards') === null],
    // Caught by this gate against itself on its first live run.
    ['a shell command separator is not part of the route',
      normalizeRoute('/news/2026-08-11/some-story/;') === '/news/2026-08-11/some-story/'],
    ['the last item of a warmup loop is read without its separator',
      extractTargets('for u in / /games/ /stats/; do\n', 'w.yml').some((t) => t.route === '/stats/')],
    // THE LIVE CASE.
    ['a consolidated route is refused as an audit target',
      evaluate([{ route: '/ranks/', local: true, file: 'lighthouse.yml' }], consolidated, resolver)[0].kind === 'consolidated'],
    ['the refusal names the replacement route',
      evaluate([{ route: '/ranks/', local: true, file: 'lighthouse.yml' }], consolidated, resolver)[0].detail.includes('/leaderboards/#ranks')],
    ['a consolidated route is refused on PRODUCTION too, not only the preview',
      evaluate([{ route: '/ranks/', local: false, file: 'accessibility.yml' }], consolidated, resolver).length === 1],
    ['a local target with no page behind it is refused',
      evaluate([{ route: '/nope/', local: true, file: 'lighthouse.yml' }], consolidated, resolver)[0].kind === 'missing-page'],
    // Production routes legitimately answer through the edge; only the preview
    // is page-only. Refusing them would make the gate lie about the edge.
    ['a production-only route is NOT judged by the built tree',
      evaluate([{ route: '/nope/', local: false, file: 'accessibility.yml' }], consolidated, resolver).length === 0],
    ['a real page passes', evaluate([{ route: '/games/', local: true, file: 'w.yml' }], consolidated, resolver).length === 0],
    ['the root route resolves to index.html', routeResolves('/', resolver) === true],
    ['an untracked but built page counts as resolved',
      routeResolves('/fresh/', { tracked: new Set(), exists: (p) => p === 'fresh/index.html' }) === true],
    ['a duplicate target is reported once',
      evaluate([{ route: '/ranks/', local: true, file: 'w.yml' }, { route: '/ranks/', local: true, file: 'w.yml' }], consolidated, resolver).length === 1],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`check-workflow-audit-targets --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`check-workflow-audit-targets --self-test: ${cases.length}/${cases.length} passed`);
}

function main() {
  if (SELF_TEST) return selfTest();
  const consolidated = consolidatedRoutes(JSON.parse(fs.readFileSync(CONSOLIDATION, 'utf8')));
  const targets = [];
  for (const file of fs.readdirSync(WORKFLOW_DIR).filter((f) => /\.ya?ml$/.test(f))) {
    targets.push(...extractTargets(fs.readFileSync(path.join(WORKFLOW_DIR, file), 'utf8'), `.github/workflows/${file}`));
  }
  // The tier config is an audit-target list in its own right: a tier for a
  // CONSOLIDATED route is the same stranding one layer down.
  if (fs.existsSync(TIERS)) {
    const tiers = JSON.parse(fs.readFileSync(TIERS, 'utf8'));
    for (const route of Object.keys(tiers.routes || {})) {
      const r = normalizeRoute(route);
      if (r) targets.push({ route: r, local: false, file: 'config/lighthouse-route-tiers.json' });
    }
  }
  const resolver = { tracked: trackedFiles(), exists: (rel) => fs.existsSync(path.join(ROOT, rel)) };
  const problems = evaluate(targets, consolidated, resolver);
  if (problems.length) {
    for (const p of problems) console.error(`✗ ${p.detail}`);
    console.error(`check-workflow-audit-targets: ${problems.length} stranded audit target(s)`);
    process.exit(1);
  }
  console.log(`check-workflow-audit-targets: ok (${new Set(targets.map((t) => t.route)).size} distinct route target(s), ${consolidated.size} consolidated route(s) guarded)`);
}

main();
