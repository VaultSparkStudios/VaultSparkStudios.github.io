#!/usr/bin/env node
/**
 * Is this promotion candidate PURELY static content — nothing that could move
 * auth, data, or edge behaviour?
 *
 * S300 context. `pages-deploy.yml` gated ALL production promotion behind one
 * interlock whose hold reasons are entirely identity-shaped: Supabase migration
 * pending, Edge Function pending, real-provider E2E pending, control-plane
 * partial. Markup, stylesheets and public JSON feeds have a blast radius
 * disjoint from Supabase auth, yet they were frozen behind the same gate —
 * production served a 2026-07-26 build for six days and 391 commits.
 *
 * The existing escape hatch (S294 `confirm_hotfix`) is a per-invocation, hand-
 * scoped overlay: the operator names the files, and the gate re-derives blast
 * radius from that list every time. It shipped a 404 on its first real use.
 * A hand-scoped hatch is the right tool for one emergency file and the wrong
 * tool for a standing release cadence.
 *
 * This gate is the standing alternative: it does not ask which files someone
 * WANTS to promote, it asks whether the candidate range contains anything that
 * disqualifies the whole lane. The content lane is safe not because we assert
 * it is content-only, but because promotion fails closed unless that is PROVEN
 * over the actual diff.
 *
 * FAIL-CLOSED BY CONSTRUCTION
 *   · Any path under a sensitive prefix       → BLOCKED
 *   · Any browser-executable that is not a    → BLOCKED
 *     content-addressed shell bundle
 *   · Any extension not on the inert list     → BLOCKED (unknown ≠ safe)
 *   · Empty diff / unresolvable range         → BLOCKED (absence ≠ purity)
 *
 * Reuses SENSITIVE / INERT_ASSET_EXT / SHELL_ASSET_RE from the hotfix gate ON
 * PURPOSE: two independently-maintained definitions of "safe to ship without
 * releasing the identity hold" would inevitably drift, and the drift would be
 * discovered in production.
 *
 * Enumerates GIT-TRACKED paths only (`git diff --name-only`), never a filesystem
 * walk — a walk judges files CI cannot see and diverges local from CI.
 *
 * Usage:
 *   node scripts/check-content-lane-purity.mjs --range <baseSha>..HEAD
 *   node scripts/check-content-lane-purity.mjs --range ... --emit-github-output
 *   node scripts/check-content-lane-purity.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SENSITIVE, INERT_ASSET_EXT, SHELL_ASSET_RE } from './check-content-hotfix-gate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Markup and public data the content lane exists to ship. */
export const CONTENT_EXT = Object.freeze(['.html', '.json', '.txt', '.xml', '.md']);

/**
 * Paths that are content by extension but must still never ride the content
 * lane, because a browser or crawler treats them as configuration rather than
 * as page content. `_headers`/`_redirects`/`robots.txt` are already in
 * SENSITIVE; these are the extension-shaped rest.
 */
export const CONFIG_LIKE = Object.freeze(['manifest.json', 'sw.js', 'service-worker.js']);

export function classifyPath(p) {
  const rel = String(p).replace(/\\/g, '/').replace(/^\.\//, '');
  if (!rel) return { path: rel, ok: false, reason: 'empty path' };

  for (const prefix of SENSITIVE) {
    // Directory prefixes end in '/'; bare filenames must match exactly, so a
    // file merely CONTAINING a sensitive name is not swept up by accident.
    const hit = prefix.endsWith('/') ? rel.startsWith(prefix) : rel === prefix || rel.endsWith(`/${prefix}`);
    if (hit) return { path: rel, ok: false, reason: `sensitive path (${prefix})` };
  }

  const base = rel.split('/').pop();
  if (CONFIG_LIKE.includes(base)) return { path: rel, ok: false, reason: `edge/runtime config (${base})` };

  const ext = rel.includes('.') ? rel.slice(rel.lastIndexOf('.')).toLowerCase() : '';

  // Content-addressed shell bundles are purely additive: no existing page can
  // reference a hash that is not already in the tree.
  if (SHELL_ASSET_RE.test(rel)) return { path: rel, ok: true, reason: 'content-addressed shell bundle' };

  // Un-hashed executables change behaviour sitewide — never on this lane.
  if (['.js', '.mjs', '.cjs', '.ts', '.wasm'].includes(ext)) {
    return { path: rel, ok: false, reason: `browser-executable without a content hash (${ext})` };
  }

  if (CONTENT_EXT.includes(ext)) return { path: rel, ok: true, reason: 'content' };
  if (INERT_ASSET_EXT.includes(ext)) return { path: rel, ok: true, reason: 'inert asset' };

  // Unknown is BLOCKED, never allowed by default. The inverse of the S293 bug.
  return { path: rel, ok: false, reason: ext ? `unrecognised extension (${ext})` : 'no extension' };
}

export function evaluate(changedPaths) {
  const paths = (changedPaths || []).map((p) => String(p).trim()).filter(Boolean);
  if (!paths.length) {
    // An empty candidate is not a pure candidate: it means the range was
    // unresolvable or nothing changed, and neither authorises a deploy.
    return { pure: false, checked: 0, blockers: [], promotable: [], detail: 'no changed paths resolved — refusing to certify purity from an empty diff' };
  }
  const classified = paths.map(classifyPath);
  const blockers = classified.filter((c) => !c.ok);
  return {
    pure: blockers.length === 0,
    checked: classified.length,
    blockers,
    promotable: classified.filter((c) => c.ok).map((c) => c.path),
    detail: blockers.length === 0
      ? `${classified.length} changed path(s) are all static content`
      : `${blockers.length}/${classified.length} path(s) disqualify the content lane: ${blockers.slice(0, 6).map((b) => `${b.path} — ${b.reason}`).join(' · ')}${blockers.length > 6 ? ` · +${blockers.length - 6} more` : ''}`,
  };
}

/**
 * PARTITION, not all-or-nothing — the correction the live data forced.
 *
 * The audit proposed an all-or-nothing content lane. Run against the real
 * backlog that turned out to be dead on arrival for the same reason the S294
 * docstring already gave: 206 of 529 changed paths legitimately touch workflows,
 * supabase/, auth/ and _headers. A whole-range purity test would never once fire,
 * and a gate that can never pass is indistinguishable from no gate at all.
 *
 * So the lane promotes the content-pure SUBSET and leaves everything else at the
 * deployed baseline. This is the S294 hotfix generalised from hand-scoped to
 * auto-scoped: the operator no longer enumerates files (and no longer gets that
 * enumeration wrong) — the partition is derived from the diff every time.
 *
 * Safety is unchanged, and rests on two properties:
 *   1. Impure paths are not merely un-listed, they are NOT OVERLAID — the
 *      deployed tree keeps its baseline copy of every one of them, so nothing in
 *      the identity backlog moves.
 *   2. The overlay is only safe once every asset reference in the promoted
 *      markup resolves against the BASELINE tree. That is check-content-hotfix-
 *      gate's --baseline resolution, and the content lane must run it on this
 *      partition — skipping it is precisely how the first hotfix shipped a 404.
 */
export function partition(changedPaths) {
  const paths = (changedPaths || []).map((p) => String(p).trim()).filter(Boolean);
  const classified = paths.map(classifyPath);
  const promotable = classified.filter((c) => c.ok).map((c) => c.path);
  const withheld = classified.filter((c) => !c.ok);
  return {
    // An empty promotable set is not a deploy — same refusal as an empty diff.
    promotable,
    withheld,
    deployable: promotable.length > 0,
    detail: promotable.length
      ? `${promotable.length} promotable · ${withheld.length} withheld at baseline`
      : `nothing promotable (${withheld.length} withheld) — no content-lane deploy`,
  };
}

function changedPathsFor(range) {
  try {
    const out = execFileSync('git', ['diff', '--name-only', range], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
    return out.split('\n').map((l) => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function selfTest() {
  const cases = [
    // Allowed — what the lane exists to ship.
    ['page markup is content', classifyPath('press/index.html').ok],
    // Membership/member surfaces are in the SHARED sensitive list because they
    // render entitlement state. Asserted explicitly so nobody "fixes" it later:
    // consolidating those pages is real work that does NOT ride the content lane.
    ['membership markup is BLOCKED — it renders entitlement', !classifyPath('membership/index.html').ok],
    ['a public JSON feed is content', classifyPath('api/status.json').ok],
    ['a stylesheet is an inert asset', classifyPath('assets/style.css').ok],
    ['an image is an inert asset', classifyPath('assets/hero.webp').ok],
    ['llms.txt-style text is content', classifyPath('docs/notes.txt').ok],
    ['a hash-named shell bundle is additive and allowed', classifyPath('assets/nav-sheet.shell-d06b2465a0.js').ok],

    // Blocked — the identity/edge surface.
    ['auth markup is BLOCKED', !classifyPath('auth/callback.html').ok],
    ['the member portal is BLOCKED', !classifyPath('vault-member/index.html').ok],
    ['investor portal is BLOCKED', !classifyPath('investor-portal/index.html').ok],
    ['supabase functions are BLOCKED', !classifyPath('supabase/functions/eternal-intelligence/index.ts').ok],
    ['worker source is BLOCKED', !classifyPath('cloudflare/security-headers-worker.js').ok],
    ['_headers is BLOCKED', !classifyPath('_headers').ok],
    ['_redirects is BLOCKED', !classifyPath('_redirects').ok],
    ['workflows are BLOCKED', !classifyPath('.github/workflows/pages-deploy.yml').ok],
    ['.well-known is BLOCKED', !classifyPath('.well-known/llms.txt').ok],

    // The distinction the S294 hotfix had to learn.
    ['an UN-hashed js is BLOCKED', !classifyPath('assets/nav-sheet.js').ok],
    ['a hashed and an unhashed bundle classify differently',
      classifyPath('assets/a.shell-abc123.js').ok && !classifyPath('assets/a.js').ok],
    ['sw.js is BLOCKED even at the root', !classifyPath('sw.js').ok],
    ['a nested service worker is BLOCKED', !classifyPath('games/x/service-worker.js').ok],
    ['manifest.json is BLOCKED despite being json', !classifyPath('manifest.json').ok],

    // Unknown must never default open.
    ['an unrecognised extension is BLOCKED', !classifyPath('deploy.sh').ok],
    ['no extension is BLOCKED', !classifyPath('Procfile').ok],
    ['a .env is BLOCKED', !classifyPath('config/.env').ok],

    // Prefix matching must not over- or under-reach.
    ['a file merely CONTAINING a sensitive name is judged on its own path',
      classifyPath('docs/about-auth-design.html').ok],
    ['a nested _headers is still BLOCKED', !classifyPath('site/_headers').ok],

    // Aggregate behaviour.
    ['a pure candidate passes', evaluate(['index.html', 'assets/style.css']).pure === true],
    ['ONE sensitive path disqualifies the whole lane',
      evaluate(['index.html', 'assets/style.css', 'auth/callback.html']).pure === false],
    ['the blocker is named in the detail',
      evaluate(['index.html', 'supabase/migrations/x.sql']).detail.includes('supabase/')],
    ['AN EMPTY DIFF IS NOT PURE', evaluate([]).pure === false],
    ['a null candidate is not pure', evaluate(null).pure === false],
    ['blockers are enumerated, not just counted', evaluate(['auth/a.html', 'sw.js']).blockers.length === 2],
    ['windows-style separators normalise', classifyPath('auth\\callback.html').ok === false],
    ['a leading ./ normalises', classifyPath('./index.html').ok === true],

    // Partition mode — the correction the live 391-commit backlog forced.
    ['a mixed diff still yields a promotable subset',
      partition(['index.html', 'auth/callback.html', 'assets/style.css']).promotable.length === 2],
    ['impure paths are withheld, not promoted',
      partition(['index.html', 'auth/callback.html']).withheld.some((w) => w.path === 'auth/callback.html')],
    ['THE LIVE SHAPE: a heavily mixed diff is still deployable',
      partition(['index.html', '.github/workflows/x.yml', 'supabase/m.sql', 'press/index.html']).deployable === true],
    ['an all-impure diff is NOT deployable',
      partition(['.github/workflows/x.yml', 'supabase/m.sql']).deployable === false],
    ['an empty diff is NOT deployable', partition([]).deployable === false],
    ['partition and evaluate agree on purity',
      partition(['index.html']).withheld.length === 0 && evaluate(['index.html']).pure === true],
    ['the withheld count is reported', partition(['index.html', 'sw.js']).detail.includes('1 withheld')],
    ['nothing-promotable says so explicitly', partition(['sw.js']).detail.includes('nothing promotable')],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`check-content-lane-purity --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`check-content-lane-purity --self-test: ${cases.length}/${cases.length} passed`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();

  const rangeArg = process.argv.find((a) => a.startsWith('--range'));
  const range = rangeArg?.includes('=') ? rangeArg.split('=')[1] : process.argv[process.argv.indexOf('--range') + 1];
  if (!range) {
    console.error('check-content-lane-purity: --range <baseSha>..HEAD is required');
    process.exit(2);
  }

  const changed = changedPathsFor(range);

  // --partition is what the content lane actually consumes: the promotable
  // subset. --strict keeps the all-or-nothing verdict for callers that need it.
  if (process.argv.includes('--partition')) {
    const part = partition(changed);
    if (process.argv.includes('--emit-github-output') && process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `deployable=${part.deployable}\npromotable_count=${part.promotable.length}\nwithheld_count=${part.withheld.length}\npaths=${part.promotable.join(' ')}\n`,
      );
    }
    // Never silently truncate coverage: say what was withheld and why.
    console.log(`content-lane-purity --partition: ${part.detail}`);
    for (const w of part.withheld.slice(0, 10)) console.log(`  withheld: ${w.path} — ${w.reason}`);
    if (part.withheld.length > 10) console.log(`  withheld: +${part.withheld.length - 10} more`);
    if (!part.deployable) process.exit(1);
    return;
  }

  const result = evaluate(changed);
  if (process.argv.includes('--emit-github-output') && process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `pure=${result.pure}\nchecked=${result.checked}\n`);
  }
  console.log(`content-lane-purity: ${result.pure ? 'PURE' : 'BLOCKED'} · ${result.detail}`);
  if (!result.pure) process.exit(1);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
