#!/usr/bin/env node
/**
 * check-content-coherence.mjs — cross-surface truth sentinel (S234)
 *
 * 233 sessions of gates each checked ONE surface in isolation, so visitor-facing
 * facts drifted across surfaces without any gate noticing: api/public-status.json
 * said "sealed: 7" after SEALED vocab was retired; membership-value said the Sparked
 * tier theme was "gold" while membership said "blue"; index.html's no-JS
 * days-since-launch was frozen at 393 (~277 days stale); the public vaulted count
 * disagreed with the source feed.
 *
 * This gate diffs SHARED facts across public surfaces and fails when they disagree,
 * killing the whole drift CLASS instead of each instance. It is deterministic — the
 * "now" used for the launch-age check is derived from a committed feed's generatedAt,
 * not wall-clock (same discipline as build-public-status.mjs).
 *
 * Modes:
 *   (default)     live check against the real repo — exit 1 on any contradiction
 *   --self-test   run fixtures (known-bad must fail, known-good must pass) — exit 1 on regression
 *
 * Wired into check-proof-surface.mjs (--self-test) so it costs no new build:check segment.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const LAUNCH_UTC = Date.UTC(2026, 2, 4); // March 4, 2026 — matches assets/studio-stats.js
const DAY = 86400000;
const LAUNCH_AGE_TOLERANCE_DAYS = 30; // self-healing slack; flips on the 277-day class of drift

// Retired status vocabulary → its canonical replacement. SEALED → VAULTED (founder canon).
const RETIRED_LABELS = [['Sealed', 'Vaulted'], ['SEALED', 'VAULTED']];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readSafe = (rel) => { try { return read(rel); } catch { return null; } };

// ── invariant primitives (pure — reused by live check + self-test) ──────────────

// 1. No retired status label appears as a public-facing JSON label value.
function findRetiredLabels(statusJsonText) {
  const out = [];
  for (const [bad, good] of RETIRED_LABELS) {
    if (new RegExp(`"label"\\s*:\\s*"${bad}"`).test(statusJsonText)) {
      out.push(`retired status label "${bad}" in a public feed — use "${good}"`);
    }
  }
  return out;
}

// 2. The Sparked tier's profile-theme color word must agree across membership pages.
//    Returns the color adjective immediately preceding "VaultSparked profile theme"
//    or "Sparked profile theme" / "profile theme + Sparked".
function sparkedThemeColor(html) {
  const m =
    html.match(/(\w+)\s+VaultSparked profile theme/i) ||
    html.match(/(\w+)\s+profile theme\s*\+\s*Sparked/i) ||
    html.match(/(\w+)\s+Sparked profile theme/i);
  return m ? m[1].toLowerCase() : null;
}

// 3. days-since-launch SSR value must be within tolerance of the feed-derived age.
function launchAgeDrift(homeHtml, nowMs) {
  const m = homeHtml.match(/id="days-since-launch"[^>]*>(\d+)</);
  if (!m) return null; // element absent → not this gate's concern
  const ssr = Number(m[1]);
  const expected = Math.max(1, Math.floor((nowMs - LAUNCH_UTC) / DAY));
  return { ssr, expected, drift: Math.abs(ssr - expected) };
}

// 4. Public vaulted count must equal the source portfolio feed.
function vaultedCountMismatch(statusJson, intelJson) {
  const shown = statusJson?.studio?.vaulted;
  const source = intelJson?.portfolio?.vaultedCount ?? intelJson?.portfolio?.sealedCount;
  if (shown == null || source == null) return null;
  return shown !== source ? { shown, source } : null;
}

// ── live check ──────────────────────────────────────────────────────────────────

function runLive() {
  const errs = [];
  const statusText = readSafe('api/public-status.json');
  const intelText = readSafe('api/public-intelligence.json');
  const homeHtml = readSafe('index.html');
  const memVal = readSafe('membership-value/index.html');
  const mem = readSafe('membership/index.html');

  if (statusText) errs.push(...findRetiredLabels(statusText));

  if (memVal && mem) {
    const a = sparkedThemeColor(memVal);
    const b = sparkedThemeColor(mem);
    if (a && b && a !== b) {
      errs.push(`Sparked tier theme color disagrees: membership-value="${a}" vs membership="${b}"`);
    }
  }

  if (homeHtml && statusText) {
    // deterministic "now" = freshest committed feed date
    let nowMs = LAUNCH_UTC;
    try { nowMs = Date.parse(JSON.parse(statusText).generatedAt) || LAUNCH_UTC; } catch {}
    const age = launchAgeDrift(homeHtml, nowMs);
    if (age && age.drift > LAUNCH_AGE_TOLERANCE_DAYS) {
      errs.push(`days-since-launch SSR=${age.ssr} drifts ${age.drift}d from feed-derived ${age.expected} (tolerance ${LAUNCH_AGE_TOLERANCE_DAYS}d) — update index.html`);
    }
  }

  if (statusText && intelText) {
    try {
      const mm = vaultedCountMismatch(JSON.parse(statusText), JSON.parse(intelText));
      if (mm) errs.push(`public vaulted count ${mm.shown} != source feed ${mm.source}`);
    } catch {}
  }

  if (errs.length) {
    console.error('check-content-coherence: cross-surface contradictions found:');
    for (const e of errs) console.error('  ✗ ' + e);
    process.exit(1);
  }
  console.log('check-content-coherence: all public surfaces coherent ✓');
}

// ── self-test ─────────────────────────────────────────────────────────────────

function runSelfTest() {
  let pass = 0, fail = 0;
  const ok = (cond, name) => { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + name); } };

  // 1. retired label
  ok(findRetiredLabels('{"label":"Sealed"}').length === 1, 'detects retired "Sealed" label');
  ok(findRetiredLabels('{"label":"Vaulted"}').length === 0, 'passes canonical "Vaulted" label');

  // 2. theme color
  ok(sparkedThemeColor('gold VaultSparked profile theme') === 'gold', 'extracts gold theme');
  ok(sparkedThemeColor('Blue VaultSparked profile theme') === 'blue', 'extracts blue theme');
  ok(sparkedThemeColor('no theme here') === null, 'null when no theme phrase');

  // 3. launch age drift
  const stale = launchAgeDrift('<b id="days-since-launch">393</b>', LAUNCH_UTC + 116 * DAY);
  ok(stale && stale.drift > LAUNCH_AGE_TOLERANCE_DAYS, 'flags the 393-day stale value');
  const fresh = launchAgeDrift('<b id="days-since-launch">116</b>', LAUNCH_UTC + 116 * DAY);
  ok(fresh && fresh.drift <= LAUNCH_AGE_TOLERANCE_DAYS, 'passes a fresh 116-day value');
  ok(launchAgeDrift('<b>no id</b>', LAUNCH_UTC) === null, 'null when element absent');

  // 4. vaulted count
  ok(vaultedCountMismatch({ studio: { vaulted: 7 } }, { portfolio: { sealedCount: 7 } }) === null, 'passes matched count');
  const mm = vaultedCountMismatch({ studio: { vaulted: 0 } }, { portfolio: { sealedCount: 7 } });
  ok(mm && mm.shown === 0 && mm.source === 7, 'flags mismatched count');

  console.log(`check-content-coherence self-test: ${pass}/${pass + fail} passed`);
  if (fail) process.exit(1);
}

if (process.argv.includes('--self-test')) runSelfTest();
else runLive();
