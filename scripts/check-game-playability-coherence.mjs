#!/usr/bin/env node
/* check-game-playability-coherence.mjs — S197 SPARKED↔playable coherence gate.

   The failure this closes: a game's status lives in 4 disconnected places (the
   nav dropdown, the games-index card, data/game-affinity.json, and the game
   page body), so a title can read "SPARKED — Live & Playable" in three of them
   while its own page still shows a stale "Demo Coming Soon" placeholder. S197
   found exactly this on BOTH live titles — call-of-doodie (live at
   callofdoodie.wtf) and vaultspark-football-gm (live at /vaultspark-football-gm/)
   each carried a redundant "Demo Coming Soon — playable build in active
   development" section that directly contradicted the page's own working play
   links (a CANON-031 self-contradicting surface, and a trust leak on a site
   whose growth thesis is "a shared link sells the studio").

   This gate makes that regression impossible:
     • a SPARKED game page containing "Demo Coming Soon"      → ERROR
     • a SPARKED game page containing a [GAME_EMBED_URL] stub → ERROR
     • a SPARKED game page with no real play link at all      → ERROR
   FORGE / VAULTED pages may honestly show "coming soon" / "vaulted" — they are
   not flagged. A non-sparked page is only checked for the embed-stub footgun.

   Import-safe: side effects run only when invoked directly.
   Usage:
     node scripts/check-game-playability-coherence.mjs            # scan game pages
     node scripts/check-game-playability-coherence.mjs --self-test
*/
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
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
  return { status, findings };
}

function runSelfTest() {
  let fail = 0;
  const assert = (c, m) => { if (!c) { console.error('  ✗ ' + m); fail++; } };

  // SPARKED + "Demo Coming Soon" → error
  let r = classifyGamePage('<section data-status="sparked"></section><h3>Demo Coming Soon</h3><a href="https://x.wtf/">Play Now</a>');
  assert(r.findings.some((x) => x.level === 'error' && /Coming Soon/.test(x.msg)), 'sparked + coming-soon → error');

  // SPARKED + external play link, no coming-soon → clean
  r = classifyGamePage('<section data-status="sparked"></section><a class="button" href="https://callofdoodie.wtf/">Play Now — Free</a>');
  assert(r.findings.length === 0, 'sparked + external play link → clean');

  // SPARKED + internal app play link → clean
  r = classifyGamePage('<section data-status="sparked"></section><a class="button" href="/vaultspark-football-gm/">Play Beta — Free</a>');
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

  if (fail === 0) { console.log('✓ check-game-playability-coherence --self-test: 7/7 passed'); process.exit(0); }
  console.error('✗ check-game-playability-coherence --self-test: ' + fail + ' failed'); process.exit(1);
}

function runScan() {
  const files = execSync('git ls-files "games/*/index.html"', { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  let errors = 0, warns = 0, scanned = 0;
  for (const f of files) {
    scanned++;
    const { status, findings } = classifyGamePage(readFileSync(join(ROOT, f), 'utf8'));
    for (const x of findings) {
      if (x.level === 'error') { console.error(`✗ ${f} [${status}]: ${x.msg}`); errors++; }
      else { console.warn(`  ⚠ ${f} [${status}]: ${x.msg}`); warns++; }
    }
  }
  if (errors) {
    console.error(`✗ check-game-playability-coherence: ${errors} SPARKED↔playable contradiction(s) — fix before push`);
    process.exit(1);
  }
  console.log(`✓ check-game-playability-coherence: ${scanned} game page(s) coherent` + (warns ? ` (${warns} warning)` : ''));
  process.exit(0);
}

const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('check-game-playability-coherence.mjs');
if (invokedDirectly) {
  if (process.argv.includes('--self-test')) runSelfTest();
  else runScan();
}
