#!/usr/bin/env node
/** @verification-scope content-release
 * Conditional content preflight may exit before this gate; its --warn-only
 * build invocation cannot certify ordinary gate execution or success.
 */
/**
 * Can these specific files be promoted to production WITHOUT releasing the
 * fail-closed identity/Supabase promotion hold?
 *
 * S294 context. A `<base href>` typo had been serving the playable Franchise
 * Architect page as unstyled text. The fix landed in main and could not ship,
 * because `pages-deploy.yml` gates every production-mutating step on the full
 * promotion interlock — which is held on five credential-gated identity reasons
 * that have nothing to do with a static HTML attribute.
 *
 * The naive answer ("promote everything when the diff is content-only") is dead
 * code here: the backlog since the deployed SHA is 444 files and legitimately
 * touches `_headers`, `auth/`, `vault-member/`, `investor-portal/`, `sw.js`,
 * `login.html`, `cloudflare/` and `supabase/`. It would never fire.
 *
 * So this gate authorises a genuine HOTFIX instead: rebuild the tree that is
 * ALREADY deployed and overlay only an explicit, allowlisted set of content
 * files. Blast radius is exactly the listed files. Nothing in the identity
 * backlog is promoted, and nobody has to write "ready" into a hold file while
 * the underlying evidence is absent.
 *
 * FAIL-CLOSED BY CONSTRUCTION. A path is promotable only if it matches the
 * content allowlist. Anything unrecognised — a new extension, a new directory,
 * anything the author of this gate did not foresee — is BLOCKED, never allowed
 * through by default. That is the opposite of the S293 deploy-signal bug, where
 * an unknown state defaulted to healthy.
 *
 * Usage:
 *   node scripts/check-content-hotfix-gate.mjs --paths "a/index.html b/x.css"
 *   node scripts/check-content-hotfix-gate.mjs --paths "..." --emit-github-output
 *   node scripts/check-content-hotfix-gate.mjs --self-test
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'node:url';
import { isDiscoveryPath } from './lib/discovery-content.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Directories and files whose contents change AUTH, DATA, or EDGE behaviour.
 * A hotfix may never touch these, however innocent the diff looks.
 */
export const SENSITIVE = Object.freeze([
  'auth/', 'login.html', 'member/', 'members/', 'membership/', 'membership-value/',
  'vault-member/', 'vault-portal/', 'vault-treasury/', 'investor-portal/',
  'obelisk-passport/', 'cloudflare/', 'supabase/', 'config/', '.github/', '.well-known/',
  '_headers', '_redirects', 'sw.js', 'robots.txt', 'package.json', 'package-lock.json',
]);

/** Extensions that cannot execute in the browser or reconfigure the edge. */
export const INERT_ASSET_EXT = Object.freeze(['.css', '.webp', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.avif', '.woff', '.woff2']);

/**
 * S304: published data artifacts promotable by EXACT path. Each entry must be
 * named by a public anchor (servedPath / agents.json action) — inert data the
 * site itself instructs visitors and agents to fetch. `data/` as a directory
 * stays blocked.
 */
export const PUBLIC_DATA_ARTIFACTS = Object.freeze([
  'api/news-desk-claims.ndjson', // canonical public claim ledger named by /news/, agents.json, and llms-full.txt
  'data/staging-deploy-history.ndjson', // named by api/staging-deploy-continuity.json servedPath + the agents.json evidence.ledger.verify action
  'stats.json', // named by /stats/ and agents.json; generated, public-safe Analytica Feed v1
  // S373: three served ledgers that only a full promotion could carry, so every
  // content-lane release left them stale (measured in S372: byte-different from main
  // on the Pages origin). Each meets the rule above, and publicDataAnchorFindings()
  // re-proves the anchor on every self-test so an entry cannot outlive it.
  'data/promotion-history.ndjson', // named as `source` by the public feed api/worker-route-history.json
  'data/uptime-history.ndjson', // named as `source` by the public feed api/worker-route-history.json
  'data/stats-surface.json', // byte-identical twin of stats.json above; one generator writes both
]);

/**
 * Re-prove the public anchor behind the S373 allowlist entries against the tree.
 * `data/ignis-search-index.json` (read by browser JS, so coupled to the shipped
 * bundle) and the build-time maps deliberately stay on the full promotion gate.
 */
export function publicDataAnchorFindings(root = ROOT) {
  const findings = [];
  const read = (rel) => { try { return fs.readFileSync(path.join(root, rel)); } catch { return null; } };
  const routeHistory = read('api/worker-route-history.json');
  for (const ledger of ['data/promotion-history.ndjson', 'data/uptime-history.ndjson']) {
    if (!routeHistory || !routeHistory.toString('utf8').includes(`"source": "${ledger}"`)) {
      findings.push(`${ledger} is no longer named as a source by api/worker-route-history.json`);
    }
  }
  const stats = read('stats.json');
  const twin = read('data/stats-surface.json');
  if (!stats || !twin || !stats.equals(twin)) findings.push('data/stats-surface.json is no longer byte-identical to stats.json');
  return findings;
}

/**
 * Content-addressed shell bundles: `assets/<name>.shell-<hash>.js|css`.
 *
 * The one narrow exception to "nothing browser-executable". Learned the hard way
 * in the first real hotfix: the baseline tree referenced
 * `nav-sheet.shell-e821c7fa64.js` while HEAD's markup references
 * `nav-sheet.shell-d06b2465a0.js`. Overlaying the newer HTML onto the older asset
 * tree made that script 404 on the very pages being repaired — the fix shipped a
 * fresh defect alongside it.
 *
 * These are safe to overlay precisely BECAUSE they are hash-named: no existing
 * page references a hash that is not already in the tree, so adding one is purely
 * additive and cannot change the behaviour of any surface the hotfix is not
 * fixing. Un-hashed `.js` remains blocked — overwriting `assets/nav-sheet.js`
 * WOULD change behaviour sitewide.
 */
export const SHELL_ASSET_RE = /^assets\/[\w.-]+\.shell-[0-9a-f]{6,}\.(js|css)$/;

/** Asset references a browser will fetch, extracted from overlaid markup. */
export function extractAssetRefs(html) {
  const refs = new Set();
  for (const m of String(html).matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
    const raw = m[1].split('#')[0].split('?')[0].trim();
    if (!raw || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(raw)) continue;
    if (!/\.(js|mjs|css|woff2?|png|jpg|jpeg|webp|svg|ico|avif)$/i.test(raw)) continue;
    if (raw.startsWith('/')) refs.add(raw.slice(1));
  }
  return [...refs].sort();
}

const norm = (p) => String(p || '').trim().replaceAll('\\', '/').replace(/^\.\/+/, '').replace(/^\/+/, '');

export function isSensitive(p) {
  const t = norm(p);
  return SENSITIVE.some((s) => (s.endsWith('/') ? t.startsWith(s) : t === s));
}

/**
 * 'content'  — promotable in a hotfix
 * 'blocked'  — anything sensitive, executable, or simply unrecognised
 */
// Public article receipts are an exact corpus-derived exception, not a JSON directory allowance.
export function isPublishedDeskCritique(t, root = ROOT) {
  const match = /^news\/(\d{4}-\d{2}-\d{2})\/([a-z0-9]+(?:-[a-z0-9]+)*)\/critique\.json$/.exec(t);
  if (!match) return false;
  try {
    const [, date, slug] = match;
    const day = JSON.parse(fs.readFileSync(path.join(root, 'data/news-desk/days', date + '.json'), 'utf8'));
    if (day.simulated !== false || !day.stories?.some(story => story.slug === slug)) return false;
    const packet = JSON.parse(fs.readFileSync(path.join(root, t), 'utf8'));
    const article = fs.readFileSync(path.join(root, 'news', date, slug, 'index.html'));
    return packet.schemaVersion === 1 && packet.generatedBy === 'scripts/build-news-critique-packets.mjs'
      && packet.story?.url === 'https://vaultsparkstudios.com/news/' + date + '/' + slug + '/'
      && article.toString('utf8').includes('href="/' + t + '"')
      && packet.visualEvidence?.pageSha256 === crypto.createHash('sha256').update(article).digest('hex');
  } catch { return false; }
}

export function classifyPath(p) {
  const t = norm(p);
  if (!t || t.includes('..')) return 'blocked';
  // Exact-path discovery micro-lane. This is deliberately checked before the
  // broader sensitive prefixes: it does not permit arbitrary XML/TXT/JSON or
  // any other .well-known entry.
  if (isDiscoveryPath(t)) return 'content';
  if (isSensitive(t)) return 'blocked';
  const ext = path.posix.extname(t).toLowerCase();
  // Markup: allowed only outside the sensitive set (checked above).
  if (ext === '.html') return 'content';
  // Inert assets anywhere.
  if (INERT_ASSET_EXT.includes(ext)) return 'content';
  // Content-addressed shell bundles only — additive by construction.
  if (SHELL_ASSET_RE.test(t)) return 'content';
  // Generated public read-only JSON feeds. Exact-path exceptions for other
  // public data formats are declared separately below.
  if (/^api\/[\w.-]+\.json$/.test(t)) return 'content';
  // S304/S314: exact-path exceptions for published data artifacts that a public
  // anchor names by servedPath or canonical feed URL. Named files only — root
  // JSON and data/ as classes stay blocked because they may hold internal state.
  if (PUBLIC_DATA_ARTIFACTS.includes(t)) return 'content';
  if (isPublishedDeskCritique(t)) return 'content';
  // Everything else — .js, .mjs, .json elsewhere, extensionless, unknown — is blocked.
  return 'blocked';
}

/**
 * @param baselineHas  does a path exist in the tree ALREADY DEPLOYED? Supplied by
 *   the workflow via `git ls-tree <baseline>`. Omitted locally → reference
 *   resolution is skipped and said so, never silently assumed satisfied.
 */
export function gate(paths, {
  exists = (p) => fs.existsSync(path.join(ROOT, p)),
  read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8'),
  baselineHas = null,
} = {}) {
  const list = [...new Set((paths || []).map(norm).filter(Boolean))];
  const findings = [];
  if (!list.length) findings.push('no paths supplied — a hotfix must name exactly what it promotes');
  for (const p of list) {
    if (classifyPath(p) !== 'content') {
      findings.push(`${p}: not promotable in a content hotfix (sensitive, executable, or unrecognised type)`);
      continue;
    }
    if (!exists(p)) findings.push(`${p}: does not exist at HEAD`);
  }

  // Reference resolution: overlaid markup must not point at assets that will be
  // absent from the deployed tree. Skipping this is what shipped a 404 on the
  // first real hotfix.
  let referencesChecked = 0;
  if (baselineHas && !findings.length) {
    const overlaid = new Set(list);
    for (const p of list.filter((x) => x.endsWith('.html'))) {
      for (const ref of extractAssetRefs(read(p))) {
        referencesChecked += 1;
        if (overlaid.has(ref) || baselineHas(ref)) continue;
        findings.push(`${p} references ${ref}, which is in neither the deployed tree nor this hotfix — it would 404`);
      }
    }
  }

  return {
    allowed: findings.length === 0,
    paths: list,
    findings,
    referencesChecked,
    referenceCheckRan: Boolean(baselineHas),
  };
}

function critiqueMutationCases() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vss-critique-gate-'));
  const rel = 'news/2026-08-11/receipt-test/critique.json';
  const packetPath = path.join(root, rel), pagePath = path.join(root, path.dirname(rel), 'index.html');
  const dayPath = path.join(root, 'data/news-desk/days/2026-08-11.json');
  fs.mkdirSync(path.dirname(packetPath), { recursive: true });
  fs.mkdirSync(path.dirname(dayPath), { recursive: true });
  const article = '<a href="/' + rel + '">Public critique</a>';
  const day = { simulated: false, stories: [{ slug: 'receipt-test' }] };
  const packet = { schemaVersion: 1, generatedBy: 'scripts/build-news-critique-packets.mjs', story: { url: 'https://vaultsparkstudios.com/news/2026-08-11/receipt-test/' }, visualEvidence: { pageSha256: crypto.createHash('sha256').update(article).digest('hex') } };
  const write = (d = day, p = packet, a = article) => { fs.writeFileSync(dayPath, JSON.stringify(d)); fs.writeFileSync(packetPath, JSON.stringify(p)); fs.writeFileSync(pagePath, a); };
  const cases = [];
  try {
    write(); cases.push(['registered linked packet is allowed', isPublishedDeskCritique(rel, root)]);
    write(day, { ...packet, visualEvidence: { pageSha256: '0'.repeat(64) } }); cases.push(['stale packet hash blocks publication', !isPublishedDeskCritique(rel, root)]);
    write({ ...day, simulated: true }); cases.push(['simulated edition cannot promote its packet', !isPublishedDeskCritique(rel, root)]);
    write({ ...day, stories: [] }); cases.push(['unregistered story cannot promote its packet', !isPublishedDeskCritique(rel, root)]);
    write(day, packet, article + '<p>changed</p>'); cases.push(['changed article requires a fresh packet', !isPublishedDeskCritique(rel, root)]);
    write(day, { ...packet, story: { url: 'https://example.com/' } }); cases.push(['foreign packet URL blocks publication', !isPublishedDeskCritique(rel, root)]);
    write(day, { ...packet, generatedBy: 'unknown' }); cases.push(['unknown packet producer blocks publication', !isPublishedDeskCritique(rel, root)]);
    return cases;
  } finally {
    if (path.dirname(path.resolve(root)) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('vss-critique-gate-')) throw new Error('Fixture cleanup scope mismatch');
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function selfTest() {
  const exists = () => true;
  const g = (paths) => gate(paths, { exists });
  const fa = ['franchise-architect/index.html', 'franchise-architect/game.html', 'franchise-architect/404.html'];

  const cases = [
    ['the real S294 hotfix is allowed', g(fa).allowed === true && g(fa).paths.length === 3],
    ['an inert stylesheet is allowed', classifyPath('franchise-architect/styles.css') === 'content'],
    ['an image is allowed', classifyPath('assets/og/og-franchise-architect.png') === 'content'],
    ['a generated public feed is allowed', classifyPath('api/citation.json') === 'content'],
    ['the canonical Desk claims feed is allowed BY EXACT PATH', classifyPath('api/news-desk-claims.ndjson') === 'content'],
    ['the canonical public Stats feed is allowed BY EXACT PATH', classifyPath('stats.json') === 'content'],
    ['published Desk critique is allowed only with matching article evidence', classifyPath('news/2026-08-11/cloudflare-gave-the-agent-a-browser-and-a-chaperone/critique.json') === 'content'],
    ['other story JSON remains blocked', classifyPath('news/2026-08-11/cloudflare-gave-the-agent-a-browser-and-a-chaperone/private.json') === 'blocked'],
    ['unknown story critique remains blocked', classifyPath('news/2026-08-11/unpublished-private-story/critique.json') === 'blocked'],
    ['BROWSER-EXECUTABLE JS IS BLOCKED', classifyPath('assets/analytics.js') === 'blocked'],
    ['a module is blocked', classifyPath('franchise-architect/setup.js') === 'blocked'],
    ['the service worker is blocked', classifyPath('sw.js') === 'blocked'],
    ['edge headers are blocked', classifyPath('_headers') === 'blocked' && classifyPath('_redirects') === 'blocked'],
    ['auth markup is blocked despite being .html', classifyPath('auth/index.html') === 'blocked'],
    ['member markup is blocked', classifyPath('vault-member/index.html') === 'blocked'],
    ['investor markup is blocked', classifyPath('investor-portal/index.html') === 'blocked'],
    ['login is blocked', classifyPath('login.html') === 'blocked'],
    ['the Worker source is blocked', classifyPath('cloudflare/security-headers-worker.js') === 'blocked'],
    ['a migration is blocked', classifyPath('supabase/migrations/x.sql') === 'blocked'],
    ['CI config is blocked', classifyPath('.github/workflows/pages-deploy.yml') === 'blocked'],
    ['nested api json is blocked (only api/*.json)', classifyPath('api/leaderboard/v1/x.json') === 'blocked'],
    ['a non-api json is blocked', classifyPath('data/game-registry.json') === 'blocked'],
    ['an arbitrary root json remains blocked', classifyPath('private-stats.json') === 'blocked'],
    ['the anchored public ledger is allowed BY EXACT PATH', classifyPath('data/staging-deploy-history.ndjson') === 'content'],
    ['S373: the two route-history ledgers and the stats twin are allowed BY EXACT PATH', ['data/promotion-history.ndjson', 'data/uptime-history.ndjson', 'data/stats-surface.json'].every((p) => classifyPath(p) === 'content')],
    ['S373: their public anchors hold in this tree', (() => { const f = publicDataAnchorFindings(); for (const x of f) console.error(`    ${x}`); return f.length === 0; })()],
    ['S373: a missing anchor or a diverged twin is reported', (() => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vss-data-anchor-'));
      try {
        fs.mkdirSync(path.join(tmp, 'api')); fs.mkdirSync(path.join(tmp, 'data'));
        fs.writeFileSync(path.join(tmp, 'api', 'worker-route-history.json'), '{"a":{"source": "data/uptime-history.ndjson"}}');
        fs.writeFileSync(path.join(tmp, 'stats.json'), '{"v":1}'); fs.writeFileSync(path.join(tmp, 'data', 'stats-surface.json'), '{"v":2}');
        const f = publicDataAnchorFindings(tmp);
        return f.length === 2 && f.some((x) => x.startsWith('data/promotion-history.ndjson')) && f.some((x) => x.includes('byte-identical'));
      } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    })()],
    ['S373: browser-read and build-time data stay on the full gate', ['data/ignis-search-index.json', 'data/lqip-map.json', 'data/perf-history.ndjson'].every((p) => classifyPath(p) === 'blocked')],
    ['the four discovery roots are allowed BY EXACT PATH', ['sitemap.xml','robots.txt','agents.json','.well-known/llms.txt'].every((p) => classifyPath(p) === 'content')],
    ['other discovery-shaped paths remain blocked', classifyPath('other.xml') === 'blocked' && classifyPath('.well-known/other.txt') === 'blocked'],
    ['other ndjson stays blocked', classifyPath('api/private.ndjson') === 'blocked' && classifyPath('data/rum-history.ndjson') === 'blocked' && classifyPath('data/staging-deploy-history2.ndjson') === 'blocked'],
    ['UNRECOGNISED TYPES FAIL CLOSED', classifyPath('weird/thing.wasm') === 'blocked' && classifyPath('Makefile') === 'blocked'],
    ['path traversal is blocked', classifyPath('../etc/passwd') === 'blocked' && classifyPath('a/../../b.html') === 'blocked'],
    ['a leading slash is normalised, not exploited', classifyPath('/franchise-architect/index.html') === 'content'],
    ['an empty set is refused', g([]).allowed === false],
    ['one bad path fails the whole set', g([...fa, 'sw.js']).allowed === false],
    ['a missing file at HEAD is refused', gate(fa, { exists: () => false }).allowed === false],
    ['duplicates collapse', g([fa[0], fa[0]]).paths.length === 1],
    ['findings name the offending path', g([...fa, 'auth/index.html']).findings.some((f) => f.startsWith('auth/index.html'))],
    // Shell bundles: the narrow content-addressed exception.
    ['a hash-named shell bundle is allowed', classifyPath('assets/nav-sheet.shell-d06b2465a0.js') === 'content'],
    ['a hash-named shell stylesheet is allowed', classifyPath('assets/style.shell-0bcf6496a0.css') === 'content'],
    ['UN-HASHED js of the same name stays blocked', classifyPath('assets/nav-sheet.js') === 'blocked'],
    ['a fake short hash is blocked', classifyPath('assets/x.shell-ab.js') === 'blocked'],
    ['a shell path outside assets/ is blocked', classifyPath('evil/x.shell-d06b2465a0.js') === 'blocked'],
    // Reference resolution — THE LIVE S294 HOTFIX DEFECT.
    ['asset refs are extracted from markup', extractAssetRefs('<script src="/assets/nav-sheet.shell-d06b2465a0.js"></script>')[0] === 'assets/nav-sheet.shell-d06b2465a0.js'],
    ['cross-origin and relative refs are ignored', extractAssetRefs('<script src="https://cdn/x.js"></script><link href="./styles.css">').length === 0],
    ['THE LIVE DEFECT: markup referencing an absent shell is blocked', (() => {
      const r = gate(['franchise-architect/index.html'], {
        exists: () => true,
        read: () => '<script src="/assets/nav-sheet.shell-NEW.js"></script>',
        baselineHas: (p) => p === 'assets/nav-sheet.shell-OLD.js',
      });
      return r.allowed === false && r.findings.some((f) => f.includes('would 404'));
    })()],
    ['including the missing shell in the hotfix satisfies it', (() => {
      const r = gate(['franchise-architect/index.html', 'assets/nav-sheet.shell-d06b2465a0.js'], {
        exists: () => true,
        read: (p) => (p.endsWith('.html') ? '<script src="/assets/nav-sheet.shell-d06b2465a0.js"></script>' : ''),
        baselineHas: () => false,
      });
      return r.allowed === true && r.referencesChecked === 1;
    })()],
    ['an asset already in the deployed tree satisfies it', gate(['a.html'], { exists: () => true, read: () => '<link href="/assets/old.css">', baselineHas: (p) => p === 'assets/old.css' }).allowed === true],
    ['reference check reports when it did NOT run', gate(['a.html'], { exists: () => true, read: () => '' }).referenceCheckRan === false],
  ];
  cases.push(...critiqueMutationCases());
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`check-content-hotfix-gate --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`check-content-hotfix-gate --self-test: ${cases.length}/${cases.length} passed`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  // --paths-file=<file> (one path per line, or space-separated): large releases
  // exceed the Windows ~32K command-line limit as a --paths argument (S368).
  const fileArg = process.argv.find((a) => a.startsWith('--paths-file='));
  const arg = process.argv.find((a) => a.startsWith('--paths='))
    || (process.argv.includes('--paths') ? `--paths=${process.argv[process.argv.indexOf('--paths') + 1] || ''}` : '');
  const raw = fileArg
    ? fs.readFileSync(fileArg.slice('--paths-file='.length), 'utf8').split(/\s+/).filter(Boolean).join(' ')
    : arg.slice('--paths='.length);
  const baselineArg = process.argv.find((a) => a.startsWith('--baseline='));
  let baselineHas = null;
  if (baselineArg) {
    const sha = baselineArg.slice('--baseline='.length);
    const listed = new Set(
      execFileSync('git', ['ls-tree', '-r', '--name-only', sha], { cwd: ROOT, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 })
        .split('\n').map((l) => l.trim()).filter(Boolean),
    );
    baselineHas = (p) => listed.has(p);
  }
  const result = gate(raw.split(/[\s,]+/), baselineHas ? { baselineHas } : {});
  const emit = process.argv.includes('--emit-github-output');

  if (emit && process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `allowed=${result.allowed}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `paths=${result.paths.join(' ')}\n`);
  }

  if (!result.allowed) {
    console.error('check-content-hotfix-gate: NOT promotable as a content hotfix:');
    for (const f of result.findings) console.error(`  ✗ ${f}`);
    console.error('  a hotfix may only carry markup outside auth surfaces, inert assets, generated api/*.json feeds, and exact-path public data artifacts.');
    console.error('  anything executable, edge-configuring, or unrecognised requires the full promotion gate.');
    if (emit) return; // let the workflow read allowed=false rather than failing the job
    process.exit(1);
  }
  console.log(`check-content-hotfix-gate: ${result.paths.length} path(s) promotable as a content hotfix`);
  for (const p of result.paths) console.log(`  · ${p}`);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
