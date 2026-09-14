#!/usr/bin/env node
// @verification-scope publisher — free advisory inference publisher, not a build gate.
/**
 * generate-vault-narrative — daily AI-authored "what's happening at the studio".
 *
 * Reads:  api/public-intelligence.json (live portfolio snapshot)
 * Writes: api/vault-narrative.json, api/vault-narrative-history.json,
 *         journal/dispatches/feed.xml (the /journal/dispatches/ archive + RSS)
 *
 * Runs daily via .github/workflows/vault-narrative.yml. Soft-fails if inference
 * is unavailable or the answer is ungrounded — preserves the previous dispatch
 * rather than publishing an empty or invented one. Preserving is not success:
 * `--check-fresh` runs after the commit step and fails the workflow once the
 * newest dispatch is older than FRESH_HOURS, so a held publisher reads red.
 *
 * Grounding (S353). The prompt and the validator used to disagree about what
 * counts as concrete. The validator accepted catalog project names, raw digit
 * counts and `pulse.shipped`; the prompt never listed the catalog, the brand
 * voice pushed counts into words ("six sparked"), and `pulse.shipped` is empty.
 * Every dispatch from 2026-08-27 onward was rejected while the workflow stayed
 * green, including answers that named Session 352, Studio Pulse and the true
 * counts. Both sides now read ONE vocabulary from `groundingAnchors()`, and a
 * count claim is checked against the snapshot instead of merely spotted.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const INTEL_PATH = path.join(ROOT, 'api', 'public-intelligence.json');
const OUT_PATH = path.join(ROOT, 'api', 'vault-narrative.json');
const HISTORY_PATH = path.join(ROOT, 'api', 'vault-narrative-history.json');
const RSS_PATH = path.join(ROOT, 'journal', 'dispatches', 'feed.xml');
const HISTORY_LIMIT = 30;
const FRESH_HOURS = 48;

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
  'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five', 'twenty-six', 'twenty-seven',
  'twenty-eight', 'twenty-nine', 'thirty'];

function parseCount(token) {
  const t = String(token).toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  const i = NUMBER_WORDS.indexOf(t.replace(/\s+/g, '-'));
  return i >= 0 ? i : null;
}

// A pulse item reads "Studio Pulse live data — the Forge Window now hydrates …".
// The name before the dash is the artifact; the rest is prose nobody would quote.
function titleOf(item) {
  return String(item || '').split(/\s+[—–-]\s+/)[0].trim();
}

/** The single grounding vocabulary: the prompt lists it, the validator accepts it. */
export function groundingAnchors(intel) {
  const pulse = intel.pulse || {};
  const session = intel.project?.currentSession;
  const names = [
    ...(intel.catalog || []).map((project) => project.name),
    ...(intel.activityHeatmap || []).slice(0, 5).map((row) => row.name),
    ...(pulse.shipped || []).slice(0, 5).map(titleOf),
    ...(pulse.now || []).slice(0, 3).map(titleOf),
  ].map((value) => String(value || '').trim()).filter((value) => value.length > 3);
  const phrases = [...new Set(names)];
  if (session) phrases.push(`Session ${session}`, `S${session}`);
  return phrases;
}

export function portfolioCounts(intel) {
  const p = intel.portfolio || {};
  return { sparked: p.sparked ?? null, forge: p.forge ?? null, sealed: p.sealedCount ?? null, vaulted: p.vaulted ?? null };
}

const COUNT_TOKEN = `(\\d+|${[...NUMBER_WORDS].sort((a, b) => b.length - a.length).join('|')})`;
const STATE_PATTERNS = [
  ['sparked', /sparked/],
  ['forge', /(?:in\s+the\s+forge|forged|forging|forge)/],
  ['sealed', /sealed/],
  ['vaulted', /vaulted/],
];

/**
 * Count claims in a dispatch: "six sparked", "14 in the forge", "seven projects
 * sealed". Returns [{ state, claimed }]. Only a number directly bound to a state
 * word (optionally through a noun like "projects") counts as a claim.
 */
export function countClaims(dispatch) {
  const text = String(dispatch || '').toLowerCase();
  const claims = [];
  // The lookbehind keeps "Session 352 sealed the gate" and "S352 sealed" from
  // reading as a claim that 352 projects are sealed (caught on a live answer).
  const re = new RegExp(`(?<!(?:session|sprint|build|step)\\s+|\\bs|#)\\b${COUNT_TOKEN}\\s+(?:(?:more\\s+)?(?:projects?|initiatives?|worlds?|titles?)\\s+)?(?:(?:are|remain|still|now|stand|held|holding)\\s+)?(in\\s+the\\s+forge|forged|forging|forge|sparked|sealed|vaulted)\\b`, 'g');
  for (const m of text.matchAll(re)) {
    const claimed = parseCount(m[1]);
    const state = STATE_PATTERNS.find(([, pattern]) => pattern.test(m[2]))?.[0];
    if (claimed !== null && state) claims.push({ state, claimed });
  }
  return claims;
}

export function buildPrompt(intel) {
  const project = intel.project || {};
  const counts = portfolioCounts(intel);
  const pulse = intel.pulse || {};
  const shipped = (pulse.shipped || []).slice(0, 5);
  const now = (pulse.now || []).slice(0, 3);
  const anchors = groundingAnchors(intel);

  return [
    'You are writing a 2–3 sentence dispatch for the VaultSpark Studios homepage.',
    'Voice: vault-forge brand — poetic, precise, never hyped. Use "the vault", "the forge", "sparked", "sealed" when natural.',
    'Length: 35–80 words total. No emoji. No hashtags. No URLs. No "we are excited to announce".',
    'Name at least one GROUNDING ANCHOR below exactly as written. Any count you state must match the snapshot exactly. Never invent.',
    '',
    '── INPUT SNAPSHOT ──',
    `Studio: ${project.name || 'VaultSpark Studios'} — session ${project.currentSession || '?'}`,
    project.currentFocus ? `Current focus: ${project.currentFocus}` : '',
    `Portfolio: ${counts.sparked ?? 0} SPARKED · ${counts.forge ?? 0} FORGE · ${counts.sealed ?? 0} SEALED · ${counts.vaulted ?? 0} VAULTED.`,
    shipped.length ? 'Recently shipped: ' + shipped.join(' · ') : '',
    now.length ? 'In motion now: ' + now.join(' · ') : '',
    anchors.length ? 'GROUNDING ANCHORS: ' + anchors.slice(0, 30).join(' · ') : '',
    '',
    'Write the dispatch now. No preamble, no header — just the sentences.',
  ].filter(Boolean).join('\n');
}

export function validateDispatch(dispatch, intel) {
  const words = String(dispatch || '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 35 || words.length > 100) return { ok: false, reason: 'dispatch must contain 35–100 words' };
  if (/https?:\/\/|we are excited to announce|revolutionary|game-changing/i.test(dispatch)) {
    return { ok: false, reason: 'dispatch contains a prohibited hype or URL pattern' };
  }
  const counts = portfolioCounts(intel);
  const claims = countClaims(dispatch);
  const wrong = claims.filter((claim) => counts[claim.state] === null || counts[claim.state] !== claim.claimed);
  if (wrong.length) {
    return { ok: false, reason: 'dispatch miscounts the portfolio: ' + wrong.map((c) => `${c.claimed} ${c.state} (snapshot ${counts[c.state] ?? 'absent'})`).join(', ') };
  }
  const normalized = dispatch.toLowerCase();
  const anchor = groundingAnchors(intel).find((value) => normalized.includes(value.toLowerCase()));
  if (!anchor && !claims.length) {
    return { ok: false, reason: 'dispatch names no grounding anchor and states no verified count' };
  }
  return { ok: true, groundedBy: anchor ? `anchor:${anchor}` : `count:${claims[0].claimed} ${claims[0].state}` };
}

async function callAdvisoryInference(prompt) {
  const { chat } = await import('./lib/desk-inference.mjs');
  return chat({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 768,
    temperature: 0.35,
    thinking: false,
  });
}

async function logSpendToMeter(usage) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !usage) return;
  try {
    await fetch(`${url}/rest/v1/rpc/increment_ignis_meter`, {
      method: 'POST',
      headers: {
        apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_function_name: 'generate-vault-narrative',
        p_input_tokens: Number(usage.input_tokens || 0),
        p_output_tokens: Number(usage.output_tokens || 0),
        p_cache_read: Number(usage.cache_read_input_tokens || 0),
        p_cache_create: Number(usage.cache_creation_input_tokens || 0),
      }),
    });
  } catch { /* non-fatal */ }
}

function preservePrevious(cause) {
  try {
    if (fs.existsSync(OUT_PATH)) {
      const prev = readJson(OUT_PATH);
      console.log(`[vault-narrative] preserved previous (generated ${prev.generatedAt})`);
      // A GitHub annotation, so a held publisher is visible on the run page
      // instead of hiding inside a green log. --check-fresh turns it red later.
      if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Vault narrative held::${cause}; kept the dispatch generated ${prev.generatedAt}`);
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

export function freshness(payload, now = Date.now(), maxHours = FRESH_HOURS) {
  const at = Date.parse(payload?.generatedAt || '');
  if (!Number.isFinite(at)) return { ok: false, ageHours: null, reason: 'vault-narrative.json has no valid generatedAt' };
  const ageHours = Math.round(((now - at) / 3600000) * 10) / 10;
  return ageHours <= maxHours
    ? { ok: true, ageHours }
    : { ok: false, ageHours, reason: `newest dispatch is ${ageHours}h old (limit ${maxHours}h); the publisher has been preserving instead of publishing` };
}

async function main() {
  if (!fs.existsSync(INTEL_PATH)) {
    console.error('[vault-narrative] no public-intelligence.json — run generate-public-intelligence.mjs first');
    process.exit(2);
  }
  const intel = readJson(INTEL_PATH);

  let dispatch, inference;
  try {
    inference = await callAdvisoryInference(buildPrompt(intel));
    if (!inference.ok) throw new Error(inference.state + ': ' + inference.reason);
    dispatch = inference.content.trim();
  } catch (err) {
    console.error('[vault-narrative] advisory inference unavailable:', err.message);
    if (preservePrevious('advisory inference unavailable')) process.exit(0);
    process.exit(1);
  }

  const grounding = validateDispatch(dispatch, intel);
  if (!grounding.ok) {
    console.error('[vault-narrative] rejected ungrounded response:', grounding.reason);
    console.error(`  rejected dispatch: "${dispatch.slice(0, 240)}"`);
    if (preservePrevious(`rejected: ${grounding.reason}`)) process.exit(0);
    process.exit(1);
  }

  const payload = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    dispatch,
    model: inference.model || 'hetzner-advisory',
    sourceSession: intel.project?.currentSession || null,
    sourceSnapshot: intel.generatedAt || null,
  };

  const json = JSON.stringify(payload, null, 2) + '\n';
  fs.writeFileSync(OUT_PATH, json);
  console.log(`[vault-narrative] wrote ${OUT_PATH} (${grounding.groundedBy})`);
  console.log(`  dispatch: "${dispatch.slice(0, 100)}${dispatch.length > 100 ? '…' : ''}"`);

  appendHistory(payload);
  writeRss();

  await logSpendToMeter(inference.usage);
}

function appendHistory(entry) {
  let history = [];
  try {
    if (fs.existsSync(HISTORY_PATH)) {
      const parsed = readJson(HISTORY_PATH);
      if (Array.isArray(parsed?.entries)) history = parsed.entries;
    }
  } catch { /* start fresh on parse error */ }
  // Skip if today's dispatch already in history (reruns same UTC day)
  const today = entry.generatedAt.slice(0, 10);
  history = history.filter((h) => (h.generatedAt || '').slice(0, 10) !== today);
  history.unshift({
    generatedAt: entry.generatedAt,
    dispatch: entry.dispatch,
    sourceSession: entry.sourceSession,
    model: entry.model,
  });
  history = history.slice(0, HISTORY_LIMIT);
  const out = { schemaVersion: '1.0', updatedAt: entry.generatedAt, count: history.length, entries: history };
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`[vault-narrative] history → ${history.length} entries`);
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function writeRss() {
  let history = [];
  try { history = readJson(HISTORY_PATH).entries || []; } catch { return; }
  const SITE = 'https://vaultsparkstudios.com';
  const items = history.map((h) => {
    const date = new Date(h.generatedAt);
    const dateStr = date.toUTCString();
    const dayKey = h.generatedAt.slice(0, 10);
    const guid = `${SITE}/journal/dispatches/#${dayKey}`;
    const title = `Studio dispatch — ${dayKey}`;
    return [
      '    <item>',
      `      <title>${escapeXml(title)}</title>`,
      `      <link>${escapeXml(guid)}</link>`,
      `      <guid isPermaLink="false">${escapeXml(guid)}</guid>`,
      `      <pubDate>${dateStr}</pubDate>`,
      `      <description>${escapeXml(h.dispatch)}</description>`,
      '    </item>',
    ].join('\n');
  }).join('\n');
  const lastBuild = new Date().toUTCString();
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>VaultSpark Studios — Daily Dispatches</title>',
    `    <link>${SITE}/journal/dispatches/</link>`,
    '    <description>Daily AI-authored dispatches from VaultSpark Studios — one signal per day from the forge.</description>',
    '    <language>en-us</language>',
    `    <lastBuildDate>${lastBuild}</lastBuildDate>`,
    `    <atom:link href="${SITE}/journal/dispatches/feed.xml" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
  fs.mkdirSync(path.dirname(RSS_PATH), { recursive: true });
  fs.writeFileSync(RSS_PATH, xml);
  console.log(`[vault-narrative] wrote ${RSS_PATH}`);
}

function selfTest() {
  // The live shape as of S353: catalog names absent from the prose, pulse.shipped
  // empty, counts written as words. Fixtures 1-3 are the three real answers the
  // old validator rejected on 2026-09-14; they must now pass on merit.
  const intel = {
    project: { currentSession: 352 },
    catalog: [{ name: 'Call of Doodie' }, { name: 'PromoGrind' }],
    portfolio: { sparked: 6, forge: 14, sealedCount: 7, vaulted: 0 },
    activityHeatmap: [{ name: 'Studio platform', heat: 600 }],
    pulse: {
      shipped: [],
      now: ['Studio Pulse live data — the Forge Window now hydrates from the public intelligence feed again.',
        'Feedback UX polish — Signal Feedback now opens from a compact button instead of interrupting the page.'],
    },
  };
  const real = [
    'The cascade gate missed the sitemap drift, but S352 sealed the leak and stopped the write-back probe from mistaking regeneration for silence. With six sparked, fourteen forged, and seven sealed, the studio’s rhythm holds. Now, Studio Pulse hydrates from the public feed, while Signal Feedback opens quietly, keeping the forge window clear for what matters.',
    'Session 352 sealed the cascade gate, correcting a sitemap drift that obscured regeneration commits. The edge sampler now routes through Ark to reuse its existing cron, while the Forge Window hydrates from the public intelligence feed once more. With six projects sparked and fourteen in the forge, the studio maintains precise parity across its growing portfolio.',
    'Session 352 sealed the cascade gate, ensuring sitemap integrity and halting false closeout reports. The edge sampler now routes through Ark, while the Forge Window hydrates from the public intelligence feed. With six projects sparked and fourteen in the forge, the studio platform pulses at 600 active units.',
  ];
  const cases = [];
  real.forEach((text, i) => cases.push([`real 2026-09-14 answer ${i + 1} is accepted`, validateDispatch(text, intel).ok]));
  const padding = ' The vault keeps its ledger honest and names only what the snapshot can carry today, without pretending that motion is the same thing as completion or that a plan is a release.';
  cases.push(['anchor-free prose with no count is rejected',
    !validateDispatch('The vault hums quietly tonight as the forge glows and every ember waits its turn beneath a patient sky.' + padding, intel).ok]);
  cases.push(['a wrong count in words is rejected even beside a real anchor',
    /miscounts/.test(validateDispatch('Studio Pulse hydrates again while nine sparked worlds stand watch over the vault.' + padding, intel).reason || '')]);
  cases.push(['a wrong digit count is rejected', !validateDispatch('Studio Pulse is live and 15 in the forge now take shape.' + padding, intel).ok]);
  cases.push(['a true count alone grounds a dispatch', validateDispatch('Six sparked initiatives hold the line while the vault keeps its patient watch.' + padding, intel).ok]);
  cases.push(['short answers are still rejected', !validateDispatch('Studio Pulse is live.', intel).ok]);
  cases.push(['URLs are still rejected', !validateDispatch('Studio Pulse is live at https://example.com today.' + padding, intel).ok]);
  cases.push(['countClaims reads "fourteen in the forge"', countClaims('fourteen in the forge').some((c) => c.state === 'forge' && c.claimed === 14)]);
  cases.push(['countClaims reads "7 projects sealed"', countClaims('7 projects sealed').some((c) => c.state === 'sealed' && c.claimed === 7)]);
  cases.push(['pulse titles become anchors, their prose does not', groundingAnchors(intel).includes('Studio Pulse live data') && !groundingAnchors(intel).some((a) => a.includes('hydrates'))]);
  cases.push(['prompt lists every anchor the validator accepts', groundingAnchors(intel).every((a) => buildPrompt(intel).includes(a))]);
  cases.push(['a 19-day-old dispatch is not fresh', !freshness({ generatedAt: '2026-08-26T13:21:42Z' }, Date.parse('2026-09-14T13:00:00Z')).ok]);
  cases.push(['a same-day dispatch is fresh', freshness({ generatedAt: '2026-09-14T13:00:00Z' }, Date.parse('2026-09-14T20:00:00Z')).ok]);
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`);
  console.log(`generate-vault-narrative --self-test: ${cases.length - failed.length}/${cases.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else if (process.argv.includes('--check-fresh')) {
  let payload = null;
  try { payload = readJson(OUT_PATH); } catch { /* reported below */ }
  const verdict = freshness(payload);
  if (verdict.ok) {
    console.log(`generate-vault-narrative --check-fresh: newest dispatch is ${verdict.ageHours}h old (limit ${FRESH_HOURS}h)`);
    process.exit(0);
  }
  console.error(`generate-vault-narrative --check-fresh: ${verdict.reason}`);
  process.exit(1);
} else {
  main().catch((err) => {
    console.error('[vault-narrative] fatal', err);
    if (preservePrevious(`fatal: ${err?.message || err}`)) process.exit(0);
    process.exit(1);
  });
}
