#!/usr/bin/env node
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
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Directories and files whose contents change AUTH, DATA, or EDGE behaviour.
 * A hotfix may never touch these, however innocent the diff looks.
 */
export const SENSITIVE = Object.freeze([
  'auth/', 'login.html', 'member/', 'members/', 'membership/', 'membership-value/',
  'vault-member/', 'vault-portal/', 'vault-treasury/', 'vault-wall/', 'investor-portal/',
  'obelisk-passport/', 'cloudflare/', 'supabase/', 'config/', '.github/', '.well-known/',
  '_headers', '_redirects', 'sw.js', 'robots.txt', 'package.json', 'package-lock.json',
]);

/** Extensions that cannot execute in the browser or reconfigure the edge. */
export const INERT_ASSET_EXT = Object.freeze(['.css', '.webp', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.avif', '.woff', '.woff2']);

const norm = (p) => String(p || '').trim().replaceAll('\\', '/').replace(/^\.\/+/, '').replace(/^\/+/, '');

export function isSensitive(p) {
  const t = norm(p);
  return SENSITIVE.some((s) => (s.endsWith('/') ? t.startsWith(s) : t === s));
}

/**
 * 'content'  — promotable in a hotfix
 * 'blocked'  — anything sensitive, executable, or simply unrecognised
 */
export function classifyPath(p) {
  const t = norm(p);
  if (!t || t.includes('..')) return 'blocked';
  if (isSensitive(t)) return 'blocked';
  const ext = path.posix.extname(t).toLowerCase();
  // Markup: allowed only outside the sensitive set (checked above).
  if (ext === '.html') return 'content';
  // Inert assets anywhere.
  if (INERT_ASSET_EXT.includes(ext)) return 'content';
  // Generated public read-only feeds. api/*.json only — never nested, never other types.
  if (/^api\/[\w.-]+\.json$/.test(t)) return 'content';
  // Everything else — .js, .mjs, .json elsewhere, extensionless, unknown — is blocked.
  return 'blocked';
}

export function gate(paths, { exists = (p) => fs.existsSync(path.join(ROOT, p)) } = {}) {
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
  return { allowed: findings.length === 0, paths: list, findings };
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
    ['UNRECOGNISED TYPES FAIL CLOSED', classifyPath('weird/thing.wasm') === 'blocked' && classifyPath('Makefile') === 'blocked'],
    ['path traversal is blocked', classifyPath('../etc/passwd') === 'blocked' && classifyPath('a/../../b.html') === 'blocked'],
    ['a leading slash is normalised, not exploited', classifyPath('/franchise-architect/index.html') === 'content'],
    ['an empty set is refused', g([]).allowed === false],
    ['one bad path fails the whole set', g([...fa, 'sw.js']).allowed === false],
    ['a missing file at HEAD is refused', gate(fa, { exists: () => false }).allowed === false],
    ['duplicates collapse', g([fa[0], fa[0]]).paths.length === 1],
    ['findings name the offending path', g([...fa, 'auth/index.html']).findings.some((f) => f.startsWith('auth/index.html'))],
  ];
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
  const arg = process.argv.find((a) => a.startsWith('--paths='))
    || (process.argv.includes('--paths') ? `--paths=${process.argv[process.argv.indexOf('--paths') + 1] || ''}` : '');
  const raw = arg.slice('--paths='.length);
  const result = gate(raw.split(/[\s,]+/));
  const emit = process.argv.includes('--emit-github-output');

  if (emit && process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `allowed=${result.allowed}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `paths=${result.paths.join(' ')}\n`);
  }

  if (!result.allowed) {
    console.error('check-content-hotfix-gate: NOT promotable as a content hotfix:');
    for (const f of result.findings) console.error(`  ✗ ${f}`);
    console.error('  a hotfix may only carry markup outside auth surfaces, inert assets, and api/*.json feeds.');
    console.error('  anything executable, edge-configuring, or unrecognised requires the full promotion gate.');
    if (emit) return; // let the workflow read allowed=false rather than failing the job
    process.exit(1);
  }
  console.log(`check-content-hotfix-gate: ${result.paths.length} path(s) promotable as a content hotfix`);
  for (const p of result.paths) console.log(`  · ${p}`);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
