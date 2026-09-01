#!/usr/bin/env node
/**
 * check-site-integrity.mjs — S334.
 *
 * Four structural courts over the SHIPPED route surface, in one entry.
 *
 * They are one script on purpose. `build:check` is executed by
 * run-build-check.mjs from the `build:check:steps` list, but that list is still
 * read as a single string and the studio has been bitten before by growing it
 * segment-by-segment (S192: the chain overflowed the Windows cmd.exe 8191-char
 * limit and `npm run build:check` died before any check ran, while CI on bash
 * stayed green — a silent local-only foot-gun). The standing rule from that
 * incident: two or more new checks on the same surface become ONE orchestrator
 * with ONE entry.
 *
 * The courts:
 *
 *   1. redirects-resolve   Every _redirects destination must be reachable.
 *                          S334 found `/solara/* -> /games/solara/:splat` and
 *                          `/franchise-architect/* -> /games/...:splat` sending
 *                          four real pages — and two whole app trees — into
 *                          404s, because a splat is only safe when a counterpart
 *                          exists under the destination. Nothing checked that.
 *
 *   2. robots-vs-gate      Every path robots.txt Disallows for the `*` group must
 *                          be genuinely gated at the edge or explicitly declared
 *                          public-but-unindexed. S334 found /ignis-health/ —
 *                          titled "(internal)", publishing the ask-ignis contract
 *                          — protected by robots.txt alone, which is a request to
 *                          polite crawlers, not access control.
 *
 *   3. no-meta-refresh     Retired routes resolve at the edge via _redirects, not
 *                          via a meta-refresh page that paints first. Two
 *                          implementations of one behaviour can silently disagree.
 *
 *   4. inline-css-budget   Inline critical CSS stays inside the first congestion
 *                          window. The homepage was shipping 66KB inline —
 *                          uncacheable, parser-blocking, ~5x the target.
 *
 * Import-safe: importing this module runs nothing. Enumerates git-tracked files,
 * never the filesystem, so untracked scratch never fails a gate and a file that
 * is on disk but unstaged never silently passes one.
 *
 * Usage:
 *   node scripts/check-site-integrity.mjs             # run all four courts
 *   node scripts/check-site-integrity.mjs --self-test # prove the courts detect
 *   node scripts/check-site-integrity.mjs --json
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/**
 * Paths robots.txt keeps out of the index that are NOT access-controlled, with
 * the reason each is safe to serve to anyone who has the URL. Anything Disallowed
 * and not gated must appear here — the point of the court is that the decision is
 * written down rather than defaulted into.
 */
export const INTENTIONALLY_PUBLIC_UNINDEXED = new Map([
  ['/.claude/', 'agent configuration; public-safe by the repo boundary and not worth indexing'],
  ['/.well-known/', 'the four citable AI-discovery files above this line are longest-match Allowed; the blanket Disallow only keeps the rest of the directory out of the index. Nothing behind it is secret, so an edge gate would break agent discovery for no security gain.'],
]);

/** Inline <style> byte ceiling per document. ~14KB is the first congestion window; 20KB allows real-world shell tokens without inviting a slab. */
export const INLINE_CSS_BUDGET_BYTES = 20480;

/* ── helpers ───────────────────────────────────────────────────────────── */

export function trackedFiles(root = ROOT, pattern = null) {
  const args = ['ls-files'];
  if (pattern) args.push(pattern);
  const out = execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

/**
 * Parse _redirects into {from, to, status}. Comments and blank lines are skipped.
 * Cloudflare's format is whitespace-separated: FROM TO [STATUS].
 */
export function parseRedirects(text) {
  const rules = [];
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    rules.push({ from: parts[0], to: parts[1], status: parts[2] || '302' });
  }
  return rules;
}

/**
 * Does a site-absolute path resolve to something the deploy will actually serve?
 *
 * A trailing-slash path resolves via its index.html; an explicit file resolves
 * directly. A fragment is stripped first — `/leaderboards/#ranks` is reachable
 * exactly when `/leaderboards/` is. External URLs are out of scope: this court
 * proves internal reachability, and claiming to verify a third-party host would
 * be asserting something it cannot observe offline.
 */
export function resolvesInTree(to, has) {
  const path = String(to).split('#')[0].split('?')[0];
  if (!path.startsWith('/')) return true; // external or relative — out of scope
  const rel = path.replace(/^\//, '');
  if (rel === '' ) return has('index.html');
  if (rel.endsWith('/')) return has(rel + 'index.html');
  if (has(rel)) return true;
  // An extensionless URL is served from either a directory index or a sibling
  // .html file (/login -> login.html). Checking only the directory form reported
  // live destinations as dead.
  return has(rel + '/index.html') || has(rel + '.html');
}

/* ── court 1: every redirect destination resolves ──────────────────────── */

export function courtRedirectsResolve(redirectsText, trackedSet) {
  const has = (p) => trackedSet.has(p);
  const failures = [];
  for (const rule of parseRedirects(redirectsText)) {
    // A splat destination is only meaningful if SOMETHING exists beneath it.
    // `/a/* -> /b/:splat` promises that every sub-path of /a/ has a twin under
    // /b/. We cannot enumerate the infinite set, so we check the honest proxy:
    // does the destination prefix contain any tracked file at all?
    if (rule.to.includes(':splat')) {
      const prefix = rule.to.split(':splat')[0].replace(/^\//, '');
      const anyUnder = [...trackedSet].some((f) => f.startsWith(prefix));
      if (!anyUnder) {
        failures.push({ court: 'redirects-resolve', rule: `${rule.from} -> ${rule.to}`, reason: `splat destination prefix "/${prefix}" contains no tracked file — every sub-path would 301 into a 404` });
      }
      // A splat over a source prefix that still holds tracked files it does not
      // mirror is the exact S334 defect: real content swallowed by the wildcard.
      const srcPrefix = rule.from.split('*')[0].replace(/^\//, '');
      if (srcPrefix) {
        const stranded = [...trackedSet].filter(
          (f) => f.startsWith(srcPrefix) && !trackedSet.has(prefix + f.slice(srcPrefix.length))
        );
        if (stranded.length) {
          failures.push({ court: 'redirects-resolve', rule: `${rule.from} -> ${rule.to}`, reason: `${stranded.length} tracked file(s) under "/${srcPrefix}" have no counterpart under "/${prefix}" and would 301 into a 404 (e.g. ${stranded.slice(0, 3).join(', ')})` });
        }
      }
      continue;
    }
    if (!resolvesInTree(rule.to, has)) {
      failures.push({ court: 'redirects-resolve', rule: `${rule.from} -> ${rule.to}`, reason: 'destination does not resolve to a tracked file' });
    }
  }
  return failures;
}

/* ── court 2: robots Disallow implies an edge gate ─────────────────────── */

/** Extract the Disallow paths belonging to the `User-agent: *` group only. */
export function disallowedForWildcard(robotsText) {
  const out = [];
  let inWildcard = false;
  for (const raw of String(robotsText).split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const ua = /^user-agent:\s*(.+)$/i.exec(line);
    if (ua) { inWildcard = ua[1].trim() === '*'; continue; }
    if (!inWildcard) continue;
    const dis = /^disallow:\s*(.+)$/i.exec(line);
    if (dis && dis[1].trim()) out.push(dis[1].trim());
  }
  return out;
}

/** Read the literal GATED_PATH_PATTERNS array out of the worker source. */
export function gatedPatternsFrom(workerSource) {
  const block = /const GATED_PATH_PATTERNS = \[([\s\S]*?)\];/.exec(String(workerSource));
  if (!block) return null;
  // A literal like /^\/vault-member\/admin(\/|$)/i contains ESCAPED slashes, so
  // a naive [^/]+ body stops at the first one and every pattern reads as
  // "/^\\" — which matches nothing and would silently pass every path. Consume
  // escape pairs explicitly so the body runs to the real closing delimiter.
  return [...block[1].matchAll(/\/\^((?:\\.|[^/\\])+)\/[a-z]*/g)].map((m) => m[1]);
}

export function courtRobotsVsGate(robotsText, workerSource) {
  const failures = [];
  const patterns = gatedPatternsFrom(workerSource);
  if (patterns === null) {
    return [{ court: 'robots-vs-gate', rule: 'GATED_PATH_PATTERNS', reason: 'could not locate GATED_PATH_PATTERNS in the worker source — the court cannot verify what it cannot read' }];
  }
  for (const path of disallowedForWildcard(robotsText)) {
    if (INTENTIONALLY_PUBLIC_UNINDEXED.has(path)) continue;
    // The worker patterns are written as /^\/segment(\/|$)/i. Compare on the
    // first path segment, which is what the pattern actually anchors on.
    const seg = path.replace(/^\//, '').split('/')[0];
    if (!seg) continue;
    const gated = patterns.some((p) => p.replace(/\\/g, '').includes(seg));
    if (!gated) {
      failures.push({ court: 'robots-vs-gate', rule: path, reason: `robots.txt Disallows it for every crawler but the edge does not gate it — robots.txt is a request to polite crawlers, not access control. Gate it, or declare it in INTENTIONALLY_PUBLIC_UNINDEXED with a reason.` });
    }
  }
  return failures;
}

/* ── court 3: no meta-refresh redirect pages ───────────────────────────── */

export function courtNoMetaRefresh(files, readFile) {
  const failures = [];
  for (const f of files) {
    if (!f.endsWith('.html')) continue;
    const body = readFile(f);
    if (body === null) continue;
    if (/http-equiv\s*=\s*["']?refresh/i.test(body)) {
      failures.push({ court: 'no-meta-refresh', rule: f, reason: 'retired routes resolve at the edge via _redirects; a meta-refresh page paints first and is worse for assistive tech. Two redirect implementations can silently disagree.' });
    }
  }
  return failures;
}

/* ── court 4: inline critical CSS budget ───────────────────────────────── */

export function inlineStyleBytes(html) {
  let total = 0;
  for (const m of String(html).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) total += Buffer.byteLength(m[1], 'utf8');
  return total;
}

export function courtInlineCssBudget(files, readFile, budget = INLINE_CSS_BUDGET_BYTES) {
  const failures = [];
  for (const f of files) {
    if (!f.endsWith('.html')) continue;
    const body = readFile(f);
    if (body === null) continue;
    const bytes = inlineStyleBytes(body);
    if (bytes > budget) {
      failures.push({ court: 'inline-css-budget', rule: f, reason: `${bytes} bytes of inline <style> exceeds the ${budget}-byte budget — inline critical CSS is re-sent on every navigation because it cannot be cached separately, and it blocks the parser before first paint` });
    }
  }
  return failures;
}

/* ── self-test ─────────────────────────────────────────────────────────── */

export function selfTest() {
  const results = [];
  const t = (name, pass) => results.push({ name, pass });

  // court 1
  const tracked = new Set(['games/solara/index.html', 'solara/assets/app.js', 'sitemap-page/index.html', 'leaderboards/index.html']);
  t('splat stranding real files is caught',
    courtRedirectsResolve('/solara/* /games/solara/:splat 301', tracked).some((f) => /no counterpart/.test(f.reason)));
  t('splat into an empty destination is caught',
    courtRedirectsResolve('/x/* /nowhere/:splat 301', tracked).some((f) => /no tracked file/.test(f.reason)));
  t('a destination that resolves passes',
    courtRedirectsResolve('/old/ /sitemap-page/ 301', tracked).length === 0);
  t('a missing destination is caught',
    courtRedirectsResolve('/old/ /gone/ 301', tracked).length === 1);
  t('an anchor destination resolves through its page',
    courtRedirectsResolve('/ranks /leaderboards/#ranks 301', tracked).length === 0);
  t('an external destination is out of scope, not a failure',
    courtRedirectsResolve('/x https://example.com/ 301', tracked).length === 0);

  // court 2
  const robots = 'User-agent: Googlebot\nDisallow: /secret-a/\n\nUser-agent: *\nDisallow: /gated-one/\nDisallow: /ungated-two/\n';
  const worker = 'const GATED_PATH_PATTERNS = [\n  /^\\/gated-one(\\/|$)/i,\n];';
  const c2 = courtRobotsVsGate(robots, worker);
  t('an ungated Disallow is caught', c2.some((f) => f.rule === '/ungated-two/'));
  t('a gated Disallow passes', !c2.some((f) => f.rule === '/gated-one/'));
  t('a non-wildcard group is not read as policy', !c2.some((f) => f.rule === '/secret-a/'));
  t('an unreadable worker fails loudly rather than passing silently',
    courtRobotsVsGate(robots, 'no patterns here').length === 1);

  // court 3
  t('a meta-refresh stub is caught',
    courtNoMetaRefresh(['a.html'], () => '<meta http-equiv="refresh" content="0;url=/x/">').length === 1);
  t('an ordinary page passes',
    courtNoMetaRefresh(['a.html'], () => '<p>hello</p>').length === 0);

  // court 4
  t('an over-budget inline style is caught',
    courtInlineCssBudget(['a.html'], () => `<style>${'x'.repeat(30000)}</style>`).length === 1);
  t('two blocks are summed, not judged separately',
    courtInlineCssBudget(['a.html'], () => `<style>${'x'.repeat(15000)}</style><style>${'y'.repeat(15000)}</style>`).length === 1);
  t('an under-budget page passes',
    courtInlineCssBudget(['a.html'], () => '<style>body{color:red}</style>').length === 0);

  const failed = results.filter((r) => !r.pass);
  for (const r of results) console.log(`  ${r.pass ? '✓' : '⛔'} ${r.name}`);
  console.log(`[check-site-integrity] self-test ${results.length - failed.length}/${results.length}`);
  return failed.length === 0;
}

/* ── live run ──────────────────────────────────────────────────────────── */

export function run(root = ROOT) {
  const files = trackedFiles(root);
  const set = new Set(files);
  const read = (f) => {
    const p = resolve(root, f);
    if (!existsSync(p)) return null;
    try { return readFileSync(p, 'utf8'); } catch { return null; }
  };
  const html = files.filter((f) => f.endsWith('.html') && !f.startsWith('docs/') && !f.startsWith('lighthouse-results/'));

  const failures = [
    ...courtRedirectsResolve(read('_redirects') || '', set),
    ...courtRobotsVsGate(read('robots.txt') || '', read('cloudflare/security-headers-worker.js') || ''),
    ...courtNoMetaRefresh(html, read),
    ...courtInlineCssBudget(html, read),
  ];
  return { checked: { redirects: parseRedirects(read('_redirects') || '').length, html: html.length }, failures };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  if (process.argv.includes('--self-test')) {
    process.exit(selfTest() ? 0 : 1);
  }
  const result = run();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const f of result.failures) console.error(`⛔ [${f.court}] ${f.rule}\n   ${f.reason}`);
    console.log(`[check-site-integrity] ${result.checked.redirects} redirect rule(s), ${result.checked.html} page(s) — ${result.failures.length} failure(s)`);
  }
  process.exit(result.failures.length ? 1 : 0);
}
