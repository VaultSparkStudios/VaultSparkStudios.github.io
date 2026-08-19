#!/usr/bin/env node
/* check-game-playability-coherence.mjs — S197 SPARKED↔playable coherence gate.

   The failure this closes: a game's status lives in 4 disconnected places (the
   nav dropdown, the games-index card, data/game-affinity.json, and the game
   page body), so a title can read "SPARKED — Live & Playable" in three of them
   while its own page still shows a stale "Demo Coming Soon" placeholder. S197
   found exactly this on BOTH live titles — call-of-doodie (live at
   callofdoodie.wtf) and franchise-architect (live at /franchise-architect/)
   each carried a redundant "Demo Coming Soon — playable build in active
   development" section that directly contradicted the page's own working play
   links (a CANON-031 self-contradicting surface, and a trust leak on a site
   whose growth thesis is "a shared link sells the studio").

   This gate makes that regression impossible:
     • a SPARKED game page containing "Demo Coming Soon"      → ERROR
     • a SPARKED game page containing a [GAME_EMBED_URL] stub → ERROR
     • a public page querying RLS-private session rows as a community aggregate
       → ERROR (an empty result is not evidence of zero activity)
     • a declared sourceRepo disagreeing with page GitHub links → ERROR
     • a SPARKED game page with no real play link at all      → ERROR
   FORGE / VAULTED pages may honestly show "coming soon" / "vaulted" — they are
   not flagged. A non-sparked page is only checked for the embed-stub footgun.

   Import-safe: side effects run only when invoked directly.
   Usage:
     node scripts/check-game-playability-coherence.mjs            # scan game pages
     node scripts/check-game-playability-coherence.mjs --self-test
*/
import { readFileSync } from 'node:fs';
import { execSync } from './lib/safe-spawn.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Resolve the page's declared status: sparked | forge | vaulted | unknown.
export function pageStatus(html) {
  const m = html.match(/data-status="(sparked|forge|vaulted)"/i)
    || html.match(/class="status status-(sparked|forge|vaulted)"/i);
  return m ? m[1].toLowerCase() : 'unknown';
}

// Does the page expose a REAL play affordance — an anchor whose text says "Play"
// and whose href points at a build (external URL, or an internal app path that
// is not the membership / listing / hash funnel)?
export function hasPlayLink(html) {
  const anchors = html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gis);
  for (const a of anchors) {
    const href = a[1];
    const text = a[2].replace(/<[^>]*>/g, '');
    if (!/\bplay\b/i.test(text)) continue;
    if (/^https?:\/\//i.test(href)) return true;                       // external build
    if (/^\/[a-z]/i.test(href)
        && !/^\/(vault-member|membership|games)\b/i.test(href)
        && !href.startsWith('#')) return true;                         // internal app path
  }
  return false;
}

// Classify a single game page. Returns { status, findings:[{level,msg}] }.
export function classifyGamePage(html) {
  const status = pageStatus(html);
  const findings = [];
  const hasEmbedStub = /\[GAME_EMBED_URL\]/.test(html);
  if (hasEmbedStub) {
    findings.push({ level: status === 'sparked' ? 'error' : 'warn',
      msg: `contains a [GAME_EMBED_URL] placeholder stub — replace with the real build or remove` });
  }
  if (status === 'sparked') {
    if (/Demo Coming Soon/i.test(html)) {
      findings.push({ level: 'error', msg: `SPARKED page says "Demo Coming Soon" — contradicts its own live status (CANON-031)` });
    }
    if (!hasPlayLink(html)) {
      findings.push({ level: 'error', msg: `SPARKED page has no real play link — a live game must let the visitor play` });
    }
  }
  if (/\/rest\/v1\/game_sessions\?select=/i.test(html)) {
    findings.push({ level: 'error',
      msg: 'queries RLS-private game_sessions rows as a public aggregate — publish a privacy-safe aggregate receipt or label the count unavailable (CANON-031)' });
  }
  return { status, findings };
}


// Source links are checked against the registry instead of inferred from a
// display slug. Product names and URLs can change while the repository keeps
// its original canonical name (Franchise Architect is the live example).
export function sourceRepoFindings(html, expectedRepo) {
  if (!expectedRepo) return [];
  const seen = new Set();
  const refs = html.matchAll(/(?:api\.)?github\.com\/(?:repos\/)?VaultSparkStudios\/([A-Za-z0-9._-]+)/g);
  for (const match of refs) seen.add(match[1]);
  if (seen.size === 0) {
    return [{ level: 'error', msg: `registry declares sourceRepo="${expectedRepo}" but the page exposes no project source link` }];
  }
  return [...seen].filter((repo) => repo !== expectedRepo).map((repo) => ({
    level: 'error',
    msg: `GitHub source link points to "${repo}" but registry sourceRepo is "${expectedRepo}"`,
  }));
}

// S323: assemble ALL findings for one registered page — page classification +
// registry status cross-check + sourceRepo drift — in ONE place, so runScan and
// the self-test run the identical path. The sourceRepo check previously lived
// inside runScan's reporting loop, which meant it only ran when the page already
// had OTHER findings: a healthy SPARKED page (zero findings) skipped it entirely
// and a wrong-repo GitHub link passed green — the exact drift this gate
// advertises catching — while a page with findings re-ran it once per iteration.
// Computing it here, unconditionally and exactly once, closes both holes.
export function collectPageFindings(html, reg) {
  const { status, findings } = classifyGamePage(html);
  if (reg && reg.status !== status && status !== 'unknown') {
    findings.push({ level: 'error',
      msg: `registry says status="${reg.status}" but page has data-status="${status}" — update one to match` });
  }
  if (reg) findings.push(...sourceRepoFindings(html, reg.sourceRepo));
  return { status, findings };
}

function runSelfTest() {
  let fail = 0, total = 0;
  const assert = (c, m) => { total++; if (!c) { console.error('  ✗ ' + m); fail++; } };

  // SPARKED + "Demo Coming Soon" → error
  let r = classifyGamePage('<section data-status="sparked"></section><h3>Demo Coming Soon</h3><a href="https://x.wtf/">Play Now</a>');
  assert(r.findings.some((x) => x.level === 'error' && /Coming Soon/.test(x.msg)), 'sparked + coming-soon → error');

  // SPARKED + external play link, no coming-soon → clean
  r = classifyGamePage('<section data-status="sparked"></section><a class="button" href="https://callofdoodie.wtf/">Play Now — Free</a>');
  assert(r.findings.length === 0, 'sparked + external play link → clean');

  // SPARKED + internal app play link → clean
  r = classifyGamePage('<section data-status="sparked"></section><a class="button" href="/franchise-architect/">Play Beta — Free</a>');
  assert(r.findings.length === 0, 'sparked + internal app play link → clean');

  // SPARKED + only a /vault-member join link (no real play) → error
  r = classifyGamePage('<section data-status="sparked"></section><a class="button" href="/vault-member/#register">Play later — join</a>');
  assert(r.findings.some((x) => x.level === 'error' && /no real play link/.test(x.msg)), 'sparked + membership-only → error');

  // SPARKED + embed stub → error
  r = classifyGamePage('<section data-status="sparked"></section><a href="https://x.wtf/">Play</a><iframe src="[GAME_EMBED_URL]"></iframe>');
  assert(r.findings.some((x) => x.level === 'error' && /GAME_EMBED_URL/.test(x.msg)), 'sparked + embed stub → error');

  // VAULTED + "Currently Vaulted" → clean (no false claim)
  r = classifyGamePage('<section data-status="vaulted"></section><h3>Currently Vaulted</h3>');
  assert(r.findings.length === 0, 'vaulted page → clean');

  // FORGE + "Demo Coming Soon" → clean (honest for in-development)
  r = classifyGamePage('<section data-status="forge"></section><h3>Demo Coming Soon</h3>');
  assert(!r.findings.some((x) => x.level === 'error'), 'forge + coming-soon → no error');

  // Public aggregate reads against a member-private RLS table must fail.
  r = classifyGamePage('<section data-status="sparked"></section><a href="/play/">Play</a><script>fetch(SB_URL + "/rest/v1/game_sessions?select=id")</script>');
  assert(r.findings.some((x) => x.level === 'error' && /RLS-private/.test(x.msg)), 'public RLS-private aggregate → error');

  // A display/rebrand slug may differ from the canonical repository.
  r = sourceRepoFindings(
    '<a href="https://github.com/VaultSparkStudios/vaultspark-football-gm">Source</a><script>fetch("https://api.github.com/repos/VaultSparkStudios/vaultspark-football-gm/commits")</script>',
    'vaultspark-football-gm',
  );
  assert(r.length === 0, 'canonical sourceRepo links → clean');

  r = sourceRepoFindings(
    '<a href="https://github.com/VaultSparkStudios/franchise-architect">Source</a>',
    'vaultspark-football-gm',
  );
  assert(r.some((x) => /points to/.test(x.msg)), 'display slug used as source repo → error');

  // S323 (both directions, through the real runScan assembly path): before the
  // fix the sourceRepo check sat INSIDE runScan's reporting loop, so a healthy
  // page that produced zero other findings never triggered it — a mismatched
  // sourceRepo passed green. collectPageFindings now runs it unconditionally.
  // (a) A clean SPARKED page (real play link, no other findings) with a
  //     MISMATCHED sourceRepo must now surface a drift error (previously passed).
  r = collectPageFindings(
    '<section data-status="sparked"></section><a class="button" href="https://x.wtf/">Play Now — Free</a>'
      + '<a href="https://github.com/VaultSparkStudios/wrong-repo">Source</a>',
    { status: 'sparked', sourceRepo: 'right-repo' },
  ).findings;
  assert(r.some((x) => x.level === 'error' && /points to "wrong-repo"/.test(x.msg)),
    'S323: clean page + mismatched sourceRepo → drift error (was a green miss)');
  // (b) The same clean page with a MATCHING sourceRepo stays clean — the fix must
  //     not manufacture a false positive on the healthy path.
  r = collectPageFindings(
    '<section data-status="sparked"></section><a class="button" href="https://x.wtf/">Play Now — Free</a>'
      + '<a href="https://github.com/VaultSparkStudios/right-repo">Source</a>',
    { status: 'sparked', sourceRepo: 'right-repo' },
  ).findings;
  assert(r.length === 0, 'S323: clean page + matching sourceRepo → clean');

  const passed = total - fail;
  if (fail === 0) { console.log(`✓ check-game-playability-coherence --self-test: ${passed}/${total} passed`); process.exit(0); }
  console.error(`✗ check-game-playability-coherence --self-test: ${fail}/${total} failed`); process.exit(1);
}

// Load game-registry.json if present (S198: single source of truth for status/playUrl).
function loadRegistry() {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'data', 'game-registry.json'), 'utf8')).games || {};
  } catch { return {}; }
}

function runScan() {
  const registry = loadRegistry();
  const files = execSync('git ls-files "games/index.html" "games/*/index.html"', { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  let errors = 0, warns = 0, scanned = 0;
  for (const f of files) {
    scanned++;
    const html = readFileSync(join(ROOT, f), 'utf8');
    // Registry cross-check (status divergence) + sourceRepo drift are assembled
    // in collectPageFindings — computed once, up front, BEFORE the tally loop.
    // S323: the sourceRepo check must not be gated behind other findings.
    // The git pathspec `games/*/index.html` also matches agent-mirror pages
    // (games/<slug>/.ai/index.html) because `*` crosses `/`; those mirrors are
    // not a game's canonical public page and carry no source link, so the
    // registry-derived checks key off the canonical page only. Every page is
    // still classified (embed-stub / RLS / coming-soon) via collectPageFindings.
    const slug = f.split('/')[1];
    const isCanonicalPage = /^games\/[^/]+\/index\.html$/.test(f);
    const { status, findings } = collectPageFindings(html, isCanonicalPage ? registry[slug] : undefined);
    for (const x of findings) {
      if (x.level === 'error') { console.error(`✗ ${f} [${status}]: ${x.msg}`); errors++; }
      else { console.warn(`  ⚠ ${f} [${status}]: ${x.msg}`); warns++; }
    }
  }
  if (errors) {
    console.error(`✗ check-game-playability-coherence: ${errors} SPARKED↔playable contradiction(s) — fix before push`);
    process.exit(1);
  }
  const regNote = Object.keys(registry).length ? ` (registry: ${Object.keys(registry).length} games)` : '';
  console.log(`✓ check-game-playability-coherence: ${scanned} game page(s) coherent${regNote}` + (warns ? ` (${warns} warning)` : ''));
  process.exit(0);
}

const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('check-game-playability-coherence.mjs');
if (invokedDirectly) {
  if (process.argv.includes('--self-test')) runSelfTest();
  else runScan();
}
