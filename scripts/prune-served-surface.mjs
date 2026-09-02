#!/usr/bin/env node
/**
 * Remove repo-internal paths from a deploy tree before it becomes the website.
 *
 * S300. `pages-deploy` builds its dist with `git archive HEAD | tar -x`, which
 * publishes the ENTIRE tracked tree. Verified live on production:
 *
 *   /.cache/ark-inbox.json          200
 *   /context/PROJECT_STATUS.json    200
 *   /logs/WORK_LOG.md               200
 *   /scripts/build-agents-json.mjs  200
 *   /prompts/start.md               200
 *
 * The repo is public, so none of this is secret — but the studio's operator
 * state, session ledgers, agent prompts and build scripts answering at the
 * product's own domain is not the website. It is noise to a visitor, crawl
 * surface to an agent, and `docs/` would publish every AUDIT_*.md with its
 * blocker detail. The content lane was already barred from widening this
 * (NOT_SERVED in check-content-lane-purity); this closes the underlying hole.
 *
 * THE SAFETY PROPERTY. A deny-list that silently removes a page someone links to
 * is a worse bug than the exposure it fixes. So this does not merely prune — it
 * PROVES it removed nothing reachable: every URL advertised by `sitemap.xml`,
 * `agents.json`, and the `.well-known` discovery corpus must still resolve in
 * the pruned tree, or the prune fails and deploys nothing.
 *
 * That property earned its keep immediately: `docs/` looks purely internal, but
 * `sitemap.xml` advertises `/docs/visual-proof/`. A bulk exclusion would have
 * 404'd a sitemap-listed page. The keep-list is derived from that check rather
 * than from anyone remembering.
 *
 * Usage:
 *   node scripts/prune-served-surface.mjs --dist /tmp/pages-dist
 *   node scripts/prune-served-surface.mjs --dist <dir> --dry-run
 *   node scripts/prune-served-surface.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = path.join(ROOT, 'config', 'served-surface.json');
const SERVED_MANIFEST = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

/** Git-tracked, but not the website. */
export const INTERNAL_PREFIXES = Object.freeze([
  '.cache/', '.claude/', '.codex/', '.github/', 'context/', 'logs/',
  'prompts/', 'scripts/', 'test/', 'tests/', 'docs/',
  // ImageGen masters are provenance/source material. Only the bounded,
  // overlaid AVIF/WebP/PNG derivatives under assets/og/news are public.
  'data/news-desk/art/',
]);

/**
 * Explicit survivors inside an internal prefix. Kept BECAUSE a discovery surface
 * advertises them — not because they look important. Anything added here without
 * a corresponding advertisement is dead weight the reachability check will not
 * defend.
 */
export const KEEP = Object.freeze([
  'docs/visual-proof/',   // advertised in sitemap.xml (CANON-053 evidence surface)
]);

export function isInternal(rel) {
  const p = String(rel).replace(/\\/g, '/').replace(/^\.\//, '');
  if (!p) return false;
  if (KEEP.some((k) => p === k.replace(/\/$/, '') || p.startsWith(k))) return false;
  return INTERNAL_PREFIXES.some((prefix) => p.startsWith(prefix));
}

/** Positive classification: absence from this manifest means not deployed. */
export function isServed(rel, manifest = SERVED_MANIFEST) {
  const p = String(rel).replace(/\\/g, '/').replace(/^\.\//, '');
  if (!p) return false;
  if ((manifest.excludedPrefixes || []).some((prefix) => p.startsWith(prefix))) return false;
  if ((manifest.exact || []).includes(p)) return true;
  if ((manifest.prefixes || []).some((prefix) => p.startsWith(prefix))) return true;
  return (manifest.keptInternalPrefixes || []).some((prefix) => p.startsWith(prefix));
}

/** Site-relative paths advertised by the discovery surfaces, as page routes. */
export function advertisedRoutes({ sitemap = '', agents = '', llms = '' }) {
  const routes = new Set();
  const push = (u) => {
    try {
      const p = u.startsWith('http') ? new URL(u).pathname : u;
      if (p && p.startsWith('/')) routes.add(p);
    } catch { /* not a URL — ignore */ }
  };
  for (const m of String(sitemap).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) push(m[1]);
  for (const m of String(agents).matchAll(/"(https:\/\/[^"]+)"/g)) push(m[1]);
  for (const m of String(llms).matchAll(/https:\/\/\S+/g)) push(m[0].replace(/[),.]+$/, ''));
  return [...routes];
}

/** A route resolves if its file, or its directory index, survived the prune. */
export function routeResolves(route, hasPath) {
  const clean = route.replace(/^\//, '').split('#')[0].split('?')[0];
  if (!clean) return hasPath('index.html');
  if (clean.endsWith('/')) return hasPath(`${clean}index.html`);
  return hasPath(clean) || hasPath(`${clean}/index.html`) || hasPath(`${clean}.html`);
}

export function planPrune(allPaths, advertised, { edgeRoutes = [] } = {}) {
  const kept = allPaths.filter((p) => isServed(p));
  const removed = allPaths.filter((p) => !isServed(p));
  const keptSet = new Set(kept.map((p) => String(p).replace(/\\/g, '/')));
  const hasPath = (p) => keptSet.has(p);
  const edgeSet = new Set(edgeRoutes.map((r) => String(r).split('#')[0].split('?')[0]));
  // The safety property: nothing advertised may have been pruned away. Routes
  // explicitly owned by the edge Worker are resolved there before Pages and
  // therefore must not be fabricated as static files merely to satisfy this gate.
  const broken = advertised.filter((r) => {
    const clean = String(r).split('#')[0].split('?')[0];
    return !edgeSet.has(clean) && !routeResolves(r, hasPath);
  });
  return { kept, removed, broken, ok: broken.length === 0 };
}

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, base, out);
    else out.push(path.relative(base, abs).replace(/\\/g, '/'));
  }
  return out;
}

function selfTest() {
  const cases = [
    ['operator cache is internal', isInternal('.cache/ark-inbox.json')],
    ['context state is internal', isInternal('context/PROJECT_STATUS.json')],
    ['logs are internal', isInternal('logs/WORK_LOG.md')],
    ['scripts are internal', isInternal('scripts/build-agents-json.mjs')],
    ['prompts are internal', isInternal('prompts/start.md')],
    ['audits are internal', isInternal('docs/AUDIT_2026-07-31.md')],
    ['workflows are internal', isInternal('.github/workflows/pages-deploy.yml')],
    ['News ImageGen source masters are internal', isInternal('data/news-desk/art/2026-08-11--example.png')],
    ['News public derivatives survive', !isInternal('assets/og/news/2026-08-11--example--meme.avif')],

    ['THE KEEP CASE: sitemap-advertised docs/visual-proof survives', !isInternal('docs/visual-proof/index.html')],
    ['the keep-list is prefix-exact, not substring', isInternal('docs/visual-proof-notes.md')],

    ['real pages are never internal', !isInternal('press/index.html')],
    ['api feeds are never internal', !isInternal('api/status.json')],
    ['assets are never internal', !isInternal('assets/style.css')],
    ['root files are never internal', !isInternal('index.html')],
    ['well-known is never internal', !isInternal('.well-known/llms.txt')],
    ['windows separators normalise', isInternal('context\\PROJECT_STATUS.json')],
    ['positive manifest serves the homepage', isServed('index.html')],
    ['positive manifest serves Ask Founders', isServed('ask-founders/index.html')],
    ['positive manifest serves public assets', isServed('assets/style.css')],
    ['positive manifest serves API feeds', isServed('api/status.json')],
    ['positive manifest serves discovery roots', isServed('.well-known/llms.txt')],
    ['positive manifest excludes source configuration', !isServed('config/served-surface.json')],
    ['positive manifest excludes Worker source', !isServed('cloudflare/worker-lib.mjs')],
    ['positive manifest excludes Supabase source', !isServed('supabase/functions/x.ts')],
    ['positive manifest excludes package metadata', !isServed('package.json')],
    ['positive manifest excludes News source masters', !isServed('data/news-desk/art/story.png')],
    ['positive manifest keeps hash-bound visual proof', isServed('docs/visual-proof/index.html')],

    // Reachability — the property that makes pruning safe.
    ['a clean prune passes', planPrune(['index.html', 'press/index.html', 'logs/WORK_LOG.md'], ['/', '/press/']).ok],
    ['a kept-but-advertised path still resolves after prune', planPrune(['index.html', 'docs/visual-proof/index.html'], ['/', '/docs/visual-proof/']).ok],
    ['an advertised route with NO surviving file is reported broken', (() => {
      const plan = planPrune(['index.html', 'context/secret-page.html'], ['/', '/context/secret-page.html']);
      return plan.ok === false && plan.broken.includes('/context/secret-page.html');
    })()],
    ['THE LIVE CATCH: removing a sitemap-listed page is refused', (() => {
      // Simulate the mistake this gate exists to prevent: docs/ excluded wholesale.
      const all = ['index.html', 'docs/visual-proof/index.html'];
      const naive = all.filter((p) => !p.startsWith('docs/'));
      const keptSet = new Set(naive);
      return !routeResolves('/docs/visual-proof/', (p) => keptSet.has(p));
    })()],
    ['directory routes resolve via index.html', routeResolves('/press/', (p) => p === 'press/index.html')],
    ['root route resolves', routeResolves('/', (p) => p === 'index.html')],
    ['extensionless routes resolve via .html', routeResolves('/about', (p) => p === 'about.html')],
    ['a file route resolves directly', routeResolves('/api/status.json', (p) => p === 'api/status.json')],
    ['an unresolvable route is reported', !routeResolves('/ghost/', () => false)],
    ['an explicitly Worker-owned route resolves without a static file', planPrune(['index.html'], ['/api/agent-actions/v1'], { edgeRoutes: ['/api/agent-actions/v1'] }).ok],
    ['an undeclared dynamic route remains broken', !planPrune(['index.html'], ['/api/unknown/v1'], { edgeRoutes: ['/api/agent-actions/v1'] }).ok],

    ['sitemap locs are extracted', advertisedRoutes({ sitemap: '<url><loc>https://x.test/press/</loc></url>' }).includes('/press/')],
    ['agents.json urls are extracted', advertisedRoutes({ agents: '{"url":"https://x.test/api/a.json"}' }).includes('/api/a.json')],
    ['llms.txt urls are extracted', advertisedRoutes({ llms: 'see https://x.test/ranks/ for more' }).includes('/ranks/')],
    ['non-urls are ignored', advertisedRoutes({ agents: '{"name":"not a url"}' }).length === 0],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`prune-served-surface --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`prune-served-surface --self-test: ${cases.length}/${cases.length} passed`);
}

/**
 * --check: run the REAL manifest against the REAL git-tracked tree, locally.
 *
 * S336. Until now this script only ever ran `--self-test` in build:check — pure
 * functions over synthetic fixtures — while the one invocation that uses the
 * real `config/served-surface.json` lived inside pages-deploy.yml. So the
 * manifest could drift from the pages that actually exist and nothing said so
 * until a deploy was already running.
 *
 * It drifted twice. `/evidence/` (S334) and `/how-we-build/` (S335) were both
 * added to the site, advertised in sitemap.xml, and never added to the manifest.
 * A prune therefore classified both as not-served, and REFUSED — which means no
 * deploy of any kind could succeed. Worse, the failure is delayed and
 * self-planting: the content lane promotes sitemap.xml, so the new route only
 * becomes *advertised in production* on one deploy and only breaks the NEXT one.
 *
 * This mode moves that discovery to the local gate, before the push. It asks the
 * one question the self-test cannot: does every route this repo advertises
 * survive its own prune?
 */
function check() {
  const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', windowsHide: true })
    .split('\n').map((s) => s.trim()).filter(Boolean);

  const read = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return ''; } };
  const advertised = advertisedRoutes({
    sitemap: read('sitemap.xml'),
    agents: read('agents.json'),
    llms: read('.well-known/llms.txt'),
  });

  // Deployable candidates only: internal prefixes are pruned by design and are
  // not what this gate is about.
  const candidates = tracked.filter((p) => !isInternal(p));
  const plan = planPrune(candidates, advertised, { edgeRoutes: SERVED_MANIFEST.edgeRoutes || [] });

  console.log(`prune-served-surface --check: ${candidates.length} tracked deployable file(s) · ${plan.kept.length} positively classified · ${advertised.length} advertised route(s)`);
  if (!plan.ok) {
    console.error(`prune-served-surface --check: ${plan.broken.length} advertised route(s) would NOT survive a prune:`);
    for (const r of plan.broken.slice(0, 20)) console.error(`  ✗ ${r}`);
    console.error('Add the owning prefix to config/served-surface.json (or an edgeRoutes entry if the Worker owns the route).');
    console.error('A route advertised in sitemap.xml/agents.json/llms.txt but absent from the served-surface manifest');
    console.error('is deleted by the deploy prune — the page 404s in production even though it exists in this repo.');
    process.exit(1);
  }
  console.log('prune-served-surface --check: ok — every advertised route survives its own prune');
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  if (process.argv.includes('--check')) return check();

  const distArg = process.argv.find((a) => a.startsWith('--dist'));
  const dist = distArg?.includes('=') ? distArg.split('=')[1] : process.argv[process.argv.indexOf('--dist') + 1];
  if (!dist || !fs.existsSync(dist)) {
    console.error('prune-served-surface: --dist <dir> is required and must exist');
    process.exit(2);
  }
  const dryRun = process.argv.includes('--dry-run');

  const read = (p) => { try { return fs.readFileSync(path.join(dist, p), 'utf8'); } catch { return ''; } };
  const advertised = advertisedRoutes({
    sitemap: read('sitemap.xml'),
    agents: read('agents.json'),
    llms: read('.well-known/llms.txt'),
  });

  const all = walk(dist);
  const plan = planPrune(all, advertised, { edgeRoutes: SERVED_MANIFEST.edgeRoutes || [] });

  console.log(`prune-served-surface: ${all.length} file(s) · ${plan.kept.length} positively classified · ${plan.removed.length} excluded · ${advertised.length} advertised route(s) checked`);
  if (!plan.ok) {
    console.error(`prune-served-surface: REFUSING — pruning would break ${plan.broken.length} advertised route(s):`);
    for (const r of plan.broken.slice(0, 10)) console.error(`  ✗ ${r}`);
    process.exit(1);
  }
  if (dryRun) {
    for (const p of plan.removed.slice(0, 15)) console.log(`  would remove: ${p}`);
    if (plan.removed.length > 15) console.log(`  would remove: +${plan.removed.length - 15} more`);
    return;
  }
  for (const rel of plan.removed) {
    try { fs.rmSync(path.join(dist, rel), { force: true }); } catch { /* already gone */ }
  }
  // Clean up directories the prune emptied, so no bare listings remain.
  const cleanEmpty = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) if (entry.isDirectory()) cleanEmpty(path.join(dir, entry.name));
    if (dir !== dist && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  };
  cleanEmpty(dist);
  console.log(`prune-served-surface: deployed ${plan.kept.length} positively classified path(s) · removed ${plan.removed.length} unclassified path(s) · all ${advertised.length} advertised route(s) still resolve`);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
